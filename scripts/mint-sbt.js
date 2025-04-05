const { ethers } = require("hardhat");

async function main() {
  console.log("Minting a Verification SBT token...");

  // Get the signer
  const [deployer] = await ethers.getSigners();
  console.log(`Using account: ${deployer.address}`);

  // SBT contract address - update with your deployed contract address
  const sbtContractAddress = "0xcB3aD33a83e5B219C5118a57f2e40E74e0D1c1DB";
  
  // Load the contract
  const VerificationSBT = await ethers.getContractFactory("VerificationSBT");
  const sbtContract = await VerificationSBT.attach(sbtContractAddress);
  
  console.log(`Loaded VerificationSBT at address: ${sbtContractAddress}`);
  
  // Recipient address - by default the same as the deployer
  // You can change this to any address you want to mint the token to
  const recipientAddress = deployer.address;
  
  // Check if the recipient already has a token
  try {
    const hasToken = await sbtContract.hasVerificationToken(recipientAddress);
    if (hasToken) {
      console.log(`Address ${recipientAddress} already has a verification token!`);
      
      // Get token ID
      const tokenId = await sbtContract.getTokenId(recipientAddress);
      console.log(`Token ID: ${tokenId}`);
      
      // Get token URI
      try {
        const uri = await sbtContract.tokenURI(tokenId);
        console.log(`Token URI: ${uri}`);
      } catch (error) {
        console.log("Error fetching token URI:", error.message);
      }
      
      return;
    }
  } catch (error) {
    console.error("Error checking if recipient has token:", error);
    console.log("Continuing with mint attempt...");
  }
  
  // KYC Hash - normally this would be generated from real KYC data
  // Here we're creating a random hash for demonstration
  const fakeKycData = {
    fullName: "John Doe",
    dateOfBirth: "1990-01-01",
    nationality: "US",
    documentNumber: "X123456789",
    verificationDate: new Date().toISOString()
  };
  
  // Create a hash of the data
  const dataString = JSON.stringify(fakeKycData);
  const kycHash = ethers.keccak256(ethers.toUtf8Bytes(dataString));
  
  // Prepare token URI - normally this would point to IPFS or similar
  // You'd want to upload real metadata with image etc.
  const tokenURI = "ipfs://QmWVq1K2nisJsQek4LudvxTXf9HL22eMQSJZ9jS3pyVLjp";
  
  console.log(`Minting token for address: ${recipientAddress}`);
  console.log(`KYC Hash: ${kycHash}`);
  console.log(`Token URI: ${tokenURI}`);
  
  try {
    // Mint the token
    const tx = await sbtContract.mintVerificationToken(
      recipientAddress,
      kycHash,
      tokenURI
    );
    
    console.log(`Transaction sent: ${tx.hash}`);
    console.log("Waiting for confirmation...");
    
    // Wait for the transaction to be mined
    const receipt = await tx.wait();
    console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
    
    // Get the token ID
    const tokenId = await sbtContract.getTokenId(recipientAddress);
    console.log(`Success! Token ID: ${tokenId}`);
    console.log(`View your token at: https://testnet-explorer.hashkey.cloud/token/${sbtContractAddress}?a=${tokenId}`);
  } catch (error) {
    console.error("Error minting token:", error);
    
    // Check if the error message contains information about permissions
    if (error.message.includes("KYC verifier or owner")) {
      console.log("\nPermission Error: Only the KYC verifier or contract owner can mint tokens.");
      console.log("Make sure you're using the correct account that deployed the contract");
      console.log("or an account that has been registered as a trusted verifier.");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 