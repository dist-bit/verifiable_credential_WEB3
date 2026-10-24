const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("FIEL Integration Test", function () {
  let contract;
  let admin, exporterWallet, fielAuthority, satVerifier, user1;

  // Mock FIEL data similar to real Mexican RFC system
  const mockFielData = {
    rfc: "SABM960611SP4",
    curp: "SABM960611HDFRRL09",
    name: "MIGUEL ANGEL SANCHEZ BARRIENTOS",
    serialNumber: "FIEL-2025-001234567890",
    issuer: "AC SAT",
    validFrom: Math.floor(Date.now() / 1000),
    validTo: Math.floor(Date.now() / 1000) + (4 * 365 * 24 * 60 * 60), // 4 years
    publicKeyHash: null // Will be calculated
  };

  beforeEach(async function () {
    [admin, exporterWallet, fielAuthority, satVerifier, user1] = await ethers.getSigners();

    // Deploy DigitalSignatureVerifier which handles FIEL signatures
    const DigitalSignatureVerifier = await ethers.getContractFactory("DigitalSignatureVerifier");
    contract = await DigitalSignatureVerifier.deploy();
    await contract.waitForDeployment();

    // Calculate mock public key hash
    mockFielData.publicKeyHash = ethers.keccak256(
      ethers.toUtf8Bytes(`FIEL-PUBLIC-KEY-${mockFielData.rfc}`)
    );
  });

  describe("FIEL Certificate Registration", function () {
    it("Should register FIEL digital signature for Mexican RFC", async function () {
      // Register signer with FIEL data
      await expect(
        contract.registerSigner(
          exporterWallet.address,
          mockFielData.serialNumber,
          "FIEL",
          "MX",
          mockFielData.validTo,
          mockFielData.publicKeyHash
        )
      ).to.emit(contract, "SignerRegistered")
       .withArgs(exporterWallet.address, mockFielData.serialNumber, "FIEL", "MX");

      // Verify registration
      const profile = await contract.signerProfiles(exporterWallet.address);
      expect(profile.certificateSerial).to.equal(mockFielData.serialNumber);
      expect(profile.signatureStandard).to.equal("FIEL");
      expect(profile.country).to.equal("MX");
    });

    it("Should support Mexico FIEL signature type", async function () {
      const fielStandard = await contract.signatureStandards("FIEL");
      expect(fielStandard.code).to.equal("FIEL");
      expect(fielStandard.country).to.equal("MX");
      expect(fielStandard.isActive).to.be.true;
    });

    it("Should verify FIEL standard is active", async function () {
      const fielStandard = await contract.signatureStandards("FIEL");
      expect(fielStandard.isActive).to.be.true;
    });
  });

  describe("FIEL Document Signing", function () {
    let documentHash;

    beforeEach(async function () {
      // Register FIEL signer
      await contract.registerSigner(
        exporterWallet.address,
        mockFielData.serialNumber,
        "FIEL",
        "MX",
        mockFielData.validTo,
        mockFielData.publicKeyHash
      );

      // Create a document hash
      documentHash = ethers.keccak256(ethers.toUtf8Bytes("TEST_DOCUMENT_DATA"));
    });

    it("Should sign document with FIEL", async function () {
      // Create signature metadata
      const metadata = {
        signerRole: "EXPORTER",
        signerName: mockFielData.name,
        signerTaxId: mockFielData.rfc,
        signatureStandard: "FIEL",
        additionalData: ethers.toUtf8Bytes(JSON.stringify({ curp: mockFielData.curp }))
      };

      // Sign the document
      const messageHash = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["bytes32", "address"],
          [documentHash, exporterWallet.address]
        )
      );
      const signature = await exporterWallet.signMessage(ethers.getBytes(messageHash));

      await expect(
        contract.connect(exporterWallet).signDocument(
          documentHash,
          signature,
          metadata
        )
      ).to.emit(contract, "SignatureAdded")
       .withArgs(documentHash, exporterWallet.address, "FIEL", "EXPORTER");

      // Verify signature was added
      const signatures = await contract.getDocumentSignatures(documentHash);
      expect(signatures.length).to.equal(1);
      expect(signatures[0].signer).to.equal(exporterWallet.address);
      expect(signatures[0].metadata.signerTaxId).to.equal(mockFielData.rfc);
    });

    it("Should verify FIEL signature", async function () {
      // Sign document first
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
          [documentHash, exporterWallet.address]
        )
      );
      const signature = await exporterWallet.signMessage(ethers.getBytes(messageHash));

      await contract.connect(exporterWallet).signDocument(
        documentHash,
        signature,
        metadata
      );

      // Verify FIEL signature
      const result = await contract.verifyFIELSignature(
        documentHash,
        mockFielData.serialNumber,
        signature,
        ethers.toUtf8Bytes("") // Mock FIEL certificate
      );

      expect(result.isValid).to.be.true;
      expect(result.signerRFC).to.equal(mockFielData.rfc);
    });
  });

  describe("FIEL Multi-Signature Requirements", function () {
    beforeEach(async function () {
      // Register multiple signers
      await contract.registerSigner(
        exporterWallet.address,
        mockFielData.serialNumber,
        "FIEL",
        "MX",
        mockFielData.validTo,
        mockFielData.publicKeyHash
      );

      await contract.registerSigner(
        satVerifier.address,
        "SAT-CERT-001",
        "FIEL",
        "MX",
        mockFielData.validTo,
        ethers.keccak256(ethers.toUtf8Bytes("SAT-PUBLIC-KEY"))
      );
    });

    it("Should verify multi-signature requirements", async function () {
      const documentHash = ethers.keccak256(ethers.toUtf8Bytes("MULTI_SIG_DOCUMENT"));

      // First signature - EXPORTER
      const exporterMetadata = {
        signerRole: "EXPORTER",
        signerName: mockFielData.name,
        signerTaxId: mockFielData.rfc,
        signatureStandard: "FIEL",
        additionalData: ethers.toUtf8Bytes("")
      };

      const exporterMsgHash = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["bytes32", "address"],
          [documentHash, exporterWallet.address]
        )
      );
      const exporterSig = await exporterWallet.signMessage(ethers.getBytes(exporterMsgHash));

      await contract.connect(exporterWallet).signDocument(
        documentHash,
        exporterSig,
        exporterMetadata
      );

      // Second signature - CUSTOMS
      const customsMetadata = {
        signerRole: "CUSTOMS",
        signerName: "SAT - Servicio de Administración Tributaria",
        signerTaxId: "SAT000000XXX",
        signatureStandard: "FIEL",
        additionalData: ethers.toUtf8Bytes("")
      };

      const customsMsgHash = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["bytes32", "address"],
          [documentHash, satVerifier.address]
        )
      );
      const customsSig = await satVerifier.signMessage(ethers.getBytes(customsMsgHash));

      await contract.connect(satVerifier).signDocument(
        documentHash,
        customsSig,
        customsMetadata
      );

      // Verify both signatures are present
      const isValid = await contract.verifyMultiSignature(
        documentHash,
        ["EXPORTER", "CUSTOMS"]
      );
      expect(isValid).to.be.true;
    });
  });

  describe("FIEL Security", function () {
    it("Should prevent expired FIEL usage", async function () {
      // Register with expired certificate
      const expiredValidTo = Math.floor(Date.now() / 1000) - 86400; // Yesterday

      await contract.registerSigner(
        user1.address,
        "EXPIRED-CERT-001",
        "FIEL",
        "MX",
        expiredValidTo,
        ethers.keccak256(ethers.toUtf8Bytes("EXPIRED-KEY"))
      );

      const documentHash = ethers.keccak256(ethers.toUtf8Bytes("TEST_DOC"));
      const metadata = {
        signerRole: "EXPORTER",
        signerName: "Test User",
        signerTaxId: "TEST123456XXX",
        signatureStandard: "FIEL",
        additionalData: ethers.toUtf8Bytes("")
      };

      const msgHash = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["bytes32", "address"],
          [documentHash, user1.address]
        )
      );
      const signature = await user1.signMessage(ethers.getBytes(msgHash));

      // Should fail with expired certificate
      await expect(
        contract.connect(user1).signDocument(
          documentHash,
          signature,
          metadata
        )
      ).to.be.revertedWith("Signer certificate expired");
    });

    it("Should prevent revoked FIEL usage", async function () {
      // Register signer
      await contract.registerSigner(
        user1.address,
        "REVOKED-CERT-001",
        "FIEL",
        "MX",
        mockFielData.validTo,
        ethers.keccak256(ethers.toUtf8Bytes("REVOKED-KEY"))
      );

      // Revoke the certificate
      await contract.revokeSigner(user1.address);

      const documentHash = ethers.keccak256(ethers.toUtf8Bytes("TEST_DOC"));
      const metadata = {
        signerRole: "EXPORTER",
        signerName: "Test User",
        signerTaxId: "TEST123456XXX",
        signatureStandard: "FIEL",
        additionalData: ethers.toUtf8Bytes("")
      };

      const msgHash = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["bytes32", "address"],
          [documentHash, user1.address]
        )
      );
      const signature = await user1.signMessage(ethers.getBytes(msgHash));

      // Should fail with revoked certificate
      await expect(
        contract.connect(user1).signDocument(
          documentHash,
          signature,
          metadata
        )
      ).to.be.revertedWith("Signer certificate revoked");
    });
  });
});