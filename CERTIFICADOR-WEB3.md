# AgroChain • Camadas Certificadoras Web3

Implementação completa das camadas de certificação blockchain com prova zero-knowledge (ZK), NFT soulbound e tokens fungíveis para emissão de certificados verificáveis na rede Sepolia testnet.

## 📋 O que foi implementado

### 1. **Contratos Solidity**

#### `AgroChainCertificacoes.sol` (existente, expandido)
- ERC721 URIStorage (NFT soulbound, intransferível)
- ERC20 Capped (token AGRO com limite total)
- Verificação Groth16 de provas ZK
- Emissão e revogação de certificações
- Histórico e auditoria de eventos

#### `AgroChainRegistro.sol` (novo)
- Implementa `IAgroChainRegistro`
- Registro persistente de certificações ZK
- Rastreamento completo: emissão, validade, revogação
- Queries por titular, emissor e ID
- Eventos para auditoria regulatória

#### `AgroChainGroth16Verifier.sol` (novo)
- Implementa `IAgroChainGroth16Verifier`
- Verificação on-chain de provas Groth16
- Template que será preenchido por snarkjs
- Cálculo de emparelhamento BN254

### 2. **Scripts de Setup e Deployment**

#### `blockchain/scripts/setup-zk-production.mjs` (novo)
Prepara o sistema ZK para produção:
```bash
npm run zk:setup:prod
```

O que faz:
1. Compila circuito Circom → r1cs + wasm
2. Gera ptau (Powers of Tau) para prover key
3. Cria zkey (proving key final)
4. Exporta verificador Solidity
5. Salva resumo em `artifacts/agrochain-score-threshold_setup_summary.json`

#### `blockchain/scripts/emit-certificate.mjs` (novo)
Emite uma certificação com prova ZK:
```bash
npm run zk:emit -- \
  --score 85 \
  --salt 12345 \
  --tipo "Café Arabica Premium" \
  --nota-minima 80
```

O que faz:
1. Gera prova ZK localmente (score privado não é revelado)
2. Cria commitment Poseidon do score + sal
3. Formata prova para contrato
4. Envia transação para `emitirCertificacao()`
5. Salva resultado em `artifacts/certificate_*.json`

#### `blockchain/scripts/deploy-sepolia.mjs` (novo)
Realiza deploy em Sepolia testnet:
```bash
SEPOLIA_RPC_URL=https://... \
DEPLOYER_PRIVATE_KEY=0x... \
npm run deploy:sepolia
```

Variáveis necessárias:
- `SEPOLIA_RPC_URL`: RPC endpoint (Alchemy, Infura, QuickNode)
- `DEPLOYER_PRIVATE_KEY`: Private key da conta de deploy
- `INITIAL_CERTIFICADORA_ADDRESS` (opcional): Certificadora autorizada

### 3. **Módulo Web3 Frontend**

#### `prototipo-agrochain/11_web3.js` (novo)
Classe `Web3` que encapsula:
- Detecção e inicialização de MetaMask
- Conexão de wallet e troca de rede
- Carregamento de contrato AbiCoder
- Geração de provas ZK (integração snarkjs)
- Emissão de certificações
- Monitoramento de eventos
- Consultas de saldo, validação

Métodos principais:
```javascript
await Web3.init()                              // Detecta MetaMask
await Web3.conectar()                          // Solicita acesso
await Web3.mudarParaSepolia()                  // Muda rede
await Web3.carregarContrato(endereco, abi)     // Carrega contrato
await Web3.emitirCertificacao(pedido, prova)  // Emite certificado
await Web3.verificarCertificacao(id)           // Verifica validação
await Web3.obterSaldoAgro()                    // Consulta AGRO
Web3.monitorarCertificacoes(callback)          // Escuta eventos
```

### 4. **Tela de Certificação**

#### `prototipo-agrochain/certificador.html` (novo)
Interface Web3 completa com 3 abas:

**Aba 1: Emissão de Certificação**
- Formulário estruturado em painéis (Cartão)
- Entrada de dados de lote (ID, padrão, laudo, tipo)
- Geração de prova ZK com score privado e sal
- Seleção de destinatário e metadados IPFS
- Botões: "Gerar Prova ZK", "Emitir Certificação", "Estimar Taxa"
- Resultado com TX hash, NFT ID, AGRO recebido

