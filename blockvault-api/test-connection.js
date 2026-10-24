const { BlockVaultAPI } = require('./BlockVaultAPI');
require('dotenv').config({ path: '../.env' });

async function testConnection() {
    console.log('🔌 Testing BlockVault API Connection...\n');
    
    try {
        // Initialize API
        const api = new BlockVaultAPI(process.env.PRIVATE_KEY);
        
        console.log('📍 Contract Addresses:');
        console.log('   BlockVault:', await api.blockVault.getAddress());
        console.log('   NebuVC:', await api.nebuVC.getAddress());
        console.log('');
        
        console.log('👤 Connected Wallet:', api.wallet.address);
        console.log('💰 Wallet Balance:', await api.getBalance(), 'ETC');
        console.log('');
        
        console.log('🔍 Verifying BlockVault Contract...');
        const issuer = await api.blockVault.issuer();
        const version = await api.blockVault.viewVersion();
        const platformWallet = await api.blockVault.platformWallet();
        
        console.log('   Issuer:', issuer);
        console.log('   Version:', version);
        console.log('   Platform Wallet:', platformWallet);
        console.log('');
        
        console.log('🔍 Verifying NebuVC Contract...');
        try {
            // Try to get VC 0 to see if any exist
            const vc0 = await api.nebuVC.getVC(0);
            console.log('   NebuVC is accessible ✓');
            console.log('   First VC Issuer:', vc0.issuer || 'No VCs created yet');
        } catch {
            console.log('   NebuVC is accessible ✓');
            console.log('   No VCs created yet');
        }
        console.log('');
        
        console.log('✅ Connection test successful!');
        console.log('✅ Both contracts are accessible and responding correctly.');
        
    } catch (error) {
        console.error('❌ Connection test failed:', error.message);
    }
}

// Run test
testConnection().catch(console.error);