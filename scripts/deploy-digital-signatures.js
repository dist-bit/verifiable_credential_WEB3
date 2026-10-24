const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🌍 Deploying OriginCertificateWithDigitalSignatures to Ethereum Classic...\n");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  
  // Check balance
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETC\n");

  try {
    // Deploy OriginCertificateWithDigitalSignatures
    console.log("📝 Deploying OriginCertificateWithDigitalSignatures...");
    const DigitalSignatures = await ethers.getContractFactory("OriginCertificateWithDigitalSignatures");
    const digitalSignatures = await DigitalSignatures.deploy({
      gasLimit: 5000000
    });
    
    await digitalSignatures.waitForDeployment();
    const address = await digitalSignatures.getAddress();
    console.log("✅ OriginCertificateWithDigitalSignatures deployed to:", address);
    
    // Grant issuer role to deployer for testing
    console.log("\n🔐 Granting ISSUER role to deployer...");
    const ISSUER_ROLE = await digitalSignatures.ISSUER();
    const tx = await digitalSignatures.grantRole(deployer.address, ISSUER_ROLE);
    await tx.wait();
    console.log("✅ ISSUER role granted");
    
    // Save deployment info
    const deploymentInfo = {
      network: "ethereumClassic",
      chainId: 61,
      deployer: deployer.address,
      timestamp: new Date().toISOString(),
      contracts: {
        OriginCertificateWithDigitalSignatures: address
      },
      notes: {
        OriginCertificateWithDigitalSignatures: "Multi-country digital signature support (FIEL, eIDAS, PKI, etc.)"
      }
    };
    
    const deploymentPath = path.join(__dirname, "../deployments/digital-signatures-ethereumClassic.json");
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log("\n✅ Deployment info saved to:", deploymentPath);
    
    // Update existing deployment file to include new contract
    const existingDeploymentPath = path.join(__dirname, "../deployments/origin-system-ethereumClassic.json");
    if (fs.existsSync(existingDeploymentPath)) {
      const existingDeployment = JSON.parse(fs.readFileSync(existingDeploymentPath, 'utf8'));
      existingDeployment.contracts.OriginCertificateWithDigitalSignatures = address;
      existingDeployment.notes.OriginCertificateWithDigitalSignatures = "Multi-country digital signature support (FIEL, eIDAS, PKI, etc.)";
      fs.writeFileSync(existingDeploymentPath, JSON.stringify(existingDeployment, null, 2));
      console.log("✅ Updated existing deployment file");
    }
    
    console.log("\n🎉 Deployment complete!");
    console.log("=========================");
    console.log("Contract Address:", address);
    console.log("=========================");
    
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