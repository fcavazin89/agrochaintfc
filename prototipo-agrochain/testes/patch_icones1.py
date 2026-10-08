# -*- coding: utf-8 -*-
"""
patch_icones1 — troca os emoji do protótipo por ícones SVG próprios
(12_icones.js) e remove os que só decoravam título.

Por que: emoji colorido não tem lugar num sistema de gestão, e em ambiente
Linux sem fonte de emoji vira "quadradinho" ilegível (verificado em captura):
o menu, os títulos e as mensagens do ERP apareciam com caixas no lugar dos
símbolos. O que sobrevive são setas e sinais (→ ✓ ✗ ✔ ↔ ⚠), que renderizam
como glifos de texto em qualquer sistema.
"""
import io, re, sys

RAIZ = '/home/user/prototipo-agrochain/'
falhas = []


def ler(p):
    return io.open(RAIZ + p, encoding='utf-8').read()


def gravar(p, s):
    io.open(RAIZ + p, 'w', encoding='utf-8').write(s)


def sub(p, antigo, novo, n=1, etq=None):
    s = ler(p)
    c = s.count(antigo)
    if c != n:
        falhas.append('%s [%s]: esperava %d ocorrencia(s), achei %d' % (p, etq or antigo[:46], n, c))
        return
    gravar(p, s.replace(antigo, novo, n))
    print('  ok %s [%s]' % (p, (etq or antigo[:40]).replace('\n', ' ')))


def sub_todos(p, antigo, novo, etq=None, minimo=1):
    """Troca todas as ocorrências — usado em textos repetidos (mensagens de aviso)."""
    s = ler(p)
    c = s.count(antigo)
    if c < minimo:
        falhas.append('%s [todas %s]: esperava ao menos %d, achei %d' % (p, etq or antigo[:40], minimo, c))
        return
    gravar(p, s.replace(antigo, novo))
    print('  ok %s [todas %s] %d×' % (p, (etq or antigo[:34]).replace('\n', ' '), c))


def subre(p, padrao, novo, n=1, etq=None, flags=0):
    s = ler(p)
    achados = re.findall(padrao, s, flags)
    if len(achados) != n:
        falhas.append('%s [regex %s]: esperava %d, achei %d' % (p, etq or padrao[:40], n, len(achados)))
        return
    gravar(p, re.sub(padrao, novo, s, count=n, flags=flags))
    print('  ok %s [regex %s]' % (p, etq or padrao[:38]))


# =====================================================================
# 1. TEMPLATE — folha de estilo ganha as regras dos ícones e dos faróis
# =====================================================================
CSS_ICONES = """.item .ic{width:18px;text-align:center;font-size:14px;display:inline-flex;align-items:center;justify-content:center;color:var(--texto-3)}
.item:hover .ic{color:var(--verde-500)}
.item.on .ic{color:var(--verde-600)}
/* ---- ícones desenhados (12_icones.js) ---- */
.ico-svg{display:inline-block;vertical-align:-3px;flex:none}
h2 .ico-svg,h3 .ico-svg{color:var(--verde-600)}
.marca .logo .ico-svg{color:var(--ouro-claro)}
button .ico-svg{vertical-align:-2px;margin-right:1px}
/* farol de severidade nas listas de alerta */
.sev{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:7px;vertical-align:1px;background:var(--texto-3)}
.sev.critico{background:var(--critico)}
.sev.atencao{background:var(--atencao)}
.sev.info{background:var(--texto-3)}"""

sub('template.html', '.item .ic{width:18px;text-align:center;font-size:14px}', CSS_ICONES, 1, 'CSS icones')

