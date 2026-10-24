const HDWalletProvider = require('@truffle/hdwallet-provider');
const PRIVATE_KEY = '0x81921eee33e0ec5b3afbea0a81fc0fc45b2c00801de337a42eb9f0ff0c0589b1';
const API_KEY = 'x_0tJAjOmMxayKCY2ACe0jODBa9eeZRd';
const POLYGONSCAN_API_KEY = 'ZZHXC1MYDWG3DTTWF57VB9XD1HHQ246FSI';

module.exports = {
  networks: {
    polygon_mainnet: {
      provider: () => new HDWalletProvider({
        privateKeys: [PRIVATE_KEY],
        providerOrUrl: `https://polygon-mainnet.g.alchemy.com/v2/x_0tJAjOmMxayKCY2ACe0jODBa9eeZRd`
      }),
      network_id: 137,
      confirmations: 1,
      timeoutBlocks: 500,
      skipDryRun: true,
      gas: 29_000000,           // Ajustado cerca del límite del bloque
      gasPrice: 390_000000000,   // 90 gwei
      networkCheckTimeout: 10000,
      deploymentGasMultiplier: 1.5,
      confirmationPollingInterval: 20000,
      verify: {
        proxy: {
          owner: '0x5fA705b65EDf29D0104DF69D67e2c90A0D187aF4'|| "",
          txHash: process.env.IMPLEMENTATION_TX_HASH || "",
        }
      }
    }
  },
  compilers: {
    solc: {
      version: '0.8.0',
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        },
        evmVersion: "london"
      }
    }
  },
  plugins: [
    'truffle-plugin-verify'
  ],
  api_keys: {
    polygonscan: POLYGONSCAN_API_KEY
  },
  verify: {
    proxy: {
      owner: '0x5fA705b65EDf29D0104DF69D67e2c90A0D187aF4',
    }
  },
  mocha: {
    timeout: 100000
  }
};