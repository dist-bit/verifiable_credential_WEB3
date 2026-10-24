// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IOriginCertificate {
    struct Product {
        string hsCode;
        string description;
        uint256 quantity;
        string unitOfMeasure;
        string countryOfOrigin;
        uint256 value;
        string currency;
        string manufacturer;
        string manufacturerCountry;
        bytes additionalData;
    }

    struct OriginCriteria {
        string agreementCode;
        string criteriaType;
        uint256 rvcPercentage;
        string rvcMethod;
        bool cumulationApplied;
        bool deminimisApplied;
        string specificRule;
        bytes proofDocuments;
    }

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
    ) external returns (bytes32);

    function issueCertificate(
        bytes32 certificateId,
        uint256 validityPeriod,
        string memory ipfsHash,
        bytes memory signature
    ) external;

    function validateCertificate(
        bytes32 certificateId,
        string memory validatorCountry,
        bytes memory signature
    ) external;

    function verifyCertificate(bytes32 certificateId)
        external
        view
        returns (
            bool isValid,
            uint8 status,
            uint256 expiryDate,
            address issuer
        );
}