# BlockVault API - Complete Guide

## 🚀 Quick Start

### Installation
```bash
cd blockvault-api
npm install
```

### Environment Setup
Create a `.env` file:
```env
ADMIN_PRIVATE_KEY=your_private_key_here
BLOCK_VAULT_ADDRESS=0xFCfE123FeF7c25063acB0037aa4fdA3FA3F09ba1
NEBU_VC_ADDRESS=0xc36f0e8f2a38C0F0726ecf6f9dfBdE0EA88343D9
```

### Start API Server
```bash
node server.js
```

The API will run on `http://localhost:3000`

## ✅ What You CAN Do

1. **Register users** - Without them needing ETH
2. **Upload content** - Store metadata and manage access
3. **Set prices** - Multiple access types per content
4. **Control downloads** - Set limits for free trials
5. **Create subscriptions** - Monthly recurring access
6. **Share content** - Create limited use links
7. **Manage inheritance** - Digital asset succession
8. **Track earnings** - Monitor revenue per creator
9. **Verify credentials** - W3C standard compliance
10. **Query everything** - Comprehensive read functions

## ❌ What You CANNOT Do

1. **Store actual files** - Only metadata/hashes on-chain
2. **Process payments on-chain** - Use Stripe/PayPal off-chain
3. **Let users pay gas** - Admin wallet pays all gas
4. **Delete with active subscriptions** - Revenue protection
5. **Exceed download limits** - Enforced for FREE_TEMP
6. **Register blacklisted users** - Security protection
7. **Use without admin key** - All functions need admin
8. **Modify other's content** - Only owner/manager can
9. **Bypass storage limits** - Must purchase more
10. **Recover lost private keys** - No key recovery

## 📡 API Endpoints

### Base URL
```
http://localhost:3000/api
```

### Headers Required
```json
{
  "Content-Type": "application/json"
}
```

---

## 👤 USER MANAGEMENT

### 1. Register New User
**What it does**: Register a user with 10GB free storage  
**Who can do it**: Admin only

```bash
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "userAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f6E123"
  }'
```

**Response**:
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "userAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f6E123",
    "freeStorage": "10000000000",
    "transactionHash": "0x..."
  }
}
```

### 2. Get User Info
**What it does**: Get complete user information  
**Who can do it**: Anyone can query

```bash
curl -X GET http://localhost:3000/api/users/0x742d35Cc6634C0532925a3b844Bc9e7595f6E123
```

**Response**:
```json
{
  "success": true,
  "data": {
    "isRegistered": true,
    "storageUsed": "1500000000",
    "storagePurchased": "50000000000",
    "storageAvailable": "58500000000",
    "hasMonetizationProfile": true,
    "isBlacklisted": false,
    "totalEarnings": "5.25"
  }
}
```

### 3. Purchase Storage
**What it does**: Buy additional storage in GB  
**Who can do it**: Admin executes for user

```bash
curl -X POST http://localhost:3000/api/users/storage/purchase \
  -H "Content-Type: application/json" \
  -d '{
    "userAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f6E123",
    "gbAmount": 100
  }'
```

**Response**:
```json
{
  "success": true,
  "message": "Storage purchased successfully",
  "data": {
    "userAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f6E123",
    "gbPurchased": 100,
    "newTotalStorage": "160000000000",
    "transactionHash": "0x..."
  }
}
```

### 4. Activate Monetization Profile
**What it does**: Enable user to sell content  
**Who can do it**: Admin executes for user

```bash
curl -X POST http://localhost:3000/api/users/monetization/activate \
  -H "Content-Type: application/json" \
  -d '{
    "userAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f6E123"
  }'
```

### 5. Blacklist User
**What it does**: Block malicious user from platform  
**Who can do it**: Admin only

```bash
curl -X POST http://localhost:3000/api/users/blacklist \
  -H "Content-Type: application/json" \
  -d '{
    "userAddress": "0xBadUser123...",
    "action": "blacklist"
  }'
```

### 6. Unblacklist User
```bash
curl -X POST http://localhost:3000/api/users/blacklist \
  -H "Content-Type: application/json" \
  -d '{
    "userAddress": "0xBadUser123...",
    "action": "unblacklist"
  }'
