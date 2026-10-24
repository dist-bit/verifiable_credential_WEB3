const { BlockVaultAPI, AccessType, FolderType } = require('../BlockVaultAPI');
const { ethers } = require('ethers');
require('dotenv').config({ path: '../../.env' });

async function main() {
    // Initialize API
    const api = new BlockVaultAPI(process.env.PRIVATE_KEY);
    const userAddress = api.wallet.address; // v3: Use wallet address as user
    
    console.log('🚀 BlockVault v3 API Example - Basic Usage\n');
    console.log('📋 User Address:', userAddress);
    console.log('📋 Contract:', await api.blockVault.getAddress());
    console.log('');
    
    try {
        // 1. Check if user is registered
        console.log('1️⃣ Checking user registration...');
        const isRegistered = await api.isUserRegistered(userAddress);
        
        if (!isRegistered) {
            console.log('   User not registered. Registering...');
            await api.registerUser(userAddress);
            console.log('   ✅ User registered successfully!\n');
        } else {
            console.log('   ✅ User already registered\n');
        }
        
        // 2. Get user info
        console.log('2️⃣ Getting user information...');
        const userInfo = await api.getUserInfo(userAddress);
        console.log('   Storage Used:', (Number(userInfo.storageUsed) / 1e9).toFixed(2), 'GB');
        console.log('   Storage Available:', (Number(userInfo.storageAvailable) / 1e9).toFixed(2), 'GB');
        console.log('   Has Monetization:', userInfo.hasMonetizationProfile);
        console.log('');
        
        // 3. Upload content (v3 requires userAddress)
        console.log('3️⃣ Uploading content...');
        const fileHash = ethers.randomBytes(32); // Simulate file hash
        const fileSize = 1000000; // 1MB
        
        const uploadResult = await api.uploadContent(
            userAddress, // v3: userAddress parameter required
            fileHash,
            fileSize,
            [AccessType.LICENSE, AccessType.FREE_TEMP],
            [ethers.parseEther('0.01'), 0] // 0.01 ETC for LICENSE, free for TEMP
        );
        
        const contentHash = uploadResult.contentHash;
        console.log('   Content Hash:', contentHash);
        console.log('   File Hash:', ethers.hexlify(fileHash));
        console.log('');
        
        // 4. Test owner lookup by file hash (v3 key feature)
        console.log('4️⃣ Testing owner lookup by file hash...');
        const owner = await api.getOwnerByFileHash(ethers.hexlify(fileHash));
        console.log('   Owner from file hash:', owner);
        console.log('   Matches user:', owner.toLowerCase() === userAddress.toLowerCase());
        console.log('');
        
        // 5. Set download limits (v3 requires userAddress)
        console.log('5️⃣ Setting download limits...');
        await api.setMaxDownloads(userAddress, contentHash, 5); // Max 5 downloads for FREE_TEMP users
        console.log('   ✅ Download limit set to 5\n');
        
        // 6. Get content info
        console.log('6️⃣ Getting content information...');
        const contentInfo = await api.getContentInfo(contentHash);
        console.log('   Owner:', contentInfo.owner);
        console.log('   Size:', contentInfo.size === 'N/A' ? 'N/A' : Number(contentInfo.size), 'bytes');
        console.log('   Upload Date:', contentInfo.uploadDate);
        console.log('   Access Types:', contentInfo.accessTypes.map(t => Object.keys(AccessType)[t]).join(', '));
        console.log('   Prices:', Object.entries(contentInfo.prices).map(([k,v]) => `${Object.keys(AccessType)[k]}: ${v} ETC`).join(', '));
        console.log('');
        
        // 7. Create a folder (v3 requires userAddress)
        console.log('7️⃣ Creating a folder...');
        const folderResult = await api.createFolder(
            userAddress, // v3: userAddress parameter required
            'My Digital Assets',
            FolderType.INDIVIDUAL,
            0,
            0,
            true
        );
        console.log('   Folder ID:', folderResult.folderId);
        console.log('');
        
        // 8. Add content to folder (v3 requires userAddress)
        console.log('8️⃣ Adding content to folder...');
        await api.addContentToFolder(userAddress, contentHash, folderResult.folderId);
        console.log('   ✅ Content added to folder\n');
        
        // 9. Check download stats
        console.log('9️⃣ Checking download statistics...');
        const stats = await api.getDownloadStats(contentHash, userAddress);
        console.log('   Total Downloads:', stats.totalDownloads);
        console.log('   Max Downloads:', stats.maxDownloads);
        console.log('   Remaining:', stats.remainingDownloads);
        console.log('');
        
        // 10. Get user's content collection
        console.log('🔟 Getting user content collection...');
        const userContents = await api.getUserContents(userAddress);
        console.log('   Total content items:', userContents.length);
        const userFolders = await api.getUserFolders(userAddress);
        console.log('   Total folders:', userFolders.length);
        console.log('');
        
        console.log('✅ Basic usage example completed!');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// Run the example
if (require.main === module) {
    main().catch(console.error);
}