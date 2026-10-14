# Plano de Implementação — Módulo Verification (Verificação de Origem, EUDR, ESG)

**Projeto:** AgroChain  
**Data:** 13/10/2026  
**Versão:** 1.0  

---

## Visão Geral

O módulo Verification implementa três camadas de verificação e certificação de lotes agrícolas:
1. **Verificação de Origem** — comprovação geográfica do local de produção
2. **EUDR Compliance** — detecção de desmatamento via dados de satélite (regulamento da UE)
3. **ESG Score** — cálculo de score ambiental, social e de governança

O trabalho decompõe-se em **5 features** independentes executadas sequencialmente, que deixam o codebase em estado compilável após cada uma:

### Feature Order
1. FEAT-001: Tipos TypeScript (OriginVerification, EUDRCompliance, ESGScore, VerificationStatus)
2. FEAT-002: Três contratos Solidity (OriginVerifier, EUDRVerifier, ESGScorer)
3. FEAT-003: Utils TypeScript com ABIs, mock data e helpers
4. FEAT-004: Páginas Next.js (Verification Dashboard + 3 especializadas)
5. FEAT-005: Integração Sidebar (adição de seção VERIFICAÇÃO com 4 links)

Após cada feature, o codebase compila, testa (quando há testes), e commita localmente.

---

## Padrões de Implementação (Extraídos da Codebase)

### Tipos TypeScript (`agrochain.ts`)
- Enums para status com valores semânticos em PT-BR
- Interfaces com campos opcionais marcados com `?`
- Timestamps como `number` (ms desde epoch)
- Nomes em PT-BR (ex: `Não Iniciado`, não `NotStarted`)
- Exemplo: `type LotStatus = 'Ativo' | 'Transferindo' | 'Transferido'`

### Contratos Solidity
- Versão: `pragma solidity 0.8.37` (padrão do projeto)
- Imports: OpenZeppelin (`IERC20`, `SafeERC20`, etc.)
- Estrutura: structs para dados, enums para status, mappings para armazenamento
- Documentação: `@notice`, `@dev`, `@param` (NatSpec)
- Exemplo: `AgroChainMarketplace.sol` — listings e offers com timestamps e status

### Utils de Contratos (`marketplace.ts` como padrão)
- Exporta `ABI` do contrato como array JSON
- Exporta `MOCK_DATA` com 10+ exemplos em estágios variados
- Funções helper: `filter*()`, `calculate*()`, `submit*()`
- Sem lógica de blockchain real — são mocks para UI

### Páginas Next.js
- Padrão: `'use client'` topo, imports wagmi/Next, tipos locais
- Estado: `useState` + `useEffect` para dados e filtros
- Layout: `maxWidth: 1320px`, margin `0 auto`, padding `0 20px`
- Cabeçalho: h1 em serifa (font-family Georgia), subtítulo em cinza
- Estrutura: cabeçalho → filtros → grid de cartões/tabela → rodapé com fonte
- Exemplo: `/marketplace/page.tsx` com filtros, listagens, ofertas