```

---

## 📦 CONTENT MANAGEMENT

### 7. Upload Content
**What it does**: Upload content metadata with multiple access types  
**Who can do it**: Admin executes for user

```bash
curl -X POST http://localhost:3000/api/content/upload \
  -H "Content-Type: application/json" \
  -d '{
    "userAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f6E123",
    "fileHash": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    "size": 10485760,
    "accessTypes": [1, 3],
    "prices": ["100000000000000000", "0"],
    "metadata": {
      "title": "Premium Digital Asset",
      "description": "High quality content for sale",
      "type": "image/jpeg",
      "tags": ["photography", "landscape", "premium"]
    }
  }'
```

**Access Types**:
- 0 = TRANSFER (ownership transfer)
- 1 = LICENSE (usage license)
- 2 = SUBSCRIPTION (time-based)
- 3 = FREE_TEMP (free trial)
- 4 = FREE_PERM (always free)

**Response**:
```json
{
  "success": true,
  "message": "Content uploaded successfully",
  "data": {
    "contentHash": "0xabcdef...",
    "fileHash": "0x123456...",
    "owner": "0x742d35Cc6634C0532925a3b844Bc9e7595f6E123",
    "accessTypes": [1, 3],
    "prices": ["0.1", "0"],
    "transactionHash": "0x..."
  }
}
```

### 8. Update Content Metadata
**What it does**: Update content information  
**Who can do it**: Content owner

```bash
curl -X PUT http://localhost:3000/api/content/metadata \
  -H "Content-Type: application/json" \
  -d '{
    "contentOwner": "0x742d35Cc6634C0532925a3b844Bc9e7595f6E123",
    "contentHash": "0xabcdef...",
    "metadata": {
      "title": "Updated Premium Asset",
      "description": "Now with more features",
      "version": "2.0",
      "changelog": "Added high resolution version"
    }
  }'
```

### 9. Update Content Prices
**What it does**: Change prices for existing access types  
**Who can do it**: Content owner or manager

```bash
curl -X PUT http://localhost:3000/api/content/prices \
  -H "Content-Type: application/json" \
  -d '{
    "contentOwner": "0x742d35Cc6634C0532925a3b844Bc9e7595f6E123",
    "contentHash": "0xabcdef...",
    "accessTypes": [1, 2],
    "newPrices": ["200000000000000000", "50000000000000000"]
  }'
```

### 10. Set Download Limits
**What it does**: Limit downloads for FREE_TEMP access  
**Who can do it**: Content owner

```bash
curl -X POST http://localhost:3000/api/content/download-limits \
  -H "Content-Type: application/json" \
  -d '{
    "contentOwner": "0x742d35Cc6634C0532925a3b844Bc9e7595f6E123",
    "contentHash": "0xabcdef...",
    "maxDownloads": 5
  }'
```

### 11. Record Download
**What it does**: Track when user downloads content  
**Who can do it**: Platform when user downloads

```bash
curl -X POST http://localhost:3000/api/content/download \
  -H "Content-Type: application/json" \
  -d '{
    "userAddress": "0xDownloader...",
    "contentHash": "0xabcdef..."
  }'
```

### 12. Get Download Stats
**What it does**: Check download statistics  
**Who can do it**: Anyone can query

```bash
curl -X GET http://localhost:3000/api/content/downloads/0xabcdef.../0xUserAddress...
```

**Response**:
```json
{
  "success": true,
  "data": {
    "totalDownloads": 150,
    "maxDownloads": 5,
    "userDownloads": 3,
    "remainingDownloads": 2
  }
}
```

### 13. Delete Content
**What it does**: Remove content and free storage  
**Who can do it**: Content owner

```bash
curl -X DELETE http://localhost:3000/api/content/0xabcdef... \
  -H "Content-Type: application/json" \
  -d '{
    "contentOwner": "0x742d35Cc6634C0532925a3b844Bc9e7595f6E123"
  }'
