'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useSidebar } from '@/lib/sidebar-context';

const navSections = [
  { label: 'PLATAFORMA', items: [{ href: '/', label: 'Home', icon: '🏠' }] },
  {
    label: 'DASHBOARD',
    items: [
      { href: '/dashboard', label: 'Visão Geral', icon: '👁️' },
      { href: '/erp', label: 'ERP Integrado', icon: '📊' },
      { href: '/erp-financeiro', label: 'Financeiro', icon: '💰' },
      { href: '/erp-custos', label: 'Custos', icon: '💸' },
      { href: '/erp-estoque', label: 'Estoque', icon: '📦' },
      { href: '/erp-operacoes', label: 'Operações', icon: '⚙️' },
      { href: '/erp-fechamento', label: 'Fechamento', icon: '📋' },
    ]
  },
  {
    label: 'RASTREIO',
    items: [
      { href: '/rastreio', label: 'Rastreabilidade', icon: '🔍' },
      { href: '/certificacao', label: 'Certificação ZK', icon: '🏆' },
      { href: '/zk-standalone', label: 'Certificador ZK', icon: '🔐' },
    ]
  },
  {
    label: 'DEX',
    items: [
      { href: '/dex', label: 'Swap', icon: '💹' },
      { href: '/compliance', label: 'Compliance', icon: '✅' },
    ]
  },
  {
    label: 'MONITORAMENTO',
    items: [
      { href: '/iot', label: 'IoT Sensors', icon: '📡' },
      { href: '/assistente', label: 'Assistente IA', icon: '🤖' },
      { href: '/auditoria', label: 'Auditoria', icon: '📊' },
      { href: '/imersivo', label: 'Modo Imersivo', icon: '🌐' },
    ]
  },
  {
    label: 'EXTRAS',
    items: [
      { href: '/producer', label: 'Produtor', icon: '🌾' },
      { href: '/mercado', label: 'Marketplace', icon: '🛒' },
    ]
  },
];

// Função para determinar se a seção deve estar expandida baseado no pathname
function shouldSectionBeExpanded(sectionLabel: string, pathname: string): boolean {
  const sectionRouteMap: Record<string, string[]> = {
    DASHBOARD: ['/dashboard', '/erp'],
    RASTREIO: ['/rastreio', '/certificacao', '/zk-standalone'],
    DEX: ['/dex', '/compliance'],
    MONITORAMENTO: ['/iot', '/assistente', '/auditoria', '/imersivo'],
    EXTRAS: ['/producer', '/mercado'],
    PLATAFORMA: ['/'],
  };

  const routes = sectionRouteMap[sectionLabel] || [];
  return routes.some(route => pathname === route || pathname.startsWith(route + '/'));
}

export function Sidebar() {
  const pathname = usePathname();
  const { isOpen, closeSidebar } = useSidebar();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    navSections.forEach(section => {
      initial[section.label] = shouldSectionBeExpanded(section.label, pathname);
    });
    return initial;
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          onClick={closeSidebar}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 99,
            display: 'none',
          }}
        />
      )}
      <nav
        style={{
          width: '260px',
          minWidth: '260px',
          background: '#fff',
          borderRight: '1px solid #ddd8cc',
          padding: '16px 0',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          height: 'calc(100vh - 60px)',
          position: 'relative',
        } as React.CSSProperties}
        suppressHydrationWarning
      >
      {navSections.map(section => (
        <div key={section.label} style={{marginBottom: '4px'}}>
          <button
            onClick={() => toggleSection(section.label)}
            style={{
              width: '100%',
              padding: '8px 16px',
              background: 'transparent',
              border: 'none',
              textAlign: 'left',
              color: '#495649',
              fontSize: '10px',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            {section.label}
            <span style={{fontSize: '12px'}}>{expandedSections[section.label] ? '▼' : '▶'}</span>
          </button>
          {expandedSections[section.label] && (
            <div style={{display: 'flex', flexDirection: 'column', gap: '2px'}}>
              {section.items.map(item => {
                const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href + '/'));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeSidebar}
                    style={{display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 16px',
                      margin: '0 8px',
                      borderRadius: '6px',
                      textDecoration: 'none',
                      background: active ? '#1f6440' : 'transparent',
                      color: active ? '#f3f7f2' : '#1e2a22',
                      fontWeight: active ? '600' : '400',
                      fontSize: '13px',
                      transition: 'all 0.15s',}}
                    onMouseEnter={(e) => {
                      if (!active) e.currentTarget.style.background = '#f0faf4';
                    }}
                    onMouseLeave={(e) => {
                      if (!active) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <span style={{fontSize: '16px'}}>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      ))}

        <div style={{marginTop: 'auto', padding: '16px', borderTop: '1px solid #ddd8cc', background: '#f5f1e7'}}>
          <p style={{margin: 0, fontSize: '11px', color: '#495649', fontWeight: '600'}}>Coffee &amp; Cacao</p>
          <p style={{margin: '4px 0 0', fontSize: '11px', color: '#b8912a', fontWeight: '700'}}>Platform v2.0</p>
          <p style={{margin: '4px 0 0', fontSize: '10px', color: '#888'}}>Blockchain Verified</p>
        </div>
      </nav>
    </>
  );
}
