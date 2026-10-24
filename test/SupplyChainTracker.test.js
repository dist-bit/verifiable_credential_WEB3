const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SupplyChainTracker", function () {
  let SupplyChainTracker;
  let supplyChainTracker;
  let owner;
  let actor1;
  let actor2;
  let unauthorizedActor;
  let certificateId;

  beforeEach(async function () {
    [owner, actor1, actor2, unauthorizedActor] = await ethers.getSigners();

    // Deploy SupplyChainTracker
    SupplyChainTracker = await ethers.getContractFactory("SupplyChainTracker");
    supplyChainTracker = await SupplyChainTracker.deploy("0x0000000000000000000000000000000000000000");
    await supplyChainTracker.waitForDeployment();

    // Authorize actors
    await supplyChainTracker.authorizeActor(actor1.address, true);
    await supplyChainTracker.authorizeActor(actor2.address, true);

    // Generate a test certificate ID
    certificateId = ethers.encodeBytes32String("CERT-2025-001");
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await supplyChainTracker.owner()).to.equal(owner.address);
    });

    it("Should initialize with zero events and shipments", async function () {
      expect(await supplyChainTracker.totalEvents()).to.equal(0);
      expect(await supplyChainTracker.totalShipments()).to.equal(0);
    });
  });

  describe("Actor Authorization", function () {
    it("Should authorize and deauthorize actors", async function () {
      expect(await supplyChainTracker.authorizedActors(actor1.address)).to.be.true;

      await supplyChainTracker.authorizeActor(actor1.address, false);
      expect(await supplyChainTracker.authorizedActors(actor1.address)).to.be.false;
    });

    it("Should only allow owner to authorize actors", async function () {
      await expect(
        supplyChainTracker.connect(actor1).authorizeActor(unauthorizedActor.address, true)
      ).to.be.revertedWithCustomError(supplyChainTracker, "OwnableUnauthorizedAccount");
    });
  });

  describe("Supply Chain Events", function () {
    it("Should add a supply chain event", async function () {
      const location = {
        latitude: 20659700, // 20.6597 * 10^6
        longitude: -103349600, // -103.3496 * 10^6
        locationName: "Guadalajara, Jalisco",
        country: "MX"
      };

      await supplyChainTracker.connect(actor1).addSupplyChainEvent(
        certificateId,
        0, // PRODUCTION_STARTED
        location,
        "Production Facility",
        "Production started",
        "ipfs://QmTest123",
        "0x00",
        '{"batchNumber": "BATCH-001"}'
      );

      const events = await supplyChainTracker.getSupplyChainHistory(certificateId);
      expect(events.length).to.equal(1);
      expect(events[0].eventType).to.equal(0);
      expect(events[0].actorName).to.equal("Production Facility");
      expect(events[0].location.country).to.equal("MX");
    });

    it("Should not allow unauthorized actors to add events", async function () {
      const location = {
        latitude: 20659700,
        longitude: -103349600,
        locationName: "Guadalajara",
        country: "MX"
      };

      await expect(
        supplyChainTracker.connect(unauthorizedActor).addSupplyChainEvent(
          certificateId,
          0,
          location,
          "Unauthorized",
          "Test",
          "",
          "0x00",
          ""
        )
      ).to.be.revertedWith("Not authorized actor");
    });

    it("Should track event counts by type", async function () {
      const location = {
        latitude: 20659700,
        longitude: -103349600,
        locationName: "Test Location",
        country: "MX"
      };

      // Add PRODUCTION_STARTED event
      await supplyChainTracker.connect(actor1).addSupplyChainEvent(
        certificateId,
        0, // PRODUCTION_STARTED
        location,
        "Actor",
        "Description",
        "",
        "0x00",
        ""
      );

      // Add another PRODUCTION_STARTED event
      await supplyChainTracker.connect(actor1).addSupplyChainEvent(
        certificateId,
        0, // PRODUCTION_STARTED
        location,
        "Actor",
        "Description 2",
        "",
        "0x00",
        ""
      );

      // Add QUALITY_CONTROL event
      await supplyChainTracker.connect(actor1).addSupplyChainEvent(
        certificateId,
        1, // QUALITY_CONTROL
        location,
        "Lab",
        "QC Passed",
        "",
        "0x00",
        ""
      );

      expect(await supplyChainTracker.eventCounts(certificateId, 0)).to.equal(2);
      expect(await supplyChainTracker.eventCounts(certificateId, 1)).to.equal(1);
    });
  });

  describe("Shipment Management", function () {
    it("Should create a shipment", async function () {
      const origin = {
        latitude: 20659700,
        longitude: -103349600,
        locationName: "Guadalajara",
        country: "MX"
      };

      const destination = {
        latitude: 37387500,
        longitude: -122057500,
        locationName: "Silicon Valley",
        country: "US"
      };

      const estimatedArrival = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60; // 7 days

      await supplyChainTracker.connect(actor1).createShipment(
        certificateId,
        "DHL Express",
        "DHL-123456",
        origin,
        destination,
        estimatedArrival
      );

      const shipment = await supplyChainTracker.getShipmentDetails(certificateId);
      expect(shipment.carrier).to.equal("DHL Express");
      expect(shipment.trackingNumber).to.equal("DHL-123456");
      expect(shipment.isActive).to.be.true;
      expect(shipment.origin.country).to.equal("MX");
      expect(shipment.destination.country).to.equal("US");
    });

    it("Should not allow creating duplicate shipments", async function () {
      const location = {
        latitude: 20659700,
        longitude: -103349600,
        locationName: "Test",
        country: "MX"
      };

      await supplyChainTracker.connect(actor1).createShipment(
        certificateId,
        "Carrier",
        "TRACK-001",
        location,
        location,
        Math.floor(Date.now() / 1000) + 86400
      );

      await expect(
        supplyChainTracker.connect(actor1).createShipment(
          certificateId,
          "Carrier2",
          "TRACK-002",
          location,
          location,
          Math.floor(Date.now() / 1000) + 86400
        )
      ).to.be.revertedWith("Shipment already exists");
    });

    it("Should update shipment location", async function () {
      const location = {
        latitude: 20659700,
        longitude: -103349600,
        locationName: "Origin",
        country: "MX"
      };

      // Create shipment first
      await supplyChainTracker.connect(actor1).createShipment(
        certificateId,
        "Carrier",
        "TRACK-001",
        location,
        location,
        Math.floor(Date.now() / 1000) + 86400
      );

      // Update location
      const newLocation = {
        latitude: 25686600,
        longitude: -100316100,
        locationName: "Monterrey",
        country: "MX"
      };

      await supplyChainTracker.connect(actor1).updateShipmentLocation(
        certificateId,
        newLocation
      );

      const currentLocation = await supplyChainTracker.getCurrentLocation(certificateId);
      expect(currentLocation.locationName).to.equal("Monterrey");
    });

    it("Should complete delivery", async function () {
      const location = {
        latitude: 20659700,
        longitude: -103349600,
        locationName: "Test",
        country: "MX"
      };

      // Create shipment
      await supplyChainTracker.connect(actor1).createShipment(
        certificateId,
        "Carrier",
        "TRACK-001",
        location,
        location,
        Math.floor(Date.now() / 1000) + 86400
      );

      // Complete delivery
      await supplyChainTracker.connect(actor1).completeDelivery(
        certificateId,
        actor2.address,
        location,
        "POD-123456"
      );

      const shipment = await supplyChainTracker.getShipmentDetails(certificateId);
      expect(shipment.isActive).to.be.false;
      expect(shipment.actualArrival).to.be.gt(0);
    });
  });

  describe("Quality Control", function () {
    it("Should record quality control", async function () {
      await supplyChainTracker.connect(actor1).recordQualityControl(
        certificateId,
        "Test Lab Inc",
        "ISO-9001",
        true, // passed
        "ipfs://QmTestResults",
        "QC-CERT-001"
      );

      const qcRecords = await supplyChainTracker.getQualityControls(certificateId);
      expect(qcRecords.length).to.equal(1);
      expect(qcRecords[0].labName).to.equal("Test Lab Inc");
      expect(qcRecords[0].passed).to.be.true;
      expect(qcRecords[0].certificateNumber).to.equal("QC-CERT-001");
    });

    it("Should record failed quality control", async function () {
      await supplyChainTracker.connect(actor1).recordQualityControl(
        certificateId,
        "Test Lab Inc",
        "ISO-9001",
        false, // failed
        "ipfs://QmFailedResults",
        "QC-FAIL-001"
      );

      const qcRecords = await supplyChainTracker.getQualityControls(certificateId);
      expect(qcRecords[0].passed).to.be.false;
    });
  });

  describe("Customs Clearance", function () {
    it("Should record export customs clearance", async function () {
      await supplyChainTracker.connect(actor1).recordCustomsClearance(
        certificateId,
        "MX",
        "Aduana Manzanillo",
        "EXP-2025-001",
        true, // isExport
        "854140",
        1000,
        "USD"
      );

      const clearances = await supplyChainTracker.getCustomsClearances(certificateId);
      expect(clearances.length).to.equal(1);
      expect(clearances[0].isExport).to.be.true;
      expect(clearances[0].country).to.equal("MX");
      expect(clearances[0].declarationNumber).to.equal("EXP-2025-001");
    });

    it("Should record import customs clearance", async function () {
      await supplyChainTracker.connect(actor1).recordCustomsClearance(
        certificateId,
        "US",
        "US Customs LA",
        "IMP-2025-001",
        false, // isImport
        "854140",
        500,
        "USD"
      );

      const clearances = await supplyChainTracker.getCustomsClearances(certificateId);
      expect(clearances[0].isExport).to.be.false;
    });
  });

  describe("Incident Reporting", function () {
    it("Should report an incident", async function () {
      const location = {
        latitude: 25686600,
        longitude: -100316100,
        locationName: "Monterrey",
        country: "MX"
      };

      await supplyChainTracker.connect(actor1).reportIncident(
        certificateId,
        "DELAY",
        "Weather delay - hurricane warning",
        location,
        "ipfs://QmIncidentReport"
      );

      const events = await supplyChainTracker.getSupplyChainHistory(certificateId);
      const incidentEvent = events.find(e => e.eventType === 9); // INCIDENT_REPORTED

      expect(incidentEvent).to.not.be.undefined;
      expect(incidentEvent.description).to.include("Weather delay");
      expect(incidentEvent.metadata).to.equal("DELAY");
    });
  });

  describe("Milestone Tracking", function () {
    it("Should check if milestone is completed", async function () {
      const location = {
        latitude: 20659700,
        longitude: -103349600,
        locationName: "Test",
        country: "MX"
      };

      // Initially, no milestone completed
      expect(await supplyChainTracker.hasCompletedMilestone(certificateId, 0)).to.be.false;

      // Add PRODUCTION_STARTED event
      await supplyChainTracker.connect(actor1).addSupplyChainEvent(
        certificateId,
        0, // PRODUCTION_STARTED
        location,
        "Factory",
        "Production started",
        "",
        "0x00",
        ""
      );

      // Now milestone should be completed
      expect(await supplyChainTracker.hasCompletedMilestone(certificateId, 0)).to.be.true;

      // But QUALITY_CONTROL should still not be completed
      expect(await supplyChainTracker.hasCompletedMilestone(certificateId, 1)).to.be.false;
    });
  });

  describe("Event Status Updates", function () {
    it("Should update event status", async function () {
      const location = {
        latitude: 20659700,
        longitude: -103349600,
        locationName: "Test",
        country: "MX"
      };

      await supplyChainTracker.connect(actor1).addSupplyChainEvent(
        certificateId,
        0,
        location,
        "Actor",
        "Test",
        "",
        "0x00",
        ""
      );

      // Update status to FAILED
      await supplyChainTracker.connect(actor1).updateEventStatus(certificateId, 0, 3);

      const events = await supplyChainTracker.getSupplyChainHistory(certificateId);
      expect(events[0].status).to.equal(3); // FAILED
    });

    it("Should not allow updating non-existent event", async function () {
      await expect(
        supplyChainTracker.connect(actor1).updateEventStatus(certificateId, 999, 2)
      ).to.be.revertedWith("Invalid event index");
    });
  });

  describe("Integration Tests", function () {
    it("Should handle complete supply chain flow", async function () {
      const mexLocation = {
        latitude: 20659700,
        longitude: -103349600,
        locationName: "Guadalajara",
        country: "MX"
      };

      const usLocation = {
        latitude: 37387500,
        longitude: -122057500,
        locationName: "Silicon Valley",
        country: "US"
      };

      // 1. Start production
      await supplyChainTracker.connect(actor1).addSupplyChainEvent(
        certificateId,
        0, // PRODUCTION_STARTED
        mexLocation,
        "Factory MX",
        "Production started",
        "",
        "0x00",
        ""
      );

      // 2. Quality control
      await supplyChainTracker.connect(actor1).recordQualityControl(
        certificateId,
        "QC Lab",
        "ISO-9001",
        true,
        "ipfs://QmQC",
        "QC-001"
      );

      // 3. Packaging
      await supplyChainTracker.connect(actor1).addSupplyChainEvent(
        certificateId,
        2, // PACKAGING_COMPLETED
        mexLocation,
        "Factory MX",
        "Packaging completed",
        "",
        "0x00",
        ""
      );

      // 4. Export customs
      await supplyChainTracker.connect(actor1).recordCustomsClearance(
        certificateId,
        "MX",
        "Aduana MX",
        "EXP-001",
        true,
        "854140",
        0,
        "USD"
      );

      // 5. Create shipment
      await supplyChainTracker.connect(actor1).createShipment(
        certificateId,
        "DHL",
        "DHL-123",
        mexLocation,
        usLocation,
        Math.floor(Date.now() / 1000) + 604800
      );

      // 6. Import customs
      await supplyChainTracker.connect(actor1).recordCustomsClearance(
        certificateId,
        "US",
        "US Customs",
        "IMP-001",
        false,
        "854140",
        1000,
        "USD"
      );

      // 7. Complete delivery
      await supplyChainTracker.connect(actor1).completeDelivery(
        certificateId,
        actor2.address,
        usLocation,
        "POD-FINAL"
      );

      // Verify complete history
      const events = await supplyChainTracker.getSupplyChainHistory(certificateId);
      expect(events.length).to.be.gte(7);

      // Verify shipment completed
      const shipment = await supplyChainTracker.getShipmentDetails(certificateId);
      expect(shipment.isActive).to.be.false;

      // Verify milestones
      expect(await supplyChainTracker.hasCompletedMilestone(certificateId, 0)).to.be.true; // PRODUCTION
      expect(await supplyChainTracker.hasCompletedMilestone(certificateId, 2)).to.be.true; // PACKAGING
      expect(await supplyChainTracker.hasCompletedMilestone(certificateId, 5)).to.be.true; // SHIPMENT
      expect(await supplyChainTracker.hasCompletedMilestone(certificateId, 8)).to.be.true; // DELIVERY
    });
  });
});