```

### 14. Check If Can Delete
**What it does**: Verify if content can be deleted  
**Who can do it**: Anyone can query

```bash
curl -X GET http://localhost:3000/api/content/can-delete/0xabcdef...
```

**Response**:
```json
{
  "success": true,
  "data": {
    "canDelete": false,
    "reason": "Content has active subscriptions"
  }
}
```

---

## 💰 PURCHASE & ACCESS

### 15. Purchase Content
**What it does**: Buy access to content  
**Who can do it**: Admin executes after payment

```bash
curl -X POST http://localhost:3000/api/purchase \
  -H "Content-Type: application/json" \
  -d '{
    "buyerAddress": "0xBuyer123...",
    "contentHash": "0xabcdef...",
    "accessType": 1,
    "paymentAmount": "100000000000000000",
    "paymentProof": {
      "stripePaymentId": "pi_1234567890",
      "amount": 100,
      "currency": "usd"
    }
  }'
```

### 16. Grant Temporary Access
**What it does**: Give free trial access  
**Who can do it**: Content owner

```bash
curl -X POST http://localhost:3000/api/access/grant-temp \
  -H "Content-Type: application/json" \
  -d '{
    "userAddress": "0xTrialUser...",
    "contentHash": "0xabcdef...",
    "duration": 604800
  }'
```

**Duration in seconds**:
- 1 day = 86400
- 7 days = 604800
- 30 days = 2592000

### 17. Add to Allow List
**What it does**: Grant permanent free access  
**Who can do it**: Content owner

```bash
curl -X POST http://localhost:3000/api/access/allowlist \
  -H "Content-Type: application/json" \
  -d '{
    "contentOwner": "0x742d35Cc6634C0532925a3b844Bc9e7595f6E123",
    "contentHash": "0xabcdef...",
    "userAddress": "0xVIPUser...",
    "action": "add"
  }'
```

### 18. Remove from Allow List
```bash
curl -X POST http://localhost:3000/api/access/allowlist \
  -H "Content-Type: application/json" \
  -d '{
    "contentOwner": "0x742d35Cc6634C0532925a3b844Bc9e7595f6E123",
    "contentHash": "0xabcdef...",
    "userAddress": "0xVIPUser...",
    "action": "remove"
  }'
```

### 19. Revoke All Access
**What it does**: Remove all access from user  
**Who can do it**: Content owner

```bash
curl -X POST http://localhost:3000/api/access/revoke \
  -H "Content-Type: application/json" \
  -d '{
    "contentOwner": "0x742d35Cc6634C0532925a3b844Bc9e7595f6E123",
    "contentHash": "0xabcdef...",
    "userAddress": "0xRevokedUser..."
  }'
```

### 20. Check Access
**What it does**: Verify if user has valid access  
**Who can do it**: Anyone can query

```bash
curl -X GET http://localhost:3000/api/access/check/0xUserAddress.../0xContentHash...
```

---

## 📁 FOLDER MANAGEMENT

### 21. Create Folder
**What it does**: Create content collection  
**Who can do it**: Admin executes for user

```bash
curl -X POST http://localhost:3000/api/folders/create \
  -H "Content-Type: application/json" \
  -d '{
    "userAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f6E123",
    "name": "Premium Photography Collection",
    "folderType": 0,
    "subscriptionPrice": "500000000000000000",
    "subscriptionDuration": 2592000,
    "isPublic": true
  }'
```

**Folder Types**:
- 0 = SUBSCRIPTION (monthly fee for all content)
- 1 = INDIVIDUAL (sell each file separately)
- 2 = MIXED (combination model)
- 3 = PRIVATE (owner only)

### 22. Add Content to Folder
**What it does**: Organize content in folders  
**Who can do it**: Folder owner

```bash
curl -X POST http://localhost:3000/api/folders/content \
  -H "Content-Type: application/json" \
  -d '{
    "userAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f6E123",
    "contentHash": "0xabcdef...",
    "folderId": "0xfolder123...",
    "action": "add"
  }'
```

### 23. Remove Content from Folder
```bash
curl -X POST http://localhost:3000/api/folders/content \
  -H "Content-Type: application/json" \
  -d '{
    "userAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f6E123",
    "contentHash": "0xabcdef...",
    "folderId": "0xfolder123...",
    "action": "remove"
  }'
```

### 24. Subscribe to Folder
**What it does**: Get access to all folder content  
**Who can do it**: Admin after payment

```bash
curl -X POST http://localhost:3000/api/folders/subscribe \
  -H "Content-Type: application/json" \
  -d '{
    "subscriberAddress": "0xSubscriber...",
    "folderId": "0xfolder123...",
    "paymentProof": {
      "stripeSubscriptionId": "sub_1234567890",
      "amount": 50,
      "currency": "usd"
    }
  }'
