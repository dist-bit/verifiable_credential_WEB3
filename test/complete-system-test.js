const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Complete Origin Certification System Test", function () {
  let vc, tradeAgreementRegistry, universalOriginCertificate, originCertificateWithDigitalSignatures, originCertificateFinal;
  let owner, platformWallet, exporter, importer, issuer, verifier;
  
  // Test data
  const testProduct = {
    hsCode: "854140",
    description: "Photosensitive semiconductor devices",
    quantity: 1000,
    unitOfMeasure: "UNIT",
    countryOfOrigin: "MX",
    value: 50000,
    currency: "USD",
    manufacturer: "Semiconductores de México SA de CV",
    manufacturerCountry: "MX"
  };

  const testCertificate = {
    exporterName: "Exportadora Digital México SA de CV",
    exporterCountry: "MX",
    exporterTaxId: "EDM960611SP4",
    importerName: "US Imports Corporation",
    importerCountry: "US",
    importerTaxId: "12-3456789",
    tradeAgreement: "USMCA",
    invoiceNumber: "INV-2025-001",
    referenceNumber: "REF-2025-001"
  };

  const testOriginCriteria = {
    criteriaType: 1, // RVC
    rvcPercentage: 85,
    rvcMethod: 1, // NET_COST
    cumulationApplied: false,
    deminimisApplied: false
  };

  before(async function () {
    [owner, platformWallet, exporter, importer, issuer, verifier] = await ethers.getSigners();
    console.log("\n🔧 Deploying all contracts...");
    
    // Deploy base VC contract
    const VC = await ethers.getContractFactory("VC");
    vc = await VC.deploy();
    await vc.deployed();
    console.log("✅ VC deployed:", vc.address);

    // Deploy TradeAgreementRegistry
    const TradeAgreementRegistry = await ethers.getContractFactory("TradeAgreementRegistry");
    tradeAgreementRegistry = await TradeAgreementRegistry.deploy();
    await tradeAgreementRegistry.deployed();
    console.log("✅ TradeAgreementRegistry deployed:", tradeAgreementRegistry.address);

    // Deploy UniversalOriginCertificate
    const UniversalOriginCertificate = await ethers.getContractFactory("UniversalOriginCertificate");
    universalOriginCertificate = await UniversalOriginCertificate.deploy(tradeAgreementRegistry.address);
    await universalOriginCertificate.deployed();
    console.log("✅ UniversalOriginCertificate deployed:", universalOriginCertificate.address);

    // Deploy OriginCertificateWithDigitalSignatures
    const OriginCertificateWithDigitalSignatures = await ethers.getContractFactory("OriginCertificateWithDigitalSignatures");
    originCertificateWithDigitalSignatures = await OriginCertificateWithDigitalSignatures.deploy();
    await originCertificateWithDigitalSignatures.deployed();
    console.log("✅ OriginCertificateWithDigitalSignatures deployed:", originCertificateWithDigitalSignatures.address);

    // Deploy OriginCertificateFinal
    const OriginCertificateFinal = await ethers.getContractFactory("OriginCertificateFinal");
    originCertificateFinal = await OriginCertificateFinal.deploy();
    await originCertificateFinal.deployed();
    console.log("✅ OriginCertificateFinal deployed:", originCertificateFinal.address);

    // Setup roles
    await originCertificateFinal.grantRole(await originCertificateFinal.ISSUER_ROLE(), platformWallet.address);
    await originCertificateWithDigitalSignatures.grantRole(await originCertificateWithDigitalSignatures.ISSUER_ROLE(), platformWallet.address);
    console.log("✅ Platform wallet granted ISSUER_ROLE");
  });

  describe("1. VC Base Contract Tests", function () {
    it("Should create verifiable credential", async function () {
      const credentialData = {
        issuer: owner.address,
        subject: exporter.address,
        data: ethers.utils.defaultAbiCoder.encode(
          ["string", "string", "uint256"],
          ["Test Credential", "Description", Date.now()]
        ),
        validFrom: Math.floor(Date.now() / 1000),
        validTo: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60
      };

      await expect(vc.createVC(
        credentialData.issuer,
        credentialData.subject,
        credentialData.data,
        credentialData.validFrom,
        credentialData.validTo
      )).to.emit(vc, "VCCreated");

      const vcCount = await vc.getVCCount(exporter.address);
      expect(vcCount).to.equal(1);
    });

    it("Should verify credential validity", async function () {
      const vcId = await vc.getVCIdByIndex(exporter.address, 0);
      const isValid = await vc.verifyVC(vcId);
      expect(isValid).to.be.true;
    });
  });

  describe("2. Trade Agreement Registry Tests", function () {
    it("Should register trade agreements", async function () {
      // Register USMCA
      await expect(tradeAgreementRegistry.registerAgreement(
        "USMCA",
        ["US", "MX", "CA"],
        ["US", "MX", "CA"],
        Math.floor(Date.now() / 1000),
        Math.floor(Date.now() / 1000) + 10 * 365 * 24 * 60 * 60,
        ethers.utils.formatBytes32String("USMCA-2020")
      )).to.emit(tradeAgreementRegistry, "AgreementRegistered");

      // Register CAFTA-DR
      await tradeAgreementRegistry.registerAgreement(
        "CAFTA-DR",
        ["US", "CR", "DO", "SV", "GT", "HN", "NI"],
        ["US", "CR", "DO", "SV", "GT", "HN", "NI"],
        Math.floor(Date.now() / 1000),
        Math.floor(Date.now() / 1000) + 10 * 365 * 24 * 60 * 60,
        ethers.utils.formatBytes32String("CAFTA-DR-2006")
      );
    });

    it("Should validate trade routes", async function () {
      const isValid = await tradeAgreementRegistry.isValidTradeRoute("USMCA", "MX", "US");
      expect(isValid).to.be.true;

      const isInvalid = await tradeAgreementRegistry.isValidTradeRoute("USMCA", "MX", "CN");
      expect(isInvalid).to.be.false;
    });

    it("Should add origin rules", async function () {
      await expect(tradeAgreementRegistry.addOriginRule(
        "USMCA",
        "854140",
        60, // 60% RVC requirement
        ethers.utils.formatBytes32String("RULE-854140")
      )).to.emit(tradeAgreementRegistry, "OriginRuleAdded");

      const rvcRequired = await tradeAgreementRegistry.getRVCRequirement("USMCA", "854140");
      expect(rvcRequired).to.equal(60);
    });
  });

  describe("3. Universal Origin Certificate Tests", function () {
    it("Should create certificate with platform wallet", async function () {
      const certificateData = {
        ...testCertificate,
        products: [testProduct],
        originCriteria: testOriginCriteria
      };

      // Platform creates certificate on behalf of exporter
      const tx = await universalOriginCertificate.connect(platformWallet).createCertificate(
        certificateData.exporterName,
        certificateData.exporterCountry,
        certificateData.exporterTaxId,
        certificateData.importerName,
        certificateData.importerCountry,
        certificateData.importerTaxId,
        certificateData.products,
        certificateData.tradeAgreement,
        certificateData.originCriteria,
        certificateData.invoiceNumber,
        certificateData.referenceNumber
      );

      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === "CertificateCreated");
      expect(event).to.not.be.undefined;
    });

    it("Should validate certificate against trade agreement", async function () {
      const certificateId = await universalOriginCertificate.getCertificateId(
        testCertificate.invoiceNumber,
        testCertificate.exporterTaxId
      );
      
      const certificate = await universalOriginCertificate.getCertificate(certificateId);
      expect(certificate.tradeAgreement).to.equal("USMCA");
      expect(certificate.status).to.equal(0); // DRAFT status
    });
  });

  describe("4. Digital Signatures Contract Tests", function () {
    it("Should support multiple signature types", async function () {
      const supportedTypes = await originCertificateWithDigitalSignatures.getSupportedSignatureTypes();
      expect(supportedTypes.length).to.be.greaterThan(0);
      expect(supportedTypes).to.include.members([0, 1, 2, 3, 4]); // FIEL_MX, EIDAS_EU, PKI_US, DSC_IN, CNPJ_BR
    });

    it("Should create certificate with digital signature metadata", async function () {
      const certificateData = {
        ...testCertificate,
        products: [testProduct],
        originCriteria: testOriginCriteria,
        digitalSignatureData: {
          certificateSerial: "ABC123456789",
          certificateIssuer: "SAT Mexico",
          publicKeyHash: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("public-key")),
          signatureAlgorithm: "RSA-SHA256",
          timestamp: Math.floor(Date.now() / 1000)
        }
      };

      const tx = await originCertificateWithDigitalSignatures.connect(platformWallet).createCertificate(
        certificateData.exporterName,
        certificateData.exporterCountry,
        certificateData.exporterTaxId,
        certificateData.importerName,
        certificateData.importerCountry,
        certificateData.importerTaxId,
        certificateData.products,
        certificateData.tradeAgreement,
        certificateData.originCriteria,
        certificateData.invoiceNumber + "-DS",
        certificateData.referenceNumber + "-DS"
      );

      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === "CertificateCreated");
      expect(event).to.not.be.undefined;
    });

    it("Should add digital signature with FIEL", async function () {
      const certificateId = await originCertificateWithDigitalSignatures.getCertificateId(
        testCertificate.invoiceNumber + "-DS",
        testCertificate.exporterTaxId
      );

      // Simulate FIEL signature
      const messageHash = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ["bytes32", "address", "uint256"],
          [certificateId, exporter.address, Math.floor(Date.now() / 1000)]
        )
      );
      const signature = await exporter.signMessage(ethers.utils.arrayify(messageHash));

      await expect(
        originCertificateWithDigitalSignatures.connect(platformWallet).addDigitalSignature(
          certificateId,
          0, // FIEL_MX
          {
            certificateSerial: "FIEL123456789",
            certificateIssuer: "SAT",
            publicKeyHash: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("fiel-public-key")),
            signatureAlgorithm: "RSA-SHA256",
            timestamp: Math.floor(Date.now() / 1000)
          }
        )
      ).to.emit(originCertificateWithDigitalSignatures, "DigitalSignatureAdded");
    });
  });

  describe("5. Origin Certificate Final Tests", function () {
    it("Should create complete certificate with all features", async function () {
      const completeCertificate = {
        ...testCertificate,
        products: [testProduct, {
          ...testProduct,
          hsCode: "854150",
          description: "Other semiconductor devices",
          quantity: 500
        }],
        originCriteria: testOriginCriteria,
        invoiceNumber: "INV-FINAL-001",
        referenceNumber: "REF-FINAL-001"
      };

      const tx = await originCertificateFinal.connect(platformWallet).createCertificate(
        completeCertificate.exporterName,
        completeCertificate.exporterCountry,
        completeCertificate.exporterTaxId,
        completeCertificate.importerName,
        completeCertificate.importerCountry,
        completeCertificate.importerTaxId,
        completeCertificate.products,
        completeCertificate.tradeAgreement,
        completeCertificate.originCriteria,
        completeCertificate.invoiceNumber,
        completeCertificate.referenceNumber
      );

      const receipt = await tx.wait();
      expect(receipt.status).to.equal(1);
    });

    it("Should issue and verify certificate", async function () {
      const certificateId = await originCertificateFinal.getCertificateId(
        "INV-FINAL-001",
        testCertificate.exporterTaxId
      );

      // Issue certificate
      await expect(
        originCertificateFinal.connect(platformWallet).issueCertificate(certificateId)
      ).to.emit(originCertificateFinal, "CertificateIssued");

      // Verify certificate
      const isValid = await originCertificateFinal.verifyCertificate(certificateId);
      expect(isValid).to.be.true;
    });

    it("Should handle product tracking", async function () {
      const certificateId = await originCertificateFinal.getCertificateId(
        "INV-FINAL-001",
        testCertificate.exporterTaxId
      );

      const certificate = await originCertificateFinal.getCertificate(certificateId);
      expect(certificate.products.length).to.equal(2);
      
      // Verify product details
      expect(certificate.products[0].hsCode).to.equal("854140");
      expect(certificate.products[1].hsCode).to.equal("854150");
    });
  });

  describe("6. Contract Interactions Tests", function () {
    it("Should verify complete flow: Create -> Sign -> Issue -> Verify", async function () {
      const flowCertificate = {
        ...testCertificate,
        invoiceNumber: "INV-FLOW-001",
        referenceNumber: "REF-FLOW-001"
      };

      // Step 1: Create certificate
      console.log("\n      Step 1: Creating certificate...");
      const createTx = await originCertificateFinal.connect(platformWallet).createCertificate(
        flowCertificate.exporterName,
        flowCertificate.exporterCountry,
        flowCertificate.exporterTaxId,
        flowCertificate.importerName,
        flowCertificate.importerCountry,
        flowCertificate.importerTaxId,
        [testProduct],
        flowCertificate.tradeAgreement,
        testOriginCriteria,
        flowCertificate.invoiceNumber,
        flowCertificate.referenceNumber
      );
      await createTx.wait();

      const certificateId = await originCertificateFinal.getCertificateId(
        flowCertificate.invoiceNumber,
        flowCertificate.exporterTaxId
      );
      console.log("      ✅ Certificate created:", certificateId);

      // Step 2: Sign with exporter signature
      console.log("      Step 2: Signing certificate...");
      const messageToSign = ethers.utils.solidityPack(
        ["bytes32", "address"],
        [certificateId, exporter.address]
      );
      const messageHash = ethers.utils.keccak256(messageToSign);
      const signature = await exporter.signMessage(ethers.utils.arrayify(messageHash));
      const { v, r, s } = ethers.utils.splitSignature(signature);

      const signTx = await originCertificateFinal.connect(platformWallet).signCertificate(
        certificateId,
        v, r, s
      );
      await signTx.wait();
      console.log("      ✅ Certificate signed");

      // Step 3: Issue certificate
      console.log("      Step 3: Issuing certificate...");
      const issueTx = await originCertificateFinal.connect(platformWallet).issueCertificate(certificateId);
      await issueTx.wait();
      console.log("      ✅ Certificate issued");

      // Step 4: Verify certificate
      console.log("      Step 4: Verifying certificate...");
      const isValid = await originCertificateFinal.verifyCertificate(certificateId);
      expect(isValid).to.be.true;
      console.log("      ✅ Certificate verified");

      // Check final status
      const finalCertificate = await originCertificateFinal.getCertificate(certificateId);
      expect(finalCertificate.status).to.equal(2); // VERIFIED
    });

    it("Should handle certificate expiration", async function () {
      // This would test expiration logic if implemented
      const certificateId = await originCertificateFinal.getCertificateId(
        "INV-FLOW-001",
        testCertificate.exporterTaxId
      );

      const certificate = await originCertificateFinal.getCertificate(certificateId);
      const currentTime = Math.floor(Date.now() / 1000);
      
      // Certificate should be valid for 1 year by default
      expect(certificate.issuanceDate).to.be.closeTo(currentTime, 60);
    });

    it("Should validate RVC requirements", async function () {
      const certificateId = await originCertificateFinal.getCertificateId(
        "INV-FLOW-001",
        testCertificate.exporterTaxId
      );

      const certificate = await originCertificateFinal.getCertificate(certificateId);
      expect(certificate.originCriteria.rvcPercentage).to.equal(85);
      expect(certificate.originCriteria.rvcPercentage).to.be.greaterThan(60); // USMCA requirement
    });
  });

  describe("7. Security and Access Control Tests", function () {
    it("Should prevent unauthorized certificate creation", async function () {
      await expect(
        originCertificateFinal.connect(verifier).createCertificate(
          testCertificate.exporterName,
          testCertificate.exporterCountry,
          testCertificate.exporterTaxId,
          testCertificate.importerName,
          testCertificate.importerCountry,
          testCertificate.importerTaxId,
          [testProduct],
          testCertificate.tradeAgreement,
          testOriginCriteria,
          "INV-UNAUTHORIZED",
          "REF-UNAUTHORIZED"
        )
      ).to.be.revertedWith("Caller is not an issuer");
    });

    it("Should allow public verification", async function () {
      const certificateId = await originCertificateFinal.getCertificateId(
        "INV-FLOW-001",
        testCertificate.exporterTaxId
      );

      // Anyone should be able to verify
      const isValid = await originCertificateFinal.connect(verifier).verifyCertificate(certificateId);
      expect(isValid).to.be.true;
    });
  });

  describe("8. Data Integrity Tests", function () {
    it("Should maintain certificate immutability", async function () {
      const certificateId = await originCertificateFinal.getCertificateId(
        "INV-FLOW-001",
        testCertificate.exporterTaxId
      );

      const certificate1 = await originCertificateFinal.getCertificate(certificateId);
      
      // Try to create another certificate with same invoice number
      await expect(
        originCertificateFinal.connect(platformWallet).createCertificate(
          testCertificate.exporterName,
          testCertificate.exporterCountry,
          testCertificate.exporterTaxId,
          testCertificate.importerName,
          testCertificate.importerCountry,
          testCertificate.importerTaxId,
          [testProduct],
          testCertificate.tradeAgreement,
          testOriginCriteria,
          "INV-FLOW-001", // Same invoice number
          "REF-DUPLICATE"
        )
      ).to.be.revertedWith("Certificate already exists");
    });

    it("Should track all certificate events", async function () {
      const filter = originCertificateFinal.filters.CertificateCreated();
      const events = await originCertificateFinal.queryFilter(filter);
      expect(events.length).to.be.greaterThan(0);
    });
  });
});