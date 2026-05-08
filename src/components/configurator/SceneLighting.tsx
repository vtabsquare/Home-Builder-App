import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

export const SceneLighting = ({ isNight, hideRoof }: { isNight?: boolean; hideRoof?: boolean }) => {
  const sunRef = useRef<THREE.DirectionalLight>(null!);

  return (
    <>
      {isNight ? (
        <>
          {/* Night Lighting */}
          <ambientLight intensity={0.15} color="#1a2a4a" />
          <directionalLight
            position={[5, 10, 5]}
            intensity={0.2}
            color="#aabbee"
            castShadow
            shadow-mapSize={[1024, 1024]}
          />
          {/* Moonlight splash */}
          <pointLight position={[-20, 30, -20]} intensity={0.5} distance={100} color="#6688ff" />
          
          {/* Soft fill light */}
          <hemisphereLight intensity={0.1} color="#112244" groundColor="#000000" />
        </>
      ) : (
        <>
          {/* Day Lighting */}
          <ambientLight intensity={0.4} />
          <directionalLight
            ref={sunRef}
            position={[25, 50, 25]}
            intensity={1.5}
            castShadow
            shadow-mapSize={[2048, 2048]}
            shadow-camera-left={-60}
            shadow-camera-right={60}
            shadow-camera-top={60}
            shadow-camera-bottom={-60}
            shadow-bias={-0.0001}
          />
          <hemisphereLight intensity={0.3} color="#ffffff" groundColor="#444444" />
        </>
      )}

      {/* Interior visibility lighting (Global) */}
      {hideRoof && (
        <group>
          <rectAreaLight
            position={[0, 30, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            width={60}
            height={60}
            intensity={0.8}
            color="#ffffff"
          />
          <ambientLight intensity={0.3} />
        </group>
      )}
    </>
  );
};