```

### 25. Get Folder Info
```bash
curl -X GET http://localhost:3000/api/folders/0xfolder123...
```

---

## 🔗 SHARE LINKS

### 26. Create Share Link
**What it does**: Create limited use share link  
**Who can do it**: Content owner

```bash
curl -X POST http://localhost:3000/api/shares/create \
  -H "Content-Type: application/json" \
  -d '{
    "userAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f6E123",
    "contentHash": "0xabcdef...",
    "duration": 604800,
    "maxUses": 10,
    "accessType": 3
  }'
```

**Response**:
```json
{
  "success": true,
  "data": {
    "linkId": "0xlink789...",
    "shareUrl": "https://platform.com/share/0xlink789...",
    "expiresAt": "2025-08-06T12:00:00Z",
    "maxUses": 10
  }
}
```

### 27. Use Share Link
**What it does**: Claim access via share link  
**Who can do it**: Anyone with link

```bash
curl -X POST http://localhost:3000/api/shares/use \
  -H "Content-Type: application/json" \
  -d '{
    "userAddress": "0xClaimUser...",
    "linkId": "0xlink789..."
  }'
```

### 28. Get Share Link Info
```bash
curl -X GET http://localhost:3000/api/shares/0xlink789...
```

---

## 💸 EARNINGS & WITHDRAWALS

### 29. Get User Earnings
**What it does**: Check creator earnings  
**Who can do it**: Anyone can query

```bash
curl -X GET http://localhost:3000/api/earnings/0x742d35Cc6634C0532925a3b844Bc9e7595f6E123
```

**Response**:
```json
{
  "success": true,
  "data": {
    "totalEarnings": "125.75"
  }
}
```

---

## 👑 INHERITANCE & MANAGERS

### 30. Designate Heir
**What it does**: Set content inheritor  
**Who can do it**: Content owner

```bash
curl -X POST http://localhost:3000/api/inheritance/heir \
  -H "Content-Type: application/json" \
  -d '{
    "contentOwner": "0x742d35Cc6634C0532925a3b844Bc9e7595f6E123",
    "contentHash": "0xabcdef...",
    "heirAddress": "0xHeir123..."
  }'
```

### 31. Claim Inheritance
**What it does**: Heir claims content  
**Who can do it**: Designated heir

```bash
curl -X POST http://localhost:3000/api/inheritance/claim \
  -H "Content-Type: application/json" \
  -d '{
    "heirAddress": "0xHeir123...",
    "contentHash": "0xabcdef..."
  }'
```

### 32. Add Content Manager
**What it does**: Delegate content management  
**Who can do it**: Content owner

```bash
curl -X POST http://localhost:3000/api/managers \
  -H "Content-Type: application/json" \
  -d '{
    "contentOwner": "0x742d35Cc6634C0532925a3b844Bc9e7595f6E123",
    "contentHash": "0xabcdef...",
    "managerAddress": "0xManager456...",
    "action": "add"
  }'
```

### 33. Remove Content Manager
```bash
curl -X POST http://localhost:3000/api/managers \
  -H "Content-Type: application/json" \
  -d '{
    "contentOwner": "0x742d35Cc6634C0532925a3b844Bc9e7595f6E123",
    "contentHash": "0xabcdef...",
    "managerAddress": "0xManager456...",
    "action": "remove"
  }'
```

### 34. Transfer Ownership
**What it does**: Transfer content to new owner  
**Who can do it**: Current owner

```bash
curl -X POST http://localhost:3000/api/ownership/transfer \
  -H "Content-Type: application/json" \
  -d '{
    "currentOwner": "0x742d35Cc6634C0532925a3b844Bc9e7595f6E123",
    "contentHash": "0xabcdef...",
    "newOwner": "0xNewOwner789..."
  }'
