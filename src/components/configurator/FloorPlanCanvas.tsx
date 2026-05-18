import { useEffect, useRef, useState, useCallback } from 'react';
import { Stage, Layer, Rect, Text, Line, Group, Arc, Circle, Transformer } from 'react-konva';
import { Plan, Room, FurnitureItem, DoorInfo, WindowInfo, regenerateFurniture, resolveStairGeometry } from '@/lib/floorplan';
import { useConfig } from '@/store/configurator';
import { RotateCw, Plus, Trash2, Maximize } from 'lucide-react';
import Konva from 'konva';

interface Props {
  plan: Plan;
  advanced?: boolean;
  minimal?: boolean;
  hideZoomHelper?: boolean;
  floorLevel?: number; // 0 = ground, 1 = first floor, undefined = single storey
  onChange?: (plan: Plan) => void;
}

export const FloorPlanCanvas = ({ plan, advanced = false, minimal = false, hideZoomHelper = false, floorLevel, onChange }: Props) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const config = useConfig();
  const [size, setSize] = useState({ w: 600, h: 400 });
  const [localPlan, setLocalPlan] = useState(plan || { width: 0, height: 0, rooms: [] });
  const [stageScale, setStageScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });

  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedFurniture, setSelectedFurniture] = useState<{ roomId: string, furnitureIndex: number } | null>(null);
  const [selectedDoor, setSelectedDoor] = useState<{ roomId: string, doorIndex: number } | null>(null);
  const [selectedWindow, setSelectedWindow] = useState<{ roomId: string, windowIndex: number } | null>(null);
  const [isAddingDoor, setIsAddingDoor] = useState(false);
  const [isWallMode, setIsWallMode] = useState(false);
  const [wallPopup, setWallPopup] = useState<{ roomId: string, wall: string, x: number, y: number } | null>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const roomRefs = useRef<{ [key: string]: Konva.Group }>({});
  const furnitureRefs = useRef<{ [key: string]: Konva.Group }>({});
  const localPlanRef = useRef(localPlan);
  const selectedFurnitureKey = selectedFurniture ? `${selectedFurniture.roomId}-f-${selectedFurniture.furnitureIndex}` : null;

  useEffect(() => {
    setLocalPlan(plan);
    localPlanRef.current = plan;
  }, [plan]);

  const commitLocalPlan = (updated: Plan, notify = true) => {
    localPlanRef.current = updated;
    setLocalPlan(updated);
    if (notify) onChange?.(updated);
  };

  useEffect(() => {
    if (advanced && selectedFurnitureKey && selectedFurniture && transformerRef.current && furnitureRefs.current[selectedFurnitureKey]) {
      transformerRef.current.nodes([furnitureRefs.current[selectedFurnitureKey]]);
      transformerRef.current.getLayer()?.batchDraw();
    } else if (advanced && selectedRoomId && transformerRef.current && roomRefs.current[selectedRoomId]) {
      transformerRef.current.nodes([roomRefs.current[selectedRoomId]]);
      transformerRef.current.getLayer()?.batchDraw();
    } else if (transformerRef.current) {
      transformerRef.current.nodes([]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [selectedFurnitureKey, selectedFurniture, selectedRoomId, localPlan, advanced]);

  useEffect(() => {
    if (!selectedFurniture) return;
    const room = (localPlan.rooms || []).find((r) => r.id === selectedFurniture.roomId);
    if (!room?.furniture?.[selectedFurniture.furnitureIndex]) {
      setSelectedFurniture(null);
    }
  }, [selectedFurniture, localPlan]);

  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setSize({ w: r.width, h: r.height });
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  const PLOT_PADDING_FT = 2;
  const pad = 60;
  const localW = Math.max(1, localPlan.width || 0);
  const localH = Math.max(1, localPlan.height || 0);
  const plotW = localW + PLOT_PADDING_FT * 2;
  const plotH = localH + PLOT_PADDING_FT * 2;
  const scaleX = (size.w - pad * 2) / plotW;
  const scaleY = (size.h - pad * 2) / plotH;
  const scale = Math.max(4, Math.min(scaleX, scaleY));
  const plotOffsetX = (size.w - plotW * scale) / 2;
  const plotOffsetY = (size.h - plotH * scale) / 2;
  const buildingOffsetX = plotOffsetX + PLOT_PADDING_FT * scale;
  const buildingOffsetY = plotOffsetY + PLOT_PADDING_FT * scale;
  const entrancePos = Math.max(0.1, Math.min(0.9, localPlan.plotEntranceX ?? 0.5));
  const gateWidthFt = 3.5;
  const gateHalfPx = (gateWidthFt * scale) / 2;

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
    const newX = Math.round((e.target.x() - buildingOffsetX) / scale);
    const newY = Math.round((e.target.y() - buildingOffsetY) / scale);
    const room = localPlan.rooms?.find((r) => r.id === id);
    if (!room) return;
    const clampedX = Math.max(0, Math.min(localPlan.width - room.w, newX));
    const clampedY = Math.max(0, Math.min(localPlan.height - room.h, newY));
    const updated: Plan = {
      ...localPlan,
      rooms: (localPlan.rooms || []).map((r) => (r.id === id ? { ...r, x: clampedX, y: clampedY } : r)),
    };
    commitLocalPlan(updated);
  };

  const handleRotateRoom = (id: string) => {
    const updatedRooms = (localPlan.rooms || []).map(r => {
      if (r.id !== id) return r;
      const newOrient = ((r.orientation || 0) + 1) % 4;
      const newRoom = { ...r, orientation: newOrient };
      newRoom.furniture = regenerateFurniture(newRoom, config.kitchen);
      return newRoom;
    });
    commitLocalPlan({ ...localPlan, rooms: updatedRooms });
  };

  const handleMirrorRoom = (id: string) => {
    const updatedRooms = (localPlan.rooms || []).map(r => {
      if (r.id !== id) return r;
      return { ...r, isMirrored: !r.isMirrored };
    });
    commitLocalPlan({ ...localPlan, rooms: updatedRooms });
  };

  const handleAddDoor = (roomId: string) => {
    const updated: Plan = {
      ...localPlan,
      rooms: (localPlan.rooms || []).map((r) => {
        if (r.id !== roomId) return r;
        const newDoor: DoorInfo = { wall: 'top', position: 0.5, width: 3, swing: 'in' };
        return { ...r, doors: [...(r.doors || []), newDoor] };
      }),
    };
    commitLocalPlan(updated);
  };

  const handleAddWindow = (roomId: string) => {
    const updated: Plan = {
      ...localPlan,
      rooms: (localPlan.rooms || []).map((r) => {
        if (r.id !== roomId) return r;
        const newWindow: WindowInfo = { wall: 'top', position: 0.5, width: 3 };
        return { ...r, windows: [...(r.windows || []), newWindow] };
      }),
    };
    commitLocalPlan(updated);
  };

  const handleRemoveAllWindows = (roomId: string) => {
    const updated: Plan = {
      ...localPlan,
      rooms: (localPlan.rooms || []).map((r) => {
        if (r.id !== roomId) return r;
        return { ...r, windows: [] };
      }),
    };
    commitLocalPlan(updated);
    setSelectedWindow(null);
  };

  const handleDeleteRoom = (roomId: string) => {
    const updated: Plan = {
      ...localPlan,
      rooms: (localPlan.rooms || []).filter((r) => r.id !== roomId),
    };
    commitLocalPlan(updated);
    setSelectedRoomId(null);
    if (selectedFurniture?.roomId === roomId) setSelectedFurniture(null);
  };

  const handleDeleteFurniture = (roomId: string, furnitureIndex: number) => {
    const updated: Plan = {
      ...localPlan,
      rooms: (localPlan.rooms || []).map((r) => {
        if (r.id !== roomId) return r;
        return { ...r, furniture: (r.furniture || []).filter((_, idx) => idx !== furnitureIndex) };
      }),
    };
    commitLocalPlan(updated);
    setSelectedFurniture(null);
  };

  const handleFurnitureDragEnd = (roomId: string, furnitureIndex: number, e: Konva.KonvaEventObject<DragEvent>) => {
    const room = (localPlan.rooms || []).find((r) => r.id === roomId);
    const item = room?.furniture?.[furnitureIndex];
    if (!room || !item) return;

    const rot = item.rotation || 0;
    const itemWidthPx = item.w * scale;
    const itemHeightPx = item.h * scale;
    const baseRoomX = buildingOffsetX + room.x * scale;
    const baseRoomY = buildingOffsetY + room.y * scale;

    let nextX = (e.target.x() - baseRoomX) / scale;
    let nextY = (e.target.y() - baseRoomY) / scale;

    if (rot !== 0) {
      nextX = (e.target.x() - baseRoomX - itemWidthPx / 2) / scale;
      nextY = (e.target.y() - baseRoomY - itemHeightPx / 2) / scale;
    }

    const clampedX = Math.max(0, Math.min(room.w - item.w, Math.round(nextX * 10) / 10));
    const clampedY = Math.max(0, Math.min(room.h - item.h, Math.round(nextY * 10) / 10));

    const updated: Plan = {
      ...localPlan,
      rooms: (localPlan.rooms || []).map((r) => {
        if (r.id !== roomId) return r;
        const furniture = [...(r.furniture || [])];
        furniture[furnitureIndex] = { ...furniture[furnitureIndex], x: clampedX, y: clampedY };
        return { ...r, furniture };
      }),
    };

    commitLocalPlan(updated);
  };

  const handleFurnitureTransformEnd = (roomId: string, furnitureIndex: number) => {
    const key = `${roomId}-f-${furnitureIndex}`;
    const node = furnitureRefs.current[key];
    const room = (localPlan.rooms || []).find((r) => r.id === roomId);
    const item = room?.furniture?.[furnitureIndex];
    if (!node || !room || !item) return;

    const rot = item.rotation || 0;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    const newW = Math.max(0.8, Math.round(item.w * scaleX * 10) / 10);
    const newH = Math.max(0.8, Math.round(item.h * scaleY * 10) / 10);
    const baseRoomX = buildingOffsetX + room.x * scale;
    const baseRoomY = buildingOffsetY + room.y * scale;

    let nextX = (node.x() - baseRoomX) / scale;
    let nextY = (node.y() - baseRoomY) / scale;

    if (rot !== 0) {
      nextX = (node.x() - baseRoomX - (newW * scale) / 2) / scale;
      nextY = (node.y() - baseRoomY - (newH * scale) / 2) / scale;
    }

    const clampedX = Math.max(0, Math.min(room.w - newW, Math.round(nextX * 10) / 10));
    const clampedY = Math.max(0, Math.min(room.h - newH, Math.round(nextY * 10) / 10));

    node.scaleX(1);
    node.scaleY(1);
    node.x(baseRoomX + clampedX * scale + (rot !== 0 ? (newW * scale) / 2 : 0));
    node.y(baseRoomY + clampedY * scale + (rot !== 0 ? (newH * scale) / 2 : 0));

    const updated: Plan = {
      ...localPlan,
      rooms: (localPlan.rooms || []).map((r) => {
        if (r.id !== roomId) return r;
        const furniture = [...(r.furniture || [])];
        furniture[furnitureIndex] = { ...furniture[furnitureIndex], x: clampedX, y: clampedY, w: newW, h: newH };
        return { ...r, furniture };
      }),
    };

    commitLocalPlan(updated);
  };

  const setPlotEntrance = (pos: number, commit: boolean) => {
    const clamped = Math.max(0.1, Math.min(0.9, pos));
    setLocalPlan((prev) => {
      const updated = { ...prev, plotEntranceX: clamped };
      localPlanRef.current = updated;
      if (commit) onChange?.(updated);
      return updated;
    });
  };

  return (
    <div ref={wrapRef} className="relative h-full w-full overflow-hidden rounded-2xl bg-transparent shadow-inner">
      {advanced && selectedFurniture && (() => {
        const room = (localPlan.rooms || []).find((r) => r.id === selectedFurniture.roomId);
        const item = room?.furniture?.[selectedFurniture.furnitureIndex];
        if (!room || !item) return null;

        return (
          <div className="absolute left-1/2 top-4 z-10 flex -translate-x-1/2 items-center gap-2 rounded-2xl bg-white/90 p-1.5 shadow-xl backdrop-blur-md">
            <span className="px-3 text-xs font-bold uppercase tracking-wider text-ink">
              {item.type.replace(/_/g, ' ')}
            </span>
            <div className="h-6 w-px bg-border" />
            <button
              onClick={() => handleDeleteFurniture(selectedFurniture.roomId, selectedFurniture.furnitureIndex)}
              className="flex h-10 items-center gap-2 rounded-xl px-4 text-xs font-bold uppercase tracking-wider text-red-600 hover:bg-red-50 transition-all active:scale-95"
              title="Delete Asset"
            >
              <Trash2 size={14} className="text-red-500" />
              Delete Asset
            </button>
          </div>
        );
      })()}
      {advanced && selectedRoomId && !selectedFurniture && (
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
          <div className="h-6 w-px bg-border" />
          <button
            onClick={() => handleAddWindow(selectedRoomId)}
            className="flex h-10 items-center gap-2 rounded-xl px-4 text-xs font-bold uppercase tracking-wider text-ink hover:bg-surface transition-all active:scale-95"
            title="Add Window to Room"
          >
            <Plus size={14} className="text-clay" />
            Add Window
          </button>
          <div className="h-6 w-px bg-border" />
          <button
            onClick={() => handleRemoveAllWindows(selectedRoomId)}
            className="flex h-10 items-center gap-2 rounded-xl px-4 text-xs font-bold uppercase tracking-wider text-red-500 hover:bg-red-50 transition-all active:scale-95"
            title="Remove all windows from this room"
          >
            <Trash2 size={14} className="text-red-400" />
            Remove All Windows
          </button>
          <div className="h-6 w-px bg-border" />
          <button
            onClick={() => {
              setIsWallMode(!isWallMode);
              setWallPopup(null);
            }}
            className={`flex h-10 items-center gap-2 rounded-xl px-4 text-xs font-bold uppercase tracking-wider transition-all active:scale-95 ${
              isWallMode ? 'bg-clay text-white shadow-inner' : 'text-ink hover:bg-surface'
            }`}
            title="Toggle Wall Removal Mode - Click a wall to add/remove it"
          >
            <Maximize size={14} className={isWallMode ? 'text-white' : 'text-clay'} />
            {isWallMode ? 'Exit Wall Mode' : (() => {
              const selRoom = (localPlan.rooms || []).find(r => r.id === selectedRoomId);
              return selRoom?.type === 'balcony' ? 'Add/Remove Handrail' : 'Add/Remove Wall';
            })()}
          </button>
          <div className="h-6 w-px bg-border" />
          <button
            onClick={() => handleDeleteRoom(selectedRoomId)}
            className="flex h-10 items-center gap-2 rounded-xl px-4 text-xs font-bold uppercase tracking-wider text-red-600 hover:bg-red-50 transition-all active:scale-95"
            title="Delete Room"
          >
            <Trash2 size={14} className="text-red-500" />
            Delete
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
            setSelectedFurniture(null);
            setSelectedDoor(null);
            setSelectedWindow(null);
            setWallPopup(null);
          }
        }}
        draggable
      >
        <Layer listening={false}>
          {Array.from({ length: Math.floor(plotW) + 1 }).map((_, i) => (
            <Line
              key={`v-${i}`}
              points={[plotOffsetX + i * scale, plotOffsetY, plotOffsetX + i * scale, plotOffsetY + plotH * scale]}
              stroke={i % 5 === 0 ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.03)'}
              strokeWidth={i % 5 === 0 ? 1 : 0.5}
            />
          ))}
          {Array.from({ length: Math.floor(plotH) + 1 }).map((_, i) => (
            <Line
              key={`h-${i}`}
              points={[plotOffsetX, plotOffsetY + i * scale, plotOffsetX + plotW * scale, plotOffsetY + i * scale]}
              stroke={i % 5 === 0 ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.03)'}
              strokeWidth={i % 5 === 0 ? 1 : 0.5}
            />
          ))}
        </Layer>

        <Layer>
          {[...(localPlan.rooms || [])].sort((a, b) => {
            const aIsStair = a.type === 'staircase' || (a.label || '').toLowerCase().includes('staircase');
            const bIsStair = b.type === 'staircase' || (b.label || '').toLowerCase().includes('staircase');
            if (aIsStair && !bIsStair) return 1;
            if (!aIsStair && bIsStair) return -1;
            return 0;
          }).map((room) => (            <RoomShape
              key={room.id}
              room={room}
              scale={scale}
              offsetX={buildingOffsetX}
              offsetY={buildingOffsetY}
              draggable={advanced}
              isWallMode={isWallMode}
              isSelected={selectedRoomId === room.id}
              setWallPopup={setWallPopup}
              onPointerDown={() => {
                if (advanced) {
                  setSelectedRoomId(room.id);
                  setSelectedFurniture(null);
                  setSelectedDoor(null);
                  setSelectedWindow(null);
                }
              }}
              onWallToggle={(wall: string) => {
                if (!advanced) return;
                const sourceRoom = room;
                const isAdding = !(sourceRoom.openWalls || []).includes(wall as any);

                const updatedRooms = (localPlan.rooms || []).map(r => {
                  // Toggle the clicked room's wall
                  if (r.id === sourceRoom.id) {
                    const openWalls = r.openWalls || [];
                    const newOpenWalls = openWalls.includes(wall as any)
                      ? openWalls.filter(w => w !== wall)
                      : [...openWalls, wall as any];
                    return { ...r, openWalls: newOpenWalls };
                  }

                  // Also toggle the corresponding wall on the adjacent room
                  let targetWall: string | null = null;
                  if (wall === 'top' && Math.abs((r.y + r.h) - sourceRoom.y) < 1) {
                    if (Math.max(r.x, sourceRoom.x) < Math.min(r.x + r.w, sourceRoom.x + sourceRoom.w) - 0.1) {
                      targetWall = 'bottom';
                    }
                  } else if (wall === 'bottom' && Math.abs(r.y - (sourceRoom.y + sourceRoom.h)) < 1) {
                    if (Math.max(r.x, sourceRoom.x) < Math.min(r.x + r.w, sourceRoom.x + sourceRoom.w) - 0.1) {
                      targetWall = 'top';
                    }
                  } else if (wall === 'left' && Math.abs((r.x + r.w) - sourceRoom.x) < 1) {
                    if (Math.max(r.y, sourceRoom.y) < Math.min(r.y + r.h, sourceRoom.y + sourceRoom.h) - 0.1) {
                      targetWall = 'right';
                    }
                  } else if (wall === 'right' && Math.abs(r.x - (sourceRoom.x + sourceRoom.w)) < 1) {
                    if (Math.max(r.y, sourceRoom.y) < Math.min(r.y + r.h, sourceRoom.y + sourceRoom.h) - 0.1) {
                      targetWall = 'left';
                    }
                  }

                  if (targetWall) {
                    const openWalls = r.openWalls || [];
                    if (isAdding) {
                      // Adding open wall: add to adjacent room too
                      if (!openWalls.includes(targetWall as any)) {
                        return { ...r, openWalls: [...openWalls, targetWall as any] };
                      }
                    } else {
                      // Removing open wall: remove from adjacent room too
                      return { ...r, openWalls: openWalls.filter(w => w !== targetWall) };
                    }
                  }

                  return r;
                });
                commitLocalPlan({ ...localPlan, rooms: updatedRooms });
              }}
              onRotate={() => handleRotateRoom(room.id)}
              onMirror={() => handleMirrorRoom(room.id)}
              innerRef={(node: any) => {
                if (node) roomRefs.current[room.id] = node;
              }}
              onDragEnd={(e: any) => handleDragEnd(room.id, e)}
              onTransformEnd={(e: any) => {
                const node = roomRefs.current[room.id];
                const scaleX = node.scaleX();
                const scaleY = node.scaleY();
                
                const newX = Math.max(0, Math.round((node.x() - buildingOffsetX) / scale));
                const newY = Math.max(0, Math.round((node.y() - buildingOffsetY) / scale));
                const newW = Math.max(2, Math.round(room.w * scaleX));
                const newH = Math.max(2, Math.round(room.h * scaleY));
                
                node.scaleX(1);
                node.scaleY(1);
                node.x(buildingOffsetX + newX * scale);
                node.y(buildingOffsetY + newY * scale);
 
                const newRoom = { ...room, x: newX, y: newY, w: newW, h: newH };
                newRoom.furniture = regenerateFurniture(newRoom, config.kitchen);
                
                const updatedPlan = {
                  ...localPlan,
                  rooms: (localPlan.rooms || []).map(r => r.id === room.id ? newRoom : r)
                };
                commitLocalPlan(updatedPlan);
              }}
              floorLevel={floorLevel}
            />
          ))}
          {advanced && (
            <Transformer
              ref={transformerRef}
              rotateEnabled={false}
              borderStroke="transparent"
              anchorStroke="#2563eb"
              anchorFill="#fff"
              anchorSize={8}
              anchorCornerRadius={2}
              boundBoxFunc={(oldBox, newBox) => {
                if (newBox.width < 20 || newBox.height < 20) return oldBox;
                return newBox;
              }}
            />
          )}
        </Layer>

        <Layer listening={advanced}>
          {(localPlan.rooms || []).map((room) =>
            room.furniture.map((f, fi) => (
              <FurnitureShape
                key={`${room.id}-f-${fi}`}
                item={f}
                roomX={room.x}
                roomY={room.y}
                scale={scale}
                offsetX={buildingOffsetX}
                offsetY={buildingOffsetY}
                draggable={advanced}
                selected={selectedFurniture?.roomId === room.id && selectedFurniture?.furnitureIndex === fi}
                innerRef={(node: any) => {
                  if (node) furnitureRefs.current[`${room.id}-f-${fi}`] = node;
                }}
                onPointerDown={() => {
                  if (advanced) {
                    setSelectedFurniture({ roomId: room.id, furnitureIndex: fi });
                    setSelectedRoomId(null);
                    setSelectedDoor(null);
                    setSelectedWindow(null);
                    setWallPopup(null);
                  }
                }}
                onDragEnd={(e: any) => handleFurnitureDragEnd(room.id, fi, e)}
                onTransformEnd={() => handleFurnitureTransformEnd(room.id, fi)}
              />
            ))
          )}
        </Layer>

        <Layer listening={true}>
          {(localPlan.rooms || []).map((room) => (
            <Group key={`dw-${room.id}`}>
              {(room.doors || []).map((d, di) => {
                // Prevent rendering duplicate doors for connected rooms
                if (d.connectsTo && room.id > d.connectsTo) return null;

                return (
                  <DoorShape 
                    key={`d-${di}`} 
                    door={d} 
                    room={room} 
                    scale={scale} 
                    offsetX={buildingOffsetX} 
                    offsetY={buildingOffsetY} 
                    doorIndex={di}
                    selected={selectedDoor?.roomId === room.id && selectedDoor?.doorIndex === di}
                    onSelect={() => {
                      if (advanced) {
                        setSelectedDoor({ roomId: room.id, doorIndex: di });
                        setSelectedRoomId(null);
                        setSelectedFurniture(null);
                        setSelectedWindow(null);
                      }
                    }}
                    onDragMove={(newWall: string, newPos: number) => {
                      const updatedRooms = (localPlan.rooms || []).map(r => {
                        if (r.id === room.id) {
                          const newDoors = [...r.doors];
                          newDoors[di] = { ...newDoors[di], wall: newWall as any, position: newPos };
                          return { ...r, doors: newDoors };
                        }
                        return r;
                      });
                      const updatedPlan = { ...localPlan, rooms: updatedRooms };
                      commitLocalPlan(updatedPlan, false);
                    }}
                    onDragEnd={() => {
                      onChange?.(localPlanRef.current);
                    }}
                    onDelete={() => {
                      if (advanced) {
                        const updatedRooms = (localPlan.rooms || []).map(r => {
                          if (r.id === room.id) {
                            return { ...r, doors: r.doors.filter((_, idx) => idx !== di) };
                          }
                          // Also remove the connected door from the other room
                          if (d.connectsTo && r.id === d.connectsTo) {
                            return { ...r, doors: r.doors.filter(od => od.connectsTo !== room.id) };
                          }
                          return r;
                        });
                        const updatedPlan = { ...localPlan, rooms: updatedRooms };
                        commitLocalPlan(updatedPlan);
                        setSelectedDoor(null);
                      }
                    }}
                  />
                );
              })}
              {(room.windows || []).map((w, wi) => (
                <WindowShape 
                  key={`w-${wi}`} 
                  window={w} 
                  room={room} 
                  scale={scale} 
                  offsetX={buildingOffsetX} 
                  offsetY={buildingOffsetY} 
                  windowIndex={wi}
                  selected={selectedWindow?.roomId === room.id && selectedWindow?.windowIndex === wi}
                  onSelect={() => {
                    if (advanced) {
                      setSelectedWindow({ roomId: room.id, windowIndex: wi });
                      setSelectedRoomId(null);
                      setSelectedFurniture(null);
                      setSelectedDoor(null);
                    }
                  }}
                  onDragMove={(newWall: string, newPos: number) => {
                    const updatedRooms = (localPlan.rooms || []).map(r => {
                      if (r.id === room.id) {
                        const newWindows = [...r.windows];
                        newWindows[wi] = { ...newWindows[wi], wall: newWall as any, position: newPos };
                        return { ...r, windows: newWindows };
                      }
                      return r;
                    });
                    const updatedPlan = { ...localPlan, rooms: updatedRooms };
                    commitLocalPlan(updatedPlan, false);
                  }}
                  onDragEnd={() => {
                    onChange?.(localPlanRef.current);
                  }}
                  onDelete={() => {
                    if (advanced) {
                      const updatedRooms = (localPlan.rooms || []).map(r => {
                        if (r.id === room.id) {
                          return { ...r, windows: r.windows.filter((_, idx) => idx !== wi) };
                        }
                        return r;
                      });
                      const updatedPlan = { ...localPlan, rooms: updatedRooms };
                      commitLocalPlan(updatedPlan);
                      setSelectedWindow(null);
                    }
                  }}
                />
              ))}
            </Group>
          ))}
        </Layer>

        <Layer listening={true}>
          <Group
            x={plotOffsetX + entrancePos * plotW * scale}
            y={plotOffsetY}
            draggable={advanced}
            dragBoundFunc={(pos) => ({
              x: Math.max(plotOffsetX + gateHalfPx, Math.min(plotOffsetX + plotW * scale - gateHalfPx, pos.x)),
              y: plotOffsetY,
            })}
            onDragMove={(e) => {
              const x = e.target.x();
              setPlotEntrance((x - plotOffsetX) / (plotW * scale), false);
            }}
            onDragEnd={(e) => {
              const x = e.target.x();
              setPlotEntrance((x - plotOffsetX) / (plotW * scale), true);
            }}
          >
            <Rect x={-gateHalfPx} y={-3} width={gateHalfPx * 2} height={6} fill="#3f2f1f" cornerRadius={2} shadowBlur={4} shadowOpacity={0.2} />
            <Rect x={-2} y={-10} width={4} height={18} fill="#6b4f30" />
            <Circle x={0} y={0} radius={3} fill="#d6b37a" />
            {advanced && (
              <Text x={-30} y={-24} width={60} align="center" text="ENTRANCE" fontFamily="Urbanist" fontSize={9} fill="#6b4f30" fontStyle="700" />
            )}
          </Group>
        </Layer>

        {!minimal && (
          <Layer listening={false}>
            {(localPlan.rooms || []).map(room => {
              const isRooftop = room.id.startsWith('addon-solar') || room.id.startsWith('addon-tank');
              const isFence = room.id === 'addon-fence';
              
              const labelY = isFence 
                ? buildingOffsetY + room.y * scale - 22 
                : buildingOffsetY + room.y * scale + (room.h * scale)/2 - (isRooftop ? 0 : 10);

              return (
                <Text key={`label-${room.id}`}
                  text={room.label} 
                  fontFamily="Urbanist" fontStyle={(isRooftop || isFence) ? "600 italic" : "800"} 
                  fontSize={(isRooftop || isFence) ? 9 : Math.max(10, Math.min(14, room.w * scale * 0.08))}
                  fill={(isRooftop || isFence) ? "rgba(26, 42, 74, 0.7)" : "rgba(0,0,0,0.75)"} 
                  align="center" verticalAlign="middle"
                  x={buildingOffsetX + room.x * scale} 
                  y={labelY} 
                  width={room.w * scale} 
                  shadowColor="white" shadowBlur={6} shadowOpacity={1} shadowOffset={{x:0, y:0}}
                  letterSpacing={(isRooftop || isFence) ? 0.5 : 1.2} />
              );
            })}
            {(localPlan.rooms || []).map(room => {
              if (room.id === 'addon-fence') return null; // Don't show dimensions for fence
              return (
                <Text key={`dim-${room.id}`}
                   text={`${Math.round(room.w)}′ × ${Math.round(room.h)}′`} 
                   fontFamily="Epilogue" fontStyle="600" 
                   fontSize={9}
                   fill="rgba(0,0,0,0.55)" 
                   align="center" verticalAlign="middle"
                   x={buildingOffsetX + room.x * scale} 
                   y={buildingOffsetY + room.y * scale + (room.h * scale)/2 + 6} 
                   width={room.w * scale} 
                   shadowColor="white" shadowBlur={4} shadowOpacity={1} shadowOffset={{x:0, y:0}} />
              );
            })}
          </Layer>
        )}

        <Layer listening={false}>
          <Rect
            x={plotOffsetX}
            y={plotOffsetY}
            width={plotW * scale}
            height={PLOT_PADDING_FT * scale}
            fill="#98c58b"
            opacity={0.4}
          />
          <Rect
            x={plotOffsetX}
            y={plotOffsetY + (PLOT_PADDING_FT + localH) * scale}
            width={plotW * scale}
            height={PLOT_PADDING_FT * scale}
            fill="#98c58b"
            opacity={0.4}
          />
          <Rect
            x={plotOffsetX}
            y={plotOffsetY}
            width={PLOT_PADDING_FT * scale}
            height={plotH * scale}
            fill="#98c58b"
            opacity={0.4}
          />
          <Rect
            x={plotOffsetX + (PLOT_PADDING_FT + localW) * scale}
            y={plotOffsetY}
            width={PLOT_PADDING_FT * scale}
            height={plotH * scale}
            fill="#98c58b"
            opacity={0.4}
          />
          {/* Front garden beds (top side) */}
          <Rect
            x={plotOffsetX + scale * 0.6}
            y={plotOffsetY + scale * 0.25}
            width={Math.max(12, entrancePos * plotW * scale - gateHalfPx - scale * 1.2)}
            height={Math.max(6, PLOT_PADDING_FT * scale - scale * 0.4)}
            fill="#7fb06a"
            opacity={0.45}
            cornerRadius={4}
          />
          <Rect
            x={plotOffsetX + entrancePos * plotW * scale + gateHalfPx + scale * 0.6}
            y={plotOffsetY + scale * 0.25}
            width={Math.max(12, plotOffsetX + plotW * scale - (plotOffsetX + entrancePos * plotW * scale + gateHalfPx + scale * 1.2))}
            height={Math.max(6, PLOT_PADDING_FT * scale - scale * 0.4)}
            fill="#7fb06a"
            opacity={0.45}
            cornerRadius={4}
          />
          {/* Front trees */}
          <Circle x={plotOffsetX + Math.max(scale * 1.2, entrancePos * plotW * scale - gateHalfPx - scale * 1.6)} y={plotOffsetY + PLOT_PADDING_FT * scale * 0.52} radius={Math.max(4, scale * 0.32)} fill="#3e6f3e" opacity={0.85} />
          <Circle x={plotOffsetX + Math.min(plotW * scale - scale * 1.2, entrancePos * plotW * scale + gateHalfPx + scale * 1.6)} y={plotOffsetY + PLOT_PADDING_FT * scale * 0.52} radius={Math.max(4, scale * 0.32)} fill="#3e6f3e" opacity={0.85} />
          <Line points={[plotOffsetX, plotOffsetY + plotH * scale, plotOffsetX + plotW * scale, plotOffsetY + plotH * scale]} stroke="#4b5a39" strokeWidth={5} />
          <Line points={[plotOffsetX, plotOffsetY, plotOffsetX, plotOffsetY + plotH * scale]} stroke="#4b5a39" strokeWidth={5} />
          <Line points={[plotOffsetX + plotW * scale, plotOffsetY, plotOffsetX + plotW * scale, plotOffsetY + plotH * scale]} stroke="#4b5a39" strokeWidth={5} />
          <Line points={[plotOffsetX, plotOffsetY, plotOffsetX + entrancePos * plotW * scale - gateHalfPx, plotOffsetY]} stroke="#4b5a39" strokeWidth={5} />
          <Line points={[plotOffsetX + entrancePos * plotW * scale + gateHalfPx, plotOffsetY, plotOffsetX + plotW * scale, plotOffsetY]} stroke="#4b5a39" strokeWidth={5} />
          <Rect
            x={buildingOffsetX}
            y={buildingOffsetY}
            width={localW * scale}
            height={localH * scale}
            stroke="#1a1a1a"
            strokeWidth={5}
            cornerRadius={2}
          />
          <Text x={plotOffsetX + plotW * scale / 2 - 24} y={plotOffsetY + plotH * scale + 16}
            text={`${Math.round(plotW)} ft`} fontFamily="Urbanist" fontSize={12} fill="#466040" fontStyle="700" />
          <Text x={plotOffsetX - 32} y={plotOffsetY + plotH * scale / 2}
            text={`${Math.round(plotH)} ft`} fontFamily="Urbanist" fontSize={12} fill="#466040" fontStyle="700" rotation={-90} />
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

      {!minimal && !hideZoomHelper && (
        <div className="absolute left-3 bottom-3 glass-panel rounded-lg px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest shadow-sm">
          Scroll to zoom · Drag to pan
        </div>
      )}

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
              const currentPlan = localPlanRef.current;
              const sourceRoom = (currentPlan.rooms || []).find(r => r.id === wallPopup.roomId);
              if (!sourceRoom) return;

              const updatedRooms = (currentPlan.rooms || []).map(r => {
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
              });
              commitLocalPlan({ ...currentPlan, rooms: updatedRooms });
              setWallPopup(null);
            }}
            className="flex h-8 items-center gap-2 rounded-lg px-3 text-[10px] font-bold uppercase text-emerald-700 hover:bg-emerald-50 transition-colors"
          >
            <Plus size={12} /> {(() => { const r = (localPlanRef.current.rooms || []).find(r => r.id === wallPopup.roomId); return r?.type === 'balcony' ? 'Add Handrail' : 'Add Wall'; })()}
          </button>
          <div className="h-px w-full bg-border" />
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              const currentPlan = localPlanRef.current;
              const sourceRoom = (currentPlan.rooms || []).find(r => r.id === wallPopup.roomId);
              if (!sourceRoom) return;

              const updatedRooms = (currentPlan.rooms || []).map(r => {
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
              });
              commitLocalPlan({ ...currentPlan, rooms: updatedRooms });
              setWallPopup(null);
            }}
            className="flex h-8 items-center gap-2 rounded-lg px-3 text-[10px] font-bold uppercase text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 size={12} /> {(() => { const r = (localPlanRef.current.rooms || []).find(r => r.id === wallPopup.roomId); return r?.type === 'balcony' ? 'Remove Handrail' : 'Remove Wall'; })()}
          </button>
        </div>
      )}
    </div>
  );
};

