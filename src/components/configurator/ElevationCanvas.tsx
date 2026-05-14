import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Html } from '@react-three/drei';
import { Suspense, useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { Plan } from '@/lib/floorplan';
import { Material, RoofType, AddOn } from '@/store/configurator';
import { Furniture3D } from './Furniture3D';
import { SceneLighting } from './SceneLighting';
import { SkyEnvironment, EnhancedGround } from './SkyEnvironment';
import {
  createWoodFloorTexture, createWoodFloorNormal, createWoodFloorRoughness,
  createOakFloorTexture, createOakFloorNormal, createOakFloorRoughness,
  createTileTexture, createTileNormal, createTileRoughness,
  createMarbleTexture, createMarbleNormal, createMarbleRoughness,
  createWallTexture, createWallNormal,
  createDoorWoodTexture, createDoorWoodNormal,
} from './materials';

interface Props {
  plan: Plan;
  roof: RoofType;
  material: Material;
  addons?: AddOn[];
  activeRoom?: string | null;
  isDoubleStorey?: boolean;
  firstFloorPlan?: Plan;
  hideHelpers?: boolean;
  isNight?: boolean;
}

const PLOT_PADDING_FT = 2;

/* Locate the main entrance door in world coords (centered on plan).
   Returns { x, z, nx, nz } where (nx, nz) is the outward normal. */
const findMainDoorWorld = (plan: Plan): { x: number; z: number; nx: number; nz: number } | null => {
  const W = plan.width || 0;
  const D = plan.height || 0;
  const candidates: any[] = [];
  for (const room of plan.rooms || []) {
    if (room.type === 'garden' || room.type === 'carport' || room.type === 'balcony' || room.type === 'hallway') continue;
    for (const door of room.doors || []) {
      const isMain = (door as any).label === 'MAIN DOOR' || (!(door as any).connectsTo && (door as any).doorType !== 'open');
      if (!isMain) continue;
      const rel = (door as any).position ?? 0.5;
      let x = 0, z = 0, nx = 0, nz = 0;
      if (door.wall === 'top') { x = room.x + room.w * rel; z = room.y; nz = -1; }
      else if (door.wall === 'bottom') { x = room.x + room.w * rel; z = room.y + room.h; nz = 1; }
      else if (door.wall === 'left') { x = room.x; z = room.y + room.h * rel; nx = -1; }
      else { x = room.x + room.w; z = room.y + room.h * rel; nx = 1; }
      candidates.push({ x: x - W / 2, z: z - D / 2, nx, nz, roomType: room.type });
    }
  }
  // Selection priority: 'hall' > 'living' > others
  return candidates.find(c => c.roomType === 'hall') || candidates.find(c => c.roomType === 'living') || candidates[0] || null;
};

/* Determine which side of the carport opens outward (away from the rest of the house). */
type Side = 'top' | 'bottom' | 'left' | 'right';
const getCarportInfo = (plan: Plan): { cx: number; cz: number; w: number; h: number; side: Side } | null => {
  const c = (plan.rooms || []).find((r: any) => r.type === 'carport');
  if (!c) return null;
  const W = plan.width || 0;
  const D = plan.height || 0;
  const main = (plan.rooms || []).filter((r: any) => r.type !== 'carport' && r.type !== 'garden' && r.type !== 'balcony');
  if (main.length === 0) return null;
  const mMinX = Math.min(...main.map((r: any) => r.x));
  const mMaxX = Math.max(...main.map((r: any) => r.x + r.w));
  const mMinZ = Math.min(...main.map((r: any) => r.y));
  const mMaxZ = Math.max(...main.map((r: any) => r.y + r.h));
  const mcx = (mMinX + mMaxX) / 2;
  const mcz = (mMinZ + mMaxZ) / 2;
  const ccx = c.x + c.w / 2;
  const ccz = c.y + c.h / 2;
  const dx = ccx - mcx;
  const dz = ccz - mcz;
  let side: Side;
  if (Math.abs(dx) > Math.abs(dz)) side = dx > 0 ? 'right' : 'left';
  else side = dz > 0 ? 'bottom' : 'top';
  return { cx: ccx - W / 2, cz: ccz - D / 2, w: c.w, h: c.h, side };
};

/* Rectangle on the ground (XZ plane). */
type Rect = { minX: number; maxX: number; minZ: number; maxZ: number };
const pointInRect = (x: number, z: number, r: Rect, pad = 0) =>
  x >= r.minX - pad && x <= r.maxX + pad && z >= r.minZ - pad && z <= r.maxZ + pad;
const pointInAnyRect = (x: number, z: number, rects: Rect[], pad = 0) => rects.some(r => pointInRect(x, z, r, pad));

const MATERIAL_COLORS: Record<Material, { wall: string; trim: string; roof: string; window: string; door: string; accent: string; facade: string; rod: string }> = {
  budget: { wall: '#f7f7f5', trim: '#8a8478', roof: '#2e4a62', window: '#b8ddec', door: '#b5835a', accent: '#9a8a78', facade: '#d4cbb8', rod: '#4682B4' },
  modern: { wall: '#f7f7f5', trim: '#1a1a1a', roof: '#2c2c2c', window: '#a8d4e6', door: '#2a2a2a', accent: '#3a3a3a', facade: '#e2dbd0', rod: '#1a1a1a' },
  luxury: { wall: '#f7f7f5', trim: '#c9a84c', roof: '#0d0d0d', window: '#7ab0c8', door: '#8b6914', accent: '#6a4a1a', facade: '#2a2520', rod: '#c9a84c' },
};

const CameraController = ({ activeRoom, plan }: { activeRoom?: string | null, plan: Plan }) => {
  const W = plan.width || 0;
  const D = plan.height || 0;
  const prevRoom = useRef<string | null | undefined>(null);
  const animProgress = useRef(1);
  const targetPos = useRef(new THREE.Vector3(45, 25, 45));
  const targetLookAt = useRef(new THREE.Vector3(0, 0, 0));

  useEffect(() => {
    if (activeRoom !== prevRoom.current) {
      prevRoom.current = activeRoom;
      animProgress.current = 0; 

      if (!activeRoom || activeRoom === 'overview' || activeRoom === 'garden') {
        targetPos.current.set(45, 25, 45);
        targetLookAt.current.set(0, 0, 0);
      } else {
        const rs = (plan.rooms || []).filter(r => r.id === activeRoom || r.type === activeRoom);
        if (rs.length > 0) {
          const avgX = rs.reduce((sum, r) => sum + r.x + r.w / 2, 0) / rs.length;
          const avgY = rs.reduce((sum, r) => sum + r.y + r.h / 2, 0) / rs.length;
          const center = new THREE.Vector3(avgX - W / 2, 0, avgY - D / 2);

          const minX = Math.min(...rs.map(r => r.x));
          const maxX = Math.max(...rs.map(r => r.x + r.w));
          const minY = Math.min(...rs.map(r => r.y));
          const maxY = Math.max(...rs.map(r => r.y + r.h));
          const extent = Math.max(maxX - minX, maxY - minY);

          const height = Math.max(40, extent * 2);
          targetPos.current.set(center.x, height, center.z);
          targetLookAt.current.copy(center);
        }
      }
    }
  }, [activeRoom, plan, W, D]);

  useFrame((state, delta) => {
    if (animProgress.current >= 1) return;
    const controls = state.controls as any;
    if (!controls) return;

    animProgress.current = Math.min(1, animProgress.current + delta * 2.5);
    const t = animProgress.current;
    const ease = 1 - Math.pow(1 - t, 3);

    state.camera.position.lerp(targetPos.current, ease * 0.15);
    controls.target.lerp(targetLookAt.current, ease * 0.15);
  });

  return null;
};

const PottedPlant = ({ position, scale = 1 }: { position: [number, number, number], scale?: number }) => {
  const flowerColors = ["#ff5555", "#ffaa55", "#ffcc00", "#ff66cc", "#9966ff"];
  const color = useMemo(() => flowerColors[Math.floor(Math.random() * flowerColors.length)], []);

  return (
    <group position={position} scale={scale}>
      {/* Architectural Ceramic Pot */}
      <group position={[0, 0.4, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.6, 0.45, 0.8, 24]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.3} metalness={0.6} />
        </mesh>
        {/* Pot Rim Detailing */}
        <mesh position={[0, 0.36, 0]} castShadow>
          <cylinderGeometry args={[0.68, 0.62, 0.12, 24]} />
          <meshStandardMaterial color="#222222" roughness={0.2} metalness={0.7} />
        </mesh>
      </group>

      {/* Lush Foliage & Detailed Flowers */}
      <group position={[0, 0.8, 0]}>
        {/* Foundation Bush */}
        <mesh position={[0, 0.3, 0]} castShadow>
          <sphereGeometry args={[0.65, 16, 12]} />
          <meshStandardMaterial color="#2d5a27" roughness={0.9} />
        </mesh>
        
        {/* Individual Flower Stems and Blossoms */}
        {Array.from({ length: 6 }).map((_, i) => {
          const ang = i * (Math.PI * 2 / 6);
          const r = 0.35 + Math.sin(i * 1.5) * 0.1;
          const h = 0.4 + Math.cos(i * 0.8) * 0.2;
          return (
            <group key={i} position={[Math.cos(ang) * r, 0.2, Math.sin(ang) * r]}>
              {/* Thin Stem */}
              <mesh position={[0, h/2, 0]}>
                <cylinderGeometry args={[0.015, 0.015, h, 6]} />
                <meshStandardMaterial color="#1b3b1b" />
              </mesh>
              {/* Multi-layered Blossom - Petal based */}
              <group position={[0, h, 0]}>
                {/* 5 Petals arranged in a cup */}
                {Array.from({ length: 5 }).map((__, pi) => {
                  const pAng = (pi / 5) * Math.PI * 2;
                  return (
                    <mesh key={pi} rotation={[0.4, pAng, 0]} position={[Math.cos(pAng) * 0.08, 0, Math.sin(pAng) * 0.08]}>
                      <boxGeometry args={[0.18, 0.22, 0.01]} />
                      <meshStandardMaterial color={flowerColors[i % flowerColors.length]} roughness={0.4} side={THREE.DoubleSide} />
                    </mesh>
                  );
                })}
                {/* Yellow center stamen */}
                <mesh position={[0, 0.05, 0]}>
                  <sphereGeometry args={[0.06, 6, 6]} />
                  <meshStandardMaterial color="#ffcc00" emissive="#ffcc00" emissiveIntensity={0.5} />
                </mesh>
              </group>
            </group>
          );
        })}
      </group>
    </group>
  );
};

const BlackStonePathway = ({ doorPos, plotW, plotD }: { doorPos: { x: number, z: number, nx: number, nz: number }, plotW: number, plotD: number }) => {
  const marbleTextures = useMemo(() => ({
    map: createMarbleTexture(1, 1),
    roughness: createMarbleRoughness(1, 1),
  }), []);

  const elements = useMemo(() => {
    const items = [];
    const stoneColor = '#1a1a1a'; // Deep black marble base
    const count = 7;
    const pathWidth = 6.4;
    const stepLength = 2.6;
    const gap = 0.5;

    const isVerticalWall = doorPos.nx !== 0;
    const rotationZ = isVerticalWall ? Math.PI / 2 : 0;
    const px = -doorPos.nz;
    const pz = doorPos.nx;

    for (let i = 0; i < count; i++) {
      const dist = 5.8 + i * (stepLength + gap);
      const x = doorPos.x + doorPos.nx * dist;
      const z = doorPos.z + doorPos.nz * dist;
      
      // Luxury Marble Steps
      items.push(
        <mesh key={`stone-${i}`} position={[x, 0.08, z]} rotation={[-Math.PI / 2, 0, rotationZ]} receiveShadow castShadow>
          <boxGeometry args={[pathWidth, stepLength, 0.25]} />
          <meshStandardMaterial 
            color={stoneColor} 
            map={marbleTextures.map} 
            roughnessMap={marbleTextures.roughness}
            roughness={0.15} 
            metalness={0.4} 
            envMapIntensity={2.5}
          />
        </mesh>
      );

      // Potted Plants - Restrict from being inside the fence
      if (i % 2 === 0 && i < count - 1) {
        const sideDist = pathWidth / 2 + 1.8;
        
        const posL: [number, number, number] = [x + px * sideDist, 0, z + pz * sideDist];
        const posR: [number, number, number] = [x - px * sideDist, 0, z - pz * sideDist];

        const isInside = (p: [number, number, number]) => 
          Math.abs(p[0]) < plotW / 2 - 0.5 && Math.abs(p[2]) < plotD / 2 - 0.5;

        if (!isInside(posL)) {
          items.push(<PottedPlant key={`plant-l-${i}`} position={posL} scale={0.85 + Math.random() * 0.15} />);
        }
        if (!isInside(posR)) {
          items.push(<PottedPlant key={`plant-r-${i}`} position={posR} scale={0.85 + Math.random() * 0.15} />);
        }
      }
    }

    // Grand Marble Landing Platform
    items.unshift(
      <mesh key="landing" position={[doorPos.x + doorPos.nx * 2.6, 0.12, doorPos.z + doorPos.nz * 2.6]} rotation={[-Math.PI / 2, 0, rotationZ]} receiveShadow castShadow>
        <boxGeometry args={[pathWidth + 2.2, 5, 0.35]} />
        <meshStandardMaterial 
          color="#111111" 
          map={marbleTextures.map} 
          roughnessMap={marbleTextures.roughness}
          roughness={0.1} 
          metalness={0.5} 
          envMapIntensity={3}
        />
      </mesh>
    );
    return items;
  }, [doorPos, marbleTextures]);

  return <group>{elements}</group>;
};

export const ElevationCanvas = ({ plan, roof, material, addons = [], activeRoom, isDoubleStorey = false, firstFloorPlan, hideHelpers = false, isNight = false }: Props) => {
  const hideRoof = activeRoom && activeRoom !== 'overview' && activeRoom !== 'garden';
  const safeW = plan.width || 0;
  const safeD = plan.height || 0;
  const plotW = safeW + PLOT_PADDING_FT * 2;
  const plotD = safeD + PLOT_PADDING_FT * 2;
  const mainDoor = useMemo(() => findMainDoorWorld(plan), [plan]);
  const gateConfig = useMemo(() => {
    const hw = plotW / 2;
    const hd = plotD / 2;
    const gPos = Math.max(0.1, Math.min(0.9, plan.plotEntranceX ?? 0.5));
    
    // Default fallback
    const defaultGate = { x: -hw + gPos * plotW, z: hd, side: 'bottom' as Side };

    if (!mainDoor) return defaultGate;

    // "Focusing main door" means aligning with it.
    // We place the gate on the side the main door faces, at its X/Z coordinate.
    if (mainDoor.nz === -1) return { x: mainDoor.x, z: -hd, side: 'top' as Side };
    if (mainDoor.nz === 1) return { x: mainDoor.x, z: hd, side: 'bottom' as Side };
    if (mainDoor.nx === -1) return { x: -hw, z: mainDoor.z, side: 'left' as Side };
    if (mainDoor.nx === 1) return { x: hw, z: mainDoor.z, side: 'right' as Side };

    return defaultGate;
  }, [mainDoor, plan.plotEntranceX, plotW, plotD]);

  const carportInfo = useMemo(() => getCarportInfo(plan), [plan]);

  const gates = useMemo(() => {
    const list = [{ ...gateConfig, isCarGate: false }];
    if (addons.includes('carport') && carportInfo) {
      // Add a wide car gate in front of the carport
      const hw = plotW / 2;
      const hd = plotD / 2;
      const side = gateConfig.side;
      let gx = carportInfo.cx;
      let gz = hd;
      if (side === 'top') gz = -hd;
      else if (side === 'bottom') gz = hd;
      else if (side === 'left') { gx = -hw; gz = carportInfo.cz; }
      else if (side === 'right') { gx = hw; gz = carportInfo.cz; }
      
      list.push({ x: gx, z: gz, side, isCarGate: true });
    }
    return list;
  }, [gateConfig, carportInfo, addons, plotW, plotD]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl bg-gradient-to-b from-[hsl(210,35%,22%)] to-[hsl(210,30%,12%)]">
      <Canvas
        shadows="soft"
        camera={{
          position: [22, 24, 22],
          fov: 38,
          near: 0.1,
          far: 1000
        }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: isNight ? 0.9 : 1.15,
          outputColorSpace: THREE.SRGBColorSpace,
          powerPreference: 'high-performance',
        }}
      >
        <Suspense fallback={
          <Html center>
            <div style={{ color: '#fff', fontSize: 12, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', opacity: 0.6 }}>Loading 3D…</div>
          </Html>
        }>
          {/* Premium Lighting System */}
          <SceneLighting isNight={isNight} hideRoof={!!hideRoof} />
          
          {/* Sky & Environment */}
          <SkyEnvironment isNight={isNight} />
          <EnhancedGround isNight={isNight} />
          {addons.includes('landscaping') && <GrassField planW={safeW} planD={safeD} />}
          
          <House plan={plan} roof={roof} material={material} activeRoom={activeRoom} addons={addons} isNight={isNight} hideRoof={!!hideRoof} plotW={plotW} plotD={plotD} isDoubleStorey={isDoubleStorey} />
          
          {/* Second Floor (Double Storey) */}
          {isDoubleStorey && firstFloorPlan && (
            <SecondFloor plan={plan} firstFloorPlan={firstFloorPlan} roof={roof} material={material} activeRoom={activeRoom} addons={addons} hideRoof={hideRoof} />
          )}
          
          
          {addons.includes('carport') && <Carport plan={plan} plotW={plotW} plotD={plotD} gateSide={gateConfig.side} />}

          {addons.includes('landscaping') && (() => {
            const corridors = computeCorridors(plan, plotW, plotD, gateConfig.x, gateConfig.z, gateConfig.side);
            return (
              <>
                <FrontWalkway plan={plan} gateX={gateConfig.x} plotD={plotD} />
                <Trees planW={plotW} planD={plotD} corridors={corridors} />
                <Bushes planW={plotW} planD={plotD} corridors={corridors} />
              </>
            );
          })()}
          {addons.includes('fence') && <FenceAround planW={plotW} planD={plotD} gates={gates} isNight={isNight} />}
          
          <CameraController activeRoom={activeRoom} plan={plan} />
          <ContactShadows position={[0, 0.02, 0]} opacity={isNight ? 0.28 : 0.32} scale={80} blur={2} far={40} />
          <OrbitControls
            makeDefault
            enablePan={true} enableZoom={true} enableRotate={true}
            minDistance={5} maxDistance={100}
            minPolarAngle={0} maxPolarAngle={Math.PI / 2.1}
            autoRotate={!activeRoom || activeRoom === 'overview' || activeRoom === 'garden'} 
            autoRotateSpeed={0.35}
            enableDamping dampingFactor={0.03}
          />

        </Suspense>
      </Canvas>
      {!hideHelpers && (
        <div className="pointer-events-none absolute left-4 top-4 rounded-xl glass-panel px-3 py-2 text-[9px] font-display font-semibold uppercase tracking-[0.2em]">
          {activeRoom && activeRoom !== 'overview' ? 'Drag to rotate · Scroll to zoom · Free camera' : 'Drag to rotate · Scroll to zoom'}
        </div>
      )}
    </div>
  );
};

/* ─── Ground ─── */
const Ground = () => (
  <group>
    {/* Base terrain */}
    <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[300, 300]} />
      <meshStandardMaterial color="#2a4a2e" roughness={0.95} />
    </mesh>
    {/* Inner lawn (lighter green around house) */}
    <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
      <planeGeometry args={[120, 120]} />
      <meshStandardMaterial color="#345e38" roughness={0.92} />
    </mesh>
  </group>
);

const GrassField = ({ planW, planD }: { planW: number; planD: number }) => {
  const patches = useMemo(() => {
    const arr: { x: number; z: number; s: number; c: string }[] = [];
    const colors = ['#3d6b3d', '#2d5a2d', '#4a7a4a', '#3a6838', '#2e5530'];
    // Close patches for lush foundation planting look
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = planW * 0.4 + Math.random() * 8;
      arr.push({ x: Math.cos(angle) * dist, z: Math.sin(angle) * dist, s: 0.4 + Math.random() * 0.6, c: colors[i % colors.length] });
    }
    // Distant patches for depth
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 20 + Math.random() * 40;
      arr.push({ x: Math.cos(angle) * dist, z: Math.sin(angle) * dist, s: 0.3 + Math.random() * 0.5, c: colors[(i + 2) % colors.length] });
    }
    return arr;
  }, [planW, planD]);
  return (
    <group>
      {patches.map((p, i) => (
        <mesh key={i} position={[p.x, 0.03, p.z]} rotation={[-Math.PI / 2, 0, Math.random() * Math.PI]}>
          <circleGeometry args={[p.s, 8]} />
          <meshStandardMaterial color={p.c} roughness={1} />
        </mesh>
      ))}
    </group>
  );
};

