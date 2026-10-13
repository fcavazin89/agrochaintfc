# Requirements Document

## Introduction

Este documento especifica os requisitos para a implantação do sistema de certificação NFT (ERC721) da AgroChain. O objetivo é substituir o contrato `CertificacaoTest.sol` — que realiza apenas uma emissão de evento simples — por um contrato ERC721 completo que mint um NFT único para cada lote certificado de Café ou Cacau. Os metadados do certificado ficam armazenados inteiramente on-chain como JSON codificado em Base64, eliminando dependência de IPFS. A DApp Next.js 14 existente na rota `/certificacao` é atualizada para chamar a nova função `mintCertificado`, exibir o Token ID do NFT resultante e fornecer links para o OpenSea Sepolia e o Etherscan.

---

## Glossary

- **AgroChainCertNFT**: Contrato Solidity ERC721 que mint certificados de lote como NFTs únicos.
- **Certificate_Contract**: Referência genérica ao contrato `AgroChainCertNFT` quando o contexto é agnóstico à implementação.
- **Certification_Page**: Página Next.js 14 em `dapp/src/app/certificacao/page.tsx` que coleta dados do lote e interage com o contrato.
- **Farmer**: Usuário da DApp que conecta a carteira MetaMask e submete o formulário de certificação. Corresponde ao `msg.sender` na transação.
- **Batch**: Conjunto de dados de um lote de Café ou Cacau: `batchId`, `tipo`, `variedade`, `pesoKg` e `origem`.
- **TokenId**: Identificador numérico único e sequencial do NFT emitido pelo contrato.
- **On-Chain Metadata**: Metadados do certificado no padrão ERC721 codificados em Base64 dentro do próprio contrato, sem dependência de serviços externos.
- **Deploy_Script**: Script Node.js ESM (`deploy-nft-sepolia.mjs`) que compila e faz deploy do `AgroChainCertNFT` na Sepolia usando ethers.js diretamente.
- **Deployment_File**: Arquivo JSON (`deployment-nft-sepolia.json`) gerado pelo `Deploy_Script` com endereço, chainId e timestamp do contrato implantado.
- **Hardhat_Test**: Teste automatizado escrito em JavaScript para Hardhat 3.18.1 + Mocha + Chai que valida o comportamento do contrato.
- **OpenZeppelin**: Biblioteca de contratos Solidity v5.6.1 usada como dependência (`@openzeppelin/contracts/`).
- **Receipt_Log**: Log de evento emitido na transação e retornado no recibo da transação (`eth_getTransactionReceipt`).
- **Step_UI**: Um dos quatro passos visuais de progresso exibidos na `Certification_Page` durante o fluxo de mint.

---

## Requirements

### Requirement 1: Contrato ERC721 — Estrutura e Herança

**User Story:** As a developer, I want the `AgroChainCertNFT` contract to inherit from standard OpenZeppelin ERC721 extensions, so that it is fully compatible with wallets, marketplaces, and tools that follow the ERC721 standard.

#### Acceptance Criteria

1. THE `AgroChainCertNFT` SHALL inherit `ERC721`, `ERC721URIStorage` e `Ownable` de `@openzeppelin/contracts/` versão 5.6.1.
2. THE `AgroChainCertNFT` SHALL declarar `pragma solidity 0.8.37` como versão exata do compilador.
3. THE `AgroChainCertNFT` SHALL implementar a função `supportsInterface(bytes4)` sobrescrevendo ambas as heranças `ERC721` e `ERC721URIStorage`, conforme exigido pelo OpenZeppelin 5.
4. THE `AgroChainCertNFT` SHALL chamar `ERC721("AgroChain Certificado NFT", "AGCNFT")` e `Ownable(msg.sender)` no `constructor`.
5. THE `AgroChainCertNFT` SHALL sobrescrever `tokenURI(uint256)` para delegar à implementação `ERC721URIStorage`.

---

### Requirement 2: Armazenamento On-Chain da Struct de Certificado

**User Story:** As a farmer, I want my batch data to be stored permanently on-chain inside the NFT, so that the certificate is tamper-proof and does not depend on external services.

#### Acceptance Criteria

1. THE `AgroChainCertNFT` SHALL definir uma `struct Certificado` contendo os campos: `batchId` (string), `tipo` (string), `variedade` (string), `pesoKg` (uint256), `origem` (string), `fazendeiro` (address) e `timestamp` (uint256).
2. THE `AgroChainCertNFT` SHALL manter um `mapping(uint256 => Certificado) public certificados` que mapeia cada `TokenId` para a respectiva struct.
3. WHEN `mintCertificado` é chamado com sucesso, THE `AgroChainCertNFT` SHALL gravar todos os sete campos da struct `Certificado` no mapping `certificados` para o novo `TokenId`.
4. THE `AgroChainCertNFT` SHALL inicializar o contador de TokenIds com `1` (primeiro token tem ID = 1) usando uma variável privada `_tokenIdCounter`.

---

### Requirement 3: Função de Mint Pública

**User Story:** As a farmer, I want to call `mintCertificado` from the DApp, so that I receive an NFT certificate in my wallet that proves my batch was registered on-chain.

#### Acceptance Criteria

1. THE `AgroChainCertNFT` SHALL expor a função `mintCertificado(string calldata batchId, string calldata tipo, string calldata variedade, uint256 pesoKg, string calldata origem) external returns (uint256 tokenId)`, chamável por qualquer endereço.
2. WHEN `mintCertificado` é chamado, THE `AgroChainCertNFT` SHALL popular o campo `fazendeiro` com `msg.sender` e o campo `timestamp` com `block.timestamp`.
3. WHEN `pesoKg` é igual a zero, THEN THE `AgroChainCertNFT` SHALL reverter com a mensagem de erro `"AgroChain: pesoKg must be > 0"`.
4. WHEN `batchId` é uma string vazia, THEN THE `AgroChainCertNFT` SHALL reverter com a mensagem de erro `"AgroChain: batchId required"`.
5. WHEN `tipo` não é `"Coffee"` nem `"Cacao"`, THEN THE `AgroChainCertNFT` SHALL reverter com a mensagem de erro `"AgroChain: tipo must be Coffee or Cacao"`.
6. WHEN `mintCertificado` é executado com sucesso, THE `AgroChainCertNFT` SHALL incrementar `_tokenIdCounter` e retornar o novo `tokenId`.
7. WHEN `mintCertificado` é executado com sucesso, THE `AgroChainCertNFT` SHALL chamar `_safeMint(msg.sender, tokenId)` para transferir o NFT ao fazendeiro.

---

### Requirement 4: Metadados On-Chain em Base64

**User Story:** As a developer, I want the `tokenURI` to return fully on-chain Base64-encoded JSON metadata, so that the NFT is viewable in OpenSea and other marketplaces without relying on IPFS or external servers.

#### Acceptance Criteria

1. WHEN `mintCertificado` é executado com sucesso, THE `AgroChainCertNFT` SHALL construir um JSON de metadados contendo os campos `name`, `description`, `attributes` (array com todos os sete campos da struct) e armazená-lo via `_setTokenURI(tokenId, uri)`.
2. THE metadata JSON gerado pelo `AgroChainCertNFT` SHALL seguir o formato de URI: `data:application/json;base64,<base64encodedJSON>`.
3. THE `AgroChainCertNFT` SHALL usar somente operações nativas de Solidity (`abi.encodePacked`, concatenação de strings, `Base64.encode` de `@openzeppelin/contracts/utils/Base64.sol`) para construir a URI — sem chamadas externas.
4. WHEN `tokenURI(tokenId)` é chamado para um token inexistente, THEN THE `AgroChainCertNFT` SHALL reverter conforme o comportamento padrão do `ERC721URIStorage`.
5. THE campo `name` no JSON de metadados SHALL seguir o padrão `"AgroChain Cert #<tokenId> — <batchId>"`.
6. THE campo `description` no JSON de metadados SHALL seguir o padrão `"Certificado AgroChain para o lote <batchId> (<tipo> - <variedade>), <pesoKg>kg, origem: <origem>"`.

---

### Requirement 5: Evento de Certificação

