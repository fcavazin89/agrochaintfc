import type { Metadata } from 'next';
import ProtoPage from '@/components/ProtoPage';

export const metadata: Metadata = {
  title: 'Assistente IA · AgroChain',
  description: 'Assistente inteligente para gestão agrícola',
};

export default function AssistentePage() {
  return (
    <ProtoPage
      view="assistente"
      titulo="Assistente Agro"
      subtitulo="Recomendações de IA para gestão de lavoura, preços e conformidade"
    />
  );
}
