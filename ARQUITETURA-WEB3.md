# Arquitetura Web3 • AgroChain Certificador

Visão técnica completa das camadas, componentes e fluxo de certificação com prova zero-knowledge na rede Sepolia.

## 🏗️ Arquitetura em Camadas

```
┌─────────────────────────────────────────────────────────────┐
│                       FRONTEND WEB3                         │
│  prototipo-agrochain/certificador.html + 11_web3.js         │
│  - Interface de emissão de certificação                     │
│  - Integração MetaMask + Sepolia                            │
│  - Geração de prova ZK (local)                              │
│  - Monitoramento de eventos blockchain                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  CAMADA DE APLICAÇÃO (JS)                   │
│  ethers.js v6 + snarkjs                                     │
│  - Conexão à wallet MetaMask                                │
│  - Chamadas a contratos (call, transaction)                 │
│  - Geração de provas Groth16                                │
│  - Monitoramento de logs/eventos                            │
└─────────────────────────────────────────────────────────────┘
                            ↓ HTTPS/RPC
                    Sepolia Testnet (EVM)
                            ↓
┌─────────────────────────────────────────────────────────────┐
│               CAMADA DE SMART CONTRACTS                      │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ AgroChainCertificacoes (proxy pattern)              │   │
│  │  - ERC721 URIStorage (NFT soulbound)                │   │
│  │  - ERC20 Capped (token AGRO)                        │   │
│  │  - Interface IAgroChainGroth16Verifier              │   │
│  │  - Interface IAgroChainRegistro                     │   │
│  │  - emitirCertificacao()                             │   │
│  │  - revogarCertificacao()                            │   │
│  │  - certificacaoValida()                             │   │
│  └─────────────────────────────────────────────────────┘   │
│           ↓                              ↓                  │
│  ┌──────────────────────┐    ┌──────────────────────────┐  │
│  │ AgroChainRegistro    │    │ AgroChainGroth16Verifier │  │
│  │                      │    │                          │  │
│  │ - Registro ZK        │    │ - Prova Groth16         │  │
│  │ - Histórico emissor  │    │ - Verificação on-chain  │  │
│  │ - Histórico titular  │    │ - Emparelhamento BN254  │  │
│  │ - Revogações         │    │                         │  │
│  │ - Queries            │    │ Gerado por: snarkjs    │  │
│  └──────────────────────┘    └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│            CAMADA CRIPTOGRÁFICA (Off-Chain)                 │
│                                                              │
│  Circuito Circom: agrochain-score-threshold.circom          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ template AgroChainScoreThreshold()                  │   │
│  │                                                     │   │
│  │ Inputs Privados:                                    │   │
│  │  - qualityScore (0-100)                             │   │
│  │  - salt (randomness)                                │   │
│  │                                                     │   │
│  │ Inputs Públicos:                                    │   │
│  │  - commitment (Poseidon hash)                       │   │
│  │  - minimumScore                                     │   │
│  │  - lotContext, standardContext, reportContext      │   │
│  │                                                     │   │
│  │ Constraints (provas):                               │   │
│  │  1. commitment == Poseidon(score, salt, ...)       │   │
│  │  2. score <= 100                                    │   │
│  │  3. minimumScore <= 100                             │   │
│  │  4. score >= minimumScore                           │   │
│  │                                                     │   │
│  │ Output: prova Groth16 (a, b, c) verificável        │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 📊 Fluxo de Emissão Completo

```
1. CLIENTE (Certificadora)
   ├─ Acessa certificador.html em navegador
   ├─ Clica "Conectar" → MetaMask
   ├─ Aprova transação de conexão
   └─ Verifica rede = Sepolia

2. ENTRADA DE DADOS
   ├─ Preenche formulário:
   │  ├─ Lote: ID (hash SHA-256)
   │  ├─ Padrão: hash do standard de qualidade
   │  ├─ Laudo: hash do documento técnico
   │  ├─ Tipo: "Café Arabica Premium"
   │  ├─ Nota Mínima: 80
   │  ├─ Válido Até: data de expiração
   │  ├─ Titular: endereço que recebe NFT + AGRO
   │  ├─ TokenURI: ipfs://Qm... (metadados)
   │  ├─ Score Privado: 85 (NÃO será revelado)
   │  └─ Sal: 12345 (randomness privado)

