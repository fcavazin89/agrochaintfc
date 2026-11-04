import type { Metadata } from 'next';
import ProtoPage from '@/components/ProtoPage';

export const metadata: Metadata = {
  title: 'IoT e Sensores · AgroChain',
  description: 'Monitoramento em tempo real de campo',
};

export default function IoTPage() {
  return (
    <ProtoPage
      view="iot"
      titulo="IoT e Sensores"
      subtitulo="Monitoramento em tempo real · Temperatura, umidade e solo"
    />
  );
}
