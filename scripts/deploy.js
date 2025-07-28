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

  // Deploy Libraries
  console.log("📚 Deploying libraries...");
  
  const ZeroCopySink = await hre.ethers.getContractFactory("ZeroCopySink");
  const zeroCopySink = await ZeroCopySink.deploy();
  await zeroCopySink.waitForDeployment();
  console.log("✅ ZeroCopySink deployed to:", await zeroCopySink.getAddress());

  const ZeroCopySource = await hre.ethers.getContractFactory("ZeroCopySource");
  const zeroCopySource = await ZeroCopySource.deploy();
  await zeroCopySource.waitForDeployment();
  console.log("✅ ZeroCopySource deployed to:", await zeroCopySource.getAddress());

  // Deploy Store contract
  console.log("\n📦 Deploying Store contract...");
  const Store = await hre.ethers.getContractFactory("Store");
  const store = await Store.deploy();
  await store.waitForDeployment();
  console.log("✅ Store deployed to:", await store.getAddress());

  // Deploy Main contracts with library links
  console.log("\n🏗️  Deploying main contracts...");

  // Deploy IPPBlockVC
  const IPPBlockVC = await hre.ethers.getContractFactory("IPPBlockVC", {
    libraries: {
      ZeroCopySink: await zeroCopySink.getAddress(),
      ZeroCopySource: await zeroCopySource.getAddress()
    }
  });

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
  console.log("✅ IPPBlockVC deployed to:", await ippBlockVC.getAddress());

  // Deploy NebuVC
  const NebuVC = await hre.ethers.getContractFactory("NebuVC", {
    libraries: {
      ZeroCopySink: await zeroCopySink.getAddress(),
      ZeroCopySource: await zeroCopySource.getAddress()
    }
  });

  const nebuVC = await NebuVC.deploy();
  await nebuVC.waitForDeployment();
  console.log("✅ NebuVC deployed to:", await nebuVC.getAddress());

  // Deploy AlumniOfVC (optional)
  const AlumniOfVC = await hre.ethers.getContractFactory("AlumniOfVC", {
    libraries: {
      ZeroCopySink: await zeroCopySink.getAddress(),
      ZeroCopySource: await zeroCopySource.getAddress()
    }
  });

  const alumniOfVC = await AlumniOfVC.deploy(
    "https://example.edu/issuers/565049",
    ["https://www.w3.org/2018/credentials/examples/v1", "https://www.w3.org/2018/credentials/examples/v2"],
    "http://example.edu/credentials/1872",
    ["VerifiableCredential", "UniversityDegreeCredential"],
    "https://example.edu/issuers/14#key-1",
    {
      id: "https://example.org/examples/degree.json",
      typeSchema: "JsonSchemaValidator2018"
    }
  );
  await alumniOfVC.waitForDeployment();
  console.log("✅ AlumniOfVC deployed to:", await alumniOfVC.getAddress());

  // Deploy DocumentMultiSign (optional)
  const DocumentMultiSign = await hre.ethers.getContractFactory("DocumentMultiSign", {
    libraries: {
      ZeroCopySink: await zeroCopySink.getAddress(),
      ZeroCopySource: await zeroCopySource.getAddress()
    }
  });

  const documentMultiSign = await DocumentMultiSign.deploy(
    "https://example.edu/issuers/565049",
    ["https://www.w3.org/2018/credentials/examples/v1", "https://www.w3.org/2018/credentials/examples/v2"],
    "http://example.edu/credentials/1872",
    ["VerifiableCredential", "DocumentSignatureCredential"],
    "https://example.edu/issuers/14#key-1",
    {
      id: "https://example.org/examples/document.json",
      typeSchema: "JsonSchemaValidator2018"
    }
  );
  await documentMultiSign.waitForDeployment();
  console.log("✅ DocumentMultiSign deployed to:", await documentMultiSign.getAddress());

  // Deploy NebuIAVC (optional)
  const NebuIAVC = await hre.ethers.getContractFactory("NebuIAVC", {
    libraries: {
      ZeroCopySink: await zeroCopySink.getAddress(),
      ZeroCopySource: await zeroCopySource.getAddress()
    }
  });

  const nebuIAVC = await NebuIAVC.deploy(
    "https://example.edu/issuers/565049",
    ["https://www.w3.org/2018/credentials/examples/v1", "https://www.w3.org/2018/credentials/examples/v2"],
    "http://example.edu/credentials/1872",
    ["VerifiableCredential", "IdentityCredential"],
    "https://example.edu/issuers/14#key-1",
    {
      id: "https://example.org/examples/identity.json",
      typeSchema: "JsonSchemaValidator2018"
    },
    "QmW6gFG2DPEBzG66yAunLGJRVWBj1d6MWsrjvhJWUfRu1H"
  );
  await nebuIAVC.waitForDeployment();
  console.log("✅ NebuIAVC deployed to:", await nebuIAVC.getAddress());

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    chainId: (await hre.ethers.provider.getNetwork()).chainId,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      libraries: {
        ZeroCopySink: await zeroCopySink.getAddress(),
        ZeroCopySource: await zeroCopySource.getAddress()
      },
      Store: await store.getAddress(),
      IPPBlockVC: await ippBlockVC.getAddress(),
      NebuVC: await nebuVC.getAddress(),
      AlumniOfVC: await alumniOfVC.getAddress(),
      DocumentMultiSign: await documentMultiSign.getAddress(),
      NebuIAVC: await nebuIAVC.getAddress()
    }
  };

  // Create deployments directory if it doesn't exist
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }

  // Save deployment info to file
  const deploymentFile = path.join(deploymentsDir, `${hre.network.name}-deployment.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));

  console.log("\n📄 Deployment info saved to:", deploymentFile);
  console.log("\n✨ Deployment completed successfully!");
  
  // Display summary
  console.log("\n📊 Deployment Summary:");
  console.log("====================");
  console.log(`Network: ${deploymentInfo.network}`);
  console.log(`Chain ID: ${deploymentInfo.chainId}`);
  console.log(`\nMain Contracts:`);
  console.log(`  - IPPBlockVC: ${deploymentInfo.contracts.IPPBlockVC}`);
  console.log(`  - NebuVC: ${deploymentInfo.contracts.NebuVC}`);
  console.log(`\nLibraries:`);
  console.log(`  - ZeroCopySink: ${deploymentInfo.contracts.libraries.ZeroCopySink}`);
  console.log(`  - ZeroCopySource: ${deploymentInfo.contracts.libraries.ZeroCopySource}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });