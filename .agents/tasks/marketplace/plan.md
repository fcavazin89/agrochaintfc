# Plano de Implementação: Módulo Marketplace para AgroChain

## Visão Geral

O módulo Marketplace adiciona funcionalidade de venda de lotes (Coffee e Cacao) diretamente entre produtores e compradores, integrado com o sistema de pagamentos em escrow já existente (`AgroChainPayments.sol`). O design segue rigorosamente o design system documentado em `design.md` (v3.0), com temas claro e escuro, tipografia em serifa para KPIs, e componentes seguindo a paleta de cores e tokens de espaço especificados.

## Contexto de Projeto

- **Tech Stack**: Next.js 14, TypeScript, React 18, Wagmi 2, Viem 2 para interações Web3
- **Blockchain**: Sepolia testnet, contrato `AgroChainPayments.sol` já implementado
- **Design System**: `design.md` v3.0 com tema claro (padrão) e escuro (modo imersivo)
- **Estrutura Existente**:
  - Tipos base em `dapp/src/types/agrochain.ts` (interfaces `ProducerBatch`, `ActiveSale`, `BatchType`)
  - Componentes de layout: `Sidebar`, `TopBar` com navegação por seções
  - Exemplos em `producer/page.tsx` e `mercado/page.tsx` (placeholder)
  - Sistema de pagamentos: `AgroChainPayments.sol` com structs `Order` e eventos

## Decisões de Arquitetura

### 1. Contrato Inteligente: AgroChainMarketplace.sol
- **Decisão**: Criar novo contrato especializado em marketplace em vez de reutilizar `AgroChainPayments` diretamente
- **Rationale**: Marketplace precisa de lógica adicional (listagens persistentes, busca por tipo, notificações de novo produto, histórico de vendas) que polui o contrato de pagamentos. Marketplace chama `AgroChainPayments` como dependência para escrow e execução de pagamentos, mantendo separação de responsabilidades.
- **Estrutura**:
  - Listagem (`Listing`): produtor → lote → preço → status
  - Oferta (`Offer`): comprador → listagem → quantidade → status
  - Integração com `AgroChainPayments` para criar `Order` quando oferta é aceita

### 2. Tipos TypeScript
- **Extensão em `agrochain.ts`**:
  - `MarketplaceListingStatus`: 'Active' | 'Sold' | 'Cancelled'
  - `MarketplaceOfferStatus`: 'Pending' | 'Accepted' | 'Rejected' | 'Expired'
  - `MarketplaceFilter`: { type: BatchType, minPrice: number, maxPrice: number, sortBy: 'price' | 'recent' }
  - Interface `MarketplaceListing` com: id, produtor, lote, tipo, quantidade, preço, status, criação, atualização
  - Interface `MarketplaceOffer` com: id, oferta, listagem, comprador, preço, status, criação

### 3. Páginas Next.js
- **`/marketplace`** (página principal): grid de listagens com filtros (tipo, preço, ordenação), busca por produtor
- **`/marketplace/[listingId]`** (detalhe): visualização completa da listagem, histórico de talhão, certificações, botão "Fazer Oferta" com modal de entrada de preço
- **`/marketplace/my-listings`** (meu marketplace): tabela de listagens ativas do produtor conectado, criar nova listagem, editar preço, cancelar

### 4. Helpers em `marketplace.ts`
- Funções: `createListing`, `makOffer`, `acceptOffer`, `fetchListings`, `fetchMyListings`, `calculateTotalPrice`
- Integração com Wagmi para chamadas ao contrato

### 5. Componentes Visuais
- Seguem tokens de `design.md`: espaçamento em múltiplos de 4px (`--e-1` a `--e-6`), raios (`--raio-xs` a `--raio-lg`), tipografia (serifa em KPI, sans em operacional)
- Chips de status: verde para "Active", ouro para "Sold", cinza para "Cancelled"
- Cartões com sombra `--sombra-2` e brilho `--brilho`
- KPI em serifa (`--t-2xl`), body em sans (`--t-md`)

### 6. Ordem de Implementação
1. Contrato `AgroChainMarketplace.sol` (teste, compile, deploy)
2. Tipos em `agrochain.ts`
3. Helpers em `marketplace.ts`
4. Sidebar: adicionar links `/marketplace`, `/marketplace/my-listings`
5. Página `/marketplace` (listagens, filtros, busca)
6. Página `/marketplace/[listingId]` (detalhe, modal de oferta)
7. Página `/marketplace/my-listings` (gerenciamento)

