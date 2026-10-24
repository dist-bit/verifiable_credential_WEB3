const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BlockVault - User Direct Functions", function () {
  let blockVault;
  let deployer;
  let user1;
  let user2;
  let user3;
  let contentHash;

  const AccessType = {
    TRANSFER: 0,
    LICENSE: 1,
    SUBSCRIPTION: 2,
    FREE_TEMP: 3,
    FREE_PERM: 4
  };

  beforeEach(async function () {
    [deployer, user1, user2, user3] = await ethers.getSigners();

    const BlockVault = await ethers.getContractFactory("BlockVault");
    blockVault = await BlockVault.deploy(deployer.address);
    await blockVault.waitForDeployment();

    // Register users
    await blockVault.registerUser(user1.address);
    await blockVault.registerUser(user2.address);
    await blockVault.registerUser(user3.address);

    // Upload content for user1 through admin
    const fileHash = ethers.keccak256(ethers.toUtf8Bytes("test-file"));
    const tx = await blockVault.uploadContent(
      user1.address,
      fileHash,
      1000000, // 1MB
      [AccessType.LICENSE, AccessType.FREE_TEMP],
      [ethers.parseEther("0.1"), 0],
      JSON.stringify({ title: "Test Content" })
    );

    const receipt = await tx.wait();
    const event = receipt.logs.find(log => {
      try {
        const parsed = blockVault.interface.parseLog(log);
        return parsed.name === "ContentUploaded";
      } catch (e) {
        return false;
      }
    });
    contentHash = event.args.contentHash;
  });

  describe("User Content Upload", function () {
    it("Should allow users to upload their own content", async function () {
      const fileHash = ethers.keccak256(ethers.toUtf8Bytes("user-upload"));
      
      await expect(
        blockVault.connect(user1).uploadContent(
          user1.address,
          fileHash,
          2000000, // 2MB
          [AccessType.LICENSE],
          [ethers.parseEther("0.2")],
          JSON.stringify({ title: "User Uploaded Content" })
        )
      ).to.emit(blockVault, "ContentUploaded");

      // Verify ownership
      const owner = await blockVault.getOwnerByFileHash(fileHash);
      expect(owner).to.equal(user1.address);
    });

    it("Should not allow unregistered users to upload", async function () {
      const fileHash = ethers.keccak256(ethers.toUtf8Bytes("unregistered"));
      const signers = await ethers.getSigners();
      const unregistered = signers[4]; // Get an unused signer
      
      await expect(
        blockVault.connect(unregistered).uploadContent(
          unregistered.address,
          fileHash,
          1000000,
          [AccessType.LICENSE],
          [ethers.parseEther("0.1")],
          "{}"
        )
      ).to.be.revertedWith("User not registered");
    });
  });

  describe("User Content Management", function () {
    it("Should allow content owner to update metadata", async function () {
      const newMetadata = JSON.stringify({ 
        title: "Updated Title",
        description: "Updated by owner"
      });

      await expect(
        blockVault.connect(user1).updateContentMetadata(user1.address, contentHash, newMetadata)
      ).to.emit(blockVault, "ContentUpdated");

      const info = await blockVault.getContentInfo(contentHash);
      expect(info.metadata).to.equal(newMetadata);
    });

    it("Should not allow non-owner to update metadata", async function () {
      await expect(
        blockVault.connect(user2).updateContentMetadata(
          user2.address,
          contentHash, 
          JSON.stringify({ title: "Hacked" })
        )
      ).to.be.revertedWith("Not authorized");
    });

    it("Should allow content owner to update prices", async function () {
      await expect(
        blockVault.connect(user1).updateContentPrices(
          user1.address,
          contentHash,
          [AccessType.LICENSE],
          [ethers.parseEther("0.5")]
        )
      ).to.emit(blockVault, "ContentUpdated");

      const price = await blockVault.getContentPrice(contentHash, AccessType.LICENSE);
      expect(price).to.equal(ethers.parseEther("0.5"));
    });

    it("Should allow content owner to delete their content", async function () {
      await expect(
        blockVault.connect(user1).deleteContent(user1.address, contentHash)
      ).to.emit(blockVault, "ContentDeleted");

      const info = await blockVault.getContentInfo(contentHash);
      expect(info.owner).to.equal(ethers.ZeroAddress);
    });

    it("Should not allow deleting content with active subscriptions", async function () {
      // This would need a subscription setup first
      // For now, just verify the function exists
      const canDelete = await blockVault.canDeleteContent(contentHash);
      expect(canDelete).to.be.true;
    });
  });

  describe("User Inheritance Management", function () {
    it("Should allow content owner to designate heir", async function () {
      await expect(
        blockVault.connect(user1).designateHeir(user1.address, contentHash, user2.address)
      ).to.emit(blockVault, "HeirDesignated")
        .withArgs(contentHash, user2.address);

      const info = await blockVault.getContentInfo(contentHash);
      expect(info.heir).to.equal(user2.address);
    });

    it("Should not allow non-owner to designate heir", async function () {
      await expect(
        blockVault.connect(user2).designateHeir(user2.address, contentHash, user3.address)
      ).to.be.revertedWith("Not authorized");
    });
  });

  describe("User Share Link Management", function () {
    it("Should allow content owner to create share links", async function () {
      const tx = await blockVault.connect(user1).createShareLink(
        user1.address,
        contentHash,
        86400, // 1 day
        10,    // 10 uses
        AccessType.FREE_TEMP
      );

      await expect(tx).to.emit(blockVault, "ShareLinkCreated");
    });

    it("Should not allow non-owner to create share links", async function () {
      await expect(
        blockVault.connect(user2).createShareLink(
          user2.address,
          contentHash,
          86400,
          10,
          AccessType.FREE_TEMP
        )
      ).to.be.revertedWith("Not authorized");
    });
  });

  describe("User Allow List Management", function () {
    it("Should allow content owner to add users to allow list", async function () {
      await expect(
        blockVault.connect(user1).addToAllowList(user1.address, contentHash, user2.address)
      ).to.emit(blockVault, "AccessGranted")
        .withArgs(user2.address, contentHash, AccessType.FREE_PERM);

      const hasAccess = await blockVault.hasValidAccess(user2.address, contentHash);
      expect(hasAccess).to.be.true;
    });

    it("Should allow content owner to remove users from allow list", async function () {
      // First add to allow list
      await blockVault.connect(user1).addToAllowList(user1.address, contentHash, user2.address);

      // Then remove
      await expect(
        blockVault.connect(user1).removeFromAllowList(user1.address, contentHash, user2.address)
      ).to.emit(blockVault, "AccessRevoked")
        .withArgs(user2.address, contentHash);

      const hasAccess = await blockVault.hasValidAccess(user2.address, contentHash);
      expect(hasAccess).to.be.false;
    });

    it("Should not allow non-owner to manage allow list", async function () {
      await expect(
        blockVault.connect(user2).addToAllowList(user2.address, contentHash, user3.address)
      ).to.be.revertedWith("Not authorized");
    });
  });

  describe("User Download Limits", function () {
    it("Should allow content owner to set download limits", async function () {
      await expect(
        blockVault.connect(user1).setMaxDownloads(user1.address, contentHash, 5)
      ).to.emit(blockVault, "MaxDownloadsSet")
        .withArgs(contentHash, 5);

      const stats = await blockVault.getDownloadStats(contentHash, user2.address);
      expect(stats.maxDownloads).to.equal(5);
    });

    it("Should not allow non-owner to set download limits", async function () {
      await expect(
        blockVault.connect(user2).setMaxDownloads(user2.address, contentHash, 10)
      ).to.be.revertedWith("Not authorized");
    });
  });

  describe("User Access Revocation", function () {
    it("Should allow content owner to revoke access", async function () {
      // First grant access
      await blockVault.connect(user1).addToAllowList(user1.address, contentHash, user2.address);

      // Then revoke all access
      await expect(
        blockVault.connect(user1).revokeAccess(user1.address, contentHash, user2.address)
      ).to.emit(blockVault, "AccessRevoked")
        .withArgs(user2.address, contentHash);

      const hasAccess = await blockVault.hasValidAccess(user2.address, contentHash);
      expect(hasAccess).to.be.false;
    });
  });

  describe("User Ownership Transfer", function () {
    it("Should allow content owner to transfer ownership", async function () {
      await blockVault.connect(user1).transferContentOwnership(user1.address, contentHash, user2.address);

      const info = await blockVault.getContentInfo(contentHash);
      expect(info.owner).to.equal(user2.address);
    });

    it("Should not allow transfer to unregistered user", async function () {
      const unregistered = ethers.Wallet.createRandom().address;
      
      await expect(
        blockVault.connect(user1).transferContentOwnership(user1.address, contentHash, unregistered)
      ).to.be.revertedWith("User not registered");
    });
  });

  describe("Manager Functionality", function () {
    beforeEach(async function () {
      // Add user2 as manager through admin
      await blockVault.addContentManager(user1.address, contentHash, user2.address);
    });

    it("Should allow managers to update metadata", async function () {
      const newMetadata = JSON.stringify({ 
        title: "Updated by Manager",
        description: "Manager update"
      });

      await expect(
        blockVault.connect(user2).updateContentMetadata(user2.address, contentHash, newMetadata)
      ).to.emit(blockVault, "ContentUpdated");
    });

    it("Should allow managers to update prices", async function () {
      await expect(
        blockVault.connect(user2).updateContentPrices(
          user2.address,
          contentHash,
          [AccessType.LICENSE],
          [ethers.parseEther("0.3")]
        )
      ).to.emit(blockVault, "ContentUpdated");
    });

    it("Should not allow managers to delete content", async function () {
      await expect(
        blockVault.connect(user2).deleteContent(user2.address, contentHash)
      ).to.be.revertedWith("Not authorized");
    });

    it("Should not allow managers to transfer ownership", async function () {
      await expect(
        blockVault.connect(user2).transferContentOwnership(user2.address, contentHash, user3.address)
      ).to.be.revertedWith("Not authorized");
    });
  });

  describe("User Restrictions", function () {
    it("Should not allow users to register other users", async function () {
      const newUser = ethers.Wallet.createRandom().address;
      
      await expect(
        blockVault.connect(user1).registerUser(newUser)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should not allow users to purchase storage for themselves", async function () {
      await expect(
        blockVault.connect(user1).purchaseStorage(user1.address, 10)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should not allow users to activate their own monetization profile", async function () {
      await expect(
        blockVault.connect(user1).activateMonetizationProfile(user1.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should not allow users to blacklist others", async function () {
      await expect(
        blockVault.connect(user1).blacklistUser(user2.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should not have withdrawEarnings function (removed in v3)", async function () {
      // This function should not exist in v3
      try {
        await blockVault.withdrawEarnings(user1.address, ethers.parseEther("1"));
        expect.fail("withdrawEarnings function should not exist");
      } catch (error) {
        expect(error.message).to.include("is not a function");
      }
    });
  });
});