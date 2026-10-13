# 🌾 AgroChain - Coffee & Cacao Supply Chain Platform

**Blockchain + AI Compliance 360° para Rastreabilidade de Coffee e Cacao**

## 🎯 Visão Geral

AgroChain é uma plataforma completa de rastreabilidade para cadeias produtivas de **Coffee (Arabica, Robusta/Conilon)** e **Cacao (Criollo, Forastero, Trinitario, Nacional)** que combina:

- 🔐 **Certificação Zero-Knowledge** (Groth16 + Poseidon)
- 🤖 **IA Compliance 360°** (Groq LLM + EUDR Validation)
- 📜 **Smart Contracts Solidity ^0.8.24**
- 💱 **CoffeeCacaoSwap DEX** (em desenvolvimento)

---

## 🚀 Quick Start

### Opção 1: Script Automático (Recomendado)

\\\powershell
.\start-agrochain.ps1
\\\

### Opção 2: Inicialização Manual

**Terminal 1 - Node.js Server (ZK Certificador):**
\\\powershell
node server.js
\\\

**Terminal 2 - FastAPI Server (AI Compliance):**
\\\powershell
python ia/compliance_api.py
\\\

**Abrir no navegador:**
- Homepage: http://localhost:8000/
- Dashboard: http://localhost:8000/dashboard.html
- API Docs: http://localhost:8001/docs

---

## 📦 Estrutura do Projeto

\\\
agrochain/
├── blockchain/
│   ├── contracts/
│   │   ├── AgroChainCoffeeCacaoTraceability.sol  ☕🍫 Rastreamento Coffee/Cacao
│   │   ├── AgroChainCertificacoes.sol            🔐 Certificação ZK
│   │   └── AgroChainGroth16Verifier.sol          ✓ Verificador ZK
│   ├── circuits/
│   │   └── agrochain-score-threshold_final.zkey  🔑 Circuit Key
│   └── scripts/
│
├── ia/
│   ├── coffee_cacao_compliance_engine.py         🤖 Motor IA Coffee/Cacao
│   └── compliance_api.py                         🌐 FastAPI Server
│
├── prototipo-agrochain/
│   ├── index.html                                🏠 Homepage Principal
│   ├── dashboard.html                            📊 Dashboard Integrado
│   ├── certificador.html                         🔐 Certificador ZK
│   └── AgroChain.html                            🌾 Portal Completo
│
├── .kiro/specs/cafeswap/                         💱 Specs CoffeeCacaoSwap DEX
│   ├── requirements.md
│   ├── design.md
│   └── tasks.md
│
├── .env                                          🔧 Configuração (Groq API Key)
└── start-agrochain.ps1                           🚀 Script de Inicialização
\\\

---

## 🌟 Funcionalidades Principais

### 1. 🔐 Certificação Zero-Knowledge
- Provas criptográficas Groth16
- Commitments Poseidon Hash
- Verificação On-Chain
- Privacy-Preserving Validation

### 2. 🤖 AI Compliance Engine
- **Geo-Compliance EUDR (45%)**: Validação de desmatamento pós-31/12/2020
- **Mass Balance Anti-Fraud (35%)**: Detecção de "lavagem de grãos" via Z-Score
- **Quality & Documentary (20%)**: Auditoria de NF-e, Romaneio, SCA/Quality Scores
- **Groq LLM**: Explainable AI Reasoning

### 3. ☕ Coffee Traceability
- **Varietais**: Arabica, Robusta/Conilon
- **SCA Cupping Scores**: Mínimo 80 pts para specialty
- **Processing Methods**: Washed, Natural, Honey, Wet-Hulled
- **Tokenization**: Integração com CoffeeCacaoSwap

### 4. 🍫 Cacao Traceability
- **Varietais**: Criollo, Forastero, Trinitario, Nacional
- **Quality Score**: Mínimo 75 pts para premium
- **Processing**: Fermentation, Drying, Roasting tracking
- **NDVI Validation**: Shade-tree plantations (>0.78)

### 5. 💱 CoffeeCacaoSwap DEX (Em Desenvolvimento)
- AMM exclusivo para tokens Coffee/Cacao certificados
- Liquidity Mining com token CAFE
- Governança descentralizada
- Multi-chain (CafeChain, Polygon, Arbitrum)

---

## 🔧 Configuração

### Pré-requisitos
- Node.js (v18+)
- Python (3.8+)
- PowerShell (Windows)

### Dependências Python
\\\ash
pip install groq fastapi uvicorn pydantic requests python-dotenv
\\\

### Variáveis de Ambiente
Edite o arquivo \.env\:
\\\env
GROQ_API_KEY=REDACTED_GROQ_KEY
MIN_COFFEE_SCA_SCORE=80
MIN_CACAO_QUALITY_SCORE=75
EUDR_COMPLIANCE_REQUIRED=true
\\\

