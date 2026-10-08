# AgroChain · Sistema de Design (design.md)

Especificação visual e de interação do protótipo AgroChain. Este documento é a
**fonte da verdade** do layout: a folha de estilo em `prototipo-agrochain/template.html`
implementa os tokens e componentes descritos aqui, e qualquer tela nova deve seguir
estas regras. Nada aqui depende de biblioteca, CDN ou fonte externa — o app roda
offline em arquivo único.

Versão 3.0 · Outubro de 2026 · Substitui a versão 2.0 (escura de ponta a ponta).

O que mudou da 2.0 para a 3.0, e por quê:

1. **A gestão virou clara.** A versão 2.0 era escura em todas as telas, o que
   funciona no galpão à noite mas castiga quem passa o dia inteiro lendo tabela,
   DRE e ficha de talhão no escritório da cooperativa. A 3.0 adota um **plano
   claro, quente, de papel kraft**, que é o registro natural de um sistema
   editorial de gestão.
2. **O campo continua noturno.** Topo, mapa de sensores, terminal da cadeia,
   avisos e **modo imersivo** seguem escuros: são planos de "vitrine" (o monitor
   na parede) e de "campo noturno". O escuro virou **escopo**, não padrão.
3. **Ícones próprios.** Emoji saiu do produto: além de não combinar com sistema
   de gestão, em Linux sem fonte de emoji vira quadradinho ilegível — defeito
   confirmado em captura de tela. Entrou um **conjunto de ícones SVG** de traço
   único, monocromático, herdando a cor do texto (módulo `12_icones.js`).
4. **Tipografia com serifa.** Títulos, marca, números de KPI e o painel imersivo
   passam a usar serifa — o que separa a camada "institucional" da camada "dado".

---

## 1. Princípio de projeto

O AgroChain é usado por quem está **no barro, no armazém e no escritório da
cooperativa** — e por quem audita o dado anos depois. O desenho segue cinco
princípios, em ordem de prioridade quando entram em conflito:

1. **O número manda.** Densidade de dado com hierarquia clara. Cada tela responde
   uma pergunta de decisão antes de oferecer exploração.
2. **Dado sem procedência não é dado.** Todo indicador exibe a fonte, o período e —
   quando é estimativa — a palavra "estimativa". Nunca um número solto.
3. **Verde é ação, ouro é atenção, vermelho é risco.** Cor tem significado fixo;
   nunca é decoração. Nenhuma informação depende **só** de cor.
4. **Cada plano tem a luz do seu uso.** Papel claro para leitura longa e trabalho
   de escritório (painéis, ERP, gráficos, tabelas); escuro para exibição
   (topo, painel imersivo) e para o campo à noite (mapa, terminal, avisos). Área
   de toque generosa, contraste alto, nenhum gradiente sobre texto.
5. **Rápido e previsível.** Transições de 120–420 ms, nenhuma animação que atrase
   leitura de número. Respeita `prefers-reduced-motion`.

---

## 2. Cor

### 2.1 Paleta base — plano claro (padrão)

| Token | Hex | Uso |
|---|---|---|
| `--fundo` | `#f5f1e7` | fundo do app (papel kraft) |
| `--sup-1` | `#fffdf8` | superfície de cartão |
| `--sup-2` | `#f2ecdd` | superfície interna (caixas, linhas alternadas) |
| `--sup-3` | `#e8e0cd` | hover, item de menu ativo, cabeçalho de tabela |
| `--linha` | `#e6ddc9` | hairline padrão |
| `--linha-forte` | `#d6c9b0` | divisor de seção, borda em foco |
| `--texto-1` | `#1e2a22` | corpo e números |
| `--texto-2` | `#495649` | texto secundário |
| `--texto-3` | `#7c867a` | nota, eixo, rótulo (limite de contraste) |
| `--verde-700` | `#195236` | texto de marca, título de KPI |
| `--verde-600` | `#1f6440` | **ação primária** |
| `--verde-500` | `#2f8f52` | acento, séries de café |
| `--verde-300` | `#2c7a4e` | rótulo sobre claro |
| `--verde-100` | `#e8f2ea` | fundo de estado OK |
| `--ouro` | `#b8912a` | atenção, valor, cacau premium |
| `--ouro-claro` | `#8a6712` | ouro legível como texto sobre claro |
| `--cafe-600` | `#6b4426` | série de cacau escura |
| `--cafe-400` | `#b07d4f` | série de cacau |
| `--cafe-300` | `#d8b089` | realce de cacau |
| `--cinza-700` | `#4d5a50` | neutro forte |
| `--cinza-400` | `#8b958b` | neutro médio |
| `--cinza-200` | `#d9d2c1` | neutro claro |