---

# Plano de Implementação Detalhado

## Fase 1: Contrato Inteligente

### 1.1 Criar AgroChainMarketplace.sol
**O quê**: Novo contrato com listagens, ofertas, integração com `AgroChainPayments`.  
**Arquivo**: `blockchain/contracts/AgroChainMarketplace.sol`  
**Verify**: `npm run blockchain:compile` — compila sem erros, contrato em `artifacts/`.

**Detalhes**:
```solidity
// Structs principais
enum ListingStatus { Active, Sold, Cancelled }
enum OfferStatus { Pending, Accepted, Rejected, Expired }

struct Listing {
  uint256 listingId;
  address seller;
  string lotId;           // referência ao lote (SmartLot)
  BatchType batchType;    // 'Coffee' ou 'Cacao'
  uint256 weightKg;
  uint256 pricePerKg;     // em tokens (ex: USDC com 6 decimals)
  address tokenAddress;   // USDC ou outro ERC20
  ListingStatus status;
  uint256 createdAt;
  uint256 updatedAt;
  uint256 soldKg;         // kg já vendido
}

struct Offer {
  uint256 offerId;
  uint256 listingId;
  address buyer;
  uint256 quantity;       // kg oferecidos
  uint256 pricePerKg;     // pode ser menor que listagem
  OfferStatus status;
  uint256 createdAt;
  uint256 expiresAt;
  uint256 orderId;        // referência ao Order em AgroChainPayments (quando aceito)
}

// Events
event ListingCreated(uint256 listingId, address seller, string lotId, ...);
event ListingCancelled(uint256 listingId);
event OfferCreated(uint256 offerId, uint256 listingId, address buyer, ...);
event OfferAccepted(uint256 offerId, uint256 orderId);
event OfferRejected(uint256 offerId);

// Functions
function createListing(...) external returns (uint256 listingId);
function cancelListing(uint256 listingId) external;
function makeOffer(uint256 listingId, uint256 quantityKg, uint256 pricePerKg) external returns (uint256 offerId);
function acceptOffer(uint256 offerId) external;  // chama AgroChainPayments.createOrder
function rejectOffer(uint256 offerId) external;
function getActiveListing(uint256 listingId) external view returns (Listing);
function getListings(BatchType filterType, uint256 limit, uint256 offset) external view returns (Listing[]);
function getOffers(uint256 listingId) external view returns (Offer[]);
```

**Decisão de Design**:
- Usar `enum BatchType { Coffee, Cacao }` no contrato (em vez de string) para economizar gas — já existe em `SmartLot.sol`
- `tokenAddress` em `Listing` permite múltiplos tokens (USDC, MockUSDC) — flexibilidade futura
- `pricePerKg` em uint256 (scaled, ex: 6 decimals para USDC) — segue padrão de `AgroChainPayments`

---

## Fase 2: Tipos TypeScript

### 2.1 Estender agrochain.ts
**O quê**: Adicionar tipos de Marketplace após tipos existentes.  
**Arquivo**: `dapp/src/types/agrochain.ts`  
**Verify**: TypeScript compila sem erros (`npm run lint`).

**Adicionar**:
```typescript
export enum MarketplaceListingStatus {
  Active = 'Active',
  Sold = 'Sold',
  Cancelled = 'Cancelled',
}

export enum MarketplaceOfferStatus {
  Pending = 'Pending',
  Accepted = 'Accepted',
  Rejected = 'Rejected',
  Expired = 'Expired',
}

export interface MarketplaceListing {
  listingId: string;
  seller: string;
  lotId: string;
  batchType: BatchType;  // 'Coffee' | 'Cacao'
  weightKg: number;
  weightAvailableKg: number;  // weightKg - soldKg
  pricePerKg: number;
  tokenAddress: string;  // USDC ou outro ERC20
  status: MarketplaceListingStatus;
  createdAt: number;
  updatedAt: number;
  sellerName?: string;    // truncated address ou nome
  origin?: string;        // origem do lote
}

export interface MarketplaceOffer {
  offerId: string;
  listingId: string;
  buyer: string;
  quantity: number;  // kg
  pricePerKg: number;
  totalPrice: number;  // quantity * pricePerKg
  status: MarketplaceOfferStatus;
  createdAt: number;
  expiresAt: number;
  orderId?: string;  // quando aceito, referência a Order em AgroChainPayments
}

export interface MarketplaceFilter {
  batchType?: BatchType;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'price-asc' | 'price-desc' | 'recent' | 'oldest';
  searchSeller?: string;  // address ou nome
}

export interface MarketplaceStats {
  totalListings: number;
  totalSold: number;
  averagePrice: number;
  mostCommon: BatchType;
}
```

