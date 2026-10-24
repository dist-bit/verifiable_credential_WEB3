const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TradeAgreementRegistry", function () {
    let agreementRegistry;
    let owner;
    let admin;
    let user;

    beforeEach(async function () {
        [owner, admin, user] = await ethers.getSigners();

        const TradeAgreementRegistry = await ethers.getContractFactory("TradeAgreementRegistry");
        agreementRegistry = await TradeAgreementRegistry.deploy();
        await agreementRegistry.waitForDeployment();
    });

    describe("Initialization", function () {
        it("Should initialize with pre-configured agreements", async function () {
            // Check USMCA
            expect(await agreementRegistry.isValidAgreement("USMCA")).to.be.true;
            const usmcaInfo = await agreementRegistry.getAgreementInfo("USMCA");
            expect(usmcaInfo.name).to.equal("United States-Mexico-Canada Agreement");
            expect(usmcaInfo.isActive).to.be.true;

            // Check CAFTA-DR
            expect(await agreementRegistry.isValidAgreement("CAFTA-DR")).to.be.true;
            const caftaInfo = await agreementRegistry.getAgreementInfo("CAFTA-DR");
            expect(caftaInfo.name).to.equal("Central America-Dominican Republic Free Trade Agreement");
            expect(caftaInfo.isActive).to.be.true;

            // Check CPTPP
            expect(await agreementRegistry.isValidAgreement("CPTPP")).to.be.true;
            const cptppInfo = await agreementRegistry.getAgreementInfo("CPTPP");
            expect(cptppInfo.name).to.equal("Comprehensive and Progressive Agreement for Trans-Pacific Partnership");
            expect(cptppInfo.isActive).to.be.true;

            // Check EU-MX
            expect(await agreementRegistry.isValidAgreement("EU-MX")).to.be.true;
            const eumxInfo = await agreementRegistry.getAgreementInfo("EU-MX");
            expect(eumxInfo.name).to.equal("EU-Mexico Trade Agreement");
            expect(eumxInfo.isActive).to.be.true;
        });

        it("Should have correct member countries for agreements", async function () {
            // USMCA members
            expect(await agreementRegistry.isCountryMember("USMCA", "US")).to.be.true;
            expect(await agreementRegistry.isCountryMember("USMCA", "MX")).to.be.true;
            expect(await agreementRegistry.isCountryMember("USMCA", "CA")).to.be.true;
            expect(await agreementRegistry.isCountryMember("USMCA", "BR")).to.be.false;

            // CAFTA-DR members
            expect(await agreementRegistry.isCountryMember("CAFTA-DR", "US")).to.be.true;
            expect(await agreementRegistry.isCountryMember("CAFTA-DR", "GT")).to.be.true;
            expect(await agreementRegistry.isCountryMember("CAFTA-DR", "SV")).to.be.true;
            expect(await agreementRegistry.isCountryMember("CAFTA-DR", "HN")).to.be.true;
            expect(await agreementRegistry.isCountryMember("CAFTA-DR", "NI")).to.be.true;
            expect(await agreementRegistry.isCountryMember("CAFTA-DR", "CR")).to.be.true;
            expect(await agreementRegistry.isCountryMember("CAFTA-DR", "DO")).to.be.true;
            expect(await agreementRegistry.isCountryMember("CAFTA-DR", "MX")).to.be.false;
        });

        it("Should have correct origin rules for agreements", async function () {
            const [rvcPercentage, deminimisThreshold, validityPeriod, cumulationAllowed, specificRules] = 
                await agreementRegistry.getAgreementRules("USMCA");

            expect(rvcPercentage).to.equal(75); // 75% for USMCA automotive
            expect(deminimisThreshold).to.equal(1000); // 10% typical
            expect(validityPeriod).to.equal(365 * 24 * 60 * 60); // 1 year
            expect(cumulationAllowed).to.be.true;
            expect(specificRules).to.include("automotive");
        });
    });

    describe("Agreement Registration", function () {
        it("Should register a new trade agreement", async function () {
            const memberCountries = ["MX", "AR", "BR", "CL"];
            
            await expect(
                agreementRegistry.registerAgreement(
                    "MERCOSUR",
                    "Southern Common Market",
                    memberCountries,
                    60, // 60% RVC
                    700, // 7% de minimis
                    true, // cumulation allowed
                    "General origin rules for MERCOSUR"
                )
            ).to.emit(agreementRegistry, 'AgreementRegistered')
            .withArgs("MERCOSUR", memberCountries);

            const agreementInfo = await agreementRegistry.getAgreementInfo("MERCOSUR");
            expect(agreementInfo.name).to.equal("Southern Common Market");
            expect(agreementInfo.isActive).to.be.true;

            // Check member countries
            for (const country of memberCountries) {
                expect(await agreementRegistry.isCountryMember("MERCOSUR", country)).to.be.true;
            }
        });

        it("Should fail to register agreement with empty code", async function () {
            await expect(
                agreementRegistry.registerAgreement(
                    "",
                    "Test Agreement",
                    ["US", "CA"],
                    60,
                    700,
                    true,
                    "Rules"
                )
            ).to.be.revertedWith("Agreement code required");
        });

        it("Should fail to register agreement with no member countries", async function () {
            await expect(
                agreementRegistry.registerAgreement(
                    "EMPTY",
                    "Empty Agreement",
                    [],
                    60,
                    700,
                    true,
                    "Rules"
                )
            ).to.be.revertedWith("At least one member country required");
        });

        it("Should fail to register duplicate agreement", async function () {
            await agreementRegistry.registerAgreement(
                "TEST",
                "Test Agreement",
                ["US", "CA"],
                60,
                700,
                true,
                "Rules"
            );

            await expect(
                agreementRegistry.registerAgreement(
                    "TEST",
                    "Duplicate Test",
                    ["MX", "BR"],
                    70,
                    800,
                    false,
                    "Different rules"
                )
            ).to.be.revertedWith("Agreement already exists");
        });

        it("Should handle agreement with many member countries", async function () {
            const manyCountries = ["US", "CA", "MX", "GT", "SV", "HN", "NI", "CR", "PA", "CO", "PE", "CL"];
            
            await agreementRegistry.registerAgreement(
                "MEGA-FTA",
                "Mega Free Trade Agreement",
                manyCountries,
                55,
                500,
                true,
                "Complex rules for mega agreement"
            );

            const agreementInfo = await agreementRegistry.getAgreementInfo("MEGA-FTA");
            expect(agreementInfo.memberCount).to.equal(manyCountries.length);

            // Verify all countries are members
            for (const country of manyCountries) {
                expect(await agreementRegistry.isCountryMember("MEGA-FTA", country)).to.be.true;
            }
        });
    });

    describe("Agreement Rules and Criteria", function () {
        beforeEach(async function () {
            await agreementRegistry.registerAgreement(
                "TEST-FTA",
                "Test Free Trade Agreement",
                ["US", "MX", "CA"],
                65, // 65% RVC
                800, // 8% de minimis
                true, // cumulation allowed
                "Standard rules with special provisions for textiles and automotive"
            );
        });

        it("Should get agreement rules correctly", async function () {
            const [rvc, demin, validity, cumulation, rules] = 
                await agreementRegistry.getAgreementRules("TEST-FTA");

            expect(rvc).to.equal(65);
            expect(demin).to.equal(800);
            expect(validity).to.equal(365 * 24 * 60 * 60); // 1 year default
            expect(cumulation).to.be.true;
            expect(rules).to.include("textiles");
        });

        it("Should update RVC percentage", async function () {
            await agreementRegistry.updateRVCPercentage("TEST-FTA", 70);

            const [rvc, , , , ] = await agreementRegistry.getAgreementRules("TEST-FTA");
            expect(rvc).to.equal(70);
        });

        it("Should update de minimis threshold", async function () {
            await agreementRegistry.updateDeminimisThreshold("TEST-FTA", 1000);

            const [, demin, , , ] = await agreementRegistry.getAgreementRules("TEST-FTA");
            expect(demin).to.equal(1000);
        });

        it("Should update validity period", async function () {
            const newValidity = 180 * 24 * 60 * 60; // 180 days
            await agreementRegistry.updateValidityPeriod("TEST-FTA", newValidity);

            const [, , validity, , ] = await agreementRegistry.getAgreementRules("TEST-FTA");
            expect(validity).to.equal(newValidity);
        });

        it("Should update specific rules", async function () {
            const newRules = "Updated rules with emphasis on digital trade and e-commerce";
            await agreementRegistry.updateSpecificRules("TEST-FTA", newRules);

            const [, , , , rules] = await agreementRegistry.getAgreementRules("TEST-FTA");
            expect(rules).to.equal(newRules);
        });

        it("Should fail to update non-existent agreement", async function () {
            await expect(
                agreementRegistry.updateRVCPercentage("NON-EXISTENT", 80)
            ).to.be.revertedWith("Agreement not found");
        });
    });

    describe("Member Country Management", function () {
        beforeEach(async function () {
            await agreementRegistry.registerAgreement(
                "DYNAMIC-FTA",
                "Dynamic Trade Agreement",
                ["US", "CA"],
                60,
                700,
                true,
                "Expandable agreement"
            );
        });

        it("Should add member country to agreement", async function () {
            expect(await agreementRegistry.isCountryMember("DYNAMIC-FTA", "MX")).to.be.false;

            await expect(
                agreementRegistry.addMemberCountry("DYNAMIC-FTA", "MX")
            ).to.emit(agreementRegistry, 'MemberCountryAdded')
            .withArgs("DYNAMIC-FTA", "MX");

            expect(await agreementRegistry.isCountryMember("DYNAMIC-FTA", "MX")).to.be.true;

            const info = await agreementRegistry.getAgreementInfo("DYNAMIC-FTA");
            expect(info.memberCount).to.equal(3);
        });

        it("Should fail to add duplicate member country", async function () {
            await expect(
                agreementRegistry.addMemberCountry("DYNAMIC-FTA", "US")
            ).to.be.revertedWith("Country already member");
        });

        it("Should remove member country from agreement", async function () {
            expect(await agreementRegistry.isCountryMember("DYNAMIC-FTA", "CA")).to.be.true;

            await expect(
                agreementRegistry.removeMemberCountry("DYNAMIC-FTA", "CA")
            ).to.emit(agreementRegistry, 'MemberCountryRemoved')
            .withArgs("DYNAMIC-FTA", "CA");

            expect(await agreementRegistry.isCountryMember("DYNAMIC-FTA", "CA")).to.be.false;

            const info = await agreementRegistry.getAgreementInfo("DYNAMIC-FTA");
            expect(info.memberCount).to.equal(1);
        });

        it("Should fail to remove non-member country", async function () {
            await expect(
                agreementRegistry.removeMemberCountry("DYNAMIC-FTA", "BR")
            ).to.be.revertedWith("Country not a member");
        });

        it("Should fail to remove last member country", async function () {
            await agreementRegistry.removeMemberCountry("DYNAMIC-FTA", "CA");
            
            await expect(
                agreementRegistry.removeMemberCountry("DYNAMIC-FTA", "US")
            ).to.be.revertedWith("Cannot remove last member");
        });
    });

    describe("Agreement Status Management", function () {
        beforeEach(async function () {
            await agreementRegistry.registerAgreement(
                "STATUS-FTA",
                "Status Test Agreement",
                ["US", "MX"],
                65,
                800,
                true,
                "Test rules"
            );
        });

        it("Should deactivate agreement", async function () {
            expect(await agreementRegistry.isValidAgreement("STATUS-FTA")).to.be.true;

            await expect(
                agreementRegistry.deactivateAgreement("STATUS-FTA")
            ).to.emit(agreementRegistry, 'AgreementDeactivated')
            .withArgs("STATUS-FTA");

            expect(await agreementRegistry.isValidAgreement("STATUS-FTA")).to.be.false;

            const info = await agreementRegistry.getAgreementInfo("STATUS-FTA");
            expect(info.isActive).to.be.false;
        });

        it("Should reactivate agreement", async function () {
            await agreementRegistry.deactivateAgreement("STATUS-FTA");
            expect(await agreementRegistry.isValidAgreement("STATUS-FTA")).to.be.false;

            await expect(
                agreementRegistry.reactivateAgreement("STATUS-FTA")
            ).to.emit(agreementRegistry, 'AgreementReactivated')
            .withArgs("STATUS-FTA");

            expect(await agreementRegistry.isValidAgreement("STATUS-FTA")).to.be.true;
        });
    });

    describe("Country Agreements Query", function () {
        it("Should get all agreements for a country", async function () {
            const usAgreements = await agreementRegistry.getCountryAgreements("US");
            
            // US should be member of USMCA and CAFTA-DR at minimum
            expect(usAgreements).to.include("USMCA");
            expect(usAgreements).to.include("CAFTA-DR");
            expect(usAgreements.length).to.be.at.least(2);
        });

        it("Should return empty array for country with no agreements", async function () {
            const antarcticaAgreements = await agreementRegistry.getCountryAgreements("AQ");
            expect(antarcticaAgreements.length).to.equal(0);
        });

        it("Should check if countries have agreement", async function () {
            // US and MX have agreement through USMCA
            expect(await agreementRegistry.countriesHaveAgreement("US", "MX")).to.be.true;
            expect(await agreementRegistry.countriesHaveAgreement("MX", "US")).to.be.true;

            // US and BR don't have agreement
            expect(await agreementRegistry.countriesHaveAgreement("US", "BR")).to.be.false;
        });
    });

    describe("Access Control", function () {
        it("Should only allow owner to register agreements", async function () {
            await expect(
                agreementRegistry.connect(user).registerAgreement(
                    "UNAUTH",
                    "Unauthorized",
                    ["US", "CA"],
                    60,
                    700,
                    true,
                    "Rules"
                )
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Should only allow owner to update rules", async function () {
            await expect(
                agreementRegistry.connect(user).updateRVCPercentage("USMCA", 80)
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Should only allow owner to manage member countries", async function () {
            await expect(
                agreementRegistry.connect(user).addMemberCountry("USMCA", "BR")
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });
    });

    describe("Complex Scenarios", function () {
        it("Should handle overlapping trade agreements", async function () {
            // Create Pacific Alliance
            await agreementRegistry.registerAgreement(
                "PACIFIC-ALLIANCE",
                "Pacific Alliance",
                ["MX", "CO", "PE", "CL"],
                55,
                600,
                true,
                "Pacific Alliance rules"
            );

            // Mexico is member of both USMCA and Pacific Alliance
            const mxAgreements = await agreementRegistry.getCountryAgreements("MX");
            expect(mxAgreements).to.include("USMCA");
            expect(mxAgreements).to.include("PACIFIC-ALLIANCE");
            expect(mxAgreements).to.include("CPTPP");
            expect(mxAgreements).to.include("EU-MX");

            // Check Mexico has agreements with various countries
            expect(await agreementRegistry.countriesHaveAgreement("MX", "US")).to.be.true; // via USMCA
            expect(await agreementRegistry.countriesHaveAgreement("MX", "CO")).to.be.true; // via Pacific Alliance
            expect(await agreementRegistry.countriesHaveAgreement("MX", "JP")).to.be.true; // via CPTPP
        });

        it("Should handle bilateral and multilateral agreements", async function () {
            // Register bilateral agreement
            await agreementRegistry.registerAgreement(
                "US-KR",
                "United States-Korea Free Trade Agreement",
                ["US", "KR"],
                55,
                700,
                false, // No cumulation in bilateral
                "Bilateral agreement rules"
            );

            // Register multilateral agreement including Korea
            await agreementRegistry.registerAgreement(
                "RCEP",
                "Regional Comprehensive Economic Partnership",
                ["KR", "JP", "CN", "AU", "NZ", "SG", "TH", "VN", "MY", "ID", "PH", "BN", "KH", "LA", "MM"],
                40, // Lower RVC for RCEP
                1000,
                true,
                "RCEP origin rules"
            );

            const krAgreements = await agreementRegistry.getCountryAgreements("KR");
            expect(krAgreements).to.include("US-KR");
            expect(krAgreements).to.include("RCEP");
        });
    });

    describe("Edge Cases", function () {
        it("Should handle maximum RVC percentage", async function () {
            await agreementRegistry.registerAgreement(
                "HIGH-RVC",
                "High RVC Agreement",
                ["US", "CA"],
                100, // 100% RVC
                0, // No de minimis
                false,
                "Strict origin rules"
            );

            const [rvc, demin, , , ] = await agreementRegistry.getAgreementRules("HIGH-RVC");
            expect(rvc).to.equal(100);
            expect(demin).to.equal(0);
        });

        it("Should handle very long specific rules", async function () {
            const longRules = "A".repeat(1000); // 1000 character rule
            
            await agreementRegistry.registerAgreement(
                "LONG-RULES",
                "Long Rules Agreement",
                ["US", "MX"],
                60,
                700,
                true,
                longRules
            );

            const [, , , , rules] = await agreementRegistry.getAgreementRules("LONG-RULES");
            expect(rules.length).to.equal(1000);
        });
    });
});