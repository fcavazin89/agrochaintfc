'use client';

const costBreakdown = [
  { category: 'Mão de Obra', value: 'R$ 80.000', percent: 32, color: '#1f6440' },
  { category: 'Insumos (Fertilizante, Pesticida)', value: 'R$ 62.000', percent: 25, color: '#2f8f52' },
  { category: 'Logística e Transporte', value: 'R$ 48.000', percent: 19, color: '#6b4426' },
  { category: 'Certificações (ZK, EUDR)', value: 'R$ 35.000', percent: 14, color: '#b8912a' },
  { category: 'Manutenção de Equipamentos', value: 'R$ 20.000', percent: 8, color: '#195236' },
  { category: 'Outros', value: 'R$ 5.000', percent: 2, color: '#888' },
];

export default function ERPCustosPage() {
  return (
    <div style={{maxWidth: '1000px', margin: '0 auto'}}>
      <h1 style={{margin: '0 0 8px', fontFamily: 'Georgia, serif', fontSize: '28px', color: '#1e2a22'}}>
        💸 Custos
      </h1>
      <p style={{margin: '0 0 24px', color: '#495649', fontSize: '14px'}}>Análise de custos operacionais</p>

      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px'}}>
        {/* Breakdown table */}
        <div style={{background: '#fff', borderRadius: '12px', border: '1px solid #ddd8cc', overflow: 'hidden'}}>
          <div style={{padding: '16px', borderBottom: '1px solid #ddd8cc'}}>
            <h3 style={{margin: 0, fontSize: '16px', fontFamily: 'Georgia, serif', color: '#1e2a22'}}>Custos por Categoria</h3>
          </div>
          <div style={{padding: '16px'}}>
            {costBreakdown.map((cost, i) => (
              <div key={i} style={{marginBottom: i < costBreakdown.length - 1 ? '16px' : 0}}>
                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px'}}>
                  <p style={{margin: 0, fontSize: '14px', fontWeight: '600', color: '#1e2a22'}}>{cost.category}</p>
                  <p style={{margin: 0, fontSize: '14px', fontWeight: '700', color: cost.color}}>{cost.value}</p>
                </div>
                <div style={{background: '#e8e0cd', height: '8px', borderRadius: '4px', overflow: 'hidden'}}>
                  <div
                    style={{
                      background: cost.color,
                      height: '100%',
                      width: `${cost.percent}%`,
                      transition: 'width 0.3s'
                    }}
                  />
                </div>
                <p style={{margin: '4px 0 0', fontSize: '12px', color: '#888'}}>{cost.percent}% do total</p>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
          <div style={{background: '#fff', border: '2px solid #b8912a', borderRadius: '12px', padding: '20px'}}>
            <p style={{margin: 0, fontSize: '12px', color: '#495649', fontWeight: '600'}}>Custo Total</p>
            <p style={{margin: '8px 0 0', fontFamily: 'Georgia, serif', fontSize: '28px', fontWeight: '700', color: '#b8912a'}}>R$ 250.000</p>
            <p style={{margin: '4px 0 0', fontSize: '12px', color: '#495649'}}>Período: Out/2024</p>
          </div>
          <div style={{background: '#fff', border: '2px solid #2f8f52', borderRadius: '12px', padding: '20px'}}>
            <p style={{margin: 0, fontSize: '12px', color: '#495649', fontWeight: '600'}}>Custo Médio por kg</p>
            <p style={{margin: '8px 0 0', fontFamily: 'Georgia, serif', fontSize: '28px', fontWeight: '700', color: '#2f8f52'}}>R$ 18,50</p>
            <p style={{margin: '4px 0 0', fontSize: '12px', color: '#495649'}}>Coffee + Cacao</p>
          </div>
          <div style={{background: '#fff', border: '2px solid #1f6440', borderRadius: '12px', padding: '20px'}}>
            <p style={{margin: 0, fontSize: '12px', color: '#495649', fontWeight: '600'}}>Margem de Lucro</p>
            <p style={{margin: '8px 0 0', fontFamily: 'Georgia, serif', fontSize: '28px', fontWeight: '700', color: '#1f6440'}}>42%</p>
            <p style={{margin: '4px 0 0', fontSize: '12px', color: '#2f8f52'}}>↑ 5% vs mês anterior</p>
          </div>
        </div>
      </div>

      <div style={{marginTop: '24px', background: '#f9f7f2', border: '1px solid #ddd8cc', borderRadius: '12px', padding: '16px'}}>
        <h4 style={{margin: '0 0 8px', fontWeight: '600', color: '#1e2a22'}}>💡 Recomendação</h4>
        <p style={{margin: 0, fontSize: '13px', color: '#495649'}}>
          Seu custo com insumos está acima da média. Considere renegociar com fornecedores ou explorar alternativas sustentáveis.
        </p>
      </div>
    </div>
  );
}
