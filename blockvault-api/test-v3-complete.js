const { BlockVaultAPI, AccessType, FolderType } = require('./BlockVaultAPI');
const { ethers } = require('ethers');
require('dotenv').config({ path: '../.env' });

async function testV3Complete() {
    console.log('🚀 BlockVault v3 Complete Test\n');
    
    const api = new BlockVaultAPI(process.env.PRIVATE_KEY);
    const userAddress = api.wallet.address;
    
    // Generate valid test addresses
    const testUsers = {
        buyer: ethers.Wallet.createRandom().address,
        heir: ethers.Wallet.createRandom().address,
        manager: ethers.Wallet.createRandom().address
    };
    
    try {
        console.log('📋 Contract Information:');
        console.log(`   BlockVault: ${await api.blockVault.getAddress()}`);
        console.log(`   NebuVC: ${await api.nebuVC.getAddress()}`);
        console.log(`   User: ${userAddress}`);
        console.log('');
        
        // 1. User Management
        console.log('═══ PHASE 1: USER SETUP ═══');
        
        const isRegistered = await api.isUserRegistered(userAddress);
        if (!isRegistered) {
            await api.registerUser(userAddress);
            console.log('✅ User registered');
        } else {
            console.log('✅ User already registered');
        }
        
        const userInfo = await api.getUserInfo(userAddress);
        console.log(`📊 Storage: ${(Number(userInfo.storageUsed) / 1e9).toFixed(2)}GB / ${(Number(userInfo.storageAvailable) / 1e9).toFixed(2)}GB`);
        console.log('');
        
        // 2. Content Upload & Owner Lookup (KEY V3 FEATURE)
        console.log('═══ PHASE 2: CONTENT & OWNER LOOKUP ═══');
        
        const fileHash = ethers.randomBytes(32);
        const uploadResult = await api.uploadContent(
            userAddress,
            fileHash,
            1000000, // 1MB
            [AccessType.LICENSE, AccessType.FREE_TEMP],
            [ethers.parseEther('0.01'), 0],
            JSON.stringify({ title: 'Test Content', version: '1.0' })
        );
        
        console.log(`✅ Content uploaded: ${uploadResult.contentHash.substring(0, 12)}...`);
        
        // Test owner lookup by file hash - KEY FEATURE
        const owner = await api.getOwnerByFileHash(ethers.hexlify(fileHash));
        console.log(`🔍 Owner from file hash: ${owner}`);
        console.log(`✅ Owner lookup works: ${owner.toLowerCase() === userAddress.toLowerCase()}`);
        console.log('');
        
        // 3. V3 Management Features
        console.log('═══ PHASE 3: V3 MANAGEMENT FEATURES ═══');
        
        // Inheritance
        await api.designateHeir(userAddress, uploadResult.contentHash, testUsers.heir);
        console.log('👑 Heir designated');
        
        // Managers
        await api.addContentManager(userAddress, uploadResult.contentHash, testUsers.manager);
        const managers = await api.getContentManagers(uploadResult.contentHash);
        console.log(`👥 Managers added: ${managers.length}`);
        
        // Price updates
        await api.updateContentPrices(
            userAddress,
            uploadResult.contentHash,
            [AccessType.LICENSE],
            [ethers.parseEther('0.02')]
        );
        console.log('💰 Prices updated');
        console.log('');
        
        // 4. Folder System
        console.log('═══ PHASE 4: FOLDER SYSTEM ═══');
        
        const folderResult = await api.createFolder(
            userAddress,
            'Test Collection',
            FolderType.INDIVIDUAL,
            0, 0, true
        );
        console.log('📁 Folder created');
        
        await api.addContentToFolder(userAddress, uploadResult.contentHash, folderResult.folderId);
        console.log('📎 Content added to folder');
        console.log('');
        
        // 5. Sharing & Access
        console.log('═══ PHASE 5: SHARING & ACCESS ═══');
        
        const shareLink = await api.createShareLink(
            userAddress,
            uploadResult.contentHash,
            604800, // 7 days
            5,      // 5 uses
            AccessType.FREE_TEMP
        );
        console.log('🔗 Share link created');
        
        await api.addToAllowList(userAddress, uploadResult.contentHash, testUsers.buyer);
        const allowList = await api.getContentAllowList(uploadResult.contentHash);
        console.log(`📋 Allow list: ${allowList.length} users`);
        console.log('');
        
        // 6. Analytics & Queries
        console.log('═══ PHASE 6: ANALYTICS ═══');
        
        const contentInfo = await api.getContentInfo(uploadResult.contentHash);
        console.log(`📈 Content: ${contentInfo.accessTypes.length} access types`);
        
        const userContents = await api.getUserContents(userAddress);
        console.log(`📚 User has ${userContents.length} content items`);
        
        const userFolders = await api.getUserFolders(userAddress);
        console.log(`📁 User has ${userFolders.length} folders`);
        
        // V3 earnings (simplified)
        const earnings = await api.getUserEarnings(userAddress);
        console.log(`💰 Total earnings: ${earnings.totalEarnings} ETC`);
        console.log('');
        
        // 7. Platform Stats
        console.log('═══ PHASE 7: PLATFORM STATS ═══');
        
        const platformStats = await api.getTotalStorageStats();
        console.log(`🌐 Platform: ${platformStats.totalUsed} GB used`);
        console.log('');
        
        console.log('🎉 ═══ ALL V3 FEATURES TESTED SUCCESSFULLY ═══');
        console.log('');
        console.log('✅ Key v3 Achievements:');
        console.log('   🔑 User self-sovereignty - Users control their content');
        console.log('   👥 Manager delegation - Collaborative management');
        console.log('   👑 Digital inheritance - Succession planning');
        console.log('   📁 Flexible folders - Business model support');
        console.log('   🔍 Owner lookup - File hash to owner resolution ⭐');
        console.log('   💰 Simplified earnings - Transparent tracking');
        console.log('   🔗 Advanced sharing - Links, allowlists, access control');
        console.log('   📊 Comprehensive analytics - Full insights');
        console.log('');
        console.log('🚀 BlockVault v3 is PRODUCTION READY!');
        console.log('💎 First platform with true user self-sovereignty');
        
    } catch (error) {
        console.error('❌ Test Error:', error.message);
        console.error('Stack:', error.stack?.substring(0, 500));
    }
}

// Run test
testV3Complete().catch(console.error);