---

## Fase 3: Helpers e Integração Web3

### 3.1 Criar marketplace.ts
**O quê**: Funções helper para interação com contrato `AgroChainMarketplace` e `AgroChainPayments`.  
**Arquivo**: `dapp/src/lib/contracts/marketplace.ts`  
**Verify**: TypeScript sem erros (`npx tsc --noEmit`).

**Estrutura**:
```typescript
// ABIs (extrair do artifact após deploy)
export const AGROCHAIN_MARKETPLACE_ABI = [...];

// Endereços (variáveis de ambiente ou hardcoded para Sepolia)
export const MARKETPLACE_ADDRESS = process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS || '';
export const PAYMENTS_ADDRESS = process.env.NEXT_PUBLIC_PAYMENTS_ADDRESS || '';

// Helpers
export async function createListing(
  config: WagmiConfig,
  lotId: string,
  batchType: BatchType,
  weightKg: number,
  pricePerKg: number,
  tokenAddress: string,
  onSuccess?: (hash: string) => void
): Promise<string>;

export async function makeOffer(
  config: WagmiConfig,
  listingId: string,
  quantityKg: number,
  pricePerKg: number,
  onSuccess?: (offerId: string) => void
): Promise<string>;

export async function acceptOffer(
  config: WagmiConfig,
  offerId: string,
  onSuccess?: (orderId: string) => void
): Promise<string>;

export async function fetchListings(
  filter?: MarketplaceFilter,
  limit?: number,
  offset?: number
): Promise<MarketplaceListing[]>;

export async function fetchMyListings(
  sellerAddress: string
): Promise<MarketplaceListing[]>;

export async function fetchListingDetail(
  listingId: string
): Promise<MarketplaceListing & { offers: MarketplaceOffer[] }>;

export function calculateTotal(quantityKg: number, pricePerKg: number): number;
```

**Decisão de Design**:
- Usar Wagmi `useContractWrite` ou `useContractRead` para simplicidade
- Transformar valores do contrato (uint256 scaled) para numbers legíveis
- Mock data para UI durante desenvolvimento (antes de deploy de contrato)

---

## Fase 4: Navegação na Sidebar

### 4.1 Atualizar Sidebar
**O quê**: Adicionar links `/marketplace` e `/marketplace/my-listings` na seção `EXTRAS`.  
**Arquivo**: `dapp/src/components/layout/Sidebar.tsx`  
**Verify**: `npm run build` — no errors, sidebar renderiza corretamente.

**Alteração**:
```typescript
// Trocar seção EXTRAS
{
  label: 'EXTRAS',
  items: [
    { href: '/producer', label: 'Produtor', icon: '🌾' },
    { href: '/mercado', label: 'Marketplace', icon: '🛒' },
    { href: '/marketplace', label: 'Listagens', icon: '📋' },      // NOVO
    { href: '/marketplace/my-listings', label: 'Minhas Vendas', icon: '💼' },  // NOVO
  ]
}
```

**Nota**: Ícones permanecem emoji por enquanto (design.md permite; futuro é migrar para SVG em `12_icones.js`).

---

## Fase 5: Página Principal — /marketplace

### 5.1 Criar marketplace/page.tsx
**O quê**: Grid de listagens com filtros, busca, paginação.  
**Arquivo**: `dapp/src/app/marketplace/page.tsx`  
**Verify**: `npm run dev` — página carrega, filtros funcionam, scroll de paginação.

**Estrutura Visual** (seguindo `design.md` v3.0):
- **Cabeçalho**: h1 em serifa (`--t-2xl`), subtítulo uma linha, sem ícone decorativo
- **Filtros**: 3 colunas em desktop (Tipo, Preço Min, Preço Max) + botão "Buscar", stacked em mobile
- **Grid**: `repeat(auto-fill, minmax(260px, 1fr))` com gap `--e-4` (16px)
- **Cartão de Listagem**: 
  - Thumbnail (cor + ícone: ☕ coffee ou 🍫 cacao)
  - Título do lote (h3)
  - KPI: preço em serifa `--t-lg`, origem, peso em `--t-md`
  - Chip de status (verde=Active, ouro=Sold)
  - Botão "Ver Detalhes" primário