---

## 📡 Endpoints da API

### FastAPI (porta 8001)

**Health Check:**
\\\ash
GET http://localhost:8001/health
\\\

**Coffee Analysis:**
\\\ash
POST http://localhost:8001/api/coffee/analyze
Content-Type: application/json

{
  "batch_id": "COFFEE_ARABICA_001",
  "variety": "ARABICA",
  "sca_score": 84.5,
  "eudr_compliant": true,
  ...
}
\\\

**Cacao Analysis:**
\\\ash
POST http://localhost:8001/api/cacao/analyze
Content-Type: application/json

{
  "batch_id": "CACAO_FORASTERO_001",
  "variety": "FORASTERO",
  "quality_score": 82.0,
  "eudr_compliant": true,
  ...
}
\\\

**Documentação Completa:**
http://localhost:8001/docs (Swagger UI)

---

## 🏗️ Arquitetura em 4 Camadas

### 1️⃣ Camada de Originação
- Polígonos GeoJSON de talhões
- Bases públicas: SICAR, IBAMA, PRODES, MapBiomas
- Satélite Sentinel-2 NDVI
- Documentos: NF-e, Romaneio Silo, Laudos SCA/Qualidade

### 2️⃣ Camada Blockchain (On-Chain)
- Registro imutável de fazendas e talhões
- Criação de lotes Coffee/Cacao com status \PENDING_AI_VERIFICATION\
- Acumulação de massa por safra/talhão
- Trava automática até validação AI

### 3️⃣ Camada de IA (Oracle)
- Motor AI com 3 módulos de compliance
- Groq LLM para reasoning explicável
- Merkle Tree para provas criptográficas
- Relatórios IPFS

### 4️⃣ Camada de Validação (On-Chain)
- Verificação de assinatura do oráculo AI
- Validação de scores contra governança
- Liberação de \	ransferCustody()\ ou bloqueio
- Transparência pública via eventos

---

## 📊 Métricas do Sistema

| Métrica | Valor |
|---------|-------|
| Commodities Suportados | 2 (Coffee, Cacao) |
| Varietais | 6 (2 Coffee + 4 Cacao) |
| EUDR Compliance | 100% |
| Peso Geo-Compliance | 45% |
| Peso Mass Balance | 35% |
| Peso Quality/Documentary | 20% |
| Min SCA Score (Coffee) | 80 pts |
| Min Quality Score (Cacao) | 75 pts |

---

## 🧪 Testes

### Testar Coffee Compliance Engine
\\\ash
python ia/coffee_cacao_compliance_engine.py
\\\

### Testar API via cURL
\\\ash
curl -X POST http://localhost:8001/api/coffee/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "batch_id": "TEST_001",
    "variety": "ARABICA",
    "processing": "WASHED",
    "weight_kg": 12000,
    "farm_name": "Fazenda Teste",
    "region": "cerrado",
    "harvest_date": 1640995200,
    "sca_score": 85.5,
    "moisture_content": 11.0,
    "defects_per_350g": 2,
    "geo_json_hash": "0xtest",
    "eudr_compliant": true,
    "satellite_ndvi": 0.82,
    "plot_area_ha": 60.0
  }'
\\\

---

## 🛣️ Roadmap

### ✅ Fase 1: Concluída
- [x] Certificação ZK (Groth16 + Poseidon)
- [x] AI Compliance Engine (Coffee & Cacao)
- [x] Smart Contracts Solidity
- [x] FastAPI + Groq LLM Integration
- [x] Homepage + Dashboard

### 🚧 Fase 2: Em Desenvolvimento
- [ ] CoffeeCacaoSwap DEX (6 contratos)
- [ ] Frontend React para DEX
- [ ] Deployment em testnet
- [ ] Integração Bridge multi-chain

### 📋 Fase 3: Planejada
- [ ] Mobile App (React Native)
- [ ] Oracle Node descentralizado
- [ ] Governance DAO
- [ ] Mainnet deployment

---

## 🤝 Contribuindo

Este é um projeto em desenvolvimento. Contribuições são bem-vindas!

---

## 📄 Licença

MIT License - Coffee & Cacao Supply Chain Platform

---

## 🔗 Links Úteis

- **Homepage**: http://localhost:8000/
- **Dashboard**: http://localhost:8000/dashboard.html
- **Certificador ZK**: http://localhost:8000/certificador.html
- **API Docs**: http://localhost:8001/docs
- **Health Check**: http://localhost:8001/health

---

**🌾 AgroChain** - Transformando a rastreabilidade de Coffee e Cacao com Blockchain + IA