### 2.2 Cores semânticas (significado fixo)

| Papel | Token | Claro | Escuro | Quando |
|---|---|---|---|---|
| Ação / OK | `--acento` | `#1f6440` | `#2f8f52` | operação normal, resultado positivo |
| Positivo (texto) | `--positivo` | `#15653e` | `#7fe0a4` | variação favorável, ganho |
| Atenção | `--atencao` | `#b26a06` | `#e8c95a` | limiar próximo, prazo, bateria baixa |
| Crítico | `--critico` | `#a83226` | `#ff9c8c` | risco, perda, dado inválido |
| Negativo (texto) | `--negativo` | `#a83226` | `#ff9c8c` | variação desfavorável, perda |
| Informação | `--info` | `#1f6f9e` | `#8ec8ee` | contexto, dado medido, referência |
| Especial | `--especial` | `#5f4aa0` | `#b9a8f0` | certificação, IA, prova criptográfica |

Regra de uso: **verde = pode seguir, ouro = olhe, vermelho = aja agora, azul =
saiba disso, roxo = vem de IA ou de criptografia**. Nunca usar vermelho para
"cancelar" uma ação inofensiva, nem verde para indicar dado ausente. Os valores da
coluna "escuro" existem porque sobre fundo verde-escuro o `#a83226` e o `#b26a06`
perdem legibilidade — a semântica é a mesma, o valor é recalibrado por plano.

### 2.3 Véus, traços de gráfico e superfícies no escuro

Véus tingem o fundo sem criar retângulo opaco:

```
--veu-verde    rgba(47,143,82,.10)     claro      .22 no escuro
--veu-ouro     rgba(184,145,42,.14)    claro      .18 no escuro
--veu-critico  rgba(168,50,38,.09)     claro      .22 no escuro
--veu-info     rgba(31,111,158,.10)    claro      .22 no escuro
--veu-especial rgba(95,74,160,.10)     claro      .26 no escuro
```

Traços internos de gráfico — nunca hex solto dentro de componente:

```
--grade   rgba(31,42,34,.13)      claro      rgba(233,243,236,.16) no escuro
--trilho  #e7dfcb                 claro      rgba(233,243,236,.14) no escuro
```

### 2.4 Escopo escuro

O escuro é declarado **uma vez**, redefinindo os mesmos nomes de token — nenhum
componente sabe que mudou de plano:

```css
.topo,.mapa,.terminal,.toasts,.tooltip-graf,.imersivo{
  --fundo:#0b1d12; --sup-1:#102519; --sup-2:#16301f; --sup-3:#1b3a26;
  --linha:rgba(233,243,236,.12); --linha-forte:rgba(233,243,236,.22);
  --texto-1:#f3f7f2; --texto-2:#ccdbd1; --texto-3:#9db2a4;
  --positivo:#7fe0a4; --negativo:#ff9c8c; --ouro-claro:#e8c95a;
  --grade:rgba(233,243,236,.16); --trilho:rgba(233,243,236,.14);
  …
}
```

Consequência prática: **estado com texto branco** (item de menu ativo, aba ativa,
segmento selecionado, chip de filtro) só existe no escuro — no claro o mesmo
estado se marca por fundo `--sup-3` + texto `--verde-700`.

### 2.5 Contraste (acessibilidade)

Mínimos verificados no plano claro: texto principal ≥ 12:1 sobre `--sup-1`;
secundário ≥ 6.5:1; nota (`--texto-3`) ≥ 4.5:1 — é o **limite aceito**, jamais
abaixo. No escopo escuro: principal ≥ 13:1, nota ≥ 5:1. Chips usam fundo
translúcido + texto da mesma família, nunca texto sobre cor saturada.

