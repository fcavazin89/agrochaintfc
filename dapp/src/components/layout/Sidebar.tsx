'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { QrCode } from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();

  const navSections = [
    {
      label: 'PRODUTOR',
      items: [
        { href: '/producer', label: 'Dashboard', icon: '🌱' },
        { href: '/lote', label: 'Meus Lotes', icon: '📦' },
      ],
    },
    {
      label: 'MARKETPLACE',
      items: [
        { href: '/marketplace', label: 'Marketplace', icon: '🛒' },
        { href: '/marketplace/my-listings', label: 'Meus Anúncios', icon: '📋' },
      ],
    },
    {
      label: 'COMPRADOR',
      items: [
        { href: '/buyer', label: 'Dashboard', icon: '💼' },
        { href: '/buyer/orders', label: 'Meus Pedidos', icon: '📦' },
        { href: '/buyer/reviews', label: 'Reviews', icon: '⭐' },
      ],
    },
    {
      label: 'VERIFICAÇÃO',
      items: [
        { href: '/verification', label: 'Dashboard', icon: '✓' },
        { href: '/verification/origin', label: 'Origem', icon: '🌍' },
        { href: '/verification/eudr', label: 'EUDR', icon: '📡' },
        { href: '/verification/esg', label: 'ESG', icon: '📊' },
      ],
    },
    {
      label: 'ANALYTICS & ESG',
      items: [
        { href: '/analytics', label: 'Analytics', icon: '📈' },
        { href: '/credits', label: 'Carbon Credits', icon: '🌿' },
      ],
    },
    {
      label: 'PASSAPORTE',
      items: [
        { href: '/passport/generate', label: 'Passaporte Digital', icon: 'qrcode' },
      ],
    },
  ];

  return (
    <div
      style={{
        width: '260px',
        backgroundColor: 'white',
        borderRight: '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
      }}
    >
      <div style={{ padding: '24px', borderBottom: '1px solid #e5e7eb' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--verde-profundo)' }}>
          AgroChain
        </h1>
      </div>

      <nav style={{ padding: '16px' }}>
        {navSections.map((section) => (
          <div key={section.label} style={{ marginBottom: '24px' }}>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 'bold',
                color: '#6b7280',
                marginBottom: '8px',
                paddingLeft: '12px',
              }}
            >
              {section.label}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {section.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      backgroundColor: isActive ? '#f0fdf4' : 'transparent',
                      color: isActive ? 'var(--verde-profundo)' : 'var(--texto-secundario)',
                      fontWeight: isActive ? 'bold' : 'normal',
                      transition: 'all 0.2s',
                    }}
                  >
                    {item.icon === 'qrcode' ? (
                      <QrCode size={18} />
                    ) : (
                      <span>{item.icon}</span>
                    )}
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );
}
