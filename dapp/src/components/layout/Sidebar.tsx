'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// SVG icon helper — 17×17, stroke="currentColor", no fill, no emoji
const Ico = ({
  path,
  style,
}: {
  path: string;
  style?: React.CSSProperties;
}) => (
  <svg
    width="17"
    height="17"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    style={style}
  >
    {path.split('|').map((d, i) => (
      <path key={i} d={d} />
    ))}
  </svg>
);

const ICOS: Record<string, string> = {
  grid: 'M4 4h4v4H4V4|M4 12h4v4H4v-4|M12 4h4v4h-4V4|M12 12h4v4h-4v-4',
  seed: 'M12 22V12|M12 12C8 12 4 9 4 5c4 0 8 3 8 7z|M12 12c0-4 4-7 8-7 0 4-4 7-8 7z',
  box: 'M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z',
  store: 'M3 9l1-6h16l1 6|M3 9h18|M3 9v10a1 1 0 001 1h16a1 1 0 001-1V9',
  list: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2|M9 5a2 2 0 012-2h2a2 2 0 012 2|M9 12h6|M9 16h4',
  briefcase:
    'M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z|M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2',
  truck:
    'M1 3h15v13H1V3z|M16 8h4l3 3v5h-7V8z|M5.5 19a1.5 1.5 0 100-3 1.5 1.5 0 000 3z|M18.5 19a1.5 1.5 0 100-3 1.5 1.5 0 000 3z',
  star: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  shield:
    'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z|M9 12l2 2 4-4',
  pin: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z',
  satellite:
    'M5 12.55a11 11 0 0114.08 0|M1.42 9a16 16 0 0121.16 0|M8.53 16.11a6 6 0 016.95 0',
  leaf: 'M6.5 9.5C6.5 5.91 9.41 3 13 3c0 3.59-2.91 6.5-6.5 6.5z|M6.5 9.5C6.5 13.09 9.41 16 13 16c0-3.59-2.91-6.5-6.5-6.5z|M6.5 9.5L3 21',
  chart: 'M18 20V10|M12 20V4|M6 20v-6',
  tree: 'M12 22v-7|M12 15l-4-4|M12 15l4-4|M5 10a7 7 0 0114 0',
  qr: 'M3 3h7v7H3V3z|M14 3h7v7h-7V3z|M3 14h7v7H3v-7z|M14 14h2v2h-2v-2|M18 14h3v2h-3v-2|M14 18h2v3h-2v-3|M18 18h3v3h-3v-3',
};

const sections = [
  {
    label: 'OPERAÇÃO',
    items: [
      { href: '/', label: 'Dashboard', ico: 'grid' },
      { href: '/passport/generate', label: 'Passaporte Digital', ico: 'qr' },
    ],
  },
  {
    label: 'PRODUTOR',
    items: [
      { href: '/producer', label: 'Painel Produtor', ico: 'seed' },
      { href: '/lote', label: 'Meus Lotes', ico: 'box' },
    ],
  },
  {
    label: 'MERCADO',
    items: [
      { href: '/marketplace', label: 'Marketplace', ico: 'store' },
      { href: '/marketplace/my-listings', label: 'Meus Anúncios', ico: 'list' },
    ],
  },
  {
    label: 'COMPRADOR',
    items: [
      { href: '/buyer', label: 'Painel Comprador', ico: 'briefcase' },
      { href: '/buyer/orders', label: 'Meus Pedidos', ico: 'truck' },
      { href: '/buyer/reviews', label: 'Avaliações', ico: 'star' },
    ],
  },
  {
    label: 'VERIFICAÇÃO',
    items: [
      { href: '/verification', label: 'Painel Verificação', ico: 'shield' },
      { href: '/verification/origin', label: 'Origem', ico: 'pin' },
      { href: '/verification/eudr', label: 'EUDR', ico: 'satellite' },
      { href: '/verification/esg', label: 'ESG', ico: 'leaf' },
    ],
  },
  {
    label: 'ANÁLISE',
    items: [
      { href: '/analytics', label: 'Analytics', ico: 'chart' },
      { href: '/credits', label: 'Carbon Credits', ico: 'tree' },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      style={{
        width: '240px',
        minWidth: '240px',
        background: 'var(--sup-1)',
        borderRight: '1px solid var(--linha)',
        height: 'calc(100vh - 56px)',
        position: 'sticky',
        top: '56px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <nav style={{ padding: '12px 8px', flex: 1 }}>
        {sections.map((sec) => (
          <div key={sec.label} style={{ marginBottom: '20px' }}>
            <div
              style={{
                fontSize: '10.5px',
                fontWeight: 600,
                letterSpacing: '.6px',
                textTransform: 'uppercase',
                color: 'var(--texto-3)',
                padding: '0 10px',
                marginBottom: '4px',
              }}
            >
              {sec.label}
            </div>
            {sec.items.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== '/' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '9px 10px',
                    borderRadius: 'var(--raio-sm)',
                    marginBottom: '2px',
                    textDecoration: 'none',
                    fontSize: '13.5px',
                    fontWeight: active ? 600 : 400,
                    color: active ? 'var(--verde-700)' : 'var(--texto-2)',
                    background: active ? 'rgba(47,143,82,.10)' : 'transparent',
                    borderLeft: active
                      ? '2px solid var(--verde-600)'
                      : '2px solid transparent',
                    transition: 'all var(--t-rapida)',
                  }}
                >
                  <Ico
                    path={ICOS[item.ico] ?? ''}
                    style={{ flexShrink: 0, opacity: active ? 1 : 0.7 }}
                  />
                  <span
                    style={{
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
