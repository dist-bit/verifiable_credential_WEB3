const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🔨 Compiling smart contracts...\n");

  // Clean existing artifacts
  await hre.run("clean");

  // Compile contracts
  await hre.run("compile");

  console.log("✅ Compilation completed!\n");

  // Get compilation info
  const artifactsPath = path.join(__dirname, "../artifacts/contracts");
  
  // List compiled contracts
  console.log("📋 Compiled contracts:");
  console.log("====================");
  
  function listContracts(dir, indent = "") {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory() && file !== "build-info") {
        console.log(`${indent}📁 ${file}/`);
        listContracts(filePath, indent + "  ");
      } else if (file.endsWith(".json") && !file.includes(".dbg.")) {
        const contractName = file.replace(".json", "");
        console.log(`${indent}📄 ${contractName}`);
      }
    });
  }

  if (fs.existsSync(artifactsPath)) {
    listContracts(artifactsPath);
  }

  console.log("\n💡 Compilation artifacts saved to ./artifacts/");
  console.log("💡 TypeChain types saved to ./typechain-types/ (if @typechain/hardhat is installed)");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Compilation failed:");
    console.error(error);
    process.exit(1);
  });