const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Deploying ALL Contracts to", hre.network.name.toUpperCase(), "...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("📍 Network:", hre.network.name);
  console.log("📍 Chain ID:", hre.network.config.chainId);
  console.log("📍 Deployer:", deployer.address);
  console.log("💰 Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH\n");

  const deployments = {};

  try {
    // 1. VC System
    console.log("=== 📜 VC SYSTEM ===");
    console.log("1️⃣ Deploying VC Verifier...");
    const VC = await hre.ethers.getContractFactory("NebuVC");
    const vc = await VC.deploy();
    await vc.waitForDeployment();
    deployments.VCVerifier = await vc.getAddress();
    console.log("✅ VC Verifier:", deployments.VCVerifier);

    console.log("2️⃣ Deploying Store...");
    const Store = await hre.ethers.getContractFactory("Store");
    const store = await Store.deploy();
    await store.waitForDeployment();
    deployments.Store = await store.getAddress();
    console.log("✅ Store:", deployments.Store);

    // 2. BlockVault
    console.log("\n=== 🏦 BLOCKVAULT ===");
    console.log("3️⃣ Deploying BlockVault...");
    const BlockVault = await hre.ethers.getContractFactory("BlockVault");
    const vault = await BlockVault.deploy(deployer.address);
    await vault.waitForDeployment();
    deployments.BlockVault = await vault.getAddress();
    console.log("✅ BlockVault:", deployments.BlockVault);

    // Configure BlockVault
    await vault.setPlatformFee(250); // 2.5%
    await vault.setStoragePrice(1, hre.ethers.parseEther("0.001"));
    await vault.setStoragePrice(10, hre.ethers.parseEther("0.008"));
    await vault.setStoragePrice(100, hre.ethers.parseEther("0.05"));
    console.log("✅ BlockVault configured");

    // 3. Origin Certification
    console.log("\n=== 🌍 ORIGIN CERTIFICATION ===");
    console.log("4️⃣ Deploying TradeAgreementRegistry...");
    const TradeRegistry = await hre.ethers.getContractFactory("TradeAgreementRegistry");
    const tradeRegistry = await TradeRegistry.deploy();
    await tradeRegistry.waitForDeployment();
    deployments.TradeAgreementRegistry = await tradeRegistry.getAddress();
    console.log("✅ TradeAgreementRegistry:", deployments.TradeAgreementRegistry);

    console.log("5️⃣ Deploying UniversalOriginCertificate...");
    const UniversalOrigin = await hre.ethers.getContractFactory("UniversalOriginCertificate");
    const universalOrigin = await UniversalOrigin.deploy(deployments.TradeAgreementRegistry);
    await universalOrigin.waitForDeployment();
    deployments.UniversalOriginCertificate = await universalOrigin.getAddress();
    console.log("✅ UniversalOriginCertificate:", deployments.UniversalOriginCertificate);

    console.log("6️⃣ Deploying OriginCertificateFinal...");
    const OriginFinal = await hre.ethers.getContractFactory("OriginCertificateFinal");
    const originFinal = await OriginFinal.deploy();
    await originFinal.waitForDeployment();
    deployments.OriginCertificateFinal = await originFinal.getAddress();
    console.log("✅ OriginCertificateFinal:", deployments.OriginCertificateFinal);

    console.log("7️⃣ Deploying MinimalOriginCertificate...");
    const MinimalOrigin = await hre.ethers.getContractFactory("MinimalOriginCertificate");
    const minimalOrigin = await MinimalOrigin.deploy();
    await minimalOrigin.waitForDeployment();
    deployments.MinimalOriginCertificate = await minimalOrigin.getAddress();
    console.log("✅ MinimalOriginCertificate:", deployments.MinimalOriginCertificate);

    // Save deployment info
    const deploymentsPath = path.join(__dirname, "../deployments");
    if (!fs.existsSync(deploymentsPath)) {
      fs.mkdirSync(deploymentsPath);
    }

    const deploymentFile = path.join(deploymentsPath, `all-contracts-${hre.network.name}.json`);
    fs.writeFileSync(
      deploymentFile,
      JSON.stringify({
        network: hre.network.name,
        chainId: hre.network.config.chainId,
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        contracts: deployments,
        gasUsed: "Check transaction receipts for gas usage",
        systems: {
          vcSystem: {
            verifier: deployments.VCVerifier,
            store: deployments.Store
          },
          blockVault: {
            vault: deployments.BlockVault,
            platformFee: "2.5%"
          },
          originCertification: {
            tradeRegistry: deployments.TradeAgreementRegistry,
            universal: deployments.UniversalOriginCertificate,
            optimized: deployments.OriginCertificateFinal,
            minimal: deployments.MinimalOriginCertificate
          }
        }
      }, null, 2)
    );

    console.log("\n✅ ALL DEPLOYMENTS COMPLETE!");
    console.log(`📄 Deployment saved to: ${deploymentFile}`);
    console.log("\n📊 DEPLOYMENT SUMMARY:");
    console.log("=".repeat(50));
    console.log("VC System:");
    console.log("  - Verifier:", deployments.VCVerifier);
    console.log("  - Store:", deployments.Store);
    console.log("\nBlockVault:");
    console.log("  - Vault:", deployments.BlockVault);
    console.log("\nOrigin Certification:");
    console.log("  - Trade Registry:", deployments.TradeAgreementRegistry);
    console.log("  - Universal:", deployments.UniversalOriginCertificate);
    console.log("  - Optimized:", deployments.OriginCertificateFinal);
    console.log("  - Minimal:", deployments.MinimalOriginCertificate);
    console.log("=".repeat(50));

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