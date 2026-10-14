# Plano de Implementação: Módulo Public Passport para AgroChain

Projeto: c:\Users\Usuário\agrochain\workspace-01a1162b-e061-7ff0-b060-dfa40cc70dfdzip\
Tech Stack: Next.js 14 + TypeScript + MetaMask (Sepolia testnet)
Design System: design.md (papel kraft claro, tipografia serifa, tokens de cor fixos)

---

## Visão Geral

Este plano decompõe a implementação do módulo Public Passport em **3 features separáveis e sequenciais**:

1. **FEAT-001**: Dependências, tipos, componente QRCodeDisplay, utils
2. **FEAT-002**: Página pública de visualização (/passport/[lotId])
3. **FEAT-003**: Página geradora de QR para produtores + atualizar Sidebar

Cada feature deixa o projeto em estado buildável. A ordem é obrigatória: FEAT-002 e FEAT-003 dependem de FEAT-001.

---

## FEAT-001: Tipos, Componente QRCodeDisplay, Utils e Dependências

**Objetivo**: Instalar qrcode.react, expandir types/agrochain.ts, criar componente reutilizável QRCodeDisplay.tsx, criar lib/passport.ts com utilitários.

**Decisões de design**:
- **qrcode.react**: biblioteca padrão, bem mantida, gera QR codes em React; alternativa (QR Server API via img) era via URL, mas qrcode.react oferece controle e download local.
- **PassportData**: interface que encapsula todos os dados de um lote para exibição pública (reutilizável em ambas as páginas).
- **QRCodeDisplay**: componente genérico com prop `size` (small/medium/large) para evitar duplicação de código.

### Itens

- [ ] **1.1 Instalar qrcode.react**
      Comando: `npm install qrcode.react @types/qrcode.react` em dapp/
      Atualiza dapp/package.json com nova dependência.
      Arquivos: dapp/package.json
      Verificar: `npm run build` sem erros; `npm list qrcode.react` mostra instalado.

- [ ] **1.2 Expandir types/agrochain.ts com PassportData e PassportAccess**
      Adicionar:
      - `interface PassportData { loteId, produtor, safra, origem, area, dataPlantio, dataColheita, eventos[], certificacoes[], status }`
      - `type PassportAccess = 'public' | 'producer-only'`
      Arquivos: dapp/src/types/agrochain.ts
      Verificar: `grep 'PassportData' dapp/src/types/agrochain.ts` encontra interface; `npm run build` sem erros TS.

- [ ] **1.3 Criar componente QRCodeDisplay.tsx**
      Componente React que:
      - Aceita props: `{ lotId: string; size?: 'small' | 'medium' | 'large' }`
      - Usa `QRCode.Canvas` de qrcode.react para renderizar URL `https://agrochain.example.com/passport/[lotId]`
      - Dimensões: small=120px, medium=160px (padrão), large=200px
      - CSS: raio 8px, sombra-2 conforme design.md, borda 1px #e6ddc9
      Arquivos: dapp/src/components/QRCodeDisplay.tsx
      Verificar: Componente pode ser importado; renderiza sem erro; mostra QR visualmente.

- [ ] **1.4 Criar lib/passport.ts com buildPassportData, generatePassportQR, verifyLotAuthenticity**
      Três funções:
      1. `buildPassportData(lotId: string): PassportData` — busca lote em mock data, monta objeto completo
      2. `generatePassportQR(lotId: string, size?: 'small'|'medium'|'large'): React.ReactNode` — retorna `<QRCodeDisplay lotId={...} size={...} />`
      3. `verifyLotAuthenticity(lotId: string): Promise<{ authentic: boolean; message: string }>` — mock que retorna `{ authentic: true, message: 'Lote autêntico no blockchain' }`
      Arquivos: dapp/src/lib/passport.ts
      Verificar: `grep 'export' dapp/src/lib/passport.ts` mostra 3 exports; `npm run build` sem erros.

