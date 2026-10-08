#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Continuação do patch visual v3.0 para os arquivos que faltaram
(80_iot_ui.js, 85_erp_ui.js, 88_imersivo.js) — mesma lógica do v3b,
com a âncora dos rótulos de data corrigida para as duas ocorrências."""
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

IOT = [
    ('" y2="\' + y + \'" stroke="rgba(123,135,145,.18)"/>\';', '" y2="\' + y + \'" class="grade-linha"/>\';', 1),
    ('fill="#7b8791" font-size="9.5" text-anchor="end">', 'style="fill:var(--texto-3)" font-size="9.5" text-anchor="end">', 2),
    ('fill="#7b8791" font-size="9.5">\' + dataHora(serie[0].ts)', 'style="fill:var(--texto-3)" font-size="9.5">\' + dataHora(serie[0].ts)', 1),
    ('fill="#9fb3a9" font-size="9" text-anchor="end">', 'style="fill:var(--texto-3)" font-size="9" text-anchor="end">', 1),
    ('fill="#c0392b" stroke="#1b2126" stroke-width="1.4"', 'fill="#c0392b" style="stroke:var(--sup-1)" stroke-width="1.4"', 1),
    ('fill="#c9a227" stroke="#1b2126" stroke-width="1.2"', 'fill="#c9a227" style="stroke:var(--sup-1)" stroke-width="1.2"', 1),
    ('fill="#e0563f" stroke="#1b2126" stroke-width="1.4"', 'fill="#e0563f" style="stroke:var(--sup-1)" stroke-width="1.4"', 1),
    ("{ cor: '#e0a03a', faixas: [{ de: 40, ate: 48, nome: 'faixa ideal de fermentação (40–48 °C)'",
     "{ cor: '#b26a06', faixas: [{ de: 40, ate: 48, nome: 'faixa ideal de fermentação (40–48 °C)'", 1),
    ("{ cor: '#e0a03a', faixas: [{ de: 40, ate: 48, nome: 'faixa ideal 40–48 °C'",
     "{ cor: '#b26a06', faixas: [{ de: 40, ate: 48, nome: 'faixa ideal 40–48 °C'", 1),
    ('style="background:#7a2e22;border-color:#c0392b"',
     'style="background:var(--veu-critico);border-color:var(--critico);color:var(--critico)"', 1),
    ('<tspan fill="#7b8791">\' + t.area + \' ha</tspan></text>\';', '<tspan fill="#9db2a4">\' + t.area + \' ha</tspan></text>\';', 1),
    ('<tspan fill="#7b8791">\' + esc(NOME_TIPO[s.tipo].split(\' \')[0])', '<tspan fill="#9db2a4">\' + esc(NOME_TIPO[s.tipo].split(\' \')[0])', 1),
]
KPIS = [('#7fe0a4', 'var(--positivo)', 5), ('#ff9c8c', 'var(--negativo)', 4), ('#ffb4a4', 'var(--negativo)', 1)]
IMERSIVO = [('#7fe0a4', 'var(--positivo)', 1), ('#ff9c8c', 'var(--negativo)', 1)]

sub('src/80_iot_ui.js', IOT)
sub('src/85_erp_ui.js', KPIS)
sub('src/88_imersivo.js', IMERSIVO)
print('patch_visual_v3c aplicado')