```

---

## 🔐 VERIFIABLE CREDENTIALS

### 35. Create Verifiable Credential
**What it does**: Create W3C standard credential  
**Who can do it**: Platform after access grant

```bash
curl -X POST http://localhost:3000/api/credentials/create \
  -H "Content-Type: application/json" \
  -d '{
    "accessData": {
      "id": "access-1234567890",
      "owner": "0x742d35Cc6634C0532925a3b844Bc9e7595f6E123",
      "user": "0xBuyer123...",
      "contentHash": "0xabcdef...",
      "accessType": 1,
      "price": "100000000000000000",
      "expirationDate": 1735689600
    }
  }'
```

### 36. Verify Credential
**What it does**: Validate credential authenticity  
**Who can do it**: Anyone can verify

```bash
curl -X POST http://localhost:3000/api/credentials/verify \
  -H "Content-Type: application/json" \
  -d '{
    "vcId": 123,
    "verifyAsOwner": true
  }'
```

### 37. Get Credential Info
```bash
curl -X GET http://localhost:3000/api/credentials/123
```

---

## 🔍 QUERY FUNCTIONS

### 38. Get User Contents
**What it does**: List all user's uploaded content  
**Who can do it**: Anyone can query

```bash
curl -X GET http://localhost:3000/api/users/0x742d35Cc6634C0532925a3b844Bc9e7595f6E123/contents
```

### 39. Get User Purchased Content
```bash
curl -X GET http://localhost:3000/api/users/0x742d35Cc6634C0532925a3b844Bc9e7595f6E123/purchased
```

### 40. Get Content Shared With User
```bash
curl -X GET http://localhost:3000/api/users/0x742d35Cc6634C0532925a3b844Bc9e7595f6E123/shared
```

### 41. Get User Folders
```bash
curl -X GET http://localhost:3000/api/users/0x742d35Cc6634C0532925a3b844Bc9e7595f6E123/folders
```

### 42. Get Content Info
```bash
curl -X GET http://localhost:3000/api/content/0xabcdef...
```

### 43. Get Owner by File Hash
```bash
curl -X GET http://localhost:3000/api/content/owner/0xfilehash123...
```

### 44. Get Content Price
```bash
curl -X GET http://localhost:3000/api/content/0xabcdef.../price/1
```

### 45. Get Content Allow List
```bash
curl -X GET http://localhost:3000/api/content/0xabcdef.../allowlist
```

### 46. Get Content Managers
```bash
curl -X GET http://localhost:3000/api/content/0xabcdef.../managers
```

### 47. Get Folder Contents
```bash
curl -X GET http://localhost:3000/api/folders/0xfolder123.../contents
```

### 48. Get Platform Stats
```bash
curl -X GET http://localhost:3000/api/platform/stats
```

**Response**:
```json
{
  "success": true,
  "data": {
    "totalUsers": 1543,
    "totalContent": 8921,
    "totalStorageUsed": "15234.5",
    "totalStoragePurchased": "85000.0",
    "totalTransactions": 45678,
    "platformRevenue": "2345.67"
  }
}
```

### 49. Get Total Storage Stats
```bash
curl -X GET http://localhost:3000/api/platform/storage
```

**Response**:
```json
{
  "success": true,
  "data": {
    "totalUsed": "15234.5",
    "totalPurchased": "85000.0",
    "totalFree": "10.0",
    "totalUsedBytes": "15234500000000",
    "totalPurchasedBytes": "85000000000000"
  }
}
```

---

## 🔧 PLATFORM MANAGEMENT

### 50. Update Platform Wallet
**What it does**: Change fee recipient address  
**Who can do it**: Contract owner only

```bash
curl -X PUT http://localhost:3000/api/platform/wallet \
  -H "Content-Type: application/json" \
  -d '{
    "newWallet": "0xNewPlatformWallet..."
  }'
```

---

## 📝 COMPLEX WORKFLOWS

### Complete Content Sale Flow
```bash
# 1. Seller uploads content
curl -X POST http://localhost:3000/api/content/upload \
  -H "Content-Type: application/json" \
  -d '{
    "userAddress": "0xSeller...",
    "fileHash": "0xabc123...",
    "size": 5242880,
    "accessTypes": [1, 3],
    "prices": ["500000000000000000", "0"],
    "metadata": {
      "title": "Premium Photo Pack",
      "description": "10 high-res photos"
    }
  }'

