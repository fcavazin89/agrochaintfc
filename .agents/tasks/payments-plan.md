# Plano de Implementação: Arquitetura de Pagamentos com Mock ERC20 e Dashboard do Produtor

**Objetivo**: Implementar sistema de pagamento com escrow (MockUSDC + AgroChainPayments), utilities TypeScript com ABIs, e Dashboard do Produtor.

**Status**: Planejado para reestruturação em 3 FEATs sequenciais (vide artefatos em `.agents/tasks/payments-task/`).

---

## Decisões de Design

### 1. Mock ERC20 (MockUSDC)
- **Decisão**: ERC20 padrão com função `mint()` pública sem permissões.
- **Rationale**: Testes instantâneos em Sepolia sem complexidade de AccessControl. Production será reendereçada para USDC real.

### 2. Escrow Simples (AgroChainPayments)
- **Decisão**: Estados = ESCROW → ACCEPTED/REJECTED. Sem timelock ou arbitragem.
- **Rationale**: MVP focado em fluxo produtor→comprador. Refinamentos (timeout, múltiplas assinaturas) ficarão para v2.

### 3. Integração Web3 (wagmi + MetaMask)
- **Decisão**: Usar hooks `useAccount`, `useConnect`, writeContract via wagmi/viem. Sem ethers.js na dapp.
- **Rationale**: Coerência com TopBar.tsx (já usa wagmi). Separação clara entre tipos (viem no cliente) e utils (payments.ts).

### 4. Dashboard Mockado
- **Decisão**: Mock data inline em useState, sem backend. Integração real fica para v2.
- **Rationale**: Sprint de UI. Dados reais virão via contrato após deploy e integração de hooks de leitura.

