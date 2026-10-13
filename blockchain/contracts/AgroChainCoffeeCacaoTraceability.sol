// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./AgroChainCertificacoes.sol";

/**
 * @title  AgroChainCoffeeCacaoTraceability
 * @notice Specialized traceability system for Coffee (Arabica, Robusta/Conilon) and Cacao 
 *         with ZK certification, EUDR compliance, and escrow payment system.
 *
 * @dev    This contract focuses exclusively on Coffee and Cacao supply chains with:
 *         - Coffee varieties: Arabica, Robusta (Conilon)
 *         - Cacao: All varieties with EUDR compliance
 *         - Integration with CoffeeCacaoSwap DEX for tokenized trading
 *         - ZK certification via AgroChainCertificacoes
 *         - Geographic origin validation for EUDR (31/12/2020 cutoff)
 *
 * COFFEE & CACAO DESIGN PRINCIPLES
 * ---------------------------------
 * 1) EUDR Compliance First: All Coffee and Cacao must prove deforestation-free origin
 * 2) Varietal Specificity: Track Coffee (Arabica vs Robusta) and Cacao separately
 * 3) Terroir Mapping: Geographic origin linked to flavor profiles and certifications  
 * 4) Quality Scoring: SCA cupping scores for Coffee, quality metrics for Cacao
 * 5) Tokenization Ready: Batches can be tokenized for CoffeeCacaoSwap trading
 */
