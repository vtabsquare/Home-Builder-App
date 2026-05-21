import { Sky, Stars, Environment, Cloud, Clouds } from '@react-three/drei';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createGrassTexture, createGrassNormal, createConcreteTexture } from './materials';

export const SkyEnvironment = ({ isNight }: { isNight?: boolean }) => {
  return (
    <>
      {isNight ? (
        <>
          <color attach="background" args={['#04080f']} />
          <Stars
            radius={120}
            depth={60}
            count={8000}
            factor={5}
            saturation={0.1}
            fade
            speed={0.4}
          />
          {/* Moon glow */}
          <Sky
            distance={450000}
            sunPosition={[0, -1, 0]}
            inclination={0.62}
            azimuth={0.12}
            mieCoefficient={0.004}
            mieDirectionalG={0.07}
            rayleigh={3.5}
            turbidity={12}
          />
          <Environment
            preset="night"
            background={false}
            blur={0.6}
          />
          {/* Distant city ambient */}
          <hemisphereLight
            color="#1a2a4a"
            groundColor="#050810"
            intensity={0.18}
          />
        </>
      ) : (
        <>
          <color attach="background" args={['#c8d8ea']} />
          {/* Golden-hour / mid-day sky */}
          <Sky
            distance={450000}
            sunPosition={[8, 18, 12]}
            inclination={0.48}
            azimuth={0.22}
            mieCoefficient={0.004}
            mieDirectionalG={0.82}
            rayleigh={1.8}
            turbidity={6}
          />
          {/* Photorealistic HDRI environment for reflections */}
          <Environment
            preset="apartment"
            background={false}
            blur={0.3}
          />
          {/* Sky hemisphere */}
          <hemisphereLight
            color="#b4c8e8"
            groundColor="#8a9a7a"
            intensity={0.55}
          />
          {/* Volumetric cloud layer */}
          <Clouds
            material={THREE.MeshLambertMaterial}
            limit={400}
            range={200}
          >
            <Cloud
              segments={30}
              bounds={[80, 8, 80]}
              volume={12}
              color="#ffffff"
              fade={80}
              speed={0.12}
              opacity={0.55}
              position={[60, 60, -80]}
            />
            <Cloud
              segments={20}
              bounds={[60, 6, 60]}
              volume={8}
              color="#f0f4f8"
              fade={70}
              speed={0.08}
              opacity={0.4}
              position={[-80, 65, -60]}
            />
            <Cloud
              segments={15}
              bounds={[50, 5, 50]}
              volume={6}
              color="#e8eef4"
              fade={60}
              speed={0.15}
              opacity={0.3}
              position={[0, 58, -100]}
            />
          </Clouds>
        </>
      )}
    </>
  );
};

/* ── Animated ambient dust motes (day only) ── */
const DustMotes = () => {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(300 * 3);
    for (let i = 0; i < 300; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 60;
      arr[i * 3 + 1] = Math.random() * 20;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 60;
    }
    return arr;
  }, []);

  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.rotation.y += delta * 0.005;
    const pos = ref.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < 300; i++) {
      pos[i * 3 + 1] += delta * (0.02 + Math.sin(i) * 0.01);
      if (pos[i * 3 + 1] > 20) pos[i * 3 + 1] = 0;
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        color="#ffe8c0"
        transparent
        opacity={0.35}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
};

export const EnhancedGround = ({ isNight }: { isNight?: boolean }) => {
  const grassMap = useMemo(() => createGrassTexture(40, 40), []);
  const grassNormal = useMemo(() => createGrassNormal(40, 40), []);
  const distantMap = useMemo(() => createGrassTexture(160, 160), []);

  /* Sidewalk/pavement strip near plot edges */
  const pavementMap = useMemo(() => createConcreteTexture(6, 6), []);

  return (
    <group>
      {/* Deep soil base — ensures no gaps */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.12, 0]}>
        <circleGeometry args={[2500, 32]} />
        <meshStandardMaterial color={isNight ? '#0a0e08' : '#1a2a12'} roughness={1} />
      </mesh>

      {/* Outer meadow / fields */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.09, 0]}>
        <circleGeometry args={[2400, 96]} />
        <meshStandardMaterial
          map={distantMap}
          color={isNight ? '#0c1408' : '#d8e2cc'}
          roughness={1}
          envMapIntensity={0.2}
        />
      </mesh>

      {/* Primary lawn — textured high-res grass */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]}>
        <circleGeometry args={[180, 72]} />
        <meshStandardMaterial
          map={grassMap}
          normalMap={grassNormal}
          normalScale={new THREE.Vector2(0.8, 0.8)}
          color={isNight ? '#161e12' : '#f5fff0'}
          roughness={0.97}
          envMapIntensity={0.15}
        />
      </mesh>

      {/* Surrounding road / pavement ring */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.06, 0]}>
        <ringGeometry args={[178, 230, 96]} />
        <meshStandardMaterial
          map={pavementMap}
          color={isNight ? '#1a1c1a' : '#b8b8b0'}
          roughness={0.95}
          envMapIntensity={0.05}
        />
      </mesh>

      {/* Water puddle reflections (night mode) */}
      {isNight && (
        <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[8, -0.02, 12]}>
          <circleGeometry args={[3.5, 24]} />
          <meshStandardMaterial
            color="#0a1428"
            roughness={0.02}
            metalness={0.95}
            envMapIntensity={2.5}
            transparent
            opacity={0.75}
          />
        </mesh>
      )}

      {/* Dust motes in day mode */}
      {!isNight && <DustMotes />}

      {/* Atmospheric distance fog */}
      <fog
        attach="fog"
        args={[
          isNight ? '#04080f' : '#c8d8ea',
          isNight ? 180 : 260,
          isNight ? 900 : 1600,
        ]}
      />
    </group>
  );
};