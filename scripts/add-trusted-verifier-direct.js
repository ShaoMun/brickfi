const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

// Import the KYCVerifier ABI
const KYCVerifierJSON = require("../contracts/abis/KYCVerifier.json");
const KYCVerifierABI = KYCVerifierJSON.abi;

// Known contract address from the deployment
const KYC_CONTRACT_ADDRESS = "0x69CE80a3DABdeaC03b3E4785bb677F99a2b626Bb"; // Update this if different

// New verifier address to add
const NEW_VERIFIER_ADDRESS = "0xa402A76b97f1bfd77B434a1E0DdB7b3134E2Eae4";

async function main() {
  console.log("Starting trusted verifier addition process...");
  
  try {
    // Connect to the provider - you would need to use your own provider URL here
    // For example, connect to HashKey Chain Testnet
    const provider = new ethers.JsonRpcProvider("https://testnet-rpc.hashkey.com"); // Update with the correct RPC URL
    console.log("Connected to provider");
    
    // Get the network information
    const network = await provider.getNetwork();
    console.log(`Connected to network: ${network.name} (Chain ID: ${network.chainId})`);
    
    // You need to provide a private key to sign transactions
    // WARNING: Never hardcode private keys in production code
    // Use environment variables or a secure secret manager
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      console.error("No private key found. Set the PRIVATE_KEY environment variable.");
      console.error("Example: PRIVATE_KEY=your_private_key node scripts/add-trusted-verifier-direct.js");
      return;
    }
    
    // Create a wallet from the private key
    const wallet = new ethers.Wallet(privateKey, provider);
    console.log(`Using wallet address: ${wallet.address}`);
    
    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`Wallet balance: ${ethers.formatEther(balance)} ETH`);
    
    // Connect to the KYC contract
    console.log(`Connecting to KYC contract at ${KYC_CONTRACT_ADDRESS}`);
    const kycContract = new ethers.Contract(KYC_CONTRACT_ADDRESS, KYCVerifierABI, wallet);
    
    // Check if the wallet is the owner of the contract
    const contractOwner = await kycContract.owner();
    console.log(`Contract owner: ${contractOwner}`);
    
    if (contractOwner.toLowerCase() !== wallet.address.toLowerCase()) {
      console.error("The wallet used is not the owner of the KYC contract.");
      console.error("Only the contract owner can add trusted verifiers.");
      return;
    }
    
    // Check if already a trusted verifier
    const isTrusted = await kycContract.isTrustedVerifier(NEW_VERIFIER_ADDRESS);
    if (isTrusted) {
      console.log(`Address ${NEW_VERIFIER_ADDRESS} is already a trusted verifier.`);
      return;
    }
    
    // Add the new verifier
    console.log(`Adding ${NEW_VERIFIER_ADDRESS} as a trusted verifier...`);
    const tx = await kycContract.addTrustedVerifier(NEW_VERIFIER_ADDRESS);
    console.log(`Transaction hash: ${tx.hash}`);
    console.log("Waiting for transaction confirmation...");
    
    // Wait for the transaction to be mined
    const receipt = await tx.wait();
    console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
    
    // Verify the address was added successfully
    const isTrustedAfter = await kycContract.isTrustedVerifier(NEW_VERIFIER_ADDRESS);
    if (isTrustedAfter) {
      console.log(`✅ Success! Address ${NEW_VERIFIER_ADDRESS} is now a trusted verifier.`);
    } else {
      console.error(`❌ Failed to add ${NEW_VERIFIER_ADDRESS} as a trusted verifier.`);
    }
  } catch (error) {
    console.error("Error adding trusted verifier:", error);
  }
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 