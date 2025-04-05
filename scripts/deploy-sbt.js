const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying VerificationSBT contract...");

  // Get the signer
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying with account: ${deployer.address}`);

  // Get contract balance before deployment
  const deployerBalance = await deployer.provider.getBalance(deployer.address);
  console.log(`Account balance: ${ethers.formatEther(deployerBalance)} ETH`);

  // Get network information
  const network = await ethers.provider.getNetwork();
  console.log(`Deploying to network: ${network.name} (Chain ID: ${network.chainId})`);

  // Check if we're on the right network (HashKey Chain Testnet has chainId 133)
  if (network.chainId.toString() !== '133') {
    console.warn("Warning: You're not deploying to HashKey Chain Testnet!");
    console.warn("Expected Chain ID: 133, Current Chain ID:", network.chainId.toString());
    
    // Uncomment the next line to enforce deployment only on HashKey Chain Testnet
    // process.exit(1);
  }

  // We'll need the KYC Verifier address - here we use the one from the current project
  // This should already be deployed on HashKey Chain Testnet
  const kycVerifierAddress = "0x69CE80a3DABdeaC03b3E4785bb677F99a2b626Bb"; // Address on HashKey Chain Testnet
  console.log(`Using KYC Verifier at: ${kycVerifierAddress}`);

  // Deploy VerificationSBT contract
  const VerificationSBT = await ethers.getContractFactory("VerificationSBT");
  const sbtContract = await VerificationSBT.deploy(kycVerifierAddress);
  
  // Wait for deployment to finish
  await sbtContract.waitForDeployment();
  const sbtAddress = await sbtContract.getAddress();
  
  console.log(`VerificationSBT deployed to: ${sbtAddress}`);
  console.log("----------------------------------------------------");
  console.log("To verify the contract on HashKey Explorer:");
  console.log(`npx hardhat verify --network hashkeyChainTestnet ${sbtAddress} ${kycVerifierAddress}`);
  console.log("----------------------------------------------------");

  // Log gas used
  const deployerBalanceAfter = await deployer.provider.getBalance(deployer.address);
  const gasCost = deployerBalance - deployerBalanceAfter;
  console.log(`Gas cost: ${ethers.formatEther(gasCost)} ETH`);

  // Store deployment details
  console.log("Deployment completed successfully!");
  
  return {
    contractAddress: sbtAddress,
    kycVerifierAddress
  };
}

main()
  .then((deployedInfo) => {
    console.log("Deployed contract info:", deployedInfo);
    process.exit(0);
  })
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  }); 