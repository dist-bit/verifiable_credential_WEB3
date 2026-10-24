const { ethers } = require('ethers');
const { 
    CONTRACTS, 
    AccessType, 
    FolderType, 
    NETWORK_CONFIG, 
    BLOCK_VAULT_DOMAIN,
    BLOCK_VAULT_TYPES,
    BlockVaultABI,
    NebuVCABI 
} = require('./config');

class BlockVaultAPI {
    constructor(privateKey, network = 'ethereumClassic') {
        if (!privateKey) {
            throw new Error('Private key is required');
        }

        if (!CONTRACTS.BLOCK_VAULT) {
            throw new Error('BlockVault contract address not configured. Deploy first or set BLOCK_VAULT_ADDRESS');
        }

        // Setup provider and wallet
        const networkConfig = NETWORK_CONFIG[network];
        if (!networkConfig) {
            throw new Error(`Network ${network} not supported`);
        }

        this.provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl);
        this.wallet = new ethers.Wallet(privateKey, this.provider);
        
        // Initialize contracts
        this.blockVault = new ethers.Contract(CONTRACTS.BLOCK_VAULT, BlockVaultABI, this.wallet);
        this.nebuVC = new ethers.Contract(CONTRACTS.NEBU_VC, NebuVCABI, this.wallet);
        
