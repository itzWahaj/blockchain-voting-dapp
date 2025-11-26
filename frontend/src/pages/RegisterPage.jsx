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
import anime from "animejs";

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

    const init = async () => {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const addr = await signer.getAddress();
        setAddress(addr);
        checkStatus(addr);
      } catch (err) {
        console.error("Initialization error:", err);
      }
    };

    init();
  }, []);

  useEffect(() => {
    anime({
      targets: ".register-card",
      translateY: [20, 0],
      opacity: [0, 1],
      easing: "easeOutExpo",
      duration: 1200,
      delay: 200
    });
  }, []);

  return (
    <PageWrapper>
      <div className="min-h-screen bg-background font-body text-gray-300 flex justify-center items-start px-4 py-10">
        <div className="w-full max-w-2xl space-y-6">
          <TiltCard className="register-card bg-surface border border-white/5 p-8 rounded-2xl shadow-2xl space-y-6 relative overflow-hidden">
            {/* Decorative accent line */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-accent via-secondary to-accent opacity-80" />

            <SlideUp>
              <div className="text-center space-y-2 mb-8">
                <h2 className="text-3xl font-headline font-bold text-text dark:text-white tracking-wide">
                  Prove you are who you claim to be.
                </h2>
                <p className="text-sm font-mono text-secondary uppercase tracking-widest">
                  The chain won’t let you through twice.
                </p>
              </div>
            </SlideUp>

            <FadeIn delay={100}>
              <div className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg p-4 text-sm text-text/80 dark:text-gray-300 space-y-2 mb-6">
                <p><strong className="text-secondary">Identity Verification:</strong> We use WebAuthn to verify your biometrics locally.</p>
                <p><strong className="text-secondary">Privacy First:</strong> Your fingerprint data never leaves your device. Only a cryptographic hash is stored.</p>
                <p><strong className="text-secondary">Sybil Resistance:</strong> The smart contract locks your identity to a single vote.</p>
              </div>
            </FadeIn>

            <FadeIn delay={200}>
              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center text-accent font-bold text-xs">1</div>
                  <div>
                    <h4 className="font-bold text-text dark:text-white text-sm">Identity Check</h4>
                    <p className="text-xs text-gray-500">Local biometric or WebAuthn challenge.</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center text-accent font-bold text-xs">2</div>
                  <div>
                    <h4 className="font-bold text-text dark:text-white text-sm">Attestation Hashing</h4>
                    <p className="text-xs text-gray-500">Device signature generated locally.</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center text-accent font-bold text-xs">3</div>
                  <div>
                    <h4 className="font-bold text-text dark:text-white text-sm">On-chain Registration</h4>
                    <p className="text-xs text-gray-500">Contract assigns unique voter ID.</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center text-accent font-bold text-xs">4</div>
                  <div>
                    <h4 className="font-bold text-text dark:text-white text-sm">Confirmation</h4>
                    <p className="text-xs text-gray-500">Receive unique on-chain badge.</p>
                  </div>
                </div>
              </div>
            </FadeIn>

            <HoverScale>
              <button
                onClick={handleRegister}
                disabled={loading}
                className={`w-full py-4 rounded-lg font-bold tracking-wider flex items-center justify-center gap-2 transition-all duration-300 ${loading
                  ? "bg-gray-800 cursor-wait text-gray-500 border border-gray-700"
                  : "bg-accent hover:bg-red-700 text-white shadow-lg hover:shadow-red-900/50"
                  }`}
              >
                <IdentificationIcon className="h-5 w-5" />
                {loading ? "PROCESSING..." : "REGISTER IDENTITY"}
              </button>
            </HoverScale>

            <FadeIn delay={300}>
              <div className="mt-6 p-4 border-l-2 border-accent bg-accent/5">
                <p className="text-xs text-text/70 dark:text-gray-400 italic">
                  <strong className="text-accent not-italic">Security Notice:</strong> You can’t undo registration. The chain doesn’t forget — make sure you want to enter.
                </p>
              </div>
            </FadeIn>

            <FadeIn delay={400}>
              <div className="text-sm mt-4 text-center">
                <HoverScale>
                  <button
                    onClick={() => setShowModal(true)}
                    className="w-full py-3 mt-2 rounded-lg font-medium border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 text-secondary flex items-center justify-center gap-2 transition-colors"
                  >
                    <ArrowPathIcon className="h-5 w-5" />
                    CHECK STATUS
                  </button>
                </HoverScale>
              </div>
            </FadeIn>

            {status && (
              <FadeIn>
                <div className={`mt-4 p-3 rounded bg-black/30 border ${status.includes("✅") ? "border-green-500/30 text-green-400" : "border-accent/30 text-accent"} text-center text-sm font-mono`}>
                  {status}
                </div>
              </FadeIn>
            )}

            {/* Toggleable Credential Hash */}
            {credentialHash && (
              <FadeIn>
                <div className="mt-6 space-y-2 border-t border-white/5 pt-4">
                  <button
                    onClick={() => setShowTechnical((prev) => !prev)}
                    className="text-xs text-gray-500 hover:text-secondary transition-colors flex items-center justify-center w-full gap-1 font-mono uppercase tracking-widest"
                  >
                    {showTechnical ? (
                      <>
                        <EyeSlashIcon className="w-3 h-3" /> HIDE HASH
                      </>
                    ) : (
                      <>
                        <EyeIcon className="w-3 h-3" /> VIEW CREDENTIAL HASH
                      </>
                    )}
                  </button>

                  {showTechnical && (
                    <SlideUp>
                      <div className="p-3 bg-black/5 dark:bg-black/50 border border-black/10 dark:border-white/10 text-xs text-code font-mono break-all rounded shadow-inner">
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
            <div className="bg-surface border border-white/10 text-text dark:text-gray-200 w-full max-w-2xl mx-4 rounded-xl shadow-2xl p-6 relative animate-fade-in">
              <button
                className="absolute top-4 right-4 text-gray-500 hover:text-accent transition-colors"
                onClick={() => setShowModal(false)}
                aria-label="Close Modal"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>

              <SlideUp>
                <h3 className="text-2xl font-headline font-bold text-center mb-6 text-text dark:text-white">
                  Voter Status
                </h3>
              </SlideUp>

              <FadeIn delay={200}>
                <label className="text-xs font-mono text-secondary uppercase tracking-wider mb-2 block">
                  Wallet Address
                </label>
                <div className="w-full px-3 py-3 text-xs font-mono bg-black/5 dark:bg-black/30 border border-black/10 dark:border-white/10 rounded text-code mb-6 break-all">
                  {address}
                </div>
              </FadeIn>

              <HoverScale>
                <button
                  onClick={() => checkStatus(address)}
                  className="w-full py-3 rounded-lg text-white font-bold bg-secondary/80 hover:bg-secondary text-black transition-colors flex items-center justify-center gap-2"
                >
                  <ArrowPathIcon className="h-5 w-5" />
                  REFRESH DATA
                </button>
              </HoverScale>

              {voterInfo && (
                <SlideUp>
                  <div className="mt-6 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-lg p-4 text-sm space-y-3 font-mono">
                    <div className="flex justify-between">
                      <span className="text-gray-500">REGISTERED</span>
                      <span className={voterInfo.isRegistered ? "text-green-400" : "text-red-400"}>
                        {voterInfo.isRegistered ? "YES" : "NO"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">VOTED</span>
                      <span className={voterInfo.hasVoted ? "text-green-400" : "text-gray-400"}>
                        {voterInfo.hasVoted ? "YES" : "NO"}
                      </span>
                    </div>
                    {voterInfo.hasVoted && (
                      <>
                        <div className="h-px bg-white/10 my-2" />
                        <div className="flex justify-between">
                          <span className="text-gray-500">CANDIDATE ID</span>
                          <span className="text-text dark:text-white">#{voterInfo.votedCandidateId}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">NAME</span>
                          <span className="text-secondary">{candidateName}</span>
                        </div>
                      </>
                    )}
                  </div>
                </SlideUp>
              )}

              {status && (
                <FadeIn>
                  <p className="mt-4 text-xs font-mono text-center text-gray-500">
                    {status}
                  </p>
                </FadeIn>
              )}
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
