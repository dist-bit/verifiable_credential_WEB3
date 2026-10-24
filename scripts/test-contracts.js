const hre = require("hardhat");

async function main() {
  console.log("🧪 Testing Contract Compilation and Basic Functionality\n");

  const [deployer, user1, user2] = await hre.ethers.getSigners();
  console.log("Test accounts:");
  console.log("- Deployer:", deployer.address);
  console.log("- User 1:", user1.address);
  console.log("- User 2:", user2.address);

  try {
    // Test VC contract
    console.log("\n1️⃣ Testing VC Contract...");
    const VC = await hre.ethers.getContractFactory("NebuVC");
    const vc = await VC.deploy();
    await vc.waitForDeployment();
    console.log("✅ VC deployed successfully");

    // Test BlockVault
    console.log("\n2️⃣ Testing BlockVault Contract...");
    const BlockVault = await hre.ethers.getContractFactory("BlockVault");
    const vault = await BlockVault.deploy(deployer.address);
    await vault.waitForDeployment();
    console.log("✅ BlockVault deployed successfully");

    // Register a user
    await vault.registerUser(user1.address);
    console.log("✅ User registered in BlockVault");

    // Test OriginCertificateFinal
    console.log("\n3️⃣ Testing OriginCertificateFinal Contract...");
    const OriginCert = await hre.ethers.getContractFactory("OriginCertificateFinal");
    const originCert = await OriginCert.deploy();
    await originCert.waitForDeployment();
    console.log("✅ OriginCertificateFinal deployed successfully");

    // Create test certificate
    const dataHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("test-origin-data"));
    await originCert.connect(user1).create(dataHash);
    console.log("✅ Origin certificate created");

    // Test Store contract
    console.log("\n4️⃣ Testing Store Contract...");
    const Store = await hre.ethers.getContractFactory("Store");
    const store = await Store.deploy();
    await store.waitForDeployment();
    console.log("✅ Store deployed successfully");

    console.log("\n🎉 All contracts tested successfully!");
    console.log("✅ Compilation: OK");
    console.log("✅ Deployment: OK");
    console.log("✅ Basic functionality: OK");

  } catch (error) {
    console.error("\n❌ Test failed:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });