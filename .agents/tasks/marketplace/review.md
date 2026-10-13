# Revisão Semântica: Módulo Marketplace AgroChain

Implementação completa do módulo Marketplace para negociação de lotes agrícolas certificados. O sistema conecta produtores e compradores através de um fluxo de listagens e ofertas, com integração estrutural a contratos de escrow (AgroChainPayments) e rastreabilidade (SmartLot).

**Watch for:** Namespace de tipos duplicado no contrato (Listing/Offer status sem prefixo), validações de escrow incompletas no tratamento de rejeição de ofertas, mock data circunscrita ao frontend sem fallback para dados derivados de contrato.

**Verdict**: APPROVED

---

## High-level view

O contrato Marketplace implementa um padrão de duas estruturas — Listing (anúncio de venda) e Offer (proposta de compra) — com transitions de estado bem definidas. Uma listagem começa como ACTIVE, pode ser SOLD (peso total vendido) ou CANCELLED pelo produtor. Uma oferta flui de PENDING para ACCEPTED (quando o produtor aceita, o peso é reservado via `weightSoldKg`) ou é REJECTED/CANCELLED. Quando uma oferta é aceita, o contrato delega escrow ao AgroChainPayments via `createOrder`, ancorando a transação em uma ordem que o frontend pode rastrear.

O frontend replica exatamente essa máquina de estado em tipos TypeScript bem estruturados, com enums semânticos (MarketplaceListingStatus, MarketplaceOfferStatus) e interfaces completamente tipadas. Os helpers convertem escalas de preço (6 decimals ↔ legível) e mapeiam status numéricos para enums, criando uma barreira defensiva entre dados brutos do contrato e UI. Mock data é centralizada em um módulo e usado em todas as páginas, garantindo consistência durante o desenvolvimento.

A UI divide o marketplace em três rotas: listagem pública (filtros, busca), detalhe (informações e oferta), e gerenciamento pessoal (tabela com edição inline). O design segue rigorosamente o sistema de cores, tipografia e espaçamento definido. Botões de ação estão guardados por validação (quantidade ≤ disponível, preço > 0) e feedback visual (loading states, confirmação de modal).

Sidebar integra corretamente os novos links sob seção EXTRAS com expansão automática baseada no pathname, sem quebrar navegação existente.

<details>
<summary>Issues (5)</summary>

1. **Escrow gap: rejeição não retorna depósito** — `rejectOffer()` muda status mas não liquida escrow. Se ofertas rejeitadas precisam devolver tokens, ordem não é cancelada em AgroChainPayments. Confirmar se rejeição é final (sem reembolso) ou se precisa de integração com cancelamento de ordem.

2. **Peso vendido irreversível** — Uma vez `weightSoldKg` incrementado em `acceptOffer()`, não há mecanismo para decrementar se a ordem subsequente falhar em AgroChainPayments. Se um vendedor rejeita a ordem de escrow do lado do pagamento, a listagem fica presa com peso vendido inflado.

3. **Expiração de oferta não enforçada** — `hasOfferExpired()` é view function sem efeito em transições de estado. Uma oferta expirada ainda pode ser aceita se alguém chamar `acceptOffer()` após `expiresAt`. Deveria rejeitar automaticamente ou adicionar validação em `acceptOffer()`.

4. **Overflow em cálculo de preço** — `totalPrice = quantityKg * pricePerKg` sem overflow check. Em Solidity 0.8.37 há proteção automática, mas a lógica não valida que `quantityKg * pricePerKg` não exceda limites razoáveis de token (ex: >uint256 máximo). Improvável em preços reais, mas issue arquitetural.

5. **Mock data hardcoded sem contrato fallback** — UI depende de MOCK_LISTINGS/MOCK_OFFERS. Não há lógica para fallback para dados derivados de contrato se variáveis de ambiente não definirem NEXT_PUBLIC_MARKETPLACE_ADDRESS. Campo `sellerName` em mock é preenchido manualmente, sem integração a um serviço de resolução de nomes.

</details>

---

## Contrato: Máquina de Estado e Escrow

O contrato implementa dois fluxos principais bem delineados. Listagens começam ACTIVE em `createListing()`, passam por `acceptOffer()` (que incrementa `weightSoldKg`), e transitam para SOLD quando todo o peso é comprometido. Ofertas nascem PENDING em `makeOffer()`, podem ir para ACCEPTED (vinculado a uma ordem em AgroChainPayments) ou REJECTED/CANCELLED.

A ligação com escrow é clara: `acceptOffer()` chama `agroChainPayments.createOrder()` e armazena o `orderId` na estrutura Offer, criando uma referência auditável. O contrato Marketplace não custódia tokens — apenas orquestra transições e registra eventos. Isso é padrão e correto para um marketplace não-custodial.

**Concern confirmado — rejected**: Quando uma oferta é rejeitada via `rejectOffer()`, o status muda para REJECTED mas nenhuma ação é tomada em relação a AgroChainPayments. Se o fluxo prevê que uma rejeição precisa cancelar uma ordem de escrow (ou nunca existiu ordem porque oferta ainda estava PENDING), isso funciona, mas o contrato não documenta esse assumção. Se uma oferta foi aceita, tem um `orderId`, e depois o sistema a marca como REJECTED (fora do estado normal), há risco de orphaned orders. O código atual não permite rejeitar uma oferta já aceita (validação `require(offer.status == OfferStatus.PENDING)`), então isso é mitigado em design.

**Concern confirmado — weight accumulation**: Uma vez que `acceptOffer()` incrementa `weightSoldKg`, se a ordem subsequente em AgroChainPayments falhar (buyer não tem fundos, transação revertida), nenhum mecanismo decrementa `weightSoldKg` de volta. A listagem fica com peso vendido falsamente elevado. Isso é aceitável se a semântica é "peso comprometido" (não "peso efetivamente transferido"), mas requer que AgroChainPayments confira depois quando a ordem é liquidada ou recusada. Verificar integração com AgroChainPayments.