**User Story:** As a developer, I want the contract to emit a structured event on every mint, so that the DApp can parse the `TokenId` from the transaction receipt without making additional RPC calls.

#### Acceptance Criteria

1. THE `AgroChainCertNFT` SHALL declarar o evento `CertificadoMintado(uint256 indexed tokenId, address indexed fazendeiro, string batchId)`.
2. WHEN `mintCertificado` é executado com sucesso, THE `AgroChainCertNFT` SHALL emitir `CertificadoMintado(tokenId, msg.sender, batchId)` após o mint.
3. THE `AgroChainCertNFT` SHALL indexar os parâmetros `tokenId` e `fazendeiro` no evento `CertificadoMintado` para permitir filtragem eficiente on-chain.

---

### Requirement 6: Função de Consulta de Certificado

**User Story:** As a developer, I want to query any certificate's full data by `TokenId`, so that external contracts, explorers, or the DApp can verify and display certification details.

#### Acceptance Criteria

1. THE `AgroChainCertNFT` SHALL expor a função `getCertificado(uint256 tokenId) external view returns (Certificado memory)`.
2. WHEN `getCertificado` é chamado com um `tokenId` que existe, THE `AgroChainCertNFT` SHALL retornar a struct `Certificado` completa armazenada para esse token.
3. WHEN `getCertificado` é chamado com um `tokenId` que não foi mintado, THEN THE `AgroChainCertNFT` SHALL reverter com a mensagem `"AgroChain: token does not exist"`.

---

### Requirement 7: Script de Deploy para Sepolia

**User Story:** As a developer, I want a standalone deploy script that uses ethers.js directly, so that I can deploy the `AgroChainCertNFT` contract to Sepolia without requiring Hardhat network configuration.

#### Acceptance Criteria

1. THE `Deploy_Script` SHALL ser um arquivo ESM em `blockchain/scripts/deploy-nft-sepolia.mjs` que usa `ethers` (`JsonRpcProvider`, `Wallet`, `ContractFactory`) diretamente, sem depender de `hre` ou Hardhat CLI.
2. THE `Deploy_Script` SHALL ler o ABI e o bytecode compilados do artifact JSON gerado pelo Hardhat em `blockchain/artifacts/blockchain/contracts/AgroChainCertNFT.sol/AgroChainCertNFT.json`.
3. THE `Deploy_Script` SHALL conectar-se ao endpoint público da Sepolia `https://ethereum-sepolia-rpc.publicnode.com` e usar a chave privada da variável de ambiente `DEPLOYER_PRIVATE_KEY`.
4. WHEN o deploy é concluído com sucesso, THE `Deploy_Script` SHALL salvar o `Deployment_File` em `blockchain/deployment-nft-sepolia.json` contendo `address`, `chainId` (11155111), `deployer`, `txHash` e `time` (ISO 8601).
5. THE `Deploy_Script` SHALL estimar o gas com `provider.estimateGas` e aplicar um buffer de 20% antes de submeter o deploy, seguindo o mesmo padrão de `deploy-direct.mjs`.
6. THE `Deploy_Script` SHALL imprimir no console o endereço do contrato e o link do Etherscan: `https://sepolia.etherscan.io/address/<address>`.

---

### Requirement 8: Atualização da Certification_Page — Chamada ao Contrato NFT

**User Story:** As a farmer, I want the `/certificacao` page to call `mintCertificado` on the new NFT contract, so that each certificate I issue becomes a real NFT token in my wallet.

#### Acceptance Criteria

