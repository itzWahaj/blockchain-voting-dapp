// src/pages/ResultPage.jsx
import React, { useEffect, useState } from "react";
import { getContract } from "../utils/blockchain";
import CandidateList from "../components/CandidateList";
import { TrophyIcon, ClockIcon } from "@heroicons/react/24/solid";
import PageWrapper from "../components/PageWrapper";
import { TiltCard, FadeIn, HoverScale, SlideUp } from "../components/Animations";

export default function ResultPage() {
  const [winner, setWinner] = useState("");
  const [votingEnded, setVotingEnded] = useState(false);
  const [deadline, setDeadline] = useState(null);
  const [timeLeft, setTimeLeft] = useState("");
  const [loadingWinner, setLoadingWinner] = useState(false);
  const [milestoneReached, setMilestoneReached] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingEndVote, setLoadingEndVote] = useState(false);

  const fetchVotingStatus = async () => {
    try {
      const contract = await getContract();
      const ended = await contract.votingEnded();
      setVotingEnded(ended);

      const storedDeadline = localStorage.getItem("votingDeadline");
      if (storedDeadline) {
        const deadlineDate = new Date(parseInt(storedDeadline, 10) * 1000);
        setDeadline(deadlineDate);
      }
    } catch (err) {
      console.error("Error fetching status:", err);
    }
  };

  const checkIfAdmin = async () => {
    try {
      const contract = await getContract();
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const userAddress = accounts[0];
      const adminAddress = await contract.admin();
      setIsAdmin(userAddress.toLowerCase() === adminAddress.toLowerCase());
    } catch (error) {
      console.error("Error checking admin status:", error);
    }
  };

  const fetchWinner = async () => {
    setLoadingWinner(true);
    try {
      const contract = await getContract();
      const result = await contract.getWinner();
      setWinner(`🏆 ${result}`);
    } catch (err) {
      console.warn("⚠️ getWinner() failed:", err);
      setWinner("⚠️ Result not available. Admin may need to manually end voting.");
    } finally {
      setLoadingWinner(false);
    }
  };

  const handleEndVoting = async () => {
    setLoadingEndVote(true);
    try {
      const contract = await getContract();
      const tx = await contract.endVoting();
      await tx.wait();
      setVotingEnded(true);
      fetchWinner();
    } catch (error) {
      console.error("❌ Failed to end voting manually:", error);
    } finally {
      setLoadingEndVote(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      await fetchVotingStatus();
      await checkIfAdmin();
    };
    init();
  }, []);

  useEffect(() => {
    if (!deadline) return;

    const interval = setInterval(() => {
      const now = new Date();
      const diff = deadline - now;

      if (diff <= 0) {
        setMilestoneReached(true);
        clearInterval(interval);
      } else {
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${minutes}m ${seconds}s remaining to reveal result`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [deadline]);

  useEffect(() => {
    if (milestoneReached || votingEnded) {
      fetchWinner();
    }
  }, [milestoneReached, votingEnded]);

    return (
    <PageWrapper>
      <div className="min-h-screen bg-gradient-to-br from-gray-100 to-blue-100 dark:from-gray-900 dark:to-gray-800 transition-colors duration-500 flex flex-col items-center justify-center px-4 py-8">
        <TiltCard className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-xl w-full max-w-lg text-center mb-8 transition-all space-y-4">
          <FadeIn delay={200}>
            <h2 className="text-3xl font-bold text-indigo-700 dark:text-indigo-400 mb-2">
              📊 Election Results
            </h2>
          </FadeIn>

          {milestoneReached || votingEnded ? (
            <SlideUp>
              <div className="flex flex-col items-center space-y-3">
                <FadeIn delay={400}>
                  <TrophyIcon className="h-10 w-10 text-yellow-500 dark:text-yellow-400 animate-bounce" />
                </FadeIn>
                <p
                  className={`text-xl font-semibold transition-all duration-300 ${
                    winner.startsWith("🏆")
                      ? "text-green-700 dark:text-green-300"
                      : "text-yellow-600 dark:text-yellow-400"
                  }`}
                >
                  <FadeIn delay={600}>
                    {loadingWinner ? "🔄 Loading winner..." : winner}
                  </FadeIn>
                </p>
              </div>
            </SlideUp>
          ) : (
            <FadeIn delay={400}>
              <p className="text-sm text-blue-500 dark:text-blue-300 animate-pulse flex items-center justify-center gap-2">
                <ClockIcon className="h-4 w-4" />
                {timeLeft || "⏳ Waiting for deadline..."}
              </p>
            </FadeIn>
          )}

          {isAdmin && !votingEnded && milestoneReached && (
            <FadeIn delay={800}>
              <div className="mt-6">
                <HoverScale>
                  <button
                    className={`px-5 py-2 rounded text-white font-medium transition flex items-center justify-center gap-2 ${
                      loadingEndVote
                        ? "bg-blue-400 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700"
                    }`}
                    onClick={handleEndVoting}
                    disabled={loadingEndVote}
                  >
                    {loadingEndVote ? (
                      "Ending voting..."
                    ) : (
                      <>
                        🔚 End Voting Now
                      </>
                    )}
                  </button>
                </HoverScale>
              </div>
            </FadeIn>
          )}
        </TiltCard>

        <FadeIn delay={1000}>
          <CandidateList showVotes={true} refreshInterval={10000} />
        </FadeIn>
      </div>
    </PageWrapper>
  );
}