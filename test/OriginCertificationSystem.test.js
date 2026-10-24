const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("OriginCertificationSystem", function () {
    let originSystem;
    let fielIntegration;
    let signatureVerifier;
    let authorityManager;
    let agreementRegistry;
    let certificateContract;
    let owner;
    let issuer;
    let exporter;
    let importer;
    let signer1;
    let signer2;

    beforeEach(async function () {
        [owner, issuer, exporter, importer, signer1, signer2] = await ethers.getSigners();

        // Deploy main system (deploys all modules)
        const OriginCertificationSystem = await ethers.getContractFactory("OriginCertificationSystem");
        originSystem = await OriginCertificationSystem.deploy();
        await originSystem.waitForDeployment();

        // Get module addresses
        const moduleAddresses = await originSystem.getModuleAddresses();
        
        // Get module contract instances
        const FIELIntegration = await ethers.getContractFactory("FIELIntegration");
        fielIntegration = FIELIntegration.attach(moduleAddresses.fiel);
        
        const DigitalSignatureVerifier = await ethers.getContractFactory("DigitalSignatureVerifier");
        signatureVerifier = DigitalSignatureVerifier.attach(moduleAddresses.signatures);
        
        const CountryAuthorityManager = await ethers.getContractFactory("CountryAuthorityManager");
        authorityManager = CountryAuthorityManager.attach(moduleAddresses.authorities);
        
        const TradeAgreementRegistry = await ethers.getContractFactory("TradeAgreementRegistry");
        agreementRegistry = TradeAgreementRegistry.attach(moduleAddresses.agreements);
        
        const UniversalOriginCertificate = await ethers.getContractFactory("UniversalOriginCertificate");
        certificateContract = UniversalOriginCertificate.attach(moduleAddresses.certificates);
    });

    describe("System Deployment", function () {
        it("Should deploy all modules correctly", async function () {
            const moduleAddresses = await originSystem.getModuleAddresses();
            
            expect(moduleAddresses.fiel).to.not.equal(ethers.ZeroAddress);
            expect(moduleAddresses.signatures).to.not.equal(ethers.ZeroAddress);
            expect(moduleAddresses.authorities).to.not.equal(ethers.ZeroAddress);
            expect(moduleAddresses.agreements).to.not.equal(ethers.ZeroAddress);
            expect(moduleAddresses.certificatesModule).to.not.equal(ethers.ZeroAddress);
        });

        it("Should initialize system configuration", async function () {
            const config = await originSystem.systemConfig();
            
            expect(config.fielEnabled).to.be.true;
            expect(config.multiCountryEnabled).to.be.true;
            expect(config.kyberEncryptionEnabled).to.be.true;
            expect(config.systemOwner).to.equal(owner.address);
        });

        it("Should initialize trade agreements", async function () {
            expect(await agreementRegistry.isValidAgreement("USMCA")).to.be.true;
            expect(await agreementRegistry.isValidAgreement("CAFTA-DR")).to.be.true;
            expect(await agreementRegistry.isValidAgreement("CPTPP")).to.be.true;
        });
    });

    describe("Authority Management", function () {
        it("Should register Mexican authority", async function () {
            await originSystem.registerAuthority(
                issuer.address,
                "Cámara de Comercio México",
                "CCM123456",
                0, // CHAMBER_OF_COMMERCE
                "MX",
                "CDMX",
                Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60, // 1 year
                '{"email":"info@ccm.mx","phone":"+525555555555"}',
                ["ORIGIN_CERTIFICATE", "USMCA"],
                "https://api.ccm.mx",
                "0x04abcd..."
            );

            const authority = await authorityManager.getAuthority(issuer.address);
            expect(authority.name).to.equal("Cámara de Comercio México");
            expect(authority.country).to.equal("MX");
            expect(authority.isActive).to.be.true;
        });

        it("Should validate issuer authority", async function () {
            // Register authority first
            await originSystem.registerAuthority(
                issuer.address,
                "Cámara de Comercio México",
                "CCM123456",
                0, // CHAMBER_OF_COMMERCE
                "MX",
                "CDMX",
                Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60,
                '{"email":"info@ccm.mx"}',
                ["ORIGIN_CERTIFICATE"],
                "https://api.ccm.mx",
                "0x04abcd..."
            );

            const canIssue = await authorityManager.canIssueCertificate(
                issuer.address,
                "MX",
                "ORIGIN_CERTIFICATE"
            );
            expect(canIssue).to.be.true;
        });
    });

    describe("FIEL Integration", function () {
        it("Should register FIEL certificate", async function () {
            const rfc = "SABM960611SP4";
            const serialNumber = "30001000000300023685";
            const validUntil = Math.floor(Date.now() / 1000) + 4 * 365 * 24 * 60 * 60; // 4 years
            const certHash = "sha256-abcd1234efgh5678";

            await originSystem.connect(exporter).registerFIEL(
                rfc,
                serialNumber,
                validUntil,
                certHash
            );

            const fielInfo = await fielIntegration.getFIELInfo(rfc);
            expect(fielInfo.isActive).to.be.true;
            expect(fielInfo.certificateSerial).to.equal(serialNumber);
            expect(fielInfo.ethereumAddress).to.equal(exporter.address);
        });

        it("Should create FIEL signature", async function () {
            // Register FIEL first
            const rfc = "SABM960611SP4";
            await originSystem.connect(exporter).registerFIEL(
                rfc,
                "30001000000300023685",
                Math.floor(Date.now() / 1000) + 4 * 365 * 24 * 60 * 60,
                "sha256-abcd1234"
            );

            // Create a document hash
            const documentHash = ethers.utils.keccak256(
                ethers.utils.toUtf8Bytes("Test certificate data")
            );

            // Create signature (in real scenario, this would be generated with FIEL)
            const signature = ethers.utils.toUtf8Bytes("mock-fiel-signature");

            // Sign with FIEL
            await fielIntegration.connect(exporter).signWithFIEL(documentHash, signature);

            // Verify signature
            const [isValid, signerRFC] = await fielIntegration.verifyFIELSignature(
                documentHash,
                rfc,
                signature
            );

            expect(isValid).to.be.true;
            expect(signerRFC).to.equal(rfc);
        });
    });

    describe("Certificate Creation", function () {
        beforeEach(async function () {
            // Register authority
            await originSystem.registerAuthority(
                issuer.address,
                "Cámara de Comercio México",
                "CCM123456",
                0, // CHAMBER_OF_COMMERCE
                "MX",
                "CDMX",
                Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60,
                '{"email":"info@ccm.mx"}',
                ["ORIGIN_CERTIFICATE"],
                "https://api.ccm.mx",
                "0x04abcd..."
            );
        });

        it("Should create origin certificate", async function () {
            const exporterDetails = JSON.stringify({
                name: "Exportadora Mexicana SA",
                address: "Av. Reforma 123, CDMX",
                rfc: "EMX123456789",
                email: "info@exportadora.mx"
            });

            const importerDetails = JSON.stringify({
                name: "US Importer Corp",
                address: "123 Main St, New York, NY",
                ein: "12-3456789",
                email: "info@usimporter.com"
            });

            const products = [{
                hsCode: "8703.21.00",
                description: "Motor car with spark-ignition engine",
                quantity: 100,
                unitOfMeasure: "units",
                countryOfOrigin: "MX",
                value: ethers.utils.parseUnits("50000", 6), // $50,000 in 6 decimals
                currency: "USD",
                manufacturer: "Mexican Auto Corp",
                manufacturerCountry: "MX",
                additionalData: "0x"
            }];

            const originCriteria = {
                agreementCode: "USMCA",
                criteriaType: "RVC",
                rvcPercentage: 75,
                rvcMethod: "Transaction",
                cumulationApplied: false,
                deminimisApplied: false,
                specificRule: "Chapter 87 automotive rule",
                proofDocuments: "0x"
            };

            const tx = await originSystem.connect(issuer).createOriginCertificate(
                exporter.address,
                exporterDetails,
                importerDetails,
                "USMCA",
                "MX",
                "US",
                products,
                originCriteria
            );

            const receipt = await tx.wait();
            const event = receipt.events?.find(e => e.event === 'CertificateCreated');
            
            expect(event).to.not.be.undefined;
            expect(event.args.issuer).to.equal(issuer.address);
            expect(event.args.exporter).to.equal(exporter.address);
            expect(event.args.tradeAgreement).to.equal("USMCA");
            expect(event.args.exportCountry).to.equal("MX");
            expect(event.args.importCountry).to.equal("US");
        });

        it("Should fail to create certificate without authority", async function () {
            const products = [{
                hsCode: "8703.21.00",
                description: "Test product",
                quantity: 1,
                unitOfMeasure: "units",
                countryOfOrigin: "MX",
                value: 1000,
                currency: "USD",
                manufacturer: "Test Mfg",
                manufacturerCountry: "MX",
                additionalData: "0x"
            }];

            const criteria = {
                agreementCode: "USMCA",
                criteriaType: "RVC",
                rvcPercentage: 75,
                rvcMethod: "Transaction",
                cumulationApplied: false,
                deminimisApplied: false,
                specificRule: "",
                proofDocuments: "0x"
            };

            await expect(
                originSystem.connect(signer1).createOriginCertificate(
                    exporter.address,
                    "{}",
                    "{}",
                    "USMCA",
                    "MX",
                    "US",
                    products,
                    criteria
                )
            ).to.be.revertedWith("Not authorized to issue certificates");
        });
    });

    describe("Digital Signatures", function () {
        let certificateId;

        beforeEach(async function () {
            // Register authority and create certificate
            await originSystem.registerAuthority(
                issuer.address,
                "Cámara de Comercio México",
                "CCM123456",
                0,
                "MX",
                "CDMX",
                Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60,
                '{"email":"info@ccm.mx"}',
                ["ORIGIN_CERTIFICATE"],
                "https://api.ccm.mx",
                "0x04abcd..."
            );

            const products = [{
                hsCode: "8703.21.00",
                description: "Test product",
                quantity: 1,
                unitOfMeasure: "units",
                countryOfOrigin: "MX",
                value: 1000,
                currency: "USD",
                manufacturer: "Test Mfg",
                manufacturerCountry: "MX",
                additionalData: "0x"
            }];

            const criteria = {
                agreementCode: "USMCA",
                criteriaType: "RVC",
                rvcPercentage: 75,
                rvcMethod: "Transaction",
                cumulationApplied: false,
                deminimisApplied: false,
                specificRule: "",
                proofDocuments: "0x"
            };

            const tx = await originSystem.connect(issuer).createOriginCertificate(
                exporter.address,
                "{}",
                "{}",
                "USMCA",
                "MX",
                "US",
                products,
                criteria
            );

            const receipt = await tx.wait();
            certificateId = receipt.events?.find(e => e.event === 'CertificateCreated')?.args?.certificateId;
        });

        it("Should add FIEL signature to certificate", async function () {
            // Register FIEL
            await originSystem.connect(exporter).registerFIEL(
                "SABM960611SP4",
                "30001000000300023685",
                Math.floor(Date.now() / 1000) + 4 * 365 * 24 * 60 * 60,
                "sha256-cert-hash"
            );

            // Add FIEL signature
            const fielSignature = ethers.utils.toUtf8Bytes("mock-fiel-signature-data");
            
            await expect(
                originSystem.connect(exporter).addFIELSignature(certificateId, fielSignature)
            ).to.emit(originSystem, 'FIELSignatureAdded');

            // Check certificate info
            const certInfo = await originSystem.getCertificateInfo(certificateId);
            expect(certInfo.hasFIELSignature).to.be.true;
            expect(certInfo.status).to.equal(1); // PendingSignatures
        });

        it("Should add multi-country signature", async function () {
            // Register signer
            await originSystem.registerSigner(
                signer1.address,
                "US-CERT-123456",
                "US-PKI",
                "US",
                Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60,
                "us-public-key-hash"
            );

            const metadata = {
                signerRole: "CUSTOMS",
                signerName: "US Customs Officer",
                signerTaxId: "US",
                signatureStandard: "US-PKI",
                additionalData: ethers.utils.defaultAbiCoder.encode(
                    ["string", "string"],
                    ["US", "US-CERT-123456"]
                )
            };

            const signature = ethers.utils.toUtf8Bytes("us-digital-signature");

            await expect(
                originSystem.connect(signer1).addCountrySignature(
                    certificateId,
                    signature,
                    metadata
                )
            ).to.emit(originSystem, 'MultiCountrySignatureAdded');
        });
    });

    describe("Certificate Verification", function () {
        it("Should verify certificate authenticity", async function () {
            // Setup: Register authority, create certificate, add signatures
            await originSystem.registerAuthority(
                issuer.address,
                "Test Authority",
                "TA123",
                0,
                "MX",
                "CDMX",
                Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60,
                '{}',
                ["ORIGIN_CERTIFICATE"],
                "",
                ""
            );

            const products = [{
                hsCode: "1234.56.78",
                description: "Test",
                quantity: 1,
                unitOfMeasure: "units",
                countryOfOrigin: "MX",
                value: 100,
                currency: "USD",
                manufacturer: "Test",
                manufacturerCountry: "MX",
                additionalData: "0x"
            }];

            const criteria = {
                agreementCode: "USMCA",
                criteriaType: "WO",
                rvcPercentage: 0,
                rvcMethod: "",
                cumulationApplied: false,
                deminimisApplied: false,
                specificRule: "",
                proofDocuments: "0x"
            };

            const tx = await originSystem.connect(issuer).createOriginCertificate(
                exporter.address,
                "{}",
                "{}",
                "USMCA",
                "MX",
                "US",
                products,
                criteria
            );

            const receipt = await tx.wait();
            const certificateId = receipt.events?.find(e => e.event === 'CertificateCreated')?.args?.certificateId;

            // Issue certificate
            await originSystem.connect(issuer).issueCertificate(certificateId);

            // Verify certificate
            const verification = await originSystem.verifyCertificate(certificateId);
            
            expect(verification.isValid).to.be.true;
            expect(verification.status).to.equal(2); // Issued
        });
    });

    describe("System Administration", function () {
        it("Should update system configuration", async function () {
            await originSystem.updateSystemConfig(
                false, // fielEnabled
                true,  // multiCountryEnabled
                false, // kyberEncryptionEnabled
                30 * 24 * 60 * 60 // 30 days default validity
            );

            const config = await originSystem.systemConfig();
            expect(config.fielEnabled).to.be.false;
            expect(config.multiCountryEnabled).to.be.true;
            expect(config.kyberEncryptionEnabled).to.be.false;
        });

        it("Should get user statistics", async function () {
            const stats = await originSystem.getUserStats(exporter.address);
            
            expect(stats.totalCertificates).to.be.a('number');
            expect(stats.activeCertificates).to.be.a('number');
            expect(stats.expiredCertificates).to.be.a('number');
            expect(stats.hasFIELRegistered).to.be.a('boolean');
        });

        it("Should only allow owner to register authorities", async function () {
            await expect(
                originSystem.connect(signer1).registerAuthority(
                    signer2.address,
                    "Unauthorized Authority",
                    "UA123",
                    0,
                    "US",
                    "NY",
                    Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60,
                    '{}',
                    ["ORIGIN_CERTIFICATE"],
                    "",
                    ""
                )
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });
    });

    describe("Integration Tests", function () {
        it("Should complete full certificate lifecycle", async function () {
            // 1. Register authority
            await originSystem.registerAuthority(
                issuer.address,
                "Mexican Chamber",
                "MC123",
                0,
                "MX",
                "CDMX",
                Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60,
                '{}',
                ["ORIGIN_CERTIFICATE"],
                "",
                ""
            );

            // 2. Register FIEL
            await originSystem.connect(exporter).registerFIEL(
                "SABM960611SP4",
                "30001000000300023685",
                Math.floor(Date.now() / 1000) + 4 * 365 * 24 * 60 * 60,
                "cert-hash"
            );

            // 3. Create certificate
            const products = [{
                hsCode: "1234.56.78",
                description: "Test Product for Full Lifecycle",
                quantity: 10,
                unitOfMeasure: "pieces",
                countryOfOrigin: "MX",
                value: 10000,
                currency: "USD",
                manufacturer: "Mexican Manufacturer",
                manufacturerCountry: "MX",
                additionalData: "0x"
            }];

            const criteria = {
                agreementCode: "USMCA",
                criteriaType: "RVC",
                rvcPercentage: 75,
                rvcMethod: "Transaction",
                cumulationApplied: false,
                deminimisApplied: false,
                specificRule: "Automotive rule",
                proofDocuments: "0x"
            };

            const createTx = await originSystem.connect(issuer).createOriginCertificate(
                exporter.address,
                JSON.stringify({name: "Exporter Corp"}),
                JSON.stringify({name: "Importer Corp"}),
                "USMCA",
                "MX",
                "US",
                products,
                criteria
            );

            const createReceipt = await createTx.wait();
            const certificateId = createReceipt.events?.find(e => e.event === 'CertificateCreated')?.args?.certificateId;

            // 4. Add FIEL signature
            const fielSignature = ethers.utils.toUtf8Bytes("complete-fiel-signature");
            await originSystem.connect(exporter).addFIELSignature(certificateId, fielSignature);

            // 5. Issue certificate
            await originSystem.connect(issuer).issueCertificate(certificateId);

            // 6. Verify final certificate
            const verification = await originSystem.verifyCertificate(certificateId);
            
            expect(verification.isValid).to.be.true;
            expect(verification.hasValidFIEL).to.be.true;
            expect(verification.status).to.equal(2); // Issued

            const certInfo = await originSystem.getCertificateInfo(certificateId);
            expect(certInfo.status).to.equal(2); // Issued
            expect(certInfo.hasFIELSignature).to.be.true;
        });
    });
});