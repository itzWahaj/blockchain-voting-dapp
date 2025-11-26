// src/pages/ResultPage.jsx
import React, { useEffect, useState } from "react";
import { getContract } from "../utils/blockchain";
import { ethers } from "ethers";
import { TrophyIcon, ClockIcon, ChartBarIcon, ShieldCheckIcon, ArrowRightIcon, XMarkIcon } from "@heroicons/react/24/solid";
import PageWrapper from "../components/PageWrapper";
import { AnimatePresence, motion } from "framer-motion";

// --- COMPONENTS ---

const ModalStep = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
    exit={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
    transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
    className="flex flex-col items-center justify-center w-full max-w-4xl mx-auto h-full relative z-10"
  >
    {children}
  </motion.div>
);

const ActionButton = ({ onClick, children, icon: Icon }) => (
  <motion.button
    whileHover={{ scale: 1.05, backgroundColor: "rgba(230, 184, 91, 0.2)" }}
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    className="mt-12 px-8 py-4 bg-[#e6b85b]/10 border border-[#e6b85b]/50 text-[#e6b85b] rounded-full font-headline font-bold tracking-widest uppercase flex items-center gap-3 transition-all hover:shadow-[0_0_30px_rgba(230,184,91,0.2)]"
  >
    {children}
    {Icon && <Icon className="h-5 w-5" />}
  </motion.button>
);

