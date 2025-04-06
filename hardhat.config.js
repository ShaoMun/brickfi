require("@nomicfoundation/hardhat-toolbox");
// require("@nomiclabs/hardhat-waffle"); // Commented out to avoid conflict with hardhat-chai-matchers
// require("@nomiclabs/hardhat-etherscan"); // Commented out to avoid conflict with hardhat-verify
require("@nomicfoundation/hardhat-verify"); // Add hardhat-verify for contract verification
require("dotenv").config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000000";
const POLYGONSCAN_API_KEY = process.env.POLYGONSCAN_API_KEY || "";
const CELOSCAN_API_KEY = process.env.CELOSCAN_API_KEY || "G1I9V6U8G62H5MNRZW5WVU679TIGDP8G4F";

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
    },
    celoAlfajores: {
      url: "https://alfajores-forno.celo-testnet.org",
      accounts: [process.env.PRIVATE_KEY],
      chainId: 44787,
      gasPrice: 0.5 * 10**9
    },
    celo: {
      url: "https://forno.celo.org",
      accounts: [process.env.PRIVATE_KEY],
      chainId: 42220,
      gasPrice: 0.5 * 10**9
    }
  },
  etherscan: {
    apiKey: {
      polygonAmoy: POLYGONSCAN_API_KEY,
      polygonMumbai: POLYGONSCAN_API_KEY,
      hashkeyChainTestnet: "hashkeyscan", // Not actually used, but required by config
      celo: CELOSCAN_API_KEY,
      alfajores: CELOSCAN_API_KEY
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
      },
      {
        network: "celo",
        chainId: 42220,
        urls: {
          apiURL: "https://api.celoscan.io/api",
          browserURL: "https://celoscan.io"
        }
      },
      {
        network: "alfajores",
        chainId: 44787,
        urls: {
          apiURL: "https://api-alfajores.celoscan.io/api",
          browserURL: "https://alfajores.celoscan.io"
        }
      }
    ]
  },
  sourcify: {
    enabled: true
  }
}; 