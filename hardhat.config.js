require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-ethers");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 100,
      },
      viaIR: true,
    },
  },
  networks: {
    // Local development network
    hardhat: {
      chainId: 1337,
      gas: "auto",
      gasPrice: "auto",
      gasMultiplier: 1,
      accounts: process.env.PRIVATE_KEY ? [
        {
          privateKey: process.env.PRIVATE_KEY,
          balance: "10000000000000000000000" // 10,000 ETH
        }
      ] : []
    },
    
    // Ethereum Mainnet
    ethereum: {
      url: process.env.ETHEREUM_RPC_URL || "https://mainnet.infura.io/v3/YOUR-API-KEY",
      chainId: 1,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: "auto"
    },
    
    // Ethereum Classic
    ethereumClassic: {
      url: process.env.ETC_RPC_URL || "https://etc.rivet.link",
      chainId: 61,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: "auto"
    },
    
    // BNB Smart Chain (BSC)
    bnb: {
      url: process.env.BNB_RPC_URL || "https://bsc-dataseed.binance.org/",
      chainId: 56,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: 5000000000 // 5 gwei
    },
    
    // Polygon
    polygon: {
      url: process.env.POLYGON_RPC_URL || "https://polygon-rpc.com",
      chainId: 137,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: "auto"
    },
    
    // Testnets
    ethereumSepolia: {
      url: process.env.ETHEREUM_SEPOLIA_RPC_URL || "https://sepolia.infura.io/v3/YOUR-API-KEY",
      chainId: 11155111,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    },
    
    ethereumClassicMordor: {
      url: process.env.ETC_MORDOR_RPC_URL || "https://rpc.mordor.etccooperative.org",
      chainId: 63,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    },
    
    bnbTestnet: {
      url: process.env.BNB_TESTNET_RPC_URL || "https://data-seed-prebsc-1-s1.binance.org:8545/",
      chainId: 97,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    },
    
    polygonMumbai: {
      url: process.env.POLYGON_MUMBAI_RPC_URL || "https://rpc-mumbai.maticvigil.com",
      chainId: 80001,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  mocha: {
    timeout: 40000
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
    gasPrice: 30
  },
  etherscan: {
    apiKey: {
      // Ethereum
      mainnet: process.env.ETHERSCAN_API_KEY || "",
      sepolia: process.env.ETHERSCAN_API_KEY || "",
      
      // Polygon
      polygon: process.env.POLYGONSCAN_API_KEY || "",
      polygonMumbai: process.env.POLYGONSCAN_API_KEY || "",
      
      // BNB Smart Chain
      bsc: process.env.BSCSCAN_API_KEY || "",
      bscTestnet: process.env.BSCSCAN_API_KEY || "",
      
      // Ethereum Classic (if supported by etherscan plugin)
      etc: process.env.ETCSCAN_API_KEY || "",
      etcMordor: process.env.ETCSCAN_API_KEY || ""
    }
  }
};