'use client';
import { useState } from 'react';

export default function ERPFechamentoPage() {
  const [selectedMonth, setSelectedMonth] = useState('2024-09');

  const checklist = [
    { id: '1', item: 'Reconciliação de Contas Bancárias', status: 'completed' },
    { id: '2', item: 'Apuração de Estoque', status: 'completed' },
    { id: '3', item: 'Cálculo de Impostos', status: 'in-progress' },
    { id: '4', item: 'Emissão de Relatório Financeiro', status: 'pending' },
    { id: '5', item: 'Certificação de Conformidade', status: 'pending' },
    { id: '6', item: 'Assinatura Digital (NFe)', status: 'pending' },
  ];

  const pAndL = {
    revenue: 450000,
    expenses: 280000,
    gross_profit: 170000,
    expenses_rate: 62.2,
    profit_rate: 37.8,
  };

  return (
    <div style={{maxWidth: '1000px', margin: '0 auto'}}>
      <h1 style={{margin: '0 0 8px', fontFamily: 'Georgia, serif', fontSize: '28px', color: '#1e2a22'}}>
        📋 Fechamento de Período
      </h1>
      <p style={{margin: '0 0 24px', color: '#495649', fontSize: '14px'}}>Encerramento e relatórios periódicos</p>

      {/* Month selector */}
      <div style={{background: '#fff', borderRadius: '12px', padding: '16px', marginBottom: '24px', border: '1px solid #ddd8cc'}}>
        <label style={{fontSize: '13px', fontWeight: '600', color: '#495649'}}>Selecione o mês a fechar</label>
        <input
          type="month"
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
          style={{marginLeft: '12px', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd8cc', cursor: 'pointer'}}
        />
        <p style={{margin: '12px 0 0', fontSize: '12px', color: '#495649'}}>
          Período selecionado: <strong>Setembro / 2024</strong>
        </p>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px'}}>
        {/* DRE - Demonstração de Resultado do Exercício */}
        <div style={{background: '#fff', borderRadius: '12px', border: '1px solid #ddd8cc', overflow: 'hidden'}}>
          <div style={{padding: '16px', borderBottom: '1px solid #ddd8cc', background: '#f5f1e7'}}>
            <h3 style={{margin: 0, fontSize: '16px', fontFamily: 'Georgia, serif', color: '#1e2a22'}}>DRE - Resultado</h3>
          </div>
          <div style={{padding: '20px'}}>
            <div style={{marginBottom: '16px'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '4px'}}>
                <span style={{fontSize: '14px', color: '#495649'}}>Receita Total</span>
                <span style={{fontWeight: '700', color: '#1f6440'}}>R$ {pAndL.revenue.toLocaleString('pt-BR')}</span>
              </div>
            </div>
            <div style={{borderTop: '1px solid #eee8da', paddingTop: '12px', marginBottom: '16px'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '4px'}}>
                <span style={{fontSize: '14px', color: '#495649'}}>Despesas</span>
                <span style={{fontWeight: '700', color: '#a83226'}}>-R$ {pAndL.expenses.toLocaleString('pt-BR')}</span>
              </div>
              <p style={{margin: '4px 0 0', fontSize: '12px', color: '#888'}}>{pAndL.expenses_rate.toFixed(1)}% da receita</p>
            </div>
            <div style={{borderTop: '2px solid #1f6440', paddingTop: '12px'}}>
              <div style={{display: 'flex', justifyContent: 'space-between'}}>
                <span style={{fontSize: '15px', fontWeight: '700', color: '#1f6440'}}>Lucro Líquido</span>
                <span style={{fontFamily: 'Georgia, serif', fontSize: '20px', fontWeight: '700', color: '#2f8f52'}}>R$ {pAndL.gross_profit.toLocaleString('pt-BR')}</span>
              </div>
              <p style={{margin: '4px 0 0', fontSize: '12px', color: '#2f8f52', fontWeight: '600'}}>{pAndL.profit_rate.toFixed(1)}% de margem</p>
            </div>
          </div>
        </div>

        {/* Checklist */}
        <div style={{background: '#fff', borderRadius: '12px', border: '1px solid #ddd8cc', overflow: 'hidden'}}>
          <div style={{padding: '16px', borderBottom: '1px solid #ddd8cc', background: '#f5f1e7'}}>
            <h3 style={{margin: 0, fontSize: '16px', fontFamily: 'Georgia, serif', color: '#1e2a22'}}>Checklist de Fechamento</h3>
          </div>
          <div style={{padding: '16px'}}>
            {checklist.map((item, i) => {
              const statusStyle = {
                completed: { bg: '#f0faf4', text: '#1f6440', icon: '✅' },
                'in-progress': { bg: '#fff8e1', text: '#b8912a', icon: '⚡' },
                pending: { bg: '#f9f7f2', text: '#495649', icon: '⏳' },
              };
              const style = statusStyle[item.status as keyof typeof statusStyle];
              return (
                <div key={item.id} style={{display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: style.bg, marginBottom: i < checklist.length - 1 ? '8px' : 0, borderRadius: '6px'}}>
                  <span style={{fontSize: '16px'}}>{style.icon}</span>
                  <span style={{flex: 1, fontSize: '13px', color: '#1e2a22'}}>{item.item}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{display: 'flex', gap: '12px', marginBottom: '24px'}}>
        <button style={{background: '#1f6440', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px'}}>
          📊 Gerar Relatório Completo
        </button>
        <button style={{background: '#b8912a', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px'}}>
          📥 Exportar em PDF
        </button>
        <button style={{background: '#2f8f52', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px'}}>
          ✅ Finalizar Fechamento
        </button>
      </div>

      {/* Info box */}
      <div style={{background: '#f0faf4', border: '1px solid #1f6440', borderRadius: '12px', padding: '20px'}}>
        <h4 style={{margin: '0 0 8px', color: '#1f6440'}}>ℹ️ Aviso Importante</h4>
        <p style={{margin: 0, fontSize: '13px', color: '#495649', lineHeight: '1.6'}}>
          Após finalizar o fechamento, não será possível alterar os dados do período. Certifique-se de que todas as transações foram registradas corretamente.
          O sistema gerará uma assinatura digital para conformidade com regulamentações fiscais.
        </p>
      </div>
    </div>
  );
}