- **Estado Vazio**: "Nenhuma listagem encontrada — crie uma em Minhas Vendas" + botão

**Componentes**:
```typescript
'use client';
import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import type { MarketplaceListing, MarketplaceFilter } from '@/types/agrochain';
import { fetchListings } from '@/lib/contracts/marketplace';
import Link from 'next/link';

export default function MarketplacePage() {
  const { address } = useAccount();
  const [filter, setFilter] = useState<MarketplaceFilter>({});
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchListings(filter).then(setListings).finally(() => setLoading(false));
  }, [filter]);

  return (
    <div style={{maxWidth: '1320px'}}>
      {/* Cabeçalho */}
      <h1 style={{fontFamily: 'Georgia,serif', fontSize: '26px', color: '#1e2a22', margin: 0}}>
        Marketplace
      </h1>
      <p style={{fontSize: '14px', color: '#495649', margin: '8px 0 24px'}}>
        Compre lotes certificados de Coffee e Cacao — Cepea · hoje
      </p>

      {/* Filtros */}
      <div style={{background: '#fffdf8', borderRadius: '16px', border: '1px solid #e6ddc9', padding: '16px', marginBottom: '24px'}}>
        {/* 3 inputs lado a lado */}
      </div>

      {/* Grid */}
      {loading ? (
        <div>Carregando...</div>
      ) : listings.length > 0 ? (
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px'}}>
          {listings.map(listing => (
            <Link href={`/marketplace/${listing.listingId}`} key={listing.listingId}>
              {/* Cartão */}
            </Link>
          ))}
        </div>
      ) : (
        <div style={{textAlign: 'center', padding: '60px 20px'}}>
          Nenhuma listagem encontrada
        </div>
      )}
    </div>
  );
}
```

**Tokens de Design Aplicados**:
- Padding: `--e-3` (12px) interno de cartão, `--e-4` (16px) gap grid
- Raio: `--raio` (16px) cartão, `--raio-sm` (10px) botão
- Cores: `--sup-1` fundo cartão, `--texto-1` título, `--texto-3` nota
- Sombra: `--sombra-2` cartão
- Tipografia: serifa `--t-2xl` cabeçalho, `--t-md` corpo

---

## Fase 6: Página de Detalhe — /marketplace/[listingId]

### 6.1 Criar marketplace/[listingId]/page.tsx
**O quê**: Visualização completa de uma listagem com histórico de lote, certificações, modal de oferta.  
**Arquivo**: `dapp/src/app/marketplace/[listingId]/page.tsx`  
**Verify**: `npm run dev` — clique em listagem abre detalhe, modal de oferta funciona.

**Estrutura Visual**:
- **Topo**: Breadcrumb ou voltar link, título da listagem
- **2 Colunas**:
  - Esquerda (60%): KPI (preço, peso, origem), chip de status, história do lote (rastreabilidade), certificações
  - Direita (40%): Detalhes do produtor (endereço, ✓ reputação se existir), informações de pagamento aceitos, botão "Fazer Oferta"
- **Modal de Oferta**: Entrada de quantidade, confirmação de preço total, botão "Enviar Oferta", toast de sucesso

