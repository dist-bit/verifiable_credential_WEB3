// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../../utils/Context.sol";

/**
 * @title DigitalSignatureVerifier
 * @notice Universal digital signature verification supporting FIEL, eIDAS, and other e-signature standards
 * @dev Implements multi-country digital signature verification
 */
contract DigitalSignatureVerifier is Context {
    
    struct SignatureStandard {
        string code;              // "FIEL", "eIDAS", "PKI"
        string country;           // ISO country code
        bool isActive;
        address verifierContract; // Optional external verifier
    }
    
    struct SignerProfile {
        address signerAddress;
        string certificateSerial;   // Certificate serial number
        string signatureStandard;   // FIEL, eIDAS, etc.
        string country;
        uint256 validFrom;
        uint256 validUntil;
        bool isRevoked;
        string publicKeyHash;       // Hash of public key for verification
    }
    
    struct DocumentSignature {
        bytes32 documentHash;
        address signer;
        bytes signature;
        uint256 timestamp;
        string signatureType;       // "ECDSA", "RSA", etc.
        string certificateSerial;
        SignatureMetadata metadata;
    }
    
    struct SignatureMetadata {
        string signerRole;          // "EXPORTER", "ISSUER", "CUSTOMS"
        string signerName;
        string signerTaxId;         // RFC, EIN, etc.
        string signatureStandard;   // FIEL, eIDAS
        bytes additionalData;       // Country-specific data
    }
    
    // Storage
    mapping(string => SignatureStandard) public signatureStandards;
    mapping(address => SignerProfile) public signerProfiles;
    mapping(bytes32 => DocumentSignature[]) public documentSignatures;
    mapping(bytes32 => mapping(address => bool)) public hasSigned;

    // Certificate serial to signer address mapping
    mapping(string => address) public certificateToSigner;

    // Country code to verifier contract
    mapping(string => address) public countryVerifiers;

    // Owner for administrative functions
    address public owner;
    
    // EIP-712 Domain
    bytes32 public constant DOMAIN_TYPEHASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );
    
    bytes32 public constant SIGNATURE_TYPEHASH = keccak256(
        "DocumentSignature(bytes32 documentHash,address signer,string signerRole,uint256 timestamp)"
    );
    
    bytes32 public DOMAIN_SEPARATOR;
    
    // Events
    event SignatureAdded(
        bytes32 indexed documentHash,
        address indexed signer,
        string signatureStandard,
        string signerRole
    );
    
    event SignerRegistered(
        address indexed signer,
        string certificateSerial,
        string signatureStandard,
        string country
    );
    
    event SignatureStandardAdded(string code, string country);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                DOMAIN_TYPEHASH,
                keccak256("OriginCertificateVerifier"),
                keccak256("1"),
                block.chainid,
                address(this)
            )
        );

        _initializeStandards();
    }
    
    /**
     * @notice Initialize common signature standards
     */
    function _initializeStandards() private {
        // Mexico - FIEL
        signatureStandards["FIEL"] = SignatureStandard({
            code: "FIEL",
            country: "MX",
            isActive: true,
            verifierContract: address(0)
        });
        
        // USA - Generic PKI
        signatureStandards["US-PKI"] = SignatureStandard({
            code: "US-PKI",
            country: "US",
            isActive: true,
            verifierContract: address(0)
        });
        
        // El Salvador - Firma Electrónica
        signatureStandards["SV-FE"] = SignatureStandard({
            code: "SV-FE",
            country: "SV",
            isActive: true,
            verifierContract: address(0)
        });
        
        // EU - eIDAS
        signatureStandards["eIDAS"] = SignatureStandard({
            code: "eIDAS",
            country: "EU",
            isActive: true,
            verifierContract: address(0)
        });
    }
    
    /**
     * @notice Register a signer with their digital certificate info
     */
    function registerSigner(
        address signerAddress,
        string memory certificateSerial,
        string memory signatureStandard,
        string memory country,
        uint256 validUntil,
        string memory publicKeyHash
    ) external {
        require(signatureStandards[signatureStandard].isActive, "Invalid signature standard");
        
        SignerProfile storage profile = signerProfiles[signerAddress];
        profile.signerAddress = signerAddress;
        profile.certificateSerial = certificateSerial;
        profile.signatureStandard = signatureStandard;
        profile.country = country;
        profile.validFrom = block.timestamp;
        profile.validUntil = validUntil;
        profile.isRevoked = false;
        profile.publicKeyHash = publicKeyHash;
        
        certificateToSigner[certificateSerial] = signerAddress;
        
        emit SignerRegistered(signerAddress, certificateSerial, signatureStandard, country);
    }
    
    /**
     * @notice Sign a document with metadata
     */
    function signDocument(
        bytes32 documentHash,
        bytes memory signature,
        SignatureMetadata memory metadata
    ) external {
        require(!hasSigned[documentHash][_msgSender()], "Already signed");
        require(signerProfiles[_msgSender()].validUntil > block.timestamp, "Signer certificate expired");
        require(!signerProfiles[_msgSender()].isRevoked, "Signer certificate revoked");
        
        DocumentSignature memory docSig = DocumentSignature({
            documentHash: documentHash,
            signer: _msgSender(),
            signature: signature,
            timestamp: block.timestamp,
            signatureType: "ECDSA",
            certificateSerial: signerProfiles[_msgSender()].certificateSerial,
            metadata: metadata
        });
        
        documentSignatures[documentHash].push(docSig);
        hasSigned[documentHash][_msgSender()] = true;
        
        emit SignatureAdded(
            documentHash,
            _msgSender(),
            metadata.signatureStandard,
            metadata.signerRole
        );
    }
    
    /**
     * @notice Set country-specific verifier contract
     * @param countryCode ISO country code
     * @param verifierAddress Address of the verifier contract
     */
    function setCountryVerifier(string memory countryCode, address verifierAddress) external onlyOwner {
        countryVerifiers[countryCode] = verifierAddress;
    }

    /**
     * @notice Verify a signature
     */
    function verifySignature(
        bytes32 documentHash,
        address signer,
        bytes memory signature
    ) public view returns (bool) {
        // Build EIP-712 struct hash
        bytes32 structHash = keccak256(
            abi.encode(
                SIGNATURE_TYPEHASH,
                documentHash,
                signer,
                keccak256(bytes(signerProfiles[signer].certificateSerial)),
                block.timestamp
            )
        );
        
        // Build typed data hash
        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash)
        );
        
        // Recover signer
        address recoveredSigner = recoverSigner(digest, signature);
        
        return recoveredSigner == signer && hasSigned[documentHash][signer];
    }
    
    /**
     * @notice Verify FIEL signature (Mexico)
     * @dev In production, this would integrate with SAT's verification service
     */
    function verifyFIELSignature(
        bytes32 documentHash,
        string memory certificateSerial,
        bytes memory signature,
        bytes memory fielCertificate
    ) external view returns (bool isValid, string memory signerRFC) {
        address signer = certificateToSigner[certificateSerial];
        require(signer != address(0), "Certificate not registered");
        
        SignerProfile memory profile = signerProfiles[signer];
        require(
            keccak256(bytes(profile.signatureStandard)) == keccak256(bytes("FIEL")),
            "Not a FIEL certificate"
        );
        
        // Verify certificate validity
        if (profile.validUntil < block.timestamp || profile.isRevoked) {
            return (false, "");
        }
        
        // In production: Call SAT API to verify FIEL
        // For now, verify using standard ECDSA
        isValid = verifySignature(documentHash, signer, signature);
        
        // Extract RFC from metadata (would be parsed from FIEL certificate)
        DocumentSignature[] memory sigs = documentSignatures[documentHash];
        for (uint i = 0; i < sigs.length; i++) {
            if (sigs[i].signer == signer) {
                signerRFC = sigs[i].metadata.signerTaxId;
                break;
            }
        }
    }
    
    /**
     * @notice Get all signatures for a document
     */
    function getDocumentSignatures(bytes32 documentHash)
        external
        view
        returns (DocumentSignature[] memory)
    {
        return documentSignatures[documentHash];
    }
    
    /**
     * @notice Verify multi-signature requirement
     */
    function verifyMultiSignature(
        bytes32 documentHash,
        string[] memory requiredRoles
    ) external view returns (bool) {
        DocumentSignature[] memory sigs = documentSignatures[documentHash];
        
        for (uint i = 0; i < requiredRoles.length; i++) {
            bool roleFound = false;
            
            for (uint j = 0; j < sigs.length; j++) {
                if (keccak256(bytes(sigs[j].metadata.signerRole)) == 
                    keccak256(bytes(requiredRoles[i]))) {
                    // Verify signature is valid
                    if (signerProfiles[sigs[j].signer].validUntil > block.timestamp &&
                        !signerProfiles[sigs[j].signer].isRevoked) {
                        roleFound = true;
                        break;
                    }
                }
            }
            
            if (!roleFound) return false;
        }
        
        return true;
    }
    
    /**
     * @notice Revoke a signer's certificate
     */
    function revokeSigner(address signer) external {
        // In production: Only authorized entities can revoke
        signerProfiles[signer].isRevoked = true;
    }
    
    /**
     * @notice Add a new signature standard
     */
    function addSignatureStandard(
        string memory code,
        string memory country,
        address verifierContract
    ) external {
        signatureStandards[code] = SignatureStandard({
            code: code,
            country: country,
            isActive: true,
            verifierContract: verifierContract
        });
        
        emit SignatureStandardAdded(code, country);
    }
    
    /**
     * @notice Recover signer from signature
     */
    function recoverSigner(bytes32 digest, bytes memory signature)
        internal
        pure
        returns (address)
    {
        require(signature.length == 65, "Invalid signature length");
        
        bytes32 r;
        bytes32 s;
        uint8 v;
        
        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }
        
        if (v < 27) {
            v += 27;
        }
        
        require(v == 27 || v == 28, "Invalid signature v value");
        
        return ecrecover(digest, v, r, s);
    }
    
    /**
     * @notice Build typed data hash for external signing
     */
    function buildTypedDataHash(
        bytes32 documentHash,
        address signer,
        string memory signerRole,
        uint256 timestamp
    ) external view returns (bytes32) {
        bytes32 structHash = keccak256(
            abi.encode(
                SIGNATURE_TYPEHASH,
                documentHash,
                signer,
                keccak256(bytes(signerRole)),
                timestamp
            )
        );
        
        return keccak256(
            abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash)
        );
    }
}