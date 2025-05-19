// src/components/WalletConnector.js
import React, { useEffect, useState } from "react";

const WalletConnector = () => {
  const [walletAddress, setWalletAddress] = useState("");

  useEffect(() => {
    checkWalletConnection();

    if (window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts) => {
        setWalletAddress(accounts.length ? accounts[0] : "");
      });
    }
  }, []);

  const checkWalletConnection = async () => {
    if (window.ethereum) {
      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      if (accounts.length) {
        setWalletAddress(accounts[0]);
      }
    }
  };

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        setWalletAddress(accounts[0]);
      } catch (err) {
        console.error("User rejected wallet connection:", err);
      }
    } else {
      alert("🦊 Please install MetaMask.");
    }
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(walletAddress);
    alert("Address copied to clipboard!");
  };

  return (
    <div className="text-sm text-white">
      {walletAddress ? (
        <button
          onClick={copyToClipboard}
          className="flex items-center gap-2 px-4 py-1 rounded bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 transition shadow-sm"
          title="Click to copy"
        >
          🔗 {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
        </button>
      ) : (
        <button
          onClick={connectWallet}
          className="bg-gradient-to-r from-green-600 to-green-700 px-4 py-2 rounded text-white font-medium hover:from-green-700 hover:to-green-800 transition shadow"
        >
          Connect Wallet
        </button>
      )}
    </div>
  );
};

export default WalletConnector;
