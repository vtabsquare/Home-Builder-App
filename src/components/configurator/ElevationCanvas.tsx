import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import { Suspense, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Plan } from '@/lib/floorplan';
import { Material, RoofType } from '@/store/configurator';

interface Props {
  plan: Plan;
  roof: RoofType;
  material: Material;
}

const MATERIAL_COLORS: Record<Material, { wall: string; trim: string; roof: string }> = {
  budget: { wall: '#e7decf', trim: '#8a8478', roof: '#4a4a4a' },
  modern: { wall: '#f0ebe3', trim: '#1a1a1a', roof: '#2c2c2c' },
  luxury: { wall: '#1f1d1a', trim: '#c9a84c', roof: '#0d0d0d' },
};

export const ElevationCanvas = ({ plan, roof, material }: Props) => {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl bg-gradient-to-b from-[hsl(33,30%,82%)] to-[hsl(33,25%,68%)]">
      <Canvas
        shadows
        camera={{ position: [40, 22, 40], fov: 38 }}
        dpr={[1, 1.6]}
        gl={{ antialias: true }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.55} />
          <directionalLight
            position={[20, 30, 15]}
            intensity={1.4}
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
            shadow-camera-left={-40}
            shadow-camera-right={40}
            shadow-camera-top={40}
            shadow-camera-bottom={-40}
          />
          <Environment preset="sunset" />
          <Ground />
          <House plan={plan} roof={roof} material={material} />
          <ContactShadows position={[0, 0.01, 0]} opacity={0.45} scale={80} blur={2.4} far={20} />
          <OrbitControls
            enablePan={false}
            minDistance={25}
            maxDistance={80}
            minPolarAngle={Math.PI / 6}
            maxPolarAngle={Math.PI / 2.2}
            autoRotate
            autoRotateSpeed={0.6}
          />
        </Suspense>
      </Canvas>
    </div>
  );
};

const Ground = () => (
  <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
    <planeGeometry args={[200, 200]} />
    <meshStandardMaterial color="#d8cdb8" roughness={1} />
  </mesh>
);

const House = ({ plan, roof, material }: { plan: Plan; roof: RoofType; material: Material }) => {
  const ref = useRef<THREE.Group>(null);
  const colors = MATERIAL_COLORS[material];

  // Center the model
  const W = plan.width;
  const D = plan.height;
  const wallH = 10;

  // Window positions auto-placed along front wall
  const windows = useMemo(() => {
    const arr: { x: number; y: number; w: number; h: number }[] = [];
    const step = Math.max(7, W / Math.ceil(W / 8));
    for (let x = step / 2; x < W; x += step) {
      arr.push({ x: x - W / 2, y: 4.5, w: 3, h: 3 });
    }
    return arr;
  }, [W]);

  return (
    <group ref={ref} position={[0, 0, 0]}>
      {/* Body */}
      <mesh castShadow receiveShadow position={[0, wallH / 2, 0]}>
        <boxGeometry args={[W, wallH, D]} />
        <meshStandardMaterial color={colors.wall} roughness={0.85} />
      </mesh>

      {/* Trim base */}
      <mesh position={[0, 0.4, 0]}>
        <boxGeometry args={[W + 0.4, 0.8, D + 0.4]} />
        <meshStandardMaterial color={colors.trim} roughness={0.6} />
      </mesh>

      {/* Roof */}
      {roof === 'gable' ? (
        <group position={[0, wallH, 0]}>
          <mesh castShadow rotation={[0, 0, 0]}>
            <coneGeometry args={[Math.max(W, D) * 0.72, 6, 4, 1]} />
            <meshStandardMaterial color={colors.roof} roughness={0.7} />
          </mesh>
        </group>
      ) : (
        <mesh castShadow position={[0, wallH + 0.4, 0]}>
          <boxGeometry args={[W + 1, 0.8, D + 1]} />
          <meshStandardMaterial color={colors.roof} roughness={0.7} />
        </mesh>
      )}

      {/* Door (front, +Z face) */}
      <mesh position={[0, 3.5, D / 2 + 0.05]}>
        <boxGeometry args={[3, 7, 0.2]} />
        <meshStandardMaterial color={colors.trim} roughness={0.4} metalness={0.2} />
      </mesh>

      {/* Windows on the front wall */}
      {windows.map((w, i) => (
        <mesh key={i} position={[w.x, w.y, D / 2 + 0.06]}>
          <boxGeometry args={[w.w, w.h, 0.1]} />
          <meshStandardMaterial color="#9ec3d4" emissive="#dbe9f0" emissiveIntensity={0.35} roughness={0.1} metalness={0.3} />
        </mesh>
      ))}
    </group>
  );
};
