import { useEffect, useRef, useState, useCallback } from 'react';
import { Stage, Layer, Rect, Text, Line, Group, Arc, Circle, Transformer } from 'react-konva';
import { Plan, Room, FurnitureItem, DoorInfo, WindowInfo, regenerateFurniture } from '@/lib/floorplan';
import { useConfig } from '@/store/configurator';
import { RotateCw, Plus, Trash2 } from 'lucide-react';
import Konva from 'konva';

interface Props {
  plan: Plan;
  advanced?: boolean;
  onChange?: (plan: Plan) => void;
}

export const FloorPlanCanvas = ({ plan, advanced = false, onChange }: Props) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const config = useConfig();
  const [size, setSize] = useState({ w: 600, h: 400 });
  const [localPlan, setLocalPlan] = useState(plan);
  const [stageScale, setStageScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });

  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedDoor, setSelectedDoor] = useState<{ roomId: string, doorIndex: number } | null>(null);
  const [isAddingDoor, setIsAddingDoor] = useState(false);
  const transformerRef = useRef<Konva.Transformer>(null);
  const roomRefs = useRef<{ [key: string]: Konva.Group }>({});

  useEffect(() => setLocalPlan(plan), [plan]);

  useEffect(() => {
    if (advanced && selectedRoomId && transformerRef.current && roomRefs.current[selectedRoomId]) {
      transformerRef.current.nodes([roomRefs.current[selectedRoomId]]);
      transformerRef.current.getLayer()?.batchDraw();
    } else if (transformerRef.current) {
      transformerRef.current.nodes([]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [selectedRoomId, localPlan, advanced]);

  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setSize({ w: r.width, h: r.height });
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  const pad = 60;
  const scaleX = (size.w - pad * 2) / localPlan.width;
  const scaleY = (size.h - pad * 2) / localPlan.height;
  const scale = Math.max(4, Math.min(scaleX, scaleY));
  const offsetX = (size.w - localPlan.width * scale) / 2;
  const offsetY = (size.h - localPlan.height * scale) / 2;

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

  const handleDragEnd = (id: string, e: Konva.KonvaEventObject<DragEvent>) => {
    const newX = Math.round((e.target.x() - offsetX) / scale);
    const newY = Math.round((e.target.y() - offsetY) / scale);
    const updated: Plan = {
      ...localPlan,
      rooms: localPlan.rooms.map((r) => (r.id === id ? { ...r, x: Math.max(0, newX), y: Math.max(0, newY) } : r)),
    };
    setLocalPlan(updated);
    onChange?.(updated);
  };

  const handleRotateRoom = (id: string) => {
    const updated: Plan = {
      ...localPlan,
      rooms: localPlan.rooms.map((r) => {
        if (r.id !== id) return r;
        const newOrient = ((r.orientation || 0) + 1) % 4;
        const newRoom = { ...r, orientation: newOrient };
        newRoom.furniture = regenerateFurniture(newRoom, config.kitchen);
        return newRoom;
      }),
    };
    setLocalPlan(updated);
    onChange?.(updated);
  };

  const handleAddDoor = (roomId: string) => {
    const updated: Plan = {
      ...localPlan,
      rooms: localPlan.rooms.map((r) => {
        if (r.id !== roomId) return r;
        const newDoor: DoorInfo = { wall: 'top', position: 0.5, width: 3, swing: 'in' };
        return { ...r, doors: [...r.doors, newDoor] };
      }),
    };
    setLocalPlan(updated);
    onChange?.(updated);
  };

  return (
    <div ref={wrapRef} className="relative h-full w-full overflow-hidden rounded-2xl bg-[#f8f9fa] shadow-inner">
      {advanced && selectedRoomId && (
        <div className="absolute left-1/2 top-4 z-10 flex -translate-x-1/2 items-center gap-2 rounded-2xl bg-white/90 p-1.5 shadow-xl backdrop-blur-md">
          <button
            onClick={() => handleRotateRoom(selectedRoomId)}
            className="flex h-10 items-center gap-2 rounded-xl px-4 text-xs font-bold uppercase tracking-wider text-ink hover:bg-surface transition-all active:scale-95"
            title="Rotate Room 90°"
          >
            <RotateCw size={14} className="text-clay" />
            Rotate
          </button>
          <div className="h-6 w-px bg-border" />
          <button
            onClick={() => handleAddDoor(selectedRoomId)}
            className="flex h-10 items-center gap-2 rounded-xl px-4 text-xs font-bold uppercase tracking-wider text-ink hover:bg-surface transition-all active:scale-95"
            title="Add Door to Room"
          >
            <Plus size={14} className="text-clay" />
            Add Door
          </button>
        </div>
      )}
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
            setSelectedDoor(null);
          }
        }}
        draggable
      >
        <Layer listening={false}>
          {Array.from({ length: localPlan.width + 1 }).map((_, i) => (
            <Line
              key={`v-${i}`}
              points={[offsetX + i * scale, offsetY, offsetX + i * scale, offsetY + localPlan.height * scale]}
              stroke={i % 5 === 0 ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.03)'}
              strokeWidth={i % 5 === 0 ? 1 : 0.5}
            />
          ))}
          {Array.from({ length: localPlan.height + 1 }).map((_, i) => (
            <Line
              key={`h-${i}`}
              points={[offsetX, offsetY + i * scale, offsetX + localPlan.width * scale, offsetY + i * scale]}
              stroke={i % 5 === 0 ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.03)'}
              strokeWidth={i % 5 === 0 ? 1 : 0.5}
            />
          ))}
        </Layer>

        <Layer>
          {localPlan.rooms.map((room) => (
            <RoomShape
              key={room.id}
              room={room}
              scale={scale}
              offsetX={offsetX}
              offsetY={offsetY}
              draggable={advanced}
              onPointerDown={() => {
                if (advanced) {
                  setSelectedRoomId(room.id);
                  setSelectedDoor(null);
                }
              }}
              innerRef={(node: any) => {
                if (node) roomRefs.current[room.id] = node;
              }}
              onDragEnd={(e: any) => handleDragEnd(room.id, e)}
              onTransformEnd={(e: any) => {
                const node = roomRefs.current[room.id];
                const scaleX = node.scaleX();
                const scaleY = node.scaleY();
                
                const newX = Math.max(0, Math.round((node.x() - offsetX) / scale));
                const newY = Math.max(0, Math.round((node.y() - offsetY) / scale));
                const newW = Math.max(2, Math.round(room.w * scaleX));
                const newH = Math.max(2, Math.round(room.h * scaleY));
                
                node.scaleX(1);
                node.scaleY(1);
                node.x(offsetX + newX * scale);
                node.y(offsetY + newY * scale);

                const newRoom = { ...room, x: newX, y: newY, w: newW, h: newH };
                newRoom.furniture = regenerateFurniture(newRoom, config.kitchen);
                
                const updatedPlan = {
                  ...localPlan,
                  rooms: localPlan.rooms.map(r => r.id === room.id ? newRoom : r)
                };
                setLocalPlan(updatedPlan);
                onChange?.(updatedPlan);
              }}
            />
          ))}
          {advanced && (
            <Transformer
              ref={transformerRef}
              rotateEnabled={false}
              boundBoxFunc={(oldBox, newBox) => {
                if (newBox.width < 20 || newBox.height < 20) return oldBox;
                return newBox;
              }}
            />
          )}
        </Layer>

        <Layer listening={false}>
          {localPlan.rooms.map((room) =>
            room.furniture.map((f, fi) => (
              <FurnitureShape
                key={`${room.id}-f-${fi}`}
                item={f}
                roomX={room.x}
                roomY={room.y}
                scale={scale}
                offsetX={offsetX}
                offsetY={offsetY}
              />
            ))
          )}
        </Layer>

        <Layer listening={true}>
          {localPlan.rooms.map((room) => (
            <Group key={`dw-${room.id}`}>
              {(room.doors || []).map((d, di) => (
                <DoorShape 
                  key={`d-${di}`} 
                  door={d} 
                  room={room} 
                  scale={scale} 
                  offsetX={offsetX} 
                  offsetY={offsetY} 
                  doorIndex={di}
                  selected={selectedDoor?.roomId === room.id && selectedDoor?.doorIndex === di}
                  onSelect={() => {
                    if (advanced) {
                      setSelectedDoor({ roomId: room.id, doorIndex: di });
                      setSelectedRoomId(null);
                    }
                  }}
                  onDragMove={(newWall: string, newPos: number) => {
                    const updatedRooms = localPlan.rooms.map(r => {
                      if (r.id === room.id) {
                        const newDoors = [...r.doors];
                        newDoors[di] = { ...newDoors[di], wall: newWall as any, position: newPos };
                        return { ...r, doors: newDoors };
                      }
                      return r;
                    });
                    const updatedPlan = { ...localPlan, rooms: updatedRooms };
                    setLocalPlan(updatedPlan);
                  }}
                  onDragEnd={() => {
                    onChange?.(localPlan);
                  }}
                  onDelete={() => {
                    if (advanced) {
                      const updatedRooms = localPlan.rooms.map(r => {
                        if (r.id === room.id) {
                          return { ...r, doors: r.doors.filter((_, idx) => idx !== di) };
                        }
                        return r;
                      });
                      const updatedPlan = { ...localPlan, rooms: updatedRooms };
                      setLocalPlan(updatedPlan);
                      onChange?.(updatedPlan);
                      setSelectedDoor(null);
                    }
                  }}
                />
              ))}
              {(room.windows || []).map((w, wi) => (
                <WindowShape key={`w-${wi}`} window={w} room={room} scale={scale} offsetX={offsetX} offsetY={offsetY} />
              ))}
            </Group>
          ))}
        </Layer>

        <Layer listening={false}>
          {localPlan.rooms.map(room => (
             <Text key={`label-${room.id}`}
                text={room.label} 
                fontFamily="Urbanist" fontStyle="800" 
                fontSize={Math.max(10, Math.min(14, room.w * scale * 0.08))}
                fill="rgba(0,0,0,0.75)" 
                align="center" verticalAlign="middle"
                x={offsetX + room.x * scale} 
                y={offsetY + room.y * scale + (room.h * scale)/2 - 10} 
                width={room.w * scale} 
                shadowColor="white" shadowBlur={6} shadowOpacity={1} shadowOffset={{x:0, y:0}}
                letterSpacing={1.2} />
          ))}
          {localPlan.rooms.map(room => (
             <Text key={`dim-${room.id}`}
                text={`${Math.round(room.w)}′ × ${Math.round(room.h)}′`} 
                fontFamily="Epilogue" fontStyle="600" 
                fontSize={9}
                fill="rgba(0,0,0,0.55)" 
                align="center" verticalAlign="middle"
                x={offsetX + room.x * scale} 
                y={offsetY + room.y * scale + (room.h * scale)/2 + 6} 
                width={room.w * scale} 
                shadowColor="white" shadowBlur={4} shadowOpacity={1} shadowOffset={{x:0, y:0}} />
          ))}
        </Layer>

        <Layer listening={false}>
          <Rect
            x={offsetX}
            y={offsetY}
            width={localPlan.width * scale}
            height={localPlan.height * scale}
            stroke="#1a1a1a"
            strokeWidth={5}
            cornerRadius={2}
          />
          <Text x={offsetX + localPlan.width * scale / 2 - 20} y={offsetY + localPlan.height * scale + 16}
            text={`${localPlan.width} ft`} fontFamily="Urbanist" fontSize={12} fill="#666" fontStyle="700" />
          <Text x={offsetX - 32} y={offsetY + localPlan.height * scale / 2}
            text={`${localPlan.height} ft`} fontFamily="Urbanist" fontSize={12} fill="#666" fontStyle="700" rotation={-90} />
        </Layer>
      </Stage>

      <div className="absolute bottom-3 right-3 flex flex-col gap-1.5">
        <button onClick={() => setStageScale(Math.min(6, stageScale * 1.25))}
          className="flex h-8 w-8 items-center justify-center rounded-lg glass-panel text-sm font-bold shadow-sm hover:bg-white/90 transition-colors">+</button>
        <button onClick={() => setStageScale(Math.max(0.5, stageScale / 1.25))}
          className="flex h-8 w-8 items-center justify-center rounded-lg glass-panel text-sm font-bold shadow-sm hover:bg-white/90 transition-colors">−</button>
        <button onClick={() => { setStageScale(1); setStagePos({ x: 0, y: 0 }); }}
          className="flex h-8 w-8 items-center justify-center rounded-lg glass-panel text-[9px] font-bold shadow-sm hover:bg-white/90 transition-colors">FIT</button>
      </div>

      <div className="absolute left-3 bottom-3 glass-panel rounded-lg px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest shadow-sm">
        Scroll to zoom · Drag to pan
      </div>
    </div>
  );
};

