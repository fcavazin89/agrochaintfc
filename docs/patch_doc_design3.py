# -*- coding: utf-8 -*-
"""
patch_doc_design3 — alinha o documento técnico à versão 3.0 do produto:
tamanho do artefato (625 KB / 14 módulos), nova subseção 9.8 sobre a
interface (sistema de design próprio: plano claro editorial + escopo escuro
de campo, ícones SVG, serifa institucional) e a lista de arquivos entregues.
"""
import io, sys

RAIZ = '/home/user/'
falhas = []


def ler(p): return io.open(RAIZ + p, encoding='utf-8').read()


def gravar(p, s): io.open(RAIZ + p, 'w', encoding='utf-8').write(s)


def sub(p, antigo, novo, n=1, etq=None):
    s = ler(p)
    c = s.count(antigo)
    if c != n:
        falhas.append('%s [%s]: esperava %d, achei %d' % (p, etq or antigo[:50], n, c))
        return
    gravar(p, s.replace(antigo, novo, n))
    print('  ok %s [%s]' % (p, etq or antigo[:40]))


DOC = 'docs/AgroChain-Documento-Tecnico.html'

# ------------------------------------------------------------------ tamanhos
sub(DOC, 'arquivo único de 615 KB', 'arquivo único de 625 KB', 1, 'tamanho no resumo')
sub(DOC, 'em arquivo único (615 KB)', 'em arquivo único (625 KB)', 1, 'tamanho na lista de arquivos')

# --------------------------------------------------- nova subseção 9.8
ANCORA = '<h3>9.6 Fechamento ancorado: a contabilidade assinada por bloco</h3>'
NOVA = '''<h3>9.8 A interface: sistema de design próprio, escrito antes do código</h3>
<p>Antes de desenhar a primeira tela desta versão, o sistema de design foi
especificado por escrito em <span class="mono">design.md</span> — paleta, tipografia,
espaçamento, componentes, movimento, acessibilidade e as regras de uso de cor,
gráfico e ícone. O protótipo não tem biblioteca de componentes nem tema de
terceiros: o documento é o contrato, e a folha de estilo única do arquivo
<span class="mono">template.html</span> implementa exatamente o que ele descreve. Toda
tela nova entra primeiro no documento (anatomia, estados, quando usar) e só depois
no CSS.</p>
<p>A decisão central é de <b>plano</b>: o sistema tem dois, e cada um é declarado
redefinindo os mesmos nomes de token — nenhum componente sabe em qual está.</p>
<ul>
  <li><b>Plano claro, editorial</b> (painéis, ERP, gráficos, tabelas): papel kraft
  <span class="mono">#f5f1e7</span>, cartões <span class="mono">#fffdf8</span>, tinta
  <span class="mono">#1e2a22</span>, verde-floresta <span class="mono">#1f6440</span> para
  ação e ouro <span class="mono">#b8912a</span> para atenção. É o plano de quem passa o
  dia lendo DRE, ficha de talhão e lista de contas.</li>
  <li><b>Escopo escuro de campo e vitrine</b> (topo do app, mapa de sensores,
  terminal da cadeia, avisos e o modo imersivo): verde profundo
  <span class="mono">#0b1d12</span> sobre <span class="mono">#102519</span>. É onde o
  app é exibido — monitor na parede do galpão, tela de classificação, uso noturno no
  campo — e onde o brilho alto cansa menos.</li>
</ul>
<p>Duas consequências práticas que o protótipo testa de verdade: as cores
semânticas são recalibradas por plano (o vermelho <span class="mono">#a83226</span>
não se lê sobre verde-escuro; ali vira <span class="mono">#ff9c8c</span>, com o mesmo
significado), e os gráficos não têm cor de grade nem de rótulo fixa — a grade sai de
<span class="mono">var(--grade)</span> e o texto de <span class="mono">var(--texto-1)</span>,
de modo que o mesmo gráfico desenhado no painel claro continua legível dentro do modo
imersivo escuro, sem segunda implementação.</p>
<p>A identificação visual também ganhou uma camada própria: <b>ícones SVG desenhados à
mão</b> (traço único de 1,7 px, 24×24, herdando a cor do texto) substituíram os emoji
do protótipo anterior. Emoji em sistema de gestão é ruído, e em ambiente Linux sem
fonte de emoji vira quadradinho ilegível — defeito reproduzido em captura de tela antes
da correção. O que permanece são glifos de texto que existem em qualquer sistema
(<span class="mono">→ ✓ ✗ ⚠</span>). A biblioteca é curta de propósito e obedece a uma
regra explícita: <b>ícone ajuda a achar, não ajuda a ler</b> — ícone em navegação,
identidade, dispositivo de campo e ação; título de cartão não leva ícone. As capturas
de referência das dezesseis telas ficam em
<span class="mono">prototipo-agrochain/design/</span>.</p>

'''
sub(DOC, ANCORA, NOVA + ANCORA, 1, 'subsecao 9.8')

# --------------------------------------- §9.4: lembra o sistema de design
sub(DOC,
    'A biblioteca cobre nove tipos, com tooltip por elemento, paleta fixa definida no sistema de design e animação respeitando a preferência do sistema por menos movimento:',
    'A biblioteca cobre nove tipos, com tooltip por elemento, paleta definida no sistema de design — em tokens, para o mesmo gráfico funcionar no plano claro e no escopo escuro, como descreve a §9.8 — e animação respeitando a preferência do sistema por menos movimento:',
    1, 'remissao em 9.4')

# ------------------------------------------------- lista de arquivos (12.1)
LINHA = '<tr><td class="mono">prototipo-agrochain/AgroChain.html</td><td>Aplicação completa em arquivo único (625 KB), sem dependência externa. <b>É o protótipo.</b></td></tr>'
NOVAS = LINHA + '''
    <tr><td class="mono">design.md</td><td>Sistema de design v3.0 — a fonte da verdade do layout: tokens de cor por plano, tipografia, componentes, regras de gráfico, ícone, movimento e acessibilidade</td></tr>
    <tr><td class="mono">prototipo-agrochain/design/</td><td>Dezesseis capturas de referência das telas (painel, ERP nas seis abas, IoT, blockchain, mercado, imersivo) e o script <span class="mono">capturar.js</span> que as gera</td></tr>
    <tr><td class="mono">prototipo-agrochain/src/12_icones.js</td><td>Conjunto de ícones SVG do produto (traço único, herdam a cor do texto) — nenhuma fonte de ícone, nenhum emoji</td></tr>'''
sub(DOC, LINHA, NOVAS, 1, 'linhas de arquivos entregues')

print()
if falhas:
    print('FALHAS:')
    for f in falhas: print('  ✗', f)
    sys.exit(1)
print('patch_doc_design3 aplicado')