/* ─── Room Shape ─── */
const RoomShape = ({ room, scale, offsetX, offsetY, isSelected, onClick, onRotate, onMirror, draggable, onDragEnd, onContext, onFurnitureUpdate, showLabels = true, onPointerDown, onTransformEnd, innerRef, isWallMode, setWallPopup, onWallToggle, floorLevel }: any) => {
  const rx = offsetX + room.x * scale;
  const ry = offsetY + room.y * scale;
  const rw = room.w * scale;
  const rh = room.h * scale;
  const isStaircase = room.type === 'staircase' || (room.label || '').toLowerCase().includes('staircase');
  const isMirrored = room.isMirrored || false;

  const isRooftop = room.id.startsWith('addon-solar') || room.id.startsWith('addon-tank');
  const isFence = room.id === 'addon-fence';
  const isTree = room.id.startsWith('addon-tree');
  
  return (
    <Group 
      x={rx} y={ry} 
      draggable={draggable} 
      onDragEnd={onDragEnd}
      onPointerDown={onPointerDown}
      onTransformEnd={onTransformEnd}
      onClick={onClick}
      onContextMenu={onContext}
      ref={innerRef}
    >
      <Rect 
        width={rw} height={rh} 
        fill={isTree ? 'rgba(34, 197, 94, 0.4)' : (isStaircase ? 'transparent' : room.color)} 
        cornerRadius={isTree ? rw / 2 : 0}
        opacity={(isRooftop || isFence) ? 0.6 : 1} 
        dash={(isRooftop || isFence) ? [5, 5] : undefined}
        stroke={(isRooftop || isFence) ? (isFence ? '#4a6741' : 'rgba(0,0,0,0.4)') : undefined}
        strokeWidth={(isRooftop || isFence) ? (isFence ? 4 : 1) : 0}
      />
      {/* Explicitly draw individual walls / handrails to support open floor plans */}
      {!isRooftop && !isFence && !isTree && (
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
            onClick={(e: any) => {
              e.cancelBubble = true;
              if (isWallMode) {
                const stage = e.target.getStage();
                const pos = stage.getPointerPosition();
                setWallPopup({ roomId: room.id, wall: 'top', x: pos.x, y: pos.y });
              } else {
                onWallToggle('top');
              }
            }}
            onMouseEnter={(e) => {
              e.target.getStage()!.container().style.cursor = 'pointer';
            }}
            onMouseLeave={(e) => {
              e.target.getStage()!.container().style.cursor = 'default';
            }}
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
            onClick={(e: any) => {
              e.cancelBubble = true;
              if (isWallMode) {
                const stage = e.target.getStage();
                const pos = stage.getPointerPosition();
                setWallPopup({ roomId: room.id, wall: 'bottom', x: pos.x, y: pos.y });
              } else {
                onWallToggle('bottom');
              }
            }}
            onMouseEnter={(e) => {
              e.target.getStage()!.container().style.cursor = 'pointer';
            }}
            onMouseLeave={(e) => {
              e.target.getStage()!.container().style.cursor = 'default';
            }}
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
            onClick={(e: any) => {
              e.cancelBubble = true;
              if (isWallMode) {
                const stage = e.target.getStage();
                const pos = stage.getPointerPosition();
                setWallPopup({ roomId: room.id, wall: 'left', x: pos.x, y: pos.y });
              } else {
                onWallToggle('left');
              }
            }}
            onMouseEnter={(e) => {
              e.target.getStage()!.container().style.cursor = 'pointer';
            }}
            onMouseLeave={(e) => {
              e.target.getStage()!.container().style.cursor = 'default';
            }}
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
            onClick={(e: any) => {
              e.cancelBubble = true;
              if (isWallMode) {
                const stage = e.target.getStage();
                const pos = stage.getPointerPosition();
                setWallPopup({ roomId: room.id, wall: 'right', x: pos.x, y: pos.y });
              } else {
                onWallToggle('right');
              }
            }}
            onMouseEnter={(e) => {
              e.target.getStage()!.container().style.cursor = 'pointer';
            }}
            onMouseLeave={(e) => {
              e.target.getStage()!.container().style.cursor = 'default';
            }}
          />
        </>
      )}
      
      {/* Floor Textures */}
      {!isRooftop && !isFence && !isTree && room.type === 'bathroom' && (
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
          {Array.from({ length: Math.ceil((rw + rh) / (scale * 2)) }).map((_, i) => (
            <Line key={`hatch-${i}`}
              points={[Math.min(i * scale * 2, rw), Math.max(0, i * scale * 2 - rw), Math.max(0, i * scale * 2 - rh), Math.min(i * scale * 2, rh)]}
              stroke="hsl(0, 0%, 50%)" strokeWidth={0.5} />
          ))}
        </Group>
      )}
      {room.type === 'garden' && (
        <Group opacity={0.25}>
          {Array.from({ length: Math.ceil((rw + rh) / (scale * 2)) }).map((_, i) => (
            <Line key={`ghatch-${i}`}
              points={[Math.min(i * scale * 2, rw), Math.max(0, i * scale * 2 - rw), Math.max(0, i * scale * 2 - rh), Math.min(i * scale * 2, rh)]}
              stroke="hsl(120, 35%, 45%)" strokeWidth={0.8} />
          ))}
        </Group>
      )}
      {/* Staircase L-Shape Visualization — Floor-Aware Architectural Style */}
      {isStaircase && (() => {
        const orient = room.orientation || 0;
        // Derive compact stair geometry from room dimensions
        const sg = resolveStairGeometry(room);
        const sW = sg.stairWidth * scale; // compact stair width in px
        const sL = sg.stairLength * scale; // compact stair length in px
        const landingSize = sg.landingSize * scale;
        
        // Use shared stairGeometry offsets as master coordinates
        const stairOffsetX = sg.stairOffsetX * scale;
        const stairOffsetY = sg.stairOffsetY * scale;

        // ─── FIRST FLOOR: Landing + Opening Void ───
        if (floorLevel === 1) {
          const openW = sg.openingWidth * scale;
          const openL = sg.openingLength * scale;
          return (
            <Group opacity={0.55} scaleX={isMirrored ? -1 : 1} x={isMirrored ? rw : 0}>
              {/* Opening void outline */}
              <Rect x={stairOffsetX} y={stairOffsetY} width={openW} height={openL}
                stroke="#666" strokeWidth={1.2} dash={[6, 4]} fill="rgba(0,0,0,0.03)" />
              
              {/* Cross-hatching inside void (architectural convention for openings) */}
              {(() => {
                const hatchLines = [];
                const hatchSpacing = 8;
                const ox = stairOffsetX;
                const oy = stairOffsetY;
                // Diagonal lines from top-left to bottom-right
                for (let d = hatchSpacing; d < openW + openL; d += hatchSpacing) {
                  const x1 = Math.max(0, d - openL) + ox;
                  const y1 = Math.min(d, openL) + oy;
                  const x2 = Math.min(d, openW) + ox;
                  const y2 = Math.max(0, d - openW) + oy;
                  hatchLines.push(
                    <Line key={`hatch-${d}`} points={[x1, y1, x2, y2]}
                      stroke="#999" strokeWidth={0.3} opacity={0.5} />
                  );
                }
                return hatchLines;
              })()}

              {/* Landing platform at arrival zone */}
              {(() => {
                let lx = stairOffsetX, ly = stairOffsetY;
                if (orient === 0) { lx = stairOffsetX; ly = stairOffsetY; }
                else if (orient === 1) { lx = stairOffsetX + openW - landingSize; ly = stairOffsetY; }
                else if (orient === 2) { lx = stairOffsetX + openW - landingSize; ly = stairOffsetY + openL - landingSize; }
                else if (orient === 3) { lx = stairOffsetX; ly = stairOffsetY + openL - landingSize; }
                return <Rect x={lx} y={ly} width={landingSize} height={landingSize}
                  stroke="#333" strokeWidth={1.0} fill="rgba(180,170,155,0.15)" />;
              })()}
              
              {/* Guard rail line along opening edge */}
              {(() => {
                const railOffset = 2;
                if (orient === 0) {
                  return <Line points={[stairOffsetX + landingSize, stairOffsetY + railOffset, stairOffsetX + openW, stairOffsetY + railOffset]}
                    stroke="#333" strokeWidth={1.5} />;
                } else if (orient === 1) {
                  return <Line points={[stairOffsetX + openW - landingSize - railOffset, stairOffsetY, stairOffsetX + openW - landingSize - railOffset, stairOffsetY + openL]}
                    stroke="#333" strokeWidth={1.5} />;
                } else if (orient === 2) {
                  return <Line points={[stairOffsetX, stairOffsetY + openL - railOffset, stairOffsetX + openW - landingSize, stairOffsetY + openL - railOffset]}
                    stroke="#333" strokeWidth={1.5} />;
                } else {
                  return <Line points={[stairOffsetX + landingSize + railOffset, stairOffsetY, stairOffsetX + landingSize + railOffset, stairOffsetY + openL]}
                    stroke="#333" strokeWidth={1.5} />;
                }
              })()}

              {/* DN label (architectural convention: down arrow) */}
              <Text 
                x={stairOffsetX + openW / 2} 
                y={stairOffsetY + openL / 2 - 5}
                align="center"
                offsetX={8}
                scaleX={isMirrored ? -1 : 1}
                text="DN" 
                fontSize={10} 
                fontStyle="bold" 
                fill="#555" 
                letterSpacing={1} 
              />
              
              {/* Downward arrow */}
              {(() => {
                const cx = stairOffsetX + openW / 2;
                const ay = stairOffsetY + openL / 2 + 8;
                return (
                  <Group opacity={0.6}>
                    <Line points={[cx, ay, cx, ay + 12]} stroke="#555" strokeWidth={0.8} />
                    <Line points={[cx - 3, ay + 9, cx, ay + 12, cx + 3, ay + 9]} stroke="#555" strokeWidth={0.8} />
                  </Group>
                );
              })()}
            </Group>
          );
        }

        // ─── GROUND FLOOR: Full L-Shape Staircase ───
        const displaySteps1 = Math.ceil(9 / 2);
        const displaySteps2 = Math.ceil(9 / 2);

        return (
          <Group opacity={0.55} scaleX={isMirrored ? -1 : 1} x={isMirrored ? rw : 0}>
            {/* Stair container outline (dashed, lightweight) */}
            <Rect x={stairOffsetX} y={stairOffsetY} width={sW} height={sL} stroke="#444" strokeWidth={1.0} dash={[4, 3]} />

            {/* Landing */}
            {(() => {
              let lx = stairOffsetX, ly = stairOffsetY;
              if (orient === 0) { lx = stairOffsetX; ly = stairOffsetY; }
              else if (orient === 1) { lx = stairOffsetX + sW - landingSize; ly = stairOffsetY; }
              else if (orient === 2) { lx = stairOffsetX + sW - landingSize; ly = stairOffsetY + sL - landingSize; }
              else if (orient === 3) { lx = stairOffsetX; ly = stairOffsetY + sL - landingSize; }
              
              return <Rect x={lx} y={ly} width={landingSize} height={landingSize} stroke="#333" strokeWidth={1.0} fill="rgba(0,0,0,0.04)" />;
            })()}

            {/* Flight 1 & 2 Steps — thin architectural drafting lines */}
            {(() => {
              const items = [];
              if (orient === 0) {
                const f1H = sL - landingSize;
                const f1StepH = f1H / displaySteps1;
                for (let i = 1; i < displaySteps1; i++) {
                  items.push(<Line key={`f1-${i}`} points={[stairOffsetX, stairOffsetY + sL - i * f1StepH, stairOffsetX + landingSize, stairOffsetY + sL - i * f1StepH]} stroke="#333" strokeWidth={0.7} />);
                }
                const f2W = sW - landingSize;
                const f2StepW = f2W / displaySteps2;
                for (let i = 1; i < displaySteps2; i++) {
                  items.push(<Line key={`f2-${i}`} points={[stairOffsetX + landingSize + i * f2StepW, stairOffsetY, stairOffsetX + landingSize + i * f2StepW, stairOffsetY + landingSize]} stroke="#333" strokeWidth={0.7} />);
                }
              } else if (orient === 1) {
                const f1W = sW - landingSize;
                const f1StepW = f1W / displaySteps1;
                for (let i = 1; i < displaySteps1; i++) {
                  items.push(<Line key={`f1-${i}`} points={[stairOffsetX + i * f1StepW, stairOffsetY, stairOffsetX + i * f1StepW, stairOffsetY + landingSize]} stroke="#333" strokeWidth={0.7} />);
                }
                const f2H = sL - landingSize;
                const f2StepH = f2H / displaySteps2;
                for (let i = 1; i < displaySteps2; i++) {
                  items.push(<Line key={`f2-${i}`} points={[stairOffsetX + sW - landingSize, stairOffsetY + landingSize + i * f2StepH, stairOffsetX + sW, stairOffsetY + landingSize + i * f2StepH]} stroke="#333" strokeWidth={0.7} />);
                }
              } else if (orient === 2) {
                const f1H = sL - landingSize;
                const f1StepH = f1H / displaySteps1;
                for (let i = 1; i < displaySteps1; i++) {
                  items.push(<Line key={`f1-${i}`} points={[stairOffsetX + sW - landingSize, stairOffsetY + i * f1StepH, stairOffsetX + sW, stairOffsetY + i * f1StepH]} stroke="#333" strokeWidth={0.7} />);
                }
                const f2W = sW - landingSize;
                const f2StepW = f2W / displaySteps2;
                for (let i = 1; i < displaySteps2; i++) {
                  items.push(<Line key={`f2-${i}`} points={[stairOffsetX + sW - landingSize - i * f2StepW, stairOffsetY + sL - landingSize, stairOffsetX + sW - landingSize - i * f2StepW, stairOffsetY + sL]} stroke="#333" strokeWidth={0.7} />);
                }
              } else if (orient === 3) {
                const f1W = sW - landingSize;
                const f1StepW = f1W / displaySteps1;
                for (let i = 1; i < displaySteps1; i++) {
                  items.push(<Line key={`f1-${i}`} points={[stairOffsetX + sW - i * f1StepW, stairOffsetY + sL - landingSize, stairOffsetX + sW - i * f1StepW, stairOffsetY + sL]} stroke="#333" strokeWidth={0.7} />);
                }
                const f2H = sL - landingSize;
                const f2StepH = f2H / displaySteps2;
                for (let i = 1; i < displaySteps2; i++) {
                  items.push(<Line key={`f2-${i}`} points={[stairOffsetX, stairOffsetY + sL - landingSize - i * f2StepH, stairOffsetX + landingSize, stairOffsetY + sL - landingSize - i * f2StepH]} stroke="#333" strokeWidth={0.7} />);
                }
              }
              return items;
            })()}
            
            {/* Directional Path Arrow — minimal architectural style */}
            {(() => {
              const arrowHeadSize = 4;
              let pathPoints: number[] = [];
              let arrowPoints: number[] = [];
              const mid = landingSize / 2;
              
              if (orient === 0) {
                pathPoints = [stairOffsetX + mid, stairOffsetY + sL - 3, stairOffsetX + mid, stairOffsetY + mid, stairOffsetX + sW - 3, stairOffsetY + mid];
                arrowPoints = [stairOffsetX + sW - 3 - arrowHeadSize, stairOffsetY + mid - arrowHeadSize/2, stairOffsetX + sW - 3, stairOffsetY + mid, stairOffsetX + sW - 3 - arrowHeadSize, stairOffsetY + mid + arrowHeadSize/2];
              } else if (orient === 1) {
                pathPoints = [stairOffsetX + 3, stairOffsetY + mid, stairOffsetX + sW - mid, stairOffsetY + mid, stairOffsetX + sW - mid, stairOffsetY + sL - 3];
                arrowPoints = [stairOffsetX + sW - mid - arrowHeadSize/2, stairOffsetY + sL - 3 - arrowHeadSize, stairOffsetX + sW - mid, stairOffsetY + sL - 3, stairOffsetX + sW - mid + arrowHeadSize/2, stairOffsetY + sL - 3 - arrowHeadSize];
              } else if (orient === 2) {
                pathPoints = [stairOffsetX + sW - mid, stairOffsetY + 3, stairOffsetX + sW - mid, stairOffsetY + sL - mid, stairOffsetX + 3, stairOffsetY + sL - mid];
                arrowPoints = [stairOffsetX + 3 + arrowHeadSize, stairOffsetY + sL - mid - arrowHeadSize/2, stairOffsetX + 3, stairOffsetY + sL - mid, stairOffsetX + 3 + arrowHeadSize, stairOffsetY + sL - mid + arrowHeadSize/2];
              } else if (orient === 3) {
                pathPoints = [stairOffsetX + sW - 3, stairOffsetY + sL - mid, stairOffsetX + mid, stairOffsetY + sL - mid, stairOffsetX + mid, stairOffsetY + 3];
                arrowPoints = [stairOffsetX + mid - arrowHeadSize/2, stairOffsetY + 3 + arrowHeadSize, stairOffsetX + mid, stairOffsetY + 3, stairOffsetX + mid + arrowHeadSize/2, stairOffsetY + 3 + arrowHeadSize];
              }
              
              return (
                <Group opacity={0.65}>
                  <Circle x={pathPoints[0]} y={pathPoints[1]} radius={1.8} fill="#333" />
                  <Line points={pathPoints} stroke="#333" strokeWidth={0.8} tension={0.15} />
                  <Line points={arrowPoints} stroke="#333" strokeWidth={0.8} />
                </Group>
              );
            })()}

            {/* UP label */}
            <Text 
              x={stairOffsetX + sW / 2} 
              y={stairOffsetY - 12}
              align="center"
              offsetX={6}
              scaleX={isMirrored ? -1 : 1}
              text="UP" 
              fontSize={8} 
              fontStyle="bold" 
              fill="#666" 
              letterSpacing={1} 
            />
          </Group>
        );
      })()}
      
      {/* Floating Action Button (Specific for Staircase: Mirror) */}
      {isStaircase && draggable && (
        <Group
          x={rw / 2 - 12}
          y={rh / 2 - 12}
          onPointerDown={(e: any) => {
            e.cancelBubble = true;
            onMirror?.();
          }}
          onMouseEnter={(e: any) => e.target.getStage()!.container().style.cursor = 'pointer'}
          onMouseLeave={(e: any) => e.target.getStage()!.container().style.cursor = 'default'}
        >
          <Circle x={12} y={12} radius={14} fill="rgba(255,255,255,0.95)" shadowBlur={6} shadowOpacity={0.25} shadowOffsetY={2} />
          <Text x={6} y={7} text="⇄" fontSize={16} fill="#2563eb" fontStyle="bold" />
        </Group>
      )}
    </Group>
  );
};