# =====================================================================
# 2. ICONES — dois glifos novos que o app pede (estrela, escudo, expandir)
# =====================================================================
sub('src/12_icones.js',
    "    alerta: '<path d=\"M12 4 21 19.6H3L12 4Z\"/><path d=\"M12 10v4.2M12 16.6v.2\"/>'",
    "    alerta: '<path d=\"M12 4 21 19.6H3L12 4Z\"/><path d=\"M12 10v4.2M12 16.6v.2\"/>',\n"
    "    estrela: '<path d=\"m12 3.6 2.6 5.4 5.9.8-4.3 4.1 1.2 5.9L12 16.8l-5.4 3 1.2-5.9L3.5 9.8l5.9-.8L12 3.6Z\"/>',\n"
    "    escudo: '<path d=\"M12 3.2 20 6v6.2c0 4.5-3.2 7.4-8 8.6-4.8-1.2-8-4.1-8-8.6V6l8-2.8Z\"/><path d=\"m9 12 2.2 2.2 4-4.3\"/>',\n"
    "    expandir: '<path d=\"M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5\"/>'",
    1, 'glifos estrela/escudo/expandir')

# =====================================================================
# 3. APLICAÇÃO — menu, perfil, marca e botão de imersivo
# =====================================================================
P = 'src/60_app.js'
subre(P, r"function icone\(p\) \{ return \{[^}]*\}\[p\] \|\| '[^']*'; \}",
      "function icone(p) { return Ico.svg(Ico.existe(p) ? p : 'produtor', 'sm'); }", 1, 'icone(papel)')

for emoji, nome in [('📊', 'painel'), ('🌿', 'lavoura'), ('📦', 'lotes'), ('🧾', 'erp'), ('🤖', 'ia'),
                    ('📡', 'iot'), ('⛓️', 'cadeia'), ('💼', 'mercado'), ('🔖', 'selo'), ('🔍', 'auditoria'),
                    ('💬', 'assistente'), ('ℹ️', 'sobre')]:
    sub(P, "ic: '%s'" % emoji, "ic: '%s'" % nome, 1, 'menu ' + nome)

sub(P, "'<span class=\"ic\">' + it.ic + '</span>'",
    "'<span class=\"ic\">' + (Ico.svg(it.ic, 'md') || it.ic) + '</span>'", 1, 'render menu ic')
sub(P, '<div class="logo">🌱</div>', "<div class=\"logo\">' + Ico.svg('semente', 20) + '</div>", 1, 'logo marca')
sub(P, '>⛶ Modo imersivo</button>', ">' + Ico.svg('expandir', 14) + ' Modo imersivo</button>", 1, 'botao imersivo')
sub(P, "Bom dia, ' + esc(u.nome.split(' ')[0]) + ' 👋</h1>", "Bom dia, ' + esc(u.nome.split(' ')[0]) + '</h1>", 1, 'saudacao')

# =====================================================================
# 4. IA / BLOCKCHAIN / MERCADO / CERTIFICACAO — abas, atalhos e botões
# =====================================================================
Q = 'src/70_app2.js'
for emoji, nome in [('🔮 Previsão de safra', 'Previsão de safra'), ('📈 Previsão de preço', 'Previsão de preço'),
                    ('🐛 Pragas e doenças', 'Pragas e doenças'), ('⭐ Qualidade do lote', 'Qualidade do lote'),
                    ('🎯 Decisão de venda', 'Decisão de venda'), ('🧠 Modelos de IA', 'Modelos de IA')]:
    sub(Q, "'%s'" % emoji, "'%s'" % nome, 1, 'aba IA: ' + nome)

sub(Q, "var lista = [['safra', '🔮'], ['preco', '📈'], ['sanidade', '🐛'], ['qualidade', '⭐'], ['anomalia', '🛡️']];",
    "var lista = [['safra', 'lavoura'], ['preco', 'grafico'], ['sanidade', 'alerta'], ['qualidade', 'estrela'], ['anomalia', 'escudo']];",
    1, 'atalhos dos modelos')
sub(Q, "</div><div class=\"flex entre\"><b>' + m[1] + ' ' + esc(mod.nome)",
    "</div><div class=\"flex entre\"><b>' + (Ico.svg(m[1], 'md') || '') + ' ' + esc(mod.nome)", 1, 'render atalho modelo')

