const { BlockVaultAPI, AccessType, FolderType } = require('../BlockVaultAPI');
const { ethers } = require('ethers');
require('dotenv').config({ path: '../../.env' });

async function main() {
    // Initialize API
    const api = new BlockVaultAPI(process.env.PRIVATE_KEY);
    const ownerAddress = api.wallet.address;
    
    console.log('🚀 BlockVault v3 API Example - Advanced Features\n');
    console.log('📋 Contract:', await api.blockVault.getAddress());
    console.log('');
    
    try {
        // Setup users for testing
        const heirWallet = ethers.Wallet.createRandom();
        const managerWallet = ethers.Wallet.createRandom();
        const subscriberWallet = ethers.Wallet.createRandom();
        
        console.log('👥 Test Users:');
        console.log('   Owner:', ownerAddress);
        console.log('   Heir:', heirWallet.address);
        console.log('   Manager:', managerWallet.address);
        console.log('   Subscriber:', subscriberWallet.address);
        console.log('');
        
        // Register owner if needed
        const isRegistered = await api.isUserRegistered(ownerAddress);
        if (!isRegistered) {
            await api.registerUser(ownerAddress);
            console.log('   ✅ Owner registered');
        }
        
        // 1. Upload premium content (v3 requires userAddress)
        console.log('1️⃣ Uploading premium content with multiple access types...');
        const fileHash = ethers.randomBytes(32);
        const uploadResult = await api.uploadContent(
            ownerAddress, // v3: userAddress parameter
            fileHash,
            5000000, // 5MB
            [AccessType.TRANSFER, AccessType.LICENSE, AccessType.SUBSCRIPTION, AccessType.FREE_TEMP],
            [
                ethers.parseEther('1'),    // 1 ETC for TRANSFER
                ethers.parseEther('0.1'),  // 0.1 ETC for LICENSE
                ethers.parseEther('0.05'), // 0.05 ETC for SUBSCRIPTION
                0                          // Free for TEMP
            ],
            JSON.stringify({
                title: 'Premium Digital Asset',
                description: 'Advanced features demo content',
                version: '1.0'
            })
        );
        
        const contentHash = uploadResult.contentHash;
        console.log('   Content Hash:', contentHash);
        console.log('   File Hash:', ethers.hexlify(fileHash));
        console.log('');
        
        // 2. Test owner lookup by file hash (v3 key feature)
        console.log('2️⃣ Testing owner lookup by file hash...');
        const owner = await api.getOwnerByFileHash(ethers.hexlify(fileHash));
        console.log('   Owner from file hash:', owner);
        console.log('   Matches owner:', owner.toLowerCase() === ownerAddress.toLowerCase() ? '✅ Correct' : '❌ Incorrect');
        console.log('');
        
        // 3. Inheritance features (v3 requires contentOwner)
        console.log('3️⃣ Setting up inheritance...');
        await api.designateHeir(ownerAddress, contentHash, heirWallet.address);
        console.log('   ✅ Heir designated:', heirWallet.address);
        console.log('');
        
        // 4. Management features (v3 requires contentOwner)
        console.log('4️⃣ Adding content manager...');
        await api.addContentManager(ownerAddress, contentHash, managerWallet.address);
        console.log('   ✅ Manager added:', managerWallet.address);
        
        // Get managers list
        const managers = await api.getContentManagers(contentHash);
        console.log('   📋 Total managers:', managers.length);
        console.log('');
        
        // 5. Update prices (v3 requires contentOwner)
        console.log('5️⃣ Updating content prices...');
        await api.updateContentPrices(
            ownerAddress, // v3: contentOwner parameter
            contentHash,
            [AccessType.LICENSE, AccessType.SUBSCRIPTION],
            [ethers.parseEther('0.15'), ethers.parseEther('0.07')]
        );
        console.log('   ✅ Prices updated');
        console.log('');
        
        // 6. Create subscription folder (v3 requires userAddress)
        console.log('6️⃣ Creating subscription-based folder...');
        const folderResult = await api.createFolder(
            ownerAddress, // v3: userAddress parameter
            'Premium Course Materials',
            FolderType.SUBSCRIPTION,
            ethers.parseEther('0.2'), // 0.2 ETC per month
            30 * 24 * 60 * 60,        // 30 days
            true // isPublic
        );
        console.log('   Folder ID:', folderResult.folderId);
        console.log('   Type: SUBSCRIPTION');
        console.log('   Price: 0.2 ETC/month');
        console.log('');
        
        // 7. Add content to folder (v3 requires userAddress)
        console.log('7️⃣ Adding content to subscription folder...');
        await api.addContentToFolder(ownerAddress, contentHash, folderResult.folderId);
        console.log('   ✅ Content added to folder');
        console.log('');
        
        // 8. Download limits for free users (v3 requires userAddress)
        console.log('8️⃣ Setting download limits for free access...');
        await api.setMaxDownloads(ownerAddress, contentHash, 3); // Only 3 downloads for FREE_TEMP
        console.log('   ✅ Max downloads set to 3 for FREE_TEMP users');
        console.log('');
        
        // 9. Grant temporary access
        console.log('9️⃣ Granting temporary access...');
        await api.grantTemporaryAccess(
            subscriberWallet.address,
            contentHash,
            7 * 24 * 60 * 60 // 7 days
        );
        console.log('   ✅ Temporary access granted for 7 days');
        console.log('');
        
        // 10. Check access validation
        console.log('🔟 Validating access...');
        const hasAccess = await api.hasValidAccess(subscriberWallet.address, contentHash);
        console.log('   Subscriber has access:', hasAccess ? '✅ YES' : '❌ NO');
        console.log('');
        
        // 11. Create share link (v3 requires userAddress)
        console.log('1️⃣1️⃣ Creating share link...');
        const shareLink = await api.createShareLink(
            ownerAddress,
            contentHash,
            604800, // 7 days
            5,      // 5 uses max
            AccessType.FREE_TEMP
        );
        console.log('   ✅ Share link created:', shareLink.linkId);
        
        const linkInfo = await api.getShareLinkInfo(shareLink.linkId);
        console.log('   📊 Expires:', linkInfo.expirationDate.toLocaleDateString());
        console.log('   📊 Remaining uses:', linkInfo.remainingUses);
        console.log('');
        
        // 12. Check if content can be deleted
        console.log('1️⃣2️⃣ Checking deletion eligibility...');
        const deleteCheck = await api.canDeleteContent(contentHash);
        console.log('   Can delete:', deleteCheck.canDelete ? '✅ YES' : '❌ NO');
        if (!deleteCheck.canDelete) {
            console.log('   Reason:', deleteCheck.reason);
        }
        console.log('');
        
        // 13. Content analytics
        console.log('1️⃣3️⃣ Content analytics...');
        const contentInfo = await api.getContentInfo(contentHash);
        const downloadStats = await api.getDownloadStats(contentHash, ownerAddress);
        
        console.log('   📈 Content Information:');
        console.log('   - Owner:', contentInfo.owner);
        console.log('   - Size:', contentInfo.size === 'N/A' ? 'N/A' : Number(contentInfo.size), 'bytes');
        console.log('   - Access Types:', contentInfo.accessTypes.length);
        console.log('   - Downloads:', downloadStats.totalDownloads);
        console.log('   - Max Downloads:', downloadStats.maxDownloads);
        console.log('');
        
        // 14. Remove manager (v3 requires contentOwner)
        console.log('1️⃣4️⃣ Removing content manager...');
        await api.removeContentManager(ownerAddress, contentHash, managerWallet.address);
        console.log('   ✅ Manager removed');
        console.log('');
        
        console.log('✅ Advanced features example completed!');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// Run the example
if (require.main === module) {
    main().catch(console.error);
}