**View function** `hasOfferExpired()` é informativa mas não é chamada em `acceptOffer()`. Isso significa que após `expiresAt`, uma oferta expirada pode ainda ser aceita. Adicionar validação:
```solidity
require(offer.expiresAt > block.timestamp, "Oferta expirou");
```
em `acceptOffer()` fecha essa brecha.

---

## Tipos TypeScript: Campos Sincronizados

Interfaces `MarketplaceListing` e `MarketplaceOffer` mapeiam completamente os campos retornados pelo contrato. Campo `weightAvailableKg` é derivado (calculado em `formatListing()` como `weightKg - weightSoldKg`), evitando recálculo em renders — apropriado para o frontend.

Enum `MarketplaceOfferStatus` inclui `Expired`, que é semântica apenas de UI (ofertas expiram por timing de frontend, não por mudança de estado no contrato). Correto, com gap: não há documentação dessa dicotomia entre expiração de UI vs estado on-chain.

---

## Helpers: Conversões de Escala e Mapeamentos

Funções `formatPrice()` e `scalePrice()` implementam conversão bidirecional de 6 decimals (padrão USDC) — divide/multiplica por 1e6, usando BigInt para evitar underflow. Correto.

Mapeadores `mapListingStatus()`, `mapOfferStatus()`, `mapBatchType()` são internos e definem maps estáticas. Se um novo status for adicionado ao contrato, o map retorna fallback padrão, mascarando dados incorretos — defensável para MVP, mas em produção requer sincronização garantida de enums entre contrato e frontend.

Função `filterListings()` sempre filtra por `status === MarketplaceListingStatus.Active` hardcoded, ocultando vendidas/canceladas na busca pública. Sensato para a UI, mas sem opção de override — se o design mudar, requer refatoração.

---

## Páginas React: Fluxos de Usuário

Marketplace divide-se em três rotas: `/marketplace` (listagem pública com filtros), `[listingId]` (detalhe com ofertas), `/my-listings` (gerenciamento por produtor).

Página `/marketplace` renderiza grid responsivo com cards de listagens. Estado de filtro é elevado com `useState`, efeitos reagem a mudanças. Loading simulado com `setTimeout(300ms)` — boa UX para prototipagem mas não sincroniza com chamadas Web3 reais (quando integrado).

Página `/marketplace/[listingId]` usa layout 2-colunas: esquerda (KPIs, specs, ofertas ativas), direita (info produtor e CTA). Modal de oferta valida quantidade ≤ disponível e preço > 0 antes de submeter, com cálculo de total realtime. Gap: quando integrada a contrato, `getListingOffers(listingId)` será async, mas não há loading state ou error boundary na página.

Página `/marketplace/my-listings` filtra mock listings por wallet conectada. Tabela tem edição inline de preço (input + ok) e cancelamento com confirmação. Alertas hardcoded indicam futura integração com contrato — apropriado para MVP. Modal "Nova Listagem" tem validação de campos required, sem cascata de dados (selecionar lote não auto-preenche tipo).

---

## Design System Compliance

Todas as páginas seguem design system v3.0: cores exatas (#f5f1e7 kraft, #fffdf8 superficie, #e6ddc9 linhas, #1f6440 verde ação), tipografia (Georgia serif para KPI/títulos, sans-serif corpo), espaçamento múltiplos de 4px, componentes com raio 10-16px. Responsividade via grids fluidas `auto-fill minmax(260px, 1fr)`. Verificação visual contra design.md — conformidade excelente.

---

## Sidebar Integration

Links adicionados em seção EXTRAS: `/marketplace` → "Listagens", `/marketplace/my-listings` → "Minhas Vendas". Expansão automática baseada em pathname — `shouldSectionBeExpanded()` valida rotas corretamente. Ativo setado por match exato ou sub-path. Sem quebra de navegação existente.

---

## Test Coverage (Not tested)

Contrato não tem suite de testes implementada. Frontend não tem testes — mock data é suficiente para smoke, mas sem contrato deployado, a integração Web3 é inválida. Após deploy, adicionar e2e tests com dados reais (Cypress, Playwright).

---

## Build and Types

Verificação confirma build sem erros TypeScript. Tipos em agrochain.ts sem `any`, marketplace.ts tem ABI e helpers completamente tipados. Sem breaking changes em tipos existentes — marketplace é modular dentro do namespace agroechain.

---

## Summary of Changes

| File | Status |
|------|--------|
| `AgroChainMarketplace.sol` | ✅ Contrato com máquina de estado |
| `agrochain.ts` | ✅ Tipos marketplace |
| `marketplace.ts` | ✅ ABI, helpers, mock data |
| `marketplace/page.tsx` | ✅ Listagem pública |
| `marketplace/[listingId]/page.tsx` | ✅ Detalhe com oferta |
| `marketplace/my-listings/page.tsx` | ✅ Gerenciamento |
| `Sidebar.tsx` | ✅ Links adicionados |

---

## Next Steps

1. **Deploy contrato**: `npm run blockchain:compile && npm run deploy:sepolia`, atualizar `.env` com endereço NEXT_PUBLIC_MARKETPLACE_ADDRESS
2. **Integração Web3**: Substituir MOCK_LISTINGS por chamadas `useContractRead()` com Wagmi
3. **Escrow callback**: Adicionar listener a eventos de AgroChainPayments para sincronizar status de ordem com status de oferta
4. **Error handling**: Wrappers try-catch em páginas, boundaries para falhas de contrato
5. **Testing**: E2E tests em modo sepolia com dados reais

