import { Sky, Stars, Environment } from '@react-three/drei';
import * as THREE from 'three';

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
          <color attach="background" args={['#87ceeb']} />
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
          <Environment preset="park" />
        </>
      )}
    </>
  );
};

export const EnhancedGround = ({ isNight }: { isNight?: boolean }) => {
  return (
    <group>
      {/* Primary Lawn */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
        <circleGeometry args={[200, 32]} />
        <meshStandardMaterial 
          color={isNight ? '#0a1a0a' : '#2d5a2d'} 
          roughness={1}
        />
      </mesh>
      
      {/* Outer landscape */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
        <circleGeometry args={[500, 32]} />
        <meshStandardMaterial 
          color={isNight ? '#050a05' : '#1e3a1e'} 
          roughness={1}
        />
      </mesh>

      {/* Subtle fog for depth */}
      <fog attach="fog" args={[isNight ? '#050505' : '#87ceeb', 50, 250]} />
    </group>
  );
};