/* ─── Room Shape ─── */
const RoomShape = ({ room, scale, offsetX, offsetY, draggable, onDragEnd, onPointerDown, onTransformEnd, innerRef }: any) => {
  const rx = offsetX + room.x * scale;
  const ry = offsetY + room.y * scale;
  const rw = room.w * scale;
  const rh = room.h * scale;

  return (
    <Group 
      x={rx} y={ry} 
      draggable={draggable} 
      onDragEnd={onDragEnd}
      onPointerDown={onPointerDown}
      onTransformEnd={onTransformEnd}
      ref={innerRef}
    >
      <Rect width={rw} height={rh} fill={room.color} opacity={1} stroke="#2c2c2c" strokeWidth={3} />
      
      {/* Floor Textures */}
      {room.type === 'bathroom' && (
        <Group opacity={0.15}>
          {Array.from({ length: Math.ceil(rw / (1.5*scale)) }).map((_, i) => (
            <Line key={`v-${i}`} points={[i * 1.5 * scale, 0, i * 1.5 * scale, rh]} stroke="#000" strokeWidth={1} />
          ))}
          {Array.from({ length: Math.ceil(rh / (1.5*scale)) }).map((_, i) => (
            <Line key={`h-${i}`} points={[0, i * 1.5 * scale, rw, i * 1.5 * scale]} stroke="#000" strokeWidth={1} />
          ))}
        </Group>
      )}
      {(room.type === 'bedroom' || room.type === 'living') && (
        <Group opacity={0.06}>
          {Array.from({ length: Math.ceil(rw / (1.2*scale)) }).map((_, i) => (
            <Line key={`w-${i}`} points={[i * 1.2 * scale, 0, i * 1.2 * scale, rh]} stroke="#000" strokeWidth={1.5} />
          ))}
        </Group>
      )}
      {(room.type === 'balcony' || room.type === 'carport') && (
        <Group opacity={0.3}>
          {Array.from({ length: Math.ceil((rw + rh) / (scale)) }).map((_, i) => (
            <Line key={`hatch-${i}`}
              points={[Math.min(i * scale, rw), Math.max(0, i * scale - rw), Math.max(0, i * scale - rh), Math.min(i * scale, rh)]}
              stroke="hsl(0, 0%, 50%)" strokeWidth={0.5} />
          ))}
        </Group>
      )}
      {room.type === 'garden' && (
        <Group opacity={0.25}>
          {Array.from({ length: Math.ceil((rw + rh) / (scale)) }).map((_, i) => (
            <Line key={`ghatch-${i}`}
              points={[Math.min(i * scale, rw), Math.max(0, i * scale - rw), Math.max(0, i * scale - rh), Math.min(i * scale, rh)]}
              stroke="hsl(120, 35%, 45%)" strokeWidth={0.8} />
          ))}
        </Group>
      )}
    </Group>
  );
};