---

## 3. Tipografia

Sem fonte externa (o app é offline). Três pilhas do sistema:

```
--fonte:  'Segoe UI', system-ui, -apple-system, Roboto, Helvetica, Arial, sans-serif
--serifa: 'Iowan Old Style','Palatino Linotype',Palatino,Georgia,'Times New Roman',serif
--mono:   ui-monospace, SFMono-Regular, Menlo, Consolas, monospace
```

| Token | Tamanho / peso | Uso |
|---|---|---|
| `--t-3xl` | 34 px / 600 serifa | KPI em destaque e painel imersivo |
| `--t-2xl` | 26 px / 600 serifa | número de KPI, título de tela |
| `--t-xl` | 21 px / 600 | título de tela secundário |
| `--t-lg` | 15.5 px / 600 serifa | título de cartão (h2) |
| `--t-md` | 13.5 px / 400 | corpo, célula de tabela |
| `--t-sm` | 12 px / 400 | nota, rótulo de eixo, rodapé de cartão |
| `--t-xs` | 10.5 px / 600 / +0.6 px | rótulo em caixa alta (KPI, cabeçalho) |

Regras:

- **Serifa é institucional; sans é operacional.** Marca, h1, h2, número de KPI e
  painel imersivo em serifa; corpo, tabela, botão e nota em sans. Mono é
  reservado a hash, endereço e código.
- **Números sempre tabulares**: `font-variant-numeric: tabular-nums` em tabela,
  KPI e eixo. Sem isso, a coluna "dança" ao atualizar.
- Caixa alta só em rótulo curto (até 24 caracteres), com `letter-spacing:.6px`.
- Valor monetário e unidade na mesma linha: `R$ 1.568,95` · `saca 60 kg`.
  Nunca abreviar milhar para "1,5k" em contexto contábil.
- Nota e fonte em `--t-sm`/`--texto-3`, sempre abaixo do dado que explicam.

---

## 4. Espaço, forma e profundidade

Escala de espaço (base 4): `4 · 8 · 12 · 16 · 24 · 32`.

| Token | Valor | Uso |
|---|---|---|
| `--e-1 … --e-6` | 4, 8, 12, 16, 24, 32 px | padding e gaps |
| `--raio-xs` | 7 px | chip, tag, campo pequeno |
| `--raio-sm` | 10 px | botão, caixa interna |
| `--raio` | 16 px | cartão |
| `--raio-lg` | 22 px | painel, overlay |
| `--raio-pill` | 999 px | pílula, badge |

Elevação — no claro, profundidade é **sombra difusa curta + hairline**; no escuro,
borda + brilho interno:

```
--sombra   0 1px 2px rgba(31,42,34,.06)
--sombra-2 0 1px 2px rgba(31,42,34,.05), 0 12px 28px -20px rgba(19,66,44,.35)   /* cartão */
--sombra-3 0 26px 64px -26px rgba(13,51,34,.45)                                  /* overlay */
--brilho   inset 0 1px 0 rgba(255,255,255,.5)   /* realce de topo no claro */
```

Grid: conteúdo em `max-width:1320px`, grade fluida `repeat(auto-fit, minmax(...))`
com 14 px de vão. `.g2` ≥ 320 px · `.g3` ≥ 240 px · `.g4` ≥ 184 px por coluna.

---

## 5. Estrutura de tela

```
┌─────────────────────────────────────────────────────────────┐
│ TOPO (escuro)  marca · estado da rede · ações · perfil       │ 56 px, sticky
├──────────┬──────────────────────────────────────────────────┤
│ MENU     │ CONTEÚDO (papel claro)                           │
│ 240 px   │  cabeçalho da tela (título + subtítulo + ações)   │
│ sticky   │  cartões / gráficos / tabelas                     │
│ agrupado │  rodapé com fontes e ressalvas                    │
└──────────┴──────────────────────────────────────────────────┘
```

- **Topo** (escopo escuro): altura 56 px, fundo `linear-gradient(180deg,#10301f,#0b2216)`,
  fio inferior em ouro a 35 %, contém marca (logo com o ícone de semente), pastilha
  de estado da rede (com pulso), botão **Modo imersivo**, reinício demo e seletor
  de perfil. É a "vitrine" permanente do produto — por isso escuro.
