const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying Supply Chain Tracking System...");

  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  const balance = await deployer.getBalance();
  console.log("Account balance:", hre.ethers.utils.formatEther(balance), "ETC");

  // Deploy SupplyChainTracker first
  console.log("\n📦 Deploying SupplyChainTracker...");
  const SupplyChainTracker = await hre.ethers.getContractFactory("SupplyChainTracker");

  // Deploy with origin certificate address as 0x0 initially (will be updated later)
  const supplyChainTracker = await SupplyChainTracker.deploy(
    "0x0000000000000000000000000000000000000000"
  );
  await supplyChainTracker.deployed();
  console.log("✅ SupplyChainTracker deployed to:", supplyChainTracker.address);

  // Get existing contract addresses (if they exist)
  let tradeAgreementAddress = process.env.TRADE_AGREEMENT_REGISTRY_ADDRESS;
  let originCertificateAddress = process.env.ORIGIN_CERTIFICATE_ADDRESS;

  // Deploy TradeAgreementRegistry if not exists
  if (!tradeAgreementAddress) {
    console.log("\n📜 Deploying TradeAgreementRegistry...");
    const TradeAgreementRegistry = await hre.ethers.getContractFactory("TradeAgreementRegistry");
    const tradeAgreementRegistry = await TradeAgreementRegistry.deploy();
    await tradeAgreementRegistry.deployed();
    tradeAgreementAddress = tradeAgreementRegistry.address;
    console.log("✅ TradeAgreementRegistry deployed to:", tradeAgreementAddress);

    // Configure some default trade agreements
    console.log("\n🤝 Configuring trade agreements...");

    // USMCA
    await tradeAgreementRegistry.addAgreement(
      "USMCA",
      ["US", "MX", "CA"],
      60, // 60% RVC
      10, // 10% de minimis
      true, // cumulation allowed
      4 * 365 * 24 * 60 * 60 // 4 years validity
    );
    console.log("✅ USMCA configured");

    // CAFTA-DR
    await tradeAgreementRegistry.addAgreement(
      "CAFTA-DR",
      ["US", "CA", "SV", "GT", "HN", "NI", "CR", "DO"],
      35, // 35% RVC
      10, // 10% de minimis
      true, // cumulation allowed
      365 * 24 * 60 * 60 // 1 year validity
    );
    console.log("✅ CAFTA-DR configured");
  }

  // Deploy UniversalOriginCertificate if not exists
  if (!originCertificateAddress) {
    console.log("\n🌐 Deploying UniversalOriginCertificate...");
    const UniversalOriginCertificate = await hre.ethers.getContractFactory("UniversalOriginCertificate");
    const originCertificate = await UniversalOriginCertificate.deploy(
      tradeAgreementAddress,
      supplyChainTracker.address
    );
    await originCertificate.deployed();
    originCertificateAddress = originCertificate.address;
    console.log("✅ UniversalOriginCertificate deployed to:", originCertificateAddress);
  } else {
    // Update existing certificate contract with supply chain tracker
    console.log("\n🔄 Updating UniversalOriginCertificate with SupplyChainTracker...");
    const originCertificate = await hre.ethers.getContractAt(
      "UniversalOriginCertificate",
      originCertificateAddress
    );
    await originCertificate.setSupplyChainTracker(supplyChainTracker.address);
    console.log("✅ SupplyChainTracker linked to UniversalOriginCertificate");
  }

  // Authorize some default actors
  console.log("\n👥 Authorizing default actors...");

  // Authorize the origin certificate contract
  await supplyChainTracker.authorizeActor(originCertificateAddress, true);
  console.log("✅ UniversalOriginCertificate authorized as actor");

  // Authorize the deployer as initial actor
  await supplyChainTracker.authorizeActor(deployer.address, true);
  console.log("✅ Deployer authorized as actor");

  // Print deployment summary
  console.log("\n" + "=".repeat(60));
  console.log("📋 DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log("SupplyChainTracker:", supplyChainTracker.address);
  console.log("TradeAgreementRegistry:", tradeAgreementAddress);
  console.log("UniversalOriginCertificate:", originCertificateAddress);
  console.log("=".repeat(60));

  // Save addresses to .env file format
  console.log("\n📝 Add these to your .env file:");
  console.log(`SUPPLY_CHAIN_CONTRACT=${supplyChainTracker.address}`);
  console.log(`TRADE_AGREEMENT_REGISTRY_ADDRESS=${tradeAgreementAddress}`);
  console.log(`ORIGIN_CERTIFICATE_ADDRESS=${originCertificateAddress}`);

  // Verify contracts on Etherscan (if applicable)
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\n📝 Waiting for block confirmations...");
    await supplyChainTracker.deployTransaction.wait(5);

    console.log("Verifying SupplyChainTracker on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: supplyChainTracker.address,
        constructorArguments: ["0x0000000000000000000000000000000000000000"],
      });
    } catch (error) {
      console.log("Verification error:", error.message);
    }
  }

  console.log("\n✅ Deployment complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });