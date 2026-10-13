# AgroChain Platform Unification Plan
## Migration from HTML Prototypes → Next.js 14 DApp

Generated: October 10, 2026 | Task: Consolidate 6 HTML prototype pages into unified Next.js 14 DApp with Three.js, hardhat integration, MetaMask deploy fix.

---

## 1. INVENTORY

### Prototype HTML Pages (prototipo-agrochain/)
- `index.html` — Landing page / Hero with gradient buttons, floating logo, links to all features
- `AgroChain.html` — Main dashboard with complex design system (kraft paper aesthetic, dark top bar, sidebar menu, cards, tables, grids)
- `certificador.html` — ZK certification form with Poseidon/snarkjs ZK proof generation, Web3 wallet connection, tabs for emit/query/config
- `dashboard.html` — Alternative dashboard with coffee/cacao focus, grid cards, status badges
- `dex.html` — CoffeeCacaoSwap DEX mockup with feature cards, roadmap status
- `template.html` — Layout template (rarely used, reference only)

### Supporting Prototype Assets
- `11_web3.js` — Web3 module with wallet connection, network switching (Sepolia test)
- `snarkjs.min.js` — ZK proof library (486KB minified)
- `/src/`, `/design/`, `/testes/` — Design specs and test files (lower priority)

### Existing DApp Pages (dapp/src/app/)
- `page.tsx` — Dashboard with MetricCard, 3D FarmGlobe, recent certs table
- `layout.tsx` — Root layout with Sidebar, TopBar, Providers
- `certificacao/page.tsx` — Certification form (incomplete, missing MetaMask tx submission)
- `rastreio/page.tsx` — Exists (not examined, assumed traceability)
- `dex/page.tsx` — Exists (not examined, assumed swap interface)
- `compliance/page.tsx` — Exists (not examined, assumed compliance dashboard)

### Existing DApp Components (dapp/src/components/)
- `layout/Sidebar.tsx` — Navigation with 5 items (Dashboard, Rastreabilidade, Certificação, DEX, Compliance)
- `layout/TopBar.tsx` — Expected but not examined
- `ui/MetricCard.tsx` — Metric display card
- `ui/Badge.tsx` — Product-type badge (coffee/cacao variant)
- `three/FarmGlobe.tsx` — Three.js 3D globe (dynamic import with fallback loading)

### Dependencies
```
next: 14.2.29
react: 18.3.1
three: 0.168.0
@react-three/fiber: 8.17.10
@react-three/drei: 9.114.3
wagmi: 2.12.29
viem: 2.21.54
@tanstack/react-query: 5.56.2
tailwindcss: 3.4.13
```

---

## 2. CONTENT EXTRACTION

### index.html Content
- **Hero Section**: Floating 🌾 emoji, gradient h1 "AgroChain", subtitle "Blockchain + IA Compliance 360°"
- **Badges**: ☕ Coffee (Arabica & Robusta), 🍫 Cacao (All Varieties)
- **Primary Buttons**: "Acessar Dashboard", "Certificador ZK"
- **Link Cards** (6): ZK Cert, AI Compliance API, Coffee Traceability, Cacao Traceability, Smart Contracts, DEX
- **Status Bar**: Fixed bottom-right "Sistema Ativo" with pulsing green dot
- **Navigation Links**: Points to dashboard.html, certificador.html, dex.html

### AgroChain.html Content (Main Dashboard)
- **Color System**:
  - Kraft paper: `#f5f1e7` (fundo), `#fffdf8` (sup-1), `#f2ecdd` (sup-2)
  - Forest green: `#195236` (verde-700), `#1f6440` (verde-600), `#2f8f52` (verde-500)
  - Coffee/earth: `#2f1e10` (cafe-800), `#6b4426` (cafe-600), `#d8b089` (cafe-300)
  - Gold detail: `#b8912a` (ouro), `#8a6712` (ouro-claro)
  - Dark scopes: `#0b1d12` (dark fundo), `#102519` (dark sup-1)
