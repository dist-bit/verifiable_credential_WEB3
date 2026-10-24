const hre = require("hardhat");
const fs = require("fs");

async function main() {
    console.log("=== VERIFYING CONTRACTS ON ETHEREUM CLASSIC BLOCKSCOUT ===");
    
    // Load deployment info
    const deployment = JSON.parse(fs.readFileSync('./deployments/etc-mainnet-partial-summary.json', 'utf8'));
    const contracts = deployment.contracts.deployed;
    
    console.log("\n📋 Contracts to verify:");
    Object.entries(contracts).forEach(([name, address]) => {
        console.log(`  ${name}: ${address}`);
    });
    
    console.log("\n🔍 Starting verification process...\n");
    
    const verificationResults = {};
    
    for (const [name, address] of Object.entries(contracts)) {
        console.log(`Verifying ${name} at ${address}...`);
        
        try {
            // Determine constructor arguments
            let constructorArguments = [];
            if (name === "UniversalOriginCertificate") {
                constructorArguments = [contracts.TradeAgreementRegistry];
            }
            
            await hre.run("verify:verify", {
                address: address,
                constructorArguments: constructorArguments,
                network: "ethereumClassic"
            });
            
            console.log(`✅ ${name} verified successfully`);
            verificationResults[name] = {
                status: "verified",
                blockScoutUrl: `https://blockscout.com/etc/mainnet/address/${address}`
            };
            
        } catch (error) {
            if (error.message.includes("already verified")) {
                console.log(`ℹ️  ${name} already verified`);
                verificationResults[name] = {
                    status: "already verified",
                    blockScoutUrl: `https://blockscout.com/etc/mainnet/address/${address}`
                };
            } else {
                console.log(`❌ ${name} verification failed:`, error.message);
                verificationResults[name] = {
                    status: "failed",
                    error: error.message
                };
            }
        }
        
        console.log(); // Empty line for readability
    }
    
    // Save verification results
    const resultsFile = `./deployments/etc-verification-results-${Date.now()}.json`;
    fs.writeFileSync(resultsFile, JSON.stringify({
        network: "ethereum-classic",
        verifiedAt: new Date().toISOString(),
        contracts: verificationResults
    }, null, 2));
    
    console.log("\n=== VERIFICATION SUMMARY ===");
    console.log(`📄 Results saved to: ${resultsFile}`);
    
    console.log("\n📊 Verification Status:");
    Object.entries(verificationResults).forEach(([name, result]) => {
        const icon = result.status === "verified" || result.status === "already verified" ? "✅" : "❌";
        console.log(`  ${icon} ${name}: ${result.status}`);
    });
    
    console.log("\n🔗 BlockScout Links:");
    Object.entries(verificationResults).forEach(([name, result]) => {
        if (result.blockScoutUrl) {
            console.log(`  ${name}: ${result.blockScoutUrl}`);
        }
    });
    
    console.log("\n📝 Next Steps:");
    console.log("  1. Check verified contracts on BlockScout");
    console.log("  2. Complete deployment of remaining contracts when funds available");
    console.log("  3. Update backend API with verified contract addresses");
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