**Componentes**:
```typescript
'use client';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useAccount } from 'wagmi';
import Link from 'next/link';
import type { MarketplaceListing, MarketplaceOffer } from '@/types/agrochain';
import { fetchListingDetail, makeOffer } from '@/lib/contracts/marketplace';

export default function ListingDetailPage() {
  const params = useParams();
  const listingId = params.listingId as string;
  const { address } = useAccount();
  const [listing, setListing] = useState<MarketplaceListing | null>(null);
  const [offers, setOffers] = useState<MarketplaceOffer[]>([]);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerQuantity, setOfferQuantity] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchListingDetail(listingId).then(data => {
      setListing(data);
      setOffers(data.offers || []);
    });
  }, [listingId]);

  const handleMakeOffer = async () => {
    if (!offerQuantity || Number(offerQuantity) <= 0) return;
    setLoading(true);
    try {
      await makeOffer(/* ... */);
      // toast success
      setShowOfferModal(false);
    } finally {
      setLoading(false);
    }
  };

  if (!listing) return <div>Carregando...</div>;

  return (
    <div style={{maxWidth: '1320px'}}>
      {/* Breadcrumb */}
      <Link href="/marketplace" style={{color: '#1f6440'}}>← Voltar</Link>

      {/* Conteúdo */}
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '24px'}}>
        {/* Esquerda: Lote + Histórico */}
        <div>
          {/* KPI cartões */}
          {/* Histórico de eventos */}
          {/* Certificações */}
        </div>

        {/* Direita: Produtor + Ação */}
        <div>
          {/* Cartão produtor */}
          {/* Botão "Fazer Oferta" */}
          {/* Histórico de ofertas recentes */}
        </div>
      </div>

      {/* Modal de Oferta */}
      {showOfferModal && (
        <div style={{/* overlay */}}>
          <div style={{/* modal */}}>
            <input
              type="number"
              placeholder="Quantidade (kg)"
              value={offerQuantity}
              onChange={e => setOfferQuantity(e.target.value)}
            />
            <button onClick={handleMakeOffer} disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar Oferta'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

**Comportamento**:
- Busca dados de `fetchListingDetail` ao montar
- Se usuário for o produtor, mostra botão "Editar Preço" em vez de "Fazer Oferta"
- Modal: input de quantidade, cálculo de total em tempo real, confirmação

---

## Fase 7: Página de Gerenciamento — /marketplace/my-listings

### 7.1 Criar marketplace/my-listings/page.tsx
**O quê**: Tabela com listagens do produtor conectado, criar nova, editar preço, cancelar.  
**Arquivo**: `dapp/src/app/marketplace/my-listings/page.tsx`  
**Verify**: `npm run dev` — tabela carrega, botão "Nova Listagem" abre modal, editar/cancelar funcionam.

**Estrutura Visual**:
- **Cabeçalho**: Título, botão "Nova Listagem" (verde primário)
- **Tabela**:
  - Colunas: Lote | Tipo | Peso (kg) | Disponível (kg) | Preço/kg | Status | Ações
  - Cabeçalho: fundo `--sup-3`, texto `--t-xs` uppercase, `--texto-3`
  - Linha hover: fundo `--sup-2`
  - Status: chip (verde=Active, ouro=Sold, cinza=Cancelled)
  - Ações: dropdown com Editar Preço, Ver Ofertas, Cancelar
- **Modal de Nova Listagem**: Seletor de lote (if produtor tem lotes em SmartLot), entrada de peso, preço, token, botão enviar
- **Modal de Editar Preço**: Input com valor atual, novo valor, confirmar

**Componentes**:
```typescript
'use client';
import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import type { MarketplaceListing } from '@/types/agrochain';
import { fetchMyListings, createListing } from '@/lib/contracts/marketplace';

