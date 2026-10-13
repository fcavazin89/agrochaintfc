# 🌱 AgroChain • Sistema Web3 de Certificação

**Emissão de certificados agrícolas com prova zero-knowledge (ZK), NFT soulbound e tokens fungíveis na rede Sepolia testnet.**

## 🚀 Comece Aqui

👉 **Novo? Primeiro passo:** [QUICKSTART-WEB3.md](./QUICKSTART-WEB3.md) (5 minutos)

👉 **Dev? Quer entender:** [ARQUITETURA-WEB3.md](./ARQUITETURA-WEB3.md) (45 minutos)

👉 **Operador? Precisa saber:** [CERTIFICADOR-WEB3.md](./CERTIFICADOR-WEB3.md) (30 minutos)

👉 **Resumo executivo:** [IMPLEMENTACAO-RESUMIDA.md](./IMPLEMENTACAO-RESUMIDA.md) (10 minutos)

## 📊 O que foi implementado

### **Contratos Smart (Blockchain)**
```solidity
AgroChainCertificacoes         ← ERC721 + ERC20 + Groth16 Verifier
├─ AgroChainRegistro.sol       ← Novo: Registro ZK auditável
└─ AgroChainGroth16Verifier.sol ← Novo: Verificação on-chain
```

### **Backend (Node.js Scripts)**
```javascript
setup-zk-production.mjs     ← Novo: Compilação de Circom + setup ZK
emit-certificate.mjs        ← Novo: Emissão com prova ZK
deploy-sepolia.mjs          ← Novo: Deploy em Sepolia testnet
```

### **Frontend (Browser)**
```html
certificador.html           ← Novo: Interface de emissão
11_web3.js                  ← Novo: Módulo Web3 + MetaMask
```

## 🎯 Funcionalidades Principais

✅ **Emissão de Certificados**
- Prova ZK: score >= nota mínima sem revelar valor exato
- NFT soulbound intransferível (ERC721)
- Token de recompensa AGRO (ERC20)
- Válido por período configurável

✅ **Rastreabilidade**
- Registro histórico completo
- Identificação de certificadora e titular
- Hashes de contexto (lote, padrão, laudo)
- Timestamps em blocos

✅ **Revogação Auditável**
- Revogar certificação sem apagar histórico
- Motivo hash para compliance
- Responsável identificado
- Eventos imutáveis

✅ **Interface Web3**
- Conexão MetaMask
- Detecção de Sepolia
- Geração de prova local
- Emissão on-chain com gás estimado
- Monitoramento de TX

## 📖 Documentos de Referência

### Para Começar Rápido
- **[QUICKSTART-WEB3.md](./QUICKSTART-WEB3.md)** — Setup em 5 min

### Para Entender a Arquitetura
- **[ARQUITETURA-WEB3.md](./ARQUITETURA-WEB3.md)** — Visão completa do sistema
- **[design.md](./design.md)** — Design system (cores, tipografia, componentes)

### Para Usar e Operar
- **[CERTIFICADOR-WEB3.md](./CERTIFICADOR-WEB3.md)** — Guia completo de operação
- **[.env.example](./.env.example)** — Variáveis de ambiente

### Resumos
- **[IMPLEMENTACAO-RESUMIDA.md](./IMPLEMENTACAO-RESUMIDA.md)** — O que foi entregue
- **[README-WEB3.md](./README-WEB3.md)** — Este arquivo

## 💻 Estrutura de Diretórios

```
agrochain/
│
├─ blockchain/
│  ├─ contracts/
│  │  ├─ AgroChainCertificacoes.sol ........... Certificador (existente)
│  │  ├─ AgroChainRegistro.sol ............... Registro ZK (NOVO)
│  │  ├─ AgroChainGroth16Verifier.sol ........ Verificador (NOVO)
│  │  ├─ IAgroChainRegistro.sol .............. Interface (existente)
│  │  └─ IAgroChainGroth16Verifier.sol ....... Interface (existente)
│  │
│  ├─ circuits/
│  │  └─ agrochain-score-threshold.circom ... Circuito ZK (existente)
│  │
│  ├─ scripts/
│  │  ├─ setup-zk-production.mjs ............. Setup ZK (NOVO)
│  │  ├─ emit-certificate.mjs ............... Emissão (NOVO)
│  │  ├─ deploy-sepolia.mjs ................. Deploy Sepolia (NOVO)
│  │  └─ ... scripts existentes
│  │
│  └─ artifacts/
│     └─ (Gerados automaticamente)
│
├─ prototipo-agrochain/
│  ├─ certificador.html ....................... Interface Web3 (NOVO)
│  ├─ 11_web3.js .............................. Módulo Web3 (NOVO)
│  ├─ template.html ........................... Layout padrão (existente)
│  └─ ... outros módulos
│
├─ CERTIFICADOR-WEB3.md ....................... Guia técnico completo
├─ ARQUITETURA-WEB3.md ........................ Visão arquitetural
├─ QUICKSTART-WEB3.md ......................... Início rápido
├─ IMPLEMENTACAO-RESUMIDA.md .................. Resumo de entrega
├─ README-WEB3.md ............................ Este arquivo
├─ .env.example .............................. Template de configuração
│
├─ package.json .............................. Atualizado com novos scripts
├─ hardhat.config.js ......................... Configuração Hardhat
└─ ... outros arquivos do projeto
```

## 🔄 Fluxo de Emissão (Resumido)

