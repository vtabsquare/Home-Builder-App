import { useEffect, useRef, useState, useCallback } from 'react';
import { Stage, Layer, Rect, Text, Line, Group, Transformer } from 'react-konva';
import { Plan, Room, FurnitureItem, generateEmptyPlan, regenerateFurniture } from '@/lib/floorplan';
import { useConfig, HomeType } from '@/store/configurator';
import Konva from 'konva';
import { RotateCw, Trash2, Save, Plus, Move, Maximize, Trees, BedDouble, Bath, CookingPot, Sofa, UtensilsCrossed, Waypoints, Car, Fence } from 'lucide-react';

interface Props {
  homeType: HomeType;
  onChange?: (plan: Plan) => void;
  onSave?: (plan: Plan) => void;
  initialPlan?: Plan | null;
}

// Room block templates
export const ROOM_BLOCKS: { type: Room['type']; label: string; icon: any; defaultW: number; defaultH: number; color: string; kitchenType?: Room['kitchenType'] }[] = [
  { type: 'bedroom', label: 'Bedroom', icon: BedDouble, defaultW: 12, defaultH: 10, color: 'hsl(33 35% 82%)' },
  { type: 'living', label: 'Hall/Living', icon: Sofa, defaultW: 16, defaultH: 14, color: 'hsl(40 30% 87%)' },
  { type: 'hallway', label: 'Hallway', icon: Move, defaultW: 10, defaultH: 4, color: 'hsl(38 20% 88%)' },
  { type: 'staircase', label: 'Staircase', icon: Waypoints, defaultW: 10, defaultH: 8, color: 'hsl(38 20% 88%)' },
  { type: 'bathroom', label: 'Bathroom', icon: Bath, defaultW: 7, defaultH: 7, color: 'hsl(200 30% 82%)' },
  { type: 'kitchen', label: 'Standard Kitchen', icon: CookingPot, defaultW: 12, defaultH: 10, color: 'hsl(28 38% 72%)', kitchenType: 'standard' },
  { type: 'kitchen', label: 'Open Kitchen', icon: CookingPot, defaultW: 12, defaultH: 10, color: 'hsl(28 38% 72%)', kitchenType: 'open' },
  { type: 'kitchen', label: 'Galley Kitchen', icon: CookingPot, defaultW: 12, defaultH: 10, color: 'hsl(28 38% 72%)', kitchenType: 'galley' },
  { type: 'dining', label: 'Dining', icon: UtensilsCrossed, defaultW: 10, defaultH: 10, color: 'hsl(36 28% 82%)' },
  { type: 'balcony', label: 'Balcony', icon: Fence, defaultW: 12, defaultH: 4, color: 'hsl(120 18% 78%)' },
  { type: 'carport', label: 'Carport', icon: Car, defaultW: 12, defaultH: 14, color: 'hsl(0 0% 82%)' },
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
  const [isWallMode, setIsWallMode] = useState(false);
  const [wallPopup, setWallPopup] = useState<{ roomId: string, wall: string, x: number, y: number } | null>(null);

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

  const addRoom = (blockIndex: number) => {
    const block = ROOM_BLOCKS[blockIndex];
    if (!block) return;

    const blockType = block.type;
    const id = `custom-${blockType}-${roomCounter}`;
    setRoomCounter(prev => prev + 1);

    const existingCount = plan.rooms.filter(r => r.type === blockType).length;
    let label = block.label.toUpperCase();
    if (blockType === 'bedroom') {
      label = existingCount === 0 ? 'MASTER BEDROOM' : `BEDROOM ${existingCount + 1}`;
    } else if (blockType === 'staircase') {
      label = existingCount === 0 ? 'STAIRCASE' : `STAIRCASE ${existingCount + 1}`;
    } else if (existingCount > 0 && !block.kitchenType) {
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
      kitchenType: block.kitchenType,
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
        kitchenType: block.kitchenType,
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
  const mirrorRoom = (id: string) => {
    const updated: Plan = {
      ...plan,
      rooms: plan.rooms.map(r => {
        if (r.id !== id) return r;
        return { ...r, isMirrored: !r.isMirrored };
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

  /** Toggle a wall on the source room AND the adjacent room's opposite wall */
  const toggleWallWithAdjacent = (sourceRoom: Room, wall: string) => {
    const isAdding = !(sourceRoom.openWalls || []).includes(wall as any);
    const oppositeMap: Record<string, string> = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };

    const updatedRooms = plan.rooms.map(r => {
      if (r.id === sourceRoom.id) {
        const openWalls = r.openWalls || [];
        const newOpenWalls = openWalls.includes(wall as any)
          ? openWalls.filter(w => w !== wall)
          : [...openWalls, wall as any];
        return { ...r, openWalls: newOpenWalls };
      }

      // Check if this room is adjacent on the toggled wall side
      let targetWall: string | null = null;
      if (wall === 'top' && Math.abs((r.y + r.h) - sourceRoom.y) < 1) {
        if (Math.max(r.x, sourceRoom.x) < Math.min(r.x + r.w, sourceRoom.x + sourceRoom.w) - 0.1) targetWall = 'bottom';
      } else if (wall === 'bottom' && Math.abs(r.y - (sourceRoom.y + sourceRoom.h)) < 1) {
        if (Math.max(r.x, sourceRoom.x) < Math.min(r.x + r.w, sourceRoom.x + sourceRoom.w) - 0.1) targetWall = 'top';
      } else if (wall === 'left' && Math.abs((r.x + r.w) - sourceRoom.x) < 1) {
        if (Math.max(r.y, sourceRoom.y) < Math.min(r.y + r.h, sourceRoom.y + sourceRoom.h) - 0.1) targetWall = 'right';
      } else if (wall === 'right' && Math.abs(r.x - (sourceRoom.x + sourceRoom.w)) < 1) {
        if (Math.max(r.y, sourceRoom.y) < Math.min(r.y + r.h, sourceRoom.y + sourceRoom.h) - 0.1) targetWall = 'left';
      }

      if (targetWall) {
        const openWalls = r.openWalls || [];
        if (isAdding && !openWalls.includes(targetWall as any)) {
          return { ...r, openWalls: [...openWalls, targetWall as any] };
        } else if (!isAdding) {
          return { ...r, openWalls: openWalls.filter(w => w !== targetWall) };
        }
      }
      return r;
    });

    const updated = { ...plan, rooms: updatedRooms };
    setPlan(updated);
    onChange?.(updated);
  };

  const savePlan = () => {
    // Preserve the user's exact door placement; only auto-fill exterior windows.
    const finalPlan = addWindowsToRooms(plan);
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
        {ROOM_BLOCKS.map((block, idx) => {
          const Icon = block.icon;
          return (
            <button
              key={`${block.type}-${idx}`}
              onClick={() => addRoom(idx)}
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
            onClick={() => {
              setIsWallMode(!isWallMode);
              setWallPopup(null);
            }}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase border transition-all active:scale-95 ${
              isWallMode ? 'bg-clay text-white border-transparent' : 'bg-white border-border hover:bg-surface'
            }`}
          >
            <Maximize size={12} /> {isWallMode ? 'Exit Wall Mode' : (selectedRoom?.type === 'balcony' ? 'Add/Remove Handrail' : 'Add/Remove Wall')}
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
              setWallPopup(null);
            }
          }}
          draggable
        >
          {/* Background: Grid & Boundary */}
          <Layer listening={false}>
            {/* Grid */}
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
            {/* Boundary rectangle */}
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
                    cornerRadius={2}
                    shadowColor={isSelected ? '#2563eb' : 'black'}
                    shadowBlur={isSelected ? 12 : 4}
                    shadowOpacity={isSelected ? 0.3 : 0.15}
                    shadowOffsetY={2}
                  />

                  {/* Individual Walls / Handrails */}
                  {(true) && (
                    <>
                      {/* Top Wall */}
                      {room.type === 'balcony' && !room.openWalls?.includes('top') && (() => {
                        const balusterCount = Math.max(2, Math.floor(rw / (scale * 1.5)));
                        const spacing = rw / (balusterCount + 1);
                        return (
                          <Group>
                            {Array.from({ length: balusterCount }).map((_, i) => (
                              <Line key={`bt-${i}`} points={[(i + 1) * spacing, -1, (i + 1) * spacing, 3]} stroke={isSelected ? '#2563eb' : '#5a5a5a'} strokeWidth={1.5} />
                            ))}
                          </Group>
                        );
                      })()}
                      <Line 
                        points={[0, 0, rw, 0]} 
                        stroke={room.openWalls?.includes('top') ? 'transparent' : (isSelected ? '#2563eb' : (room.type === 'balcony' ? '#6b6b6b' : '#2c2c2c'))} 
                        strokeWidth={isSelected ? 4 : (isWallMode ? 6 : (room.type === 'balcony' ? 2 : 3))} 
                        dash={room.type === 'balcony' && !room.openWalls?.includes('top') ? [6, 4] : undefined}
                        hitStrokeWidth={25}
                        onClick={(e) => {
                          e.cancelBubble = true;
                          if (isWallMode) {
                            const stage = e.target.getStage();
                            const pos = stage.getPointerPosition();
                            setWallPopup({ roomId: room.id, wall: 'top', x: pos.x, y: pos.y });
                          } else {
                            toggleWallWithAdjacent(room, 'top');
                          }
                        }}
                        onMouseEnter={(e) => e.target.getStage()!.container().style.cursor = 'pointer'}
                        onMouseLeave={(e) => e.target.getStage()!.container().style.cursor = 'default'}
                      />
                      {/* Bottom Wall */}
                      {room.type === 'balcony' && !room.openWalls?.includes('bottom') && (() => {
                        const balusterCount = Math.max(2, Math.floor(rw / (scale * 1.5)));
                        const spacing = rw / (balusterCount + 1);
                        return (
                          <Group>
                            {Array.from({ length: balusterCount }).map((_, i) => (
                              <Line key={`bb-${i}`} points={[(i + 1) * spacing, rh - 3, (i + 1) * spacing, rh + 1]} stroke={isSelected ? '#2563eb' : '#5a5a5a'} strokeWidth={1.5} />
                            ))}
                          </Group>
                        );
                      })()}
                      <Line 
                        points={[0, rh, rw, rh]} 
                        stroke={room.openWalls?.includes('bottom') ? 'transparent' : (isSelected ? '#2563eb' : (room.type === 'balcony' ? '#6b6b6b' : '#2c2c2c'))} 
                        strokeWidth={isSelected ? 4 : (isWallMode ? 6 : (room.type === 'balcony' ? 2 : 3))} 
                        dash={room.type === 'balcony' && !room.openWalls?.includes('bottom') ? [6, 4] : undefined}
                        hitStrokeWidth={25}
                        onClick={(e) => {
                          e.cancelBubble = true;
                          if (isWallMode) {
                            const stage = e.target.getStage();
                            const pos = stage.getPointerPosition();
                            setWallPopup({ roomId: room.id, wall: 'bottom', x: pos.x, y: pos.y });
                          } else {
                            toggleWallWithAdjacent(room, 'bottom');
                          }
                        }}
                        onMouseEnter={(e) => e.target.getStage()!.container().style.cursor = 'pointer'}
                        onMouseLeave={(e) => e.target.getStage()!.container().style.cursor = 'default'}
                      />
                      {/* Left Wall */}
                      {room.type === 'balcony' && !room.openWalls?.includes('left') && (() => {
                        const balusterCount = Math.max(2, Math.floor(rh / (scale * 1.5)));
                        const spacing = rh / (balusterCount + 1);
                        return (
                          <Group>
                            {Array.from({ length: balusterCount }).map((_, i) => (
                              <Line key={`bl-${i}`} points={[-1, (i + 1) * spacing, 3, (i + 1) * spacing]} stroke={isSelected ? '#2563eb' : '#5a5a5a'} strokeWidth={1.5} />
                            ))}
                          </Group>
                        );
                      })()}
                      <Line 
                        points={[0, 0, 0, rh]} 
                        stroke={room.openWalls?.includes('left') ? 'transparent' : (isSelected ? '#2563eb' : (room.type === 'balcony' ? '#6b6b6b' : '#2c2c2c'))} 
                        strokeWidth={isSelected ? 4 : (isWallMode ? 6 : (room.type === 'balcony' ? 2 : 3))} 
                        dash={room.type === 'balcony' && !room.openWalls?.includes('left') ? [6, 4] : undefined}
                        hitStrokeWidth={25}
                        onClick={(e) => {
                          e.cancelBubble = true;
                          if (isWallMode) {
                            const stage = e.target.getStage();
                            const pos = stage.getPointerPosition();
                            setWallPopup({ roomId: room.id, wall: 'left', x: pos.x, y: pos.y });
                          } else {
                            toggleWallWithAdjacent(room, 'left');
                          }
                        }}
                        onMouseEnter={(e) => e.target.getStage()!.container().style.cursor = 'pointer'}
                        onMouseLeave={(e) => e.target.getStage()!.container().style.cursor = 'default'}
                      />
                      {/* Right Wall */}
                      {room.type === 'balcony' && !room.openWalls?.includes('right') && (() => {
                        const balusterCount = Math.max(2, Math.floor(rh / (scale * 1.5)));
                        const spacing = rh / (balusterCount + 1);
                        return (
                          <Group>
                            {Array.from({ length: balusterCount }).map((_, i) => (
                              <Line key={`br-${i}`} points={[rw - 3, (i + 1) * spacing, rw + 1, (i + 1) * spacing]} stroke={isSelected ? '#2563eb' : '#5a5a5a'} strokeWidth={1.5} />
                            ))}
                          </Group>
                        );
                      })()}
                      <Line 
                        points={[rw, 0, rw, rh]} 
                        stroke={room.openWalls?.includes('right') ? 'transparent' : (isSelected ? '#2563eb' : (room.type === 'balcony' ? '#6b6b6b' : '#2c2c2c'))} 
                        strokeWidth={isSelected ? 4 : (isWallMode ? 6 : (room.type === 'balcony' ? 2 : 3))} 
                        dash={room.type === 'balcony' && !room.openWalls?.includes('right') ? [6, 4] : undefined}
                        hitStrokeWidth={25}
                        onClick={(e) => {
                          e.cancelBubble = true;
                          if (isWallMode) {
                            const stage = e.target.getStage();
                            const pos = stage.getPointerPosition();
                            setWallPopup({ roomId: room.id, wall: 'right', x: pos.x, y: pos.y });
                          } else {
                            toggleWallWithAdjacent(room, 'right');
                          }
                        }}
                        onMouseEnter={(e) => e.target.getStage()!.container().style.cursor = 'pointer'}
                        onMouseLeave={(e) => e.target.getStage()!.container().style.cursor = 'default'}
                      />
                    </>
                  )}

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
                  {room.type === 'balcony' && (
                    <Group opacity={0.3}>
                      {Array.from({ length: Math.ceil((rw + rh) / (scale)) }).map((_, i) => (
                        <Line key={`balhatch-${i}`}
                          points={[Math.min(i * scale, rw), Math.max(0, i * scale - rw), Math.max(0, i * scale - rh), Math.min(i * scale, rh)]}
                          stroke="hsl(0, 0%, 50%)" strokeWidth={0.5} />
                      ))}
                    </Group>
                  )}
                  {room.type === 'carport' && (
                    <Group opacity={0.15}>
                      {Array.from({ length: Math.ceil((rw + rh) / scale) }).map((_, i) => (
                        <Line key={`cp-${i}`}
                          points={[Math.min(i * scale, rw), Math.max(0, i * scale - rw), Math.max(0, i * scale - rh), Math.min(i * scale, rh)]}
                          stroke="hsl(0, 0%, 40%)" strokeWidth={0.8} />
                      ))}
                    </Group>
                  )}

                  {/* Staircase L-Shape Visualization */}
                  {(room.type === 'staircase' || (room.type === 'hallway' && (room.label || '').toLowerCase().includes('staircase'))) && (() => {
                    const orient = room.orientation || 0;
                    const landingSize = Math.min(rw, rh) * 0.45;
                    const firstFlightSteps = 9;
                    const secondFlightSteps = 9;
                    const isMirrored = room.isMirrored || false;
                    
                    return (
                      <Group opacity={0.35}>
                        {/* Landing */}
                        {(() => {
                          let lx = 0, ly = 0;
                          if (!isMirrored) {
                            if (orient === 0) { lx = 0; ly = 0; }
                            else if (orient === 1) { lx = rw - landingSize; ly = 0; }
                            else if (orient === 2) { lx = rw - landingSize; ly = rh - landingSize; }
                            else if (orient === 3) { lx = 0; ly = rh - landingSize; }
                          } else {
                            if (orient === 0) { lx = rw - landingSize; ly = 0; }
                            else if (orient === 1) { lx = rw - landingSize; ly = rh - landingSize; }
                            else if (orient === 2) { lx = 0; ly = rh - landingSize; }
                            else if (orient === 3) { lx = 0; ly = 0; }
                          }
                          return <Rect x={lx} y={ly} width={landingSize} height={landingSize} stroke="#444" strokeWidth={1} />;
                        })()}

                        {/* Flights */}
                        {(() => {
                          const items = [];
                          if (orient === 0) {
                            if (!isMirrored) {
                              const f1H = rh - landingSize;
                              const f1StepH = f1H / firstFlightSteps;
                              for (let i = 1; i < firstFlightSteps; i++) {
                                items.push(<Line key={`f1-${i}`} points={[0, rh - i * f1StepH, landingSize, rh - i * f1StepH]} stroke="#444" strokeWidth={1.5} />);
                              }
                              const f2W = rw - landingSize;
                              const f2StepW = f2W / secondFlightSteps;
                              for (let i = 1; i < secondFlightSteps; i++) {
                                items.push(<Line key={`f2-${i}`} points={[landingSize + i * f2StepW, 0, landingSize + i * f2StepW, landingSize]} stroke="#444" strokeWidth={1.5} />);
                              }
                            } else {
                              const f1H = rh - landingSize;
                              const f1StepH = f1H / firstFlightSteps;
                              for (let i = 1; i < firstFlightSteps; i++) {
                                items.push(<Line key={`f1-${i}`} points={[rw - landingSize, rh - i * f1StepH, rw, rh - i * f1StepH]} stroke="#444" strokeWidth={1.5} />);
                              }
                              const f2W = rw - landingSize;
                              const f2StepW = f2W / secondFlightSteps;
                              for (let i = 1; i < secondFlightSteps; i++) {
                                items.push(<Line key={`f2-${i}`} points={[rw - landingSize - i * f2StepW, 0, rw - landingSize - i * f2StepW, landingSize]} stroke="#444" strokeWidth={1.5} />);
                              }
                            }
                          } else if (orient === 1) {
                            if (!isMirrored) {
                              const f1W = rw - landingSize;
                              const f1StepW = f1W / firstFlightSteps;
                              for (let i = 1; i < firstFlightSteps; i++) {
                                items.push(<Line key={`f1-${i}`} points={[i * f1StepW, 0, i * f1StepW, landingSize]} stroke="#444" strokeWidth={1.5} />);
                              }
                              const f2H = rh - landingSize;
                              const f2StepH = f2H / secondFlightSteps;
                              for (let i = 1; i < secondFlightSteps; i++) {
                                items.push(<Line key={`f2-${i}`} points={[rw - landingSize, landingSize + i * f2StepH, rw, landingSize + i * f2StepH]} stroke="#444" strokeWidth={1.5} />);
                              }
                            } else {
                              const f1W = rw - landingSize;
                              const f1StepW = f1W / firstFlightSteps;
                              for (let i = 1; i < firstFlightSteps; i++) {
                                items.push(<Line key={`f1-${i}`} points={[i * f1StepW, rh - landingSize, i * f1StepW, rh]} stroke="#444" strokeWidth={1.5} />);
                              }
                              const f2H = rh - landingSize;
                              const f2StepH = f2H / secondFlightSteps;
                              for (let i = 1; i < secondFlightSteps; i++) {
                                items.push(<Line key={`f2-${i}`} points={[rw - landingSize, rh - landingSize - i * f2StepH, rw, rh - landingSize - i * f2StepH]} stroke="#444" strokeWidth={1.5} />);
                              }
                            }
                          } else if (orient === 2) {
                            if (!isMirrored) {
                              const f1H = rh - landingSize;
                              const f1StepH = f1H / firstFlightSteps;
                              for (let i = 1; i < firstFlightSteps; i++) {
                                items.push(<Line key={`f1-${i}`} points={[rw - landingSize, i * f1StepH, rw, i * f1StepH]} stroke="#444" strokeWidth={1.5} />);
                              }
                              const f2W = rw - landingSize;
                              const f2StepW = f2W / secondFlightSteps;
                              for (let i = 1; i < secondFlightSteps; i++) {
                                items.push(<Line key={`f2-${i}`} points={[rw - landingSize - i * f2StepW, rh - landingSize, rw - landingSize - i * f2StepW, rh]} stroke="#444" strokeWidth={1.5} />);
                              }
                            } else {
                              const f1H = rh - landingSize;
                              const f1StepH = f1H / firstFlightSteps;
                              for (let i = 1; i < firstFlightSteps; i++) {
                                items.push(<Line key={`f1-${i}`} points={[0, i * f1StepH, landingSize, i * f1StepH]} stroke="#444" strokeWidth={1.5} />);
                              }
                              const f2W = rw - landingSize;
                              const f2StepW = f2W / secondFlightSteps;
                              for (let i = 1; i < secondFlightSteps; i++) {
                                items.push(<Line key={`f2-${i}`} points={[landingSize + i * f2StepW, rh - landingSize, landingSize + i * f2StepW, rh]} stroke="#444" strokeWidth={1.5} />);
                              }
                            }
                          } else if (orient === 3) {
                            if (!isMirrored) {
                              const f1W = rw - landingSize;
                              const f1StepW = f1W / firstFlightSteps;
                              for (let i = 1; i < firstFlightSteps; i++) {
                                items.push(<Line key={`f1-${i}`} points={[rw - i * f1StepW, rh - landingSize, rw - i * f1StepW, rh]} stroke="#444" strokeWidth={1.5} />);
                              }
                              const f2H = rh - landingSize;
                              const f2StepH = f2H / secondFlightSteps;
                              for (let i = 1; i < secondFlightSteps; i++) {
                                items.push(<Line key={`f2-${i}`} points={[0, rh - landingSize - i * f2StepH, landingSize, rh - landingSize - i * f2StepH]} stroke="#444" strokeWidth={1.5} />);
                              }
                            } else {
                              const f1W = rw - landingSize;
                              const f1StepW = f1W / firstFlightSteps;
                              for (let i = 1; i < firstFlightSteps; i++) {
                                items.push(<Line key={`f1-${i}`} points={[rw - i * f1StepW, 0, rw - i * f1StepW, landingSize]} stroke="#444" strokeWidth={1.5} />);
                              }
                              const f2H = rh - landingSize;
                              const f2StepH = f2H / secondFlightSteps;
                              for (let i = 1; i < secondFlightSteps; i++) {
                                items.push(<Line key={`f2-${i}`} points={[0, landingSize + i * f2StepH, landingSize, landingSize + i * f2StepH]} stroke="#444" strokeWidth={1.5} />);
                              }
                            }
                          }
                          return items;
                        })()}
                        
                        {/* Directional Path Arrow */}
                        {(() => {
                          const arrowHeadSize = 5;
                          let pathPoints = [];
                          let arrowPoints = [];
                          const mid = landingSize / 2;
                          if (orient === 0) {
                            if (!isMirrored) {
                              pathPoints = [mid, rh - 2, mid, mid, rw - 2, mid];
                              arrowPoints = [rw - 2 - arrowHeadSize, mid - arrowHeadSize/2, rw - 2, mid, rw - 2 - arrowHeadSize, mid + arrowHeadSize/2];
                            } else {
                              pathPoints = [rw - mid, rh - 2, rw - mid, mid, 2, mid];
                              arrowPoints = [2 + arrowHeadSize, mid - arrowHeadSize/2, 2, mid, 2 + arrowHeadSize, mid + arrowHeadSize/2];
                            }
                          } else if (orient === 1) {
                            if (!isMirrored) {
                              pathPoints = [2, mid, rw - mid, mid, rw - mid, rh - 2];
                              arrowPoints = [rw - mid - arrowHeadSize/2, rh - 2 - arrowHeadSize, rw - mid, rh - 2, rw - mid + arrowHeadSize/2, rh - 2 - arrowHeadSize];
                            } else {
                              pathPoints = [2, rh - mid, rw - mid, rh - mid, rw - mid, 2];
                              arrowPoints = [rw - mid - arrowHeadSize/2, 2 + arrowHeadSize, rw - mid, 2, rw - mid + arrowHeadSize/2, 2 + arrowHeadSize];
                            }
                          } else if (orient === 2) {
                            if (!isMirrored) {
                              pathPoints = [rw - mid, 2, rw - mid, rh - mid, 2, rh - mid];
                              arrowPoints = [2 + arrowHeadSize, rh - mid - arrowHeadSize/2, 2, rh - mid, 2 + arrowHeadSize, rh - mid + arrowHeadSize/2];
                            } else {
                              pathPoints = [mid, 2, mid, rh - mid, rw - 2, rh - mid];
                              arrowPoints = [rw - 2 - arrowHeadSize, rh - mid - arrowHeadSize/2, rw - 2, rh - mid, rw - 2 - arrowHeadSize, rh - mid + arrowHeadSize/2];
                            }
                          } else if (orient === 3) {
                            if (!isMirrored) {
                              pathPoints = [rw - 2, rh - mid, mid, rh - mid, mid, 2];
                              arrowPoints = [mid - arrowHeadSize/2, 2 + arrowHeadSize, mid, 2, mid + arrowHeadSize/2, 2 + arrowHeadSize];
                            } else {
                              pathPoints = [rw - 2, mid, mid, mid, mid, rh - 2];
                              arrowPoints = [mid - arrowHeadSize/2, rh - 2 - arrowHeadSize, mid, rh - 2, mid + arrowHeadSize/2, rh - 2 - arrowHeadSize];
                            }
                          }
                          return (
                            <Group opacity={0.6}>
                              <Circle x={pathPoints[0]} y={pathPoints[1]} radius={2} fill="#333" />
                              <Line points={pathPoints} stroke="#333" strokeWidth={1} tension={0.2} />
                              <Line points={arrowPoints} stroke="#333" strokeWidth={1} />
                            </Group>
                          );
                        })()}
                      </Group>
                    );
                  })()}
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

                  {/* Staircase Mirror Toggle Button */}
                  {(room.type === 'staircase' || (room.label || '').toLowerCase().includes('staircase')) && isSelected && (
                    <Group
                      x={rw / 2 - 12}
                      y={rh / 2 - 12}
                      onClick={(e: any) => {
                        e.cancelBubble = true;
                        mirrorRoom(room.id);
                      }}
                      onMouseEnter={(e: any) => e.target.getStage()!.container().style.cursor = 'pointer'}
                      onMouseLeave={(e: any) => e.target.getStage()!.container().style.cursor = 'default'}
                    >
                      <Circle x={12} y={12} radius={14} fill="rgba(255,255,255,0.95)" shadowBlur={6} shadowOpacity={0.2} />
                      <Text x={6} y={6} text="⟲" fontSize={16} fill="#2563eb" fontStyle="bold" />
                    </Group>
                  )}

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

      {wallPopup && (
        <div 
          className="absolute z-50 flex flex-col gap-1 rounded-xl bg-white p-1 shadow-2xl border border-border animate-in zoom-in-95 duration-200"
          style={{ left: wallPopup.x, top: wallPopup.y - 40, transform: 'translateX(-50%)' }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              const sourceRoom = plan.rooms.find(r => r.id === wallPopup.roomId);
              if (!sourceRoom) return;

              const updated = {
                ...plan,
                rooms: plan.rooms.map(r => {
                  const wall = wallPopup.wall;
                  let isAdjacent = (r.id === wallPopup.roomId);
                  let targetWall = wall;
                  
                  if (r.id !== wallPopup.roomId) {
                    if (wall === 'top' && Math.abs((r.y + r.h) - sourceRoom.y) < 0.5) {
                      if (Math.max(r.x, sourceRoom.x) < Math.min(r.x + r.w, sourceRoom.x + sourceRoom.w) - 0.1) {
                        isAdjacent = true; targetWall = 'bottom';
                      }
                    } else if (wall === 'bottom' && Math.abs(r.y - (sourceRoom.y + sourceRoom.h)) < 0.5) {
                      if (Math.max(r.x, sourceRoom.x) < Math.min(r.x + r.w, sourceRoom.x + sourceRoom.w) - 0.1) {
                        isAdjacent = true; targetWall = 'top';
                      }
                    } else if (wall === 'left' && Math.abs((r.x + r.w) - sourceRoom.x) < 0.5) {
                      if (Math.max(r.y, sourceRoom.y) < Math.min(r.y + r.h, sourceRoom.y + sourceRoom.h) - 0.1) {
                        isAdjacent = true; targetWall = 'right';
                      }
                    } else if (wall === 'right' && Math.abs(r.x - (sourceRoom.x + sourceRoom.w)) < 0.5) {
                      if (Math.max(r.y, sourceRoom.y) < Math.min(r.y + r.h, sourceRoom.y + sourceRoom.h) - 0.1) {
                        isAdjacent = true; targetWall = 'left';
                      }
                    }
                  }

                  if (isAdjacent) {
                    return { ...r, openWalls: (r.openWalls || []).filter(w => w !== targetWall) };
                  }
                  return r;
                })
              };
              setPlan(updated);
              onChange?.(updated);
              setWallPopup(null);
            }}
            className="flex h-8 items-center gap-2 rounded-lg px-3 text-[10px] font-bold uppercase text-emerald-700 hover:bg-emerald-50 transition-colors"
          >
            <Plus size={12} /> {(() => { const r = plan.rooms.find(r => r.id === wallPopup.roomId); return r?.type === 'balcony' ? 'Add Handrail' : 'Add Wall'; })()}
          </button>
          <div className="h-px w-full bg-border" />
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              const sourceRoom = plan.rooms.find(r => r.id === wallPopup.roomId);
              if (!sourceRoom) return;

              const updated = {
                ...plan,
                rooms: plan.rooms.map(r => {
                  const wall = wallPopup.wall;
                  let isAdjacent = (r.id === wallPopup.roomId);
                  let targetWall = wall;
                  
                  if (r.id !== wallPopup.roomId) {
                    if (wall === 'top' && Math.abs((r.y + r.h) - sourceRoom.y) < 0.5) {
                      if (Math.max(r.x, sourceRoom.x) < Math.min(r.x + r.w, sourceRoom.x + sourceRoom.w) - 0.1) {
                        isAdjacent = true; targetWall = 'bottom';
                      }
                    } else if (wall === 'bottom' && Math.abs(r.y - (sourceRoom.y + sourceRoom.h)) < 0.5) {
                      if (Math.max(r.x, sourceRoom.x) < Math.min(r.x + r.w, sourceRoom.x + sourceRoom.w) - 0.1) {
                        isAdjacent = true; targetWall = 'top';
                      }
                    } else if (wall === 'left' && Math.abs((r.x + r.w) - sourceRoom.x) < 0.5) {
                      if (Math.max(r.y, sourceRoom.y) < Math.min(r.y + r.h, sourceRoom.y + sourceRoom.h) - 0.1) {
                        isAdjacent = true; targetWall = 'right';
                      }
                    } else if (wall === 'right' && Math.abs(r.x - (sourceRoom.x + sourceRoom.w)) < 0.5) {
                      if (Math.max(r.y, sourceRoom.y) < Math.min(r.y + r.h, sourceRoom.y + sourceRoom.h) - 0.1) {
                        isAdjacent = true; targetWall = 'left';
                      }
                    }
                  }

                  if (isAdjacent) {
                    const openWalls = r.openWalls || [];
                    if (!openWalls.includes(targetWall as any)) {
                      return { ...r, openWalls: [...openWalls, targetWall as any] };
                    }
                  }
                  return r;
                })
              };
              setPlan(updated);
              onChange?.(updated);
              setWallPopup(null);
            }}
            className="flex h-8 items-center gap-2 rounded-lg px-3 text-[10px] font-bold uppercase text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 size={12} /> {(() => { const r = plan.rooms.find(r => r.id === wallPopup.roomId); return r?.type === 'balcony' ? 'Remove Handrail' : 'Remove Wall'; })()}
          </button>
        </div>
      )}
    </div>
  );
};
