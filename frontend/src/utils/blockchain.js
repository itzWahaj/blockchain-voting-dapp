// utils/blockchain.js
import { ethers } from "ethers";
import factoryArtifact from "../abi/factory.json";
import votingArtifact from "../abi/voting_abi.json";

// ✅ Pull from React-safe .env key
const AMOY_RPC = process.env.REACT_APP_AMOY_RPC || "https://rpc-amoy.polygon.technology";

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

// ✅ Get Factory Contract
const getFactoryContract = async (signerOrProvider) => {
  return new ethers.Contract(factoryArtifact.address, factoryArtifact.abi, signerOrProvider);
};

// ✅ Get Latest Election Address
export const getLatestElectionAddress = async (provider) => {
  const factory = await getFactoryContract(provider);
  return await factory.latestElection();
};

// ✅ Create New Election (Admin Only)
export const createNewElection = async () => {
  if (!window.ethereum) throw new Error("MetaMask not found");
  await ensureAmoyNetwork();

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const factory = await getFactoryContract(signer);

  console.log("Creating new election...");
  const tx = await factory.createElection();
  console.log("Transaction sent:", tx.hash);
  await tx.wait();
  console.log("New election created!");

  return await factory.latestElection();
};

// ✅ Get writable contract (with signer)
export async function getContract() {
  if (!window.ethereum) {
    throw new Error("MetaMask not found. Please install it.");
  }

  await ensureAmoyNetwork();
  await window.ethereum.request({ method: "eth_requestAccounts" });

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();

  const address = await getLatestElectionAddress(provider);
  return new ethers.Contract(address, votingArtifact.abi, signer);
}

// ✅ Read-only provider (uses MetaMask to avoid CORS)
export async function getReadProvider() {
  if (!window.ethereum) {
    throw new Error("MetaMask not found. Please install it.");
  }
  return new ethers.BrowserProvider(window.ethereum);
}

// ✅ Read-only contract (uses MetaMask provider to avoid CORS)
export async function getReadContract() {
  const provider = await getReadProvider();
  const address = await getLatestElectionAddress(provider);
  return new ethers.Contract(address, votingArtifact.abi, provider);
}

// ✅ Real-time dashboard events (uses MetaMask provider)
export async function subscribeToVotingEvents(callbacks) {
  if (!window.ethereum) {
    console.warn("MetaMask not found, cannot subscribe to events");
    return;
  }

  const provider = await getReadProvider();
  const address = await getLatestElectionAddress(provider);
  const contract = new ethers.Contract(address, votingArtifact.abi, provider);

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
export async function unsubscribeFromVotingEvents() {
  if (!window.ethereum) return;

  const contract = await getReadContract();
  contract.removeAllListeners();
  console.log("🛑 Unsubscribed from Voting events.");
}
