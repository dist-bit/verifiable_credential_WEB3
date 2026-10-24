// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../utils/Ownable.sol";

contract BlockVault is Ownable {
    // Constants
    uint256 public constant FREE_STORAGE = 10 * 1e9; // 10GB
    uint256 public constant PLATFORM_FEE_PERCENT = 2; // 2% commission
    
    // Enums
    enum AccessType { TRANSFER, LICENSE, SUBSCRIPTION, FREE_TEMP, FREE_PERM }
    enum FolderType { SUBSCRIPTION, INDIVIDUAL, MIXED, PRIVATE }
    
    // Structs
    struct User {
        bool isRegistered;
        uint256 storageUsed;
        uint256 storagePurchased;
        bool hasMonetizationProfile;
        bool isBlacklisted;
        uint256 totalEarnings;
    }
    
    struct Content {
        address owner;
        bytes32 fileHash;
        uint256 size;
        uint256 uploadDate;
        mapping(AccessType => uint256) prices;
        mapping(AccessType => bool) hasAccessType;
        mapping(address => mapping(AccessType => bool)) hasUserAccess;
        mapping(address => mapping(AccessType => uint256)) userAccessExpiry;
        mapping(address => bool) isAllowListed;
        address[] allowList;
        mapping(address => bool) isManager;
        address[] managers;
        address heir;
        uint256 maxDownloads;
        uint256 totalDownloads;
        mapping(address => uint256) userDownloads;
        bool exists;
        string metadata; // JSON metadata
        uint256 version;
        uint256 totalRevenue;
    }
    
    struct Folder {
        address owner;
        string name;
        FolderType folderType;
        uint256 subscriptionPrice;
        uint256 subscriptionDuration;
        bytes32[] contents;
        mapping(bytes32 => bool) hasContent;
        mapping(address => uint256) subscriptionExpiry;
        bool isPublic;
        uint256 totalRevenue;
        bool exists;
    }
    
    struct ShareLink {
        bytes32 contentHash;
        uint256 expirationDate;
        uint256 maxUses;
        uint256 currentUses;
        AccessType accessType;
        bool isActive;
    }
    
    // State variables
    mapping(address => User) public users;
    mapping(bytes32 => Content) public contents;
    mapping(bytes32 => address) public fileHashToOwner;
    mapping(address => bytes32[]) public userContents;
    mapping(address => bytes32[]) public userPurchasedContent;
    mapping(address => bytes32[]) public userSharedWithMe;
    mapping(bytes32 => Folder) public folders;
    mapping(address => bytes32[]) public userFolders;
    mapping(bytes32 => ShareLink) public shareLinks;
    
    address public platformWallet;
    uint256 public totalPlatformEarnings;
    
    // Total storage tracking
    uint256 public totalStorageUsed;
    uint256 public totalStoragePurchased;
    
    // Events
    event UserRegistered(address indexed user);
    event StoragePurchased(address indexed user, uint256 gbAmount);
    event ContentUploaded(address indexed owner, bytes32 indexed contentHash, bytes32 fileHash, uint256 size);
    event ContentDeleted(address indexed owner, bytes32 indexed contentHash);
    event ContentPurchased(address indexed buyer, bytes32 indexed contentHash, AccessType accessType, uint256 price);
    event TemporaryAccessGranted(address indexed user, bytes32 indexed contentHash, uint256 expiryDate);
    event ContentUpdated(bytes32 indexed contentHash, uint256 newVersion);
    event HeirDesignated(bytes32 indexed contentHash, address indexed heir);
    event OwnershipTransferred(bytes32 indexed contentHash, address indexed previousOwner, address indexed newOwner);
    event FolderCreated(address indexed owner, bytes32 indexed folderId, string name, FolderType folderType);
    event ContentAddedToFolder(bytes32 indexed contentHash, bytes32 indexed folderId);
    event SubscriptionPurchased(address indexed subscriber, bytes32 indexed folderId, uint256 expiryDate);
    event ShareLinkCreated(bytes32 indexed linkId, bytes32 indexed contentHash, uint256 expiry);
    event ShareLinkUsed(bytes32 indexed linkId, address indexed user);
    event MonetizationActivated(address indexed user);
    event UserBlacklisted(address indexed user);
    event UserUnblacklisted(address indexed user);
    event RevenueDistributed(address indexed creator, uint256 amount, uint256 platformFee);
    event AccessGranted(address indexed user, bytes32 indexed contentHash, AccessType accessType);
    event AccessRevoked(address indexed user, bytes32 indexed contentHash);
    event ManagerAdded(bytes32 indexed contentHash, address indexed manager);
    event ManagerRemoved(bytes32 indexed contentHash, address indexed manager);
    event MaxDownloadsSet(bytes32 indexed contentHash, uint256 maxDownloads);
    event DownloadRecorded(bytes32 indexed contentHash, address indexed user);
    event ContentRemovedFromFolder(bytes32 indexed contentHash, bytes32 indexed folderId);
    
    // Modifiers
    modifier onlyRegistered(address user) {
        require(users[user].isRegistered, "User not registered");
        _;
    }
    
    modifier notBlacklisted(address user) {
        require(!users[user].isBlacklisted, "User is blacklisted");
        _;
    }
    
    modifier contentExists(bytes32 contentHash) {
        require(contents[contentHash].exists, "Content does not exist");
        _;
    }
    
    modifier folderExists(bytes32 folderId) {
        require(folders[folderId].exists, "Folder does not exist");
        _;
    }
    
    modifier isContentOwnerOrAdmin(bytes32 contentHash, address caller) {
        require(
            msg.sender == owner() || 
            (msg.sender == caller && contents[contentHash].owner == caller),
            "Not authorized"
        );
        _;
    }
    
    modifier isFolderOwnerOrAdmin(bytes32 folderId, address caller) {
        require(
            msg.sender == owner() || 
            (msg.sender == caller && folders[folderId].owner == caller),
            "Not authorized"
        );
        _;
    }
    
    modifier canManageContent(bytes32 contentHash, address caller) {
        require(
            msg.sender == owner() || 
            (msg.sender == caller && (contents[contentHash].owner == caller || contents[contentHash].isManager[caller])),
            "Not authorized"
        );
        _;
    }
    
    constructor(address _platformWallet) {
        platformWallet = _platformWallet;
    }
    
    // User Management Functions - Admin Only
    function registerUser(address user) external onlyOwner {
        require(!users[user].isRegistered, "User already registered");
        users[user].isRegistered = true;
        emit UserRegistered(user);
    }
    
    function purchaseStorage(address user, uint256 gbAmount) external onlyOwner onlyRegistered(user) {
        users[user].storagePurchased += gbAmount * 1e9;
        totalStoragePurchased += gbAmount * 1e9;
        emit StoragePurchased(user, gbAmount);
    }
    
    function activateMonetizationProfile(address user) external onlyOwner onlyRegistered(user) {
        users[user].hasMonetizationProfile = true;
        emit MonetizationActivated(user);
    }
    
    function blacklistUser(address user) external onlyOwner {
        users[user].isBlacklisted = true;
        emit UserBlacklisted(user);
    }
    
    function unblacklistUser(address user) external onlyOwner {
        users[user].isBlacklisted = false;
        emit UserUnblacklisted(user);
    }
    
    // Content Upload/Delete Functions - Admin or User
    function uploadContent(
        address userAddress,
        bytes32 originalHash,
        uint256 size,
        AccessType[] memory accessTypes,
        uint256[] memory prices,
        string memory metadata
    ) external onlyRegistered(userAddress) notBlacklisted(userAddress) returns (bytes32) {
        require(msg.sender == owner() || msg.sender == userAddress, "Not authorized");
        require(accessTypes.length == prices.length, "Arrays length mismatch");
        
        uint256 availableStorage = FREE_STORAGE + users[userAddress].storagePurchased - users[userAddress].storageUsed;
        require(availableStorage >= size, "Insufficient storage");
        
        bytes32 contentHash = keccak256(abi.encodePacked(originalHash, userAddress, block.timestamp));
        require(!contents[contentHash].exists, "Content already exists");
        
        Content storage newContent = contents[contentHash];
        newContent.owner = userAddress;
        newContent.fileHash = originalHash;
        newContent.size = size;
        newContent.uploadDate = block.timestamp;
        newContent.exists = true;
        newContent.metadata = metadata;
        newContent.version = 1;
        
        for (uint i = 0; i < accessTypes.length; i++) {
            newContent.hasAccessType[accessTypes[i]] = true;
            newContent.prices[accessTypes[i]] = prices[i];
        }
        
        fileHashToOwner[originalHash] = userAddress;
        userContents[userAddress].push(contentHash);
        users[userAddress].storageUsed += size;
        totalStorageUsed += size;
        
        emit ContentUploaded(userAddress, contentHash, originalHash, size);
        
        return contentHash;
    }
    
    function deleteContent(address contentOwner, bytes32 contentHash) 
        external contentExists(contentHash) isContentOwnerOrAdmin(contentHash, contentOwner) 
    {
        require(contents[contentHash].owner == contentOwner, "Not content owner");
        require(canDeleteContent(contentHash), "Cannot delete content with active subscriptions");
        
        Content storage content = contents[contentHash];
        uint256 size = content.size;
        bytes32 fileHash = content.fileHash;
        
        // Free up storage
        users[contentOwner].storageUsed -= size;
        totalStorageUsed -= size;
        
        // Remove from mappings
        delete fileHashToOwner[fileHash];
        delete contents[contentHash];
        
        // Remove from user contents array
        _removeFromArray(userContents[contentOwner], contentHash);
        
        emit ContentDeleted(contentOwner, contentHash);
    }
    
    // Content Update Functions - Admin or User/Manager
    function updateContentMetadata(address contentOwner, bytes32 contentHash, string memory newMetadata) 
        external contentExists(contentHash) canManageContent(contentHash, contentOwner) 
    {
        contents[contentHash].metadata = newMetadata;
        contents[contentHash].version++;
        emit ContentUpdated(contentHash, contents[contentHash].version);
    }
    
    function updateContentPrices(
        address contentOwner,
        bytes32 contentHash,
        AccessType[] memory accessTypes,
        uint256[] memory newPrices
    ) external contentExists(contentHash) canManageContent(contentHash, contentOwner) {
        require(accessTypes.length == newPrices.length, "Arrays length mismatch");
        
        Content storage content = contents[contentHash];
        for (uint i = 0; i < accessTypes.length; i++) {
            require(content.hasAccessType[accessTypes[i]], "Access type not enabled");
            content.prices[accessTypes[i]] = newPrices[i];
        }
        
        content.version++;
        emit ContentUpdated(contentHash, content.version);
    }
    
    // Inheritance Functions - Admin or User
    function designateHeir(address contentOwner, bytes32 contentHash, address heir) 
        external contentExists(contentHash) isContentOwnerOrAdmin(contentHash, contentOwner) 
    {
        require(contents[contentHash].owner == contentOwner, "Not content owner");
        require(heir != address(0), "Invalid heir address");
        contents[contentHash].heir = heir;
        emit HeirDesignated(contentHash, heir);
    }
    
    function claimInheritance(address heirAddress, bytes32 contentHash) 
        external onlyOwner contentExists(contentHash) 
    {
        require(contents[contentHash].heir == heirAddress, "Not designated heir");
        _transferOwnership(contentHash, heirAddress);
    }
    
    // Share Link Functions - Admin or User
    function createShareLink(
        address userAddress,
        bytes32 contentHash,
        uint256 duration,
        uint256 maxUses,
        AccessType accessType
    ) external contentExists(contentHash) isContentOwnerOrAdmin(contentHash, userAddress) returns (bytes32) {
        require(contents[contentHash].owner == userAddress, "Not content owner");
        require(contents[contentHash].hasAccessType[accessType], "Access type not available");
        
        bytes32 linkId = keccak256(abi.encodePacked(contentHash, userAddress, block.timestamp));
        
        shareLinks[linkId] = ShareLink({
            contentHash: contentHash,
            expirationDate: block.timestamp + duration,
            maxUses: maxUses,
            currentUses: 0,
            accessType: accessType,
            isActive: true
        });
        
        emit ShareLinkCreated(linkId, contentHash, block.timestamp + duration);
        return linkId;
    }
    
    // Allow List Functions - Admin or User
    function addToAllowList(address contentOwner, bytes32 contentHash, address userToAdd) 
        external contentExists(contentHash) isContentOwnerOrAdmin(contentHash, contentOwner) 
    {
        require(contents[contentHash].owner == contentOwner, "Not content owner");
        require(!contents[contentHash].isAllowListed[userToAdd], "Already in allow list");
        
        contents[contentHash].isAllowListed[userToAdd] = true;
        contents[contentHash].allowList.push(userToAdd);
        
        // Grant permanent free access
        contents[contentHash].hasUserAccess[userToAdd][AccessType.FREE_PERM] = true;
        emit AccessGranted(userToAdd, contentHash, AccessType.FREE_PERM);
    }
    
    function removeFromAllowList(address contentOwner, bytes32 contentHash, address userToRemove) 
        external contentExists(contentHash) isContentOwnerOrAdmin(contentHash, contentOwner) 
    {
        require(contents[contentHash].owner == contentOwner, "Not content owner");
        require(contents[contentHash].isAllowListed[userToRemove], "Not in allow list");
        
        contents[contentHash].isAllowListed[userToRemove] = false;
        _removeFromArray(contents[contentHash].allowList, userToRemove);
        
        // Revoke free access
        contents[contentHash].hasUserAccess[userToRemove][AccessType.FREE_PERM] = false;
        emit AccessRevoked(userToRemove, contentHash);
    }
    
    // Manager Functions - Admin or User
    function addContentManager(address contentOwner, bytes32 contentHash, address manager) 
        external contentExists(contentHash) isContentOwnerOrAdmin(contentHash, contentOwner) 
    {
        require(contents[contentHash].owner == contentOwner, "Not content owner");
        require(!contents[contentHash].isManager[manager], "Already a manager");
        
        contents[contentHash].isManager[manager] = true;
        contents[contentHash].managers.push(manager);
        
        emit ManagerAdded(contentHash, manager);
    }
    
    function removeContentManager(address contentOwner, bytes32 contentHash, address manager) 
        external contentExists(contentHash) isContentOwnerOrAdmin(contentHash, contentOwner) 
    {
        require(contents[contentHash].owner == contentOwner, "Not content owner");
        require(contents[contentHash].isManager[manager], "Not a manager");
        
        contents[contentHash].isManager[manager] = false;
        _removeFromArray(contents[contentHash].managers, manager);
        
        emit ManagerRemoved(contentHash, manager);
    }
    
    // Folder Functions - Admin or User
    function createFolder(
        address userAddress,
        string memory name,
        FolderType folderType,
        uint256 subscriptionPrice,
        uint256 subscriptionDuration,
        bool isPublic
    ) external onlyRegistered(userAddress) returns (bytes32) {
        require(msg.sender == owner() || msg.sender == userAddress, "Not authorized");
        
        bytes32 folderId = keccak256(abi.encodePacked(name, userAddress, block.timestamp));
        require(!folders[folderId].exists, "Folder already exists");
        
        Folder storage newFolder = folders[folderId];
        newFolder.owner = userAddress;
        newFolder.name = name;
        newFolder.folderType = folderType;
        newFolder.subscriptionPrice = subscriptionPrice;
        newFolder.subscriptionDuration = subscriptionDuration;
        newFolder.isPublic = isPublic;
        newFolder.exists = true;
        
        userFolders[userAddress].push(folderId);
        
        emit FolderCreated(userAddress, folderId, name, folderType);
        return folderId;
    }
    
    function addContentToFolder(address userAddress, bytes32 contentHash, bytes32 folderId) 
        external contentExists(contentHash) folderExists(folderId) isFolderOwnerOrAdmin(folderId, userAddress) 
    {
        require(folders[folderId].owner == userAddress, "Not folder owner");
        require(contents[contentHash].owner == userAddress, "Not content owner");
        require(!folders[folderId].hasContent[contentHash], "Content already in folder");
        
        folders[folderId].contents.push(contentHash);
        folders[folderId].hasContent[contentHash] = true;
        
        emit ContentAddedToFolder(contentHash, folderId);
    }
    
    function removeContentFromFolder(address userAddress, bytes32 contentHash, bytes32 folderId) 
        external folderExists(folderId) isFolderOwnerOrAdmin(folderId, userAddress) 
    {
        require(folders[folderId].owner == userAddress, "Not folder owner");
        require(folders[folderId].hasContent[contentHash], "Content not in folder");
        
        // Check if folder is subscription type and has active subscribers
        if (folders[folderId].folderType == FolderType.SUBSCRIPTION) {
            require(!_hasActiveSubscribers(folderId), "Cannot remove content from folder with active subscribers");
        }
        
        folders[folderId].hasContent[contentHash] = false;
        
        // Remove from contents array
        bytes32[] storage folderContents = folders[folderId].contents;
        for (uint i = 0; i < folderContents.length; i++) {
            if (folderContents[i] == contentHash) {
                folderContents[i] = folderContents[folderContents.length - 1];
                folderContents.pop();
                break;
            }
        }
        
        emit ContentRemovedFromFolder(contentHash, folderId);
    }
    
    // Purchase & Access Functions - Admin Only
    function purchaseContent(
        address buyerAddress,
        bytes32 contentHash,
        AccessType accessType,
        uint256 paymentAmount
    ) external onlyOwner onlyRegistered(buyerAddress) notBlacklisted(buyerAddress) contentExists(contentHash) {
        Content storage content = contents[contentHash];
        require(content.hasAccessType[accessType], "Access type not available");
        require(content.prices[accessType] == paymentAmount, "Incorrect payment amount");
        require(paymentAmount > 0, "Payment required");
        
        // Grant access
        content.hasUserAccess[buyerAddress][accessType] = true;
        
        // Set expiry for subscription access
        if (accessType == AccessType.SUBSCRIPTION) {
            content.userAccessExpiry[buyerAddress][accessType] = block.timestamp + 30 days;
        }
        
        // Distribute revenue
        uint256 platformFee = (paymentAmount * PLATFORM_FEE_PERCENT) / 100;
        uint256 creatorEarnings = paymentAmount - platformFee;
        
        users[content.owner].totalEarnings += creatorEarnings;
        totalPlatformEarnings += platformFee;
        content.totalRevenue += paymentAmount;
        
        // Add to purchased content
        userPurchasedContent[buyerAddress].push(contentHash);
        
        emit ContentPurchased(buyerAddress, contentHash, accessType, paymentAmount);
        emit RevenueDistributed(content.owner, creatorEarnings, platformFee);
    }
    
    function grantTemporaryAccess(address userAddress, bytes32 contentHash, uint256 duration) 
        external onlyOwner onlyRegistered(userAddress) notBlacklisted(userAddress) contentExists(contentHash) 
    {
        Content storage content = contents[contentHash];
        require(content.hasAccessType[AccessType.FREE_TEMP], "Temporary access not available");
        
        content.hasUserAccess[userAddress][AccessType.FREE_TEMP] = true;
        content.userAccessExpiry[userAddress][AccessType.FREE_TEMP] = block.timestamp + duration;
        
        // Add to shared content
        userSharedWithMe[userAddress].push(contentHash);
        
        emit TemporaryAccessGranted(userAddress, contentHash, block.timestamp + duration);
    }
    
    // Download Management Functions - Admin or User
    function setMaxDownloads(address contentOwner, bytes32 contentHash, uint256 maxDownloads) 
        external contentExists(contentHash) isContentOwnerOrAdmin(contentHash, contentOwner) 
    {
        require(contents[contentHash].owner == contentOwner, "Not content owner");
        contents[contentHash].maxDownloads = maxDownloads;
        emit MaxDownloadsSet(contentHash, maxDownloads);
    }
    
    function recordDownload(address userAddress, bytes32 contentHash) 
        external onlyOwner contentExists(contentHash) 
    {
        Content storage content = contents[contentHash];
        
        // Check if user has valid access
        require(hasValidAccess(userAddress, contentHash), "No valid access");
        
        // For FREE_TEMP users, check download limit
        if (content.hasUserAccess[userAddress][AccessType.FREE_TEMP] && 
            !content.hasUserAccess[userAddress][AccessType.LICENSE] &&
            !content.hasUserAccess[userAddress][AccessType.TRANSFER]) {
            
            require(
                content.maxDownloads == 0 || 
                content.userDownloads[userAddress] < content.maxDownloads,
                "Download limit reached"
            );
            
            content.userDownloads[userAddress]++;
        }
        
        content.totalDownloads++;
        emit DownloadRecorded(contentHash, userAddress);
    }
    
    // Share Link Usage - Admin Only
    function useShareLink(address userAddress, bytes32 linkId) 
        external onlyOwner onlyRegistered(userAddress) notBlacklisted(userAddress) 
    {
        ShareLink storage link = shareLinks[linkId];
        require(link.isActive, "Link is not active");
        require(link.expirationDate > block.timestamp, "Link has expired");
        require(link.currentUses < link.maxUses, "Link usage limit reached");
        
        bytes32 contentHash = link.contentHash;
        Content storage content = contents[contentHash];
        
        // Grant access based on link type
        content.hasUserAccess[userAddress][link.accessType] = true;
        
        if (link.accessType == AccessType.FREE_TEMP || link.accessType == AccessType.SUBSCRIPTION) {
            uint256 duration = link.accessType == AccessType.SUBSCRIPTION ? 30 days : 7 days;
            content.userAccessExpiry[userAddress][link.accessType] = block.timestamp + duration;
        }
        
        link.currentUses++;
        
        emit ShareLinkUsed(linkId, userAddress);
        emit AccessGranted(userAddress, contentHash, link.accessType);
    }
    
    // Revoke Access Functions - Admin or User
    function revokeAccess(address contentOwner, bytes32 contentHash, address userToRevoke) 
        external contentExists(contentHash) isContentOwnerOrAdmin(contentHash, contentOwner) 
    {
        require(contents[contentHash].owner == contentOwner, "Not content owner");
        
        Content storage content = contents[contentHash];
        
        // Revoke all access types
        content.hasUserAccess[userToRevoke][AccessType.TRANSFER] = false;
        content.hasUserAccess[userToRevoke][AccessType.LICENSE] = false;
        content.hasUserAccess[userToRevoke][AccessType.SUBSCRIPTION] = false;
        content.hasUserAccess[userToRevoke][AccessType.FREE_TEMP] = false;
        content.hasUserAccess[userToRevoke][AccessType.FREE_PERM] = false;
        
        // Remove from allow list if present
        if (content.isAllowListed[userToRevoke]) {
            content.isAllowListed[userToRevoke] = false;
            _removeFromArray(content.allowList, userToRevoke);
        }
        
        emit AccessRevoked(userToRevoke, contentHash);
    }
    
    // Transfer Ownership Functions - Admin or User
    function transferContentOwnership(address currentOwner, bytes32 contentHash, address newOwner) 
        external contentExists(contentHash) onlyRegistered(newOwner) notBlacklisted(newOwner) isContentOwnerOrAdmin(contentHash, currentOwner) 
    {
        require(contents[contentHash].owner == currentOwner, "Not content owner");
        require(newOwner != address(0), "Invalid new owner");
        _transferOwnership(contentHash, newOwner);
    }
    
    // Platform Management - Admin Only
    function updatePlatformWallet(address newWallet) external onlyOwner {
        require(newWallet != address(0), "Invalid wallet address");
        platformWallet = newWallet;
    }
    
    // Subscription Functions - Admin Only
    function subscribeToFolder(address subscriberAddress, bytes32 folderId) 
        external onlyOwner onlyRegistered(subscriberAddress) notBlacklisted(subscriberAddress) folderExists(folderId) 
    {
        require(folders[folderId].folderType == FolderType.SUBSCRIPTION, "Not a subscription folder");
        
        Folder storage folder = folders[folderId];
        uint256 expiryDate = block.timestamp + folder.subscriptionDuration;
        folder.subscriptionExpiry[subscriberAddress] = expiryDate;
        
        // Distribute revenue
        uint256 platformFee = (folder.subscriptionPrice * PLATFORM_FEE_PERCENT) / 100;
        uint256 creatorEarnings = folder.subscriptionPrice - platformFee;
        
        users[folder.owner].totalEarnings += creatorEarnings;
        totalPlatformEarnings += platformFee;
        folder.totalRevenue += folder.subscriptionPrice;
        
        emit SubscriptionPurchased(subscriberAddress, folderId, expiryDate);
        emit RevenueDistributed(folder.owner, creatorEarnings, platformFee);
    }
    
    // Query Functions
    function hasValidAccess(address user, bytes32 contentHash) public view returns (bool) {
        Content storage content = contents[contentHash];
        
        // Check if user is owner
        if (content.owner == user) return true;
        
        // Check permanent access
        if (content.hasUserAccess[user][AccessType.TRANSFER] || 
            content.hasUserAccess[user][AccessType.LICENSE] ||
            content.hasUserAccess[user][AccessType.FREE_PERM]) {
            return true;
        }
        
        // Check temporary/subscription access with expiry
        if (content.hasUserAccess[user][AccessType.SUBSCRIPTION] &&
            content.userAccessExpiry[user][AccessType.SUBSCRIPTION] > block.timestamp) {
            return true;
        }
        
        if (content.hasUserAccess[user][AccessType.FREE_TEMP] &&
            content.userAccessExpiry[user][AccessType.FREE_TEMP] > block.timestamp) {
            return true;
        }
        
        return false;
    }
    
    function canDeleteContent(bytes32 contentHash) public view returns (bool) {
        // Check if content is in any subscription folder
        for (uint i = 0; i < userFolders[contents[contentHash].owner].length; i++) {
            bytes32 folderId = userFolders[contents[contentHash].owner][i];
            if (folders[folderId].hasContent[contentHash] && 
                folders[folderId].folderType == FolderType.SUBSCRIPTION) {
                // Check if folder has active subscribers
                if (_hasActiveSubscribers(folderId)) {
                    return false;
                }
            }
        }
        return true;
    }
    
    function _hasActiveSubscribers(bytes32 folderId) private view returns (bool) {
        // This is a simplified check - in production you'd track subscribers
        // For now, assume no active subscribers if folder revenue is 0
        return folders[folderId].totalRevenue > 0;
    }
    
    function getUserInfo(address user) external view returns (
        bool isRegistered,
        uint256 storageUsed,
        uint256 storagePurchased,
        uint256 storageAvailable,
        bool hasMonetizationProfile,
        bool isBlacklisted
    ) {
        User memory u = users[user];
        uint256 totalStorage = FREE_STORAGE + u.storagePurchased;
        uint256 available = totalStorage > u.storageUsed ? totalStorage - u.storageUsed : 0;
        
        return (
            u.isRegistered,
            u.storageUsed,
            u.storagePurchased,
            available,
            u.hasMonetizationProfile,
            u.isBlacklisted
        );
    }
    
    function getContentInfo(bytes32 contentHash) external view returns (
        address owner,
        bytes32 fileHash,
        uint256 size,
        uint256 uploadDate,
        string memory metadata,
        uint256 version,
        uint256 totalRevenue,
        address heir
    ) {
        Content storage content = contents[contentHash];
        return (
            content.owner,
            content.fileHash,
            content.size,
            content.uploadDate,
            content.metadata,
            content.version,
            content.totalRevenue,
            content.heir
        );
    }
    
    function getContentPrice(bytes32 contentHash, AccessType accessType) external view returns (uint256) {
        return contents[contentHash].prices[accessType];
    }
    
    function getContentAllowList(bytes32 contentHash) external view returns (address[] memory) {
        return contents[contentHash].allowList;
    }
    
    function getContentManagers(bytes32 contentHash) external view returns (address[] memory) {
        return contents[contentHash].managers;
    }
    
    function getUserContents(address user) external view returns (bytes32[] memory) {
        return userContents[user];
    }
    
    function getUserPurchasedContent(address user) external view returns (bytes32[] memory) {
        return userPurchasedContent[user];
    }
    
    function getUserSharedWithMe(address user) external view returns (bytes32[] memory) {
        return userSharedWithMe[user];
    }
    
    function getUserFolders(address user) external view returns (bytes32[] memory) {
        return userFolders[user];
    }
    
    function getFolderContents(bytes32 folderId) external view returns (bytes32[] memory) {
        return folders[folderId].contents;
    }
    
    function getUserEarnings(address user) external view returns (uint256) {
        return users[user].totalEarnings;
    }
    
    function getOwnerByFileHash(bytes32 fileHash) external view returns (address) {
        return fileHashToOwner[fileHash];
    }
    
    function getTotalStorageStats() external view returns (
        uint256 totalUsed,
        uint256 totalPurchased,
        uint256 totalFree
    ) {
        return (
            totalStorageUsed,
            totalStoragePurchased,
            FREE_STORAGE
        );
    }
    
    function getDownloadStats(bytes32 contentHash, address user) external view returns (
        uint256 totalDownloads,
        uint256 maxDownloads,
        uint256 userDownloads,
        uint256 remainingDownloads
    ) {
        Content storage content = contents[contentHash];
        uint256 remaining = 0;
        
        if (content.maxDownloads > 0 && content.userDownloads[user] < content.maxDownloads) {
            remaining = content.maxDownloads - content.userDownloads[user];
        }
        
        return (
            content.totalDownloads,
            content.maxDownloads,
            content.userDownloads[user],
            remaining
        );
    }
    
    function getShareLinkInfo(bytes32 linkId) external view returns (
        bytes32 contentHash,
        uint256 expirationDate,
        uint256 maxUses,
        uint256 currentUses,
        AccessType accessType,
        bool isActive
    ) {
        ShareLink memory link = shareLinks[linkId];
        return (
            link.contentHash,
            link.expirationDate,
            link.maxUses,
            link.currentUses,
            link.accessType,
            link.isActive
        );
    }
    
    function getFolderInfo(bytes32 folderId) external view returns (
        address owner,
        string memory name,
        FolderType folderType,
        uint256 subscriptionPrice,
        uint256 subscriptionDuration,
        uint256 totalRevenue,
        bool isPublic
    ) {
        Folder storage folder = folders[folderId];
        return (
            folder.owner,
            folder.name,
            folder.folderType,
            folder.subscriptionPrice,
            folder.subscriptionDuration,
            folder.totalRevenue,
            folder.isPublic
        );
    }
    
    function getUserStorage(address user) external view returns (
        uint256 storageUsed,
        uint256 storagePurchased,
        uint256 storageAvailable
    ) {
        uint256 totalStorage = FREE_STORAGE + users[user].storagePurchased;
        uint256 available = totalStorage > users[user].storageUsed ? totalStorage - users[user].storageUsed : 0;
        
        return (
            users[user].storageUsed,
            users[user].storagePurchased,
            available
        );
    }
    
    // Serialization for VC
    function serializeAccess(
        string memory id,
        address owner,
        address user,
        bytes32 contentHash,
        AccessType accessType,
        uint256 price,
        uint256 expirationDate
    ) external pure returns (bytes memory) {
        return abi.encode(id, owner, user, contentHash, uint8(accessType), price, expirationDate);
    }
    
    function deserializeAccess(bytes memory data) external pure returns (
        string memory id,
        address owner,
        address user,
        bytes32 contentHash,
        uint8 accessType,
        uint256 price,
        uint256 expirationDate
    ) {
        return abi.decode(data, (string, address, address, bytes32, uint8, uint256, uint256));
    }
    
    // Utility Functions
    function _transferOwnership(bytes32 contentHash, address newOwner) private {
        Content storage content = contents[contentHash];
        address previousOwner = content.owner;
        
        // Update ownership
        content.owner = newOwner;
        
        // Update user contents arrays
        _removeFromArray(userContents[previousOwner], contentHash);
        userContents[newOwner].push(contentHash);
        
        // Update file hash mapping
        fileHashToOwner[content.fileHash] = newOwner;
        
        emit OwnershipTransferred(contentHash, previousOwner, newOwner);
    }
    
    function _removeFromArray(bytes32[] storage array, bytes32 item) private {
        for (uint i = 0; i < array.length; i++) {
            if (array[i] == item) {
                array[i] = array[array.length - 1];
                array.pop();
                break;
            }
        }
    }
    
    function _removeFromArray(address[] storage array, address item) private {
        for (uint i = 0; i < array.length; i++) {
            if (array[i] == item) {
                array[i] = array[array.length - 1];
                array.pop();
                break;
            }
        }
    }
}