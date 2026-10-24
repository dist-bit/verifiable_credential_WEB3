// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ITradeAgreement {
    function isValidAgreement(string memory agreementCode) external view returns (bool);
    
    function validateOriginCriteria(
        string memory agreementCode,
        string memory exportCountry,
        string memory importCountry,
        bytes memory criteriaData
    ) external view returns (bool);
    
    function getAgreementRules(string memory agreementCode) 
        external 
        view 
        returns (
            string memory name,
            string[] memory memberCountries,
            uint256 defaultValidityPeriod,
            bool requiresRVC,
            uint256 minRVC
        );
}