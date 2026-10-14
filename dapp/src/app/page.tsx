import Link from 'next/link';

const modules = [
  { href: '/producer', title: 'Painel Produtor', desc: 'Gerencie lotes, safras e certificações', tag: 'Operação' },
  { href: '/lote', title: 'Rastreabilidade', desc: 'Histórico completo de cada lote na cadeia', tag: 'Operação' },
  { href: '/marketplace', title: 'Marketplace', desc: 'Negocie lotes certificados com escrow seguro', tag: 'Mercado' },
  { href: '/buyer', title: 'Painel Comprador', desc: 'Acompanhe pedidos, entregas e avaliações', tag: 'Mercado' },
  { href: '/verification', title: 'Verificação', desc: 'Origem, EUDR e ESG para cada lote', tag: 'Conformidade' },
  { href: '/passport/generate', title: 'Passaporte Digital', desc: 'QR Code público de rastreabilidade', tag: 'Conformidade' },
  { href: '/analytics', title: 'Analytics', desc: 'Métricas agregadas da plataforma', tag: 'Análise' },
  { href: '/credits', title: 'Carbon Credits', desc: 'Créditos de carbono por área certificada', tag: 'ESG' },
];

const kpis = [
  { rotulo: 'Lotes Certificados', valor: '2.157', delta: '+19 esta semana' },
  { rotulo: 'Volume Negociado', valor: 'R$ 1,84M', delta: '+12% vs. mês anterior' },
  { rotulo: 'Produtores Ativos', valor: '348', delta: 'Safra 2025/2026' },
  { rotulo: 'Score ESG Médio', valor: '87 / 100', delta: 'Acima da meta 80' },
];

const certs = [
  { id: '0x1a2b…cd3e', tipo: 'Café', lote: 'COFFEE-2026-0212', origem: 'Minas Gerais', score: 96 },
  { id: '0x4f5g…hi6j', tipo: 'Cacau', lote: 'CACAO-2026-0098', origem: 'Bahia', score: 88 },
  { id: '0x7k8l…mn9o', tipo: 'Café', lote: 'COFFEE-2026-0211', origem: 'São Paulo', score: 91 },
  { id: '0xpq1r…st2u', tipo: 'Cacau', lote: 'CACAO-2026-0097', origem: 'Pará', score: 84 },
  { id: '0xvw3x…yz4a', tipo: 'Café', lote: 'COFFEE-2026-0210', origem: 'Espírito Santo', score: 93 },
];

export default function DashboardPage() {
  return (
    <div>
      {/* Cabeçalho da tela */}
      <div className="tela-cabecalho">
        <div>
          <h1 className="tela-titulo">Dashboard</h1>
          <p className="tela-sub">
            Visão geral da cadeia de café e cacau — AgroChain · Safra 2025/2026
          </p>
        </div>
        <Link href="/certificacao" className="btn btn-primario">
          Nova Certificação
        </Link>
      </div>

      {/* KPIs */}
      <div className="grade g4" style={{ marginBottom: '28px' }}>
        {kpis.map((k) => (
          <div key={k.rotulo} className="cartao cartao-kpi">
            <div className="kpi-rotulo">{k.rotulo}</div>
            <div className="kpi-valor">{k.valor}</div>
            <div className="kpi-delta">{k.delta}</div>
          </div>
        ))}
      </div>

      {/* Módulos */}
      <div className="cartao" style={{ marginBottom: '28px' }}>
        <div className="cartao-body">
          <h2>Módulos da Plataforma</h2>
          <div className="grade g4">
            {modules.map((m) => (
              <Link key={m.href} href={m.href} style={{ textDecoration: 'none' }}>
                <ModuleCard tag={m.tag} title={m.title} desc={m.desc} />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Últimas certificações */}
      <div className="cartao">
        <div className="cartao-body">
          <h2>Últimas Certificações</h2>
          <div style={{ overflowX: 'auto' }}>
            <table className="tabela">
              <thead>
                <tr>
                  <th>Hash</th>
                  <th>Tipo</th>
                  <th>Lote</th>
                  <th>Origem</th>
                  <th className="cel-num">Score ZK</th>
                </tr>
              </thead>
              <tbody>
                {certs.map((c) => (
                  <tr key={c.id}>
                    <td className="cel-addr">{c.id}</td>
                    <td>
                      <span
                        className={
                          c.tipo === 'Café' ? 'chip chip-ok' : 'chip chip-atencao'
                        }
                      >
                        {c.tipo}
                      </span>
                    </td>
                    <td
                      style={{
                        fontFamily: 'var(--mono)',
                        fontSize: '13px',
                      }}
                    >
                      {c.lote}
                    </td>
                    <td>{c.origem}</td>
                    <td
                      className="cel-num"
                      style={{
                        color:
                          c.score >= 90
                            ? 'var(--positivo)'
                            : 'var(--texto-1)',
                        fontWeight: 600,
                      }}
                    >
                      {c.score}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="nota">
            Fonte: AgroChain Smart Contracts · Sepolia Testnet · Atualizado em outubro de 2026
          </p>
        </div>
      </div>
    </div>
  );
}

// Extracted to avoid inline event handlers in server component
function ModuleCard({
  tag,
  title,
  desc,
}: {
  tag: string;
  title: string;
  desc: string;
}) {
  return (
    <div
      style={{
        padding: '16px',
        borderRadius: 'var(--raio-sm)',
        border: '1px solid var(--linha)',
        background: 'var(--sup-2)',
        cursor: 'pointer',
        height: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          fontSize: '10.5px',
          fontWeight: 600,
          letterSpacing: '.5px',
          textTransform: 'uppercase',
          color: 'var(--verde-600)',
          marginBottom: '6px',
        }}
      >
        {tag}
      </div>
      <div
        style={{
          fontFamily: 'var(--serifa)',
          fontSize: '14px',
          fontWeight: 600,
          color: 'var(--texto-1)',
          marginBottom: '6px',
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: '12px',
          color: 'var(--texto-3)',
          lineHeight: 1.5,
        }}
      >
        {desc}
      </div>
    </div>
  );
}
