'use client';

import { QRCodeCanvas } from 'qrcode.react';

type Size = 'small' | 'medium' | 'large';

const SIZE_MAP: Record<Size, number> = {
  small: 128,
  medium: 200,
  large: 256,
};

interface QRCodeDisplayProps {
  lotId: string;
  size?: Size;
}

export default function QRCodeDisplay({ lotId, size = 'medium' }: QRCodeDisplayProps) {
  const url = typeof window !== 'undefined'
    ? `${window.location.origin}/passport/${lotId}`
    : `/passport/${lotId}`;

  return (
    <QRCodeCanvas
      value={url}
      size={SIZE_MAP[size]}
      includeMargin
      level="M"
    />
  );
}
