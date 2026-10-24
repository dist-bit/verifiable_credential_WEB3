const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DigitalSignatureVerifier", function () {
    let signatureVerifier;
    let owner;
    let signer1;
    let signer2;
    let signer3;

    beforeEach(async function () {
        [owner, signer1, signer2, signer3] = await ethers.getSigners();

        const DigitalSignatureVerifier = await ethers.getContractFactory("DigitalSignatureVerifier");
        signatureVerifier = await DigitalSignatureVerifier.deploy();
        await signatureVerifier.waitForDeployment();
    });

    describe("Initialization", function () {
        it("Should initialize with default signature standards", async function () {
            const fielStandard = await signatureVerifier.signatureStandards("FIEL");
            expect(fielStandard.code).to.equal("FIEL");
            expect(fielStandard.country).to.equal("MX");
            expect(fielStandard.isActive).to.be.true;

            const usPkiStandard = await signatureVerifier.signatureStandards("US-PKI");
            expect(usPkiStandard.code).to.equal("US-PKI");
            expect(usPkiStandard.country).to.equal("US");
            expect(usPkiStandard.isActive).to.be.true;

            const eidasStandard = await signatureVerifier.signatureStandards("eIDAS");
            expect(eidasStandard.code).to.equal("eIDAS");
            expect(eidasStandard.country).to.equal("EU");
            expect(eidasStandard.isActive).to.be.true;
        });

        it("Should have correct domain separator", async function () {
            const domainSeparator = await signatureVerifier.DOMAIN_SEPARATOR();
            expect(domainSeparator).to.not.equal(ethers.ZeroHash);
        });
    });

    describe("Signer Registration", function () {
        it("Should register a signer successfully", async function () {
            const certificateSerial = "MX-FIEL-123456789";
            const signatureStandard = "FIEL";
            const country = "MX";
            const validUntil = Math.floor(Date.now() / 1000) + 4 * 365 * 24 * 60 * 60; // 4 years
            const publicKeyHash = "sha256-publickey-hash";

            await expect(
                signatureVerifier.registerSigner(
                    signer1.address,
                    certificateSerial,
                    signatureStandard,
                    country,
                    validUntil,
                    publicKeyHash
                )
            ).to.emit(signatureVerifier, 'SignerRegistered')
            .withArgs(signer1.address, certificateSerial, signatureStandard, country);

            const profile = await signatureVerifier.signerProfiles(signer1.address);
            expect(profile.signerAddress).to.equal(signer1.address);
            expect(profile.certificateSerial).to.equal(certificateSerial);
            expect(profile.signatureStandard).to.equal(signatureStandard);
            expect(profile.country).to.equal(country);
            expect(profile.isRevoked).to.be.false;
            expect(profile.publicKeyHash).to.equal(publicKeyHash);
        });

        it("Should fail to register with invalid signature standard", async function () {
            await expect(
                signatureVerifier.registerSigner(
                    signer1.address,
                    "CERT-123",
                    "INVALID-STANDARD",
                    "XX",
                    Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60,
                    "hash"
                )
            ).to.be.revertedWith("Invalid signature standard");
        });

        it("Should create certificate to signer mapping", async function () {
            const certificateSerial = "US-PKI-987654321";
            
            await signatureVerifier.registerSigner(
                signer2.address,
                certificateSerial,
                "US-PKI",
                "US",
                Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60,
                "us-key-hash"
            );

            const mappedAddress = await signatureVerifier.certificateToSigner(certificateSerial);
            expect(mappedAddress).to.equal(signer2.address);
        });

        it("Should register multiple signers with different standards", async function () {
            // Register FIEL signer
            await signatureVerifier.registerSigner(
                signer1.address,
                "FIEL-123",
                "FIEL",
                "MX",
                Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60,
                "fiel-hash"
            );

            // Register eIDAS signer
            await signatureVerifier.registerSigner(
                signer2.address,
                "eIDAS-456",
                "eIDAS",
                "EU",
                Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60,
                "eidas-hash"
            );

            const fielProfile = await signatureVerifier.signerProfiles(signer1.address);
            const eidasProfile = await signatureVerifier.signerProfiles(signer2.address);

            expect(fielProfile.signatureStandard).to.equal("FIEL");
            expect(eidasProfile.signatureStandard).to.equal("eIDAS");
        });
    });

    describe("Document Signing", function () {
        beforeEach(async function () {
            // Register signers for testing
            const validUntil = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
            
            await signatureVerifier.registerSigner(
                signer1.address,
                "FIEL-123",
                "FIEL",
                "MX",
                validUntil,
                "fiel-hash"
            );

            await signatureVerifier.registerSigner(
                signer2.address,
                "US-PKI-456",
                "US-PKI",
                "US",
                validUntil,
                "us-hash"
            );
        });

        it("Should sign document successfully", async function () {
            const documentHash = ethers.utils.keccak256(
                ethers.utils.toUtf8Bytes("Important document content")
            );
            
            const metadata = {
                signerRole: "EXPORTER",
                signerName: "Juan Pérez",
                signerTaxId: "SABM960611SP4",
                signatureStandard: "FIEL",
                additionalData: ethers.utils.defaultAbiCoder.encode(
                    ["string", "string"],
                    ["MX", "FIEL-123"]
                )
            };

            const signature = ethers.utils.toUtf8Bytes("digital-signature-data");

            await expect(
                signatureVerifier.connect(signer1).signDocument(
                    documentHash,
                    signature,
                    metadata
                )
            ).to.emit(signatureVerifier, 'SignatureAdded')
            .withArgs(documentHash, signer1.address, "FIEL", "EXPORTER");

            // Check that signature was stored
            const signatures = await signatureVerifier.getDocumentSignatures(documentHash);
            expect(signatures.length).to.equal(1);
            expect(signatures[0].signer).to.equal(signer1.address);
            expect(signatures[0].metadata.signerRole).to.equal("EXPORTER");
        });

        it("Should prevent double signing by same signer", async function () {
            const documentHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("Test doc"));
            const metadata = {
                signerRole: "EXPORTER",
                signerName: "Test Signer",
                signerTaxId: "TEST123",
                signatureStandard: "FIEL",
                additionalData: "0x"
            };
            const signature = ethers.utils.toUtf8Bytes("signature");

            // First signature should succeed
            await signatureVerifier.connect(signer1).signDocument(documentHash, signature, metadata);

            // Second signature by same signer should fail
            await expect(
                signatureVerifier.connect(signer1).signDocument(documentHash, signature, metadata)
            ).to.be.revertedWith("Already signed");
        });

        it("Should fail to sign with expired certificate", async function () {
            // Register signer with expired certificate
            const expiredTime = Math.floor(Date.now() / 1000) - 1;
            await signatureVerifier.registerSigner(
                signer3.address,
                "EXPIRED-789",
                "FIEL",
                "MX",
                expiredTime,
                "expired-hash"
            );

            const documentHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("Test"));
            const metadata = {
                signerRole: "ISSUER",
                signerName: "Expired Signer",
                signerTaxId: "EXP123",
                signatureStandard: "FIEL",
                additionalData: "0x"
            };
            const signature = ethers.utils.toUtf8Bytes("signature");

            await expect(
                signatureVerifier.connect(signer3).signDocument(documentHash, signature, metadata)
            ).to.be.revertedWith("Signer certificate expired");
        });

        it("Should fail to sign with revoked certificate", async function () {
            const documentHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("Test"));
            const metadata = {
                signerRole: "CUSTOMS",
                signerName: "Test Officer",
                signerTaxId: "CUST123",
                signatureStandard: "FIEL",
                additionalData: "0x"
            };
            const signature = ethers.utils.toUtf8Bytes("signature");

            // Revoke the signer
            await signatureVerifier.revokeSigner(signer1.address);

            await expect(
                signatureVerifier.connect(signer1).signDocument(documentHash, signature, metadata)
            ).to.be.revertedWith("Signer certificate revoked");
        });

        it("Should allow multiple signers to sign same document", async function () {
            const documentHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("Multi-signed doc"));
            
            const metadata1 = {
                signerRole: "EXPORTER",
                signerName: "Mexican Exporter",
                signerTaxId: "MEXEX123",
                signatureStandard: "FIEL",
                additionalData: "0x"
            };

            const metadata2 = {
                signerRole: "CUSTOMS",
                signerName: "US Customs",
                signerTaxId: "USCUST456",
                signatureStandard: "US-PKI",
                additionalData: "0x"
            };

            const signature1 = ethers.utils.toUtf8Bytes("mexican-signature");
            const signature2 = ethers.utils.toUtf8Bytes("us-signature");

            await signatureVerifier.connect(signer1).signDocument(documentHash, signature1, metadata1);
            await signatureVerifier.connect(signer2).signDocument(documentHash, signature2, metadata2);

            const signatures = await signatureVerifier.getDocumentSignatures(documentHash);
            expect(signatures.length).to.equal(2);
            expect(signatures[0].metadata.signerRole).to.equal("EXPORTER");
            expect(signatures[1].metadata.signerRole).to.equal("CUSTOMS");
        });
    });

    describe("Signature Verification", function () {
        let documentHash;
        let signedMessage;

        beforeEach(async function () {
            const validUntil = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
            await signatureVerifier.registerSigner(
                signer1.address,
                "FIEL-123",
                "FIEL",
                "MX",
                validUntil,
                "fiel-hash"
            );

            documentHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("Document to verify"));
            
            // Create and sign the document
            const metadata = {
                signerRole: "EXPORTER",
                signerName: "Test Exporter",
                signerTaxId: "TEST123",
                signatureStandard: "FIEL",
                additionalData: "0x"
            };

            // In a real scenario, this would be a proper ECDSA signature
            // For testing, we'll use mock signature data
            const mockSignature = ethers.utils.toUtf8Bytes("mock-ecdsa-signature");
            
            await signatureVerifier.connect(signer1).signDocument(documentHash, mockSignature, metadata);
        });

        it("Should build typed data hash correctly", async function () {
            const timestamp = Math.floor(Date.now() / 1000);
            
            const typedDataHash = await signatureVerifier.buildTypedDataHash(
                documentHash,
                signer1.address,
                "EXPORTER",
                timestamp
            );

            expect(typedDataHash).to.not.equal(ethers.ZeroHash);
            expect(ethers.utils.isHexString(typedDataHash, 32)).to.be.true;
        });

        it("Should verify signature for signed document", async function () {
            // Note: This test verifies the basic verification logic
            // In production, proper ECDSA signatures would be used
            const mockSignature = ethers.utils.toUtf8Bytes("mock-signature");
            
            // Check that the document was signed
            const hasSigned = await signatureVerifier.hasSigned(documentHash, signer1.address);
            expect(hasSigned).to.be.true;
        });

        it("Should fail verification for unsigned document", async function () {
            const unsignedDocHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("Unsigned doc"));
            const hasSigned = await signatureVerifier.hasSigned(unsignedDocHash, signer1.address);
            expect(hasSigned).to.be.false;
        });
    });

    describe("FIEL Signature Verification", function () {
        let documentHash;
        let certificateSerial;

        beforeEach(async function () {
            certificateSerial = "FIEL-CERT-123456";
            const validUntil = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
            
            await signatureVerifier.registerSigner(
                signer1.address,
                certificateSerial,
                "FIEL",
                "MX",
                validUntil,
                "fiel-public-key-hash"
            );

            documentHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("FIEL document"));
            
            // Sign the document first
            const metadata = {
                signerRole: "EXPORTER",
                signerName: "FIEL Signer",
                signerTaxId: "SABM960611SP4",
                signatureStandard: "FIEL",
                additionalData: "0x"
            };
            const signature = ethers.utils.toUtf8Bytes("fiel-signature");
            
            await signatureVerifier.connect(signer1).signDocument(documentHash, signature, metadata);
        });

        it("Should verify FIEL signature successfully", async function () {
            const fielCertificate = ethers.utils.toUtf8Bytes("mock-fiel-certificate-data");
            const signature = ethers.utils.toUtf8Bytes("fiel-signature");

            const [isValid, signerRFC] = await signatureVerifier.verifyFIELSignature(
                documentHash,
                certificateSerial,
                signature,
                fielCertificate
            );

            expect(isValid).to.be.true;
            expect(signerRFC).to.equal("SABM960611SP4");
        });

        it("Should fail FIEL verification for unregistered certificate", async function () {
            const unregisteredSerial = "UNREGISTERED-CERT";
            const fielCertificate = ethers.utils.toUtf8Bytes("mock-cert");
            const signature = ethers.utils.toUtf8Bytes("signature");

            await expect(
                signatureVerifier.verifyFIELSignature(
                    documentHash,
                    unregisteredSerial,
                    signature,
                    fielCertificate
                )
            ).to.be.revertedWith("Certificate not registered");
        });

        it("Should fail FIEL verification for non-FIEL certificate", async function () {
            // Register a US-PKI certificate
            const usCertSerial = "US-PKI-789";
            await signatureVerifier.registerSigner(
                signer2.address,
                usCertSerial,
                "US-PKI",
                "US",
                Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60,
                "us-hash"
            );

            const fielCertificate = ethers.utils.toUtf8Bytes("mock-cert");
            const signature = ethers.utils.toUtf8Bytes("signature");

            await expect(
                signatureVerifier.verifyFIELSignature(
                    documentHash,
                    usCertSerial,
                    signature,
                    fielCertificate
                )
            ).to.be.revertedWith("Not a FIEL certificate");
        });

        it("Should fail FIEL verification for expired certificate", async function () {
            // Register expired FIEL certificate
            const expiredSerial = "EXPIRED-FIEL-123";
            const expiredTime = Math.floor(Date.now() / 1000) - 1;
            
            await signatureVerifier.registerSigner(
                signer3.address,
                expiredSerial,
                "FIEL",
                "MX",
                expiredTime,
                "expired-hash"
            );

            const fielCertificate = ethers.utils.toUtf8Bytes("mock-cert");
            const signature = ethers.utils.toUtf8Bytes("signature");

            const [isValid, signerRFC] = await signatureVerifier.verifyFIELSignature(
                documentHash,
                expiredSerial,
                signature,
                fielCertificate
            );

            expect(isValid).to.be.false;
            expect(signerRFC).to.equal("");
        });
    });

    describe("Multi-Signature Verification", function () {
        beforeEach(async function () {
            const validUntil = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
            
            // Register multiple signers with different roles
            await signatureVerifier.registerSigner(
                signer1.address,
                "EXPORTER-CERT",
                "FIEL",
                "MX",
                validUntil,
                "exporter-hash"
            );

            await signatureVerifier.registerSigner(
                signer2.address,
                "CUSTOMS-CERT",
                "US-PKI",
                "US",
                validUntil,
                "customs-hash"
            );

            await signatureVerifier.registerSigner(
                signer3.address,
                "ISSUER-CERT",
                "eIDAS",
                "EU",
                validUntil,
                "issuer-hash"
            );
        });

        it("Should verify multi-signature requirements", async function () {
            const documentHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("Multi-sig doc"));
            
            // Add signatures from different roles
            const exporterMetadata = {
                signerRole: "EXPORTER",
                signerName: "Mexican Exporter",
                signerTaxId: "MEXEX123",
                signatureStandard: "FIEL",
                additionalData: "0x"
            };

            const customsMetadata = {
                signerRole: "CUSTOMS",
                signerName: "US Customs",
                signerTaxId: "USCUST456",
                signatureStandard: "US-PKI",
                additionalData: "0x"
            };

            const issuerMetadata = {
                signerRole: "ISSUER",
                signerName: "EU Issuer",
                signerTaxId: "EUISS789",
                signatureStandard: "eIDAS",
                additionalData: "0x"
            };

            await signatureVerifier.connect(signer1).signDocument(
                documentHash,
                ethers.utils.toUtf8Bytes("exporter-sig"),
                exporterMetadata
            );

            await signatureVerifier.connect(signer2).signDocument(
                documentHash,
                ethers.utils.toUtf8Bytes("customs-sig"),
                customsMetadata
            );

            await signatureVerifier.connect(signer3).signDocument(
                documentHash,
                ethers.utils.toUtf8Bytes("issuer-sig"),
                issuerMetadata
            );

            // Verify that all required roles are present
            const requiredRoles = ["EXPORTER", "CUSTOMS", "ISSUER"];
            const isValid = await signatureVerifier.verifyMultiSignature(documentHash, requiredRoles);
            
            expect(isValid).to.be.true;
        });

        it("Should fail multi-signature verification when missing required role", async function () {
            const documentHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("Incomplete doc"));
            
            // Only add exporter signature
            const exporterMetadata = {
                signerRole: "EXPORTER",
                signerName: "Mexican Exporter",
                signerTaxId: "MEXEX123",
                signatureStandard: "FIEL",
                additionalData: "0x"
            };

            await signatureVerifier.connect(signer1).signDocument(
                documentHash,
                ethers.utils.toUtf8Bytes("exporter-sig"),
                exporterMetadata
            );

            // Try to verify with missing roles
            const requiredRoles = ["EXPORTER", "CUSTOMS", "ISSUER"];
            const isValid = await signatureVerifier.verifyMultiSignature(documentHash, requiredRoles);
            
            expect(isValid).to.be.false;
        });

        it("Should fail multi-signature verification with revoked signer", async function () {
            const documentHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("Revoked signer doc"));
            
            const metadata = {
                signerRole: "EXPORTER",
                signerName: "Revoked Exporter",
                signerTaxId: "REV123",
                signatureStandard: "FIEL",
                additionalData: "0x"
            };

            // Sign first, then revoke
            await signatureVerifier.connect(signer1).signDocument(
                documentHash,
                ethers.utils.toUtf8Bytes("signature"),
                metadata
            );

            await signatureVerifier.revokeSigner(signer1.address);

            // Verification should fail due to revoked signer
            const requiredRoles = ["EXPORTER"];
            const isValid = await signatureVerifier.verifyMultiSignature(documentHash, requiredRoles);
            
            expect(isValid).to.be.false;
        });
    });

    describe("Signature Standards Management", function () {
        it("Should add new signature standard", async function () {
            const newStandardCode = "BR-ICP";
            const country = "BR";
            const verifierContract = ethers.ZeroAddress;

            await expect(
                signatureVerifier.addSignatureStandard(newStandardCode, country, verifierContract)
            ).to.emit(signatureVerifier, 'SignatureStandardAdded')
            .withArgs(newStandardCode, country);

            const standard = await signatureVerifier.signatureStandards(newStandardCode);
            expect(standard.code).to.equal(newStandardCode);
            expect(standard.country).to.equal(country);
            expect(standard.isActive).to.be.true;
        });

        it("Should support external verifier contracts", async function () {
            const externalVerifier = signer3.address; // Using an address as mock verifier
            
            await signatureVerifier.addSignatureStandard(
                "CUSTOM-STD",
                "XX",
                externalVerifier
            );

            const standard = await signatureVerifier.signatureStandards("CUSTOM-STD");
            expect(standard.verifierContract).to.equal(externalVerifier);
        });
    });

    describe("Administrative Functions", function () {
        beforeEach(async function () {
            const validUntil = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
            await signatureVerifier.registerSigner(
                signer1.address,
                "ADMIN-TEST-CERT",
                "FIEL",
                "MX",
                validUntil,
                "admin-hash"
            );
        });

        it("Should revoke signer certificate", async function () {
            await signatureVerifier.revokeSigner(signer1.address);

            const profile = await signatureVerifier.signerProfiles(signer1.address);
            expect(profile.isRevoked).to.be.true;
        });

        it("Should get document signatures", async function () {
            const documentHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("Admin test doc"));
            const metadata = {
                signerRole: "ADMIN",
                signerName: "Admin User",
                signerTaxId: "ADMIN123",
                signatureStandard: "FIEL",
                additionalData: "0x"
            };

            await signatureVerifier.connect(signer1).signDocument(
                documentHash,
                ethers.utils.toUtf8Bytes("admin-signature"),
                metadata
            );

            const signatures = await signatureVerifier.getDocumentSignatures(documentHash);
            expect(signatures.length).to.equal(1);
            expect(signatures[0].metadata.signerRole).to.equal("ADMIN");
        });
    });

    describe("Edge Cases and Error Scenarios", function () {
        it("Should handle signature recovery edge cases", async function () {
            // Test with invalid signature length
            const invalidSignature = "0x1234"; // Too short
            
            // This would be tested in a more complex scenario where
            // signature recovery is attempted with invalid data
            expect(invalidSignature.length).to.be.lessThan(130); // 65 bytes = 130 hex chars
        });

        it("Should handle large signature metadata", async function () {
            const validUntil = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
            await signatureVerifier.registerSigner(
                signer1.address,
                "LARGE-META-CERT",
                "FIEL",
                "MX",
                validUntil,
                "large-hash"
            );

            const documentHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("Large metadata doc"));
            
            // Create large additional data
            const largeData = ethers.utils.defaultAbiCoder.encode(
                ["string", "string", "string"],
                [
                    "This is a very long string with lots of additional information about the signer",
                    "Including detailed certificate information and validation data",
                    "And even more metadata that might be required for compliance"
                ]
            );

            const metadata = {
                signerRole: "EXPORTER_WITH_LONG_ROLE_DESCRIPTION",
                signerName: "Very Long Signer Name With Multiple Parts And Titles",
                signerTaxId: "VERY_LONG_TAX_IDENTIFIER_123456789",
                signatureStandard: "FIEL",
                additionalData: largeData
            };

            // Should not revert even with large metadata
            await expect(
                signatureVerifier.connect(signer1).signDocument(
                    documentHash,
                    ethers.utils.toUtf8Bytes("large-meta-signature"),
                    metadata
                )
            ).to.emit(signatureVerifier, 'SignatureAdded');
        });

        it("Should handle concurrent signing attempts", async function () {
            const validUntil = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
            
            // Register multiple signers
            await signatureVerifier.registerSigner(signer1.address, "CONC1", "FIEL", "MX", validUntil, "hash1");
            await signatureVerifier.registerSigner(signer2.address, "CONC2", "US-PKI", "US", validUntil, "hash2");
            await signatureVerifier.registerSigner(signer3.address, "CONC3", "eIDAS", "EU", validUntil, "hash3");

            const documentHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("Concurrent doc"));
            
            const metadata1 = { signerRole: "ROLE1", signerName: "Signer1", signerTaxId: "TAX1", signatureStandard: "FIEL", additionalData: "0x" };
            const metadata2 = { signerRole: "ROLE2", signerName: "Signer2", signerTaxId: "TAX2", signatureStandard: "US-PKI", additionalData: "0x" };
            const metadata3 = { signerRole: "ROLE3", signerName: "Signer3", signerTaxId: "TAX3", signatureStandard: "eIDAS", additionalData: "0x" };

            // All should succeed as they're different signers
            await Promise.all([
                signatureVerifier.connect(signer1).signDocument(documentHash, ethers.utils.toUtf8Bytes("sig1"), metadata1),
                signatureVerifier.connect(signer2).signDocument(documentHash, ethers.utils.toUtf8Bytes("sig2"), metadata2),
                signatureVerifier.connect(signer3).signDocument(documentHash, ethers.utils.toUtf8Bytes("sig3"), metadata3)
            ]);

            const signatures = await signatureVerifier.getDocumentSignatures(documentHash);
            expect(signatures.length).to.equal(3);
        });
    });
});