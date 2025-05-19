// scripts/deploy.js

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
const chalk = require("chalk");

async function main() {
  console.log(chalk.cyan("🔧 Compiling and deploying Voting contract..."));

  const Voting = await hre.ethers.getContractFactory("Voting");
  const voting = await Voting.deploy();
  await voting.waitForDeployment();

  const address = voting.target;
  console.log(chalk.green(`✅ Voting contract deployed to: ${address}`));
  console.log(chalk.gray(`🌐 Network: ${hre.network.name}`));


  // — Use formatJson() instead of format("json")
  const abiJsonString = Voting.interface.formatJson();
  const abi = JSON.parse(abiJsonString);

  const outputPath = path.join(__dirname, "../frontend/src/abi/deployed.json");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(
    outputPath,
    JSON.stringify({ address, abi }, null, 2)
  );

  console.log(chalk.yellow(`📦 ABI + address saved to: ${outputPath}`));
  console.log("\nTo verify:");
  console.log(chalk.gray(`npx hardhat verify --network amoy ${address}`));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(chalk.red("❌ Deployment failed:"), error);
    process.exit(1);
  });
