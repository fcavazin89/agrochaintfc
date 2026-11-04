import type { Metadata } from 'next';
import ProtoPage from '@/components/ProtoPage';

export const metadata: Metadata = {
  title: 'ERP Agro · AgroChain',
  description: 'Gestão financeira, compras, vendas e estoque',
};

export default function ErpPage() {
  return (
    <ProtoPage
      view="erp"
      titulo="ERP Agro"
      subtitulo="Gestão financeira, compras, vendas e estoque · Safra 2025/2026"
    />
  );
}
