// src/pages/VotingPage.jsx
import React, { useEffect, useState } from "react";
import { getContract, subscribeToVotingEvents, unsubscribeFromVotingEvents } from "../utils/blockchain";
import { ethers } from "ethers";
import { FingerPrintIcon, CheckCircleIcon } from "@heroicons/react/24/solid";
import PageWrapper from "../components/PageWrapper";
import { TiltCard, FadeIn, HoverScale, SlideUp } from "../components/Animations";

const candidateImages = JSON.parse(localStorage.getItem("candidateImages") || "{}");

export default function VotingPage() {
  const [candidates, setCandidates] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [status, setStatus] = useState("");
  const [votingStarted, setVotingStarted] = useState(false);
  const [votingEnded, setVotingEnded] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [votedCandidateName, setVotedCandidateName] = useState("");
  const [deadline, setDeadline] = useState(null);
  const [timeLeft, setTimeLeft] = useState("");
  const [biometricVerified, setBiometricVerified] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [voteCounts, setVoteCounts] = useState({});
  const [credentialIdHash, setCredentialIdHash] = useState("");

  const loadContractData = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const user = await signer.getAddress();
      const contract = await getContract();

      // Get fresh contract state
      const [started, ended, contractDeadline] = await Promise.all([
        contract.votingStarted(),
        contract.votingEnded(),
        contract.votingDeadline()
      ]);

      setVotingStarted(started);
      setVotingEnded(ended);
      setDeadline(new Date(Number(contractDeadline) * 1000));

      // Load candidates and votes
      const count = Number(await contract.candidatesCount());
      const list = [];
      const counts = {};
      for (let i = 1; i <= count; i++) {
        const c = await contract.candidates(i);
        list.push({ id: Number(c.id), name: c.name });
        counts[c.id] = Number(c.voteCount);
      }
      setCandidates(list);
      setVoteCounts(counts);

      // Check voter status
      const voter = await contract.voters(user);
      if (voter.hasVoted) {
        setHasVoted(true);
        const chosen = await contract.candidates(voter.votedCandidateId);
        setVotedCandidateName(chosen.name);
      }
    } catch (err) {
      console.error(err);
      setStatus("❌ " + (err.reason || err.message));
    }
  };

  useEffect(() => {
    // Initial load
    loadContractData();

    // Setup event listeners
    const handleVoteCast = () => loadContractData();
    const handleVotingStarted = () => loadContractData();
    const handleVotingEnded = () => loadContractData();

    subscribeToVotingEvents({
      onVoteCast: handleVoteCast,
      onVotingStarted: handleVotingStarted,
      onVotingEnded: handleVotingEnded
    });

    return () => unsubscribeFromVotingEvents();
  }, []);

  useEffect(() => {
    if (!deadline || votingEnded) return;

    const updateTimer = () => {
      const diff = Math.max(0, deadline - new Date());
      if (diff <= 0) {
        setVotingEnded(true);
        setTimeLeft("⏰ Voting has ended.");
      } else {
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${minutes}m ${seconds}s remaining`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [deadline, votingEnded]);

  const simulateBiometricScan = async () => {
    setScanning(true);
    setStatus("🔍 Authenticating via fingerprint...");
    try {
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: new Uint8Array(32),
          timeout: 60000,
          userVerification: "required"
        }
      });

      const rawId = new Uint8Array(credential.rawId);
      const hash = ethers.keccak256(rawId);
      setCredentialIdHash(hash);
      setBiometricVerified(true);
      setStatus("✅ Biometric match verified.");
    } catch (err) {
      console.error("❌ WebAuthn failed:", err);
      setStatus("❌ Biometric authentication failed. Make sure it's enabled on this device.");
    } finally {
      setScanning(false);
    }
  };

  const handleVote = async () => {
    if (!selectedId || !biometricVerified) return;

    setStatus("⏳ Submitting vote...");
    try {
      const contract = await getContract();
      const tx = await contract.vote(selectedId, credentialIdHash);

      // Wait for transaction with error handling
      const receipt = await tx.wait().catch(err => {
        if (err.code === "TRANSACTION_REPLACED") {
          if (err.replacement) return err.replacement.wait();
        }
        throw err;
      });

      if (receipt.status === 1) {
        await loadContractData(); // Refresh all data after successful vote
        const voted = candidates.find(c => c.id === selectedId);
        setVotedCandidateName(voted?.name || "Unknown");
        setStatus("✅ Vote cast successfully.");
      } else {
        setStatus("❌ Transaction failed");
      }
    } catch (err) {
      console.error(err);
      setStatus("❌ " + (err.reason || err.message || "Voting failed"));
    }
  };


   return (
    <PageWrapper>
      <div className="min-h-screen bg-gradient-to-br from-gray-100 to-blue-100 dark:from-gray-900 dark:to-gray-800 transition-colors duration-500 flex items-center justify-center px-4 py-10">
        <TiltCard className="w-full max-w-md">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-xl transition-all duration-300">
            <FadeIn delay={200}>
              <h2 className="text-3xl font-bold text-center text-indigo-700 dark:text-indigo-400 mb-4">
                🗳️ Cast Your Vote
              </h2>
            </FadeIn>

            {timeLeft && (
              <FadeIn>
                <p className="text-center text-sm mb-4 text-blue-500 animate-pulse">{timeLeft}</p>
              </FadeIn>
            )}

            {!votingStarted || votingEnded ? (
              <SlideUp>
                <p className="text-red-600 dark:text-red-400 text-center font-medium">⚠️ Voting is closed.</p>
              </SlideUp>
            ) : hasVoted ? (
              <SlideUp>
                <div className="text-green-700 dark:text-green-400 text-center text-lg font-medium">
                  ✅ You voted for <strong>{votedCandidateName}</strong>.
                </div>
              </SlideUp>
            ) : (
              <>
                <div className="space-y-4 mb-6">
                  {candidates.map((c) => (
                    <SlideUp key={c.id}>
                      <HoverScale>
                        <div
                          onClick={() => setSelectedId(c.id)}
                          className={`flex items-center gap-4 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                            selectedId === c.id
                              ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-800/20"
                              : "border-gray-300 dark:border-gray-700"
                          }`}
                        >
                          <img
                            src={candidateImages[c.id] || "https://via.placeholder.com/50"}
                            alt={c.name}
                            className="w-12 h-12 rounded-full border object-cover"
                          />
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-800 dark:text-white">{c.name}</span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              🗳️ Votes: {voteCounts[c.id] || 0}
                            </span>
                          </div>
                        </div>
                      </HoverScale>
                    </SlideUp>
                  ))}
                </div>

                {!biometricVerified && (
                  <FadeIn>
                    <div className="mb-4 text-center">
                      <HoverScale>
                        <button
                          onClick={simulateBiometricScan}
                          disabled={scanning}
                          className={`w-full py-3 flex justify-center items-center gap-2 rounded-lg text-white font-semibold transition ${
                            scanning
                              ? "bg-indigo-400 animate-pulse"
                              : "bg-indigo-600 hover:bg-indigo-700"
                          }`}
                        >
                          <FingerPrintIcon className="h-5 w-5" />
                          {scanning ? "Scanning..." : "Authenticate with Fingerprint"}
                        </button>
                      </HoverScale>
                    </div>
                  </FadeIn>
                )}

                {biometricVerified && (
                  <FadeIn>
                    <div className="flex justify-center mb-4">
                      <div className="flex items-center gap-2 bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 px-4 py-2 rounded-full font-semibold">
                        <CheckCircleIcon className="h-5 w-5" />
                        Biometric verified!
                      </div>
                    </div>
                  </FadeIn>
                )}

                <FadeIn>
                  <HoverScale>
                    <button
                      onClick={handleVote}
                      disabled={!biometricVerified || hasVoted || votingEnded}
                      className={`w-full py-2 rounded text-white font-semibold transition duration-200 ${
                        biometricVerified && !hasVoted && !votingEnded
                          ? "bg-green-600 hover:bg-green-700"
                          : "bg-gray-400 cursor-not-allowed"
                      }`}
                    >
                      🗳️ Cast Vote
                    </button>
                  </HoverScale>
                </FadeIn>
              </>
            )}

            {status && (
              <FadeIn>
                <p
                  className={`mt-6 text-sm text-center transition-all duration-300 ${
                    status.startsWith("✅")
                      ? "text-green-700 dark:text-green-300"
                      : status.startsWith("❌")
                        ? "text-red-600 dark:text-red-300"
                        : "text-gray-600 dark:text-gray-300"
                  }`}
                >
                  {status}
                </p>
              </FadeIn>
            )}
          </div>
        </TiltCard>
      </div>
    </PageWrapper>
  );
}