const round2 = (num: number) => Math.round(num * 100) / 100;

/* ─── Garden Area ─── */
const GardenArea = ({ room: r, W, D, isNight, mainDoorPos }: { room: any, W: number, D: number, isNight: boolean, mainDoorPos: any }) => {
  const cx = round2(r.x + r.w / 2 - W / 2);
  const cz = round2(r.y + r.h / 2 - D / 2);

  // Pathway "Forbidden Zone" detection
  const isPointInPathway = (px: number, pz: number) => {
    if (!mainDoorPos) return false;
    // Main pathway width is 6.4, we add 1.0 buffer for plants
    const buffer = 4.2;
    const dx = px - mainDoorPos.x;
    const dz = pz - mainDoorPos.z;
    
    // Project point onto pathway axis (nx, nz)
    const proj = dx * mainDoorPos.nx + dz * mainDoorPos.nz;
    // Distance from axis
    const perp = Math.abs(dx * (-mainDoorPos.nz) + dz * mainDoorPos.nx);
    
    // Pathway extends from door outwards. We clip anything within 'buffer' of the center line
    // and extending from door (proj > -1) outwards.
    return proj > -1.0 && perp < buffer;
  };

  const extraGreenery = useMemo(() => {
    const hasPlants = r.furniture && r.furniture.length > 0;
    if (hasPlants && r.furniture.length >= 3) return [];

    const arr = [];
    const count = Math.max(3, Math.floor(r.w * r.h / 15));
    for (let i = 0; i < count; i++) {
      // High-variety floral distribution
      const types = ['flower_pot', 'flower_pot', 'flower_pot', 'tall_plant', 'flower_pot']; 
      const seed = (parseInt(r.id.replace(/\D/g, '') || '1') + i) * 1337;
      const pseudoRandom = (s: number) => {
        const x = Math.sin(s) * 10000;
        return x - Math.floor(x);
      };

      const rx = 1 + pseudoRandom(seed) * (r.w - 2);
      const ry = 1 + pseudoRandom(seed + 1) * (r.h - 2);
      
      const absX = round2(r.x + rx - W / 2);
      const absZ = round2(r.y + ry - D / 2);
      
      if (isPointInPathway(absX, absZ)) continue;

      arr.push({
        id: `auto-plant-${i}-${seed}`, // Provide stable ID for variant selection
        type: types[i % types.length],
        x: rx,
        y: ry,
        rotation: pseudoRandom(seed + 2) * Math.PI * 2,
        w: 1.5, h: 1.5
      });
    }
    return arr;
  }, [r.id, r.w, r.h, r.furniture, mainDoorPos]);

  return (
    <group>
      {/* Garden Bed - Soil & Grass (Slightly lower at 0.35 to sit BELOW the path at 0.2-0.5) */}
      <mesh receiveShadow position={[cx, 0.35, cz]}>
        <boxGeometry args={[r.w, 0.1, r.h]} />
        <meshStandardMaterial color="#3a2a1c" roughness={1} />
      </mesh>
      <mesh receiveShadow position={[cx, 0.41, cz]}>
        <boxGeometry args={[r.w - 0.2, 0.05, r.h - 0.2]} />
        <meshStandardMaterial color="#345e38" roughness={0.9} />
      </mesh>

      {/* Modern Stone Border - Rendered as 4 segments to allow clipping at doorway */}
      {[
        { p: [cx, 0.5, cz - r.h/2 - 0.2], a: [r.w + 0.4, 0.3, 0.4], id: 'top' },
        { p: [cx, 0.5, cz + r.h/2 + 0.2], a: [r.w + 0.4, 0.3, 0.4], id: 'bottom' },
        { p: [cx - r.w/2 - 0.2, 0.5, cz], a: [0.4, 0.3, r.h + 0.4], id: 'left' },
        { p: [cx + r.w/2 + 0.2, 0.5, cz], a: [0.4, 0.3, r.h + 0.4], id: 'right' },
      ].map((seg, i) => {
        // Skip border segment if it directly intersects the doorway path
        if (isPointInPathway(seg.p[0], seg.p[2])) return null;
        return (
          <group key={`border-${i}`}>
            <mesh position={seg.p as any}>
              <boxGeometry args={seg.a as any} />
              <meshStandardMaterial color="#5a554e" roughness={0.8} />
            </mesh>
            <mesh position={[seg.p[0], seg.p[1], seg.p[2]]}>
              <boxGeometry args={[seg.a[0] - 0.05, 0.4, seg.a[2] - 0.05]} />
              <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
            </mesh>
          </group>
        );
      })}

      {/* Plants & Pots */}
      <group position={[0, 0.42, 0]}>
        {[...(r.furniture || []), ...extraGreenery].map((f: any, fi: number) => {
          const fx = round2(r.x + f.x + (f.w || 1) / 2 - W / 2);
          const fz = round2(r.y + f.y + (f.h || 1) / 2 - D / 2);
          
          // Double check manual furniture too
          if (isPointInPathway(fx, fz)) return null;

          return (
            <group key={`gf-${fi}`} position={[fx, 0, fz]} rotation={[0, f.rotation || 0, 0]}>
              <Furniture3D item={f} isNight={isNight} />
            </group>
          );
        })}
      </group>
    </group>
  );
};

