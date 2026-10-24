const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Starting Complete Origin Certification System Deployment...");
  console.log("=" .repeat(60));

  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("📍 Deployer address:", deployer.address);

  const balance = await deployer.getBalance();
  console.log("💰 Account balance:", hre.ethers.utils.formatEther(balance), "ETC");

  if (balance.lt(hre.ethers.utils.parseEther("0.5"))) {
    console.error("❌ Insufficient balance. Need at least 0.5 ETC for deployment");
    process.exit(1);
  }

  const deployedContracts = {};

  // ============================================
  // 1. Deploy contracts WITHOUT dependencies
  // ============================================

  console.log("\n" + "=".repeat(60));
  console.log("📦 PHASE 1: Deploying Independent Contracts");
  console.log("=".repeat(60));

  // 1.1 Deploy TradeAgreementRegistry
  console.log("\n📜 Deploying TradeAgreementRegistry...");
  const TradeAgreementRegistry = await hre.ethers.getContractFactory("TradeAgreementRegistry");
  const tradeAgreementRegistry = await TradeAgreementRegistry.deploy();
  await tradeAgreementRegistry.deployed();
  deployedContracts.TradeAgreementRegistry = tradeAgreementRegistry.address;
  console.log("✅ TradeAgreementRegistry:", tradeAgreementRegistry.address);

  // 1.2 Deploy CountryAuthorityManager
  console.log("\n🏛️ Deploying CountryAuthorityManager...");
  const CountryAuthorityManager = await hre.ethers.getContractFactory("CountryAuthorityManager");
  const countryAuthorityManager = await CountryAuthorityManager.deploy();
  await countryAuthorityManager.deployed();
  deployedContracts.CountryAuthorityManager = countryAuthorityManager.address;
  console.log("✅ CountryAuthorityManager:", countryAuthorityManager.address);

  // 1.3 Deploy DigitalSignatureVerifier
  console.log("\n🔐 Deploying DigitalSignatureVerifier...");
  const DigitalSignatureVerifier = await hre.ethers.getContractFactory("DigitalSignatureVerifier");
  const digitalSignatureVerifier = await DigitalSignatureVerifier.deploy();
  await digitalSignatureVerifier.deployed();
  deployedContracts.DigitalSignatureVerifier = digitalSignatureVerifier.address;
  console.log("✅ DigitalSignatureVerifier:", digitalSignatureVerifier.address);

  // 1.4 Deploy FIELIntegration
  console.log("\n🇲🇽 Deploying FIELIntegration...");
  const FIELIntegration = await hre.ethers.getContractFactory("FIELIntegration");
  const fielIntegration = await FIELIntegration.deploy();
  await fielIntegration.deployed();
  deployedContracts.FIELIntegration = fielIntegration.address;
  console.log("✅ FIELIntegration:", fielIntegration.address);

  // 1.5 Deploy UniversalSignatureVerifier
  console.log("\n🌐 Deploying UniversalSignatureVerifier...");
  const UniversalSignatureVerifier = await hre.ethers.getContractFactory("UniversalSignatureVerifier");
  const universalSignatureVerifier = await UniversalSignatureVerifier.deploy();
  await universalSignatureVerifier.deployed();
  deployedContracts.UniversalSignatureVerifier = universalSignatureVerifier.address;
  console.log("✅ UniversalSignatureVerifier:", universalSignatureVerifier.address);

  // ============================================
  // 2. Deploy SupplyChainTracker (needs origin certificate address, but we'll update it later)
  // ============================================

  console.log("\n" + "=".repeat(60));
  console.log("📦 PHASE 2: Deploying Supply Chain Tracker");
  console.log("=".repeat(60));

  console.log("\n🚚 Deploying SupplyChainTracker...");
  const SupplyChainTracker = await hre.ethers.getContractFactory("SupplyChainTracker");
  // Deploy with zero address initially, will update later
  const supplyChainTracker = await SupplyChainTracker.deploy(
    "0x0000000000000000000000000000000000000000"
  );
  await supplyChainTracker.deployed();
  deployedContracts.SupplyChainTracker = supplyChainTracker.address;
  console.log("✅ SupplyChainTracker:", supplyChainTracker.address);

  // ============================================
  // 3. Deploy UniversalOriginCertificate (depends on TradeAgreementRegistry and SupplyChainTracker)
  // ============================================

  console.log("\n" + "=".repeat(60));
  console.log("📦 PHASE 3: Deploying Universal Origin Certificate");
  console.log("=".repeat(60));

  console.log("\n🌍 Deploying UniversalOriginCertificate...");
  const UniversalOriginCertificate = await hre.ethers.getContractFactory("UniversalOriginCertificate");
  const universalOriginCertificate = await UniversalOriginCertificate.deploy(
    tradeAgreementRegistry.address,
    supplyChainTracker.address
  );
  await universalOriginCertificate.deployed();
  deployedContracts.UniversalOriginCertificate = universalOriginCertificate.address;
  console.log("✅ UniversalOriginCertificate:", universalOriginCertificate.address);

  // ============================================
  // 4. Configure contracts
  // ============================================

  console.log("\n" + "=".repeat(60));
  console.log("⚙️ PHASE 4: Configuring Contracts");
  console.log("=".repeat(60));

  // 4.1 Configure Trade Agreements
  console.log("\n🤝 Configuring trade agreements...");

  // USMCA (T-MEC)
  await tradeAgreementRegistry.addAgreement(
    "USMCA",
    ["US", "MX", "CA"],
    60, // 60% RVC
    10, // 10% de minimis
    true, // cumulation allowed
    4 * 365 * 24 * 60 * 60 // 4 years validity
  );
  console.log("  ✅ USMCA/T-MEC configured");

  // CAFTA-DR
  await tradeAgreementRegistry.addAgreement(
    "CAFTA-DR",
    ["US", "CA", "SV", "GT", "HN", "NI", "CR", "DO"],
    35, // 35% RVC
    10, // 10% de minimis
    true, // cumulation allowed
    365 * 24 * 60 * 60 // 1 year validity
  );
  console.log("  ✅ CAFTA-DR configured");

  // CPTPP
  await tradeAgreementRegistry.addAgreement(
    "CPTPP",
    ["AU", "BN", "CA", "CL", "JP", "MY", "MX", "NZ", "PE", "SG", "VN"],
    45, // 45% RVC
    10, // 10% de minimis
    true, // cumulation allowed
    365 * 24 * 60 * 60 // 1 year validity
  );
  console.log("  ✅ CPTPP configured");

  // EU-Mexico
  await tradeAgreementRegistry.addAgreement(
    "EU-MEXICO",
    ["MX", "EU"],
    50, // 50% RVC
    10, // 10% de minimis
    true, // cumulation allowed
    2 * 365 * 24 * 60 * 60 // 2 years validity
  );
  console.log("  ✅ EU-Mexico configured");

  // 4.2 Configure Country Authorities
  console.log("\n🏛️ Configuring country authorities...");

  // Mexico authorities
  await countryAuthorityManager.registerAuthority(
    "MX",
    "CHAMBER_OF_COMMERCE",
    deployer.address, // Would be real chamber address
    "Cámara de Comercio de México",
    true
  );
  console.log("  ✅ Mexico Chamber of Commerce registered");

  await countryAuthorityManager.registerAuthority(
    "MX",
    "CUSTOMS",
    deployer.address, // Would be SAT address
    "SAT - Servicio de Administración Tributaria",
    true
  );
  console.log("  ✅ Mexico SAT registered");

  // USA authorities
  await countryAuthorityManager.registerAuthority(
    "US",
    "CHAMBER_OF_COMMERCE",
    deployer.address, // Would be real chamber address
    "US Chamber of Commerce",
    true
  );
  console.log("  ✅ US Chamber of Commerce registered");

  // 4.3 Authorize actors in SupplyChainTracker
  console.log("\n👥 Authorizing supply chain actors...");

  await supplyChainTracker.authorizeActor(universalOriginCertificate.address, true);
  console.log("  ✅ UniversalOriginCertificate authorized");

  await supplyChainTracker.authorizeActor(deployer.address, true);
  console.log("  ✅ Deployer authorized");

  // 4.4 Configure signature verifiers
  console.log("\n🔐 Configuring signature verifiers...");

  // Register FIELIntegration in DigitalSignatureVerifier
  await digitalSignatureVerifier.setCountryVerifier("MX", fielIntegration.address);
  console.log("  ✅ FIEL configured for Mexico");

  await digitalSignatureVerifier.setCountryVerifier("US", universalSignatureVerifier.address);
  console.log("  ✅ Universal verifier configured for USA");

  // ============================================
  // 5. Save deployment info
  // ============================================

  console.log("\n" + "=".repeat(60));
  console.log("💾 PHASE 5: Saving Deployment Information");
  console.log("=".repeat(60));

  // Create deployment info object
  const deploymentInfo = {
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: deployedContracts,
    gasUsed: "Check individual transactions",
    blockNumber: await hre.ethers.provider.getBlockNumber()
  };

  // Save to JSON file
  const deploymentPath = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentPath)) {
    fs.mkdirSync(deploymentPath);
  }

  const filename = `deployment-${hre.network.name}-${Date.now()}.json`;
  fs.writeFileSync(
    path.join(deploymentPath, filename),
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log(`\n📄 Deployment info saved to: deployments/${filename}`);

  // ============================================
  // 6. Print summary
  // ============================================

  console.log("\n" + "=".repeat(60));
  console.log("🎉 DEPLOYMENT COMPLETE!");
  console.log("=".repeat(60));

  console.log("\n📋 CONTRACT ADDRESSES:");
  console.log("-".repeat(60));
  Object.entries(deployedContracts).forEach(([name, address]) => {
    console.log(`${name.padEnd(30)} : ${address}`);
  });

  console.log("\n📝 Add these to your .env file:");
  console.log("-".repeat(60));
  console.log(`# Origin Certification Contracts - Deployed ${new Date().toISOString()}`);
  console.log(`TRADE_AGREEMENT_REGISTRY=${deployedContracts.TradeAgreementRegistry}`);
  console.log(`COUNTRY_AUTHORITY_MANAGER=${deployedContracts.CountryAuthorityManager}`);
  console.log(`DIGITAL_SIGNATURE_VERIFIER=${deployedContracts.DigitalSignatureVerifier}`);
  console.log(`FIEL_INTEGRATION=${deployedContracts.FIELIntegration}`);
  console.log(`UNIVERSAL_SIGNATURE_VERIFIER=${deployedContracts.UniversalSignatureVerifier}`);
  console.log(`SUPPLY_CHAIN_TRACKER=${deployedContracts.SupplyChainTracker}`);
  console.log(`UNIVERSAL_ORIGIN_CERTIFICATE=${deployedContracts.UniversalOriginCertificate}`);

  console.log("\n🔗 Integration status:");
  console.log("-".repeat(60));
  console.log("✅ TradeAgreementRegistry ← UniversalOriginCertificate");
  console.log("✅ SupplyChainTracker ← UniversalOriginCertificate");
  console.log("✅ CountryAuthorityManager (independent)");
  console.log("✅ DigitalSignatureVerifier ← FIELIntegration (MX)");
  console.log("✅ DigitalSignatureVerifier ← UniversalSignatureVerifier (US)");

  console.log("\n⚡ Next steps:");
  console.log("-".repeat(60));
  console.log("1. Update backend .env with contract addresses");
  console.log("2. Restart backend services");
  console.log("3. Test certificate creation with supply chain tracking");
  console.log("4. Verify on block explorer if needed");

  const finalBalance = await deployer.getBalance();
  const gasUsed = balance.sub(finalBalance);
  console.log("\n⛽ Gas Statistics:");
  console.log("-".repeat(60));
  console.log("Initial balance:", hre.ethers.utils.formatEther(balance), "ETC");
  console.log("Final balance:", hre.ethers.utils.formatEther(finalBalance), "ETC");
  console.log("Total gas used:", hre.ethers.utils.formatEther(gasUsed), "ETC");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  });