import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";

const blobPath = (cx: number, cy: number, r: number, ph: number) => {
  const pts: string[] = [];
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    const k = 1 + 0.09 * Math.sin(3 * a + ph) + 0.05 * Math.sin(5 * a - ph * 2);
    pts.push(`${cx + Math.cos(a) * r * k},${cy + Math.sin(a) * r * k}`);
  }
  return `M ${pts.join(" L ")} Z`;
};

export const Blobs: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const ph = (frame / durationInFrames) * Math.PI * 2;

  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
      <path d={blobPath(80, 260, 380, ph)} fill="#2A7AD1" />
      <path d={blobPath(1040, 1650, 460, -ph)} fill="#2A7AD1" />
      <path d={blobPath(980, 380, 170, ph * 2)} fill="#5BA4EE" opacity={0.7} />
      <path d={blobPath(120, 1560, 140, -ph * 2)} fill="#5BA4EE" opacity={0.7} />
    </svg>
  );
};
