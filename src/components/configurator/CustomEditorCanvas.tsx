import { useEffect, useRef, useState, useCallback } from 'react';
import { Stage, Layer, Rect, Text, Line, Group, Transformer } from 'react-konva';
import { Plan, Room, FurnitureItem, generateEmptyPlan, regenerateFurniture } from '@/lib/floorplan';
import { intelligentlyPlaceDoors } from '@/lib/doorPlacer';
import { useConfig, HomeType } from '@/store/configurator';
import Konva from 'konva';
import { RotateCw, Trash2, Save, Plus, Move, Maximize, Trees, BedDouble, Bath, CookingPot, Sofa, UtensilsCrossed } from 'lucide-react';

interface Props {
  homeType: HomeType;
  onChange?: (plan: Plan) => void;
  onSave?: (plan: Plan) => void;
  initialPlan?: Plan | null;
}

// Room block templates
const ROOM_BLOCKS: { type: Room['type']; label: string; icon: any; defaultW: number; defaultH: number; color: string }[] = [
  { type: 'bedroom', label: 'Bedroom', icon: BedDouble, defaultW: 12, defaultH: 10, color: 'hsl(33 35% 82%)' },
  { type: 'living', label: 'Hall/Living', icon: Sofa, defaultW: 16, defaultH: 14, color: 'hsl(40 30% 87%)' },
  { type: 'bathroom', label: 'Bathroom', icon: Bath, defaultW: 7, defaultH: 7, color: 'hsl(200 30% 82%)' },
  { type: 'kitchen', label: 'Kitchen', icon: CookingPot, defaultW: 12, defaultH: 10, color: 'hsl(28 38% 72%)' },
  { type: 'dining', label: 'Dining', icon: UtensilsCrossed, defaultW: 10, defaultH: 10, color: 'hsl(36 28% 82%)' },
  { type: 'garden', label: 'Garden', icon: Trees, defaultW: 10, defaultH: 10, color: 'hsl(120 30% 72%)' },
];