/* ─── Main House Component ─── */
const House = ({ plan, roof, material, activeRoom, addons, isNight = false, hideRoof = false, plotW, plotD, isDoubleStorey = false }: {
  plan: Plan; roof: RoofType; material: Material; activeRoom?: string | null; addons: AddOn[]; isNight?: boolean; hideRoof?: boolean; plotW: number; plotD: number; isDoubleStorey?: boolean;
}) => {
  const roofType = isDoubleStorey ? 'flat' : roof;
  const colors = MATERIAL_COLORS[material];
  const W = plan.width;
  const D = plan.height;
  const wallH = 13;
  const t = 0.4; // Realistic wall thickness

  // PBR Floor Textures from materials factory
  const floorTextures = useMemo(() => ({
    walnut: createWoodFloorTexture(2, 2),
    walnutNormal: createWoodFloorNormal(2, 2),
    walnutRough: createWoodFloorRoughness(2, 2),
    oak: createOakFloorTexture(2, 2),
    oakNormal: createOakFloorNormal(2, 2),
    oakRough: createOakFloorRoughness(2, 2),
    tile: createTileTexture(4, 4),
    tileNormal: createTileNormal(4, 4),
    tileRough: createTileRoughness(4, 4),
    marble: createMarbleTexture(1.5, 1.5),
    marbleRough: createMarbleRoughness(1.5, 1.5),
  }), []);

  // Wall textures
  const wallTextures = useMemo(() => ({
    map: createWallTexture(3, 2),
    normal: createWallNormal(3, 2),
  }), []);

  // Door / panel wood textures
  const doorTextures = useMemo(() => ({
    map: createDoorWoodTexture(1, 2),
    normal: createDoorWoodNormal(1, 2),
  }), []);

  // 1. & 4. Compute exact bounding box for the structure
  const mainRooms = (plan.rooms || []).filter(r => r.type !== 'garden' && r.type !== 'carport' && r.type !== 'balcony');
  const minX = Math.min(...mainRooms.map(r => r.x));
  const maxX = Math.max(...mainRooms.map(r => r.x + r.w));
  const minZ = Math.min(...mainRooms.map(r => r.y));
  const maxZ = Math.max(...mainRooms.map(r => r.y + r.h));

  const roofW = round2(maxX - minX);
  const roofD = round2(maxZ - minZ);
  const roofCX = round2((minX + maxX) / 2 - W / 2);
  const roofCZ = round2((minZ + maxZ) / 2 - D / 2);

  // Detect carport position for blocking rod removal
  const carportRoom = (plan.rooms || []).find(r => r.type === 'carport');
  const hasCarport = !!carportRoom;
  const cpAtBottom = carportRoom && Math.abs(carportRoom.y + carportRoom.h - maxZ) < 1.0;
  const cpAtTop = carportRoom && Math.abs(carportRoom.y - minZ) < 1.0;
  const cpAtLeft = carportRoom && Math.abs(carportRoom.x - minX) < 1.0;
  const cpAtRight = carportRoom && Math.abs(carportRoom.x + carportRoom.w - maxX) < 1.0;

  // 6. Prevent Duplicate Walls & ensure no overlaps via a deduplication registry
  const extractedWalls: any[] = [];
  const addWall = (type: 'h'|'v', coord: number, start: number, end: number, doors: any[], windows: any[]) => {
    coord = round2(coord);
    start = round2(start);
    end = round2(end);
    
    // Find overlapping wall segment with tolerance
    const existing = extractedWalls.find(w => w.type === type && Math.abs(w.coord - coord) < 0.2 && 
      (Math.max(w.start, start) <= Math.min(w.end, end) + 0.1));
    
    if (existing) {
      existing.start = Math.min(existing.start, start);
      existing.end = Math.max(existing.end, end);
      // Dedup doors/windows by absPos so shared-wall openings (e.g., hallway↔room)
      // don't render twice when both rooms contribute the same wall segment.
      for (const d of doors) {
        if (!existing.doors.some((ed: any) => Math.abs(ed.absPos - d.absPos) < 0.3)) {
          existing.doors.push(d);
        }
      }
      for (const w of windows) {
        if (!existing.windows.some((ew: any) => Math.abs(ew.absPos - w.absPos) < 0.3)) {
          existing.windows.push(w);
        }
      }
    } else {
      extractedWalls.push({ type, coord, start, end, doors: [...doors], windows: [...windows] });
    }
  };

  (plan.rooms || []).forEach(room => {
    // Only extract solid walls for enclosed rooms.
    // Hallways still need to participate so user-added walls (via "Add Wall")
    // facing exteriors / non-enclosed neighbors are rendered.
    // Dedup at the same coord merges with adjacent room walls automatically.
    if (room.type === 'garden' || room.type === 'carport' || room.type === 'balcony') return;

    const rX = room.x;
    const rY = room.y;
    const rW = room.w;
    const rH = room.h;

    // Convert relative doors/windows to absolute coordinates
    const getAbsDoors = (wall: string) => (room.doors || []).filter((d:any) => d.wall === wall).map((d:any) => {
      let doorCategory: 'main' | 'room' | 'bathroom' = 'room';
      if (d.label === 'MAIN DOOR' || (!d.connectsTo && d.doorType !== 'open')) {
        doorCategory = 'main';
      } else if (room.type === 'bathroom') {
        doorCategory = 'bathroom';
      } else {
        const connRoom = (plan.rooms || []).find(r => r.id === d.connectsTo);
        if (connRoom?.type === 'bathroom') doorCategory = 'bathroom';
      }
      return {
        ...d, doorCategory, roomType: room.type,
        absPos: (wall === 'top' || wall === 'bottom') ? rX + rW * d.position : rY + rH * d.position
      };
    });
    const getAbsWindows = (wall: string) => (room.windows || []).filter((w:any) => w.wall === wall).map((win:any) => ({
      ...win, absPos: (wall === 'top' || wall === 'bottom') ? rX + rW * win.position : rY + rH * win.position
    }));

    // 2. Add walls perfectly aligned to room edges (skip if wall is marked as open/removed)
    const openWalls = room.openWalls || [];
    if (!openWalls.includes('top')) {
      addWall('h', rY, rX, rX + rW, getAbsDoors('top'), getAbsWindows('top'));
    }
    if (!openWalls.includes('bottom')) {
      addWall('h', rY + rH, rX, rX + rW, getAbsDoors('bottom'), getAbsWindows('bottom'));
    }
    if (!openWalls.includes('left')) {
      addWall('v', rX, rY, rY + rH, getAbsDoors('left'), getAbsWindows('left'));
    }
    if (!openWalls.includes('right')) {
      addWall('v', rX + rW, rY, rY + rH, getAbsDoors('right'), getAbsWindows('right'));
    }  });

  // Find main entrance door position for canopy & wall lights
  const mainDoorCandidates: any[] = [];
  for (const wall of extractedWalls) {
    for (const door of wall.doors) {
      if (door.doorCategory === 'main') {
        let pos;
        if (wall.type === 'h') {
          pos = { x: round2(door.absPos - W/2), z: round2(wall.coord - D/2), nx: 0, nz: wall.coord <= minZ + 0.5 ? -1 : 1, roomType: door.roomType };
        } else {
          pos = { x: round2(wall.coord - W/2), z: round2(door.absPos - D/2), nx: wall.coord <= minX + 0.5 ? -1 : 1, nz: 0, roomType: door.roomType };
        }
        mainDoorCandidates.push(pos);
      }
    }
  }
  // Priority: Hall > Living > First found
  const mainDoorPos = mainDoorCandidates.find(c => c.roomType === 'hall') 
    || mainDoorCandidates.find(c => c.roomType === 'living')
    || mainDoorCandidates[0] 
    || null;

  const gardenRooms = (plan.rooms || []).filter(r => r.type === 'garden');

  return (
    <group position={[0, 0, 0]}>
      {/* Gardens & Landscaping */}
      {gardenRooms.map(r => (
        <GardenArea key={`garden-area-${r.id}`} room={r} W={W} D={D} isNight={isNight} mainDoorPos={mainDoorPos} />
      ))}

      {/* Per-room Foundations for perfect spatial accuracy */}
      <group position={[0, 0.8, 0]}>
        {mainRooms.map(r => {
          const cx = round2(r.x + r.w / 2 - W / 2);
          const cz = round2(r.y + r.h / 2 - D / 2);
          const isActive = activeRoom === r.type;

          // Detect adjacency to carport to prevent overhang/overlap
          const isNextToCarportLeft = hasCarport && Math.abs(r.x - (carportRoom.x + carportRoom.w)) < 0.1;
          const isNextToCarportRight = hasCarport && Math.abs((r.x + r.w) - carportRoom.x) < 0.1;
          const isNextToCarportTop = hasCarport && Math.abs(r.y - (carportRoom.y + carportRoom.h)) < 0.1;
          const isNextToCarportBottom = hasCarport && Math.abs((r.y + r.h) - carportRoom.y) < 0.1;

          // Foundation dimensions
          const fW = r.w;
          const fH = r.h;
          
          // Plinth band dimensions (conditional overhang)
          const pW = r.w + (isNextToCarportLeft || isNextToCarportRight ? 0.05 : 0.15);
          const pH = r.h + (isNextToCarportTop || isNextToCarportBottom ? 0.05 : 0.15);
          const pCX = cx + (isNextToCarportLeft ? 0.05 : 0) - (isNextToCarportRight ? 0.05 : 0);
          const pCZ = cz + (isNextToCarportTop ? 0.05 : 0) - (isNextToCarportBottom ? 0.05 : 0);

          return (
            <group key={`room-found-${r.id}`}>
              {/* Individual Foundation Slab */}
              <mesh receiveShadow position={[cx, -0.4, cz]}>
                <boxGeometry args={[fW, 0.8, fH]} />
                <meshStandardMaterial color="#8a8478" roughness={0.9} />
              </mesh>

              {/* Individual Plinth Trim */}
              <mesh position={[pCX, -0.15, pCZ]}>
                <boxGeometry args={[pW, 0.3, pH]} />
                <meshStandardMaterial color="#4a453e" roughness={0.7} />
              </mesh>

              {/* Floor Plane */}
              {(() => {
                const isLivingDining = ['living', 'dining', 'hall', 'lobby', 'foyer', 'entry'].includes(r.type);
                const isBedroom = ['bedroom', 'master', 'guest'].includes(r.type);
                const isKitchen = r.type === 'kitchen';
                const isBath = r.type === 'bathroom';
                const isCorridor = ['corridor', 'hallway', 'passage'].includes(r.type);

                let map = floorTextures.oak;
                let normalMap: any = floorTextures.oakNormal;
                let roughnessMap: any = floorTextures.oakRough;
                let baseColor = '#caa775';
                let roughness = 0.55;
                let metalness = 0;
                let envMapIntensity = 0.6;

                if (isLivingDining) {
                  map = floorTextures.walnut; normalMap = floorTextures.walnutNormal; roughnessMap = floorTextures.walnutRough;
                  baseColor = '#8a5d36'; roughness = 0.5; envMapIntensity = 0.8;
                } else if (isBedroom) {
                  map = floorTextures.oak; normalMap = floorTextures.oakNormal; roughnessMap = floorTextures.oakRough;
                  baseColor = '#caa775'; roughness = 0.6; envMapIntensity = 0.6;
                } else if (isKitchen) {
                  map = floorTextures.marble; normalMap = undefined; roughnessMap = floorTextures.marbleRough;
                  baseColor = '#f1ede5'; roughness = 0.18; metalness = 0.05; envMapIntensity = 1.4;
                } else if (isBath) {
                  map = floorTextures.tile; normalMap = floorTextures.tileNormal; roughnessMap = floorTextures.tileRough;
                  baseColor = '#e6e8e7'; roughness = 0.22; metalness = 0.04; envMapIntensity = 1.2;
                } else if (isCorridor) {
                  map = floorTextures.walnut; normalMap = floorTextures.walnutNormal; roughnessMap = floorTextures.walnutRough;
                  baseColor = '#8a5d36'; roughness = 0.55; envMapIntensity = 0.7;
                }

                return (
                  <mesh receiveShadow position={[cx, 0.01, cz]}>
                    <boxGeometry args={[r.w, 0.02, r.h]} />
                    <meshStandardMaterial
                      color={baseColor}
                      map={map}
                      normalMap={normalMap}
                      normalScale={new THREE.Vector2(0.45, 0.45)}
                      roughnessMap={roughnessMap}
                      roughness={roughness}
                      metalness={metalness}
                      envMapIntensity={envMapIntensity}
                    />
                  </mesh>
                );
              })()}

              {/* Ceiling Elements */}
              {!hideRoof && r.type !== 'garden' && r.type !== 'carport' && r.type !== 'balcony' && (
                <>
                  <mesh position={[cx, wallH - 0.01, cz]}>
                    <boxGeometry args={[r.w - 0.1, 0.02, r.h - 0.1]} />
                    <meshStandardMaterial color="#fafaf6" roughness={0.95} />
                  </mesh>
                  <mesh position={[cx, wallH - 0.18, cz]}>
                    <boxGeometry args={[r.w - 1.2, 0.08, r.h - 1.2]} />
                    <meshStandardMaterial color="#f4f1eb" roughness={0.9} />
                  </mesh>
                  {[
                    { p: [cx, wallH - 0.18, cz - r.h / 2 + 0.65], a: [r.w - 1.2, 0.04, 0.04] },
                    { p: [cx, wallH - 0.18, cz + r.h / 2 - 0.65], a: [r.w - 1.2, 0.04, 0.04] },
                    { p: [cx - r.w / 2 + 0.65, wallH - 0.18, cz], a: [0.04, 0.04, r.h - 1.2] },
                    { p: [cx + r.w / 2 - 0.65, wallH - 0.18, cz], a: [0.04, 0.04, r.h - 1.2] },
                  ].map((s, si) => (
                    <mesh key={`cove-${si}`} position={s.p as any}>
                      <boxGeometry args={s.a as any} />
                      <meshStandardMaterial color="#fff5dc" emissive="#ffd9a0" emissiveIntensity={isNight ? 1.2 : 0.5} roughness={0.4} />
                    </mesh>
                  ))}
                </>
              )}

              {/* Furniture */}
              {(hideRoof || isActive || true) && r.furniture.map((f: any, fi: number) => {
                const fx = round2(r.x + f.x + f.w/2 - W/2);
                const fz = round2(r.y + f.y + f.h/2 - D/2);
                return (
                  <group key={`f-${fi}`} position={[fx, 0.02, fz]} rotation={[0, f.rotation ? f.rotation * Math.PI / 180 : 0, 0]}>
                    <Furniture3D item={f} isNight={isNight} />
                  </group>
                );
              })}
            </group>
          );
        })}

        {/* Interior Walls */}
        {extractedWalls.map((wall, i) => {
          const len = wall.end - wall.start;
          const w = len + t;
          const mappedDoors = wall.doors.map((d:any) => ({...d, relPos: (d.absPos - wall.start + t/2) / w}));
          const mappedWindows = wall.windows.map((win:any) => ({...win, relPos: (win.absPos - wall.start + t/2) / w}));

          if (wall.type === 'h') {
            const posX = round2(wall.start + len/2 - W/2);
            const posZ = round2(wall.coord - D/2);
            return <WallSegment key={`wall-${i}`} w={w} h={wallH} t={t} color={colors.wall}
              doors={mappedDoors} windows={mappedWindows} materialType={material}
              position={[posX, 0, posZ]} rotation={[0, 0, 0]}
              frameColor={colors.trim} glassColor={colors.window} doorColor={colors.door}
              hideRoof={hideRoof} wallTextures={wallTextures} doorTextures={doorTextures} />;
          } else {
            const posX = round2(wall.coord - W/2);
            const posZ = round2(wall.start + len/2 - D/2);
            return <WallSegment key={`wall-${i}`} w={w} h={wallH} t={t} color={colors.wall}
              doors={mappedDoors} windows={mappedWindows} materialType={material}
              position={[posX, 0, posZ]} rotation={[0, -Math.PI/2, 0]}
              frameColor={colors.trim} glassColor={colors.window} doorColor={colors.door}
              hideRoof={hideRoof} wallTextures={wallTextures} doorTextures={doorTextures} />;
          }
        })}
      </group>

      {/* Exterior Architecture */}
      {!hideRoof && (
        <>
          <mesh position={[roofCX, wallH + 0.8, roofCZ]}>
            <boxGeometry args={[roofW + 0.8, 0.35, roofD + 0.8]} />
            <meshStandardMaterial color={colors.trim} roughness={0.45} metalness={0.08} />
          </mesh>
          <mesh position={[roofCX, wallH + 0.55, roofCZ]}>
            <boxGeometry args={[roofW + 0.5, 0.15, roofD + 0.5]} />
            <meshStandardMaterial color={colors.accent} roughness={0.5} />
          </mesh>
        </>
      )}

      {/* Entrance Features */}
      {mainDoorPos && (
        <>
          <BlackStonePathway doorPos={mainDoorPos} plotW={plotW} plotD={plotD} />
          {!hideRoof && (
            <group position={[mainDoorPos.x, wallH * 0.85 + 0.8, mainDoorPos.z + mainDoorPos.nz * 2 + mainDoorPos.nx * 2]}>
              <mesh castShadow rotation={[0, mainDoorPos.nx !== 0 ? Math.PI/2 : 0, 0]}>
                <boxGeometry args={[6, 0.2, 3.5]} />
                <meshStandardMaterial color={colors.roof} roughness={0.6} />
              </mesh>
              <mesh position={[0, -0.02, 0]} rotation={[0, mainDoorPos.nx !== 0 ? Math.PI/2 : 0, 0]}>
                <boxGeometry args={[6.3, 0.08, 0.12]} />
                <meshStandardMaterial color={colors.trim} roughness={0.4} metalness={0.15} />
              </mesh>
            </group>
          )}
          {[-3, 3].map((o, li) => (
            <group key={`sconce-${li}`} position={[
              mainDoorPos.x + (mainDoorPos.nz !== 0 ? o : 0),
              wallH * 0.5 + 0.8,
              mainDoorPos.z + (mainDoorPos.nx !== 0 ? o : 0)
            ]}>
              <mesh><boxGeometry args={[0.2, 0.5, 0.15]} /><meshStandardMaterial color={colors.trim} roughness={0.3} metalness={0.5} /></mesh>
              <pointLight intensity={0.5} distance={8} color="#ffe8c0" position={[mainDoorPos.nx * 0.3, -0.15, mainDoorPos.nz * 0.3]} />
            </group>
          ))}
        </>
      )}

      {/* Roof System */}
      {roofType === 'gable' ? (
        <GableRoof W={roofW} D={roofD} cx={roofCX} cz={roofCZ} wallH={wallH} color={colors.roof} trimColor={colors.trim} rodColor={colors.rod} transparent={hideRoof} opacity={hideRoof ? 0.1 : 1} cpAtLeft={cpAtLeft} cpAtRight={cpAtRight} cpAtTop={cpAtTop} cpAtBottom={cpAtBottom} />
      ) : (
        <FlatRoof W={roofW} D={roofD} cx={roofCX} cz={roofCZ} wallH={wallH} color={colors.roof} transparent={hideRoof} opacity={hideRoof ? 0.1 : 1} cpAtLeft={cpAtLeft} cpAtRight={cpAtRight} cpAtTop={cpAtTop} cpAtBottom={cpAtBottom} />
      )}

      {/* Rooftop Equipment */}
      {addons.includes('solar') && !hideRoof && !isDoubleStorey && <SolarPanels minX={minX - W/2} maxX={maxX - W/2} minZ={minZ - D/2} maxZ={maxZ - D/2} roofType={roofType} wallH={wallH} />}
      {addons.includes('water_tank') && !hideRoof && !isDoubleStorey && <WaterTank maxX={maxX - W/2} maxZ={maxZ - D/2} wallH={wallH} roofType={roofType} />}

      {/* Room Labels */}
      {(plan.rooms || []).map(r => {
        if (r.type === 'garden' || r.type === 'carport' || r.type === 'balcony') return null;
        const isActive = activeRoom === r.type;
        return (
          <Html key={`label-${r.id}`} position={[r.x - W/2 + r.w/2, hideRoof ? 3 : wallH + 3, r.y - D/2 + r.h/2]} center zIndexRange={[100, 0]}>
            <div className={`transition-all duration-300 pointer-events-none px-4 py-1.5 rounded-sm border shadow-lg whitespace-nowrap font-display font-bold text-[11px] tracking-widest ${isActive ? 'bg-[hsl(28,40%,55%)] text-white border-transparent scale-110 shadow-[0_4px_12px_rgba(200,100,50,0.4)]' : 'bg-white/95 text-black border-black/10 scale-100'}`}>
              {r.label}
            </div>
          </Html>
        );
      })}
    </group>
  );
};

