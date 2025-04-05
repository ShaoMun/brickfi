import { ethers } from "hardhat";
import fs from "fs";

interface DeploymentData {
  network: string;
  contractName: string;
  address: string;
  timestamp: string;
}

async function main(): Promise<void> {
  console.log("Deploying PropertyPriceOracle contract to Polygon Amoy testnet...");

  // Get the contract factory
  const PropertyPriceOracle = await ethers.getContractFactory("PropertyPriceOracle");
  
  // Deploy the contract
  const propertyPriceOracle = await PropertyPriceOracle.deploy();
  
  // Wait for deployment to finish
  await propertyPriceOracle.deployed();
  
  console.log("PropertyPriceOracle deployed to:", propertyPriceOracle.address);
  
  // Record deployment in a file for future reference
  const deploymentData: DeploymentData = {
    network: "polygon_amoy",
    contractName: "PropertyPriceOracle",
    address: propertyPriceOracle.address,
    timestamp: new Date().toISOString(),
  };
  
  fs.writeFileSync(
    "deployment-record.json",
    JSON.stringify(deploymentData, null, 2)
  );
  
  console.log("Deployment record saved to deployment-record.json");
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 