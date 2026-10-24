const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Debug Test", function () {
  it("Should get signers", async function () {
    const signers = await ethers.getSigners();
    console.log("Number of signers:", signers.length);
    console.log("First signer address:", signers[0].address);
    expect(signers.length).to.be.greaterThan(0);
  });
});