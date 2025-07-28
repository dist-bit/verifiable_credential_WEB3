# Verifiable Credentials - W3C Standard Implementation

[![N|Nebula](https://i.ibb.co/DC46xJv/banner-min.png)](https://nebuia.com)

## 🚀 Overview

This project implements Verifiable Credentials using the [W3C VC specification](https://www.w3.org/TR/vc-data-model/#abstract) with blockchain technology. It provides a complete framework for creating, managing, and verifying digital credentials on Ethereum-compatible networks using [EIP-712 Signed Typed Data](https://eips.ethereum.org/EIPS/eip-712).

## 🎯 Key Features

- **W3C Compliant**: Full implementation of Verifiable Credentials specification
- **EIP-712 Signatures**: Secure, structured data signing
- **Modular Architecture**: Easy to extend with custom credential types
- **Gas Optimized**: Using Zero-Copy serialization for efficient storage
- **Hardhat Integration**: Complete development environment with testing suite
- **Multiple Credential Types**: Includes examples for NebuIA (identity), Alumni, Document Multi-sign, and **NEW: Intellectual Property (IPPBlock)**

## 🏗️ Architecture

```
verifiable_credential_WEB3/
├── contracts/
│   ├── EIP/               # EIP-712 interfaces
│   ├── libs/              # Zero-Copy serialization libraries
│   ├── utils/             # Utility contracts (Ownable)
│   ├── sample/            # Sample credential implementations
│   │   ├── AlumniOf.sol
│   │   ├── DocumentMultiSign.sol
│   │   ├── NebuIA.sol
│   │   └── IntellectualProperty.sol  # NEW: IPPBlock implementation
│   └── VC.sol             # Main Verifiable Credentials manager
├── test/                  # Test suites
├── scripts/               # Deployment scripts
└── hardhat.config.js      # Hardhat configuration
```

## 🛠️ Technical Stack

- **Solidity ^0.8.20**: Smart contract language
- **Hardhat**: Development environment
- **Ethers.js v6**: Ethereum library
- **EIP-712**: Typed structured data hashing and signing
- **Zero-Copy Serialization**: Efficient data encoding/decoding

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/your-repo/verifiable_credential_WEB3.git
cd verifiable_credential_WEB3

# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Edit .env with your configuration

# IMPORTANT: Add your RPC URLs for the networks you plan to use
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory (copy from `.env.example`):

```bash
# Private key for deployment and testing
PRIVATE_KEY=0x... # Your private key (with 0x prefix)

# Network RPC URLs
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR-PROJECT-ID
MUMBAI_RPC_URL=https://polygon-mumbai.infura.io/v3/YOUR-PROJECT-ID
POLYGON_RPC_URL=https://polygon-rpc.com
MAINNET_RPC_URL=https://mainnet.infura.io/v3/YOUR-PROJECT-ID

# Block explorer API keys (for contract verification)
ETHERSCAN_API_KEY=YOUR-ETHERSCAN-API-KEY
POLYGONSCAN_API_KEY=YOUR-POLYGONSCAN-API-KEY
```

### Network Configuration

Available networks in `hardhat.config.js`:

**Local Networks:**
- `hardhat` - Local development network

**Mainnets:**
- `ethereum` - Ethereum Mainnet (Chain ID: 1)
- `ethereumClassic` - Ethereum Classic (Chain ID: 61)
- `bnb` - BNB Smart Chain (Chain ID: 56)
- `polygon` - Polygon (Chain ID: 137)

**Testnets:**
- `ethereumSepolia` - Ethereum Sepolia (Chain ID: 11155111)
- `ethereumClassicMordor` - ETC Mordor (Chain ID: 63)
- `bnbTestnet` - BNB Testnet (Chain ID: 97)
- `polygonMumbai` - Polygon Mumbai (Chain ID: 80001)

## ⚙️ Hardhat Configuration

The project uses a custom Hardhat configuration optimized for complex contracts:

```javascript
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 100,
      },
      viaIR: true,  // IMPORTANT: Enables IR-based compilation to avoid stack too deep errors
    },
  },
  networks: {
    hardhat: {
      chainId: 1337,
      accounts: [
        {
          privateKey: "0x027c30c1fc5d27479a934406c74d971636ac93df159a8553dc5875068bfee3d4",
          balance: "10000000000000000000000"
        }
      ]
    },
    // Additional networks: sepolia, mumbai, polygon, mainnet
  }
};
```

## 🛠️ Compilation

```bash
# Clean previous builds
npx hardhat clean

# Compile all contracts
npx hardhat compile

# Force recompilation
npx hardhat compile --force
```

### Compilation Notes
- Uses Solidity 0.8.20 with optimizer enabled
- `viaIR: true` prevents "stack too deep" errors for complex contracts
- Artifacts are generated in `./artifacts` directory

## 🧪 Testing

```bash
# Run all tests
npx hardhat test

# Run specific test suite
npx hardhat test test/IPPBlock.test.js

# Run tests with gas reporting
REPORT_GAS=true npx hardhat test

# Run tests with coverage
npx hardhat coverage

# Run tests on a specific network
npx hardhat test --network sepolia
```

### Test Suites Available
- `test/IPPBlock.test.js` - Intellectual Property credential tests
- `test/nebuia.js` - NebuIA identity credential tests
- Additional test files for other credential types

## 🚀 Deployment

### Local Deployment

```bash
# Start local Hardhat node
npx hardhat node

# In another terminal, deploy to local network
npx hardhat run scripts/deploy-ippblock.js --network localhost
```

### Testnet Deployment

```bash
# Deploy to Ethereum Sepolia
npx hardhat run scripts/deploy-ippblock.js --network ethereumSepolia

# Deploy to Polygon Mumbai
npx hardhat run scripts/deploy-ippblock.js --network polygonMumbai

# Deploy to BNB Testnet
npx hardhat run scripts/deploy-ippblock.js --network bnbTestnet

# Deploy to Ethereum Classic Mordor
npx hardhat run scripts/deploy-ippblock.js --network ethereumClassicMordor
```

### Mainnet Deployment

```bash
# Deploy to Ethereum (use with caution!)
npx hardhat run scripts/deploy-ippblock.js --network ethereum

# Deploy to Polygon
npx hardhat run scripts/deploy-ippblock.js --network polygon

# Deploy to BNB Smart Chain
npx hardhat run scripts/deploy-ippblock.js --network bnb

# Deploy to Ethereum Classic
npx hardhat run scripts/deploy-ippblock.js --network ethereumClassic
```

### Deployment Scripts

1. **`deploy-ippblock.js`** - Deploys only IPPBlock and NebuVC contracts
   ```bash
   npx hardhat run scripts/deploy-ippblock.js --network <network>
   ```

2. **`deploy-all.js`** - Deploys all contracts (NebuVC, NebuIA, AlumniOf, DocumentMultiSign, IPPBlock)
   ```bash
   npx hardhat run scripts/deploy-all.js --network <network>
   ```

### Post-Deployment

After deployment, the scripts will:
- Display all deployed contract addresses
- Save deployment data to `./deployments/<network>-deployment.json`
- Test basic functionality of deployed contracts

### Contract Verification

After deployment, verify contracts on Etherscan:

```bash
# Verify IPPBlockVC
npx hardhat verify --network sepolia <IPPBLOCK_ADDRESS> \
  "https://ippblock.io/issuers/001" \
  '["https://www.w3.org/2018/credentials/v1","https://ippblock.io/credentials/v1"]' \
  "https://ippblock.io/credentials/ip/1" \
  '["VerifiableCredential","IntellectualPropertyCredential"]' \
  "https://ippblock.io/issuers/001#key-1" \
  '{"id":"https://ippblock.io/schemas/intellectual-property.json","typeSchema":"JsonSchemaValidator2018"}' \
  "QmIPPBlockLogoHash123456789"

# Verify NebuVC (no constructor arguments)
npx hardhat verify --network sepolia <NEBUVC_ADDRESS>
```

## 📄 Smart Contracts

### VC.sol - Main Verifiable Credentials Manager
- Creates and stores verifiable credentials
- Verifies signatures and credentials
- Manages credential lifecycle (issuance, revocation)
- Supports multiple credential types

### Sample Implementations

#### 1. **NebuIA.sol** - Digital Identity
- Personal identity verification
- Multiple verification methods (email, phone, address, document, biometric)

#### 2. **AlumniOf.sol** - Educational Credentials
- University affiliations
- Subject certifications

#### 3. **DocumentMultiSign.sol** - Multi-signature Documents
- Document hash verification
- Multiple signatories support

#### 4. **IntellectualProperty.sol** (IPPBlock) - IP Rights Management
- Complete IP lifecycle management
- Transfer requests and approvals
- Expiration tracking
- Multiple IP types (Patent, Trademark, Copyright, Trade Secret, Industrial Design)

## 🔧 Common Commands Reference

```bash
# Development
npx hardhat clean                    # Clean artifacts
npx hardhat compile                  # Compile contracts
npx hardhat test                     # Run tests
npx hardhat node                     # Start local node
npx hardhat console                  # Interactive console
npx hardhat help                     # Show all commands

# Deployment
npx hardhat run scripts/deploy-ippblock.js --network hardhat
npx hardhat run scripts/deploy-all.js --network sepolia

# Verification
npx hardhat verify --network sepolia <ADDRESS> <CONSTRUCTOR_ARGS>

# Gas analysis
npx hardhat test --gas
REPORT_GAS=true npx hardhat test

# Security
npm audit                            # Check dependencies
npx hardhat check                    # Run security checks
```

## ⚠️ Important Notes

### Stack Too Deep Error
If you encounter "Stack too deep" errors:
1. Ensure `viaIR: true` is set in hardhat.config.js
2. Use Solidity 0.8.20 or higher
3. Consider breaking complex functions into smaller ones

### Gas Optimization
- The project uses Zero-Copy serialization for efficient storage
- Optimizer is enabled with 100 runs
- Monitor gas usage with `REPORT_GAS=true`

### Security Best Practices
- Never commit `.env` files
- Always use environment variables for sensitive data
- Test thoroughly on testnets before mainnet deployment
- Verify contracts after deployment

## 📝 Creating a New Credential Type

1. Create your credential contract inheriting from IEIP721:
```solidity
contract MyCredential is IEIP721, IEIP721Metadata, Ownable {
    // Define your credential structure
    struct MyData {
        string field1;
        uint256 field2;
        // ...
    }
    
    // Implement required functions
    // - hash()
    // - verify()
    // - serialize/deserialize
}
```

2. Deploy and integrate with VC.sol
3. Create tests for your credential type

## 🔐 Security Considerations

- All credentials use EIP-712 for secure signing
- Domain separation prevents replay attacks
- Owner-only functions for sensitive operations
- Signature verification on all credential operations

## 📚 Standards & References

- [W3C Verifiable Credentials Data Model](https://www.w3.org/TR/vc-data-model/)
- [EIP-712: Typed structured data hashing and signing](https://eips.ethereum.org/EIPS/eip-712)
- [EIP-1812: Reusable Verifiable Claims](https://github.com/ethereum/EIPs/issues/1812)

---

# 🏢 IPPBlock - Intellectual Property Credential Implementation

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your private key

# 3. Compile contracts
npx hardhat compile

# 4. Run tests
npx hardhat test test/IPPBlock.test.js

# 5. Deploy locally
npx hardhat run scripts/deploy-ippblock.js --network hardhat

# 6. Deploy to testnet (choose one)
npx hardhat run scripts/deploy-ippblock.js --network ethereumSepolia
# or
npx hardhat run scripts/deploy-ippblock.js --network polygonMumbai
# or
npx hardhat run scripts/deploy-ippblock.js --network bnbTestnet
```

## Overview

IPPBlock is a specialized implementation of Verifiable Credentials for managing Intellectual Property rights on blockchain. It provides a complete framework for registering, transferring, and verifying IP ownership with built-in expiration and transfer request mechanisms.

## Features

- **Multiple IP Types**: Patents, Trademarks, Copyrights, Trade Secrets, Industrial Designs
- **Transfer Management**: Request and approval system for IP transfers
- **Expiration Tracking**: Automatic expiration date management
- **Ownership History**: Complete trail of previous owners
- **Multi-category Support**: Flexible categorization system
- **Document Hash**: Cryptographic proof of IP documentation

## Contract Structure

```solidity
struct IntellectualProperty {
    string id;                      // Unique identifier
    string title;                   // IP title
    string description;             // Detailed description
    IPType ipType;                  // Type of IP
    address owner;                  // Current owner
    address[] previousOwners;       // Ownership history
    string country;                 // Country of registration
    uint256 registrationDate;       // Registration timestamp
    uint256 expirationDate;         // Expiration timestamp
    IPStatus status;                // Current status
    string registrationNumber;      // Official registration number
    string[] categories;            // IP categories
    string certifyingEntity;        // Certifying organization (IPPBlock)
    TransferRequest transferRequest; // Pending transfer details
    string documentHash;            // IPFS or document hash
}
```

## Usage Example

### 1. Deploy IPPBlock Contract

```javascript
const IPPBlockVC = await ethers.getContractFactory("IPPBlockVC");
const ippBlockVC = await IPPBlockVC.deploy(
    "https://ippblock.io/issuers/001",                    // issuer
    ["https://www.w3.org/2018/credentials/v1"],           // context
    "https://ippblock.io/credentials/ip/1",               // id
    ["VerifiableCredential", "IntellectualPropertyCredential"], // types
    "https://ippblock.io/issuers/001#key-1",             // verification method
    {
        id: "https://ippblock.io/schemas/ip.json",
        typeSchema: "JsonSchemaValidator2018"
    },
    "QmIPPBlockLogoHash"                                  // logo hash
);
```

### 2. Create IP Credential

```javascript
// Prepare IP data
const ipData = {
    id: "IP-2024-001",
    title: "Innovative Blockchain Authentication System",
    description: "A novel method for decentralized identity verification",
    ipType: 0, // Patent
    owner: ownerAddress,
    previousOwners: [],
    country: "Mexico",
    registrationDate: Math.floor(Date.now() / 1000),
    expirationDate: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60), // 1 year
    status: 0, // Active
    registrationNumber: "MX-PAT-2024-001234",
    categories: ["Blockchain", "Security", "Authentication"],
    certifyingEntity: "IPPBlock",
    transferRequest: {
        from: ethers.ZeroAddress,
        to: ethers.ZeroAddress,
        requestDate: 0,
        approved: false,
        reason: ""
    },
    documentHash: "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG"
};

// Sign the data using EIP-712
const domain = {
    name: "IPPBlock Intellectual Property",
    version: "1",
    chainId: 1,
    verifyingContract: "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC"
};

const types = {
    TransferRequest: [
        { name: 'from', type: 'address' },
        { name: 'to', type: 'address' },
        { name: 'requestDate', type: 'uint256' },
        { name: 'approved', type: 'bool' },
        { name: 'reason', type: 'string' },
    ],
    IntellectualProperty: [
        { name: 'id', type: 'string' },
        { name: 'title', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'ipType', type: 'uint8' },
        { name: 'owner', type: 'address' },
        { name: 'previousOwners', type: 'address[]' },
        { name: 'country', type: 'string' },
        { name: 'registrationDate', type: 'uint256' },
        { name: 'expirationDate', type: 'uint256' },
        { name: 'status', type: 'uint8' },
        { name: 'registrationNumber', type: 'string' },
        { name: 'categories', type: 'string[]' },
        { name: 'certifyingEntity', type: 'string' },
        { name: 'transferRequest', type: 'TransferRequest' },
        { name: 'documentHash', type: 'string' },
    ]
};

const signature = await signer.signTypedData(domain, types, ipData);

// Serialize the IP data
const encodedIP = await ippBlockVC.serializeIP(ipData);

// Create the verifiable credential
await nebuVC.createVC(
    ippBlockVC.address,
    ipOwnerAddress,
    encodedIP,
    signature,
    expirationTimestamp
);
```

### 3. Request IP Transfer

```javascript
// Current owner requests transfer
await ippBlockVC.requestTransfer(
    "IP-2024-001",
    currentOwnerAddress,
    newOwnerAddress,
    "Selling IP rights to partner company"
);

// IPPBlock admin approves transfer
await ippBlockVC.approveTransfer("IP-2024-001");
```

### 4. Verify IP Credential

```javascript
// Verify credential validity
const isValid = await nebuVC.verifyByOwner(credentialIndex);

// Check if IP is expired
const isExpired = await ippBlockVC.isExpired(ipData);

// Get remaining validity time
const remainingTime = await ippBlockVC.getRemainingValidity(ipData);
```

## Testing

The project includes comprehensive tests for the IPPBlock implementation:

```bash
# Run IPPBlock tests
npx hardhat test test/IPPBlock.test.js
```

Test coverage includes:
- ✅ Contract deployment and initialization
- ✅ EIP-712 signature verification
- ✅ IP credential creation and storage
- ✅ Serialization and deserialization
- ✅ Transfer request workflow
- ✅ Expiration checking
- ✅ Access control

## Integration with NebuVC

IPPBlock is fully compatible with the NebuVC verifiable credentials system:

1. **Signature Verification**: Uses standard EIP-712 domain separation
2. **Serialization**: Zero-Copy serialization for efficient storage
3. **Credential Management**: Standard VC lifecycle (create, verify, revoke)
4. **Interoperability**: Works alongside other credential types

## Gas Optimization

The contract uses several optimization techniques:
- `viaIR: true` compilation for better optimization
- Efficient serialization with Zero-Copy libraries
- Structured storage patterns
- Minimal external calls

## Future Enhancements

- [ ] Bulk IP registration
- [ ] Royalty distribution system
- [ ] IP licensing framework
- [ ] Cross-chain IP verification
- [ ] Integration with IPFS for document storage

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines
- Follow Solidity style guide
- Add tests for new features
- Update documentation
- Ensure all tests pass before PR

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Authors

- **NebuIA Team** - Initial implementation
- **IPPBlock Team** - Intellectual Property extension

## 🙏 Acknowledgments

- W3C Credentials Community Group
- Ethereum Foundation
- OpenZeppelin for contract standards
- Hardhat development team

## 📞 Support

- **Documentation**: [W3C VC Spec](https://www.w3.org/TR/vc-data-model/)
- **Issues**: [GitHub Issues](https://github.com/your-repo/verifiable_credential_WEB3/issues)
- **Community**: Join our Discord/Telegram

## 🔍 Troubleshooting

### Common Issues

1. **"Stack too deep" error**
   - Solution: Ensure `viaIR: true` in hardhat.config.js
   - Use Solidity 0.8.20+

2. **"Contract size exceeds limit"**
   - Solution: Enable optimizer with lower runs
   - Split contract into smaller components

3. **"Signature verification failed"**
   - Check domain parameters match exactly
   - Ensure correct chainId and verifyingContract

4. **"Module not found" errors**
   - Run `npm install`
   - Delete node_modules and reinstall

### Getting Help

If you encounter issues:
1. Check existing issues on GitHub
2. Review test files for examples
3. Consult the documentation
4. Open a new issue with details