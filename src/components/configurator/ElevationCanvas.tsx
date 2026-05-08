import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Html } from '@react-three/drei';
import { Suspense, useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { Plan } from '@/lib/floorplan';
import { Material, RoofType, AddOn } from '@/store/configurator';
import { Furniture3D } from './Furniture3D';

interface Props {
  plan: Plan;
  roof: RoofType;
  material: Material;
  addons?: AddOn[];
  activeRoom?: string | null;
  isDoubleStorey?: boolean;
  firstFloorPlan?: Plan;
  hideHelpers?: boolean;
}

const PLOT_PADDING_FT = 2;

const MATERIAL_COLORS: Record<Material, { wall: string; trim: string; roof: string; window: string; door: string; accent: string; facade: string; rod: string }> = {
  budget: { wall: '#ffffff', trim: '#8a8478', roof: '#2e4a62', window: '#b8ddec', door: '#b5835a', accent: '#9a8a78', facade: '#d4cbb8', rod: '#4682B4' },
  modern: { wall: '#f0ebe3', trim: '#1a1a1a', roof: '#2c2c2c', window: '#a8d4e6', door: '#2a2a2a', accent: '#3a3a3a', facade: '#e2dbd0', rod: '#1a1a1a' },
  luxury: { wall: '#1f1d1a', trim: '#c9a84c', roof: '#0d0d0d', window: '#7ab0c8', door: '#8b6914', accent: '#6a4a1a', facade: '#2a2520', rod: '#c9a84c' },
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

          const height = Math.max(35, extent * 1.8);
          targetPos.current.set(center.x, height, center.z + 10);
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

export const ElevationCanvas = ({ plan, roof, material, addons = [], activeRoom, isDoubleStorey = false, firstFloorPlan, hideHelpers = false }: Props) => {
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
        shadows
        camera={{ position: [45, 25, 45], fov: 36 }}
        dpr={[1, 1.8]}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
      >
        <Suspense fallback={null}>
          <fog attach="fog" args={['#1a2a3a', 90, 220]} />
          {/* Enhanced Multi-light Setup */}
          <ambientLight intensity={hideRoof ? 0.85 : 0.35} color="#e8f0f8" />
          {/* Primary sun — warm golden */}
          <directionalLight
            position={[30, 50, 25]} intensity={hideRoof ? 2.5 : 2.0} castShadow color="#fff0d6"
            shadow-mapSize={[2048, 2048]}
            shadow-camera-left={-55} shadow-camera-right={55}
            shadow-camera-top={55} shadow-camera-bottom={-55}
            shadow-bias={-0.0004}
          />
          {/* Cool fill — opposite side for depth */}
          <directionalLight position={[-25, 18, -15]} intensity={0.5} color="#6088b8" />
          {/* Subtle rim light — backlighting for edge definition */}
          <directionalLight position={[-10, 30, -30]} intensity={0.3} color="#c0d0e0" />
          
          <Environment preset="sunset" />
          <Ground />
          {addons.includes('landscaping') && <GrassField planW={safeW} planD={safeD} />}
          
          <House plan={plan} roof={roof} material={material} activeRoom={activeRoom} addons={addons} />
          
          {/* Second Floor (Double Storey) */}
          {isDoubleStorey && firstFloorPlan && (
            <SecondFloor plan={plan} firstFloorPlan={firstFloorPlan} material={material} activeRoom={activeRoom} />
          )}
          
          <Pathway planD={plotD} gateX={gateX} />
          {addons.includes('carport') && <Carport plan={plan} />}
          
          {addons.includes('landscaping') && (
            <>
              <Trees planW={plotW} planD={plotD} />
              <Bushes planW={plotW} planD={plotD} />
            </>
          )}
          {addons.includes('fence') && <FenceAround planW={plotW} planD={plotD} gateX={gateX} />}
          
          <CameraController activeRoom={activeRoom} plan={plan} />
          <ContactShadows position={[0, 0.02, 0]} opacity={0.55} scale={120} blur={2.8} far={30} />
          <OrbitControls
            makeDefault
            enablePan={true} enableZoom={true} enableRotate={true}
            minDistance={5} maxDistance={100}
            minPolarAngle={0} maxPolarAngle={Math.PI / 2.1}
            autoRotate={!activeRoom || activeRoom === 'overview' || activeRoom === 'garden'} 
            autoRotateSpeed={0.4}
            enableDamping dampingFactor={0.05}
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
const House = ({ plan, roof, material, activeRoom, addons }: {
  plan: Plan; roof: RoofType; material: Material; activeRoom?: string | null; addons: AddOn[];
}) => {
  const colors = MATERIAL_COLORS[material];
  const W = plan.width;
  const D = plan.height;
  const wallH = 13;
  const t = 0.4; // Realistic wall thickness
  const hideRoof = activeRoom && activeRoom !== 'overview' && activeRoom !== 'garden';

  const round2 = (num: number) => Math.round(num * 100) / 100;

  // Procedural Floor Textures
  const floorTextures = useMemo(() => {
    // Wood texture
    const wCanvas = document.createElement('canvas');
    wCanvas.width = 512; wCanvas.height = 512;
    const wCtx = wCanvas.getContext('2d')!;
    wCtx.fillStyle = '#d4c4b4'; wCtx.fillRect(0,0,512,512);
    wCtx.fillStyle = '#c4b4a4';
    for(let i=0; i<512; i+=40) {
      wCtx.fillRect(0, i, 512, 2);
      for(let j=0; j<512; j+=80) {
        if (Math.random() > 0.5) wCtx.fillRect(j + (i%80), i-20, 2, 40);
      }
    }
    const woodTex = new THREE.CanvasTexture(wCanvas);
    woodTex.wrapS = woodTex.wrapT = THREE.RepeatWrapping;
    woodTex.repeat.set(1.5, 1.5);

    // Tile texture
    const tCanvas = document.createElement('canvas');
    tCanvas.width = 256; tCanvas.height = 256;
    const tCtx = tCanvas.getContext('2d')!;
    tCtx.fillStyle = '#f8fafc'; tCtx.fillRect(0,0,256,256);
    tCtx.strokeStyle = '#cbd5e1'; tCtx.lineWidth = 4;
    tCtx.strokeRect(0,0,256,256);
    const tileTex = new THREE.CanvasTexture(tCanvas);
    tileTex.wrapS = tileTex.wrapT = THREE.RepeatWrapping;
    tileTex.repeat.set(4, 4);

    return { wood: woodTex, tile: tileTex };
  }, []);

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
    // Only extract solid walls for enclosed rooms
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
              {/* Floor */}
              <mesh receiveShadow position={[cx, 0.01, cz]}>
                <boxGeometry args={[r.w, 0.02, r.h]} />
                <meshStandardMaterial 
                  color={['bedroom', 'living', 'dining'].includes(r.type) || ['bathroom', 'kitchen'].includes(r.type) ? '#ffffff' : r.color}
                  map={['bedroom', 'living', 'dining'].includes(r.type) ? floorTextures.wood : ['bathroom', 'kitchen'].includes(r.type) ? floorTextures.tile : undefined}
                  roughness={['bathroom', 'kitchen'].includes(r.type) ? 0.2 : 0.8}
                />
              </mesh>
              
              {/* Interior Room Light (visible when roof is off) */}
              {hideRoof && r.type !== 'garden' && r.type !== 'carport' && r.type !== 'balcony' && (
                <pointLight position={[cx, 11, cz]} intensity={1.2} distance={25} color="#ffedd6" castShadow={false} />
              )}
              
              {/* Furniture */}
              {(hideRoof || isActive || true) && r.furniture.map((f: any, i: number) => {
                const fx = round2(r.x + f.x + f.w/2 - W/2);
                const fz = round2(r.y + f.y + f.h/2 - D/2);
                return (
                  <group key={`f-${i}`} position={[fx, 0.02, fz]} rotation={[0, f.rotation ? f.rotation * Math.PI / 180 : 0, 0]}>
                    <Furniture3D item={f} />
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
              frameColor={colors.trim} glassColor={colors.window} doorColor={colors.door} />;
          } else {
            const posX = round2(wall.coord - W/2);
            const posZ = round2(wall.start + len/2 - D/2);
            return <WallSegment key={`wall-${i}`} w={w} h={wallH} t={t} color={colors.wall}
              doors={mappedDoors} windows={mappedWindows} materialType={material}
              position={[posX, 0, posZ]} rotation={[0, -Math.PI/2, 0]}
              frameColor={colors.trim} glassColor={colors.window} doorColor={colors.door} />;
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
        [roofCX, 1.3, roofCZ - roofD/2 - 0.06, roofW + 0.4, 1, 0.12],
        [roofCX, 1.3, roofCZ + roofD/2 + 0.06, roofW + 0.4, 1, 0.12],
        [roofCX - roofW/2 - 0.06, 1.3, roofCZ, 0.12, 1, roofD + 0.4],
        [roofCX + roofW/2 + 0.06, 1.3, roofCZ, 0.12, 1, roofD + 0.4],
      ].map(([px, py, pz, gw, gh, gd], idx) => (
        <mesh key={`plinth-${idx}`} position={[px, py, pz]}>
          <boxGeometry args={[gw, gh, gd]} />
          <meshStandardMaterial color={colors.accent} roughness={0.7} />
        </mesh>
      ))}

      {/* Mid-wall horizontal accent line */}
      {[
        [roofCX, 0.8 + wallH * 0.42, roofCZ - roofD/2 - 0.04, roofW + 0.2, 0.18, 0.08],
        [roofCX, 0.8 + wallH * 0.42, roofCZ + roofD/2 + 0.04, roofW + 0.2, 0.18, 0.08],
        [roofCX - roofW/2 - 0.04, 0.8 + wallH * 0.42, roofCZ, 0.08, 0.18, roofD + 0.2],
        [roofCX + roofW/2 + 0.04, 0.8 + wallH * 0.42, roofCZ, 0.08, 0.18, roofD + 0.2],
      ].map(([px, py, pz, gw, gh, gd], idx) => (
        <mesh key={`mid-${idx}`} position={[px, py, pz]}>
          <boxGeometry args={[gw, gh, gd]} />
          <meshStandardMaterial color={colors.trim} roughness={0.45} metalness={0.05} />
        </mesh>
      ))}

      {/* Enhanced cornice / crown molding */}
      <mesh position={[roofCX, wallH + 0.8, roofCZ]}>
        <boxGeometry args={[roofW + 0.8, 0.35, roofD + 0.8]} />
        <meshStandardMaterial color={colors.trim} roughness={0.45} metalness={0.08} transparent opacity={hideRoof ? 0.2 : 1} depthWrite={!hideRoof} />
      </mesh>
      <mesh position={[roofCX, wallH + 0.55, roofCZ]}>
        <boxGeometry args={[roofW + 0.5, 0.15, roofD + 0.5]} />
        <meshStandardMaterial color={colors.accent} roughness={0.5} transparent opacity={hideRoof ? 0.2 : 1} depthWrite={!hideRoof} />
      </mesh>

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

      <Balcony W={W} D={D} wallH={wallH} trimColor={colors.trim} />
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
const WallSegment = ({ w, h, t, color, doors, windows, position, rotation, frameColor, glassColor, doorColor, materialType }: any) => {
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
        <meshStandardMaterial color={color} roughness={0.8} />
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
          const mainWood = materialType === 'luxury' ? '#4a2810' : materialType === 'modern' ? '#3a3a3a' : '#6b4020';
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
              {/* Door panel — rich wood */}
              <mesh position={[0, -0.15, 0.06]}>
                <boxGeometry args={[dw - 0.15, dh - 0.15, 0.18]} />
                <meshStandardMaterial color={mainWood} roughness={0.35} /></mesh>
              {/* Vertical center divider */}
              <mesh position={[0, 0, 0.16]}>
                <boxGeometry args={[0.12, dh - 0.5, 0.06]} />
                <meshStandardMaterial color={mainWood} roughness={0.3} /></mesh>
              {/* Horizontal divider */}
              <mesh position={[0, dh * 0.08, 0.16]}>
                <boxGeometry args={[dw - 0.4, 0.12, 0.06]} />
                <meshStandardMaterial color={mainWood} roughness={0.3} /></mesh>
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
              {/* Lower panel — solid light color */}
              <mesh position={[0, -dh/6, 0.03]}>
                <boxGeometry args={[dw - 0.1, dh * 0.55, 0.1]} />
                <meshStandardMaterial color={bathDoorColor} roughness={0.5} /></mesh>
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
        const roomDoorColor = materialType === 'luxury' ? '#5a3a1a' : materialType === 'modern' ? '#555' : doorColor;
        return (
          <group key={`d-${i}`} position={[dx, dh/2, 0]}>
            {/* Standard frame */}
            <mesh><boxGeometry args={[dw + 0.35, dh + 0.35, t + 0.1]} />
              <meshStandardMaterial color={frameColor} roughness={0.6} /></mesh>
            {/* Door panel */}
            <mesh position={[0, -0.15, 0.03]}>
              <boxGeometry args={[dw - 0.05, dh - 0.1, 0.12]} />
              <meshStandardMaterial color={roomDoorColor} roughness={0.5} /></mesh>
            {/* Upper panel recess */}
            <mesh position={[0, dh/5, 0.1]}>
              <boxGeometry args={[dw - 0.6, dh * 0.35, 0.03]} />
              <meshStandardMaterial color={roomDoorColor} roughness={0.6} metalness={0.02} /></mesh>
            {/* Lower panel recess */}
            <mesh position={[0, -dh/5, 0.1]}>
              <boxGeometry args={[dw - 0.6, dh * 0.3, 0.03]} />
              <meshStandardMaterial color={roomDoorColor} roughness={0.6} metalness={0.02} /></mesh>
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
        // Wall front face is at z = t/2 (approx 0.2)
        return (
          <group key={`w-${i}`} position={[wx, wy, 0.2]}>
            {/* 1. Main outer casing (Thick architectural molding) */}
            <mesh position={[0, 0, 0.08]}>
              <boxGeometry args={[ww + 0.8, wh + 0.8, 0.15]} />
              <meshStandardMaterial color="#ffffff" roughness={0.3} metalness={0.1} />
            </mesh>
            {/* 2. Window frame (Recessed inside the hole) */}
            <mesh position={[0, 0, -0.1]}>
              <boxGeometry args={[ww + 0.1, wh + 0.1, 0.3]} />
              <meshStandardMaterial color="#e8e8e8" roughness={0.5} />
            </mesh>
            {/* 3. Window cross dividers (4-pane style) - Bold detail */}
            <mesh position={[0, 0, 0.02]}>
              <boxGeometry args={[0.15, wh, 0.15]} />
              <meshStandardMaterial color="#cccccc" roughness={0.4} />
            </mesh>
            <mesh position={[0, 0, 0.02]}>
              <boxGeometry args={[ww, 0.15, 0.15]} />
              <meshStandardMaterial color="#cccccc" roughness={0.4} />
            </mesh>
            {/* 4. High-transparency Glass - Deeply recessed */}
            <mesh position={[0, 0, -0.15]}>
              <boxGeometry args={[ww, wh, 0.02]} />
              <meshStandardMaterial color="#ffffff" roughness={0} metalness={1} transparent opacity={0.15} envMapIntensity={2} />
            </mesh>
            {/* 5. Heavy architectural window sill */}
            <mesh position={[0, -wh/2 - 0.25, 0.2]}>
              <boxGeometry args={[ww + 1.2, 0.25, 0.5]} />
              <meshStandardMaterial color="#ffffff" roughness={0.3} />
            </mesh>
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

const Carport = ({ plan }: any) => {
  const c = (plan.rooms || []).find((r:any) => r.type === 'carport');
  if (!c) return null;
  const rx = c.x - plan.width/2 + c.w/2;
  const rz = c.y - plan.height/2 + c.h/2;
  return (
    <group position={[rx, 0, rz]}>
      {[[-c.w/2 + 0.5, -c.h/2 + 0.5], [-c.w/2 + 0.5, c.h/2 - 0.5], [c.w/2 - 0.5, -c.h/2 + 0.5], [c.w/2 - 0.5, c.h/2 - 0.5]].map(([x, z], i) => (
        <mesh key={i} castShadow position={[x, 5.5, z]}>
          <cylinderGeometry args={[0.2, 0.2, 11, 8]} />
          <meshStandardMaterial color="#555" roughness={0.6} />
        </mesh>
      ))}
      <mesh castShadow position={[0, 11.3, 0]}>
        <boxGeometry args={[c.w + 1, 0.4, c.h + 1]} />
        <meshStandardMaterial color="#333" roughness={0.8} />
      </mesh>
    </group>
  );
};

/* ─── Decor ─── */
const Balcony = ({ W, D, wallH, trimColor }: any) => (
  <group position={[0, 0.6, D / 2]}>
    {/* Balcony deck slab */}
    <mesh receiveShadow position={[0, 0, 2.5]}>
      <boxGeometry args={[W * 0.6, 0.3, 5]} />
      <meshStandardMaterial color="#8a7a68" roughness={0.8} />
    </mesh>
    
    {/* Stairs leading to garden */}
    {[0, 1, 2].map((s) => (
      <mesh key={s} receiveShadow position={[0, -s * 0.35, 5 + s * 1.2]}>
        <boxGeometry args={[4, 0.3, 1.2]} />
        <meshStandardMaterial color="#9a8a78" roughness={0.85} />
      </mesh>
    ))}
  </group>
);

const Pathway = ({ planD, gateX }: { planD: number; gateX: number }) => (
  <group>
    {/* Main pathway stones */}
    {Array.from({ length: 10 }).map((_, i) => (
      <group key={i}>
        <mesh receiveShadow position={[gateX, 0.05, planD / 2 + 6 + i * 2.2]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[4, 1.8]} />
          <meshStandardMaterial color={i % 2 === 0 ? '#c0b0a0' : '#b0a090'} roughness={0.8} />
        </mesh>
        {/* Stone border edges */}
        {[-2.2, 2.2].map((ox, bi) => (
          <mesh key={bi} receiveShadow position={[gateX + ox, 0.06, planD / 2 + 6 + i * 2.2]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.3, 1.8]} />
            <meshStandardMaterial color="#8a7a68" roughness={0.85} />
          </mesh>
        ))}
      </group>
    ))}
    {/* Pathway edge lighting (small ground lights) */}
    {[0, 4, 8].map((i) => (
      <group key={`plight-${i}`}>
        {[-2.5, 2.5].map((ox, li) => (
          <group key={li} position={[gateX + ox, 0.2, planD / 2 + 8 + i * 2.2]}>
            <mesh><boxGeometry args={[0.15, 0.4, 0.15]} />
              <meshStandardMaterial color="#555" roughness={0.4} metalness={0.3} /></mesh>
            <pointLight intensity={0.2} distance={4} color="#ffe8c0" position={[0, 0.3, 0]} />
          </group>
        ))}
      </group>
    ))}
  </group>
);

const Trees = ({ planW, planD }: { planW: number; planD: number }) => {
  const treeData = useMemo(() => [
    { x: -planW / 2 - 8, z: -planD / 2 + 5, s: 1.1, h: 8 },
    { x: planW / 2 + 8, z: planD / 2 - 3, s: 1, h: 7 },
    { x: -planW / 2 - 5, z: planD / 2 + 8, s: 1.2, h: 9 },
    { x: planW / 2 + 10, z: -planD / 2 - 5, s: 0.9, h: 7 },
    { x: -planW / 2 - 12, z: 0, s: 0.8, h: 6 },
    { x: planW / 2 + 14, z: 5, s: 1.15, h: 8.5 },
  ], [planW, planD]);
  return (
    <group>
      {treeData.map((t, i) => (
        <group key={i} position={[t.x, 0, t.z]}>
          {/* Trunk */}
          <mesh castShadow position={[0, t.h * 0.38, 0]}>
            <cylinderGeometry args={[0.2 * t.s, 0.4 * t.s, t.h * 0.75, 6]} />
            <meshStandardMaterial color="#3a2a1a" roughness={0.9} />
          </mesh>
          {/* Main canopy */}
          <mesh castShadow position={[0, t.h * 0.8, 0]}>
            <sphereGeometry args={[3 * t.s, 10, 8]} />
            <meshStandardMaterial color="#2d5a2d" roughness={0.85} />
          </mesh>
          {/* Secondary canopy */}
          <mesh castShadow position={[1.2 * t.s, t.h * 0.7, 0.8 * t.s]}>
            <sphereGeometry args={[2.2 * t.s, 8, 8]} />
            <meshStandardMaterial color="#3a6b3a" roughness={0.85} />
          </mesh>
          {/* Top tuft */}
          <mesh castShadow position={[-0.5 * t.s, t.h * 0.95, -0.3 * t.s]}>
            <sphereGeometry args={[1.5 * t.s, 8, 6]} />
            <meshStandardMaterial color="#4a7a4a" roughness={0.88} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

const Bushes = ({ planW, planD }: { planW: number; planD: number }) => {
  const bushData = useMemo(() => {
    const arr: { x: number; z: number; s: number; c: string }[] = [];
    const colors = ['#3d6b3d', '#4a7a4a', '#2d5a2d', '#45704a', '#3a6838'];
    // Back side
    for (let i = -planW / 2 + 2; i < planW / 2; i += 3.5) arr.push({ x: i, z: -planD / 2 - 2.5, s: 1 + (Math.abs(i) % 3) * 0.15, c: colors[Math.abs(Math.floor(i)) % colors.length] });
    // Left side
    for (let z = -planD / 2 + 3; z < planD / 2; z += 4) arr.push({ x: -planW / 2 - 2.5, z, s: 0.9 + (Math.abs(z) % 3) * 0.12, c: colors[(Math.abs(Math.floor(z)) + 1) % colors.length] });
    // Right side
    for (let z = -planD / 2 + 3; z < planD / 2; z += 4) arr.push({ x: planW / 2 + 2.5, z, s: 0.9 + (Math.abs(z) % 3) * 0.12, c: colors[(Math.abs(Math.floor(z)) + 2) % colors.length] });
    // Front side landscaping band (skip center gate approach)
    for (let x = -planW / 2 + 2; x < planW / 2; x += 2.8) {
      if (Math.abs(x) < 3.2) continue;
      arr.push({ x, z: planD / 2 - 1.6, s: 0.85 + (Math.abs(x) % 2) * 0.2, c: colors[(Math.abs(Math.floor(x)) + 3) % colors.length] });
    }
    return arr;
  }, [planW, planD]);
  return (
    <group>
      {bushData.map((b, i) => (
        <group key={i} position={[b.x, 0, b.z]}>
          <mesh castShadow position={[0, b.s * 0.6, 0]}>
            <sphereGeometry args={[b.s, 8, 6]} />
            <meshStandardMaterial color={b.c} roughness={0.9} />
          </mesh>
          <mesh castShadow position={[b.s * 0.4, b.s * 0.4, 0]}>
            <sphereGeometry args={[b.s * 0.7, 6, 5]} />
            <meshStandardMaterial color={b.c === '#3d6b3d' ? '#4a7a4a' : '#3d6b3d'} roughness={0.9} />
          </mesh>
        </group>
      ))}
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
const SecondFloor = ({ plan, firstFloorPlan, material, activeRoom }: {
  plan: Plan; firstFloorPlan: Plan; material: Material; activeRoom?: string | null;
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
    if (room.type === 'garden' || room.type === 'carport' || room.type === 'balcony') return;
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
              frameColor={colors.trim} glassColor={colors.window} doorColor={colors.door} />;
          } else {
            return <WallSegment key={`w2-${i}`} w={w} h={wallH} t={t} color={colors.wall}
              doors={mappedDoors} windows={mappedWindows} materialType={material}
              position={[round2(wall.coord), 0, round2(wall.start + len/2)]} rotation={[0, -Math.PI/2, 0]}
              frameColor={colors.trim} glassColor={colors.window} doorColor={colors.door} />;
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

