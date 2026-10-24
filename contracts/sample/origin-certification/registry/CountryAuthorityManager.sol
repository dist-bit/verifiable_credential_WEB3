// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../../utils/Ownable.sol";

/**
 * @title CountryAuthorityManager
 * @notice Manages authorized entities for each country
 * @dev Supports multiple authority types per country
 */
contract CountryAuthorityManager is Ownable {
    
    enum AuthorityType {
        CHAMBER_OF_COMMERCE,    // Chambers of Commerce
        CUSTOMS,                // Customs authorities
        GOVERNMENT_AGENCY,      // Government trade agencies
        DESIGNATED_CERTIFIER,   // Designated private certifiers
        PORT_AUTHORITY,         // Port authorities
        NOTARY                  // Notaries (for some countries)
    }
    
    struct Authority {
        address authorityAddress;
        string name;
        string identifier;          // Tax ID, registration number, etc.
        AuthorityType authorityType;
        string country;             // ISO 3166-1 alpha-2
        string region;              // State/Province if applicable
        bool isActive;
        uint256 registrationDate;
        uint256 validUntil;
        string contactInfo;         // JSON with email, phone, address
        string[] certificationTypes; // Types of certificates they can issue
        string apiEndpoint;         // For system integration
        string publicKey;           // For off-chain verification
    }
    
    struct CountryConfig {
        string countryCode;
        string countryName;
        bool requiresGovernmentIssuer;  // Some countries require government issuance
        bool allowsChamberIssuance;     // Can chambers issue certificates
        bool allowsSelfCertification;   // For trusted trader programs
        uint256 defaultValidityPeriod;
        string[] acceptedLanguages;     // Languages for certificates
        string digitalSignatureStandard; // FIEL, eIDAS, etc.
    }
    
    // Storage
    mapping(address => Authority) public authorities;
    mapping(string => CountryConfig) public countryConfigs;
    mapping(string => mapping(AuthorityType => address[])) public countryAuthorities;
    mapping(string => bool) public registeredCountries;
    
    // Special programs (like trusted trader)
    mapping(address => mapping(string => bool)) public trustedTraders; // address => program => status
    
    string[] public allCountries;
    
    // Events
    event AuthorityRegistered(
        address indexed authority,
        string country,
        AuthorityType authorityType,
        string name
    );
    
    event AuthorityDeactivated(address indexed authority, string reason);
    event CountryConfigured(string indexed country, bool requiresGov, bool allowsChamber);
    event TrustedTraderAdded(address indexed trader, string program, string country);
    
    constructor() {
        _initializeCountries();
    }
    
    /**
     * @notice Initialize with common country configurations
     */
    function _initializeCountries() private {
        // Mexico
        _configureCountry(
            "MX",
            "Mexico",
            false,  // Government not required
            true,   // Chambers can issue
            false,  // No self-certification
            4 * 365 days, // 4 years default
            "es,en",
            "FIEL"
        );
        
        // United States
        _configureCountry(
            "US",
            "United States",
            false,
            true,
            true,   // Allows self-certification for some programs
            4 * 365 days,
            "en",
            "US-PKI"
        );
        
        // El Salvador
        _configureCountry(
            "SV",
            "El Salvador",
            false,
            true,
            false,
            1 * 365 days,
            "es",
            "SV-FE"
        );
        
        // Canada
        _configureCountry(
            "CA",
            "Canada",
            false,
            true,
            true,
            4 * 365 days,
            "en,fr",
            "CA-PKI"
        );
        
        // European Union (as example)
        _configureCountry(
            "EU",
            "European Union",
            false,
            true,
            true,
            1 * 365 days,
            "en,de,fr,es,it",
            "eIDAS"
        );
    }
    
    /**
     * @notice Configure a country's requirements
     */
    function _configureCountry(
        string memory countryCode,
        string memory countryName,
        bool requiresGov,
        bool allowsChamber,
        bool allowsSelf,
        uint256 validityPeriod,
        string memory languages,
        string memory digiSignStandard
    ) private {
        CountryConfig storage config = countryConfigs[countryCode];
        config.countryCode = countryCode;
        config.countryName = countryName;
        config.requiresGovernmentIssuer = requiresGov;
        config.allowsChamberIssuance = allowsChamber;
        config.allowsSelfCertification = allowsSelf;
        config.defaultValidityPeriod = validityPeriod;
        config.digitalSignatureStandard = digiSignStandard;
        
        // Parse languages (simplified - in production would be more robust)
        config.acceptedLanguages.push(languages);
        
        registeredCountries[countryCode] = true;
        allCountries.push(countryCode);
        
        emit CountryConfigured(countryCode, requiresGov, allowsChamber);
    }
    
    /**
     * @notice Register a new authority
     */
    function registerAuthority(
        address authorityAddress,
        string memory name,
        string memory identifier,
        AuthorityType authorityType,
        string memory country,
        string memory region,
        uint256 validUntil,
        string memory contactInfo,
        string[] memory certificationTypes,
        string memory apiEndpoint,
        string memory publicKey
    ) external onlyOwner {
        require(registeredCountries[country], "Country not configured");
        require(authorities[authorityAddress].registrationDate == 0, "Authority already registered");
        
        // Validate authority type for country
        CountryConfig memory config = countryConfigs[country];
        if (authorityType == AuthorityType.CHAMBER_OF_COMMERCE) {
            require(config.allowsChamberIssuance, "Country doesn't allow chamber issuance");
        }
        
        Authority storage auth = authorities[authorityAddress];
        auth.authorityAddress = authorityAddress;
        auth.name = name;
        auth.identifier = identifier;
        auth.authorityType = authorityType;
        auth.country = country;
        auth.region = region;
        auth.isActive = true;
        auth.registrationDate = block.timestamp;
        auth.validUntil = validUntil;
        auth.contactInfo = contactInfo;
        auth.certificationTypes = certificationTypes;
        auth.apiEndpoint = apiEndpoint;
        auth.publicKey = publicKey;
        
        countryAuthorities[country][authorityType].push(authorityAddress);
        
        emit AuthorityRegistered(authorityAddress, country, authorityType, name);
    }
    
    /**
     * @notice Check if an address can issue certificates for a country
     */
    function canIssueCertificate(
        address issuer,
        string memory country,
        string memory certificateType
    ) external view returns (bool) {
        Authority memory auth = authorities[issuer];
        
        // Check basic requirements
        if (!auth.isActive || auth.validUntil < block.timestamp) return false;
        if (keccak256(bytes(auth.country)) != keccak256(bytes(country))) return false;
        
        // Check certificate type authorization
        bool hasType = false;
        for (uint i = 0; i < auth.certificationTypes.length; i++) {
            if (keccak256(bytes(auth.certificationTypes[i])) == keccak256(bytes(certificateType))) {
                hasType = true;
                break;
            }
        }
        if (!hasType) return false;
        
        // Check country-specific rules
        CountryConfig memory config = countryConfigs[country];
        if (config.requiresGovernmentIssuer && auth.authorityType != AuthorityType.GOVERNMENT_AGENCY) {
            return false;
        }
        
        // Check trusted trader programs
        if (config.allowsSelfCertification && trustedTraders[issuer][country]) {
            return true;
        }
        
        return true;
    }
    
    /**
     * @notice Get all authorities for a country and type
     */
    function getCountryAuthorities(
        string memory country,
        AuthorityType authorityType
    ) external view returns (address[] memory) {
        return countryAuthorities[country][authorityType];
    }
    
    /**
     * @notice Add trusted trader
     */
    function addTrustedTrader(
        address trader,
        string memory country,
        string memory program
    ) external onlyOwner {
        require(countryConfigs[country].allowsSelfCertification, "Country doesn't allow self-certification");
        trustedTraders[trader][program] = true;
        emit TrustedTraderAdded(trader, program, country);
    }
    
    /**
     * @notice Deactivate an authority
     */
    function deactivateAuthority(
        address authorityAddress,
        string memory reason
    ) external onlyOwner {
        authorities[authorityAddress].isActive = false;
        emit AuthorityDeactivated(authorityAddress, reason);
    }
    
    /**
     * @notice Update country configuration
     */
    function updateCountryConfig(
        string memory countryCode,
        bool requiresGov,
        bool allowsChamber,
        bool allowsSelf,
        uint256 validityPeriod
    ) external onlyOwner {
        CountryConfig storage config = countryConfigs[countryCode];
        config.requiresGovernmentIssuer = requiresGov;
        config.allowsChamberIssuance = allowsChamber;
        config.allowsSelfCertification = allowsSelf;
        config.defaultValidityPeriod = validityPeriod;
        
        emit CountryConfigured(countryCode, requiresGov, allowsChamber);
    }
    
    /**
     * @notice Get authority details
     */
    function getAuthority(address authorityAddress) 
        external 
        view 
        returns (Authority memory) 
    {
        return authorities[authorityAddress];
    }
    
    /**
     * @notice Get country configuration
     */
    function getCountryConfig(string memory countryCode)
        external
        view
        returns (CountryConfig memory)
    {
        return countryConfigs[countryCode];
    }
    
    /**
     * @notice Check if country is registered
     */
    function isCountryRegistered(string memory countryCode)
        external
        view
        returns (bool)
    {
        return registeredCountries[countryCode];
    }
}