/* ─── Furniture ─── */
const FurnitureShape = ({ item, roomX, roomY, scale, offsetX, offsetY }: any) => {
  const x = offsetX + (roomX + item.x) * scale;
  const y = offsetY + (roomY + item.y) * scale;
  const w = item.w * scale;
  const h = item.h * scale;
  const colors = getFurnitureColors(item.type);
  const rot = item.rotation || 0;

  return (
    <Group x={x} y={y} rotation={rot} offsetX={rot !== 0 ? w / 2 : 0} offsetY={rot !== 0 ? h / 2 : 0}>
      {item.type === 'bed' && (
        <Group>
           <Rect width={w} height={h} fill={colors.fill} cornerRadius={4} shadowColor="black" shadowBlur={5} shadowOpacity={0.2} shadowOffsetY={2} />
           <Rect x={2} y={h*0.25} width={w-4} height={h*0.75-2} fill={colors.detail} cornerRadius={3} />
           <Rect x={w*0.1} y={h*0.06} width={w*0.35} height={h*0.15} fill="#fff" cornerRadius={3} shadowColor="black" shadowBlur={2} shadowOpacity={0.1} />
           <Rect x={w*0.55} y={h*0.06} width={w*0.35} height={h*0.15} fill="#fff" cornerRadius={3} shadowColor="black" shadowBlur={2} shadowOpacity={0.1} />
        </Group>
      )}
      {item.type === 'wardrobe' && (
        <Group>
           <Rect width={w} height={h} fill={colors.fill} stroke={colors.stroke} strokeWidth={1} cornerRadius={2} shadowColor="black" shadowBlur={3} shadowOpacity={0.15} shadowOffsetY={1} />
           <Line points={[w/2, 0, w/2, h]} stroke={colors.stroke} strokeWidth={1} />
           <Line points={[w/2-2, h/2-3, w/2-2, h/2+3]} stroke={colors.stroke} strokeWidth={1} />
           <Line points={[w/2+2, h/2-3, w/2+2, h/2+3]} stroke={colors.stroke} strokeWidth={1} />
        </Group>
      )}
      {item.type === 'shower' && (
        <Group>
           <Rect width={w} height={h} fill="#eaf2f8" stroke="#aec6cf" strokeWidth={1.5} cornerRadius={2} />
           <Circle x={w/2} y={h/2} radius={2} fill="#999" />
           <Circle x={w/2} y={6} radius={3} fill="#ccc" />
        </Group>
      )}
      {item.type === 'bathtub' && (
        <Group>
           <Rect width={w} height={h} fill="#fff" stroke="#ccc" strokeWidth={1} cornerRadius={6} shadowColor="black" shadowBlur={3} shadowOpacity={0.1} shadowOffsetY={1} />
           <Rect x={3} y={3} width={w-6} height={h-6} fill="#f4f7f9" cornerRadius={4} />
           <Circle x={w/2} y={h*0.15} radius={2} fill="#999" />
        </Group>
      )}
      {item.type === 'sofa' && (
        <Group>
           <Rect width={w} height={h} fill={colors.fill} cornerRadius={4} shadowColor="black" shadowBlur={5} shadowOpacity={0.2} shadowOffsetY={3} />
           <Rect x={3} y={h*0.3} width={w-6} height={h*0.65-3} fill={colors.detail} cornerRadius={3} />
           <Rect x={3} y={3} width={w-6} height={h*0.25} fill={colors.detail} cornerRadius={3} />
           <Rect x={0} y={0} width={Math.max(4, w*0.15)} height={h} fill={colors.stroke} cornerRadius={3} />
           <Rect x={w - Math.max(4, w*0.15)} y={0} width={Math.max(4, w*0.15)} height={h} fill={colors.stroke} cornerRadius={3} />
        </Group>
      )}
      {item.type === 'dining_table' && (
        <Group>
           <Rect x={w*0.2} y={-4} width={w*0.2} height={h+8} fill="#a89f91" cornerRadius={3} shadowColor="black" shadowBlur={2} shadowOpacity={0.1} />
           <Rect x={w*0.6} y={-4} width={w*0.2} height={h+8} fill="#a89f91" cornerRadius={3} shadowColor="black" shadowBlur={2} shadowOpacity={0.1} />
           <Rect width={w} height={h} fill={colors.fill} cornerRadius={w > h ? 10 : 4} shadowColor="black" shadowBlur={6} shadowOpacity={0.15} shadowOffsetY={3} />
        </Group>
      )}
      {item.type === 'tv' && (
        <Group>
           <Rect width={w} height={h} fill="#111" cornerRadius={1} shadowColor="black" shadowBlur={3} shadowOpacity={0.2} shadowOffsetY={1} />
           <Rect x={1} y={1} width={w-2} height={h-2} fill="#222" cornerRadius={0.5} />
        </Group>
      )}
      {item.type === 'coffee_table' && (
        <Group>
           <Rect width={w} height={h} fill={colors.fill} cornerRadius={3} shadowColor="black" shadowBlur={4} shadowOpacity={0.15} shadowOffsetY={2} />
           <Rect x={3} y={3} width={w-6} height={h-6} fill={colors.detail} cornerRadius={2} />
        </Group>
      )}
      {item.type === 'plant' && (
        <Group>
          <Circle x={w/2} y={h/2} radius={Math.min(w,h)*0.35} fill="#5e4b3c" shadowColor="black" shadowBlur={4} shadowOpacity={0.2} shadowOffsetY={2} />
          <Circle x={w/2} y={h/2} radius={Math.min(w,h)*0.45} fill="#4a7a4a" opacity={0.8} />
          <Circle x={w*0.3} y={h*0.3} radius={w*0.2} fill="#3d6b3d" />
          <Circle x={w*0.7} y={h*0.3} radius={w*0.2} fill="#3d6b3d" />
          <Circle x={w*0.3} y={h*0.7} radius={w*0.2} fill="#3d6b3d" />
          <Circle x={w*0.7} y={h*0.7} radius={w*0.2} fill="#3d6b3d" />
        </Group>
      )}
      {item.type === 'sink' && (
        <Group>
           <Rect width={w} height={h} fill={colors.fill} cornerRadius={3} shadowColor="black" shadowBlur={2} shadowOpacity={0.1} shadowOffsetY={1} />
           <Circle x={w / 2} y={h / 2} radius={Math.min(w, h) * 0.3} fill={colors.detail} opacity={0.8} />
           <Circle x={w / 2} y={h / 2} radius={Math.min(w, h) * 0.25} fill="#eaf2f8" />
        </Group>
      )}
      {item.type === 'toilet' && (
        <Group>
           <Rect x={w*0.2} y={0} width={w*0.6} height={h*0.4} fill={colors.fill} cornerRadius={3} shadowColor="black" shadowBlur={2} shadowOpacity={0.1} shadowOffsetY={1} />
           <Circle x={w / 2} y={h * 0.65} radius={Math.min(w, h) * 0.35} fill={colors.detail} shadowColor="black" shadowBlur={2} shadowOpacity={0.1} shadowOffsetY={1} />
           <Circle x={w / 2} y={h * 0.65} radius={Math.min(w, h) * 0.25} fill="#fff" />
        </Group>
      )}
      {item.type === 'stove' && (
        <Group>
           <Rect width={w} height={h} fill="#2c2c2c" cornerRadius={2} shadowColor="black" shadowBlur={3} shadowOpacity={0.15} shadowOffsetY={1} />
           <Circle x={w*0.3} y={h*0.3} radius={Math.min(w,h)*0.15} fill="#444" />
           <Circle x={w*0.7} y={h*0.3} radius={Math.min(w,h)*0.15} fill="#444" />
           <Circle x={w*0.3} y={h*0.7} radius={Math.min(w,h)*0.15} fill="#444" />
           <Circle x={w*0.7} y={h*0.7} radius={Math.min(w,h)*0.15} fill="#444" />
        </Group>
      )}
      {item.type === 'fridge' && (
        <Group>
           <Rect width={w} height={h} fill="#d1d5db" stroke="#9ca3af" strokeWidth={1} cornerRadius={2} shadowColor="black" shadowBlur={4} shadowOpacity={0.15} shadowOffsetY={2} />
           <Rect x={3} y={h*0.1} width={3} height={h*0.3} fill="#9ca3af" cornerRadius={1} />
        </Group>
      )}
      {['counter', 'island', 'desk', 'nightstand', 'bookshelf', 'washing_machine'].includes(item.type) && (
        <Group>
           <Rect width={w} height={h} fill={colors.fill} stroke={colors.stroke} strokeWidth={1} cornerRadius={2} shadowColor="black" shadowBlur={3} shadowOpacity={0.15} shadowOffsetY={1} />
        </Group>
      )}
    </Group>
  );
};

