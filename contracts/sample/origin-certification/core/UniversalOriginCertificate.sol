// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../../utils/Context.sol";
import "../../../utils/Ownable.sol";
import "../../../libs/ZeroCopySink.sol";
import "../../../libs/ZeroCopySource.sol";
import "../interfaces/IOriginCertificate.sol";
import "../interfaces/ITradeAgreement.sol";
import "./SupplyChainTracker.sol";

/**
 * @title UniversalOriginCertificate
 * @notice Universal system for origin certification that works with any country and trade agreement
 * @dev Flexible architecture supporting multiple trade agreements, countries, and verification methods
 */
contract UniversalOriginCertificate is Context, Ownable {
    using ZeroCopySink for bytes;
    using ZeroCopySource for bytes;

    // Role definitions
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    bytes32 public constant CUSTOMS_ROLE = keccak256("CUSTOMS_ROLE");

    // Certificate status
    enum CertificateStatus {
        Draft,
        PendingApproval,
        Issued,
        Validated,
        InUse,
        Expired,
        Revoked,
        Amended
    }

    // Product information structure
    struct Product {
        string hsCode;              // Harmonized System code (universal)
        string description;         
        uint256 quantity;           
        string unitOfMeasure;       
        string countryOfOrigin;     
        uint256 value;              // In smallest currency unit
        string currency;            // ISO 4217 code
        string manufacturer;        
        string manufacturerCountry; 
        bytes additionalData;       // Flexible field for specific requirements
    }

    // Origin criteria structure (flexible for any agreement)
    struct OriginCriteria {
        string agreementCode;       // e.g., "USMCA", "CPTPP", "RCEP", etc.
        string criteriaType;        // e.g., "WO", "PE", "PSR", "RVC"
        uint256 rvcPercentage;      // Regional Value Content if applicable
        string rvcMethod;           // "Transaction", "NetCost", etc.
        bool cumulationApplied;     
        bool deminimisApplied;      
        string specificRule;        // Product-specific rule if any
        bytes proofDocuments;       // Encoded list of supporting docs
    }

    // Main certificate structure
    struct Certificate {
        bytes32 id;
        uint256 issuanceDate;
        uint256 expiryDate;
        CertificateStatus status;
        
        // Parties involved
        address issuer;
        address exporter;
        string exporterDetails;     // JSON with name, address, tax ID, etc.
        string importerDetails;     
        string producerDetails;     // If different from exporter
        
        // Origin and trade info
        string exportCountry;
        string importCountry;
        string tradeAgreement;      // Flexible: any agreement code
        
        // Products and criteria
        Product[] products;
        OriginCriteria criteria;
        
        // References and validation
        string referenceNumber;     // Human-readable certificate number
        bytes32 invoiceHash;        
        string ipfsHash;            // Additional documents
        
        // Digital signatures
        bytes[] signatures;         // Multiple signatures support
        address[] signers;
        
        // Blockchain tracking
        uint256 lastModified;
        string modificationReason;
    }

    // Storage mappings
    mapping(bytes32 => Certificate) public certificates;
    mapping(address => bytes32[]) public exporterCertificates;
    mapping(address => bytes32[]) public issuerCertificates;
    mapping(string => mapping(string => address[])) public countryIssuers; // country => role => addresses
    mapping(bytes32 => mapping(address => bool)) public certificateAccess;
    
    // Trade agreement registry reference
    address public tradeAgreementRegistry;

    // Supply chain tracker integration
    SupplyChainTracker public supplyChainTracker;
    
    // Events
    event CertificateCreated(bytes32 indexed certificateId, address indexed exporter, string exportCountry);
    event CertificateIssued(bytes32 indexed certificateId, address indexed issuer, string tradeAgreement);
    event CertificateValidated(bytes32 indexed certificateId, address indexed validator, string validatorCountry);
    event CertificateStatusChanged(bytes32 indexed certificateId, CertificateStatus oldStatus, CertificateStatus newStatus);
    event CertificateAmended(bytes32 indexed certificateId, string reason);
    event SignatureAdded(bytes32 indexed certificateId, address indexed signer, string signerRole);

    // Modifiers
    modifier onlyAuthorizedIssuer(string memory country) {
        require(isAuthorizedIssuer(_msgSender(), country), "Not authorized issuer for country");
        _;
    }

    modifier certificateExists(bytes32 certificateId) {
        require(certificates[certificateId].id != 0, "Certificate does not exist");
        _;
    }

    modifier hasAccess(bytes32 certificateId) {
        Certificate storage cert = certificates[certificateId];
        require(
            cert.exporter == _msgSender() || 
            cert.issuer == _msgSender() ||
            certificateAccess[certificateId][_msgSender()] ||
            owner() == _msgSender(),
            "No access to certificate"
        );
        _;
    }

    constructor(address _tradeAgreementRegistry, address _supplyChainTracker) {
        tradeAgreementRegistry = _tradeAgreementRegistry;
        supplyChainTracker = SupplyChainTracker(_supplyChainTracker);
    }

    /**
     * @notice Create a new certificate draft
     * @dev Can be called by registered exporters
     */
    function createCertificate(
        string memory exporterDetails,
        string memory importerDetails,
        string memory producerDetails,
        string memory exportCountry,
        string memory importCountry,
        string memory tradeAgreement,
        Product[] memory products,
        OriginCriteria memory criteria,
        bytes32 invoiceHash,
        string memory referenceNumber
    ) external returns (bytes32) {
        // Generate unique certificate ID
        bytes32 certificateId = keccak256(
            abi.encodePacked(
                _msgSender(),
                block.timestamp,
                invoiceHash,
                referenceNumber
            )
        );

        // Validate trade agreement exists
        require(
            ITradeAgreement(tradeAgreementRegistry).isValidAgreement(tradeAgreement),
            "Invalid trade agreement"
        );

        // Create certificate
        Certificate storage cert = certificates[certificateId];
        cert.id = certificateId;
        cert.issuanceDate = block.timestamp;
        cert.status = CertificateStatus.Draft;
        
        cert.exporter = _msgSender();
        cert.exporterDetails = exporterDetails;
        cert.importerDetails = importerDetails;
        cert.producerDetails = producerDetails;
        
        cert.exportCountry = exportCountry;
        cert.importCountry = importCountry;
        cert.tradeAgreement = tradeAgreement;
        
        cert.criteria = criteria;
        cert.invoiceHash = invoiceHash;
        cert.referenceNumber = referenceNumber;
        cert.lastModified = block.timestamp;

        // Copy products
        for (uint i = 0; i < products.length; i++) {
            cert.products.push(products[i]);
        }

        // Track certificate
        exporterCertificates[_msgSender()].push(certificateId);
        
        emit CertificateCreated(certificateId, _msgSender(), exportCountry);
        
        return certificateId;
    }

    /**
     * @notice Issue a certificate after verification
     * @dev Only authorized issuers can issue certificates
     */
    function issueCertificate(
        bytes32 certificateId,
        uint256 validityPeriod,
        string memory ipfsHash,
        bytes memory signature
    ) external certificateExists(certificateId) {
        Certificate storage cert = certificates[certificateId];
        
        require(cert.status == CertificateStatus.Draft || cert.status == CertificateStatus.PendingApproval, 
                "Invalid certificate status");
        
        require(isAuthorizedIssuer(_msgSender(), cert.exportCountry), 
                "Not authorized issuer for export country");

        // Validate origin criteria with trade agreement rules
        require(
            ITradeAgreement(tradeAgreementRegistry).validateOriginCriteria(
                cert.tradeAgreement,
                cert.exportCountry,
                cert.importCountry,
                abi.encode(cert.criteria)
            ),
            "Origin criteria validation failed"
        );

        // Issue certificate
        cert.issuer = _msgSender();
        cert.expiryDate = block.timestamp + validityPeriod;
        cert.status = CertificateStatus.Issued;
        cert.ipfsHash = ipfsHash;
        cert.lastModified = block.timestamp;

        // Add issuer signature
        cert.signatures.push(signature);
        cert.signers.push(_msgSender());

        issuerCertificates[_msgSender()].push(certificateId);
        
        emit CertificateIssued(certificateId, _msgSender(), cert.tradeAgreement);
        emit SignatureAdded(certificateId, _msgSender(), "ISSUER");

        // Register certificate issuance in supply chain
        if (address(supplyChainTracker) != address(0)) {
            SupplyChainTracker.Location memory location;
            location.country = cert.exportCountry;
            location.locationName = "Certificate Issuer Office";

            supplyChainTracker.addSupplyChainEvent(
                certificateId,
                SupplyChainTracker.EventType.CERTIFICATION_ISSUED,
                location,
                "Certificate Issuer",
                "Origin certificate issued",
                ipfsHash,
                signature,
                ""
            );
        }
    }

    /**
     * @notice Validate certificate at customs or by importer
     */
    function validateCertificate(
        bytes32 certificateId,
        string memory validatorCountry,
        bytes memory signature
    ) external certificateExists(certificateId) hasAccess(certificateId) {
        Certificate storage cert = certificates[certificateId];
        
        require(cert.status == CertificateStatus.Issued, "Certificate not issued");
        require(block.timestamp < cert.expiryDate, "Certificate expired");
        
        cert.status = CertificateStatus.Validated;
        cert.lastModified = block.timestamp;
        
        // Add validator signature
        cert.signatures.push(signature);
        cert.signers.push(_msgSender());
        
        emit CertificateValidated(certificateId, _msgSender(), validatorCountry);
        emit SignatureAdded(certificateId, _msgSender(), "VALIDATOR");
    }

    /**
     * @notice Add digital signature to certificate
     */
    function addSignature(
        bytes32 certificateId,
        bytes memory signature,
        string memory signerRole
    ) external certificateExists(certificateId) hasAccess(certificateId) {
        Certificate storage cert = certificates[certificateId];
        
        cert.signatures.push(signature);
        cert.signers.push(_msgSender());
        
        emit SignatureAdded(certificateId, _msgSender(), signerRole);
    }

    /**
     * @notice Grant access to certificate
     */
    function grantAccess(bytes32 certificateId, address user) 
        external 
        certificateExists(certificateId) 
        hasAccess(certificateId) 
    {
        certificateAccess[certificateId][user] = true;
    }

    /**
     * @notice Register country issuer
     */
    function registerCountryIssuer(
        address issuer,
        string memory country,
        string memory role
    ) external onlyOwner {
        countryIssuers[country][role].push(issuer);
    }

    /**
     * @notice Check if address is authorized issuer
     */
    function isAuthorizedIssuer(address issuer, string memory country) 
        public 
        view 
        returns (bool) 
    {
        address[] memory issuers = countryIssuers[country]["ISSUER"];
        for (uint i = 0; i < issuers.length; i++) {
            if (issuers[i] == issuer) return true;
        }
        return false;
    }

    /**
     * @notice Update supply chain tracker address
     * @param _supplyChainTracker New supply chain tracker address
     */
    function setSupplyChainTracker(address _supplyChainTracker) external onlyOwner {
        supplyChainTracker = SupplyChainTracker(_supplyChainTracker);
    }

    /**
     * @notice Get certificate details
     */
    function getCertificate(bytes32 certificateId) 
        external 
        view 
        certificateExists(certificateId)
        hasAccess(certificateId)
        returns (Certificate memory) 
    {
        return certificates[certificateId];
    }

    /**
     * @notice Get certificate products
     */
    function getCertificateProducts(bytes32 certificateId)
        external
        view
        certificateExists(certificateId)
        hasAccess(certificateId)
        returns (Product[] memory)
    {
        return certificates[certificateId].products;
    }

    /**
     * @notice Verify certificate authenticity
     */
    function verifyCertificate(bytes32 certificateId)
        external
        view
        returns (
            bool isValid,
            CertificateStatus status,
            uint256 expiryDate,
            address issuer
        )
    {
        Certificate storage cert = certificates[certificateId];
        
        isValid = cert.id != 0 && 
                  cert.status == CertificateStatus.Issued || 
                  cert.status == CertificateStatus.Validated;
        status = cert.status;
        expiryDate = cert.expiryDate;
        issuer = cert.issuer;
    }

    /**
     * @notice Amend certificate (for corrections)
     */
    function amendCertificate(
        bytes32 certificateId,
        string memory reason,
        bytes memory amendmentData
    ) external certificateExists(certificateId) hasAccess(certificateId) {
        Certificate storage cert = certificates[certificateId];
        require(cert.issuer == _msgSender(), "Only issuer can amend");
        
        cert.status = CertificateStatus.Amended;
        cert.modificationReason = reason;
        cert.lastModified = block.timestamp;
        
        emit CertificateAmended(certificateId, reason);
    }

    /**
     * @notice Update trade agreement registry
     */
    function updateTradeAgreementRegistry(address newRegistry) external onlyOwner {
        tradeAgreementRegistry = newRegistry;
    }
}