#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Ajusta os módulos de interface à linguagem visual v3.0 (base clara).

O que muda e por quê:
 - rótulos e traços de grade que eram cinza-claro (para fundo escuro) passam a
   usar os tokens --texto-3/--texto-1/--grade, que se adaptam ao contexto;
 - o halo dos marcadores de gráfico passa a --sup-1 (era a cor do cartão escuro);
 - séries de gráfico mantêm a paleta (funciona nos dois fundos);
 - o mapa de campo, o terminal e o modo imersivo continuam escuros: seus
   rótulos claros ficam como estão, apenas unificados em #9db2a4 para o tom
   secundário;
 - os KPIs de resultado/margem usam --positivo/--negativo, que mudam de tom
   conforme o fundo.
"""
import io, sys

def sub(caminho, pares):
    s = io.open(caminho, encoding='utf-8').read()
    for i, (a, b, n) in enumerate(pares, 1):
        c = s.count(a)
        if c != n:
            sys.exit('FALHA em %s [%d]: âncora %d vez(es) (esperado %d):\n%s' % (caminho, i, c, n, a[:200]))
        s = s.replace(a, b, n)
        print('  ok %s [%d]' % (caminho, i))
    io.open(caminho, 'w', encoding='utf-8').write(s)
    print('%s -> %d bytes' % (caminho, len(s.encode('utf-8'))))


# ------------------------------------------------------------------ 15_graficos
GRAF = [
    # linha de base das barras já tem a classe; o traço inline a sobrepunha
    ('\'" stroke="rgba(123,135,145,.4)"/>\';',
     '\'"/>\';', 1),
    # conectores da cascata
    ('" y2="\' + yLig.toFixed(1) + \'" stroke="rgba(123,135,145,.45)" stroke-dasharray="3 3"/>\';',
     '" y2="\' + yLig.toFixed(1) + \'" class="grade-linha" stroke-dasharray="3 3"/>\';', 1),
    # texto central da rosca e do medidor
    ('text-anchor="middle" fill="#eef5f0" font-size="17" font-weight="700">',
     'text-anchor="middle" style="fill:var(--texto-1)" font-size="17" font-weight="700">', 1),
    ('text-anchor="middle" fill="#eef5f0" font-size="26" font-weight="700">',
     'text-anchor="middle" style="fill:var(--texto-1)" font-size="26" font-weight="700">', 1),
    ('text-anchor="middle" font-size="9.5" fill="#7b8791">',
     'text-anchor="middle" font-size="9.5" style="fill:var(--texto-3)">', 1),
    ('text-anchor="middle" font-size="10" fill="#7b8791">',
     'text-anchor="middle" font-size="10" style="fill:var(--texto-3)">', 1),
    ('text-anchor="middle" font-size="10.5" fill="#c8d1d8">',
     'text-anchor="middle" font-size="10.5" style="fill:var(--texto-2)">', 1),
    # trilho do medidor e aro interno
    ('stroke="#18281f" stroke-width="18"', 'style="stroke:var(--trilho)" stroke-width="18"', 1),
    ('fill="none" stroke="rgba(123,135,145,.2)" stroke-width="1"/>',
     'fill="none" style="stroke:var(--grade)" stroke-width="1"/>', 1),
    # contorno das células do mapa de calor
    ('stroke="rgba(127,201,155,.12)" data-tip=', 'style="stroke:var(--grade)" data-tip=', 1),
    # escala divergente: um pouco mais de presença sobre fundo claro
    ("return 'rgba(47,143,82,' + (0.18 + 0.62 * t).toFixed(2) + ')';",
     "return 'rgba(47,143,82,' + (0.20 + 0.62 * t).toFixed(2) + ')';", 1),
    ("return 'rgba(192,57,43,' + (0.18 + 0.62 * Math.abs(t)).toFixed(2) + ')';",
     "return 'rgba(168,50,38,' + (0.20 + 0.62 * Math.abs(t)).toFixed(2) + ')';", 1),
]

# ------------------------------------------------------------------ 60_app
APP = [
    # grade do gráfico de linha (cartões claros)
    ('" y2="\' + y + \'" stroke="rgba(123,135,145,.18)" stroke-width="1"/>\';',
     '" y2="\' + y + \'" class="grade-linha" stroke-width="1"/>\';', 1),
    ('" y2="\' + y + \'" stroke="rgba(123,135,145,.15)"/>\';',
     '" y2="\' + y + \'" class="grade-linha"/>\';', 1),
    ('h += \'<line x1="0" y1="40.5" x2="300" y2="40.5" stroke="rgba(123,135,145,.4)"/></svg>\';',
     'h += \'<line x1="0" y1="40.5" x2="300" y2="40.5" class="grade-linha"/></svg>\';', 1),
    # rótulos de eixo
    ('fill="#7b8791" font-size="9.5" text-anchor="end">', 'style="fill:var(--texto-3)" font-size="9.5" text-anchor="end">', 2),
    ('fill="#7b8791" font-size="9.5" text-anchor="middle">', 'style="fill:var(--texto-3)" font-size="9.5" text-anchor="middle">', 1),
    # valor sobre a barra (cartão claro)
    ('fill="#e6f4ec" font-size="10" text-anchor="middle">', 'style="fill:var(--texto-1)" font-size="10" text-anchor="middle">', 1),
    # halo do ponto final da série
    ('r="4.2" fill="\' + (opts.cor || \'#2f8f52\') + \'" stroke="#0b2e1c" stroke-width="2"/>\';',
     'r="4.2" fill="\' + (opts.cor || \'#2f8f52\') + \'" style="stroke:var(--sup-1)" stroke-width="2"/>\';', 1),
    # ouro: a marca "hoje" e a projeção precisam de tom mais escuro sobre papel
    ('fill="#c9a227" font-size="9.5">hoje</text>', 'fill="#8a6712" font-size="9.5">hoje</text>', 1),
    ('fill="none" stroke="#e8c95a" stroke-width="2" stroke-dasharray="6 3"/>',
     'fill="none" stroke="#b8912a" stroke-width="2" stroke-dasharray="6 3"/>', 1),
    # gradiente das barras: mais claro no topo, mais profundo na base
    ('<stop offset="0%" stop-color="#2f8f52"/><stop offset="100%" stop-color="#1d6b3c"/>',
     '<stop offset="0%" stop-color="#3a9d5c"/><stop offset="100%" stop-color="#1f6440"/>', 1),
    # chuva forte
    ("(c.chuvaMm > 10 ? '#4a9fd8' : '#2f8f52')", "(c.chuvaMm > 10 ? '#1f6f9e' : '#2f8f52')", 1),
    # mapa de campo (permanece escuro): rótulo secundário unificado
    ('<tspan fill="#7b8791">\' + t.area + \' ha</tspan></text>\';', '<tspan fill="#9db2a4">\' + t.area + \' ha</tspan></text>\';', 1),
    ('h += \'<text x="12" y="250" fill="#7b8791" font-size="10">', 'h += \'<text x="12" y="250" fill="#9db2a4" font-size="10">', 1),
]

# ------------------------------------------------------------------ 80_iot_ui
IOT = [
    ('" y2="\' + y + \'" stroke="rgba(123,135,145,.18)"/>\';', '" y2="\' + y + \'" class="grade-linha"/>\';', 1),
    ('fill="#7b8791" font-size="9.5" text-anchor="end">', 'style="fill:var(--texto-3)" font-size="9.5" text-anchor="end">', 1),
    ('fill="#9fb3a9" font-size="9" text-anchor="end">', 'style="fill:var(--texto-3)" font-size="9" text-anchor="end">', 1),
    ('fill="#7b8791" font-size="9.5">\' + dataHora(serie[0].ts)', 'style="fill:var(--texto-3)" font-size="9.5">\' + dataHora(serie[0].ts)', 1),
    ('fill="#7b8791" font-size="9.5" text-anchor="end">\' + dataHora(serie[serie.length - 1].ts)',
     'style="fill:var(--texto-3)" font-size="9.5" text-anchor="end">\' + dataHora(serie[serie.length - 1].ts)', 1),
    # halo dos pontos: agora é a cor do cartão claro
    ('fill="#c0392b" stroke="#1b2126" stroke-width="1.4"', 'fill="#c0392b" style="stroke:var(--sup-1)" stroke-width="1.4"', 1),
    ('fill="#c9a227" stroke="#1b2126" stroke-width="1.2"', 'fill="#c9a227" style="stroke:var(--sup-1)" stroke-width="1.2"', 1),
    ('fill="#e0563f" stroke="#1b2126" stroke-width="1.4"', 'fill="#e0563f" style="stroke:var(--sup-1)" stroke-width="1.4"', 1),
    # série de fermentação: âmbar legível sobre papel
    ("{ cor: '#e0a03a', faixas: [{ de: 40, ate: 48, nome: 'faixa ideal de fermentação (40–48 °C)'",
     "{ cor: '#b26a06', faixas: [{ de: 40, ate: 48, nome: 'faixa ideal de fermentação (40–48 °C)'", 1),
    ("{ cor: '#e0a03a', faixas: [{ de: 40, ate: 48, nome: 'faixa ideal 40–48 °C'",
     "{ cor: '#b26a06', faixas: [{ de: 40, ate: 48, nome: 'faixa ideal 40–48 °C'", 1),
    # botão de simular adulteração: era um vermelho escuro de tema noturno
    ('style="background:#7a2e22;border-color:#c0392b"',
     'style="background:var(--veu-critico);border-color:var(--critico);color:var(--critico)"', 1),
    # mapa de dispositivos (permanece escuro)
    ('<tspan fill="#7b8791">\' + t.area + \' ha</tspan></text>\';', '<tspan fill="#9db2a4">\' + t.area + \' ha</tspan></text>\';', 1),
    ('<tspan fill="#7b8791">\' + esc(NOME_TIPO[s.tipo].split(\' \')[0])', '<tspan fill="#9db2a4">\' + esc(NOME_TIPO[s.tipo].split(\' \')[0])', 1),
]

# ------------------------------------------------------------------ ERP e imersivo
KPIS = [
    ('#7fe0a4', 'var(--positivo)', 5),
    ('#ff9c8c', 'var(--negativo)', 4),
    ('#ffb4a4', 'var(--negativo)', 1),
]
IMERSIVO = [
    ('#7fe0a4', 'var(--positivo)', 1),
    ('#ff9c8c', 'var(--negativo)', 1),
]

sub('src/15_graficos.js', GRAF)
sub('src/60_app.js', APP)
sub('src/80_iot_ui.js', IOT)
sub('src/85_erp_ui.js', KPIS)
sub('src/88_imersivo.js', IMERSIVO)
print('patch_visual_v3b aplicado')
