const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🎨 Deploying IPPBlock (Intellectual Property) System...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("📍 Network:", hre.network.name);
  console.log("📍 Deployer:", deployer.address);
  console.log("💰 Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH\n");

  const deployments = {};

  try {
    // Check if IPPBlockVC contract exists
    let IPContract;
    try {
      IPContract = await hre.ethers.getContractFactory("IPPBlockVC");
      console.log("✅ Using IPPBlockVC contract");
    } catch (e) {
      console.log("⚠️  IPPBlockVC not found, using _IntellectualProperty");
      IPContract = await hre.ethers.getContractFactory("_IntellectualProperty");
    }

    // Deploy Intellectual Property contract
    console.log("\n1️⃣ Deploying Intellectual Property contract...");
    
    // Constructor parameters for IPPBlockVC style contract
    const issuer = "https://ippblock.io/issuer";
    const context = ["https://www.w3.org/2018/credentials/v1", "https://ippblock.io/contexts/ip/v1"];
    const id = "https://ippblock.io/credentials/ip/1";
    const type = ["VerifiableCredential", "IntellectualPropertyCredential"];
    const verificationMethod = "https://ippblock.io/issuer#key-1";
    const schema = {
      id: "https://ippblock.io/schemas/ip.json",
      typeSchema: "JsonSchemaValidator2018"
    };

    const ip = await IPContract.deploy(
      issuer,
      context,
      id,
      type,
      verificationMethod,
      schema
    );
    
    await ip.waitForDeployment();
    deployments.IntellectualProperty = await ip.getAddress();
    console.log("✅ Intellectual Property deployed to:", deployments.IntellectualProperty);

    // Deploy VC verifier if needed
    console.log("\n2️⃣ Deploying VC Verifier...");
    const VC = await hre.ethers.getContractFactory("NebuVC");
    const vc = await VC.deploy();
    await vc.waitForDeployment();
    deployments.VCVerifier = await vc.getAddress();
    console.log("✅ VC Verifier deployed to:", deployments.VCVerifier);

    // Save deployment info
    const deploymentsPath = path.join(__dirname, "../deployments");
    if (!fs.existsSync(deploymentsPath)) {
      fs.mkdirSync(deploymentsPath);
    }

    const deploymentFile = path.join(deploymentsPath, `ippblock-${hre.network.name}.json`);
    fs.writeFileSync(
      deploymentFile,
      JSON.stringify({
        network: hre.network.name,
        chainId: hre.network.config.chainId,
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        contracts: deployments,
        configuration: {
          issuer: issuer,
          context: context,
          credentialType: type,
          verificationMethod: verificationMethod,
          schema: schema
        }
      }, null, 2)
    );

    console.log("\n✅ IPPBlock deployment complete!");
    console.log(`📄 Deployment saved to: ${deploymentFile}`);
    console.log("\n📊 Summary:");
    console.log("- Intellectual Property contract deployed");
    console.log("- VC Verifier deployed");
    console.log("- EIP-712 signatures enabled");
    console.log("- W3C Verifiable Credentials compliant");

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