- **Menu**: 240 px, agrupado por seção (*Operação · Gestão · Inteligência ·
  Confiança · Apoio*), item com **ícone SVG de 17 px**, rótulo em uma linha
  (`white-space:nowrap`) e badge numérico. Item ativo: fundo `--veu-verde`, borda
  esquerda de 2 px em `--verde-600`, texto `--verde-700`, ícone verde.
- **Cabeçalho da tela** (`.tela`): h1 em serifa + subtítulo de uma linha (`.sub`) +
  linha de ações à direita. É o único lugar onde o título é grande; dentro de
  cartão, h2.
- **Rodapé**: ressalva metodológica, fontes dos dados e data de referência — parte
  do produto, não enfeite.

---

## 6. Componentes

### 6.1 Botão

| Tipo | Fundo | Texto | Quando |
|---|---|---|---|
| primário | gradiente `--verde-600 → --verde-700` | branco | a ação principal da tela, uma só |
| `.sec` | `--sup-1` + `--linha-forte` | `--texto-1` | ação secundária |
| `.azul` `.ouro` `.roxo` `.perigo` | cor de papel (veu + borda) | cor do papel | ação de contexto: info, atenção, IA, risco |
| `.mini` | qualquer dos acima | — | ação dentro de tabela/linha |

Altura 40 px (mini 32 px), raio `--raio-sm`, `transition: var(--t-rapida)`.
Desabilitado: opacidade 0,45 e `cursor:not-allowed` — nunca sumir.

### 6.2 Chip / badge

Chip = rótulo curto de estado, com fundo de véu e texto do mesmo papel semântico.
Badge = contador na barra de menu, fundo `--critico`, texto branco, `--raio-pill`.
Chip `.filtro` é clicável e vira `.on` (fundo cheio do papel, texto claro).

### 6.3 Cartão

