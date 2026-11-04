import type { Metadata } from 'next';
import ProtoPage from '@/components/ProtoPage';

export const metadata: Metadata = {
  title: 'Mercado · AgroChain',
  description: 'Cotações, contratos e negociações',
};

export default function MercadoPage() {
  return (
    <ProtoPage
      view="mercado"
      titulo="Mercado e Contratos"
      subtitulo="Cotações Cepea/Esalq, contratos e negociações · 2025/2026"
    />
  );
}
