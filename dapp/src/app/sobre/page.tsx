import type { Metadata } from 'next';
import ProtoPage from '@/components/ProtoPage';

export const metadata: Metadata = {
  title: 'Sobre · AgroChain',
  description: 'Arquitetura e tecnologia da plataforma AgroChain',
};

export default function SobrePage() {
  return (
    <ProtoPage
      view="sobre"
      titulo="Sobre e Arquitetura"
      subtitulo="Tecnologia, fontes de dados e metodologia da plataforma"
    />
  );
}
