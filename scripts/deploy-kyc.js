const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Starting KYC contract deployment...");
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying with account: ${deployer.address}`);
  
  // Get the current balance to estimate gas costs
  const deployerBalance = await ethers.provider.getBalance(deployer.address);
  console.log(`Account balance: ${ethers.formatEther(deployerBalance)} ETH`);
  
  // Get network information
  const network = await ethers.provider.getNetwork();
  console.log(`Deploying to network: ${network.name} (Chain ID: ${network.chainId})`);
  
  // Deploy the KYC Verifier contract
  const KYCVerifier = await ethers.getContractFactory("KYCVerifier");
  console.log("Deploying KYCVerifier...");
  const kyc = await KYCVerifier.deploy();
  await kyc.waitForDeployment();
  
  // Get the deployed contract address
  const kycAddress = await kyc.getAddress();
  console.log(`KYCVerifier deployed to: ${kycAddress}`);
  
  // Update deployment record
  const deploymentRecordPath = path.join(__dirname, "../deployment-record.json");
  const deploymentData = fs.existsSync(deploymentRecordPath) 
    ? JSON.parse(fs.readFileSync(deploymentRecordPath, "utf8")) 
    : {};
  
  // Update or add KYCVerifier entry
  deploymentData["KYCVerifier"] = {
    address: kycAddress,
    network: network.name || `chainId-${network.chainId}`,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address
  };
  
  // Save deployment record
  fs.writeFileSync(
    deploymentRecordPath,
    JSON.stringify(deploymentData, null, 2)
  );
  console.log(`Deployment record updated at ${deploymentRecordPath}`);
  
  // Copy ABI to the contracts/abis folder
  const abisDir = path.join(__dirname, "../contracts/abis");
  if (!fs.existsSync(abisDir)) {
    fs.mkdirSync(abisDir, { recursive: true });
  }
  
  try {
    // Get artifact from hardhat
    const artifact = await artifacts.readArtifact("KYCVerifier");
    fs.writeFileSync(
      path.join(abisDir, "KYCVerifier.json"),
      JSON.stringify(artifact, null, 2)
    );
    console.log("ABI copied to contracts/abis/KYCVerifier.json");
  } catch (error) {
    console.error("Error copying ABI:", error);
  }
  
  console.log("Deployment complete!");
  console.log("----------------------------------");
  console.log(`KYCVerifier: ${kycAddress}`);
  console.log("----------------------------------");
  
  return { kyc: kycAddress };
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 