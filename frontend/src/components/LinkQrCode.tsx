import { useMemo } from 'react';
import { qrModules } from '../utils/qrCode';

interface Props {
  url: string;
}

export function LinkQrCode({ url }: Props) {
  const cells = useMemo(() => qrModules(url), [url]);
  const quietZone = 4;
  const side = cells.length + quietZone * 2;

  return (
    <svg className="link-qr" viewBox={`0 0 ${side} ${side}`} role="img" aria-label={`QR Code do link ${url}`} shapeRendering="crispEdges">
      <rect width={side} height={side} fill="#fff" />
      {cells.map((row, y) => row.map((dark, x) => dark ? (
        <rect key={`${x}-${y}`} x={x + quietZone} y={y + quietZone} width="1" height="1" fill="#102437" />
      ) : null))}
    </svg>
  );
}