1. THE `Certification_Page` SHALL usar `encodeFunctionData` do viem 2.21.54 para codificar a chamada à função `mintCertificado(string,string,string,uint256,string)` com os dados do formulário.
2. THE `Certification_Page` SHALL ler o endereço do `AgroChainCertNFT` do `localStorage` sob a chave `agrochain_nft_contract_address` (chave distinta da existente `agrochain_contract_address`).
3. THE `Certification_Page` SHALL enviar a transação via `window.ethereum.request({ method: 'eth_sendTransaction', ... })` com o `data` codificado pelo viem.
4. WHEN a transação é enviada com sucesso, THE `Certification_Page` SHALL aguardar o recibo via `eth_getTransactionReceipt` em polling com intervalo de 2 segundos e timeout de 60 segundos.
5. WHEN o recibo é recebido, THE `Certification_Page` SHALL parsear o campo `logs` do recibo para encontrar o log do evento `CertificadoMintado` e extrair o `tokenId` (primeiro tópico indexado após o selector).
6. WHEN `pesoKg` é zero ou negativo, THEN THE `Certification_Page` SHALL exibir a mensagem de erro `"Peso deve ser maior que zero"` e não submeter a transação.
7. WHEN `batchId` está vazio, THEN THE `Certification_Page` SHALL exibir `"Batch ID é obrigatório"` e não submeter a transação.

---

### Requirement 9: Exibição de Resultados Pós-Mint

**User Story:** As a farmer, I want to see the NFT Token ID, the OpenSea link, and the Etherscan link after a successful mint, so that I can immediately share or verify my certificate.

#### Acceptance Criteria

1. WHEN o mint é concluído com sucesso, THE `Certification_Page` SHALL exibir o `TokenId` do NFT mintado com o texto: `"NFT Token ID: #<tokenId>"`.
2. WHEN o mint é concluído com sucesso, THE `Certification_Page` SHALL exibir um link clicável para o OpenSea Sepolia no formato: `https://testnets.opensea.io/assets/sepolia/<contractAddress>/<tokenId>`.
3. WHEN o mint é concluído com sucesso, THE `Certification_Page` SHALL exibir um link clicável para o Etherscan no formato: `https://sepolia.etherscan.io/tx/<txHash>`.
4. THE `Certification_Page` SHALL manter os quatro `Step_UI` existentes (1. Validar carteira, 2. Preparar mint, 3. Submeter on-chain, 4. Confirmação), atualizando seus textos para refletir o fluxo de mint NFT.

---

### Requirement 10: Testes do Contrato com Hardhat

**User Story:** As a developer, I want a Hardhat test suite for `AgroChainCertNFT`, so that the contract behavior is automatically verified before deployment.

#### Acceptance Criteria

1. THE `Hardhat_Test` SHALL ser criado em `blockchain/tests/AgroChainCertNFT.test.js`, seguindo o padrão de importação `import { expect } from "chai"; import hre from "hardhat";`.
2. WHEN `mintCertificado` é chamado com dados válidos, THE `Hardhat_Test` SHALL verificar que o `TokenId` retornado é `1` para o primeiro mint e incrementa a cada chamada subsequente.
3. WHEN `mintCertificado` é chamado com dados válidos, THE `Hardhat_Test` SHALL verificar que o evento `CertificadoMintado` foi emitido com os argumentos corretos (`tokenId`, `fazendeiro`, `batchId`).
4. WHEN `getCertificado` é chamado com o `TokenId` do mint anterior, THE `Hardhat_Test` SHALL verificar que todos os sete campos da struct retornada correspondem aos valores passados no mint.
5. WHEN `mintCertificado` é chamado com `pesoKg = 0`, THE `Hardhat_Test` SHALL verificar que a transação reverte com a mensagem `"AgroChain: pesoKg must be > 0"`.
6. WHEN `mintCertificado` é chamado com `batchId = ""`, THE `Hardhat_Test` SHALL verificar que a transação reverte com a mensagem `"AgroChain: batchId required"`.
7. WHEN `mintCertificado` é chamado com `tipo = "Wheat"`, THE `Hardhat_Test` SHALL verificar que a transação reverte com a mensagem `"AgroChain: tipo must be Coffee or Cacao"`.
8. WHEN `ownerOf(tokenId)` é chamado após o mint, THE `Hardhat_Test` SHALL verificar que o owner do NFT é o endereço do Farmer que chamou `mintCertificado`.
9. WHEN `tokenURI(tokenId)` é chamado, THE `Hardhat_Test` SHALL verificar que a string retornada começa com `"data:application/json;base64,"`.
10. WHEN `getCertificado` é chamado com um `tokenId` inexistente (ex: 999), THE `Hardhat_Test` SHALL verificar que a transação reverte com `"AgroChain: token does not exist"`.
