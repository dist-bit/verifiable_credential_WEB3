const hre = require("hardhat");

async function main() {
  console.log("🚀 Starting full deployment...");

  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  // Deploy NebuVC first
  console.log("\n📄 Deploying NebuVC...");
  const NebuVC = await hre.ethers.getContractFactory("NebuVC");
  const nebuVC = await NebuVC.deploy();
  await nebuVC.waitForDeployment();
  console.log("NebuVC deployed to:", await nebuVC.getAddress());

  // Deploy NebuIAVC
  console.log("\n📄 Deploying NebuIAVC...");
  const NebuIAVC = await hre.ethers.getContractFactory("NebuIAVC");
  const nebuIAVC = await NebuIAVC.deploy(
    "https://nebuia.com/issuer",
    ["https://www.w3.org/2018/credentials/v1", "https://nebuia.com/credentials/v1"],
    "https://nebuia.com/credentials/identity/1",
    ["VerifiableCredential", "IdentityCredential"],
    "https://nebuia.com/issuer#key-1",
    {
      id: "https://nebuia.com/schemas/identity.json",
      typeSchema: "JsonSchemaValidator2018"
    },
    "QmNebuIALogoHash"
  );
  await nebuIAVC.waitForDeployment();
  console.log("NebuIAVC deployed to:", await nebuIAVC.getAddress());

  // Deploy AlumniOfVC
  console.log("\n📄 Deploying AlumniOfVC...");
  const AlumniOfVC = await hre.ethers.getContractFactory("AlumniOfVC");
  const alumniOfVC = await AlumniOfVC.deploy(
    "https://university.edu/issuer",
    ["https://www.w3.org/2018/credentials/v1", "https://university.edu/credentials/v1"],
    "https://university.edu/credentials/alumni/1",
    ["VerifiableCredential", "AlumniCredential"],
    "https://university.edu/issuer#key-1",
    {
      id: "https://university.edu/schemas/alumni.json",
      typeSchema: "JsonSchemaValidator2018"
    }
  );
  await alumniOfVC.waitForDeployment();
  console.log("AlumniOfVC deployed to:", await alumniOfVC.getAddress());

  // Deploy DocumentMultiSign
  console.log("\n📄 Deploying DocumentMultiSign...");
  const DocumentMultiSign = await hre.ethers.getContractFactory("DocumentMultiSign");
  const documentMultiSign = await DocumentMultiSign.deploy(
    "https://documents.org/issuer",
    ["https://www.w3.org/2018/credentials/v1", "https://documents.org/credentials/v1"],
    "https://documents.org/credentials/document/1",
    ["VerifiableCredential", "DocumentCredential"],
    "https://documents.org/issuer#key-1",
    {
      id: "https://documents.org/schemas/document.json",
      typeSchema: "JsonSchemaValidator2018"
    }
  );
  await documentMultiSign.waitForDeployment();
  console.log("DocumentMultiSign deployed to:", await documentMultiSign.getAddress());

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
    "QmIPPBlockLogoHash123456789"
  );
  await ippBlockVC.waitForDeployment();
  console.log("IPPBlockVC deployed to:", await ippBlockVC.getAddress());

  // Deployment summary
  console.log("\n✅ Deployment Summary:");
  console.log("======================");
  console.log("NebuVC:", await nebuVC.getAddress());
  console.log("NebuIAVC:", await nebuIAVC.getAddress());
  console.log("AlumniOfVC:", await alumniOfVC.getAddress());
  console.log("DocumentMultiSign:", await documentMultiSign.getAddress());
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
      NebuIAVC: await nebuIAVC.getAddress(),
      AlumniOfVC: await alumniOfVC.getAddress(),
      DocumentMultiSign: await documentMultiSign.getAddress(),
      IPPBlockVC: await ippBlockVC.getAddress()
    }
  };

  const deploymentPath = `./deployments/${hre.network.name}-full-deployment.json`;
  if (!fs.existsSync("./deployments")) {
    fs.mkdirSync("./deployments");
  }
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentData, null, 2));
  console.log(`\n📁 Deployment data saved to: ${deploymentPath}`);

  console.log("\n✨ All contracts deployed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });