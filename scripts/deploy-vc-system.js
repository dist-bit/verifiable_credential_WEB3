const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("📜 Deploying Verifiable Credential System...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("📍 Network:", hre.network.name);
  console.log("📍 Deployer:", deployer.address);
  console.log("💰 Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH\n");

  const deployments = {};

  try {
    // 1. Deploy VC (Main Verifier)
    console.log("1️⃣ Deploying VC Verifier (NebuVC)...");
    const VC = await hre.ethers.getContractFactory("NebuVC");
    const vc = await VC.deploy();
    await vc.waitForDeployment();
    deployments.VCVerifier = await vc.getAddress();
    console.log("✅ VC Verifier deployed to:", deployments.VCVerifier);

    // 2. Deploy Store
    console.log("\n2️⃣ Deploying Store contract...");
    const Store = await hre.ethers.getContractFactory("Store");
    const store = await Store.deploy();
    await store.waitForDeployment();
    deployments.Store = await store.getAddress();
    console.log("✅ Store deployed to:", deployments.Store);

    // Save deployment info
    const deploymentsPath = path.join(__dirname, "../deployments");
    if (!fs.existsSync(deploymentsPath)) {
      fs.mkdirSync(deploymentsPath);
    }

    const deploymentFile = path.join(deploymentsPath, `vc-system-${hre.network.name}.json`);
    fs.writeFileSync(
      deploymentFile,
      JSON.stringify({
        network: hre.network.name,
        chainId: hre.network.config.chainId,
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        contracts: deployments,
        notes: {
          VCVerifier: "Main verifiable credential verifier contract",
          Store: "Storage contract for credential data"
        }
      }, null, 2)
    );

    console.log("\n✅ VC System deployment complete!");
    console.log(`📄 Deployment saved to: ${deploymentFile}`);
    console.log("\n📊 Summary:");
    console.log("- VC Verifier (NebuVC) deployed");
    console.log("- Store contract deployed");
    console.log("- Ready for credential verification");

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