// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../libs/ZeroCopySink.sol";
import "../libs/ZeroCopySource.sol";
import "../EIP/IEIP712.sol";
import "../utils/Ownable.sol";

contract _IntellectualProperty is IEIP721, IEIP721Metadata {
    // Credential issuer
    string private _issuer;

    // Credential context
    string[] private _context;

    // Credential identifier
    string private _id;

    // Credential type
    string[] private _type;

    // Credential verification method
    string _verificationMethod;

    // Credential type
    Schema private _schema;

    EIP712Domain private _domain;

    // Credential logo
    string private _logo;

    // IP Types
    enum IPType {
        Patent,
        Trademark,
        Copyright,
        TradeSecret,
        IndustrialDesign
    }

    // IP Status
    enum IPStatus {
        Active,
        Expired,
        Transferred,
        Revoked,
        Pending
    }

    // Transfer request structure
    struct TransferRequest {
        address from;
        address to;
        uint256 requestDate;
        bool approved;
        string reason;
    }

    // Intellectual Property structure
    struct IntellectualProperty {
        string id;                      // Unique identifier
        string title;                   // Title of the IP
        string description;             // Detailed description
        IPType ipType;                  // Type of intellectual property
        address owner;                  // Current owner
        address[] previousOwners;       // History of owners
        string country;                 // Country of registration
        uint256 registrationDate;       // Date of registration
        uint256 expirationDate;         // Expiration date
        IPStatus status;                // Current status
        string registrationNumber;      // Official registration number
        string[] categories;            // Categories or classes
        string certifyingEntity;        // Certifying entity (IPPBlock)
        TransferRequest transferRequest; // Pending transfer request
        string documentHash;            // Hash of the IP document
    }

    // EIP Domain
    bytes32 constant EIP712DOMAIN_TYPEHASH =
        keccak256(
            "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
        );

    bytes32 constant TRANSFER_REQUEST_TYPEHASH =
        keccak256(
            "TransferRequest(address from,address to,uint256 requestDate,bool approved,string reason)"
        );

    bytes32 constant IP_TYPEHASH =
        keccak256(
            "IntellectualProperty(string id,string title,string description,uint8 ipType,address owner,address[] previousOwners,string country,uint256 registrationDate,uint256 expirationDate,uint8 status,string registrationNumber,string[] categories,string certifyingEntity,TransferRequest transferRequest,string documentHash)TransferRequest(address from,address to,uint256 requestDate,bool approved,string reason)"
        );

    bytes32 DOMAIN_SEPARATOR;

    constructor(
        string memory issuer_,
        string[] memory context_,
        string memory id_,
        string[] memory type_,
        string memory verificationMethod_,
        Schema memory schema_,
        address verifyingContract_,
        string memory name_,
        string memory version_,
        uint256 chain_,
        string memory logo_
    ) {
        _issuer = issuer_;
        _context = context_;
        _id = id_;
        _type = type_;
        _verificationMethod = verificationMethod_;
        _schema = schema_;
        _logo = logo_;

        _domain = EIP712Domain({
            name: name_,
            version: version_,
            chainId: chain_,
            verifyingContract: verifyingContract_
        });

        DOMAIN_SEPARATOR = hash(_domain);
    }

    /**
     * @dev See {IEIP721Metadata-issuer}.
     */
    function issuer() public view virtual override returns (string memory) {
        return _issuer;
    }

    /**
     * @dev See {IEIP721Metadata-context}.
     */
    function context() public view virtual override returns (string[] memory) {
        return _context;
    }

    /**
     * @dev See {IEIP721Metadata-id}.
     */
    function id() public view virtual override returns (string memory) {
        return _id;
    }

    /**
     * @dev See {IEIP721Metadata-schema}.
     */
    function schema() public view virtual override returns (Schema memory) {
        return _schema;
    }

    /**
     * @dev See {IEIP721Metadata-verificationMethod}.
     */
    function verificationMethod()
        public
        view
        virtual
        override
        returns (string memory)
    {
        return _verificationMethod;
    }

    function domain()
        public
        view
        virtual
        override
        returns (EIP712Domain memory)
    {
        return _domain;
    }

    /**
     * @dev See {IEIP721Metadata-type}.
     */
    function typeCredential()
        public
        view
        virtual
        override
        returns (string[] memory)
    {
        return _type;
    }

    /**
     * @dev optional logo.
     */
    function logo() public view virtual returns (string memory) {
        return _logo;
    }

    function hash(
        EIP712Domain memory eip712Domain
    ) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    EIP712DOMAIN_TYPEHASH,
                    keccak256(bytes(eip712Domain.name)),
                    keccak256(bytes(eip712Domain.version)),
                    eip712Domain.chainId,
                    eip712Domain.verifyingContract
                )
            );
    }

    function hash(string[] memory items) internal pure returns (bytes32) {
        bytes32[] memory _array = new bytes32[](items.length);
        for (uint256 i = 0; i < items.length; ++i) {
            _array[i] = keccak256(bytes(items[i]));
        }
        return keccak256(abi.encodePacked(_array));
    }

    function hash(address[] memory items) internal pure returns (bytes32) {
        bytes32[] memory _array = new bytes32[](items.length);
        for (uint256 i = 0; i < items.length; ++i) {
            _array[i] = keccak256(abi.encodePacked(items[i]));
        }
        return keccak256(abi.encodePacked(_array));
    }

    function hash(TransferRequest memory transfer) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    TRANSFER_REQUEST_TYPEHASH,
                    transfer.from,
                    transfer.to,
                    transfer.requestDate,
                    transfer.approved,
                    keccak256(bytes(transfer.reason))
                )
            );
    }

    function hash(IntellectualProperty memory ip) internal pure returns (bytes32) {
        // Dividir en partes para evitar stack too deep
        bytes memory part1 = abi.encode(
            IP_TYPEHASH,
            keccak256(bytes(ip.id)),
            keccak256(bytes(ip.title)),
            keccak256(bytes(ip.description)),
            ip.ipType,
            ip.owner
        );
        
        bytes memory part2 = abi.encode(
            hash(ip.previousOwners),
            keccak256(bytes(ip.country)),
            ip.registrationDate,
            ip.expirationDate,
            ip.status
        );
        
        bytes memory part3 = abi.encode(
            keccak256(bytes(ip.registrationNumber)),
            hash(ip.categories),
            keccak256(bytes(ip.certifyingEntity)),
            hash(ip.transferRequest),
            keccak256(bytes(ip.documentHash))
        );
        
        // Combinar todas las partes en un solo hash
        return keccak256(abi.encodePacked(part1, part2, part3));
    }

    function verify(
        IntellectualProperty memory ip,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) internal view returns (address) {
        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, hash(ip))
        );
        return ecrecover(digest, v, r, s);
    }

    // Signature methods
    function splitSignature(
        bytes memory sig
    ) internal pure returns (uint8, bytes32, bytes32) {
        require(sig.length == 65);

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            // first 32 bytes, after the length prefix
            r := mload(add(sig, 32))
            // second 32 bytes
            s := mload(add(sig, 64))
            // final byte (first byte of the next 32 bytes)
            v := byte(0, mload(add(sig, 96)))
        }

        return (v, r, s);
    }

    function splitSignatureFromBytes(
        bytes memory signature_
    ) public pure override returns (uint8, bytes32, bytes32) {
        return splitSignature(signature_);
    }

    function recoverSignerFromBytes(
        bytes memory data_,
        bytes memory signature_
    ) public view override returns (address) {
        uint8 v;
        bytes32 r;
        bytes32 s;

        (v, r, s) = splitSignature(signature_);
        IntellectualProperty memory ip = deserializeIP(data_);
        return verify(ip, v, r, s);
    }

    function recoverSigner(
        IntellectualProperty memory _ip,
        bytes memory _signature
    ) public view returns (address) {
        uint8 v;
        bytes32 r;
        bytes32 s;

        (v, r, s) = splitSignature(_signature);
        return verify(_ip, v, r, s);
    }

    // Serialization functions
    function serializeTransferRequest(
        TransferRequest memory transfer
    ) internal pure returns (bytes memory) {
        bytes memory fromBytes = ZeroCopySink.WriteVarBytes(
            abi.encodePacked(transfer.from)
        );
        bytes memory toBytes = ZeroCopySink.WriteVarBytes(
            abi.encodePacked(transfer.to)
        );
        bytes memory requestDateBytes = ZeroCopySink.WriteUint255(
            transfer.requestDate
        );
        bytes memory approvedBytes = ZeroCopySink.WriteBool(transfer.approved);
        bytes memory reasonBytes = ZeroCopySink.WriteVarBytes(
            bytes(transfer.reason)
        );

        return
            abi.encodePacked(
                fromBytes,
                toBytes,
                requestDateBytes,
                approvedBytes,
                reasonBytes
            );
    }

    function deserializeTransferRequest(
        bytes memory data,
        uint256 offset
    ) internal pure returns (TransferRequest memory transfer, uint256 newOffset) {
        // Extract addresses
        (transfer.from, transfer.to, offset) = _deserializeAddresses(data, offset);
        
        // Extract remaining fields
        (transfer.requestDate, offset) = ZeroCopySource.NextUint255(data, offset);
        (transfer.approved, offset) = ZeroCopySource.NextBool(data, offset);
        
        bytes memory reasonData;
        (reasonData, offset) = ZeroCopySource.NextVarBytes(data, offset);
        transfer.reason = string(reasonData);
        
        return (transfer, offset);
    }
    
    function _deserializeAddresses(
        bytes memory data,
        uint256 offset
    ) private pure returns (address from, address to, uint256 newOffset) {
        bytes memory fromData;
        (fromData, offset) = ZeroCopySource.NextVarBytes(data, offset);
        assembly {
            from := mload(add(fromData, 0x14))
        }

        bytes memory toData;
        (toData, offset) = ZeroCopySource.NextVarBytes(data, offset);
        assembly {
            to := mload(add(toData, 0x14))
        }
        
        return (from, to, offset);
    }

    function serializeAddressArray(
        address[] memory addresses
    ) internal pure returns (bytes memory) {
        bytes memory lenBytes = ZeroCopySink.WriteUint255(addresses.length);
        bytes memory addressesBytes = new bytes(0);
        
        for (uint256 i = 0; i < addresses.length; i++) {
            addressesBytes = abi.encodePacked(
                addressesBytes,
                ZeroCopySink.WriteVarBytes(abi.encodePacked(addresses[i]))
            );
        }
        
        return abi.encodePacked(lenBytes, addressesBytes);
    }

    function deserializeAddressArray(
        bytes memory data,
        uint256 offset
    ) internal pure returns (address[] memory, uint256) {
        uint256 len;
        (len, offset) = ZeroCopySource.NextUint255(data, offset);
        
        address[] memory addresses = new address[](len);
        for (uint256 i = 0; i < len; i++) {
            bytes memory addrData;
            (addrData, offset) = ZeroCopySource.NextVarBytes(data, offset);
            
            address addr;
            assembly {
                addr := mload(add(addrData, 0x14))
            }
            addresses[i] = addr;
        }
        
        return (addresses, offset);
    }

    function serializeStringArray(
        string[] memory strings
    ) internal pure returns (bytes memory) {
        bytes memory lenBytes = ZeroCopySink.WriteUint255(strings.length);
        bytes memory stringsBytes = new bytes(0);
        
        for (uint256 i = 0; i < strings.length; i++) {
            stringsBytes = abi.encodePacked(
                stringsBytes,
                ZeroCopySink.WriteVarBytes(bytes(strings[i]))
            );
        }
        
        return abi.encodePacked(lenBytes, stringsBytes);
    }

    function deserializeStringArray(
        bytes memory data,
        uint256 offset
    ) internal pure returns (string[] memory, uint256) {
        uint256 len;
        (len, offset) = ZeroCopySource.NextUint255(data, offset);
        
        string[] memory strings = new string[](len);
        for (uint256 i = 0; i < len; i++) {
            bytes memory strData;
            (strData, offset) = ZeroCopySource.NextVarBytes(data, offset);
            strings[i] = string(strData);
        }
        
        return (strings, offset);
    }

    function serializeIP(
        IntellectualProperty memory ip
    ) public pure returns (bytes memory) {
        bytes memory part1 = abi.encodePacked(
            ZeroCopySink.WriteVarBytes(bytes(ip.id)),
            ZeroCopySink.WriteVarBytes(bytes(ip.title)),
            ZeroCopySink.WriteVarBytes(bytes(ip.description)),
            ZeroCopySink.WriteUint8(uint8(ip.ipType)),
            ZeroCopySink.WriteVarBytes(abi.encodePacked(ip.owner))
        );

        bytes memory part2 = abi.encodePacked(
            serializeAddressArray(ip.previousOwners),
            ZeroCopySink.WriteVarBytes(bytes(ip.country)),
            ZeroCopySink.WriteUint255(ip.registrationDate),
            ZeroCopySink.WriteUint255(ip.expirationDate),
            ZeroCopySink.WriteUint8(uint8(ip.status))
        );

        bytes memory part3 = abi.encodePacked(
            ZeroCopySink.WriteVarBytes(bytes(ip.registrationNumber)),
            serializeStringArray(ip.categories),
            ZeroCopySink.WriteVarBytes(bytes(ip.certifyingEntity)),
            serializeTransferRequest(ip.transferRequest),
            ZeroCopySink.WriteVarBytes(bytes(ip.documentHash))
        );

        return abi.encodePacked(part1, part2, part3);
    }

    function deserializeIP(
        bytes memory data
    ) public pure returns (IntellectualProperty memory ip) {
        uint256 offset = 0;
        
        // Deserialize basic fields
        (ip.id, ip.title, ip.description, offset) = _deserializeBasicFields(data, offset);
        
        // Deserialize type and ownership
        uint8 ipType;
        (ipType, ip.owner, ip.previousOwners, offset) = _deserializeOwnership(data, offset);
        ip.ipType = IPType(ipType);
        
        // Deserialize dates and status
        uint8 status;
        (ip.country, ip.registrationDate, ip.expirationDate, status, offset) = _deserializeDatesStatus(data, offset);
        ip.status = IPStatus(status);
        
        // Deserialize remaining fields
        (ip.registrationNumber, ip.categories, ip.certifyingEntity, ip.transferRequest, ip.documentHash, offset) = _deserializeRemainingFields(data, offset);
        
        return ip;
    }
    
    function _deserializeBasicFields(
        bytes memory data,
        uint256 offset
    ) private pure returns (string memory id, string memory title, string memory description, uint256 newOffset) {
        bytes memory idData;
        (idData, offset) = ZeroCopySource.NextVarBytes(data, offset);
        id = string(idData);
        
        bytes memory titleData;
        (titleData, offset) = ZeroCopySource.NextVarBytes(data, offset);
        title = string(titleData);
        
        bytes memory descriptionData;
        (descriptionData, offset) = ZeroCopySource.NextVarBytes(data, offset);
        description = string(descriptionData);
        
        return (id, title, description, offset);
    }
    
    function _deserializeOwnership(
        bytes memory data,
        uint256 offset
    ) private pure returns (uint8 ipType, address owner, address[] memory previousOwners, uint256 newOffset) {
        (ipType, offset) = ZeroCopySource.NextUint8(data, offset);
        
        bytes memory ownerData;
        (ownerData, offset) = ZeroCopySource.NextVarBytes(data, offset);
        assembly {
            owner := mload(add(ownerData, 0x14))
        }
        
        (previousOwners, offset) = deserializeAddressArray(data, offset);
        
        return (ipType, owner, previousOwners, offset);
    }
    
    function _deserializeDatesStatus(
        bytes memory data,
        uint256 offset
    ) private pure returns (string memory country, uint256 registrationDate, uint256 expirationDate, uint8 status, uint256 newOffset) {
        bytes memory countryData;
        (countryData, offset) = ZeroCopySource.NextVarBytes(data, offset);
        country = string(countryData);
        
        (registrationDate, offset) = ZeroCopySource.NextUint255(data, offset);
        (expirationDate, offset) = ZeroCopySource.NextUint255(data, offset);
        (status, offset) = ZeroCopySource.NextUint8(data, offset);
        
        return (country, registrationDate, expirationDate, status, offset);
    }
    
    function _deserializeRemainingFields(
        bytes memory data,
        uint256 offset
    ) private pure returns (
        string memory registrationNumber,
        string[] memory categories,
        string memory certifyingEntity,
        TransferRequest memory transferRequest,
        string memory documentHash,
        uint256 newOffset
    ) {
        // Split into two parts to reduce stack depth
        (registrationNumber, categories, certifyingEntity, offset) = _deserializeRegAndCategories(data, offset);
        (transferRequest, documentHash, offset) = _deserializeTransferAndHash(data, offset);
        
        return (registrationNumber, categories, certifyingEntity, transferRequest, documentHash, offset);
    }
    
    function _deserializeRegAndCategories(
        bytes memory data,
        uint256 offset
    ) private pure returns (
        string memory registrationNumber,
        string[] memory categories,
        string memory certifyingEntity,
        uint256 newOffset
    ) {
        bytes memory registrationNumberData;
        (registrationNumberData, offset) = ZeroCopySource.NextVarBytes(data, offset);
        registrationNumber = string(registrationNumberData);
        
        (categories, offset) = deserializeStringArray(data, offset);
        
        bytes memory certifyingEntityData;
        (certifyingEntityData, offset) = ZeroCopySource.NextVarBytes(data, offset);
        certifyingEntity = string(certifyingEntityData);
        
        return (registrationNumber, categories, certifyingEntity, offset);
    }
    
    function _deserializeTransferAndHash(
        bytes memory data,
        uint256 offset
    ) private pure returns (
        TransferRequest memory transferRequest,
        string memory documentHash,
        uint256 newOffset
    ) {
        (transferRequest, offset) = deserializeTransferRequest(data, offset);
        
        bytes memory documentHashData;
        (documentHashData, offset) = ZeroCopySource.NextVarBytes(data, offset);
        documentHash = string(documentHashData);
        
        return (transferRequest, documentHash, offset);
    }
}

