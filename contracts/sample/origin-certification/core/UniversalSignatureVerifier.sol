// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../../utils/Context.sol";

/**
 * @title UniversalSignatureVerifier
 * @notice Universal digital signature verification system supporting multiple countries
 * @dev Verifies signatures from FIEL, PKI, eIDAS, ICP-Brasil, and other standards
 */
contract UniversalSignatureVerifier is Context {
    
    // Signature types by country/standard
    enum SignatureType {
        FIEL,           // Mexico - Firma Electrónica Avanzada
        PKI_X509,       // USA/Canada - Standard PKI
        EIDAS,          // European Union - eIDAS
        ICP_BRASIL,     // Brazil - ICP-Brasil
        FIRMA_DIGITAL,  // Argentina/Chile/Colombia/Peru generic
        JPKI,           // Japan - JPKI
        NPKI,           // Korea - NPKI
        CUSTOM          // Other implementations
    }
    
    // Signature verification result
    struct VerificationResult {
        bool isValid;
        string signerIdentifier;    // RFC, EIN, VAT, etc.
        string signerCountry;
        SignatureType signatureType;
        uint256 timestamp;
        string certificateSerial;
        address ethereumAddress;
    }
    
    // Document signature record
    struct DocumentSignature {
        bytes32 documentHash;
        bytes signature;
        SignatureType signatureType;
        string signerCountry;
        string signerIdentifier;
        string certificateSerial;
        uint256 timestamp;
        address signer;
        bytes metadata;  // Additional data specific to signature type
    }
    
    // Certificate information by type
    struct CertificateInfo {
        SignatureType signatureType;
        string country;
        string identifier;          // RFC, EIN, VAT, etc.
        string certificateSerial;
        uint256 validFrom;
        uint256 validUntil;
        bytes publicKey;            // Public key or certificate data
        bool isActive;
        address registeredAddress;
    }
    
    // Storage
    mapping(bytes32 => DocumentSignature[]) public documentSignatures;
    mapping(address => CertificateInfo) public signerCertificates;
    mapping(string => mapping(string => address)) public identifierToAddress; // country => identifier => address
    mapping(SignatureType => bool) public supportedSignatureTypes;
    
    // Events
    event SignatureRegistered(
        bytes32 indexed documentHash,
        address indexed signer,
        SignatureType signatureType,
        string country
    );
    
    event CertificateRegistered(
        address indexed signer,
        SignatureType signatureType,
        string country,
        string identifier
    );
    
    event SignatureVerified(
        bytes32 indexed documentHash,
        bool isValid,
        SignatureType signatureType
    );
    
    constructor() {
        // Initialize supported signature types
        supportedSignatureTypes[SignatureType.FIEL] = true;
        supportedSignatureTypes[SignatureType.PKI_X509] = true;
        supportedSignatureTypes[SignatureType.EIDAS] = true;
        supportedSignatureTypes[SignatureType.ICP_BRASIL] = true;
        supportedSignatureTypes[SignatureType.FIRMA_DIGITAL] = true;
        supportedSignatureTypes[SignatureType.JPKI] = true;
        supportedSignatureTypes[SignatureType.NPKI] = true;
        supportedSignatureTypes[SignatureType.CUSTOM] = true;
    }
    
    /**
     * @notice Register a digital certificate
     * @param signatureType Type of signature (FIEL, PKI, eIDAS, etc.)
     * @param country Country code (MX, US, EU, BR, etc.)
     * @param identifier Unique identifier (RFC, EIN, VAT, CPF/CNPJ, etc.)
     * @param certificateSerial Certificate serial number
     * @param validUntil Certificate expiration timestamp
     * @param publicKey Public key or certificate data
     */
    function registerCertificate(
        SignatureType signatureType,
        string memory country,
        string memory identifier,
        string memory certificateSerial,
        uint256 validUntil,
        bytes memory publicKey
    ) external {
        require(supportedSignatureTypes[signatureType], "Unsupported signature type");
        require(bytes(country).length > 0, "Country required");
        require(bytes(identifier).length > 0, "Identifier required");
        require(validUntil > block.timestamp, "Certificate must be valid");
        
        CertificateInfo storage cert = signerCertificates[_msgSender()];
        cert.signatureType = signatureType;
        cert.country = country;
        cert.identifier = identifier;
        cert.certificateSerial = certificateSerial;
        cert.validFrom = block.timestamp;
        cert.validUntil = validUntil;
        cert.publicKey = publicKey;
        cert.isActive = true;
        cert.registeredAddress = _msgSender();
        
        // Map identifier to address for lookup
        identifierToAddress[country][identifier] = _msgSender();
        
        emit CertificateRegistered(_msgSender(), signatureType, country, identifier);
    }
    
    /**
     * @notice Sign a document with registered certificate
     * @param documentHash Hash of the document to sign
     * @param signature Digital signature
     * @param metadata Additional metadata (varies by signature type)
     */
    function signDocument(
        bytes32 documentHash,
        bytes memory signature,
        bytes memory metadata
    ) external {
        CertificateInfo memory cert = signerCertificates[_msgSender()];
        require(cert.isActive, "Certificate not active");
        require(cert.validUntil > block.timestamp, "Certificate expired");
        
        DocumentSignature memory docSig = DocumentSignature({
            documentHash: documentHash,
            signature: signature,
            signatureType: cert.signatureType,
            signerCountry: cert.country,
            signerIdentifier: cert.identifier,
            certificateSerial: cert.certificateSerial,
            timestamp: block.timestamp,
            signer: _msgSender(),
            metadata: metadata
        });
        
        documentSignatures[documentHash].push(docSig);
        
        emit SignatureRegistered(
            documentHash,
            _msgSender(),
            cert.signatureType,
            cert.country
        );
    }
    
    /**
     * @notice Verify a document signature
     * @param documentHash Hash of the document
     * @param signatureIndex Index of the signature to verify
     * @return result Verification result with details
     */
    function verifySignature(
        bytes32 documentHash,
        uint256 signatureIndex
    ) external view returns (VerificationResult memory result) {
        require(signatureIndex < documentSignatures[documentHash].length, "Invalid signature index");
        
        DocumentSignature memory docSig = documentSignatures[documentHash][signatureIndex];
        CertificateInfo memory cert = signerCertificates[docSig.signer];
        
        // Basic verification
        result.isValid = cert.isActive && cert.validUntil > block.timestamp;
        result.signerIdentifier = docSig.signerIdentifier;
        result.signerCountry = docSig.signerCountry;
        result.signatureType = docSig.signatureType;
        result.timestamp = docSig.timestamp;
        result.certificateSerial = docSig.certificateSerial;
        result.ethereumAddress = docSig.signer;
        
        // Type-specific verification would be implemented here
        // For now, we trust the signature if the certificate is valid
        
        return result;
    }
    
    /**
     * @notice Verify signatures by type and country
     * @param documentHash Document to verify
     * @param requiredTypes Array of required signature types
     * @param requiredCountries Array of required countries
     * @return hasAll True if all required signatures are present and valid
     */
    function verifyRequiredSignatures(
        bytes32 documentHash,
        SignatureType[] memory requiredTypes,
        string[] memory requiredCountries
    ) external view returns (bool hasAll) {
        DocumentSignature[] memory sigs = documentSignatures[documentHash];
        
        // Check each required type
        for (uint i = 0; i < requiredTypes.length; i++) {
            bool found = false;
            for (uint j = 0; j < sigs.length; j++) {
                if (sigs[j].signatureType == requiredTypes[i]) {
                    CertificateInfo memory cert = signerCertificates[sigs[j].signer];
                    if (cert.isActive && cert.validUntil > block.timestamp) {
                        found = true;
                        break;
                    }
                }
            }
            if (!found) return false;
        }
        
        // Check each required country
        for (uint i = 0; i < requiredCountries.length; i++) {
            bool found = false;
            for (uint j = 0; j < sigs.length; j++) {
                if (keccak256(bytes(sigs[j].signerCountry)) == keccak256(bytes(requiredCountries[i]))) {
                    CertificateInfo memory cert = signerCertificates[sigs[j].signer];
                    if (cert.isActive && cert.validUntil > block.timestamp) {
                        found = true;
                        break;
                    }
                }
            }
            if (!found) return false;
        }
        
        return true;
    }
    
    /**
     * @notice Get all signatures for a document
     * @param documentHash Document hash
     * @return Array of document signatures
     */
    function getDocumentSignatures(
        bytes32 documentHash
    ) external view returns (DocumentSignature[] memory) {
        return documentSignatures[documentHash];
    }
    
    /**
     * @notice Get certificate info by identifier
     * @param country Country code
     * @param identifier Unique identifier (RFC, EIN, etc.)
     * @return Certificate information
     */
    function getCertificateByIdentifier(
        string memory country,
        string memory identifier
    ) external view returns (CertificateInfo memory) {
        address signerAddress = identifierToAddress[country][identifier];
        return signerCertificates[signerAddress];
    }
    
    /**
     * @notice Revoke a certificate
     */
    function revokeCertificate() external {
        CertificateInfo storage cert = signerCertificates[_msgSender()];
        cert.isActive = false;
    }
    
    /**
     * @notice Check if address has valid certificate
     * @param signer Address to check
     * @return isValid True if certificate is valid
     */
    function hasValidCertificate(address signer) external view returns (bool isValid) {
        CertificateInfo memory cert = signerCertificates[signer];
        return cert.isActive && cert.validUntil > block.timestamp;
    }
}