sub(Q, "(p === 'cacau' ? '🍫 Cacau' : '☕ Café Conilon')", "(p === 'cacau' ? 'Cacau' : 'Café Conilon')", 1, 'titulo mercado por produto')
sub(Q, "\'>⛏️ Minerar bloco com a fila pendente ('", "'>Minerar bloco com a fila pendente ('", 1, 'botao minerar')
sub(Q, "onclick=\"App2.verificar()\">🔎 Verificar integridade da cadeia</button>",
      "onclick=\"App2.verificar()\">Verificar integridade da cadeia</button>", 1, 'botao verificar')
sub(Q, "onclick=\"App2.adulterar()\">😈 Simular fraude (adulterar um registro)</button>",
      "onclick=\"App2.adulterar()\">Simular fraude (adulterar um registro)</button>", 1, 'botao fraude')
sub(Q, "onclick=\"App.reiniciar()\">↺ Reconstruir cadeia do zero</button>",
      "onclick=\"App.reiniciar()\">Reconstruir cadeia do zero</button>", 1, 'botao reiniciar cadeia')
sub(Q, "onclick=\"App2.verificar()\">🔎 Verificar cadeia agora</button>",
      "onclick=\"App2.verificar()\">Verificar cadeia agora</button>", 1, 'botao verificar auditoria')
sub(Q, "onclick=\"App2.verificarTodosLotes()\">🧾 Conferir selo de todos os lotes</button>",
      "onclick=\"App2.verificarTodosLotes()\">Conferir selo de todos os lotes</button>", 1, 'botao conferir selos')

# =====================================================================
# 5. IoT — ícones de dispositivo, abas, rótulos derivados
# =====================================================================
R = 'src/80_iot_ui.js'
subre(R, r"var ICONE_TIPO = \{(?:[^}]*)\};",
      "var ICONE_TIPO = {\n"
      "    estacao_meteorologica: 'estacao', sonda_solo: 'solo', sensor_fermentacao: 'fermentacao',\n"
      "    sensor_secagem: 'secagem', molhamento_foliar: 'folha', medidor_vazao: 'agua', gateway: 'gateway'\n"
      "  };", 1, 'mapa de icones de dispositivo')

sub(R, "'<td><b>' + s.id + '</b><div class=\"nota\">' + ICONE_TIPO[s.tipo] + ' ' + esc(s.fabricante) + '</div></td>'",
      "'<td><b>' + s.id + '</b><div class=\"nota\">' + (ICONE_TIPO[s.tipo] ? Ico.svg(ICONE_TIPO[s.tipo], 'xs') : '') + ' ' + esc(s.fabricante) + '</div></td>'",
      1, 'icone no inventario')
sub(R, "ICONE_TIPO[s.tipo] + ' ' + s.id + '</button>'",
      "(ICONE_TIPO[s.tipo] ? Ico.svg(ICONE_TIPO[s.tipo], 'sm') : '') + ' ' + s.id + '</button>'", 1, 'icone no seletor')
sub(R, "'<div><b style=\"font-size:16px\">' + ICONE_TIPO[d.tipo] + ' ' + d.id + ' — ' + esc(NOME_TIPO[d.tipo]) + '</b>'",
      "'<div><b style=\"font-size:16px\">' + (ICONE_TIPO[d.tipo] ? Ico.svg(ICONE_TIPO[d.tipo], 'sm') : '') + ' ' + d.id + ' — ' + esc(NOME_TIPO[d.tipo]) + '</b>'",
      1, 'icone no cabecalho da serie')
