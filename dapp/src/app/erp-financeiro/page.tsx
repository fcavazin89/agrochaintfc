'use client';
import { useState } from 'react';

const mockTransactions = [
  { id: '1', date: '2024-10-09', desc: 'Venda de Coffee Arabica', amount: '+R$ 12.500', type: 'income' },
  { id: '2', date: '2024-10-08', desc: 'Custo de fertilizante', amount: '-R$ 2.300', type: 'expense' },
  { id: '3', date: '2024-10-07', desc: 'Transporte de Cacao', amount: '-R$ 1.850', type: 'expense' },
  { id: '4', date: '2024-10-06', desc: 'Venda de Cacao', amount: '+R$ 8.900', type: 'income' },
  { id: '5', date: '2024-10-05', desc: 'Certificação ZK', amount: '-R$ 450', type: 'expense' },
];

export default function ERPFinanceiroPage() {
  const [period, setPeriod] = useState('2024-10');

  return (
    <div style={{maxWidth: '1000px', margin: '0 auto'}}>
      <h1 style={{margin: '0 0 8px', fontFamily: 'Georgia, serif', fontSize: '28px', color: '#1e2a22'}}>
        💰 Financeiro
      </h1>
      <p style={{margin: '0 0 24px', color: '#495649', fontSize: '14px'}}>Gestão financeira da fazenda</p>

      {/* KPIs */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px'}}>
        <div style={{background: '#fff', border: '1px solid #1f6440', borderRadius: '12px', padding: '20px'}}>
          <p style={{margin: 0, fontSize: '12px', color: '#495649', fontWeight: '600'}}>Receita Total</p>
          <p style={{margin: '8px 0 0', fontFamily: 'Georgia, serif', fontSize: '26px', fontWeight: '700', color: '#1f6440'}}>R$ 450.000</p>
          <p style={{margin: '4px 0 0', fontSize: '12px', color: '#2f8f52'}}>+12% mês anterior</p>
        </div>
        <div style={{background: '#fff', border: '1px solid #b8912a', borderRadius: '12px', padding: '20px'}}>
          <p style={{margin: 0, fontSize: '12px', color: '#495649', fontWeight: '600'}}>Despesas Totais</p>
          <p style={{margin: '8px 0 0', fontFamily: 'Georgia, serif', fontSize: '26px', fontWeight: '700', color: '#b8912a'}}>R$ 280.000</p>
          <p style={{margin: '4px 0 0', fontSize: '12px', color: '#495649'}}>Operacional + Certificação</p>
        </div>
        <div style={{background: '#fff', border: '1px solid #2f8f52', borderRadius: '12px', padding: '20px'}}>
          <p style={{margin: 0, fontSize: '12px', color: '#495649', fontWeight: '600'}}>Lucro Líquido</p>
          <p style={{margin: '8px 0 0', fontFamily: 'Georgia, serif', fontSize: '26px', fontWeight: '700', color: '#2f8f52'}}>R$ 170.000</p>
          <p style={{margin: '4px 0 0', fontSize: '12px', color: '#2f8f52'}}>+8% mês anterior</p>
        </div>
      </div>

      {/* Period selector */}
      <div style={{background: '#fff', borderRadius: '12px', padding: '16px', marginBottom: '20px', border: '1px solid #ddd8cc'}}>
        <label style={{fontSize: '13px', fontWeight: '600', color: '#495649'}}>Período</label>
        <input
          type="month"
          value={period}
          onChange={e => setPeriod(e.target.value)}
          style={{marginLeft: '12px', padding: '6px 12px', borderRadius: '6px', border: '1px solid #ddd8cc'}}
        />
      </div>

      {/* Transactions table */}
      <div style={{background: '#fff', borderRadius: '12px', border: '1px solid #ddd8cc', overflow: 'hidden'}}>
        <div style={{padding: '16px', borderBottom: '1px solid #ddd8cc'}}>
          <h3 style={{margin: 0, fontSize: '16px', fontFamily: 'Georgia, serif', color: '#1e2a22'}}>Transações do período</h3>
        </div>
        <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '14px'}}>
          <thead>
            <tr style={{background: '#f5f1e7'}}>
              <th style={{padding: '12px 16px', textAlign: 'left', color: '#495649', fontWeight: '600'}}>Data</th>
              <th style={{padding: '12px 16px', textAlign: 'left', color: '#495649', fontWeight: '600'}}>Descrição</th>
              <th style={{padding: '12px 16px', textAlign: 'right', color: '#495649', fontWeight: '600'}}>Valor</th>
            </tr>
          </thead>
          <tbody>
            {mockTransactions.map((tx, i) => (
              <tr key={tx.id} style={{borderTop: i > 0 ? '1px solid #eee8da' : 'none'}}>
                <td style={{padding: '12px 16px', color: '#495649'}}>{tx.date}</td>
                <td style={{padding: '12px 16px', color: '#1e2a22'}}>{tx.desc}</td>
                <td style={{padding: '12px 16px', textAlign: 'right', fontWeight: '700', color: tx.type === 'income' ? '#2f8f52' : '#a83226'}}>{tx.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
