#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
patch_erp7 — reescreve sincronizarEscrow para tratar os dois lados do escrow
de forma independente.

Defeito corrigido: quando o comprador (indústria) abria a tela, o código não
encontrava o seu título a pagar e caía no caminho de criação do RECEBÍVEL do
vendedor — gerando um segundo recebível para o mesmo contrato e deixando a
obrigação do comprador como única saída. Agora cada lado cria e liquida apenas
o seu próprio título.
"""
import io, sys

ARQ = 'src/55_erp.js'
s = io.open(ARQ, encoding='utf-8').read()

ANTIGO_INI = "  function sincronizarEscrow() {"
ANTIGO_FIM = "    return { criados: criados, liquidados: liquidados };\n  }\n"

i = s.index(ANTIGO_INI)
j = s.index(ANTIGO_FIM, i) + len(ANTIGO_FIM)

NOVO = '''  function sincronizarEscrow() {
    var criados = [], liquidados = [];
    var ps = produtoresDe({});
    var hojeISO = HOJE.toISOString().slice(0, 10);
    D.contratos.forEach(function (ct) {
      var vendedor = ct.vendedor;
      var euSouVendedor = ps.indexOf(vendedor) >= 0;
      var euSouComprador = usuarioAtual() === ct.comprador;
      if (!euSouVendedor && !euSouComprador) return;
      var liberacao = ct.etapas.filter(function (e) { return e.nome.indexOf('Liberação') >= 0; })[0];
      var concluida = !!(liberacao && liberacao.status === 'CONCLUIDA');
      var composicao = ct.etapas.map(function (e) { return { nome: e.nome, status: e.status, data: e.data }; });

      /* LADO DE QUEM VENDE — o recebível do contrato, no escopo do vendedor */
      if (euSouVendedor) {
        var rec = erp().titulos.filter(function (t) { return t.contrato === ct.id && t.tipo === 'RECEBER'; })[0];
        if (rec) {
          if (concluida && rec.status !== 'RECEBIDO') {
            rec.status = 'RECEBIDO'; rec.liquidadoEm = hojeISO; liquidados.push(rec);
          }
        } else {
          var recebivel = {
            id: 'TR-E' + (erp().titulos.filter(function (t) { return t.origem === 'ESCROW' && t.tipo === 'RECEBER'; }).length + 1),
            tipo: 'RECEBER', contraparte: nomeOrg(ct.comprador),
            descricao: 'Contrato ' + ct.id + ' em escrow — ' + ct.quantidade + ' ' + ct.unidade + ' de ' + Dados.nomeProduto(ct.produto) + ' (' + ct.lotes.join(', ') + ')',
            valor: ct.valorTotal, emissao: hojeISO, vencimento: addDias(hojeISO, 30),
            status: concluida ? 'RECEBIDO' : 'ABERTO', liquidadoEm: concluida ? hojeISO : undefined,
            produtor: vendedor, origem: 'ESCROW', contrato: ct.id, contrapartePapel: 'cliente',
            documento: ct.id, banco: 'Conta escrow do consórcio', composicao: composicao
          };
          erp().titulos.push(recebivel);
          criados.push(recebivel);
        }
      }

      /* LADO DE QUEM COMPRA — a obrigação de liberar o pagamento, no escopo do comprador */
      if (euSouComprador) {
        var pag = erp().titulos.filter(function (t) { return t.contrato === ct.id && t.tipo === 'PAGAR'; })[0];
        if (pag) {
          if (concluida && pag.status !== 'PAGO') {
            pag.status = 'PAGO'; pag.liquidadoEm = hojeISO; liquidados.push(pag);
          }
        } else {
          var obrigacao = {
            id: 'TP-E' + (erp().titulos.filter(function (t) { return t.origem === 'ESCROW' && t.tipo === 'PAGAR'; }).length + 1),
            tipo: 'PAGAR', contraparte: nomeOrg(ct.vendedor),
            descricao: 'Contrato ' + ct.id + ' em escrow — obrigação de liberar o pagamento de ' + ct.quantidade + ' ' + ct.unidade + ' de ' + Dados.nomeProduto(ct.produto),
            valor: ct.valorTotal, emissao: hojeISO, vencimento: addDias(hojeISO, 15),
            status: concluida ? 'PAGO' : 'ABERTO', liquidadoEm: concluida ? hojeISO : undefined,
            produtor: ct.comprador, origem: 'ESCROW', contrato: ct.id, contrapartePapel: 'fornecedor',
            documento: ct.id, banco: 'Conta escrow do consórcio', composicao: composicao
          };
          erp().titulos.push(obrigacao);
          criados.push(obrigacao);
        }
      }
    });
    if (criados.length || liquidados.length) {
      erp().sincronizadoEscrow = erp().sincronizadoEscrow.concat(criados.map(function (t) { return t.contrato; }));
    }
    return { criados: criados, liquidados: liquidados };
  }
'''

s = s[:i] + NOVO + s[j:]
io.open(ARQ, 'w', encoding='utf-8').write(s)
print('%s -> %d bytes' % (ARQ, len(s.encode('utf-8'))))
print('patch_erp7 aplicado')
