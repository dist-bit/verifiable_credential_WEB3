const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BlockVault Simple Test", function () {
  let blockVault;
  let owner;
  let user1;

  beforeEach(async function () {
    // Get signers
    [owner, user1] = await ethers.getSigners();

    // Deploy BlockVault
    const BlockVault = await ethers.getContractFactory("BlockVault");
    blockVault = await BlockVault.deploy(owner.address); // platform wallet
    await blockVault.waitForDeployment();
  });

  it("Should deploy successfully", async function () {
    expect(await blockVault.platformWallet()).to.not.be.undefined;
  });

  it("Should have correct constants", async function () {
    expect(await blockVault.FREE_STORAGE()).to.equal(10n * 10n**9n); // 10GB
    expect(await blockVault.PLATFORM_FEE_PERCENT()).to.equal(2n);
  });
  
  it("Should have correct owner", async function () {
    expect(await blockVault.owner()).to.equal(owner.address);
  });
});