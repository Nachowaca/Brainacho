import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";

const SPACING = 60;
const CX = 540;
const CY = 960;

// Hex grid of dots whose radius follows a ripple travelling out from the center.
export const Halftone: React.FC<{ readonly color: string }> = ({ color }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const t = frame / durationInFrames;

  const dots: React.ReactNode[] = [];
  for (let row = -1; row < 34; row++) {
    for (let col = -1; col < 20; col++) {
      const x = col * SPACING + (row % 2 ? SPACING / 2 : 0);
      const y = row * SPACING;
      const d = Math.hypot(x - CX, y - CY);
      const wave = 0.5 + 0.5 * Math.sin(d / 70 - t * Math.PI * 2 * 4);
      const falloff = interpolate(d, [0, 1100], [1, 0.35], {
        extrapolateRight: "clamp",
      });
      dots.push(
        <circle
          key={`${row}-${col}`}
          cx={x}
          cy={y}
          r={(3 + 17 * wave ** 3) * falloff}
          fill={color}
        />,
      );
    }
  }

  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
      {dots}
    </svg>
  );
};