3. GERAR PROVA ZK (Cliente)
   ├─ Web3.js importa wasm + snarkjs
   ├─ Calcula commitment Poseidon:
   │  └─ commitment = Poseidon(score, salt, lote, padrão, laudo)
   ├─ snarkjs.groth16.fullProve() executa circuito
   ├─ Entrada privada: {score: 85, salt: 12345, ...}
   ├─ Entrada pública: {commitment, notaMinima, lote%, padrão%, laudo%}
   ├─ Gera prova ZK: (a, b, c) que prova score >= 80 sem revelar 85
   └─ ✓ Prova armazenada em estadoApp.provaGerada

4. CRIAR PEDIDO DE CERTIFICAÇÃO
   ├─ Monta estrutura:
   │  ├─ id = hash único (keccak256 hash)
   │  ├─ loteId = input do usuário
   │  ├─ padraoHash = input do usuário
   │  ├─ hashLaudo = input do usuário
   │  ├─ compromissoScore = commitment calculado
   │  ├─ tipo, validoAte, notaMinima, titular, tokenURI = inputs

5. ENVIAR PARA BLOCKCHAIN
   ├─ Cliente clica "Emitir Certificação"
   ├─ Web3.emitirCertificacao(pedido, prova)
   ├─ Formata prova para Solidity:
   │  ├─ a = [pi_a[0], pi_a[1]]
   │  ├─ b = [[pi_b[0][1], pi_b[0][0]], [pi_b[1][1], pi_b[1][0]]]
   │  └─ c = [pi_c[0], pi_c[1]]
   ├─ Chama contract.emitirCertificacao(pedido, prova)
   ├─ MetaMask exibe gas estimado, usuário aprova
   ├─ Transação assinada e enviada para Sepolia

6. CONTRATO: VALIDAR PROVA
   ├─ AgroChainCertificacoes.emitirCertificacao()
   ├─ Valida entrada:
   │  ├─ Todos os campos != 0
   │  ├─ Titular != address(0)
   │  ├─ validoAte > now
   │  ├─ notaMinima <= 100
   │  └─ certificacao[id] ainda não emitida
   ├─ Calcula nullifier = keccak256(lote, padrão, commitment)
   ├─ Verifica: compromissoJaCertificado[nullifier] == false (impede duplicação)
   ├─ Monta entradas públicas para verificador:
   │  └─ [commitment, notaMinima, lote%Fr, padrão%Fr, laudo%Fr]
   ├─ Chama verificadorZK.verifyProof(a, b, c, entradas)
   └─ ✓ Prova Groth16 validada (ou revert se inválida)

7. CONTRATO: REGISTRAR CERTIFICAÇÃO
   ├─ Chamada interna: registroAgroChain.registrarCertificacaoZK()
   ├─ AgroChainRegistro armazena:
   │  ├─ CertificacaoZK {
   │  │    id, loteId, tipo, hashLaudo, validoAte,
   │  │    compromissoScore, notaMinima, titular, emissor,
   │  │    dataEmissao=now, ativa=true
   │  │  }
   │  ├─ certificacoesPorTitular[titular].push(id)
   │  ├─ certificacoesPorEmissor[emissor].push(id)
   │  ├─ todasAsCertificacoes.push(id)
   │  └─ emit CertificacaoZKRegistrada(...)

8. CONTRATO: EMITIR NFT + TOKEN
   ├─ Marca nullifier para evitar reúso:
   │  └─ compromissoJaCertificado[nullifier] = true
   ├─ Armazena registro localmente:
   │  └─ certificacoes[id] = RegistroCertificacao {...}
   ├─ Minta NFT soulbound:
   │  ├─ nftId = proximoNftId++
   │  ├─ _setTokenURI(nftId, tokenURI)
   │  ├─ _safeMint(titular, nftId)
   │  └─ tokenIdPorCertificacao[id] = nftId
   ├─ Distribui tokens:
   │  └─ tokenAgro.mint(titular, recompensaPorCertificacao) // 1000 AGRO
   └─ emit CertificacaoEmitida(...) com todos os detalhes

