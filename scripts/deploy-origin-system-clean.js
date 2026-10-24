const hre = require("hardhat");
const fs = require("fs");

async function main() {
    console.log("=== DEPLOYING ORIGIN CERTIFICATION SYSTEM ===");
    console.log("Network:", hre.network.name);
    
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);
    
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", ethers.formatEther(balance));
    
    // Track deployed contracts
    const contracts = {};
    
    try {
        console.log("\n📦 Deploying modular contracts...\n");
        
        // 1. FIELIntegration - Permite que cualquier usuario registre su FIEL
        console.log("1. Deploying FIELIntegration...");
        const FIELIntegration = await ethers.getContractFactory("FIELIntegration");
        const fielIntegration = await FIELIntegration.deploy();
        await fielIntegration.waitForDeployment();
        contracts.FIELIntegration = await fielIntegration.getAddress();
        console.log("   ✅ Deployed at:", contracts.FIELIntegration);
        console.log("   ℹ️  Users can register their own FIEL certificates");
        
        // 2. DigitalSignatureVerifier - Verifica firmas de múltiples países
        console.log("\n2. Deploying DigitalSignatureVerifier...");
        const DigitalSignatureVerifier = await ethers.getContractFactory("DigitalSignatureVerifier");
        const signatureVerifier = await DigitalSignatureVerifier.deploy();
        await signatureVerifier.waitForDeployment();
        contracts.DigitalSignatureVerifier = await signatureVerifier.getAddress();
        console.log("   ✅ Deployed at:", contracts.DigitalSignatureVerifier);
        console.log("   ℹ️  Supports FIEL (MX), US-PKI, eIDAS (EU) and more");
        
        // 3. CountryAuthorityManager - Gestiona autoridades por país
        console.log("\n3. Deploying CountryAuthorityManager...");
        const CountryAuthorityManager = await ethers.getContractFactory("CountryAuthorityManager");
        const authorityManager = await CountryAuthorityManager.deploy();
        await authorityManager.waitForDeployment();
        contracts.CountryAuthorityManager = await authorityManager.getAddress();
        console.log("   ✅ Deployed at:", contracts.CountryAuthorityManager);
        console.log("   ℹ️  Manages certification authorities per country");
        
        // 4. TradeAgreementRegistry - Registra acuerdos comerciales
        console.log("\n4. Deploying TradeAgreementRegistry...");
        const TradeAgreementRegistry = await ethers.getContractFactory("TradeAgreementRegistry");
        const agreementRegistry = await TradeAgreementRegistry.deploy();
        await agreementRegistry.waitForDeployment();
        contracts.TradeAgreementRegistry = await agreementRegistry.getAddress();
        console.log("   ✅ Deployed at:", contracts.TradeAgreementRegistry);
        console.log("   ℹ️  Pre-configured with USMCA, CAFTA-DR, CPTPP, EU-MX");
        
        // 5. UniversalOriginCertificate - Certificados de origen universales
        console.log("\n5. Deploying UniversalOriginCertificate...");
        const UniversalOriginCertificate = await ethers.getContractFactory("UniversalOriginCertificate");
        const certificateContract = await UniversalOriginCertificate.deploy(contracts.TradeAgreementRegistry);
        await certificateContract.waitForDeployment();
        contracts.UniversalOriginCertificate = await certificateContract.getAddress();
        console.log("   ✅ Deployed at:", contracts.UniversalOriginCertificate);
        console.log("   ℹ️  Creates origin certificates for any trade agreement");
        
        // 6. UniversalSignatureVerifier - Verificador universal de firmas digitales
        console.log("\n6. Deploying UniversalSignatureVerifier...");
        const UniversalSignatureVerifier = await ethers.getContractFactory("UniversalSignatureVerifier");
        const universalVerifier = await UniversalSignatureVerifier.deploy();
        await universalVerifier.waitForDeployment();
        contracts.UniversalSignatureVerifier = await universalVerifier.getAddress();
        console.log("   ✅ Deployed at:", contracts.UniversalSignatureVerifier);
        console.log("   ℹ️  Supports FIEL, PKI, eIDAS, ICP-Brasil, and more");
        
        // Verify initial configuration
        console.log("\n🔍 Verifying initial configuration...\n");
        
        // Check pre-configured trade agreements
        console.log("📋 Trade Agreements:");
        const agreements = ["USMCA", "CAFTA-DR", "CPTPP", "EU-MX"];
        for (const agreement of agreements) {
            const isValid = await agreementRegistry.isValidAgreement(agreement);
            console.log(`   ${agreement}: ${isValid ? "✅ Active" : "❌ Not found"}`);
        }
        
        // Check signature standards
        console.log("\n🔏 Signature Standards:");
        const standards = ["FIEL", "US-PKI", "eIDAS"];
        for (const standard of standards) {
            const stdInfo = await signatureVerifier.signatureStandards(standard);
            console.log(`   ${standard}: ${stdInfo.isActive ? "✅ Active" : "❌ Inactive"} (${stdInfo.country})`);
        }
        
        // Save deployment information
        const deploymentInfo = {
            network: hre.network.name,
            chainId: (await ethers.provider.getNetwork()).chainId,
            deployedAt: new Date().toISOString(),
            deployer: deployer.address,
            contracts: contracts,
            configuration: {
                tradeAgreements: agreements,
                signatureStandards: standards,
                note: "Users must register their own FIEL certificates"
            }
        };
        
        // Create filename based on network
        const filename = `./deployments/origin-system-${hre.network.name}-${Date.now()}.json`;
        fs.writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2));
        
        console.log("\n=== DEPLOYMENT SUMMARY ===");
        console.log("✅ All contracts deployed successfully");
        console.log(`📄 Deployment info saved to: ${filename}`);
        
        console.log("\n📋 Contract Addresses:");
        Object.entries(contracts).forEach(([name, address]) => {
            console.log(`   ${name}: ${address}`);
        });
        
        console.log("\n🎯 Next Steps:");
        console.log("1. Register authorities using CountryAuthorityManager");
        console.log("2. Users register their FIEL using FIELIntegration.registerFIEL()");
        console.log("3. Create certificates with UniversalOriginCertificate");
        console.log("4. Sign certificates with registered FIELs");
        
        // If on ETC, show BlockScout URLs
        if (hre.network.name === "ethereumClassic") {
            console.log("\n🔍 View on BlockScout:");
            Object.entries(contracts).forEach(([name, address]) => {
                console.log(`   ${name}: https://blockscout.com/etc/mainnet/address/${address}`);
            });
        }
        
        return deploymentInfo;
        
    } catch (error) {
        console.error("\n❌ Deployment failed:", error.message);
        
        // Save partial deployment if any contracts were deployed
        if (Object.keys(contracts).length > 0) {
            const partialFile = `./deployments/partial-${hre.network.name}-${Date.now()}.json`;
            fs.writeFileSync(partialFile, JSON.stringify({
                status: "partial",
                deployedContracts: contracts,
                error: error.message
            }, null, 2));
            console.log(`📄 Partial deployment saved to: ${partialFile}`);
        }
        
        throw error;
    }
}

