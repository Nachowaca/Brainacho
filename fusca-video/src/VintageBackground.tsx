import React from "react";
import {
  AbsoluteFill,
  Interactive,
  interpolate,
  random,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

type Props = {
  readonly baseColor: string;
  readonly rayColor: string;
};

export const VintageBackground: React.FC<Props> = ({ baseColor, rayColor }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const t = frame / durationInFrames;

  const flicker = 1 + Math.sin(frame * 1.7) * 0.015 + (random(`f${frame}`) - 0.5) * 0.03;
  const scratchCount = 3;

  return (
    <AbsoluteFill style={{ background: baseColor }}>
      <Interactive.Div
        name="Glow"
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at 50% 60%, #ffe9b0 0%, ${baseColor} 55%, #7a2e12 120%)`,
        }}
      />
      {/* rotating sunburst (one full ray period per loop => seamless) */}
      <Interactive.Div
        name="Sunburst"
        style={{
          position: "absolute",
          left: "50%",
          top: "62%",
          width: height * 2.4,
          height: height * 2.4,
          translate: "-50% -50%",
          rotate: `${t * 30}deg`,
          background: `repeating-conic-gradient(from 0deg, ${rayColor} 0deg 7.5deg, transparent 7.5deg 15deg)`,
          opacity: 0.22,
        }}
      />
      {/* halftone dots drifting diagonally, looping every 40px */}
      <Interactive.Div
        name="Halftone"
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(circle, rgba(90,30,10,0.55) 0 5px, transparent 6px)",
          backgroundSize: "40px 40px",
          backgroundPosition: `${t * 40}px ${t * 40}px`,
          opacity: 0.35,
          maskImage:
            "linear-gradient(to bottom, black 0%, transparent 38%, transparent 70%, black 100%)",
        }}
      />
      {/* stage disc under the car */}
      <Interactive.Div
        name="Stage"
        style={{
          position: "absolute",
          left: "50%",
          top: "64%",
          width: width * 0.9,
          height: width * 0.32,
          translate: "-50% -50%",
          borderRadius: "50%",
          background:
            "radial-gradient(ellipse, #3d8f8a 0%, #2a6b68 60%, #1d4d4a 100%)",
          boxShadow: "0 30px 0 #14393a, 0 0 0 14px #f3ead2, 0 0 0 28px #c8501f",
          opacity: 0.95,
        }}
      />
      {/* film grain: new noise seed every other frame */}
      <svg
        width={width}
        height={height}
        style={{
          position: "absolute",
          inset: 0,
          mixBlendMode: "multiply",
          opacity: 0.32,
        }}
      >
        <filter id="grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves={2}
            seed={Math.floor(frame / 2)}
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width={width} height={height} filter="url(#grain)" />
      </svg>
      {/* dust scratches */}
      {Array.from({ length: scratchCount }).map((_, i) => {
        const seed = `s${Math.floor(frame / 3)}-${i}`;
        const show = random(`show${seed}`) > 0.55;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: random(`x${seed}`) * width,
              top: random(`y${seed}`) * height * 0.5,
              width: 2,
              height: 200 + random(`h${seed}`) * 500,
              background: "rgba(255,248,225,0.45)",
              opacity: show ? 1 : 0,
            }}
          />
        );
      })}
      {/* vignette + flicker */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 45%, rgba(40,12,4,0.75) 115%)",
        }}
      />
      <AbsoluteFill
        style={{
          background: "#fff3d0",
          mixBlendMode: "soft-light",
          opacity: interpolate(flicker, [0.95, 1.05], [0, 0.25]),
        }}
      />
    </AbsoluteFill>
  );
};
