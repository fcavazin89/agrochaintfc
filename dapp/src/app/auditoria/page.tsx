import type { Metadata } from 'next';
import ProtoPage from '@/components/ProtoPage';

export const metadata: Metadata = {
  title: 'Auditoria · AgroChain',
  description: 'Registro imutável de operações e detecção de fraudes',
};

export default function AuditoriaPage() {
  return (
    <ProtoPage
      view="auditoria"
      titulo="Auditoria e Fraudes"
      subtitulo="Registro imutável de todas as operações · Detecção de anomalias"
    />
  );
}
