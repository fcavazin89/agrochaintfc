'use client';

const operations = [
  { id: '1', date: '2024-10-09', activity: 'Colheita de Coffee Arabica', location: 'Bloco 1-A', workers: 8, status: 'completed', hours: 6 },
  { id: '2', date: '2024-10-08', activity: 'Aplicação de Fertilizante', location: 'Bloco 2', workers: 4, status: 'completed', hours: 4 },
  { id: '3', date: '2024-10-07', activity: 'Inspeção de Saúde da Plantação', location: 'Bloco 3', workers: 2, status: 'completed', hours: 3 },
  { id: '4', date: '2024-10-06', activity: 'Colheita de Cacao Forastero', location: 'Bloco 4', workers: 10, status: 'in-progress', hours: 8 },
  { id: '5', date: '2024-10-05', activity: 'Limpeza de Canais de Água', location: 'Toda a Fazenda', workers: 6, status: 'pending', hours: 5 },
];

export default function ERPOperacoesPage() {
  return (
    <div style={{maxWidth: '1200px', margin: '0 auto'}}>
      <h1 style={{margin: '0 0 8px', fontFamily: 'Georgia, serif', fontSize: '28px', color: '#1e2a22'}}>
        ⚙️ Operações
      </h1>
      <p style={{margin: '0 0 24px', color: '#495649', fontSize: '14px'}}>Planejamento e execução de atividades agrícolas</p>

      {/* Stats cards */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px'}}>
        <div style={{background: '#fff', border: '1px solid #1f6440', borderRadius: '12px', padding: '20px'}}>
          <p style={{margin: 0, fontSize: '12px', color: '#495649', fontWeight: '600'}}>Atividades Hoje</p>
          <p style={{margin: '8px 0 0', fontFamily: 'Georgia, serif', fontSize: '24px', fontWeight: '700', color: '#1f6440'}}>3</p>
        </div>
        <div style={{background: '#fff', border: '1px solid #b8912a', borderRadius: '12px', padding: '20px'}}>
          <p style={{margin: 0, fontSize: '12px', color: '#495649', fontWeight: '600'}}>Trabalhadores em Campo</p>
          <p style={{margin: '8px 0 0', fontFamily: 'Georgia, serif', fontSize: '24px', fontWeight: '700', color: '#b8912a'}}>18</p>
        </div>
        <div style={{background: '#fff', border: '1px solid #2f8f52', borderRadius: '12px', padding: '20px'}}>
          <p style={{margin: 0, fontSize: '12px', color: '#495649', fontWeight: '600'}}>Horas Acumuladas</p>
          <p style={{margin: '8px 0 0', fontFamily: 'Georgia, serif', fontSize: '24px', fontWeight: '700', color: '#2f8f52'}}>52h</p>
        </div>
        <div style={{background: '#fff', border: '1px solid #195236', borderRadius: '12px', padding: '20px'}}>
          <p style={{margin: 0, fontSize: '12px', color: '#495649', fontWeight: '600'}}>Eficiência</p>
          <p style={{margin: '8px 0 0', fontFamily: 'Georgia, serif', fontSize: '24px', fontWeight: '700', color: '#195236'}}>87%</p>
        </div>
      </div>

      {/* Operations table */}
      <div style={{background: '#fff', borderRadius: '12px', border: '1px solid #ddd8cc', overflow: 'hidden'}}>
        <div style={{padding: '16px', borderBottom: '1px solid #ddd8cc'}}>
          <h3 style={{margin: 0, fontSize: '16px', fontFamily: 'Georgia, serif', color: '#1e2a22'}}>Registro de Operações</h3>
        </div>
        <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '14px'}}>
          <thead>
            <tr style={{background: '#f5f1e7'}}>
              <th style={{padding: '12px 16px', textAlign: 'left', color: '#495649', fontWeight: '600'}}>Data</th>
              <th style={{padding: '12px 16px', textAlign: 'left', color: '#495649', fontWeight: '600'}}>Atividade</th>
              <th style={{padding: '12px 16px', textAlign: 'left', color: '#495649', fontWeight: '600'}}>Local</th>
              <th style={{padding: '12px 16px', textAlign: 'center', color: '#495649', fontWeight: '600'}}>Trabalhadores</th>
              <th style={{padding: '12px 16px', textAlign: 'center', color: '#495649', fontWeight: '600'}}>Horas</th>
              <th style={{padding: '12px 16px', textAlign: 'left', color: '#495649', fontWeight: '600'}}>Status</th>
            </tr>
          </thead>
          <tbody>
            {operations.map((op, i) => {
              const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
                completed: { bg: '#f0faf4', text: '#1f6440', label: '✅ Completo' },
                'in-progress': { bg: '#fff8e1', text: '#b8912a', label: '⚡ Em Andamento' },
                pending: { bg: '#f9f7f2', text: '#495649', label: '⏳ Pendente' },
              };
              const style = statusStyles[op.status];
              return (
                <tr key={op.id} style={{borderTop: i > 0 ? '1px solid #eee8da' : 'none'}}>
                  <td style={{padding: '12px 16px', color: '#495649'}}>{op.date}</td>
                  <td style={{padding: '12px 16px', color: '#1e2a22', fontWeight: '500'}}>{op.activity}</td>
                  <td style={{padding: '12px 16px', color: '#495649'}}>{op.location}</td>
                  <td style={{padding: '12px 16px', textAlign: 'center', color: '#1e2a22', fontWeight: '600'}}>{op.workers}</td>
                  <td style={{padding: '12px 16px', textAlign: 'center', color: '#495649'}}>{op.hours}h</td>
                  <td style={{padding: '12px 16px'}}>
                    <span style={{background: style.bg, color: style.text, padding: '4px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '600'}}>
                      {style.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{marginTop: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px'}}>
        <div style={{background: '#f0faf4', border: '1px solid #1f6440', borderRadius: '12px', padding: '16px'}}>
          <h4 style={{margin: '0 0 8px', fontWeight: '600', color: '#1f6440'}}>✅ Próxima Tarefa</h4>
          <p style={{margin: 0, fontSize: '13px', color: '#495649'}}>
            Colheita de Cacao em Bloco 4 (amanhã, 10h) - 10 trabalhadores
          </p>
        </div>
        <div style={{background: '#fff8e1', border: '1px solid #b8912a', borderRadius: '12px', padding: '16px'}}>
          <h4 style={{margin: '0 0 8px', fontWeight: '600', color: '#b8912a'}}>⚠️ Aviso</h4>
          <p style={{margin: 0, fontSize: '13px', color: '#495649'}}>
            Previsão de chuva amanhã. Proteja as áreas de armazenamento.
          </p>
        </div>
      </div>
    </div>
  );
}
