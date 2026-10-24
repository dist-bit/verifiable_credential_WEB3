const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("UniversalSignatureVerifier", function () {
    let verifier;
    let owner, mexicanSigner, usSigner, euSigner, brazilSigner;
    
    // Test data for different countries
    const MEXICO_CERT = {
        signatureType: 0, // FIEL
        country: "MX",
        identifier: "SABM960611SP4",
        certificateSerial: "30001000000600001557",
        validUntil: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60, // 1 year
        publicKey: ethers.hexlify(ethers.randomBytes(32))
    };
    
    const US_CERT = {
        signatureType: 1, // PKI_X509
        country: "US",
        identifier: "EIN-123456789",
        certificateSerial: "US2024001234",
        validUntil: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60,
        publicKey: ethers.hexlify(ethers.randomBytes(32))
    };
    
    const EU_CERT = {
        signatureType: 2, // EIDAS
        country: "EU",
        identifier: "VAT-ES12345678",
        certificateSerial: "EIDAS2024001",
        validUntil: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60,
        publicKey: ethers.hexlify(ethers.randomBytes(32))
    };
    
    const BRAZIL_CERT = {
        signatureType: 3, // ICP_BRASIL
        country: "BR",
        identifier: "CNPJ-12345678000195",
        certificateSerial: "ICP2024001",
        validUntil: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60,
        publicKey: ethers.hexlify(ethers.randomBytes(32))
    };

    beforeEach(async function () {
        [owner, mexicanSigner, usSigner, euSigner, brazilSigner] = await ethers.getSigners();
        
        const UniversalSignatureVerifier = await ethers.getContractFactory("UniversalSignatureVerifier");
        verifier = await UniversalSignatureVerifier.deploy();
        await verifier.waitForDeployment();
    });

    describe("Certificate Registration", function () {
        it("Should register FIEL certificate from Mexico", async function () {
            await verifier.connect(mexicanSigner).registerCertificate(
                MEXICO_CERT.signatureType,
                MEXICO_CERT.country,
                MEXICO_CERT.identifier,
                MEXICO_CERT.certificateSerial,
                MEXICO_CERT.validUntil,
                MEXICO_CERT.publicKey
            );
            
            const cert = await verifier.signerCertificates(mexicanSigner.address);
            expect(cert.country).to.equal("MX");
            expect(cert.identifier).to.equal("SABM960611SP4");
            expect(cert.isActive).to.be.true;
        });

        it("Should register PKI certificate from USA", async function () {
            await verifier.connect(usSigner).registerCertificate(
                US_CERT.signatureType,
                US_CERT.country,
                US_CERT.identifier,
                US_CERT.certificateSerial,
                US_CERT.validUntil,
                US_CERT.publicKey
            );
            
            const cert = await verifier.signerCertificates(usSigner.address);
            expect(cert.country).to.equal("US");
            expect(cert.identifier).to.equal("EIN-123456789");
            expect(cert.signatureType).to.equal(1); // PKI_X509
        });

        it("Should register eIDAS certificate from EU", async function () {
            await verifier.connect(euSigner).registerCertificate(
                EU_CERT.signatureType,
                EU_CERT.country,
                EU_CERT.identifier,
                EU_CERT.certificateSerial,
                EU_CERT.validUntil,
                EU_CERT.publicKey
            );
            
            const cert = await verifier.signerCertificates(euSigner.address);
            expect(cert.country).to.equal("EU");
            expect(cert.signatureType).to.equal(2); // EIDAS
        });

        it("Should register ICP-Brasil certificate from Brazil", async function () {
            await verifier.connect(brazilSigner).registerCertificate(
                BRAZIL_CERT.signatureType,
                BRAZIL_CERT.country,
                BRAZIL_CERT.identifier,
                BRAZIL_CERT.certificateSerial,
                BRAZIL_CERT.validUntil,
                BRAZIL_CERT.publicKey
            );
            
            const cert = await verifier.signerCertificates(brazilSigner.address);
            expect(cert.country).to.equal("BR");
            expect(cert.signatureType).to.equal(3); // ICP_BRASIL
        });

        it("Should reject expired certificates", async function () {
            const expiredCert = { ...MEXICO_CERT };
            expiredCert.validUntil = Math.floor(Date.now() / 1000) - 1; // Already expired
            
            await expect(
                verifier.connect(mexicanSigner).registerCertificate(
                    expiredCert.signatureType,
                    expiredCert.country,
                    expiredCert.identifier,
                    expiredCert.certificateSerial,
                    expiredCert.validUntil,
                    expiredCert.publicKey
                )
            ).to.be.revertedWith("Certificate must be valid");
        });

        it("Should map identifier to address for lookup", async function () {
            await verifier.connect(mexicanSigner).registerCertificate(
                MEXICO_CERT.signatureType,
                MEXICO_CERT.country,
                MEXICO_CERT.identifier,
                MEXICO_CERT.certificateSerial,
                MEXICO_CERT.validUntil,
                MEXICO_CERT.publicKey
            );
            
            const mappedAddress = await verifier.identifierToAddress(MEXICO_CERT.country, MEXICO_CERT.identifier);
            expect(mappedAddress).to.equal(mexicanSigner.address);
        });
    });

    describe("Document Signing", function () {
        const documentHash = ethers.keccak256(ethers.toUtf8Bytes("Test Origin Certificate Document"));
        const signature = ethers.hexlify(ethers.randomBytes(65)); // Dummy signature
        const metadata = ethers.toUtf8Bytes("Additional metadata");

        beforeEach(async function () {
            // Register certificates for all signers
            await verifier.connect(mexicanSigner).registerCertificate(
                MEXICO_CERT.signatureType,
                MEXICO_CERT.country,
                MEXICO_CERT.identifier,
                MEXICO_CERT.certificateSerial,
                MEXICO_CERT.validUntil,
                MEXICO_CERT.publicKey
            );
            
            await verifier.connect(usSigner).registerCertificate(
                US_CERT.signatureType,
                US_CERT.country,
                US_CERT.identifier,
                US_CERT.certificateSerial,
                US_CERT.validUntil,
                US_CERT.publicKey
            );
        });

        it("Should sign document with FIEL", async function () {
            await verifier.connect(mexicanSigner).signDocument(
                documentHash,
                signature,
                metadata
            );
            
            const signatures = await verifier.getDocumentSignatures(documentHash);
            expect(signatures.length).to.equal(1);
            expect(signatures[0].signerCountry).to.equal("MX");
            expect(signatures[0].signerIdentifier).to.equal("SABM960611SP4");
            expect(signatures[0].signatureType).to.equal(0); // FIEL
        });

        it("Should sign document with multiple signatures from different countries", async function () {
            // Mexican signature
            await verifier.connect(mexicanSigner).signDocument(
                documentHash,
                signature,
                metadata
            );
            
            // US signature
            await verifier.connect(usSigner).signDocument(
                documentHash,
                signature,
                metadata
            );
            
            const signatures = await verifier.getDocumentSignatures(documentHash);
            expect(signatures.length).to.equal(2);
            
            // Verify both signatures are present
            const countries = signatures.map(sig => sig.signerCountry);
            expect(countries).to.include("MX");
            expect(countries).to.include("US");
        });

        it("Should reject signing with inactive certificate", async function () {
            // Revoke certificate first
            await verifier.connect(mexicanSigner).revokeCertificate();
            
            await expect(
                verifier.connect(mexicanSigner).signDocument(
                    documentHash,
                    signature,
                    metadata
                )
            ).to.be.revertedWith("Certificate not active");
        });

        it("Should reject signing with expired certificate", async function () {
            // Register certificate that expires in 1 second
            const shortLivedCert = { ...EU_CERT };
            shortLivedCert.validUntil = Math.floor(Date.now() / 1000) + 1;
            
            await verifier.connect(euSigner).registerCertificate(
                shortLivedCert.signatureType,
                shortLivedCert.country,
                shortLivedCert.identifier,
                shortLivedCert.certificateSerial,
                shortLivedCert.validUntil,
                shortLivedCert.publicKey
            );
            
            // Wait for certificate to expire
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            await expect(
                verifier.connect(euSigner).signDocument(
                    documentHash,
                    signature,
                    metadata
                )
            ).to.be.revertedWith("Certificate expired");
        });
    });

    describe("Signature Verification", function () {
        const documentHash = ethers.keccak256(ethers.toUtf8Bytes("Test Document"));
        
        beforeEach(async function () {
            // Register and sign with Mexican certificate
            await verifier.connect(mexicanSigner).registerCertificate(
                MEXICO_CERT.signatureType,
                MEXICO_CERT.country,
                MEXICO_CERT.identifier,
                MEXICO_CERT.certificateSerial,
                MEXICO_CERT.validUntil,
                MEXICO_CERT.publicKey
            );
            
            await verifier.connect(mexicanSigner).signDocument(
                documentHash,
                ethers.hexlify(ethers.randomBytes(65)),
                ethers.toUtf8Bytes("metadata")
            );
        });

        it("Should verify valid signature", async function () {
            const result = await verifier.verifySignature(documentHash, 0);
            
            expect(result.isValid).to.be.true;
            expect(result.signerIdentifier).to.equal("SABM960611SP4");
            expect(result.signerCountry).to.equal("MX");
            expect(result.signatureType).to.equal(0); // FIEL
            expect(result.ethereumAddress).to.equal(mexicanSigner.address);
        });

        it("Should return invalid for revoked certificate", async function () {
            await verifier.connect(mexicanSigner).revokeCertificate();
            
            const result = await verifier.verifySignature(documentHash, 0);
            expect(result.isValid).to.be.false;
        });

        it("Should verify required signatures by type", async function () {
            // Add US signature
            await verifier.connect(usSigner).registerCertificate(
                US_CERT.signatureType,
                US_CERT.country,
                US_CERT.identifier,
                US_CERT.certificateSerial,
                US_CERT.validUntil,
                US_CERT.publicKey
            );
            
            await verifier.connect(usSigner).signDocument(
                documentHash,
                ethers.hexlify(ethers.randomBytes(65)),
                ethers.toUtf8Bytes("metadata")
            );
            
            // Check that both FIEL and PKI signatures are present
            const hasAll = await verifier.verifyRequiredSignatures(
                documentHash,
                [0, 1], // FIEL and PKI_X509
                ["MX", "US"]
            );
            
            expect(hasAll).to.be.true;
        });

        it("Should return false when required signatures are missing", async function () {
            // Check for signatures that don't exist
            const hasAll = await verifier.verifyRequiredSignatures(
                documentHash,
                [0, 1, 2], // FIEL, PKI_X509, and EIDAS
                ["MX", "US", "EU"]
            );
            
            expect(hasAll).to.be.false;
        });
    });

    describe("Certificate Management", function () {
        it("Should get certificate by identifier", async function () {
            await verifier.connect(mexicanSigner).registerCertificate(
                MEXICO_CERT.signatureType,
                MEXICO_CERT.country,
                MEXICO_CERT.identifier,
                MEXICO_CERT.certificateSerial,
                MEXICO_CERT.validUntil,
                MEXICO_CERT.publicKey
            );
            
            const cert = await verifier.getCertificateByIdentifier("MX", "SABM960611SP4");
            expect(cert.isActive).to.be.true;
            expect(cert.country).to.equal("MX");
            expect(cert.registeredAddress).to.equal(mexicanSigner.address);
        });

        it("Should check if address has valid certificate", async function () {
            // Before registration
            let hasValid = await verifier.hasValidCertificate(mexicanSigner.address);
            expect(hasValid).to.be.false;
            
            // After registration
            await verifier.connect(mexicanSigner).registerCertificate(
                MEXICO_CERT.signatureType,
                MEXICO_CERT.country,
                MEXICO_CERT.identifier,
                MEXICO_CERT.certificateSerial,
                MEXICO_CERT.validUntil,
                MEXICO_CERT.publicKey
            );
            
            hasValid = await verifier.hasValidCertificate(mexicanSigner.address);
            expect(hasValid).to.be.true;
            
            // After revocation
            await verifier.connect(mexicanSigner).revokeCertificate();
            hasValid = await verifier.hasValidCertificate(mexicanSigner.address);
            expect(hasValid).to.be.false;
        });
    });

    describe("Multi-Country Support", function () {
        it("Should support all predefined signature types", async function () {
            const signatureTypes = [0, 1, 2, 3, 4, 5, 6, 7]; // All enum values
            
            for (const sigType of signatureTypes) {
                const isSupported = await verifier.supportedSignatureTypes(sigType);
                expect(isSupported).to.be.true;
            }
        });

        it("Should handle FIRMA_DIGITAL for Latin American countries", async function () {
            const latinAmericanCountries = ["AR", "CL", "CO", "PE"];
            const signers = await ethers.getSigners();
            
            for (let i = 0; i < latinAmericanCountries.length; i++) {
                const country = latinAmericanCountries[i];
                const signer = signers[i + 5]; // Skip already used signers
                
                await verifier.connect(signer).registerCertificate(
                    4, // FIRMA_DIGITAL
                    country,
                    `ID-${country}-123456`,
                    `SERIAL-${country}-001`,
                    Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60,
                    ethers.hexlify(ethers.randomBytes(32))
                );
                
                const cert = await verifier.signerCertificates(signer.address);
                expect(cert.country).to.equal(country);
                expect(cert.signatureType).to.equal(4); // FIRMA_DIGITAL
            }
        });
    });
});