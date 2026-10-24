const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CountryAuthorityManager", function () {
    let authorityManager;
    let owner;
    let authority1;
    let authority2;
    let authority3;
    let user;

    beforeEach(async function () {
        [owner, authority1, authority2, authority3, user] = await ethers.getSigners();

        const CountryAuthorityManager = await ethers.getContractFactory("CountryAuthorityManager");
        authorityManager = await CountryAuthorityManager.deploy();
        await authorityManager.waitForDeployment();
    });

    describe("Authority Registration", function () {
        it("Should register a new authority successfully", async function () {
            const validUntil = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60; // 1 year
            
            await expect(
                authorityManager.registerAuthority(
                    authority1.address,
                    "Mexican Chamber of Commerce",
                    "MCC-001",
                    0, // CHAMBER_OF_COMMERCE
                    "MX",
                    "CDMX",
                    validUntil,
                    JSON.stringify({ email: "contact@mcc.mx", phone: "+525555555555" }),
                    ["ORIGIN_CERTIFICATE", "USMCA"],
                    "https://api.mcc.mx",
                    "0x04abcdef..." // Public key
                )
            ).to.emit(authorityManager, 'AuthorityRegistered')
            .withArgs(authority1.address, "MX", 0);

            const authority = await authorityManager.getAuthority(authority1.address);
            expect(authority.name).to.equal("Mexican Chamber of Commerce");
            expect(authority.country).to.equal("MX");
            expect(authority.isActive).to.be.true;
            expect(authority.authorityType).to.equal(0);
        });

        it("Should register authorities of different types", async function () {
            const validUntil = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;

            // Chamber of Commerce
            await authorityManager.registerAuthority(
                authority1.address,
                "Chamber",
                "CH-001",
                0, // CHAMBER_OF_COMMERCE
                "US",
                "NY",
                validUntil,
                "{}",
                ["ORIGIN_CERTIFICATE"],
                "",
                ""
            );

            // Government Agency
            await authorityManager.registerAuthority(
                authority2.address,
                "Government",
                "GOV-001",
                1, // GOVERNMENT_AGENCY
                "CA",
                "ON",
                validUntil,
                "{}",
                ["ORIGIN_CERTIFICATE"],
                "",
                ""
            );

            // Customs
            await authorityManager.registerAuthority(
                authority3.address,
                "Customs",
                "CUST-001",
                2, // CUSTOMS
                "MX",
                "TJ",
                validUntil,
                "{}",
                ["ORIGIN_CERTIFICATE"],
                "",
                ""
            );

            const auth1 = await authorityManager.getAuthority(authority1.address);
            const auth2 = await authorityManager.getAuthority(authority2.address);
            const auth3 = await authorityManager.getAuthority(authority3.address);

            expect(auth1.authorityType).to.equal(0);
            expect(auth2.authorityType).to.equal(1);
            expect(auth3.authorityType).to.equal(2);
        });

        it("Should fail to register with empty name", async function () {
            await expect(
                authorityManager.registerAuthority(
                    authority1.address,
                    "",
                    "ID-001",
                    0,
                    "MX",
                    "CDMX",
                    Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60,
                    "{}",
                    ["ORIGIN_CERTIFICATE"],
                    "",
                    ""
                )
            ).to.be.revertedWith("Name required");
        });

        it("Should fail to register with empty country", async function () {
            await expect(
                authorityManager.registerAuthority(
                    authority1.address,
                    "Test Authority",
                    "ID-001",
                    0,
                    "",
                    "CDMX",
                    Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60,
                    "{}",
                    ["ORIGIN_CERTIFICATE"],
                    "",
                    ""
                )
            ).to.be.revertedWith("Country required");
        });

        it("Should fail to register duplicate authority", async function () {
            const validUntil = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
            
            await authorityManager.registerAuthority(
                authority1.address,
                "First Registration",
                "ID-001",
                0,
                "MX",
                "CDMX",
                validUntil,
                "{}",
                ["ORIGIN_CERTIFICATE"],
                "",
                ""
            );

            await expect(
                authorityManager.registerAuthority(
                    authority1.address,
                    "Second Registration",
                    "ID-002",
                    0,
                    "US",
                    "NY",
                    validUntil,
                    "{}",
                    ["ORIGIN_CERTIFICATE"],
                    "",
                    ""
                )
            ).to.be.revertedWith("Authority already registered");
        });

        it("Should store certification types correctly", async function () {
            const certTypes = ["ORIGIN_CERTIFICATE", "USMCA", "CAFTA-DR", "CPTPP"];
            
            await authorityManager.registerAuthority(
                authority1.address,
                "Multi-Cert Authority",
                "MCA-001",
                0,
                "MX",
                "CDMX",
                Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60,
                "{}",
                certTypes,
                "",
                ""
            );

            // Check each certification type
            for (const certType of certTypes) {
                const canIssue = await authorityManager.canIssueCertificate(
                    authority1.address,
                    "MX",
                    certType
                );
                expect(canIssue).to.be.true;
            }
        });
    });

    describe("Authority Validation", function () {
        beforeEach(async function () {
            const validUntil = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
            
            await authorityManager.registerAuthority(
                authority1.address,
                "Test Authority",
                "TA-001",
                0,
                "MX",
                "CDMX",
                validUntil,
                "{}",
                ["ORIGIN_CERTIFICATE", "USMCA"],
                "https://api.test.mx",
                "0x04test..."
            );
        });

        it("Should validate authority can issue certificates", async function () {
            const canIssue = await authorityManager.canIssueCertificate(
                authority1.address,
                "MX",
                "ORIGIN_CERTIFICATE"
            );
            expect(canIssue).to.be.true;
        });

        it("Should return false for unauthorized certificate type", async function () {
            const canIssue = await authorityManager.canIssueCertificate(
                authority1.address,
                "MX",
                "CAFTA-DR" // Not authorized for this
            );
            expect(canIssue).to.be.false;
        });

        it("Should return false for wrong country", async function () {
            const canIssue = await authorityManager.canIssueCertificate(
                authority1.address,
                "US", // Wrong country
                "ORIGIN_CERTIFICATE"
            );
            expect(canIssue).to.be.false;
        });

        it("Should return false for inactive authority", async function () {
            // Deactivate authority
            await authorityManager.deactivateAuthority(authority1.address);

            const canIssue = await authorityManager.canIssueCertificate(
                authority1.address,
                "MX",
                "ORIGIN_CERTIFICATE"
            );
            expect(canIssue).to.be.false;
        });

        it("Should return false for expired authority", async function () {
            // Register authority that expires immediately
            const expiredTime = Math.floor(Date.now() / 1000) - 1;
            
            await authorityManager.registerAuthority(
                authority2.address,
                "Expired Authority",
                "EA-001",
                0,
                "US",
                "NY",
                expiredTime,
                "{}",
                ["ORIGIN_CERTIFICATE"],
                "",
                ""
            );

            const canIssue = await authorityManager.canIssueCertificate(
                authority2.address,
                "US",
                "ORIGIN_CERTIFICATE"
            );
            expect(canIssue).to.be.false;
        });
    });

    describe("Authority Management", function () {
        beforeEach(async function () {
            const validUntil = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
            
            await authorityManager.registerAuthority(
                authority1.address,
                "Active Authority",
                "AA-001",
                0,
                "MX",
                "CDMX",
                validUntil,
                JSON.stringify({ email: "contact@authority.mx" }),
                ["ORIGIN_CERTIFICATE"],
                "https://api.authority.mx",
                "0x04public..."
            );
        });

        it("Should deactivate authority", async function () {
            await expect(
                authorityManager.deactivateAuthority(authority1.address)
            ).to.emit(authorityManager, 'AuthorityDeactivated')
            .withArgs(authority1.address);

            const authority = await authorityManager.getAuthority(authority1.address);
            expect(authority.isActive).to.be.false;
        });

        it("Should reactivate authority", async function () {
            // First deactivate
            await authorityManager.deactivateAuthority(authority1.address);

            // Then reactivate
            await expect(
                authorityManager.reactivateAuthority(authority1.address)
            ).to.emit(authorityManager, 'AuthorityReactivated')
            .withArgs(authority1.address);

            const authority = await authorityManager.getAuthority(authority1.address);
            expect(authority.isActive).to.be.true;
        });

        it("Should update authority validity period", async function () {
            const newValidUntil = Math.floor(Date.now() / 1000) + 2 * 365 * 24 * 60 * 60; // 2 years

            await authorityManager.updateAuthorityValidity(
                authority1.address,
                newValidUntil
            );

            const authority = await authorityManager.getAuthority(authority1.address);
            expect(authority.validUntil).to.equal(newValidUntil);
        });

        it("Should update authority API endpoint", async function () {
            const newEndpoint = "https://new-api.authority.mx";

            await authorityManager.updateAuthorityEndpoint(
                authority1.address,
                newEndpoint
            );

            const authority = await authorityManager.getAuthority(authority1.address);
            expect(authority.apiEndpoint).to.equal(newEndpoint);
        });

        it("Should add certification type to authority", async function () {
            // Initially cannot issue CAFTA-DR
            let canIssue = await authorityManager.canIssueCertificate(
                authority1.address,
                "MX",
                "CAFTA-DR"
            );
            expect(canIssue).to.be.false;

            // Add CAFTA-DR certification
            await authorityManager.addCertificationType(
                authority1.address,
                "CAFTA-DR"
            );

            // Now can issue CAFTA-DR
            canIssue = await authorityManager.canIssueCertificate(
                authority1.address,
                "MX",
                "CAFTA-DR"
            );
            expect(canIssue).to.be.true;
        });

        it("Should remove certification type from authority", async function () {
            // Initially can issue ORIGIN_CERTIFICATE
            let canIssue = await authorityManager.canIssueCertificate(
                authority1.address,
                "MX",
                "ORIGIN_CERTIFICATE"
            );
            expect(canIssue).to.be.true;

            // Remove ORIGIN_CERTIFICATE certification
            await authorityManager.removeCertificationType(
                authority1.address,
                "ORIGIN_CERTIFICATE"
            );

            // Now cannot issue ORIGIN_CERTIFICATE
            canIssue = await authorityManager.canIssueCertificate(
                authority1.address,
                "MX",
                "ORIGIN_CERTIFICATE"
            );
            expect(canIssue).to.be.false;
        });
    });

    describe("Country Authorities", function () {
        beforeEach(async function () {
            const validUntil = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
            
            // Register multiple authorities for Mexico
            await authorityManager.registerAuthority(
                authority1.address,
                "Mexico Chamber 1",
                "MC1-001",
                0,
                "MX",
                "CDMX",
                validUntil,
                "{}",
                ["ORIGIN_CERTIFICATE"],
                "",
                ""
            );

            await authorityManager.registerAuthority(
                authority2.address,
                "Mexico Chamber 2",
                "MC2-001",
                0,
                "MX",
                "GDL",
                validUntil,
                "{}",
                ["ORIGIN_CERTIFICATE"],
                "",
                ""
            );

            // Register authority for US
            await authorityManager.registerAuthority(
                authority3.address,
                "US Chamber",
                "USC-001",
                0,
                "US",
                "NY",
                validUntil,
                "{}",
                ["ORIGIN_CERTIFICATE"],
                "",
                ""
            );
        });

        it("Should get authorities by country", async function () {
            const mexicoAuthorities = await authorityManager.getAuthoritiesByCountry("MX");
            expect(mexicoAuthorities.length).to.equal(2);
            expect(mexicoAuthorities).to.include(authority1.address);
            expect(mexicoAuthorities).to.include(authority2.address);

            const usAuthorities = await authorityManager.getAuthoritiesByCountry("US");
            expect(usAuthorities.length).to.equal(1);
            expect(usAuthorities[0]).to.equal(authority3.address);
        });

        it("Should check if address is authority for country", async function () {
            expect(await authorityManager.isAuthorityForCountry(authority1.address, "MX")).to.be.true;
            expect(await authorityManager.isAuthorityForCountry(authority1.address, "US")).to.be.false;
            expect(await authorityManager.isAuthorityForCountry(authority3.address, "US")).to.be.true;
            expect(await authorityManager.isAuthorityForCountry(user.address, "MX")).to.be.false;
        });

        it("Should return empty array for country with no authorities", async function () {
            const brazilAuthorities = await authorityManager.getAuthoritiesByCountry("BR");
            expect(brazilAuthorities.length).to.equal(0);
        });
    });

    describe("Access Control", function () {
        it("Should only allow owner to register authorities", async function () {
            await expect(
                authorityManager.connect(user).registerAuthority(
                    authority1.address,
                    "Unauthorized",
                    "UN-001",
                    0,
                    "MX",
                    "CDMX",
                    Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60,
                    "{}",
                    ["ORIGIN_CERTIFICATE"],
                    "",
                    ""
                )
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Should only allow owner to deactivate authorities", async function () {
            const validUntil = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
            
            await authorityManager.registerAuthority(
                authority1.address,
                "Test",
                "T-001",
                0,
                "MX",
                "CDMX",
                validUntil,
                "{}",
                ["ORIGIN_CERTIFICATE"],
                "",
                ""
            );

            await expect(
                authorityManager.connect(user).deactivateAuthority(authority1.address)
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });
    });

    describe("Edge Cases", function () {
        it("Should handle authority with multiple regions", async function () {
            const validUntil = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
            
            await authorityManager.registerAuthority(
                authority1.address,
                "National Authority",
                "NA-001",
                1, // GOVERNMENT_AGENCY
                "MX",
                "NATIONAL", // Covers all regions
                validUntil,
                JSON.stringify({ 
                    email: "contact@national.mx",
                    regions: ["CDMX", "GDL", "MTY", "TJ"]
                }),
                ["ORIGIN_CERTIFICATE", "USMCA", "CPTPP"],
                "https://api.national.mx",
                "0x04national..."
            );

            const authority = await authorityManager.getAuthority(authority1.address);
            expect(authority.region).to.equal("NATIONAL");
        });

        it("Should handle authority with extensive metadata", async function () {
            const extensiveMetadata = JSON.stringify({
                email: "contact@authority.mx",
                phone: "+525555555555",
                fax: "+525555555556",
                address: {
                    street: "Av. Reforma 123",
                    city: "CDMX",
                    postalCode: "06600",
                    country: "Mexico"
                },
                operatingHours: {
                    monday: "9:00-18:00",
                    tuesday: "9:00-18:00",
                    wednesday: "9:00-18:00",
                    thursday: "9:00-18:00",
                    friday: "9:00-14:00"
                },
                languages: ["Spanish", "English"],
                certificationProcess: {
                    averageTime: "48 hours",
                    requirements: ["RFC", "Export License", "Product Documentation"],
                    fees: {
                        standard: "500 MXN",
                        express: "1000 MXN"
                    }
                }
            });

            await authorityManager.registerAuthority(
                authority1.address,
                "Detailed Authority",
                "DA-001",
                0,
                "MX",
                "CDMX",
                Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60,
                extensiveMetadata,
                ["ORIGIN_CERTIFICATE"],
                "https://api.detailed.mx",
                "0x04detailed..."
            );

            const authority = await authorityManager.getAuthority(authority1.address);
            const metadata = JSON.parse(authority.contactInfo);
            expect(metadata.email).to.equal("contact@authority.mx");
            expect(metadata.languages).to.include("Spanish");
            expect(metadata.certificationProcess.fees.standard).to.equal("500 MXN");
        });

        it("Should handle maximum certification types", async function () {
            const maxCertTypes = [];
            for (let i = 0; i < 20; i++) {
                maxCertTypes.push(`CERT_TYPE_${i}`);
            }

            await authorityManager.registerAuthority(
                authority1.address,
                "Max Cert Authority",
                "MCA-001",
                0,
                "MX",
                "CDMX",
                Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60,
                "{}",
                maxCertTypes,
                "",
                ""
            );

            // Verify all cert types were stored
            for (const certType of maxCertTypes) {
                const canIssue = await authorityManager.canIssueCertificate(
                    authority1.address,
                    "MX",
                    certType
                );
                expect(canIssue).to.be.true;
            }
        });
    });
});