export default function ResultPage() {
  const [winner, setWinner] = useState("");
  const [votingEnded, setVotingEnded] = useState(false);
  const [deadline, setDeadline] = useState(null);
  const [timeLeft, setTimeLeft] = useState("");
  const [candidates, setCandidates] = useState([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [registeredVoters, setRegisteredVoters] = useState(0);
  const [currentBlock, setCurrentBlock] = useState(0);
  const [contractAddress, setContractAddress] = useState("");

  // Reveal Flow State
  const [showReveal, setShowReveal] = useState(false);
  const [step, setStep] = useState(1);

  // --- DATA FETCHING ---

  const fetchData = async () => {
    try {
      const contract = await getContract();
      setContractAddress(contract.target);
      const provider = new ethers.BrowserProvider(window.ethereum);

      const [ended, count, blockNumber, voters] = await Promise.all([
        contract.votingEnded(),
        contract.candidatesCount(),
        provider.getBlockNumber(),
        contract.getVoterAddresses()
      ]);

      setVotingEnded(ended);
      setCurrentBlock(blockNumber);
      setRegisteredVoters(voters.length);

      // Fetch candidates
      const list = [];
      let total = 0;
      for (let i = 1; i <= Number(count); i++) {
        const c = await contract.candidates(i);
        const votes = Number(c.voteCount);
        list.push({
          id: Number(c.id),
          name: c.name,
          voteCount: votes
        });
        total += votes;
      }
      setCandidates(list);
      setTotalVotes(total);

      // Fetch winner if ended
      if (ended) {
        try {
          const w = await contract.getWinner();
          setWinner(w);
          // Auto-trigger reveal if not seen
          if (!localStorage.getItem("resultsRevealed")) {
            setShowReveal(true);
          }
        } catch (e) {
          console.warn("Winner not ready");
        }
      }

      // Deadline
      const storedDeadline = localStorage.getItem("votingDeadline");
      if (storedDeadline) {
        setDeadline(new Date(parseInt(storedDeadline, 10) * 1000));
      }

    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

  // Timer
  useEffect(() => {
    if (!deadline) return;
    const interval = setInterval(() => {
      const diff = deadline - new Date();
      if (diff <= 0) {
        setTimeLeft("Voting Closed");
        setVotingEnded(true);
      } else {
        const m = Math.floor(diff / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${m}m ${s}s remaining`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [deadline]);


  // --- HANDLERS ---

  const handleNext = () => setStep(s => s + 1);
  const handleFinish = () => {
    setShowReveal(false);
    localStorage.setItem("resultsRevealed", "true");
  };
  const handleReplay = () => {
    setStep(1);
    setShowReveal(true);
  };

  // --- RENDER STEPS ---

  const renderStep = () => {
    switch (step) {
      case 1: // LEDGER REVEAL
        return (
          <ModalStep key="step1">
            <h1 className="text-5xl md:text-7xl font-headline font-bold text-center mb-4 tracking-widest uppercase text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
              The Ledger<br />Reveals The Truth.
            </h1>
            <p className="text-[#e6b85b] font-mono text-sm md:text-base uppercase tracking-[0.3em] mb-12">
              Immutable. Verifiable. Final.
            </p>

            <div className="space-y-6 text-center text-gray-400 font-light text-lg max-w-xl">
              <p>• Results are computed <strong className="text-white">automatically</strong>.</p>
              <p>• No manual tallying — <strong className="text-white">code is law</strong>.</p>
              <p>• Every vote is recorded on the <strong className="text-white">public ledger</strong>.</p>
            </div>

            <ActionButton onClick={handleNext} icon={ArrowRightIcon}>
              View Winner
            </ActionButton>
          </ModalStep>
        );

      case 2: // WINNER REVEAL
        return (
          <ModalStep key="step2">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.2 }}
              className="mb-8 relative"
            >
              <div className="absolute inset-0 bg-[#e6b85b] blur-[60px] opacity-20" />
              <TrophyIcon className="h-32 w-32 text-[#e6b85b] drop-shadow-[0_0_30px_rgba(230,184,91,0.6)] relative z-10" />
            </motion.div>

            <h2 className="text-sm font-mono text-gray-500 uppercase tracking-widest mb-4">The People Have Spoken</h2>
            <h1 className="text-6xl md:text-8xl font-headline font-bold text-white mb-12 tracking-wide drop-shadow-2xl">
              {winner || "Loading..."}
            </h1>

            <div className="grid grid-cols-3 gap-4 md:gap-8 w-full max-w-2xl">
              {[
                { label: "BLOCK", value: `#${currentBlock}` },
                { label: "TOTAL VOTES", value: totalVotes },
                { label: "REGISTERED", value: registeredVoters }
              ].map((stat, i) => (
                <div key={i} className="bg-surface border border-white/10 p-4 rounded-lg text-center">
                  <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider mb-1">{stat.label}</p>
                  <p className="text-xl font-bold text-white font-mono">{stat.value}</p>
                </div>
              ))}
            </div>

            <ActionButton onClick={handleNext} icon={ArrowRightIcon}>
              View Tally
            </ActionButton>
          </ModalStep>
        );

      case 3: // LIVE TALLY
        return (
          <ModalStep key="step3">
            <h2 className="text-4xl font-headline font-bold text-white mb-12 tracking-widest uppercase flex items-center gap-4">
              <ChartBarIcon className="h-8 w-8 text-[#e6b85b]" />
              Live Tally
            </h2>

            <div className="w-full max-w-3xl space-y-4">
              {candidates.sort((a, b) => b.voteCount - a.voteCount).map((c, i) => {
                const percent = totalVotes > 0 ? ((c.voteCount / totalVotes) * 100).toFixed(1) : 0;
                return (
                  <motion.div
                    key={c.id}
                    initial={{ x: -50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-surface border border-white/10 p-6 rounded-xl relative overflow-hidden group"
                  >
                    {/* Bar Background */}
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percent}%` }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                      className="absolute inset-y-0 left-0 bg-[#e6b85b]/10 group-hover:bg-[#e6b85b]/20 transition-colors"
                    />

                    <div className="relative z-10 flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <span className="text-2xl font-bold text-gray-500 font-mono">#{i + 1}</span>
                        <div>
                          <h3 className="text-xl font-bold text-white">{c.name}</h3>
                          <p className="text-xs text-gray-500 font-mono uppercase">Candidate ID: {c.id}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-[#e6b85b]">{percent}%</p>
                        <p className="text-sm text-gray-400 font-mono">{c.voteCount} Votes</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <ActionButton onClick={handleNext} icon={ShieldCheckIcon}>
              Audit Election
            </ActionButton>
          </ModalStep>
        );

      case 4: // AUDIT
        return (
          <ModalStep key="step4">
            <h2 className="text-3xl font-headline font-bold text-white mb-8 tracking-widest uppercase">
              Audit The Election
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-5xl mb-12">
              <div className="bg-surface border border-white/10 p-6 rounded-xl font-mono text-xs relative group">
                <div className="absolute top-0 right-0 p-2 opacity-50 group-hover:opacity-100 transition-opacity">
                  <ShieldCheckIcon className="h-5 w-5 text-green-500" />
                </div>
                <p className="text-gray-500 mb-2 uppercase tracking-wider">Event Signature</p>
                <code className="text-[#e6b85b] block mb-4 text-sm">VoteCast(address voter, uint candidateId)</code>
                <a
                  href={`https://www.oklink.com/amoy/address/${contractAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 border border-white/10 hover:bg-white/5 text-gray-400 hover:text-white rounded transition-colors uppercase tracking-wider text-[10px] block text-center"
                >
                  View on Polygonscan
                </a>
              </div>

              <div className="bg-surface border border-white/10 p-6 rounded-xl font-mono text-xs relative group">
                <div className="absolute top-0 right-0 p-2 opacity-50 group-hover:opacity-100 transition-opacity">
                  <ShieldCheckIcon className="h-5 w-5 text-green-500" />
                </div>
                <p className="text-gray-500 mb-2 uppercase tracking-wider">Event Signature</p>
                <code className="text-[#e6b85b] block mb-4 text-sm">ElectionClosed(uint blockNumber)</code>
                <a
                  href={`https://www.oklink.com/amoy/address/${contractAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 border border-white/10 hover:bg-white/5 text-gray-400 hover:text-white rounded transition-colors uppercase tracking-wider text-[10px] block text-center"
                >
                  View on Polygonscan
                </a>
              </div>
            </div>

            <p className="text-gray-500 text-center max-w-2xl mb-8 font-light">
              Every vote is recorded on the open ledger. Nothing is hidden. Nothing can be altered.
            </p>

            <ActionButton onClick={handleFinish} icon={XMarkIcon}>
              Finish
            </ActionButton>
          </ModalStep>
        );

      default:
        return null;
    }
  };

  return (
    <PageWrapper>
      <div className="min-h-screen bg-background text-gray-300 font-body relative overflow-hidden">
        {/* Background Grain & Vignette */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-transparent to-background/80" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,var(--color-background)_100%)] opacity-80" />
        </div>

        {/* --- FULL SCREEN MODAL FLOW --- */}
        <AnimatePresence mode="wait">
          {showReveal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center p-6"
            >
              {renderStep()}
            </motion.div>
          )}
        </AnimatePresence>


        {/* --- NORMAL DASHBOARD (Behind the scenes / After finish) --- */}
        <div className="relative z-10 container mx-auto px-4 py-12 flex flex-col items-center">
          {!votingEnded ? (
            <div className="text-center py-20">
              <ClockIcon className="h-20 w-20 text-[#e6b85b] mx-auto mb-6 animate-pulse" />
              <h1 className="text-4xl font-headline font-bold text-text dark:text-white mb-4">Election in Progress</h1>
              <p className="text-xl text-[#e6b85b] font-mono">{timeLeft || "Calculating..."}</p>
              <p className="text-gray-500 mt-4 max-w-md mx-auto">
                Results are encrypted and sealed until the voting deadline is reached.
              </p>
            </div>
          ) : (
            <div className="w-full max-w-4xl">
              <div className="flex justify-between items-end mb-8 border-b border-white/10 pb-4">
                <div>
                  <h1 className="text-3xl font-headline font-bold text-text dark:text-white">Election Results</h1>
                  <p className="text-gray-500 text-sm mt-1">Finalized on Block #{currentBlock}</p>
                </div>
                <button
                  onClick={handleReplay}
                  className="px-4 py-2 bg-[#e6b85b]/10 hover:bg-[#e6b85b]/20 text-[#e6b85b] rounded text-sm font-bold tracking-wider transition-colors"
                >
                  REPLAY REVEAL
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <div className="bg-surface p-6 rounded-xl border border-white/5 text-center">
                  <TrophyIcon className="h-10 w-10 text-[#e6b85b] mx-auto mb-2" />
                  <p className="text-gray-500 text-xs uppercase tracking-widest">Winner</p>
                  <p className="text-2xl font-bold text-text dark:text-white mt-1">{winner}</p>
                </div>
                <div className="bg-surface p-6 rounded-xl border border-white/5 text-center">
                  <ChartBarIcon className="h-10 w-10 text-blue-500 mx-auto mb-2" />
                  <p className="text-gray-500 text-xs uppercase tracking-widest">Total Votes</p>
                  <p className="text-2xl font-bold text-text dark:text-white mt-1">{totalVotes}</p>
                </div>
                <div className="bg-surface p-6 rounded-xl border border-white/5 text-center">
                  <ShieldCheckIcon className="h-10 w-10 text-green-500 mx-auto mb-2" />
                  <p className="text-gray-500 text-xs uppercase tracking-widest">Status</p>
                  <p className="text-2xl font-bold text-text dark:text-white mt-1">Audited</p>
                </div>
              </div>

              <div className="space-y-4">
                {candidates.map((c, i) => (
                  <div key={c.id} className="bg-surface border border-white/5 p-4 rounded-lg flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <span className="text-gray-500 font-mono">#{i + 1}</span>
                      <span className="text-text dark:text-white font-bold">{c.name}</span>
                    </div>
                    <span className="text-[#e6b85b] font-mono">{c.voteCount} Votes</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}