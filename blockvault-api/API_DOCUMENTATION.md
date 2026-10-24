# BlockVault API Documentation

## 📋 Table of Contents
- [Installation](#installation)
- [Initialization](#initialization)
- [User Management](#user-management)
- [Content Management](#content-management)
- [Access Control](#access-control)
- [Folder Management](#folder-management)
- [Share Links](#share-links)
- [Earnings & Withdrawals](#earnings--withdrawals)
- [Inheritance Management](#inheritance-management)
- [Verifiable Credentials](#verifiable-credentials)
- [Query Functions](#query-functions)
- [Platform Management](#platform-management)
- [Total Storage Stats](#total-storage-stats)
- [Complete Examples](#complete-examples)

## 🚀 Installation

```bash
npm install ethers
```

## 🔧 Initialization

```javascript
const { BlockVaultAPI, AccessType, FolderType } = require('./BlockVaultAPI');

// Initialize with your private key
const api = new BlockVaultAPI(
    process.env.ADMIN_PRIVATE_KEY,
    'ethereumClassic' // or 'sepolia' for testnet
);
```

## 👥 User Management

### Register User
```javascript
// Register a new user (admin executes for user)
const userAddress = '0x1234...5678';
await api.registerUser(userAddress);
// User gets 10GB free storage
```

### Get User Info
```javascript
const info = await api.getUserInfo(userAddress);
console.log(info);
// {
//   isRegistered: true,
//   storageUsed: "1000000",      // bytes
//   storagePurchased: "10000000000", // bytes
//   storageAvailable: "19000000000", // bytes
//   hasMonetizationProfile: false,
//   isBlacklisted: false
// }
```

### Purchase Storage
```javascript
// Buy 50GB additional storage for user
await api.purchaseStorage(userAddress, 50);
```

### Activate Monetization
```javascript
// Enable user to sell content
await api.activateMonetizationProfile(userAddress);
```

### Blacklist Management
```javascript
// Blacklist malicious user
await api.blacklistUser(badUserAddress);

// Unblacklist user
await api.unblacklistUser(userAddress);
```

## 📦 Content Management

### Upload Content
```javascript
const fileHash = ethers.keccak256(ethers.toUtf8Bytes("my-file-content"));
const size = 1000000; // 1MB

// Upload with multiple access types
const result = await api.uploadContent(
    userAddress,
    fileHash,
    size,
    [AccessType.LICENSE, AccessType.FREE_TEMP], // Access types
    [ethers.parseEther("0.1"), 0],              // Prices
    JSON.stringify({                            // Metadata
        title: "My Digital Asset",
        description: "High quality content",
        type: "image/jpeg"
    })
);

console.log("Content Hash:", result.contentHash);
```

### Update Content Metadata
```javascript
await api.updateContentMetadata(
    contentOwner,
    contentHash,
    JSON.stringify({
        title: "Updated Title",
        description: "New description",
        version: "2.0"
    })
);
```

### Update Content Prices
```javascript
await api.updateContentPrices(
    contentOwner,
    contentHash,
    [AccessType.LICENSE, AccessType.SUBSCRIPTION],
    [ethers.parseEther("0.2"), ethers.parseEther("0.05")]
);
```

### Delete Content
```javascript
// Check if can delete first
const { canDelete, reason } = await api.canDeleteContent(contentHash);
if (canDelete) {
    await api.deleteContent(userAddress, contentHash);
} else {
    console.log("Cannot delete:", reason);
}
```

### Set Download Limits
```javascript
// Limit to 5 downloads per user for FREE_TEMP access
await api.setMaxDownloads(contentOwner, contentHash, 5);
```

### Record Download
```javascript
// Record when user downloads content
await api.recordDownload(userAddress, contentHash);

// Check download stats
const stats = await api.getDownloadStats(contentHash, userAddress);
console.log(stats);
// {
//   totalDownloads: 150,
//   maxDownloads: 5,
//   userDownloads: 2,
//   remainingDownloads: 3
// }
```

## 🔐 Access Control

### Purchase Content
```javascript
// User buys LICENSE access
await api.purchaseContent(
    buyerAddress,
    contentHash,
    AccessType.LICENSE,
    ethers.parseEther("0.1") // Payment amount validated off-chain
);
```

### Grant Temporary Access
```javascript
// Grant 7 days free trial
await api.grantTemporaryAccess(
    userAddress,
    contentHash,
    7 * 24 * 60 * 60 // 7 days in seconds
);
```

### Allow List Management
```javascript
// Add user to permanent free access list
await api.addToAllowList(contentOwner, contentHash, vipUserAddress);

// Remove from allow list
await api.removeFromAllowList(contentOwner, contentHash, userAddress);

// Get all users in allow list
const allowList = await api.getContentAllowList(contentHash);
```

### Revoke Access
```javascript
// Revoke all access types from user
await api.revokeAccess(contentOwner, contentHash, userAddress);
```

### Check Access
```javascript
// Verify if user has valid access
const hasAccess = await api.hasValidAccess(userAddress, contentHash);
```

## 📁 Folder Management

### Create Folder
```javascript
// Create subscription folder
const folderResult = await api.createFolder(
    userAddress,
    "Premium Content Collection",
    FolderType.SUBSCRIPTION,
    ethers.parseEther("0.5"),  // Monthly price
    30 * 24 * 60 * 60,         // 30 days duration
    true                        // isPublic
);
console.log("Folder ID:", folderResult.folderId);

// Create individual sales folder
await api.createFolder(
    userAddress,
    "Digital Assets",
    FolderType.INDIVIDUAL,
    0,    // No subscription price
    0,    // No duration
    true  // isPublic
);
```

### Manage Folder Contents
```javascript
// Add content to folder
await api.addContentToFolder(userAddress, contentHash, folderId);

// Remove content from folder
await api.removeContentFromFolder(userAddress, contentHash, folderId);

// Get folder contents
const contents = await api.getFolderContents(folderId);
```

### Subscribe to Folder
```javascript
// User subscribes to folder
await api.subscribeToFolder(subscriberAddress, folderId);

// Get folder info
const folderInfo = await api.getFolderInfo(folderId);
console.log(folderInfo);
// {
//   owner: "0x...",
//   name: "Premium Content",
//   folderType: 0, // SUBSCRIPTION
//   subscriptionPrice: "0.5",
//   subscriptionDuration: 2592000,
//   totalSubscribers: 42,
//   isPublic: true
// }
```

## 🔗 Share Links

### Create Share Link
```javascript
// Create share link with limits
const linkResult = await api.createShareLink(
    contentOwner,
    contentHash,
    7 * 24 * 60 * 60,     // Valid for 7 days
    10,                    // Max 10 uses
    AccessType.FREE_TEMP   // Grant temporary access
);
console.log("Share Link ID:", linkResult.linkId);
```

### Use Share Link
```javascript
// User claims access via share link
await api.useShareLink(userAddress, linkId);
```

### Get Share Link Info
```javascript
const linkInfo = await api.getShareLinkInfo(linkId);
console.log(linkInfo);
// {
//   contentHash: "0x...",
//   expirationDate: Date,
//   maxUses: 10,
//   currentUses: 3,
//   accessType: 3, // FREE_TEMP
//   isActive: true,
//   remainingUses: 7
// }
```

## 💰 Earnings

### Get User Earnings
```javascript
const earnings = await api.getUserEarnings(contentCreator);
console.log(earnings);
// {
//   totalEarnings: "10.5"        // ETH
// }
```

## 👑 Inheritance Management

### Designate Heir
```javascript
// Set heir for content
await api.designateHeir(contentOwner, contentHash, heirAddress);
```

### Transfer Ownership
```javascript
// Direct transfer
await api.transferContentOwnership(currentOwner, contentHash, newOwner);
```

### Claim Inheritance
```javascript
// Heir claims inherited content
await api.claimInheritance(heirAddress, contentHash);
```

### Content Managers
```javascript
// Add manager
await api.addContentManager(contentOwner, contentHash, managerAddress);

// Remove manager
await api.removeContentManager(contentOwner, contentHash, managerAddress);

// Get all managers
const managers = await api.getContentManagers(contentHash);
```

## 🔐 Verifiable Credentials

### Create Verifiable Credential
```javascript
// Prepare access data
const accessData = {
    id: api.generateAccessId(),
    owner: contentOwner,
    user: buyerAddress,
    contentHash: contentHash,
    accessType: AccessType.LICENSE,
    price: ethers.parseEther("0.1"),
    expirationDate: api.calculateExpirationDate(365) // 1 year
};

// Create VC
const vcResult = await api.createVerifiableCredential(accessData);
console.log("VC ID:", vcResult.vcId);
console.log("Serialized Data:", vcResult.serialized);
console.log("Signature:", vcResult.signature);
```

### Verify Credential
```javascript
// Verify by owner
const isValid = await api.verifyCredential(vcId, true);

// Verify by issuer
const isValidByIssuer = await api.verifyCredential(vcId, false);
```

### Get Credential Info
```javascript
const vcInfo = await api.getCredentialInfo(vcId);
console.log(vcInfo);
// {
//   issuer: "0x...",
//   subject: "0x...",
//   issuanceDate: Date,
//   expirationDate: Date,
//   isRevoked: false,
//   accessData: {
//     id: "access-123",
//     owner: "0x...",
//     user: "0x...",
//     contentHash: "0x...",
//     accessType: 1,
//     price: "0.1",
//     expirationDate: Date
//   }
// }
```

## 🔍 Query Functions

### Get User Contents
```javascript
// Get all content uploaded by user
const uploadedContent = await api.getUserContents(userAddress);

// Get purchased content
const purchasedContent = await api.getUserPurchasedContent(userAddress);

// Get content shared with user
const sharedContent = await api.getUserSharedWithMe(userAddress);
```

### Get User Folders
```javascript
const userFolders = await api.getUserFolders(userAddress);
```

### Get Content Info
```javascript
// By content hash
const contentInfo = await api.getContentInfo(contentHash);

// By file hash
const owner = await api.getOwnerByFileHash(fileHash);
```

### Get Content Price
```javascript
const price = await api.getContentPrice(contentHash, AccessType.LICENSE);
console.log("Price:", price, "ETH");
```

## 🏦 Platform Management

### Update Platform Wallet
```javascript
// Change platform fee recipient
await api.updatePlatformWallet(newPlatformWallet);
```

## 📊 Total Storage Stats

```javascript
const storageStats = await api.getTotalStorageStats();
console.log(storageStats);
// {
//   totalUsed: "1250.5",        // GB
//   totalPurchased: "5000.0",   // GB
//   totalFree: "10.0",          // GB per user
//   totalUsedBytes: "1250500000000",
//   totalPurchasedBytes: "5000000000000"
// }
```

## 📚 Complete Examples

### Example 1: Complete Content Lifecycle
```javascript
async function contentLifecycle() {
    // 1. Register user
    const creator = '0x1234...';
    await api.registerUser(creator);
    
    // 2. Activate monetization
    await api.activateMonetizationProfile(creator);
    
    // 3. Upload content
    const fileHash = ethers.keccak256(ethers.toUtf8Bytes("premium-content"));
    const uploadResult = await api.uploadContent(
        creator,
        fileHash,
        10000000, // 10MB
        [AccessType.LICENSE, AccessType.FREE_TEMP],
        [ethers.parseEther("0.5"), 0],
        JSON.stringify({ title: "Premium Course" })
    );
    
    // 4. Set download limits for free access
    await api.setMaxDownloads(creator, uploadResult.contentHash, 3);
    
    // 5. Create share link
    const shareLink = await api.createShareLink(
        creator,
        uploadResult.contentHash,
        86400,    // 1 day
        100,      // 100 uses
        AccessType.FREE_TEMP
    );
    
    // 6. Buyer purchases content
    const buyer = '0x5678...';
    await api.registerUser(buyer);
    await api.purchaseContent(
        buyer,
        uploadResult.contentHash,
        AccessType.LICENSE,
        ethers.parseEther("0.5")
    );
    
    // 7. Check earnings
    const earnings = await api.getUserEarnings(creator);
    console.log("Creator earnings:", earnings.totalEarnings);
}
```

### Example 2: Subscription Folder System
```javascript
async function subscriptionSystem() {
    // 1. Create subscription folder
    const creator = '0xABCD...';
    const folderResult = await api.createFolder(
        creator,
        "Monthly Photography Pack",
        FolderType.SUBSCRIPTION,
        ethers.parseEther("0.1"),  // 0.1 ETH/month
        30 * 24 * 60 * 60,         // 30 days
        true
    );
    
    // 2. Add content to folder
    for (let i = 0; i < 10; i++) {
        const fileHash = ethers.keccak256(ethers.toUtf8Bytes(`photo-${i}`));
        const upload = await api.uploadContent(
            creator,
            fileHash,
            5000000, // 5MB each
            [AccessType.SUBSCRIPTION],
            [0], // No individual price
            JSON.stringify({ title: `Photo ${i}` })
        );
        
        await api.addContentToFolder(
            creator,
            upload.contentHash,
            folderResult.folderId
        );
    }
    
    // 3. User subscribes
    const subscriber = '0xDEF0...';
    await api.subscribeToFolder(subscriber, folderResult.folderId);
    
    // 4. Check folder stats
    const info = await api.getFolderInfo(folderResult.folderId);
    console.log("Total subscribers:", info.totalSubscribers);
}
```

### Example 3: Inheritance Planning
```javascript
async function inheritanceSetup() {
    const parent = '0x1111...';
    const child = '0x2222...';
    
    // 1. Parent uploads family photos
    const photoHash = ethers.keccak256(ethers.toUtf8Bytes("family-photos"));
    const upload = await api.uploadContent(
        parent,
        photoHash,
        100000000, // 100MB
        [AccessType.FREE_PERM],
        [0],
        JSON.stringify({ title: "Family Photos 1990-2020" })
    );
    
    // 2. Designate heir
    await api.designateHeir(parent, upload.contentHash, child);
    
    // 3. Add child to allow list for immediate access
    await api.addToAllowList(parent, upload.contentHash, child);
    
    // 4. Later, child can claim ownership
    // await api.claimInheritance(child, upload.contentHash);
}
```

### Example 4: Enterprise Content Management
```javascript
async function enterpriseManagement() {
    const company = '0xCORP...';
    const manager1 = '0xMGR1...';
    const manager2 = '0xMGR2...';
    
    // 1. Upload company assets
    const assetHash = ethers.keccak256(ethers.toUtf8Bytes("company-logo"));
    const upload = await api.uploadContent(
        company,
        assetHash,
        2000000, // 2MB
        [AccessType.LICENSE],
        [ethers.parseEther("10")], // High value asset
        JSON.stringify({ 
            title: "Company Logo Pack",
            usage: "Commercial license required"
        })
    );
    
    // 2. Add managers
    await api.addContentManager(company, upload.contentHash, manager1);
    await api.addContentManager(company, upload.contentHash, manager2);
    
    // 3. Manager updates price
    await api.updateContentPrices(
        company, // Admin specifies company as owner
        upload.contentHash,
        [AccessType.LICENSE],
        [ethers.parseEther("15")] // New price
    );
    
    // 4. Create VC for audit trail
    const accessData = {
        id: api.generateAccessId(),
        owner: company,
        user: manager1,
        contentHash: upload.contentHash,
        accessType: AccessType.LICENSE,
        price: ethers.parseEther("0"),
        expirationDate: api.calculateExpirationDate(365)
    };
    
    const vc = await api.createVerifiableCredential(accessData);
    console.log("Management credential created:", vc.vcId);
}
```

## 🛠️ Error Handling

```javascript
try {
    await api.uploadContent(/* ... */);
} catch (error) {
    if (error.message.includes("Insufficient storage")) {
        // Buy more storage
        await api.purchaseStorage(userAddress, 10);
        // Retry upload
    } else if (error.message.includes("not registered")) {
        // Register user first
        await api.registerUser(userAddress);
    } else {
        console.error("Unexpected error:", error);
    }
}
```

## 📝 Constants Reference

### Access Types
```javascript
AccessType = {
    TRANSFER: 0,      // Full ownership transfer
    LICENSE: 1,       // Usage license
    SUBSCRIPTION: 2,  // Time-based subscription
    FREE_TEMP: 3,     // Temporary free access
    FREE_PERM: 4      // Permanent free access
}
```

### Folder Types
```javascript
FolderType = {
    SUBSCRIPTION: 0,  // Monthly subscription model
    INDIVIDUAL: 1,    // Sell each file separately
    MIXED: 2,         // Mix of free and paid
    PRIVATE: 3        // Owner only
}
```

## 🔑 Key Features

1. **Admin-Only Pattern**: Platform owner executes all transactions
2. **No Gas for Users**: Users don't need ETH
3. **Off-chain Payments**: Integrate with Stripe/PayPal
4. **Verifiable Credentials**: W3C standard compliance
5. **Flexible Access Control**: 5 different access types
6. **Download Limits**: Smart limits for trials
7. **Inheritance System**: Digital asset succession
8. **Total Storage Tracking**: Platform-wide metrics

## 📞 Support

For issues or questions:
- Check test files for more examples
- Review the smart contract code
- Open an issue on GitHub

---

**BlockVault API v1.0** - Built for Ethereum Classic