**Aba 2: Consultar Certificações**
- Busca por ID de certificação
- Exibição de status, validade, NFT ID
- Histórico de certificações emitidas

**Aba 3: Configuração**
- Exibição de rede e carteira conectada
- Entrada e salvamento de endereço do contrato
- Exibição de saldo AGRO
- Botão para mudar para Sepolia

**Topo (sticky)**
- Marca AgroChain + ícone de semente
- Indicador de estado da rede (pulso verde/vermelho)
- Botão "Conectar" para MetaMask
- Endereço abreviado quando conectado

**Design**
- Segue design.md: plano claro (papel kraft) para gestão
- Tokens de cor: verde (ação), ouro (atenção), vermelho (risco), roxo (criptografia)
- Tipografia: serifa para títulos (KPI), sans para corpo
- Espaçamento modular: 4 · 8 · 12 · 16 · 24 · 32 px
- Responsivo: 2 colunas em desktop, 1 em mobile
- Mensagens: boxes de sucesso/erro/info com animação slideDown

## 🚀 Como usar

### Pré-requisitos

```bash
# Instalar dependências
npm install

# Ter conta em Sepolia testnet (obtenha ETH de teste)
# https://www.sepoliafaucet.com
```

### Setup Completo (primeira vez)

```bash
# 1. Compilar contratos
npm run blockchain:compile

# 2. Preparar sistema ZK
npm run zk:setup:prod

# 3. Configurar variáveis de ambiente
export SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
export DEPLOYER_PRIVATE_KEY=0xYOUR_PRIVATE_KEY
export INITIAL_CERTIFICADORA_ADDRESS=0xYOUR_ADDRESS

# 4. Deploy em Sepolia
npm run deploy:sepolia

# 5. Salvar endereço do contrato em .env ou localStorage
# Será exibido após deploy bem-sucedido
```

### Emitir uma Certificação

```bash
# Via CLI (com prova ZK local)
npm run zk:emit -- --score 85 --salt 12345

# Via Interface Web3 (prototipo-agrochain/certificador.html)
# - Abrir em navegador
# - Conectar MetaMask (Sepolia)
# - Preencher dados
# - Clicar "Gerar Prova ZK"
# - Clicar "Emitir Certificação"
```

### Estrutura de Dados

#### Pedido de Certificação
```javascript
{
  id: bytes32,              // ID único da certificação
  loteId: bytes32,          // ID do lote rastreável
  padraoHash: bytes32,      // Hash do standard de qualidade
  hashLaudo: bytes32,       // Hash do documento técnico
  compromissoScore: bytes32, // Commitment Poseidon do score
  tipo: string,             // "Café Arabica Premium"
  validoAte: uint64,        // Timestamp de expiração
  notaMinima: uint8,        // 0-100
  titular: address,         // Endereço que recebe NFT + tokens
  tokenURI: string,         // ipfs://Qm... ou https://...
}
```

#### Prova Groth16
```javascript
{
  a: [uint256, uint256],
  b: [[uint256, uint256], [uint256, uint256]],
  c: [uint256, uint256]
}
```

#### Entradas Públicas (verificação)
```
[0] commitment      // bytes32(commitment)
[1] notaMinima      // uint8
[2] loteId % Fr     // reduzido ao campo
[3] padraoHash % Fr // reduzido ao campo
[4] hashLaudo % Fr  // reduzido ao campo
```

## 🔐 Segurança

### Prova ZK
- **Privado**: Score (`qualityScore`) e sal (`salt`) nunca saem do cliente
- **Público**: Apenas commitment, nota mínima, hashes de contexto são vistos on-chain
- **Verificação**: Groth16 prova que score >= notaMinima sem revelar o valor
- **Impedimento de duplicação**: Nullifier (hash de lote + padrão + score) evita reúso

### NFT Soulbound
- Intransferível: `_update` revert se `from != address(0)`
- Preserva certificado permanentemente no titular
- Impossível vender ou transferir

