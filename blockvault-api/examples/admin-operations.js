const { BlockVaultAPI, AccessType, FolderType } = require('../BlockVaultAPI');
const { ethers } = require('ethers');
require('dotenv').config();

async function main() {
    // Initialize API with admin private key
    const api = new BlockVaultAPI(process.env.PRIVATE_KEY);
    
    console.log('🔧 BlockVault Admin Operations Example');
    console.log('=====================================\n');
    
    // Example user addresses (these would come from your platform's user database)
    const user1 = '0x1234567890123456789012345678901234567890';
    const user2 = '0x0987654321098765432109876543210987654321';
    
    try {
        // 1. Register users
        console.log('1️⃣ Registering users...');
        await api.registerUser(user1);
        console.log(`   ✅ User 1 registered: ${user1}`);
        
        await api.registerUser(user2);
        console.log(`   ✅ User 2 registered: ${user2}\n`);
        
        // 2. Purchase storage for users
        console.log('2️⃣ Purchasing storage...');
        await api.purchaseStorage(user1, 20); // 20GB for user1
        console.log(`   ✅ Purchased 20GB for user1`);
        
        await api.purchaseStorage(user2, 10); // 10GB for user2
        console.log(`   ✅ Purchased 10GB for user2\n`);
        
        // 3. Activate monetization for user1
        console.log('3️⃣ Activating monetization...');
        await api.activateMonetizationProfile(user1);
        console.log(`   ✅ Monetization activated for user1\n`);
        
        // 4. Upload content for user1
        console.log('4️⃣ Uploading content...');
        const fileHash = ethers.keccak256(ethers.toUtf8Bytes('example-file-content'));
        const uploadResult = await api.uploadContent(
            user1,
            fileHash,
            1000000, // 1MB
            [AccessType.LICENSE, AccessType.FREE_TEMP],
            [ethers.parseEther('0.1'), 0]
        );
        console.log(`   ✅ Content uploaded with hash: ${uploadResult.contentHash}\n`);
        
        // 5. Create a folder for user1
        console.log('5️⃣ Creating folder...');
        const folderResult = await api.createFolder(
            user1,
            'Premium Content',
            FolderType.SUBSCRIPTION,
            ethers.parseEther('0.5'),
            30 * 24 * 60 * 60 // 30 days
        );
        console.log(`   ✅ Folder created with ID: ${folderResult.folderId}\n`);
        
        // 6. Grant access to user2
        console.log('6️⃣ Granting access...');
        await api.purchaseContent(user2, uploadResult.contentHash, AccessType.LICENSE);
        console.log(`   ✅ License access granted to user2\n`);
        
        // 7. Set download limits
        console.log('7️⃣ Setting download limits...');
        await api.setMaxDownloads(user1, uploadResult.contentHash, 100);
        console.log(`   ✅ Max downloads set to 100\n`);
        
        // 8. Check user info
        console.log('8️⃣ Checking user info...');
        const user1Info = await api.getUserInfo(user1);
        console.log('   User 1 Info:');
        console.log(`   - Registered: ${user1Info.isRegistered}`);
        console.log(`   - Storage Used: ${user1Info.storageUsed} bytes`);
        console.log(`   - Storage Purchased: ${user1Info.storagePurchased} bytes`);
        console.log(`   - Storage Available: ${user1Info.storageAvailable} bytes`);
        console.log(`   - Has Monetization: ${user1Info.hasMonetizationProfile}`);
        
        console.log('\n✅ All operations completed successfully!');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// Run the example
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });