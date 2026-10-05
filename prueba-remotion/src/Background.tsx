import React from "react";
import { AbsoluteFill, Interactive, random, useCurrentFrame, useVideoConfig } from "remotion";

const BLUE = "#318CE7";
const CREAM = "#FFF4D6";
const YELLOW = "#FFD23F";
const PINK = "#FF5D8F";

const wavePath = (w: number, y: number, amp: number, phase: number, k: number) => {
  let d = `M 0 2000 L 0 ${y}`;
  for (let x = 0; x <= w + 20; x += 20) {
    d += ` L ${x} ${y + Math.sin((x / w) * Math.PI * 2 * k + phase) * amp}`;
  }
  return d + ` L ${w} 2000 Z`;
};

const SHAPES = Array.from({ length: 26 }, (_, i) => ({
  x: random(`x${i}`) * 1080,
  y0: random(`y${i}`) * 2100,
  size: 30 + random(`s${i}`) * 70,
  cycles: 1 + Math.floor(random(`c${i}`) * 3),
  spin: (1 + Math.floor(random(`r${i}`) * 3)) * (random(`d${i}`) > 0.5 ? 1 : -1),
  kind: Math.floor(random(`k${i}`) * 3),
  color: [CREAM, YELLOW, PINK, "#7CB9F5"][Math.floor(random(`col${i}`) * 4)],
}));

export const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();
  const t = frame / durationInFrames;
  const cx = width / 2;
  const cy = height * 0.5;

  return (
    <AbsoluteFill style={{ background: BLUE }}>
      <Interactive.Div
        name="Glow"
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at 50% 50%, #7CB9F5 0%, ${BLUE} 45%, #1B5FB0 100%)`,
        }}
      />
      {/* sweeping diagonal stripes */}
      <Interactive.Div
        name="Stripes"
        style={{
          position: "absolute",
          inset: -400,
          backgroundImage:
            "repeating-linear-gradient(135deg, rgba(255,255,255,0.09) 0 60px, transparent 60px 120px)",
          backgroundPosition: `${t * 120 * 3}px 0`,
        }}
      />
      {/* dot grid drifting */}
      <Interactive.Div
        name="Dots"
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.35) 0 4px, transparent 5px)",
          backgroundSize: "60px 60px",
          backgroundPosition: `${-t * 60 * 2}px ${t * 60 * 3}px`,
          opacity: 0.5,
        }}
      />
      <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
        {/* pulsing rings */}
        {[0, 1, 2, 3, 4].map((i) => {
          const p = (t * 3 + i / 5) % 1;
          return (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={80 + p * 900}
              fill="none"
              stroke={CREAM}
              strokeWidth={10 * (1 - p) + 2}
              opacity={(1 - p) * 0.55}
            />
          );
        })}
        {/* rotating text ring */}
        <defs>
          <path
            id="ring"
            d={`M ${cx - 470} ${cy} a 470 470 0 1 1 940 0 a 470 470 0 1 1 -940 0`}
          />
        </defs>
        <g transform={`rotate(${t * 360} ${cx} ${cy})`} opacity={0.4}>
          <text
            fill={CREAM}
            fontFamily="Bungee"
            fontSize={56}
            letterSpacing={6}
          >
            <textPath href="#ring" textLength={2950} lengthAdjust="spacing">
              REMOTION ✦ REMOTION ✦ REMOTION ✦ REMOTION ✦ REMOTION ✦
            </textPath>
          </text>
        </g>
        <g transform={`rotate(${-t * 360 * 2} ${cx} ${cy})`} opacity={0.5}>
          <circle
            cx={cx}
            cy={cy}
            r={560}
            fill="none"
            stroke={YELLOW}
            strokeWidth={6}
            strokeDasharray="4 34"
            strokeLinecap="round"
          />
        </g>
        {/* floating shapes, each loops an integer number of times */}
        {SHAPES.map((s, i) => {
          const travel = height + 240;
          const y = height + 120 - ((s.y0 + t * s.cycles * travel) % travel);
          const rot = t * 360 * s.spin;
          const sway = Math.sin(t * Math.PI * 2 * s.cycles + i) * 30;
          return (
            <g key={i} transform={`translate(${s.x + sway} ${y}) rotate(${rot})`} opacity={0.85}>
              {s.kind === 0 && (
                <rect x={-s.size / 2} y={-s.size / 2} width={s.size} height={s.size} rx={8} fill={s.color} />
              )}
              {s.kind === 1 && <circle r={s.size / 2} fill="none" stroke={s.color} strokeWidth={8} />}
              {s.kind === 2 && (
                <polygon
                  points={`0,${-s.size / 1.6} ${s.size / 1.6},${s.size / 2} ${-s.size / 1.6},${s.size / 2}`}
                  fill={s.color}
                />
              )}
            </g>
          );
        })}
        {/* waves */}
        <path d={wavePath(width, height - 260, 40, t * Math.PI * 2, 2)} fill="#7CB9F5" opacity={0.55} />
        <path d={wavePath(width, height - 200, 50, -t * Math.PI * 2 * 2, 1)} fill="#1B5FB0" opacity={0.8} />
        <path d={wavePath(width, height - 130, 30, t * Math.PI * 2 * 3, 3)} fill="#0E3F7E" />
      </svg>
      {/* marquee strips */}
      {[
        { top: 120, dir: 1, bg: YELLOW, fg: "#0E3F7E", rot: -6 },
        { top: height - 420, dir: -1, bg: PINK, fg: CREAM, rot: 5 },
      ].map((m, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: -100,
            width: width + 200,
            top: m.top,
            height: 96,
            background: m.bg,
            rotate: `${m.rot}deg`,
            overflow: "hidden",
            boxShadow: "0 10px 0 rgba(14,63,126,0.35)",
          }}
        >
          <div
            style={{
              display: "flex",
              whiteSpace: "nowrap",
              translate: `${m.dir * -((t * 2 * 1000) % 1000) - 1000}px 0`,
              fontFamily: "Bungee",
              fontSize: 56,
              lineHeight: "96px",
              color: m.fg,
            }}
          >
            {Array.from({ length: 5 }).map((_, k) => (
              <span key={k} style={{ width: 1000, flexShrink: 0 }}>
                REMOTION ✦ DISEÑO ✦
              </span>
            ))}
          </div>
        </div>
      ))}
    </AbsoluteFill>
  );
};
