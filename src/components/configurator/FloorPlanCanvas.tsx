import { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Rect, Text, Line, Group } from 'react-konva';
import { Plan, Room } from '@/lib/floorplan';
import Konva from 'konva';

interface Props {
  plan: Plan;
  advanced?: boolean;
  onChange?: (plan: Plan) => void;
}

const GRID_FT = 1;

export const FloorPlanCanvas = ({ plan, advanced = false, onChange }: Props) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 600, h: 400 });
  const [localPlan, setLocalPlan] = useState(plan);

  useEffect(() => setLocalPlan(plan), [plan]);

  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setSize({ w: r.width, h: r.height });
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  // pixels per ft to fit the plan into the canvas
  const pad = 24;
  const scaleX = (size.w - pad * 2) / localPlan.width;
  const scaleY = (size.h - pad * 2) / localPlan.height;
  const scale = Math.max(4, Math.min(scaleX, scaleY));
  const offsetX = (size.w - localPlan.width * scale) / 2;
  const offsetY = (size.h - localPlan.height * scale) / 2;

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

  return (
    <div ref={wrapRef} className="relative h-full w-full overflow-hidden rounded-2xl bg-gradient-warm">
      <Stage width={size.w} height={size.h}>
        <Layer listening={false}>
          {/* Grid */}
          {Array.from({ length: localPlan.width + 1 }).map((_, i) => (
            <Line
              key={`v-${i}`}
              points={[offsetX + i * scale * GRID_FT, offsetY, offsetX + i * scale * GRID_FT, offsetY + localPlan.height * scale]}
              stroke="hsl(36 18% 84%)"
              strokeWidth={i % 5 === 0 ? 0.6 : 0.3}
            />
          ))}
          {Array.from({ length: localPlan.height + 1 }).map((_, i) => (
            <Line
              key={`h-${i}`}
              points={[offsetX, offsetY + i * scale * GRID_FT, offsetX + localPlan.width * scale, offsetY + i * scale * GRID_FT]}
              stroke="hsl(36 18% 84%)"
              strokeWidth={i % 5 === 0 ? 0.6 : 0.3}
            />
          ))}

          {/* Outer wall */}
          <Rect
            x={offsetX}
            y={offsetY}
            width={localPlan.width * scale}
            height={localPlan.height * scale}
            stroke="hsl(0 0% 10%)"
            strokeWidth={3}
            cornerRadius={2}
          />
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
              onDragEnd={(e) => handleDragEnd(room.id, e)}
            />
          ))}
        </Layer>

        <Layer listening={false}>
          {/* Plan dimensions */}
          <Text
            x={offsetX}
            y={offsetY + localPlan.height * scale + 8}
            text={`${localPlan.width} ft`}
            fontFamily="Urbanist"
            fontSize={11}
            fill="hsl(0 0% 35%)"
          />
          <Text
            x={offsetX - 18}
            y={offsetY + localPlan.height * scale / 2}
            text={`${localPlan.height} ft`}
            fontFamily="Urbanist"
            fontSize={11}
            fill="hsl(0 0% 35%)"
            rotation={-90}
          />
        </Layer>
      </Stage>
    </div>
  );
};

interface RoomShapeProps {
  room: Room;
  scale: number;
  offsetX: number;
  offsetY: number;
  draggable: boolean;
  onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
}

const RoomShape = ({ room, scale, offsetX, offsetY, draggable, onDragEnd }: RoomShapeProps) => {
  const [hover, setHover] = useState(false);
  return (
    <Group
      x={offsetX + room.x * scale}
      y={offsetY + room.y * scale}
      draggable={draggable}
      onDragEnd={onDragEnd}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <Rect
        width={room.w * scale}
        height={room.h * scale}
        fill={room.color}
        opacity={hover ? 0.95 : 0.85}
        stroke="hsl(0 0% 15%)"
        strokeWidth={1.2}
        cornerRadius={2}
        shadowColor="hsl(0 0% 0%)"
        shadowBlur={hover ? 10 : 0}
        shadowOpacity={0.15}
      />
      <Text
        text={room.label}
        fontFamily="Urbanist"
        fontStyle="600"
        fontSize={Math.max(9, Math.min(13, room.w * scale * 0.08))}
        fill="hsl(0 0% 12%)"
        x={6}
        y={6}
        width={room.w * scale - 12}
      />
      <Text
        text={`${room.w}′ × ${room.h}′`}
        fontFamily="Epilogue"
        fontSize={Math.max(8, Math.min(11, room.w * scale * 0.06))}
        fill="hsl(0 0% 25%)"
        x={6}
        y={room.h * scale - 16}
        width={room.w * scale - 12}
      />
    </Group>
  );
};