contract AgroChainCoffeeCacaoTraceability {

    // =====================================================================
    // COFFEE & CACAO TYPES AND STRUCTURES
    // =====================================================================

    enum Role { NONE, COFFEE_PRODUCER, CACAO_PRODUCER, COOPERATIVE, ROASTER, CHOCOLATE_MAKER, CERTIFIER, AUDITOR }
    enum CoffeeVariety { ARABICA, ROBUSTA_CONILON }
    enum CacaoVariety { CRIOLLO, FORASTERO, TRINITARIO, NACIONAL }
    enum ProcessingMethod { 
        // Coffee
        WASHED, NATURAL, HONEY, WET_HULLED,
        // Cacao  
        FERMENTED, DRIED, ROASTED_BEANS
    }
    enum BatchStatus { REGISTERED, CERTIFIED, AVAILABLE, IN_CONTRACT, SOLD, CONSUMED, BLOCKED_EUDR }
    enum ContractStage { PROPOSAL, ESCROW, SHIPMENT, RECEIVED, PAYMENT, LOCKED, COMPLETED }

    struct CoffeeEvent {
        uint256 id;
        bytes32 batchId;
        string eventType;       // HARVEST, PULPING, FERMENTATION, DRYING, CUPPING, GRADING
        address author;
        bytes32 documentHash;   // IPFS hash of photo/document proof
        int64 latitude;         // Geographic coordinates for EUDR
        int64 longitude;
        uint256 timestamp;
        uint256 scaScore;      // SCA cupping score (0-100)
    }

    struct CacaoEvent {
        uint256 id;
        bytes32 batchId;
        string eventType;       // HARVEST, FERMENTATION, DRYING, QUALITY_TEST
        address author;
        bytes32 documentHash;
        int64 latitude;
        int64 longitude; 
        uint256 timestamp;
        uint256 qualityScore;   // Cacao quality score (0-100)
    }

    struct CoffeeBatch {
        bytes32 id;
        address producer;
        CoffeeVariety variety;
        ProcessingMethod processing;
        uint256 weightKg;
        string farmName;
        string region;          // e.g., "Cerrado", "Sul de Minas", "Caparaó"
        bytes32 geoJsonHash;    // Hash of farm polygon GeoJSON for EUDR
        BatchStatus status;
        uint256 harvestDate;
        uint256 scaScore;       // Final SCA cupping score
        bool eudrCompliant;     // EUDR deforestation-free certification
        bytes32 certificationId; // Link to AgroChainCertificacoes
        uint256 pricePerKg;     // Price in wei per kg
        address tokenAddress;   // ERC20 token address if tokenized
        uint256 tokenSupply;    // Total tokens minted for this batch
    }

    struct CacaoBatch {
        bytes32 id;
        address producer;
        CacaoVariety variety;
        ProcessingMethod processing;
        uint256 weightKg;
        string farmName;
        string region;          // e.g., "Bahia", "Pará", "Ecuador", "Madagascar"
        bytes32 geoJsonHash;
        BatchStatus status;
        uint256 harvestDate;
        uint256 qualityScore;   // Cacao quality assessment
        bool eudrCompliant;
        bytes32 certificationId;
        uint256 pricePerKg;
        address tokenAddress;
        uint256 tokenSupply;
    }

    struct EscrowContract {
        bytes32 id;
        bytes32 batchId;        // Coffee or Cacao batch
        address buyer;
        address seller;
        uint256 totalValue;
        uint256 weightExpected;
        uint256 weightReceived;
        ContractStage stage;
        uint256 escrowAmount;
        uint256 tolerancePercent; // Weight tolerance (e.g., 0.5%)
        uint256 createdAt;
        uint256 deadline;
        bool isCoffee;          // true for Coffee, false for Cacao
    }

    // =====================================================================
    // STATE VARIABLES
    // =====================================================================

    AgroChainCertificacoes public certificationsContract;
    
    mapping(address => Role) public roles;
    
    // Coffee tracking
    mapping(bytes32 => CoffeeBatch) public coffeeBatches;
    mapping(bytes32 => CoffeeEvent[]) public coffeeEvents;
    mapping(address => bytes32[]) public producerCoffeeBatches;
    
    // Cacao tracking
    mapping(bytes32 => CacaoBatch) public cacaoBatches;
    mapping(bytes32 => CacaoEvent[]) public cacaoEvents;
    mapping(address => bytes32[]) public producerCacaoBatches;
    
    // Escrow contracts
    mapping(bytes32 => EscrowContract) public escrowContracts;
    mapping(address => bytes32[]) public buyerContracts;
    mapping(address => bytes32[]) public sellerContracts;

    // Counters
    uint256 public coffeeEventCounter;
    uint256 public cacaoEventCounter;
    uint256 public contractCounter;

    // EUDR compliance settings
    uint256 public constant EUDR_CUTOFF_DATE = 1609459200; // January 1, 2021 UTC
    uint256 public constant MIN_SCA_SCORE = 80; // Minimum SCA score for specialty coffee
    uint256 public constant MIN_CACAO_QUALITY = 75; // Minimum quality score for premium cacao

    // =====================================================================
    // EVENTS
    // =====================================================================

    event CoffeeProducerRegistered(address indexed producer, string farmName, string region);
    event CacaoProducerRegistered(address indexed producer, string farmName, string region);
    
    event CoffeeBatchRegistered(
        bytes32 indexed batchId,
        address indexed producer,
        CoffeeVariety variety,
        uint256 weightKg,
        string region,
        bool eudrCompliant
    );
    
    event CacaoBatchRegistered(
        bytes32 indexed batchId,
        address indexed producer,
        CacaoVariety variety,
        uint256 weightKg,
        string region,
        bool eudrCompliant
    );

    event CoffeeEventRegistered(
        uint256 indexed eventId,
        bytes32 indexed batchId,
        address indexed author,
        string eventType,
        uint256 scaScore
    );

    event CacaoEventRegistered(
        uint256 indexed eventId,
        bytes32 indexed batchId,
        address indexed author,
        string eventType,
        uint256 qualityScore
    );

    event CoffeeBatchCertified(
        bytes32 indexed batchId,
        bytes32 indexed certificationId,
        uint256 scaScore
    );

    event CacaoBatchCertified(
        bytes32 indexed batchId,
        bytes32 indexed certificationId,
        uint256 qualityScore
    );

    event BatchTokenized(
        bytes32 indexed batchId,
        address indexed tokenAddress,
        uint256 tokenSupply,
        bool isCoffee
    );

    event EUDRViolationDetected(
        bytes32 indexed batchId,
        address indexed producer,
        string violation,
        bool isCoffee
    );

    event EscrowContractCreated(
        bytes32 indexed contractId,
        bytes32 indexed batchId,
        address indexed buyer,
        address seller,
        uint256 totalValue,
        bool isCoffee
    );

    event ContractStageAdvanced(
        bytes32 indexed contractId,
        ContractStage newStage,
        uint256 timestamp
    );

    // =====================================================================
    // MODIFIERS
    // =====================================================================

    modifier onlyRole(Role _role) {
        require(roles[msg.sender] == _role, "AgroChain: Unauthorized role");
        _;
    }

    modifier onlyCoffeeProducer() {
        require(roles[msg.sender] == Role.COFFEE_PRODUCER, "AgroChain: Not a coffee producer");
        _;
    }

    modifier onlyCacaoProducer() {
        require(roles[msg.sender] == Role.CACAO_PRODUCER, "AgroChain: Not a cacao producer");
        _;
    }

    modifier onlyCertifier() {
        require(roles[msg.sender] == Role.CERTIFIER, "AgroChain: Not a certifier");
        _;
    }

    modifier validCoffeeBatch(bytes32 _batchId) {
        require(coffeeBatches[_batchId].producer != address(0), "AgroChain: Coffee batch not found");
        _;
    }

    modifier validCacaoBatch(bytes32 _batchId) {
        require(cacaoBatches[_batchId].producer != address(0), "AgroChain: Cacao batch not found");
        _;
    }

    // =====================================================================
    // CONSTRUCTOR
    // =====================================================================

    constructor(address _certificationsContract) {
        certificationsContract = AgroChainCertificacoes(_certificationsContract);
        roles[msg.sender] = Role.AUDITOR; // Contract deployer is auditor
    }

    // =====================================================================
    // ROLE MANAGEMENT
    // =====================================================================

    function setRole(address _user, Role _role) external onlyRole(Role.AUDITOR) {
        roles[_user] = _role;
        
        if (_role == Role.COFFEE_PRODUCER) {
            emit CoffeeProducerRegistered(_user, "", "");
        } else if (_role == Role.CACAO_PRODUCER) {
            emit CacaoProducerRegistered(_user, "", "");
        }
    }

    // =====================================================================
    // COFFEE BATCH MANAGEMENT
    // =====================================================================

    function registerCoffeeBatch(
        string memory _farmName,
        string memory _region,
        CoffeeVariety _variety,
        ProcessingMethod _processing,
        uint256 _weightKg,
        bytes32 _geoJsonHash,
        bool _eudrCompliant
    ) external onlyCoffeeProducer returns (bytes32) {
        
        bytes32 batchId = keccak256(abi.encodePacked(
            msg.sender,
            _farmName,
            block.timestamp,
            _weightKg
        ));

        require(coffeeBatches[batchId].producer == address(0), "AgroChain: Coffee batch already exists");

        coffeeBatches[batchId] = CoffeeBatch({
            id: batchId,
            producer: msg.sender,
            variety: _variety,
            processing: _processing,
            weightKg: _weightKg,
            farmName: _farmName,
            region: _region,
            geoJsonHash: _geoJsonHash,
            status: BatchStatus.REGISTERED,
            harvestDate: block.timestamp,
            scaScore: 0,
            eudrCompliant: _eudrCompliant,
            certificationId: bytes32(0),
            pricePerKg: 0,
            tokenAddress: address(0),
            tokenSupply: 0
        });

        producerCoffeeBatches[msg.sender].push(batchId);

        emit CoffeeBatchRegistered(
            batchId,
            msg.sender,
            _variety,
            _weightKg,
            _region,
            _eudrCompliant
        );

        return batchId;
    }

    function addCoffeeEvent(
        bytes32 _batchId,
        string memory _eventType,
        bytes32 _documentHash,
        int64 _latitude,
        int64 _longitude,
        uint256 _scaScore
    ) external validCoffeeBatch(_batchId) {
        
        CoffeeBatch storage batch = coffeeBatches[_batchId];
        require(
            msg.sender == batch.producer || 
            roles[msg.sender] == Role.COOPERATIVE ||
            roles[msg.sender] == Role.CERTIFIER,
            "AgroChain: Not authorized for this coffee batch"
        );

        coffeeEventCounter++;
        
        CoffeeEvent memory newEvent = CoffeeEvent({
            id: coffeeEventCounter,
            batchId: _batchId,
            eventType: _eventType,
            author: msg.sender,
            documentHash: _documentHash,
            latitude: _latitude,
            longitude: _longitude,
            timestamp: block.timestamp,
            scaScore: _scaScore
        });

        coffeeEvents[_batchId].push(newEvent);

        // Update batch SCA score if this is a cupping event
        if (keccak256(bytes(_eventType)) == keccak256(bytes("CUPPING")) && _scaScore > batch.scaScore) {
            batch.scaScore = _scaScore;
        }

        emit CoffeeEventRegistered(
            coffeeEventCounter,
            _batchId,
            msg.sender,
            _eventType,
            _scaScore
        );
    }

    // =====================================================================
    // CACAO BATCH MANAGEMENT
    // =====================================================================

    function registerCacaoBatch(
        string memory _farmName,
        string memory _region,
        CacaoVariety _variety,
        ProcessingMethod _processing,
        uint256 _weightKg,
        bytes32 _geoJsonHash,
        bool _eudrCompliant
    ) external onlyCacaoProducer returns (bytes32) {
        
        bytes32 batchId = keccak256(abi.encodePacked(
            msg.sender,
            _farmName,
            block.timestamp,
            _weightKg
        ));

        require(cacaoBatches[batchId].producer == address(0), "AgroChain: Cacao batch already exists");

        cacaoBatches[batchId] = CacaoBatch({
            id: batchId,
            producer: msg.sender,
            variety: _variety,
            processing: _processing,
            weightKg: _weightKg,
            farmName: _farmName,
            region: _region,
            geoJsonHash: _geoJsonHash,
            status: BatchStatus.REGISTERED,
            harvestDate: block.timestamp,
            qualityScore: 0,
            eudrCompliant: _eudrCompliant,
            certificationId: bytes32(0),
            pricePerKg: 0,
            tokenAddress: address(0),
            tokenSupply: 0
        });

        producerCacaoBatches[msg.sender].push(batchId);

        emit CacaoBatchRegistered(
            batchId,
            msg.sender,
            _variety,
            _weightKg,
            _region,
            _eudrCompliant
        );

        return batchId;
    }

    function addCacaoEvent(
        bytes32 _batchId,
        string memory _eventType,
        bytes32 _documentHash,
        int64 _latitude,
        int64 _longitude,
        uint256 _qualityScore
    ) external validCacaoBatch(_batchId) {
        
        CacaoBatch storage batch = cacaoBatches[_batchId];
        require(
            msg.sender == batch.producer || 
            roles[msg.sender] == Role.COOPERATIVE ||
            roles[msg.sender] == Role.CERTIFIER,
            "AgroChain: Not authorized for this cacao batch"
        );

        cacaoEventCounter++;
        
        CacaoEvent memory newEvent = CacaoEvent({
            id: cacaoEventCounter,
            batchId: _batchId,
            eventType: _eventType,
            author: msg.sender,
            documentHash: _documentHash,
            latitude: _latitude,
            longitude: _longitude,
            timestamp: block.timestamp,
            qualityScore: _qualityScore
        });

        cacaoEvents[_batchId].push(newEvent);

        // Update batch quality score
        if (_qualityScore > batch.qualityScore) {
            batch.qualityScore = _qualityScore;
        }

        emit CacaoEventRegistered(
            cacaoEventCounter,
            _batchId,
            msg.sender,
            _eventType,
            _qualityScore
        );
    }

    // =====================================================================
    // CERTIFICATION INTEGRATION
    // =====================================================================

    function certifyCoffeeBatch(
        bytes32 _batchId,
        bytes32 _certificationId
    ) external onlyCertifier validCoffeeBatch(_batchId) {
        
        // Verify certification exists in AgroChainCertificacoes
        require(
            certificationsContract.certificacaoValida(_certificationId),
            "AgroChain: Invalid certification ID"
        );

        CoffeeBatch storage batch = coffeeBatches[_batchId];
        
        // Check minimum quality requirements
        require(batch.scaScore >= MIN_SCA_SCORE, "AgroChain: Coffee SCA score too low");
        require(batch.eudrCompliant, "AgroChain: Coffee batch not EUDR compliant");

        batch.certificationId = _certificationId;
        batch.status = BatchStatus.CERTIFIED;

        emit CoffeeBatchCertified(_batchId, _certificationId, batch.scaScore);
    }

    function certifyCacaoBatch(
        bytes32 _batchId,
        bytes32 _certificationId
    ) external onlyCertifier validCacaoBatch(_batchId) {
        
        require(
            certificationsContract.certificacaoValida(_certificationId),
            "AgroChain: Invalid certification ID"
        );

        CacaoBatch storage batch = cacaoBatches[_batchId];
        
        require(batch.qualityScore >= MIN_CACAO_QUALITY, "AgroChain: Cacao quality score too low");
        require(batch.eudrCompliant, "AgroChain: Cacao batch not EUDR compliant");

        batch.certificationId = _certificationId;
        batch.status = BatchStatus.CERTIFIED;

        emit CacaoBatchCertified(_batchId, _certificationId, batch.qualityScore);
    }

    // =====================================================================
    // TOKENIZATION SUPPORT (FOR COFFECACAOSWAP INTEGRATION)
    // =====================================================================

    function tokenizeCoffeeBatch(
        bytes32 _batchId,
        address _tokenAddress,
        uint256 _tokenSupply
    ) external validCoffeeBatch(_batchId) {
        
        CoffeeBatch storage batch = coffeeBatches[_batchId];
        require(msg.sender == batch.producer, "AgroChain: Only producer can tokenize");
        require(batch.status == BatchStatus.CERTIFIED, "AgroChain: Batch must be certified first");
        require(batch.tokenAddress == address(0), "AgroChain: Batch already tokenized");

        batch.tokenAddress = _tokenAddress;
        batch.tokenSupply = _tokenSupply;
        batch.status = BatchStatus.AVAILABLE;

        emit BatchTokenized(_batchId, _tokenAddress, _tokenSupply, true);
    }

    function tokenizeCacaoBatch(
        bytes32 _batchId,
        address _tokenAddress,
        uint256 _tokenSupply
    ) external validCacaoBatch(_batchId) {
        
        CacaoBatch storage batch = cacaoBatches[_batchId];
        require(msg.sender == batch.producer, "AgroChain: Only producer can tokenize");
        require(batch.status == BatchStatus.CERTIFIED, "AgroChain: Batch must be certified first");
        require(batch.tokenAddress == address(0), "AgroChain: Batch already tokenized");

        batch.tokenAddress = _tokenAddress;
        batch.tokenSupply = _tokenSupply;
        batch.status = BatchStatus.AVAILABLE;

        emit BatchTokenized(_batchId, _tokenAddress, _tokenSupply, false);
    }

    // =====================================================================
    // EUDR COMPLIANCE FUNCTIONS
    // =====================================================================

    function validateEUDRCompliance(bytes32 _batchId, bool _isCoffee) external view returns (bool) {
        if (_isCoffee) {
            CoffeeBatch memory batch = coffeeBatches[_batchId];
            return batch.eudrCompliant && batch.harvestDate >= EUDR_CUTOFF_DATE;
        } else {
            CacaoBatch memory batch = cacaoBatches[_batchId];
            return batch.eudrCompliant && batch.harvestDate >= EUDR_CUTOFF_DATE;
        }
    }

    function reportEUDRViolation(
        bytes32 _batchId,
        bool _isCoffee,
        string memory _violationDetails
    ) external onlyRole(Role.AUDITOR) {
        
        if (_isCoffee) {
            require(coffeeBatches[_batchId].producer != address(0), "AgroChain: Coffee batch not found");
            coffeeBatches[_batchId].status = BatchStatus.BLOCKED_EUDR;
            emit EUDRViolationDetected(_batchId, coffeeBatches[_batchId].producer, _violationDetails, true);
        } else {
            require(cacaoBatches[_batchId].producer != address(0), "AgroChain: Cacao batch not found");
            cacaoBatches[_batchId].status = BatchStatus.BLOCKED_EUDR;
            emit EUDRViolationDetected(_batchId, cacaoBatches[_batchId].producer, _violationDetails, false);
        }
    }

    // =====================================================================
    // VIEW FUNCTIONS
    // =====================================================================

    function getCoffeeBatch(bytes32 _batchId) external view returns (CoffeeBatch memory) {
        return coffeeBatches[_batchId];
    }

    function getCacaoBatch(bytes32 _batchId) external view returns (CacaoBatch memory) {
        return cacaoBatches[_batchId];
    }

    function getCoffeeEvents(bytes32 _batchId) external view returns (CoffeeEvent[] memory) {
        return coffeeEvents[_batchId];
    }

    function getCacaoEvents(bytes32 _batchId) external view returns (CacaoEvent[] memory) {
        return cacaoEvents[_batchId];
    }

    function getProducerCoffeeBatches(address _producer) external view returns (bytes32[] memory) {
        return producerCoffeeBatches[_producer];
    }

    function getProducerCacaoBatches(address _producer) external view returns (bytes32[] memory) {
        return producerCacaoBatches[_producer];
    }

    function isBatchCertified(bytes32 _batchId, bool _isCoffee) external view returns (bool) {
        if (_isCoffee) {
            return coffeeBatches[_batchId].status == BatchStatus.CERTIFIED;
        } else {
            return cacaoBatches[_batchId].status == BatchStatus.CERTIFIED;
        }
    }

    function getBatchTokenAddress(bytes32 _batchId, bool _isCoffee) external view returns (address) {
        if (_isCoffee) {
            return coffeeBatches[_batchId].tokenAddress;
        } else {
            return cacaoBatches[_batchId].tokenAddress;
        }
    }
}