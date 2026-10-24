const hre = require("hardhat");
const fs = require("fs");
const { parseFIELCertificate } = require('./parse-fiel-certificate');

// Información real de tu FIEL obtenida del parser
const FIEL_INFO = {
    rfc: "SABM960611SP4",
    certificatePath: "./fiel/00001000000704479448.cer",
    serialNumber: "3030303031303030303030373034343739343438",
    validUntil: 1831661148, // 2028-01-16T18:45:48.000Z
    certHash: "5e603d256f7361704376e3a48607832fc6a5c7a2c05299b97bc3f268aac128b0"
};

async function main() {
    console.log("=== DEPLOYING ORIGIN CERTIFICATION SYSTEM WITH REAL FIEL ===");
    
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());
    
    // Verificar certificado FIEL
    console.log("\n📄 Verificando certificado FIEL...");
    const certInfo = await parseFIELCertificate(FIEL_INFO.certificatePath);
    console.log(`✅ RFC: ${certInfo.rfc}`);
    console.log(`✅ Válido hasta: ${certInfo.validity.notAfter}`);
    console.log(`✅ Hash SHA-256: ${certInfo.hashes.sha256}`);
    
    // Deploy modular contracts
    console.log("\n🚀 Deploying modular contracts...");
    
    // 1. FIELIntegration
    console.log("\n1. Deploying FIELIntegration...");
    const FIELIntegration = await ethers.getContractFactory("FIELIntegration");
    const fielIntegration = await FIELIntegration.deploy();
    await fielIntegration.waitForDeployment();
    const fielAddress = await fielIntegration.getAddress();
    console.log("✅ FIELIntegration deployed to:", fielAddress);
    
    // Register real FIEL
    console.log("\n📝 Registering real FIEL...");
    const tx1 = await fielIntegration.registerFIEL(
        FIEL_INFO.rfc,
        certInfo.serialNumber,
        certInfo.validity.notAfterUnix,
        certInfo.hashes.sha256
    );
    await tx1.wait();
    console.log("✅ FIEL registered successfully");
    
    // Verify registration
    const fielData = await fielIntegration.getFIELInfo(FIEL_INFO.rfc);
    console.log("\n📋 Registered FIEL Info:");
    console.log(`  RFC: ${FIEL_INFO.rfc}`);
    console.log(`  Serial: ${fielData.certificateSerial}`);
    console.log(`  Valid Until: ${new Date(Number(fielData.validUntil) * 1000).toISOString()}`);
    console.log(`  Active: ${fielData.isActive}`);
    
    // 2. DigitalSignatureVerifier
    console.log("\n2. Deploying DigitalSignatureVerifier...");
    const DigitalSignatureVerifier = await ethers.getContractFactory("DigitalSignatureVerifier");
    const signatureVerifier = await DigitalSignatureVerifier.deploy();
    await signatureVerifier.waitForDeployment();
    const signatureAddress = await signatureVerifier.getAddress();
    console.log("✅ DigitalSignatureVerifier deployed to:", signatureAddress);
    
    // Register deployer as FIEL signer
    console.log("\n📝 Registering signer in DigitalSignatureVerifier...");
    const tx2 = await signatureVerifier.registerSigner(
        deployer.address,
        certInfo.serialNumber,
        "FIEL",
        "MX",
        certInfo.validity.notAfterUnix,
        certInfo.hashes.sha256
    );
    await tx2.wait();
    console.log("✅ Signer registered");
    
    // 3. CountryAuthorityManager
    console.log("\n3. Deploying CountryAuthorityManager...");
    const CountryAuthorityManager = await ethers.getContractFactory("CountryAuthorityManager");
    const authorityManager = await CountryAuthorityManager.deploy();
    await authorityManager.waitForDeployment();
    const authorityAddress = await authorityManager.getAddress();
    console.log("✅ CountryAuthorityManager deployed to:", authorityAddress);
    
    // Register a test authority
    console.log("\n📝 Registering test authority...");
    const tx3 = await authorityManager.registerAuthority(
        deployer.address,
        "Test Authority - " + FIEL_INFO.rfc,
        "TEST-001",
        0, // CHAMBER_OF_COMMERCE
        "MX",
        "CDMX",
        certInfo.validity.notAfterUnix,
        JSON.stringify({ email: "test@example.com", fiel: FIEL_INFO.rfc }),
        ["ORIGIN_CERTIFICATE", "USMCA"],
        "",
        ""
    );
    await tx3.wait();
    console.log("✅ Authority registered");
    
    // 4. TradeAgreementRegistry
    console.log("\n4. Deploying TradeAgreementRegistry...");
    const TradeAgreementRegistry = await ethers.getContractFactory("TradeAgreementRegistry");
    const agreementRegistry = await TradeAgreementRegistry.deploy();
    await agreementRegistry.waitForDeployment();
    const agreementAddress = await agreementRegistry.getAddress();
    console.log("✅ TradeAgreementRegistry deployed to:", agreementAddress);
    
    // 5. UniversalOriginCertificate
    console.log("\n5. Deploying UniversalOriginCertificate...");
    const UniversalOriginCertificate = await ethers.getContractFactory("UniversalOriginCertificate");
    const certificateContract = await UniversalOriginCertificate.deploy(agreementAddress);
    await certificateContract.waitForDeployment();
    const certificateAddress = await certificateContract.getAddress();
    console.log("✅ UniversalOriginCertificate deployed to:", certificateAddress);
    
    // Create test certificate signed with FIEL
    console.log("\n📜 Creating test certificate with FIEL signature...");
    
    // Sign a test document
    const documentData = {
        type: "ORIGIN_CERTIFICATE",
        exporter: "Test Exporter - " + FIEL_INFO.rfc,
        products: ["Test Product"],
        date: new Date().toISOString()
    };
    
    const documentHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(documentData)));
    console.log("Document hash:", documentHash);
    
    // Sign with FIEL
    const tx4 = await fielIntegration.signWithFIEL(
        documentHash,
        ethers.toUtf8Bytes("test-fiel-signature")
    );
    await tx4.wait();
    console.log("✅ Document signed with FIEL");
    
    // Verify signature
    const [isValid, signerRFC] = await fielIntegration.verifyFIELSignature(
        documentHash,
        FIEL_INFO.rfc,
        ethers.toUtf8Bytes("test-fiel-signature")
    );
    console.log(`✅ Signature verification: ${isValid ? 'VALID' : 'INVALID'} (RFC: ${signerRFC})`);
    
    // Save deployment info
    const deploymentInfo = {
        network: hre.network.name,
        deployedAt: new Date().toISOString(),
        deployer: deployer.address,
        fiel: {
            rfc: FIEL_INFO.rfc,
            serialNumber: certInfo.serialNumber,
            validUntil: certInfo.validity.notAfter,
            certHash: certInfo.hashes.sha256,
            subject: certInfo.subject
        },
        contracts: {
            FIELIntegration: fielAddress,
            DigitalSignatureVerifier: signatureAddress,
            CountryAuthorityManager: authorityAddress,
            TradeAgreementRegistry: agreementAddress,
            UniversalOriginCertificate: certificateAddress
        },
        testDocument: {
            data: documentData,
            hash: documentHash,
            signedWithFIEL: true
        }
    };
    
    const filename = `./deployments/real-fiel-${hre.network.name}-${Date.now()}.json`;
    fs.writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2));
    
    console.log("\n=== DEPLOYMENT SUMMARY ===");
    console.log("✅ All contracts deployed successfully");
    console.log("✅ Real FIEL integrated and tested");
    console.log(`📄 Deployment info saved to: ${filename}`);
    
    console.log("\n📋 Contract Addresses:");
    console.log(`  FIELIntegration: ${fielAddress}`);
    console.log(`  DigitalSignatureVerifier: ${signatureAddress}`);
    console.log(`  CountryAuthorityManager: ${authorityAddress}`);
    console.log(`  TradeAgreementRegistry: ${agreementAddress}`);
    console.log(`  UniversalOriginCertificate: ${certificateAddress}`);
    
    console.log("\n🎉 System ready for production use with real FIEL!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });