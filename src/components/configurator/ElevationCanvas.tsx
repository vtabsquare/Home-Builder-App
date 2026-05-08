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
  createMarbleTexture, createMarbleRoughness,
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
      return { x: x - W / 2, z: z - D / 2, nx, nz };
    }
  }
  return null;
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
  const animProgress = useRef(1); // 1 = animation complete (idle)
  const targetPos = useRef(new THREE.Vector3(45, 25, 45));
  const targetLookAt = useRef(new THREE.Vector3(0, 0, 0));

  // When activeRoom changes, restart the animation
  useEffect(() => {
    if (activeRoom !== prevRoom.current) {
      prevRoom.current = activeRoom;
      animProgress.current = 0; // start animation

      if (!activeRoom || activeRoom === 'overview' || activeRoom === 'garden') {
        targetPos.current.set(45, 25, 45);
        targetLookAt.current.set(0, 0, 0);
      } else {
        const rs = (plan.rooms || []).filter(r => r.type === activeRoom);
        if (rs.length > 0) {
          const avgX = rs.reduce((sum, r) => sum + r.x + r.w / 2, 0) / rs.length;
          const avgY = rs.reduce((sum, r) => sum + r.y + r.h / 2, 0) / rs.length;
          const center = new THREE.Vector3(avgX - W / 2, 0, avgY - D / 2);

          const minX = Math.min(...rs.map(r => r.x));
          const maxX = Math.max(...rs.map(r => r.x + r.w));
          const minY = Math.min(...rs.map(r => r.y));
          const maxY = Math.max(...rs.map(r => r.y + r.h));
          const extent = Math.max(maxX - minX, maxY - minY);

          // Top-down view: camera directly above the room
          const height = Math.max(40, extent * 2);
          targetPos.current.set(center.x, height, center.z);
          targetLookAt.current.copy(center);
        }
      }
    }
  }, [activeRoom, plan, W, D]);

  useFrame((state, delta) => {
    // Only animate while progress < 1
    if (animProgress.current >= 1) return;

    const controls = state.controls as any;
    if (!controls) return;

    // Advance progress (reaches 1 in roughly 0.8-1 seconds)
    animProgress.current = Math.min(1, animProgress.current + delta * 2.5);
    const t = animProgress.current;
    // Smooth ease-out curve
    const ease = 1 - Math.pow(1 - t, 3);

    state.camera.position.lerp(targetPos.current, ease * 0.15);
    controls.target.lerp(targetLookAt.current, ease * 0.15);
  });

  return null;
};

export const ElevationCanvas = ({ plan, roof, material, addons = [], activeRoom, isDoubleStorey = false, firstFloorPlan, hideHelpers = false, isNight = false }: Props) => {
  const hideRoof = activeRoom && activeRoom !== 'overview' && activeRoom !== 'garden';
  const safeW = plan.width || 0;
  const safeD = plan.height || 0;
  const plotW = safeW + PLOT_PADDING_FT * 2;
  const plotD = safeD + PLOT_PADDING_FT * 2;
  const gatePos = Math.max(0.1, Math.min(0.9, plan.plotEntranceX ?? 0.5));
  const gateX = -plotW / 2 + gatePos * plotW;

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
          
          <House plan={plan} roof={roof} material={material} activeRoom={activeRoom} addons={addons} isNight={isNight} hideRoof={!!hideRoof} />
          
          {/* Second Floor (Double Storey) */}
          {isDoubleStorey && firstFloorPlan && (
            <SecondFloor plan={plan} firstFloorPlan={firstFloorPlan} material={material} activeRoom={activeRoom} hideRoof={hideRoof} />
          )}
          
          
          {addons.includes('carport') && <Carport plan={plan} plotW={plotW} plotD={plotD} />}

          {addons.includes('landscaping') && (() => {
            const corridors = computeCorridors(plan, plotW, plotD, gateX);
            return (
              <>
                <LandscapeBeds plan={plan} gateX={gateX} corridors={corridors} />
                <FrontWalkway plan={plan} gateX={gateX} plotD={plotD} />
                <Trees planW={plotW} planD={plotD} />
                <Bushes planW={plotW} planD={plotD} corridors={corridors} />
              </>
            );
          })()}
          {addons.includes('fence') && <FenceAround planW={plotW} planD={plotD} gateX={gateX} />}
          
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
    {/* Driveway/courtyard pad */}
    <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 35]}>
      <planeGeometry args={[12, 25]} />
      <meshStandardMaterial color="#9a9088" roughness={0.85} />
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
      {/* Front featured trees */}
      <group position={[-planW * 0.18, 0, planD / 2 - 1.4]}>
        <mesh castShadow position={[0, 2.8, 0]}>
          <cylinderGeometry args={[0.24, 0.34, 5.4, 7]} />
          <meshStandardMaterial color="#3a2a1a" roughness={0.9} />
        </mesh>
        <mesh castShadow position={[0, 5.8, 0]}>
          <sphereGeometry args={[2.3, 10, 8]} />
          <meshStandardMaterial color="#2f5f2f" roughness={0.85} />
        </mesh>
      </group>
      <group position={[planW * 0.18, 0, planD / 2 - 1.3]}>
        <mesh castShadow position={[0, 2.7, 0]}>
          <cylinderGeometry args={[0.22, 0.33, 5.2, 7]} />
          <meshStandardMaterial color="#3a2a1a" roughness={0.9} />
        </mesh>
        <mesh castShadow position={[0, 5.6, 0]}>
          <sphereGeometry args={[2.2, 10, 8]} />
          <meshStandardMaterial color="#366836" roughness={0.85} />
        </mesh>
      </group>
    </group>
  );
};

/* ─── Main House Component ─── */
const House = ({ plan, roof, material, activeRoom, addons, isNight = false, hideRoof = false }: {
  plan: Plan; roof: RoofType; material: Material; activeRoom?: string | null; addons: AddOn[]; isNight?: boolean; hideRoof?: boolean;
}) => {
  const colors = MATERIAL_COLORS[material];
  const W = plan.width;
  const D = plan.height;
  const wallH = 13;
  const t = 0.4; // Realistic wall thickness

  const round2 = (num: number) => Math.round(num * 100) / 100;

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
    
    // Find overlapping wall segment
    const existing = extractedWalls.find(w => w.type === type && w.coord === coord && 
      (Math.max(w.start, start) <= Math.min(w.end, end) + 0.1));
    
    if (existing) {
      existing.start = Math.min(existing.start, start);
      existing.end = Math.max(existing.end, end);
      existing.doors.push(...doors);
      existing.windows.push(...windows);
    } else {
      extractedWalls.push({ type, coord, start, end, doors: [...doors], windows: [...windows] });
    }
  };

  (plan.rooms || []).forEach(room => {
    // Only extract solid walls for enclosed rooms.
    // Hallways are floor-only corridors — their perimeter walls (if any)
    // come from adjacent rooms (bedrooms, bathrooms, kitchen) via dedup.
    if (room.type === 'garden' || room.type === 'carport' || room.type === 'balcony' || room.type === 'hallway') return;

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
        ...d, doorCategory,
        absPos: (wall === 'top' || wall === 'bottom') ? rX + rW * d.position : rY + rH * d.position
      };
    });
    const getAbsWindows = (wall: string) => (room.windows || []).filter((w:any) => w.wall === wall).map((win:any) => ({
      ...win, absPos: (wall === 'top' || wall === 'bottom') ? rX + rW * win.position : rY + rH * win.position
    }));

    // 2. Add walls perfectly aligned to room edges
    addWall('h', rY, rX, rX + rW, getAbsDoors('top'), getAbsWindows('top'));
    addWall('h', rY + rH, rX, rX + rW, getAbsDoors('bottom'), getAbsWindows('bottom'));
    addWall('v', rX, rY, rY + rH, getAbsDoors('left'), getAbsWindows('left'));
    addWall('v', rX + rW, rY, rY + rH, getAbsDoors('right'), getAbsWindows('right'));
  });

  // Find main entrance door position for canopy & wall lights
  let mainDoorPos: { x: number; z: number; nx: number; nz: number } | null = null;
  for (const wall of extractedWalls) {
    for (const door of wall.doors) {
      if (door.doorCategory === 'main') {
        if (wall.type === 'h') {
          mainDoorPos = { x: round2(door.absPos - W/2), z: round2(wall.coord - D/2), nx: 0, nz: wall.coord <= minZ + 0.5 ? -1 : 1 };
        } else {
          mainDoorPos = { x: round2(wall.coord - W/2), z: round2(door.absPos - D/2), nx: wall.coord <= minX + 0.5 ? -1 : 1, nz: 0 };
        }
        break;
      }
    }
    if (mainDoorPos) break;
  }

  return (
    <group position={[0, 0, 0]}>
      {/* Foundation */}
      <mesh receiveShadow position={[roofCX, 0.4, roofCZ]}>
        <boxGeometry args={[roofW + 1, 0.8, roofD + 1]} />
        <meshStandardMaterial color="#8a8478" roughness={0.9} />
      </mesh>

      {/* Render Room Floors & Furniture */}
      <group position={[0, 0.8, 0]}>
        {(plan.rooms || []).map(r => {
          // 3. Consistent Coordinate System centered translation
          const cx = round2(r.x + r.w / 2 - W / 2);
          const cz = round2(r.y + r.h / 2 - D / 2);
          const isActive = activeRoom === r.type;
          
          return (
            <group key={r.id} position={[0, 0, 0]}>
              {/* Floor — per-room realistic PBR materials */}
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
              
              {/* Ceiling — false ceiling with recessed depth */}
              {!hideRoof && r.type !== 'garden' && r.type !== 'carport' && r.type !== 'balcony' && (
                <>
                  {/* Main ceiling slab */}
                  <mesh position={[cx, wallH - 0.01, cz]}>
                    <boxGeometry args={[r.w - 0.1, 0.02, r.h - 0.1]} />
                    <meshStandardMaterial color="#fafaf6" roughness={0.95} />
                  </mesh>
                  {/* Cove drop band — perimeter false-ceiling */}
                  <mesh position={[cx, wallH - 0.18, cz]}>
                    <boxGeometry args={[r.w - 1.2, 0.08, r.h - 1.2]} />
                    <meshStandardMaterial color="#f4f1eb" roughness={0.9} />
                  </mesh>
                  {/* Cove warm LED strip emissive border (subtle) */}
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

              {/* Recessed ceiling downlights — array based on room size */}
              {!hideRoof && r.type !== 'garden' && r.type !== 'carport' && r.type !== 'balcony' && (() => {
                const cols = Math.max(1, Math.min(3, Math.floor(r.w / 4)));
                const rows = Math.max(1, Math.min(3, Math.floor(r.h / 4)));
                const lights: any[] = [];
                for (let ri = 0; ri < rows; ri++) {
                  for (let ci = 0; ci < cols; ci++) {
                    const lx = cx - r.w / 2 + (r.w / (cols + 1)) * (ci + 1);
                    const lz = cz - r.h / 2 + (r.h / (rows + 1)) * (ri + 1);
                    lights.push(
                      <group key={`dl-${ri}-${ci}`} position={[lx, wallH - 0.05, lz]}>
                        {/* Recessed housing */}
                        <mesh>
                          <cylinderGeometry args={[0.18, 0.18, 0.06, 18]} />
                          <meshStandardMaterial color="#e8e4dc" roughness={0.5} metalness={0.2} />
                        </mesh>
                        {/* Warm emissive LED face */}
                        <mesh position={[0, -0.04, 0]}>
                          <cylinderGeometry args={[0.13, 0.13, 0.02, 18]} />
                          <meshStandardMaterial color="#fff5dc" emissive="#ffd9a0" emissiveIntensity={isNight ? 2.2 : 0.7} />
                        </mesh>
                      </group>
                    );
                  }
                }
                return <>{lights}</>;
              })()}

              {/* Interior view: warm fill + recessed downlight array */}
              {hideRoof && r.type !== 'garden' && r.type !== 'carport' && r.type !== 'balcony' && (() => {
                const cols = Math.max(1, Math.min(3, Math.floor(r.w / 4)));
                const rows = Math.max(1, Math.min(3, Math.floor(r.h / 4)));
                const items: any[] = [];
                for (let ri = 0; ri < rows; ri++) {
                  for (let ci = 0; ci < cols; ci++) {
                    const lx = cx - r.w / 2 + (r.w / (cols + 1)) * (ci + 1);
                    const lz = cz - r.h / 2 + (r.h / (rows + 1)) * (ri + 1);
                    items.push(
                      <pointLight key={`il-${ri}-${ci}`} position={[lx, wallH - 0.5, lz]} intensity={isNight ? 1.8 : 0.9} distance={14} color="#ffe0b8" castShadow={false} />
                    );
                  }
                }
                items.push(
                  <pointLight key="fill" position={[cx, wallH - 1, cz]} intensity={isNight ? 0.6 : 0.5} distance={Math.max(r.w, r.h) * 1.2} color="#fff2dc" castShadow={false} />
                );
                return <>{items}</>;
              })()}
              
              {/* Skirting boards — slim modern profile */}
              {r.type !== 'garden' && r.type !== 'carport' && r.type !== 'balcony' && (
                <>
                  <mesh position={[cx, 0.18, cz - r.h / 2 + 0.04]}>
                    <boxGeometry args={[r.w, 0.36, 0.06]} />
                    <meshStandardMaterial color="#f0ece2" roughness={0.55} />
                  </mesh>
                  <mesh position={[cx, 0.18, cz + r.h / 2 - 0.04]}>
                    <boxGeometry args={[r.w, 0.36, 0.06]} />
                    <meshStandardMaterial color="#f0ece2" roughness={0.55} />
                  </mesh>
                  <mesh position={[cx - r.w / 2 + 0.04, 0.18, cz]}>
                    <boxGeometry args={[0.06, 0.36, r.h]} />
                    <meshStandardMaterial color="#f0ece2" roughness={0.55} />
                  </mesh>
                  <mesh position={[cx + r.w / 2 - 0.04, 0.18, cz]}>
                    <boxGeometry args={[0.06, 0.36, r.h]} />
                    <meshStandardMaterial color="#f0ece2" roughness={0.55} />
                  </mesh>
                </>
              )}

              {/* ── Living room accent wall ── (wood vertical slats on the longest interior wall) */}
              {hideRoof && ['living', 'hall', 'lobby'].includes(r.type) && (() => {
                // Pick one short edge of the room (whichever has more depth potential)
                const onLongSide = r.w >= r.h;
                const accentWidth = onLongSide ? r.w * 0.85 : 0.18;
                const accentDepth = onLongSide ? 0.18 : r.h * 0.85;
                const accentY = wallH * 0.5;
                const accentH = wallH * 0.92;
                const px = cx;
                const pz = onLongSide ? cz - r.h / 2 + 0.12 : cz;
                const pxAlt = onLongSide ? cx : cx - r.w / 2 + 0.12;
                return (
                  <group position={[onLongSide ? px : pxAlt, accentY, onLongSide ? pz : cz]}>
                    {/* Backing panel */}
                    <mesh receiveShadow>
                      <boxGeometry args={[accentWidth, accentH, accentDepth]} />
                      <meshStandardMaterial color="#5a3d24" map={doorTextures?.map} normalMap={doorTextures?.normal} normalScale={new THREE.Vector2(0.4, 0.4)} roughness={0.5} envMapIntensity={0.6} />
                    </mesh>
                    {/* Vertical slat reveals */}
                    {Array.from({ length: 9 }).map((_, si) => {
                      const off = (si - 4) * (onLongSide ? accentWidth / 9 : 0);
                      const offZ = (si - 4) * (onLongSide ? 0 : accentDepth / 9);
                      return (
                        <mesh key={`slat-${si}`} position={[onLongSide ? off : 0, 0, onLongSide ? accentDepth / 2 + 0.005 : offZ]}>
                          <boxGeometry args={[onLongSide ? 0.05 : 0.02, accentH, onLongSide ? 0.02 : 0.05]} />
                          <meshStandardMaterial color="#1a1208" roughness={0.7} />
                        </mesh>
                      );
                    })}
                  </group>
                );
              })()}

              {/* ── Bathroom: interior wall tile cladding (only in interior view) ── */}
              {hideRoof && r.type === 'bathroom' && (
                <>
                  {/* Back wall tile up to ~6ft */}
                  <mesh position={[cx, 3.0, cz - r.h / 2 + 0.06]} receiveShadow>
                    <boxGeometry args={[r.w - 0.05, 6.0, 0.04]} />
                    <meshStandardMaterial color="#e6e8e7" roughness={0.22} metalness={0.04} envMapIntensity={1.2} />
                  </mesh>
                  {/* Side wall tile */}
                  <mesh position={[cx - r.w / 2 + 0.06, 3.0, cz]} receiveShadow>
                    <boxGeometry args={[0.04, 6.0, r.h - 0.05]} />
                    <meshStandardMaterial color="#e6e8e7" roughness={0.22} metalness={0.04} envMapIntensity={1.2} />
                  </mesh>
                </>
              )}

              {/* ── Kitchen backsplash inside (when interior) ── */}
              {hideRoof && r.type === 'kitchen' && (
                <mesh position={[cx, 4.5, cz - r.h / 2 + 0.06]} receiveShadow>
                  <boxGeometry args={[r.w - 0.5, 2.8, 0.04]} />
                  <meshStandardMaterial color="#eef0ef" roughness={0.18} metalness={0.06} envMapIntensity={1.4} />
                </mesh>
              )}
              
              {/* Furniture */}
              {(hideRoof || isActive || true) && r.furniture.map((f: any, i: number) => {
                const fx = round2(r.x + f.x + f.w/2 - W/2);
                const fz = round2(r.y + f.y + f.h/2 - D/2);
                return (
                  <group key={`f-${i}`} position={[fx, 0.02, fz]} rotation={[0, f.rotation ? f.rotation * Math.PI / 180 : 0, 0]}>
                    <Furniture3D item={f} isNight={isNight} />
                  </group>
                );
              })}
            </group>
          );
        })}

        {/* Render Deduplicated, Perfectly Aligned Walls */}
        {extractedWalls.map((wall, i) => {
          const len = wall.end - wall.start;
          const w = len + t; // Extend length by thickness to seamlessly merge corners
          
          // Map absolute positions back to wall-local relative percentages
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

      {/* ── Façade Accent Elements ── */}
      {/* Stepped foundation base */}
      <mesh receiveShadow position={[roofCX, 0.15, roofCZ]}>
        <boxGeometry args={[roofW + 2, 0.3, roofD + 2]} />
        <meshStandardMaterial color="#6a6258" roughness={0.95} />
      </mesh>

      {/* Plinth band — darker base strip around perimeter */}
      {[
        { p: [roofCX, 1.3, roofCZ - roofD/2 - 0.06], a: [roofW + 0.4, 1, 0.12], skip: cpAtTop },
        { p: [roofCX, 1.3, roofCZ + roofD/2 + 0.06], a: [roofW + 0.4, 1, 0.12], skip: cpAtBottom },
        { p: [roofCX - roofW/2 - 0.06, 1.3, roofCZ], a: [0.12, 1, roofD + 0.4], skip: cpAtLeft },
        { p: [roofCX + roofW/2 + 0.06, 1.3, roofCZ], a: [0.12, 1, roofD + 0.4], skip: cpAtRight },
      ].map((item, idx) => !item.skip && (
        <mesh key={`plinth-${idx}`} position={item.p as any}>
          <boxGeometry args={item.a as any} />
          <meshStandardMaterial color={colors.accent} roughness={0.7} />
        </mesh>
      ))}

      {/* Mid-wall horizontal accent line */}
      {[
        { p: [roofCX, 0.8 + wallH * 0.42, roofCZ - roofD/2 - 0.04], a: [roofW + 0.2, 0.18, 0.08], skip: cpAtTop },
        { p: [roofCX, 0.8 + wallH * 0.42, roofCZ + roofD/2 + 0.04], a: [roofW + 0.2, 0.18, 0.08], skip: cpAtBottom },
        { p: [roofCX - roofW/2 - 0.04, 0.8 + wallH * 0.42, roofCZ], a: [0.08, 0.18, roofD + 0.2], skip: cpAtLeft },
        { p: [roofCX + roofW/2 + 0.04, 0.8 + wallH * 0.42, roofCZ], a: [0.08, 0.18, roofD + 0.2], skip: cpAtRight },
      ].map((item, idx) => !item.skip && (
        <mesh key={`mid-${idx}`} position={item.p as any}>
          <boxGeometry args={item.a as any} />
          <meshStandardMaterial color={colors.trim} roughness={0.45} metalness={0.05} />
        </mesh>
      ))}

      {/* Enhanced cornice / crown molding */}
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

      {/* Entrance Canopy */}
      {mainDoorPos && !hideRoof && (
        <group position={[mainDoorPos.x, wallH * 0.85 + 0.8, mainDoorPos.z + mainDoorPos.nz * 2 + mainDoorPos.nx * 2]}>
          <mesh castShadow rotation={[0, mainDoorPos.nx !== 0 ? Math.PI/2 : 0, 0]}>
            <boxGeometry args={[6, 0.2, 3.5]} />
            <meshStandardMaterial color={colors.roof} roughness={0.6} />
          </mesh>
          <mesh position={[0, -0.02, 0]} rotation={[0, mainDoorPos.nx !== 0 ? Math.PI/2 : 0, 0]}>
            <boxGeometry args={[6.3, 0.08, 0.12]} />
            <meshStandardMaterial color={colors.trim} roughness={0.4} metalness={0.15} />
          </mesh>
          {[-2.6, 2.6].map((o, bi) => (
            <mesh key={`brk-${bi}`} position={[mainDoorPos.nz !== 0 ? o : 0, -0.6, mainDoorPos.nx !== 0 ? o : 0]}>
              <boxGeometry args={[0.12, 1, 0.12]} />
              <meshStandardMaterial color={colors.trim} roughness={0.4} metalness={0.15} />
            </mesh>
          ))}
        </group>
      )}

      {/* Wall sconce lights near entrance */}
      {mainDoorPos && (
        <>{[-3, 3].map((o, li) => (
          <group key={`sconce-${li}`} position={[
            mainDoorPos.x + (mainDoorPos.nz !== 0 ? o : 0),
            wallH * 0.5 + 0.8,
            mainDoorPos.z + (mainDoorPos.nx !== 0 ? o : 0)
          ]}>
            <mesh><boxGeometry args={[0.2, 0.5, 0.15]} />
              <meshStandardMaterial color={colors.trim} roughness={0.3} metalness={0.5} /></mesh>
            <pointLight intensity={0.5} distance={8} color="#ffe8c0" castShadow={false}
              position={[mainDoorPos.nx * 0.3, -0.15, mainDoorPos.nz * 0.3]} />
          </group>
        ))}</>
      )}

      {/* Roof */}
      {roof === 'gable' ? (
        <GableRoof W={roofW} D={roofD} cx={roofCX} cz={roofCZ} wallH={wallH} color={colors.roof} trimColor={colors.trim} rodColor={colors.rod} transparent={hideRoof} opacity={hideRoof ? 0.1 : 1} />
      ) : (
        <FlatRoof W={roofW} D={roofD} cx={roofCX} cz={roofCZ} wallH={wallH} color={colors.roof} transparent={hideRoof} opacity={hideRoof ? 0.1 : 1} />
      )}

      {/* Rooftop Add-ons tied to Building Bounds */}
      {addons.includes('solar') && !hideRoof && <SolarPanels minX={minX - W/2} maxX={maxX - W/2} minZ={minZ - D/2} maxZ={maxZ - D/2} roofType={roof} wallH={wallH} />}
      {addons.includes('water_tank') && !hideRoof && <WaterTank maxX={maxX - W/2} maxZ={maxZ - D/2} wallH={wallH} roofType={roof} />}

      {/* Floating Labels */}
      {(plan.rooms || []).map(r => {
        if (r.type === 'garden' || r.type === 'carport') return null;
        const isActive = activeRoom === r.type;
        return (
          <Html key={`label-${r.id}`} position={[r.x - W/2 + r.w/2, hideRoof ? 3 : wallH + 3, r.y - D/2 + r.h/2]} center zIndexRange={[100, 0]}>
            <div className={`transition-all duration-300 pointer-events-none px-4 py-1.5 rounded-sm border shadow-lg whitespace-nowrap font-display font-bold text-[11px] tracking-widest ${
              isActive 
                ? 'bg-[hsl(28,40%,55%)] text-white border-transparent scale-110 shadow-[0_4px_12px_rgba(200,100,50,0.4)]' 
                : 'bg-white/95 text-black border-black/10 scale-100'
            }`}>
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
  main:     { height: 10.5, minWidth: 4 },
  room:     { height: 9,    minWidth: 3 },
  bathroom: { height: 8,    minWidth: 2.5 },
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
              <mesh><boxGeometry args={[dw + 0.3, dh + 0.3, t + 0.08]} />
                <meshStandardMaterial color={frameColor} roughness={0.6} /></mesh>
            </group>
          );
        }

        if (cat === 'main') {
          // ── MAIN ENTRANCE DOOR — Premium double-panel with glass inserts ──
          const mainWood = '#6a4528';
          const accentMetal = materialType === 'luxury' ? '#c9a84c' : materialType === 'modern' ? '#888' : '#8b6530';
          return (
            <group key={`d-${i}`} position={[dx, dh/2, 0]}>
              {/* Decorative outer frame */}
              <mesh><boxGeometry args={[dw + 0.8, dh + 0.6, t + 0.15]} />
                <meshStandardMaterial color={frameColor} roughness={0.45} metalness={0.05} /></mesh>
              {/* Inner frame step */}
              <mesh position={[0, -0.1, 0.02]}>
                <boxGeometry args={[dw + 0.3, dh + 0.2, t + 0.08]} />
                <meshStandardMaterial color={frameColor} roughness={0.55} /></mesh>
              {/* Door panel — rich wood with grain */}
              <mesh position={[0, -0.15, 0.06]}>
                <boxGeometry args={[dw - 0.15, dh - 0.15, 0.18]} />
                <meshStandardMaterial color={mainWood} map={doorTextures?.map} normalMap={doorTextures?.normal} normalScale={new THREE.Vector2(0.5, 0.5)} roughness={0.42} metalness={0.05} envMapIntensity={0.7} /></mesh>
              {/* Vertical center divider */}
              <mesh position={[0, 0, 0.16]}>
                <boxGeometry args={[0.12, dh - 0.5, 0.06]} />
                <meshStandardMaterial color={mainWood} map={doorTextures?.map} roughness={0.4} /></mesh>
              {/* Horizontal divider */}
              <mesh position={[0, dh * 0.08, 0.16]}>
                <boxGeometry args={[dw - 0.4, 0.12, 0.06]} />
                <meshStandardMaterial color={mainWood} map={doorTextures?.map} roughness={0.4} /></mesh>
              {/* Glass panel inserts (upper half) */}
              <mesh position={[-dw/4, dh/4 - 0.1, 0.17]}>
                <boxGeometry args={[dw/2.8, dh/3.2, 0.04]} />
                <meshStandardMaterial color={glassColor} roughness={0.08} metalness={0.3} transparent opacity={0.45} depthWrite={false} /></mesh>
              <mesh position={[dw/4, dh/4 - 0.1, 0.17]}>
                <boxGeometry args={[dw/2.8, dh/3.2, 0.04]} />
                <meshStandardMaterial color={glassColor} roughness={0.08} metalness={0.3} transparent opacity={0.45} depthWrite={false} /></mesh>
              {/* Handle backplate */}
              <mesh position={[dw/2 - 0.55, -0.1, 0.22]}>
                <boxGeometry args={[0.18, 0.7, 0.05]} />
                <meshStandardMaterial color={accentMetal} metalness={0.9} roughness={0.12} /></mesh>
              {/* Door handle lever */}
              <mesh position={[dw/2 - 0.55, -0.1, 0.27]} rotation={[0, 0, Math.PI/2]}>
                <cylinderGeometry args={[0.04, 0.04, 0.35, 8]} />
                <meshStandardMaterial color={accentMetal} metalness={0.9} roughness={0.12} /></mesh>
              {/* Threshold */}
              <mesh position={[0, -dh/2 + 0.08, 0.05]}>
                <boxGeometry args={[dw + 0.5, 0.15, t + 0.2]} />
                <meshStandardMaterial color={frameColor} roughness={0.5} /></mesh>
            </group>
          );
        }

        if (cat === 'bathroom') {
          // ── BATHROOM DOOR — Compact, frosted glass upper, lighter color ──
          const bathDoorColor = materialType === 'luxury' ? '#a09080' : materialType === 'modern' ? '#c8c8c8' : '#c4b8a8';
          return (
            <group key={`d-${i}`} position={[dx, dh/2, 0]}>
              {/* Slim frame */}
              <mesh><boxGeometry args={[dw + 0.3, dh + 0.3, t + 0.08]} />
                <meshStandardMaterial color={frameColor} roughness={0.6} /></mesh>
              {/* Lower panel — painted wood */}
              <mesh position={[0, -dh/6, 0.03]}>
                <boxGeometry args={[dw - 0.1, dh * 0.55, 0.1]} />
                <meshStandardMaterial color={bathDoorColor} normalMap={doorTextures?.normal} normalScale={new THREE.Vector2(0.2, 0.2)} roughness={0.55} /></mesh>
              {/* Upper frosted glass panel */}
              <mesh position={[0, dh/4 - 0.1, 0.03]}>
                <boxGeometry args={[dw - 0.2, dh * 0.32, 0.06]} />
                <meshStandardMaterial color="#d8e8f0" roughness={0.6} metalness={0.05} transparent opacity={0.55} depthWrite={false} /></mesh>
              {/* Horizontal divider between glass and panel */}
              <mesh position={[0, dh/16, 0.06]}>
                <boxGeometry args={[dw - 0.1, 0.1, 0.08]} />
                <meshStandardMaterial color={bathDoorColor} roughness={0.4} /></mesh>
              {/* Small lever handle */}
              <mesh position={[dw/2 - 0.35, -0.15, 0.12]}>
                <boxGeometry args={[0.1, 0.35, 0.04]} />
                <meshStandardMaterial color="#aaa" metalness={0.85} roughness={0.18} /></mesh>
              <mesh position={[dw/2 - 0.35, -0.15, 0.15]} rotation={[0, 0, Math.PI/2]}>
                <cylinderGeometry args={[0.025, 0.025, 0.2, 6]} />
                <meshStandardMaterial color="#bbb" metalness={0.85} roughness={0.18} /></mesh>
            </group>
          );
        }

        // ── ROOM DOOR — Clean panel design, matte wood finish ──
        const roomDoorColor = '#6a4528';
        return (
          <group key={`d-${i}`} position={[dx, dh/2, 0]}>
            {/* Standard frame */}
            <mesh><boxGeometry args={[dw + 0.35, dh + 0.35, t + 0.1]} />
              <meshStandardMaterial color={frameColor} roughness={0.6} /></mesh>
            {/* Door panel — wood grain */}
            <mesh position={[0, -0.15, 0.03]}>
              <boxGeometry args={[dw - 0.05, dh - 0.1, 0.12]} />
              <meshStandardMaterial color={roomDoorColor} map={doorTextures?.map} normalMap={doorTextures?.normal} normalScale={new THREE.Vector2(0.4, 0.4)} roughness={0.5} metalness={0.04} envMapIntensity={0.6} /></mesh>
            {/* Upper panel recess */}
            <mesh position={[0, dh/5, 0.1]}>
              <boxGeometry args={[dw - 0.6, dh * 0.35, 0.03]} />
              <meshStandardMaterial color={roomDoorColor} map={doorTextures?.map} roughness={0.55} metalness={0.02} /></mesh>
            {/* Lower panel recess */}
            <mesh position={[0, -dh/5, 0.1]}>
              <boxGeometry args={[dw - 0.6, dh * 0.3, 0.03]} />
              <meshStandardMaterial color={roomDoorColor} map={doorTextures?.map} roughness={0.55} metalness={0.02} /></mesh>
            {/* Round door knob */}
            <mesh position={[dw/2 - 0.35, -0.1, 0.14]}>
              <sphereGeometry args={[0.1, 12, 12]} />
              <meshStandardMaterial color="#c0c0c0" metalness={0.8} roughness={0.2} /></mesh>
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
const GableRoof = ({ W, D, cx, cz, wallH, color, trimColor, rodColor, transparent, opacity }: any) => {
  const roofH = 6;
  const overhang = 2.5;
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
      {[-1, 1].map((side, ei) => (
        <mesh key={`eave-${ei}`} position={[side * hw, -0.1, hd]}>
          <boxGeometry args={[0.18, 0.3, hd * 2 + 0.5]} />
          <meshStandardMaterial color={trimColor} roughness={0.5} metalness={0.1} transparent={transparent} opacity={opacity} depthWrite={!transparent} />
        </mesh>
      ))}
      {/* Gutter line */}
      {[-1, 1].map((side, gi) => (
        <mesh key={`gutter-${gi}`} position={[side * (hw + 0.08), -0.2, hd]}>
          <boxGeometry args={[0.1, 0.12, hd * 2 + 0.3]} />
          <meshStandardMaterial color="#8a8a8a" roughness={0.3} metalness={0.4} transparent={transparent} opacity={opacity} depthWrite={!transparent} />
        </mesh>
      ))}
    </group>
  );
};

const FlatRoof = ({ W, D, cx, cz, wallH, color, transparent, opacity }: any) => (
  <group position={[cx, wallH + 1.2, cz]}>
    {/* Main slab */}
    <mesh castShadow>
      <boxGeometry args={[W + 2.5, 0.8, D + 2.5]} />
      <meshStandardMaterial color={color} roughness={0.65} transparent={transparent} opacity={opacity} depthWrite={!transparent} />
    </mesh>
    {/* Parapet walls */}
    {[[-1, 0], [1, 0], [0, -1], [0, 1]].map(([dx, dz], i) => (
      <mesh key={i} position={[dx * (W / 2 + 1), 0.7, dz * (D / 2 + 1)]}>
        <boxGeometry args={[dx ? 0.35 : W + 2.5, 1, dz ? 0.35 : D + 2.5]} />
        <meshStandardMaterial color={color} roughness={0.65} transparent={transparent} opacity={opacity} depthWrite={!transparent} />
      </mesh>
    ))}
    {/* Parapet cap / coping */}
    {[[-1, 0], [1, 0], [0, -1], [0, 1]].map(([dx, dz], i) => (
      <mesh key={`cap-${i}`} position={[dx * (W / 2 + 1), 1.25, dz * (D / 2 + 1)]}>
        <boxGeometry args={[dx ? 0.5 : W + 2.8, 0.12, dz ? 0.5 : D + 2.8]} />
        <meshStandardMaterial color="#888" roughness={0.35} metalness={0.2} transparent={transparent} opacity={opacity} depthWrite={!transparent} />
      </mesh>
    ))}
    {/* Gutter line at base */}
    {[[-1, 0], [1, 0], [0, -1], [0, 1]].map(([dx, dz], i) => (
      <mesh key={`gut-${i}`} position={[dx * (W / 2 + 1.15), 0.05, dz * (D / 2 + 1.15)]}>
        <boxGeometry args={[dx ? 0.08 : W + 2.6, 0.1, dz ? 0.08 : D + 2.6]} />
        <meshStandardMaterial color="#7a7a7a" roughness={0.3} metalness={0.4} transparent={transparent} opacity={opacity} depthWrite={!transparent} />
      </mesh>
    ))}
  </group>
);

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

const Carport = ({ plan, plotW, plotD }: { plan: Plan; plotW: number; plotD: number }) => {
  const info = useMemo(() => getCarportInfo(plan), [plan]);
  if (!info) return null;
  const { cx, cz, w: cw, h: ch, side } = info;

  const halfPlotW = plotW / 2;
  const halfPlotD = plotD / 2;

  // Driveway rectangle: from carport's open edge out to plot edge.
  let dwMinX: number, dwMaxX: number, dwMinZ: number, dwMaxZ: number;
  let carYaw = 0; // car orientation
  if (side === 'bottom') {
    dwMinX = cx - cw / 2 + 0.6;
    dwMaxX = cx + cw / 2 - 0.6;
    dwMinZ = cz + ch / 2;
    dwMaxZ = halfPlotD;
    carYaw = 0;
  } else if (side === 'top') {
    dwMinX = cx - cw / 2 + 0.6;
    dwMaxX = cx + cw / 2 - 0.6;
    dwMinZ = -halfPlotD;
    dwMaxZ = cz - ch / 2;
    carYaw = Math.PI;
  } else if (side === 'right') {
    dwMinX = cx + cw / 2;
    dwMaxX = halfPlotW;
    dwMinZ = cz - ch / 2 + 0.6;
    dwMaxZ = cz + ch / 2 - 0.6;
    carYaw = -Math.PI / 2;
  } else {
    dwMinX = -halfPlotW;
    dwMaxX = cx - cw / 2;
    dwMinZ = cz - ch / 2 + 0.6;
    dwMaxZ = cz + ch / 2 - 0.6;
    carYaw = Math.PI / 2;
  }
  const dwW = Math.max(0.1, dwMaxX - dwMinX);
  const dwD = Math.max(0.1, dwMaxZ - dwMinZ);
  const dwCX = (dwMinX + dwMaxX) / 2;
  const dwCZ = (dwMinZ + dwMaxZ) / 2;

  // Parked car position: centered in carport, oriented along driving axis
  const carX = cx;
  const carZ = cz;

  return (
    <group>
      {/* ── Carport pad + structure (pad sits flush with ground) ── */}
      <group position={[cx, 0, cz]}>
        {/* Concrete pad — slightly recessed for clean edge */}
        <mesh receiveShadow position={[0, 0.04, 0]}>
          <boxGeometry args={[cw, 0.08, ch]} />
          <meshStandardMaterial color="#9a9a96" roughness={0.95} />
        </mesh>
        {/* Painted parking bay outline */}
        <mesh position={[0, 0.082, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[Math.min(cw, ch) * 0.32, Math.min(cw, ch) * 0.34, 32]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.45} />
        </mesh>

        {/* Four steel posts */}
        {[
          [-cw / 2 + 0.4, -ch / 2 + 0.4],
          [-cw / 2 + 0.4, ch / 2 - 0.4],
          [cw / 2 - 0.4, -ch / 2 + 0.4],
          [cw / 2 - 0.4, ch / 2 - 0.4],
        ].map(([x, z], i) => (
          <group key={i} position={[x, 0, z]}>
            <mesh castShadow position={[0, 5.5, 0]}>
              <cylinderGeometry args={[0.16, 0.18, 11, 12]} />
              <meshStandardMaterial color="#2a2a2a" roughness={0.55} metalness={0.45} />
            </mesh>
            {/* Base plate */}
            <mesh position={[0, 0.06, 0]}>
              <boxGeometry args={[0.42, 0.12, 0.42]} />
              <meshStandardMaterial color="#1a1a1a" roughness={0.6} metalness={0.4} />
            </mesh>
          </group>
        ))}

        {/* Roof slab — flat with subtle overhang */}
        <mesh castShadow position={[0, 11.18, 0]}>
          <boxGeometry args={[cw + 1.2, 0.36, ch + 1.2]} />
          <meshStandardMaterial color="#2a2a2a" roughness={0.7} metalness={0.1} />
        </mesh>
        {/* Roof underside trim */}
        <mesh position={[0, 10.96, 0]}>
          <boxGeometry args={[cw + 1.0, 0.06, ch + 1.0]} />
          <meshStandardMaterial color="#3a3a3a" roughness={0.6} />
        </mesh>

        {/* Wheel-stop curbs at the back of the bay (opposite the open side) */}
        {(() => {
          const stopGeom = (side === 'top' || side === 'bottom') ? [cw * 0.7, 0.18, 0.22] : [0.22, 0.18, ch * 0.7];
          let sp: [number, number, number] = [0, 0.13, 0];
          if (side === 'bottom') sp = [0, 0.13, -ch / 2 + 0.7];
          else if (side === 'top') sp = [0, 0.13, ch / 2 - 0.7];
          else if (side === 'right') sp = [-cw / 2 + 0.7, 0.13, 0];
          else sp = [cw / 2 - 0.7, 0.13, 0];
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
          {/* Asphalt base */}
          <mesh receiveShadow position={[dwCX, 0.012, dwCZ]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[dwW, dwD]} />
            <meshStandardMaterial color="#3c3c40" roughness={1} />
          </mesh>
          {/* Light trim edge stripes */}
          {(side === 'top' || side === 'bottom') ? (
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
      <group position={[carX, 0, carZ]} rotation={[0, carYaw, 0]}>
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
): Rect[] => {
  const rects: Rect[] = [];
  const halfPlotW = plotW / 2;
  const halfPlotD = plotD / 2;

  // Driveway corridor
  const ci = getCarportInfo(plan);
  if (ci) {
    const { cx, cz, w: cw, h: ch, side } = ci;
    if (side === 'bottom') rects.push({ minX: cx - cw / 2 - 0.4, maxX: cx + cw / 2 + 0.4, minZ: cz + ch / 2 - 0.5, maxZ: halfPlotD + 0.5 });
    else if (side === 'top') rects.push({ minX: cx - cw / 2 - 0.4, maxX: cx + cw / 2 + 0.4, minZ: -halfPlotD - 0.5, maxZ: cz - ch / 2 + 0.5 });
    else if (side === 'right') rects.push({ minX: cx + cw / 2 - 0.5, maxX: halfPlotW + 0.5, minZ: cz - ch / 2 - 0.4, maxZ: cz + ch / 2 + 0.4 });
    else rects.push({ minX: -halfPlotW - 0.5, maxX: cx - cw / 2 + 0.5, minZ: cz - ch / 2 - 0.4, maxZ: cz + ch / 2 + 0.4 });
  }

  // Walkway corridor (gate to main door)
  const door = findMainDoorWorld(plan);
  if (door) {
    const wkW = 1.6; // walkway half-width
    // Vertical leg from gate down toward door's z
    const aX = gateX;
    const aZ1 = halfPlotD;
    const aZ2 = door.z + door.nz * 1.0;
    rects.push({
      minX: Math.min(aX, door.x) - wkW,
      maxX: Math.max(aX, door.x) + wkW,
      minZ: Math.min(aZ1, aZ2),
      maxZ: Math.max(aZ1, aZ2),
    });
    // Approach to door
    rects.push({
      minX: Math.min(door.x - wkW, door.x + door.nx * 2 - wkW),
      maxX: Math.max(door.x + wkW, door.x + door.nx * 2 + wkW),
      minZ: Math.min(door.z - wkW, door.z + door.nz * 2 - wkW),
      maxZ: Math.max(door.z + wkW, door.z + door.nz * 2 + wkW),
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

const Trees = ({ planW, planD }: { planW: number; planD: number }) => {
  const treeData = useMemo(() => {
    const arr: { x: number; z: number; s: number; h: number; kind: TreeKind; palette: number }[] = [];
    const hw = planW / 2;
    const hd = planD / 2;
    // Big anchor trees at far corners
    arr.push({ x: -hw - 9, z: -hd - 8, s: 1.25, h: 11, kind: 'broadleaf', palette: 0 });
    arr.push({ x: hw + 12, z: hd + 10, s: 1.15, h: 10.5, kind: 'broadleaf', palette: 2 });
    arr.push({ x: hw + 13, z: -hd - 9, s: 1.05, h: 9, kind: 'broadleaf', palette: 1 });
    arr.push({ x: -hw - 11, z: hd + 9, s: 1.1, h: 9.5, kind: 'broadleaf', palette: 3 });

    // Cypress columns flanking the gate (front)
    arr.push({ x: -2.5, z: hd + 1.4, s: 0.9, h: 9, kind: 'cypress', palette: 0 });
    arr.push({ x: 2.5, z: hd + 1.4, s: 0.9, h: 9, kind: 'cypress', palette: 1 });

    // Side cypresses for accent
    arr.push({ x: -hw - 1.6, z: 0, s: 0.8, h: 8, kind: 'cypress', palette: 2 });
    arr.push({ x: hw + 1.6, z: -0.5, s: 0.8, h: 8, kind: 'cypress', palette: 0 });

    // Small ornamentals near front corners of plot
    arr.push({ x: -hw + 2, z: hd - 2.2, s: 0.7, h: 4.5, kind: 'small', palette: 1 });
    arr.push({ x: hw - 2, z: hd - 2.2, s: 0.7, h: 4.5, kind: 'small', palette: 4 });

    // Distant background trees for depth (out beyond the plot)
    for (let i = 0; i < 18; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.max(hw, hd) + 16 + Math.random() * 36;
      arr.push({
        x: Math.cos(angle) * dist,
        z: Math.sin(angle) * dist,
        s: 0.85 + Math.random() * 0.5,
        h: 7 + Math.random() * 5,
        kind: Math.random() < 0.18 ? 'cypress' : 'broadleaf',
        palette: i,
      });
    }
    return arr;
  }, [planW, planD]);

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

const BUSH_GREENS = ['#3d6e3a', '#4a7a44', '#2f5f2f', '#356a36', '#5a8b50', '#3a6838', '#4f7d48'];
const FLOWER_COLORS = ['#e85d75', '#f4a261', '#f7d046', '#9b5de5', '#f15bb5', '#fefae0', '#e76f51'];

const Bushes = ({ planW, planD, corridors = [] }: { planW: number; planD: number; corridors?: Rect[] }) => {
  const data = useMemo(() => {
    const hw = planW / 2;
    const hd = planD / 2;
    const arr: { x: number; z: number; s: number; c: string; h?: number }[] = [];
    const blocked = (x: number, z: number) => pointInAnyRect(x, z, corridors, 0.5);

    // Foundation hedge along back wall (continuous)
    for (let x = -hw + 1; x <= hw - 1; x += 1.4) {
      if (blocked(x, -hd - 1.5)) continue;
      const c = BUSH_GREENS[(Math.abs(Math.floor(x * 3)) % BUSH_GREENS.length)];
      arr.push({ x, z: -hd - 1.5, s: 0.85 + ((Math.abs(x) * 1.3) % 0.45), c });
    }
    // Foundation hedge along left + right walls
    for (let z = -hd + 2; z < hd - 2; z += 1.5) {
      if (!blocked(-hw - 1.5, z)) arr.push({ x: -hw - 1.5, z, s: 0.8 + ((Math.abs(z) * 0.7) % 0.4), c: BUSH_GREENS[(Math.abs(Math.floor(z * 2)) % BUSH_GREENS.length)] });
      if (!blocked(hw + 1.5, z)) arr.push({ x: hw + 1.5, z, s: 0.8 + ((Math.abs(z) * 0.6) % 0.4), c: BUSH_GREENS[(Math.abs(Math.floor(z * 2)) + 2) % BUSH_GREENS.length] });
    }
    // Front planting band
    for (let x = -hw + 1.5; x <= hw - 1.5; x += 1.2) {
      if (blocked(x, hd - 1.4)) continue;
      arr.push({ x, z: hd - 1.4, s: 0.7 + ((Math.abs(x) * 1.7) % 0.4), c: BUSH_GREENS[(Math.abs(Math.floor(x * 5)) % BUSH_GREENS.length)] });
    }
    // Scatter accent ornamentals around the lawn
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2 + 0.3;
      const dist = Math.max(hw, hd) * 0.7 + (i % 3) * 1.2;
      const x = Math.cos(angle) * dist, z = Math.sin(angle) * dist;
      if (blocked(x, z)) continue;
      arr.push({ x, z, s: 0.6 + (i % 3) * 0.18, c: BUSH_GREENS[i % BUSH_GREENS.length] });
    }
    return arr;
  }, [planW, planD, corridors]);

  // Flower bed positions — colorful pops near front and along walls
  const flowers = useMemo(() => {
    const hw = planW / 2;
    const hd = planD / 2;
    const arr: { x: number; z: number; s: number; c: string }[] = [];
    const blocked = (x: number, z: number) => pointInAnyRect(x, z, corridors, 0.5);
    // Front-edge flowers (alternating colors)
    for (let x = -hw + 1.2; x <= hw - 1.2; x += 0.7) {
      if (blocked(x, hd - 0.9)) continue;
      arr.push({ x, z: hd - 0.9, s: 0.16 + (Math.abs(x) % 0.08), c: FLOWER_COLORS[(Math.abs(Math.floor(x * 7))) % FLOWER_COLORS.length] });
    }
    // Side patches
    for (let z = -hd + 3; z < hd - 3; z += 1.0) {
      if (Math.random() < 0.55 && !blocked(-hw - 0.9, z)) {
        arr.push({ x: -hw - 0.9, z, s: 0.14 + Math.random() * 0.06, c: FLOWER_COLORS[(Math.abs(Math.floor(z * 5))) % FLOWER_COLORS.length] });
      }
      if (Math.random() < 0.55 && !blocked(hw + 0.9, z)) {
        arr.push({ x: hw + 0.9, z, s: 0.14 + Math.random() * 0.06, c: FLOWER_COLORS[(Math.abs(Math.floor(z * 7)) + 2) % FLOWER_COLORS.length] });
      }
    }
    return arr;
  }, [planW, planD, corridors]);

  return (
    <group>
      {/* Lush layered bushes */}
      {data.map((b, i) => (
        <group key={`bush-${i}`} position={[b.x, 0, b.z]}>
          <mesh castShadow receiveShadow position={[0, b.s * 0.55, 0]}>
            <sphereGeometry args={[b.s, 12, 9]} />
            <meshStandardMaterial color={b.c} roughness={0.92} />
          </mesh>
          <mesh castShadow position={[b.s * 0.35, b.s * 0.85, b.s * 0.2]}>
            <sphereGeometry args={[b.s * 0.7, 10, 8]} />
            <meshStandardMaterial color={BUSH_GREENS[(i + 2) % BUSH_GREENS.length]} roughness={0.92} />
          </mesh>
          <mesh castShadow position={[-b.s * 0.4, b.s * 0.5, -b.s * 0.15]}>
            <sphereGeometry args={[b.s * 0.6, 10, 7]} />
            <meshStandardMaterial color={BUSH_GREENS[(i + 4) % BUSH_GREENS.length]} roughness={0.92} />
          </mesh>
        </group>
      ))}

      {/* Flowers — small colorful spheres */}
      {flowers.map((f, i) => (
        <group key={`fl-${i}`} position={[f.x, 0, f.z]}>
          <mesh position={[0, f.s * 1.1, 0]} castShadow>
            <sphereGeometry args={[f.s, 8, 6]} />
            <meshStandardMaterial color={f.c} roughness={0.7} emissive={f.c} emissiveIntensity={0.05} />
          </mesh>
          <mesh position={[0, f.s * 0.55, 0]}>
            <cylinderGeometry args={[0.018, 0.024, f.s * 1.1, 5]} />
            <meshStandardMaterial color="#3a6b3a" roughness={0.95} />
          </mesh>
        </group>
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
  const door = useMemo(() => findMainDoorWorld(plan), [plan]);
  if (!door) return null;

  const halfPlotD = plotD / 2;
  const walkwayWidth = 1.8; // full width

  // Path: gate (at plot front) -> approach -> door
  const gateZ = halfPlotD + 0.5;
  const doorApproachZ = door.z + door.nz * 1.8;

  return (
    <group>
      {/* Main paved walkway from gate toward door */}
      <mesh receiveShadow position={[gateX, 0.012, (gateZ + doorApproachZ) / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[walkwayWidth, gateZ - doorApproachZ]} />
        <meshStandardMaterial color="#cfcfcf" roughness={0.92} />
      </mesh>
      {/* Horizontal approach to door */}
      <mesh receiveShadow position={[(gateX + door.x) / 2, 0.012, doorApproachZ]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[Math.abs(door.x - gateX) + walkwayWidth / 2, walkwayWidth]} />
        <meshStandardMaterial color="#cfcfcf" roughness={0.92} />
      </mesh>
      {/* Steps at the door */}
      {[1, 2, 3].map((i) => (
        <group key={`step-${i}`} position={[door.x, 0.05 * i, door.z + door.nz * (0.6 + i * 0.35)]}>
          <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[walkwayWidth, 0.4]} />
            <meshStandardMaterial color="#d8d8d8" roughness={0.85} />
          </mesh>
          {/* Step riser */}
          <mesh position={[0, 0.18, -0.2]}>
            <boxGeometry args={[walkwayWidth, 0.36, 0.12]} />
            <meshStandardMaterial color="#b8b8b8" roughness={0.85} />
          </mesh>
        </group>
      ))}
      {/* Door landing pad */}
      <mesh receiveShadow position={[door.x, 0.015, door.z + door.nz * 0.3]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[walkwayWidth + 0.4, 0.8]} />
        <meshStandardMaterial color="#d8d8d8" roughness={0.85} />
      </mesh>
    </group>
  );
};

const FenceAround = ({ planW, planD, gateX }: { planW: number; planD: number; gateX: number }) => {
  const hw = planW / 2;
  const hd = planD / 2;
  const gateHalf = 2.2;
  // Corner pillars and intermediate posts
  const pillars: [number, number][] = [[-hw, -hd], [-hw, hd], [hw, -hd], [hw, hd]];
  const posts: [number, number][] = [];
  for (let x = -hw; x <= hw; x += 3) {
    posts.push([x, -hd]);
    if (x < gateX - gateHalf || x > gateX + gateHalf) posts.push([x, hd]);
  }
  for (let z = -hd + 3; z < hd; z += 3) { posts.push([-hw, z]); posts.push([hw, z]); }

  return (
    <group>
      {/* Corner pillars */}
      {pillars.map(([x, z], i) => (
        <group key={`pillar-${i}`} position={[x, 0, z]}>
          <mesh castShadow position={[0, 1.5, 0]}>
            <boxGeometry args={[0.4, 3, 0.4]} />
            <meshStandardMaterial color="#666" roughness={0.5} metalness={0.2} />
          </mesh>
          <mesh position={[0, 3.1, 0]}>
            <boxGeometry args={[0.5, 0.15, 0.5]} />
            <meshStandardMaterial color="#777" roughness={0.4} metalness={0.3} />
          </mesh>
        </group>
      ))}
      {/* Fence posts */}
      {posts.map(([x, z], i) => (
        <mesh key={i} position={[x, 1.3, z]} castShadow>
          <boxGeometry args={[0.12, 2.6, 0.12]} />
          <meshStandardMaterial color="#555" roughness={0.5} metalness={0.15} />
        </mesh>
      ))}
      {/* Horizontal rails (3 levels for modern look) */}
      {[0.6, 1.4, 2.2].map((y) => (
        <group key={y}>
          <mesh position={[0, y, -hd]}><boxGeometry args={[hw * 2, 0.08, 0.06]} /><meshStandardMaterial color="#555" roughness={0.5} metalness={0.15} /></mesh>
          <mesh position={[(gateX - gateHalf - hw) / 2, y, hd]}><boxGeometry args={[Math.max(0, gateX - gateHalf - (-hw)), 0.08, 0.06]} /><meshStandardMaterial color="#555" roughness={0.5} metalness={0.15} /></mesh>
          <mesh position={[(hw + gateX + gateHalf) / 2, y, hd]}><boxGeometry args={[Math.max(0, hw - (gateX + gateHalf)), 0.08, 0.06]} /><meshStandardMaterial color="#555" roughness={0.5} metalness={0.15} /></mesh>
          <mesh position={[-hw, y, 0]}><boxGeometry args={[0.06, 0.08, hd * 2]} /><meshStandardMaterial color="#555" roughness={0.5} metalness={0.15} /></mesh>
          <mesh position={[hw, y, 0]}><boxGeometry args={[0.06, 0.08, hd * 2]} /><meshStandardMaterial color="#555" roughness={0.5} metalness={0.15} /></mesh>
        </group>
      ))}
      {/* Entrance gate on top side */}
      <group position={[gateX, 0, hd]}>
        <mesh castShadow position={[-gateHalf, 1.5, 0]}>
          <boxGeometry args={[0.24, 3, 0.24]} />
          <meshStandardMaterial color="#6b4f30" roughness={0.55} metalness={0.1} />
        </mesh>
        <mesh castShadow position={[gateHalf, 1.5, 0]}>
          <boxGeometry args={[0.24, 3, 0.24]} />
          <meshStandardMaterial color="#6b4f30" roughness={0.55} metalness={0.1} />
        </mesh>
        <mesh castShadow position={[-gateHalf / 2, 1.4, 0.02]}>
          <boxGeometry args={[gateHalf, 2.1, 0.08]} />
          <meshStandardMaterial color="#3f2f1f" roughness={0.6} metalness={0.05} />
        </mesh>
        <mesh castShadow position={[gateHalf / 2, 1.4, 0.02]}>
          <boxGeometry args={[gateHalf, 2.1, 0.08]} />
          <meshStandardMaterial color="#3f2f1f" roughness={0.6} metalness={0.05} />
        </mesh>
      </group>
    </group>
  );
};

/* ─── Second Floor (Double Storey) ─── */
const SecondFloor = ({ plan, firstFloorPlan, material, activeRoom, hideRoof }: {
  plan: Plan; firstFloorPlan: Plan; material: Material; activeRoom?: string | null; hideRoof?: boolean;
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

      <group position={[round2(-W / 2 + (W - ffW) / 2), 0.3, round2(-D / 2 + (D - ffH) / 2)]}>
        {/* Room floors */}
        {(firstFloorPlan?.rooms || []).map(r => {
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