```
1. Usuário abre certificador.html
   ↓
2. Conecta MetaMask (Sepolia)
   ↓
3. Preenche dados (lote, padrão, laudo, score privado, sal)
   ↓
4. Clica "Gerar Prova ZK"
   → snarkjs gera Groth16 localmente
   → Score privado NUNCA sai do cliente
   ↓
5. Clica "Emitir Certificação"
   → TX enviada: (pedido, prova)
   → MetaMask aprova
   ↓
6. Contrato valida e emite
   → Verifica Groth16 prova
   → Minta NFT intransferível
   → Distribui 1000 AGRO
   ↓
7. Resultado exibido
   → TX hash (link Sepolia Scan)
   → NFT ID
   → AGRO recebido
```

## 🛠️ Scripts NPM

```bash
# Compilar contratos
npm run blockchain:compile

# Setup ZK (gera r1cs, wasm, zkey, verifier)
npm run zk:setup:prod

# Emitir certificação (com prova ZK)
npm run zk:emit -- --score 85 --salt 12345

# Deploy em Sepolia
npm run deploy:sepolia

# Teste de certificação
npm run test:certification

# Deploy em Amoy (existente)
npm run deploy:amoy
```

## 🔐 Segurança

### Prova Zero-Knowledge
- **Private**: Score, sal
- **Public**: Commitment, nota mínima, hashes de contexto
- **Prova**: score >= notaMinima sem revelar valor exato
- **On-chain**: Groth16 verificação

### NFT Soulbound
- Não pode ser transferido
- Permanente no titular
- Impossível vender/roubar

### Registro Auditável
- Histórico completo imutável
- Timestamps em blocos
- Eventos para compliance

### Rede Segura
- Sepolia testnet pública
- Dados exploráveis em etherscan.io
- Sem valor real (ETH de teste)

## 📊 Casos de Uso

### 1. **Certificação de Café**
```javascript
pedido = {
  tipo: "Café Arabica Premium",
  notaMinima: 80,
  validoAte: 2025-12-31,
  titular: 0xProdutor123...
}

// Score privado do produtor: 85
// Prova ZK: score >= 80 ✓
// Resultado: NFT intransferível + 1000 AGRO
```

### 2. **Auditoria de Lote**
```javascript
// Qualquer um pode verificar:
const valida = await contract.certificacaoValida(certId);
const cert = await registro.obterCertificacao(certId);

// Resultado: histórico completo, timestamp, emissor, etc.
```

### 3. **Revogação por Fraude**
```javascript
const motivoHash = ethers.keccak256(
  ethers.toUtf8Bytes("Fraude detectada em análise")
);
await contract.revogarCertificacao(certId, motivoHash);

// Resultado: histórico preservado, revogação rastreada
```

## 🌐 Redes Suportadas

| Rede | Chain ID | RPC | Faucet | Status |
|------|----------|-----|--------|--------|
| **Sepolia** | 11155111 | Alchemy/Infura | sepoliafaucet.com | ✅ Implementado |
| Ethereum | 1 | - | - | 🚧 Futuro |
| Polygon | 137 | - | - | 🚧 Futuro |
| Arbitrum | 42161 | - | - | 🚧 Futuro |

## 📚 Dependências

```json
{
  "@openzeppelin/contracts": "^5.6.1",
  "ethers": "^6.17.0",
  "snarkjs": "^0.7.6",
  "circom2": "^0.2.23",
  "hardhat": "^3.18.1"
}
```

## 🆘 Troubleshooting Rápido

| Problema | Solução |
|----------|---------|
| "MetaMask not detected" | Instale/atualize MetaMask |
| Rede incorreta | Botão "Mudar para Sepolia" |
| Sem ETH de teste | sepoliafaucet.com |
| TX falha | Gere prova ZK antes |
| Não vê resultado | Aguarde ~30s (rede) |

👉 **Detalhado:** [CERTIFICADOR-WEB3.md → Troubleshooting](./CERTIFICADOR-WEB3.md#troubleshooting)

## 💡 Dicas Pro

✅ Reutilize dados de teste para múltiplas emissões  
✅ Monitore eventos para automação  
✅ Auditoria é pública (anyone pode ver)  
✅ Tudo é imutável no blockchain  
✅ Revogação mantém histórico completo  

## 🎯 Roadmap Futuro

- [ ] Dashboard de rastreamento
- [ ] Integração IPFS para metadados
- [ ] Marketplace de certificações
- [ ] DAO de certificadores
- [ ] Deploy em Mainnet (Ethereum/Polygon)

## 📞 Suporte

- **Documentação Técnica**: [ARQUITETURA-WEB3.md](./ARQUITETURA-WEB3.md)
- **Guia de Operação**: [CERTIFICADOR-WEB3.md](./CERTIFICADOR-WEB3.md)
- **Início Rápido**: [QUICKSTART-WEB3.md](./QUICKSTART-WEB3.md)
- **Design System**: [design.md](./design.md)

## 📝 Licença

MIT © 2026 AgroChain

---

## 🎯 Comece Agora

**Opção 1: Aprender em 5 min**
→ [QUICKSTART-WEB3.md](./QUICKSTART-WEB3.md)

**Opção 2: Entender arquitetura**
→ [ARQUITETURA-WEB3.md](./ARQUITETURA-WEB3.md)

**Opção 3: Usardirectamente**
→ Abra `prototipo-agrochain/certificador.html` no navegador

---

**AgroChain © 2026** • Certificação agrícola com blockchain e zero-knowledge proofs
