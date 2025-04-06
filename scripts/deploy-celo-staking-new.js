const hre = require("hardhat");

async function main() {
  // Deploy to Celo mainnet
  console.log("Deploying to Celo mainnet...");
  
  // Get the signers
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  
  // Show balance
  const balanceBigInt = await deployer.provider.getBalance(deployer.address);
  const balance = hre.ethers.formatUnits(balanceBigInt, 18);
  console.log("Account balance:", balance, "CELO");
  
  // CELO token address on Celo mainnet
  const celoTokenAddress = '0x471EcE3750Da237f93B8E339c536989b8978a438';
  
  // Deploy CeloStakingPool contract
  console.log("Deploying CeloStakingPool contract...");
  const CeloStakingPool = await hre.ethers.getContractFactory("CeloStakingPool");
  
  // Deploy with gas price adjustment if necessary
  const stakingPool = await CeloStakingPool.deploy(
    celoTokenAddress,
    { gasLimit: 5000000 }
  );
  
  console.log("Waiting for deployment transaction to be mined...");
  await stakingPool.waitForDeployment();
  
  const stakingPoolAddress = await stakingPool.getAddress();
  console.log("CeloStakingPool deployed to:", stakingPoolAddress);
  console.log("Using CELO token at address:", celoTokenAddress);
  
  // Verification command
  console.log(`To verify on Celo Explorer run: npx hardhat verify --network celo ${stakingPoolAddress} ${celoTokenAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 