contract IPPBlockVC is _IntellectualProperty, Ownable {
    // Mapping to track IP ownership transfers
    mapping(string => bool) public pendingTransfers;
    
    // Events
    event TransferRequested(string indexed ipId, address from, address to);
    event TransferApproved(string indexed ipId, address from, address to);
    event TransferRejected(string indexed ipId, address from, address to);

    constructor(
        string memory issuer_,
        string[] memory context_,
        string memory id_,
        string[] memory type_,
        string memory verificationMethod_,
        Schema memory schema_,
        string memory logo_
    )
        _IntellectualProperty(
            issuer_,
            context_,
            id_,
            type_,
            verificationMethod_,
            schema_,
            0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC, // contract verifier (standard placeholder)
            "IPPBlock Intellectual Property", // name credential
            "1", // version
            1, // chain id (hardcoded like NebuIA)
            logo_
        )
    {}

    function viewVersion() public view onlyOwner returns (string memory) {
        return "IPPBlock-IP-v1";
    }

    /**
     * @dev Request a transfer of intellectual property ownership
     */
    function requestTransfer(
        string memory ipId,
        address from,
        address to,
        string memory reason
    ) public {
        require(msg.sender == from, "Only current owner can request transfer");
        require(to != address(0), "Invalid recipient address");
        require(!pendingTransfers[ipId], "Transfer already pending");
        
        pendingTransfers[ipId] = true;
        emit TransferRequested(ipId, from, to);
    }

    /**
     * @dev Approve a pending transfer (only IPPBlock can approve)
     */
    function approveTransfer(string memory ipId) public onlyOwner {
        require(pendingTransfers[ipId], "No pending transfer");
        
        pendingTransfers[ipId] = false;
        emit TransferApproved(ipId, address(0), address(0)); // Actual addresses would come from the IP data
    }

    /**
     * @dev Reject a pending transfer
     */
    function rejectTransfer(string memory ipId) public onlyOwner {
        require(pendingTransfers[ipId], "No pending transfer");
        
        pendingTransfers[ipId] = false;
        emit TransferRejected(ipId, address(0), address(0));
    }

    /**
     * @dev Check if IP is expired
     */
    function isExpired(IntellectualProperty memory ip) public view returns (bool) {
        return ip.expirationDate < block.timestamp;
    }

    /**
     * @dev Get remaining validity time
     */
    function getRemainingValidity(IntellectualProperty memory ip) public view returns (uint256) {
        if (ip.expirationDate <= block.timestamp) {
            return 0;
        }
        return ip.expirationDate - block.timestamp;
    }
}