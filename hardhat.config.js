require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000000";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.17",
  paths: {
    artifacts: './artifacts',
    cache: './cache',
    sources: './contracts',
    tests: './test'
  },
  // Add node_modules path to make sure OpenZeppelin is found
  nodeModulesPathsForTests: ["node_modules"],
  // Force specific OpenZeppelin module path
  resolver: {
    modules: [
      "node_modules",
      process.cwd() + "/node_modules/@openzeppelin",
    ],
  },
  networks: {
    hardhat: {},
    hashkeyTestnet: {
      url: "https://hashkeychain-testnet.alt.technology",
      chainId: 133,
      accounts: [PRIVATE_KEY],
      gasPrice: 20000000000 // 20 gwei
    },
    polygon_amoy: {
      url: "https://rpc-amoy.polygon.technology/",
      chainId: 80002,
      accounts: [PRIVATE_KEY],
      gasPrice: 35000000000, // 35 gwei
      maxPriorityFeePerGas: 25000000000 // 25 gwei
    }
  },
  etherscan: {
    apiKey: {
      hashkeyTestnet: "", // No API key needed
      polygon_amoy: process.env.POLYGONSCAN_API_KEY || "" // Optional: add your Polygonscan API key if available
    },
    customChains: [
      {
        network: "hashkeyTestnet",
        chainId: 133,
        urls: {
          apiURL: "https://hashkeychain-testnet-explorer.alt.technology/api",
          browserURL: "https://hashkeychain-testnet-explorer.alt.technology"
        }
      },
      {
        network: "polygon_amoy",
        chainId: 80002,
        urls: {
          apiURL: "https://api-testnet.polygonscan.com/api",
          browserURL: "https://amoy.polygonscan.com/"
        }
      }
    ]
  }
}; 