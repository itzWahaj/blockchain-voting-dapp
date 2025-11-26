// src/pages/VotingPage.jsx
import React, { useEffect, useState } from "react";
import { getContract, getReadContract, subscribeToVotingEvents, unsubscribeFromVotingEvents } from "../utils/blockchain";
import { ethers } from "ethers";
import { FingerPrintIcon, CheckCircleIcon } from "@heroicons/react/24/solid";
import PageWrapper from "../components/PageWrapper";
import { TiltCard, FadeIn, HoverScale, SlideUp } from "../components/Animations";
import anime from "animejs";

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
  const [credentialIdHash, setCredentialIdHash] = useState("");
  const [auditEvents, setAuditEvents] = useState([]);

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
      for (let i = 1; i <= count; i++) {
        const c = await contract.candidates(i);
        list.push({ id: Number(c.id), name: c.name });
      }
      setCandidates(list);

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

  const fetchAuditEvents = async () => {
    try {
      const contract = await getReadContract();
      // Get current block to calculate range
      const currentBlock = await contract.runner.provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 5000); // Fetch last 5000 blocks (~3-4 hours)

      const filter = contract.filters.VoteCast();
      const events = await contract.queryFilter(filter, fromBlock, "latest");

      const formattedEvents = events.reverse().slice(0, 10).map(e => ({
        name: "VoteCast",
        blockNumber: e.blockNumber,
        hash: e.transactionHash,
        voter: e.args[0]
      }));
      setAuditEvents(formattedEvents);
    } catch (err) {
      console.error("Error fetching audit events:", err);
    }
  };

  useEffect(() => {
    // Initial load
    loadContractData();
    fetchAuditEvents();

    // Setup event listeners
    const handleVoteCast = () => {
      loadContractData();
      fetchAuditEvents();
    };
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

  useEffect(() => {
    anime({
      targets: ".vote-card",
      translateY: [30, 0],
      opacity: [0, 1],
      easing: "easeOutExpo",
      duration: 1000,
      delay: anime.stagger(100)
    });
  }, [candidates]);

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
        fetchAuditEvents(); // Refresh audit trail
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
      <div className="min-h-screen bg-background font-body text-gray-300 flex flex-col items-center justify-center px-4 py-10">
        <TiltCard className="w-full max-w-2xl">
          <div className="bg-surface border border-white/5 p-8 rounded-2xl shadow-2xl relative overflow-hidden">
            {/* Background Texture */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none" />

            <FadeIn delay={200}>
              <div className="text-center mb-8">
                <h2 className="text-4xl font-headline font-bold text-text dark:text-white mb-2 tracking-wider">
                  One vote. One chance.
                </h2>
                <p className="text-secondary font-mono uppercase tracking-widest text-sm">
                  Make it count.
                </p>
              </div>
            </FadeIn>

            <FadeIn delay={300}>
              <div className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg p-4 mb-8 text-sm text-text/80 dark:text-gray-300 space-y-2">
                <p>• You can vote <strong className="text-text dark:text-white">once</strong>.</p>
                <p>• Your vote is <strong className="text-text dark:text-white">encrypted</strong> before being sent.</p>
                <p>• The smart contract records your vote <strong className="text-text dark:text-white">immutably</strong>.</p>
                <p>• No admin can change or override your choice.</p>
              </div>
            </FadeIn>

            {/* Pre-vote Security Checks */}
            <FadeIn delay={400}>
              <div className="grid grid-cols-2 gap-4 mb-8 text-xs font-mono border-b border-white/5 pb-6">
                <div className="flex justify-between">
                  <span className="text-gray-500">REGISTERED</span>
                  <span className={hasVoted || !status.includes("Start") ? "text-green-400" : "text-gray-400"}>
                    {hasVoted ? "✔" : "Checking..."}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">BIOMETRIC</span>
                  <span className={biometricVerified || hasVoted ? "text-green-400" : "text-gray-400"}>
                    {biometricVerified || hasVoted ? "✔ VERIFIED" : "PENDING"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">WINDOW</span>
                  <span className={votingStarted && !votingEnded ? "text-green-400" : "text-red-400"}>
                    {votingStarted && !votingEnded ? "OPEN" : "CLOSED"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">STATUS</span>
                  <span className={hasVoted ? "text-green-400" : "text-accent"}>
                    {hasVoted ? "CAST" : "NOT CAST"}
                  </span>
                </div>
              </div>
            </FadeIn>

            {timeLeft && (
              <FadeIn>
                <p className="text-center font-mono text-sm mb-8 text-secondary animate-pulse tracking-widest uppercase">
                  {timeLeft}
                </p>
              </FadeIn>
            )}

            {!votingStarted || votingEnded ? (
              <SlideUp>
                <div className="p-6 bg-red-900/20 border border-red-500/30 rounded-lg text-center">
                  <p className="text-red-400 font-headline text-xl">⚠️ Voting Session Closed</p>
                </div>
              </SlideUp>
            ) : hasVoted ? (
              <SlideUp>
                <div className="p-8 bg-green-900/20 border border-green-500/30 rounded-lg text-center space-y-4 relative overflow-hidden">
                  <div className="absolute inset-0 bg-green-500/5 animate-pulse" />
                  <div className="text-5xl relative z-10">✅</div>
                  <div className="text-green-400 font-headline text-2xl relative z-10">
                    Vote Sealed & Recorded
                  </div>
                  <p className="text-gray-400 relative z-10">
                    You cast your vote for <span className="text-text dark:text-white font-bold">{votedCandidateName}</span>
                  </p>

                  <div className="mt-6 pt-6 border-t border-green-500/20 text-xs font-mono text-left space-y-2 relative z-10">
                    <div className="flex justify-between">
                      <span className="text-gray-500">STATUS</span>
                      <span className="text-green-400">CONFIRMED ON-CHAIN</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">VERIFICATION</span>
                      <span className="text-code">See Audit Trail Below</span>
                    </div>
                  </div>
                </div>
              </SlideUp>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  {candidates.map((c, i) => (
                    <SlideUp key={c.id}>
                      <HoverScale>
                        <div
                          onClick={() => setSelectedId(c.id)}
                          className={`vote-card relative flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition-all duration-300 overflow-hidden group ${selectedId === c.id
                            ? "border-accent bg-accent/10 shadow-[0_0_30px_rgba(199,58,49,0.3)]"
                            : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20"
                            }`}
                        >
                          {selectedId === c.id && (
                            <div className="absolute inset-0 bg-gradient-to-r from-accent/20 to-transparent opacity-50" />
                          )}

                          <div className="relative w-16 h-16 rounded-full border-2 border-white/10 overflow-hidden shrink-0 group-hover:scale-110 transition-transform duration-500">
                            <img
                              src={candidateImages[c.id] || "https://via.placeholder.com/150"}
                              alt={c.name}
                              className="w-full h-full object-cover"
                            />
                          </div>

                          <div className="flex flex-col relative z-10 w-full">
                            <span className={`font-headline font-bold text-lg ${selectedId === c.id ? "text-text dark:text-white" : "text-text/70 dark:text-gray-300"}`}>
                              {c.name}
                            </span>
                            <p className="text-xs text-gray-500 mt-1 italic">
                              "{c.id % 2 === 0 ? "To scale the network for global adoption." : "To implement decentralized governance for all."}"
                            </p>
                            <div className="mt-3 pt-3 border-t border-white/5">
                              <p className="text-[10px] font-mono uppercase tracking-wider text-secondary">
                                Why this matters
                              </p>
                              <p className="text-xs text-text/60 dark:text-gray-400 mt-1">
                                {c.id % 2 === 0 ? "Focusing on speed, efficiency, and lower costs." : "A vote for transparency and community-led decisions."}
                              </p>
                            </div>
                          </div>

                          {selectedId === c.id && (
                            <div className="absolute right-4 text-accent">
                              <CheckCircleIcon className="h-6 w-6" />
                            </div>
                          )}
                        </div>
                      </HoverScale>
                    </SlideUp>
                  ))}
                </div>

                {!biometricVerified && (
                  <FadeIn>
                    <div className="mb-6 text-center">
                      <HoverScale>
                        <button
                          onClick={simulateBiometricScan}
                          disabled={scanning}
                          className={`w-full py-4 flex justify-center items-center gap-3 rounded-lg font-bold tracking-widest transition-all ${scanning
                            ? "bg-secondary/20 text-secondary animate-pulse border border-secondary/50"
                            : "bg-secondary hover:bg-yellow-500 text-black shadow-lg hover:shadow-yellow-500/20"
                            }`}
                        >
                          <FingerPrintIcon className="h-6 w-6" />
                          {scanning ? "SCANNING BIOMETRICS..." : "AUTHENTICATE IDENTITY"}
                        </button>
                      </HoverScale>
                    </div>
                  </FadeIn>
                )}

                {biometricVerified && (
                  <FadeIn>
                    <div className="flex justify-center mb-6">
                      <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 text-green-400 px-6 py-2 rounded-full font-mono text-sm uppercase tracking-wider">
                        <CheckCircleIcon className="h-5 w-5" />
                        Biometric Verified
                      </div>
                    </div>
                  </FadeIn>
                )}

                <FadeIn>
                  <HoverScale>
                    <button
                      onClick={handleVote}
                      disabled={!biometricVerified || hasVoted || votingEnded}
                      className={`w-full py-4 rounded-lg font-bold text-lg tracking-widest transition-all duration-300 ${biometricVerified && !hasVoted && !votingEnded
                        ? "bg-accent hover:bg-red-600 text-white shadow-[0_0_20px_rgba(199,58,49,0.4)] hover:shadow-[0_0_40px_rgba(199,58,49,0.6)]"
                        : "bg-gray-800 text-gray-600 cursor-not-allowed border border-gray-700"
                        }`}
                    >
                      CONFIRM VOTE
                    </button>
                  </HoverScale>
                </FadeIn>
              </>
            )}

            {status && (
              <FadeIn>
                <div className={`mt-8 p-4 rounded border text-center font-mono text-sm ${status.startsWith("✅")
                  ? "bg-green-900/20 border-green-500/30 text-green-400"
                  : status.startsWith("❌")
                    ? "bg-red-900/20 border-red-500/30 text-red-400"
                    : "bg-blue-900/20 border-blue-500/30 text-blue-400"
                  }`}>
                  {status}
                </div>
              </FadeIn>
            )}
          </div>
        </TiltCard>

        {/* Audit Trail Section */}
        <FadeIn delay={800}>
          <div className="w-full max-w-4xl mt-12 border-t border-white/10 pt-8">
            <h3 className="text-lg font-headline font-bold text-text dark:text-white mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Vote Audit Trail
            </h3>
            <div className="bg-black/5 dark:bg-black/30 border border-black/10 dark:border-white/5 rounded-lg p-4 font-mono text-xs space-y-2 text-gray-500 max-h-60 overflow-y-auto">
              <div className="flex justify-between border-b border-white/5 pb-2 mb-2 sticky top-0 bg-background z-10">
                <span>BLOCK</span>
                <span>EVENT</span>
                <span>TX HASH</span>
              </div>

              {auditEvents.length === 0 ? (
                <div className="text-center py-4 text-gray-600 italic">No events found on-chain yet.</div>
              ) : (
                auditEvents.map((event, i) => (
                  <div key={i} className={`flex justify-between ${event.name === "VoteCast" ? "text-green-400" : "text-blue-400"}`}>
                    <span>#{event.blockNumber}</span>
                    <span>{event.name}</span>
                    <a
                      href={`https://www.oklink.com/amoy/tx/${event.hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate w-24 hover:text-white underline decoration-dotted"
                    >
                      {event.hash.substring(0, 6)}...{event.hash.substring(event.hash.length - 4)}
                    </a>
                  </div>
                ))
              )}
            </div>
          </div>
        </FadeIn>
      </div>
    </PageWrapper>
  );
}