export const CustomEditorCanvas = ({ homeType, onChange, onSave, initialPlan }: Props) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const roomRefs = useRef<{ [key: string]: Konva.Group }>({});
  const config = useConfig();

  const [size, setSize] = useState({ w: 600, h: 400 });
  const [plan, setPlan] = useState<Plan>(() => {
    if (initialPlan) return initialPlan;
    // Use land dimensions from configurator if available
    const landArea = config.customLandArea;
    if (landArea > 0) {
      const side = Math.round(Math.sqrt(landArea));
      return { width: side, height: side, rooms: [] };
    }
    return generateEmptyPlan(homeType);
  });
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [stageScale, setStageScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [roomCounter, setRoomCounter] = useState(0);

  // Update plan when homeType changes
  useEffect(() => {
    if (!initialPlan) {
      const landArea = config.customLandArea;
      if (landArea > 0) {
        const side = Math.round(Math.sqrt(landArea));
        setPlan({ width: side, height: side, rooms: [] });
      } else {
        setPlan(generateEmptyPlan(homeType));
      }
    }
  }, [homeType]);

  // ResizeObserver
  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setSize({ w: r.width, h: r.height });
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  // Transformer
  useEffect(() => {
    if (selectedRoomId && transformerRef.current && roomRefs.current[selectedRoomId]) {
      transformerRef.current.nodes([roomRefs.current[selectedRoomId]]);
      transformerRef.current.getLayer()?.batchDraw();
    } else if (transformerRef.current) {
      transformerRef.current.nodes([]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [selectedRoomId, plan]);

  const pad = 60;
  const scaleX = (size.w - pad * 2) / plan.width;
  const scaleY = (size.h - pad * 2) / plan.height;
  const scale = Math.max(4, Math.min(scaleX, scaleY));
  const offsetX = (size.w - plan.width * scale) / 2;
  const offsetY = (size.h - plan.height * scale) / 2;

  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const scaleBy = 1.08;
    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
    const clampedScale = Math.max(0.5, Math.min(6, newScale));
    const mousePointTo = { x: (pointer.x - stage.x()) / oldScale, y: (pointer.y - stage.y()) / oldScale };
    const newPos = { x: pointer.x - mousePointTo.x * clampedScale, y: pointer.y - mousePointTo.y * clampedScale };
    setStageScale(clampedScale);
    setStagePos(newPos);
  }, []);

  const addRoom = (blockType: Room['type']) => {
    const block = ROOM_BLOCKS.find(b => b.type === blockType);
    if (!block) return;

    const id = `custom-${blockType}-${roomCounter}`;
    setRoomCounter(prev => prev + 1);

    const existingCount = plan.rooms.filter(r => r.type === blockType).length;
    let label = block.label.toUpperCase();
    if (blockType === 'bedroom') {
      label = existingCount === 0 ? 'MASTER BEDROOM' : `BEDROOM ${existingCount + 1}`;
    } else if (existingCount > 0) {
      label = `${block.label.toUpperCase()} ${existingCount + 1}`;
    }

    // Place new room at center of visible area
    const cx = Math.max(0, Math.min(plan.width - block.defaultW, (plan.width - block.defaultW) / 2));
    const cy = Math.max(0, Math.min(plan.height - block.defaultH, (plan.height - block.defaultH) / 2));

    const newRoom: Room = {
      id,
      type: blockType,
      label,
      x: Math.round(cx),
      y: Math.round(cy),
      w: Math.min(block.defaultW, plan.width),
      h: Math.min(block.defaultH, plan.height),
      color: block.color,
      furniture: regenerateFurniture({
        id,
        type: blockType,
        label,
        x: 0,
        y: 0,
        w: Math.min(block.defaultW, plan.width),
        h: Math.min(block.defaultH, plan.height),
        color: block.color,
        furniture: [],
        doors: [],
        windows: [],
      }, config.kitchen),
      doors: [],
      windows: [],
    };

    const updated = { ...plan, rooms: [...plan.rooms, newRoom] };
    setPlan(updated);
    setSelectedRoomId(id);
    onChange?.(updated);
  };

  const deleteRoom = (id: string) => {
    const updated = { ...plan, rooms: plan.rooms.filter(r => r.id !== id) };
    setPlan(updated);
    setSelectedRoomId(null);
    onChange?.(updated);
  };

  const rotateRoom = (id: string) => {
    const updated: Plan = {
      ...plan,
      rooms: plan.rooms.map(r => {
        if (r.id !== id) return r;
        const newOrient = ((r.orientation || 0) + 1) % 4;
        const newRoom = { ...r, orientation: newOrient };
        newRoom.furniture = regenerateFurniture(newRoom, config.kitchen);
        return newRoom;
      }),
    };
    setPlan(updated);
    onChange?.(updated);
  };

  const handleDragEnd = (id: string, e: Konva.KonvaEventObject<DragEvent>) => {
    const newX = Math.round((e.target.x() - offsetX) / scale);
    const newY = Math.round((e.target.y() - offsetY) / scale);
    
    // Clamp within boundary
    const room = plan.rooms.find(r => r.id === id);
    if (!room) return;
    const clampedX = Math.max(0, Math.min(plan.width - room.w, newX));
    const clampedY = Math.max(0, Math.min(plan.height - room.h, newY));
    
    const updated = {
      ...plan,
      rooms: plan.rooms.map(r => r.id === id ? { ...r, x: clampedX, y: clampedY } : r),
    };
    setPlan(updated);
    onChange?.(updated);
  };

  const handleTransformEnd = (id: string) => {
    const node = roomRefs.current[id];
    if (!node) return;
    const room = plan.rooms.find(r => r.id === id);
    if (!room) return;

    const scX = node.scaleX();
    const scY = node.scaleY();
    
    let newX = Math.round((node.x() - offsetX) / scale);
    let newY = Math.round((node.y() - offsetY) / scale);
    let newW = Math.max(4, Math.round(room.w * scX));
    let newH = Math.max(4, Math.round(room.h * scY));

    // Clamp within boundary
    newX = Math.max(0, newX);
    newY = Math.max(0, newY);
    if (newX + newW > plan.width) newW = plan.width - newX;
    if (newY + newH > plan.height) newH = plan.height - newY;
    
    node.scaleX(1);
    node.scaleY(1);
    node.x(offsetX + newX * scale);
    node.y(offsetY + newY * scale);

    const newRoom = { ...room, x: newX, y: newY, w: newW, h: newH };
    newRoom.furniture = regenerateFurniture(newRoom, config.kitchen);
    
    const updated = {
      ...plan,
      rooms: plan.rooms.map(r => r.id === id ? newRoom : r),
    };
    setPlan(updated);
    onChange?.(updated);
  };

  const addWindowsToRooms = (p: Plan): Plan => {
    const rooms = p.rooms.map(room => {
      if (room.windows && room.windows.length > 0) return room;
      const newWindows: Room['windows'] = [];
      // Add windows on exterior walls (walls that face the building boundary)
      const isLeftExterior = room.x <= 1;
      const isRightExterior = room.x + room.w >= p.width - 1;
      const isTopExterior = room.y <= 1;
      const isBottomExterior = room.y + room.h >= p.height - 1;
      
      if (room.type === 'garden' || room.type === 'balcony') return room;
      
      const windowWidth = room.type === 'bathroom' ? 2 : 3;
      if (isLeftExterior && room.h > 4) newWindows.push({ wall: 'left', position: 0.4, width: windowWidth });
      if (isRightExterior && room.h > 4) newWindows.push({ wall: 'right', position: 0.4, width: windowWidth });
      if (isTopExterior && room.w > 4) newWindows.push({ wall: 'top', position: 0.5, width: windowWidth });
      if (isBottomExterior && room.w > 4) newWindows.push({ wall: 'bottom', position: 0.5, width: windowWidth });
      
      return { ...room, windows: newWindows };
    });
    return { ...p, rooms };
  };

  const savePlan = () => {
    // Intelligently place doors before saving
    let finalPlan = intelligentlyPlaceDoors(plan);
    // Add windows on exterior walls
    finalPlan = addWindowsToRooms(finalPlan);
    setPlan(finalPlan);
    onChange?.(finalPlan);
    onSave?.(finalPlan);
  };

  const totalUsedArea = plan.rooms.reduce((sum, r) => sum + r.w * r.h, 0);
  const totalArea = plan.width * plan.height;
  const usagePercent = Math.round((totalUsedArea / totalArea) * 100);
  const selectedRoom = plan.rooms.find(r => r.id === selectedRoomId);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-border bg-white/80 backdrop-blur-sm">
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mr-2">
          Add Room:
        </div>
        {ROOM_BLOCKS.map((block) => {
          const Icon = block.icon;
          return (
            <button
              key={block.type}
              onClick={() => addRoom(block.type)}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-[10px] font-bold uppercase tracking-wider border border-border hover:bg-surface hover:border-clay/40 transition-all active:scale-95 shadow-sm"
              style={{ borderLeftColor: block.color, borderLeftWidth: 3 }}
            >
              <Icon size={12} />
              {block.label}
            </button>
          );
        })}
      </div>

      {/* Action bar for selected room */}
      {selectedRoom && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-blue-50/50">
          <span className="text-[10px] font-bold uppercase tracking-widest text-ink">
            {selectedRoom.label}
          </span>
          <span className="text-[9px] text-muted-foreground">
            {selectedRoom.w}' × {selectedRoom.h}' ({selectedRoom.w * selectedRoom.h} sqft)
          </span>
          <div className="flex-1" />
          <button
            onClick={() => rotateRoom(selectedRoomId!)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase bg-white border border-border hover:bg-surface transition-all active:scale-95"
          >
            <RotateCw size={12} /> Rotate
          </button>
          <button
            onClick={() => deleteRoom(selectedRoomId!)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 transition-all active:scale-95"
          >
            <Trash2 size={12} /> Delete
          </button>
        </div>
      )}

      {/* Canvas */}
      <div ref={wrapRef} className="relative flex-1 overflow-hidden bg-[#f0f2f5]">
        <Stage
          ref={stageRef}
          width={size.w}
          height={size.h}
          scaleX={stageScale}
          scaleY={stageScale}
          x={stagePos.x}
          y={stagePos.y}
          onWheel={handleWheel}
          onPointerDown={(e) => {
            if (e.target === e.target.getStage()) {
              setSelectedRoomId(null);
            }
          }}
          draggable
        >
          {/* Grid */}
          <Layer listening={false}>
            {Array.from({ length: plan.width + 1 }).map((_, i) => (
              <Line
                key={`v-${i}`}
                points={[offsetX + i * scale, offsetY, offsetX + i * scale, offsetY + plan.height * scale]}
                stroke={i % 5 === 0 ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.03)'}
                strokeWidth={i % 5 === 0 ? 1 : 0.5}
              />
            ))}
            {Array.from({ length: plan.height + 1 }).map((_, i) => (
              <Line
                key={`h-${i}`}
                points={[offsetX, offsetY + i * scale, offsetX + plan.width * scale, offsetY + i * scale]}
                stroke={i % 5 === 0 ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.03)'}
                strokeWidth={i % 5 === 0 ? 1 : 0.5}
              />
            ))}
          </Layer>

          {/* Boundary rectangle */}
          <Layer listening={false}>
            <Rect
              x={offsetX}
              y={offsetY}
              width={plan.width * scale}
              height={plan.height * scale}
              stroke="#1a1a1a"
              strokeWidth={4}
              cornerRadius={2}
              dash={[10, 5]}
            />
            {/* Area label */}
            <Text
              x={offsetX + plan.width * scale / 2 - 40}
              y={offsetY - 28}
              text={`${plan.width}' × ${plan.height}' (${totalArea} sqft)`}
              fontFamily="Urbanist"
              fontSize={13}
              fill="#444"
              fontStyle="700"
            />
          </Layer>

          {/* Rooms */}
          <Layer>
            {plan.rooms.map((room) => {
              const rx = offsetX + room.x * scale;
              const ry = offsetY + room.y * scale;
              const rw = room.w * scale;
              const rh = room.h * scale;
              const isSelected = selectedRoomId === room.id;

              return (
                <Group
                  key={room.id}
                  x={rx}
                  y={ry}
                  draggable
                  onDragEnd={(e: any) => handleDragEnd(room.id, e)}
                  onPointerDown={() => setSelectedRoomId(room.id)}
                  onTransformEnd={() => handleTransformEnd(room.id)}
                  ref={(node: any) => {
                    if (node) roomRefs.current[room.id] = node;
                  }}
                >
                  <Rect
                    width={rw}
                    height={rh}
                    fill={room.color}
                    stroke={isSelected ? '#2563eb' : '#2c2c2c'}
                    strokeWidth={isSelected ? 4 : 2}
                    cornerRadius={2}
                    shadowColor={isSelected ? '#2563eb' : 'black'}
                    shadowBlur={isSelected ? 12 : 4}
                    shadowOpacity={isSelected ? 0.3 : 0.15}
                    shadowOffsetY={2}
                  />

                  {/* Floor textures */}
                  {room.type === 'bathroom' && (
                    <Group opacity={0.15}>
                      {Array.from({ length: Math.ceil(rw / (1.5 * scale)) }).map((_, i) => (
                        <Line key={`v-${i}`} points={[i * 1.5 * scale, 0, i * 1.5 * scale, rh]} stroke="#000" strokeWidth={1} />
                      ))}
                      {Array.from({ length: Math.ceil(rh / (1.5 * scale)) }).map((_, i) => (
                        <Line key={`h-${i}`} points={[0, i * 1.5 * scale, rw, i * 1.5 * scale]} stroke="#000" strokeWidth={1} />
                      ))}
                    </Group>
                  )}
                  {(room.type === 'bedroom' || room.type === 'living') && (
                    <Group opacity={0.06}>
                      {Array.from({ length: Math.ceil(rw / (1.2 * scale)) }).map((_, i) => (
                        <Line key={`w-${i}`} points={[i * 1.2 * scale, 0, i * 1.2 * scale, rh]} stroke="#000" strokeWidth={1.5} />
                      ))}
                    </Group>
                  )}
                  {room.type === 'garden' && (
                    <Group opacity={0.3}>
                      {Array.from({ length: Math.ceil((rw + rh) / scale) }).map((_, i) => (
                        <Line key={`hatch-${i}`}
                          points={[Math.min(i * scale, rw), Math.max(0, i * scale - rw), Math.max(0, i * scale - rh), Math.min(i * scale, rh)]}
                          stroke="hsl(120, 30%, 50%)" strokeWidth={0.5} />
                      ))}
                    </Group>
                  )}

                  {/* Room label */}
                  <Text
                    text={room.label}
                    fontFamily="Urbanist"
                    fontStyle="800"
                    fontSize={Math.max(9, Math.min(13, rw * 0.07))}
                    fill="rgba(0,0,0,0.75)"
                    align="center"
                    verticalAlign="middle"
                    width={rw}
                    y={rh / 2 - 10}
                    shadowColor="white"
                    shadowBlur={4}
                    shadowOpacity={1}
                    shadowOffset={{ x: 0, y: 0 }}
                    letterSpacing={1}
                  />
                  <Text
                    text={`${room.w}' × ${room.h}'`}
                    fontFamily="Epilogue"
                    fontStyle="600"
                    fontSize={8}
                    fill="rgba(0,0,0,0.5)"
                    align="center"
                    width={rw}
                    y={rh / 2 + 5}
                  />

                  {/* Move indicator */}
                  {isSelected && (
                    <Group>
                      <Rect x={rw / 2 - 10} y={-18} width={20} height={14} fill="#2563eb" cornerRadius={4} />
                      <Text x={rw / 2 - 6} y={-16} text="↕↔" fontSize={8} fill="white" fontStyle="bold" />
                    </Group>
                  )}
                </Group>
              );
            })}

            <Transformer
              ref={transformerRef}
              rotateEnabled={false}
              boundBoxFunc={(oldBox, newBox) => {
                if (newBox.width < 30 || newBox.height < 30) return oldBox;
                return newBox;
              }}
              anchorCornerRadius={4}
              anchorStroke="#2563eb"
              anchorFill="#ffffff"
              borderStroke="#2563eb"
              borderStrokeWidth={2}
            />
          </Layer>

          {/* Dimension labels */}
          <Layer listening={false}>
            <Text
              x={offsetX + plan.width * scale / 2 - 20}
              y={offsetY + plan.height * scale + 16}
              text={`${plan.width} ft`}
              fontFamily="Urbanist"
              fontSize={12}
              fill="#666"
              fontStyle="700"
            />
            <Text
              x={offsetX - 32}
              y={offsetY + plan.height * scale / 2}
              text={`${plan.height} ft`}
              fontFamily="Urbanist"
              fontSize={12}
              fill="#666"
              fontStyle="700"
              rotation={-90}
            />
          </Layer>
        </Stage>

        {/* Zoom controls */}
        <div className="absolute bottom-3 right-3 flex flex-col gap-1.5">
          <button onClick={() => setStageScale(Math.min(6, stageScale * 1.25))}
            className="flex h-8 w-8 items-center justify-center rounded-lg glass-panel text-sm font-bold shadow-sm hover:bg-white/90 transition-colors">+</button>
          <button onClick={() => setStageScale(Math.max(0.5, stageScale / 1.25))}
            className="flex h-8 w-8 items-center justify-center rounded-lg glass-panel text-sm font-bold shadow-sm hover:bg-white/90 transition-colors">−</button>
          <button onClick={() => { setStageScale(1); setStagePos({ x: 0, y: 0 }); }}
            className="flex h-8 w-8 items-center justify-center rounded-lg glass-panel text-[9px] font-bold shadow-sm hover:bg-white/90 transition-colors">FIT</button>
        </div>

        {/* Status bar */}
        <div className="absolute left-3 bottom-3 glass-panel rounded-lg px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest shadow-sm">
          {plan.rooms.length} rooms · {totalUsedArea} sqft used · {usagePercent}%
        </div>
      </div>

      {/* Bottom save bar */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-white/90 backdrop-blur-sm">
        <div className="text-[11px] text-muted-foreground">
          <span className="font-bold text-ink">{plan.rooms.length}</span> rooms placed · 
          <span className="font-bold text-ink ml-1">{totalUsedArea}</span> / {totalArea} sqft used
        </div>
        <button
          onClick={savePlan}
          className="flex items-center gap-2 rounded-xl bg-ink px-5 py-2.5 text-xs font-bold text-ink-foreground uppercase tracking-wider shadow-lg hover:opacity-90 transition-all active:scale-95"
        >
          <Save size={14} />
          Save Layout
        </button>
      </div>
    </div>
  );
};