---

## FEAT-002: Página Pública de Visualização (/passport/[lotId])

**Objetivo**: Criar página sem login, sem sidebar, com layout customizado, exibindo dados completos do lote, timeline visual, certificações, verificações, QR code, botão de autenticidade, responsivo e pronto para impressão.

**Decisões de design**:
- **Sem Sidebar**: criar layout local ou usar conditional render; página é "pública", design diferente.
- **Layout**: cabeçalho com h1 (loteId, produtor, safra), KPI grid (origem, area, datas), Certificações grid, Timeline visual com pontos coloridos e linhas, Verificações (3 cards), QR code, rodapé com metadata.
- **Timeline visual**: evento anterior/próximo conectados por linha vertical; pontos coloridos por tipo de evento (plantio=verde, colheita=ouro, etc.); descrição completa abaixo de cada ponto.
- **Meta tags**: Open Graph (og:title, og:description, og:url, og:image) para compartilhamento em redes.
- **Responsividade**: breakpoint 768px — layout de coluna única, QR move para topo, botões stackados.
- **Print**: @media print oculta botões, realça dados, ajusta cores para impressão (fundo branco, texto escuro).

### Itens

- [ ] **2.1 Criar diretório e arquivo page.tsx**
      Criar dapp/src/app/passport/[lotId]/page.tsx com estrutura:
      - `'use client'` no topo
      - `useParams()` para extrair `[lotId]`
      - Sem `useAccount()` (acesso público)
      Arquivos: dapp/src/app/passport/[lotId]/page.tsx
      Verificar: Arquivo criado, compilável.

- [ ] **2.2 Implementar cabeçalho e seção KPI**
      Cabeçalho (max-width 1320px, margin auto):
      - h1 em serifa, 28px, verde-700: `{lotId}`
      - Subtítulo em `--texto-2`: `Produtor: {produtor} · Safra: {safra}`
      - Grid 2x2 com KPI: Origem, Área, Data Plantio, Data Colheita
      - QR code à direita (120px padrão ou 160px em desktop)
      Design: branco #fffdf8, raio 12px, sombra-2, padding 24px, gap 32px entre grid e QR.
      Arquivos: dapp/src/app/passport/[lotId]/page.tsx
      Verificar: Cabeçalho renderiza com dados corretos; QR visível.

- [ ] **2.3 Implementar seção Certificações**
      Grid de cartões (auto-fit, minmax 220px):
      - Cada cartão: tipo (NFT/ZK/EUDR/ESG) em h3 serifa 15px
      - Badge de status: Pendente (ouro), Certificado (verde), Revogado (vermelho)
      - Se não Pendente: mostrar datas Emissão/Vencimento
      - Cores conforme design.md e STATUS_COLORS
      Arquivos: dapp/src/app/passport/[lotId]/page.tsx
      Verificar: Certificações renderizam, cores corretas, status legível.

