'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/',            label: 'Dashboard',     icon: '📊' },
  { href: '/rastreio',    label: 'Rastreabilidade', icon: '🔍' },
  { href: '/certificacao', label: 'Certificação ZK', icon: '🏆' },
  { href: '/dex',         label: 'CoffeeCacaoSwap', icon: '🔄' },
  { href: '/compliance',  label: 'Compliance IA',  icon: '🤖' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav
      style={{width: '240px',
        minWidth: '240px',
        background: '#fff',
        borderRight: '1px solid #ddd8cc',
        padding: '24px 0',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',}}
    >
      <div
        style={{padding: '0 16px 16px',
          borderBottom: '1px solid #ddd8cc',
          marginBottom: '8px',}}
      >
        <p style={{margin: 0, fontSize: '11px', color: '#495649', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px'}}>
          Navegação
        </p>
      </div>
      {navItems.map(item => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 16px',
              margin: '0 8px',
              borderRadius: '8px',
              textDecoration: 'none',
              background: active ? '#1f6440' : 'transparent',
              color: active ? '#f3f7f2' : '#1e2a22',
              fontWeight: active ? '600' : '400',
              fontSize: '14px',
              transition: 'background 0.15s',}}
          >
            <span style={{fontSize: '18px'}}>{item.icon}</span>
            {item.label}
          </Link>
        );
      })}

      <div style={{marginTop: 'auto', padding: '16px', borderTop: '1px solid #ddd8cc'}}>
        <p style={{margin: 0, fontSize: '11px', color: '#495649'}}>Coffee &amp; Cacao</p>
        <p style={{margin: 0, fontSize: '11px', color: '#b8912a', fontWeight: '600'}}>Compliance v2.0</p>
      </div>
    </nav>
  );
}
