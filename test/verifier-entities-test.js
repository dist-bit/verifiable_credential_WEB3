const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Verifier Entities Test", function () {
  let contract;
  let admin, verifier1, verifier2, verifier3, user1, user2;
  
  beforeEach(async function () {
    [admin, verifier1, verifier2, verifier3, user1, user2] = await ethers.getSigners();
    
    const OriginCertificateWithDigitalSignatures = await ethers.getContractFactory("OriginCertificateWithDigitalSignatures");
    contract = await OriginCertificateWithDigitalSignatures.deploy();
    await contract.waitForDeployment();
  });

  describe("Verifier Entity Registration", function () {
    it("Should register verifier entity successfully", async function () {
      const verifierData = {
        address: verifier1.address,
        name: "Bureau Veritas Mexico",
        country: "MX",
        accreditation: "ISO 17020 Accredited",
        authorizedCountries: ["MX", "US", "CA"]
      };

      await expect(
        contract.registerVerifierEntity(
          verifierData.address,
          verifierData.name,
          verifierData.country,
          verifierData.accreditation,
          verifierData.authorizedCountries
        )
      ).to.emit(contract, "VerifierEntityRegistered")
       .withArgs(verifierData.address, verifierData.name, verifierData.country);

      // Verify verifier was registered
      const isActive = await contract.isActiveVerifier(verifier1.address);
      expect(isActive).to.be.true;

      // Check verifier has VERIFIER role
      const hasVerifierRole = await contract.hasRole(verifier1.address, await contract.VERIFIER());
      expect(hasVerifierRole).to.be.true;
    });

    it("Should register multiple verifiers for different countries", async function () {
      // Register Mexican verifier
      await contract.registerVerifierEntity(
        verifier1.address,
        "SENASICA Mexico",
        "MX",
        "Official Mexican Agricultural Authority",
        ["MX"]
      );

      // Register US verifier
      await contract.registerVerifierEntity(
        verifier2.address,
        "USDA APHIS",
        "US", 
        "US Department of Agriculture",
        ["US"]
      );

      // Register international verifier
      await contract.registerVerifierEntity(
        verifier3.address,
        "SGS International",
        "CH",
        "ISO 17020, 17025 Accredited",
        ["MX", "US", "CA", "EU"]
      );

      // Verify all are registered
      expect(await contract.isActiveVerifier(verifier1.address)).to.be.true;
      expect(await contract.isActiveVerifier(verifier2.address)).to.be.true;
      expect(await contract.isActiveVerifier(verifier3.address)).to.be.true;

      // Check country mappings
      const mxVerifiers = await contract.getVerifiersForCountry("MX");
      expect(mxVerifiers).to.include(verifier1.address);
      expect(mxVerifiers).to.include(verifier3.address);

      const usVerifiers = await contract.getVerifiersForCountry("US");
      expect(usVerifiers).to.include(verifier2.address);
      expect(usVerifiers).to.include(verifier3.address);
    });

    it("Should reject registration with invalid parameters", async function () {
      // Invalid address
      await expect(
        contract.registerVerifierEntity(
          ethers.ZeroAddress,
          "Test Verifier",
          "MX",
          "Test Accreditation",
          ["MX"]
        )
      ).to.be.revertedWith("Invalid verifier address");

      // Empty name
      await expect(
        contract.registerVerifierEntity(
          verifier1.address,
          "",
          "MX",
          "Test Accreditation",
          ["MX"]
        )
      ).to.be.revertedWith("Name required");

      // Empty country
      await expect(
        contract.registerVerifierEntity(
          verifier1.address,
          "Test Verifier",
          "",
          "Test Accreditation",
          ["MX"]
        )
      ).to.be.revertedWith("Country required");
    });

    it("Should only allow admin to register verifiers", async function () {
      await expect(
        contract.connect(user1).registerVerifierEntity(
          verifier1.address,
          "Unauthorized Verifier",
          "MX",
          "No Authority",
          ["MX"]
        )
      ).to.be.revertedWith("Unauthorized");
    });
  });

  describe("Verifier Entity Management", function () {
    beforeEach(async function () {
      // Register a verifier for testing
      await contract.registerVerifierEntity(
        verifier1.address,
        "Test Verifier",
        "MX",
        "ISO 17020",
        ["MX", "US"]
      );
    });

    it("Should get verifier entity details", async function () {
      const details = await contract.getVerifierEntity(verifier1.address);
      
      expect(details.name).to.equal("Test Verifier");
      expect(details.country).to.equal("MX");
      expect(details.accreditation).to.equal("ISO 17020");
      expect(details.isActive).to.be.true;
      expect(details.authorizedCountries).to.deep.equal(["MX", "US"]);
    });

    it("Should deactivate verifier entity", async function () {
      // Deactivate verifier
      await expect(
        contract.deactivateVerifierEntity(verifier1.address)
      ).to.emit(contract, "VerifierEntityDeactivated")
       .withArgs(verifier1.address);

      // Verify deactivation
      const isActive = await contract.isActiveVerifier(verifier1.address);
      expect(isActive).to.be.false;

      // Check role was removed
      const hasVerifierRole = await contract.hasRole(verifier1.address, await contract.VERIFIER());
      expect(hasVerifierRole).to.be.false;
    });

    it("Should get all verifiers", async function () {
      // Register another verifier
      await contract.registerVerifierEntity(
        verifier2.address,
        "Second Verifier",
        "US",
        "USDA Certified",
        ["US"]
      );

      const allVerifiers = await contract.getAllVerifiers();
      expect(allVerifiers).to.include(verifier1.address);
      expect(allVerifiers).to.include(verifier2.address);
      expect(allVerifiers.length).to.equal(2);
    });
  });

  describe("Certificate Verification by Entities", function () {
    let certificateId;

    beforeEach(async function () {
      // Register verifier
      await contract.registerVerifierEntity(
        verifier1.address,
        "Bureau Veritas",
        "MX",
        "ISO 17020",
        ["MX", "US"]
      );

      // Create a test certificate
      const testProduct = {
        hsCode: "854140",
        description: "Test Product",
        quantity: 100,
        unitOfMeasure: "UNIT",
        countryOfOrigin: "MX",
        value: 10000,
        currency: "USD",
        manufacturer: "Test Manufacturer",
        manufacturerCountry: "MX"
      };

      const testOriginCriteria = {
        criteriaType: 1, // RVC
        rvcPercentage: 75,
        rvcMethod: 1, // NET_COST
        cumulationApplied: false,
        deminimisApplied: false
      };

      // Grant issuer role to admin for certificate creation
      await contract.grantRole(admin.address, await contract.ISSUER());

      const tx = await contract.create(
        ethers.keccak256(ethers.toUtf8Bytes("TEST_CERTIFICATE_DATA"))
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        const parsed = contract.interface.parseLog(log);
        return parsed?.name === "Created";
      });
      const parsedEvent = contract.interface.parseLog(event);
      certificateId = parsedEvent.args.id;
    });

    it("Should allow verifier to perform verification", async function () {
      await expect(
        contract.connect(verifier1).performVerification(
          certificateId,
          true,
          "Certificate verified successfully"
        )
      ).to.emit(contract, "DigitalSignatureValidated")
       .withArgs(certificateId, true);
    });

    it("Should reject verification from non-verifier", async function () {
      await expect(
        contract.connect(user1).performVerification(
          certificateId,
          true,
          "Unauthorized verification attempt"
        )
      ).to.be.revertedWith("Unauthorized");
    });

    it("Should reject verification from inactive verifier", async function () {
      // Deactivate verifier
      await contract.deactivateVerifierEntity(verifier1.address);

      await expect(
        contract.connect(verifier1).performVerification(
          certificateId,
          true,
          "Verification from inactive verifier"
        )
      ).to.be.revertedWith("Unauthorized");
    });

    it("Should reject verification of non-existent certificate", async function () {
      const fakeCertificateId = ethers.keccak256(ethers.toUtf8Bytes("fake"));

      await expect(
        contract.connect(verifier1).performVerification(
          fakeCertificateId,
          true,
          "Fake certificate verification"
        )
      ).to.be.revertedWith("Certificate not found");
    });
  });

  describe("Public Verification Functions", function () {
    beforeEach(async function () {
      // Register verifiers
      await contract.registerVerifierEntity(
        verifier1.address,
        "Mexican Verifier",
        "MX", 
        "SENASICA Certified",
        ["MX"]
      );

      await contract.registerVerifierEntity(
        verifier2.address,
        "US Verifier",
        "US",
        "USDA Certified", 
        ["US"]
      );
    });

    it("Should allow anyone to check if address is active verifier", async function () {
      // Anyone can check verifier status (public function)
      const isActive1 = await contract.connect(user1).isActiveVerifier(verifier1.address);
      const isActive2 = await contract.connect(user2).isActiveVerifier(verifier2.address);
      const isInactive = await contract.connect(user1).isActiveVerifier(user1.address);

      expect(isActive1).to.be.true;
      expect(isActive2).to.be.true;
      expect(isInactive).to.be.false;
    });

    it("Should allow anyone to get verifier details", async function () {
      const details = await contract.connect(user1).getVerifierEntity(verifier1.address);
      
      expect(details.name).to.equal("Mexican Verifier");
      expect(details.country).to.equal("MX");
      expect(details.isActive).to.be.true;
    });

    it("Should allow anyone to get verifiers by country", async function () {
      const mxVerifiers = await contract.connect(user1).getVerifiersForCountry("MX");
      const usVerifiers = await contract.connect(user2).getVerifiersForCountry("US");

      expect(mxVerifiers).to.include(verifier1.address);
      expect(usVerifiers).to.include(verifier2.address);
    });

    it("Should allow anyone to get all verifiers", async function () {
      const allVerifiers = await contract.connect(user1).getAllVerifiers();
      
      expect(allVerifiers).to.include(verifier1.address);
      expect(allVerifiers).to.include(verifier2.address);
      expect(allVerifiers.length).to.equal(2);
    });
  });

  describe("FIEL Integration with Verifiers", function () {
    it("Should register FIEL-specific verifier", async function () {
      await contract.registerVerifierEntity(
        verifier1.address,
        "SAT Mexico - FIEL Authority",
        "MX",
        "Servicio de Administración Tributaria - Autoridad Certificadora",
        ["MX"]
      );

      const details = await contract.getVerifierEntity(verifier1.address);
      expect(details.name).to.include("FIEL");
      expect(details.country).to.equal("MX");
      expect(details.accreditation).to.include("Tributaria");
    });

    it("Should support multiple signature types per verifier", async function () {
      // Register international verifier supporting multiple signature types
      await contract.registerVerifierEntity(
        verifier1.address,
        "International Certification Body",
        "CH",
        "ISO 17020, 17025 - Multi-country digital signature authority",
        ["MX", "US", "CA", "BR", "AR", "EU"]
      );

      const authorizedCountries = (await contract.getVerifierEntity(verifier1.address)).authorizedCountries;
      
      expect(authorizedCountries).to.include("MX"); // FIEL
      expect(authorizedCountries).to.include("US"); // PKI
      expect(authorizedCountries).to.include("BR"); // Certificado Digital
      expect(authorizedCountries).to.include("EU"); // eIDAS
    });
  });

  describe("Security and Access Control", function () {
    it("Should maintain proper role hierarchy", async function () {
      // Admin should have admin role
      const adminHasAdminRole = await contract.hasRole(admin.address, await contract.ADMIN());
      expect(adminHasAdminRole).to.be.true;

      // Register verifier
      await contract.registerVerifierEntity(
        verifier1.address,
        "Test Verifier",
        "MX",
        "Test Accreditation",
        ["MX"]
      );

      // Verifier should have verifier role but not admin role
      const verifierHasVerifierRole = await contract.hasRole(verifier1.address, await contract.VERIFIER());
      const verifierHasAdminRole = await contract.hasRole(verifier1.address, await contract.ADMIN());
      
      expect(verifierHasVerifierRole).to.be.true;
      expect(verifierHasAdminRole).to.be.false;

      // User should have no special roles
      const userHasVerifierRole = await contract.hasRole(user1.address, await contract.VERIFIER());
      const userHasAdminRole = await contract.hasRole(user1.address, await contract.ADMIN());
      
      expect(userHasVerifierRole).to.be.false;
      expect(userHasAdminRole).to.be.false;
    });

    it("Should prevent privilege escalation", async function () {
      // Register verifier
      await contract.registerVerifierEntity(
        verifier1.address,
        "Test Verifier",
        "MX",
        "Test Accreditation",
        ["MX"]
      );

      // Verifier should not be able to register other verifiers
      await expect(
        contract.connect(verifier1).registerVerifierEntity(
          verifier2.address,
          "Unauthorized Verifier",
          "US",
          "No Authority",
          ["US"]
        )
      ).to.be.revertedWith("Unauthorized");

      // Verifier should not be able to deactivate other verifiers
      await expect(
        contract.connect(verifier1).deactivateVerifierEntity(verifier2.address)
      ).to.be.revertedWith("Unauthorized");
    });
  });
});