### Design System (de `design.md`)
- **Plano claro** (padrão): `--fundo: #f5f1e7`, `--texto-1: #1e2a22`
- **Cores semânticas**: verde (#1f6440) = ação, ouro (#b8912a) = atenção, vermelho (#a83226) = crítico
- **Tipografia**: titles serifa (Georgia), corpo sans-serif
- **Espaçamento**: base 4 px (4, 8, 12, 16, 24, 32)
- **Ícones**: SVG de traço único, sem emoji
- **Cartões**: fundo `--sup-1`, raio 16 px, sombra difusa
- **Abas e chips**: padrão de seleção com cores de papel

### Sidebar (Sidebar.tsx)
- Seções agrupadas com expand/collapse
- Items com ícone (emoji no padrão atual, será SVG futuramente)
- Link ativo: fundo `#1f6440`, cor `#f3f7f2`, peso 600
- Novo item: adicionar à seção apropriada ou criar nova seção `{ label: 'VERIFICAÇÃO', items: [...] }`

---

## Feature Details

### FEAT-001: Tipos TypeScript para Verification

**O quê:** Expandir `dapp/src/types/agrochain.ts` com 4 novas interfaces e 1 type.

**Rationale:** Tipos são a fundação — contratos, utils e páginas dependem deles. TypeScript garante coerência entre camadas.

**Interfaces a adicionar:**

```typescript
// Verificação de Origem — prova geolocalizada da origem do lote
interface OriginVerification {
  verificacaoId: string;          // UUID ou hash único
  loteId: string;                 // Referência ao lote
  pais: string;                   // País de origem (ex: "Brasil")
  regiao: string;                 // Região/estado (ex: "Minas Gerais")
  latitude: number;               // Coordenada de latitude
  longitude: number;              // Coordenada de longitude
  provaDeOrigem: string;          // URL ou hash de comprovante (imagem, GPS data, etc.)
  dataVerificacao: number;        // Timestamp de quando foi verificada
  status: VerificationStatus;     // Status da verificação
  verificadorAddress?: string;    // Endereço Ethereum do verificador
}

// Conformidade EUDR — Regulamento de Desmatamento (UE)
interface EUDRCompliance {
  eudrcId: string;                // UUID único
  loteId: string;                 // Referência ao lote
  dataVerificacao: number;        // Timestamp de verificação
  desmatamentoDetectado: boolean; // true se desmatamento detectado
  percentualDesmatamento?: number; // 0-100, % de área desmatada
  sateliteProva: string;          // URL ou hash de imagem de satélite
  confianca: number;              // 0-100, nível de confiança da análise
  status: VerificationStatus;     // Status da conformidade
  dataAnalise?: number;           // Data da análise por satélite
}

// Score ESG — Ambiental, Social, Governança
interface ESGScore {
  esgId: string;                  // UUID único
  loteId: string;                 // Referência ao lote
  scoreAmbiental: number;         // 0-100, ambientalismo
  scoreSocial: number;            // 0-100, justiça social
  scoreGovernanca: number;        // 0-100, governança corporativa
  scoreFinal: number;             // 0-100, média ponderada
  dataCalculada: number;          // Timestamp do cálculo
  metodologia: string;            // Descrição da metodologia (ex: "v2.1 - CDP")
  status: VerificationStatus;     // Status do score
  detalhes?: string;              // Notas adicionais
}

// Status da verificação — 4 estados possíveis
type VerificationStatus = 'Não Iniciado' | 'Em Verificação' | 'Aprovado' | 'Rejeitado';
```

**Decisão:** Status em PT-BR para coerência com tipos existentes (ex: `LotStatus`). Scores 0-100 em vez de percentual decimal por clareza. ESG usa ponderação 40/30/30 (será codificada nos contratos).

**Files:** `dapp/src/types/agrochain.ts`

**Verify:**
```bash
npx tsc --noEmit
```
Deve sair sem erros. Tipos compilam e exportam sem problemas.

---

### FEAT-002: Três Contratos Solidity

**O quê:** Implementar 3 contratos Solidity modulares em `blockchain/contracts/`:
- `OriginVerifier.sol` — registro de verificações de origem com prova geolocalizada
- `EUDRVerifier.sol` — verificação de conformidade EUDR com dados de satélite
- `ESGScorer.sol` — cálculo de scores ESG baseado em dados da produção

**Rationale:** 3 contratos separados permitem deploy independente, atualização sem quebrar os outros, e clareza de responsabilidade. Padrão já usado no projeto (AgroChainMarketplace, SmartLot, AgroChainPayments).

**OriginVerifier.sol:**
- Função `submitOriginVerification(bytes32 lotId, string country, string region, uint256 lat, uint256 lng, string proofUri)` → retorna `verificationId`
- Função `getVerification(string verificationId)` → retorna struct OriginVerification
- Mapeamento `verifications[verificationId] → OriginVerification`
- Enum `VerificationStatus { NOT_STARTED, IN_REVIEW, APPROVED, REJECTED }`
- Event `OriginVerificationSubmitted(verificationId, lotId, verifier)`
- Owner pode aprovar/rejeitar

**EUDRVerifier.sol:**
- Função `submitEUDRAnalysis(bytes32 lotId, bool deforestationDetected, uint256 confidence, string satelliteUri)` → retorna `complianceId`
- Função `getCompliance(string complianceId)` → retorna struct EUDRCompliance
- Mapeamento `compliances[complianceId] → EUDRCompliance`
- Mesmo enum de status
- Event `EUDRAnalysisSubmitted(complianceId, lotId, deforestation)`
- Owner pode atualizar resultado

**ESGScorer.sol:**
- Função `submitESGScore(bytes32 lotId, uint256 envScore, uint256 socScore, uint256 govScore)` → calcula ponderada (40/30/30) e retorna `scoreId`
- Função `getScore(string scoreId)` → retorna struct ESGScore
- Mapeamento `scores[scoreId] → ESGScore`
- Helper `calculateFinalScore(env, soc, gov) → uint256` — (env*40 + soc*30 + gov*30)/100
- Mesmo enum de status
- Event `ESGScoreSubmitted(scoreId, lotId, finalScore)`

**Padrão para todos os 3:**
- Versão: `pragma solidity 0.8.37`
- Imports: OpenZeppelin (`Ownable`, `ReentrancyGuard` se tocam token)
- NatSpec: `@notice`, `@dev`, `@param`, `@return`
- State variables públicos com comentário
- Estruturas de dados imutáveis após criação (não atualizam direto, criam nova versão)
- Timestamps via `block.timestamp`
- UUIDs/IDs como `string` ou `bytes32` (decidir por contrato)

**Decisão:** Usar `bytes32` para IDs (mais eficiente em gas), `string` para URIs (legível). Owner-based para aprovação (simples, já é padrão). Enums em inglês (padrão Solidity).

**Files:**
- `blockchain/contracts/OriginVerifier.sol`
- `blockchain/contracts/EUDRVerifier.sol`
- `blockchain/contracts/ESGScorer.sol`

**Verify:**
```bash
npm run blockchain:compile
```
Deve sair sem warnings (allow warnings if reentrancy not used). ABI de cada contrato é extraído automaticamente em `artifacts/`.

---

### FEAT-003: Utils TypeScript com ABIs, Mock Data e Helpers

**O quê:** Criar `dapp/src/lib/contracts/verification.ts` com:
- ABIs dos 3 contratos (copiadas de `artifacts/` após compile)
- Mock data: 10+ lotes em diferentes estágios (Não Iniciado, Em Verificação, Aprovado, Rejeitado)
- Funções helper: `submitOriginVerification()`, `verifyEUDRCompliance()`, `calculateESGScore()`

**Rationale:** ABIs e mocks permitem que as páginas funcionem sem rede blockchain. Helpers normalizam a interface entre UI e contratos. Padrão: `marketplace.ts` exporta ABI + MOCK_LISTINGS + filterListings().

**Estrutura de verification.ts:**

```typescript
// ABIs (copiadas de artifacts/ após hardhat compile)
export const ORIGIN_VERIFIER_ABI = [...]
export const EUDR_VERIFIER_ABI = [...]
export const ESG_SCORER_ABI = [...]

// Mock data: 10+ OriginVerifications em estágios variados
export const MOCK_ORIGIN_VERIFICATIONS: OriginVerification[] = [
  {
    verificacaoId: 'origin-001',
    loteId: 'lote-coffee-001',
    pais: 'Brasil',
    regiao: 'Minas Gerais',
    latitude: -20.7546,
    longitude: -43.3458,
    provaDeOrigem: 'ipfs://Qm...',
    dataVerificacao: 1728604800000, // ago 11, 2024
    status: 'Aprovado',
    verificadorAddress: '0x123...'
  },
  // ... 9+ mais
]

// Mock EUDR Compliances
export const MOCK_EUDR_COMPLIANCES: EUDRCompliance[] = [...]

// Mock ESG Scores
export const MOCK_ESG_SCORES: ESGScore[] = [...]

// Funções helper
export function submitOriginVerification(
  lotId: string,
  country: string,
  region: string,
  lat: number,
  lng: number,
  proofUri: string
): OriginVerification {
  // Retorna mock ou prepara transação
  return {
    verificacaoId: `origin-${Date.now()}`,
    loteId: lotId,
    pais: country,
    regiao: region,
    latitude: lat,
    longitude: lng,
    provaDeOrigem: proofUri,
    dataVerificacao: Date.now(),
    status: 'Em Verificação',
  }
}

export function verifyEUDRCompliance(
  lotId: string,
  deforestationDetected: boolean,
  satelliteUri: string
): EUDRCompliance {
  return {
    eudrcId: `eudr-${Date.now()}`,
    loteId: lotId,
    dataVerificacao: Date.now(),
    desmatamentoDetectado: deforestationDetected,
    satelliteProva: satelliteUri,
    confianca: 85,
    status: deforestationDetected ? 'Rejeitado' : 'Aprovado',
  }
}

export function calculateESGScore(
  lotId: string,
  envScore: number,
  socScore: number,
  govScore: number
): ESGScore {
  const finalScore = (envScore * 40 + socScore * 30 + govScore * 30) / 100
  return {
    esgId: `esg-${Date.now()}`,
    loteId: lotId,
    scoreAmbiental: envScore,
    scoreSocial: socScore,
    scoreGovernanca: govScore,
    scoreFinal: Math.round(finalScore),
    dataCalculada: Date.now(),
    metodologia: 'v2.1 - Ponderação 40/30/30',
    status: finalScore >= 70 ? 'Aprovado' : 'Em Verificação',
  }
}

// Filter/search helpers
export function filterVerifications(
  data: OriginVerification[],
  filter: { status?: VerificationStatus; pais?: string }
): OriginVerification[] {
  return data.filter(v =>
    (!filter.status || v.status === filter.status) &&
    (!filter.pais || v.pais === filter.pais)
  )
}
```

**Decisão:** Mock data em PT-BR, 10+ exemplos para cobrir todos os status. Helpers retornam mocks (não fazem blockchain call ainda). ABIs copiadas manualmente de `artifacts/`.

**Files:** `dapp/src/lib/contracts/verification.ts`

**Verify:**
```bash
npx tsc dapp/src/lib/contracts/verification.ts --noEmit
```
Compila sem erros. ABIs são válidos (passam em tipagem).

---

### FEAT-004: Páginas Next.js (Verification Dashboard + 3 Especializadas)

**O quê:** Criar 4 páginas em `dapp/src/app/verification/`:
1. `verification/page.tsx` — Dashboard com resumo dos 3 tipos
2. `verification/origin/page.tsx` — Verificação de Origem detalhada
3. `verification/eudr/page.tsx` — EUDR Compliance
4. `verification/esg/page.tsx` — ESG Scoring

**Rationale:** Cada página é um módulo independente (pode ter seus próprios filtros, gráficos, ações). Dashboard centraliza view de alto nível. Padrão: Next.js app directory + wagmi para wallet.

**Páginas a criar:**

#### 1. `verification/page.tsx` — Dashboard
- Cabeçalho: h1 "Verificação de Lotes" + subtítulo
- 3 cartões KPI: "Origem Verificada", "EUDR Compliant", "ESG Score ≥ 70%"
- Grid com 3 abas/seções:
  - **Origem**: tabela com lotId, país, região, status, botão "Ver detalhes"
  - **EUDR**: tabela com lotId, desmatamento?, confiança, status
  - **ESG**: tabela com lotId, scores (ambiental/social/gov), score final, status
- Filtros: por status (dropdown), por país (se origem ativa)
- Botão primário: "Registrar nova Verificação" (não faz nada, placeholder)
- Rodapé: fonte "Mock data · 11/10/2026" + metodologia

#### 2. `verification/origin/page.tsx` — Origin Verification
- Cabeçalho: h1 "Verificação de Origem"
- Formulário (blocos horizontais, não input real — apenas display):
  - Lote: dropdown de MOCK_LOTS
  - País: input text
  - Região: input text
  - Latitude/Longitude: números
  - Prova: link para upload (mock)
  - Botão: "Submeter Verificação" (mock toast)
- Abaixo: tabela de verifications em progresso com filtro por status
- Ações em linha: "Aprovar", "Rejeitar" (admin, mock)

#### 3. `verification/eudr/page.tsx` — EUDR Compliance
- Cabeçalho: h1 "Conformidade EUDR"
- Resumo: cartão com "Lotes Analisados", "Com Risco", "Conformes"
- Tabela: lotId, data análise, desmatamento?, confiança %, status
- Filtro: por status + por intervalo de confiança (slider mock)
- Cartão de alerta: "⚠ X lotes com desmatamento detectado" em cor ouro
- Botão: "Processar Nova Análise" (mock)

#### 4. `verification/esg/page.tsx` — ESG Scoring
- Cabeçalho: h1 "ESG Score"
- Gráfico (mock SVG): barras horizontais mostrando E/S/G de um lote selecionado
- Tabela: lotId, scoreAmbiental, scoreSocial, scoreGovernanca, scoreFinal, status
- Filtro: range de score final (0-100)
- Chip para cada lote: cor verde se final ≥ 70, ouro se 50-69, vermelho se <50
- Botão: "Calcular Score" (mock)

**Padrão comum para todas:**
- `'use client'` no topo
- `import { useState, useEffect } from 'react'`
- Layout máx 1320px, centered
- Cabeçalho em serifa (Georgia)
- Cartões com `--sombra-2`, raio 16px
- Cores de status: verde=Aprovado, laranja=Em Verificação, vermelho=Rejeitado, cinza=Não Iniciado
- Sem chamadas reais a blockchain (tudo mock)
- Responsive: tabelas com overflow-x em mobile

**Decisão:** Pages mocks-only (sem rede). Formato de tabela para data density (padrão AgroChain). Cores semânticas de design.md. Em breve: integração com contratos reais via wagmi + ethers.

**Files:**
- `dapp/src/app/verification/page.tsx`
- `dapp/src/app/verification/origin/page.tsx`
- `dapp/src/app/verification/eudr/page.tsx`
- `dapp/src/app/verification/esg/page.tsx`

**Verify:**
```bash
cd dapp && npm run build
```
Build next.js deve sair sem erros. Páginas renderizam sem quebra.

---

### FEAT-005: Integração Sidebar (Seção VERIFICAÇÃO)

**O quê:** Adicionar nova seção `VERIFICAÇÃO` em `dapp/src/components/layout/Sidebar.tsx` com 4 links:
- "Dashboard" → `/verification`
- "Origem" → `/verification/origin`
- "EUDR" → `/verification/eudr`
- "ESG" → `/verification/esg`

**Rationale:** Sidebar é o ponto de entrada único. Seção nova agrupa as 4 rotas de verificação. Padrão: copiar estrutura de seção existente (RASTREIO, DASHBOARD).

**Modificação:**

```typescript
// Em navSections, após seção 'RASTREIO' ou antes de 'DEX':
{
  label: 'VERIFICAÇÃO',
  items: [
    { href: '/verification', label: 'Dashboard', icon: '✓' },
    { href: '/verification/origin', label: 'Origem', icon: '🌍' },
    { href: '/verification/eudr', label: 'EUDR', icon: '📡' },
    { href: '/verification/esg', label: 'ESG', icon: '📊' },
  ]
}

// Em shouldSectionBeExpanded:
VERIFICAÇÃO: ['/verification'],

// No mapa ao final
sectionRouteMap[sectionLabel] = [...] // add VERIFICAÇÃO case
```

**Ícones:** Usar emojis temporários (será SVG futuramente). ✓ (aprovado), 🌍 (origem), 📡 (satélite), 📊 (score).

**Decisão:** Emoji agora (match padrão Sidebar atual), SVG quando houver módulo de ícones. Seção como nova (não distribuir entre RASTREIO ou DASHBOARD).

**Files:** `dapp/src/components/layout/Sidebar.tsx`

**Verify:**
```bash
cd dapp && npm run build
```
Build sem erros. Sidebar compila. Link de navegação acessível.

---

## Ordem de Execução

1. **FEAT-001** — Tipos (não depende de nada)
2. **FEAT-002** — Contratos Solidity (depende de tipos, compila com `hardhat compile`)
3. **FEAT-003** — Utils (depende de tipos + ABIs de FEAT-002)
4. **FEAT-004** — Páginas (depende de tipos + utils)
5. **FEAT-005** — Sidebar (depende de páginas, integração visual)

Cada FEAT deixa o codebase em estado compilável e commitável.

---

## Verificação Global (Após Todas as FEATs)

```bash
# Compilação TypeScript
npx tsc --noEmit

# Compilação Next.js
cd dapp && npm run build

# Compilação Solidity
npm run blockchain:compile
```

Todas as três devem sair sem erros. Nenhuma warning será tratada como erro nesta fase.

---

## Notas sobre Mock Data

Os 10+ lotes de mock data devem cobrir:
- ✓ Origem: 1 aprovada, 1 rejeitada, 1 em verificação, 2 não iniciadas
- ✓ EUDR: 1 com desmatamento (rejected), 2 sem (approved), 1 em progresso
- ✓ ESG: scores variados (1 alto ≥70, 1 médio 50-69, 1 baixo <50, 1 em progresso)
- ✓ Lotes: referência a lotes reais de MOCK_LOTS (marketplace ou rastreio)

---

## Próximas Fases (Não Neste Plano)

1. **Integração com Contratos Reais** — Trocar mocks por chamadas via wagmi + ethers
2. **Gráficos Interativos** — Adicionar gráficos de série temporal, heatmaps de satisfição EUDR
3. **Auditoria em Blockchain** — Registrar todas as ações (submit, approve) em evento
4. **Ícones SVG** — Substituir emoji por ícones de traço único conforme design.md
5. **Testes Unitários** — Jest para helpers, vitest para componentes, hardhat para contratos
6. **Mobile Responsivo** — Testar em dispositivos e ajustar grid/tabelas