9. CLIENTE: RECEBER E EXIBIR RESULTADO
   ├─ TX confirmada em ~12 segundos
   ├─ Web3.js escuta receipt
   ├─ Extrai NFT ID dos logs (evento Transfer)
   ├─ Exibe resultado:
   │  ├─ ✓ TX Hash = 0x...
   │  ├─ NFT ID = #42
   │  ├─ AGRO Recebido = 1000
   │  ├─ Bloco = 5123456
   │  └─ Link para Sepolia Scan
   ├─ LocalStorage salva config para próximas emissões
   └─ Interface exibe mensagem de sucesso com animação

10. PÓS-EMISSÃO: AUDITORIA
   ├─ Qualquer um pode verificar:
   │  ├─ Sepolia Scan: ver TX raw input, events
   │  ├─ AgroChainRegistro.certificacaoValida(id)
   │  ├─ AgroChainCertificacoes.certificacaoValida(id)
   │  ├─ Holder de NFT: ownerOf(nftId)
   │  ├─ Saldo de AGRO: tokenAgro.balanceOf(titular)
   │  └─ Histórico: certificacoesPorTitular[titular]
   └─ Imutável e rastreável na blockchain
```

## 🔐 Modelo de Segurança

### 1. **Prova Zero-Knowledge**

**O que é provado:**
- Score privado >= Nota mínima pública
- Sem revelar o valor exato do score

**Confidencialidade:**
- Score: privado (nunca sai do cliente ou do circuito)
- Sal: privado (usado apenas para commitment)
- Commitment: público (não revela score pelo hash Poseidon)

**Integridade:**
- Commitment vincula score ao contexto específico (lote, padrão, laudo)
- Reutilizar mesma prova é impossível (nullifier prevent duplicação)

### 2. **NFT Soulbound**

**Propriedade:**
- Apenas titular pode receber o NFT
- NFT é imediatamente intransferível após mint
- Reverts em qualquer tentativa de transfer/approve/burn

**Valor:**
- Representa certificação única e identificável
- Permanente no endereço do titular
- Prova de posse no blockchain

### 3. **Registro Auditável**

**Histórico Completo:**
- Cada emissão registrada em AgroChainRegistro
- Timestamp de emissão em bloco
- Identificação de certificadora e titular
- Todos os hashes de contexto armazenados

**Revogação Rastreada:**
- Revogação também registrada com timestamp
- Motivo hash (flexibilidade para compliance)
- Responsável identificado
- Evento emitido para auditoria

### 4. **Rede Testnet Segura**

**Sepolia:**
- Rede pública regulada (coordenada com Ethereum Foundation)
- Dados imutáveis (não podem ser apagados)
- Exploração pública (qualquer um pode auditar)
- Sem valor real (ETH é apenas para teste)

## 📁 Estrutura de Arquivos

```
agrochain/
├── blockchain/
│   ├── contracts/
│   │   ├── AgroChainCertificacoes.sol (existente, expandido)
│   │   ├── AgroChainRegistro.sol (NOVO)
│   │   ├── AgroChainGroth16Verifier.sol (NOVO - template)
│   │   ├── IAgroChainGroth16Verifier.sol (existente)
│   │   └── IAgroChainRegistro.sol (existente)
│   │
│   ├── circuits/
│   │   ├── agrochain-score-threshold.circom (existente)
│   │   ├── agrochain-score-threshold.r1cs (GERADO)
│   │   ├── agrochain-score-threshold_js/ (GERADO)
│   │   ├── agrochain-score-threshold_final.zkey (GERADO)
│   │   └── agrochain-score-threshold.ptau (GERADO)
│   │
│   ├── artifacts/
│   │   ├── AgroChainCertificacoes.json (compilado)
│   │   ├── AgroChainRegistro.json (compilado)
│   │   ├── AgroChainGroth16Verifier_Generated.json (compilado)
│   │   ├── agrochain-score-threshold_setup_summary.json (resumo ZK)
│   │   ├── agrochain-score-threshold.wasm (CPDO)
│   │   ├── deployment-sepolia.json (endereços após deploy)
│   │   └── certificate_*.json (resultados de emissão)
│   │
│   └── scripts/
│       ├── setup-zk-production.mjs (NOVO)
│       ├── emit-certificate.mjs (NOVO)
│       ├── deploy-sepolia.mjs (NOVO)
│       ├── setup-zk-dev.sh (existente)
│       ├── prove-certificate.mjs (existente)
│       └── deploy-certification.mjs (existente)
│
├── prototipo-agrochain/
│   ├── certificador.html (NOVO)
│   ├── 11_web3.js (NOVO)
│   ├── template.html (existente)
│   ├── index.html (existente)
│   └── ... outros módulos
│
├── package.json (ATUALIZADO)
├── hardhat.config.js (existente)
├── CERTIFICADOR-WEB3.md (NOVO)
├── ARQUITETURA-WEB3.md (NOVO - este arquivo)
├── .env.example (NOVO)
└── ...
```

## 🔄 Integração com Sistemas Existentes

### Design System (design.md)
✓ Certificador.html segue 100% do design.md
- Tokens de cor: verde (ação), roxo (cripto), ouro (atenção), vermelho (risco)
- Tipografia: serifa em títulos, sans em corpo
- Espaçamento modular (4, 8, 12, 16, 24, 32px)
- Layout: 2 colunas (desktop), 1 coluna (mobile)
- Componentes: cartão, campo, botão, mensagem, abas

### Prototipo (prototipo-agrochain/)
✓ Novo módulo integrado horizontalmente
- Menu lateral com "Certificador" (nova opção)
- Mesmo topo sticky
- Mesmo sistema de cores e fonte
- Reutiliza padrão de cartão e grade

### Blockchain Existente
✓ Estende contratos sem quebrar
- `AgroChainCertificacoes` mantém interface
- `IAgroChainRegistro` + `IAgroChainGroth16Verifier` interfaces existentes
- Novos: `AgroChainRegistro.sol`, `AgroChainGroth16Verifier.sol`

### Scripts de Deploy
✓ Complementa pipeline existente
- `setup-zk-dev.sh` → `setup-zk-production.mjs` (mais robusto)
- `prove-certificate.mjs` (antigo) + `emit-certificate.mjs` (novo, integrado Web3)
- `deploy-certification.mjs` (Amoy) + `deploy-sepolia.mjs` (novo, Sepolia)

## 📈 Escalabilidade

### Suporte a Múltiplas Certificadoras
```javascript
// Setup multisig
const certificadoras = [
  "0xCertificadora1...", // Café
  "0xCertificadora2...", // Cacau
  "0xCertificadora3...", // Cana
];