`.cartao` — fundo `--sup-1`, raio `--raio`, `--sombra-2`, `--brilho`, padding 16–18 px.
Variantes: `.kpi` (bloco de número), `.destaque` (borda/veu verde, "o que importa
aqui"), `.alerta` (veu crítico). Cartão nunca é clicável inteiro quando contém
botão — o clique fica no botão.

### 6.4 KPI

Rótulo `--t-xs` caixa alta em `--texto-3`; valor `--t-2xl` em serifa, `--verde-700`
opcional; `--t-sm` de contexto abaixo, sempre com fonte e período. Valor `.pequeno`
para KPIs de coluna estreita. Sem ícone decorativo: o rótulo basta.

### 6.5 Tabela

Cabeçalho `--sup-3`, `--t-xs` caixa alta, `--texto-3`. Linha com hairline inferior;
hover `--sup-2`. Célula numérica à direita com `tabular-nums`. Coluna de situação
usa chip, nunca só a cor. Em telas estreitas, a tabela rola dentro do cartão
(`overflow-x:auto`) em vez de quebrar.

### 6.6 Caixa de mensagem

`.caixa` — fundo `--sup-2`, raio `--raio-sm`, `--t-sm`. Variantes `.verde`,
`.ouro`, `.vermelha` mudam veu, borda-esquerda de 3 px e cor do texto. Mensagem
conclusiva de operação começa com ✓ ou ✗ — glifo de texto, **não emoji**.

### 6.7 Abas

`.abas` — linha horizontal com hairline inferior; `.aba` inativa em `--texto-2`,
ativa em `--verde-700` com sublinhado de 2 px. Aba pode carregar contador (`.num`)
e cor de papel. Nunca mais de 6 abas; mais que isso, o conteúdo é longo demais
para uma tela.

### 6.8 Estados vazios e de carregamento

- **Vazio** (`.vazio`): ícone, uma frase explicando por que está vazio, e uma ação
  primária. Nunca "Nenhum dado".
- **Esqueleto** (`.esqueleto`): blocos com brilho deslizante (1,4 s) para conteúdo
  que depende de cálculo.
- **Toast** (`.toast`, escopo escuro): confirmação de ação no canto inferior
  direito, 4 s, empilhável, com título e detalhe curto. Ações que alteram dado
  **sempre** confirmam por toast ou por faixa no topo do conteúdo.

### 6.9 Gráficos (biblioteca `Graf`, SVG próprio)

Regras fixas:

1. **Proporção**: linha/área `660×210`, barras `660×230`, rosca `220×220`,
   medidor `220×120`, heatmap proporcional ao número de células (célula ≥ 26 px).
2. **Eixos**: no máximo 5 linhas de grade horizontais, cor `var(--grade)`, rótulo
   `--t-xs` em `var(--texto-3)`; eixo Y com unidade no topo; eixo X só com começo
   e fim rotulados quando a série for horária. **A grade é desenhada por classe
   (`.grade-linha`), não por hex** — é o que faz o mesmo gráfico funcionar no
   painel claro e no modo imersivo escuro.
3. **Cores de série** (nesta ordem): `#2f8f52` café/ação · `#b07d4f` cacau ·
   `#b8912a` valor/ouro · `#1f6f9e` água/medição · `#5f4aa0` IA/cripto ·
   `#b26a06` atenção · `#a83226` risco · `#8b958b` referência.
4. **Área**: gradiente vertical do próprio tom, de 22 % para 0 %. Nunca preencher
   área em gráfico de comparação.
5. **Faixa de referência**: retângulo translúcido com rótulo no canto superior
   direito (ex.: faixa ideal de fermentação).
6. **Interação**: hover mostra tooltip (`.tooltip-graf`, escopo escuro) fixado ao
   ponto, com série, valor, unidade e horário; o traço ganha 1 px extra. Toque
   funciona igual. O tooltip usa `data-tip` e é posicionado em JS.
7. **Rótulos de valor e texto dentro do SVG** saem de token (`var(--texto-1)`,
   `var(--texto-3)`, `var(--sup-1)`), nunca de hex fixo: mesmo desenho, dois planos.
8. **Animação**: entrada de 420 ms (traço em `stroke-dashoffset`, barras crescendo
   de baixo). Nunca animar em `prefers-reduced-motion`.
9. **Nada de**: 3D, pizza com mais de 5 fatias (usar rosca com legenda ou barras),
   linha dupla com eixos não relacionados sem colorir o eixo correspondente,
   rótulo de valor em toda barra (só no máximo e mínimo, ou no hover).
10. **Gráfico sem dado não aparece**: o cartão vira estado vazio explicando o motivo.

Catálogo implementado: `linha` (1–3 séries, com faixa), `area` (acumulado),
`barras` (simples, agrupadas, empilhadas), `cascata` (waterfall do resultado),
`rosca` (até 5 fatias + legenda), `medidor` (gauge de 0–100%), `heatmap`
(talhão × mês com escala divergente), `sparkline` (linha mínima, sem eixo) e
`anel` (anel de progresso com número central).

### 6.10 Modo imersivo

Sobreposição de tela cheia (escopo escuro: `--verde-950`, `--sombra-3`) que
transforma o app em painel de acompanhamento: KPIs hero em `--t-3xl` serifa,
gráficos grandes, faixa de telemetria com faróis de severidade, relógio da sessão.
Sai com `Esc` ou botão. Feito para monitor na parede do galpão — daí: nenhuma
interação obrigatória, contraste máximo, atualização visível a cada 5 s.
**Permanece escuro na versão 3.0**: é vitrine, e vitrine tem luz própria.

### 6.11 Ícones (módulo `12_icones.js`)

Ícone aqui é **SVG de traço único**, 24×24, `stroke="currentColor"` — herda a cor
do texto e do plano, não tem cor própria, e não depende de fonte nem de rede.

| Onde | Ícone | Tamanho |
|---|---|---|
| Menu lateral | um por tela (painel, lavoura, lotes, ERP, IA, IoT, cadeia, mercado, selo, auditoria, assistente, sobre) | 17 px |
| Perfil | um por papel (produtor, cooperativa, indústria, certificadora, auditor) | 15 px |
| Identidade | semente, na marca e no painel imersivo | 20–22 px |
| Dispositivos de campo | estação, solo, fermentação, secagem, folha, água, gateway | 13–15 px |
| Ação | expandir (modo imersivo) | 14 px |
| Estado | alerta, estrela, escudo (atalhos de IA) | 15 px |

Regras de uso — a biblioteca é curta de propósito:

1. **Ícone ajuda a achar; não ajuda a ler.** Ícone só em navegação, identidade,
   dispositivo de campo e ação. **Título de cartão não leva ícone**: o h2 é texto.
2. Emoji é proibido no produto. O que permanece são **glifos de texto** que existem
   em qualquer sistema: `→ ✓ ✗ ✔ ↔ ⚠ ·` e os sinais matemáticos.
3. Severidade de alerta usa **farol** (`.sev` — bolinha 8 px em `--critico`,
   `--atencao` ou `--texto-3`), nunca emoji de círculo colorido.
4. Ícone sem nome acessível não existe: quando o ícone é a única informação, o
   elemento recebe `title` ou `aria-label`.

---

## 7. Movimento

```
--t-rapida: 120ms   hover, foco, mudança de chip
--t-media:  220ms   abertura de painel, troca de aba
--t-lenta:  420ms   entrada de gráfico, contagem de número
--curva:    cubic-bezier(.2,.7,.3,1)
```

O que anima: opacidade, transform, traço de gráfico. O que **não** anima: layout,
largura de coluna, ordem de tabela. `prefers-reduced-motion: reduce` desliga
tudo, mantendo apenas mudança de estado instantânea.

---

## 8. Acessibilidade

- Foco visível sempre (`--foco`: anel de ouro a 35 %), sem remover contorno de teclado.
- Alvo de toque ≥ 40 px (mini ≥ 32 px em desktop).
- Cor nunca é o único canal: usa seta, texto, ícone ou rótulo junto.
- Contraste mínimo 4.5:1 em texto, 3:1 em elemento gráfico essencial.
- Hierarquia de cabeçalhos: um `h1` por tela, `h2` por cartão.
- Gráficos têm `role="img"` + `aria-label` descrevendo série e período.
- Números em `tabular-nums`; unidade escrita, nunca só o símbolo.
- Texto de estado sempre em PT-BR claro: "operando com restrição", não "WARN".
- Ícones decorativos levam `aria-hidden="true"` (o próprio `Ico.svg` já faz isso).

---

## 9. Voz e conteúdo

- Frase curta, verbo no início: "Ancorar leituras", "Registrar colheita".
- Toda tela de dado declara **fonte e período** ("Cepea/Esalq · 06/10/2026").
- Estimativa é rotulada como estimativa; simulação como simulação.
- Erro diz o que fazer: "Sem sonda de solo neste talhão — instalar sonda para
  medir umidade", não "erro 404".
- Nunca prometer resultado: o sistema informa e recomenda, não garante.

---

## 10. Como aplicar

1. Os tokens estão em `:root` no `<style>` de `template.html`; trocar valor ali
   propaga para todo o app. O escopo escuro redefine os mesmos nomes em
   `.topo,.mapa,.terminal,.toasts,.tooltip-graf,.imersivo` — para escurecer uma
   tela nova, basta acrescentar o seletor a essa lista.
2. Novo componente entra primeiro neste documento (anatomia, estados, quando usar)
   e só depois no CSS.
3. Ícone novo entra em `12_icones.js` (`CAMINHOS`) e é referenciado pelo nome.
   Não inventar emoji, não usar fonte de ícone.
4. Tela nova: usar `.tela` para o cabeçalho, `.cartao` para blocos, `.grade g2/g3/g4`
   para layout, `.nota` para procedência e `.vazio` quando não houver dado.
5. Antes de entregar: conferir contraste, tabular em números, unidade em todo
   valor, fonte declarada em todo indicador, estado vazio em toda lista que possa
   ficar vazia, e **nenhum hex de plano claro dentro de componente**.
6. As capturas de referência das 16 telas ficam em `prototipo-agrochain/design/`
   (`01-painel.png` … `16-detalhe-topo.png`), geradas por
   `prototipo-agrochain/design/capturar.js` — é o retrato do sistema em uso, e o
   modo mais rápido de ver o efeito de um token antes de mexer no CSS.
