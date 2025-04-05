require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000000";
const POLYGONSCAN_API_KEY = process.env.POLYGONSCAN_API_KEY || "";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      viaIR: true
    }
  },
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
    hardhat: {
      chainId: 31337
    },
    amoy: {
      url: "https://rpc-amoy.polygon.technology",
      accounts: [PRIVATE_KEY],
      chainId: 80002,
      gasPrice: 20000000000, // 20 gwei
      blockGasLimit: 20000000
    },
    mumbai: {
      url: "https://rpc-mumbai.maticvigil.com",
      accounts: [PRIVATE_KEY],
      chainId: 80001
    },
    hashkeyChainTestnet: {
      url: "https://hashkeychain-testnet.alt.technology",
      accounts: [PRIVATE_KEY],
      chainId: 133,
      gasPrice: 20000000000, // 20 gwei
      timeout: 60000 // Increase timeout to 60 seconds
    },
    // Alternative HashKey Chain Testnet config in case primary doesn't work
    hashkeyChainTestnetAlt: {
      url: "https://hkt-testnet.alt.technology",
      accounts: [PRIVATE_KEY],
      chainId: 133,
      gasPrice: 20000000000, // 20 gwei
      timeout: 120000 // Longer timeout (2 minutes)
    }
  },
  etherscan: {
    apiKey: {
      polygonAmoy: POLYGONSCAN_API_KEY,
      polygonMumbai: POLYGONSCAN_API_KEY,
      hashkeyChainTestnet: "hashkeyscan" // Not actually used, but required by config
    },
    customChains: [
      {
        network: "polygonAmoy",
        chainId: 80002,
        urls: {
          apiURL: "https://api-amoy.polygonscan.com/api",
          browserURL: "https://amoy.polygonscan.com"
        }
      },
      {
        network: "hashkeyChainTestnet",
        chainId: 133,
        urls: {
          apiURL: "https://testnet-explorer-api.hashkey.cloud/api",
          browserURL: "https://testnet-explorer.hashkey.cloud"
        }
      }
    ]
  },
  sourcify: {
    enabled: true
  }
}; 