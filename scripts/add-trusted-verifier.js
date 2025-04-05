const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Starting trusted verifier addition process...");
  
  // Address to add as a trusted verifier
  const NEW_VERIFIER_ADDRESS = "0xa402A76b97f1bfd77B434a1E0DdB7b3134E2Eae4";
  
  // Get the deployer account (must be the owner of the KYC contract)
  const [deployer] = await ethers.getSigners();
  console.log(`Executing with account: ${deployer.address}`);
  
  // Get the current balance
  const deployerBalance = await ethers.provider.getBalance(deployer.address);
  console.log(`Account balance: ${ethers.formatEther(deployerBalance)} ETH`);
  
  // Get network information
  const network = await ethers.provider.getNetwork();
  console.log(`Connected to network: ${network.name} (Chain ID: ${network.chainId})`);
  
  // Read deployment record to get the KYC contract address
  const deploymentRecordPath = path.join(__dirname, "../deployment-record.json");
  if (!fs.existsSync(deploymentRecordPath)) {
    console.error("Deployment record not found. Please deploy the KYC contract first.");
    return;
  }
  
  const deploymentData = JSON.parse(fs.readFileSync(deploymentRecordPath, "utf8"));
  if (!deploymentData.KYCVerifier || !deploymentData.KYCVerifier.address) {
    console.error("KYC contract address not found in deployment record.");
    return;
  }
  
  const kycAddress = deploymentData.KYCVerifier.address;
  console.log(`Using KYC contract at address: ${kycAddress}`);
  
  // Create contract instance
  const KYCVerifier = await ethers.getContractFactory("KYCVerifier");
  const kyc = KYCVerifier.attach(kycAddress);
  
  // Check if already a trusted verifier
  const isTrusted = await kyc.isTrustedVerifier(NEW_VERIFIER_ADDRESS);
  if (isTrusted) {
    console.log(`Address ${NEW_VERIFIER_ADDRESS} is already a trusted verifier.`);
    return;
  }
  
  // Add as trusted verifier
  console.log(`Adding ${NEW_VERIFIER_ADDRESS} as a trusted verifier...`);
  const tx = await kyc.addTrustedVerifier(NEW_VERIFIER_ADDRESS);
  console.log(`Transaction hash: ${tx.hash}`);
  console.log("Waiting for transaction confirmation...");
  
  // Wait for transaction to be mined
  await tx.wait();
  
  // Verify the address was added successfully
  const isTrustedAfter = await kyc.isTrustedVerifier(NEW_VERIFIER_ADDRESS);
  if (isTrustedAfter) {
    console.log(`✅ Success! Address ${NEW_VERIFIER_ADDRESS} is now a trusted verifier.`);
  } else {
    console.error(`❌ Failed to add ${NEW_VERIFIER_ADDRESS} as a trusted verifier.`);
  }
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 