function getFurnitureColors(type: FurnitureItem['type']) {
  const map: Record<string, { fill: string; stroke: string; detail: string }> = {
    bed: { fill: '#e6d8c3', stroke: '#c4b5a1', detail: '#f7f2eb' },
    wardrobe: { fill: '#bda78f', stroke: '#a38d75', detail: '#c9b59e' },
    desk: { fill: '#d4c4b4', stroke: '#baa793', detail: '#e0d2c3' },
    nightstand: { fill: '#d4c4b4', stroke: '#baa793', detail: '#e0d2c3' },
    toilet: { fill: '#f8fafc', stroke: '#cbd5e1', detail: '#e2e8f0' },
    sink: { fill: '#f8fafc', stroke: '#cbd5e1', detail: '#e2e8f0' },
    shower: { fill: '#f0f9ff', stroke: '#bae6fd', detail: '#e0f2fe' },
    bathtub: { fill: '#f8fafc', stroke: '#cbd5e1', detail: '#e2e8f0' },
    stove: { fill: '#334155', stroke: '#1e293b', detail: '#475569' },
    fridge: { fill: '#e2e8f0', stroke: '#94a3b8', detail: '#cbd5e1' },
    counter: { fill: '#e7e5e4', stroke: '#d6d3d1', detail: '#f5f5f4' },
    island: { fill: '#e7e5e4', stroke: '#d6d3d1', detail: '#f5f5f4' },
    dining_table: { fill: '#c2a382', stroke: '#a38565', detail: '#d1b596' },
    sofa: { fill: '#94a3b8', stroke: '#64748b', detail: '#cbd5e1' },
    tv: { fill: '#1e293b', stroke: '#0f172a', detail: '#334155' },
    coffee_table: { fill: '#d4c4b4', stroke: '#baa793', detail: '#e0d2c3' },
    plant: { fill: '#4ade80', stroke: '#16a34a', detail: '#86efac' },
    rug: { fill: '#f1f5f9', stroke: '#cbd5e1', detail: '#f8fafc' },
    bookshelf: { fill: '#bda78f', stroke: '#a38d75', detail: '#c9b59e' },
    washing_machine: { fill: '#f8fafc', stroke: '#cbd5e1', detail: '#e2e8f0' },
  };
  return map[type] || { fill: '#e2e8f0', stroke: '#94a3b8', detail: '#cbd5e1' };
}