### Token AGRO
- Capped: limite total definido no deploy
- Apenas `AgroChainCertificacoes` pode fazer mint
- Reflete recompensa por certificação (governança futura)

### Rede Sepolia
- Testnet pública: não gasta ETH real
- Faucet gratuito: obtém ETH de teste em segundos
- Explorável: etherscan.io para auditoria de transações

## 📊 Fluxo Completo

```
1. Produtor passa por auditorias
   ↓
2. Certificadora coleta score privado (ex: 85)
   ↓
3. Certificadora cria sal (ex: 12345)
   ↓
4. Cliente gera commitment Poseidon (score + sal + contextos)
   ↓
5. Client cria prova ZK: "score >= notaMinima sem revelar score"
   ↓
6. Cliente envia: (pedido, prova) → blockchain
   ↓
7. Contrato verifica Groth16 prova
   ↓
8. Se válida:
   - Registra certificação em AgroChainRegistro
   - Minta NFT intransferível para titular
   - Distribui 1000 AGRO tokens para titular
   - Emite evento CertificacaoEmitida
   ↓
9. Qualquer um pode verificar:
   - TX hash no Sepolia Scan
   - Eventos on-chain imutáveis
   - Validade: certificacao.ativa && certificacao.validoAte > now
```

## 📝 Eventos e Auditoria

Todos os eventos incluem contexto completo para rastreamento:

```solidity
event CertificacaoEmitida(
  bytes32 indexed id,
  bytes32 indexed loteId,
  bytes32 indexed padraoHash,
  bytes32 compromissoScore,
  bytes32 hashLaudo,
  uint8 notaMinima,
  uint64 validoAte,
  address titular,
  address emissor,
  uint256 nftId,
  uint256 recompensaAgro
);

event CertificacaoRevogada(
  bytes32 indexed id,
  address indexed responsavel,
  bytes32 motivoHash
);
```

## 🔧 Troubleshooting

### "MetaMask not detected"
- Instale MetaMask: https://metamask.io
- Abra a página de certificador.html no navegador com extensão ativa

### "Rede incorreta"
- Botão "Mudar para Sepolia" adiciona automaticamente ou muda
- Se não funcionar, adicione manualmente:
  - Rede: Sepolia Testnet
  - RPC: https://sepolia.infura.io/v3/
  - Chain ID: 11155111
  - Símbolo: ETH
  - Block Explorer: https://sepolia.etherscan.io

### "Contrato não carregado"
- Copie o endereço do contrato após deploy
- Cole em "Configuração" → "Endereço do Contrato"
- Clique "Salvar"

### "Erro ao gerar prova"
- Verifique: `npm run zk:setup:prod` foi executado com sucesso
- Procure por arquivos em `blockchain/circuits/`:
  - `agrochain-score-threshold.r1cs`
  - `agrochain-score-threshold_js/`
  - `agrochain-score-threshold_final.zkey`

### "Saldo insuficiente"
- Sepolia testnet: https://www.sepoliafaucet.com
- Testnet alterno: https://faucets.chain.link/sepolia
- Obtém ~0.5 ETH em segundos

## 📚 Referências

- **Circom 2**: https://docs.circom.io
- **snarkjs**: https://github.com/iden3/snarkjs
- **Sepolia Testnet**: https://sepolia.dev
- **Ethers.js v6**: https://docs.ethers.org/v6/
- **OpenZeppelin Contracts**: https://docs.openzeppelin.com/contracts/5.x

## 🎯 Próximos Passos

1. **Integração IPFS**: salvar metadados de certificação em IPFS (Pinata, NFT.storage)
2. **Dashboard de Rastreamento**: consultar certificações por lote, produtor, período
3. **Revogação com Motivo**: armazenar motivos estruturados de revogação
4. **Auditor View**: painel para auditores verificarem histórico completo
5. **Marketplace de Certificações**: comprar/vender direitos de certificação
6. **Mainnet Deploy**: mover de Sepolia para Ethereum, Polygon ou Arbitrum produção
7. **DAO de Certificadores**: governança descentralizada de certificadoras

---

**AgroChain © 2026** • Certificação agrícola com blockchain e criptografia zero-knowledge
