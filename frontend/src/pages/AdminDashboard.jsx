// src/pages/AdminDashboard.jsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  getContract,
  getReadContract,
  // getReadProvider,
  subscribeToVotingEvents,
  unsubscribeFromVotingEvents,
} from "../utils/blockchain";
import { ethers } from "ethers";
import {
  PlusIcon,
  ClockIcon,
  StopIcon,
  UsersIcon,
  ChartBarIcon,
} from "@heroicons/react/24/solid";
import { saveAs } from "file-saver";
import Papa from "papaparse";
import jsPDF from "jspdf";

// Import animations
import PageWrapper from "../components/PageWrapper";
import { TiltCard, FadeIn, SlideUp, HoverScale } from "../components/Animations";

export default function AdminDashboard() {
  const [candidateName, setCandidateName] = useState("");
  const [candidateImage, setCandidateImage] = useState("");
  const [status, setStatus] = useState("");
  const [votingStarted, setVotingStarted] = useState(false);
  const [votingEnded, setVotingEnded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deadlineInput, setDeadlineInput] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [voterCount, setVoterCount] = useState(0);
  const [candidateStats, setCandidateStats] = useState([]);

  // const fetchTimeoutRef = useRef(null);
  const isFetchingRef = useRef(false);

  const fetchOnchain = useCallback(async (force = false) => {
    if (isFetchingRef.current && !force) return;
    isFetchingRef.current = true;

    try {
      const contract = getReadContract();
      const [started, ended, adminAddr, voters, totalCandidates] = await Promise.all([
        contract.votingStarted(),
        contract.votingEnded(),
        contract.admin(),
        contract.getVoterAddresses(), // Direct voter count from contract
        contract.candidatesCount()
      ]);

      // Update core state
      setVotingStarted(started);
      setVotingEnded(ended);
      setVoterCount(voters.length);

      // Check admin status
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const user = await signer.getAddress();
      setIsAdmin(user.toLowerCase() === adminAddr.toLowerCase());

      // Fetch candidates with direct vote counts
      const stats = [];
      for (let i = 1; i <= totalCandidates; i++) {
        const candidate = await contract.candidates(i);
        stats.push({
          id: Number(candidate.id),
          name: candidate.name,
          votes: Number(candidate.voteCount) // Direct vote count access
        });
      }

      setCandidateStats(stats);
      setStatus(user.toLowerCase() === adminAddr.toLowerCase()
        ? "✅ You are the admin."
        : "⚠️ Viewing only");

    } catch (err) {
      console.error("❌ Fetch error:", err);
      setStatus("❌ Blockchain error: " + (err.reason || err.message));
    } finally {
      isFetchingRef.current = false;
    }
  }, []);



  useEffect(() => {
    const handleEvent = () => fetchOnchain(true);

    const setupListeners = () => {
      unsubscribeFromVotingEvents();
      subscribeToVotingEvents({
        onVoteCast: handleEvent,
        onVoterRegistered: handleEvent,
        onCandidateAdded: handleEvent,
        onVotingStarted: handleEvent,
        onVotingEnded: handleEvent,
      });
    };

    setupListeners();
    fetchOnchain(true); // Initial load

    // Refresh every 15 seconds as fallback
    const interval = setInterval(fetchOnchain, 15000);

    return () => {
      unsubscribeFromVotingEvents();
      clearInterval(interval);
    };
  }, [fetchOnchain]);



const sendTx = async (method, ...args) => {
  setLoading(true);
  setStatus("⏳ Sending transaction...");
  try {
    const contract = await getContract();
    const tx = await contract[method](...args, { gasLimit: 200_000 });
    await tx.wait();
    await fetchOnchain(true); // Force immediate refresh
    return true;
  } catch (err) {
    setStatus("❌ " + (err.reason || err.message));
    return false;
  } finally {
    setLoading(false);
  }
};

  const handleAddCandidate = async () => {
    if (!candidateName.trim() || !candidateImage.trim() || !isAdmin) {
      return setStatus(!candidateName.trim()
        ? "❌ Candidate name is required."
        : !candidateImage.trim()
          ? "❌ Image URL is required."
          : "🚫 Not authorized.");
    }
    if (await sendTx("addCandidate", candidateName)) {
      const count = await (await getContract()).candidatesCount();
      const existing = JSON.parse(localStorage.getItem("candidateImages") || "{}");
      existing[count] = candidateImage;
      localStorage.setItem("candidateImages", JSON.stringify(existing));
      setCandidateName("");
      setCandidateImage("");
      setStatus(`✅ Candidate "${candidateName}" added.`);
    }
  };

  const handleStartVoting = async () => {
    if (!deadlineInput || !isAdmin) {
      return setStatus(!deadlineInput
        ? "❌ Set a voting end time."
        : "🚫 Not authorized.");
    }
    const ts = Math.floor(new Date(deadlineInput).getTime() / 1000);
    if (await sendTx("startVoting", ts)) {
      localStorage.setItem("votingDeadline", ts.toString());
      setStatus("✅ Voting started!");
    }
  };

  const handleEndVoting = async () => {
    if (!isAdmin) return setStatus("🚫 Not authorized.");
    if (await sendTx("endVoting")) {
      setStatus("✅ Voting ended manually.");
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Voting Report", 14, 20);

    doc.setFontSize(12);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
    doc.text(`Total Voters Registered: ${voterCount}`, 14, 40);

    doc.setFontSize(14);
    doc.text("Candidates & Vote Count:", 14, 55);

    let y = 65;
    candidateStats.forEach((c, i) => {
      doc.text(`${i + 1}. ${c.name} - 🗳️ ${c.votes} vote(s)`, 20, y);
      y += 10;
    });

    doc.save("voting-report.pdf");
  };


  const generateReport = async () => {
    const contract = await getContract();
    let winnerName = "N/A";

    try {
      winnerName = await contract.getWinner();
    } catch (err) {
      console.warn("No winner yet:", err.message);
    }

    const rows = candidateStats.map((c) => ({
      "Candidate ID": c.id,
      "Candidate Name": c.name,
      "Vote Count": c.votes,
    }));

    rows.push({ "Candidate ID": "", "Candidate Name": "🏆 Winner", "Vote Count": winnerName });

    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "voting-report.csv");
  };


  // src/pages/AdminDashboard.jsx
  // ... (keep all imports and state variables the same)


  return (
    <PageWrapper>
      <div className="min-h-screen bg-gradient-to-br from-gray-100 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4 py-10 transition-colors">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header Section with SlideUp */}
          <SlideUp>
            <div className="flex justify-between items-center">
              <h2 className="text-4xl font-bold text-indigo-700 dark:text-indigo-400 bg-clip-text">
                🛠 Admin Dashboard
              </h2>

              {votingEnded && (
                <HoverScale>
                  <div className="relative group">
                    <button className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2">
                      Download Reports
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                    <div className="absolute right-0 mt-1 w-48 origin-top-right bg-white dark:bg-gray-800 rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all">
                      <div className="py-1">
                        <button
                          onClick={handleExportPDF}
                          className="block w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          PDF Format
                        </button>
                        <button
                          onClick={generateReport}
                          className="block w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          CSV Format
                        </button>
                      </div>
                    </div>
                  </div>
                </HoverScale>
              )}
            </div>
          </SlideUp>

          {/* Top Row - Stats Cards with FadeIn */}
          <FadeIn delay={100}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <TiltCard className="hover:shadow-2xl transition-shadow duration-300">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10" />
                  <div className="flex items-center gap-4 relative z-10">
                    <div className="p-3 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
                      <UsersIcon className="h-8 w-8 text-indigo-600 dark:text-indigo-300" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-500 dark:text-gray-400">Voters Registered</h3>
                      <p className="text-3xl font-bold text-gray-800 dark:text-white">{voterCount}</p>
                    </div>
                  </div>
                </div>
              </TiltCard>

              <TiltCard className="hover:shadow-2xl transition-shadow duration-300">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10" />
                  <div className="flex items-center gap-4 relative z-10">
                    <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                      <ChartBarIcon className="h-8 w-8 text-purple-600 dark:text-purple-300" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-500 dark:text-gray-400">Candidates</h3>
                      <p className="text-3xl font-bold text-gray-800 dark:text-white">{candidateStats.length}</p>
                    </div>
                  </div>
                </div>
              </TiltCard>
            </div>
          </FadeIn>

          {/* Middle Row - Management Sections with Staggered FadeIn */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FadeIn delay={200}>
              <TiltCard className="hover:shadow-2xl transition-shadow duration-300">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg space-y-4">
                  <h3 className="text-xl font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                    <PlusIcon className="h-6 w-6 text-purple-500" />
                    👤 Manage Candidates
                  </h3>
                  <input
                    type="text"
                    placeholder="Candidate Name"
                    className="w-full p-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-transparent dark:text-white"
                    value={candidateName}
                    onChange={(e) => setCandidateName(e.target.value)}
                    disabled={!isAdmin || loading}
                  />
                  <input
                    type="text"
                    placeholder="Image URL (https://...)"
                    className="w-full p-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-transparent dark:text-white"
                    value={candidateImage}
                    onChange={(e) => setCandidateImage(e.target.value)}
                    disabled={!isAdmin || loading}
                  />
                  <button
                    onClick={handleAddCandidate}
                    disabled={!isAdmin || loading}
                    className={`w-full py-3 flex items-center justify-center gap-2 rounded-lg font-medium transition ${!isAdmin || loading
                      ? "bg-gray-200 dark:bg-gray-700 cursor-not-allowed text-gray-400"
                      : "bg-purple-600 hover:bg-purple-700 text-white"
                      }`}
                  >
                    <PlusIcon className="h-5 w-5" />
                    Add Candidate
                  </button>
                </div>
              </TiltCard>
            </FadeIn>

            <FadeIn delay={300}>
              <TiltCard className="hover:shadow-2xl transition-shadow duration-300">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg space-y-4">
                  <h3 className="text-xl font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                    <ClockIcon className="h-6 w-6 text-blue-500" />
                    🕒 Voting Session
                  </h3>
                  <input
                    type="datetime-local"
                    className="w-full p-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-transparent dark:text-white"
                    value={deadlineInput}
                    onChange={(e) => setDeadlineInput(e.target.value)}
                    disabled={!isAdmin || votingStarted || loading}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={handleStartVoting}
                      disabled={!isAdmin || votingStarted || loading}
                      className={`py-3 flex items-center justify-center gap-2 rounded-lg font-medium transition ${!isAdmin || votingStarted || loading
                        ? "bg-gray-200 dark:bg-gray-700 cursor-not-allowed text-gray-400"
                        : "bg-green-600 hover:bg-green-700 text-white"
                        }`}
                    >
                      <ClockIcon className="h-5 w-5" />
                      Start
                    </button>
                    <button
                      onClick={handleEndVoting}
                      disabled={!isAdmin || !votingStarted || votingEnded || loading}
                      className={`py-3 flex items-center justify-center gap-2 rounded-lg font-medium transition ${!isAdmin || !votingStarted || votingEnded || loading
                        ? "bg-gray-200 dark:bg-gray-700 cursor-not-allowed text-gray-400"
                        : "bg-red-600 hover:bg-red-700 text-white"
                        }`}
                    >
                      <StopIcon className="h-5 w-5" />
                      End
                    </button>
                  </div>
                </div>
              </TiltCard>
            </FadeIn>
          </div>

          {/* Bottom Row - Live Results with SlideUp */}
          <SlideUp>
            <TiltCard className="hover:shadow-2xl transition-shadow duration-300">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
                <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white flex items-center gap-2">
                  <ChartBarIcon className="h-6 w-6 text-green-500" />
                  📊 Live Results
                </h3>
                <div className="space-y-3">
                  {candidateStats.map((c) => (
                    <div
                      key={c.id}
                      className="flex justify-between items-center p-3 rounded-lg bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    >
                      <span className="font-medium text-gray-800 dark:text-gray-200">{c.name}</span>
                      <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-sm">
                        🗳️ {c.votes}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </TiltCard>
          </SlideUp>

          {/* Status Feedback with FadeIn */}
          <FadeIn>
            {status && (
              <div className="text-center">
                {status && (
                  <div className="text-center">
                    <div
                      className={`inline-block px-6 py-3 rounded-full text-sm font-medium transition-all ${status.startsWith("✅")
                        ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                        : status.startsWith("❌")
                          ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                          : "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                        }`}
                    >
                      {loading ? "⏳ " : ""}
                      {status.replace(/^⏳ /, "")}
                    </div>
                  </div>
                )}
              </div>
            )}
          </FadeIn>
        </div>
      </div>
    </PageWrapper>
  );
}

