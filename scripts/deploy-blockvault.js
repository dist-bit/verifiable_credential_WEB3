const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🏦 Deploying BlockVault System...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("📍 Network:", hre.network.name);
  console.log("📍 Deployer:", deployer.address);
  console.log("💰 Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH\n");

  const deployments = {};

  try {
    // Deploy BlockVault
    console.log("1️⃣ Deploying BlockVault...");
    const BlockVault = await hre.ethers.getContractFactory("BlockVault");
    const vault = await BlockVault.deploy(deployer.address);
    await vault.waitForDeployment();
    deployments.BlockVault = await vault.getAddress();
    console.log("✅ BlockVault deployed to:", deployments.BlockVault);

    // Configure initial settings
    console.log("\n2️⃣ Configuring BlockVault...");
    
    // Set platform fee (ejemplo: 2.5%)
    await vault.setPlatformFee(250); // 250 basis points = 2.5%
    console.log("✅ Platform fee set to 2.5%");

    // Set storage prices
    await vault.setStoragePrice(1, hre.ethers.parseEther("0.001")); // 1GB = 0.001 ETH
    await vault.setStoragePrice(10, hre.ethers.parseEther("0.008")); // 10GB = 0.008 ETH
    await vault.setStoragePrice(100, hre.ethers.parseEther("0.05")); // 100GB = 0.05 ETH
    console.log("✅ Storage prices configured");

    // Save deployment info
    const deploymentsPath = path.join(__dirname, "../deployments");
    if (!fs.existsSync(deploymentsPath)) {
      fs.mkdirSync(deploymentsPath);
    }

    const deploymentFile = path.join(deploymentsPath, `blockvault-${hre.network.name}.json`);
    fs.writeFileSync(
      deploymentFile,
      JSON.stringify({
        network: hre.network.name,
        chainId: hre.network.config.chainId,
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        contracts: deployments,
        configuration: {
          platformFee: "2.5%",
          storagePrices: {
            "1GB": "0.001 ETH",
            "10GB": "0.008 ETH",
            "100GB": "0.05 ETH"
          }
        }
      }, null, 2)
    );

    console.log("\n✅ BlockVault deployment complete!");
    console.log(`📄 Deployment saved to: ${deploymentFile}`);
    console.log("\n📊 Summary:");
    console.log("- Platform fee: 2.5%");
    console.log("- Storage prices configured");
    console.log("- Owner:", deployer.address);

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