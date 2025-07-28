const { ethers } = require("hardhat");

async function main() {
  console.log("🔑 Testing Hardhat Network Keys\n");

  // La llave privada proporcionada
  const privateKey = "0x027c30c1fc5d27479a934406c74d971636ac93df159a8553dc5875068bfee3d4";
  
  // Crear wallet desde la llave privada
  const wallet = new ethers.Wallet(privateKey);
  console.log("📍 Address from private key:", wallet.address);
  
  // Obtener las cuentas de Hardhat
  const accounts = await ethers.getSigners();
  
  console.log("\n📋 Hardhat Network Accounts:");
  console.log("===========================");
  
  for (let i = 0; i < Math.min(accounts.length, 5); i++) {
    const address = await accounts[i].getAddress();
    const balance = await ethers.provider.getBalance(address);
    console.log(`Account ${i}: ${address}`);
    console.log(`  Balance: ${ethers.formatEther(balance)} ETH`);
  }
  
  // Verificar que la primera cuenta coincide con la llave privada
  const firstAccountAddress = await accounts[0].getAddress();
  if (firstAccountAddress.toLowerCase() === wallet.address.toLowerCase()) {
    console.log("\n✅ First account matches the provided private key!");
  } else {
    console.log("\n⚠️  First account does NOT match the provided private key");
    console.log("Expected:", wallet.address);
    console.log("Got:", firstAccountAddress);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });