'use client';

export default function ERPPage() {
  const modules = [
    { id: 'financeiro', title: '💰 Financeiro', icon: '💹', color: '#1f6440', href: '/erp-financeiro', desc: 'Receitas, despesas, fluxo de caixa' },
    { id: 'custos', title: '💸 Custos', icon: '📊', color: '#b8912a', href: '/erp-custos', desc: 'Análise de custos por operação' },
    { id: 'estoque', title: '📦 Estoque', icon: '📈', color: '#2f8f52', href: '/erp-estoque', desc: 'Controle de inventário' },
    { id: 'operacoes', title: '⚙️ Operações', icon: '🔧', color: '#6b4426', href: '/erp-operacoes', desc: 'Atividades e planejamento' },
    { id: 'fechamento', title: '📋 Fechamento', icon: '✅', color: '#195236', href: '/erp-fechamento', desc: 'Encerramento de períodos' },
  ];

  return (
    <div style={{maxWidth: '1200px', margin: '0 auto'}}>
      <h1 style={{margin: '0 0 8px', fontFamily: 'Georgia, serif', fontSize: '28px', color: '#1e2a22'}}>
        📊 ERP Integrado
      </h1>
      <p style={{margin: '0 0 32px', color: '#495649', fontSize: '14px'}}>
        Sistema de Gestão de Recursos da Fazenda — Coffee &amp; Cacao
      </p>

      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px'}}>
        {modules.map(mod => (
          <a
            key={mod.id}
            href={mod.href}
            style={{
              display: 'block',
              textDecoration: 'none',
              background: '#fff',
              border: `2px solid ${mod.color}`,
              borderRadius: '12px',
              padding: '24px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.transform = 'translateY(-4px)';
              el.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.transform = 'translateY(0)';
              el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
            }}
          >
            <div style={{fontSize: '32px', marginBottom: '12px'}}>{mod.icon}</div>
            <h3 style={{margin: '0 0 8px', fontFamily: 'Georgia, serif', fontSize: '16px', color: mod.color}}>
              {mod.title}
            </h3>
            <p style={{margin: 0, fontSize: '13px', color: '#495649'}}>
              {mod.desc}
            </p>
          </a>
        ))}
      </div>

      <div style={{marginTop: '40px', background: '#f0faf4', border: '1px solid #1f6440', borderRadius: '12px', padding: '20px'}}>
        <h3 style={{margin: '0 0 8px', color: '#1f6440'}}>ℹ️ Sobre o ERP</h3>
        <p style={{margin: 0, fontSize: '13px', color: '#495649'}}>
          O sistema ERP integrado permite gerenciar todas as operações da sua fazenda, desde planejamento financeiro até controle de estoque,
          com rastreabilidade completa e conformidade regulatória via blockchain.
        </p>
      </div>
    </div>
  );
}
