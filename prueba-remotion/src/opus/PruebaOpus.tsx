import React from "react";
import {
  AbsoluteFill,
  Easing,
  Interactive,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont } from "@remotion/fonts";
import { Blobs } from "./Blobs";
import { Halftone } from "./Halftone";
import { SplitFlap } from "./SplitFlap";

loadFont({ family: "Bungee", url: staticFile("Bungee.woff2") });
loadFont({ family: "Space Mono", url: staticFile("SpaceMono-Bold.woff2"), weight: "700" });

const BLUE = "#318CE7";
const NAVY = "#0A2F6B";
const CREAM = "#FFF4D6";
const YELLOW = "#FFD23F";
const CORAL = "#FF6B57";
const CX = 540;
const CY = 960;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const PruebaOpus: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const t = frame / durationInFrames;

  // --- Intro/outro: a dot falls, bounces, and becomes the window into the scene.
  // The outro reverses it, so the last frame hands back to the first.
  const dotY =
    frame <= 14
      ? interpolate(frame, [0, 14], [-120, CY], { easing: Easing.in(Easing.quad) })
      : frame <= 26
        ? CY - Math.sin(((frame - 14) / 12) * Math.PI) * 80
        : interpolate(frame, [284, 300], [CY, -120], { ...clamp, easing: Easing.in(Easing.cubic) });
  const squash =
    interpolate(frame, [12, 14, 18], [0, 1, 0], clamp) +
    interpolate(frame, [24, 26, 30], [0, 0.6, 0], clamp);
  const stretch =
    interpolate(frame, [4, 13, 14], [0, 0.35, 0], clamp) +
    interpolate(frame, [284, 292], [0, 0.4], clamp);
  const iris = interpolate(frame, [28, 46, 266, 284], [45, 1250, 1250, 45], {
    ...clamp,
    easing: Easing.bezier(0.8, 0, 0.2, 1),
  });
  const rx = iris * (1 + 0.45 * squash - 0.2 * stretch);
  const ry = iris * (1 - 0.4 * squash + stretch);
  const shadowK = interpolate(dotY, [-120, CY], [0.15, 1], clamp);

  // --- Camera: gentle 3D sway, flat at both ends so the loop is clean.
  const sway = interpolate(frame, [46, 90, 236, 266], [0, 1, 1, 0], clamp);
  const camX = Math.sin(t * Math.PI * 2) * 6 * sway;
  const camY = Math.cos(t * Math.PI * 2) * 9 * sway;

  // --- PRUEBA: outline draws, fills, extrudes, gets a gloss sweep, then reverses.
  const drawP = interpolate(frame, [40, 78, 246, 266], [0, 1, 1, 0], clamp);
  const fillP = interpolate(frame, [68, 90, 240, 252], [0, 1, 1, 0], clamp);
  const extrude = Math.round(interpolate(frame, [82, 100, 236, 248], [0, 16, 16, 0], clamp));
  const glossX = interpolate(frame, [128, 168], [-300, 1380], clamp);
  const floatY = Math.sin(t * Math.PI * 2 * 2) * 8;

  // --- DE sticker with a spark burst.
  const pop =
    spring({ frame: frame - 92, fps, config: { damping: 9, stiffness: 170 } }) *
    interpolate(frame, [250, 262], [1, 0], clamp);
  const burst = interpolate(frame, [94, 116], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });

  const specP = interpolate(frame, [46, 66, 262, 276], [0, 1, 1, 0], clamp);

  return (
    <AbsoluteFill style={{ background: CREAM }}>
      {/* landing shadow for the dot */}
      <div
        style={{
          position: "absolute",
          left: CX - 60 * shadowK,
          top: CY + 70,
          width: 120 * shadowK,
          height: 24 * shadowK,
          borderRadius: "50%",
          background: NAVY,
          opacity: (frame < 34 || frame > 280 ? 0.25 : 0) * shadowK,
        }}
      />

      <AbsoluteFill style={{ clipPath: `ellipse(${rx}px ${ry}px at ${CX}px ${dotY}px)` }}>
        <AbsoluteFill style={{ background: BLUE, perspective: 1800 }}>
          <AbsoluteFill
            style={{
              transformStyle: "preserve-3d",
              transform: `rotateX(${camX}deg) rotateY(${camY}deg)`,
            }}
          >
            <AbsoluteFill style={{ transform: "translateZ(-320px) scale(1.32)" }}>
              <Halftone color="#5BA4EE" />
            </AbsoluteFill>
            <AbsoluteFill style={{ transform: "translateZ(-160px) scale(1.16)" }}>
              <Blobs />
            </AbsoluteFill>

            <Interactive.Div
              name="PRUEBA"
              style={{ position: "absolute", inset: 0, transform: `translateZ(90px) scale(0.95) translateY(${floatY}px)` }}
            >
              <svg width={width} height={height}>
                <defs>
                  <linearGradient id="gloss" gradientUnits="userSpaceOnUse" x1={glossX - 180} y1={0} x2={glossX + 180} y2={0}>
                    <stop offset="0" stopColor={CREAM} />
                    <stop offset="0.5" stopColor="#FFFFFF" />
                    <stop offset="1" stopColor={CREAM} />
                  </linearGradient>
                </defs>
                {Array.from({ length: extrude }).map((_, k) => {
                  const i = extrude - k;
                  return (
                    <text
                      key={i}
                      x={CX + i * 1.8}
                      y={845 + i * 1.8}
                      textAnchor="middle"
                      fontFamily="Bungee"
                      fontSize={210}
                      fill={NAVY}
                    >
                      PRUEBA
                    </text>
                  );
                })}
                <text
                  x={CX}
                  y={845}
                  textAnchor="middle"
                  fontFamily="Bungee"
                  fontSize={210}
                  fill="url(#gloss)"
                  fillOpacity={fillP}
                  stroke={CREAM}
                  strokeWidth={5}
                  strokeLinejoin="round"
                  strokeDasharray={2000}
                  strokeDashoffset={2000 * (1 - drawP)}
                >
                  PRUEBA
                </text>
              </svg>
            </Interactive.Div>

            <AbsoluteFill style={{ transform: "translateZ(140px) scale(0.9)" }}>
              <SplitFlap text="ANIMACIÓN" enterAt={100} settleAt={114} leaveAt={232} top={1062} />
              <div
                style={{
                  position: "absolute",
                  left: 40,
                  top: 1240,
                  width: 1000,
                  height: 16,
                  borderRadius: 8,
                  background: CORAL,
                  transformOrigin: "0% 50%",
                  scale: `${interpolate(frame, [160, 182, 232, 244], [0, 1, 1, 0], {
                    ...clamp,
                    easing: Easing.bezier(0.7, 0, 0.2, 1),
                  })} 1`,
                }}
              />
            </AbsoluteFill>

            <AbsoluteFill style={{ transform: "translateZ(220px) scale(0.86)" }}>
              <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
                {Array.from({ length: 12 }).map((_, i) => {
                  const a = (i / 12) * Math.PI * 2;
                  const r1 = 70 + burst * 120;
                  const r2 = 70 + Math.min(1, burst * 1.6) * 190;
                  return (
                    <line
                      key={i}
                      x1={CX + Math.cos(a) * r1}
                      y1={945 + Math.sin(a) * r1 * 0.7}
                      x2={CX + Math.cos(a) * r2}
                      y2={945 + Math.sin(a) * r2 * 0.7}
                      stroke={i % 2 ? CREAM : YELLOW}
                      strokeWidth={9}
                      strokeLinecap="round"
                      opacity={burst > 0 && burst < 1 ? 1 - burst : 0}
                    />
                  );
                })}
              </svg>
              <div
                style={{
                  position: "absolute",
                  left: CX,
                  top: 945,
                  translate: "-50% -50%",
                  scale: pop,
                  rotate: `${-6 + Math.sin(t * Math.PI * 2 * 3) * 3}deg`,
                  background: YELLOW,
                  color: NAVY,
                  fontFamily: "Bungee",
                  fontSize: 84,
                  padding: "4px 46px",
                  borderRadius: 26,
                  border: `6px solid ${NAVY}`,
                  boxShadow: `0 10px 0 ${NAVY}`,
                }}
              >
                DE
              </div>
            </AbsoluteFill>
          </AbsoluteFill>
        </AbsoluteFill>

        {/* spec-sheet overlay: crop marks, labels and a live frame counter */}
        <AbsoluteFill style={{ opacity: specP, fontFamily: "Space Mono", fontWeight: 700, fontSize: 28, color: CREAM, letterSpacing: 2 }}>
          <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
            {[
              [50, 50, 1, 1],
              [width - 50, 50, -1, 1],
              [50, height - 50, 1, -1],
              [width - 50, height - 50, -1, -1],
            ].map(([x, y, dx, dy], i) => (
              <path
                key={i}
                d={`M ${x} ${y + dy * 44} L ${x} ${y} L ${x + dx * 44} ${y}`}
                fill="none"
                stroke={CREAM}
                strokeWidth={4}
              />
            ))}
            <rect x={70} y={height - 120} width={(width - 140) * t} height={4} fill={YELLOW} />
          </svg>
          <div style={{ position: "absolute", top: 76, left: 76 }}>TOMA Nº 02</div>
          <div style={{ position: "absolute", top: 76, right: 76 }}>#318CE7</div>
          <div style={{ position: "absolute", bottom: 136, left: 76 }}>
            FRAME {String(frame).padStart(3, "0")}/{durationInFrames}
          </div>
          <div style={{ position: "absolute", bottom: 136, right: 76 }}>1080×1920 · 30FPS</div>
        </AbsoluteFill>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
