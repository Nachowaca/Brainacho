import React from "react";
import {
  AbsoluteFill,
  Easing,
  Interactive,
  interpolate,
  random,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont } from "@remotion/fonts";
import { Audio } from "@remotion/media";

loadFont({ family: "Oswald", url: staticFile("Oswald-SemiBold.woff2"), weight: "600" });
loadFont({ family: "Inter", url: staticFile("Inter-Medium.woff2"), weight: "500" });

const W = 1024;
const H = 512;
const WHITE = "#F4F4F2";
const CYAN = "#9BE7FF";
const BG = "#050506";

// Bar geometry (matches the reference: outlined track, inset fill, bubble above)
const BAR_X = 232;
const BAR_Y = 240;
const BAR_W = 560;
const BAR_H = 44;
const PAD = 8;
const INNER_W = BAR_W - PAD * 2;

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const T = (frame: number, a: number[], b: number[], easing = Easing.inOut(Easing.cubic)) =>
  interpolate(frame, a, b, { ...clamp, easing });

const DUST = Array.from({ length: 28 }, (_, i) => ({
  x: random(`dx${i}`) * W,
  y: random(`dy${i}`) * H,
  r: 0.8 + random(`dr${i}`) * 1.6,
  drift: 10 + random(`dd${i}`) * 26,
  ph: random(`dp${i}`) * Math.PI * 2,
}));

