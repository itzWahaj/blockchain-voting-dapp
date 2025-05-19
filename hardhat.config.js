require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: "0.8.18",
  networks: {
    amoy: {
      url: process.env.AMOY_RPC,
      accounts: [process.env.PRIVATE_KEY],
    },
  },
};
