// Direct deployment script using ethers.js
require('dotenv').config();
const ethers = require('ethers');
const fs = require('fs');
const path = require('path');

// Read the contract ABI and bytecode
const contractPath = path.join(__dirname, '../artifacts/contracts/CeloStakingPool.sol/CeloStakingPool.json');
const contractJson = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
const abi = contractJson.abi;
const bytecode = contractJson.bytecode;

// CELO token address on mainnet
const celoTokenAddress = '0x471EcE3750Da237f93B8E339c536989b8978a438';

async function main() {
  // Initialize provider for Celo mainnet
  const provider = new ethers.providers.JsonRpcProvider('https://forno.celo.org');
  
  // Initialize wallet with private key
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error('Error: Private key not found. Add PRIVATE_KEY to your .env file');
    process.exit(1);
  }
  
  const wallet = new ethers.Wallet(privateKey, provider);
  console.log('Deploying contracts with the account:', wallet.address);
  
  // Get wallet balance
  const balance = await provider.getBalance(wallet.address);
  console.log('Account balance:', ethers.utils.formatEther(balance));
  
  // Get current gas price from network and increase it
  const gasPrice = await provider.getGasPrice();
  const adjustedGasPrice = gasPrice.mul(ethers.BigNumber.from(2)); // Double the current gas price
  console.log('Current gas price:', ethers.utils.formatUnits(gasPrice, 'gwei'), 'gwei');
  console.log('Using adjusted gas price:', ethers.utils.formatUnits(adjustedGasPrice, 'gwei'), 'gwei');
  
  // Create contract factory
  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  
  // Deploy the contract
  console.log('Deploying CeloStakingPool contract...');
  const contract = await factory.deploy(celoTokenAddress, {
    gasLimit: 5000000,
    gasPrice: adjustedGasPrice
  });
  
  console.log('Deployment transaction hash:', contract.deployTransaction.hash);
  console.log('Waiting for deployment transaction to be mined...');
  await contract.deployed();
  
  console.log('CeloStakingPool deployed to:', contract.address);
  console.log('Using CELO token at address:', celoTokenAddress);
  
  // Save deployment details to a file
  const deploymentData = {
    network: 'celo_mainnet',
    contractName: 'CeloStakingPool',
    address: contract.address,
    timestamp: new Date().toISOString(),
    celoTokenAddress: celoTokenAddress
  };
  
  fs.writeFileSync(
    'celo-staking-deployment.json',
    JSON.stringify(deploymentData, null, 2)
  );
  
  console.log('Deployment record saved to celo-staking-deployment.json');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 