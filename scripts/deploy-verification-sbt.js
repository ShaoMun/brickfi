// Script to deploy the VerificationSBT contract
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Deploying VerificationSBT...");

  // Get KYC verifier contract address
  let kycVerifierAddress;
  try {
    const deploymentRecord = JSON.parse(fs.readFileSync('./deployment-record.json', 'utf8'));
    kycVerifierAddress = deploymentRecord.KYCVerifier;
    console.log(`Using existing KYC Verifier at: ${kycVerifierAddress}`);
  } catch (error) {
    console.error("Error reading deployment record, using fallback address:", error);
    kycVerifierAddress = "0x69CE80a3DABdeaC03b3E4785bb677F99a2b626Bb"; // Default address
  }

  // Deploy VerificationSBT
  const VerificationSBT = await hre.ethers.getContractFactory("VerificationSBT");
  const verificationSBT = await VerificationSBT.deploy(kycVerifierAddress);
  await verificationSBT.waitForDeployment();
  
  // Get deployed contract address
  const verificationSBTAddress = await verificationSBT.getAddress();
  console.log(`VerificationSBT deployed to: ${verificationSBTAddress}`);
  
  // Update deployment record
  try {
    let deploymentRecord = {};
    try {
      deploymentRecord = JSON.parse(fs.readFileSync('./deployment-record.json', 'utf8'));
    } catch (error) {
      console.log("No existing deployment record, creating new one");
      deploymentRecord = {};
    }
    
    deploymentRecord.VerificationSBT = verificationSBTAddress;
    fs.writeFileSync('./deployment-record.json', JSON.stringify(deploymentRecord, null, 2));
    console.log("Deployment record updated");
  } catch (error) {
    console.error("Error updating deployment record:", error);
  }
  
  // Export contract ABI
  const artifactPath = path.join(
    hre.config.paths.artifacts, 
    "contracts/VerificationSBT.sol/VerificationSBT.json"
  );
  
  try {
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    
    // Create directory if it doesn't exist
    const abiDir = path.join("contracts", "abis");
    if (!fs.existsSync(abiDir)) {
      fs.mkdirSync(abiDir, { recursive: true });
    }
    
    // Write ABI file
    fs.writeFileSync(
      path.join(abiDir, "VerificationSBT.json"),
      JSON.stringify(artifact, null, 2)
    );
    
    console.log("VerificationSBT ABI exported to contracts/abis/VerificationSBT.json");
  } catch (error) {
    console.error("Error exporting ABI:", error);
  }
  
  // Update KYCVerifier with the SBT contract address
  console.log("Updating KYCVerifier with the SBT contract address...");
  
  try {
    const KYCVerifier = await hre.ethers.getContractFactory("KYCVerifier");
    const kycVerifier = await KYCVerifier.attach(kycVerifierAddress);
    
    // Set SBT contract address in KYCVerifier
    const tx = await kycVerifier.setSBTContract(verificationSBTAddress);
    await tx.wait();
    
    // Enable SBT minting
    const enableTx = await kycVerifier.setSBTMintingEnabled(true);
    await enableTx.wait();
    
    console.log("KYCVerifier updated successfully, SBT minting enabled");
  } catch (error) {
    console.error("Error updating KYCVerifier:", error);
  }
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 