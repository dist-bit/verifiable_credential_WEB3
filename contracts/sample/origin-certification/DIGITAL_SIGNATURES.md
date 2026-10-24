# Multi-Country Digital Signature Support

## Overview
The origin certification system now supports digital signatures from multiple countries, not just Mexico's FIEL. This enables global trade certification with country-specific signature validation.

## Supported Countries and Signature Types

### North America
- **Mexico (MX)**: FIEL - Firma Electrónica Avanzada
- **United States (US)**: PKI/X.509 Certificates  
- **Canada (CA)**: Digital ID

### South America  
- **Brazil (BR)**: Certificado Digital (ICP-Brasil)
- **Argentina (AR)**: Firma Digital
- **Chile (CL)**: Firma Electrónica
- **Colombia (CO)**: Firma Digital
- **Peru (PE)**: Firma Digital

### European Union (eIDAS)
All 27 EU member states support eIDAS (electronic IDentification, Authentication and trust Services):
- Germany (DE), France (FR), Spain (ES), Italy (IT), Netherlands (NL), Belgium (BE), Austria (AT), Portugal (PT), Greece (GR), Sweden (SE), Finland (FI), Denmark (DK), Ireland (IE), Poland (PL), Czech Republic (CZ), Hungary (HU), Romania (RO), Bulgaria (BG), Croatia (HR), Slovakia (SK), Slovenia (SI), Estonia (EE), Latvia (LV), Lithuania (LT), Luxembourg (LU), Malta (MT), Cyprus (CY)

### Asia-Pacific
- **India (IN)**: Digital Signature Certificate (DSC)
- **Japan (JP)**: Electronic Seal/Hanko
- **China (CN)**: Digital Certificate
- **South Korea (KR)**: Digital Certificate
- **Singapore (SG)**: Digital Certificate
- **Australia (AU)**: Digital Certificate
- **New Zealand (NZ)**: Digital Certificate

### Other Regions
- **Russia (RU)**: GOST Digital Signature
- **South Africa (ZA)**: Digital Certificate
- **UAE (AE)**: Digital Certificate
- **Saudi Arabia (SA)**: Digital Certificate
- **Israel (IL)**: Digital Certificate
- **Turkey (TR)**: Digital Certificate

## Smart Contract: OriginCertificateWithDigitalSignatures

The new smart contract (`OriginCertificateWithDigitalSignatures.sol`) provides:

### Features
1. **Universal Digital Signature Storage**: Stores signatures from any supported country
2. **Country-Specific Validation**: Each country's signature type is validated according to its standards
3. **On-Chain Registry**: Trusted signers are registered on-chain by country and tax ID
4. **Multi-Signature Support**: Certificates can have signatures from multiple countries
5. **Backward Compatibility**: Mexican FIEL signatures work exactly as before

### Key Functions
- `registerDigitalSignature()`: Register trusted digital signatures by country
- `signWithDigitalSignature()`: Sign certificates with any country's digital signature
- `validateDigitalSignature()`: Validate signatures according to country standards
- `verifyWithDigitalSignature()`: Enhanced verification including digital signatures
- `addCountrySupport()`: Add support for new countries dynamically

## API Endpoints

### Sign Certificate with Digital Signature
```bash
POST /origin-certification/certificates/{certificateId}/sign
{
  "exporterPrivateKey": "0x...",
  "digitalCertPath": "/path/to/certificate.cer",
  "digitalKeyPath": "/path/to/private.key", 
  "digitalPassword": "password",
  "countryCode": "MX"  # ISO 3166-1 alpha-2
}
```

### Validate Digital Certificate
```bash
POST /origin-certification/digital-signatures/validate
{
  "certPath": "/path/to/certificate.cer",
  "countryCode": "US"
}
```

### Get Supported Countries
```bash
GET /origin-certification/digital-signatures/countries
```

### Sign Data with Digital Signature
```bash
POST /origin-certification/digital-signatures/sign
{
  "data": { "any": "data" },
  "certPath": "/path/to/certificate.cer",
  "keyPath": "/path/to/private.key",
  "password": "password", 
  "countryCode": "BR"
}
```

## Implementation Details

### DigitalSignatureService
The service (`digital-signature.service.ts`) handles:
- Certificate parsing for each country's format
- Tax ID extraction (RFC, EIN, VAT, CNPJ, PAN, etc.)
- Signature generation according to country standards
- Certificate validation against country-specific rules

### Country-Specific Implementations
Each country has custom logic for:
- **Certificate Parsing**: Extract tax ID from country-specific OIDs
- **Validation Rules**: Check against national certificate authorities
- **Signature Format**: Follow national cryptographic standards

### Backward Compatibility
- FIEL endpoints still work exactly as before
- `fielCertPath` parameters automatically map to Mexico
- All existing FIEL functionality preserved

## Usage Examples

### Mexico (FIEL)
```javascript
const signData = {
  exporterPrivateKey: "0x...",
  digitalCertPath: "/path/to/fiel.cer",
  digitalKeyPath: "/path/to/fiel.key",
  digitalPassword: "password",
  countryCode: "MX"
};
```

### United States (PKI)
```javascript
const signData = {
  exporterPrivateKey: "0x...",
  digitalCertPath: "/path/to/certificate.p12",
  digitalKeyPath: "/path/to/private.key",
  digitalPassword: "password",
  countryCode: "US"
};
```

### European Union (eIDAS)
```javascript
const signData = {
  exporterPrivateKey: "0x...",
  digitalCertPath: "/path/to/eidas-cert.crt",
  digitalKeyPath: "/path/to/eidas-key.key",
  digitalPassword: "password",
  countryCode: "DE"  // or any EU country
};
```

### Brazil (Certificado Digital)
```javascript
const signData = {
  exporterPrivateKey: "0x...",
  digitalCertPath: "/path/to/certificado.pfx",
  digitalKeyPath: "/path/to/certificado.pfx",
  digitalPassword: "password",
  countryCode: "BR"
};
```

## Security Considerations

1. **Certificate Validation**: Each country's certificates are validated against their national standards
2. **On-Chain Registry**: Only admin can register trusted digital signatures
3. **Signature Verification**: All signatures are cryptographically verified
4. **Time-Based Validation**: Certificate validity periods are enforced
5. **Country-Specific Rules**: Each country's specific security requirements are respected

## Future Enhancements

1. **Automatic CA Validation**: Connect to national certificate authority APIs
2. **Cross-Border Recognition**: Mutual recognition agreements between countries
3. **Revocation Checking**: Real-time certificate revocation status
4. **Multi-Signature Requirements**: Require signatures from multiple countries for certain trade agreements
5. **Blockchain Interoperability**: Support signatures from other blockchain networks