export const IntroPlay: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // ---------- Loading progress: fast, then two deliberate stalls for tension ----------
  const progress = interpolate(
    frame,
    [12, 30, 37, 52, 60, 76, 84],
    [0, 0.37, 0.37, 0.79, 0.79, 0.97, 1],
    { ...clamp, easing: Easing.bezier(0.45, 0, 0.25, 1) },
  );
  const pct = Math.round(progress * 100);
  const stalling = (frame >= 30 && frame < 37) || (frame >= 52 && frame < 60);

  const frameDraw = T(frame, [2, 20], [0, 1], Easing.out(Easing.cubic));
  const uiIn = T(frame, [0, 14], [0, 1]);
  const done = T(frame, [84, 90], [0, 1]);
  const flash = interpolate(frame, [84, 87, 96], [0, 1, 0], clamp);
  const uiOut = T(frame, [96, 112], [0, 1], Easing.in(Easing.cubic));

  const fillW = progress * INNER_W;
  const bubbleX = BAR_X + PAD + fillW;
  const dots = ".".repeat(1 + (Math.floor(frame / 4) % 9));

  // ---------- Play triangle ----------
  const playIn = spring({ frame: frame - 104, fps, config: { damping: 12, stiffness: 120, mass: 0.8 } });
  const hover = T(frame, [134, 142], [0, 1], Easing.out(Easing.cubic));
  const press = interpolate(frame, [146, 149, 154], [0, 1, 0], clamp);
  const zoom = T(frame, [152, 176], [0, 1], Easing.in(Easing.cubic));
  const triScale = playIn * (1 + 0.08 * hover - 0.1 * press) * (1 + zoom * 38);
  const triGlow = 14 + 26 * hover + 40 * press;

  // ---------- Cursor: curved approach, settles, clicks ----------
  const cp = T(frame, [110, 140], [0, 1], Easing.bezier(0.25, 0.1, 0.2, 1));
  const p0 = { x: 1010, y: 560 };
  const p1 = { x: 760, y: 470 };
  const p2 = { x: 522, y: 276 };
  const cx = (1 - cp) ** 2 * p0.x + 2 * (1 - cp) * cp * p1.x + cp ** 2 * p2.x;
  const cy = (1 - cp) ** 2 * p0.y + 2 * (1 - cp) * cp * p1.y + cp ** 2 * p2.y;
  const idle = frame >= 140 && frame < 146 ? Math.sin((frame - 140) * 2) * 1.5 : 0;
  const cursorScale = 1 - 0.18 * press;
  const cursorOpacity = T(frame, [110, 118], [0, 1]) * (1 - T(frame, [158, 168], [0, 1]));

  const rippleP = T(frame, [146, 170], [0, 1], Easing.out(Easing.cubic));

  // ---------- Final: flood to white ----------
  const whiteFlood = T(frame, [166, 180], [0, 1], Easing.in(Easing.quad));

  return (
    <AbsoluteFill style={{ background: BG, overflow: "hidden" }}>
      <Audio name="Musica" src={staticFile("intro-music-cine.wav")} volume={0.7} premountFor={fps} />
      <Audio name="Efectos" src={staticFile("intro-sfx.wav")} volume={1} premountFor={fps} />
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 50% 52%, rgba(155,231,255,0.10) 0%, rgba(155,231,255,0.03) 38%, transparent 70%)",
        }}
      />

      {/* floating dust */}
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        {DUST.map((d, i) => (
          <circle
            key={i}
            cx={d.x + Math.sin((frame / durationInFrames) * Math.PI * 2 + d.ph) * d.drift}
            cy={d.y - ((frame / durationInFrames) * d.drift * 3) % H}
            r={d.r}
            fill={WHITE}
            opacity={0.12 + 0.12 * Math.sin(frame / 12 + d.ph)}
          />
        ))}
      </svg>

      {/* ============ LOADING UI ============ */}
      <Interactive.Div
        name="Loader"
        style={{
          position: "absolute",
          inset: 0,
          opacity: uiIn * (1 - uiOut),
          scale: 1 - 0.06 * uiOut,
          translate: `0px ${-10 * uiOut}px`,
        }}
      >
        <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
          <rect
            x={BAR_X}
            y={BAR_Y}
            width={BAR_W}
            height={BAR_H}
            fill="rgba(255,255,255,0.04)"
            stroke={WHITE}
            strokeWidth={3}
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - frameDraw}
          />
          <rect
            x={BAR_X + PAD}
            y={BAR_Y + PAD}
            width={Math.max(0, fillW)}
            height={BAR_H - PAD * 2}
            fill={done > 0 ? WHITE : CYAN}
            style={{ filter: `drop-shadow(0 0 ${6 + flash * 18}px ${CYAN})` }}
          />
          {/* shimmer travelling on the fill */}
          {progress > 0.02 && done === 0 && (
            <rect
              x={BAR_X + PAD + ((frame * 9) % Math.max(20, fillW + 40)) - 40}
              y={BAR_Y + PAD}
              width={26}
              height={BAR_H - PAD * 2}
              fill="white"
              opacity={0.35}
              clipPath="inset(0)"
              style={{ mixBlendMode: "overlay" }}
            />
          )}
        </svg>

        {/* percentage bubble that follows the fill */}
        <div
          style={{
            position: "absolute",
            left: bubbleX - 46,
            top: BAR_Y - 74 + (stalling ? Math.sin(frame * 1.4) * 2 : 0) - 8 * done,
            width: 92,
            height: 48,
            opacity: frameDraw,
            scale: 1 + 0.16 * flash,
          }}
        >
          <svg width={92} height={64} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
            <path
              d="M 8 1.5 H 84 a 6.5 6.5 0 0 1 6.5 6.5 V 40 a 6.5 6.5 0 0 1 -6.5 6.5 H 56 L 46 60 L 36 46.5 H 8 a 6.5 6.5 0 0 1 -6.5 -6.5 V 8 a 6.5 6.5 0 0 1 6.5 -6.5 Z"
              fill={BG}
              stroke={WHITE}
              strokeWidth={3}
              strokeLinejoin="round"
            />
          </svg>
          <div
            style={{
              position: "absolute",
              inset: 0,
              height: 46,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "Oswald",
              fontWeight: 600,
              fontSize: 30,
              color: WHITE,
              letterSpacing: 0.5,
            }}
          >
            {pct}%
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: BAR_Y + BAR_H + 26,
            textAlign: "center",
            fontFamily: "Inter",
            fontWeight: 500,
            fontSize: 26,
            letterSpacing: 1,
            color: "#8FA3A8",
            opacity: 1 - done * 0.6,
          }}
        >
          Loading<span style={{ display: "inline-block", width: 130, textAlign: "left" }}>{dots}</span>
        </div>
      </Interactive.Div>

      {/* ============ PLAY ============ */}
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        {/* click ripples */}
        {[0, 1].map((i) => {
          const p = Math.max(0, Math.min(1, rippleP * 1.2 - i * 0.2));
          return (
            <circle
              key={i}
              cx={512}
              cy={256}
              r={50 + p * 190}
              fill="none"
              stroke={WHITE}
              strokeWidth={3 * (1 - p) + 0.5}
              opacity={rippleP > 0 ? (1 - p) * 0.7 : 0}
            />
          );
        })}
        <g
          transform={`translate(512 256) scale(${triScale}) translate(-512 -256)`}
          style={{ filter: `drop-shadow(0 0 ${triGlow}px rgba(155,231,255,0.7))` }}
        >
          <polygon
            points="486,206 486,306 574,256"
            fill={WHITE}
            stroke={WHITE}
            strokeWidth={14}
            strokeLinejoin="round"
          />
        </g>
      </svg>

      {/* ============ CURSOR ============ */}
      <svg
        width={44}
        height={44}
        viewBox="0 0 24 24"
        style={{
          position: "absolute",
          left: cx + idle,
          top: cy,
          opacity: cursorOpacity,
          scale: cursorScale,
          transformOrigin: "3px 2px",
          filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.6))",
          overflow: "visible",
        }}
      >
        <path
          d="M3 2 L3 19 L7.6 14.8 L10.7 21.6 L13.4 20.4 L10.3 13.7 L16.6 13.5 Z"
          fill={WHITE}
          stroke="#111"
          strokeWidth={1.4}
          strokeLinejoin="round"
        />
      </svg>

      <AbsoluteFill style={{ background: WHITE, opacity: whiteFlood }} />
      <AbsoluteFill
        style={{
          background: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 120%)",
          opacity: 1 - whiteFlood,
        }}
      />
    </AbsoluteFill>
  );
};
