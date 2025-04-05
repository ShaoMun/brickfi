const { ethers } = require("hardhat");

async function main() {
  console.log("Creating a test security token on Polygon Amoy...");

  // Get the factory contract address from deployment
  const factoryAddress = "0xDC78dfFa733c818d8fee81ec410BA32c9c249016"; // Your verified contract address
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`Creating token from address: ${deployer.address}`);

  // Check deployer balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Account balance: ${ethers.formatEther(balance)} POL`);

  // Get contract instance
  const SecurityTokenFactory = await ethers.getContractFactory("SecurityTokenFactory");
  const factory = SecurityTokenFactory.attach(factoryAddress);
  
  // Token parameters
  const name = "Test Property Token";
  const symbol = "TPT";
  const totalSupply = ethers.parseEther("1000"); // 1000 tokens with 18 decimals
  const documentURI = "ipfs://QmTest"; // You can replace with a real IPFS URI if available
  const industry = "Real Estate";
  const assetType = "Residential";
  const tokenValue = ethers.parseEther("100"); // $100 per token
  const offeringSize = ethers.parseEther("100000"); // $100,000 total offering
  const dividendFrequency = "Quarterly";
  const maturityDate = "2030-01-01";
  
  console.log("Creating token with parameters:");
  console.log({
    name,
    symbol,
    totalSupply: ethers.formatEther(totalSupply),
    documentURI,
    industry,
    assetType,
    tokenValue: ethers.formatEther(tokenValue),
    offeringSize: ethers.formatEther(offeringSize),
    dividendFrequency,
    maturityDate
  });

  // Create the token
  console.log("Sending transaction to create token...");
  const tx = await factory.createSecurityToken(
    name,
    symbol,
    totalSupply,
    documentURI,
    industry,
    assetType,
    tokenValue,
    offeringSize,
    dividendFrequency,
    maturityDate
  );
  
  console.log(`Transaction sent: ${tx.hash}`);
  console.log("Waiting for transaction confirmation...");
  
  const receipt = await tx.wait();
  console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
  
  // Get the token creation event
  const event = receipt.events?.find(e => e.event === "TokenCreated");
  if (event) {
    const tokenId = event.args.id.toString();
    const tokenAddress = event.args.tokenAddress;
    console.log(`Token created successfully!`);
    console.log(`Token ID: ${tokenId}`);
    console.log(`Token Address: ${tokenAddress}`);
    console.log(`Verify token contract: npx hardhat verify --network amoy ${tokenAddress}`);
  } else {
    console.log("Token creation event not found in transaction receipt");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 