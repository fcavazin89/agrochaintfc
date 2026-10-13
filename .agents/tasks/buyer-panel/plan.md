# Plano de Implementação: Buyer Panel AgroChain

## Decisões Arquiteturais

1. **Tipos TypeScript expandidos (decision: agrupamento único)** — Adicionar interfaces BuyerProfile, PurchaseOrder e type DeliveryStatus em um só commit em `agrochain.ts`. Isso evita múltiplos passos de refactor de tipos.

2. **Contrato AgroChainBuyer vs. mock data (decision: priorizar implementação rápida)** — Criar estrutura vazia do contrato com stubs, mas app usará mock data durante desenvolvimento. Marketplace já segue este padrão; mantém consistência de UX.

3. **Reputação simples (decision: média aritmética de ratings)** — Ratings 1–5 com média simples em `lib/contracts/buyer.ts`. Evita complexidade de pesos; pode evoluir depois.

4. **Status de entrega (decision: 4 estados fixos)** — Aguardando → Emitido → Transportando → Entregue. Rejeição é evento separado (modal). Alinha com design UX.

5. **Reviews públicos (decision: sem autenticação de produtor na leitura)** — Qualquer um vê reviews; só comprador pode escrever após entrega. Dados em array indexado por loteId.

6. **URLs de buyer (decision: `/buyer` como raiz, subseções em `/buyer/orders`, `/buyer/reviews`)** — Evita namespacing coliso com `/producer`. Menu expandido em seção nova "COMPRADOR" na Sidebar.

---

## Items de Implementação

- [ ] 1. Expandir tipos TypeScript em `dapp/src/types/agrochain.ts`.
      Adicionar interfaces: BuyerProfile (buyerId, nome, empresa, país, reputação, lotesComprados), PurchaseOrder (orderId, listingId, loteId, produtor, dataCompra, dataEntrega, status), DeliveryStatus type ('Aguardando' | 'Emitido' | 'Transportando' | 'Entregue' | 'Rejeitado').
      Files: `dapp/src/types/agrochain.ts`
      Verify: `npx tsc --noEmit` — sem erros de tipo.

- [ ] 2. Criar contrato AgroChainBuyer em `blockchain/contracts/AgroChainBuyer.sol`.
      Estrutura: registerBuyer (nome, empresa, país), getPurchaseHistory, getRating (produtor), submitReview (loteId, rating, texto, produtor). Funções são placeholders; mock data é a fonte de verdade durante dev.
      Files: `blockchain/contracts/AgroChainBuyer.sol`
      Verify: `npx hardhat compile` — sem erros.

- [ ] 3. Criar utils buyer em `dapp/src/lib/contracts/buyer.ts`.
      Implementar: (a) AGROCHAIN_BUYER_ABI com assinatura de funções, (b) MOCK_BUYER_PROFILES e MOCK_PURCHASE_ORDERS, (c) funções helper: calculateReputation (média de ratings), filterOrdersByStatus, filterOrdersByDateRange, filterOrdersByProducer. Espelhar padrão de marketplace.ts.
      Files: `dapp/src/lib/contracts/buyer.ts`
      Verify: `npx tsc --noEmit` — sem erros; exportações visíveis.

- [ ] 4. Atualizar Sidebar em `dapp/src/components/layout/Sidebar.tsx`.
      Adicionar seção "COMPRADOR" com 3 itens: /buyer (Dashboard do Comprador), /buyer/orders (Meus Pedidos), /buyer/reviews (Reviews). Manter ícones existentes (emoji; próxima versão pode usar SVG). Atualizar shouldSectionBeExpanded para incluir rotas buyer.
      Files: `dapp/src/components/layout/Sidebar.tsx`
      Verify: Build e inspect: `/buyer` com menu expandido visível.

- [ ] 5. Criar página Dashboard do Comprador em `dapp/src/app/buyer/page.tsx`.
      Layout: cabeçalho h1 + subtitle, 4 KPI cards (total gasto, lotes comprados, compras pendentes, reputação média), tabela de últimas 5 compras com status + ações, botão "Ver Marketplace". Design: tokens kraft do design.md, chip de status por compra, hover em linha.
      Files: `dapp/src/app/buyer/page.tsx`
      Verify: Abrir em navegador em `/buyer`; verificar KPIs populam com mock data, tabela renderiza, botão marketplace funciona.

- [ ] 6. Criar página Meus Pedidos em `dapp/src/app/buyer/orders/page.tsx`.
      Layout: filtros no topo (período, status, produtor), tabela listando todas PurchaseOrders com colunas: ID, lote, produtor, data, status (chip), ações (botão "Rastrear"). Timeline visual simples (4 dots, preenchimento por status). Paginação opcional com 10 items/página.
      Files: `dapp/src/app/buyer/orders/page.tsx`
      Verify: Verificar filtros mudam lista, status chips renderizam corretamente, navegação para detalhe via ID.

- [ ] 7. Criar página Detalhes do Pedido em `dapp/src/app/buyer/orders/[orderId]/page.tsx`.
      Layout: cabeçalho com ID + status badge, seção esquerda (informações compra: lote, produtor, preço, datas), seção direita (timeline 4 etapas com status visual, com data/hora de cada), abas: "Lote" (dados de rastreabilidade), "Produtor" (nome, reputação, reviews anteriores), "Ações" (botão confirmar entrega / rejeitar). Modal de rejeição: motivo (text), salva rejection flag.
      Files: `dapp/src/app/buyer/orders/[orderId]/page.tsx`
      Verify: Abrir /buyer/orders/ORDER-001; verificar timeline renderiza, abas mudam conteúdo, modal rejeição abre/fecha.

- [ ] 8. Criar página Reviews em `dapp/src/app/buyer/reviews/page.tsx`.
      Layout: lista de produtores com histórico (cards com nome, empresa, reputação média em estrelas, transações totais, rating médio). Formulário inline: adicionar review (rating 1–5 com slider, texto até 300 chars, submit). Histórico abaixo listando reviews enviados (data, rating, texto, status: Enviado).
      Files: `dapp/src/app/buyer/reviews/page.tsx`
      Verify: Abrir em `/buyer/reviews`; adicionar review atualiza lista, dados persistem em sessionStorage ou mock state.

- [ ] 9. Criar layout intermediário em `dapp/src/app/buyer/layout.tsx`.
      Simples wrapper que herda do root layout; adiciona qualquer header customizado (opcional por design). Garante rotas buyer herdam TopBar + Sidebar.
      Files: `dapp/src/app/buyer/layout.tsx`
      Verify: `/buyer`, `/buyer/orders` e `/buyer/reviews` renderizam com TopBar + Sidebar visíveis.

- [ ] 10. Verificação integrada e estilo design system.
      Testar: todos os componentes respeitam tokens de cor (--fundo, --sup-1, --texto-1, --verde-600), tipografia (--t-2xl para h1, --t-md para corpo), espaçamento escala base-4, raio --raio para cartões. Conferir: contraste mínimo 4.5:1 em corpo, nenhum hex hardcoded em componente, nenhum emoji (usar glifos de texto).
      Files: `dapp/src/app/buyer/**`, `dapp/src/components/layout/Sidebar.tsx`
      Verify: Navegar por todas as 4 páginas buyer; inspecionar CSS computed; confirmar cores vêm de tokens CSS, não de hex inline.

---

## Checklist de Entrega

- [ ] Tipos TypeScript compilam sem erros
- [ ] Contrato AgroChainBuyer compila via hardhat
- [ ] Dashboard, Meus Pedidos, Detalhes, Reviews renderizam sem erros
- [ ] Sidebar expande seção COMPRADOR com 3 links
- [ ] Filtros funcionam em Meus Pedidos
- [ ] Modal de rejeição abre/fecha
- [ ] Reviews salvam e mostram histórico
- [ ] Design system tokens aplicados (cores, tipografia, espaçamento)
- [ ] Build Next.js completa sem warnings
- [ ] App navegável em dev mode (`npm run dev` ou equivalente)