### 5. Estilo Design System
- **Decisão**: Seguir `design.md` rigorosamente: papel kraft claro (#f5f1e7), verde primário #1f6440, tipografia Georgia em títulos.
- **Rationale**: Coerência visual com dashboard existente. Acessibilidade WCAG 4.5:1 em texto principal.

---

## Estrutura de Arquivos (Final)

```
blockchain/contracts/
├── MockUSDC.sol                    (novo)
├── AgroChainPayments.sol           (novo)
├── [existentes]
blockchain/hardhat.config.js        (update: deploy tasks)

dapp/src/
├── lib/contracts/
│   └── payments.ts                 (novo)
├── app/producer/
│   └── page.tsx                    (novo)
├── components/layout/
│   └── Sidebar.tsx                 (update: adicionar rota /producer)
├── types/
│   └── agrochain.ts                (update: tipos de Batch e Sales)
└── [existentes]
```

---

## FEAT-001: Contratos Solidity (MockUSDC + AgroChainPayments)

**Objetivo**: Compilar dois contratos que funcionam juntos: token teste + escrow.

### Passos

1. **Criar `blockchain/contracts/MockUSDC.sol`**
   - Herda `ERC20` de OpenZeppelin (já em package.json).
   - Construtor: inicializa nome "Mock USDC", símbolo "USDC", 18 decimais.
   - Função pública `mint(address to, uint256 amount)`: sem require de permissão, apenas `_mint(to, amount)`.
   - Comentários detalhados (estilo AgroChainCoffeeCacaoTraceability).

2. **Criar `blockchain/contracts/AgroChainPayments.sol`**
   - Enums: `OrderStatus { CREATED, ESCROWED, ACCEPTED, REJECTED }`
   - Struct `Order`: id (bytes32), seller, buyer, productId, tokenAddress, amount (uint256), status, timestamp
   - State: `mapping(bytes32 => Order) public orders`, `mapping(bytes32 => uint256) escrowBalances`
   - Função `createOrder(address seller, string calldata productId, uint256 amount, address tokenAddress)`: cria order, emite `OrderCreated`
   - Função `depositEscrow(bytes32 orderId)`: buyer faz `transferFrom` do token, emite `Deposited`
   - Função `acceptOrder(bytes32 orderId)`: seller chama, tokens vão para seller, status = ACCEPTED, emite `Accepted`
   - Função `rejectOrder(bytes32 orderId)`: qualquer parte autorizada rejeita, tokens voltam para buyer, emite `Rejected`
   - Todos os eventos indexados por orderId, tokenAddress, seller.

3. **Atualizar `blockchain/hardhat.config.js`**
   - Adicionar subtask deploy:mockusdc que: (a) faz deploy de MockUSDC, (b) printa endereço para console.
   - Adicionar subtask deploy:payments que: (a) faz deploy de AgroChainPayments, (b) printa endereço.
   - Ambas retornam endereço em console.log para cópia manual para .env ou localStorage.

### Verificação

- `npm run blockchain:compile` retorna sucesso, artifacts em `blockchain/artifacts/contracts/`.
- Ambos contratos aparecem em artifacts.
- (Opcional) `npm run deploy:sepolia` compila sem erros de sintaxe.

### Artefatos Gerados

- `blockchain/artifacts/contracts/MockUSDC.sol/MockUSDC.json` → extrair ABI
- `blockchain/artifacts/contracts/AgroChainPayments.sol/AgroChainPayments.json` → extrair ABI

---

## FEAT-002: Utilities TypeScript (payments.ts com ABIs)

**Objetivo**: Exportar ABIs geradas e helper functions para integração no dapp.

### Passos

1. **Criar `dapp/src/lib/contracts/` directory** (se não existir)

2. **Criar `dapp/src/lib/contracts/payments.ts`**
   - `export const MOCKUSDC_ABI = [...]` (array de objetos ABI, copiado de artifact MockUSDC.json)
   - `export const PAYMENTS_ABI = [...]` (array de objetos ABI, copiado de artifact AgroChainPayments.json)
   - `export const CONTRACT_ADDRESSES = { mockUSDC: '', agroChainPayments: '' }` (strings vazias, preenchidas via .env.local ou UI)
   - Função `async approveMockUSDC(walletClient, tokenAddress, spenderAddress, amount)`: chama `writeContract` do viem, função `approve` em ERC20.
   - Função `async createOrder(walletClient, paymentAddress, seller, productId, amount, tokenAddress)`: chama `writeContract`, função `createOrder` em AgroChainPayments.
   - Função `async depositEscrow(walletClient, paymentAddress, orderId)`: chama `writeContract`, função `depositEscrow`.
   - Cada função retorna transaction hash e trata erros com try/catch básico.

### Verificação

- `npm run build` em dapp/ (ou `next build`) compila sem erros TypeScript.
- `grep -r 'MOCKUSDC_ABI' dapp/src/lib/contracts/payments.ts` retorna export.
- Tipos das funções são autocomplete-friendly no editor.

---

## FEAT-003: Dashboard do Produtor

**Objetivo**: Página UI mockada com lotes, vendas ativas e integração com MetaMask.

### Passos

1. **Atualizar `dapp/src/types/agrochain.ts`** (adicionar tipos)
   ```typescript
   export interface ProducerBatch {
     id: string;
     name: string;
     type: 'Coffee' | 'Cacao';
     weightKg: number;
     status: 'Disponível' | 'Vendendo' | 'Vendido';
     pricePerKg: number;
   }

   export interface ActiveSale {
     id: string;
     buyer: string; // endereço truncado
     tokenAmount: number;
     status: 'Escrow' | 'Aceito' | 'Rejeitado';
     timestamp: number;
   }
   ```

2. **Criar `dapp/src/app/producer/page.tsx`**
   - `'use client'` no topo.
   - `useState` para `batches` (array mockado de ProducerBatch com 3-4 items).
   - `useState` para `activeSales` (array mockado de ActiveSale com 2-3 items).
   - `useAccount` de wagmi para obter `address` e `isConnected`.
   - Layout:
     - Cabeçalho: "🌾 Dashboard do Produtor", subtítulo "Gerencie seus lotes e vendas ativas"
     - Seção Produtor: "Sua Carteira: [truncated address]" (se conectado) ou "Conectar MetaMask"
     - **Seção Lotes**: título "Meus Lotes", grid de cards (`display: grid, gridTemplateColumns: repeat(auto-fit, minmax(280px, 1fr))`)
       - Card por lote: nome, tipo, peso (kg), status (chip com cor: verde=Disponível, ouro=Vendendo, cinza=Vendido), preço/kg, botão "Anunciar" (verde)
     - **Seção Vendas Ativas**: título "Vendas em Andamento", tabela (ou grid de cards em mobile)
       - Colunas: ID Venda, Comprador, Montante (token), Status (chip), Ação (aceitar/rejeitar botões)
     - **Botão Flutuante ou no Topo**: "➕ Novo Anúncio" verde primário
   - Estilos:
     - Fundo: `#f5f1e7` (papel kraft)
     - Texto h1: Georgia 28px bold, cor `#1e2a22`
     - Texto corpo: sans-serif 13.5px, cor `#1e2a22`
     - Botão primário: gradiente `#1f6440 → #15653e`, text branco, altura 40px, raio 8px
     - Cards: fundo `#fffdf8`, sombra `0 1px 2px rgba(31,42,34,.06)`, raio 12px
     - Tabela header: fundo `#f2ecdd`, texto `#7c867a` caixa alta 10.5px
     - Linha hover: fundo `#f2ecdd`
     - Chips: fundo + texto cor semântica (verde/ouro/cinza), raio 7px, padding 4-8px

3. **Atualizar `dapp/src/components/layout/Sidebar.tsx`**
   - Adicionar item novo em grupo EXTRAS (ou criar grupo novo "MARKETPLACE"):
     ```
     { href: '/producer', label: 'Produtor', icon: '🌾' }
     ```
   - Item ativo mostra borda esquerda verde + fundo `--veu-verde`.

### Verificação

- `npm run dev` em dapp/, navegar para `http://localhost:3000/producer` (ou rota apropriada).
- Página renderiza com mock data sem erros React.
- Sidebar exibe link Produtor e é clicável.
- MetaMask conectado: endereço aparece truncado na seção Produtor.
- MetaMask desconectado: card com "Conectar MetaMask" ou similar aparece.
- Grid de lotes renderiza 3-4 cards, tabela de vendas renderiza 2 linhas.
- Botões clicáveis (sem ação ainda, será integração real em v2).

---

## Integração Futura (v2+)

- **Leitura on-chain de lotes**: Substituir mock por hook que lê `AgroChainCoffeeCacaoTraceability.getCoffeeBatch()`.
- **Criação de anúncio em tempo real**: Botão "Novo Anúncio" abre modal, submete `createOrder()` do payments.ts.
- **Atualização de status de vendas**: Hooks de escuta de eventos `OrderCreated`, `Deposited`, etc., atualizam UI.
- **Integração com DEX**: Tokenização de lotes, swap de USDC ↔ CAFE.

---

## Checklist de Verificação Final

- [ ] MockUSDC.sol compila, tem `mint()` pública
- [ ] AgroChainPayments.sol compila, tem ordem de estados e eventos
- [ ] `npm run blockchain:compile` sem erros
- [ ] `dapp/src/lib/contracts/payments.ts` exporta ABIs
- [ ] `npm run build` em dapp/ sem erros TypeScript
- [ ] Producer dashboard renderiza com mock data
- [ ] Sidebar aponta para `/producer`
- [ ] Estilos seguem design.md (cores, tipografia, espaçamento)
- [ ] MetaMask connect/disconnect funciona
- [ ] Contraste mínimo 4.5:1 em texto principal (verificar DevTools)
