import { Sky, Stars, Environment } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';
import { createGrassTexture, createGrassNormal } from './materials';

export const SkyEnvironment = ({ isNight }: { isNight?: boolean }) => {
  return (
    <>
      {isNight ? (
        <>
          <color attach="background" args={['#050505']} />
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
          <Sky 
            distance={450000} 
            sunPosition={[0, -1, 0]} 
            inclination={0.6} 
            azimuth={0.1} 
            mieCoefficient={0.005}
            mieDirectionalG={0.07}
            rayleigh={3}
            turbidity={10}
          />
          <Environment preset="night" />
        </>
      ) : (
        <>
          <color attach="background" args={['#d9e4ee']} />
          <Sky 
            distance={450000} 
            sunPosition={[10, 20, 10]} 
            inclination={0.5} 
            azimuth={0.25} 
            mieCoefficient={0.005}
            mieDirectionalG={0.8}
            rayleigh={2}
            turbidity={8}
          />
          <Environment preset="city" />
        </>
      )}
    </>
  );
};

export const EnhancedGround = ({ isNight }: { isNight?: boolean }) => {
  const grassMap = useMemo(() => createGrassTexture(40, 40), []);
  const grassNormal = useMemo(() => createGrassNormal(40, 40), []);
  const distantMap = useMemo(() => createGrassTexture(160, 160), []);

  return (
    <group>
      {/* Primary Lawn — textured manicured grass with bump */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]}>
        <circleGeometry args={[180, 64]} />
        <meshStandardMaterial
          map={grassMap}
          normalMap={grassNormal}
          normalScale={new THREE.Vector2(0.7, 0.7)}
          color={isNight ? '#1a261a' : '#ffffff'}
          roughness={0.95}
        />
      </mesh>

      {/* Outer meadow / fields — same grass texture, larger tile, slightly cooler */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
        <circleGeometry args={[2400, 96]} />
        <meshStandardMaterial
          map={distantMap}
          color={isNight ? '#0e1810' : '#dee5d6'}
          roughness={1}
        />
      </mesh>

      {/* Atmospheric fog — soft warm haze at distance */}
      <fog attach="fog" args={[isNight ? '#0a1020' : '#e9eed9', 220, 1400]} />
    </group>
  );
};
