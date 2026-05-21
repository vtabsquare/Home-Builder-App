import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface SceneLightingProps {
  isNight?: boolean;
  hideRoof?: boolean;
}

/**
 * Cinematic lighting system:
 * - Day: Warm directional sun + cool sky fill + bounce light
 * - Night: Cool moonlight + warm artificial practicals
 */
export const SceneLighting = ({ isNight = false, hideRoof = false }: SceneLightingProps) => {
  const sunRef = useRef<THREE.DirectionalLight>(null);

  // Subtle sun sway
  useFrame(({ clock }) => {
    if (!sunRef.current || isNight) return;
    const t = clock.getElapsedTime() * 0.04;
    sunRef.current.position.set(
      18 + Math.sin(t) * 1.5,
      28 + Math.sin(t * 0.7) * 1.0,
      16 + Math.cos(t * 0.5) * 1.0,
    );
  });

  return (
    <>
      {isNight ? (
        <>
          {/* Cool moonlight — primary key */}
          <directionalLight
            position={[-18, 30, -12]}
            intensity={0.55}
            color="#c8d8f0"
            castShadow
            shadow-mapSize={[4096, 4096]}
            shadow-camera-near={0.5}
            shadow-camera-far={300}
            shadow-camera-left={-80}
            shadow-camera-right={80}
            shadow-camera-top={80}
            shadow-camera-bottom={-80}
            shadow-bias={-0.0008}
            shadow-normalBias={0.04}
          />

          {/* Warm artificial fill — streetlight/window warmth */}
          <directionalLight
            position={[20, 8, 18]}
            intensity={0.18}
            color="#ff9944"
          />

          {/* Ambient — very dark blue night sky */}
          <ambientLight intensity={0.06} color="#0a1430" />

          {/* Subtle rim light for silhouette separation */}
          <directionalLight
            position={[-25, 15, 25]}
            intensity={0.12}
            color="#8090c0"
          />

          {/* Ground bounce — very subtle uplight */}
          <hemisphereLight
            color="#1a2540"
            groundColor="#0a0e06"
            intensity={0.08}
          />

          {/* Warm interior glow through windows (when roof hidden) */}
          {hideRoof && (
            <>
              <pointLight position={[0, 8, 0]} intensity={2.5} distance={40} color="#ffcc80" decay={2} />
              <pointLight position={[8, 8, 8]} intensity={1.8} distance={30} color="#ffd090" decay={2} />
              <pointLight position={[-8, 8, -8]} intensity={1.8} distance={30} color="#ffc870" decay={2} />
            </>
          )}

          {/* Area lights simulating window light spill */}
          <rectAreaLight
            position={[0, 6, 12]}
            rotation={[0, Math.PI, 0]}
            width={8}
            height={4}
            intensity={3}
            color="#ffb860"
          />
        </>
      ) : (
        <>
          {/* PRIMARY — Warm golden sun (key light) */}
          <directionalLight
            ref={sunRef}
            position={[18, 28, 16]}
            intensity={2.2}
            color="#fff8e8"
            castShadow
            shadow-mapSize={[4096, 4096]}
            shadow-camera-near={0.5}
            shadow-camera-far={300}
            shadow-camera-left={-80}
            shadow-camera-right={80}
            shadow-camera-top={80}
            shadow-camera-bottom={-80}
            shadow-bias={-0.0006}
            shadow-normalBias={0.035}
            shadow-radius={2}
          />

          {/* FILL — Cool sky blue (opposite side) */}
          <directionalLight
            position={[-22, 20, -18]}
            intensity={0.55}
            color="#c0d4f0"
          />

          {/* BACK / RIM — Warm sunset edge glow */}
          <directionalLight
            position={[-12, 12, 25]}
            intensity={0.35}
            color="#ffd8a8"
          />

          {/* SKY BOUNCE — Soft overhead blue */}
          <hemisphereLight
            color="#b0cce8"
            groundColor="#7a9060"
            intensity={0.7}
          />

          {/* GROUND BOUNCE — Warm reflected grass */}
          <directionalLight
            position={[0, -10, 0]}
            intensity={0.18}
            color="#c8e0a0"
          />

          {/* Ambient fill — prevent completely black shadows */}
          <ambientLight intensity={0.15} color="#e8f0f8" />

          {/* Interior fill when viewing inside */}
          {hideRoof && (
            <>
              <pointLight position={[0, 10, 0]} intensity={1.8} distance={50} color="#fff8e0" decay={1.5} />
              <pointLight position={[12, 10, 12]} intensity={1.2} distance={35} color="#ffe8c8" decay={1.8} />
              <pointLight position={[-12, 10, -12]} intensity={1.2} distance={35} color="#ffe8c8" decay={1.8} />
            </>
          )}

          {/* Area light for soft shadow fill */}
          <rectAreaLight
            position={[0, 20, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            width={60}
            height={60}
            intensity={0.4}
            color="#c8d8f0"
          />
        </>
      )}
    </>
  );
};