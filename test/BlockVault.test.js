const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BlockVault - Admin Only Functions", function () {
  let blockVault;
  let deployer;
  let user1;
  let user2;
  let user3;

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

    const BlockVault = await ethers.getContractFactory("BlockVault");
    blockVault = await BlockVault.deploy(deployer.address); // Using deployer as platform wallet
    await blockVault.waitForDeployment();
  });

  describe("User Management", function () {
    it("Should register users through admin", async function () {
      await expect(blockVault.registerUser(user1.address))
        .to.emit(blockVault, "UserRegistered")
        .withArgs(user1.address);

      const userInfo = await blockVault.getUserInfo(user1.address);
      expect(userInfo.isRegistered).to.be.true;
    });

    it("Should not register already registered user", async function () {
      await blockVault.registerUser(user1.address);
      await expect(blockVault.registerUser(user1.address))
        .to.be.revertedWith("User already registered");
    });

    it("Should purchase storage for users", async function () {
      await blockVault.registerUser(user1.address);
      
      await expect(blockVault.purchaseStorage(user1.address, 10))
        .to.emit(blockVault, "StoragePurchased")
        .withArgs(user1.address, 10);

      const storage = await blockVault.getUserStorage(user1.address);
      expect(storage.storagePurchased).to.equal(10n * 10n**9n); // 10GB in bytes
    });

    it("Should activate monetization profile", async function () {
      await blockVault.registerUser(user1.address);
      
      await expect(blockVault.activateMonetizationProfile(user1.address))
        .to.emit(blockVault, "MonetizationActivated")
        .withArgs(user1.address);

      const userInfo = await blockVault.getUserInfo(user1.address);
      expect(userInfo.hasMonetizationProfile).to.be.true;
    });

    it("Should blacklist and unblacklist users", async function () {
      await blockVault.registerUser(user1.address);
      
      await blockVault.blacklistUser(user1.address);
      let userInfo = await blockVault.getUserInfo(user1.address);
      expect(userInfo.isBlacklisted).to.be.true;

      await blockVault.unblacklistUser(user1.address);
      userInfo = await blockVault.getUserInfo(user1.address);
      expect(userInfo.isBlacklisted).to.be.false;
    });

    it("Should not allow blacklisted user to upload content", async function () {
      await blockVault.registerUser(user1.address);
      await blockVault.blacklistUser(user1.address);
      
      const fileHash = ethers.keccak256(ethers.toUtf8Bytes("test-file"));
      await expect(blockVault.uploadContent(
        user1.address,
        fileHash,
        1000000,
        [1], // LICENSE
        [ethers.parseEther("0.1")],
        "{}"
      )).to.be.revertedWith("User is blacklisted");
    });

    it("Should only allow owner to perform admin functions", async function () {
      await expect(blockVault.connect(user1).registerUser(user2.address))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Content Management", function () {
    beforeEach(async function () {
      await blockVault.registerUser(user1.address);
      await blockVault.registerUser(user2.address);
    });

    it("Should upload content for user", async function () {
      const fileHash = ethers.keccak256(ethers.toUtf8Bytes("test-file"));
      const size = 1000000; // 1MB

      await expect(blockVault.uploadContent(
        user1.address,
        fileHash,
        size,
        [AccessType.LICENSE, AccessType.FREE_TEMP],
        [ethers.parseEther("0.1"), 0],
        JSON.stringify({ title: "Test File", description: "Test content" })
      )).to.emit(blockVault, "ContentUploaded");

      const owner = await blockVault.getOwnerByFileHash(fileHash);
      expect(owner).to.equal(user1.address);
    });

    it("Should enforce storage limits", async function () {
      const fileHash = ethers.keccak256(ethers.toUtf8Bytes("huge-file"));
      const size = 11n * 10n**9n; // 11GB (exceeds free storage)

      await expect(blockVault.uploadContent(
        user1.address,
        fileHash,
        size,
        [AccessType.LICENSE],
        [ethers.parseEther("1")],
        JSON.stringify({ title: "Huge File" })
      )).to.be.revertedWith("Insufficient storage");
    });

    it("Should handle content purchases", async function () {
      const fileHash = ethers.keccak256(ethers.toUtf8Bytes("content"));
      await blockVault.uploadContent(
        user1.address,
        fileHash,
        1000000,
        [AccessType.LICENSE],
        [ethers.parseEther("0.1")],
        JSON.stringify({ title: "Content for purchase" })
      );

      const contentEvents = await blockVault.queryFilter(
        blockVault.filters.ContentUploaded()
      );
      const contentHash = contentEvents[0].args.contentHash;

      await expect(blockVault.purchaseContent(
        user2.address,
        contentHash,
        AccessType.LICENSE,
        ethers.parseEther("0.1") // payment amount
      )).to.emit(blockVault, "ContentPurchased")
        .withArgs(user2.address, contentHash, AccessType.LICENSE, ethers.parseEther("0.1"));

      const hasAccess = await blockVault.hasValidAccess(user2.address, contentHash);
      expect(hasAccess).to.be.true;
    });

    it("Should transfer content ownership", async function () {
      const fileHash = ethers.keccak256(ethers.toUtf8Bytes("transfer-content"));
      await blockVault.uploadContent(
        user1.address,
        fileHash,
        1000000,
        [AccessType.TRANSFER],
        [ethers.parseEther("1")],
        JSON.stringify({ title: "Transfer content" })
      );

      const contentEvents = await blockVault.queryFilter(
        blockVault.filters.ContentUploaded()
      );
      const contentHash = contentEvents[0].args.contentHash;

      // Purchase TRANSFER access (doesn't transfer ownership automatically)
      await expect(blockVault.purchaseContent(
        user2.address,
        contentHash,
        AccessType.TRANSFER,
        ethers.parseEther("1") // payment amount
      )).to.emit(blockVault, "ContentPurchased")
        .withArgs(user2.address, contentHash, AccessType.TRANSFER, ethers.parseEther("1"));

      // Actually transfer ownership
      await blockVault.transferContentOwnership(user1.address, contentHash, user2.address);

      const newOwner = await blockVault.getOwnerByFileHash(fileHash);
      expect(newOwner).to.equal(user2.address);
    });

    it("Should delete content", async function () {
      const fileHash = ethers.keccak256(ethers.toUtf8Bytes("delete-me"));
      await blockVault.uploadContent(
        user1.address,
        fileHash,
        1000000,
        [AccessType.LICENSE],
        [ethers.parseEther("0.1")],
        JSON.stringify({ title: "Content for purchase" })
      );

      const contentEvents = await blockVault.queryFilter(
        blockVault.filters.ContentUploaded()
      );
      const contentHash = contentEvents[0].args.contentHash;

      await expect(blockVault.deleteContent(user1.address, contentHash))
        .to.emit(blockVault, "ContentDeleted")
        .withArgs(user1.address, contentHash);

      const owner = await blockVault.getOwnerByFileHash(fileHash);
      expect(owner).to.equal(ethers.ZeroAddress);
    });
  });

  describe("Download Management", function () {
    let contentHash;

    beforeEach(async function () {
      await blockVault.registerUser(user1.address);
      await blockVault.registerUser(user2.address);

      const fileHash = ethers.keccak256(ethers.toUtf8Bytes("download-test"));
      await blockVault.uploadContent(
        user1.address,
        fileHash,
        1000000,
        [AccessType.FREE_TEMP],
        [0],
        JSON.stringify({ title: "Download test content" })
      );

      const contentEvents = await blockVault.queryFilter(
        blockVault.filters.ContentUploaded()
      );
      contentHash = contentEvents[0].args.contentHash;
    });

    it("Should set max downloads", async function () {
      await expect(blockVault.setMaxDownloads(user1.address, contentHash, 5))
        .to.emit(blockVault, "MaxDownloadsSet")
        .withArgs(contentHash, 5);

      const stats = await blockVault.getDownloadStats(contentHash, user2.address);
      expect(stats.maxDownloads).to.equal(5);
    });

    it("Should record downloads", async function () {
      await blockVault.grantTemporaryAccess(user2.address, contentHash, 86400); // 1 day

      await expect(blockVault.recordDownload(user2.address, contentHash))
        .to.emit(blockVault, "DownloadRecorded")
        .withArgs(contentHash, user2.address);

      const stats = await blockVault.getDownloadStats(contentHash, user2.address);
      expect(stats.userDownloads).to.equal(1);
    });

    it("Should enforce download limits", async function () {
      await blockVault.setMaxDownloads(user1.address, contentHash, 2);
      await blockVault.grantTemporaryAccess(user2.address, contentHash, 86400);

      await blockVault.recordDownload(user2.address, contentHash);
      await blockVault.recordDownload(user2.address, contentHash);

      await expect(blockVault.recordDownload(user2.address, contentHash))
        .to.be.revertedWith("Download limit reached");
    });
  });

  describe("Access Control", function () {
    let contentHash;

    beforeEach(async function () {
      await blockVault.registerUser(user1.address);
      await blockVault.registerUser(user2.address);

      const fileHash = ethers.keccak256(ethers.toUtf8Bytes("access-test"));
      await blockVault.uploadContent(
        user1.address,
        fileHash,
        1000000,
        [AccessType.LICENSE, AccessType.FREE_TEMP],
        [ethers.parseEther("0.1"), 0],
        JSON.stringify({ title: "Access test content" })
      );

      const contentEvents = await blockVault.queryFilter(
        blockVault.filters.ContentUploaded()
      );
      contentHash = contentEvents[0].args.contentHash;
    });

    it("Should grant temporary access", async function () {
      const duration = 86400; // 1 day
      
      await expect(blockVault.grantTemporaryAccess(
        user2.address,
        contentHash,
        duration
      )).to.emit(blockVault, "TemporaryAccessGranted");

      const hasAccess = await blockVault.hasValidAccess(user2.address, contentHash);
      expect(hasAccess).to.be.true;
    });

    it("Should validate access expiry", async function () {
      // Grant 1 second access
      await blockVault.grantTemporaryAccess(user2.address, contentHash, 1);
      
      // Access should be valid immediately
      let hasAccess = await blockVault.hasValidAccess(user2.address, contentHash);
      expect(hasAccess).to.be.true;

      // Wait 2 seconds
      await ethers.provider.send("evm_increaseTime", [2]);
      await ethers.provider.send("evm_mine");

      // Access should have expired
      hasAccess = await blockVault.hasValidAccess(user2.address, contentHash);
      expect(hasAccess).to.be.false;
    });

    it("Owner should always have access", async function () {
      const hasAccess = await blockVault.hasValidAccess(user1.address, contentHash);
      expect(hasAccess).to.be.true;
    });
  });

  describe("Folder Management", function () {
    beforeEach(async function () {
      await blockVault.registerUser(user1.address);
      await blockVault.registerUser(user2.address);
    });

    it("Should create folders", async function () {
      await expect(blockVault.createFolder(
        user1.address,
        "My Premium Content",
        FolderType.SUBSCRIPTION,
        ethers.parseEther("0.5"),
        30 * 24 * 60 * 60, // 30 days
        true // isPublic
      )).to.emit(blockVault, "FolderCreated");

      const folders = await blockVault.getUserFolders(user1.address);
      expect(folders.length).to.equal(1);
    });

    it("Should add content to folders", async function () {
      // Create folder
      const folderTx = await blockVault.createFolder(
        user1.address,
        "Test Folder",
        FolderType.INDIVIDUAL,
        0,
        0,
        true // isPublic
      );
      const folderReceipt = await folderTx.wait();
      const folderEvent = folderReceipt.logs.find(log => {
        try {
          const parsed = blockVault.interface.parseLog(log);
          return parsed.name === "FolderCreated";
        } catch {
          return false;
        }
      });
      const folderId = folderEvent.args.folderId;

      // Upload content
      const fileHash = ethers.keccak256(ethers.toUtf8Bytes("folder-content"));
      await blockVault.uploadContent(
        user1.address,
        fileHash,
        1000000,
        [AccessType.LICENSE],
        [ethers.parseEther("0.1")],
        JSON.stringify({ title: "Content for purchase" })
      );

      const contentEvents = await blockVault.queryFilter(
        blockVault.filters.ContentUploaded()
      );
      const contentHash = contentEvents[0].args.contentHash;

      // Add to folder
      await blockVault.addContentToFolder(user1.address, contentHash, folderId);

      const folderContents = await blockVault.getFolderContents(folderId);
      expect(folderContents.length).to.equal(1);
      expect(folderContents[0]).to.equal(contentHash);
    });
  });

  describe("Storage Management", function () {
    beforeEach(async function () {
      await blockVault.registerUser(user1.address);
    });

    it("Should track storage usage correctly", async function () {
      const size1 = 1000000; // 1MB
      const size2 = 2000000; // 2MB

      // Upload first file
      await blockVault.uploadContent(
        user1.address,
        ethers.keccak256(ethers.toUtf8Bytes("file1")),
        size1,
        [AccessType.LICENSE],
        [ethers.parseEther("0.1")],
        JSON.stringify({ title: "File 1" })
      );

      let storage = await blockVault.getUserStorage(user1.address);
      expect(storage.storageUsed).to.equal(size1);

      // Upload second file
      await blockVault.uploadContent(
        user1.address,
        ethers.keccak256(ethers.toUtf8Bytes("file2")),
        size2,
        [AccessType.LICENSE],
        [ethers.parseEther("0.1")],
        JSON.stringify({ title: "File 2" })
      );

      storage = await blockVault.getUserStorage(user1.address);
      expect(storage.storageUsed).to.equal(size1 + size2);
    });

    it("Should free storage when content is deleted", async function () {
      const fileHash = ethers.keccak256(ethers.toUtf8Bytes("temp-file"));
      const size = 5000000; // 5MB

      await blockVault.uploadContent(
        user1.address,
        fileHash,
        size,
        [AccessType.LICENSE],
        [ethers.parseEther("0.1")],
        JSON.stringify({ title: "Temp file" })
      );

      const contentEvents = await blockVault.queryFilter(
        blockVault.filters.ContentUploaded()
      );
      const contentHash = contentEvents[0].args.contentHash;

      // Check storage used
      let storage = await blockVault.getUserStorage(user1.address);
      expect(storage.storageUsed).to.equal(size);

      // Delete content
      await blockVault.deleteContent(user1.address, contentHash);

      // Storage should be freed
      storage = await blockVault.getUserStorage(user1.address);
      expect(storage.storageUsed).to.equal(0);
    });
  });

  describe("Content Transfer", function () {
    let contentHash;
    const fileHash = ethers.keccak256(ethers.toUtf8Bytes("transfer-test"));
    const size = 1000000;

    beforeEach(async function () {
      await blockVault.registerUser(user1.address);
      await blockVault.registerUser(user2.address);

      await blockVault.uploadContent(
        user1.address,
        fileHash,
        size,
        [AccessType.LICENSE],
        [ethers.parseEther("0.1")],
        JSON.stringify({ title: "Temp file" })
      );

      const contentEvents = await blockVault.queryFilter(
        blockVault.filters.ContentUploaded()
      );
      contentHash = contentEvents[0].args.contentHash;
    });

    it("Should transfer ownership without affecting storage", async function () {
      // Check initial state
      let storage1 = await blockVault.getUserStorage(user1.address);
      let storage2 = await blockVault.getUserStorage(user2.address);
      expect(storage1.storageUsed).to.equal(size);
      expect(storage2.storageUsed).to.equal(0);

      // Transfer ownership
      await blockVault.transferContentOwnership(user1.address, contentHash, user2.address);

      // Check new state - storage remains with original owner
      storage1 = await blockVault.getUserStorage(user1.address);
      storage2 = await blockVault.getUserStorage(user2.address);
      expect(storage1.storageUsed).to.equal(size);
      expect(storage2.storageUsed).to.equal(0);

      // Check owner changed
      const newOwner = await blockVault.getOwnerByFileHash(fileHash);
      expect(newOwner).to.equal(user2.address);
    });

    it("Should update user content lists on transfer", async function () {
      // Check initial content lists
      let contents1 = await blockVault.getUserContents(user1.address);
      let contents2 = await blockVault.getUserContents(user2.address);
      expect(contents1.length).to.equal(1);
      expect(contents2.length).to.equal(0);

      // Transfer
      await blockVault.transferContentOwnership(user1.address, contentHash, user2.address);

      // Check updated lists
      contents1 = await blockVault.getUserContents(user1.address);
      contents2 = await blockVault.getUserContents(user2.address);
      expect(contents1.length).to.equal(0);
      expect(contents2.length).to.equal(1);
      expect(contents2[0]).to.equal(contentHash);
    });
  });

  describe("Edge Cases", function () {
    beforeEach(async function () {
      await blockVault.registerUser(user1.address);
      await blockVault.registerUser(user2.address);
    });


    it("Should handle multiple access types correctly", async function () {
      const fileHash = ethers.keccak256(ethers.toUtf8Bytes("multi-access"));
      await blockVault.uploadContent(
        user1.address,
        fileHash,
        1000000,
        [AccessType.LICENSE, AccessType.SUBSCRIPTION, AccessType.FREE_TEMP],
        [ethers.parseEther("0.1"), ethers.parseEther("0.05"), 0],
        JSON.stringify({ title: "Multi-access content" })
      );

      const contentEvents = await blockVault.queryFilter(
        blockVault.filters.ContentUploaded()
      );
      const contentHash = contentEvents[0].args.contentHash;

      // Check prices
      const licensePrice = await blockVault.getContentPrice(contentHash, AccessType.LICENSE);
      const subscriptionPrice = await blockVault.getContentPrice(contentHash, AccessType.SUBSCRIPTION);
      const tempPrice = await blockVault.getContentPrice(contentHash, AccessType.FREE_TEMP);

      expect(licensePrice).to.equal(ethers.parseEther("0.1"));
      expect(subscriptionPrice).to.equal(ethers.parseEther("0.05"));
      expect(tempPrice).to.equal(0);
    });
  });
});