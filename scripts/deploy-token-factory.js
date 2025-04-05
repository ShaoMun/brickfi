const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Deploying SecurityTokenFactory to Polygon Amoy...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying with address: ${deployer.address}`);

  // Check deployer balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Deployer balance: ${ethers.formatEther(balance)} POL`);

  // Deploy the contract
  const SecurityTokenFactory = await ethers.getContractFactory("SecurityTokenFactory");
  const factory = await SecurityTokenFactory.deploy();
  
  console.log("Waiting for deployment transaction to be mined...");
  await factory.waitForDeployment();
  
  const deployedAddress = await factory.getAddress();
  console.log(`SecurityTokenFactory deployed to: ${deployedAddress}`);
  
  // Get the deployment transaction
  const tx = factory.deploymentTransaction();
  
  // Save deployment info to a file
  const deploymentInfo = {
    network: "polygon-amoy",
    chainId: 80002,
    contractName: "SecurityTokenFactory",
    contractAddress: deployedAddress,
    deployer: deployer.address,
    deploymentDate: new Date().toISOString(),
    transactionHash: tx.hash
  };
  
  // Create deployments directory if it doesn't exist
  const deploymentsDir = path.join(__dirname, '../deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }
  
  // Write deployment info to file
  fs.writeFileSync(
    path.join(deploymentsDir, 'polygon-amoy-deployment.json'),
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("Deployment info saved to deployments/polygon-amoy-deployment.json");
  console.log("\nVerification command:");
  console.log(`npx hardhat verify --network amoy ${deployedAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 