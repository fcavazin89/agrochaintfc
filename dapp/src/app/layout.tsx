import type { Metadata } from 'next';
import { Suspense } from 'react';
import './globals.css';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import { Providers } from './providers';
import { SidebarProvider } from '@/lib/sidebar-context';

export const metadata: Metadata = {
  title: 'AgroChain',
  description: 'Rastreabilidade de café e cacau na blockchain',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, padding: 0, background: 'var(--fundo)', fontFamily: 'var(--fonte)' }}>
        <Providers>
          <SidebarProvider>
            <TopBar />
            <div style={{ display: 'flex', minHeight: 'calc(100vh - 56px)' }}>
              <Sidebar />
              <main style={{ flex: 1, overflowY: 'auto', background: 'var(--fundo)' }}>
                <div style={{ maxWidth: '1320px', margin: '0 auto', padding: '28px 24px 48px' }}>
                  <Suspense
                    fallback={
                      <div className="vazio">
                        <p className="vazio-titulo">Carregando…</p>
                      </div>
                    }
                  >
                    {children}
                  </Suspense>
                </div>
              </main>
            </div>
          </SidebarProvider>
        </Providers>
      </body>
    </html>
  );
}
