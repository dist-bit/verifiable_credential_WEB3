const hre = require("hardhat");

async function main() {
    console.log("Starting deployment of Origin Certification Modular System...");
    
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);
    console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

    // Deploy individual modules first
    console.log("\n1. Deploying FIELIntegration...");
    const FIELIntegration = await ethers.getContractFactory("FIELIntegration");
    const fielIntegration = await FIELIntegration.deploy();
    await fielIntegration.waitForDeployment();
    const fielAddress = await fielIntegration.getAddress();
    console.log("FIELIntegration deployed to:", fielAddress);

    console.log("\n2. Deploying DigitalSignatureVerifier...");
    const DigitalSignatureVerifier = await ethers.getContractFactory("DigitalSignatureVerifier");
    const signatureVerifier = await DigitalSignatureVerifier.deploy();
    await signatureVerifier.waitForDeployment();
    const signatureAddress = await signatureVerifier.getAddress();
    console.log("DigitalSignatureVerifier deployed to:", signatureAddress);

    console.log("\n3. Deploying CountryAuthorityManager...");
    const CountryAuthorityManager = await ethers.getContractFactory("CountryAuthorityManager");
    const authorityManager = await CountryAuthorityManager.deploy();
    await authorityManager.waitForDeployment();
    const authorityAddress = await authorityManager.getAddress();
    console.log("CountryAuthorityManager deployed to:", authorityAddress);

    console.log("\n4. Deploying TradeAgreementRegistry...");
    const TradeAgreementRegistry = await ethers.getContractFactory("TradeAgreementRegistry");
    const agreementRegistry = await TradeAgreementRegistry.deploy();
    await agreementRegistry.waitForDeployment();
    const agreementAddress = await agreementRegistry.getAddress();
    console.log("TradeAgreementRegistry deployed to:", agreementAddress);

    console.log("\n5. Deploying UniversalOriginCertificate...");
    const UniversalOriginCertificate = await ethers.getContractFactory("UniversalOriginCertificate");
    const certificateContract = await UniversalOriginCertificate.deploy(agreementAddress);
    await certificateContract.waitForDeployment();
    const certificateAddress = await certificateContract.getAddress();
    console.log("UniversalOriginCertificate deployed to:", certificateAddress);

    // Deploy main orchestrator (if contract size allows)
    // If not, we'll use the modules directly
    console.log("\n6. Attempting to deploy OriginCertificationSystem...");
    try {
        const OriginCertificationSystem = await ethers.getContractFactory("OriginCertificationSystem");
        const originSystem = await OriginCertificationSystem.deploy();
        await originSystem.waitForDeployment();
        const systemAddress = await originSystem.getAddress();
        console.log("OriginCertificationSystem deployed to:", systemAddress);
        
        console.log("\n=== DEPLOYMENT COMPLETE (WITH ORCHESTRATOR) ===");
        console.log("OriginCertificationSystem:", systemAddress);
    } catch (error) {
        console.log("Could not deploy OriginCertificationSystem (contract too large)");
        console.log("Use the individual modules directly:");
        
        console.log("\n=== DEPLOYMENT COMPLETE (MODULAR) ===");
    }

    console.log("\nModule Addresses:");
    console.log("FIELIntegration:", fielAddress);
    console.log("DigitalSignatureVerifier:", signatureAddress);
    console.log("CountryAuthorityManager:", authorityAddress);
    console.log("TradeAgreementRegistry:", agreementAddress);
    console.log("UniversalOriginCertificate:", certificateAddress);

    // Save addresses to file for later use
    const fs = require('fs');
    const addresses = {
        network: hre.network.name,
        deployedAt: new Date().toISOString(),
        contracts: {
            FIELIntegration: fielAddress,
            DigitalSignatureVerifier: signatureAddress,
            CountryAuthorityManager: authorityAddress,
            TradeAgreementRegistry: agreementAddress,
            UniversalOriginCertificate: certificateAddress
        }
    };

    fs.writeFileSync(
        `./deployments/origin-modules-${hre.network.name}.json`,
        JSON.stringify(addresses, null, 2)
    );

    console.log("\n✅ Addresses saved to deployments/origin-modules-" + hre.network.name + ".json");

    // Verify initial configuration
    console.log("\n=== VERIFYING INITIAL CONFIGURATION ===");
    
    // Check trade agreements
    console.log("\nTrade Agreements:");
    const agreements = ["USMCA", "CAFTA-DR", "CPTPP", "EU-MX"];
    for (const agreement of agreements) {
        const isValid = await agreementRegistry.isValidAgreement(agreement);
        console.log(`- ${agreement}: ${isValid ? "✓ Active" : "✗ Not found"}`);
    }

    // Check signature standards
    console.log("\nSignature Standards:");
    const standards = ["FIEL", "US-PKI", "eIDAS"];
    for (const standard of standards) {
        try {
            const stdInfo = await signatureVerifier.signatureStandards(standard);
            console.log(`- ${standard}: ${stdInfo.isActive ? "✓ Active" : "✗ Inactive"} (${stdInfo.country})`);
        } catch (e) {
            console.log(`- ${standard}: ✗ Not found`);
        }
    }

    console.log("\n🎉 Deployment and verification complete!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });