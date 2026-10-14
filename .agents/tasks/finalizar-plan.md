# Plano de Implementação — Finalizar Módulos AgroChain

Worktree: `c:\Users\Usuário\agrochain\workspace-01a1162b-e061-7ff0-b060-dfa40cc70dfdzip`
Build: `cd dapp && npm run build`
Verificação de contrato: `cd blockchain && npx hardhat compile`

> O trabalho foi decomposto em 3 FEATs. Os artefatos completos estão em `.agents/tasks/finalizar-modulos/`.
> FEAT-001 deve ser implementado primeiro (produz tipos e Sidebar). FEAT-002 e FEAT-003 são independentes entre si e podem seguir em qualquer ordem após FEAT-001.

---

## FEAT-001 — Tipos + Sidebar + Layout

- [ ] 1. Adicionar `CarbonCredit` e `AnalyticsData` em `dapp/src/types/agrochain.ts`.
      Acrescentar as duas interfaces no final do arquivo. `CarbonCredit`: creditId, loteId, produtor, hectares, creditos, status ('Pendente'|'Emitido'|'Vendido'), dataEmissao, dataTransferencia?, destinatario?. `AnalyticsData`: periodo, lotesCertificados, volumeMockUSDC, produtoresAtivos, scoreESGMedio, lotesporEstado[], ultimosLotes[], volumeMensal[].
      Files: `dapp/src/types/agrochain.ts`
      Verify: `cd dapp && npm run build` — sem erros TypeScript.

- [ ] 2. Adicionar seção `ANALYTICS & ESG` no Sidebar com links `/analytics` e `/credits`.
      Inserir novo objeto no array `navSections` após a seção `VERIFICAÇÃO`: `{ label: 'ANALYTICS & ESG', items: [ { href: '/analytics', label: 'Analytics', icon: '📈' }, { href: '/credits', label: 'Carbon Credits', icon: '🌿' } ] }`.
      Files: `dapp/src/components/layout/Sidebar.tsx`
      Verify: `cd dapp && npm run build` — sem erros.

- [ ] 3. Restaurar imports reais de Sidebar/TopBar/SidebarProvider em `layout.tsx`.
      Substituir os stubs inline (`const Sidebar = () => <div>Sidebar</div>` etc.) pelos imports reais: `import Sidebar from '@/components/layout/Sidebar'`, `import TopBar from '@/components/layout/TopBar'`, `import { SidebarProvider } from '@/lib/sidebar-context'`. Checar se `sidebar-context.tsx` exporta `SidebarProvider` (há `.ts` e `.tsx` — usar o `.tsx`).
      Files: `dapp/src/app/layout.tsx`
      Verify: `cd dapp && npm run build` — sem erros de importação.

---

## FEAT-002 — Carbon Credits (Contrato + ABI + UI)

Depende de FEAT-001 (precisa de `CarbonCredit` de agrochain.ts).

- [ ] 4. Criar `blockchain/contracts/CarbonCredits.sol`.
      Contrato Solidity 0.8.20 com `Ownable`. Mappings: `lotCredits(bytes32 => uint256)` para créditos por lote; `balances(address => uint256)` para saldo do produtor. Função `issueCredits(bytes32 loteId, address produtor, uint256 hectares)` onlyOwner: creditos = hectares, atualiza lotCredits e balances, emite `CreditIssued(loteId, produtor, creditos, timestamp)`. Função `transferCredits(bytes32 loteId, address de, address para, uint256 quantidade)`: valida saldo, transfere, emite `CreditTransferred(loteId, de, para, quantidade, timestamp)`. Função `getCredits(bytes32 loteId) view returns (uint256)`.
      Files: `blockchain/contracts/CarbonCredits.sol`
      Verify: `cd blockchain && npx hardhat compile` — "Compiled N contracts successfully".

- [ ] 5. Criar `dapp/src/lib/contracts/carboncredits.ts`.
      Exportar `CARBONCREDITS_ABI` (const array com os 2 eventos e 3 funções do contrato), `issueCredits(config, loteId, produtor, hectares)` usando `writeContract` de wagmi/actions, `transferCredits(config, loteId, de, para, quantidade)` usando `writeContract`, `getCredits(config, contractAddress, loteId)` usando `readContract`. Padrão de `dapp/src/lib/contracts/payments.ts`.
      Files: `dapp/src/lib/contracts/carboncredits.ts`
      Verify: `cd dapp && npm run build` — sem erros TypeScript no novo arquivo.

- [ ] 6. Criar `dapp/src/app/credits/page.tsx`.
      'use client'. Importar `MOCK_LOTS` de `@/lib/mockLotData` e `CarbonCredit` de `@/types/agrochain`. Definir `MOCK_CARBON_CREDITS: CarbonCredit[]` inline — 6 entradas mapeadas dos 6 lotes, `creditos = Math.floor(lot.área)`, status: 4 'Emitido', 1 'Pendente', 1 'Vendido'. KPIs: 4 cards (Total Emitidos, Pendentes, Vendidos, Área Total ha). Tabela: Lote ID, Origem (truncada), Área, Créditos, Status (badge), Ação (botão 'Solicitar Créditos' — clicável só se Pendente). Usar design tokens var(--sup-1), var(--linha), var(--verde-600) etc.
      Files: `dapp/src/app/credits/page.tsx`
      Verify: `cd dapp && npm run build` — rota `/credits` aparece na listagem de páginas geradas.

---

## FEAT-003 — Analytics Dashboard + Public Passport Polish

Depende de FEAT-001 (precisa de `AnalyticsData` de agrochain.ts). Independente de FEAT-002.

- [ ] 7. Criar `dapp/src/app/analytics/page.tsx`.
      'use client'. Importar `MOCK_LOTS` de `@/lib/mockLotData` e `AnalyticsData` de `@/types/agrochain`. Calcular base a partir de MOCK_LOTS: lotesCertificados=5, produtoresAtivos=3, scoreESGMedio=78, volumeMockUSDC=MOCK_LOTS.reduce((a,l)=>a+l.área*150,0). Estado `periodo` ('7d'|'30d'|'90d'|'1a') com multiplicadores (7d=0.25, 30d=1, 90d=3, 1a=12). KPIs 4 cards. Filtros de período como botões tab. Gráfico de barras com divs (flexbox, altura proporcional, 6 meses mock, fundo var(--verde-600)). Grid 2 colunas: gráfico + lista de estados de origem (derivada de MOCK_LOTS). Tabela dos últimos 6 lotes (colunas: Lote ID, Origem, Status, Área, Data). Padrão visual de buyer/page.tsx.
      Files: `dapp/src/app/analytics/page.tsx`
      Verify: `cd dapp && npm run build` — `/analytics` aparece nas páginas geradas.

- [ ] 8. Atualizar `QRCodeDisplay.tsx` para usar `qrcode.react`.
      Importar `{ QRCodeSVG } from 'qrcode.react'`. Construir URL: `const origin = typeof window !== 'undefined' ? window.location.origin : 'https://agrochain.app'`. Renderizar `<QRCodeSVG value={origin + '/passport/' + lotId} size={qrSize} />` no lugar do placeholder div. Manter wrapper e texto descritivo. A dependência já está em `dapp/package.json`.
      Files: `dapp/src/components/QRCodeDisplay.tsx`
      Verify: `cd dapp && npm run build` — sem erros de importação.

- [ ] 9. Corrigir hydration mismatch em `passport/generate/page.tsx`.
      A linha que exibe `{window.location.origin}/passport/{selectedLotId}` causa erro de hydration pois `window` não existe no servidor. Substituir por `useState` inicializado com `''` e um `useEffect` que popula com `window.location.origin`. Renderizar `{origin}/passport/{selectedLotId}` onde `origin` é o estado.
      Files: `dapp/src/app/passport/generate/page.tsx`
      Verify: `cd dapp && npm run build` — sem erros de hydration ou TypeScript.

---

## Resumo de Arquivos

| Arquivo | Ação |
|---|---|
| `dapp/src/types/agrochain.ts` | Adicionar 2 interfaces |
| `dapp/src/components/layout/Sidebar.tsx` | Adicionar seção ANALYTICS & ESG |
| `dapp/src/app/layout.tsx` | Restaurar imports reais |
| `blockchain/contracts/CarbonCredits.sol` | Criar (novo) |
| `dapp/src/lib/contracts/carboncredits.ts` | Criar (novo) |
| `dapp/src/app/credits/page.tsx` | Criar (novo) |
| `dapp/src/app/analytics/page.tsx` | Criar (novo) |
| `dapp/src/components/QRCodeDisplay.tsx` | Atualizar para qrcode.react |
| `dapp/src/app/passport/generate/page.tsx` | Corrigir hydration mismatch |
| `dapp/src/app/passport/[lotId]/page.tsx` | Nenhuma alteração — já correto |
