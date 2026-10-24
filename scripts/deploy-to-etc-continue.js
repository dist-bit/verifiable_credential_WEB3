const hre = require("hardhat");
const fs = require("fs");

async function main() {
    console.log("=== CONTINUING DEPLOYMENT TO ETHEREUM CLASSIC ===");
    console.log("Network:", hre.network.name);
    
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", ethers.formatEther(balance), "ETC");
    
    if (balance < ethers.parseEther("0.1")) {
        console.error("❌ Insufficient balance. Need at least 0.1 ETC for deployment");
        process.exit(1);
    }
    
    // Load already deployed contracts
    const partialDeployment = JSON.parse(fs.readFileSync('./deployments/etc-partial-1754279909503.json', 'utf8'));
    const deployedContracts = partialDeployment.deployedContracts || {};
    
    console.log("\n📦 Already deployed contracts:");
    Object.entries(deployedContracts).forEach(([name, address]) => {
        console.log(`  ${name}: ${address}`);
    });
    
    try {
        console.log("\n🚀 Continuing deployment...");
        
        // 3. CountryAuthorityManager - Using higher gas limit
        if (!deployedContracts.CountryAuthorityManager) {
            console.log("\n3. Deploying CountryAuthorityManager...");
            const CountryAuthorityManager = await ethers.getContractFactory("CountryAuthorityManager");
            const authorityManager = await CountryAuthorityManager.deploy({
                gasLimit: 5000000, // Increased from 3M to 5M
                gasPrice: ethers.parseUnits("25", "gwei") // Slightly higher gas price
            });
            await authorityManager.waitForDeployment();
            deployedContracts.CountryAuthorityManager = await authorityManager.getAddress();
            console.log("✅ CountryAuthorityManager:", deployedContracts.CountryAuthorityManager);
            await authorityManager.deploymentTransaction().wait(3);
        }
        
        // 4. TradeAgreementRegistry
        if (!deployedContracts.TradeAgreementRegistry) {
            console.log("\n4. Deploying TradeAgreementRegistry...");
            const TradeAgreementRegistry = await ethers.getContractFactory("TradeAgreementRegistry");
            const agreementRegistry = await TradeAgreementRegistry.deploy({
                gasLimit: 6000000, // Higher limit for this contract
                gasPrice: ethers.parseUnits("25", "gwei")
            });
            await agreementRegistry.waitForDeployment();
            deployedContracts.TradeAgreementRegistry = await agreementRegistry.getAddress();
            console.log("✅ TradeAgreementRegistry:", deployedContracts.TradeAgreementRegistry);
            await agreementRegistry.deploymentTransaction().wait(3);
        }
        
        // 5. UniversalOriginCertificate
        if (!deployedContracts.UniversalOriginCertificate) {
            console.log("\n5. Deploying UniversalOriginCertificate...");
            const UniversalOriginCertificate = await ethers.getContractFactory("UniversalOriginCertificate");
            const certificateContract = await UniversalOriginCertificate.deploy(
                deployedContracts.TradeAgreementRegistry,
                {
                    gasLimit: 6000000,
                    gasPrice: ethers.parseUnits("25", "gwei")
                }
            );
            await certificateContract.waitForDeployment();
            deployedContracts.UniversalOriginCertificate = await certificateContract.getAddress();
            console.log("✅ UniversalOriginCertificate:", deployedContracts.UniversalOriginCertificate);
            await certificateContract.deploymentTransaction().wait(3);
        }
        
        // 6. UniversalSignatureVerifier
        if (!deployedContracts.UniversalSignatureVerifier) {
            console.log("\n6. Deploying UniversalSignatureVerifier...");
            const UniversalSignatureVerifier = await ethers.getContractFactory("UniversalSignatureVerifier");
            const universalVerifier = await UniversalSignatureVerifier.deploy({
                gasLimit: 6000000,
                gasPrice: ethers.parseUnits("25", "gwei")
            });
            await universalVerifier.waitForDeployment();
            deployedContracts.UniversalSignatureVerifier = await universalVerifier.getAddress();
            console.log("✅ UniversalSignatureVerifier:", deployedContracts.UniversalSignatureVerifier);
            await universalVerifier.deploymentTransaction().wait(3);
        }
        
        // Save complete deployment info
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
        
        const filename = `./deployments/etc-mainnet-complete-${Date.now()}.json`;
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
        console.log("  1. Verify contracts on BlockScout");
        console.log("  2. Users can register their digital certificates (FIEL, PKI, eIDAS, etc.)");
        console.log("  3. Create and sign origin certificates");
        
    } catch (error) {
        console.error("\n❌ Deployment failed:", error.message);
        
        // Save partial deployment
        const partialFile = `./deployments/etc-partial-continued-${Date.now()}.json`;
        fs.writeFileSync(partialFile, JSON.stringify({
            status: "partial",
            deployedContracts,
            error: error.message
        }, null, 2));
        console.log(`\n📄 Partial deployment saved to: ${partialFile}`);
        
        throw error;
    }
}

// Main execution
if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch(error => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = { main };