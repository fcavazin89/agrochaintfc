# AgroChainCoffeeCacaoTraceability Contract Interface

## Overview
This contract provides specialized traceability for Coffee (Arabica, Robusta/Conilon) and Cacao with ZK certification, EUDR compliance, and escrow payment system integration.

## Key Interface Functions for CoffeeCacaoSwap DEX

### 1. Batch Certification Status Check
```solidity
function isBatchCertified(bytes32 _batchId, bool _isCoffee) external view returns (bool)
```
**Purpose**: Verify if a batch (Coffee or Cacao) has been certified with ZK certification.
**Parameters**:
- `_batchId`: Unique identifier of the batch
- `_isCoffee`: `true` for Coffee batch, `false` for Cacao batch
**Returns**: `true` if batch is certified, `false` otherwise

### 2. Batch Token Information
```solidity
function getBatchTokenAddress(bytes32 _batchId, bool _isCoffee) external view returns (address)
```
**Purpose**: Retrieve the token address for a tokenized batch.
**Parameters**:
- `_batchId`: Unique identifier of the batch
- `_isCoffee`: `true` for Coffee batch, `false` for Cacao batch
**Returns**: ERC20 token address (address(0) if not tokenized)

### 3. Batch Data Retrieval
```solidity
// For Coffee batches
function getCoffeeBatch(bytes32 _batchId) external view returns (CoffeeBatch memory)

// For Cacao batches  
function getCacaoBatch(bytes32 _batchId) external view returns (CacaoBatch memory)
```
**Purpose**: Retrieve detailed batch information including:
- Producer address
- Variety (CoffeeVariety or CacaoVariity enum)
- Processing method
- Weight in kg
- Region/farm information
- Quality scores (SCA score for coffee, quality score for cacao)
- Certification ID
- Token address and supply (if tokenized)
- EUDR compliance status

### 4. EUDR Compliance Validation
```solidity
function validateEUDRCompliance(bytes32 _batchId, bool _isCoffee) external view returns (bool)
```
**Purpose**: Check if a batch complies with EUDR (European Union Deforestation Regulation) requirements.
**Returns**: `true` if batch is EUDR compliant and harvested after Jan 1, 2021

### 5. Producer Batch Lists
```solidity
function getProducerCoffeeBatches(address _producer) external view returns (bytes32[] memory)
function getProducerCacaoBatches(address _producer) external view returns (bytes32[] memory)
```
**Purpose**: Get all batch IDs for a specific producer (useful for portfolio/token listings).

## Batch Status Enum
```solidity
enum BatchStatus { 
    REGISTERED,     // Initial registration
    CERTIFIED,      // Certified with ZK proof
    AVAILABLE,      // Available for trading (tokenized)
    IN_CONTRACT,    // In an escrow contract
    SOLD,           // Sold/transferred
    CONSUMED,       // End of supply chain
    BLOCKED_EUDR    // Blocked due to EUDR violation
}
```

## Coffee & Cacao Types
```solidity
// Coffee varieties
enum CoffeeVariety { ARABICA, ROBUSTA_CONILON }

// Cacao varieties  
enum CacaoVariety { CRIOLLO, FORASTERO, TRINITARIO, NACIONAL }

// Processing methods (common to both)
enum ProcessingMethod { 
    // Coffee
    WASHED, NATURAL, HONEY, WET_HULLED,
    // Cacao  
    FERMENTED, DRIED, ROASTED_BEANS
}
```

## Batch Quality Standards
- **Coffee**: Minimum SCA score = 80 (specialty grade threshold)
- **Cacao**: Minimum quality score = 75 (premium threshold)
- **EUDR Cutoff**: Harvest date must be ≥ Jan 1, 2021 (timestamp 1609459200)

## Usage in CoffeeCacaoSwap DEX

### For Trading Validation
CoffeeCacaoSwap DEX should verify:
1. `isBatchCertified(batchId, isCoffee) == true` - Must be certified
2. `getBatchTokenAddress(batchId, isCoffee) != address(0)` - Must be tokenized
3. `validateEUDRCompliance(batchId, isCoffee) == true` - Must be EUDR compliant

### For Token Integration
- Each certified batch can be tokenized via `tokenizeCoffeeBatch()` or `tokenizeCacaoBatch()`
- Tokens represent ownership rights to the physical batch
- Token address is stored in the batch record for DEX integration

### For Quality Assurance
- Coffee batches have SCA cupping scores (0-100)
- Cacao batches have quality scores (0-100)
- Only batches meeting minimum scores can be certified

## Dependencies
- Requires `AgroChainCertificacoes` contract for ZK certification validation
- Deployer is initially set as `Role.AUDITOR`
- Roles must be assigned for producers, certifiers, etc.