/* ─── Door ─── */
const DoorShape = ({ door, room, scale, offsetX, offsetY, doorIndex, selected, onSelect, onDelete, onDragMove, onDragEnd }: any) => {
  const rx = offsetX + room.x * scale;
  const ry = offsetY + room.y * scale;
  const rw = room.w * scale;
  const rh = room.h * scale;
  const dw = door.width * scale;
  const isOpen = door.doorType === 'open';
  
  let cx = 0, cy = 0, rot = 0;
  const isOut = door.swing === 'out';
  
  switch (door.wall) {
    case 'top': cx = rx + rw * door.position; cy = ry; rot = isOut ? 180 : 0; break;
    case 'bottom': cx = rx + rw * door.position; cy = ry + rh; rot = isOut ? 0 : 180; break;
    case 'left': cx = rx; cy = ry + rh * door.position; rot = isOut ? 90 : 270; break;
    case 'right': cx = rx + rw; cy = ry + rh * door.position; rot = isOut ? 270 : 90; break;
  }

  const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;

    // Convert mouse to local room coords
    const mx = (pos.x - stage.x()) / stage.scaleX() - rx;
    const my = (pos.y - stage.y()) / stage.scaleY() - ry;

    // Find closest wall
    const dists = [
      { wall: 'top', d: Math.abs(my), p: mx / rw },
      { wall: 'bottom', d: Math.abs(my - rh), p: mx / rw },
      { wall: 'left', d: Math.abs(mx), p: my / rh },
      { wall: 'right', d: Math.abs(mx - rw), p: my / rh },
    ];
    const closest = dists.reduce((prev, curr) => (prev.d < curr.d ? prev : curr));
    const clampedPos = Math.max(0.1, Math.min(0.9, closest.p));

    onDragMove(closest.wall, clampedPos);
  };

  return (
    <Group x={cx} y={cy} rotation={rot} onPointerDown={onSelect}
      draggable={selected}
      onDragMove={handleDragMove}
      onDragEnd={onDragEnd}
      onMouseEnter={(e) => {
        const container = e.target.getStage()?.container();
        if (container) container.style.cursor = 'pointer';
      }}
      onMouseLeave={(e) => {
        const container = e.target.getStage()?.container();
        if (container) container.style.cursor = 'default';
      }}
    >
      {/* Gap in the wall */}
      <Rect x={-dw / 2 - 1} y={-2} width={dw + 2} height={4} fill="#f8f9fa" />
      
      {isOpen ? (
        <>
          {/* Open door: just show dashed opening indicator (no swing, no panel) */}
          <Line points={[-dw / 2, -2, -dw / 2, 2]} stroke={selected ? "#ef4444" : "#888"} strokeWidth={2} dash={[3, 3]} />
          <Line points={[dw / 2, -2, dw / 2, 2]} stroke={selected ? "#ef4444" : "#888"} strokeWidth={2} dash={[3, 3]} />
        </>
      ) : (
        <>
          {/* Swing arc */}
          <Arc x={-dw / 2} y={0} innerRadius={0} outerRadius={dw} angle={90} rotation={0} 
            fill={selected ? "rgba(239, 68, 68, 0.15)" : "rgba(0,0,0,0.05)"} stroke={selected ? "#ef4444" : "rgba(0,0,0,0.3)"} strokeWidth={1.5} dash={[4, 4]} />
          
          {/* Door panel (open at 90 degrees) */}
          <Line points={[-dw / 2, 0, -dw / 2, dw]} stroke={selected ? "#ef4444" : "#4a4a4a"} strokeWidth={3} lineCap="round" shadowColor="black" shadowBlur={4} shadowOpacity={0.2} shadowOffset={{x: 2, y: 2}} />
        </>
      )}

      {selected && (
        <Group x={0} y={isOpen ? 10 : dw / 2} rotation={-rot} 
          onPointerDown={(e) => {
            e.cancelBubble = true;
            onDelete();
          }}>
          <Circle radius={12} fill="#ef4444" stroke="white" strokeWidth={2} shadowColor="black" shadowBlur={4} shadowOpacity={0.3} />
          <Text text="×" x={-4} y={-6} fontSize={16} fill="white" fontStyle="bold" />
        </Group>
      )}
    </Group>
  );
};

