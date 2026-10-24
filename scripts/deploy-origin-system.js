const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🌍 Deploying Universal Origin Certification System...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("📍 Deployer:", deployer.address);
  console.log("💰 Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH\n");

  const deployments = {};

  try {
    // 1. Deploy TradeAgreementRegistry
    console.log("1️⃣ Deploying TradeAgreementRegistry...");
    const TradeAgreementRegistry = await hre.ethers.getContractFactory("TradeAgreementRegistry");
    const tradeRegistry = await TradeAgreementRegistry.deploy();
    await tradeRegistry.waitForDeployment();
    deployments.TradeAgreementRegistry = await tradeRegistry.getAddress();
    console.log("✅ TradeAgreementRegistry:", deployments.TradeAgreementRegistry);

    // 2. Deploy UniversalOriginCertificate
    console.log("\n2️⃣ Deploying UniversalOriginCertificate...");
    const UniversalOriginCertificate = await hre.ethers.getContractFactory("UniversalOriginCertificate");
    const universalCert = await UniversalOriginCertificate.deploy(deployments.TradeAgreementRegistry);
    await universalCert.waitForDeployment();
    deployments.UniversalOriginCertificate = await universalCert.getAddress();
    console.log("✅ UniversalOriginCertificate:", deployments.UniversalOriginCertificate);

    // 3. Deploy OriginCertificateFinal (optimized version)
    console.log("\n3️⃣ Deploying OriginCertificateFinal...");
    const OriginCertificateFinal = await hre.ethers.getContractFactory("OriginCertificateFinal");
    const finalCert = await OriginCertificateFinal.deploy();
    await finalCert.waitForDeployment();
    deployments.OriginCertificateFinal = await finalCert.getAddress();
    console.log("✅ OriginCertificateFinal:", deployments.OriginCertificateFinal);

    // 4. Deploy MinimalOriginCertificate (basic version)
    console.log("\n4️⃣ Deploying MinimalOriginCertificate...");
    const MinimalOriginCertificate = await hre.ethers.getContractFactory("MinimalOriginCertificate");
    const minimalCert = await MinimalOriginCertificate.deploy();
    await minimalCert.waitForDeployment();
    deployments.MinimalOriginCertificate = await minimalCert.getAddress();
    console.log("✅ MinimalOriginCertificate:", deployments.MinimalOriginCertificate);

    // Save deployment info
    const deploymentsPath = path.join(__dirname, "../deployments");
    if (!fs.existsSync(deploymentsPath)) {
      fs.mkdirSync(deploymentsPath);
    }

    fs.writeFileSync(
      path.join(deploymentsPath, `origin-system-${hre.network.name}.json`),
      JSON.stringify({
        network: hre.network.name,
        chainId: hre.network.config.chainId,
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        contracts: deployments,
        notes: {
          TradeAgreementRegistry: "Registro de acuerdos comerciales (USMCA, CAFTA-DR, etc.)",
          UniversalOriginCertificate: "Sistema completo con todas las funcionalidades",
          OriginCertificateFinal: "Versión optimizada para menor consumo de gas",
          MinimalOriginCertificate: "Versión básica mínima"
        }
      }, null, 2)
    );

    console.log("\n✅ Origin Certification System deployed successfully!");
    console.log("\n📊 Summary:");
    console.log("- Trade agreements supported: USMCA, CAFTA-DR, CPTPP, EU-MX");
    console.log("- Countries supported: ANY country (universal system)");
    console.log("- FIEL integration: ✅ Ready");
    console.log("- Multiple versions available for different use cases");

  } catch (error) {
    console.error("\n❌ Deployment failed:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });