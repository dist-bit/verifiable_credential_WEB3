const { ethers } = require('ethers');
const path = require('path');
const fs = require('fs');

// Load contract ABIs
const BlockVaultABI = require('./abis/BlockVaultV3.json').abi;
const NebuVCABI = require('../artifacts/contracts/VC.sol/NebuVC.json').abi;

// Load deployment info
const deploymentPath = path.join(__dirname, '../deployments/blockvault-etc.json');
let deployment = {};

if (fs.existsSync(deploymentPath)) {
    deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
}

// Contract addresses from deployment or environment
const CONTRACTS = {
    NEBU_VC: deployment.contracts?.NebuVC || process.env.NEBU_VC_ADDRESS || '0xc36f0e8f2a38C0F0726ecf6f9dfBdE0EA88343D9',
    BLOCK_VAULT: deployment.contracts?.BlockVault || process.env.BLOCK_VAULT_ADDRESS || '0xCBb3F2dDd6584584E1FcB1b4546f002bD4B5140D'
};

// Access Types enum
const AccessType = {
    TRANSFER: 0,
    LICENSE: 1,
    SUBSCRIPTION: 2,
    FREE_TEMP: 3,
    FREE_PERM: 4
};

// Folder Types enum
const FolderType = {
    SUBSCRIPTION: 0,
    INDIVIDUAL: 1,
    MIXED: 2,
    PRIVATE: 3
};

// Network configuration
const NETWORK_CONFIG = {
    ethereumClassic: {
        chainId: 61,
        name: 'Ethereum Classic',
        rpcUrl: process.env.ETC_RPC_URL || 'https://etc.rivet.link',
        explorer: 'https://blockscout.com/etc/mainnet'
    }
};

// EIP712 Domain for BlockVault
const BLOCK_VAULT_DOMAIN = {
    name: "BlockVault",
    version: "3.0.0",
    chainId: 61,
    verifyingContract: '0xCBb3F2dDd6584584E1FcB1b4546f002bD4B5140D'
};

// TypedData types for BlockVault
const BLOCK_VAULT_TYPES = {
    BlockVaultAccess: [
        { name: 'id', type: 'string' },
        { name: 'owner', type: 'address' },
        { name: 'user', type: 'address' },
        { name: 'contentHash', type: 'bytes32' },
        { name: 'accessType', type: 'uint8' },
        { name: 'price', type: 'uint256' },
        { name: 'expirationDate', type: 'uint256' }
    ]
};

module.exports = {
    CONTRACTS,
    AccessType,
    FolderType,
    NETWORK_CONFIG,
    BLOCK_VAULT_DOMAIN,
    BLOCK_VAULT_TYPES,
    BlockVaultABI,
    NebuVCABI
};