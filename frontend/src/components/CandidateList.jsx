import React, { useEffect, useState } from "react";
import { getContract } from "../utils/blockchain";
import { TiltCard, FadeIn } from "./Animations";

export default function CandidateList({ showVotes = true, refreshInterval = 10000 }) {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCandidates = async () => {
    try {
      const contract = await getContract();
      const count = await contract.candidatesCount();
      const list = [];

      for (let i = 1; i <= Number(count); i++) {
        const candidate = await contract.candidates(i);
        list.push({
          id: Number(candidate.id),
          name: candidate.name,
          votes: Number(candidate.voteCount),
        });
      }

      setCandidates(list);
    } catch (err) {
      console.error("❌ Failed to fetch candidates:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCandidates();
    const interval = setInterval(fetchCandidates, refreshInterval);
    return () => clearInterval(interval); // cleanup on unmount
  }, [refreshInterval]);

  return (
    <FadeIn delay={200}>
      <TiltCard className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-xl w-full max-w-2xl mx-auto mt-8 transition-all duration-500">
        <div className="space-y-4">
          <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4 text-center">
            🗳️ Candidates
          </h3>
          
          {loading ? (
            <div className="flex justify-center items-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : candidates.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-400 text-center">No candidates found.</p>
          ) : (
            <ul className="space-y-3">
              {candidates.map((c) => (
                <li
                  key={c.id}
                  className="border dark:border-gray-600 p-4 rounded-lg flex justify-between items-center 
                    bg-gray-50 dark:bg-gray-700 transition-all duration-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  <span className="font-medium text-gray-800 dark:text-gray-200">
                    {c.name}
                  </span>
                  {showVotes && (
                    <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 
                      px-3 py-1 rounded-full text-sm font-semibold shadow-sm">
                      {c.votes} vote{c.votes !== 1 && 's'}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </TiltCard>
    </FadeIn>
  );
}