for (const cert of certificadoras) {
  await contract.autorizarCertificadora(cert, true);
}
```

### Registro de Histórico Ilimitado
- AgroChainRegistro armazena em mappings (sem limite teórico)
- Queries por titular/emissor indexadas
- Paginação possível no frontend
- Off-chain indexing (The Graph, Alchemy) para analytics

### Múltiplas Redes
- Código Web3 agnóstico a rede (muda só RPC URL)
- Suporte a Sepolia (atual), Ethereum, Polygon, Arbitrum (futuro)
- Deploy script parametrizável

## 🛠️ Operação Contínua

### Monitoramento
```javascript
// Escutar novas certificações
Web3.monitorarCertificacoes((cert) => {
  console.log(`Nova cert: ${cert.id}, titular: ${cert.titular}`);
  // Enviar notificação, atualizar dashboard, etc
});
```

### Revogação
```javascript
// Revogar certificação com motivo
const motivoHash = ethers.keccak256(ethers.toUtf8Bytes("Fraude detectada"));
await contract.revogarCertificacao(certId, motivoHash);
```

### Auditoria
```javascript
// Listar todas as certificações de um titular
const certs = await contract.listarCertificacoesTitular("0x...");

// Verificar se uma cert é válida agora
const valida = await contract.certificacaoValida(certId);
```

---

**Arquitetura finalizada** • Pronto para deploy em Sepolia testnet • Código aberto e auditável
