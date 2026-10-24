const hre = require("hardhat");
const fs = require("fs");

async function main() {
    console.log("=== FINALIZING DEPLOYMENT TO ETHEREUM CLASSIC ===");
    console.log("Network:", hre.network.name);
    
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", ethers.formatEther(balance), "ETC");
    
    // Load already deployed contracts
    const partialDeployment = JSON.parse(fs.readFileSync('./deployments/etc-partial-continued-1754280040372.json', 'utf8'));
    const deployedContracts = partialDeployment.deployedContracts || {};
    
    console.log("\n📦 Already deployed contracts:");
    Object.entries(deployedContracts).forEach(([name, address]) => {
        console.log(`  ${name}: ${address}`);
    });
    
    try {
        console.log("\n🚀 Deploying final contracts with optimized gas...");
        
        // 5. UniversalOriginCertificate with lower gas
        if (!deployedContracts.UniversalOriginCertificate) {
            console.log("\n5. Deploying UniversalOriginCertificate...");
            const UniversalOriginCertificate = await ethers.getContractFactory("UniversalOriginCertificate");
            const certificateContract = await UniversalOriginCertificate.deploy(
                deployedContracts.TradeAgreementRegistry,
                {
                    gasLimit: 4500000, // Reduced from 6M
                    gasPrice: ethers.parseUnits("15", "gwei") // Lower gas price
                }
            );
            await certificateContract.waitForDeployment();
            deployedContracts.UniversalOriginCertificate = await certificateContract.getAddress();
            console.log("✅ UniversalOriginCertificate:", deployedContracts.UniversalOriginCertificate);
            await certificateContract.deploymentTransaction().wait(2);
        }
        
        // 6. UniversalSignatureVerifier with lower gas
        if (!deployedContracts.UniversalSignatureVerifier) {
            console.log("\n6. Deploying UniversalSignatureVerifier...");
            const UniversalSignatureVerifier = await ethers.getContractFactory("UniversalSignatureVerifier");
            const universalVerifier = await UniversalSignatureVerifier.deploy({
                gasLimit: 4500000, // Reduced from 6M
                gasPrice: ethers.parseUnits("15", "gwei") // Lower gas price
            });
            await universalVerifier.waitForDeployment();
            deployedContracts.UniversalSignatureVerifier = await universalVerifier.getAddress();
            console.log("✅ UniversalSignatureVerifier:", deployedContracts.UniversalSignatureVerifier);
            await universalVerifier.deploymentTransaction().wait(2);
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
        
        console.log("\n=== DEPLOYMENT COMPLETE ===");
        console.log("✅ All contracts deployed to Ethereum Classic");
        console.log(`📄 Deployment info saved to: ${filename}`);
        
        console.log("\n📋 Final Contract Addresses:");
        Object.entries(deployedContracts).forEach(([name, address]) => {
            console.log(`  ${name}: ${address}`);
        });
        
        console.log("\n🔍 View on BlockScout:");
        Object.entries(deploymentInfo.blockScoutUrls).forEach(([name, url]) => {
            console.log(`  ${name}: ${url}`);
        });
        
        console.log("\n🎉 Origin Certification System successfully deployed to Ethereum Classic!");
        console.log("\n📝 Next steps:");
        console.log("  1. Verify all contracts on BlockScout");
        console.log("  2. Update backend API with new contract addresses");
        console.log("  3. Update frontend to use the modular architecture");
        
        // Show remaining balance
        const finalBalance = await ethers.provider.getBalance(deployer.address);
        console.log("\n💰 Remaining balance:", ethers.formatEther(finalBalance), "ETC");
        
    } catch (error) {
        console.error("\n❌ Deployment failed:", error.message);
        
        // Save partial deployment
        const partialFile = `./deployments/etc-partial-final-${Date.now()}.json`;
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