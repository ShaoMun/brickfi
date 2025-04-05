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
    }
  },
  etherscan: {
    apiKey: {
      hashkeyTestnet: "" // No API key needed
    },
    customChains: [
      {
        network: "hashkeyTestnet",
        chainId: 133,
        urls: {
          apiURL: "https://hashkeychain-testnet-explorer.alt.technology/api",
          browserURL: "https://hashkeychain-testnet-explorer.alt.technology"
        }
      }
    ]
  }
}; 