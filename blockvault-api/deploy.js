const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Contract ABIs and Bytecode
const BlockVaultContract = require('../artifacts/contracts/sample/BlockVault.sol/BlockVault.json');

async function deployBlockVault() {
    console.log('🚀 Starting BlockVault deployment...\n');

    // Check for required environment variables
    if (!process.env.RPC_URL || !process.env.PRIVATE_KEY || !process.env.PLATFORM_WALLET) {
        console.error('❌ Missing required environment variables!');
        console.error('Please set RPC_URL, PRIVATE_KEY, and PLATFORM_WALLET in .env file');
        process.exit(1);
    }

    // Connect to network
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    console.log(`📍 Connected to network`);
    console.log(`👤 Deploying from: ${wallet.address}`);
    
    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH\n`);

    if (balance === 0n) {
        console.error('❌ Insufficient balance for deployment!');
        process.exit(1);
    }

    // Deploy BlockVault
    console.log('📝 Deploying BlockVault contract...');
    
    const BlockVaultFactory = new ethers.ContractFactory(
        BlockVaultContract.abi,
        BlockVaultContract.bytecode,
        wallet
    );

    const blockVault = await BlockVaultFactory.deploy(
        "https://blockvault.io/issuers/001",
        ["https://www.w3.org/2018/credentials/v1", "https://blockvault.io/credentials/v1"],
        "https://blockvault.io/credentials/access/1",
        ["VerifiableCredential", "BlockVaultAccessCredential"],
        "https://blockvault.io/issuers/001#key-1",
        {
            id: "https://blockvault.io/schemas/content-access.json",
            typeSchema: "JsonSchemaValidator2018"
        },
        process.env.PLATFORM_WALLET
    );

    console.log(`⏳ Transaction hash: ${blockVault.deploymentTransaction().hash}`);
    console.log('⏳ Waiting for confirmation...');
    
    await blockVault.waitForDeployment();
    const blockVaultAddress = await blockVault.getAddress();
    
    console.log(`✅ BlockVault deployed to: ${blockVaultAddress}\n`);

    // Verify deployment
    console.log('🔍 Verifying deployment...');
    const issuer = await blockVault.issuer();
    const version = await blockVault.viewVersion();
    console.log(`   Issuer: ${issuer}`);
    console.log(`   Version: ${version}`);
    
    // Save deployment info
    const deploymentInfo = {
        network: (await provider.getNetwork()).name,
        chainId: (await provider.getNetwork()).chainId.toString(),
        blockVaultAddress: blockVaultAddress,
        nebuVCAddress: process.env.NEBU_VC_ADDRESS,
        platformWallet: process.env.PLATFORM_WALLET,
        deployer: wallet.address,
        deploymentDate: new Date().toISOString(),
        transactionHash: blockVault.deploymentTransaction().hash
    };

    fs.writeFileSync(
        path.join(__dirname, 'deployment.json'),
        JSON.stringify(deploymentInfo, null, 2)
    );

    console.log('\n📄 Deployment info saved to deployment.json');
    
    // Update .env with deployed address
    const envContent = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
    const updatedEnv = envContent.replace(
        /BLOCK_VAULT_ADDRESS=.*/,
        `BLOCK_VAULT_ADDRESS=${blockVaultAddress}`
    );
    fs.writeFileSync(path.join(__dirname, '.env'), updatedEnv);
    
    console.log('✅ Updated .env with deployed address');
    console.log('\n🎉 Deployment complete!');
    
    return deploymentInfo;
}

// Run deployment if called directly
if (require.main === module) {
    deployBlockVault()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error('❌ Deployment failed:', error);
            process.exit(1);
        });
}

module.exports = { deployBlockVault };