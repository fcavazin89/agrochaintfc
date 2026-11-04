import type { Metadata } from 'next';
import ProtoPage from '@/components/ProtoPage';

export const metadata: Metadata = {
  title: 'Blockchain · AgroChain',
  description: 'Cadeia de rastreabilidade imutável',
};

export default function BlockchainPage() {
  return (
    <ProtoPage
      view="blockchain"
      titulo="Blockchain"
      subtitulo="Cadeia de rastreabilidade imutável · Sepolia Testnet"
    />
  );
}
