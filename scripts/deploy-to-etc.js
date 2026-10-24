const hre = require("hardhat");
const fs = require("fs");

async function main() {
    console.log("=== DEPLOYING TO ETHEREUM CLASSIC ===");
    console.log("Network:", hre.network.name);
    
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", ethers.formatEther(balance), "ETC");
    
    if (balance < ethers.parseEther("0.1")) {
        console.error("❌ Insufficient balance. Need at least 0.1 ETC for deployment");
        process.exit(1);
    }
    
    
    const deployedContracts = {};
    
    try {
        // Deploy con configuración optimizada para ETC
        console.log("\n🚀 Starting deployment to Ethereum Classic...");
        
        // 1. FIELIntegration
        console.log("\n1. Deploying FIELIntegration...");
        const FIELIntegration = await ethers.getContractFactory("FIELIntegration");
        const fielIntegration = await FIELIntegration.deploy({
            gasLimit: 3000000,
            gasPrice: ethers.parseUnits("20", "gwei")
        });
        await fielIntegration.waitForDeployment();
        deployedContracts.FIELIntegration = await fielIntegration.getAddress();
        console.log("✅ FIELIntegration:", deployedContracts.FIELIntegration);
        
        // Esperar confirmaciones en ETC
        console.log("   Waiting for confirmations...");
        await fielIntegration.deploymentTransaction().wait(3);
        
        // 2. DigitalSignatureVerifier
        console.log("\n2. Deploying DigitalSignatureVerifier...");
        const DigitalSignatureVerifier = await ethers.getContractFactory("DigitalSignatureVerifier");
        const signatureVerifier = await DigitalSignatureVerifier.deploy({
            gasLimit: 4000000,
            gasPrice: ethers.parseUnits("20", "gwei")
        });
        await signatureVerifier.waitForDeployment();
        deployedContracts.DigitalSignatureVerifier = await signatureVerifier.getAddress();
        console.log("✅ DigitalSignatureVerifier:", deployedContracts.DigitalSignatureVerifier);
        await signatureVerifier.deploymentTransaction().wait(3);
        
        // 3. CountryAuthorityManager
        console.log("\n3. Deploying CountryAuthorityManager...");
        const CountryAuthorityManager = await ethers.getContractFactory("CountryAuthorityManager");
        const authorityManager = await CountryAuthorityManager.deploy({
            gasLimit: 3000000,
            gasPrice: ethers.parseUnits("20", "gwei")
        });
        await authorityManager.waitForDeployment();
        deployedContracts.CountryAuthorityManager = await authorityManager.getAddress();
        console.log("✅ CountryAuthorityManager:", deployedContracts.CountryAuthorityManager);
        await authorityManager.deploymentTransaction().wait(3);
        
        // 4. TradeAgreementRegistry
        console.log("\n4. Deploying TradeAgreementRegistry...");
        const TradeAgreementRegistry = await ethers.getContractFactory("TradeAgreementRegistry");
        const agreementRegistry = await TradeAgreementRegistry.deploy({
            gasLimit: 4000000,
            gasPrice: ethers.parseUnits("20", "gwei")
        });
        await agreementRegistry.waitForDeployment();
        deployedContracts.TradeAgreementRegistry = await agreementRegistry.getAddress();
        console.log("✅ TradeAgreementRegistry:", deployedContracts.TradeAgreementRegistry);
        await agreementRegistry.deploymentTransaction().wait(3);
        
        // 5. UniversalOriginCertificate
        console.log("\n5. Deploying UniversalOriginCertificate...");
        const UniversalOriginCertificate = await ethers.getContractFactory("UniversalOriginCertificate");
        const certificateContract = await UniversalOriginCertificate.deploy(
            deployedContracts.TradeAgreementRegistry,
            {
                gasLimit: 4000000,
                gasPrice: ethers.parseUnits("20", "gwei")
            }
        );
        await certificateContract.waitForDeployment();
        deployedContracts.UniversalOriginCertificate = await certificateContract.getAddress();
        console.log("✅ UniversalOriginCertificate:", deployedContracts.UniversalOriginCertificate);
        await certificateContract.deploymentTransaction().wait(3);
        
        // 6. UniversalSignatureVerifier
        console.log("\n6. Deploying UniversalSignatureVerifier...");
        const UniversalSignatureVerifier = await ethers.getContractFactory("UniversalSignatureVerifier");
        const universalVerifier = await UniversalSignatureVerifier.deploy({
            gasLimit: 4000000,
            gasPrice: ethers.parseUnits("20", "gwei")
        });
        await universalVerifier.waitForDeployment();
        deployedContracts.UniversalSignatureVerifier = await universalVerifier.getAddress();
        console.log("✅ UniversalSignatureVerifier:", deployedContracts.UniversalSignatureVerifier);
        await universalVerifier.deploymentTransaction().wait(3);
        
        // Save deployment info
        const deploymentInfo = {
            network: "ethereum-classic",
            chainId: 61,
            deployedAt: new Date().toISOString(),
            deployer: deployer.address,
            contracts: deployedContracts,
            blockScoutUrls: {
                FIELIntegration: `https://blockscout.com/etc/mainnet/address/${deployedContracts.FIELIntegration}`,
                DigitalSignatureVerifier: `https://blockscout.com/etc/mainnet/address/${deployedContracts.DigitalSignatureVerifier}`,
                CountryAuthorityManager: `https://blockscout.com/etc/mainnet/address/${deployedContracts.CountryAuthorityManager}`,
                TradeAgreementRegistry: `https://blockscout.com/etc/mainnet/address/${deployedContracts.TradeAgreementRegistry}`,
                UniversalOriginCertificate: `https://blockscout.com/etc/mainnet/address/${deployedContracts.UniversalOriginCertificate}`,
                UniversalSignatureVerifier: `https://blockscout.com/etc/mainnet/address/${deployedContracts.UniversalSignatureVerifier}`
            }
        };
        
        const filename = `./deployments/etc-mainnet-${Date.now()}.json`;
        fs.writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2));
        
        console.log("\n=== DEPLOYMENT SUCCESSFUL ===");
        console.log("✅ All contracts deployed to Ethereum Classic");
        console.log(`📄 Deployment info saved to: ${filename}`);
        
        console.log("\n📋 Contract Addresses:");
        Object.entries(deployedContracts).forEach(([name, address]) => {
            console.log(`  ${name}: ${address}`);
        });
        
        console.log("\n🔍 View on BlockScout:");
        Object.entries(deploymentInfo.blockScoutUrls).forEach(([name, url]) => {
            console.log(`  ${name}: ${url}`);
        });
        
        console.log("\n🎉 Origin Certification System deployed to Ethereum Classic!");
        console.log("\n📝 Next steps:");
        console.log("  1. Users can register their FIEL certificates");
        console.log("  2. Any country's digital signatures are supported");
        console.log("  3. Create and sign origin certificates");
        
    } catch (error) {
        console.error("\n❌ Deployment failed:", error.message);
        
        // Save partial deployment
        if (Object.keys(deployedContracts).length > 0) {
            const partialFile = `./deployments/etc-partial-${Date.now()}.json`;
            fs.writeFileSync(partialFile, JSON.stringify({
                status: "partial",
                deployedContracts,
                error: error.message
            }, null, 2));
            console.log(`\n📄 Partial deployment saved to: ${partialFile}`);
        }
        
        throw error;
    }
}

// Add script to verify contracts
async function verifyContracts(deploymentFile) {
    console.log("\n=== VERIFYING CONTRACTS ON BLOCKSCOUT ===");
    
    const deployment = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
    
    for (const [name, address] of Object.entries(deployment.contracts)) {
        console.log(`\nVerifying ${name} at ${address}...`);
        
        try {
            await hre.run("verify:verify", {
                address: address,
                constructorArguments: name === "UniversalOriginCertificate" 
                    ? [deployment.contracts.TradeAgreementRegistry] 
                    : [],
                network: "etc"
            });
            console.log(`✅ ${name} verified`);
        } catch (error) {
            console.log(`❌ ${name} verification failed:`, error.message);
        }
    }
}

// Check if we're verifying or deploying
if (process.argv.includes("--verify")) {
    const deploymentFile = process.argv[process.argv.indexOf("--verify") + 1];
    verifyContracts(deploymentFile)
        .then(() => process.exit(0))
        .catch(error => {
            console.error(error);
            process.exit(1);
        });
} else {
    main()
        .then(() => process.exit(0))
        .catch(error => {
            console.error(error);
            process.exit(1);
        });
}