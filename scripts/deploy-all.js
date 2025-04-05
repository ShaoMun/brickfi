const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function main() {
  try {
    // Get deployment account
    const [deployer] = await ethers.getSigners();
    
    console.log("Deploying contracts with account:", deployer.address);
    
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", ethers.formatEther(balance), "ETH");

    // Deploy KYCVerifier
    console.log("\n==================================");
    console.log("Deploying KYCVerifier contract...");
    const KYCVerifier = await ethers.getContractFactory("KYCVerifier");
    const kycVerifier = await KYCVerifier.deploy();
    
    await kycVerifier.waitForDeployment();
    const kycContractAddress = await kycVerifier.getAddress();
    
    console.log("KYCVerifier contract deployed to:", kycContractAddress);
    
    // Deploy PropertyAttestationVerifier
    console.log("\n==================================");
    console.log("Deploying PropertyAttestationVerifier contract...");
    const PropertyAttestationVerifier = await ethers.getContractFactory("PropertyAttestationVerifier");
    const propertyAttestationVerifier = await PropertyAttestationVerifier.deploy();
    
    await propertyAttestationVerifier.waitForDeployment();
    const attestationContractAddress = await propertyAttestationVerifier.getAddress();
    
    console.log("PropertyAttestationVerifier contract deployed to:", attestationContractAddress);
    
    // Update the .env file with both contract addresses
    const envFilePath = path.join(__dirname, '..', '.env');
    let envFileContent = fs.existsSync(envFilePath) 
      ? fs.readFileSync(envFilePath, 'utf8') 
      : '';
    
    // Update KYC contract address
    if (envFileContent.includes('NEXT_PUBLIC_KYC_CONTRACT_ADDRESS=')) {
      envFileContent = envFileContent.replace(
        /NEXT_PUBLIC_KYC_CONTRACT_ADDRESS=.*/,
        `NEXT_PUBLIC_KYC_CONTRACT_ADDRESS=${kycContractAddress}`
      );
    } else {
      envFileContent += `\nNEXT_PUBLIC_KYC_CONTRACT_ADDRESS=${kycContractAddress}`;
    }
    
    // Update Attestation contract address
    if (envFileContent.includes('NEXT_PUBLIC_ATTESTATION_CONTRACT_ADDRESS=')) {
      envFileContent = envFileContent.replace(
        /NEXT_PUBLIC_ATTESTATION_CONTRACT_ADDRESS=.*/,
        `NEXT_PUBLIC_ATTESTATION_CONTRACT_ADDRESS=${attestationContractAddress}`
      );
    } else {
      envFileContent += `\nNEXT_PUBLIC_ATTESTATION_CONTRACT_ADDRESS=${attestationContractAddress}`;
    }
    
    fs.writeFileSync(envFilePath, envFileContent);
    console.log("Updated .env file with contract addresses");
    
    console.log("\n==================================");
    console.log("Waiting for block confirmations...");
    // Wait for a few seconds to make sure the contracts are mined
    await new Promise(resolve => setTimeout(resolve, 20000));
    
    console.log(`\nDeployment complete!`);
    console.log(`\nKYCVerifier address: ${kycContractAddress}`);
    console.log(`Verify with: npx hardhat verify --network hashkeyTestnet ${kycContractAddress}`);
    
    console.log(`\nPropertyAttestationVerifier address: ${attestationContractAddress}`);
    console.log(`Verify with: npx hardhat verify --network hashkeyTestnet ${attestationContractAddress}`);
    
    // Write to a deployment info file for easy reference
    const deploymentInfo = {
      network: process.env.HARDHAT_NETWORK || 'hardhat',
      timestamp: new Date().toISOString(),
      deployer: deployer.address,
      contracts: {
        KYCVerifier: kycContractAddress,
        PropertyAttestationVerifier: attestationContractAddress
      }
    };
    
    fs.writeFileSync(
      path.join(__dirname, '..', 'deployment-info.json'),
      JSON.stringify(deploymentInfo, null, 2)
    );
    
    console.log("\nDeployment info saved to deployment-info.json");
    
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