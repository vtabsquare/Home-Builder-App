import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Html } from '@react-three/drei';
import { Suspense, useMemo } from 'react';
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
}

const MATERIAL_COLORS: Record<Material, { wall: string; trim: string; roof: string; window: string; door: string }> = {
  budget: { wall: '#e7decf', trim: '#8a8478', roof: '#6b5b4e', window: '#9ec3d4', door: '#6b5040' },
  modern: { wall: '#f0ebe3', trim: '#1a1a1a', roof: '#2c2c2c', window: '#a8d4e6', door: '#2a2a2a' },
  luxury: { wall: '#1f1d1a', trim: '#c9a84c', roof: '#0d0d0d', window: '#7ab0c8', door: '#8b6914' },
};

const CameraController = ({ activeRoom, plan }: { activeRoom?: string | null, plan: Plan }) => {
  const W = plan.width;
  const D = plan.height;

  useFrame((state, delta) => {
    const controls = state.controls as any;
    if (!controls) return;

    if (!activeRoom || activeRoom === 'overview' || activeRoom === 'garden') {
       controls.target.lerp(new THREE.Vector3(0, 0, 0), delta * 2);
       if (state.camera.position.length() < 30) {
         state.camera.position.lerp(new THREE.Vector3(45, 25, 45), delta * 1.5);
       }
       return;
    }

    const rs = plan.rooms.filter(r => r.type === activeRoom);
    if (rs.length > 0) {
      const avgX = rs.reduce((sum, r) => sum + r.x + r.w / 2, 0) / rs.length;
      const avgY = rs.reduce((sum, r) => sum + r.y + r.h / 2, 0) / rs.length;
      
      const targetCenter = new THREE.Vector3(avgX - W / 2, 0, avgY - D / 2);
      
      const minX = Math.min(...rs.map(r => r.x));
      const maxX = Math.max(...rs.map(r => r.x + r.w));
      const minY = Math.min(...rs.map(r => r.y));
      const maxY = Math.max(...rs.map(r => r.y + r.h));
      const extent = Math.max(maxX - minX, maxY - minY);
      
      const height = Math.max(35, extent * 1.8);
      const targetCamPos = new THREE.Vector3(targetCenter.x, height, targetCenter.z + 10);

      state.camera.position.lerp(targetCamPos, delta * 3.5);
      controls.target.lerp(targetCenter, delta * 3.5);
    }
  });

  return null;
};

export const ElevationCanvas = ({ plan, roof, material, addons = [], activeRoom }: Props) => {
  const hideRoof = activeRoom && activeRoom !== 'overview' && activeRoom !== 'garden';

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl bg-gradient-to-b from-[hsl(210,35%,22%)] to-[hsl(210,30%,12%)]">
      <Canvas
        shadows
        camera={{ position: [45, 25, 45], fov: 36 }}
        dpr={[1, 1.8]}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
      >
        <Suspense fallback={null}>
          <fog attach="fog" args={['#1a2a3a', 80, 200]} />
          {/* Enhanced Lighting */}
          <ambientLight intensity={hideRoof ? 0.9 : 0.4} color="#f0f5fa" />
          <directionalLight
            position={[25, 45, 20]} intensity={hideRoof ? 2.5 : 1.8} castShadow color="#fff5e6"
            shadow-mapSize={[2048, 2048]}
            shadow-camera-left={-50} shadow-camera-right={50}
            shadow-camera-top={50} shadow-camera-bottom={-50}
            shadow-bias={-0.0005}
          />
          <directionalLight position={[-20, 15, -10]} intensity={0.4} color="#6080b0" />
          
          <Environment preset="sunset" />
          <Ground />
          <GrassField planW={plan.width} planD={plan.height} />
          
          <House plan={plan} roof={roof} material={material} activeRoom={activeRoom} addons={addons} />
          
          <Pathway planD={plan.height} />
          {addons.includes('carport') && <Carport plan={plan} />}
          
          <Trees planW={plan.width} planD={plan.height} />
          <Bushes planW={plan.width} planD={plan.height} />
          {addons.includes('smart_home') && <FenceAround planW={plan.width} planD={plan.height} />}
          
          <CameraController activeRoom={activeRoom} plan={plan} />
          <ContactShadows position={[0, 0.02, 0]} opacity={0.55} scale={120} blur={2.8} far={30} />
          <OrbitControls
            makeDefault
            enablePan={true} minDistance={5} maxDistance={100}
            minPolarAngle={0} maxPolarAngle={Math.PI / 2.1}
            autoRotate={!activeRoom || activeRoom === 'overview' || activeRoom === 'garden'} 
            autoRotateSpeed={0.4}
            enableDamping dampingFactor={0.05}
          />
        </Suspense>
      </Canvas>
      <div className="pointer-events-none absolute left-4 top-4 rounded-xl glass-panel px-3 py-2 text-[9px] font-display font-semibold uppercase tracking-[0.2em]">
        Drag to rotate · Scroll to zoom
      </div>
    </div>
  );
};

