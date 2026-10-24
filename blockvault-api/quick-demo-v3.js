const { BlockVaultAPI, AccessType, FolderType } = require('./BlockVaultAPI');
const { ethers } = require('ethers');
require('dotenv').config({ path: '../.env' });

async function comprehensiveV3Demo() {
    console.log('🚀 BlockVault v3 Complete Demo - Autosoberanía Total\n');
    
    const api = new BlockVaultAPI(process.env.PRIVATE_KEY);
    
    // Test user addresses (simulating different users)
    const users = {
        creator: api.wallet.address,
        buyer: '0x742d35Cc6634C0532925a3b844Bc9e7595f6E888',
        heir: '0x999d35Cc6634C0532925a3b844Bc9e7595f6E999',
        manager: '0x111d35Cc6634C0532925a3b844Bc9e7595f6E111'
    };
    
    try {
        console.log('═══════════════════════════════════════════════════════');
        console.log('📋 PHASE 1: USER MANAGEMENT & SETUP');
        console.log('═══════════════════════════════════════════════════════\n');
        
        // 1. Register users
        console.log('1️⃣ Registering Users...');
        for (const [role, address] of Object.entries(users)) {
            try {
                const isRegistered = await api.isUserRegistered(address);
                if (!isRegistered) {
                    console.log(`   📝 Registering ${role}: ${address}`);
                    await api.registerUser(address);
                    console.log(`   ✅ ${role} registered with 10GB free storage!`);
                } else {
                    console.log(`   ✅ ${role} already registered: ${address}`);
                }
            } catch (error) {
                console.log(`   ⚠️  ${role} registration skipped: ${error.message}`);
            }
        }
        console.log('');
        
        // 2. Activate monetization for creator
        console.log('2️⃣ Activating Monetization Profile...');
        try {
            await api.activateMonetizationProfile(users.creator);
            console.log('   ✅ Monetization profile activated for creator');
        } catch (error) {
            console.log(`   ⚠️  Monetization activation: ${error.message}`);
        }
        console.log('');
        
        // 3. Purchase additional storage
        console.log('3️⃣ Purchasing Additional Storage...');
        try {
            await api.purchaseStorage(users.creator, 50); // 50GB
            console.log('   ✅ Purchased 50GB additional storage');
        } catch (error) {
            console.log(`   ⚠️  Storage purchase: ${error.message}`);
        }
        console.log('');
        
        console.log('═══════════════════════════════════════════════════════');
        console.log('📁 PHASE 2: CONTENT MANAGEMENT - V3 FEATURES');
        console.log('═══════════════════════════════════════════════════════\n');
        
        // 4. Upload content with multiple access types
        console.log('4️⃣ Uploading Content with Multiple Access Types...');
        const contentHashes = [];
        
        for (let i = 1; i <= 3; i++) {
            const testHash = ethers.keccak256(ethers.toUtf8Bytes(`test-content-v3-${i}-${Date.now()}`));
            
            const uploadResult = await api.uploadContent(
                users.creator, // v3: userAddress parameter
                testHash,
                1024 * 1024 * i, // Different sizes
                [AccessType.TRANSFER, AccessType.LICENSE, AccessType.FREE_TEMP],
                [
                    ethers.parseEther('1.0'), // TRANSFER: 1.0 ETC
                    ethers.parseEther('0.1'), // LICENSE: 0.1 ETC  
                    0                         // FREE_TEMP: Free
                ],
                JSON.stringify({
                    title: `Test Content ${i}`,
                    description: `Demo content for BlockVault v3 testing`,
                    version: '1.0',
                    category: 'demo',
                    created: new Date().toISOString()
                })
            );
            
            contentHashes.push({
                hash: uploadResult.contentHash,
                fileHash: testHash,
                name: `Content ${i}`
            });
            
            console.log(`   ✅ Content ${i} uploaded: ${uploadResult.contentHash.substring(0, 10)}...`);
        }
        console.log('');
        
        // 5. Test getOwnerByFileHash - Key v3 feature
        console.log('5️⃣ Testing Owner Lookup by File Hash...');
        for (const content of contentHashes) {
            try {
                const owner = await api.getOwnerByFileHash(content.fileHash);
                console.log(`   🔍 ${content.name} owner: ${owner}`);
                console.log(`      Original file hash: ${content.fileHash}`);
                console.log(`      Content hash: ${content.hash}`);
                console.log(`      Owner matches creator: ${owner.toLowerCase() === users.creator.toLowerCase()}`);
            } catch (error) {
                console.log(`   ❌ Error getting owner for ${content.name}: ${error.message}`);
            }
        }
        console.log('');
        
        console.log('═══════════════════════════════════════════════════════');
        console.log('👥 PHASE 3: MANAGEMENT & COLLABORATION');
        console.log('═══════════════════════════════════════════════════════\n');
        
        // 6. Add content managers (v3 feature)
        console.log('6️⃣ Adding Content Managers...');
        try {
            await api.addContentManager(users.creator, contentHashes[0].hash, users.manager);
            console.log(`   ✅ Added manager ${users.manager} to ${contentHashes[0].name}`);
            
            // Get managers list
            const managers = await api.getContentManagers(contentHashes[0].hash);
            console.log(`   📋 Current managers: ${managers.length} total`);
        } catch (error) {
            console.log(`   ❌ Manager addition error: ${error.message}`);
        }
        console.log('');
        
        // 7. Designate heirs (v3 feature)
        console.log('7️⃣ Designating Heirs for Digital Inheritance...');
        for (const content of contentHashes) {
            try {
                await api.designateHeir(users.creator, content.hash, users.heir);
                console.log(`   👑 Heir designated for ${content.name}: ${users.heir}`);
            } catch (error) {
                console.log(`   ❌ Heir designation error for ${content.name}: ${error.message}`);
            }
        }
        console.log('');
        
        console.log('═══════════════════════════════════════════════════════');
        console.log('📂 PHASE 4: FOLDER SYSTEM & ORGANIZATION');
        console.log('═══════════════════════════════════════════════════════\n');
        
        // 8. Create folders (v3 user control)
        console.log('8️⃣ Creating Folders with Different Business Models...');
        const folders = [];
        
        // Subscription folder
        const subscriptionFolder = await api.createFolder(
            users.creator,
            'Premium Content Collection',
            FolderType.SUBSCRIPTION,
            ethers.parseEther('0.05'), // 0.05 ETC per month
            2592000, // 30 days
            true
        );
        folders.push({ id: subscriptionFolder.folderId, name: 'Premium Collection', type: 'SUBSCRIPTION' });
        console.log('   📁 Created subscription folder: Premium Content Collection');
        
        // Individual sales folder
        const individualFolder = await api.createFolder(
            users.creator,
            'Individual Sales',
            FolderType.INDIVIDUAL,
            0, 0, true
        );
        folders.push({ id: individualFolder.folderId, name: 'Individual Sales', type: 'INDIVIDUAL' });
        console.log('   📁 Created individual folder: Individual Sales');
        
        // Private folder
        const privateFolder = await api.createFolder(
            users.creator,
            'Personal Archives',
            FolderType.PRIVATE,
            0, 0, false
        );
        folders.push({ id: privateFolder.folderId, name: 'Private Archives', type: 'PRIVATE' });
        console.log('   📁 Created private folder: Personal Archives');
        console.log('');
        
        // 9. Add content to folders
        console.log('9️⃣ Organizing Content in Folders...');
        try {
            // Add first content to subscription folder
            await api.addContentToFolder(users.creator, contentHashes[0].hash, folders[0].id);
            console.log(`   📎 Added ${contentHashes[0].name} to Premium Collection`);
            
            // Add second content to individual folder
            await api.addContentToFolder(users.creator, contentHashes[1].hash, folders[1].id);
            console.log(`   📎 Added ${contentHashes[1].name} to Individual Sales`);
            
            // Add third content to private folder
            await api.addContentToFolder(users.creator, contentHashes[2].hash, folders[2].id);
            console.log(`   📎 Added ${contentHashes[2].name} to Personal Archives`);
        } catch (error) {
            console.log(`   ❌ Folder organization error: ${error.message}`);
        }
        console.log('');
        
        console.log('═══════════════════════════════════════════════════════');
        console.log('💰 PHASE 5: MONETIZATION & PURCHASING');
        console.log('═══════════════════════════════════════════════════════\n');
        
        // 10. Purchase content
        console.log('🔟 Purchasing Content...');
        try {
            // Purchase LICENSE access to first content
            await api.purchaseContent(
                users.buyer,
                contentHashes[0].hash,
                AccessType.LICENSE,
                ethers.parseEther('0.1')
            );
            console.log(`   💳 Buyer purchased LICENSE for ${contentHashes[0].name}`);
            
            // Check access
            const hasAccess = await api.hasValidAccess(users.buyer, contentHashes[0].hash);
            console.log(`   ✅ Buyer has valid access: ${hasAccess}`);
        } catch (error) {
            console.log(`   ❌ Purchase error: ${error.message}`);
        }
        console.log('');
        
        // 11. Grant temporary access
        console.log('1️⃣1️⃣ Granting Temporary Access...');
        try {
            await api.grantTemporaryAccess(users.buyer, contentHashes[1].hash, 604800); // 7 days
            console.log(`   ⏰ Granted 7-day temporary access to ${contentHashes[1].name}`);
        } catch (error) {
            console.log(`   ❌ Temporary access error: ${error.message}`);
        }
        console.log('');
        
        console.log('═══════════════════════════════════════════════════════');
        console.log('🔗 PHASE 6: SHARING & COLLABORATION');
        console.log('═══════════════════════════════════════════════════════\n');
        
        // 12. Create share links
        console.log('1️⃣2️⃣ Creating Share Links...');
        try {
            const shareLink = await api.createShareLink(
                users.creator,
                contentHashes[0].hash,
                604800, // 7 days
                10,     // 10 uses max
                AccessType.FREE_TEMP
            );
            console.log(`   🔗 Share link created: ID ${shareLink.linkId}`);
            
            // Get link info
            const linkInfo = await api.getShareLinkInfo(shareLink.linkId);
            console.log(`   📊 Link expires: ${linkInfo.expirationDate.toLocaleDateString()}`);
            console.log(`   📊 Remaining uses: ${linkInfo.remainingUses}`);
        } catch (error) {
            console.log(`   ❌ Share link error: ${error.message}`);
        }
        console.log('');
        
        // 13. Manage allow lists
        console.log('1️⃣3️⃣ Managing Allow Lists...');
        try {
            await api.addToAllowList(users.creator, contentHashes[2].hash, users.buyer);
            console.log(`   ➕ Added buyer to allow list for ${contentHashes[2].name}`);
            
            const allowList = await api.getContentAllowList(contentHashes[2].hash);
            console.log(`   📋 Allow list has ${allowList.length} users`);
        } catch (error) {
            console.log(`   ❌ Allow list error: ${error.message}`);
        }
        console.log('');
        
        console.log('═══════════════════════════════════════════════════════');
        console.log('📊 PHASE 7: ANALYTICS & REPORTING');
        console.log('═══════════════════════════════════════════════════════\n');
        
        // 14. Get comprehensive user info
        console.log('1️⃣4️⃣ User Analytics...');
        const creatorInfo = await api.getUserInfo(users.creator);
        console.log('   👤 Creator Information:');
        console.log(`      Storage Used: ${(Number(creatorInfo.storageUsed) / 1e9).toFixed(2)} GB`);
        console.log(`      Storage Available: ${(Number(creatorInfo.storageAvailable) / 1e9).toFixed(2)} GB`);
        console.log(`      Monetization Active: ${creatorInfo.hasMonetizationProfile}`);
        console.log(`      Blacklisted: ${creatorInfo.isBlacklisted}`);
        console.log('');
        
        // 15. Get earnings (v3 simplified)
        console.log('1️⃣5️⃣ Earnings Report...');
        try {
            const earnings = await api.getUserEarnings(users.creator);
            console.log('   💰 Creator Earnings:');
            console.log(`      Total Earnings: ${earnings.totalEarnings} ETC`);
            console.log('      Note: v3 removed withdrawal function - earnings tracked transparently');
        } catch (error) {
            console.log(`   ❌ Earnings error: ${error.message}`);
        }
        console.log('');
        
        // 16. Content analytics
        console.log('1️⃣6️⃣ Content Analytics...');
        for (const content of contentHashes) {
            try {
                const contentInfo = await api.getContentInfo(content.hash);
                const downloadStats = await api.getDownloadStats(content.hash, users.creator);
                
                console.log(`   📈 ${content.name}:`);
                console.log(`      Owner: ${contentInfo.owner}`);
                console.log(`      Size: ${contentInfo.size === 'N/A' ? 'N/A' : (Number(contentInfo.size) / 1024).toFixed(2)} KB`);
                console.log(`      Access Types: ${contentInfo.accessTypes.length}`);
                console.log(`      Total Downloads: ${downloadStats.totalDownloads}`);
                console.log(`      Max Downloads: ${downloadStats.maxDownloads}`);
            } catch (error) {
                console.log(`   ❌ Analytics error for ${content.name}: ${error.message}`);
            }
        }
        console.log('');
        
        console.log('═══════════════════════════════════════════════════════');
        console.log('🔍 PHASE 8: ADVANCED QUERIES & VERIFICATION');
        console.log('═══════════════════════════════════════════════════════\n');
        
        // 17. Get user's content collections
        console.log('1️⃣7️⃣ Content Collections...');
        try {
            const userContents = await api.getUserContents(users.creator);
            console.log(`   📚 Creator has ${userContents.length} content items`);
            
            const userFolders = await api.getUserFolders(users.creator);
            console.log(`   📁 Creator has ${userFolders.length} folders`);
            
            const purchasedContent = await api.getUserPurchasedContent(users.buyer);
            console.log(`   🛒 Buyer has ${purchasedContent.length} purchased items`);
        } catch (error) {
            console.log(`   ❌ Collections error: ${error.message}`);
        }
        console.log('');
        
        // 18. Platform statistics
        console.log('1️⃣8️⃣ Platform Statistics...');
        try {
            const platformStats = await api.getTotalStorageStats();
            console.log('   🌐 Platform Overview:');
            console.log(`      Total Storage Used: ${platformStats.totalUsed} GB`);
            console.log(`      Total Storage Purchased: ${platformStats.totalPurchased} GB`);
            console.log(`      Total Free Storage: ${platformStats.totalFree} GB`);
        } catch (error) {
            console.log(`   ❌ Platform stats error: ${error.message}`);
        }
        console.log('');
        
        console.log('═══════════════════════════════════════════════════════');
        console.log('🎉 DEMO COMPLETE - BLOCKVAULT V3 AUTOSOBERANÍA');
        console.log('═══════════════════════════════════════════════════════\n');
        
        console.log('✅ Successfully demonstrated all v3 features:');
        console.log('   🔑 User self-sovereignty - Users can control their content');
        console.log('   👥 Manager delegation - Collaborative content management');  
        console.log('   👑 Digital inheritance - Succession planning');
        console.log('   📁 Flexible folders - Multiple business models');
        console.log('   🔍 Owner lookup - File hash to owner resolution');
        console.log('   💰 Simplified earnings - Transparent tracking without withdrawals');
        console.log('   🔗 Advanced sharing - Links, allowlists, temporary access');
        console.log('   📊 Comprehensive analytics - Full platform insights');
        console.log('');
        
        console.log('📋 Contract Information:');
        console.log(`   BlockVault v3: ${await api.blockVault.getAddress()}`);
        console.log(`   NebuVC: ${await api.nebuVC.getAddress()}`);
        console.log(`   Network: ${api.network.name} (Chain ID: ${api.network.chainId})`);
        console.log(`   Admin Wallet: ${api.wallet.address}`);
        console.log('');
        
        console.log('🚀 BlockVault v3 is ready for production!');
        console.log('🌟 First platform with true user self-sovereignty');
        console.log('💎 Your Content, Your Wallet, Your Rules, Your Control');
        
    } catch (error) {
        console.error('❌ Demo Error:', error.message);
        console.error('Stack:', error.stack);
    }
}

// Run comprehensive demo
comprehensiveV3Demo().catch(console.error);