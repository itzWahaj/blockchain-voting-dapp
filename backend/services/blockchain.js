const { ethers } = require("ethers");
require("dotenv").config();
const fs = require("fs");
const path = require("path");

const contractAddress = process.env.CONTRACT_ADDRESS;
const contractPath = path.resolve(__dirname, "../../artifacts/contracts/Voting.sol/Voting.json");
const contractJson = JSON.parse(fs.readFileSync(contractPath, "utf8"));

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contract = new ethers.Contract(contractAddress, contractJson.abi, wallet);

module.exports = contract;
