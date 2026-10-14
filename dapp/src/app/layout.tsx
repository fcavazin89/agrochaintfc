import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import { Providers } from './providers';
import { SidebarProvider } from '@/lib/sidebar-context';

export const metadata: Metadata = {
  title: 'AgroChain DApp',
  description: 'Coffee & Cacao Supply Chain on Blockchain',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body style={{background: '#f5f1e7', margin: 0}}>
        <Providers>
          <SidebarProvider>
            <div style={{display: 'flex', minHeight: '100vh', flexDirection: 'column'}}>
              <TopBar />
              <div style={{display: 'flex', flex: 1}}>
                <Sidebar />
                <main style={{flex: 1, padding: '24px', overflowY: 'auto'}}>
                  {children}
                </main>
              </div>
            </div>
          </SidebarProvider>
        </Providers>
      </body>
    </html>
  );
}
