import type { Metadata } from 'next';
import ProtoPage from '@/components/ProtoPage';

export const metadata: Metadata = {
  title: 'Lavouras · AgroChain',
  description: 'Gestão de talhões, culturas e insumos',
};

export default function LavouraPage() {
  return (
    <ProtoPage
      view="lavoura"
      titulo="Lavouras e Talhões"
      subtitulo="Gestão de talhões, culturas e insumos · Dados de campo"
    />
  );
}
