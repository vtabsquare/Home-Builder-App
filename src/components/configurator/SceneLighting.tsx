import { useRef } from 'react';
import * as THREE from 'three';

export const SceneLighting = ({ isNight, hideRoof }: { isNight?: boolean; hideRoof?: boolean }) => {
  const sunRef = useRef<THREE.DirectionalLight>(null!);

  return (
    <>
      {isNight ? (
        <>
          {/* Night sky ambient */}
          <ambientLight intensity={0.18} color="#1a2a4a" />
          {/* Cool moon */}
          <directionalLight
            position={[8, 24, 12]}
            intensity={0.45}
            color="#bcc8ee"
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-camera-left={-60}
            shadow-camera-right={60}
            shadow-camera-top={60}
            shadow-camera-bottom={-60}
            shadow-radius={6}
            shadow-bias={-0.0001}
          />
          {/* Sky bounce */}
          <hemisphereLight intensity={0.12} color="#1a2a4a" groundColor="#0a0a0a" />
        </>
      ) : (
        <>
          {/* Warm 4500K sun — directional, soft shadows */}
          <directionalLight
            ref={sunRef}
            position={[28, 56, 22]}
            intensity={2.2}
            color="#fff1d4"
            castShadow
            shadow-mapSize-width={4096}
            shadow-mapSize-height={4096}
            shadow-camera-left={-70}
            shadow-camera-right={70}
            shadow-camera-top={70}
            shadow-camera-bottom={-70}
            shadow-radius={8}
            shadow-bias={-0.0001}
            shadow-normalBias={0.04}
          />
          {/* Warm sky bounce */}
          <hemisphereLight intensity={0.42} color="#fff5e6" groundColor="#a3b89a" />
          {/* Cool fill from opposite side for shape definition */}
          <directionalLight position={[-30, 30, -20]} intensity={0.35} color="#bdd6e8" />
          {/* Subtle warm bounce ambient */}
          <ambientLight intensity={0.18} color="#fff3e0" />
        </>
      )}

      {/* Interior visibility lighting (when room is selected) */}
      {hideRoof && (
        <group>
          {/* Soft top “skylight” so interiors aren’t flat */}
          <rectAreaLight
            position={[0, 26, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            width={70}
            height={70}
            intensity={isNight ? 0.6 : 1.6}
            color={isNight ? '#aac0ff' : '#fff2dc'}
          />
          <ambientLight intensity={isNight ? 0.25 : 0.35} color={isNight ? '#3a4870' : '#fff4e2'} />
        </group>
      )}
    </>
  );
};
