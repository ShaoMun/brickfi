// Deployment script for Celo Staking Pool on mainnet
require("dotenv").config();
const hre = require("hardhat");
const ethers = require("ethers");

async function main() {
  // Get the network from hardhat config
  const [deployer] = await hre.ethers.getSigners();
  
  console.log("Deploying contracts with the account:", deployer.address);
  
  // Get current balance
  const balance = await deployer.getBalance();
  console.log("Account balance:", ethers.utils.formatEther(balance));
  
  // Choose the token you want to use
  // Mainnet Token Addresses:
  // CELO (native token): 0x471EcE3750Da237f93B8E339c536989b8978a438
  // cUSD (stablecoin): 0x765DE816845861e75A25fCA122bb6898B8B1282a
  // cEUR (stablecoin): 0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73
  // cREAL (stablecoin): 0xe8537a3d056DA446677B9E9d6c5dB704EaAb4787
  const stableTokenAddress = '0x471EcE3750Da237f93B8E339c536989b8978a438'; // CELO on mainnet
  
  // Deploy the contract
  console.log("Deploying CeloStakingPool...");
  const CeloStakingPool = await hre.ethers.getContractFactory("CeloStakingPool");
  const stakingPool = await CeloStakingPool.deploy(stableTokenAddress);
  
  await stakingPool.deployed();
  
  console.log("CeloStakingPool deployed to:", stakingPool.address);
  console.log("Using token:", stableTokenAddress);
  
  // Verify contract on Celo Explorer (optional)
  console.log("To verify on explorer: npx hardhat verify --network celo", 
    stakingPool.address, stableTokenAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 