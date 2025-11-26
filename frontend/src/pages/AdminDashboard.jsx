// src/pages/AdminDashboard.jsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  getContract,
  getReadContract,
  subscribeToVotingEvents,
  unsubscribeFromVotingEvents,
  createNewElection,
} from "../utils/blockchain";
import { ethers } from "ethers";
import {
  PlusIcon,
  ClockIcon,
  StopIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  GlobeAltIcon
} from "@heroicons/react/24/solid";
import { saveAs } from "file-saver";
import Papa from "papaparse";
import jsPDF from "jspdf";
import anime from "animejs";

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
  const [adminAddress, setAdminAddress] = useState("");
  const [contractAddress, setContractAddress] = useState("");

  const isFetchingRef = useRef(false);

  const fetchOnchain = useCallback(async (force = false) => {
    if (isFetchingRef.current && !force) return;
    isFetchingRef.current = true;

    try {
      const contract = await getReadContract();
      const [started, ended, adminAddr, voters, totalCandidates] = await Promise.all([
        contract.votingStarted(),
        contract.votingEnded(),
        contract.admin(),
        contract.getVoterAddresses(),
        contract.candidatesCount()
      ]);

      setVotingStarted(started);
      setVotingEnded(ended);
      setVoterCount(voters.length);
      setAdminAddress(adminAddr);
      setContractAddress(contract.target);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const user = await signer.getAddress();
      setIsAdmin(user.toLowerCase() === adminAddr.toLowerCase());

      const stats = [];
      for (let i = 1; i <= totalCandidates; i++) {
        const candidate = await contract.candidates(i);
        stats.push({
          id: Number(candidate.id),
          name: candidate.name,
          votes: Number(candidate.voteCount)
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
    fetchOnchain(true);

    const interval = setInterval(fetchOnchain, 15000);

    return () => {
      unsubscribeFromVotingEvents();
      clearInterval(interval);
    };
  }, [fetchOnchain]);

  useEffect(() => {
    anime({
      targets: ".stat-card",
      translateY: [20, 0],
      opacity: [0, 1],
      delay: anime.stagger(100),
      easing: "easeOutExpo"
    });
  }, [voterCount, candidateStats.length]);

  const sendTx = async (method, ...args) => {
    setLoading(true);
    setStatus("⏳ Sending transaction...");
    try {
      const contract = await getContract();
      const tx = await contract[method](...args, { gasLimit: 200_000 });
      await tx.wait();
      await fetchOnchain(true);
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

  const handleNewElection = async () => {
    if (!isAdmin) return setStatus("🚫 Not authorized.");
    if (!window.confirm("Are you sure you want to start a NEW election? This will deploy a new contract and reset everything.")) return;

    setLoading(true);
    setStatus("⏳ Deploying new election contract...");
    try {
      const newAddress = await createNewElection();
      setStatus(`✅ New election created at ${newAddress}`);
      // Refresh data
      await fetchOnchain(true);
    } catch (err) {
      console.error(err);
      setStatus("❌ Failed to create election: " + (err.reason || err.message));
    } finally {
      setLoading(false);
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

  const getPhase = () => {
    if (votingEnded) return "CLOSED";
    if (votingStarted) return "VOTING ACTIVE";
    return "REGISTRATION";
  };

  return (
    <PageWrapper>
      <div className="min-h-screen bg-background font-body text-gray-300 px-4 py-10">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header Section */}
          <div className="relative z-20">
            <SlideUp>
              <div className="flex justify-between items-end border-b border-white/10 pb-6">
                <div>
                  <h2 className="text-4xl font-headline font-bold text-text dark:text-white tracking-wide">
                    You control the election
                  </h2>
                  <p className="text-secondary font-mono uppercase tracking-widest text-sm mt-2">
                    — not the outcome.
                  </p>
                </div>

                {votingEnded && (
                  <HoverScale>
                    <div className="relative group">
                      <button className="py-2 px-6 bg-secondary hover:bg-yellow-500 text-black rounded-lg font-bold tracking-wider transition-colors flex items-center gap-2">
                        REPORTS
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                      <div className="absolute right-0 mt-2 w-48 bg-surface border border-black/10 dark:border-white/10 rounded-lg shadow-xl invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all z-50">
                        <div className="py-1">
                          <button
                            onClick={handleExportPDF}
                            className="block w-full px-4 py-3 text-sm text-text dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5 text-left transition-colors"
                          >
                            Download PDF
                          </button>
                          <button
                            onClick={generateReport}
                            className="block w-full px-4 py-3 text-sm text-text dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5 text-left transition-colors"
                          >
                            Download CSV
                          </button>
                        </div>
                      </div>
                    </div>
                  </HoverScale>
                )}
              </div>
            </SlideUp>
          </div>

          <FadeIn delay={100}>
            <div className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg p-4 text-sm text-text/80 dark:text-gray-300 space-y-2">
              <p>• <strong className="text-text dark:text-white">Open Registration:</strong> Allows users to begin fingerprint-based registration.</p>
              <p>• <strong className="text-text dark:text-white">Start Voting:</strong> Opens the voting window and locks registration.</p>
              <p>• <strong className="text-text dark:text-white">End Voting:</strong> Seals the election. Immutable results.</p>
            </div>
          </FadeIn>

          {/* Top Row - Stats Cards */}
          <FadeIn delay={200}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <TiltCard className="stat-card hover:shadow-2xl transition-shadow duration-300">
                <div className="bg-surface border border-white/5 p-6 rounded-2xl shadow-lg relative overflow-hidden group h-full">
                  <div className="absolute inset-0 bg-gradient-to-r from-accent/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative z-10">
                    <h3 className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-2">Current Phase</h3>
                    <p className={`text-xl font-headline font-bold ${getPhase() === "VOTING ACTIVE" ? "text-green-400" : "text-text dark:text-white"}`}>
                      {getPhase()}
                    </p>
                  </div>
                </div>
              </TiltCard>

              <TiltCard className="stat-card hover:shadow-2xl transition-shadow duration-300">
                <div className="bg-surface border border-white/5 p-6 rounded-2xl shadow-lg relative overflow-hidden group h-full">
                  <div className="absolute inset-0 bg-gradient-to-r from-secondary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative z-10">
                    <h3 className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-2">Registered Voters</h3>
                    <p className="text-3xl font-headline font-bold text-text dark:text-white">{voterCount}</p>
                  </div>
                </div>
              </TiltCard>

              <TiltCard className="stat-card hover:shadow-2xl transition-shadow duration-300">
                <div className="bg-surface border border-white/5 p-6 rounded-2xl shadow-lg relative overflow-hidden group h-full">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative z-10">
                    <h3 className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-2">Total Votes</h3>
                    <p className="text-3xl font-headline font-bold text-text dark:text-white">
                      {candidateStats.reduce((acc, c) => acc + c.votes, 0)}
                    </p>
                  </div>
                </div>
              </TiltCard>

              <TiltCard className="stat-card hover:shadow-2xl transition-shadow duration-300">
                <div className="bg-surface border border-white/5 p-6 rounded-2xl shadow-lg relative overflow-hidden group h-full">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative z-10">
                    <h3 className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-2">Network</h3>
                    <div className="flex items-center gap-2">
                      <GlobeAltIcon className="h-4 w-4 text-purple-400" />
                      <p className="text-sm font-bold text-text dark:text-white">Polygon Testnet</p>
                    </div>
                  </div>
                </div>
              </TiltCard>
            </div>
          </FadeIn>

          {/* Middle Row - Management Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FadeIn delay={300}>
              <TiltCard className="hover:shadow-2xl transition-shadow duration-300 h-full">
                <div className="bg-surface border border-white/5 p-8 rounded-2xl shadow-lg space-y-6 h-full">
                  <h3 className="text-xl font-headline font-bold text-text dark:text-white flex items-center gap-3 border-b border-white/5 pb-4">
                    <PlusIcon className="h-5 w-5 text-accent" />
                    Manage Candidates
                  </h3>
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="Candidate Name"
                      className="w-full p-3 rounded-lg border border-black/10 dark:border-white/10 bg-black/5 dark:bg-black/30 text-text placeholder-gray-500 focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all"
                      value={candidateName}
                      onChange={(e) => setCandidateName(e.target.value)}
                      disabled={!isAdmin || loading}
                    />
                    <input
                      type="text"
                      placeholder="Image URL (https://...)"
                      className="w-full p-3 rounded-lg border border-black/10 dark:border-white/10 bg-black/5 dark:bg-black/30 text-text placeholder-gray-500 focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all"
                      value={candidateImage}
                      onChange={(e) => setCandidateImage(e.target.value)}
                      disabled={!isAdmin || loading}
                    />
                    <button
                      onClick={handleAddCandidate}
                      disabled={!isAdmin || loading}
                      className={`w-full py-3 flex items-center justify-center gap-2 rounded-lg font-bold tracking-wider transition-all ${!isAdmin || loading
                        ? "bg-gray-800 cursor-not-allowed text-gray-500"
                        : "bg-white/10 hover:bg-accent text-white hover:shadow-lg hover:shadow-accent/20"
                        }`}
                    >
                      <PlusIcon className="h-5 w-5" />
                      ADD CANDIDATE
                    </button>
                    <p className="text-xs text-gray-500 italic text-center">
                      Adds a new candidate to the smart contract. Gas fees apply.
                    </p>
                  </div>
                </div>
              </TiltCard>
            </FadeIn>

            <FadeIn delay={400}>
              <TiltCard className="hover:shadow-2xl transition-shadow duration-300 h-full">
                <div className="bg-surface border border-white/5 p-8 rounded-2xl shadow-lg space-y-6 h-full">
                  <h3 className="text-xl font-headline font-bold text-text dark:text-white flex items-center gap-3 border-b border-white/5 pb-4">
                    <ClockIcon className="h-5 w-5 text-secondary" />
                    Voting Session
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-1 block">Set Deadline</label>
                      <input
                        type="datetime-local"
                        className="w-full p-3 rounded-lg border border-black/10 dark:border-white/10 bg-black/5 dark:bg-black/30 text-text placeholder-gray-500 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-all [color-scheme:light] dark:[color-scheme:dark]"
                        value={deadlineInput}
                        onChange={(e) => setDeadlineInput(e.target.value)}
                        disabled={!isAdmin || votingStarted || loading}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={handleStartVoting}
                        disabled={!isAdmin || votingStarted || loading}
                        className={`py-3 flex items-center justify-center gap-2 rounded-lg font-bold tracking-wider transition-all ${!isAdmin || votingStarted || loading
                          ? "bg-gray-800 cursor-not-allowed text-gray-500"
                          : "bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/20"
                          }`}
                      >
                        START VOTING
                      </button>
                      <button
                        onClick={handleEndVoting}
                        disabled={!isAdmin || !votingStarted || votingEnded || loading}
                        className={`py-3 flex items-center justify-center gap-2 rounded-lg font-bold tracking-wider transition-all ${!isAdmin || !votingStarted || votingEnded || loading
                          ? "bg-gray-800 cursor-not-allowed text-gray-500"
                          : "bg-accent hover:bg-red-600 text-white shadow-lg shadow-red-900/20"
                          }`}
                      >
                        END VOTING
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 italic text-center">
                      "Start" locks registration. "End" seals the election permanently.
                    </p>
                  </div>
                </div>
              </TiltCard>
            </FadeIn>
          </div>

          {/* Bottom Row - Live Results */}
          <SlideUp>
            <TiltCard className="hover:shadow-2xl transition-shadow duration-300">
              <div className="bg-surface border border-white/5 p-8 rounded-2xl shadow-lg">
                <h3 className="text-xl font-headline font-bold mb-6 text-text dark:text-white flex items-center gap-3">
                  <ChartBarIcon className="h-5 w-5 text-green-500" />
                  Live Results
                </h3>
                <div className="space-y-3">
                  {candidateStats.map((c) => (
                    <div
                      key={c.id}
                      className="flex justify-between items-center p-4 rounded-lg bg-black/5 dark:bg-black/30 border border-black/10 dark:border-white/5 hover:border-accent/50 transition-colors"
                    >
                      <span className="font-medium text-text">{c.name}</span>
                      <span className="px-4 py-1 bg-white/5 border border-white/10 text-secondary rounded-full text-sm font-mono">
                        {c.votes} VOTES
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </TiltCard>
          </SlideUp>

          {/* Warning Box */}
          <FadeIn delay={500}>
            <div className="border-l-4 border-accent bg-accent/5 p-4 rounded-r-lg">
              <div className="flex items-start gap-3">
                <ShieldCheckIcon className="h-6 w-6 text-accent shrink-0" />
                <div>
                  <h4 className="font-bold text-text dark:text-white text-sm uppercase tracking-wider mb-1">Admin Warning</h4>
                  <p className="text-xs text-gray-500">
                    These actions are permanent. You must confirm each one via your wallet.
                    The smart contract will reject invalid phase transitions (e.g., trying to vote after the deadline).
                  </p>
                </div>
              </div>
            </div>
          </FadeIn>

          {/* Danger Zone */}
          {isAdmin && (
            <FadeIn delay={600}>
              <div className="mt-8 border border-red-500/20 bg-red-500/5 rounded-xl p-6">
                <h3 className="text-red-400 font-bold font-headline mb-4 flex items-center gap-2">
                  <StopIcon className="h-5 w-5" />
                  Danger Zone
                </h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-text dark:text-white font-bold">Start New Election Cycle</p>
                    <p className="text-sm text-gray-500">
                      Deploys a fresh Voting contract. The current election will be archived on-chain but no longer active in this dashboard.
                    </p>
                  </div>
                  <button
                    onClick={handleNewElection}
                    disabled={loading}
                    className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg tracking-wider transition-colors shadow-lg shadow-red-900/20"
                  >
                    DEPLOY NEW ELECTION
                  </button>
                </div>
              </div>
            </FadeIn>
          )}

          {/* Status Feedback */}
          <FadeIn>
            {status && (
              <div className="text-center pt-4">
                <div
                  className={`inline-block px-6 py-3 rounded-full text-sm font-mono border ${status.startsWith("✅")
                    ? "bg-green-900/20 border-green-500/30 text-green-400"
                    : status.startsWith("❌")
                      ? "bg-red-900/20 border-red-500/30 text-red-400"
                      : "bg-blue-900/20 border-blue-500/30 text-blue-400"
                    }`}
                >
                  {loading ? "⏳ " : ""}
                  {status.replace(/^⏳ /, "")}
                </div>
              </div>
            )}
          </FadeIn>

          <div className="text-center text-xs font-mono text-gray-600 mt-8">
            <p>CONTRACT: {contractAddress || "LOADING..."}</p>
            <p>ADMIN: {adminAddress || "LOADING..."}</p>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
