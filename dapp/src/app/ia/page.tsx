import type { Metadata } from 'next';
import ProtoPage from '@/components/ProtoPage';

export const metadata: Metadata = {
  title: 'Inteligência Artificial · AgroChain',
  description: 'Assistente agro, recomendações e alertas',
};

export default function IAPage() {
  return (
    <ProtoPage
      view="ia"
      titulo="Inteligência Artificial"
      subtitulo="Assistente agro, recomendações e alertas baseados em dados"
    />
  );
}