- **Typography**: Segoe UI (sans), Iowan Old Style (serif), monospace for technical
- **Layout**: Sticky top bar (dark gradient 180deg #10301f→#0b2216), left sidebar (248px), main content flex
- **Card System**: `.cartao` with border, shadow-2, padding var(--e-4)
- **KPI Blocks**: Title, value (serif, large), subtitle, optional variance indicator
- **Tables**: `font-variant-numeric: tabular-nums`, alternating row backgrounds, hover highlight
- **Components**: Chips (inline filters), badges (severity indicators), message boxes (colored left border), progress bars (Poseidon hash visual)
- **Semantic Colors**: Green=positive, Gold=attention, Red=critical, Blue=info, Purple=special
- **Animations**: Fade/slide-in for toasts, pulse for mining spinners, dash-array draw for chart traces

### certificador.html Content (ZK Certification)
- **Left Menu**: 3 tabs (Emissão de Certificação, Consultar Certificações, Configuração)
- **Emissão Form**:
  - **Batch Data**: Batch ID (hash), Quality Standard hash, Technical Report hash, Product Type, Min Score (0-100), Valid Until date
  - **ZK Proof**: Score (private 0-100), Salt (random), Generate Proof button
  - **Recipient**: Wallet address, IPFS metadata URI, Emit / Estimate Gas buttons
- **Consulta Tab**: Query by certification ID, display result cards with details
- **Configuração Tab**: Blockchain network display, wallet connection status, contract address input, AGRO token balance, Sepolia switcher
- **Web3 Integration**: MetaMask connect/disconnect, network detection pulse (green=connected, red=offline), TX hash link to block explorer
- **Validation**: Required fields, ZK proof prerequisite for emit, gas estimation before commit
- **Result Section**: TX hash link, NFT ID, AGRO tokens received, block number

### dashboard.html Content
- **Header**: Centered title, focus badges (☕ Coffee, 🍫 Cacao)
- **Card Grid**: 3-column responsive layout with hover lift-up animation
- **Card Content**: Title, description, buttons (primary red, secondary teal)
- **Status Badge**: Inline animated pulse status indicator
- **Focus Areas**: Product comparisons, traceability intro, market data teaser

### dex.html Content
- **Header**: "CoffeeCacaoSwap DEX - Preview", gradient title, pulsing "Coming Soon" badge
- **Feature Cards**: Feature lists with ✓ checkmarks in teal color
- **Roadmap**: Phase 1 (Liquidity), Phase 2 (Governance), Phase 3 (Derivatives)
- **Status**: "Building" — not production-ready in prototype

---

## 3. COMPONENT MAPPING

| Prototype Element | React Component | Location | Notes |
|---|---|---|---|
| Top bar (dark) | TopBar | src/components/layout/TopBar.tsx | Sticky, logo, network status, wallet button |
| Left sidebar | Sidebar | src/components/layout/Sidebar.tsx | ✓ Exists, nav items configured |
| Hero section | HeroSection | src/components/sections/HeroSection.tsx | NEW: Landing page hero |
| Link cards (6) | FeatureCard | src/components/ui/FeatureCard.tsx | NEW: Link card with emoji, text, button |
| KPI card | MetricCard | src/components/ui/MetricCard.tsx | ✓ Exists |
| Badge (coffee/cacao) | Badge | src/components/ui/Badge.tsx | ✓ Exists |
| Cert form card | CertificationForm | src/components/forms/CertificationForm.tsx | NEW: Extract from certificador.html |
| ZK proof UI | ZKProofGenerator | src/components/zk/ZKProofGenerator.tsx | NEW: Poseidon/snarkjs wrapper |
| Wallet connect | WalletConnect | src/components/web3/WalletConnect.tsx | NEW: MetaMask UI |
| 3D globe | FarmGlobe | src/components/three/FarmGlobe.tsx | ✓ Exists (Three.js) |
| Chart/graph | ChartContainer | src/components/charts/ChartContainer.tsx | NEW: For market data visualization |
| Toast/message | Toast | src/components/ui/Toast.tsx | NEW: Fixed bottom-right notification |
| Data table | DataTable | src/components/ui/DataTable.tsx | NEW: Tabular data (certs, history) |

---

## 4. MISSING PAGES

Based on sidebar nav and prototype refs, these routes **must be implemented**:

| Route | Purpose | Status | Notes |
|---|---|---|---|
| `/` | Dashboard | IN PROGRESS | Has page.tsx + 3D globe ✓; needs design sync to AgroChain.html theme |
| `/rastreio` | Coffee/Cacao traceability | EXISTS | Assumed complete, not examined |
| `/certificacao` | ZK cert emission | IN PROGRESS | page.tsx exists but lacks full Web3 form + MetaMask TX; **BROKEN: MetaMask deploy issue** |
| `/dex` | CoffeeCacaoSwap swap UI | EXISTS | Assumed complete, not examined |
| `/compliance` | AI compliance dashboard | EXISTS | Assumed complete, not examined |
| `/landing` or `/` | Hero landing (alt) | MISSING | Prototype has rich hero; current `/` is dashboard-only |

**Decision**: Use `/` as combined hero+dashboard (hero first fold, dashboard table second fold), no separate `/landing` route to reduce complexity.

---

## 5. LAYOUT STRATEGY

### Global Layout (layout.tsx)
```
┌─────────────────────────────────────────┐
│  TopBar (sticky, dark, 56-60px height)  │
│  Logo | Network Status | Wallet | Menu  │
├──────────────────┬──────────────────────┤
│  SIDEBAR         │  MAIN CONTENT        │
│  (240px)         │  (flex: 1, overflow) │
│  - Dashboard 📊  │                      │
│  - Rastreio 🔍   │  <children />        │
│  - Certificacao  │                      │
│  - DEX 🔄        │                      │
│  - Compliance 🤖 │                      │
└──────────────────┴──────────────────────┘
```

### TopBar Components
- **Left**: AgroChain logo + brand mark
- **Center**: (optional) Quick search or status ticker
- **Right**: 
  - Network indicator (Sepolia / Mainnet) with pulsing dot
  - Wallet connect button / address display
  - Account menu (dropdown)

### Sidebar (240px fixed, sticky top=56px)
- Section headers (NAVEGAÇÃO, SISTEMA)
- 5 nav items with hover/active states
- Footer: Product name + version

### Content Area (flex: 1)
- Padding: 24px
- Max-width: 1600px centered (for large screens)
- Overflow-y: auto

---

## 6. DESIGN SYSTEM

### Color Variables (CSS Custom Properties)
```
Kraft Paper (Light Backgrounds):
--fundo:         #f5f1e7  (main page bg)
--sup-1:         #fffdf8  (card/surface 1)
--sup-2:         #f2ecdd  (card/surface 2)
--sup-3:         #e8e0cd  (card/surface 3)
--linha:         #e6ddc9  (border)
--linha-forte:   #d6c9b0  (strong border)

Forest Green (Primary Identity):
--verde-950:     #071c11  (darkest)
--verde-900:     #0d3322
--verde-800:     #13422c
--verde-700:     #195236  (sidebar, headings)
--verde-600:     #1f6440  (primary buttons)
--verde-500:     #2f8f52  (accents)
--verde-400:     #4aa06c
--verde-300:     #2c7a4e
--verde-100:     #e8f2ea  (very light)

Coffee/Earth (Secondary):
--cafe-800:      #2f1e10  (darkest)
--cafe-700:      #4a2f1c
--cafe-600:      #6b4426
--cafe-400:      #b07d4f
--cafe-300:      #d8b089  (light)

Gold Detail:
--ouro:          #b8912a  (primary gold)
--ouro-claro:    #8a6712  (darker gold)

Text:
--texto-1:       #1e2a22  (primary text)
--texto-2:       #495649  (secondary text)
--texto-3:       #7c867a  (tertiary text)

Semantic (Fixed Meaning):
--positivo:      #15653e  (green success)
--negativo:      #a83226  (red error)
--critico:       #a83226  (red alert)
--atencao:       #b26a06  (orange warning)
--info:          #1f6f9e  (blue info)
--especial:      #5f4aa0  (purple special)

Dark Scopes (Top bar, map, terminal):
--[dark] fundo:  #0b1d12
--[dark] sup-1:  #102519
--[dark] texto-1: #f3f7f2
```

### Typography
| Use | Family | Size | Weight | Letter-spacing |
|---|---|---|---|---|
| Page titles (h1) | Georgia, serif | 26px | 600 | -0.3px |
| Section titles (h2) | Georgia, serif | 15.5px | 600 | 0.1px |
| Subsection (h3) | Segoe UI | 10.5px | 700 | 0.9px (uppercase) |
| Body | Segoe UI | 13.5px | 400 | 0 |
| Small | Segoe UI | 12px | 400 | 0 |
| XS (labels) | Segoe UI | 10.5px | 700 | 0.7px (uppercase) |
| Mono (code, hash) | Courier New / monospace | 10.5–12.5px | 400 | 0 |

### Spacing Scale
```
--e-1: 4px      (tight, inline)
--e-2: 8px      (small)
--e-3: 12px     (default)
--e-4: 16px     (medium)
--e-5: 24px     (large)
--e-6: 32px     (XL)
```

### Border Radius
```
--raio-xs:  7px
--raio-sm:  10px
--raio:     16px  (default card radius)
--raio-lg:  22px
--raio-pill: 999px (for buttons, badges)
```

### Shadows
```
--sombra:    0 1px 2px rgba(31,42,34,.06)
--sombra-2:  0 1px 2px rgba(31,42,34,.05), 0 12px 28px -20px rgba(19,66,44,.35)
--sombra-3:  0 26px 64px -26px rgba(13,51,34,.45)
--brilho:    inset 0 1px 0 rgba(255,255,255,.5)
```

### Animation Timing
```
--t-rapida:  120ms  cubic-bezier(.2,.7,.3,1)
--t-media:   220ms  cubic-bezier(.2,.7,.3,1)
--t-lenta:   420ms  cubic-bezier(.2,.7,.3,1)
```

---

## 7. IMPLEMENTATION ORDER

### Phase 1: Layout & Infrastructure (Days 1–2)
**Goal**: Establish solid foundation — all pages load with correct layout and nav.

- [ ] **1.1** Create tailwind.config.ts with all CSS custom properties as Tailwind theme extension
  - Extract all color, spacing, radius, shadow, timing variables from AgroChain.html `<style>`
  - Make available as `bg-kraft`, `text-verde-700`, `border-linha`, etc.
  - **Verify**: `npm run build` succeeds, no CSS errors

- [ ] **1.2** Update layout.tsx — sync TopBar, Sidebar, main content structure with design
  - Set background, padding, fonts correctly
  - Import & render TopBar and Sidebar components
  - Ensure sticky positioning, responsive breakpoints (900px mobile)
  - **Verify**: Page loads, sidebar visible, content area grows, scroll works

- [ ] **1.3** Create TopBar component (src/components/layout/TopBar.tsx)
  - Logo + brand mark (left)
  - Network status display + pulsing indicator (center)
  - Wallet button + account menu (right)
  - Sticky positioning, dark gradient background (180deg #10301f→#0b2216)
  - MetaMask connection state UI (show address when connected, show "Conectar" button when not)
  - **Verify**: TopBar renders, network indicator pulses, wallet button clickable

- [ ] **1.4** Update Sidebar component — verify nav items, styling, active state
  - Adjust colors to match design (background #fff, active bg verde-600, text light)
  - Ensure all 5 nav items present: Dashboard, Rastreabilidade, Certificação, DEX, Compliance
  - Footer with product name
  - **Verify**: Nav links working, active page highlighted, sidebar sticky on scroll

- [ ] **1.5** Create shared UI components (src/components/ui/)
  - **Button.tsx**: Primary (verde-600), secondary (sup-2), tertiary (transparent), sizes (sm, md, lg), disabled state
  - **Card.tsx**: Default, .claro variant (white bg), .destaque variant (green border), .alerta variant (red border)
  - **Input.tsx**: Text, number, select, textarea with focus states, error styling
  - **Toast.tsx**: Fixed position bottom-right, colors (verde, ouro, vermelho, roxo), dismiss animation
  - **DataTable.tsx**: Headers, rows, alternating bg, hover highlight, monospace numbers
  - **Chip.tsx**: Inline filter chip, variants (verde, ouro, vermelho, azul, roxo, cinza), clickable
  - **Verify**: Each component renders with correct styling, dark mode compatible (via CSS vars)

---

### Phase 2: Core Pages (Days 3–4)
**Goal**: Migrate prototype content into React pages, sync design visually.

- [ ] **2.1** Migrate Dashboard (/) — combine hero + data view
  - **Upper section**: HeroSection component (floating emoji, gradient title, subtitle, badges, 3 buttons)
  - **Middle section**: 4 metric cards (KPI grid: Lotes Coffee, Lotes Cacao, Volume DEX, Compliance Score)
  - **Lower section**: 3D FarmGlobe (use existing FarmGlobe component, dynamic import with fallback)
  - **Bottom section**: Table of recent certifications (use DataTable)
  - Apply AgroChain.html color scheme, layout grid
  - **Verify**: `npm run dev`, navigate to `/`, all sections render, 3D globe loads with fallback text

- [ ] **2.2** Create landing/hero component (src/components/sections/HeroSection.tsx)
  - Floating emoji animation (keyframe translateY)
  - Gradient h1 + subtitle
  - 2 action buttons (Dashboard, Certificador ZK)
  - 6 feature link cards (ZK Cert, API, Coffee Trace, Cacao Trace, Smart Contracts, DEX)
  - Extract from prototype index.html
  - **Verify**: Component renders on Dashboard page, buttons link correctly, responsive on mobile

- [ ] **2.3** Migrate Rastreio page (/rastreio)
  - Read existing rastreio/page.tsx, understand current structure
  - Sync styling to AgroChain.html theme (kraft paper, green accents)
  - Add breadcrumb / section header
  - If missing: add search/filter controls, traceability timeline visualization
  - **Verify**: Page loads, styling matches theme, any existing data displays

- [ ] **2.4** Migrate Certificação page (/certificacao) — **PRIORITY FIX**
  - **Problem**: Current page.tsx has incomplete Web3 integration; MetaMask TX submit missing
  - Refactor form to match certificador.html structure (3 sections: Batch Data, ZK Proof, Recipient)
  - Add full Web3 TX submission via Wagmi + smart contract ABI
  - Implement `gerarProva()` → fetch /api/zk/prove → display commitment + real Groth16 proof if available
  - Add tabs (Emissão, Consulta, Configuração) if needed, or split into separate sub-routes
  - Connect to MetaMask chain switcher (Sepolia testnet)
  - **Verify**: Form submits, MetaMask popup appears, TX hash returned, page doesn't crash on error

- [ ] **2.5** Migrate DEX page (/dex)
  - Read existing dex/page.tsx, understand current structure
  - Sync styling to theme
  - Add token pair selector (Coffee ↔ Cacao)
  - Add swap interface mockup (Input amount, output amount, slippage tolerance)
  - Add liquidity pool list or roadmap status
  - **Verify**: Page loads, token selector works, styling matches

- [ ] **2.6** Migrate Compliance page (/compliance)
  - Read existing compliance/page.tsx, understand current structure
  - Sync styling to theme
  - Add AI compliance report display (if data exists)
  - Add recommendation cards / alert list
  - **Verify**: Page loads, content displays, styling matches

---

### Phase 3: Web3 & ZK Integration (Days 5–6)
**Goal**: Connect wallet, implement ZK proof generation, fix MetaMask deploy issue.

- [ ] **3.1** Setup Wagmi + Viem configuration (src/config/wagmi.ts)
  - Import from @wagmi/core and viem
  - Configure Ethereum, Sepolia chains
  - Add MetaMask connector
  - Export useAccount, useWriteContract, useWaitForTransactionReceipt hooks
  - **Verify**: Providers component uses this config, useAccount hook available in pages

- [ ] **3.2** Create WalletConnect component (src/components/web3/WalletConnect.tsx)
  - Use useAccount() to display connection state
  - Button to trigger wallet connect (window.ethereum?.request)
  - Display current address, network, balance
  - Handle disconnect
  - **Verify**: TopBar uses it, MetaMask connect works, address displays when connected

- [ ] **3.3** Implement ZK proof generation API (pages/api/zk/prove.ts)
  - Accept POST { batchId, type, variety, weight, origin }
  - Use snarkjs if available, else fallback to Poseidon hash
  - Return { proof, publicSignals, commitment, hash }
  - **Verify**: Curl test returns JSON, no errors

- [ ] **3.4** Create ZKProofGenerator component (src/components/zk/ZKProofGenerator.tsx)
  - Input fields: Score (private, 0–100), Salt, submit button
  - Call /api/zk/prove on submit
  - Display commitment hash, proof status (real Groth16 vs fallback)
  - Show badge indicating ZK mode (real vs mock)
  - **Verify**: Form submits, API called, proof displayed, no console errors

- [ ] **3.5** Fix MetaMask certification emit — integrate Web3 TX submission
  - In certificacao/page.tsx, implement `emitirCertificacao()` full flow:
    1. Validate form + wallet connected
    2. Generate ZK proof (call ZKProofGenerator)
    3. Prepare contract call data (ABI function call)
    4. Submit via Wagmi useWriteContract
    5. Wait for receipt via useWaitForTransactionReceipt
    6. Display TX hash link to Sepolia Scan
  - Add contract address input + save to localStorage
  - Implement gas estimation preview (estimateGas)
  - **Verify**: Connect MetaMask → fill form → submit → TX popup appears → hash displays (even if testnet fails to execute, TX should be submittable)

- [ ] **3.6** Create smart contract integration layer (src/lib/contracts.ts)
  - Export ABI for AgroChainCoffeeCacaoTraceability contract
  - Export contract address (from env or user input)
  - Export typed functions: emitCertificate, queryCertificate, updateCompliance
  - **Verify**: Components can import and use typed functions

---

### Phase 4: Three.js & Advanced Features (Days 7–8)
**Goal**: Enhance 3D visualization, add animations, polish UX.

- [ ] **4.1** Review & enhance FarmGlobe component (src/components/three/FarmGlobe.tsx)
  - Verify current Three.js + React Three Fiber setup
  - Add farm location points (animated markers on globe)
  - Add farm type color coding (coffee green, cacao brown)
  - Add camera controls (orbit, zoom)
  - Add loading fallback text / progress indicator
  - **Verify**: 3D globe renders, points visible, camera works, no console errors

- [ ] **4.2** Create ChartsContainer component (src/components/charts/ChartContainer.tsx)
  - Market price trends (Coffee Arabica, Cacao 30-day)
  - Volume histograms (DEX 24h, 7d, 30d)
  - Use SVG for price lines (animated dash-array draw)
  - Poseidon hash visualization (ring progress indicator)
  - Legend, tooltip on hover
  - **Verify**: Charts render, animations smooth, no layout shift

- [ ] **4.3** Add Toast notification system (src/lib/toast.ts)
  - useToast hook (queue toast, dismiss)
  - Toast context provider
  - Auto-dismiss after 4s
  - Call from API responses (success/error)
  - **Verify**: Pages can call useToast(), notifications appear bottom-right

- [ ] **4.4** Implement responsive design tweaks (Media queries for mobile)
  - Sidebar → mobile menu (hamburger)
  - Card grid → single column on mobile
  - Font size reduction
  - Adjust padding/margin
  - **Verify**: Test at 375px width (mobile), 768px (tablet), 1440px (desktop)

---

### Phase 5: Testing & Deployment (Days 9–10)
**Goal**: Verify all features work end-to-end, deploy to staging/production.

- [ ] **5.1** Unit test core components (vitest, React Testing Library)
  - Test Sidebar nav links route correctly
  - Test MetricCard renders with correct data
  - Test Badge displays coffee/cacao variant
  - Test Button disabled state
  - **Verify**: `npm run test` passes 20+ tests

- [ ] **5.2** End-to-end test user flows (Playwright/Cypress)
  - E2E: User connects MetaMask → navigates Dashboard → views metrics
  - E2E: User fills Certificação form → generates ZK proof → submits TX
  - E2E: User views Rastreio timeline, filters by origin
  - **Verify**: 3 E2E tests pass

- [ ] **5.3** Performance audit
  - Lighthouse score goal: >85 on mobile, >90 on desktop
  - Fix LCP (Largest Contentful Paint) — prioritize above-fold metrics
  - Optimize 3D globe chunk size (lazy load Three.js)
  - **Verify**: `npm run build && npx lighthouse` reports >85

- [ ] **5.4** Security audit & environment setup
  - Review .env file (never commit secrets)
  - Check for XSS/CSRF vulnerabilities in Web3 code
  - Verify contract address not hardcoded (use env var)
  - Test with MetaMask security best practices
  - **Verify**: No secrets in git, OWASP top 10 checked

- [ ] **5.5** Deploy to production (Vercel)
  - Set production env vars (contract address, RPC endpoint, API keys)
  - Deploy main branch → production domain
  - Configure Sepolia testnet for testing
  - Setup error tracking (Sentry)
  - **Verify**: URL loads, MetaMask connects, all pages accessible

- [ ] **5.6** Documentation & handoff
  - Write CONTRIBUTING.md for future devs
  - Document design system (colors, spacing, components)
  - Document ZK proof API contract
  - Add JSDoc comments to complex functions
  - **Verify**: New dev can follow docs and add feature

---

## 8. ZK/METAMASK NOTES

### Current State of certificacao/page.tsx
- ✅ **Works**: Form renders, fields populate, Wagmi hooks integrated
- ❌ **Broken**: 
  - `emitirCertificacao()` does NOT actually submit to contract
  - MetaMask popup never triggered
  - No TX hash returned
  - No gas estimation
  - Simulates 3s delay then displays fake results

### MetaMask Deploy Issue
**Symptom**: User says "certificado zk não está puxando na metamask para ser feito o deploy"
- **Root Cause**: Contract write function not wired in page.tsx
- **Fix Required**:
  1. Import contract ABI + address
  2. In `emitirCertificacao()`, call `writeContract()` with:
     ```typescript
     writeContract({
       address: contractAddress,
       abi: AbiAgroChainCoffeeCacao,
       functionName: 'emitCertificate',
       args: [batchId, zkProof, publicSignals, recipientAddress],
     })
     ```
  3. Listen to `hash` response → display "Confirming..." 
  4. Use `useWaitForTransactionReceipt(hash)` to wait for confirmation
  5. Display final TX hash + block number

### Required Smart Contract (Assumed to Exist)
Interface:
```solidity
contract AgroChainCoffeeCacaoTraceability {
  function emitCertificate(
    bytes32 batchId,
    Groth16Proof memory zkProof,
    uint256[] memory publicSignals,
    address recipient
  ) external returns (bytes32 txHash);
  
  function queryCertificate(bytes32 certId) external view returns (Certification memory);
}
```
- If contract NOT deployed on Sepolia, provide contract address + ABI
- If contract NOT built yet, scaffold it in Foundry/Hardhat

### Hardhat Integration Notes
- User mentioned "conecte as bibliotecas ... hardhat, openzepplin, foundry"
- Assumed: DApp reads contract ABI from artifact
- **TODO**: Add /contracts directory with Hardhat setup (if not already done)
- Scripts needed:
  - `npm run contracts:compile` → compile Solidity
  - `npm run contracts:deploy` → deploy to Sepolia testnet
  - `npm run contracts:verify` → verify on block explorer

---

## 9. THREE.JS NOTES

### Current Three.js Setup
- ✅ **Works**: FarmGlobe component exists, dynamic import with loading fallback
- **Dependencies**: three 0.168.0, @react-three/fiber 8.17.10, @react-three/drei 9.114.3
- **Usage**: Render 3D globe on Dashboard page (main section below metrics)

### Integration Approach
1. **FarmGlobe component** uses Canvas (React Three Fiber) to render:
   - Textured Earth globe (using Drei Sphere or custom mesh)
   - Farm location markers (Points or custom geometry)
   - Colors: Coffee farms (green), Cacao farms (brown)
   - Orbit controls for user interaction
   
2. **Data**: Fetch farm locations from API or mock data:
   ```typescript
   type Farm = { 
     lat: number; 
     lon: number; 
     type: 'coffee' | 'cacao'; 
     name: string;
   }
   ```

3. **Animation**: Marker bounce, camera orbit, click to zoom (future)

4. **Performance**: 
   - Lazy load Three.js via Next.js dynamic import
   - Render fallback loading text while module loads (~500ms)
   - Keep point count < 200 to maintain 60fps
   - Cache geometry/material

### Enhancements (Nice-to-have)
- Timeline scrubber: Show farm data by certification date
- Heatmap: Color intensity = compliance score
- Info popup: Click farm → show batch ID, origin, certificate link
- Export: Download 3D scene as PNG/video

---

## 10. HIGH-LEVEL WORKFLOW

### User Landing Flow
1. User arrives at `/` → sees **Hero Section** (emoji, title, 2 buttons, 6 feature cards)
2. Clicks "Acessar Dashboard" → scrolls down to see **Metrics** (4 KPI cards)
3. Sees **3D FarmGlobe** map of certified farms
4. Views **Recent Certifications** table at bottom

### User Certification Flow
1. User navigates to `/certificacao` → sees form
2. Fills **Batch Data** (ID, type, variety, weight, origin)
3. Fills **ZK Proof** (private score, salt) → clicks "Gerar Prova ZK"
4. API generates proof, returns commitment hash
5. Fills **Recipient** wallet address
6. Clicks **Emitir Certificação** → MetaMask popup
7. Confirms TX in wallet → page shows TX hash + link to block explorer

### User Compliance Flow
1. Navigates to `/compliance` → sees AI recommendations
2. Reviews alerts (critical, warning, info)
3. Exports report (PDF / CSV)

---

## 11. SUMMARY TABLE

| Component | Current Status | Required Action | Effort | Priority |
|---|---|---|---|---|
| Layout/TopBar/Sidebar | Partial | Sync styling, add wallet UI | 1d | CRITICAL |
| Dashboard | In progress | Add hero, 3D globe, metrics table | 1d | CRITICAL |
| Rastreio | Exists | Verify, sync styling | 4h | HIGH |
| Certificação | Broken | Fix MetaMask TX, ZK proof gen | 2d | CRITICAL |
| DEX | Exists | Verify, sync styling | 4h | MEDIUM |
| Compliance | Exists | Verify, sync styling | 4h | MEDIUM |
| Design System | Not implemented | Create Tailwind config, CSS vars | 1d | CRITICAL |
| Web3 Integration | Partial | Wagmi config, contract ABIs | 1d | CRITICAL |
| ZK API | Missing | Implement /api/zk/prove | 4h | HIGH |
| Three.js FarmGlobe | Exists | Enhance with farm markers | 4h | MEDIUM |
| Tests | None | Unit + E2E for critical flows | 1d | HIGH |
| Deployment | Not configured | Vercel setup, env vars, secrets | 4h | HIGH |

---

## 12. BLOCKERS & ASSUMPTIONS

### Blockers
1. **Smart Contract Address**: Need deployed AgroChainCoffeeCacaoTraceability contract on Sepolia testnet. If not available, Hardhat project must be created + compiled + deployed.
2. **Contract ABI**: Must have ABI file for Wagmi integration. Assumed to exist or will be generated from Hardhat artifacts.
3. **ZK Circuit**: Assumes wasm + zkey files exist for Groth16 proof generation. If not, fallback to Poseidon hash commitment is acceptable for MVP.
4. **API Endpoints**: Must have backend API serving `/api/zk/prove`. If missing, can be mocked with POST handler in Next.js /api directory.

### Assumptions
1. MetaMask is primary wallet (no WalletConnect, no other signers)
2. Sepolia testnet is target chain (not production Ethereum)
3. Three.js globe is nice-to-have; fallback to static map acceptable if performance issue
4. Existing pages (rastreio, dex, compliance) are functionally complete; only styling sync needed
5. User data (farms, certificates, prices) is seeded or fetched from external API
6. No offline-first requirement; online-only DApp

---

## 13. NEXT STEPS FOR CODER

1. **Read this plan top-to-bottom**, ask clarifying questions on any blocked items
2. **Verify contract exists**: If not, create Hardhat project in `/contracts` directory
3. **Start Phase 1**: Tailwind config + layout components (48h effort)
4. **Parallel: Phase 3.5**: Fix MetaMask TX (criticality high)
5. **Integration test**: Verify all pages load, nav works, styling consistent
6. **Deploy**: Vercel → staging environment for user validation

---

**Plan prepared by**: Planning Agent | **Date**: October 10, 2026 | **Version**: 1.0 (Foundation)

