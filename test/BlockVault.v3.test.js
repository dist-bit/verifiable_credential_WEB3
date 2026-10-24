const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BlockVault v3 - Enhanced User Functions", function () {
  let blockVault;
  let deployer;
  let user1;
  let user2;
  let user3;
  let contentHash;
  let folderId;

  const AccessType = {
    TRANSFER: 0,
    LICENSE: 1,
    SUBSCRIPTION: 2,
    FREE_TEMP: 3,
    FREE_PERM: 4
  };

  const FolderType = {
    SUBSCRIPTION: 0,
    INDIVIDUAL: 1,
    MIXED: 2,
    PRIVATE: 3
  };

  beforeEach(async function () {
    [deployer, user1, user2, user3] = await ethers.getSigners();

    // Deploy using the v3 contract
    const BlockVault = await ethers.getContractFactory("BlockVault");
    blockVault = await BlockVault.deploy(deployer.address);
    await blockVault.waitForDeployment();

    // Register users
    await blockVault.registerUser(user1.address);
    await blockVault.registerUser(user2.address);
    await blockVault.registerUser(user3.address);

    // Upload content for user1
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

  describe("User Folder Management", function () {
    it("Should allow users to create their own folders", async function () {
      const tx = await blockVault.connect(user1).createFolder(
        user1.address,
        "My Personal Folder",
        FolderType.INDIVIDUAL,
        0, // No subscription price for individual folder
        0, // No duration
        true // Public
      );

      await expect(tx).to.emit(blockVault, "FolderCreated");
      
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          const parsed = blockVault.interface.parseLog(log);
          return parsed.name === "FolderCreated";
        } catch (e) {
          return false;
        }
      });
      folderId = event.args.folderId;

      const folderInfo = await blockVault.getFolderInfo(folderId);
      expect(folderInfo.owner).to.equal(user1.address);
      expect(folderInfo.name).to.equal("My Personal Folder");
    });

    it("Should not allow users to create folders for others", async function () {
      await expect(
        blockVault.connect(user1).createFolder(
          user2.address, // Different user
          "Unauthorized Folder",
          FolderType.INDIVIDUAL,
          0,
          0,
          true
        )
      ).to.be.revertedWith("Not authorized");
    });

    it("Should allow users to add content to their folders", async function () {
      // First create a folder
      const tx = await blockVault.connect(user1).createFolder(
        user1.address,
        "Content Folder",
        FolderType.INDIVIDUAL,
        0,
        0,
        true
      );
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          const parsed = blockVault.interface.parseLog(log);
          return parsed.name === "FolderCreated";
        } catch (e) {
          return false;
        }
      });
      folderId = event.args.folderId;

      // Add content to folder
      await expect(
        blockVault.connect(user1).addContentToFolder(user1.address, contentHash, folderId)
      ).to.emit(blockVault, "ContentAddedToFolder")
        .withArgs(contentHash, folderId);

      const folderContents = await blockVault.getFolderContents(folderId);
      expect(folderContents).to.include(contentHash);
    });

    it("Should allow users to remove content from their folders", async function () {
      // Create folder and add content
      const tx = await blockVault.connect(user1).createFolder(
        user1.address,
        "Content Folder",
        FolderType.INDIVIDUAL,
        0,
        0,
        true
      );
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          const parsed = blockVault.interface.parseLog(log);
          return parsed.name === "FolderCreated";
        } catch (e) {
          return false;
        }
      });
      folderId = event.args.folderId;

      await blockVault.connect(user1).addContentToFolder(user1.address, contentHash, folderId);

      // Remove content from folder
      await expect(
        blockVault.connect(user1).removeContentFromFolder(user1.address, contentHash, folderId)
      ).to.emit(blockVault, "ContentRemovedFromFolder")
        .withArgs(contentHash, folderId);

      const folderContents = await blockVault.getFolderContents(folderId);
      expect(folderContents).to.not.include(contentHash);
    });

    it("Should prevent removing content from subscription folders with active subscribers", async function () {
      // Create subscription folder
      const tx = await blockVault.connect(user1).createFolder(
        user1.address,
        "Subscription Folder",
        FolderType.SUBSCRIPTION,
        ethers.parseEther("0.1"),
        86400, // 1 day
        true
      );
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          const parsed = blockVault.interface.parseLog(log);
          return parsed.name === "FolderCreated";
        } catch (e) {
          return false;
        }
      });
      folderId = event.args.folderId;

      await blockVault.connect(user1).addContentToFolder(user1.address, contentHash, folderId);

      // Simulate having subscribers by adding revenue (simplified check)
      await blockVault.subscribeToFolder(user2.address, folderId);

      // Should not be able to remove content
      await expect(
        blockVault.connect(user1).removeContentFromFolder(user1.address, contentHash, folderId)
      ).to.be.revertedWith("Cannot remove content from folder with active subscribers");
    });

    it("Should not allow users to manage folders they don't own", async function () {
      // Create folder as user1
      const tx = await blockVault.connect(user1).createFolder(
        user1.address,
        "User1 Folder",
        FolderType.INDIVIDUAL,
        0,
        0,
        true
      );
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          const parsed = blockVault.interface.parseLog(log);
          return parsed.name === "FolderCreated";
        } catch (e) {
          return false;
        }
      });
      folderId = event.args.folderId;

      // User2 tries to add content to user1's folder
      await expect(
        blockVault.connect(user2).addContentToFolder(user2.address, contentHash, folderId)
      ).to.be.revertedWith("Not authorized");
    });
  });

  describe("User Manager Management", function () {
    it("Should allow users to add managers to their content", async function () {
      await expect(
        blockVault.connect(user1).addContentManager(user1.address, contentHash, user2.address)
      ).to.emit(blockVault, "ManagerAdded")
        .withArgs(contentHash, user2.address);

      const managers = await blockVault.getContentManagers(contentHash);
      expect(managers).to.include(user2.address);
    });

    it("Should allow users to remove managers from their content", async function () {
      // First add manager
      await blockVault.connect(user1).addContentManager(user1.address, contentHash, user2.address);

      // Then remove
      await expect(
        blockVault.connect(user1).removeContentManager(user1.address, contentHash, user2.address)
      ).to.emit(blockVault, "ManagerRemoved")
        .withArgs(contentHash, user2.address);

      const managers = await blockVault.getContentManagers(contentHash);
      expect(managers).to.not.include(user2.address);
    });

    it("Should not allow users to manage managers for content they don't own", async function () {
      await expect(
        blockVault.connect(user2).addContentManager(user2.address, contentHash, user3.address)
      ).to.be.revertedWith("Not authorized");
    });

    it("Should allow managers to perform management functions", async function () {
      // Add user2 as manager
      await blockVault.connect(user1).addContentManager(user1.address, contentHash, user2.address);

      // Manager should be able to update metadata
      const newMetadata = JSON.stringify({ title: "Updated by Manager" });
      await expect(
        blockVault.connect(user2).updateContentMetadata(user2.address, contentHash, newMetadata)
      ).to.emit(blockVault, "ContentUpdated");

      const info = await blockVault.getContentInfo(contentHash);
      expect(info.metadata).to.equal(newMetadata);
    });
  });

  describe("Removed withdrawEarnings Function", function () {
    it("Should not have withdrawEarnings function available", async function () {
      // This should fail because the function doesn't exist
      try {
        await blockVault.withdrawEarnings(user1.address, ethers.parseEther("1"));
        expect.fail("withdrawEarnings function should not exist");
      } catch (error) {
        expect(error.message).to.include("is not a function");
      }
    });

    it("Should still track user earnings for transparency", async function () {
      // Purchase content to generate earnings
      await blockVault.purchaseContent(
        user2.address,
        contentHash,
        AccessType.LICENSE,
        ethers.parseEther("0.1")
      );

      const earnings = await blockVault.getUserEarnings(user1.address);
      expect(earnings).to.be.greaterThan(0);
    });
  });

  describe("Dual Mode Operation Verification", function () {
    it("Should allow admin to perform all user functions", async function () {
      // Admin should be able to create folders for users
      const tx = await blockVault.createFolder(
        user2.address,
        "Admin Created Folder",
        FolderType.INDIVIDUAL,
        0,
        0,
        true
      );
      await expect(tx).to.emit(blockVault, "FolderCreated");

      // Admin should be able to add managers
      await expect(
        blockVault.addContentManager(user1.address, contentHash, user3.address)
      ).to.emit(blockVault, "ManagerAdded");
    });

    it("Should maintain all existing user permissions", async function () {
      // Users should still be able to upload content
      const fileHash = ethers.keccak256(ethers.toUtf8Bytes("new-user-file"));
      await expect(
        blockVault.connect(user2).uploadContent(
          user2.address,
          fileHash,
          500000,
          [AccessType.LICENSE],
          [ethers.parseEther("0.05")],
          JSON.stringify({ title: "User Upload" })
        )
      ).to.emit(blockVault, "ContentUploaded");
    });
  });
});