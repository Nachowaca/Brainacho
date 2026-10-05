import React from "react";
import { interpolate, random, spring, useCurrentFrame, useVideoConfig } from "remotion";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#&?";
const TILE_W = 104;
const TILE_H = 150;
const GAP = 8;

type Props = {
  readonly text: string;
  readonly enterAt: number;
  readonly settleAt: number;
  readonly leaveAt: number;
  readonly top: number;
};

// Airport-board style word: tiles drop in, scramble, then flip onto each letter.
export const SplitFlap: React.FC<Props> = ({ text, enterAt, settleAt, leaveAt, top }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const letters = text.split("");
  const total = letters.length * TILE_W + (letters.length - 1) * GAP;

  return (
    <div
      style={{
        position: "absolute",
        top,
        left: (width - total) / 2,
        display: "flex",
        gap: GAP,
      }}
    >
      {letters.map((letter, i) => {
        const enter = enterAt + i * 3;
        const settle = settleAt + i * 5;
        const leave = leaveAt + i * 3;
        const enterP = spring({ frame: frame - enter, fps, config: { damping: 12, stiffness: 150 } });
        const exitP = interpolate(frame, [leave + 8, leave + 18], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const scrambling = frame < settle || frame >= leave;
        const char = scrambling
          ? CHARS[Math.floor(random(`c${i}-${Math.floor(frame / 2)}`) * CHARS.length)]
          : letter;
        const settleP = spring({ frame: frame - settle, fps, config: { damping: 10, stiffness: 200 } });
        const flip = scrambling ? (frame % 2 === 0 ? -60 : -18) : interpolate(settleP, [0, 1], [-90, 0]);

        return (
          <div
            key={i}
            style={{
              width: TILE_W,
              height: TILE_H,
              borderRadius: 14,
              background: "linear-gradient(#123E85 0 50%, #0A2F6B 50% 100%)",
              boxShadow: "0 10px 0 rgba(6,30,70,0.55)",
              position: "relative",
              perspective: 400,
              opacity: Math.min(1, enterP * 2) * (1 - exitP),
              translate: `0px ${interpolate(enterP, [0, 1], [320, 0]) + exitP * 360}px`,
              rotate: `${exitP * (i % 2 ? 25 : -25)}deg`,
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "Bungee",
                fontSize: 108,
                color: scrambling ? "#9DC6F5" : "#FFD23F",
                transform: `rotateX(${flip}deg)`,
                transformOrigin: "50% 50%",
              }}
            >
              {char}
            </div>
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: TILE_H / 2 - 2,
                height: 4,
                background: "#061E46",
              }}
            />
          </div>
        );
      })}
    </div>
  );
};