sub(R, "return '<button class=\"mini sec\" onclick=\"App3.ancorarAgora(\\'' + s.id + '\\')\">⛓️ ' + ICONE_TIPO[s.tipo] + ' ' + s.id",
      "return '<button class=\"mini sec\" onclick=\"App3.ancorarAgora(\\'' + s.id + '\\')\">' + (ICONE_TIPO[s.tipo] ? Ico.svg(ICONE_TIPO[s.tipo], 'sm') : '') + ' ' + s.id",
      1, 'botao ancorar dispositivo')

for emoji, nome in [('📡 Sensores e mapa', 'Sensores e mapa'), ('📈 Leituras', 'Leituras'),
                    ('🌾 Indicadores derivados', 'Indicadores derivados'), ('⛓️ Ancoragem e provas', 'Ancoragem e provas'),
                    ('⚠️ Alertas', 'Alertas')]:
    sub(R, "'%s'" % emoji, "'%s'" % nome, 1, 'aba IoT: ' + nome)

for antigo, novo in [("linhaDer('🌡️ Graus-dia acumulados'", "linhaDer('Graus-dia acumulados'"),
                     ("linhaDer('💧 Balanço hídrico'", "linhaDer('Balanço hídrico'"),
                     ("linhaDer('🪣 Água no solo'", "linhaDer('Água no solo'"),
                     ("linhaDer('🍃 Molhamento foliar'", "linhaDer('Molhamento foliar'"),
                     ("linhaDer('🚰 Cobertura hídrica 7 dias'", "linhaDer('Cobertura hídrica 7 dias'")]:
    subre(R, re.escape(antigo) + r"(?=\s*,)", novo, 2 if antigo.find('Balanço') > 0 else 1, 'rotulo ' + novo.split("'")[1])

sub(R, "? '✅ Prova de inclusão conferida' : '🚨 Prova de inclusão FALHOU'",
      "? '✓ Prova de inclusão conferida' : '✗ Prova de inclusão FALHOU'", 1, 'titulo da prova')
sub(R, "'<div class=\"caixa vermelha\" style=\"margin-top:8px\">⚠️ '", "'<div class=\"caixa vermelha\" style=\"margin-top:8px\">'", 1, 'aviso de adulteracao')
sub(R, "onclick=\"App3.adulterarAgora(\\'' + p.ancoragem + '\\')\">🔧 Simular adulteração da leitura</button>",
      "onclick=\"App3.adulterarAgora(\\'' + p.ancoragem + '\\')\">Simular adulteração da leitura</button>", 1, 'botao adulterar prova')
sub(R, "onclick=\"App3.restaurarLeituras()\">↺ Restaurar leitura original</button>",
      "onclick=\"App3.restaurarLeituras()\">Restaurar leitura original</button>", 1, 'botao restaurar')

# =====================================================================
# 6. ERP — título, escrow e mensagens de operação
# =====================================================================
S = 'src/85_erp_ui.js'
sub(S, "'<h2>🏦 ERP da propriedade '", "'<h2>ERP da propriedade '", 1, 'titulo ERP')
sub(S, "onclick=\"App4.sincronizarEscrow()\">⛓ Sincronizar contratos em escrow",
      "onclick=\"App4.sincronizarEscrow()\">Sincronizar contratos em escrow", 1, 'botao escrow')
