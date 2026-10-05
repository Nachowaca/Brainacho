import React from "react";

type BeetleProps = {
  readonly bodyColor: string;
  readonly wheelSpin: number;
};

const CHROME = "#e8e4d8";
const GLASS = "#8fb5bd";

const Wheel: React.FC<{
  readonly position: [number, number, number];
  readonly spin: number;
  readonly side: 1 | -1;
}> = ({ position, spin, side }) => {
  return (
    <group position={position}>
      <group rotation={[0, 0, -spin]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.4, 0.4, 0.3, 32]} />
          <meshStandardMaterial color="#141414" roughness={0.9} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, side * 0.01]}>
          <cylinderGeometry args={[0.3, 0.3, 0.31, 32]} />
          <meshStandardMaterial color="#f3ead2" roughness={0.6} />
        </mesh>
        <mesh
          rotation={[Math.PI / 2, 0, 0]}
          position={[0, 0, side * 0.04]}
        >
          <cylinderGeometry args={[0.2, 0.2, 0.31, 32]} />
          <meshStandardMaterial color={CHROME} metalness={0.3} roughness={0.25} emissive="#9a968a" emissiveIntensity={0.35} />
        </mesh>
        {/* hubcap pins so the spin reads */}
        {[0, 1, 2, 3].map((i) => (
          <mesh
            key={i}
            position={[
              Math.cos((i * Math.PI) / 2) * 0.26,
              Math.sin((i * Math.PI) / 2) * 0.26,
              side * 0.16,
            ]}
          >
            <sphereGeometry args={[0.03, 12, 12]} />
            <meshStandardMaterial color="#888" metalness={1} roughness={0.3} />
          </mesh>
        ))}
      </group>
    </group>
  );
};

export const Beetle: React.FC<BeetleProps> = ({ bodyColor, wheelSpin }) => {
  const paint = (
    <meshStandardMaterial
      color={bodyColor}
      metalness={0.35}
      roughness={0.28}
    />
  );

  return (
    <group>
      {/* lower body */}
      <mesh position={[0, 0.72, 0]} scale={[2.05, 0.55, 0.82]} castShadow>
        <sphereGeometry args={[1, 64, 48]} />
        {paint}
      </mesh>
      {/* floor pan */}
      <mesh position={[0, 0.34, 0]} castShadow>
        <boxGeometry args={[3.5, 0.2, 1.3]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
      </mesh>

      {/* cabin: glass dome + painted roof cap */}
      <mesh position={[-0.2, 1.2, 0]} scale={[1.15, 0.58, 0.68]} castShadow>
        <sphereGeometry args={[1, 48, 32]} />
        <meshStandardMaterial color={GLASS} metalness={0.1} roughness={0.12} emissive="#2c4a52" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[-0.2, 1.2, 0]} scale={[1.17, 0.6, 0.7]} castShadow>
        <sphereGeometry args={[1, 48, 32, 0, Math.PI * 2, 0, 0.7]} />
        {paint}
      </mesh>

      {/* fenders */}
      {[1, -1].map((z) =>
        [
          { x: 1.32, s: [0.62, 0.36, 0.3] as const },
          { x: -1.3, s: [0.74, 0.4, 0.3] as const },
        ].map((f) => (
          <mesh
            key={`${z}${f.x}`}
            position={[f.x, 0.66, z * 0.62]}
            scale={[f.s[0], f.s[1], f.s[2]]}
            castShadow
          >
            <sphereGeometry args={[1, 32, 24]} />
            {paint}
          </mesh>
        )),
      )}

      {/* wheels */}
      <Wheel position={[1.32, 0.4, 0.8]} spin={wheelSpin} side={1} />
      <Wheel position={[1.32, 0.4, -0.8]} spin={wheelSpin} side={-1} />
      <Wheel position={[-1.3, 0.4, 0.8]} spin={wheelSpin} side={1} />
      <Wheel position={[-1.3, 0.4, -0.8]} spin={wheelSpin} side={-1} />

      {/* headlights */}
      {[1, -1].map((z) => (
        <mesh
          key={`h${z}`}
          position={[1.66, 0.98, z * 0.5]}
          scale={[0.65, 1, 1]}
        >
          <sphereGeometry args={[0.17, 24, 24]} />
          <meshStandardMaterial
            color="#fff6cf"
            emissive="#ffe9a0"
            emissiveIntensity={0.9}
          />
        </mesh>
      ))}
      {/* tail lights */}
      {[1, -1].map((z) => (
        <mesh
          key={`t${z}`}
          position={[-1.82, 0.88, z * 0.45]}
          scale={[0.5, 1, 1]}
        >
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshStandardMaterial
            color="#c1272d"
            emissive="#c1272d"
            emissiveIntensity={0.6}
          />
        </mesh>
      ))}

      {/* bumpers */}
      {[1.92, -1.92].map((x) => (
        <mesh
          key={`b${x}`}
          position={[x, 0.48, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          castShadow
        >
          <capsuleGeometry args={[0.055, 1.3, 8, 16]} />
          <meshStandardMaterial color={CHROME} metalness={0.3} roughness={0.25} emissive="#9a968a" emissiveIntensity={0.35} />
        </mesh>
      ))}
    </group>
  );
};
