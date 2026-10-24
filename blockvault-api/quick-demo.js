const { BlockVaultAPI, AccessType } = require('./BlockVaultAPI');
const { ethers } = require('ethers');
require('dotenv').config({ path: '../.env' });

async function quickDemo() {
    console.log('🚀 BlockVault Quick Demo\n');
    
    const api = new BlockVaultAPI(process.env.PRIVATE_KEY);
    
    try {
        // 1. Register user if needed
        console.log('1️⃣ Checking user registration...');
        const isRegistered = await api.isUserRegistered();
        
        if (!isRegistered) {
            console.log('   Registering new user...');
            await api.registerUser();
            console.log('   ✅ User registered with 5GB free storage!\n');
        } else {
            console.log('   ✅ User already registered\n');
        }
        
        // 2. Get user info
        console.log('2️⃣ User Information:');
        const userInfo = await api.getUserInfo();
        console.log(`   Storage: ${(userInfo.storageUsed / 1e9).toFixed(2)}GB used of ${(userInfo.storageAvailable / 1e9).toFixed(2)}GB available`);
        console.log(`   Monetization: ${userInfo.hasMonetizationProfile ? 'Active' : 'Inactive'}`);
        console.log('');
        
        // 3. Upload test content
        console.log('3️⃣ Uploading test content...');
        const testHash = ethers.keccak256(ethers.toUtf8Bytes(`test-content-${Date.now()}`));
        
        const uploadResult = await api.uploadContent(
            testHash,
            1024 * 1024, // 1MB
            [AccessType.LICENSE, AccessType.FREE_TEMP],
            [ethers.parseEther('0.001'), 0] // 0.001 ETC for LICENSE
        );
        
        console.log('   ✅ Content uploaded!');
        console.log('   Content Hash:', uploadResult.contentHash);
        console.log('');
        
        // 4. Set download limit
        console.log('4️⃣ Setting download limit for free users...');
        await api.setMaxDownloads(uploadResult.contentHash, 3);
        console.log('   ✅ Max downloads set to 3 for FREE_TEMP users\n');
        
        // 5. Get content info
        console.log('5️⃣ Content Information:');
        const contentInfo = await api.getContentInfo(uploadResult.contentHash);
        console.log('   Size:', contentInfo.size === 'N/A' ? 'N/A' : (Number(contentInfo.size) / 1024).toFixed(2) + ' KB');
        console.log('   Access Types:', contentInfo.accessTypes.map(t => Object.keys(AccessType)[t]).join(', '));
        console.log('   Prices:', Object.entries(contentInfo.prices).map(([k,v]) => `${Object.keys(AccessType)[k]}: ${v} ETC`).join(', '));
        console.log('');
        
        console.log('✅ Demo completed successfully!');
        console.log('\n📊 Summary:');
        console.log('   - BlockVault:', await api.blockVault.getAddress());
        console.log('   - NebuVC:', await api.nebuVC.getAddress());
        console.log('   - Your Address:', api.wallet.address);
        console.log('   - Content Uploaded:', uploadResult.contentHash);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// Run demo
quickDemo().catch(console.error);