const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Starting deployment...\n");

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("📍 Deploying contracts with account:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "ETH\n");

  // Deployment results
  const deployments = {};

  try {
    // 1. Deploy VC (Main Verifier Contract)
    console.log("\n📜 Deploying VC (Main Verifier)...");
    const VC = await hre.ethers.getContractFactory("NebuVC");
    const vc = await VC.deploy();
    await vc.waitForDeployment();
    deployments.VC = await vc.getAddress();
    console.log("✅ VC deployed to:", deployments.VC);

    // 2. Deploy Store
    console.log("\n📦 Deploying Store...");
    const Store = await hre.ethers.getContractFactory("Store");
    const store = await Store.deploy();
    await store.waitForDeployment();
    deployments.Store = await store.getAddress();
    console.log("✅ Store deployed to:", deployments.Store);

    // 3. Deploy BlockVault
    console.log("\n🏦 Deploying BlockVault...");
    const BlockVault = await hre.ethers.getContractFactory("BlockVault");
    const blockVault = await BlockVault.deploy(deployer.address);
    await blockVault.waitForDeployment();
    deployments.BlockVault = await blockVault.getAddress();
    console.log("✅ BlockVault deployed to:", deployments.BlockVault);

    // 4. Deploy OriginCertificateFinal
    console.log("\n🌍 Deploying OriginCertificateFinal...");
    const OriginCertificateFinal = await hre.ethers.getContractFactory("OriginCertificateFinal");
    const originCert = await OriginCertificateFinal.deploy();
    await originCert.waitForDeployment();
    deployments.OriginCertificateFinal = await originCert.getAddress();
    console.log("✅ OriginCertificateFinal deployed to:", deployments.OriginCertificateFinal);

    // Save deployment addresses
    const deploymentsPath = path.join(__dirname, "../deployments");
    if (!fs.existsSync(deploymentsPath)) {
      fs.mkdirSync(deploymentsPath);
    }

    const deploymentFile = path.join(deploymentsPath, `deployment-${hre.network.name}.json`);
    fs.writeFileSync(
      deploymentFile,
      JSON.stringify({
        network: hre.network.name,
        chainId: hre.network.config.chainId,
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        contracts: deployments
      }, null, 2)
    );

    console.log("\n✅ Deployment complete!");
    console.log(`📄 Deployment addresses saved to: ${deploymentFile}`);

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