/* ─── Door Dimension Helpers ─── */
const DOOR_DIMS: Record<string, { height: number; minWidth: number }> = {
  main:     { height: 8.6, minWidth: 4.8 },
  room:     { height: 8.4, minWidth: 3 },
  bathroom: { height: 8.0, minWidth: 2.5 },
};

const getDoorHeight = (d: any): number => {
  const cat = d.doorCategory || 'room';
  return DOOR_DIMS[cat]?.height ?? 9;
};

/* ─── Wall Rendering Geometry ─── */
const WallSegment = ({ w, h, t, color, doors, windows, position, rotation, frameColor, glassColor, doorColor, materialType, hideRoof, wallTextures, doorTextures }: any) => {
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-w/2, 0);
    s.lineTo(w/2, 0);
    s.lineTo(w/2, h);
    s.lineTo(-w/2, h);
    s.closePath();

    doors.forEach((d: any) => {
      const dw = d.width;
      const dh = getDoorHeight(d);
      const dx = w * d.relPos - w/2 - dw/2;
      const hole = new THREE.Path();
      hole.moveTo(dx, 0);
      hole.lineTo(dx + dw, 0);
      hole.lineTo(dx + dw, dh);
      hole.lineTo(dx, dh);
      hole.closePath();
      s.holes.push(hole);
    });

    windows.forEach((win: any) => {
      const ww = 3.2;
      const wh = 3.2;
      const wy = 5.5;
      const wx = w * win.relPos - w/2 - ww/2;
      const hole = new THREE.Path();
      hole.moveTo(wx, wy);
      hole.lineTo(wx + ww, wy);
      hole.lineTo(wx + ww, wy + wh);
      hole.lineTo(wx, wy + wh);
      hole.closePath();
      s.holes.push(hole);
    });

    return s;
  }, [w, h, doors, windows]);

  return (
    <group position={position} rotation={rotation}>
      <mesh castShadow receiveShadow position={[0, 0, -t/2]}>
        <extrudeGeometry args={[shape, { depth: t, bevelEnabled: false }]} />
        <meshStandardMaterial
          color={color}
          map={wallTextures?.map}
          normalMap={wallTextures?.normal}
          normalScale={new THREE.Vector2(0.45, 0.45)}
          roughness={0.94}
          metalness={0}
          envMapIntensity={0.4}
        />
      </mesh>
      
      {/* ── Categorized Door Rendering ── */}
      {doors.map((d: any, i: number) => {
        const cat = d.doorCategory || 'room';
        const dw = d.width;
        const dh = getDoorHeight(d);
        const dx = w * d.relPos - w/2;
        const isOpen = d.doorType === 'open';

        if (isOpen) {
          // Open archway — frame only, no door panel
          return (
            <group key={`d-${i}`} position={[dx, dh/2, 0]}>
              <group>
                <mesh position={[0, dh/2 + 0.075, 0]}>
                  <boxGeometry args={[dw + 0.3, 0.15, t + 0.08]} />
                  <meshStandardMaterial color={frameColor} roughness={0.6} />
                </mesh>
                <mesh position={[-dw/2 - 0.075, 0, 0]}>
                  <boxGeometry args={[0.15, dh, t + 0.08]} />
                  <meshStandardMaterial color={frameColor} roughness={0.6} />
                </mesh>
                <mesh position={[dw/2 + 0.075, 0, 0]}>
                  <boxGeometry args={[0.15, dh, t + 0.08]} />
                  <meshStandardMaterial color={frameColor} roughness={0.6} />
                </mesh>
              </group>
            </group>
          );
        }

        if (cat === 'main') {
          // ── MAIN ENTRANCE DOOR — Premium "Wooden Orange" finish ──
          const mainWood = '#b5651d'; // Warm Cedar/Teak orange
          const panelWood = '#8b4513'; // Saddle Brown for mixed contrast
          const accentMetal = materialType === 'luxury' ? '#d4af37' : materialType === 'modern' ? '#222' : '#999';
          
          return (
            <group key={`d-${i}`} position={[dx, dh/2, 0]}>
              {/* Massive Outer Frame (Perimeter) */}
              <group>
                <mesh position={[0, dh/2 + 0.15, 0]}>
                  <boxGeometry args={[dw + 0.6, 0.3, t + 0.16]} />
                  <meshStandardMaterial color={frameColor} roughness={0.4} metalness={0.1} />
                </mesh>
                <mesh position={[-dw/2 - 0.15, 0, 0]}>
                  <boxGeometry args={[0.3, dh, t + 0.16]} />
                  <meshStandardMaterial color={frameColor} roughness={0.4} metalness={0.1} />
                </mesh>
                <mesh position={[dw/2 + 0.15, 0, 0]}>
                  <boxGeometry args={[0.3, dh, t + 0.16]} />
                  <meshStandardMaterial color={frameColor} roughness={0.4} metalness={0.1} />
                </mesh>
              </group>
              
              {/* Primary Door Panel */}
              <mesh position={[0, 0, 0]}>
                <boxGeometry args={[dw, dh, 0.22]} />
                <meshStandardMaterial color={mainWood} map={doorTextures?.map} normalMap={doorTextures?.normal} normalScale={new THREE.Vector2(0.6, 0.6)} roughness={0.38} metalness={0.06} envMapIntensity={1.2} /></mesh>

              {/* Symmetrical Details for Front and Back */}
              {[-1, 1].map((side) => (
                <group key={`side-${side}`} position={[0, 0, 0.11 * side]}>

                  {/* Horizontal Mixed Grain Bands */}
                  {[ -0.8, 0, 0.8 ].map((yOff, idx) => (
                    <mesh key={`band-${idx}`} position={[0, yOff * (dh/3), 0.01 * side]}>
                      <boxGeometry args={[dw - 0.2, 0.15, 0.02]} />
                      <meshStandardMaterial color={panelWood} map={doorTextures?.map} roughness={0.3} />
                    </mesh>
                  ))}

                  {/* Modern Designer Glass Inserts */}
                  <mesh position={[0, dh/4, 0.02 * side]}>
                    <boxGeometry args={[dw/2.2, dh/4.5, 0.04]} />
                    <meshStandardMaterial color={glassColor} roughness={0.02} metalness={0.8} transparent opacity={0.3} reflectivity={1} envMapIntensity={2} /></mesh>

                  {/* Modern Vertical Pull Handle (Luxury Style) */}
                  <group position={[side === 1 ? dw/2 - 0.45 : -dw/2 + 0.45, 0, 0.05 * side]}>
                    {/* Handle Bar */}
                    <mesh position={[0, 0, 0.06 * side]}>
                      <boxGeometry args={[0.08, 2.5, 0.08]} />
                      <meshStandardMaterial color={accentMetal} metalness={1} roughness={0.1} /></mesh>
                    {/* Handle Supports */}
                    <mesh position={[0, 1.0, 0.03 * side]} rotation={[Math.PI/2, 0, 0]}>
                      <cylinderGeometry args={[0.03, 0.03, 0.06, 8]} />
                      <meshStandardMaterial color={accentMetal} metalness={1} roughness={0.1} /></mesh>
                    <mesh position={[0, -1.0, 0.03 * side]} rotation={[Math.PI/2, 0, 0]}>
                      <cylinderGeometry args={[0.03, 0.03, 0.06, 8]} />
                      <meshStandardMaterial color={accentMetal} metalness={1} roughness={0.1} /></mesh>
                  </group>
                </group>
              ))}

              {/* Threshold (Marble/Stone feel) */}
              <mesh position={[0, -dh/2 + 0.05, 0.1]}>
                <boxGeometry args={[dw + 0.6, 0.1, t + 0.4]} />
                <meshStandardMaterial color="#dcdcdc" roughness={0.3} metalness={0.1} /></mesh>
            </group>
          );
        }

        if (cat === 'bathroom') {
          // ── BATHROOM DOOR — Compact, frosted glass upper, lighter color ──
          const bathDoorColor = materialType === 'luxury' ? '#a09080' : materialType === 'modern' ? '#c8c8c8' : '#c4b8a8';
          return (
            <group key={`d-${i}`} position={[dx, dh/2, 0]}>
              {/* Slim frame */}
              <group>
                <mesh position={[0, dh/2 + 0.075, 0]}>
                  <boxGeometry args={[dw + 0.3, 0.15, t + 0.08]} />
                  <meshStandardMaterial color={frameColor} roughness={0.6} />
                </mesh>
                <mesh position={[-dw/2 - 0.075, 0, 0]}>
                  <boxGeometry args={[0.15, dh, t + 0.08]} />
                  <meshStandardMaterial color={frameColor} roughness={0.6} />
                </mesh>
                <mesh position={[dw/2 + 0.075, 0, 0]}>
                  <boxGeometry args={[0.15, dh, t + 0.08]} />
                  <meshStandardMaterial color={frameColor} roughness={0.6} />
                </mesh>
              </group>
              {/* Full Door Panel */}
              <mesh position={[0, 0, 0]}>
                <boxGeometry args={[dw, dh, 0.08]} />
                <meshStandardMaterial color={bathDoorColor} normalMap={doorTextures?.normal} normalScale={new THREE.Vector2(0.2, 0.2)} roughness={0.55} /></mesh>
              {/* Upper frosted glass panel insert */}
              <mesh position={[0, dh/4, 0]}>
                <boxGeometry args={[dw - 0.4, dh * 0.4, 0.09]} />
                <meshStandardMaterial color="#d8e8f0" roughness={0.6} metalness={0.05} transparent opacity={0.55} depthWrite={false} /></mesh>
              
              {/* Symmetrical Handles */}
              {[-1, 1].map((side) => (
                <group key={`side-${side}`} position={[0, 0, 0.04 * side]}>
                  {/* Small lever handle */}
                  <mesh position={[side === 1 ? dw/2 - 0.35 : -dw/2 + 0.35, -0.15, 0.02 * side]}>
                    <boxGeometry args={[0.1, 0.35, 0.02]} />
                    <meshStandardMaterial color="#aaa" metalness={0.85} roughness={0.18} /></mesh>
                  <mesh position={[side === 1 ? dw/2 - 0.35 : -dw/2 + 0.35, -0.15, 0.04 * side]} rotation={[0, 0, Math.PI/2]}>
                    <cylinderGeometry args={[0.025, 0.025, 0.2, 6]} />
                    <meshStandardMaterial color="#bbb" metalness={0.85} roughness={0.18} /></mesh>
                </group>
              ))}
            </group>
          );
        }

        // ── ROOM DOOR — Clean panel design, matte wood finish ──
        const roomDoorColor = '#6a4528';
        return (
          <group key={`d-${i}`} position={[dx, dh/2, 0]}>
            {/* Standard frame */}
            <group>
              <mesh position={[0, dh/2 + 0.075, 0]}>
                <boxGeometry args={[dw + 0.3, 0.15, t + 0.1]} />
                <meshStandardMaterial color={frameColor} roughness={0.6} />
              </mesh>
              <mesh position={[-dw/2 - 0.075, 0, 0]}>
                <boxGeometry args={[0.15, dh, t + 0.1]} />
                <meshStandardMaterial color={frameColor} roughness={0.6} />
              </mesh>
              <mesh position={[dw/2 + 0.075, 0, 0]}>
                <boxGeometry args={[0.15, dh, t + 0.1]} />
                <meshStandardMaterial color={frameColor} roughness={0.6} />
              </mesh>
            </group>
            {/* Door panel — wood grain */}
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[dw, dh, 0.12]} />
              <meshStandardMaterial color={roomDoorColor} map={doorTextures?.map} normalMap={doorTextures?.normal} normalScale={new THREE.Vector2(0.4, 0.4)} roughness={0.5} metalness={0.04} envMapIntensity={0.6} /></mesh>
            
            {/* Symmetrical Details */}
            {[-1, 1].map((side) => (
              <group key={`side-${side}`} position={[0, 0, 0.06 * side]}>
                {/* Upper panel recess */}
                <mesh position={[0, dh/5, 0.02 * side]}>
                  <boxGeometry args={[dw - 0.6, dh * 0.35, 0.04]} />
                  <meshStandardMaterial color={roomDoorColor} map={doorTextures?.map} roughness={0.55} metalness={0.02} /></mesh>
                {/* Lower panel recess */}
                <mesh position={[0, -dh/5, 0.02 * side]}>
                  <boxGeometry args={[dw - 0.6, dh * 0.3, 0.04]} />
                  <meshStandardMaterial color={roomDoorColor} map={doorTextures?.map} roughness={0.55} metalness={0.02} /></mesh>
                {/* Round door knob */}
                <mesh position={[side === 1 ? dw/2 - 0.35 : -dw/2 + 0.35, -0.1, 0.05 * side]}>
                  <sphereGeometry args={[0.1, 12, 12]} />
                  <meshStandardMaterial color="#c0c0c0" metalness={0.8} roughness={0.2} /></mesh>
              </group>
            ))}
          </group>
        );
      })}

      {/* ── Windows — proportioned for taller walls ── */}
      {windows.map((win: any, i: number) => {
        const ww = 3.2;
        const wh = 3.2;
        const wy = 5.5 + wh/2;
        const wx = w * win.relPos - w/2;
        // Wall thickness is t. Center the window group at z=0.
        return (
          <group key={`w-${i}`} position={[wx, wy, 0]}>
            {/* 1. Main glass pane — bright sky-tinted reflective glass, reads as glass from both sides */}
            <mesh castShadow={false} receiveShadow={false}>
              <boxGeometry args={[ww, wh, 0.04]} />
              <meshPhysicalMaterial
                color="#cfe1ec"
                roughness={0.03}
                metalness={0.6}
                transparent
                opacity={0.65}
                ior={1.52}
                reflectivity={1.0}
                envMapIntensity={4}
                clearcoat={1.0}
                clearcoatRoughness={0.02}
                emissive="#9ec1d4"
                emissiveIntensity={0.35}
                side={THREE.DoubleSide}
                depthWrite={false}
              />
            </mesh>
            {/* Subtle inner highlight strip — adds gloss read */}
            <mesh position={[0, wh * 0.18, 0.025]} rotation={[0, 0, 0.18]}>
              <planeGeometry args={[ww * 0.95, 0.35]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.18} depthWrite={false} />
            </mesh>

            {/* 2. Wooden frame — perimeter only (4 thin strips through wall thickness) */}
            {/* Top rail */}
            <mesh position={[0, wh / 2 + 0.06, 0]}>
              <boxGeometry args={[ww + 0.18, 0.12, t + 0.04]} />
              <meshStandardMaterial color="#4a3425" roughness={0.6} metalness={0.05} />
            </mesh>
            {/* Bottom rail */}
            <mesh position={[0, -wh / 2 - 0.06, 0]}>
              <boxGeometry args={[ww + 0.18, 0.12, t + 0.04]} />
              <meshStandardMaterial color="#4a3425" roughness={0.6} metalness={0.05} />
            </mesh>
            {/* Left stile */}
            <mesh position={[-ww / 2 - 0.06, 0, 0]}>
              <boxGeometry args={[0.12, wh, t + 0.04]} />
              <meshStandardMaterial color="#4a3425" roughness={0.6} metalness={0.05} />
            </mesh>
            {/* Right stile */}
            <mesh position={[ww / 2 + 0.06, 0, 0]}>
              <boxGeometry args={[0.12, wh, t + 0.04]} />
              <meshStandardMaterial color="#4a3425" roughness={0.6} metalness={0.05} />
            </mesh>

            {/* 3. Slim glazing bars — cross dividers (thin so glass dominates) */}
            <mesh>
              <boxGeometry args={[ww, 0.05, 0.06]} />
              <meshStandardMaterial color="#4a3425" roughness={0.6} metalness={0.05} />
            </mesh>
            <mesh>
              <boxGeometry args={[0.05, wh, 0.06]} />
              <meshStandardMaterial color="#4a3425" roughness={0.6} metalness={0.05} />
            </mesh>

            {/* 3. Symmetrical casing on Front and Back — PERIMETER ONLY (was solid box, now 4 strips) */}
            {[-1, 1].map((side) => (
              <group key={side} position={[0, 0, (t / 2 + 0.05) * side]}>
                {/* Top casing */}
                <mesh position={[0, wh / 2 + 0.18, 0]}>
                  <boxGeometry args={[ww + 0.5, 0.22, 0.06]} />
                  <meshStandardMaterial color={frameColor} roughness={0.5} />
                </mesh>
                {/* Bottom casing */}
                <mesh position={[0, -wh / 2 - 0.18, 0]}>
                  <boxGeometry args={[ww + 0.5, 0.22, 0.06]} />
                  <meshStandardMaterial color={frameColor} roughness={0.5} />
                </mesh>
                {/* Left casing */}
                <mesh position={[-ww / 2 - 0.18, 0, 0]}>
                  <boxGeometry args={[0.22, wh + 0.5, 0.06]} />
                  <meshStandardMaterial color={frameColor} roughness={0.5} />
                </mesh>
                {/* Right casing */}
                <mesh position={[ww / 2 + 0.18, 0, 0]}>
                  <boxGeometry args={[0.22, wh + 0.5, 0.06]} />
                  <meshStandardMaterial color={frameColor} roughness={0.5} />
                </mesh>
                {/* Window sill — only on bottom edge */}
                <mesh position={[0, -wh / 2 - 0.4, 0.05]}>
                  <boxGeometry args={[ww + 0.8, 0.2, 0.28]} />
                  <meshStandardMaterial color={frameColor} roughness={0.4} />
                </mesh>
              </group>
            ))}
          </group>
        );
      })}
    </group>
  );
};

