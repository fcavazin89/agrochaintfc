'use client';

const inventory = [
  { product: 'Coffee Arabica', quantity: '2.450 kg', unit: 'kg', status: 'optimal', color: '#1f6440' },
  { product: 'Coffee Robusta', quantity: '1.200 kg', unit: 'kg', status: 'low', color: '#b8912a' },
  { product: 'Cacao Forastero', quantity: '850 kg', unit: 'kg', status: 'optimal', color: '#2f8f52' },
  { product: 'Cacao Criollo', quantity: '320 kg', unit: 'kg', status: 'critical', color: '#a83226' },
  { product: 'Fertilizante Orgânico', quantity: '480 kg', unit: 'kg', status: 'optimal', color: '#1f6440' },
  { product: 'Embalagens Sustentáveis', quantity: '5.000 un', unit: 'un', status: 'optimal', color: '#1f6440' },
];

const movements = [
  { id: '1', date: '2024-10-09', product: 'Coffee Arabica', type: 'in', quantity: '500 kg', origin: 'Colheita - Lote 45' },
  { id: '2', date: '2024-10-08', product: 'Coffee Robusta', type: 'out', quantity: '200 kg', origin: 'Venda - Cliente X' },
  { id: '3', date: '2024-10-07', product: 'Cacao Forastero', type: 'in', quantity: '300 kg', origin: 'Colheita - Lote 67' },
  { id: '4', date: '2024-10-06', product: 'Fertilizante Orgânico', type: 'out', quantity: '150 kg', origin: 'Aplicação - Bloco 2' },
];

const getStatusBadge = (status: string) => {
  const badges: Record<string, { bg: string; text: string; label: string }> = {
    optimal: { bg: '#f0faf4', text: '#1f6440', label: '✅ Ótimo' },
    low: { bg: '#fff8e1', text: '#b8912a', label: '⚠️ Baixo' },
    critical: { bg: '#f8d7da', text: '#a83226', label: '❌ Crítico' },
  };
  const badge = badges[status];
  return { bg: badge.bg, text: badge.text, label: badge.label };
};

export default function ERPEstoquePage() {
  return (
    <div style={{maxWidth: '1200px', margin: '0 auto'}}>
      <h1 style={{margin: '0 0 8px', fontFamily: 'Georgia, serif', fontSize: '28px', color: '#1e2a22'}}>
        📦 Estoque
      </h1>
      <p style={{margin: '0 0 24px', color: '#495649', fontSize: '14px'}}>Controle de inventário em tempo real</p>

      {/* Inventory table */}
      <div style={{background: '#fff', borderRadius: '12px', border: '1px solid #ddd8cc', marginBottom: '32px', overflow: 'hidden'}}>
        <div style={{padding: '16px', borderBottom: '1px solid #ddd8cc'}}>
          <h3 style={{margin: 0, fontSize: '16px', fontFamily: 'Georgia, serif', color: '#1e2a22'}}>Produtos em Estoque</h3>
        </div>
        <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '14px'}}>
          <thead>
            <tr style={{background: '#f5f1e7'}}>
              <th style={{padding: '12px 16px', textAlign: 'left', color: '#495649', fontWeight: '600'}}>Produto</th>
              <th style={{padding: '12px 16px', textAlign: 'left', color: '#495649', fontWeight: '600'}}>Quantidade</th>
              <th style={{padding: '12px 16px', textAlign: 'left', color: '#495649', fontWeight: '600'}}>Status</th>
            </tr>
          </thead>
          <tbody>
            {inventory.map((item, i) => {
              const badge = getStatusBadge(item.status);
              return (
                <tr key={i} style={{borderTop: i > 0 ? '1px solid #eee8da' : 'none'}}>
                  <td style={{padding: '12px 16px', color: '#1e2a22', fontWeight: '500'}}>{item.product}</td>
                  <td style={{padding: '12px 16px', color: '#495649'}}>{item.quantity}</td>
                  <td style={{padding: '12px 16px'}}>
                    <span style={{background: badge.bg, color: badge.text, padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: '600'}}>
                      {badge.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Movement history */}
      <div>
        <h3 style={{margin: '0 0 16px', fontFamily: 'Georgia, serif', fontSize: '18px', color: '#1e2a22'}}>Histórico de Movimentos (últimos 7 dias)</h3>
        <div style={{background: '#fff', borderRadius: '12px', border: '1px solid #ddd8cc', overflow: 'hidden'}}>
          <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '14px'}}>
            <thead>
              <tr style={{background: '#f5f1e7'}}>
                <th style={{padding: '12px 16px', textAlign: 'left', color: '#495649', fontWeight: '600'}}>Data</th>
                <th style={{padding: '12px 16px', textAlign: 'left', color: '#495649', fontWeight: '600'}}>Produto</th>
                <th style={{padding: '12px 16px', textAlign: 'left', color: '#495649', fontWeight: '600'}}>Tipo</th>
                <th style={{padding: '12px 16px', textAlign: 'left', color: '#495649', fontWeight: '600'}}>Quantidade</th>
                <th style={{padding: '12px 16px', textAlign: 'left', color: '#495649', fontWeight: '600'}}>Origem/Destino</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((mv, i) => (
                <tr key={mv.id} style={{borderTop: i > 0 ? '1px solid #eee8da' : 'none'}}>
                  <td style={{padding: '12px 16px', color: '#495649'}}>{mv.date}</td>
                  <td style={{padding: '12px 16px', color: '#1e2a22', fontWeight: '500'}}>{mv.product}</td>
                  <td style={{padding: '12px 16px'}}>
                    <span style={{background: mv.type === 'in' ? '#e8f2ea' : '#fff3e0', color: mv.type === 'in' ? '#1f6440' : '#b26a06', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600'}}>
                      {mv.type === 'in' ? '📥 Entrada' : '📤 Saída'}
                    </span>
                  </td>
                  <td style={{padding: '12px 16px', fontWeight: '700', color: mv.type === 'in' ? '#2f8f52' : '#a83226'}}>{mv.quantity}</td>
                  <td style={{padding: '12px 16px', color: '#495649', fontSize: '13px'}}>{mv.origin}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{marginTop: '24px', background: '#f0faf4', border: '1px solid #1f6440', borderRadius: '12px', padding: '16px'}}>
        <h4 style={{margin: '0 0 8px', fontWeight: '600', color: '#1f6440'}}>⚡ Alerta</h4>
        <p style={{margin: 0, fontSize: '13px', color: '#495649'}}>
          Cacao Criollo em estoque crítico. Colheita prevista para próxima semana. Considere fazer pedido de fornecedor.
        </p>
      </div>
    </div>
  );
}
