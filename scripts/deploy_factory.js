// scripts/deploy_factory.js
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
const chalk = require("chalk");

async function main() {
    console.log(chalk.cyan("🔧 Compiling and deploying ElectionFactory..."));

    // Deploy Factory
    const Factory = await hre.ethers.getContractFactory("ElectionFactory");
    const factory = await Factory.deploy();
    await factory.waitForDeployment();

    const factoryAddress = factory.target;
    console.log(chalk.green(`✅ ElectionFactory deployed to: ${factoryAddress}`));

    // Create initial election
    console.log(chalk.cyan("Creating initial election..."));
    const tx = await factory.createElection();
    await tx.wait();

    const latestElection = await factory.latestElection();
    console.log(chalk.green(`✅ Initial Voting contract created at: ${latestElection}`));

    // Save Factory ABI + Address
    const factoryOutputPath = path.join(__dirname, "../frontend/src/abi/factory.json");
    const factoryAbi = JSON.parse(Factory.interface.formatJson());
    fs.mkdirSync(path.dirname(factoryOutputPath), { recursive: true });
    fs.writeFileSync(factoryOutputPath, JSON.stringify({ address: factoryAddress, abi: factoryAbi }, null, 2));
    console.log(chalk.yellow(`📦 Factory ABI saved to: ${factoryOutputPath}`));

    // Save Voting ABI (we need this for the frontend to interact with the child contracts)
    const Voting = await hre.ethers.getContractFactory("Voting");
    const votingAbi = JSON.parse(Voting.interface.formatJson());
    const votingOutputPath = path.join(__dirname, "../frontend/src/abi/voting_abi.json");
    fs.writeFileSync(votingOutputPath, JSON.stringify({ abi: votingAbi }, null, 2));
    console.log(chalk.yellow(`📦 Voting ABI saved to: ${votingOutputPath}`));

    // Also update deployed.json for backward compatibility or immediate use
    const deployedOutputPath = path.join(__dirname, "../frontend/src/abi/deployed.json");
    fs.writeFileSync(deployedOutputPath, JSON.stringify({ address: latestElection, abi: votingAbi }, null, 2));
    console.log(chalk.yellow(`📦 Initial Voting ABI+Address saved to: ${deployedOutputPath}`));
}

main().catch((error) => {
    console.error(chalk.red("❌ Deployment failed:"), error);
    process.exit(1);
});
