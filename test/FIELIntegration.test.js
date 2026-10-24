const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("FIELIntegration", function () {
    let fielIntegration;
    let owner;
    let user1;
    let user2;
    let user3;

    const RFC1 = "SABM960611SP4"; // Tu FIEL real
    const RFC2 = "XAXX010101000"; // RFC genérico para pruebas
    const SERIAL1 = "30001000000600001557"; // Serial de tu FIEL
    const SERIAL2 = "30001000000300023686"; // Serial genérico

    beforeEach(async function () {
        [owner, user1, user2, user3] = await ethers.getSigners();

        const FIELIntegration = await ethers.getContractFactory("FIELIntegration");
        fielIntegration = await FIELIntegration.deploy();
        await fielIntegration.waitForDeployment();
    });

    describe("FIEL Registration", function () {
        it("Should register FIEL certificate successfully", async function () {
            const validUntil = Math.floor(Date.now() / 1000) + 4 * 365 * 24 * 60 * 60; // 4 years
            const certHash = "sha256-abcd1234efgh5678";

            await expect(
                fielIntegration.connect(user1).registerFIEL(
                    RFC1,
                    SERIAL1,
                    validUntil,
                    certHash
                )
            ).to.emit(fielIntegration, 'FIELRegistered')
            .withArgs(RFC1, user1.address, SERIAL1);

            const fielInfo = await fielIntegration.getFIELInfo(RFC1);
            expect(fielInfo.isActive).to.be.true;
            expect(fielInfo.certificateSerial).to.equal(SERIAL1);
            expect(fielInfo.ethereumAddress).to.equal(user1.address);
            expect(fielInfo.validUntil).to.equal(validUntil);
        });

        it("Should fail to register FIEL with empty RFC", async function () {
            await expect(
                fielIntegration.connect(user1).registerFIEL(
                    "",
                    SERIAL1,
                    Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60,
                    "hash"
                )
            ).to.be.revertedWith("RFC required");
        });

        it("Should fail to register FIEL with empty certificate serial", async function () {
            await expect(
                fielIntegration.connect(user1).registerFIEL(
                    RFC1,
                    "",
                    Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60,
                    "hash"
                )
            ).to.be.revertedWith("Certificate serial required");
        });

        it("Should update address to RFC mapping", async function () {
            const validUntil = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
            
            await fielIntegration.connect(user1).registerFIEL(
                RFC1,
                SERIAL1,
                validUntil,
                "hash1"
            );

            const rfc = await fielIntegration.addressToRFC(user1.address);
            expect(rfc).to.equal(RFC1);
        });

        it("Should allow multiple users to register different RFCs", async function () {
            const validUntil = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;

            await fielIntegration.connect(user1).registerFIEL(RFC1, SERIAL1, validUntil, "hash1");
            await fielIntegration.connect(user2).registerFIEL(RFC2, SERIAL2, validUntil, "hash2");

            const rfc1 = await fielIntegration.addressToRFC(user1.address);
            const rfc2 = await fielIntegration.addressToRFC(user2.address);

            expect(rfc1).to.equal(RFC1);
            expect(rfc2).to.equal(RFC2);
        });
    });

    describe("FIEL Signing", function () {
        beforeEach(async function () {
            const validUntil = Math.floor(Date.now() / 1000) + 4 * 365 * 24 * 60 * 60;
            await fielIntegration.connect(user1).registerFIEL(RFC1, SERIAL1, validUntil, "hash1");
        });

        it("Should sign document with FIEL", async function () {
            const documentHash = ethers.keccak256(
                ethers.toUtf8Bytes("Test document content")
            );
            const signature = ethers.toUtf8Bytes("mock-fiel-signature-data");

            await expect(
                fielIntegration.connect(user1).signWithFIEL(documentHash, signature)
            ).to.emit(fielIntegration, 'FIELSignatureAdded')
            .withArgs(documentHash, RFC1);

            // Check that signature was stored
            const signatures = await fielIntegration.documentSignatures(documentHash, 0);
            expect(signatures.rfc).to.equal(RFC1);
            expect(signatures.isValid).to.be.true;
        });

        it("Should fail to sign without registered FIEL", async function () {
            const documentHash = ethers.keccak256(
                ethers.toUtf8Bytes("Test document")
            );
            const signature = ethers.toUtf8Bytes("signature");

            await expect(
                fielIntegration.connect(user2).signWithFIEL(documentHash, signature)
            ).to.be.revertedWith("FIEL not registered");
        });

        it("Should fail to sign with expired FIEL", async function () {
            // Register expired FIEL
            const expiredTime = Math.floor(Date.now() / 1000) - 1; // 1 second ago
            await fielIntegration.connect(user2).registerFIEL(RFC2, SERIAL2, expiredTime, "hash2");

            const documentHash = ethers.keccak256(ethers.toUtf8Bytes("Test"));
            const signature = ethers.toUtf8Bytes("signature");

            await expect(
                fielIntegration.connect(user2).signWithFIEL(documentHash, signature)
            ).to.be.revertedWith("FIEL expired");
        });

        it("Should store signature metadata correctly", async function () {
            const documentHash = ethers.keccak256(
                ethers.toUtf8Bytes("Important document")
            );
            const signature = ethers.toUtf8Bytes("detailed-signature-data");

            await fielIntegration.connect(user1).signWithFIEL(documentHash, signature);

            const storedSig = await fielIntegration.documentSignatures(documentHash, 0);
            expect(storedSig.documentHash).to.equal(documentHash);
            expect(storedSig.rfc).to.equal(RFC1);
            expect(storedSig.certificateSerial).to.equal(SERIAL1);
            expect(storedSig.isValid).to.be.true;
            expect(storedSig.timestamp).to.be.greaterThan(0);
        });
    });

    describe("FIEL Verification", function () {
        let documentHash;
        let signature;

        beforeEach(async function () {
            const validUntil = Math.floor(Date.now() / 1000) + 4 * 365 * 24 * 60 * 60;
            await fielIntegration.connect(user1).registerFIEL(RFC1, SERIAL1, validUntil, "hash1");

            documentHash = ethers.keccak256(
                ethers.toUtf8Bytes("Document to verify")
            );
            signature = ethers.toUtf8Bytes("verification-signature");

            await fielIntegration.connect(user1).signWithFIEL(documentHash, signature);
        });

        it("Should verify valid FIEL signature", async function () {
            const [isValid, signerRFC] = await fielIntegration.verifyFIELSignature(
                documentHash,
                RFC1,
                signature
            );

            expect(isValid).to.be.true;
            expect(signerRFC).to.equal(RFC1);
        });

        it("Should reject verification for inactive FIEL", async function () {
            // Revoke FIEL
            await fielIntegration.connect(user1).revokeFIEL(RFC1);

            const [isValid, signerRFC] = await fielIntegration.verifyFIELSignature(
                documentHash,
                RFC1,
                signature
            );

            expect(isValid).to.be.false;
            expect(signerRFC).to.equal("");
        });

        it("Should reject verification for expired FIEL", async function () {
            // Register new FIEL that's already expired
            const expiredTime = Math.floor(Date.now() / 1000) - 1;
            await fielIntegration.connect(user2).registerFIEL(RFC2, SERIAL2, expiredTime, "hash2");

            // Try to verify (should fail due to expired cert)
            const [isValid, signerRFC] = await fielIntegration.verifyFIELSignature(
                documentHash,
                RFC2,
                signature
            );

            expect(isValid).to.be.false;
            expect(signerRFC).to.equal("");
        });

        it("Should reject verification for wrong signature", async function () {
            const wrongSignature = ethers.toUtf8Bytes("wrong-signature-data");

            const [isValid, signerRFC] = await fielIntegration.verifyFIELSignature(
                documentHash,
                RFC1,
                wrongSignature
            );

            expect(isValid).to.be.false;
            expect(signerRFC).to.equal("");
        });

        it("Should reject verification for non-existent signature", async function () {
            const newDocumentHash = ethers.keccak256(
                ethers.toUtf8Bytes("Never signed document")
            );

            const [isValid, signerRFC] = await fielIntegration.verifyFIELSignature(
                newDocumentHash,
                RFC1,
                signature
            );

            expect(isValid).to.be.false;
            expect(signerRFC).to.equal("");
        });
    });

    describe("FIEL Management", function () {
        beforeEach(async function () {
            const validUntil = Math.floor(Date.now() / 1000) + 4 * 365 * 24 * 60 * 60;
            await fielIntegration.connect(user1).registerFIEL(RFC1, SERIAL1, validUntil, "hash1");
        });

        it("Should allow FIEL owner to revoke their own FIEL", async function () {
            await expect(
                fielIntegration.connect(user1).revokeFIEL(RFC1)
            ).to.emit(fielIntegration, 'FIELRevoked')
            .withArgs(RFC1);

            const fielInfo = await fielIntegration.getFIELInfo(RFC1);
            expect(fielInfo.isActive).to.be.false;
        });

        it("Should get complete FIEL information", async function () {
            const fielInfo = await fielIntegration.getFIELInfo(RFC1);
            
            expect(fielInfo.isActive).to.be.true;
            expect(fielInfo.certificateSerial).to.equal(SERIAL1);
            expect(fielInfo.ethereumAddress).to.equal(user1.address);
            expect(fielInfo.validUntil).to.be.greaterThan(Math.floor(Date.now() / 1000));
        });

        it("Should return default values for non-existent FIEL", async function () {
            const fielInfo = await fielIntegration.getFIELInfo("NONEXISTENT123");
            
            expect(fielInfo.isActive).to.be.false;
            expect(fielInfo.certificateSerial).to.equal("");
            expect(fielInfo.ethereumAddress).to.equal(ethers.ZeroAddress);
            expect(fielInfo.validUntil).to.equal(0);
        });
    });

    describe("Multi-Country Signature Support", function () {
        let multiCountryVerifier;

        beforeEach(async function () {
            const MultiCountrySignatureVerifier = await ethers.getContractFactory("MultiCountrySignatureVerifier");
            multiCountryVerifier = await MultiCountrySignatureVerifier.deploy();
            await multiCountryVerifier.waitForDeployment();

            // Register FIEL for Mexico
            const validUntil = Math.floor(Date.now() / 1000) + 4 * 365 * 24 * 60 * 60;
            await multiCountryVerifier.connect(user1).registerFIEL(RFC1, SERIAL1, validUntil, "hash1");
        });

        it("Should add FIEL signature through multi-country verifier", async function () {
            const documentHash = ethers.keccak256(
                ethers.toUtf8Bytes("Multi-country document")
            );
            const signature = ethers.toUtf8Bytes("mexico-fiel-signature");

            await expect(
                multiCountryVerifier.connect(user1).addCountrySignature(
                    documentHash,
                    "MX",
                    SERIAL1,
                    signature
                )
            ).to.emit(multiCountryVerifier, 'FIELSignatureAdded');
        });

        it("Should add non-FIEL country signature", async function () {
            const documentHash = ethers.keccak256(
                ethers.toUtf8Bytes("US document")
            );
            const signature = ethers.toUtf8Bytes("us-pki-signature");

            await multiCountryVerifier.connect(user2).addCountrySignature(
                documentHash,
                "US",
                "US-CERT-123456",
                signature
            );

            const countrySignatures = await multiCountryVerifier.documentCountrySignatures(documentHash, 0);
            expect(countrySignatures.country).to.equal("US");
            expect(countrySignatures.signer).to.equal(user2.address);
        });

        it("Should verify FIEL signature through multi-country verifier", async function () {
            const documentHash = ethers.keccak256(ethers.toUtf8Bytes("Test doc"));
            const signature = ethers.toUtf8Bytes("test-signature");

            // Add FIEL signature
            await multiCountryVerifier.connect(user1).addCountrySignature(
                documentHash,
                "MX", 
                SERIAL1,
                signature
            );

            // Verify signature
            const isValid = await multiCountryVerifier.verifyCountrySignature(
                documentHash,
                "MX",
                0 // signature index
            );

            expect(isValid).to.be.true;
        });

        it("Should handle signature recovery for non-FIEL signatures", async function () {
            const documentHash = ethers.keccak256(ethers.toUtf8Bytes("Test message"));
            
            // Create a proper ECDSA signature
            const messageHash = ethers.keccak256(
                ethers.solidityPacked(
                    ["string", "bytes32"],
                    ["\x19Ethereum Signed Message:\n32", documentHash]
                )
            );
            
            const signature = await user2.signMessage(documentHash);

            await multiCountryVerifier.connect(user2).addCountrySignature(
                documentHash,
                "US",
                "US-CERT-789",
                signature
            );

            const isValid = await multiCountryVerifier.verifyCountrySignature(
                documentHash,
                "US",
                0
            );

            expect(isValid).to.be.true;
        });
    });

    describe("Utility Functions", function () {
        it("Should parse RFC from certificate data", async function () {
            const certificateData = ethers.toUtf8Bytes("mock-certificate-data");
            
            const rfc = await fielIntegration.parseRFCFromCertificate(certificateData);
            
            // This is a placeholder implementation that returns the hardcoded RFC
            expect(rfc).to.equal("SABM960611SP4");
        });

        it("Should build FIEL message hash", async function () {
            const documentHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
            const rfc = RFC1;
            const timestamp = Math.floor(Date.now() / 1000);

            const messageHash = await fielIntegration.buildFIELMessage(
                documentHash,
                rfc,
                timestamp
            );

            expect(messageHash).to.not.equal(ethers.ZeroHash);
            
            // Verify it's a proper hash
            expect(ethers.isHexString(messageHash, 32)).to.be.true;
        });

        it("Should build consistent message hashes", async function () {
            const documentHash = ethers.keccak256(ethers.toUtf8Bytes("consistent"));
            const rfc = RFC1;
            const timestamp = 1640995200; // Fixed timestamp

            const hash1 = await fielIntegration.buildFIELMessage(documentHash, rfc, timestamp);
            const hash2 = await fielIntegration.buildFIELMessage(documentHash, rfc, timestamp);

            expect(hash1).to.equal(hash2);
        });
    });

    describe("Edge Cases and Error Handling", function () {
        it("Should handle multiple signatures on same document", async function () {
            const validUntil = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
            
            // Register two different FIELs
            await fielIntegration.connect(user1).registerFIEL(RFC1, SERIAL1, validUntil, "hash1");
            await fielIntegration.connect(user2).registerFIEL(RFC2, SERIAL2, validUntil, "hash2");

            const documentHash = ethers.keccak256(ethers.toUtf8Bytes("Multi-signed doc"));
            const sig1 = ethers.toUtf8Bytes("signature1");
            const sig2 = ethers.toUtf8Bytes("signature2");

            // Both users sign the same document
            await fielIntegration.connect(user1).signWithFIEL(documentHash, sig1);
            await fielIntegration.connect(user2).signWithFIEL(documentHash, sig2);

            // Verify both signatures
            const [valid1, rfc1] = await fielIntegration.verifyFIELSignature(documentHash, RFC1, sig1);
            const [valid2, rfc2] = await fielIntegration.verifyFIELSignature(documentHash, RFC2, sig2);

            expect(valid1).to.be.true;
            expect(rfc1).to.equal(RFC1);
            expect(valid2).to.be.true;
            expect(rfc2).to.equal(RFC2);
        });

        it("Should handle zero address for owner function", async function () {
            // This tests the placeholder owner() function
            // In a real implementation, this would be inherited from Ownable
            const ownerAddress = await fielIntegration.owner();
            expect(ownerAddress).to.equal(ethers.ZeroAddress);
        });

        it("Should handle empty signature data", async function () {
            const validUntil = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
            await fielIntegration.connect(user1).registerFIEL(RFC1, SERIAL1, validUntil, "hash1");

            const documentHash = ethers.keccak256(ethers.toUtf8Bytes("Empty sig test"));
            const emptySignature = "0x";

            // This should not revert but should store the empty signature
            await fielIntegration.connect(user1).signWithFIEL(documentHash, emptySignature);

            const storedSig = await fielIntegration.documentSignatures(documentHash, 0);
            expect(storedSig.rfc).to.equal(RFC1);
        });
    });
});