        // Store network config
        this.network = networkConfig;
        this.domain = {
            ...BLOCK_VAULT_DOMAIN,
            verifyingContract: CONTRACTS.BLOCK_VAULT
        };
    }


    // ===== USER MANAGEMENT =====

    async registerUser(userAddress) {
        if (!userAddress) {
            throw new Error('User address is required');
        }
        console.log('📝 Registering user:', userAddress);
        const tx = await this.blockVault.registerUser(userAddress);
        const receipt = await tx.wait();
        console.log('✅ User registered!');
        return receipt;
    }

    async isUserRegistered(address) {
        const user = await this.blockVault.users(address || this.wallet.address);
        return user.isRegistered;
    }

    async getUserInfo(address) {
        const userAddress = address || this.wallet.address;
        const user = await this.blockVault.users(userAddress);
        const [storageUsed, storagePurchased, storageAvailable] = await this.blockVault.getUserStorage(userAddress);
        
        return {
            isRegistered: user.isRegistered,
            storageUsed: ethers.formatUnits(storageUsed, 0),
            storagePurchased: ethers.formatUnits(storagePurchased, 0),
            storageAvailable: ethers.formatUnits(storageAvailable, 0),
            hasMonetizationProfile: user.hasMonetizationProfile,
            isBlacklisted: user.isBlacklisted
        };
    }

    async purchaseStorage(userAddress, gbAmount) {
        if (!userAddress) {
            throw new Error('User address is required');
        }
        console.log(`💾 Purchasing ${gbAmount}GB of storage for ${userAddress}...`);
        const tx = await this.blockVault.purchaseStorage(userAddress, gbAmount);
        const receipt = await tx.wait();
        console.log(`✅ Purchased ${gbAmount}GB of storage!`);
        return receipt;
    }

    async activateMonetizationProfile(userAddress) {
        if (!userAddress) {
            throw new Error('User address is required');
        }
        console.log(`💰 Activating monetization profile for ${userAddress}...`);
        const tx = await this.blockVault.activateMonetizationProfile(userAddress);
        const receipt = await tx.wait();
        console.log('✅ Monetization profile activated!');
        return receipt;
    }

    // ===== CONTENT MANAGEMENT =====

    async uploadContent(userAddress, originalHash, size, accessTypes, prices, metadata = "{}") {
        if (!userAddress) {
            throw new Error('User address is required');
        }
        
        // Convert size to BigInt if needed
        const contentSize = BigInt(size);
        
        // Convert prices to BigInt array
        const pricesBigInt = prices.map(p => BigInt(p));
        
        console.log(`📤 Uploading content for ${userAddress}...`);
        const tx = await this.blockVault.uploadContent(
            userAddress,
            originalHash,
            contentSize,
            accessTypes,
            pricesBigInt,
            metadata
        );
        const receipt = await tx.wait();
        
        // Get the ContentHash from events
        const event = receipt.logs.find(log => {
            try {
                const parsed = this.blockVault.interface.parseLog(log);
                return parsed.name === 'ContentUploaded';
            } catch {
                return false;
            }
        });
        
        if (event) {
            const parsed = this.blockVault.interface.parseLog(event);
            console.log('✅ Content uploaded!');
            
            return {
                receipt,
                contentHash: parsed.args.contentHash || originalHash,
                fileHash: originalHash,
                owner: parsed.args.owner || userAddress
            };
        }
        
        return { 
            receipt,
            contentHash: originalHash,
            fileHash: originalHash,
            owner: userAddress
        };
    }

    async getContentInfo(contentHash) {
        try {
            // Get access types to check if content exists
            const accessTypes = await this.blockVault.getContentAccessTypes(contentHash);
            
            if (!accessTypes || accessTypes.length === 0) {
                return null;
            }

            // Get owner
            const owner = await this.blockVault.getOwnerByFileHash(contentHash);
            
            // Get prices for each access type
            const prices = {};
            for (const accessType of accessTypes) {
                const price = await this.blockVault.getContentPrice(contentHash, accessType);
                prices[accessType] = ethers.formatEther(price);
            }

            // Get content data if available
            let size = 'N/A';
            let uploadDate = new Date();
            
            try {
                const [contentOwner, hash, contentSize, contentUploadDate, exists] = await this.blockVault.getContentByFileHash(contentHash);
                if (exists && contentSize) {
                    size = ethers.formatUnits(contentSize, 0);
                    uploadDate = new Date(Number(contentUploadDate) * 1000);
                }
            } catch {
                // If getContentByFileHash fails, continue with default values
            }

            return {
                owner: owner || ethers.ZeroAddress,
                contentHash: contentHash,
                fileHash: contentHash,
                size: size,
                uploadDate: uploadDate,
                accessTypes,
                prices,
                exists: true
            };
        } catch (error) {
            console.error('Error getting content info:', error.message);
            return null;
        }
    }

    async deleteContent(userAddress, contentHash) {
        if (!userAddress) {
            throw new Error('User address is required');
        }
        console.log('🗑️ Deleting content...');
        const tx = await this.blockVault.deleteContent(userAddress, contentHash);
        const receipt = await tx.wait();
        console.log('✅ Content deleted!');
        return receipt;
    }

    async setMaxDownloads(userAddress, contentHash, maxDownloads) {
        if (!userAddress) {
            throw new Error('User address is required');
        }
        console.log(`📊 Setting max downloads to ${maxDownloads}...`);
        const tx = await this.blockVault.setMaxDownloads(userAddress, contentHash, maxDownloads);
        const receipt = await tx.wait();
        console.log('✅ Max downloads set!');
        return receipt;
    }

    async recordDownload(userAddress, contentHash) {
        if (!userAddress) {
            throw new Error('User address is required');
        }
        console.log('📥 Recording download...');
        const tx = await this.blockVault.recordDownload(userAddress, contentHash);
        const receipt = await tx.wait();
        console.log('✅ Download recorded!');
        return receipt;
    }

    async getDownloadStats(contentHash, userAddress) {
        const user = userAddress || this.wallet.address;
        const [totalDownloads, maxDownloads, userDownloads] = await this.blockVault.getDownloadStats(contentHash, user);
        
        return {
            totalDownloads: Number(totalDownloads),
            maxDownloads: Number(maxDownloads),
            userDownloads: Number(userDownloads),
            remainingDownloads: maxDownloads > 0 ? Number(maxDownloads) - Number(userDownloads) : 'unlimited'
        };
    }

    // ===== ACCESS MANAGEMENT =====

    async purchaseContent(userAddress, contentHash, accessType, paymentAmount) {
        if (!userAddress) {
            throw new Error('User address is required');
        }
        console.log(`💳 Purchasing content for ${userAddress} with ${Object.keys(AccessType)[accessType]} access...`);
        const tx = await this.blockVault.purchaseContent(userAddress, contentHash, accessType, BigInt(paymentAmount));
        const receipt = await tx.wait();
        console.log('✅ Content purchased!');
        return receipt;
    }

    async grantTemporaryAccess(userAddress, contentHash, duration) {
        console.log(`⏰ Granting temporary access for ${duration} seconds...`);
        const tx = await this.blockVault.grantTemporaryAccess(userAddress, contentHash, duration);
        const receipt = await tx.wait();
        console.log('✅ Temporary access granted!');
        return receipt;
    }

    async addToAllowList(contentOwner, contentHash, userAddress) {
        if (!contentOwner || !userAddress) {
            throw new Error('Content owner and user address are required');
        }
        console.log('➕ Adding user to allow list...');
        const tx = await this.blockVault.addToAllowList(contentOwner, contentHash, userAddress);
        const receipt = await tx.wait();
        console.log('✅ User added to allow list!');
        return receipt;
    }

    async revokeAccess(contentOwner, contentHash, userAddress) {
        if (!contentOwner || !userAddress) {
            throw new Error('Content owner and user address are required');
        }
        console.log('❌ Revoking access...');
        const tx = await this.blockVault.revokeAccess(contentOwner, contentHash, userAddress);
        const receipt = await tx.wait();
        console.log('✅ Access revoked!');
        return receipt;
    }

    async hasValidAccess(userAddress, contentHash) {
        return await this.blockVault.hasValidAccess(userAddress, contentHash);
    }

    // ===== FOLDER MANAGEMENT =====

    async createFolder(userAddress, name, folderType, subscriptionPrice = 0, subscriptionDuration = 0, isPublic = true) {
        if (!userAddress) {
            throw new Error('User address is required');
        }
        console.log(`📁 Creating folder: ${name} for ${userAddress}...`);
        const tx = await this.blockVault.createFolder(
            userAddress,
            name,
            folderType,
            BigInt(subscriptionPrice),
            BigInt(subscriptionDuration),
            isPublic
        );
        const receipt = await tx.wait();
        
        // Get folder ID from event
        const event = receipt.logs.find(log => {
            try {
                const parsed = this.blockVault.interface.parseLog(log);
                return parsed.name === 'FolderCreated';
            } catch {
                return false;
            }
        });
        
        if (event) {
            const parsed = this.blockVault.interface.parseLog(event);
            console.log('✅ Folder created!');
            return {
                receipt,
                folderId: parsed.args.folderId,
                owner: parsed.args.owner
            };
        }
        
        return { receipt };
    }

    async addContentToFolder(userAddress, contentHash, folderId) {
        if (!userAddress) {
            throw new Error('User address is required');
        }
        console.log('📎 Adding content to folder...');
        const tx = await this.blockVault.addContentToFolder(userAddress, contentHash, folderId);
        const receipt = await tx.wait();
        console.log('✅ Content added to folder!');
        return receipt;
    }

    async subscribeToFolder(userAddress, folderId) {
        if (!userAddress) {
            throw new Error('User address is required');
        }
        console.log('💳 Subscribing to folder...');
        const tx = await this.blockVault.subscribeToFolder(userAddress, folderId);
        const receipt = await tx.wait();
        console.log('✅ Subscribed to folder!');
        return receipt;
    }

    // ===== VERIFIABLE CREDENTIALS =====

    async createVerifiableCredential(accessData) {
        console.log('🔐 Creating Verifiable Credential...');
        
        // Ensure the domain has the correct contract address
        this.domain.verifyingContract = await this.blockVault.getAddress();
        
        // Create serialized data
        const serialized = await this.blockVault.createSerializedBlockVaultAccess(
            accessData.id,
            accessData.owner,
            accessData.user,
            accessData.contentHash,
            accessData.accessType,
            BigInt(accessData.price),
            BigInt(accessData.expirationDate)
        );
        
        // Sign the data
        const signature = await this.wallet.signTypedData(
            this.domain,
            BLOCK_VAULT_TYPES,
            accessData
        );
        
        // Create VC in NebuVC
        const tx = await this.nebuVC.createVC(
            await this.blockVault.getAddress(),
            accessData.user,
            serialized,
            signature,
            BigInt(accessData.expirationDate)
        );
        
        const receipt = await tx.wait();
        
        // Get VC ID from event
        const event = receipt.logs.find(log => {
            try {
                const parsed = this.nebuVC.interface.parseLog(log);
                return parsed.name === 'VCCreated';
            } catch {
                return false;
            }
        });
        
        let vcId = 0;
        if (event) {
            const parsed = this.nebuVC.interface.parseLog(event);
            vcId = Number(parsed.args.id);
        }
        
        console.log('✅ Verifiable Credential created!');
        return {
            receipt,
            vcId,
            serialized,
            signature
        };
    }

    async verifyCredential(vcId, asOwner = true) {
        console.log(`🔍 Verifying credential #${vcId}...`);
        
        const isValid = asOwner 
            ? await this.nebuVC.verifyByOwner(vcId)
            : await this.nebuVC.verifyByIssuer(vcId);
            
        console.log(`✅ Credential is ${isValid ? 'VALID' : 'INVALID'}`);
        return isValid;
    }

    async getCredentialInfo(vcId) {
        const vc = await this.nebuVC.getVC(vcId);
        
        // Deserialize the credential data
        const accessData = await this.blockVault.deserializeAccess(vc.credentialData);
        
        return {
            issuer: vc.issuer,
            subject: vc.subject,
            issuanceDate: new Date(Number(vc.issuanceDate) * 1000),
            expirationDate: new Date(Number(vc.expirationDate) * 1000),
            isRevoked: vc.isRevoked,
            accessData: {
                id: accessData.id,
                owner: accessData.owner,
                user: accessData.user,
                contentHash: accessData.contentHash,
                accessType: Number(accessData.accessType),
                price: ethers.formatEther(accessData.price),
                expirationDate: new Date(Number(accessData.expirationDate) * 1000)
            }
        };
    }

    // ===== INHERITANCE & MANAGEMENT =====

    async designateHeir(contentOwner, contentHash, heirAddress) {
        if (!contentOwner || !heirAddress) {
            throw new Error('Content owner and heir address are required');
        }
        console.log('👑 Designating heir...');
        const tx = await this.blockVault.designateHeir(contentOwner, contentHash, heirAddress);
        const receipt = await tx.wait();
        console.log('✅ Heir designated!');
        return receipt;
    }

    async transferContentOwnership(currentOwner, contentHash, newOwner) {
        if (!currentOwner || !newOwner) {
            throw new Error('Current owner and new owner addresses are required');
        }
        console.log('🔄 Transferring content ownership...');
        const tx = await this.blockVault.transferContentOwnership(currentOwner, contentHash, newOwner);
        const receipt = await tx.wait();
        console.log('✅ Ownership transferred!');
        return receipt;
    }

    async addContentManager(contentOwner, contentHash, managerAddress) {
        if (!contentOwner || !managerAddress) {
            throw new Error('Content owner and manager address are required');
        }
        console.log('👤 Adding content manager...');
        const tx = await this.blockVault.addContentManager(contentOwner, contentHash, managerAddress);
        const receipt = await tx.wait();
        console.log('✅ Manager added!');
        return receipt;
    }

    async removeContentManager(contentOwner, contentHash, managerAddress) {
        if (!contentOwner || !managerAddress) {
            throw new Error('Content owner and manager address are required');
        }
        console.log('👤 Removing content manager...');
        const tx = await this.blockVault.removeContentManager(contentOwner, contentHash, managerAddress);
        const receipt = await tx.wait();
        console.log('✅ Manager removed!');
        return receipt;
    }

    async updateContentPrices(contentOwner, contentHash, accessTypes, newPrices) {
        if (!contentOwner) {
            throw new Error('Content owner address is required');
        }
        console.log('💰 Updating content prices...');
        const pricesBigInt = newPrices.map(p => BigInt(p));
        
        const tx = await this.blockVault.updateContentPrices(contentOwner, contentHash, accessTypes, pricesBigInt);
        const receipt = await tx.wait();
        console.log('✅ Prices updated!');
        return receipt;
    }

    async updateContentMetadata(contentOwner, contentHash, newMetadata) {
        if (!contentOwner) {
            throw new Error('Content owner address is required');
        }
        console.log('📝 Updating content metadata...');
        const tx = await this.blockVault.updateContentMetadata(contentOwner, contentHash, newMetadata);
        const receipt = await tx.wait();
        console.log('✅ Metadata updated!');
        return receipt;
    }

    // ===== SHARE LINKS =====

    async createShareLink(userAddress, contentHash, duration, maxUses, accessType) {
        if (!userAddress) {
            throw new Error('User address is required');
        }
        console.log('🔗 Creating share link...');
        const tx = await this.blockVault.createShareLink(userAddress, contentHash, duration, maxUses, accessType);
        const receipt = await tx.wait();
        
        // Get link ID from event
        const event = receipt.logs.find(log => {
            try {
                const parsed = this.blockVault.interface.parseLog(log);
                return parsed.name === 'ShareLinkCreated';
            } catch {
                return false;
            }
        });
        
        if (event) {
            const parsed = this.blockVault.interface.parseLog(event);
            console.log('✅ Share link created!');
            return {
                receipt,
                linkId: parsed.args.linkId
            };
        }
        
        return { receipt };
    }

    async useShareLink(userAddress, linkId) {
        if (!userAddress) {
            throw new Error('User address is required');
        }
        console.log('🔗 Using share link...');
        const tx = await this.blockVault.useShareLink(userAddress, linkId);
        const receipt = await tx.wait();
        console.log('✅ Share link used!');
        return receipt;
    }

    async getShareLinkInfo(linkId) {
        const [contentHash, expirationDate, maxUses, currentUses, accessType, isActive] = 
            await this.blockVault.getShareLinkInfo(linkId);
        
        return {
            contentHash,
            expirationDate: new Date(Number(expirationDate) * 1000),
            maxUses: Number(maxUses),
            currentUses: Number(currentUses),
            accessType: Number(accessType),
            isActive,
            remainingUses: maxUses > 0 ? Number(maxUses) - Number(currentUses) : 'unlimited'
        };
    }

    // ===== BLACKLIST MANAGEMENT =====

    async blacklistUser(userAddress) {
        console.log('🚫 Blacklisting user...');
        const tx = await this.blockVault.blacklistUser(userAddress);
        const receipt = await tx.wait();
        console.log('✅ User blacklisted!');
        return receipt;
    }

    async unblacklistUser(userAddress) {
        console.log('✅ Unblacklisting user...');
        const tx = await this.blockVault.unblacklistUser(userAddress);
        const receipt = await tx.wait();
        console.log('✅ User unblacklisted!');
        return receipt;
    }

    // ===== EARNINGS =====

    async getUserEarnings(userAddress) {
        const user = await this.blockVault.users(userAddress);
        return {
            totalEarnings: ethers.formatEther(user.totalEarnings)
        };
    }

    // ===== INHERITANCE =====

    async claimInheritance(heirAddress, contentHash) {
        if (!heirAddress) {
            throw new Error('Heir address is required');
        }
        console.log('👑 Claiming inheritance...');
        const tx = await this.blockVault.claimInheritance(heirAddress, contentHash);
        const receipt = await tx.wait();
        console.log('✅ Inheritance claimed!');
        return receipt;
    }

    // ===== FOLDER MANAGEMENT CONTINUED =====

    async removeContentFromFolder(userAddress, contentHash, folderId) {
        if (!userAddress) {
            throw new Error('User address is required');
        }
        console.log('📎 Removing content from folder...');
        const tx = await this.blockVault.removeContentFromFolder(userAddress, contentHash, folderId);
        const receipt = await tx.wait();
        console.log('✅ Content removed from folder!');
        return receipt;
    }

    async getFolderInfo(folderId) {
        const [owner, name, folderType, subscriptionPrice, subscriptionDuration, totalSubscribers, isPublic] = 
            await this.blockVault.getFolderInfo(folderId);
        
        return {
            owner,
            name,
            folderType: Number(folderType),
            subscriptionPrice: ethers.formatEther(subscriptionPrice),
            subscriptionDuration: Number(subscriptionDuration),
            totalSubscribers: Number(totalSubscribers),
            isPublic
        };
    }

    async getFolderContents(folderId) {
        return await this.blockVault.getFolderContents(folderId);
    }

    // ===== ALLOW LIST MANAGEMENT =====

    async removeFromAllowList(contentOwner, contentHash, userAddress) {
        if (!contentOwner || !userAddress) {
            throw new Error('Content owner and user address are required');
        }
        console.log('➖ Removing user from allow list...');
        const tx = await this.blockVault.removeFromAllowList(contentOwner, contentHash, userAddress);
        const receipt = await tx.wait();
        console.log('✅ User removed from allow list!');
        return receipt;
    }

    async getContentAllowList(contentHash) {
        return await this.blockVault.getContentAllowList(contentHash);
    }

    // ===== PLATFORM MANAGEMENT =====

    async updatePlatformWallet(newWallet) {
        console.log('🏦 Updating platform wallet...');
        const tx = await this.blockVault.updatePlatformWallet(newWallet);
        const receipt = await tx.wait();
        console.log('✅ Platform wallet updated!');
        return receipt;
    }

    // ===== QUERY FUNCTIONS =====

    async getUserContents(userAddress) {
        return await this.blockVault.getUserContents(userAddress || this.wallet.address);
    }

    async getUserFolders(userAddress) {
        return await this.blockVault.getUserFolders(userAddress || this.wallet.address);
    }

    async getUserPurchasedContent(userAddress) {
        return await this.blockVault.getUserPurchasedContent(userAddress || this.wallet.address);
    }

    async getUserSharedWithMe(userAddress) {
        return await this.blockVault.getUserSharedWithMe(userAddress || this.wallet.address);
    }

    async getContentManagers(contentHash) {
        return await this.blockVault.getContentManagers(contentHash);
    }

    async getContentPrice(contentHash, accessType) {
        const price = await this.blockVault.getContentPrice(contentHash, accessType);
        return ethers.formatEther(price);
    }

    async canDeleteContent(contentHash) {
        const [canDelete, reason] = await this.blockVault.canDeleteContent(contentHash);
        return { canDelete, reason };
    }

    async getTotalStorageStats() {
        const [totalUsed, totalPurchased, totalFree] = await this.blockVault.getTotalStorageStats();
        return {
            totalUsed: ethers.formatUnits(totalUsed, 9), // Convert to GB
            totalPurchased: ethers.formatUnits(totalPurchased, 9), // Convert to GB
            totalFree: ethers.formatUnits(totalFree, 9), // Convert to GB
            totalUsedBytes: totalUsed.toString(),
            totalPurchasedBytes: totalPurchased.toString()
        };
    }

    // ===== UTILITY FUNCTIONS =====

    async getOwnerByFileHash(fileHash) {
        return await this.blockVault.getOwnerByFileHash(fileHash);
    }

    async signAccessData(accessData) {
        // Ensure the domain has the correct contract address
        this.domain.verifyingContract = await this.blockVault.getAddress();
        
        return await this.wallet.signTypedData(
            this.domain,
            BLOCK_VAULT_TYPES,
            accessData
        );
    }

    async recoverSigner(serializedData, signature) {
        return await this.blockVault.recoverSignerFromBytes(serializedData, signature);
    }

    // ===== HELPER METHODS =====

    formatContentHash(hash) {
        return hash.startsWith('0x') ? hash : `0x${hash}`;
    }

    generateAccessId() {
        return `access-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    calculateExpirationDate(days) {
        return Math.floor(Date.now() / 1000) + (days * 24 * 60 * 60);
    }

    async waitForTransaction(txHash) {
        console.log(`⏳ Waiting for transaction: ${txHash}`);
        const receipt = await this.provider.waitForTransaction(txHash);
        console.log('✅ Transaction confirmed!');
        return receipt;
    }

    async getBalance(address) {
        const balance = await this.provider.getBalance(address || this.wallet.address);
        return ethers.formatEther(balance);
    }
}

module.exports = { BlockVaultAPI, AccessType, FolderType };