/* ─── Roofs ─── */
const GableRoof = ({ 
  W, D, cx, cz, wallH, color, trimColor, rodColor, transparent, opacity,
  cpAtLeft, cpAtRight, cpAtTop, cpAtBottom 
}: any) => {
  const roofH = 6;
  const overhang = 2.5;
  
  // Adjust horizontal bounds based on carport adjacency to prevent floating gutters
  const leftOverhang = cpAtLeft ? 0.2 : overhang;
  const rightOverhang = cpAtRight ? 0.2 : overhang;
  const topOverhang = cpAtTop ? 0.2 : overhang;
  const bottomOverhang = cpAtBottom ? 0.2 : overhang;

  const hw_l = W / 2 + leftOverhang;
  const hw_r = W / 2 + rightOverhang;
  const hd_t = D / 2 + topOverhang;
  const hd_b = D / 2 + bottomOverhang;
  
  // For simplicity in the shape, we'll use a symmetrical base for the main gable if both sides are free
  // but if one side is blocked, we shift the peak? No, let's just use the max overhang for the shape width 
  // but truncate the visuals.
  const hw = W / 2 + overhang;
  const hd = D / 2 + overhang;

  const shape = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-hw, 0);
    s.lineTo(0, roofH);
    s.lineTo(hw, 0);
    s.closePath();
    return s;
  }, [hw, roofH]);

  return (
    <group position={[cx, wallH + 0.8, cz - hd]}>
      {/* Main roof */}
      <mesh castShadow>
        <extrudeGeometry args={[shape, { steps: 1, depth: hd * 2, bevelEnabled: false }]} />
        <meshStandardMaterial color={color} roughness={0.7} side={THREE.DoubleSide} transparent={transparent} opacity={opacity} depthWrite={!transparent} />
      </mesh>
      {/* Ridge cap */}
      <mesh position={[0, roofH + 0.15, hd]}>
        <boxGeometry args={[0.5, 0.3, hd * 2 + 0.6]} />
        <meshStandardMaterial color={trimColor} roughness={0.4} metalness={0.3} transparent={transparent} opacity={opacity} depthWrite={!transparent} />
      </mesh>
      {/* Standing Seam Ribs (High-detail architectural feature) */}
      {Array.from({ length: Math.floor(hd * 2 / 3) }).map((_, i) => (
        <group key={`rib-${i}`} position={[0, 0, i * 3 + 1.5]}>
          {[-1, 1].map((side) => {
            const angle = Math.atan2(roofH, hw) * -side;
            const len = Math.hypot(hw, roofH);
            return (
              <mesh key={side} position={[side * hw / 2, roofH / 2 + 0.05, 0]} rotation={[0, 0, angle]}>
                <boxGeometry args={[len, 0.08, 0.08]} />
                <meshStandardMaterial color={rodColor || trimColor} roughness={0.3} metalness={0.2} transparent={transparent} opacity={0.6} depthWrite={!transparent} />
              </mesh>
            );
          })}
        </group>
      ))}
      {/* Fascia boards (front & back gable edges) */}
      {[0, hd * 2].map((zPos, zi) => (
        <group key={zi} position={[0, 0, zPos + (zi === 0 ? -0.08 : 0.08)]}>
          {[-1, 1].map((side, si) => {
            const angle = Math.atan2(roofH, hw) * -side;
            const len = Math.hypot(hw, roofH);
            return (
              <mesh key={si} position={[side * hw / 2, roofH / 2, 0]} rotation={[0, 0, angle]}>
                <boxGeometry args={[len + 0.1, 0.4, 0.15]} />
                <meshStandardMaterial color={trimColor} roughness={0.5} metalness={0.1} transparent={transparent} opacity={opacity} depthWrite={!transparent} />
              </mesh>
            );
          })}
        </group>
      ))}
      {/* Eave / soffit trim (left & right overhangs) */}
      {[-1, 1].map((side, ei) => {
        if (side === -1 && cpAtLeft) return null;
        if (side === 1 && cpAtRight) return null;
        return (
          <mesh key={`eave-${ei}`} position={[side * hw, -0.1, hd]}>
            <boxGeometry args={[0.18, 0.3, hd * 2 + 0.5]} />
            <meshStandardMaterial color={trimColor} roughness={0.5} metalness={0.1} transparent={transparent} opacity={opacity} depthWrite={!transparent} />
          </mesh>
        );
      })}
      {/* Gutter line */}
      {[-1, 1].map((side, gi) => {
        if (side === -1 && cpAtLeft) return null;
        if (side === 1 && cpAtRight) return null;
        return (
          <mesh key={`gutter-${gi}`} position={[side * (hw + 0.08), -0.2, hd]}>
            <boxGeometry args={[0.1, 0.12, hd * 2 + 0.3]} />
            <meshStandardMaterial color="#8a8a8a" roughness={0.3} metalness={0.4} transparent={transparent} opacity={opacity} depthWrite={!transparent} />
          </mesh>
        );
      })}
    </group>
  );
};

const FlatRoof = ({ 
  W, D, cx, cz, wallH, color, transparent, opacity,
  cpAtLeft, cpAtRight, cpAtTop, cpAtBottom 
}: any) => {
  const overhang = 2.5;
  const lw = cpAtLeft ? 0.2 : overhang / 2;
  const rw = cpAtRight ? 0.2 : overhang / 2;
  const tw = cpAtTop ? 0.2 : overhang / 2;
  const bw = cpAtBottom ? 0.2 : overhang / 2;

  return (
    <group position={[cx, wallH + 1.2, cz]}>
      {/* Main slab */}
      <mesh castShadow>
        <boxGeometry args={[W + (cpAtLeft ? 0 : 1.25) + (cpAtRight ? 0 : 1.25), 0.8, D + (cpAtTop ? 0 : 1.25) + (cpAtBottom ? 0 : 1.25)]} />
        <meshStandardMaterial color={color} roughness={0.65} transparent={transparent} opacity={opacity} depthWrite={!transparent} />
      </mesh>
      {/* Parapet walls */}
      {[[-1, 0], [1, 0], [0, -1], [0, 1]].map(([dx, dz], i) => {
        if (dx === -1 && cpAtLeft) return null;
        if (dx === 1 && cpAtRight) return null;
        if (dz === -1 && cpAtTop) return null;
        if (dz === 1 && cpAtBottom) return null;
        return (
          <mesh key={i} position={[dx * (W / 2 + 1), 0.7, dz * (D / 2 + 1)]}>
            <boxGeometry args={[dx ? 0.35 : W + 2.5, 1, dz ? 0.35 : D + 2.5]} />
            <meshStandardMaterial color={color} roughness={0.65} transparent={transparent} opacity={opacity} depthWrite={!transparent} />
          </mesh>
        );
      })}
      {/* Parapet cap / coping */}
      {[[-1, 0], [1, 0], [0, -1], [0, 1]].map(([dx, dz], i) => {
        if (dx === -1 && cpAtLeft) return null;
        if (dx === 1 && cpAtRight) return null;
        if (dz === -1 && cpAtTop) return null;
        if (dz === 1 && cpAtBottom) return null;
        return (
          <mesh key={`cap-${i}`} position={[dx * (W / 2 + 1), 1.25, dz * (D / 2 + 1)]}>
            <boxGeometry args={[dx ? 0.5 : W + 2.8, 0.12, dz ? 0.5 : D + 2.8]} />
            <meshStandardMaterial color="#888" roughness={0.35} metalness={0.2} transparent={transparent} opacity={opacity} depthWrite={!transparent} />
          </mesh>
        );
      })}
    </group>
  );
};

/* ─── Add-ons ─── */
const SolarPanels = ({ minX, maxX, minZ, maxZ, roofType, wallH }: any) => {
  const isFlat = roofType === 'flat';
  const margin = 2;
  const tankSpace = 4; // reserve space for water tank

  const panelW = 3.5;
  const panelD = 5;
  const gap = 1;

  const startX = minX + margin;
  const startZ = minZ + margin;

  const widthAvailable = (maxX - minX) - margin * 2;
  const cols = Math.max(1, Math.floor(widthAvailable / (panelW + gap)));
  
  const panels = [];
  
  if (isFlat) {
    const depthAvailable = (maxZ - minZ) - margin * 2;
    const rows = Math.max(1, Math.floor(depthAvailable / (panelD + gap)));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const px = startX + c * (panelW + gap) + panelW/2;
        const pz = startZ + r * (panelD + gap) + panelD/2;
        
        // Prevent overlap with tank corner
        if (px > maxX - tankSpace - margin && pz > maxZ - tankSpace - margin) continue;
        
        panels.push(
          <mesh key={`${r}-${c}`} position={[px, wallH + 1.8, pz]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
            <boxGeometry args={[panelW, panelD, 0.2]} />
            <meshStandardMaterial color="#1a2a4a" metalness={0.8} roughness={0.2} />
          </mesh>
        );
      }
    }
  } else {
    // Gable Roof (Ridge along Z)
    const centerX = (minX + maxX) / 2;
    const roofH = 6;
    const overhang = 2.5;
    const run = (maxX - minX) / 2 + overhang;
    const angle = Math.atan2(roofH, run);
    
    const depthAvailable = (maxZ - minZ) - margin * 2;
    const rows = Math.max(1, Math.floor(depthAvailable / (panelD + gap)));

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const px_raw = startX + c * (panelW + gap) + panelW/2;
        const pz = startZ + r * (panelD + gap) + panelD/2;
        
        const isLeft = px_raw < centerX;
        let px = px_raw;
        if (isLeft) {
          px = Math.min(px, centerX - 3);
        } else {
          px = Math.max(px, centerX + 3);
        }

        const distFromCenter = Math.abs(px - centerX);
        const heightOnSlope = (1 - distFromCenter / run) * roofH;
        const py = wallH + 0.8 + heightOnSlope + 0.15; 

        // Tilt angle for the group
        const rotZ = isLeft ? angle : -angle;

        panels.push(
          <group key={`g-${r}-${c}`} position={[px, py, pz]} rotation={[0, 0, rotZ]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} castShadow>
              {/* Swap W and D: 5 units along the slope (X), 3.5 units along the ridge (Z) */}
              <boxGeometry args={[5, 3.5, 0.12]} />
              <meshStandardMaterial color="#0a1224" metalness={0.95} roughness={0.05} />
            </mesh>
          </group>
        );
      }
    }
  }

  return <group>{panels}</group>;
};

