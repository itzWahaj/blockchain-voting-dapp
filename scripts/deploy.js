// scripts/deploy.js

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
const chalk = require("chalk");
const { execSync } = require("child_process");

async function main() {
  console.log(chalk.cyan("🔧 Compiling and deploying Voting contract..."));

  const [deployer] = await hre.ethers.getSigners();
  console.log(chalk.gray(`Deploying with account: ${deployer.address}`));

  const Voting = await hre.ethers.getContractFactory("Voting");
  const voting = await Voting.deploy(deployer.address);
  await voting.waitForDeployment();

  const address = voting.target;
  console.log(chalk.green(`✅ Voting contract deployed to: ${address}`));
  console.log(chalk.gray(`🌐 Network: ${hre.network.name}`));

  // Format ABI
  const abiJsonString = Voting.interface.formatJson();
  const abi = JSON.parse(abiJsonString);

  // Write ABI + address to deployed.json
  const outputPath = path.join(__dirname, "../frontend/src/abi/deployed.json");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify({ address, abi }, null, 2));

  console.log(chalk.yellow(`📦 ABI + address saved to: ${outputPath}`));

  // 🔄 Trigger frontend rebuild + deploy
  console.log(chalk.cyan("\n🚀 Building + deploying frontend to GitHub Pages..."));
  try {
    execSync("npm run deploy", { cwd: path.join(__dirname, "../frontend"), stdio: "inherit" });
    console.log(chalk.green("✅ Frontend deployed to GitHub Pages."));
  } catch (err) {
    console.error(chalk.red("❌ Failed to deploy frontend to GitHub Pages:"), err.message);
  }

  // Optional: log for contract verification
  console.log(chalk.gray(`\n🔍 To verify the contract:`));
  console.log(chalk.gray(`npx hardhat verify --network amoy ${address}`));
}

main().catch((error) => {
  console.error(chalk.red("❌ Deployment failed:"), error);
  process.exit(1);
});