// Verification function for BlockScout
async function verifyContracts(deploymentFile) {
    console.log("\n=== VERIFYING CONTRACTS ===");
    
    const deployment = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
    
    for (const [name, address] of Object.entries(deployment.contracts)) {
        console.log(`\nVerifying ${name} at ${address}...`);
        
        try {
            const constructorArgs = name === "UniversalOriginCertificate" 
                ? [deployment.contracts.TradeAgreementRegistry] 
                : [];
                
            await hre.run("verify:verify", {
                address: address,
                constructorArguments: constructorArgs,
            });
            
            console.log(`✅ ${name} verified successfully`);
        } catch (error) {
            if (error.message.includes("already verified")) {
                console.log(`ℹ️  ${name} already verified`);
            } else {
                console.log(`❌ ${name} verification failed:`, error.message);
            }
        }
    }
}

// Main execution
if (require.main === module) {
    // Check for verification flag
    if (process.argv.includes("--verify")) {
        const deploymentFile = process.argv[process.argv.indexOf("--verify") + 1];
        if (!deploymentFile) {
            console.error("Please provide deployment file: --verify <deployment-file>");
            process.exit(1);
        }
        verifyContracts(deploymentFile)
            .then(() => process.exit(0))
            .catch(error => {
                console.error(error);
                process.exit(1);
            });
    } else {
        // Run deployment
        main()
            .then(() => process.exit(0))
            .catch(error => {
                console.error(error);
                process.exit(1);
            });
    }
}

module.exports = { main };