const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function main() {
  try {
    // Get deployment account
    const [deployer] = await ethers.getSigners();
    
    console.log("Deploying KYCVerifier contract with account:", deployer.address);
    
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", ethers.formatEther(balance), "ETH");

    // Deploy the contract
    console.log("Deploying KYCVerifier contract...");
    const KYCVerifier = await ethers.getContractFactory("KYCVerifier");
    const kycVerifier = await KYCVerifier.deploy();
    
    await kycVerifier.waitForDeployment();
    const contractAddress = await kycVerifier.getAddress();
    
    console.log("KYCVerifier contract deployed to:", contractAddress);
    
    // Update the .env file with the contract address
    const envFilePath = path.join(__dirname, '..', '.env');
    const envFileContent = fs.readFileSync(envFilePath, 'utf8');
    const updatedEnvContent = envFileContent.replace(
      /NEXT_PUBLIC_KYC_CONTRACT_ADDRESS=.*/,
      `NEXT_PUBLIC_KYC_CONTRACT_ADDRESS=${contractAddress}`
    );
    
    fs.writeFileSync(envFilePath, updatedEnvContent);
    console.log("Updated .env file with contract address");
    
    console.log("Waiting for block confirmations...");
    // Wait for a few seconds to make sure the contract is mined
    await new Promise(resolve => setTimeout(resolve, 20000));
    
    console.log(`Deployment complete!`);
    console.log(`Contract address: ${contractAddress}`);
    console.log(`Verify with: npx hardhat verify --network hashkeyTestnet ${contractAddress}`);
  } catch (error) {
    console.error("Deployment failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 