/* ─── Ground ─── */
const Ground = () => (
  <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
    <planeGeometry args={[300, 300]} />
    <meshStandardMaterial color="#2a4a2e" roughness={0.95} />
  </mesh>
);

const GrassField = ({ planW, planD }: { planW: number; planD: number }) => {
  const patches = useMemo(() => {
    const arr: { x: number; z: number; s: number }[] = [];
    for (let i = 0; i < 60; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 15 + Math.random() * 35;
      arr.push({ x: Math.cos(angle) * dist, z: Math.sin(angle) * dist, s: 0.3 + Math.random() * 0.5 });
    }
    return arr;
  }, [planW, planD]);
  return (
    <group>
      {patches.map((p, i) => (
        <mesh key={i} position={[p.x, 0.05, p.z]} rotation={[-Math.PI / 2, 0, Math.random() * Math.PI]}>
          <circleGeometry args={[p.s, 8]} />
          <meshStandardMaterial color={i % 3 === 0 ? '#3d6b3d' : '#2d5a2d'} roughness={1} />
        </mesh>
      ))}
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
  const wallH = 10;
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
  const mainRooms = plan.rooms.filter(r => r.type !== 'garden' && r.type !== 'carport' && r.type !== 'balcony');
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

  plan.rooms.forEach(room => {
    // Only extract solid walls for enclosed rooms
    if (room.type === 'garden' || room.type === 'carport' || room.type === 'balcony') return;

    const rX = room.x;
    const rY = room.y;
    const rW = room.w;
    const rH = room.h;

    // Convert relative doors/windows to absolute coordinates
    const getAbsDoors = (wall: string) => room.doors.filter((d:any) => d.wall === wall).map((d:any) => ({
      ...d, absPos: (wall === 'top' || wall === 'bottom') ? rX + rW * d.position : rY + rH * d.position
    }));
    const getAbsWindows = (wall: string) => room.windows.filter((w:any) => w.wall === wall).map((win:any) => ({
      ...win, absPos: (wall === 'top' || wall === 'bottom') ? rX + rW * win.position : rY + rH * win.position
    }));

    // 2. Add walls perfectly aligned to room edges
    addWall('h', rY, rX, rX + rW, getAbsDoors('top'), getAbsWindows('top'));
    addWall('h', rY + rH, rX, rX + rW, getAbsDoors('bottom'), getAbsWindows('bottom'));
    addWall('v', rX, rY, rY + rH, getAbsDoors('left'), getAbsWindows('left'));
    addWall('v', rX + rW, rY, rY + rH, getAbsDoors('right'), getAbsWindows('right'));
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Foundation */}
      <mesh receiveShadow position={[roofCX, 0.4, roofCZ]}>
        <boxGeometry args={[roofW + 1, 0.8, roofD + 1]} />
        <meshStandardMaterial color="#8a8478" roughness={0.9} />
      </mesh>

      {/* Render Room Floors & Furniture */}
      <group position={[0, 0.8, 0]}>
        {plan.rooms.map(r => {
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
                <pointLight position={[cx, 8, cz]} intensity={1.2} distance={20} color="#ffedd6" castShadow={false} />
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
              doors={mappedDoors} windows={mappedWindows}
              position={[posX, 0, posZ]} rotation={[0, 0, 0]}
              frameColor={colors.trim} glassColor={colors.window} doorColor={colors.door} />;
          } else {
            const posX = round2(wall.coord - W/2);
            const posZ = round2(wall.start + len/2 - D/2);
            return <WallSegment key={`wall-${i}`} w={w} h={wallH} t={t} color={colors.wall}
              doors={mappedDoors} windows={mappedWindows}
              position={[posX, 0, posZ]} rotation={[0, -Math.PI/2, 0]}
              frameColor={colors.trim} glassColor={colors.window} doorColor={colors.door} />;
          }
        })}
      </group>

      {/* Trim lines */}
      <mesh position={[roofCX, wallH + 0.8, roofCZ]}>
        <boxGeometry args={[roofW + t, 0.5, roofD + t]} />
        <meshStandardMaterial color={colors.trim} roughness={0.5} transparent opacity={hideRoof ? 0.2 : 1} depthWrite={!hideRoof} />
      </mesh>

      {/* Roof */}
      {roof === 'gable' ? (
        <GableRoof W={roofW} D={roofD} cx={roofCX} cz={roofCZ} wallH={wallH} color={colors.roof} trimColor={colors.trim} transparent={hideRoof} opacity={hideRoof ? 0.1 : 1} />
      ) : (
        <FlatRoof W={roofW} D={roofD} cx={roofCX} cz={roofCZ} wallH={wallH} color={colors.roof} transparent={hideRoof} opacity={hideRoof ? 0.1 : 1} />
      )}

      {/* Rooftop Add-ons tied to Building Bounds */}
      {addons.includes('solar') && !hideRoof && <SolarPanels minX={minX - W/2} maxX={maxX - W/2} minZ={minZ - D/2} maxZ={maxZ - D/2} roofType={roof} wallH={wallH} />}
      {addons.includes('water_tank') && !hideRoof && <WaterTank maxX={maxX - W/2} maxZ={maxZ - D/2} wallH={wallH} roofType={roof} />}

      {/* Floating Labels */}
      {plan.rooms.map(r => {
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

/* ─── Wall Rendering Geometry ─── */
const WallSegment = ({ w, h, t, color, doors, windows, position, rotation, frameColor, glassColor, doorColor }: any) => {
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    // Center the 2D shape horizontally
    s.moveTo(-w/2, 0);
    s.lineTo(w/2, 0);
    s.lineTo(w/2, h);
    s.lineTo(-w/2, h);
    s.closePath();

    doors.forEach((d: any) => {
      const dw = d.width;
      const dh = 7.5; // Door Height
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
      const ww = win.width;
      const wh = 4; // Window Height
      const wy = 3; // Window Sill Height
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
      {/* Shift by -t/2 in Z to perfectly center the wall extrusion exactly on the coordinate boundary */}
      <mesh castShadow receiveShadow position={[0, 0, -t/2]}>
        <extrudeGeometry args={[shape, { depth: t, bevelEnabled: false }]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      
      {/* Render Doors embedded inside hole */}
      {doors.map((d: any, i: number) => {
        const dw = d.width;
        const dh = 7.5;
        const dx = w * d.relPos - w/2;
        return (
          <group key={`d-${i}`} position={[dx, dh/2, 0]}>
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[dw + 0.4, dh + 0.4, t + 0.1]} />
              <meshStandardMaterial color={frameColor} roughness={0.6} />
            </mesh>
            <mesh position={[0, -0.2, 0]}>
              <boxGeometry args={[dw, dh, 0.1]} />
              <meshStandardMaterial color={doorColor} roughness={0.4} />
            </mesh>
            <mesh position={[dw/2 - 0.3, 0, 0.1]}>
              <sphereGeometry args={[0.08, 16, 16]} />
              <meshStandardMaterial color="#ccc" metalness={0.8} roughness={0.2} />
            </mesh>
          </group>
        );
      })}

      {/* Render Windows embedded inside hole */}
      {windows.map((win: any, i: number) => {
        const ww = win.width;
        const wh = 4;
        const wy = 3 + wh/2;
        const wx = w * win.relPos - w/2;
        return (
          <group key={`w-${i}`} position={[wx, wy, 0]}>
            <mesh>
              <boxGeometry args={[ww + 0.4, wh + 0.4, t + 0.1]} />
              <meshStandardMaterial color={frameColor} roughness={0.6} />
            </mesh>
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[ww, wh, 0.05]} />
              <meshStandardMaterial color={glassColor} roughness={0.1} metalness={0.4} transparent opacity={0.6} depthWrite={false} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

/* ─── Roofs ─── */
const GableRoof = ({ W, D, cx, cz, wallH, color, trimColor, transparent, opacity }: any) => {
  const roofH = 6;
  const overhang = 2;
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
      <mesh castShadow>
        <extrudeGeometry args={[shape, { steps: 1, depth: hd * 2, bevelEnabled: false }]} />
        <meshStandardMaterial color={color} roughness={0.75} side={THREE.DoubleSide} transparent={transparent} opacity={opacity} depthWrite={!transparent} />
      </mesh>
      {/* Ridge line */}
      <mesh position={[0, roofH + 0.1, hd]}>
        <boxGeometry args={[0.3, 0.3, hd * 2 + 1]} />
        <meshStandardMaterial color={trimColor} roughness={0.5} metalness={0.2} transparent={transparent} opacity={opacity} depthWrite={!transparent} />
      </mesh>
    </group>
  );
};

const FlatRoof = ({ W, D, cx, cz, wallH, color, transparent, opacity }: any) => (
  <group position={[cx, wallH + 1.2, cz]}>
    <mesh castShadow>
      <boxGeometry args={[W + 2, 1, D + 2]} />
      <meshStandardMaterial color={color} roughness={0.7} transparent={transparent} opacity={opacity} depthWrite={!transparent} />
    </mesh>
    {[[-1, 0], [1, 0], [0, -1], [0, 1]].map(([dx, dz], i) => (
      <mesh key={i} position={[dx * (W / 2 + 0.8), 0.8, dz * (D / 2 + 0.8)]}>
        <boxGeometry args={[dx ? 0.4 : W + 2, 1.2, dz ? 0.4 : D + 2]} />
        <meshStandardMaterial color={color} roughness={0.7} transparent={transparent} opacity={opacity} depthWrite={!transparent} />
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
    // Gable Roof
    const centerZ = (minZ + maxZ) / 2;
    const roofH = 6;
    const slopeLen = Math.hypot((maxZ - minZ)/2 + 2, roofH); 
    const angle = Math.atan2(roofH, (maxZ - minZ)/2 + 2);
    
    // Front slope
    const pz = centerZ + (maxZ - centerZ) / 2;
    const py = wallH + roofH / 2 + 1; 
    const rotX = - (Math.PI / 2 - angle);

    for (let c = 0; c < cols; c++) {
        const px = startX + c * (panelW + gap) + panelW/2;
        panels.push(
          <mesh key={`g-${c}`} position={[px, py, pz]} rotation={[rotX, 0, 0]} castShadow>
            <boxGeometry args={[panelW, panelD, 0.2]} />
            <meshStandardMaterial color="#1a2a4a" metalness={0.8} roughness={0.2} />
          </mesh>
        );
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
  const c = plan.rooms.find((r:any) => r.type === 'carport');
  if (!c) return null;
  const rx = c.x - plan.width/2 + c.w/2;
  const rz = c.y - plan.height/2 + c.h/2;
  return (
    <group position={[rx, 0, rz]}>
      {[[-c.w/2 + 0.5, -c.h/2 + 0.5], [-c.w/2 + 0.5, c.h/2 - 0.5], [c.w/2 - 0.5, -c.h/2 + 0.5], [c.w/2 - 0.5, c.h/2 - 0.5]].map(([x, z], i) => (
        <mesh key={i} castShadow position={[x, 4.5, z]}>
          <cylinderGeometry args={[0.2, 0.2, 9, 8]} />
          <meshStandardMaterial color="#555" roughness={0.6} />
        </mesh>
      ))}
      <mesh castShadow position={[0, 9.2, 0]}>
        <boxGeometry args={[c.w + 1, 0.4, c.h + 1]} />
        <meshStandardMaterial color="#333" roughness={0.8} />
      </mesh>
    </group>
  );
};

/* ─── Decor ─── */
const Balcony = ({ W, D, wallH, trimColor }: any) => (
  <group position={[0, 0.6, D / 2]}>
    <mesh receiveShadow position={[0, 0, 2.5]}>
      <boxGeometry args={[W * 0.6, 0.3, 5]} />
      <meshStandardMaterial color="#8a7a68" roughness={0.8} />
    </mesh>
    {Array.from({ length: 8 }).map((_, i) => {
      const x = -W * 0.3 + (W * 0.6 / 7) * i;
      return (
        <mesh key={i} position={[x, 1.8, 4.9]} castShadow>
          <boxGeometry args={[0.2, 3, 0.2]} />
          <meshStandardMaterial color={trimColor} roughness={0.5} metalness={0.2} />
        </mesh>
      );
    })}
    <mesh position={[0, 3.3, 4.9]}>
      <boxGeometry args={[W * 0.6 + 0.3, 0.15, 0.25]} />
      <meshStandardMaterial color={trimColor} roughness={0.5} metalness={0.2} />
    </mesh>
    {[0, 1, 2].map((s) => (
      <mesh key={s} receiveShadow position={[0, -s * 0.35, 5 + s * 1.2]}>
        <boxGeometry args={[4, 0.3, 1.2]} />
        <meshStandardMaterial color="#9a8a78" roughness={0.85} />
      </mesh>
    ))}
  </group>
);

const Pathway = ({ planD }: { planD: number }) => (
  <group>
    {Array.from({ length: 8 }).map((_, i) => (
      <mesh key={i} receiveShadow position={[0, 0.04, planD / 2 + 8 + i * 2.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.5, 2]} />
        <meshStandardMaterial color={i % 2 === 0 ? '#b8a898' : '#a89888'} roughness={0.9} />
      </mesh>
    ))}
  </group>
);

const Trees = ({ planW, planD }: { planW: number; planD: number }) => {
  const positions = [
    [-planW / 2 - 8, -planD / 2 + 5],
    [planW / 2 + 8, planD / 2 - 3],
    [-planW / 2 - 5, planD / 2 + 8],
    [planW / 2 + 10, -planD / 2 - 5]
  ];
  return (
    <group>
      {positions.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh castShadow position={[0, 3, 0]}><cylinderGeometry args={[0.3, 0.5, 6, 6]} /><meshStandardMaterial color="#3a2a1a" roughness={0.9} /></mesh>
          <mesh castShadow position={[0, 7, 0]}><sphereGeometry args={[3.5, 8, 8]} /><meshStandardMaterial color="#2d5a2d" roughness={0.85} /></mesh>
          <mesh castShadow position={[1.5, 6, 1]}><sphereGeometry args={[2.5, 8, 8]} /><meshStandardMaterial color="#3a6b3a" roughness={0.85} /></mesh>
        </group>
      ))}
    </group>
  );
};

const Bushes = ({ planW, planD }: { planW: number; planD: number }) => {
  const positions = [];
  for (let i = -planW / 2 + 2; i < planW / 2; i += 4) positions.push([i, -planD / 2 - 2]);
  return (
    <group>
      {positions.map(([x, z], i) => (
        <mesh key={i} castShadow position={[x, 0.8, z]}>
          <sphereGeometry args={[1.2 + (i % 3) * 0.3, 8, 6]} />
          <meshStandardMaterial color={i % 2 === 0 ? '#3d6b3d' : '#4a7a4a'} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
};

const FenceAround = ({ planW, planD }: { planW: number; planD: number }) => {
  const fenceOffset = 12;
  const hw = planW / 2 + fenceOffset;
  const hd = planD / 2 + fenceOffset;
  const posts: [number, number][] = [];
  for (let x = -hw; x <= hw; x += 4) { posts.push([x, -hd]); posts.push([x, hd]); }
  for (let z = -hd + 4; z < hd; z += 4) { posts.push([-hw, z]); posts.push([hw, z]); }

  return (
    <group>
      {posts.map(([x, z], i) => (
        <mesh key={i} position={[x, 1.2, z]} castShadow><boxGeometry args={[0.2, 2.4, 0.2]} /><meshStandardMaterial color="#8b7355" roughness={0.85} /></mesh>
      ))}
      {[0.6, 1.8].map((y) => (
        <group key={y}>
          <mesh position={[0, y, -hd]}><boxGeometry args={[hw * 2, 0.1, 0.1]} /><meshStandardMaterial color="#7a6345" roughness={0.85} /></mesh>
          <mesh position={[0, y, hd]}><boxGeometry args={[hw * 2, 0.1, 0.1]} /><meshStandardMaterial color="#7a6345" roughness={0.85} /></mesh>
          <mesh position={[-hw, y, 0]}><boxGeometry args={[0.1, 0.1, hd * 2]} /><meshStandardMaterial color="#7a6345" roughness={0.85} /></mesh>
          <mesh position={[hw, y, 0]}><boxGeometry args={[0.1, 0.1, hd * 2]} /><meshStandardMaterial color="#7a6345" roughness={0.85} /></mesh>
        </group>
      ))}
    </group>
  );
};
