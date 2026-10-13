'use client';
import { useState } from 'react';

const auditLog = [
  { id: '1', timestamp: '2024-10-09 15:32:18', action: 'Certificação Emitida', user: '0x7Ea...4d2B', hash: '0xabc...def', status: 'confirmed' },
  { id: '2', timestamp: '2024-10-09 14:15:42', action: 'Rastreabilidade Registrada', user: '0x3F2...9c1A', hash: '0x123...456', status: 'confirmed' },
  { id: '3', timestamp: '2024-10-09 13:08:55', action: 'ZK Proof Verificado', user: 'Sistema', hash: '0x789...abc', status: 'confirmed' },
  { id: '4', timestamp: '2024-10-09 12:45:20', action: 'Dados IoT Sincronizados', user: '0x4B5...8e7C', hash: '0xdef...123', status: 'confirmed' },
  { id: '5', timestamp: '2024-10-09 11:30:15', action: 'Conformidade Auditada', user: 'Auditor', hash: '0x456...789', status: 'pending' },
];

export default function AuditoriaPage() {
  const [dateFrom, setDateFrom] = useState('2024-10-01');
  const [dateTo, setDateTo] = useState('2024-10-09');

  const downloadCSV = () => {
    const csv = [
      ['Timestamp', 'Ação', 'Usuário', 'Hash TX', 'Status'],
      ...auditLog.map(log => [log.timestamp, log.action, log.user, log.hash, log.status]),
    ]
      .map(row => row.join(','))
      .join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'auditoria.csv';
    a.click();
  };

  return (
    <div style={{maxWidth: '1200px', margin: '0 auto'}}>
      <h1 style={{margin: '0 0 8px', fontFamily: 'Georgia, serif', fontSize: '28px', color: '#1e2a22'}}>
        📊 Auditoria & Compliance
      </h1>
      <p style={{margin: '0 0 24px', color: '#495649', fontSize: '14px'}}>
        Registro imutável de todas as operações na blockchain
      </p>

      {/* Stats cards */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px'}}>
        <div style={{background: '#fff', border: '1px solid #1f6440', borderRadius: '12px', padding: '20px'}}>
          <p style={{margin: 0, fontSize: '12px', color: '#495649', fontWeight: '600'}}>Total de Registros</p>
          <p style={{margin: '8px 0 0', fontFamily: 'Georgia, serif', fontSize: '28px', fontWeight: '700', color: '#1f6440'}}>2.847</p>
        </div>
        <div style={{background: '#fff', border: '1px solid #2f8f52', borderRadius: '12px', padding: '20px'}}>
          <p style={{margin: 0, fontSize: '12px', color: '#495649', fontWeight: '600'}}>Confirmados</p>
          <p style={{margin: '8px 0 0', fontFamily: 'Georgia, serif', fontSize: '28px', fontWeight: '700', color: '#2f8f52'}}>2.832</p>
        </div>
        <div style={{background: '#fff', border: '1px solid #b8912a', borderRadius: '12px', padding: '20px'}}>
          <p style={{margin: 0, fontSize: '12px', color: '#495649', fontWeight: '600'}}>Pendentes</p>
          <p style={{margin: '8px 0 0', fontFamily: 'Georgia, serif', fontSize: '28px', fontWeight: '700', color: '#b8912a'}}>15</p>
        </div>
        <div style={{background: '#fff', border: '1px solid #195236', borderRadius: '12px', padding: '20px'}}>
          <p style={{margin: 0, fontSize: '12px', color: '#495649', fontWeight: '600'}}>Score EUDR</p>
          <p style={{margin: '8px 0 0', fontFamily: 'Georgia, serif', fontSize: '28px', fontWeight: '700', color: '#195236'}}>98.2%</p>
        </div>
      </div>

      {/* Filters */}
      <div style={{background: '#fff', borderRadius: '12px', border: '1px solid #ddd8cc', padding: '20px', marginBottom: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '16px', alignItems: 'end'}}>
        <div>
          <label style={{display: 'block', fontSize: '13px', fontWeight: '600', color: '#495649', marginBottom: '6px'}}>Data Inicial</label>
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            style={{width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #ddd8cc', fontSize: '14px'}}
          />
        </div>
        <div>
          <label style={{display: 'block', fontSize: '13px', fontWeight: '600', color: '#495649', marginBottom: '6px'}}>Data Final</label>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            style={{width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #ddd8cc', fontSize: '14px'}}
          />
        </div>
        <button
          onClick={downloadCSV}
          style={{
            background: '#b8912a',
            color: '#fff',
            border: 'none',
            padding: '10px 24px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '13px',
          }}
        >
          📥 Exportar CSV
        </button>
      </div>

      {/* Audit log table */}
      <div style={{background: '#fff', borderRadius: '12px', border: '1px solid #ddd8cc', overflow: 'hidden', marginBottom: '24px'}}>
        <div style={{padding: '16px', borderBottom: '1px solid #ddd8cc', background: '#f5f1e7'}}>
          <h3 style={{margin: 0, fontSize: '16px', fontFamily: 'Georgia, serif', color: '#1e2a22'}}>Registro de Auditoria</h3>
        </div>
        <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '14px'}}>
          <thead>
            <tr style={{background: '#f5f1e7'}}>
              <th style={{padding: '12px 16px', textAlign: 'left', color: '#495649', fontWeight: '600'}}>Timestamp</th>
              <th style={{padding: '12px 16px', textAlign: 'left', color: '#495649', fontWeight: '600'}}>Ação</th>
              <th style={{padding: '12px 16px', textAlign: 'left', color: '#495649', fontWeight: '600'}}>Usuário</th>
              <th style={{padding: '12px 16px', textAlign: 'left', color: '#495649', fontWeight: '600'}}>Hash TX</th>
              <th style={{padding: '12px 16px', textAlign: 'left', color: '#495649', fontWeight: '600'}}>Status</th>
            </tr>
          </thead>
          <tbody>
            {auditLog.map((log, i) => (
              <tr key={log.id} style={{borderTop: i > 0 ? '1px solid #eee8da' : 'none'}}>
                <td style={{padding: '12px 16px', color: '#495649', fontFamily: 'monospace', fontSize: '12px'}}>{log.timestamp}</td>
                <td style={{padding: '12px 16px', color: '#1e2a22', fontWeight: '500'}}>{log.action}</td>
                <td style={{padding: '12px 16px', color: '#495649', fontFamily: 'monospace', fontSize: '12px'}}>{log.user}</td>
                <td style={{padding: '12px 16px', color: '#1f6440', fontFamily: 'monospace', fontSize: '11px'}}>{log.hash}</td>
                <td style={{padding: '12px 16px'}}>
                  <span style={{
                    background: log.status === 'confirmed' ? '#f0faf4' : '#fff8e1',
                    color: log.status === 'confirmed' ? '#1f6440' : '#b8912a',
                    padding: '4px 12px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}>
                    {log.status === 'confirmed' ? '✅ Confirmado' : '⏳ Pendente'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* EUDR Compliance */}
      <div style={{background: '#f0faf4', border: '1px solid #1f6440', borderRadius: '12px', padding: '20px'}}>
        <h3 style={{margin: '0 0 12px', color: '#1f6440', fontSize: '16px'}}>🌍 Conformidade EUDR</h3>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px'}}>
          <div style={{background: '#fff', padding: '12px', borderRadius: '6px'}}>
            <p style={{margin: 0, fontSize: '12px', color: '#495649'}}>Rastreabilidade</p>
            <p style={{margin: '4px 0 0', fontSize: '16px', fontWeight: '700', color: '#1f6440'}}>100%</p>
          </div>
          <div style={{background: '#fff', padding: '12px', borderRadius: '6px'}}>
            <p style={{margin: 0, fontSize: '12px', color: '#495649'}}>Desmatamento</p>
            <p style={{margin: '4px 0 0', fontSize: '16px', fontWeight: '700', color: '#1f6440'}}>Nenhum</p>
          </div>
          <div style={{background: '#fff', padding: '12px', borderRadius: '6px'}}>
            <p style={{margin: 0, fontSize: '12px', color: '#495649'}}>Documentação</p>
            <p style={{margin: '4px 0 0', fontSize: '16px', fontWeight: '700', color: '#1f6440'}}>Completa</p>
          </div>
        </div>
      </div>
    </div>
  );
}
