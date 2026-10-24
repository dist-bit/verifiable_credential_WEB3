// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../../utils/Context.sol";
import "../../../utils/Ownable.sol";
import "../interfaces/IOriginCertificate.sol";

/**
 * @title SupplyChainTracker
 * @notice Complete tracking system for product supply chain from production to delivery
 * @dev Integrates with UniversalOriginCertificate for end-to-end traceability
 */
contract SupplyChainTracker is Context, Ownable {

    // Event types for supply chain
    enum EventType {
        PRODUCTION_STARTED,
        QUALITY_CONTROL,
        PACKAGING_COMPLETED,
        CERTIFICATION_ISSUED,
        CUSTOMS_EXPORT,
        SHIPMENT_CREATED,
        IN_TRANSIT,
        CUSTOMS_IMPORT,
        DELIVERY_COMPLETED,
        INCIDENT_REPORTED
    }

    // Status of each event
    enum EventStatus {
        PENDING,
        IN_PROGRESS,
        COMPLETED,
        FAILED,
        CANCELLED
    }

    // GPS Coordinates
    struct Location {
        int256 latitude;  // Stored as degrees * 10^6 for precision
        int256 longitude; // Stored as degrees * 10^6 for precision
        string locationName;
        string country;
    }

    // Supply chain event/milestone
    struct SupplyChainEvent {
        uint256 eventId;
        bytes32 certificateId;
        EventType eventType;
        EventStatus status;
        uint256 timestamp;
        Location location;
        address actor;
        string actorName;
        string description;
        string documentHash; // IPFS hash for supporting documents
        bytes signature;     // Digital signature of the event
        string metadata;     // JSON string for additional data
    }

    // Shipment information
    struct Shipment {
        bytes32 certificateId;
        string carrier;
        string trackingNumber;
        string vesselNumber;    // For maritime
        string flightNumber;    // For air freight
        string containerNumber; // For containers
        uint256 departureTime;
        uint256 estimatedArrival;
        uint256 actualArrival;
        Location origin;
        Location destination;
        Location[] checkpoints; // Intermediate stops
        bool isActive;
    }

    // Quality control data
    struct QualityControl {
        bytes32 certificateId;
        string labName;
        string labCertification;
        uint256 testDate;
        bool passed;
        string testResults; // IPFS hash
        string certificateNumber;
        address verifier;
    }

    // Customs clearance data
    struct CustomsClearance {
        bytes32 certificateId;
        string country;
        string customsOffice;
        string declarationNumber;
        uint256 clearanceDate;
        bool isExport; // true for export, false for import
        string tariffCode;
        uint256 dutyPaid;
        string currency;
        address customsOfficer;
    }

    // Storage mappings
    mapping(bytes32 => SupplyChainEvent[]) public certificateEvents;
    mapping(bytes32 => Shipment) public shipments;
    mapping(bytes32 => QualityControl[]) public qualityControls;
    mapping(bytes32 => CustomsClearance[]) public customsClearances;
    mapping(bytes32 => mapping(EventType => uint256)) public eventCounts;
    mapping(address => bool) public authorizedActors;
    mapping(string => address[]) public carrierAgents; // carrier => authorized agents

    // Statistics
    uint256 public totalEvents;
    uint256 public totalShipments;

    // Reference to origin certificate contract
    address public originCertificateContract;

    // Events
    event SupplyChainEventAdded(
        bytes32 indexed certificateId,
        uint256 indexed eventId,
        EventType eventType,
        address actor,
        Location location
    );

    event ShipmentCreated(
        bytes32 indexed certificateId,
        string carrier,
        string trackingNumber,
        Location origin,
        Location destination
    );

    event LocationUpdated(
        bytes32 indexed certificateId,
        Location newLocation,
        uint256 timestamp
    );

    event QualityControlRecorded(
        bytes32 indexed certificateId,
        string labName,
        bool passed,
        uint256 testDate
    );

    event CustomsCleared(
        bytes32 indexed certificateId,
        string country,
        bool isExport,
        uint256 clearanceDate
    );

    event DeliveryCompleted(
        bytes32 indexed certificateId,
        address recipient,
        Location deliveryLocation,
        uint256 timestamp
    );

    event IncidentReported(
        bytes32 indexed certificateId,
        string incidentType,
        string description,
        Location location
    );

    // Modifiers
    modifier onlyAuthorized() {
        require(
            authorizedActors[_msgSender()] || owner() == _msgSender(),
            "Not authorized actor"
        );
        _;
    }

    modifier certificateExists(bytes32 certificateId) {
        if (originCertificateContract != address(0)) {
            // Verify certificate exists in origin contract
            // This would call a view function on UniversalOriginCertificate
            require(certificateId != bytes32(0), "Invalid certificate ID");
        }
        _;
    }

    constructor(address _originCertificateContract) {
        originCertificateContract = _originCertificateContract;
    }

    /**
     * @notice Add a supply chain event
     * @dev Can only be called by authorized actors
     */
    function addSupplyChainEvent(
        bytes32 certificateId,
        EventType eventType,
        Location memory location,
        string memory actorName,
        string memory description,
        string memory documentHash,
        bytes memory signature,
        string memory metadata
    ) external onlyAuthorized certificateExists(certificateId) {
        uint256 eventId = totalEvents++;

        SupplyChainEvent memory newEvent = SupplyChainEvent({
            eventId: eventId,
            certificateId: certificateId,
            eventType: eventType,
            status: EventStatus.IN_PROGRESS,
            timestamp: block.timestamp,
            location: location,
            actor: _msgSender(),
            actorName: actorName,
            description: description,
            documentHash: documentHash,
            signature: signature,
            metadata: metadata
        });

        certificateEvents[certificateId].push(newEvent);
        eventCounts[certificateId][eventType]++;

        emit SupplyChainEventAdded(
            certificateId,
            eventId,
            eventType,
            _msgSender(),
            location
        );
    }

    /**
     * @notice Create a shipment for a certificate
     */
    function createShipment(
        bytes32 certificateId,
        string memory carrier,
        string memory trackingNumber,
        Location memory origin,
        Location memory destination,
        uint256 estimatedArrival
    ) external onlyAuthorized certificateExists(certificateId) {
        require(!shipments[certificateId].isActive, "Shipment already exists");

        Shipment storage shipment = shipments[certificateId];
        shipment.certificateId = certificateId;
        shipment.carrier = carrier;
        shipment.trackingNumber = trackingNumber;
        shipment.origin = origin;
        shipment.destination = destination;
        shipment.departureTime = block.timestamp;
        shipment.estimatedArrival = estimatedArrival;
        shipment.isActive = true;

        totalShipments++;

        // Add shipment created event
        _addEventInternal(
            certificateId,
            EventType.SHIPMENT_CREATED,
            origin,
            carrier,
            "Shipment created",
            "",
            ""
        );

        emit ShipmentCreated(
            certificateId,
            carrier,
            trackingNumber,
            origin,
            destination
        );
    }

    /**
     * @notice Update shipment location (for tracking)
     */
    function updateShipmentLocation(
        bytes32 certificateId,
        Location memory newLocation
    ) external onlyAuthorized {
        require(shipments[certificateId].isActive, "No active shipment");

        shipments[certificateId].checkpoints.push(newLocation);

        // Add in-transit event
        _addEventInternal(
            certificateId,
            EventType.IN_TRANSIT,
            newLocation,
            shipments[certificateId].carrier,
            "Location update",
            "",
            ""
        );

        emit LocationUpdated(certificateId, newLocation, block.timestamp);
    }

    /**
     * @notice Record quality control test
     */
    function recordQualityControl(
        bytes32 certificateId,
        string memory labName,
        string memory labCertification,
        bool passed,
        string memory testResults,
        string memory certificateNumber
    ) external onlyAuthorized certificateExists(certificateId) {
        QualityControl memory qc = QualityControl({
            certificateId: certificateId,
            labName: labName,
            labCertification: labCertification,
            testDate: block.timestamp,
            passed: passed,
            testResults: testResults,
            certificateNumber: certificateNumber,
            verifier: _msgSender()
        });

        qualityControls[certificateId].push(qc);

        // Add QC event
        Location memory labLocation; // Would be passed as parameter in production
        _addEventInternal(
            certificateId,
            EventType.QUALITY_CONTROL,
            labLocation,
            labName,
            passed ? "Quality control passed" : "Quality control failed",
            testResults,
            ""
        );

        emit QualityControlRecorded(certificateId, labName, passed, block.timestamp);
    }

    /**
     * @notice Record customs clearance
     */
    function recordCustomsClearance(
        bytes32 certificateId,
        string memory country,
        string memory customsOffice,
        string memory declarationNumber,
        bool isExport,
        string memory tariffCode,
        uint256 dutyPaid,
        string memory currency
    ) external onlyAuthorized certificateExists(certificateId) {
        CustomsClearance memory clearance = CustomsClearance({
            certificateId: certificateId,
            country: country,
            customsOffice: customsOffice,
            declarationNumber: declarationNumber,
            clearanceDate: block.timestamp,
            isExport: isExport,
            tariffCode: tariffCode,
            dutyPaid: dutyPaid,
            currency: currency,
            customsOfficer: _msgSender()
        });

        customsClearances[certificateId].push(clearance);

        // Add customs event
        Location memory customsLocation; // Would be passed as parameter
        _addEventInternal(
            certificateId,
            isExport ? EventType.CUSTOMS_EXPORT : EventType.CUSTOMS_IMPORT,
            customsLocation,
            customsOffice,
            isExport ? "Export customs cleared" : "Import customs cleared",
            declarationNumber,
            ""
        );

        emit CustomsCleared(certificateId, country, isExport, block.timestamp);
    }

    /**
     * @notice Complete delivery of shipment
     */
    function completeDelivery(
        bytes32 certificateId,
        address recipient,
        Location memory deliveryLocation,
        string memory proofOfDelivery
    ) external onlyAuthorized {
        require(shipments[certificateId].isActive, "No active shipment");

        Shipment storage shipment = shipments[certificateId];
        shipment.actualArrival = block.timestamp;
        shipment.isActive = false;

        // Add delivery event
        _addEventInternal(
            certificateId,
            EventType.DELIVERY_COMPLETED,
            deliveryLocation,
            "Recipient",
            "Delivery completed",
            proofOfDelivery,
            ""
        );

        // Update last event status to completed
        uint256 lastIndex = certificateEvents[certificateId].length - 1;
        certificateEvents[certificateId][lastIndex].status = EventStatus.COMPLETED;

        emit DeliveryCompleted(
            certificateId,
            recipient,
            deliveryLocation,
            block.timestamp
        );
    }

    /**
     * @notice Report an incident in the supply chain
     */
    function reportIncident(
        bytes32 certificateId,
        string memory incidentType,
        string memory description,
        Location memory location,
        string memory documentHash
    ) external onlyAuthorized {
        _addEventInternal(
            certificateId,
            EventType.INCIDENT_REPORTED,
            location,
            "Incident Reporter",
            description,
            documentHash,
            incidentType
        );

        emit IncidentReported(
            certificateId,
            incidentType,
            description,
            location
        );
    }

    /**
     * @notice Get complete supply chain history for a certificate
     */
    function getSupplyChainHistory(bytes32 certificateId)
        external
        view
        returns (SupplyChainEvent[] memory)
    {
        return certificateEvents[certificateId];
    }

    /**
     * @notice Get shipment details
     */
    function getShipmentDetails(bytes32 certificateId)
        external
        view
        returns (Shipment memory)
    {
        return shipments[certificateId];
    }

    /**
     * @notice Get all quality control records
     */
    function getQualityControls(bytes32 certificateId)
        external
        view
        returns (QualityControl[] memory)
    {
        return qualityControls[certificateId];
    }

    /**
     * @notice Get all customs clearances
     */
    function getCustomsClearances(bytes32 certificateId)
        external
        view
        returns (CustomsClearance[] memory)
    {
        return customsClearances[certificateId];
    }

    /**
     * @notice Update event status
     */
    function updateEventStatus(
        bytes32 certificateId,
        uint256 eventIndex,
        EventStatus newStatus
    ) external onlyAuthorized {
        require(eventIndex < certificateEvents[certificateId].length, "Invalid event index");
        certificateEvents[certificateId][eventIndex].status = newStatus;
    }

    /**
     * @notice Authorize an actor to add events
     */
    function authorizeActor(address actor, bool authorized) external onlyOwner {
        authorizedActors[actor] = authorized;
    }

    /**
     * @notice Authorize carrier agents
     */
    function authorizeCarrierAgent(
        string memory carrier,
        address agent,
        bool authorized
    ) external onlyOwner {
        if (authorized) {
            carrierAgents[carrier].push(agent);
            authorizedActors[agent] = true;
        } else {
            // Remove agent logic would go here
            authorizedActors[agent] = false;
        }
    }

    /**
     * @notice Internal function to add events
     */
    function _addEventInternal(
        bytes32 certificateId,
        EventType eventType,
        Location memory location,
        string memory actorName,
        string memory description,
        string memory documentHash,
        string memory metadata
    ) private {
        uint256 eventId = totalEvents++;

        SupplyChainEvent memory newEvent = SupplyChainEvent({
            eventId: eventId,
            certificateId: certificateId,
            eventType: eventType,
            status: EventStatus.COMPLETED,
            timestamp: block.timestamp,
            location: location,
            actor: _msgSender(),
            actorName: actorName,
            description: description,
            documentHash: documentHash,
            signature: "",
            metadata: metadata
        });

        certificateEvents[certificateId].push(newEvent);
        eventCounts[certificateId][eventType]++;
    }

    /**
     * @notice Check if certificate has completed specific milestones
     */
    function hasCompletedMilestone(
        bytes32 certificateId,
        EventType eventType
    ) external view returns (bool) {
        SupplyChainEvent[] memory events = certificateEvents[certificateId];
        for (uint i = 0; i < events.length; i++) {
            if (events[i].eventType == eventType &&
                events[i].status == EventStatus.COMPLETED) {
                return true;
            }
        }
        return false;
    }

    /**
     * @notice Get current location of shipment
     */
    function getCurrentLocation(bytes32 certificateId)
        external
        view
        returns (Location memory)
    {
        Shipment memory shipment = shipments[certificateId];
        if (shipment.checkpoints.length > 0) {
            return shipment.checkpoints[shipment.checkpoints.length - 1];
        }
        return shipment.origin;
    }
}