const { BlockVaultAPI, AccessType, FolderType } = require('./BlockVaultAPI');
const config = require('./config');

module.exports = {
    // Main API
    BlockVaultAPI,
    
    // Enums
    AccessType,
    FolderType,
    
    // Configuration
    config,
    
    // Contract addresses
    CONTRACTS: config.CONTRACTS,
    
    // Network configuration
    NETWORK_CONFIG: config.NETWORK_CONFIG,
    
    // EIP712 types
    BLOCK_VAULT_DOMAIN: config.BLOCK_VAULT_DOMAIN,
    BLOCK_VAULT_TYPES: config.BLOCK_VAULT_TYPES
};