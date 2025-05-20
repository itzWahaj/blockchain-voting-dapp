// src/pages/RegisterPage.jsx
import React, { useState, useEffect } from "react";
import { getContract } from "../utils/blockchain";
import { ethers } from "ethers";
import {
  IdentificationIcon,
  ArrowPathIcon,
  XMarkIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";
import PageWrapper from "../components/PageWrapper";
import { TiltCard, FadeIn, HoverScale, SlideUp } from "../components/Animations";

export default function RegisterPage() {
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [credentialHash, setCredentialHash] = useState("");
  const [address, setAddress] = useState("");
  const [voterInfo, setVoterInfo] = useState(null);
  const [candidateName, setCandidateName] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showTechnical, setShowTechnical] = useState(false);

  const generateWebAuthnCredential = async () => {
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    const address = accounts[0];

    const publicKey = {
      challenge: Uint8Array.from("polygon-voting-registration", c => c.charCodeAt(0)),
      rp: { name: "Polygon Voting" },
      user: {
        id: Uint8Array.from(window.crypto.getRandomValues(new Uint8Array(16))),
        name: address,
        displayName: address,
      },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },    // ES256 (MUST HAVE)
        { type: "public-key", alg: -257 }   // RS256 (optional but adds support)
      ],

      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "preferred"
      },
      timeout: 60000,
      attestation: "none",
    };

    const credential = await navigator.credentials.create({ publicKey });
    const rawId = credential.rawId;
    const hash = ethers.keccak256(new Uint8Array(rawId));
    setCredentialHash(hash);
    return hash;
  };

  const handleRegister = async () => {
    setLoading(true);
    setStatus("🔐 Creating WebAuthn credential...");

    try {
      const credentialIdHash = await generateWebAuthnCredential();

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      const contract = await getContract();

      setStatus("⏳ Registering on-chain...");

      const tx = await contract.registerVoter(credentialIdHash);

      // Wait for the event OR timeout fallback
      await Promise.race([
        new Promise((resolve) => {
          const timeoutId = setTimeout(() => {
            resolve("timeout");
          }, 8000);

          contract.once("VoterRegistered", (voter) => {
            if (voter.toLowerCase() === userAddress.toLowerCase()) {
              clearTimeout(timeoutId);
              resolve("event");
            }
          });
        }),
        tx.wait()
      ]);

      setStatus("✅ Registration complete!");
      setLoading(false);
      checkStatus(userAddress);
    } catch (err) {
      console.error("❌ Registration failed:", err);
      setStatus("❌ " + (err.reason || err.message || "WebAuthn or contract error"));
      setLoading(false);
    }
  };

  const checkStatus = async (walletAddress) => {
    if (!ethers.isAddress(walletAddress)) {
      return setStatus("❌ Invalid Ethereum address");
    }

    setStatus("🔍 Checking voter status...");
    setVoterInfo(null);
    setCandidateName("");

    try {
      const contract = await getContract();
      const voter = await contract.voters(walletAddress);
      const info = {
        isRegistered: voter.isRegistered,
        hasVoted: voter.hasVoted,
        votedCandidateId: Number(voter.votedCandidateId),
      };

      setVoterInfo(info);

      if (info.hasVoted) {
        const candidate = await contract.candidates(info.votedCandidateId);
        setCandidateName(candidate.name);
      }

      setStatus("");
    } catch (err) {
      console.error("Fetch error:", err);
      setStatus("❌ Failed to fetch voter info.");
    }
  };


  useEffect(() => {
    if (!window.ethereum) {
      setStatus("❌ MetaMask not detected.");
      return;
    }

    (async () => {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const addr = await signer.getAddress();
      setAddress(addr);
      checkStatus(addr);
    })();
  }, []);

  return (
    <PageWrapper>
      <div className="min-h-screen bg-gradient-to-br from-gray-100 to-blue-100 dark:from-gray-900 dark:to-gray-800 transition-colors duration-500 flex justify-center items-start px-4 py-10">
        <div className="w-full max-w-md space-y-6">
          <TiltCard className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white p-6 rounded-2xl shadow-xl space-y-4">
            <SlideUp>
              <h2 className="text-2xl font-bold text-center text-indigo-700 dark:text-indigo-400">
                📝 Register to Vote
              </h2>
            </SlideUp>

            <FadeIn delay={200}>
              <p className="text-sm text-center text-gray-600 dark:text-gray-400">
                Use your fingerprint to register securely with WebAuthn.
              </p>
            </FadeIn>

            <HoverScale>
              <button
                onClick={handleRegister}
                disabled={loading}
                className={`w-full py-2 rounded font-semibold flex items-center justify-center gap-2 transition ${loading
                  ? "bg-indigo-500/50 cursor-wait text-white"
                  : "bg-indigo-600 hover:bg-indigo-700 text-white"
                  }`}
              >
                <IdentificationIcon className="h-5 w-5" />
                {loading ? "Registering on-chain..." : "Register with Fingerprint"}
              </button>
            </HoverScale>

            <FadeIn delay={400}>
              <div className="text-sm mt-2 text-center">
                <HoverScale>
                  <button
                    onClick={() => setShowModal(true)}
                    className="w-full py-2 mt-2 rounded font-medium bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2"
                  >
                    <ArrowPathIcon className="h-5 w-5" />
                    Check Voter Status
                  </button>
                </HoverScale>
              </div>
            </FadeIn>

            {status && (
              <FadeIn>
                <p className="text-center text-sm text-gray-600 dark:text-gray-300 transition-all">
                  {status}
                </p>
              </FadeIn>
            )}

            {/* Toggleable Credential Hash */}
            {credentialHash && (
              <FadeIn>
                <div className="mt-4 space-y-2">
                  <button
                    onClick={() => setShowTechnical((prev) => !prev)}
                    className="text-xs text-blue-500 hover:underline"
                  >
                    {showTechnical ? (
                      <>
                        <EyeSlashIcon className="w-4 h-4 inline mr-1" />
                        Hide Technical Info
                      </>
                    ) : (
                      <>
                        <EyeIcon className="w-4 h-4 inline mr-1" />
                        Show Credential Hash
                      </>
                    )}
                  </button>

                  {showTechnical && (
                    <SlideUp>
                      <div className="p-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-xs text-gray-700 dark:text-gray-300 rounded break-words">
                        <strong>Credential Hash:</strong>
                        <br />
                        {credentialHash}
                      </div>
                    </SlideUp>
                  )}
                </div>
              </FadeIn>
            )}
          </TiltCard>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <TiltCard className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white w-full max-w-md mx-auto rounded-xl shadow-xl p-6 relative">
              <button
                className="absolute top-2 right-3 text-gray-700 dark:text-white hover:text-red-500"
                onClick={() => setShowModal(false)}
                aria-label="Close Modal"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>

              <SlideUp>
                <h3 className="text-xl font-bold text-center mb-4 text-blue-600 dark:text-blue-400">
                  🧾 Voter Status
                </h3>
              </SlideUp>

              <FadeIn delay={200}>
                <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">
                  Ethereum Address
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-gray-900 dark:text-white mb-4"
                  value={address}
                  disabled
                />
              </FadeIn>

              <HoverScale>
                <button
                  onClick={() => checkStatus(address)}
                  className="w-full py-2 rounded text-white font-medium bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  <ArrowPathIcon className="h-5 w-5" />
                  Refresh Status
                </button>
              </HoverScale>

              {voterInfo && (
                <SlideUp>
                  <div className="mt-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 text-sm text-gray-800 dark:text-gray-200 space-y-2">
                    <p>📌 <strong>Registered:</strong> {voterInfo.isRegistered ? "Yes ✅" : "No ❌"}</p>
                    <p>🗳️ <strong>Has Voted:</strong> {voterInfo.hasVoted ? "Yes ✅" : "No ❌"}</p>
                    {voterInfo.hasVoted && (
                      <>
                        <p>🆔 <strong>Candidate ID:</strong> {voterInfo.votedCandidateId}</p>
                        <p>🔠 <strong>Candidate Name:</strong> {candidateName}</p>
                      </>
                    )}
                  </div>
                </SlideUp>
              )}

              {status && (
                <FadeIn>
                  <p className="mt-3 text-sm text-center text-gray-600 dark:text-gray-300">
                    {status}
                  </p>
                </FadeIn>
              )}
            </TiltCard>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