- [ ] **2.4 Implementar Timeline visual de eventos**
      Seção h2 "Timeline de Eventos":
      - Lista de eventos ordenada (recentes primeiro via `ordenarEventosPorData`)
      - Cada evento:
        - Ponto colorido (12px, borda branca, cor por tipo)
        - Linha conectora (2px vertical, #e6ddc9)
        - Cartão de conteúdo: tipo (h4), data, descrição, local, responsável
      - Cores: usar `obterCorStatus(evento.tipo)` via STATUS_COLORS
      Design: padding-left 40px para linha; pontos em absolute; layout responsivo quebra em mobile.
      Arquivos: dapp/src/app/passport/[lotId]/page.tsx
      Verificar: Timeline renderiza, eventos em ordem, pontos conectados, cores corretas.

- [ ] **2.5 Implementar seção Verificações**
      3 cartões: Origin Verification, EUDR Compliance, ESG Score
      Cada cartão mostra:
      - Título (h3)
      - Status badge (Aprovado/Pendente/Rejeitado)
      - Dados relevantes (país/região, score, metodologia)
      - Ícone visual (bolinha com cor semântica)
      Design: grid 3 colunas, quebra para 1 em mobile, cores de papel semântico.
      Arquivos: dapp/src/app/passport/[lotId]/page.tsx
      Verificar: 3 cartões visíveis, status e dados corretos.

- [ ] **2.6 Implementar botão 'Verificar Autenticidade' e modal/toast**
      Botão primário (verde) no cabeçalho ou lado do QR.
      Ao clicar:
      - Chama `verifyLotAuthenticity(lotId)` de passport.ts
      - Aguarda Promise
      - Exibe modal ou toast com resultado: "Lote autêntico no blockchain" (verde) ou "Lote não verificado" (vermelho)
      - Botão tem loading state enquanto aguarda
      Arquivos: dapp/src/app/passport/[lotId]/page.tsx
      Verificar: Botão clicável, função chamada, feedback exibido.

- [ ] **2.7 Adicionar rodapé com metadata**
      Rodapé em `--t-sm` (#7c867a):
      - "Dados de referência: {data atual}"
      - "Fonte: Mock Data · Verificado em blockchain"
      Arquivos: dapp/src/app/passport/[lotId]/page.tsx
      Verificar: Rodapé renderiza com informações.

- [ ] **2.8 Implementar layout customizado (sem Sidebar)**
      Opção A: Criar dapp/src/app/passport/layout.tsx que envolve children sem Sidebar.
      Opção B: Usar conditional render na page (checar pathname).
      Recomendação: Opção A (layout local). Layout simples: header mínimo + children em container.
      Arquivos: dapp/src/app/passport/layout.tsx (novo)
      Verificar: Navegar para /passport/LOT-2026-001 não exibe Sidebar.

- [ ] **2.9 Adicionar meta tags Open Graph**
      Usar `generateMetadata()` ou next/head:
      - `og:title`: "Passport do Lote {lotId}"
      - `og:description`: "{produtor} · {origem} · {safra}"
      - `og:url`: "https://agrochain.example.com/passport/{lotId}"
      - `og:image`: URL da imagem (pode ser QR ou placeholder)
      - `og:type`: "website"
      Arquivos: dapp/src/app/passport/[lotId]/page.tsx (adicionar generateMetadata)
      Verificar: Inspecionar HTML, verificar tags presentes.

- [ ] **2.10 Implementar responsividade**
      Breakpoints:
      - < 640px: coluna única, QR topo, buttons stackados, fonts reduzidas
      - 640-1024px: grid flex, QR lado, ajustes spacing
      - > 1024px: layout completo, grid 2x2, QR fixo
      Media queries CSS: @media (max-width: 768px) { ... }
      Arquivos: dapp/src/app/passport/[lotId]/page.tsx (styles)
      Verificar: DevTools 640px, 768px, 1024px — layout quebra corretamente.

- [ ] **2.11 Implementar print media**
      @media print { ... }:
      - Ocultar botões (#verify-btn, #copy-btn)
      - Fundo branco (#fff)
      - Manter dados principais e timeline
      - Quebra de página: timeline pode ser longa, usar page-break-inside: avoid em cartões
      Arquivos: dapp/src/app/passport/[lotId]/page.tsx (styles)
      Verificar: Ctrl+P (print preview), layout legível em A4.

- [ ] **2.12 Verificação final de design e acessibilidade**
      - Verificar contraste: `--texto-1` (#1e2a22) ≥ 12:1 sobre `--sup-1` (#fffdf8)
      - Badges de status com texto + cor (não apenas cor)
      - Títulos em h1/h2/h3/h4 em ordem
      - Sem emojis, usar glifos de texto (✓, ✗, ⚠)
      - Numeração tabular em dados (area, datas)
      Arquivos: dapp/src/app/passport/[lotId]/page.tsx
      Verificar: npm run build sem erros; lighthouse audit >= 90.

---

## FEAT-003: Página QR Generator + Atualização Sidebar

**Objetivo**: Criar página geradora de QR para produtores autenticados via MetaMask, adicionar link na Sidebar.

**Decisões de design**:
- **Autenticação**: validar `useAccount().isConnected`; mostrar prompt de conexão se falso.
- **Seletor de lotes**: dropdown com lista mock; ao selecionar, QR atualiza em tempo real.
- **Botões**: "Baixar QR" (PNG via canvas.toDataURL), "Copiar Link" (clipboard API).
- **Sidebar**: item em RASTREIO, condicional (aparece só se autenticado).

### Itens

- [ ] **3.1 Criar diretório e arquivo page.tsx para /passport/generate**
      Criar dapp/src/app/passport/generate/page.tsx com estrutura:
      - `'use client'`
      - `useAccount()` de wagmi
      - Estado: selectedLotId (string)
      - Lista mock de lotes: LOT-2026-001, LOT-2026-002, LOT-2025-015
      Arquivos: dapp/src/app/passport/generate/page.tsx
      Verificar: Arquivo criado, compilável.

- [ ] **3.2 Implementar verificação de autenticação**
      Se `!isConnected`:
      - Renderizar card vazio: "Conecte sua carteira MetaMask para acessar o Gerador de QR"
      - Botão "Conectar Carteira" (redirecionará para TopBar ou mostra modal de conexão wagmi)
      Se conectado: renderizar resto da página.
      Arquivos: dapp/src/app/passport/generate/page.tsx
      Verificar: Sem MetaMask: página mostra prompt; com MetaMask: página carrega.

- [ ] **3.3 Implementar seletor de lotes (dropdown)**
      HTML select ou combobox com options:
      - Placeholder: "Selecione um lote..."
      - Options: LOT-2026-001, LOT-2026-002, LOT-2025-015 (labels legíveis)
      Ao mudar: `setSelectedLotId(value)` e re-renderiza página.
      Design: conforme design.md, altura 40px, padding 10px 12px, border #e6ddc9, raio 6px.
      Arquivos: dapp/src/app/passport/generate/page.tsx
      Verificar: Dropdown funciona, mudança atualiza estado.

- [ ] **3.4 Implementar pré-visualização de QR**
      Chamar `generatePassportQR(selectedLotId, 'large')` e renderizar.
      QR size 200px.
      Design: cartão com QR centralizado, raio 12px, sombra-2.
      Arquivos: dapp/src/app/passport/generate/page.tsx
      Verificar: QR renderiza ao selecionar lote; muda ao trocar lote.

- [ ] **3.5 Implementar botão 'Baixar QR' (PNG)**
      Função `downloadQR(selectedLotId)`:
      - Obter referência canvas de QRCode.Canvas
      - Chamar `canvas.toDataURL('image/png')`
      - Criar blob e usar link download: `<a href={blobUrl} download="passport-{lotId}.png">`
      - Ou via manual: `fetch(dataUrl).then(r => r.blob()).then(blob => { const url = URL.createObjectURL(blob); ... })`
      Botão secundário, color #1f6440, text white.
      Ao clicar: executa download.
      Arquivos: dapp/src/app/passport/generate/page.tsx + dapp/src/lib/passport.ts
      Verificar: Clicar botão, arquivo PNG baixado com nome correto.

- [ ] **3.6 Implementar botão 'Copiar Link' (clipboard)**
      Função `copyLinkToClipboard(selectedLotId)`:
      - URL: `https://agrochain.example.com/passport/{lotId}`
      - `navigator.clipboard.writeText(url)`
      - Mostra toast sucesso: "Link copiado para clipboard!" (verde, 3s)
      Botão secundário, color #1f6440.
      Arquivos: dapp/src/app/passport/generate/page.tsx + dapp/src/lib/passport.ts
      Verificar: Clicar botão, URL copiada (verificar clipboard), toast exibe.

- [ ] **3.7 Adicionar responsividade**
      Layout mobile (< 768px):
      - Coluna única: seletor, QR, botões stackados vertically
      - Fonte reduzida, padding ajustado
      Media queries: @media (max-width: 768px) { ... }
      Arquivos: dapp/src/app/passport/generate/page.tsx (styles)
      Verificar: DevTools 640px — layout adapta.

- [ ] **3.8 Atualizar Sidebar.tsx com novo link**
      Em navSections, seção "RASTREIO", adicionar item:
      ```
      { href: '/passport/generate', label: 'Gerar QR Passport', icon: '🔗' }
      ```
      Adicionar condicional: renderizar apenas se `useAccount().isConnected === true`.
      Opção: mostrar item desabilitado (opacity 0.5) com tooltip "Conecte MetaMask" se desautenticado.
      Arquivos: dapp/src/components/layout/Sidebar.tsx
      Verificar: Item visível quando autenticado, oculto/desabilitado quando não; navegação funciona.

- [ ] **3.9 Verificação final de FEAT-003**
      - npm run build sem erros
      - Sem MetaMask: /passport/generate mostra prompt
      - Com MetaMask: página carrega, seletor funciona
      - QR renderiza, botões funcionam
      - Sidebar item presente e condicional
      Arquivos: dapp/src/app/passport/generate/page.tsx, dapp/src/components/layout/Sidebar.tsx
      Verificar: npm run build; testes manuais conforme acima.

---

## Resumo de Arquivos Criados/Modificados

### Criados
- `dapp/src/types/agrochain.ts` (expandido): PassportData, PassportAccess
- `dapp/src/components/QRCodeDisplay.tsx` (novo)
- `dapp/src/lib/passport.ts` (novo)
- `dapp/src/app/passport/[lotId]/page.tsx` (novo)
- `dapp/src/app/passport/[lotId]/layout.tsx` (novo, opcional)
- `dapp/src/app/passport/generate/page.tsx` (novo)

### Modificados
- `dapp/package.json` (adicionar qrcode.react)
- `dapp/src/components/layout/Sidebar.tsx` (adicionar link + condicional)

---

## Comandos de Verificação

```bash
# Build final
npm run build

# Lint
npm run lint

# Dev server (testar /passport/[lotId] e /passport/generate)
npm run dev

# Checklist de tipos
grep 'PassportData' dapp/src/types/agrochain.ts
grep 'export.*QRCodeDisplay' dapp/src/components/QRCodeDisplay.tsx
grep 'export.*buildPassportData' dapp/src/lib/passport.ts
```

---

## Dependências Entre Features

```
FEAT-001 (tipos + componente + utils)
    ↓ (FEAT-002 usa QRCodeDisplay, PassportData, passport.ts)
FEAT-002 (página pública /passport/[lotId])
    
FEAT-001 (idem)
    ↓ (FEAT-003 usa generatePassportQR, verifyLotAuthenticity, etc.)
FEAT-003 (página geradora + sidebar)
```

FEAT-002 e FEAT-003 são **independentes** uma da outra após FEAT-001, mas recomenda-se implementar nesta ordem para reutilizar código.

---

## Notas Finais

- **Design System**: Toda a estilização segue `design.md`; usar DESIGN_TOKENS de `lotConstants.ts` para cores e espaçamento.
- **Mock Data**: Usar MOCK_LOTS existentes em dapp/src/app/lote/[lotId]/page.tsx como referência; pode-se criar novo arquivo `mockPassportData.ts` ou reutilizar.
- **Tipagem**: Código totalmente typed em TypeScript; sem `any`.
- **Acessibilidade**: Contraste >= 4.5:1, `tabindex`, `aria-label` onde necessário, nenhum emoji (glifos de texto OK).
- **Print**: Testada com Ctrl+P no navegador; confirmação visual de que layout quebra corretamente em A4.

