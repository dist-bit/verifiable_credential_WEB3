const hre = require("hardhat");

async function main() {
  console.log("🚀 Starting IPPBlock deployment...");

  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  // Deploy NebuVC first (if not already deployed)
  console.log("\n📄 Deploying NebuVC...");
  const NebuVC = await hre.ethers.getContractFactory("NebuVC");
  const nebuVC = await NebuVC.deploy();
  await nebuVC.waitForDeployment();
  console.log("NebuVC deployed to:", await nebuVC.getAddress());

  // Deploy IPPBlockVC
  console.log("\n📄 Deploying IPPBlockVC...");
  const IPPBlockVC = await hre.ethers.getContractFactory("IPPBlockVC");
  
  const ippBlockVC = await IPPBlockVC.deploy(
    "https://ippblock.io/issuers/001",
    ["https://www.w3.org/2018/credentials/v1", "https://ippblock.io/credentials/v1"],
    "https://ippblock.io/credentials/ip/1",
    ["VerifiableCredential", "IntellectualPropertyCredential"],
    "https://ippblock.io/issuers/001#key-1",
    {
      id: "https://ippblock.io/schemas/intellectual-property.json",
      typeSchema: "JsonSchemaValidator2018"
    },
    "QmIPPBlockLogoHash123456789" // Logo hash
  );

  await ippBlockVC.waitForDeployment();
  console.log("IPPBlockVC deployed to:", await ippBlockVC.getAddress());

  // Verify deployment
  console.log("\n✅ Deployment Summary:");
  console.log("======================");
  console.log("NebuVC:", await nebuVC.getAddress());
  console.log("IPPBlockVC:", await ippBlockVC.getAddress());
  console.log("Deployer:", deployer.address);
  console.log("Network:", hre.network.name);
  console.log("Chain ID:", (await deployer.provider.getNetwork()).chainId);

  // Save deployment addresses
  const fs = require("fs");
  const deploymentData = {
    network: hre.network.name,
    chainId: (await deployer.provider.getNetwork()).chainId.toString(),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      NebuVC: await nebuVC.getAddress(),
      IPPBlockVC: await ippBlockVC.getAddress()
    }
  };

  const deploymentPath = `./deployments/${hre.network.name}-deployment.json`;
  if (!fs.existsSync("./deployments")) {
    fs.mkdirSync("./deployments");
  }
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentData, null, 2));
  console.log(`\n📁 Deployment data saved to: ${deploymentPath}`);

  // Test basic functionality
  console.log("\n🧪 Testing basic functionality...");
  const version = await ippBlockVC.viewVersion();
  console.log("IPPBlock version:", version);
  
  const issuer = await ippBlockVC.issuer();
  console.log("Issuer:", issuer);
  
  const owner = await ippBlockVC.owner();
  console.log("Contract owner:", owner);

  console.log("\n✨ Deployment completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });