const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function main() {
  try {
    // Get deployment account
    const [deployer] = await ethers.getSigners();
    
    console.log("Deploying PropertyAttestationVerifier contract with account:", deployer.address);
    
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", ethers.formatEther(balance), "ETH");

    // Deploy the contract
    console.log("Deploying PropertyAttestationVerifier contract...");
    const PropertyAttestationVerifier = await ethers.getContractFactory("PropertyAttestationVerifier");
    const attestationVerifier = await PropertyAttestationVerifier.deploy();
    
    await attestationVerifier.waitForDeployment();
    const contractAddress = await attestationVerifier.getAddress();
    
    console.log("PropertyAttestationVerifier contract deployed to:", contractAddress);
    
    // Update the .env file with the contract address
    const envFilePath = path.join(__dirname, '..', '.env');
    let envFileContent = fs.existsSync(envFilePath) 
      ? fs.readFileSync(envFilePath, 'utf8') 
      : '';
    
    if (envFileContent.includes('NEXT_PUBLIC_ATTESTATION_CONTRACT_ADDRESS=')) {
      envFileContent = envFileContent.replace(
        /NEXT_PUBLIC_ATTESTATION_CONTRACT_ADDRESS=.*/,
        `NEXT_PUBLIC_ATTESTATION_CONTRACT_ADDRESS=${contractAddress}`
      );
    } else {
      envFileContent += `\nNEXT_PUBLIC_ATTESTATION_CONTRACT_ADDRESS=${contractAddress}`;
    }
    
    fs.writeFileSync(envFilePath, envFileContent);
    console.log("Updated .env file with contract address");
    
    console.log("Waiting for block confirmations...");
    // Wait for a few seconds to make sure the contract is mined
    await new Promise(resolve => setTimeout(resolve, 20000));
    
    console.log(`Deployment complete!`);
    console.log(`Contract address: ${contractAddress}`);
    console.log(`Verify with: npx hardhat verify --network hashkeyTestnet ${contractAddress}`);
    
    // Create or update a deployment record
    let deploymentRecord = {};
    const recordPath = path.join(__dirname, '..', 'deployment-record.json');
    
    if (fs.existsSync(recordPath)) {
      try {
        deploymentRecord = JSON.parse(fs.readFileSync(recordPath, 'utf8'));
      } catch (e) {
        console.log("Could not parse existing deployment record, creating new one");
      }
    }
    
    deploymentRecord.PropertyAttestationVerifier = {
      address: contractAddress,
      network: process.env.HARDHAT_NETWORK || 'hardhat',
      deployedAt: new Date().toISOString(),
      deployer: deployer.address
    };
    
    fs.writeFileSync(recordPath, JSON.stringify(deploymentRecord, null, 2));
    console.log("Deployment record updated");
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