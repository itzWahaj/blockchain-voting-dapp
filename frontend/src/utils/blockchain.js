// utils/blockchain.js
import { ethers } from "ethers";
import deployed from "../abi/deployed.json";

// ✅ Pull from React-safe .env key
const AMOY_RPC = process.env.REACT_APP_AMOY_RPC || "rpc-amoy.polygon.technology";

const CONTRACT_ADDRESS = deployed.address;
const CONTRACT_ABI = deployed.abi;

const AMOY_PARAMS = {
  chainId: "0x13882", // hex for 80002
  chainName: "Polygon Amoy Testnet",
  nativeCurrency: { name: "POL", symbol: "POL", decimals: 18 },
  rpcUrls: [AMOY_RPC],
  blockExplorerUrls: ["https://www.oklink.com/amoy"],
};

// ✅ Ensures MetaMask is on the correct network
async function ensureAmoyNetwork() {
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: AMOY_PARAMS.chainId }],
    });
  } catch (error) {
    if (error.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [AMOY_PARAMS],
      });
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: AMOY_PARAMS.chainId }],
      });
    } else {
      throw error;
    }
  }
}

// ✅ Get writable contract (with signer)
export async function getContract() {
  if (!window.ethereum) {
    throw new Error("MetaMask not found. Please install it.");
  }

  await ensureAmoyNetwork();
  await window.ethereum.request({ method: "eth_requestAccounts" });

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();

  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
}

// ✅ Read-only provider
export function getReadProvider() {
  return new ethers.JsonRpcProvider(AMOY_RPC);
}

// ✅ Read-only contract (no signer)
export function getReadContract() {
  const provider = getReadProvider();
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
}

// ✅ Real-time dashboard events
export function subscribeToVotingEvents(callbacks) {
  const provider = getReadProvider();
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

  // Remove existing listeners first
  contract.removeAllListeners();

  if (callbacks.onVoteCast) {
    contract.on("VoteCast", (voter, candidateId) => {
      callbacks.onVoteCast({ voter, candidateId: Number(candidateId) });
    });
  }
    if (callbacks.onVoterRegistered) {
    contract.on("VoterRegistered", (voter, credentialId) => {
      callbacks.onVoterRegistered({ voter, credentialId });
    });
  }

  if (callbacks.onCandidateAdded) {
    contract.on("CandidateAdded", (candidateId, name) => {
      callbacks.onCandidateAdded({ candidateId: Number(candidateId), name });
    });
  }

  if (callbacks.onVotingStarted) {
    contract.on("VotingStarted", (deadline) => {
      callbacks.onVotingStarted({ deadline: Number(deadline) });
    });
  }

  if (callbacks.onVotingEnded) {
    contract.on("VotingEnded", () => {
      callbacks.onVotingEnded();
    });
  }
  console.log("📡 Active listeners:", contract.listenerCount());
}


// ✅ Remove all listeners
export function unsubscribeFromVotingEvents() {
  const contract = getReadContract();
  contract.removeAllListeners();
  console.log("🛑 Unsubscribed from Voting events.");
}