const WaterTank = ({ maxX, maxZ, wallH, roofType }: any) => {
  const margin = 2;
  const tankHeight = 3;
  const tankRadius = 1.5;
  
  const x = maxX - margin - tankRadius;
  const z = maxZ - margin - tankRadius;
  
  const y = wallH + (roofType === 'flat' ? 1.2 : 3) + tankHeight / 2;

  return (
    <group position={[x, y, z]}>
      <mesh castShadow>
        <cylinderGeometry args={[tankRadius, tankRadius, tankHeight, 16]} />
        <meshStandardMaterial color="#e0e0e0" roughness={0.4} metalness={0.1} />
      </mesh>
    </group>
  );
};

/* Low-poly parked car. Car length runs along +/- Z (rotate the parent group to orient). */
const ParkedCar = ({ color = '#1f2937', accent = '#0a0a0a' }: { color?: string; accent?: string }) => {
  return (
    <group>
      {/* Lower body (chassis) */}
      <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.85, 0.55, 4.3]} />
        <meshStandardMaterial color={color} roughness={0.35} metalness={0.55} />
      </mesh>
      {/* Hood ridge — slightly raised at front */}
      <mesh position={[0, 0.95, 1.45]} castShadow>
        <boxGeometry args={[1.78, 0.18, 1.4]} />
        <meshStandardMaterial color={color} roughness={0.35} metalness={0.55} />
      </mesh>
      {/* Trunk lid — slightly raised at rear */}
      <mesh position={[0, 0.95, -1.55]} castShadow>
        <boxGeometry args={[1.78, 0.18, 1.2]} />
        <meshStandardMaterial color={color} roughness={0.35} metalness={0.55} />
      </mesh>
      {/* Cabin (greenhouse) — narrower than body */}
      <mesh position={[0, 1.32, -0.1]} castShadow>
        <boxGeometry args={[1.65, 0.7, 2.4]} />
        <meshStandardMaterial color={color} roughness={0.35} metalness={0.55} />
      </mesh>
      {/* Side windows (tinted glass) */}
      <mesh position={[0.83, 1.32, -0.1]}>
        <boxGeometry args={[0.02, 0.55, 2.25]} />
        <meshPhysicalMaterial color="#1a2540" roughness={0.05} metalness={0.4} transparent opacity={0.55} clearcoat={1} />
      </mesh>
      <mesh position={[-0.83, 1.32, -0.1]}>
        <boxGeometry args={[0.02, 0.55, 2.25]} />
        <meshPhysicalMaterial color="#1a2540" roughness={0.05} metalness={0.4} transparent opacity={0.55} clearcoat={1} />
      </mesh>
      {/* Windscreen + rear glass */}
      <mesh position={[0, 1.32, 1.12]} rotation={[Math.PI * 0.06, 0, 0]}>
        <boxGeometry args={[1.55, 0.55, 0.04]} />
        <meshPhysicalMaterial color="#1a2540" roughness={0.05} metalness={0.4} transparent opacity={0.55} clearcoat={1} />
      </mesh>
      <mesh position={[0, 1.32, -1.32]} rotation={[-Math.PI * 0.06, 0, 0]}>
        <boxGeometry args={[1.55, 0.55, 0.04]} />
        <meshPhysicalMaterial color="#1a2540" roughness={0.05} metalness={0.4} transparent opacity={0.55} clearcoat={1} />
      </mesh>
      {/* Wheels (4) */}
      {[
        [-0.85, 0.4, 1.5], [0.85, 0.4, 1.5],
        [-0.85, 0.4, -1.5], [0.85, 0.4, -1.5],
      ].map(([x, y, z], i) => (
        <group key={i} position={[x, y, z]}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.4, 0.4, 0.28, 18]} />
            <meshStandardMaterial color={accent} roughness={0.95} />
          </mesh>
          {/* Hubcap */}
          <mesh rotation={[0, 0, Math.PI / 2]} position={[x > 0 ? 0.145 : -0.145, 0, 0]}>
            <cylinderGeometry args={[0.2, 0.2, 0.02, 12]} />
            <meshStandardMaterial color="#bdbdbd" roughness={0.4} metalness={0.7} />
          </mesh>
        </group>
      ))}
      {/* Headlights */}
      {[-0.55, 0.55].map((x, i) => (
        <mesh key={`hl-${i}`} position={[x, 0.7, 2.16]}>
          <boxGeometry args={[0.42, 0.2, 0.06]} />
          <meshStandardMaterial color="#fff8d4" emissive="#fff8d4" emissiveIntensity={0.6} roughness={0.3} />
        </mesh>
      ))}
      {/* Tail lights */}
      {[-0.55, 0.55].map((x, i) => (
        <mesh key={`tl-${i}`} position={[x, 0.7, -2.16]}>
          <boxGeometry args={[0.42, 0.2, 0.06]} />
          <meshStandardMaterial color="#a91212" emissive="#a91212" emissiveIntensity={0.35} roughness={0.4} />
        </mesh>
      ))}
      {/* Grille */}
      <mesh position={[0, 0.55, 2.16]}>
        <boxGeometry args={[1.0, 0.25, 0.04]} />
        <meshStandardMaterial color="#0d0d0d" roughness={0.5} metalness={0.6} />
      </mesh>
      {/* Side mirrors */}
      {[-0.95, 0.95].map((x, i) => (
        <mesh key={`mir-${i}`} position={[x, 1.2, 0.7]} castShadow>
          <boxGeometry args={[0.18, 0.12, 0.18]} />
          <meshStandardMaterial color={color} roughness={0.35} metalness={0.55} />
        </mesh>
      ))}
    </group>
  );
};

