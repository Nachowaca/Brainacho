import React from "react";
import {
  AbsoluteFill,
  Interactive,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont } from "@remotion/fonts";
import { Background } from "./Background";

loadFont({ family: "Bungee", url: staticFile("Bungee.woff2") });

const CREAM = "#FFF4D6";
const YELLOW = "#FFD23F";

type WordProps = {
  readonly text: string;
  readonly start: number;
  readonly stagger: number;
  readonly size: number;
  readonly color: string;
  readonly shadow: string;
};

const Word: React.FC<WordProps> = ({ text, start, stagger, size, color, shadow }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / durationInFrames;

  return (
    <div style={{ display: "flex", justifyContent: "center", fontFamily: "Bungee", fontSize: size, lineHeight: 1.05 }}>
      {text.split("").map((ch, i) => {
        const p = spring({
          frame: frame - start - i * stagger,
          fps,
          config: { damping: 9, stiffness: 140, mass: 0.7 },
        });
        const wave = Math.sin(t * Math.PI * 2 * 4 - i * 0.7) * 10 * Math.min(1, p);
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              color,
              textShadow: shadow,
              opacity: interpolate(p, [0, 0.25], [0, 1], { extrapolateRight: "clamp" }),
              translate: `0px ${interpolate(p, [0, 1], [-420, 0]) + wave}px`,
              rotate: `${interpolate(p, [0, 1], [i % 2 ? 70 : -70, 0])}deg`,
              scale: interpolate(p, [0, 1], [0.2, 1]),
            }}
          >
            {ch}
          </span>
        );
      })}
    </div>
  );
};

export const PruebaScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const beat = Math.exp(-(frame % 15) / 4) * 0.035;
  const reveal = interpolate(frame, [0, 28], [0, 1900], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });
  const pill = spring({ frame: frame - 48, fps, config: { damping: 11, stiffness: 160 } });
  const squiggle = interpolate(frame, [100, 135], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });
  const sub = interpolate(frame, [150, 175], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: CREAM }}>
      <AbsoluteFill style={{ clipPath: `circle(${reveal}px at 50% 50%)` }}>
        <Background />

        <Interactive.Div
          name="Titulo"
          style={{
            position: "absolute",
            top: height * 0.5 - 270,
            left: 0,
            right: 0,
            scale: 1 + beat,
          }}
        >
          <Word
            text="PRUEBA"
            start={22}
            stagger={4}
            size={220}
            color={CREAM}
            shadow="0 10px 0 #0E3F7E, 0 22px 0 rgba(14,63,126,0.35)"
          />
          <div style={{ display: "flex", justifyContent: "center", margin: "10px 0" }}>
            <div
              style={{
                scale: pill,
                rotate: `${interpolate(pill, [0, 1], [-30, -4])}deg`,
                background: YELLOW,
                color: "#0E3F7E",
                fontFamily: "Bungee",
                fontSize: 80,
                padding: "6px 44px",
                borderRadius: 24,
                boxShadow: "0 8px 0 #0E3F7E",
              }}
            >
              DE
            </div>
          </div>
          <Word
            text="ANIMACIÓN"
            start={58}
            stagger={3}
            size={136}
            color={YELLOW}
            shadow="0 8px 0 #0E3F7E, 0 18px 0 rgba(14,63,126,0.35)"
          />
          <svg width={width} height={80} style={{ display: "block", marginTop: 6 }}>
            <path
              d="M 170 40 Q 215 0 260 40 T 350 40 T 440 40 T 530 40 T 620 40 T 710 40 T 800 40 T 910 40"
              fill="none"
              stroke={CREAM}
              strokeWidth={14}
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1 - squiggle}
            />
          </svg>
        </Interactive.Div>

        <Interactive.Div
          name="Subtitulo"
          style={{
            position: "absolute",
            bottom: 90,
            left: 0,
            right: 0,
            textAlign: "center",
            fontFamily: "Bungee",
            fontSize: 48,
            color: CREAM,
            opacity: sub,
            translate: `0px ${interpolate(sub, [0, 1], [30, 0])}px`,
            letterSpacing: 3,
          }}
        >
          HECHO CON CÓDIGO · REMOTION
        </Interactive.Div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