sub(S, "? '✅ conferida' : '⚠ divergente'", "? '✓ conferida' : '✗ divergente'", 1, 'prova inclusao ERP')
sub(S, "? '<b>✅ Prova de inclusão conferida</b>", "? '<b>✓ Prova de inclusão conferida</b>", 1, 'prova conferida')
sub(S, ": '<b>⚠ Divergência na prova</b>", ": '<b>✗ Divergência na prova</b>", 1, 'prova divergente')
sub(S, "'>⚠ ' + esc(proj.alerta) + '</div>'", "'>' + esc(proj.alerta) + '</div>'", 1, 'alerta de caixa projetado')
sub_todos(S, "avisar('⚠ ", "avisar('", 'mensagens do ERP', 8)
sub(S, "'⚠ Cadeia recusou: '", "'Cadeia recusou: '", 1, 'cadeia recusou')
sub_todos(S, "'⚠ ' + esc(r.erro)", "'' + esc(r.erro)", 'erro de aplicacao', 2)
sub_todos(S, "'⚠ ' + esc(r.transacao.motivoRejeicao", "'' + esc(r.transacao.motivoRejeicao", 'rejeicao na operacao', 2)
sub(S, "(ev ? '📡 ' + esc(ev.leitura) + '<br>'", "(ev ? esc(ev.leitura) + '<br>'", 1, 'evidencia de sensor')
sub(S, "'⛓ Evento COMPRA_INSUMO '", "'Evento COMPRA_INSUMO '", 1, 'evento compra')
sub(S, "'⛓ Evento APLICACAO_INSUMO '", "'Evento APLICACAO_INSUMO '", 1, 'evento aplicacao')
sub(S, "'⛓ Evento VENDA '", "'Evento VENDA '", 1, 'evento venda')

# =====================================================================
# 7. IMERSIVO — marca e faróis de severidade
# =====================================================================
T = 'src/88_imersivo.js'
sub(T, "'<div class=\"logo\" style=\"width:38px;height:38px;font-size:19px\">🌱</div>'",
      "'<div class=\"logo\" style=\"width:38px;height:38px\">' + Ico.svg('semente', 22) + '</div>'", 1, 'logo imersivo')
sub(T, "return '<span>' + (a.severidade === 'critico' ? '🔴' : a.severidade === 'atencao' ? '🟠' : '⚪') + ' ' + esc(a.area + ': ' + a.titulo) + '</span>';",
      "return '<span>' + '<span class=\"sev ' + (a.severidade === 'critico' ? 'critico' : a.severidade === 'atencao' ? 'atencao' : 'info') + '\"></span>' + esc(a.area + ': ' + a.titulo) + '</span>';",
      1, 'farol de severidade')

# =====================================================================
# 8. VARREDURA FINAL — tira emoji decorativo que sobrou em título e botão
# =====================================================================
EMOJI = (r'[\U0001F000-\U0001FAFF\u2190-\u21FF\u2B00-\u2BFF\u23E9-\u23FA\u2049\u203C'
         r'\u2600-\u26FF\u2700-\u27BF\uFE0F\u200D]')
# o que segue é glifo de texto legítimo (setas, sinais, marcadores) e fica
PERMITIDOS = ('→', '✓', '✗', '✔', '↔', '↓', '↑', '★', '☆', '⚠', '·')


def limpa(arquivo):
    s = ler(arquivo)
    antes = len(re.findall(EMOJI, s))
    # 1) emoji solto no começo do conteúdo de um título/botão/célula
    s = re.sub(r'(>\s*)' + EMOJI + r'+\s*', r'\1', s)
    s = re.sub(r"('\s*)" + EMOJI + r'+\s*', r'\1', s)
    s = re.sub(EMOJI + r'+(?=\s*<)', '', s)
    # 2) seletores de variação que ficaram órfãos
    s = s.replace('\ufe0f', '').replace('\u200d', '')
    gravar(arquivo, s)
    depois = len(re.findall(EMOJI, s))
    print('  ok %s — emoji %d → %d' % (arquivo, antes, depois))
    return s


for arq in ['src/60_app.js', 'src/70_app2.js', 'src/80_iot_ui.js', 'src/85_erp_ui.js', 'src/88_imersivo.js']:
    s = limpa(arq)
    for i, linha in enumerate(s.split('\n'), 1):
        for m in re.finditer(EMOJI, linha):
            ini = max(0, m.start() - 44); fim = min(len(linha), m.end() + 30)
            print('    restou %s:%d  …%s…' % (arq, i, linha[ini:fim].strip()))

print()
if falhas:
    print('FALHAS:')
    for f in falhas:
        print('  ✗', f)
    sys.exit(1)
print('patch_icones1 aplicado')