/* ─── Furniture ─── */
const FurnitureShape = ({ item, roomX, roomY, scale, offsetX, offsetY, draggable = false, selected = false, innerRef, onPointerDown, onDragEnd, onTransformEnd }: any) => {
  const w = item.w * scale;
  const h = item.h * scale;
  const rot = item.rotation || 0;
  const x = offsetX + (roomX + item.x) * scale + (rot !== 0 ? w / 2 : 0);
  const y = offsetY + (roomY + item.y) * scale + (rot !== 0 ? h / 2 : 0);
  const colors = getFurnitureColors(item.type);

  return (
    <Group
      ref={innerRef}
      x={x}
      y={y}
      rotation={rot}
      offsetX={rot !== 0 ? w / 2 : 0}
      offsetY={rot !== 0 ? h / 2 : 0}
      draggable={draggable}
      onPointerDown={(e: any) => {
        e.cancelBubble = true;
        onPointerDown?.();
      }}
      onDragEnd={onDragEnd}
      onTransformEnd={onTransformEnd}
    >
      {selected && <Rect x={-3} y={-3} width={w + 6} height={h + 6} stroke="#2563eb" strokeWidth={2} dash={[5, 4]} cornerRadius={4} />}
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
const WindowShape = ({ window: win, room, scale, offsetX, offsetY, windowIndex, selected, onSelect, onDelete, onDragMove, onDragEnd }: any) => {
  const rx = offsetX + room.x * scale;
  const ry = offsetY + room.y * scale;
  const rw = room.w * scale;
  const rh = room.h * scale;
  const ww = win.width * scale;

  let cx = 0, cy = 0, rot = 0;
  switch (win.wall) {
    case 'top': cx = rx + rw * win.position; cy = ry; rot = 0; break;
    case 'bottom': cx = rx + rw * win.position; cy = ry + rh; rot = 180; break;
    case 'left': cx = rx; cy = ry + rh * win.position; rot = 270; break;
    case 'right': cx = rx + rw; cy = ry + rh * win.position; rot = 90; break;
  }

  const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;

    const mx = (pos.x - stage.x()) / stage.scaleX() - rx;
    const my = (pos.y - stage.y()) / stage.scaleY() - ry;

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

  const isHoriz = win.wall === 'top' || win.wall === 'bottom';
  
  return (
    <Group 
      x={cx} y={cy} rotation={rot} 
      onPointerDown={onSelect}
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
      {/* Break the wall behind the window */}
      <Rect x={-ww / 2 - 1} y={-2} width={ww + 2} height={4} fill="#f8f9fa" />
      
      {/* Window glass and frame */}
      <Rect x={-ww / 2} y={-2} width={ww} height={4} fill={selected ? "#ef4444" : "#94a3b8"} stroke={selected ? "#ef4444" : "#64748b"} strokeWidth={1} />
      <Rect x={-ww / 2} y={-1} width={ww} height={2} fill="#e0f2fe" />
      
      {/* Center partition */}
      <Line points={[0, -2, 0, 2]} stroke={selected ? "#ef4444" : "#64748b"} strokeWidth={1.5} />

      {selected && (
        <Group x={0} y={15} rotation={-rot} 
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

