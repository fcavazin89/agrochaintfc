'use client';

import QRCode from 'qrcode.react';

interface QRCodeDisplayProps {
  lotId: string;
  size?: 'small' | 'medium' | 'large';
}

export default function QRCodeDisplay({ lotId, size = 'medium' }: QRCodeDisplayProps) {
  const sizeMap = {
    small: 128,
    medium: 256,
    large: 384,
  };

  const qrSize = sizeMap[size];
  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'https://agrochain.app';
  const passportUrl = `${origin}/passport/${lotId}`;

  return (
    <div className="flex flex-col items-center gap-4">
      <QRCode value={passportUrl} size={qrSize} />
      <p style={{ fontSize: '14px', color: 'var(--texto-secundario)' }}>
        Escaneie para ver detalhes do lote
      </p>
    </div>
  );
}