# 2. Set download limit for trials
curl -X POST http://localhost:3000/api/content/download-limits \
  -H "Content-Type: application/json" \
  -d '{
    "contentOwner": "0xSeller...",
    "contentHash": "0xContentHash...",
    "maxDownloads": 3
  }'

# 3. Buyer purchases (after Stripe payment)
curl -X POST http://localhost:3000/api/purchase \
  -H "Content-Type: application/json" \
  -d '{
    "buyerAddress": "0xBuyer...",
    "contentHash": "0xContentHash...",
    "accessType": 1,
    "paymentAmount": "500000000000000000",
    "paymentProof": {
      "stripePaymentId": "pi_abc123",
      "amount": 50,
      "currency": "usd"
    }
  }'

# 4. Create verifiable credential
curl -X POST http://localhost:3000/api/credentials/create \
  -H "Content-Type: application/json" \
  -d '{
    "accessData": {
      "id": "purchase-12345",
      "owner": "0xSeller...",
      "user": "0xBuyer...",
      "contentHash": "0xContentHash...",
      "accessType": 1,
      "price": "500000000000000000",
      "expirationDate": 0
    }
  }'
```

### Subscription Folder Flow
```bash
# 1. Create subscription folder
curl -X POST http://localhost:3000/api/folders/create \
  -H "Content-Type: application/json" \
  -d '{
    "userAddress": "0xCreator...",
    "name": "Monthly Art Collection",
    "folderType": 0,
    "subscriptionPrice": "1000000000000000000",
    "subscriptionDuration": 2592000,
    "isPublic": true
  }'

# 2. Add multiple contents
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/folders/content \
    -H "Content-Type: application/json" \
    -d '{
      "userAddress": "0xCreator...",
      "contentHash": "0xContent'$i'...",
      "folderId": "0xFolderId...",
      "action": "add"
    }'
done

# 3. User subscribes (after payment)
curl -X POST http://localhost:3000/api/folders/subscribe \
  -H "Content-Type: application/json" \
  -d '{
    "subscriberAddress": "0xSubscriber...",
    "folderId": "0xFolderId...",
    "paymentProof": {
      "stripeSubscriptionId": "sub_abc123",
      "amount": 100,
      "currency": "usd"
    }
  }'
```

---

## 🚨 ERROR RESPONSES

### Common Error Format
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_STORAGE",
    "message": "User does not have enough storage space",
    "details": {
      "required": "10485760",
      "available": "5242880"
    }
  }
}
```

### Error Codes
- `USER_NOT_REGISTERED` - User must register first
- `INSUFFICIENT_STORAGE` - Need to buy more storage
- `ACCESS_DENIED` - No permission for this action
- `CONTENT_NOT_FOUND` - Invalid content hash
- `ALREADY_EXISTS` - Duplicate registration/upload
- `INVALID_PARAMETERS` - Missing or invalid params
- `BLACKLISTED` - User is blacklisted
- `ACTIVE_SUBSCRIPTIONS` - Cannot delete with subscribers
- `DOWNLOAD_LIMIT_REACHED` - Max downloads exceeded
- `EXPIRED_ACCESS` - Access has expired
- `PAYMENT_REQUIRED` - Payment validation failed

---

## 🔑 IMPORTANT NOTES

1. **All prices** are in Wei (1 ETH = 10^18 Wei)
2. **All durations** are in seconds
3. **File hashes** must be 32 bytes (0x prefixed)
4. **User addresses** must be valid Ethereum addresses
5. **Admin wallet** pays all gas fees
6. **Payments** are processed off-chain (Stripe/PayPal)
7. **Files** are stored off-chain (IPFS/S3)
8. **Metadata** is stored as JSON strings on-chain
9. **Access control** is enforced by smart contract
10. **Verifiable Credentials** follow W3C standards

---

## 📞 SUPPORT

For issues or questions:
- Review smart contract: `contracts/sample/BlockVault.sol`
- Check tests: `test/BlockVault.test.js`
- API implementation: `blockvault-api/BlockVaultAPI.js`
- Contract address: `0xFCfE123FeF7c25063acB0037aa4fdA3FA3F09ba1`
- Network: Ethereum Classic (Chain ID: 61)

---

**BlockVault API v1.0** - The most advanced decentralized storage platform