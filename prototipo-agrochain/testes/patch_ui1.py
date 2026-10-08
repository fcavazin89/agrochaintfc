#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
patch_ui1 — liga a interface do ERP (85_erp_ui.js) e o modo imersivo
(88_imersivo.js) ao aplicativo:

1. item de menu "ERP agro" com contador de alertas críticos;
2. rota App.view === 'erp' -> App4.viewErp();
3. botão de modo imersivo no topo;
4. App.irPara('erp', aba) seleciona a aba;
5. reset do ERP e fechamento do imersivo ao reiniciar a demo e ao trocar perfil.
"""
import io, sys

ALVOS = {
    'src/60_app.js': [
        ("      { g: 'Operação', id: 'lotes', ic: '📦', n: 'Colheita e lotes', todos: true },",
         "      { g: 'Operação', id: 'lotes', ic: '📦', n: 'Colheita e lotes', todos: true },\n"
         "      { g: 'Gestão', id: 'erp', ic: '🧾', n: 'ERP agro', todos: true, badge: (global.Erp ? global.Erp.alertas().criticos : null) || null },",),

        ("    else if (App.view === 'lotes') html += viewLotes();",
         "    else if (App.view === 'lotes') html += viewLotes();\n"
         "    else if (App.view === 'erp') html += global.App4.viewErp();",),

        ("    html += '<button class=\"mini sec\" onclick=\"App.reiniciar()\" title=\"Recomeça a demonstração do zero\">↺ Reiniciar demo</button>';",
         "    html += '<button class=\"mini ouro\" onclick=\"Imersivo.abrir()\" title=\"Painel de acompanhamento em tela cheia — Esc para sair\">⛶ Modo imersivo</button>';\n"
         "    html += '<button class=\"mini sec\" onclick=\"App.reiniciar()\" title=\"Recomeça a demonstração do zero\">↺ Reiniciar demo</button>';",),

        ("  App.irPara = function (view, aba) {\n    App.view = view; if (aba) App.abaIA = aba;",
         "  App.irPara = function (view, aba) {\n"
         "    App.view = view;\n"
         "    if (aba && view === 'ia') App.abaIA = aba;\n"
         "    if (aba && view === 'erp' && global.App4) global.App4.aba = aba;\n"
         "    if (global.Imersivo && global.Imersivo.aberto) global.Imersivo.fechar();",),

        ("    if (global.App3) { global.App3.prova = null; global.App3.aviso = null; global.App3.aba = 'mapa'; }",
         "    if (global.App3) { global.App3.prova = null; global.App3.aviso = null; global.App3.aba = 'mapa'; }\n"
         "    if (global.Imersivo) global.Imersivo.fechar();\n"
         "    if (global.Erp) global.Erp.reiniciar();\n"
         "    if (global.App4) { global.App4.aba = 'visao'; global.App4.mes = null; global.App4.talhao = null; global.App4.preparo = null; global.App4.ancoragem = null; global.App4.prova = null; global.App4.aviso = null; }",),

        ("  App.trocarUsuario = function (id) {\n    App.usuario = id;",
         "  App.trocarUsuario = function (id) {\n"
         "    App.usuario = id;\n"
         "    if (global.Imersivo) global.Imersivo.fechar();\n"
         "    if (global.Erp) global.Erp.reiniciar();\n"
         "    if (global.App4) { global.App4.aba = 'visao'; global.App4.mes = null; global.App4.prova = null; global.App4.ancoragem = null; global.App4.preparo = null; global.App4.aviso = null; }",),
    ],
}

def sub(caminho, pares):
    s = io.open(caminho, encoding='utf-8').read()
    for i, (a, b) in enumerate(pares, 1):
        n = s.count(a)
        if n != 1:
            sys.exit('FALHA em %s [%d]: âncora encontrada %d vez(es):\n%s' % (caminho, i, n, a[:160]))
        s = s.replace(a, b, 1)
        print('  ok %s [%d]' % (caminho, i))
    io.open(caminho, 'w', encoding='utf-8').write(s)
    print('%s -> %d bytes' % (caminho, len(s.encode('utf-8'))))

for caminho, pares in ALVOS.items():
    sub(caminho, pares)
print('patch_ui1 aplicado')