const Carport = ({ plan, plotW, plotD, gateSide }: { plan: Plan; plotW: number; plotD: number; gateSide: Side }) => {
  const info = useMemo(() => getCarportInfo(plan), [plan]);
  if (!info) return null;
  const { cx, cz, w: cw, h: ch, side } = info;

  const halfPlotW = plotW / 2;
  const halfPlotD = plotD / 2;

  const cpElevation = 0.8; // Match house foundation height
  const rampL = 2.0;

  // Driveway rectangle: from carport's ramp edge out to plot edge.
  let dwMinX = 0, dwMaxX = 0, dwMinZ = 0, dwMaxZ = 0;
  let carYaw = 0; // car orientation

  const openingSide = gateSide;
  const isVertical = openingSide === 'top' || openingSide === 'bottom';

  if (isVertical) {
    if (openingSide === 'top') {
      dwMinX = cx - cw / 2 + 0.6; dwMaxX = cx + cw / 2 - 0.6;
      dwMinZ = -halfPlotD; dwMaxZ = cz - ch / 2 - rampL;
      carYaw = Math.PI; // facing back
    } else {
      dwMinX = cx - cw / 2 + 0.6; dwMaxX = cx + cw / 2 - 0.6;
      dwMinZ = cz + ch / 2 + rampL; dwMaxZ = halfPlotD;
      carYaw = 0; // facing front
    }
  } else {
    if (openingSide === 'left') {
      dwMinX = -halfPlotW; dwMaxX = cx - cw / 2 - rampL;
      dwMinZ = cz - ch / 2 + 0.6; dwMaxZ = cz + ch / 2 - 0.6;
      carYaw = -Math.PI / 2; // facing left
    } else {
      dwMinX = cx + cw / 2 + rampL; dwMaxX = halfPlotW;
      dwMinZ = cz - ch / 2 + 0.6; dwMaxZ = cz + ch / 2 - 0.6;
      carYaw = Math.PI / 2; // facing right
    }
  }

  const dwW = Math.max(0.1, dwMaxX - dwMinX);
  const dwD = Math.max(0.1, dwMaxZ - dwMinZ);
  const dwCX = (dwMinX + dwMaxX) / 2;
  const dwCZ = (dwMinZ + dwMaxZ) / 2;

  // Parked car position: centered in carport, oriented along driving axis
  const carX = cx;
  const carZ = cz;

  const rampAngle = Math.atan2(cpElevation, rampL);
  const rampHypot = Math.hypot(cpElevation, rampL);

  return (
    <group>
      {/* ── Carport pad + structure ── */}
      <group position={[cx, 0, cz]}>
        {/* Concrete pad — slightly thicker than house foundation to prevent ground bleed */}
        <mesh receiveShadow position={[0, 0.41, 0]}>
          <boxGeometry args={[cw, 0.82, ch]} />
          <meshStandardMaterial color="#9a9a96" roughness={0.95} />
        </mesh>
        {/* Painted parking bay outline */}
        <mesh position={[0, cpElevation + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[Math.min(cw, ch) * 0.32, Math.min(cw, ch) * 0.34, 32]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.45} />
        </mesh>

        {/* Ramp */}
        {isVertical ? (
          openingSide === 'top' ? (
            <mesh position={[0, cpElevation / 2, -ch / 2 - rampL / 2]} rotation={[-rampAngle, 0, 0]} receiveShadow>
              <boxGeometry args={[cw - 1.2, 0.1, rampHypot]} />
              <meshStandardMaterial color="#9a9a96" roughness={0.95} />
            </mesh>
          ) : (
            <mesh position={[0, cpElevation / 2, ch / 2 + rampL / 2]} rotation={[rampAngle, 0, 0]} receiveShadow>
              <boxGeometry args={[cw - 1.2, 0.1, rampHypot]} />
              <meshStandardMaterial color="#9a9a96" roughness={0.95} />
            </mesh>
          )
        ) : (
          openingSide === 'left' ? (
            <mesh position={[-cw / 2 - rampL / 2, cpElevation / 2, 0]} rotation={[0, 0, rampAngle]} receiveShadow>
              <boxGeometry args={[rampHypot, 0.1, ch - 1.2]} />
              <meshStandardMaterial color="#9a9a96" roughness={0.95} />
            </mesh>
          ) : (
            <mesh position={[cw / 2 + rampL / 2, cpElevation / 2, 0]} rotation={[0, 0, -rampAngle]} receiveShadow>
              <boxGeometry args={[rampHypot, 0.1, ch - 1.2]} />
              <meshStandardMaterial color="#9a9a96" roughness={0.95} />
            </mesh>
          )
        )}

        {/* Car shed roof and pillars removed per user request for an open-air parking space */}

        {/* Wheel-stop curbs at the back of the bay */}
        {(() => {
          const stopGeom = isVertical ? [cw * 0.7, 0.18, 0.22] : [0.22, 0.18, ch * 0.7];
          let sp: [number, number, number] = [0, cpElevation + 0.09, 0];
          if (isVertical) {
             if (openingSide === 'top') sp = [0, cpElevation + 0.09, ch / 2 - 0.7]; // entrance -Z, back is +Z
             else sp = [0, cpElevation + 0.09, -ch / 2 + 0.7]; // entrance +Z, back is -Z
          } else {
             if (openingSide === 'left') sp = [cw / 2 - 0.7, cpElevation + 0.09, 0]; // entrance -X, back is +X
             else sp = [-cw / 2 + 0.7, cpElevation + 0.09, 0]; // entrance +X, back is -X
          }
          return (
            <mesh position={sp} castShadow>
              <boxGeometry args={stopGeom as any} />
              <meshStandardMaterial color="#cfcfcf" roughness={0.85} />
            </mesh>
          );
        })()}
      </group>

      {/* ── Driveway: tarmac/asphalt slab from carport opening to plot edge ── */}
      {dwW > 0.5 && dwD > 0.5 && (
        <group>
          {/* Asphalt base — slightly higher to prevent lawn bleed */}
          <mesh receiveShadow position={[dwCX, 0.02, dwCZ]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[dwW, dwD]} />
            <meshStandardMaterial color="#3c3c40" roughness={1} />
          </mesh>
          {/* Light trim edge stripes */}
          {isVertical ? (
            <>
              <mesh position={[dwMinX + 0.12, 0.018, dwCZ]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[0.08, dwD]} />
                <meshBasicMaterial color="#e8e2c8" />
              </mesh>
              <mesh position={[dwMaxX - 0.12, 0.018, dwCZ]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[0.08, dwD]} />
                <meshBasicMaterial color="#e8e2c8" />
              </mesh>
            </>
          ) : (
            <>
              <mesh position={[dwCX, 0.018, dwMinZ + 0.12]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[dwW, 0.08]} />
                <meshBasicMaterial color="#e8e2c8" />
              </mesh>
              <mesh position={[dwCX, 0.018, dwMaxZ - 0.12]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[dwW, 0.08]} />
                <meshBasicMaterial color="#e8e2c8" />
              </mesh>
            </>
          )}
        </group>
      )}

      {/* ── Parked car ── */}
      <group position={[carX, cpElevation, carZ]} rotation={[0, carYaw, 0]} scale={[2.0, 2.0, 2.0]}>
        <ParkedCar color="#1f2a44" />
      </group>
    </group>
  );
};

/* Compute the corridor rectangles to keep clear of greenery (driveway + walkway). */
const computeCorridors = (
  plan: Plan,
  plotW: number,
  plotD: number,
  gateX: number,
  gateZ: number,
  gateSide: Side,
): Rect[] => {
  const rects: Rect[] = [];
  const halfPlotW = plotW / 2;
  const halfPlotD = plotD / 2;

  // Driveway corridor
  const ci = getCarportInfo(plan);
  if (ci) {
    const { cx, cz, w: cw, h: ch, side } = ci;
    const openingSide = gateSide;
    const isVertical = openingSide === 'top' || openingSide === 'bottom';
    if (isVertical) {
      const clearW = Math.max(cw / 2 + 1.5, 7.5);
      if (openingSide === 'top') rects.push({ minX: cx - clearW, maxX: cx + clearW, minZ: -halfPlotD - 1.0, maxZ: cz - ch / 2 + 1.0 });
      else rects.push({ minX: cx - clearW, maxX: cx + clearW, minZ: cz + ch / 2 - 1.0, maxZ: halfPlotD + 1.0 });
    } else {
      const clearH = Math.max(ch / 2 + 1.5, 7.5);
      if (openingSide === 'left') rects.push({ minX: -halfPlotW - 1.0, maxX: cx - cw / 2 + 1.0, minZ: cz - clearH, maxZ: cz + clearH });
      else rects.push({ minX: cx + cw / 2 - 1.0, maxX: halfPlotW + 1.0, minZ: cz - clearH, maxZ: cz + clearH });
    }
  }

  // Walkway corridor (gate to main door)
  const door = findMainDoorWorld(plan);
  if (door) {
    const wkW = 8.5; // Massive walkway clearance (17 units total width) to remove all surrounding bushes
    // Vertical leg from gate down toward door's z
    const aX = gateX;
    const aZ1 = gateZ;
    const aZ2 = door.z + door.nz * 1.0;
    rects.push({
      minX: Math.min(aX, door.x) - wkW,
      maxX: Math.max(aX, door.x) + wkW,
      minZ: Math.min(aZ1, aZ2),
      maxZ: Math.max(aZ1, aZ2),
    });
    // Extended approach to door to clear the entire stone pathway and foundation bushes
    rects.push({
      minX: Math.min(door.x - wkW, door.x + door.nx * 30 - wkW),
      maxX: Math.max(door.x + wkW, door.x + door.nx * 30 + wkW),
      // Start the clearance 4 units behind the door to catch foundation planting
      minZ: Math.min(door.z - door.nz * 4 - wkW, door.z + door.nz * 30 - wkW),
      maxZ: Math.max(door.z - door.nz * 4 + wkW, door.z + door.nz * 30 + wkW),
    });
  }
  return rects;
};

/* ─── Decor ─── */
const BROADLEAF_GREENS = ['#3d6e3a', '#4a7a44', '#2f5f2f', '#356a36', '#5a8b50'];
const CYPRESS_GREENS = ['#284e2c', '#1f4524', '#2c5630'];

type TreeKind = 'broadleaf' | 'cypress' | 'small';

const Tree = ({ kind, s, h, palette }: { kind: TreeKind; s: number; h: number; palette: number }) => {
  if (kind === 'cypress') {
    // Tall slim Italian cypress
    return (
      <group>
        <mesh castShadow position={[0, h * 0.06, 0]}>
          <cylinderGeometry args={[0.16 * s, 0.22 * s, h * 0.12, 8]} />
          <meshStandardMaterial color="#2a1c10" roughness={0.95} />
        </mesh>
        <mesh castShadow position={[0, h * 0.55, 0]}>
          <coneGeometry args={[0.85 * s, h * 0.96, 12]} />
          <meshStandardMaterial color={CYPRESS_GREENS[palette % CYPRESS_GREENS.length]} roughness={0.9} />
        </mesh>
      </group>
    );
  }
  if (kind === 'small') {
    return (
      <group>
        <mesh castShadow position={[0, h * 0.18, 0]}>
          <cylinderGeometry args={[0.12 * s, 0.18 * s, h * 0.36, 6]} />
          <meshStandardMaterial color="#3a2818" roughness={0.92} />
        </mesh>
        <mesh castShadow position={[0, h * 0.55, 0]}>
          <sphereGeometry args={[1.4 * s, 10, 8]} />
          <meshStandardMaterial color={BROADLEAF_GREENS[palette % BROADLEAF_GREENS.length]} roughness={0.9} />
        </mesh>
        <mesh castShadow position={[0.4 * s, 0.7 * h, 0.2 * s]}>
          <sphereGeometry args={[1.0 * s, 8, 7]} />
          <meshStandardMaterial color={BROADLEAF_GREENS[(palette + 2) % BROADLEAF_GREENS.length]} roughness={0.9} />
        </mesh>
      </group>
    );
  }
  // broadleaf — lush full canopy
  const trunkH = h * 0.55;
  return (
    <group>
      <mesh castShadow position={[0, trunkH * 0.5, 0]}>
        <cylinderGeometry args={[0.22 * s, 0.42 * s, trunkH, 8]} />
        <meshStandardMaterial color="#3a2818" roughness={0.95} />
      </mesh>
      {/* Layered canopy clusters for organic feel */}
      <mesh castShadow position={[0, trunkH + 1.2 * s, 0]}>
        <sphereGeometry args={[2.6 * s, 12, 10]} />
        <meshStandardMaterial color={BROADLEAF_GREENS[palette % BROADLEAF_GREENS.length]} roughness={0.9} />
      </mesh>
      <mesh castShadow position={[1.5 * s, trunkH + 0.8 * s, 0.7 * s]}>
        <sphereGeometry args={[1.9 * s, 10, 9]} />
        <meshStandardMaterial color={BROADLEAF_GREENS[(palette + 1) % BROADLEAF_GREENS.length]} roughness={0.9} />
      </mesh>
      <mesh castShadow position={[-1.3 * s, trunkH + 0.6 * s, -0.6 * s]}>
        <sphereGeometry args={[1.7 * s, 10, 8]} />
        <meshStandardMaterial color={BROADLEAF_GREENS[(palette + 2) % BROADLEAF_GREENS.length]} roughness={0.9} />
      </mesh>
      <mesh castShadow position={[0.3 * s, trunkH + 2.4 * s, -0.4 * s]}>
        <sphereGeometry args={[1.4 * s, 10, 8]} />
        <meshStandardMaterial color={BROADLEAF_GREENS[(palette + 3) % BROADLEAF_GREENS.length]} roughness={0.9} />
      </mesh>
      <mesh castShadow position={[-0.8 * s, trunkH + 2.0 * s, 0.5 * s]}>
        <sphereGeometry args={[1.2 * s, 8, 7]} />
        <meshStandardMaterial color={BROADLEAF_GREENS[(palette + 4) % BROADLEAF_GREENS.length]} roughness={0.9} />
      </mesh>
    </group>
  );
};

const Trees = ({ planW, planD, corridors = [] }: { planW: number; planD: number; corridors?: Rect[] }) => {
  const treeData = useMemo(() => {
    const arr: { x: number; z: number; s: number; h: number; kind: TreeKind; palette: number }[] = [];
    const hw = planW / 2;
    const hd = planD / 2;
    const blocked = (x: number, z: number) => pointInAnyRect(x, z, corridors, 1.2);

    // Background trees are now only placed at a significant distance from the plot

    // Distant background trees
    for (let i = 0; i < 18; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.max(hw, hd) + 32 + Math.random() * 40;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      if (Math.abs(x) < planW / 2 + 12 && Math.abs(z) < planD / 2 + 12) continue;
      if (blocked(x, z)) continue;
      arr.push({ x, z, s: 0.85 + Math.random() * 0.5, h: 7 + Math.random() * 5, kind: Math.random() < 0.18 ? 'cypress' : 'broadleaf', palette: i });
    }
    return arr;
  }, [planW, planD, corridors]);
  return (
    <group>
      {treeData.map((t, i) => (
        <group key={i} position={[t.x, 0, t.z]} rotation={[0, (i * 1.7) % (Math.PI * 2), 0]}>
          <Tree kind={t.kind} s={t.s} h={t.h} palette={t.palette} />
        </group>
      ))}
    </group>
  );
};

const POT_COLORS = ['#e85d75', '#f4a261', '#f7d046', '#9b5de5', '#f15bb5', '#fefae0', '#e76f51', '#8ac926', '#1982c4', '#ff595e'];

const FlowerPot = ({ x, z, flowerColor, potType = 'square' }: { x: number; z: number; flowerColor: string; potType?: 'round' | 'square' }) => {
  return (
    <group position={[x, 0, z]}>
      {/* Realistic Pot with Tapered Profile */}
      <mesh castShadow position={[0, 0.35, 0]}>
        {potType === 'square' ? <boxGeometry args={[0.8, 0.7, 0.8]} /> : <cylinderGeometry args={[0.5, 0.35, 0.8, 24]} />}
        <meshStandardMaterial color="#1a1a1a" roughness={0.3} metalness={0.5} />
      </mesh>
      {/* Polished Gold Decorative Band */}
      <mesh position={[0, 0.68, 0]}>
        {potType === 'square' ? <boxGeometry args={[0.85, 0.06, 0.85]} /> : <cylinderGeometry args={[0.52, 0.52, 0.06, 24]} />}
        <meshStandardMaterial color="#c9a84c" roughness={0.1} metalness={0.9} />
      </mesh>
      {/* Soil with dark organic texture */}
      <mesh position={[0, 0.65, 0]}>
        {potType === 'square' ? <boxGeometry args={[0.7, 0.1, 0.7]} /> : <cylinderGeometry args={[0.45, 0.45, 0.1, 16]} />}
        <meshStandardMaterial color="#1e140a" roughness={1} />
      </mesh>
      
      {/* Detailed Plant Structure */}
      <group position={[0, 0.75, 0]}>
        {/* Central Stem */}
        <mesh position={[0, 0.25, 0]}>
          <cylinderGeometry args={[0.03, 0.05, 0.6, 8]} />
          <meshStandardMaterial color="#1b3b1b" />
        </mesh>
        
        {/* Lush Base Leaves */}
        <group scale={[1.2, 0.8, 1.2]}>
          <mesh castShadow position={[0, 0.1, 0]}>
            <sphereGeometry args={[0.5, 12, 10]} />
            <meshStandardMaterial color="#2d5a2d" roughness={0.9} />
          </mesh>
        </group>

        {/* Realistic Flowers with Detailed Petals */}
        {[
          { p: [-0.3, 0.65, 0.1], s: 0.22 },
          { p: [0.25, 0.55, 0.3], s: 0.25 },
          { p: [0.05, 0.75, -0.2], s: 0.2 }
        ].map((f, i) => (
          <group key={i} position={f.p as [number, number, number]}>
            {/* 6 Petals arranged in a bloom */}
            {Array.from({ length: 6 }).map((_, pi) => {
              const angle = (pi / 6) * Math.PI * 2;
              return (
                <mesh 
                  key={pi} 
                  position={[Math.cos(angle) * 0.12, 0, Math.sin(angle) * 0.12]}
                  rotation={[0.5, angle, 0]}
                >
                  <boxGeometry args={[0.2, 0.25, 0.01]} />
                  <meshStandardMaterial color={flowerColor} roughness={0.3} side={THREE.DoubleSide} />
                </mesh>
              );
            })}
            {/* Detailed center */}
            <mesh position={[0, 0.05, 0]}>
              <sphereGeometry args={[0.08, 8, 8]} />
              <meshStandardMaterial color="#443300" emissive="#ffcc00" emissiveIntensity={0.2} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
};

const Bushes = ({ planW, planD, corridors = [] }: { planW: number; planD: number; corridors?: Rect[] }) => {
  const pots = useMemo(() => {
    const hw = planW / 2;
    const hd = planD / 2;
    const arr: { x: number; z: number; c: string; type: 'round' | 'square' }[] = [];
    const blocked = (x: number, z: number) => pointInAnyRect(x, z, corridors, 0.8);

    // RESTRICTED TO FRONT GARDEN ONLY
    const spacing = 4.0;
    // Front Garden Row (inside the fence area)
    for (let x = -hw + 3; x <= hw - 3; x += spacing) {
      const zPos = hd - 2.5; // Moved slightly further inside the plot
      if (blocked(x, zPos)) continue;
      arr.push({ 
        x, 
        z: zPos, 
        c: POT_COLORS[Math.abs(Math.floor(x * 1.7)) % POT_COLORS.length],
        type: (Math.abs(Math.floor(x)) % 2 === 0) ? 'square' : 'round'
      });
    }

    return arr;
  }, [planW, planD, corridors]);

  return (
    <group>
      {pots.map((p, i) => (
        <FlowerPot key={i} x={p.x} z={p.z} flowerColor={p.c} potType={p.type} />
      ))}
    </group>
  );
};

/* ─── Mulch beds + Stepping-Stone path ─── */
const LandscapeBeds = ({ plan, gateX, corridors }: { plan: Plan; gateX: number; corridors: Rect[] }) => {
  const halfW = plan.width / 2;
  const halfD = plan.height / 2;
  const bedWidth = 1.8;
  const bedDepth = 1.2;
  const mulchColor = "#4a3020";

  const inCorridor = (x: number, z: number) => {
    return corridors.some(c => x >= c.minX && x <= c.maxX && z >= c.minZ && z <= c.maxZ);
  };

  return (
    <group>
      {/* Mulch perimeter strips along walls (slightly wider than bushes) */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, -halfD - 1.5]}>
        <planeGeometry args={[plan.width + 4, 1.6]} />
        <meshStandardMaterial color={mulchColor} roughness={1} />
      </mesh>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[-halfW - 1.5, 0.005, 0]}>
        <planeGeometry args={[1.6, plan.height + 4]} />
        <meshStandardMaterial color={mulchColor} roughness={1} />
      </mesh>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[halfW + 1.5, 0.005, 0]}>
        <planeGeometry args={[1.6, plan.height + 4]} />
        <meshStandardMaterial color={mulchColor} roughness={1} />
      </mesh>
      {/* Front mulch (split around path) */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[(-halfW + (gateX - 2.5)) / 2, 0.005, halfD - 1.0]}>
        <planeGeometry args={[Math.max(0.1, (gateX - 2.5) - (-halfW)), 1.4]} />
        <meshStandardMaterial color={mulchColor} roughness={1} />
      </mesh>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[((gateX + 2.5) + halfW) / 2, 0.005, halfD - 1.0]}>
        <planeGeometry args={[Math.max(0.1, halfW - (gateX + 2.5)), 1.4]} />
        <meshStandardMaterial color={mulchColor} roughness={1} />
      </mesh>
    </group>
  );
};

const FrontWalkway = ({ plan, gateX, plotD }: { plan: Plan; gateX: number; plotD: number }) => {
  return null; // Removed legacy white pathway in favor of the new custom marble pathway
};

const FenceAround = ({ planW, planD, gates, isNight }: { planW: number; planD: number; gates: any[]; isNight?: boolean }) => {
  const hw = planW / 2;
  const hd = planD / 2;

  // Corner pillars
  const pillars: [number, number][] = [[-hw, -hd], [-hw, hd], [hw, -hd], [hw, hd]];
  
  // Posts
  const posts: [number, number][] = [];
  const isPointInAnyGate = (x: number, z: number) => {
    return gates.some(g => {
      const half = g.isCarGate ? 6.0 : 2.2;
      if (g.side === 'top' || g.side === 'bottom') {
        return Math.abs(z - g.z) < 0.1 && x > g.x - half && x < g.x + half;
      } else {
        return Math.abs(x - g.x) < 0.1 && z > g.z - half && z < g.z + half;
      }
    });
  };

  for (let x = -hw; x <= hw; x += 3) {
    if (!isPointInAnyGate(x, -hd)) posts.push([x, -hd]);
    if (!isPointInAnyGate(x, hd)) posts.push([x, hd]);
  }
  for (let z = -hd + 3; z < hd; z += 3) {
    if (!isPointInAnyGate(-hw, z)) posts.push([-hw, z]);
    if (!isPointInAnyGate(hw, z)) posts.push([hw, z]);
  }

  return (
    <group>
      {/* Corner pillars */}
      {pillars.map(([x, z], i) => (
        <group key={`pillar-${i}`} position={[x, 0, z]}>
          <mesh castShadow position={[0, 1.5, 0]}>
            <boxGeometry args={[0.5, 3.2, 0.5]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.4} metalness={0.1} />
          </mesh>
          <mesh position={[0, 3.2, 0]}>
            <boxGeometry args={[0.6, 0.15, 0.6]} />
            <meshStandardMaterial color="#333" roughness={0.3} metalness={0.5} />
          </mesh>
          {/* Pillar cap light */}
          <mesh position={[0, 3.25, 0]}>
            <boxGeometry args={[0.22, 0.12, 0.22]} />
            <meshStandardMaterial 
              color="#fff" 
              emissive="#ffcc80" 
              emissiveIntensity={isNight ? 4 : 0.8} 
            />
          </mesh>
          {isNight && (
            <pointLight position={[0, 3.3, 0]} intensity={15} distance={12} color="#ffcc80" castShadow />
          )}
        </group>
      ))}
      {/* Fence posts */}
      {posts.map(([x, z], i) => (
        <group key={i} position={[x, 1.3, z]}>
          <mesh castShadow>
            <boxGeometry args={[0.14, 2.6, 0.14]} />
            <meshStandardMaterial color="#0a0a0a" roughness={0.3} metalness={0.6} />
          </mesh>
          {/* Post cap */}
          <mesh position={[0, 1.35, 0]}>
            <boxGeometry args={[0.18, 0.08, 0.18]} />
            <meshStandardMaterial color="#c9a84c" roughness={0.2} metalness={0.9} />
          </mesh>
        </group>
      ))}
      {/* Horizontal rails (3 levels for modern look) */}
      {[0.6, 1.4, 2.2].map((y) => (
        <group key={y}>
          {/* Back Wall */}
          {(() => {
            const sideGates = gates.filter(g => g.side === 'top');
            if (sideGates.length > 0) {
              // Complicated: multiple gaps. For simplicity, we just check segments.
              // We'll use a simpler approach: check if point is in any gate.
              return null; // Handle below
            }
            return <mesh position={[0, y, -hd]}><boxGeometry args={[hw * 2, 0.08, 0.06]} /><meshStandardMaterial color="#555" roughness={0.5} metalness={0.15} /></mesh>;
          })()}
          
          {/* Optimized Rail Rendering with multi-gate support */}
          {['top', 'bottom', 'left', 'right'].map(side => {
            const sideGates = gates.filter(g => g.side === side);
            const isVert = side === 'left' || side === 'right';
            const coord = (side === 'left' || side === 'top') ? (isVert ? -hw : -hd) : (isVert ? hw : hd);
            
            if (sideGates.length === 0) {
            const pos: [number, number, number] = isVert ? [coord, y, 0] : [0, y, coord];
            const size: [number, number, number] = isVert ? [0.08, 0.08, hd * 2] : [hw * 2, 0.08, 0.08];
            return <mesh key={`${side}-${y}`} position={pos}><boxGeometry args={size} /><meshStandardMaterial color="#0a0a0a" roughness={0.3} metalness={0.6} /></mesh>;
          }

          // Render segments between gates
          const segments: any[] = [];
          const halfLen = isVert ? hd : hw;
          const sortedGates = [...sideGates].sort((a, b) => (isVert ? a.z - b.z : a.x - b.x));
          
          let last = -halfLen;
          sortedGates.forEach((g, idx) => {
            const gHalf = g.isCarGate ? 6.0 : 2.2;
            const gStart = (isVert ? g.z : g.x) - gHalf;
            const gEnd = (isVert ? g.z : g.x) + gHalf;
            
            if (gStart > last) {
              const len = gStart - last;
              const mid = last + len / 2;
              segments.push({ mid, len });
            }
            last = gEnd;
          });
          if (last < halfLen) {
            const len = halfLen - last;
            const mid = last + len / 2;
            segments.push({ mid, len });
          }

          return segments.map((seg, i) => (
            <mesh key={`${side}-${y}-${i}`} position={isVert ? [coord, y, seg.mid] : [seg.mid, y, coord]}>
              <boxGeometry args={isVert ? [0.08, 0.08, seg.len] : [seg.len, 0.08, 0.08]} />
              <meshStandardMaterial color="#0a0a0a" roughness={0.3} metalness={0.6} />
            </mesh>
          ));
          })}
        </group>
      ))}

      {/* Entrance gates */}
      {gates.map((g, i) => {
        const gHalf = g.isCarGate ? 6.0 : 2.2;
        return (
          <group key={`gate-${i}`} position={[g.x, 0, g.z]} rotation={[0, (g.side === 'left' || g.side === 'right') ? Math.PI / 2 : 0, 0]}>
            {/* Unified Gate Posts */}
            <mesh castShadow position={[-gHalf, 1.5, 0]}>
              <boxGeometry args={[0.32, 3.4, 0.32]} />
              <meshStandardMaterial color="#1a1a1a" roughness={0.3} metalness={0.6} />
            </mesh>
            <mesh castShadow position={[gHalf, 1.5, 0]}>
              <boxGeometry args={[0.32, 3.4, 0.32]} />
              <meshStandardMaterial color="#1a1a1a" roughness={0.3} metalness={0.6} />
            </mesh>
            
            {/* Premium Sliding/Panel Logic for Both Gates */}
            <group position={[0, 1.4, 0.02]}>
              {/* Left Panel */}
              <mesh castShadow position={[-gHalf / 2, 0, 0]}>
                <boxGeometry args={[gHalf - 0.2, 2.8, 0.12]} />
                <meshPhysicalMaterial color="#0d0d0d" roughness={0.15} metalness={0.7} clearcoat={1} />
              </mesh>
              {/* Right Panel */}
              <mesh castShadow position={[gHalf / 2, 0, 0]}>
                <boxGeometry args={[gHalf - 0.2, 2.8, 0.12]} />
                <meshPhysicalMaterial color="#0d0d0d" roughness={0.15} metalness={0.7} clearcoat={1} />
              </mesh>
              
              {/* Unified Decorative Gold Slats */}
              {Array.from({ length: 8 }).map((_, idx) => {
                const sy = -1.2 + idx * 0.35;
                return (
                  <mesh key={idx} position={[0, sy, 0.08]}>
                    <boxGeometry args={[gHalf * 2 - 0.4, 0.04, 0.03]} />
                    <meshStandardMaterial color="#c9a84c" roughness={0.1} metalness={0.9} />
                  </mesh>
                );
              })}
            </group>
          </group>
        );
      })}
    </group>
  );
};

/* ─── Second Floor (Double Storey) ─── */
const SecondFloor = ({ plan, firstFloorPlan, roof, material, activeRoom, addons = [], hideRoof }: {
  plan: Plan; firstFloorPlan: Plan; roof: RoofType; material: Material; activeRoom?: string | null; addons?: AddOn[]; hideRoof?: boolean;
}) => {
  const colors = MATERIAL_COLORS[material];
  const W = plan.width;
  const D = plan.height;
  const wallH = 13;
  const t = 0.4;
  const floorY = wallH + 0.8; // Height of ground floor walls + foundation
  const round2 = (n: number) => Math.round(n * 100) / 100;

  // Use firstFloorPlan dimensions (may be smaller than ground)
  const ffW = firstFloorPlan.width;
  const ffH = firstFloorPlan.height;
  const upperOffsetX = round2(-W / 2 + (W - ffW) / 2);
  const upperOffsetZ = round2(-D / 2 + (D - ffH) / 2);
  const upperRoofRooms = (firstFloorPlan?.rooms || []).filter(r => r.type !== 'garden' && r.type !== 'carport' && r.type !== 'balcony' && r.type !== 'hallway');
  const upperMinX = upperRoofRooms.length ? Math.min(...upperRoofRooms.map(r => r.x)) : 0;
  const upperMaxX = upperRoofRooms.length ? Math.max(...upperRoofRooms.map(r => r.x + r.w)) : ffW;
  const upperMinZ = upperRoofRooms.length ? Math.min(...upperRoofRooms.map(r => r.y)) : 0;
  const upperMaxZ = upperRoofRooms.length ? Math.max(...upperRoofRooms.map(r => r.y + r.h)) : ffH;
  const upperRoofW = round2(upperMaxX - upperMinX);
  const upperRoofD = round2(upperMaxZ - upperMinZ);
  const upperRoofCX = round2((upperMinX + upperMaxX) / 2);
  const upperRoofCZ = round2((upperMinZ + upperMaxZ) / 2);

  // Extract walls for first floor
  const extractedWalls: any[] = [];
  const addWall = (type: 'h'|'v', coord: number, start: number, end: number, doors: any[], windows: any[]) => {
    coord = round2(coord); start = round2(start); end = round2(end);
    const existing = extractedWalls.find(w => w.type === type && w.coord === coord &&
      (Math.max(w.start, start) <= Math.min(w.end, end) + 0.1));
    if (existing) {
      existing.start = Math.min(existing.start, start);
      existing.end = Math.max(existing.end, end);
      existing.doors.push(...doors); existing.windows.push(...windows);
    } else {
      extractedWalls.push({ type, coord, start, end, doors: [...doors], windows: [...windows] });
    }
  };

  (firstFloorPlan?.rooms || []).forEach(room => {
    if (room.type === 'garden' || room.type === 'carport' || room.type === 'balcony' || room.type === 'hallway') return;
    const rX = room.x, rY = room.y, rW = room.w, rH = room.h;
    const getAbsDoors = (wall: string) => (room.doors || []).filter((d:any) => d.wall === wall).map((d:any) => {
      let doorCategory: 'main' | 'room' | 'bathroom' = 'room';
      if (d.label === 'MAIN DOOR' || (!d.connectsTo && d.doorType !== 'open')) {
        doorCategory = 'main';
      } else if (room.type === 'bathroom') {
        doorCategory = 'bathroom';
      } else {
        const connRoom = (firstFloorPlan?.rooms || []).find(r => r.id === d.connectsTo);
        if (connRoom?.type === 'bathroom') doorCategory = 'bathroom';
      }
      return {
        ...d, doorCategory,
        absPos: (wall === 'top' || wall === 'bottom') ? rX + rW * d.position : rY + rH * d.position
      };
    });
    const getAbsWindows = (wall: string) => (room.windows || []).filter((w:any) => w.wall === wall).map((win:any) => ({
      ...win, absPos: (wall === 'top' || wall === 'bottom') ? rX + rW * win.position : rY + rH * win.position
    }));
    addWall('h', rY, rX, rX + rW, getAbsDoors('top'), getAbsWindows('top'));
    addWall('h', rY + rH, rX, rX + rW, getAbsDoors('bottom'), getAbsWindows('bottom'));
    addWall('v', rX, rY, rY + rH, getAbsDoors('left'), getAbsWindows('left'));
    addWall('v', rX + rW, rY, rY + rH, getAbsDoors('right'), getAbsWindows('right'));
  });

  return (
    <group position={[0, floorY, 0]}>
      {/* Floor slab */}
      <mesh receiveShadow position={[round2((ffW - W) / 2), 0.15, round2((ffH - D) / 2)]}>
        <boxGeometry args={[ffW + 0.5, 0.3, ffH + 0.5]} />
        <meshStandardMaterial color="#9a8a78" roughness={0.8} />
      </mesh>

      <group position={[upperOffsetX, 0.3, upperOffsetZ]}>
        {/* Room floors */}
        {(firstFloorPlan?.rooms || []).filter(r => r.type !== 'garden' && r.type !== 'carport' && r.type !== 'balcony').map(r => {
          const cx = round2(r.x + r.w / 2);
          const cz = round2(r.y + r.h / 2);
          return (
            <group key={r.id}>
              <mesh receiveShadow position={[cx, 0.01, cz]}>
                <boxGeometry args={[r.w, 0.02, r.h]} />
                <meshStandardMaterial color={r.color} roughness={0.8} />
              </mesh>
              {/* Furniture */}
              {r.furniture.map((f: any, i: number) => (
                <group key={`f-${i}`} position={[round2(r.x + f.x + f.w/2), 0.02, round2(r.y + f.y + f.h/2)]}
                  rotation={[0, f.rotation ? f.rotation * Math.PI / 180 : 0, 0]}>
                  <Furniture3D item={f} />
                </group>
              ))}
            </group>
          );
        })}

        {/* Walls */}
        {extractedWalls.map((wall, i) => {
          const len = wall.end - wall.start;
          const w = len + t;
          const mappedDoors = wall.doors.map((d:any) => ({...d, relPos: (d.absPos - wall.start + t/2) / w}));
          const mappedWindows = wall.windows.map((win:any) => ({...win, relPos: (win.absPos - wall.start + t/2) / w}));
          if (wall.type === 'h') {
            return <WallSegment key={`w2-${i}`} w={w} h={wallH} t={t} color={colors.wall}
              doors={mappedDoors} windows={mappedWindows} materialType={material}
              position={[round2(wall.start + len/2), 0, round2(wall.coord)]} rotation={[0, 0, 0]}
              frameColor={colors.trim} glassColor={colors.window} doorColor={colors.door} hideRoof={hideRoof} />;
          } else {
            return <WallSegment key={`w2-${i}`} w={w} h={wallH} t={t} color={colors.wall}
              doors={mappedDoors} windows={mappedWindows} materialType={material}
              position={[round2(wall.coord), 0, round2(wall.start + len/2)]} rotation={[0, -Math.PI/2, 0]}
              frameColor={colors.trim} glassColor={colors.window} doorColor={colors.door} hideRoof={hideRoof} />;
          }
        })}

        {roof === 'gable' ? (
          <GableRoof W={upperRoofW} D={upperRoofD} cx={upperRoofCX} cz={upperRoofCZ} wallH={wallH} color={colors.roof} trimColor={colors.trim} rodColor={colors.rod} transparent={hideRoof} opacity={hideRoof ? 0.1 : 1} />
        ) : (
          <FlatRoof W={upperRoofW} D={upperRoofD} cx={upperRoofCX} cz={upperRoofCZ} wallH={wallH} color={colors.roof} transparent={hideRoof} opacity={hideRoof ? 0.1 : 1} />
        )}

        {addons.includes('solar') && !hideRoof && <SolarPanels minX={upperMinX} maxX={upperMaxX} minZ={upperMinZ} maxZ={upperMaxZ} roofType={roof} wallH={wallH} />}
        {addons.includes('water_tank') && !hideRoof && <WaterTank maxX={upperMaxX} maxZ={upperMaxZ} wallH={wallH} roofType={roof} />}

        {/* Room labels */}
        {(firstFloorPlan?.rooms || []).map(r => (
          <Html key={`label2-${r.id}`} position={[r.x + r.w/2, 3, r.y + r.h/2]} center zIndexRange={[100, 0]}>
            <div className="pointer-events-none px-3 py-1 rounded-sm bg-white/90 border border-black/10 shadow-lg text-[10px] font-display font-bold tracking-widest whitespace-nowrap">
              {r.label}
            </div>
          </Html>
        ))}
      </group>
    </group>
  );
};

