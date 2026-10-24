const { BlockVaultAPI, AccessType } = require('../BlockVaultAPI');
const { ethers } = require('ethers');
require('dotenv').config({ path: '../../.env' });

async function main() {
    // Initialize API
    const api = new BlockVaultAPI(process.env.PRIVATE_KEY);
    
    console.log('🔐 BlockVault API Example - Verifiable Credentials\n');
    
    try {
        // Setup: Create a second user for testing
        const user2Wallet = ethers.Wallet.createRandom();
        const user2API = new BlockVaultAPI(user2Wallet.privateKey);
        
        console.log('📋 Test Setup:');
        console.log('   Main User:', api.wallet.address);
        console.log('   Test User:', user2Wallet.address);
        console.log('');
        
        // 1. Upload content as main user (v3 requires userAddress)
        console.log('1️⃣ Uploading content with LICENSE access...');
        const fileHash = ethers.randomBytes(32);
        const uploadResult = await api.uploadContent(
            api.wallet.address, // v3: userAddress parameter
            fileHash,
            2000000, // 2MB
            [AccessType.LICENSE],
            [ethers.parseEther('0.05')] // 0.05 ETC
        );
        
        const contentHash = uploadResult.contentHash;
        console.log('   Content Hash:', contentHash);
        console.log('');
        
        // 2. Create access data for VC
        console.log('2️⃣ Preparing Verifiable Credential data...');
        const accessData = {
            id: api.generateAccessId(),
            owner: api.wallet.address,
            user: user2Wallet.address,
            contentHash: contentHash,
            accessType: AccessType.LICENSE,
            price: ethers.parseEther('0.05').toString(),
            expirationDate: api.calculateExpirationDate(365) // 1 year
        };
        console.log('   Access ID:', accessData.id);
        console.log('   User:', accessData.user);
        console.log('   Access Type:', 'LICENSE');
        console.log('   Expiration:', new Date(accessData.expirationDate * 1000));
        console.log('');
        
        // 3. User2 must sign their own credential
        console.log('3️⃣ User signing their credential...');
        const signature = await user2API.signAccessData(accessData);
        console.log('   Signature:', signature.substring(0, 20) + '...');
        console.log('');
        
        // 4. Create VC (as platform/content owner)
        console.log('4️⃣ Creating Verifiable Credential...');
        
        // Get serialized data
        const serialized = await api.blockVault.createSerializedBlockVaultAccess(
            accessData.id,
            accessData.owner,
            accessData.user,
            accessData.contentHash,
            accessData.accessType,
            BigInt(accessData.price),
            BigInt(accessData.expirationDate)
        );
        
        // Create VC using user's signature
        const tx = await api.nebuVC.createVC(
            await api.blockVault.getAddress(),
            accessData.user,
            serialized,
            signature,
            BigInt(accessData.expirationDate)
        );
        
        const receipt = await tx.wait();
        
        // Get VC ID from event
        const event = receipt.logs.find(log => {
            try {
                const parsed = api.nebuVC.interface.parseLog(log);
                return parsed.name === 'VCCreated';
            } catch {
                return false;
            }
        });
        
        const vcId = event ? Number(api.nebuVC.interface.parseLog(event).args.id) : 0;
        console.log('   VC ID:', vcId);
        console.log('   ✅ Verifiable Credential created!');
        console.log('');
        
        // 5. Verify credential as owner (user2)
        console.log('5️⃣ Verifying credential as owner...');
        const isValidByOwner = await user2API.nebuVC.verifyByOwner(vcId);
        console.log('   Valid by owner:', isValidByOwner ? '✅ YES' : '❌ NO');
        console.log('');
        
        // 6. Verify credential as issuer (BlockVault)
        console.log('6️⃣ Verifying credential as issuer...');
        const isValidByIssuer = await api.verifyCredential(vcId, false);
        console.log('   Valid by issuer:', isValidByIssuer ? '✅ YES' : '❌ NO');
        console.log('');
        
        // 7. Get credential details
        console.log('7️⃣ Getting credential information...');
        const vcInfo = await api.getCredentialInfo(vcId);
        console.log('   Issuer:', vcInfo.issuer);
        console.log('   Subject:', vcInfo.subject);
        console.log('   Issuance Date:', vcInfo.issuanceDate);
        console.log('   Expiration Date:', vcInfo.expirationDate);
        console.log('   Is Revoked:', vcInfo.isRevoked);
        console.log('   Access Details:');
        console.log('     - Content Hash:', vcInfo.accessData.contentHash);
        console.log('     - Access Type:', Object.keys(AccessType)[vcInfo.accessData.accessType]);
        console.log('     - Price:', vcInfo.accessData.price, 'ETC');
        console.log('');
        
        // 8. Verify signature consistency
        console.log('8️⃣ Verifying signature consistency...');
        const recoveredSigner = await api.recoverSigner(serialized, signature);
        console.log('   Recovered Signer:', recoveredSigner);
        console.log('   Expected Signer:', user2Wallet.address);
        console.log('   Match:', recoveredSigner.toLowerCase() === user2Wallet.address.toLowerCase() ? '✅ YES' : '❌ NO');
        console.log('');
        
        console.log('✅ Verifiable Credentials example completed!');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
    }
}

// Run the example
if (require.main === module) {
    main().catch(console.error);
}