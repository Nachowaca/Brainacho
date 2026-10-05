import React from "react";
import { AbsoluteFill, Interactive, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { loadFont } from "@remotion/fonts";
import { Beetle } from "./Beetle";
import { VintageBackground } from "./VintageBackground";

const fontFamily = "Bungee";

loadFont({ family: fontFamily, url: staticFile("Bungee.woff2") });

export type FuscaProps = {
  readonly title: string;
  readonly subtitle: string;
  readonly carColor: string;
  readonly backgroundColor: string;
};

export const FuscaScene: React.FC<FuscaProps> = ({
  title,
  subtitle,
  carColor,
  backgroundColor,
}) => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();
  const t = frame / durationInFrames;

  const turn = t * Math.PI * 2 + Math.PI * 0.25;
  const bounce = Math.sin(t * Math.PI * 2 * 6) * 0.015;

  return (
    <AbsoluteFill style={{ filter: "sepia(0.18) contrast(1.06) saturate(0.92)" }}>
      <VintageBackground baseColor={backgroundColor} rayColor="#fff1c4" />

      <Interactive.Div
        name="Title"
        style={{
          position: "absolute",
          top: 180,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily,
          fontSize: 260,
          lineHeight: 1,
          color: "#f3ead2",
          textShadow: "0 10px 0 #7a2e12, 0 20px 0 rgba(40,12,4,0.35)",
          letterSpacing: 6,
        }}
      >
        {title}
      </Interactive.Div>

      <ThreeCanvas
        width={width}
        height={height}
        shadows
        camera={{ position: [0, 4.4, 16.5], fov: 30 }}
      >
        <ambientLight intensity={0.7} />
        <hemisphereLight args={["#fff1d0", "#7a3b1a", 0.9]} />
        <directionalLight
          position={[5, 9, 6]}
          intensity={2.2}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-5}
          shadow-camera-right={5}
          shadow-camera-top={5}
          shadow-camera-bottom={-5}
        />
        <pointLight position={[-6, 2, -4]} intensity={40} color="#ffb36b" />
        <group position={[0, -1.6, 0]}>
          <group rotation={[0, turn, 0]} position={[0, bounce, 0]}>
            <Beetle bodyColor={carColor} wheelSpin={t * Math.PI * 2 * 3} />
          </group>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]} receiveShadow>
            <planeGeometry args={[20, 20]} />
            <shadowMaterial opacity={0.35} />
          </mesh>
        </group>
      </ThreeCanvas>

      <Interactive.Div
        name="Subtitle"
        style={{
          position: "absolute",
          bottom: 190,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily,
          fontSize: 60,
          color: "#f3ead2",
          letterSpacing: 4,
          textShadow: "0 4px 0 #7a2e12",
        }}
      >
        {subtitle}
      </Interactive.Div>
    </AbsoluteFill>
  );
};
