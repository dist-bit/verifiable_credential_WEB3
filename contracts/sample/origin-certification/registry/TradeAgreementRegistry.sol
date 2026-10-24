// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../../utils/Ownable.sol";
import "../interfaces/ITradeAgreement.sol";

/**
 * @title TradeAgreementRegistry
 * @notice Registry for all trade agreements and their rules
 * @dev Supports any bilateral or multilateral trade agreement
 */
contract TradeAgreementRegistry is ITradeAgreement, Ownable {
    
    struct Agreement {
        string code;                    // e.g., "USMCA", "CPTPP", "RCEP"
        string name;                    // Full agreement name
        bool isActive;
        uint256 defaultValidityPeriod;  // Default certificate validity in seconds
        string[] memberCountries;       // ISO 3166-1 alpha-2 codes
        mapping(string => bool) isMember;
        
        // Origin requirements
        bool requiresRVC;               // Regional Value Content required
        uint256 defaultMinRVC;          // Default minimum RVC percentage
        bool allowsCumulation;          // Cumulation provisions
        bool allowsDeminimis;           // De minimis provisions
        uint256 deminimisPercentage;   // De minimis threshold
        
        // Special provisions
        mapping(string => string) countrySpecificRules;
        mapping(string => uint256) productSpecificRVC; // HS code => RVC
        string[] supportedCriteria;     // WO, PE, PSR, RVC, etc.
    }
    
    // Storage
    mapping(string => Agreement) public agreements;
    string[] public agreementCodes;
    
    // Country to agreements mapping
    mapping(string => string[]) public countryAgreements;
    
    // Events
    event AgreementAdded(string indexed code, string name, string[] memberCountries);
    event AgreementUpdated(string indexed code, string updateType);
    event CountryAdded(string indexed agreementCode, string country);
    event CountryRemoved(string indexed agreementCode, string country);
    
    constructor() {
        _initializeCommonAgreements();
    }
    
    /**
     * @notice Initialize with common trade agreements
     */
    function _initializeCommonAgreements() private {
        // USMCA/T-MEC
        string[] memory usmcaCountries = new string[](3);
        usmcaCountries[0] = "US";
        usmcaCountries[1] = "MX";
        usmcaCountries[2] = "CA";
        
        _addAgreement(
            "USMCA",
            "United States-Mexico-Canada Agreement",
            usmcaCountries,
            4 * 365 days, // 4 years validity
            true,         // requires RVC
            60,           // 60% default RVC
            true,         // allows cumulation
            true,         // allows de minimis
            10            // 10% de minimis
        );
        
        // CAFTA-DR
        string[] memory caftaCountries = new string[](7);
        caftaCountries[0] = "US";
        caftaCountries[1] = "SV"; // El Salvador
        caftaCountries[2] = "GT"; // Guatemala
        caftaCountries[3] = "HN"; // Honduras
        caftaCountries[4] = "NI"; // Nicaragua
        caftaCountries[5] = "CR"; // Costa Rica
        caftaCountries[6] = "DO"; // Dominican Republic
        
        _addAgreement(
            "CAFTA-DR",
            "Central America-Dominican Republic Free Trade Agreement",
            caftaCountries,
            1 * 365 days, // 1 year validity
            true,         // requires RVC
            35,           // 35% default RVC
            true,         // allows cumulation
            true,         // allows de minimis
            10            // 10% de minimis
        );
        
        // CPTPP
        string[] memory cptppCountries = new string[](11);
        cptppCountries[0] = "JP";
        cptppCountries[1] = "CA";
        cptppCountries[2] = "MX";
        cptppCountries[3] = "PE";
        cptppCountries[4] = "CL";
        cptppCountries[5] = "NZ";
        cptppCountries[6] = "AU";
        cptppCountries[7] = "VN";
        cptppCountries[8] = "MY";
        cptppCountries[9] = "SG";
        cptppCountries[10] = "BN";
        
        _addAgreement(
            "CPTPP",
            "Comprehensive and Progressive Agreement for Trans-Pacific Partnership",
            cptppCountries,
            1 * 365 days,
            true,
            45,
            true,
            true,
            10
        );
        
        // EU-Mexico
        string[] memory euMexicoCountries = new string[](28); // EU27 + MX
        euMexicoCountries[0] = "MX";
        euMexicoCountries[1] = "DE";
        euMexicoCountries[2] = "FR";
        euMexicoCountries[3] = "IT";
        euMexicoCountries[4] = "ES";
        // ... (would add all EU countries)
        
        _addAgreement(
            "EU-MX",
            "EU-Mexico Trade Agreement",
            euMexicoCountries,
            1 * 365 days,
            true,
            50,
            true,
            true,
            10
        );
    }
    
    /**
     * @notice Add a new trade agreement
     */
    function addAgreement(
        string memory code,
        string memory name,
        string[] memory memberCountries,
        uint256 defaultValidityPeriod,
        bool requiresRVC,
        uint256 defaultMinRVC,
        bool allowsCumulation,
        bool allowsDeminimis,
        uint256 deminimisPercentage
    ) external onlyOwner {
        _addAgreement(
            code,
            name,
            memberCountries,
            defaultValidityPeriod,
            requiresRVC,
            defaultMinRVC,
            allowsCumulation,
            allowsDeminimis,
            deminimisPercentage
        );
    }
    
    function _addAgreement(
        string memory code,
        string memory name,
        string[] memory memberCountries,
        uint256 defaultValidityPeriod,
        bool requiresRVC,
        uint256 defaultMinRVC,
        bool allowsCumulation,
        bool allowsDeminimis,
        uint256 deminimisPercentage
    ) private {
        require(bytes(agreements[code].code).length == 0, "Agreement already exists");
        
        Agreement storage agreement = agreements[code];
        agreement.code = code;
        agreement.name = name;
        agreement.isActive = true;
        agreement.defaultValidityPeriod = defaultValidityPeriod;
        agreement.requiresRVC = requiresRVC;
        agreement.defaultMinRVC = defaultMinRVC;
        agreement.allowsCumulation = allowsCumulation;
        agreement.allowsDeminimis = allowsDeminimis;
        agreement.deminimisPercentage = deminimisPercentage;
        
        // Add member countries
        for (uint i = 0; i < memberCountries.length; i++) {
            agreement.memberCountries.push(memberCountries[i]);
            agreement.isMember[memberCountries[i]] = true;
            countryAgreements[memberCountries[i]].push(code);
        }
        
        // Add supported criteria
        agreement.supportedCriteria.push("WO");  // Wholly Obtained
        agreement.supportedCriteria.push("PE");  // Produced Entirely
        agreement.supportedCriteria.push("PSR"); // Product Specific Rule
        agreement.supportedCriteria.push("RVC"); // Regional Value Content
        
        agreementCodes.push(code);
        
        emit AgreementAdded(code, name, memberCountries);
    }
    
    /**
     * @notice Check if agreement is valid
     */
    function isValidAgreement(string memory agreementCode) 
        external 
        view 
        override 
        returns (bool) 
    {
        return agreements[agreementCode].isActive;
    }
    
    /**
     * @notice Validate origin criteria for an agreement
     */
    function validateOriginCriteria(
        string memory agreementCode,
        string memory exportCountry,
        string memory importCountry,
        bytes memory criteriaData
    ) external view override returns (bool) {
        Agreement storage agreement = agreements[agreementCode];
        
        // Check if agreement exists and is active
        if (!agreement.isActive) return false;
        
        // Check if both countries are members
        if (!agreement.isMember[exportCountry] || !agreement.isMember[importCountry]) {
            return false;
        }
        
        // Decode criteria
        (
            string memory criteriaType,
            uint256 rvcPercentage,
            bool cumulationApplied,
            bool deminimisApplied
        ) = abi.decode(criteriaData, (string, uint256, bool, bool));
        
        // Validate criteria type is supported
        bool validCriteria = false;
        for (uint i = 0; i < agreement.supportedCriteria.length; i++) {
            if (keccak256(bytes(agreement.supportedCriteria[i])) == keccak256(bytes(criteriaType))) {
                validCriteria = true;
                break;
            }
        }
        if (!validCriteria) return false;
        
        // Validate RVC if required
        if (agreement.requiresRVC && keccak256(bytes(criteriaType)) == keccak256(bytes("RVC"))) {
            if (rvcPercentage < agreement.defaultMinRVC) return false;
        }
        
        // Validate cumulation
        if (cumulationApplied && !agreement.allowsCumulation) return false;
        
        // Validate de minimis
        if (deminimisApplied && !agreement.allowsDeminimis) return false;
        
        return true;
    }
    
    /**
     * @notice Get agreement rules
     */
    function getAgreementRules(string memory agreementCode) 
        external 
        view 
        override
        returns (
            string memory name,
            string[] memory memberCountries,
            uint256 defaultValidityPeriod,
            bool requiresRVC,
            uint256 minRVC
        ) 
    {
        Agreement storage agreement = agreements[agreementCode];
        return (
            agreement.name,
            agreement.memberCountries,
            agreement.defaultValidityPeriod,
            agreement.requiresRVC,
            agreement.defaultMinRVC
        );
    }
    
    /**
     * @notice Set product-specific RVC requirement
     */
    function setProductSpecificRVC(
        string memory agreementCode,
        string memory hsCode,
        uint256 rvcPercentage
    ) external onlyOwner {
        agreements[agreementCode].productSpecificRVC[hsCode] = rvcPercentage;
    }
    
    /**
     * @notice Get agreements for a country
     */
    function getCountryAgreements(string memory countryCode) 
        external 
        view 
        returns (string[] memory) 
    {
        return countryAgreements[countryCode];
    }
    
    /**
     * @notice Add country-specific rule
     */
    function addCountrySpecificRule(
        string memory agreementCode,
        string memory countryCode,
        string memory rule
    ) external onlyOwner {
        agreements[agreementCode].countrySpecificRules[countryCode] = rule;
        emit AgreementUpdated(agreementCode, "CountryRule");
    }
    
    /**
     * @notice Toggle agreement active status
     */
    function setAgreementActive(string memory agreementCode, bool isActive) 
        external 
        onlyOwner 
    {
        agreements[agreementCode].isActive = isActive;
        emit AgreementUpdated(agreementCode, isActive ? "Activated" : "Deactivated");
    }
}