/* ─── Window ─── */
const WindowShape = ({ window: win, room, scale, offsetX, offsetY }: any) => {
  const rx = offsetX + room.x * scale;
  const ry = offsetY + room.y * scale;
  const rw = room.w * scale;
  const rh = room.h * scale;
  const ww = win.width * scale;

  let x1=0, y1=0, x2=0, y2=0;
  switch (win.wall) {
    case 'top': x1 = rx + rw * win.position - ww / 2; y1 = ry; x2 = x1 + ww; y2 = ry; break;
    case 'bottom': x1 = rx + rw * win.position - ww / 2; y1 = ry + rh; x2 = x1 + ww; y2 = y1; break;
    case 'left': x1 = rx; y1 = ry + rh * win.position - ww / 2; x2 = rx; y2 = y1 + ww; break;
    case 'right': x1 = rx + rw; y1 = ry + rh * win.position - ww / 2; x2 = x1; y2 = y1 + ww; break;
  }

  const isHoriz = win.wall === 'top' || win.wall === 'bottom';
  return (
    <Group>
      {/* Break the wall behind the window */}
      <Line points={[x1, y1, x2, y2]} stroke="#f8f9fa" strokeWidth={4} />
      
      {/* Window glass and frame */}
      <Line points={[x1, y1, x2, y2]} stroke="#94a3b8" strokeWidth={4} />
      <Line points={[x1, y1, x2, y2]} stroke="#e0f2fe" strokeWidth={2} />
      
      {/* Center partition */}
      {isHoriz ? (
        <Line points={[(x1 + x2) / 2, y1 - 2, (x1 + x2) / 2, y1 + 2]} stroke="#64748b" strokeWidth={1.5} />
      ) : (
        <Line points={[x1 - 2, (y1 + y2) / 2, x1 + 2, (y1 + y2) / 2]} stroke="#64748b" strokeWidth={1.5} />
      )}
    </Group>
  );
};
