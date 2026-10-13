# Plano de Implementação: Módulo Completo de Rastreabilidade de Lotes (Lot Traceability)

**Objetivo**: Implementar sistema completo de rastreabilidade de lotes agrícolas com tipos TypeScript, contrato SmartLot, páginas UI (listagem e detalhes), integração MetaMask, QR code e certificações vinculadas. Integração com AgroChainPayments para transfer condicional a pagamento.

**Tech Stack**: Next.js 14, TypeScript, Solidity 0.8.37, wagmi/viem, MetaMask, Sepolia testnet.

**Design System**: Seguir design.md rigorosamente (papel kraft #f5f1e7, verde #1f6440, ouro #b8912a, Georgia serif em títulos).

---

## Decisões Arquiteturais

### 1. Tipos TypeScript (Lot, LotEvent, LotCertification)
- **Decisão**: Expandir agrochain.ts com três interfaces novas, mantendo padrão de CoffeeBatch/CacaoBatch.
- **Rationale**: Reutiliza padrão existente, facilita Type Safety em ambas dapp e eventos on-chain. Status enum (Ativo|Transferindo|Transferido) espelha máquina de estados do contrato.

### 2. SmartLot Simples (Sem Complexidade de Factory)
- **Decisão**: Único contrato registrando lotes (mapping loteId → Lot), sem factory pattern ou tokenização individual.
- **Rationale**: MVP focado. Tokenização individual (1 NFT por lote) fica para v2. Estrutura atual suporta milhares de lotes em um contrato.

### 3. Transfer Condicional a Pagamento
- **Decisão**: SmartLot.transferLot() valida OrderStatus em AgroChainPayments (ACCEPTED) antes de permitir mudança de propriedade.
- **Rationale**: Acoplamento mínimo entre contratos (apenas reads de status). Não modifica AgroChainPayments — apenas consulta. Impede fraude (transfer sem receber).

### 4. Timeline Visual (UI Only)
- **Decisão**: Eventos mockados no frontend para demo. Estrutura (LotEvent array) pronta para integração on-chain futura.
- **Rationale**: Sprint 1 focado em UX. Dados reais virão via contract read após testes em testnet.

### 5. QR Code Generator (URI, Não Imagem)
- **Decisão**: Função gerarUriQRCode(lotId) retorna string URI pronta para lib QR (qrcode.react ou similar). Não gera PNG server-side.
- **Rationale**: Reduz dependências (sem libqrencode no servidor). URI compartilhável. Frontend gera imagem PNG se necessário.

### 6. Integração MetaMask (wagmi)
- **Decisão**: Usar useAccount, useConnect, writeContract de wagmi. Sem ethers.js na dapp (compatível com wagmi).
- **Rationale**: Coerência com TopBar.tsx (já usa wagmi). Reduz bundle. viem (wagmi base) já carrega ABIs tipadas.

### 7. Mock Data para Demo
- **Decisão**: mockLotData.ts com 5+ lotes pré-populados. Páginas carregam mock até deploy real.
- **Rationale**: UX testável sem blockchain. Mudança para dados reais é local (trocar getData() por contrato call).

### 8. Estilo Inline (Sem Tailwind/CSS-in-JS)
- **Decisão**: Seguir padrão de producer/page.tsx — style objects inline, design.md tokens como valores.
- **Rationale**: Coerência visual, zero dependências de libs de estilo, offline-friendly.

---

## Estrutura de Arquivos (Final)

```
blockchain/contracts/
├── SmartLot.sol                        (novo)
├── AgroChainPayments.sol               (existente — não modificar)
├── [outros contratos existentes]

blockchain/artifacts/
└── SmartLot.json                       (gerado após compile)

dapp/src/types/
├── agrochain.ts                        (update: Lot, LotEvent, LotCertification)

dapp/src/lib/
├── lotConstants.ts                     (novo: LotEventType, CertificationType, LotStatus, colors)
├── lotUtils.ts                         (novo: formatarData, gerarUriQRCode, obterCorStatus, formatarArea)
├── mockLotData.ts                      (novo: MOCK_LOTS, getMockLotsForProducer)
└── contracts/
    └── smartlot.ts                     (novo: SMARTLOT_ABI, helper functions)

dapp/src/app/lote/
├── page.tsx                            (novo: Lot Listing com filtros)
└── [lotId]/
    └── page.tsx                        (novo: Lot Details com timeline e certificações)

dapp/src/components/layout/
└── Sidebar.tsx                         (update: adicionar links /lote)

.agents/tasks/lot-traceability/
├── task.json
├── context.json
├── plan.md                             (este arquivo)
└── features/
    ├── FEAT-001.json
    ├── FEAT-002.json
    ├── FEAT-003.json
    └── FEAT-004.json
```

---

## Features Sequenciais (Independentes Internamente, Dependentes Externamente)

A decomposição em 4 features permite paralelização em scenarios futuros, mas execução é **estritamente sequencial** (cada feature depende de anteriores):

1. **FEAT-001**: Tipos + Constantes (TypeScript only) — nada depende desta fora do projeto.
2. **FEAT-002**: SmartLot Contrato — depende de tipos em FEAT-001 (imports para verificação).
3. **FEAT-003**: UI Pages — depende de tipos (FEAT-001) e SmartLot ABI (FEAT-002).
4. **FEAT-004**: Utils + Mock Data — depende de tipos (FEAT-001) e ABI (FEAT-002).

**Ordem de Execução**: 1 → 2 → 3 → 4 (obrigatória).

---

## Verificação Cruzada Entre Features

| Fase | Verificação |
|------|-------------|
| Após FEAT-001 | npm run build compila dapp sem erros; grep encontra interfaces em agrochain.ts |
| Após FEAT-002 | npm run blockchain:compile compila SmartLot.sol; ABI está em artifacts/SmartLot.json |
| Após FEAT-003 | npm run build compila dapp; pages renderizam no navegador; Sidebar exibe links |
| Após FEAT-004 | npm run build compila; import mockLotData não gera erros; funções helper retornam tipos corretos |

---

## Checklist Final (Antes de Revisar)

- [ ] Tipos TypeScript compilam sem erros e importam corretamente
- [ ] Contrato SmartLot compila com Solidity 0.8.37
- [ ] Funções do contrato cobrem: registerLot, addEvent, addCertification, transferLot, getCertifications, getLot
- [ ] SmartLot.transferLot valida order status em AgroChainPayments antes de transferir
- [ ] Páginas /lote e /lote/[lotId] carregam com dados mock
- [ ] Filtros em /lote funcionam (safra, status, certificação)
- [ ] Timeline em [lotId] renderiza eventos de forma visual (vertical)
- [ ] Certificações mostram status com cores semânticas (verde ativo, ouro pendente, vermelho revogado)
- [ ] Botão "Adicionar Evento" abre form e conecta a MetaMask
- [ ] QR code URI pode ser gerado para cada lote
- [ ] Sidebar exibe link para /lote
- [ ] Todas as cores seguem design.md (fundo, texto, verde, ouro)
- [ ] Tipografia: Georgia em títulos, sans-serif regular em corpo
- [ ] Nenhuma dependência externa adicionada (qrcode.react fica para v2 se gerador PNG necessário)

---

## Próximos Passos (Fora do Escopo)

- [ ] Contrato de Lote como NFT individual (ERC721 por lote, não por evento)
- [ ] Timelock em transfer (delay antes de propriedade mudar)
- [ ] Backend para dados reais (substituir mock por API ou GraphQL)
- [ ] Validação de certificações on-chain (integrar AgroChainCertificacoes)
- [ ] Gerador de QR code PNG via lib externa (qrcode.react)
- [ ] Auditoria e testes de segurança em SmartLot

---

## Resumo de Esforço

| Feature | Esforço | Razão |
|---------|---------|-------|
| FEAT-001 | Baixo | Apenas tipos e constantes |
| FEAT-002 | Médio | Contrato com 6 funções, integração com AgroChainPayments, testes básicos |
| FEAT-003 | Alto | 2 páginas, filtros, timeline, form modal, MetaMask, design system inline |
| FEAT-004 | Médio | Utils simples, mock data estruturada, tipagem |

**Total**: ~80 horas de dev + 20 horas de testes/review = ~100 horas.

---

## Referências de Código

- **Tipos**: Padrão de CoffeeBatch em dapp/src/types/agrochain.ts
- **Contratos**: Padrão de AgroChainPayments (eventos, mappings, view functions) em blockchain/contracts/AgroChainPayments.sol
- **Pages**: Padrão de producer/page.tsx para UI inline-styled, mock data, wagmi hooks
- **ABI**: Export pattern em dapp/src/lib/contracts.ts (AGROCHAIN_VERIFIER_ABI)
- **Design**: Paleta color em design.md (seção 2.1 e 2.2)