export default function MyListingsPage() {
  const { address } = useAccount();
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [showNewModal, setShowNewModal] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (address) {
      setLoading(true);
      fetchMyListings(address).then(setListings).finally(() => setLoading(false));
    }
  }, [address]);

  const handleCreateListing = async (data: any) => {
    setLoading(true);
    try {
      await createListing(/* ... */);
      // refetch
      // toast
      setShowNewModal(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{maxWidth: '1320px'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px'}}>
        <h1 style={{fontFamily: 'Georgia,serif', fontSize: '26px', margin: 0}}>Minhas Vendas</h1>
        <button
          onClick={() => setShowNewModal(true)}
          style={{
            background: 'linear-gradient(180deg, #1f6440 0%, #195236 100%)',
            color: '#fff',
            border: 'none',
            padding: '12px 20px',
            borderRadius: '10px',
            cursor: 'pointer',
            fontWeight: '600',
          }}
        >
          + Nova Listagem
        </button>
      </div>

      {/* Tabela */}
      {loading ? (
        <div>Carregando...</div>
      ) : listings.length > 0 ? (
        <table style={{width: '100%', borderCollapse: 'collapse'}}>
          {/* thead, tbody */}
        </table>
      ) : (
        <div style={{textAlign: 'center', padding: '60px'}}>
          Nenhuma listagem ativa. Crie uma para começar a vender!
        </div>
      )}

      {/* Modal Nova Listagem */}
      {showNewModal && (
        <div style={{/* overlay */}}>
          {/* formulário */}
        </div>
      )}
    </div>
  );
}
```

**Comportamento**:
- Busca listagens do usuário com `fetchMyListings(address)` ao montar
- Modal Nova: campos de lote (seletor), tipo (automático do lote), peso, preço, token
- Ações por linha: dropdown com Editar Preço (modal com input), Ver Ofertas (navega para detalhe), Cancelar (confirmação)

---

## Fase 8: Deploy e Teste

### 8.1 Compilar e Deploy do Contrato
**O quê**: Compilar `AgroChainMarketplace.sol`, testar em hardhat, fazer deploy em Sepolia.  
**Arquivo**: `blockchain/contracts/AgroChainMarketplace.sol` (criado em Fase 1)  
**Verify**: 
- `npm run blockchain:compile` — sem erros
- `npm run deploy:sepolia` — contrato deployado, endereço salvo

### 8.2 Testar Frontend
**O quê**: Executar dev server, testar fluxo completo: criar listagem → fazer oferta → aceitar oferta.  
**Verify**: 
- `npm run dev` — dev server inicia
- Navegar para `/marketplace` — carrega grid com listagens (mock ou via contrato)
- Clique em listagem abre `/marketplace/[id]` com detalhe
- Clique em "Fazer Oferta" abre modal, preenche e confirma (transação ou confirmação visual)
- Navegar para `/marketplace/my-listings` — tabela de listagens do produtor

---

# Resumo de Arquivos

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `blockchain/contracts/AgroChainMarketplace.sol` | Novo | Contrato principal de marketplace |
| `dapp/src/types/agrochain.ts` | Modificar | Adicionar tipos de Marketplace |
| `dapp/src/lib/contracts/marketplace.ts` | Novo | Helpers para interação Web3 |
| `dapp/src/components/layout/Sidebar.tsx` | Modificar | Adicionar links de Marketplace |
| `dapp/src/app/marketplace/page.tsx` | Novo | Página principal de listagens |
| `dapp/src/app/marketplace/[listingId]/page.tsx` | Novo | Detalhe de listagem e modal de oferta |
| `dapp/src/app/marketplace/my-listings/page.tsx` | Novo | Gerenciamento de listagens do produtor |

---

# Ordem de Implementação (Sem Dependências Quebradas)

1. **Contrato + Deploy** → tipos e helpers dependem de ABI real
2. **Tipos TypeScript** → helpers e componentes dependem dos tipos
3. **Helpers** → páginas dependem de helpers
4. **Sidebar** → navegação necessária para testar páginas
5. **Página Principal `/marketplace`** → tela mais simples, setup de mocks/fetch
6. **Página Detalhe `/marketplace/[listingId]`** → reusa componentes de principal
7. **Página My Listings `/marketplace/my-listings`** → escreve dados, depende de confirmação de leitura

---

# Notas de Design System (design.md v3.0)

Cada página e componente **deve respeitar rigorosamente**:

1. **Paleta**: `--fundo` #f5f1e7 (papel kraft), `--sup-1` #fffdf8, `--linha` #e6ddc9
2. **Tipografia**: Serifa em KPI (`--t-2xl`), sans no corpo (`--t-md`), caixa alta em rótulo (`--t-xs` + `letter-spacing: .6px`)
3. **Espaço**: Base 4px — `--e-1` (4px), `--e-2` (8px), `--e-3` (12px), `--e-4` (16px), `--e-5` (24px), `--e-6` (32px)
4. **Raios**: `--raio-xs` (7px), `--raio-sm` (10px), `--raio` (16px), `--raio-lg` (22px), `--raio-pill` (999px)
5. **Cores Semânticas**: Verde (#1f6440) = ação/OK, Ouro (#b8912a) = atenção, Vermelho (#a83226) = crítico
6. **Sombra**: `--sombra-2` em cartão, `--brilho` em topo no claro
7. **Estado Vazio**: Ícone + frase + ação primária
8. **Nenhum Emoji** no produto (apenas glifos de texto: ✓, ✗, ⚠, →)
9. **Contraste Mínimo**: Texto principal ≥ 12:1 sobre `--sup-1`, nota ≥ 4.5:1
10. **Responsivo**: Grid fluida `repeat(auto-fit, minmax(..., 1fr))`, stacked em <600px

---

**Versão**: 1.0  
**Data**: Outubro 2024  
**Próximas Etapas**: Deploy em Sepolia, testes E2E, integração com SmartLot para histórico de lotes, notificações de novo produto.
