#!/usr/bin/env python3
"""
Constrói o arquivo único AgroChain.html embutindo todos os módulos
JavaScript dentro do template. O resultado funciona 100% offline,
sem nenhuma requisição de rede (nem CDN, nem fonte externa).
"""
import os, re, sys

RAIZ = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(RAIZ, 'src')

# ordem de carregamento importa: dados -> gráficos -> IA -> cripto -> QR -> IoT -> ledger -> ERP
# (o IoT depende de Cripto e do Ledger; o ERP depende do Ledger, do IoT e da IA)
MODULOS = ['10_dados.js', '12_icones.js', '15_graficos.js', '20_ia.js', '30_crypto.js', '40_qr.js', '45_iot.js', '50_ledger.js', '55_erp.js']
APP = ['60_app.js', '70_app2.js', '80_iot_ui.js', '85_erp_ui.js', '88_imersivo.js']

def ler(nome):
    with open(os.path.join(SRC, nome), encoding='utf-8') as f:
        return f.read()

def main():
    with open(os.path.join(RAIZ, 'template.html'), encoding='utf-8') as f:
        html = f.read()

    modulos = '\n\n'.join('/* ===== %s ===== */\n%s' % (n, ler(n)) for n in MODULOS)
    app = '\n\n'.join('/* ===== %s ===== */\n%s' % (n, ler(n)) for n in APP)

    html = html.replace('/*{{MODULOS}}*/', modulos)
    html = html.replace('/*{{APP}}*/', app)

    if '{{MODULOS}}' in html or '{{APP}}' in html:
        print('ERRO: sobrou placeholder não substituído', file=sys.stderr)
        return 1

    # o arquivo não pode conter nenhuma referência externa de rede
    proibidos = re.findall(r'(?:src|href)\s*=\s*["\'](https?:)?//[^"\']+', html)
    if proibidos:
        print('AVISO: referências externas encontradas:', proibidos, file=sys.stderr)

    destino = os.path.join(RAIZ, 'AgroChain.html')
    with open(destino, 'w', encoding='utf-8') as f:
        f.write(html)

    kb = len(html.encode('utf-8')) / 1024
    print('Gerado: %s (%.0f KB)' % (destino, kb))
    print('Módulos embutidos: %s' % ', '.join(MODULOS + APP))
    print('Referências de rede externa: %d' % len(proibidos))
    return 0

if __name__ == '__main__':
    sys.exit(main())
