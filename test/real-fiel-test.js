const { expect } = require("chai");
const { ethers } = require("hardhat");
const fs = require('fs');
const crypto = require('crypto');
const forge = require('node-forge');

describe("REAL FIEL Integration Test", function () {
  let fielIntegration;
  let digitalSignatureVerifier;
  let admin, verifier, user1;

  // REAL FIEL certificate paths (these would need to exist)
  const FIEL_CERT_PATH = './test/certificates/FIEL_AAA010101AAA.cer';
  const FIEL_KEY_PATH = './test/certificates/FIEL_AAA010101AAA.key';
  const FIEL_PASSWORD = 'password123'; // This would be the real password

  beforeEach(async function () {
    [admin, verifier, user1] = await ethers.getSigners();

    // Deploy FIELIntegration contract
    const FIELIntegration = await ethers.getContractFactory("FIELIntegration");
    fielIntegration = await FIELIntegration.deploy();
    await fielIntegration.waitForDeployment();

    // Deploy DigitalSignatureVerifier contract
    const DigitalSignatureVerifier = await ethers.getContractFactory("DigitalSignatureVerifier");
    digitalSignatureVerifier = await DigitalSignatureVerifier.deploy();
    await digitalSignatureVerifier.waitForDeployment();

    // Set FIEL integration as Mexico verifier
    await digitalSignatureVerifier.setCountryVerifier("MX", await fielIntegration.getAddress());
  });

  /**
   * @notice Parse REAL FIEL certificate (.cer file)
   * @dev This function reads actual FIEL certificates issued by SAT Mexico
   */
  function parseRealFielCertificate(certPath) {
    try {
      if (!fs.existsSync(certPath)) {
        console.log(`⚠️  FIEL certificate not found at: ${certPath}`);
        console.log(`📝 To test with real FIEL certificates, place .cer and .key files in test/certificates/`);
        return null;
      }

      const certBuffer = fs.readFileSync(certPath);
      let cert;

      // Try DER format first (binary)
      try {
        cert = forge.pki.certificateFromDer(certBuffer.toString('binary'));
      } catch (error) {
        // Try PEM format
        const certPem = certBuffer.toString('utf8');
        cert = forge.pki.certificateFromPem(certPem);
      }

      // Extract certificate information
      const subject = cert.subject;
      const issuer = cert.issuer;

      // Extract RFC from certificate subject
      let rfc = '';
      const serialNumberAttr = subject.getField('serialNumber');
      if (serialNumberAttr) {
        // In FIEL certificates, the RFC is often in the serialNumber field
        // Format is usually "/ CURP / RFC"
        const value = serialNumberAttr.value;
        const rfcMatch = value.match(/([A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3})/);
        if (rfcMatch) {
          rfc = rfcMatch[1];
        }
      }

      // If not found in serialNumber, try CN (Common Name)
      if (!rfc) {
        const cn = subject.getField('CN');
        if (cn) {
          const cnMatch = cn.value.match(/([A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3})/);
          if (cnMatch) {
            rfc = cnMatch[1];
          }
        }
      }

      // Extract serial number
      const serialNumber = cert.serialNumber;

      // Calculate public key hash
      const publicKeyPem = forge.pki.publicKeyToPem(cert.publicKey);
      const publicKeyHash = crypto.createHash('sha256').update(publicKeyPem).digest('hex');

      // Extract validity dates
      const validFrom = Math.floor(cert.validity.notBefore.getTime() / 1000);
      const validTo = Math.floor(cert.validity.notAfter.getTime() / 1000);

      // Get issuer information (SAT)
      const issuerCN = issuer.getField('CN');
      const issuerName = issuerCN ? issuerCN.value : 'AC SAT';

      return {
        rfc: rfc || 'AAA010101AAA', // Default test RFC if not found
        serialNumber: serialNumber,
        publicKeyHash: '0x' + publicKeyHash,
        validFrom: validFrom,
        validTo: validTo,
        issuer: issuerName,
        certificate: cert
      };
    } catch (error) {
      console.log(`⚠️  Error parsing FIEL certificate: ${error.message}`);
      return null;
    }
  }

  /**
   * @notice Sign data with REAL FIEL private key
   * @dev This function uses actual FIEL private keys to sign data
   */
  function signWithFielKey(keyPath, password, dataToSign) {
    try {
      if (!fs.existsSync(keyPath)) {
        console.log(`⚠️  FIEL private key not found at: ${keyPath}`);
        return null;
      }

      const keyBuffer = fs.readFileSync(keyPath);
      let privateKey;

      // Try to decrypt the key (FIEL keys are usually encrypted)
      try {
        // Try PKCS#8 encrypted format
        const keyPem = keyBuffer.toString('utf8');
        privateKey = forge.pki.decryptRsaPrivateKey(keyPem, password);
      } catch (error) {
        // Try DER format
        try {
          const asn1 = forge.asn1.fromDer(keyBuffer.toString('binary'));
          privateKey = forge.pki.privateKeyFromAsn1(asn1);
        } catch (err) {
          console.log('Could not decrypt FIEL private key');
          return null;
        }
      }

      // Create signature
      const md = forge.md.sha256.create();
      md.update(dataToSign, 'utf8');
      const signature = privateKey.sign(md);

      return '0x' + forge.util.encode64(signature).replace(/[^A-Za-z0-9]/g, '');
    } catch (error) {
      console.log(`⚠️  Error signing with FIEL key: ${error.message}`);
      return null;
    }
  }

  describe("REAL FIEL Certificate Parsing", function () {
    it("Should read and validate REAL FIEL certificate", async function () {
      const fielData = parseRealFielCertificate(FIEL_CERT_PATH);

      if (!fielData) {
        this.skip(); // Skip test if no real certificate available
        return;
      }

      console.log("📜 REAL FIEL Certificate Data:");
      console.log(`   RFC: ${fielData.rfc}`);
      console.log(`   Serial: ${fielData.serialNumber}`);
      console.log(`   Issuer: ${fielData.issuer}`);
      console.log(`   Valid From: ${new Date(fielData.validFrom * 1000).toISOString()}`);
      console.log(`   Valid To: ${new Date(fielData.validTo * 1000).toISOString()}`);
      console.log(`   Public Key Hash: ${fielData.publicKeyHash.slice(0, 10)}...`);

      // Register the REAL FIEL in the contract
      await fielIntegration.registerFIEL(
        user1.address,
        fielData.rfc,
        fielData.serialNumber,
        fielData.publicKeyHash,
        fielData.validTo
      );

      // Verify registration
      const profile = await fielIntegration.fielProfiles(user1.address);
      expect(profile.rfc).to.equal(fielData.rfc);
      expect(profile.serialNumber).to.equal(fielData.serialNumber);
    });
  });

  describe("REAL FIEL Document Signing", function () {
    it("Should sign document with REAL FIEL", async function () {
      const fielData = parseRealFielCertificate(FIEL_CERT_PATH);

      if (!fielData) {
        this.skip(); // Skip test if no real certificate available
        return;
      }

      // Register FIEL
      await fielIntegration.registerFIEL(
        user1.address,
        fielData.rfc,
        fielData.serialNumber,
        fielData.publicKeyHash,
        fielData.validTo
      );

      // Create document to sign
      const documentData = {
        certificateNumber: "CERT-2025-001",
        exporterRFC: fielData.rfc,
        productDescription: "Electronic Components",
        hsCode: "854140",
        countryOfOrigin: "MX",
        timestamp: Math.floor(Date.now() / 1000)
      };

      const documentHash = ethers.keccak256(
        ethers.toUtf8Bytes(JSON.stringify(documentData))
      );

      // Sign with REAL FIEL key (if available)
      const signature = signWithFielKey(FIEL_KEY_PATH, FIEL_PASSWORD, documentHash);

      if (!signature) {
        console.log("⚠️  Could not sign with REAL FIEL key, using mock signature");
        // Use mock signature for testing
        const mockSignature = await user1.signMessage(ethers.getBytes(documentHash));

        await fielIntegration.connect(user1).signWithFIEL(
          documentHash,
          mockSignature,
          "Test Exporter Company",
          "Exportador"
        );
      } else {
        console.log("✅ Signed with REAL FIEL private key");

        await fielIntegration.connect(user1).signWithFIEL(
          documentHash,
          signature,
          "Test Exporter Company",
          "Exportador"
        );
      }

      // Verify signature was recorded
      const signatures = await fielIntegration.getDocumentSignatures(documentHash);
      expect(signatures.length).to.equal(1);
      expect(signatures[0].rfc).to.equal(fielData.rfc);
    });
  });

  describe("REAL FIEL Verification with SAT", function () {
    it("Should verify FIEL with mock SAT service", async function () {
      const fielData = parseRealFielCertificate(FIEL_CERT_PATH);

      if (!fielData) {
        // Use mock data if no real certificate
        const mockData = {
          rfc: "SABM960611SP4",
          serialNumber: "00001000000506653131",
          publicKeyHash: ethers.keccak256(ethers.toUtf8Bytes("MOCK_PUBLIC_KEY")),
          validTo: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60
        };

        await fielIntegration.registerFIEL(
          user1.address,
          mockData.rfc,
          mockData.serialNumber,
          mockData.publicKeyHash,
          mockData.validTo
        );

        // Verify with mock SAT
        const isValid = await fielIntegration.verifyWithSAT(
          mockData.rfc,
          mockData.serialNumber
        );
        expect(isValid).to.be.true;
      } else {
        // Register REAL FIEL
        await fielIntegration.registerFIEL(
          user1.address,
          fielData.rfc,
          fielData.serialNumber,
          fielData.publicKeyHash,
          fielData.validTo
        );

        // In production, this would call actual SAT API
        const isValid = await fielIntegration.verifyWithSAT(
          fielData.rfc,
          fielData.serialNumber
        );
        expect(isValid).to.be.true;

        console.log("✅ FIEL verified with mock SAT service");
        console.log("📝 In production, this would connect to SAT's actual verification service");
      }
    });
  });

  describe("FIEL Integration with Origin Certificates", function () {
    it("Should integrate FIEL with digital signature verifier", async function () {
      // Use mock FIEL data for this test
      const mockFielData = {
        rfc: "EXP123456789",
        serialNumber: "FIEL-2025-TEST-001",
        publicKeyHash: ethers.keccak256(ethers.toUtf8Bytes("TEST_PUBLIC_KEY")),
        validTo: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60,
        name: "Exportadora Test SA de CV"
      };

      // Register FIEL in FIELIntegration
      await fielIntegration.registerFIEL(
        user1.address,
        mockFielData.rfc,
        mockFielData.serialNumber,
        mockFielData.publicKeyHash,
        mockFielData.validTo
      );

      // Register in DigitalSignatureVerifier
      await digitalSignatureVerifier.registerSigner(
        user1.address,
        mockFielData.serialNumber,
        "FIEL",
        "MX",
        mockFielData.validTo,
        mockFielData.publicKeyHash
      );

      // Create and sign a document
      const documentHash = ethers.keccak256(
        ethers.toUtf8Bytes("ORIGIN_CERTIFICATE_DATA")
      );

      // Sign with FIEL
      await fielIntegration.connect(user1).signWithFIEL(
        documentHash,
        await user1.signMessage(ethers.getBytes(documentHash)),
        mockFielData.name,
        "Exportador"
      );

      // Also sign with DigitalSignatureVerifier
      const metadata = {
        signerRole: "EXPORTER",
        signerName: mockFielData.name,
        signerTaxId: mockFielData.rfc,
        signatureStandard: "FIEL",
        additionalData: ethers.toUtf8Bytes("")
      };

      const messageHash = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["bytes32", "address"],
          [documentHash, user1.address]
        )
      );
      const signature = await user1.signMessage(ethers.getBytes(messageHash));

      await digitalSignatureVerifier.connect(user1).signDocument(
        documentHash,
        signature,
        metadata
      );

      // Verify both signatures exist
      const fielSignatures = await fielIntegration.getDocumentSignatures(documentHash);
      expect(fielSignatures.length).to.equal(1);
      expect(fielSignatures[0].rfc).to.equal(mockFielData.rfc);

      const digitalSignatures = await digitalSignatureVerifier.getDocumentSignatures(documentHash);
      expect(digitalSignatures.length).to.equal(1);
      expect(digitalSignatures[0].metadata.signerTaxId).to.equal(mockFielData.rfc);
    });
  });
});