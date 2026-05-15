import { ConfigState } from '@/store/configurator';
import { computeArea } from './cost';

export interface FurnitureItem {
  type: 'bed' | 'wardrobe' | 'desk' | 'nightstand' | 'toilet' | 'sink' | 'shower' | 'bathtub' |
  'stove' | 'fridge' | 'counter' | 'island' | 'dining_table' | 'sofa' | 'tv' | 'coffee_table' |
  'plant' | 'rug' | 'bookshelf' | 'washing_machine' | 'table' | 'chair';
  x: number; // relative to room
  y: number;
  w: number;
  h: number;
  rotation?: number;
  label?: string;
}

export interface DoorInfo {
  wall: 'top' | 'bottom' | 'left' | 'right';
  position: number; // 0–1 along the wall
  width: number; // ft
  swing?: 'in' | 'out';
  connectsTo?: string; // room id
  doorType?: 'standard' | 'open'; // standard = swinging door, open = archway (no door panel)
  label?: string;
}

export interface WindowInfo {
  wall: 'top' | 'bottom' | 'left' | 'right';
  position: number;
  width: number;
}

export interface Room {
  id: string;
  type: 'bedroom' | 'bathroom' | 'kitchen' | 'living' | 'dining' | 'entry' | 'hallway' | 'staircase' | 'balcony' | 'carport' | 'garden';
  label: string;
  x: number; // ft
  y: number;
  w: number;
  h: number;
  color: string;
  furniture: FurnitureItem[];
  doors: DoorInfo[];
  windows: WindowInfo[];
  orientation?: number; // 0: Top, 1: Right, 2: Bottom, 3: Left
  openWalls?: ('top' | 'bottom' | 'left' | 'right')[];
}

export interface Plan {
  width: number;  // ft
  height: number;
  rooms: Room[];
  plotEntranceX?: number;
}

const COLORS: Record<string, string> = {
  bedroom:  'hsl(33 35% 82%)',
  bathroom: 'hsl(200 30% 82%)',
  kitchen:  'hsl(28 38% 72%)',
  living:   'hsl(40 30% 87%)',
  dining:   'hsl(36 28% 82%)',
  entry:    'hsl(36 18% 76%)',
  hallway:  'hsl(38 20% 88%)',
  staircase:'hsl(38 20% 88%)',
  balcony:  'hsl(120 18% 78%)',
  carport:  'hsl(0 0% 82%)',
  garden:   'hsl(120 30% 72%)',
};

// ── Furniture helpers (all wall-aligned, walking-space aware) ──────────────

export function regenerateFurniture(room: Room, kitchenType: string = 'open'): FurnitureItem[] {
  const orient = room.orientation || 0;
  switch (room.type) {
    case 'bedroom':
      return bedroomFurniture(room.w, room.h, room.id === 'bed-0', orient);
    case 'bathroom':
      const isMasterBath = room.id === 'bath-attached-bed-0';
      return bathroomFurniture(room.w, room.h, isMasterBath, orient);
    case 'kitchen':
      return kitchenFurniture(room.w, room.h, kitchenType, orient);
    case 'living':
      return livingFurniture(room.w, room.h, orient);
    case 'dining':
      return diningFurniture(room.w, room.h);
    case 'balcony':
      return [
        { type: 'plant', x: 1, y: 0.8, w: 1.5, h: 1.5 },
        { type: 'plant', x: room.w - 2.5, y: 0.8, w: 1.5, h: 1.5 },
      ];
    case 'garden':
      return gardenFurniture(room.w, room.h);
    default:
      return room.furniture;
  }
}

function gardenFurniture(w: number, h: number): FurnitureItem[] {
  const items: FurnitureItem[] = [];
  // Scatter plants across the garden
  const cols = Math.max(2, Math.floor(w / 4));
  const rows = Math.max(2, Math.floor(h / 4));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      items.push({
        type: 'plant',
        x: 1 + c * ((w - 2) / cols),
        y: 1 + r * ((h - 2) / rows),
        w: 1.5,
        h: 1.5,
      });
    }
  }
  return items;
}

function bedroomFurniture(w: number, h: number, isMaster: boolean, orient: number = 0): FurnitureItem[] {
  const items: FurnitureItem[] = [];
  const G = 0.5;
  const bedW = isMaster ? Math.min(6, w * 0.55) : Math.min(4.5, w * 0.5);
  const bedH = isMaster ? 7 : 6;
  const wardW = Math.min(w - 4, 6); // Wardrobe is wide
  const wardH = 2.2; // Wardrobe is shallow

  if (orient === 0) {
    items.push({ type: 'bed', x: (w - bedW) / 2, y: G, w: bedW, h: bedH, rotation: 0 });
    items.push({ type: 'wardrobe', x: w - G - wardH/2 - wardW/2, y: h/2 - wardW/2, w: wardW, h: wardH, rotation: 90 });
  } else if (orient === 1) {
    items.push({ type: 'bed', x: w - G - bedH/2 - bedW/2, y: h/2 - bedH/2, w: bedW, h: bedH, rotation: 90 });
    items.push({ type: 'wardrobe', x: (w - wardW) / 2, y: G, w: wardW, h: wardH, rotation: 0 });
  } else if (orient === 2) {
    items.push({ type: 'bed', x: (w - bedW) / 2, y: h - G - bedH, w: bedW, h: bedH, rotation: 180 });
    items.push({ type: 'wardrobe', x: G + wardH/2 - wardW/2, y: h/2 - wardW/2, w: wardW, h: wardH, rotation: 270 });
  } else if (orient === 3) {
    items.push({ type: 'bed', x: G + bedH/2 - bedW/2, y: h/2 - bedH/2, w: bedW, h: bedH, rotation: 270 });
    items.push({ type: 'wardrobe', x: (w - wardW) / 2, y: h - G - wardH, w: wardW, h: wardH, rotation: 180 });
  }
  return items;
}

function bathroomFurniture(w: number, h: number, isMaster: boolean, orient: number = 0): FurnitureItem[] {
  const items: FurnitureItem[] = [];
  const G = 0.4;
  const sinkW = 2.2, sinkH = 1.6;
  const toiletW = 1.6, toiletH = 2.2;
  const showerW = isMaster ? 2.6 : 3, showerH = isMaster ? 5 : 3;

  if (orient === 0) {
    items.push({ type: 'sink', x: w - sinkW - G, y: G, w: sinkW, h: sinkH, rotation: 0 });
    items.push({ type: 'toilet', x: w - toiletW - G, y: h - toiletH - G, w: toiletW, h: toiletH, rotation: 0 });
    items.push({ type: 'shower', x: G, y: h - showerH - G, w: showerW, h: showerH, rotation: 0 });
  } else if (orient === 1) {
    items.push({ type: 'sink', x: w - G - sinkH/2 - sinkW/2, y: G + sinkW/2 - sinkH/2, w: sinkW, h: sinkH, rotation: 90 });
    items.push({ type: 'toilet', x: w - G - toiletH/2 - toiletW/2, y: h - G - toiletW/2 - toiletH/2, w: toiletW, h: toiletH, rotation: 90 });
    items.push({ type: 'shower', x: G + showerH/2 - showerW/2, y: h - G - showerW/2 - showerH/2, w: showerW, h: showerH, rotation: 90 });
  } else if (orient === 2) {
    items.push({ type: 'sink', x: G, y: h - sinkH - G, w: sinkW, h: sinkH, rotation: 180 });
    items.push({ type: 'toilet', x: G, y: G, w: toiletW, h: toiletH, rotation: 180 });
    items.push({ type: 'shower', x: w - showerW - G, y: G, w: showerW, h: showerH, rotation: 180 });
  } else if (orient === 3) {
    items.push({ type: 'sink', x: G + sinkH/2 - sinkW/2, y: h - G - sinkW/2 - sinkH/2, w: sinkW, h: sinkH, rotation: 270 });
    items.push({ type: 'toilet', x: G + toiletH/2 - toiletW/2, y: G + toiletW/2 - toiletH/2, w: toiletW, h: toiletH, rotation: 270 });
    items.push({ type: 'shower', x: w - G - showerH/2 - showerW/2, y: G + showerW/2 - showerH/2, w: showerW, h: showerH, rotation: 270 });
  }
  return items;
}

function kitchenFurniture(w: number, h: number, kitchenType: string, orient: number = 0): FurnitureItem[] {
  const items: FurnitureItem[] = [];
  const G = 0.4;
  
  if (kitchenType === 'open') {
    // OPEN: Island + Back Counter
    items.push({ type: 'counter', x: G, y: G, w: w - 2*G, h: 2, rotation: 0 });
    items.push({ type: 'stove', x: w * 0.2, y: G + 0.1, w: 2.5, h: 1.6, rotation: 0 });
    items.push({ type: 'fridge', x: w - 2.5 - G, y: G + 0.1, w: 2.2, h: 2.2, rotation: 0 });
    items.push({ type: 'island', x: (w - 6) / 2, y: h * 0.4, w: 6, h: 3, rotation: 0 });
  } else if (kitchenType === 'galley') {
    // GALLEY: Two parallel vertical counters
    items.push({ type: 'counter', x: G, y: G, w: 2, h: h - 2*G, rotation: 0 });
    items.push({ type: 'counter', x: w - 2 - G, y: G, w: 2, h: h - 2*G, rotation: 0 });
    items.push({ type: 'stove', x: G + 0.1, y: h * 0.3, w: 1.6, h: 2.5, rotation: 0 });
    items.push({ type: 'fridge', x: w - G - 2.1, y: h * 0.6, w: 2.2, h: 2.2, rotation: 0 });
  } else {
    // STANDARD (based on orientation)
    const cW = w - 2 * G - 2.2;
    const cH = h - 2 * G - 2.2;
    const cD = 2;

    if (orient === 0) {
      items.push({ type: 'counter', x: G, y: G, w: cW, h: cD, rotation: 0 });
      items.push({ type: 'stove',   x: G + cW * 0.4, y: G + 0.1, w: 2.5, h: 1.6, rotation: 0 });
      items.push({ type: 'fridge',  x: w - 2.2 - G, y: G + 0.1, w: 2.2, h: 2.2, rotation: 0 });
    } else if (orient === 1) {
      items.push({ type: 'counter', x: w - G - cD, y: G, w: cD, h: cH, rotation: 0 });
      items.push({ type: 'stove',   x: w - G - 1.6 - 0.1, y: G + cH * 0.4, w: 1.6, h: 2.5, rotation: 0 });
      items.push({ type: 'fridge',  x: w - G - 2.2 - 0.1, y: h - G - 2.2, w: 2.2, h: 2.2, rotation: 0 });
    } else if (orient === 2) {
      items.push({ type: 'counter', x: G, y: h - G - cD, w: cW, h: cD, rotation: 0 });
      items.push({ type: 'stove',   x: G + cW * 0.4, y: h - G - 1.6 - 0.1, w: 2.5, h: 1.6, rotation: 0 });
      items.push({ type: 'fridge',  x: w - 2.2 - G, y: h - G - 2.2 - 0.1, w: 2.2, h: 2.2, rotation: 0 });
    } else if (orient === 3) {
      items.push({ type: 'counter', x: G, y: G, w: cD, h: cH, rotation: 0 });
      items.push({ type: 'stove',   x: G + 0.1, y: G + cH * 0.4, w: 1.6, h: 2.5, rotation: 0 });
      items.push({ type: 'fridge',  x: G + 0.1, y: h - G - 2.2, w: 2.2, h: 2.2, rotation: 0 });
    }
  }
  return items;
}

function livingFurniture(w: number, h: number, orient: number = 0): FurnitureItem[] {
  const items: FurnitureItem[] = [];
  const G = 0.5;
  const tvW = Math.min(5.5, w * 0.4);
  const sofaW = Math.min(8, w * 0.6);

  if (orient === 0) {
    items.push({ type: 'tv', x: (w - tvW) / 2, y: G, w: tvW, h: 1.2, rotation: 0 });
    items.push({ type: 'sofa', x: (w - sofaW) / 2, y: h - 3 - G, w: sofaW, h: 3, rotation: 180 });
  } else if (orient === 1) {
    items.push({ type: 'tv', x: w - G - 0.6 - tvW/2, y: h/2 - 0.6, w: tvW, h: 1.2, rotation: 90 });
    items.push({ type: 'sofa', x: G + 1.5 - sofaW/2, y: h/2 - 1.5, w: sofaW, h: 3, rotation: 270 });
  } else if (orient === 2) {
    items.push({ type: 'tv', x: (w - tvW) / 2, y: h - G - 1.2, w: tvW, h: 1.2, rotation: 180 });
    items.push({ type: 'sofa', x: (w - sofaW) / 2, y: G, w: sofaW, h: 3, rotation: 0 });
  } else if (orient === 3) {
    items.push({ type: 'tv', x: G + 0.6 - tvW/2, y: h/2 - 0.6, w: tvW, h: 1.2, rotation: 270 });
    items.push({ type: 'sofa', x: w - G - 1.5 - sofaW/2, y: h/2 - 1.5, w: sofaW, h: 3, rotation: 90 });
  } else if (orient === 4) {
    items.push({ type: 'tv', x: (w - tvW) / 2, y: G, w: tvW, h: 1.2, rotation: 0 });
    items.push({ type: 'sofa', x: (w - sofaW) / 2, y: h/2 - 1.5, w: sofaW, h: 3, rotation: 180 });
  }

  return items;
}

function diningFurniture(w: number, h: number): FurnitureItem[] {
  const tableW = Math.min(5, w * 0.65);
  const tableH = Math.min(3, h * 0.45);
  return [
    { type: 'dining_table', x: (w - tableW) / 2, y: (h - tableH) / 2, w: tableW, h: tableH },
  ];
}

// ── Door connectivity ──────────────────────────────────────────────────────

/** Returns true if two rooms share a wall boundary */
function roomsAreAdjacent(a: Room, b: Room): { shared: boolean; wall: 'top'|'bottom'|'left'|'right' } {
  const EPS = 0.5;
  if (Math.abs((a.x + a.w) - b.x) < EPS && overlaps1D(a.y, a.y + a.h, b.y, b.y + b.h)) {
    return { shared: true, wall: 'right' };
  }
  if (Math.abs(a.x - (b.x + b.w)) < EPS && overlaps1D(a.y, a.y + a.h, b.y, b.y + b.h)) {
    return { shared: true, wall: 'left' };
  }
  if (Math.abs((a.y + a.h) - b.y) < EPS && overlaps1D(a.x, a.x + a.w, b.x, b.x + b.w)) {
    return { shared: true, wall: 'bottom' };
  }
  if (Math.abs(a.y - (b.y + b.h)) < EPS && overlaps1D(a.x, a.x + a.w, b.x, b.x + b.w)) {
    return { shared: true, wall: 'top' };
  }
  return { shared: false, wall: 'top' };
}

function overlaps1D(a0: number, a1: number, b0: number, b1: number): boolean {
  return Math.min(a1, b1) - Math.max(a0, b0) > 1.0;
}

function sharedWallMidpoint(a: Room, wall: 'top'|'bottom'|'left'|'right', b: Room): number {
  if (wall === 'top' || wall === 'bottom') {
    const lo = Math.max(a.x, b.x);
    const hi = Math.min(a.x + a.w, b.x + b.w);
    const mid = (lo + hi) / 2;
    return (mid - a.x) / a.w;
  } else {
    const lo = Math.max(a.y, b.y);
    const hi = Math.min(a.y + a.h, b.y + b.h);
    const mid = (lo + hi) / 2;
    return (mid - a.y) / a.h;
  }
}

function getDoorType(roomTypeA: Room['type'], roomTypeB: Room['type']): 'standard' | 'open' {
  const openTypes: Room['type'][] = ['living', 'kitchen', 'dining'];
  // If BOTH rooms are open-type (living↔kitchen, kitchen↔dining, etc.), use open door
  if (openTypes.includes(roomTypeA) && openTypes.includes(roomTypeB)) return 'open';
  // Bedroom and bathroom always get standard doors
  if (roomTypeA === 'bedroom' || roomTypeB === 'bedroom') return 'standard';
  if (roomTypeA === 'bathroom' || roomTypeB === 'bathroom') return 'standard';
  return 'open';
}

function injectAdjacencyDoors(rooms: Room[]): void {
  const connected = new Set<string>();
  const hasDining = rooms.some(r => r.type === 'dining');
  const hasHallway = rooms.some(r => r.type === 'hallway' || r.type === 'staircase');

  const hasEntrance = (room: Room) => room.doors.some(d => {
    const c = rooms.find(r => r.id === d.connectsTo);
    return c && (c.type === 'hallway' || c.type === 'staircase' || c.type === 'living');
  });

  // In no-hallway plans, check if bedroom already has any entrance (to living/kitchen/dining)
  const hasAnyEntrance = (room: Room) => room.doors.some(d => {
    const c = rooms.find(r => r.id === d.connectsTo);
    return c && (c.type === 'hallway' || c.type === 'staircase' || c.type === 'living' || c.type === 'kitchen' || c.type === 'dining');
  });

  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      const a = rooms[i];
      const b = rooms[j];
      const key = [a.id, b.id].sort().join('|');
      if (connected.has(key)) continue;

      if (a.type === 'carport' || b.type === 'carport') continue;
      if (a.type === 'garden' || b.type === 'garden') continue;

      const types = [a.type, b.type];

      // Skip balcony connections to kitchen/dining/bathroom (balcony only connects to living/bedroom)
      if (types.includes('balcony') && ['kitchen', 'dining', 'bathroom'].some(t => types.includes(t as any))) continue;
      
      if (a.type === 'bedroom' && b.type === 'bedroom') continue;

      if (hasDining && types.includes('kitchen')) {
        if (types.includes('hallway') || types.includes('staircase') || types.includes('living')) continue;
      }

      if (types.includes('bathroom') && types.includes('bedroom')) {
        const bath = a.type === 'bathroom' ? a : b;
        const bed = a.type === 'bedroom' ? a : b;
        if (bath.id !== `bath-attached-${bed.id}`) {
          // In no-hallway plans, allow non-attached bath to connect to a bedroom as fallback
          if (hasHallway) continue;
          if (bath.doors.length >= 1) continue;
        }
      }
      
      if (types.includes('bathroom') && (types.includes('hallway') || types.includes('staircase'))) {
        const bath = a.type === 'bathroom' ? a : b;
        if (bath.id.includes('attached')) continue;
      }

      if (a.type === 'bathroom' && b.type === 'bathroom') continue;

      // Bathroom connections to living/kitchen/dining
      if (types.includes('bathroom') && ['living', 'kitchen', 'dining'].some(t => types.includes(t as any))) {
        if (hasHallway) continue;
        // In no-hallway plans, allow non-attached bathroom connections
        const bath = a.type === 'bathroom' ? a : b;
        if (bath.id.includes('attached')) continue;
      }

      if (a.type === 'bathroom' && a.doors.length >= 1) continue;
      if (b.type === 'bathroom' && b.doors.length >= 1) continue;

      if (a.type === 'bedroom' && ['hallway', 'staircase', 'living'].includes(b.type)) {
        if (hasEntrance(a)) continue;
      }
      if (b.type === 'bedroom' && ['hallway', 'staircase', 'living'].includes(a.type)) {
        if (hasEntrance(b)) continue;
      }

      // Bedroom↔kitchen/dining: block in hallway plans, allow in no-hallway plans as fallback
      if (types.includes('bedroom') && ['kitchen', 'dining'].some(t => types.includes(t as any))) {
        if (hasHallway) continue;
        // In no-hallway plans, only allow if bedroom has no entrance yet
        const bed = a.type === 'bedroom' ? a : b;
        if (hasAnyEntrance(bed)) continue;
      }

      const adj = roomsAreAdjacent(a, b);
      if (!adj.shared) continue;

      const posA = sharedWallMidpoint(a, adj.wall, b);
      const oppositeWall: Record<string, DoorInfo['wall']> = {
        top: 'bottom', bottom: 'top', left: 'right', right: 'left',
      };
      const posB = sharedWallMidpoint(b, oppositeWall[adj.wall], a);

      const clamp = (v: number) => Math.max(0.15, Math.min(0.85, v));

      const aHasDoor = a.doors.some(d => d.wall === adj.wall && Math.abs(d.position - clamp(posA)) < 0.25);
      const bHasDoor = b.doors.some(d => d.wall === oppositeWall[adj.wall] && Math.abs(d.position - clamp(posB)) < 0.25);

      let doorW = types.includes('bathroom') ? 2.5 : 3;
      const doorType = getDoorType(a.type, b.type);

      if (!aHasDoor) {
        a.doors.push({ wall: adj.wall, position: clamp(posA), width: doorW, swing: 'in', connectsTo: b.id, doorType });
      }
      if (!bHasDoor) {
        b.doors.push({ wall: oppositeWall[adj.wall], position: clamp(posB), width: doorW, swing: 'in', connectsTo: a.id, doorType });
      }

      connected.add(key);
    }
  }
}

// ── Validation ─────────────────────────────────────────────────────────────

function cleanupDoors(rooms: Room[]): void {
  const hasHallway = rooms.some(r => r.type === 'hallway' || r.type === 'staircase');

  for (const room of rooms) {
    if (room.type === 'bathroom') {
      const isAttached = room.id.includes('attached');
      const targetBedId = isAttached ? room.id.replace('bath-attached-', '') : null;

      let validDoorFound = false;
      const validDoors: DoorInfo[] = [];

      for (const door of room.doors) {
        if (!door.connectsTo) continue;

        const connectedRoom = rooms.find(r => r.id === door.connectsTo);
        if (!connectedRoom) continue;

        let isValid = false;
        if (isAttached) {
          isValid = (connectedRoom.id === targetBedId);
        } else {
          // Non-attached bath: connect to hallway, or any accessible room if no hallway
          if (hasHallway) {
            isValid = (connectedRoom.type === 'hallway' || connectedRoom.type === 'staircase');
          } else {
            isValid = ['living', 'kitchen', 'dining', 'hallway', 'staircase', 'bedroom'].includes(connectedRoom.type);
          }
        }

        if (isValid && !validDoorFound) {
          validDoors.push(door);
          validDoorFound = true;
        } else {
          connectedRoom.doors = connectedRoom.doors.filter(d => d.connectsTo !== room.id);
        }
      }

      room.doors = validDoors;
    }
  }

  for (const room of rooms) {
    if (room.type === 'bedroom') {
      let entranceFound = false;
      const validDoors: DoorInfo[] = [];

      for (const door of room.doors) {
        if (!door.connectsTo) {
          validDoors.push(door);
          continue;
        }

        const connectedRoom = rooms.find(r => r.id === door.connectsTo);
        if (!connectedRoom) {
          validDoors.push(door);
          continue;
        }

        if (connectedRoom.type === 'bathroom' || connectedRoom.type === 'balcony') {
          validDoors.push(door);
        } else if (connectedRoom.type === 'hallway' || connectedRoom.type === 'staircase' || connectedRoom.type === 'living') {
          if (!entranceFound) {
            validDoors.push(door);
            entranceFound = true;
          } else {
            connectedRoom.doors = connectedRoom.doors.filter(d => d.connectsTo !== room.id);
          }
        } else if (!hasHallway && (connectedRoom.type === 'kitchen' || connectedRoom.type === 'dining')) {
          // In no-hallway plans, allow kitchen/dining as entrance fallback
          if (!entranceFound) {
            validDoors.push(door);
            entranceFound = true;
          } else {
            connectedRoom.doors = connectedRoom.doors.filter(d => d.connectsTo !== room.id);
          }
        } else {
          connectedRoom.doors = connectedRoom.doors.filter(d => d.connectsTo !== room.id);
        }
      }
      room.doors = validDoors;
    }
  }
}

function validateAndFixBathrooms(rooms: Room[]): void {
  const baths = rooms.filter(r => r.type === 'bathroom');
  if (baths.length === 0) return;

  const masterBath = baths.find(b => b.id === 'bath-attached-bed-0');
  if (!masterBath) return;

  const masterArea = masterBath.w * masterBath.h;
  
  for (const bath of baths) {
    if (bath.id === masterBath.id) continue;
    
    const area = bath.w * bath.h;
    if (area >= masterArea) {
      const scale = Math.sqrt((masterArea / 1.25) / area);
      bath.w = Math.max(5, bath.w * scale);
      bath.h = Math.max(7, bath.h * scale);
    }
  }
}

type AbsorbDirection = 'left' | 'right' | 'top' | 'bottom';

function overlapLength(a0: number, a1: number, b0: number, b1: number): number {
  return Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));
}

function findAbsorptionDirection(candidate: Room, removed: Room): AbsorbDirection | null {
  const EPS = 0.75;
  const xOverlap = overlapLength(candidate.x, candidate.x + candidate.w, removed.x, removed.x + removed.w);
  const yOverlap = overlapLength(candidate.y, candidate.y + candidate.h, removed.y, removed.y + removed.h);

  if (Math.abs((candidate.x + candidate.w) - removed.x) <= EPS && yOverlap > 0.5) return 'right';
  if (Math.abs(candidate.x - (removed.x + removed.w)) <= EPS && yOverlap > 0.5) return 'left';
  if (Math.abs((candidate.y + candidate.h) - removed.y) <= EPS && xOverlap > 0.5) return 'bottom';
  if (Math.abs(candidate.y - (removed.y + removed.h)) <= EPS && xOverlap > 0.5) return 'top';
  return null;
}

function absorbRemovedRoomSpace(rooms: Room[], removedRoom: Room, c: ConfigState): void {
  const typePriority: Partial<Record<Room['type'], Partial<Record<Room['type'], number>>>> = {
    bedroom:   { bedroom: 5, hallway: 4, staircase: 4, living: 3, dining: 2, kitchen: 2, bathroom: 1, balcony: 0, carport: 0, garden: 0, entry: 0 },
    bathroom:  { bathroom: 5, hallway: 4, staircase: 4, bedroom: 3, living: 2, kitchen: 1, dining: 1, balcony: 0, carport: 0, garden: 0, entry: 0 },
    kitchen:   { kitchen: 5, dining: 4, living: 3, hallway: 2, staircase: 2, bedroom: 1, bathroom: 1, balcony: 0, carport: 0, garden: 0, entry: 0 },
    living:    { living: 5, dining: 4, hallway: 3, staircase: 3, kitchen: 3, bedroom: 2, bathroom: 1, balcony: 0, carport: 0, garden: 0, entry: 0 },
    dining:    { dining: 5, kitchen: 4, living: 3, hallway: 2, staircase: 2, bedroom: 1, bathroom: 1, balcony: 0, carport: 0, garden: 0, entry: 0 },
    balcony:   { balcony: 5, garden: 4, living: 3, hallway: 2, staircase: 2, bedroom: 1, bathroom: 1, kitchen: 1, carport: 0, entry: 0, dining: 0 },
    carport:   { carport: 5, garden: 4, hallway: 2, staircase: 2, living: 1, bedroom: 0, bathroom: 0, kitchen: 0, dining: 0, balcony: 0, entry: 0 },
    garden:    { garden: 5, balcony: 4, carport: 3, living: 2, hallway: 2, staircase: 2, bedroom: 1, bathroom: 1, kitchen: 1, dining: 1, entry: 0 },
    entry:     { entry: 5, hallway: 4, staircase: 4, living: 3, bedroom: 2, bathroom: 1, kitchen: 1, dining: 1, balcony: 0, carport: 0, garden: 0 },
    hallway:   { hallway: 5, staircase: 5, living: 4, dining: 3, kitchen: 3, bedroom: 2, bathroom: 2, balcony: 1, carport: 1, garden: 1, entry: 3 },
    staircase: { staircase: 5, hallway: 5, living: 4, dining: 3, kitchen: 3, bedroom: 2, bathroom: 2, balcony: 1, carport: 1, garden: 1, entry: 3 },
  };

  let bestCandidate: Room | null = null;
  let bestDirection: AbsorbDirection | null = null;
  let bestScore = -1;

  for (const candidate of rooms) {
    if (candidate.id === removedRoom.id) continue;
    const direction = findAbsorptionDirection(candidate, removedRoom);
    if (!direction) continue;

    const overlap = direction === 'left' || direction === 'right'
      ? overlapLength(candidate.y, candidate.y + candidate.h, removedRoom.y, removedRoom.y + removedRoom.h)
      : overlapLength(candidate.x, candidate.x + candidate.w, removedRoom.x, removedRoom.x + removedRoom.w);

    const baseScore = typePriority[removedRoom.type]?.[candidate.type] ?? 0;
    const score = baseScore * 100 + overlap;

    if (score > bestScore) {
      bestScore = score;
      bestCandidate = candidate;
      bestDirection = direction;
    }
  }

  if (!bestCandidate || !bestDirection) return;

  switch (bestDirection) {
    case 'left':
      bestCandidate.x = Math.min(bestCandidate.x, removedRoom.x);
      bestCandidate.w = Math.max(bestCandidate.x + bestCandidate.w, removedRoom.x + removedRoom.w) - bestCandidate.x;
      break;
    case 'right':
      bestCandidate.w = Math.max(bestCandidate.x + bestCandidate.w, removedRoom.x + removedRoom.w) - bestCandidate.x;
      break;
    case 'top':
      bestCandidate.y = Math.min(bestCandidate.y, removedRoom.y);
      bestCandidate.h = Math.max(bestCandidate.y + bestCandidate.h, removedRoom.y + removedRoom.h) - bestCandidate.y;
      break;
    case 'bottom':
      bestCandidate.h = Math.max(bestCandidate.y + bestCandidate.h, removedRoom.y + removedRoom.h) - bestCandidate.y;
      break;
  }

  if (['bedroom', 'bathroom', 'kitchen', 'living', 'dining', 'balcony', 'garden'].includes(bestCandidate.type)) {
    bestCandidate.furniture = regenerateFurniture(bestCandidate, c.kitchen);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ── PRESET-BASED PLAN GENERATION ──────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

// Each home type has 2 presets with unique layouts scaled to their target sqft.
// Family and Premium presets include a front corner garden.

// ── STARTER PRESETS (1000 sqft → ~25×40) ─────────────────────────────────

function starterPresetA(c: ConfigState): Plan {
  const W = 28;
  const H = 40;
  const rooms: Room[] = [];

  // Left side
  rooms.push({
    id: 'living', type: 'living', label: 'HALL + LIVING ROOM',
    x: 0, y: 0, w: 14, h: 18,
    color: COLORS.living,
    furniture: livingFurniture(14, 18, 4),
    openWalls: ['right'],
    doors: [
      { wall: 'left', position: 0.15, width: 3.5, swing: 'in', doorType: 'standard' },
      { wall: 'bottom', position: 0.5, width: 3.5, swing: 'out', doorType: 'open', connectsTo: 'dining' }
    ],
    windows: [{ wall: 'left', position: 0.5, width: 5 }, { wall: 'top', position: 0.5, width: 6 }],
  });

  rooms.push({
    id: 'dining', type: 'dining', label: 'DINING',
    x: 0, y: 18, w: 14, h: 10,
    color: COLORS.dining,
    furniture: diningFurniture(14, 10),
    doors: [
      { wall: 'top', position: 0.5, width: 3.5, swing: 'in', doorType: 'open', connectsTo: 'living' },
      { wall: 'bottom', position: 0.5, width: 3.5, swing: 'out', doorType: 'open', connectsTo: 'kitchen' },
      { wall: 'right', position: 0.5, width: 3.5, swing: 'in', doorType: 'open', connectsTo: 'main-hallway' }
    ],
    windows: [{ wall: 'left', position: 0.5, width: 4 }],
  });

  rooms.push({
    id: 'kitchen', type: 'kitchen', label: 'KITCHEN',
    x: 0, y: 28, w: 14, h: 8,
    color: COLORS.kitchen,
    furniture: kitchenFurniture(14, 8, c.kitchen, 2),
    doors: [
      { wall: 'top', position: 0.5, width: 3.5, swing: 'in', doorType: 'open', connectsTo: 'dining' }
    ],
    windows: [{ wall: 'left', position: 0.5, width: 4 }], // Left center
  });

  // Center Hallway
  rooms.push({
    id: 'main-hallway', type: 'hallway', label: 'HALLWAY',
    x: 14, y: 0, w: 4, h: 36,
    color: COLORS.hallway,
    openWalls: ['left'],
    furniture: [],
    doors: [
      { wall: 'left', position: 23/36, width: 3.5, swing: 'out', doorType: 'open', connectsTo: 'dining' },
      { wall: 'right', position: 8/36, width: 3, swing: 'in', doorType: 'standard', connectsTo: 'bed-0' },
      { wall: 'right', position: 20/36, width: 2.5, swing: 'in', doorType: 'standard', connectsTo: 'bath-common-1' },
      { wall: 'right', position: 30/36, width: 3, swing: 'in', doorType: 'standard', connectsTo: 'bed-1' },
      { wall: 'bottom', position: 0.5, width: 3.5, swing: 'in', doorType: 'standard', connectsTo: 'balcony' }
    ],
    windows: [],
  });

  // Right side
  rooms.push({
    id: 'bed-0', type: 'bedroom', label: 'MASTER BEDROOM',
    x: 18, y: 0, w: 10, h: 16,
    color: COLORS.bedroom,
    furniture: bedroomFurniture(10, 16, true, 1),
    doors: [
      { wall: 'left', position: 0.5, width: 3, swing: 'out', doorType: 'standard', connectsTo: 'main-hallway' }
    ],
    windows: [{ wall: 'right', position: 0.5, width: 4 }, { wall: 'top', position: 0.5, width: 4 }], // Right middle
  });

  rooms.push({
    id: 'bath-common-1', type: 'bathroom', label: 'COMMON BATH',
    x: 18, y: 16, w: 10, h: 8,
    color: COLORS.bathroom,
    furniture: bathroomFurniture(10, 8, false, 1),
    doors: [
      { wall: 'left', position: 0.5, width: 2.5, swing: 'out', doorType: 'standard', connectsTo: 'main-hallway' }
    ],
    windows: [{ wall: 'right', position: 0.25, width: 3 }], // Right top middle
  });

  rooms.push({
    id: 'bed-1', type: 'bedroom', label: 'BEDROOM 2',
    x: 18, y: 24, w: 10, h: 12,
    color: COLORS.bedroom,
    furniture: bedroomFurniture(10, 12, false, 1),
    doors: [
      { wall: 'left', position: 0.5, width: 3, swing: 'out', doorType: 'standard', connectsTo: 'main-hallway' }
    ],
    windows: [{ wall: 'right', position: 0.5, width: 4 }], // Right middle
  });

  rooms.push({
    id: 'balcony', type: 'balcony', label: 'BALCONY',
    x: 0, y: 36, w: 28, h: 4,
    color: COLORS.balcony,
    furniture: [
      { type: 'plant', x: 2, y: 1.5, w: 1.5, h: 1.5 },
      { type: 'plant', x: 26, y: 1.5, w: 1.5, h: 1.5 },
    ],
    doors: [
      { wall: 'top', position: 16/28, width: 3.5, swing: 'out', doorType: 'standard', connectsTo: 'main-hallway' }
    ],
    windows: [],
  });

  // We skip injectAdjacencyDoors to strictly enforce this highly logical preset
  // but we still run standard validators just in case
  validateAndFixBathrooms(rooms);

  return { width: W, height: H, rooms };
}

// ── FAMILY PRESETS (1600 sqft → ~32×50) ──────────────────────────────────

function familyPresetA(c: ConfigState): Plan {
  const W = 40;
  const H = 40;
  const rooms: Room[] = [];

  rooms.push({
    id: 'balcony', type: 'garden', label: 'GARDEN',
    x: 0, y: 36, w: 40, h: 4,
    color: COLORS.garden,
    furniture: [
      { type: 'plant', x: 2, y: 1.5, w: 1.5, h: 1.5 },
      { type: 'plant', x: 38, y: 1.5, w: 1.5, h: 1.5 },
    ],
    doors: [
      { wall: 'top', position: 14/40, width: 3.5, swing: 'out', doorType: 'standard', connectsTo: 'main-hallway' }
    ],
    windows: [],
  });

  rooms.push({
    id: 'garden', type: 'balcony', label: 'COVERED PATIO',
    x: 0, y: 0, w: 12, h: 10,
    color: COLORS.balcony,
    furniture: [
      { type: 'plant', x: 2, y: 2, w: 2, h: 2 },
      { type: 'plant', x: 8, y: 2, w: 2, h: 2 },
      { type: 'plant', x: 2, y: 6, w: 2, h: 2 },
      { type: 'plant', x: 8, y: 6, w: 2, h: 2 }
    ],
    doors: [
      { wall: 'right', position: 0.5, width: 4, swing: 'in', doorType: 'standard', connectsTo: 'living' }
    ],
    windows: [],
  });

  rooms.push({
    id: 'dining', type: 'dining', label: 'DINING',
    x: 0, y: 10, w: 12, h: 14,
    color: COLORS.dining,
    furniture: [{ type: 'dining_table', x: 2, y: 4, w: 8, h: 6, rotation: 0 }],
    doors: [
      { wall: 'bottom', position: 0.5, width: 3.5, swing: 'out', doorType: 'open', connectsTo: 'kitchen' },
      { wall: 'right', position: 0.8, width: 3.5, swing: 'out', doorType: 'open', connectsTo: 'main-hallway' }
    ],
    windows: [{ wall: 'left', position: 0.5, width: 4 }],
  });

  rooms.push({
    id: 'kitchen', type: 'kitchen', label: 'KITCHEN',
    x: 0, y: 24, w: 12, h: 12,
    color: COLORS.kitchen,
    furniture: kitchenFurniture(12, 12, c.kitchen, 1),
    doors: [
      { wall: 'right', position: 0.5, width: 3.5, swing: 'out', doorType: 'open', connectsTo: 'main-hallway' }
    ],
    windows: [{ wall: 'left', position: 0.5, width: 4 }],
  });

  rooms.push({
    id: 'living', type: 'living', label: 'HALL + LIVING ROOM',
    x: 12, y: 0, w: 14, h: 16,
    color: COLORS.living,
    openWalls: ['bottom'],
    furniture: livingFurniture(14, 16, 4),
    doors: [],
    windows: [{ wall: 'top', position: 0.5, width: 5 }],
  });

  rooms.push({
    id: 'main-hallway', type: 'hallway', label: 'HALLWAY',
    x: 12, y: 16, w: 4, h: 20,
    color: COLORS.hallway,
    openWalls: ['top', 'right'],
    furniture: [],
    doors: [],
    windows: [],
  });

  rooms.push({
    id: 'sub-hallway', type: 'hallway', label: '',
    x: 16, y: 22, w: 24, h: 4,
    color: COLORS.hallway,
    openWalls: ['left'],
    furniture: [],
    doors: [],
    windows: [],
  });

  rooms.push({
    id: 'bed-0', type: 'bedroom', label: 'MASTER BEDROOM',
    x: 26, y: 0, w: 14, h: 16,
    color: COLORS.bedroom,
    furniture: bedroomFurniture(14, 16, true, 1),
    doors: [
      { wall: 'left', position: 0.8, width: 3.5, swing: 'out', doorType: 'standard', connectsTo: 'living' }
    ],
    windows: [{ wall: 'right', position: 0.5, width: 5 }],
  });

  rooms.push({
    id: 'bath-master', type: 'bathroom', label: 'MASTER BATH',
    x: 26, y: 16, w: 14, h: 6,
    color: COLORS.bathroom,
    furniture: bathroomFurniture(14, 6, true, 0),
    doors: [
      { wall: 'top', position: 0.5, width: 2.5, swing: 'in', doorType: 'standard', connectsTo: 'bed-0' }
    ],
    windows: [{ wall: 'right', position: 0.5, width: 3 }],
  });

  rooms.push({
    id: 'bath-common-1', type: 'bathroom', label: 'COMMON BATH',
    x: 16, y: 16, w: 10, h: 6,
    color: COLORS.bathroom,
    furniture: bathroomFurniture(10, 6, false, 0),
    doors: [
      { wall: 'bottom', position: 0.5, width: 2.5, swing: 'out', doorType: 'standard', connectsTo: 'sub-hallway' }
    ],
    windows: [],
  });

  rooms.push({
    id: 'bed-1', type: 'bedroom', label: 'BEDROOM 2',
    x: 16, y: 26, w: 12, h: 10,
    color: COLORS.bedroom,
    furniture: bedroomFurniture(12, 10, false, 0),
    doors: [
      { wall: 'top', position: 0.5, width: 3, swing: 'in', doorType: 'standard', connectsTo: 'sub-hallway' }
    ],
    windows: [{ wall: 'bottom', position: 0.5, width: 4 }],
  });

  rooms.push({
    id: 'bed-2', type: 'bedroom', label: 'BEDROOM 3',
    x: 28, y: 26, w: 12, h: 10,
    color: COLORS.bedroom,
    furniture: bedroomFurniture(12, 10, false, 0),
    doors: [
      { wall: 'top', position: 0.5, width: 3, swing: 'in', doorType: 'standard', connectsTo: 'sub-hallway' }
    ],
    windows: [{ wall: 'right', position: 0.5, width: 4 }, { wall: 'bottom', position: 0.5, width: 4 }],
  });

  validateAndFixBathrooms(rooms);
  return { width: W, height: H, rooms };
}

// ── PREMIUM PRESETS (2400 sqft → ~40×60) ─────────────────────────────────

function premiumPresetA(c: ConfigState): Plan {
  const W = 48;
  const H = 50;
  const rooms: Room[] = [];

  // Bottom Balcony
  rooms.push({
    id: 'balcony', type: 'balcony', label: 'BALCONY',
    x: 0, y: 46, w: 48, h: 4,
    color: COLORS.balcony,
    furniture: [
      { type: 'plant', x: 2, y: 1.5, w: 1.5, h: 1.5 },
      { type: 'plant', x: 46, y: 1.5, w: 1.5, h: 1.5 },
    ],
    doors: [],
    windows: [],
  });

  // Vertical Hallway
  rooms.push({
    id: 'main-hallway', type: 'hallway', label: 'HALLWAY',
    x: 34, y: 0, w: 4, h: 46,
    color: COLORS.hallway,
    openWalls: ['left'],
    furniture: [],
    doors: [
      { wall: 'bottom', position: 0.5, width: 3.5, swing: 'out', doorType: 'standard', connectsTo: 'balcony' }
    ],
    windows: [],
  });

  // LEFT ZONE
  rooms.push({
    id: 'garden', type: 'garden', label: 'GARDEN',
    x: 0, y: 0, w: 14, h: 14,
    color: COLORS.garden,
    furniture: gardenFurniture(14, 14),
    doors: [],
    windows: [],
  });

  rooms.push({
    id: 'kitchen', type: 'kitchen', label: 'KITCHEN',
    x: 0, y: 14, w: 14, h: 16,
    color: COLORS.kitchen,
    furniture: kitchenFurniture(14, 16, c.kitchen, 3),
    doors: [
      { wall: 'bottom', position: 0.5, width: 3.5, swing: 'out', doorType: 'open', connectsTo: 'dining' },
      { wall: 'right', position: 0.5, width: 3.5, swing: 'out', doorType: 'open', connectsTo: 'living' }
    ],
    windows: [{ wall: 'left', position: 0.5, width: 4 }],
  });

  rooms.push({
    id: 'dining', type: 'dining', label: 'DINING',
    x: 0, y: 30, w: 14, h: 16,
    color: COLORS.dining,
    furniture: [{ type: 'dining_table', x: 2, y: 5, w: 10, h: 6, rotation: 0 }],
    doors: [
      { wall: 'top', position: 0.5, width: 3.5, swing: 'in', doorType: 'open', connectsTo: 'kitchen' }
    ],
    windows: [{ wall: 'left', position: 0.5, width: 4 }, { wall: 'bottom', position: 0.5, width: 4 }],
  });

  // Column 2 (x: 14, w: 20)
  rooms.push({
    id: 'living', type: 'living', label: 'HALL + LIVING ROOM',
    x: 14, y: 0, w: 20, h: 22,
    color: COLORS.living,
    openWalls: ['right'],
    furniture: livingFurniture(20, 22, 1),
    doors: [
      { wall: 'top', position: 0.3, width: 4, swing: 'in', doorType: 'standard', label: 'MAIN DOOR' },
      { wall: 'left', position: 0.8, width: 3.5, swing: 'out', doorType: 'open', connectsTo: 'kitchen' }
    ],
    windows: [{ wall: 'top', position: 0.7, width: 5 }],
  });

  rooms.push({
    id: 'bed-2', type: 'bedroom', label: 'BEDROOM 3',
    x: 14, y: 22, w: 20, h: 12,
    color: COLORS.bedroom,
    furniture: bedroomFurniture(20, 12, false, 3),
    doors: [
      { wall: 'right', position: 0.5, width: 3, swing: 'in', doorType: 'standard', connectsTo: 'main-hallway' }
    ],
    windows: [],
  });

  rooms.push({
    id: 'bed-3', type: 'bedroom', label: 'BEDROOM 4',
    x: 14, y: 34, w: 20, h: 12,
    color: COLORS.bedroom,
    furniture: bedroomFurniture(20, 12, false, 3),
    doors: [
      { wall: 'right', position: 0.5, width: 3, swing: 'in', doorType: 'standard', connectsTo: 'main-hallway' }
    ],
    windows: [],
  });

  // RIGHT ZONE (x: 38, w: 10)
  rooms.push({
    id: 'bed-0', type: 'bedroom', label: 'MASTER BEDROOM',
    x: 38, y: 0, w: 10, h: 16,
    color: COLORS.bedroom,
    furniture: bedroomFurniture(10, 16, true, 1),
    doors: [
      { wall: 'left', position: 0.5, width: 3, swing: 'in', doorType: 'standard', connectsTo: 'main-hallway' }
    ],
    windows: [{ wall: 'top', position: 0.5, width: 4 }, { wall: 'right', position: 0.5, width: 4 }],
  });

  rooms.push({
    id: 'bath-master', type: 'bathroom', label: 'MASTER BATH',
    x: 38, y: 16, w: 10, h: 9,
    color: COLORS.bathroom,
    furniture: bathroomFurniture(10, 9, true, 1),
    doors: [
      { wall: 'top', position: 0.5, width: 2.5, swing: 'in', doorType: 'standard', connectsTo: 'bed-0' }
    ],
    windows: [{ wall: 'right', position: 0.5, width: 2 }],
  });

  rooms.push({
    id: 'bed-1', type: 'bedroom', label: 'BEDROOM 2',
    x: 38, y: 25, w: 10, h: 11,
    color: COLORS.bedroom,
    furniture: bedroomFurniture(10, 11, false, 1),
    doors: [
      { wall: 'left', position: 0.5, width: 3, swing: 'in', doorType: 'standard', connectsTo: 'main-hallway' }
    ],
    windows: [{ wall: 'right', position: 0.5, width: 4 }],
  });

  rooms.push({
    id: 'bath-attached-bed-1', type: 'bathroom', label: 'ENSUITE 2',
    x: 38, y: 36, w: 10, h: 7,
    color: COLORS.bathroom,
    furniture: bathroomFurniture(10, 7, false, 1),
    doors: [
      { wall: 'top', position: 0.5, width: 2.5, swing: 'in', doorType: 'standard', connectsTo: 'bed-1' }
    ],
    windows: [{ wall: 'right', position: 0.5, width: 2 }],
  });

  rooms.push({
    id: 'bath-common-1', type: 'bathroom', label: 'BATH',
    x: 38, y: 43, w: 10, h: 3,
    color: COLORS.bathroom,
    furniture: bathroomFurniture(10, 3, false, 1),
    doors: [
      { wall: 'left', position: 0.5, width: 2.5, swing: 'in', doorType: 'standard', connectsTo: 'main-hallway' }
    ],
    windows: [{ wall: 'right', position: 0.5, width: 2 }],
  });

  validateAndFixBathrooms(rooms);
  return { width: W, height: H, rooms };
}



// ── Main plan generator ────────────────────────────────────────────────────

export function generatePlan(c: ConfigState): Plan {
  let plan: Plan;

  switch (c.homeType) {
    case 'starter':
      plan = starterPresetA(c);
      break;
    case 'family':
      plan = familyPresetA(c);
      break;
    case 'premium':
      plan = premiumPresetA(c);
      break;
    default:
      plan = starterPresetA(c);
  }

  return applyDynamicChanges(plan, c);
}

const ADDON_ROOM_PREFIXES = ['addon-'];

export function applyAddOnsToPlan(plan: Plan, c: Pick<ConfigState, 'addons'>): Plan {
  const W = plan.width;
  const H = plan.height;
  const baseRooms = (plan.rooms || []).filter((r) => !ADDON_ROOM_PREFIXES.some((prefix) => r.id.startsWith(prefix)));

  const wantCarport = c.addons.includes('carport');
  const wantTrees = c.addons.includes('landscaping');
  const wantFence = c.addons.includes('fence');
  const wantSolar = c.addons.includes('solar');
  const wantTank = c.addons.includes('water_tank');

  // ── 1. Reserve perimeter space for ground-level add-ons ──────────────
  // Carport gets a strip on the LEFT, trees get a strip on the RIGHT + BOTTOM.
  // Fence, solar, and water tank are visual-only and do not reshape the building.
  const carportStrip = wantCarport ? Math.min(13, Math.max(9, Math.round(W * 0.25))) : 0;
  const treeStrip = wantTrees ? 4 : 0;

  const reserveLeft = carportStrip;
  const reserveRight = treeStrip;
  const reserveTop = 0;
  const reserveBottom = treeStrip;

  const buildX = reserveLeft;
  const buildY = reserveTop;
  const buildW = Math.max(8, W - reserveLeft - reserveRight);
  const buildH = Math.max(8, H - reserveTop - reserveBottom);

  // ── 2. Reshape the building rooms to fit inside the build zone ───────
  const mainHouse = baseRooms.filter((r) => r.type !== 'garden' && r.type !== 'carport' && r.type !== 'balcony');
  const needsReshape = (reserveLeft + reserveRight + reserveTop + reserveBottom) > 0 && mainHouse.length > 0;

  let rooms: Room[];
  if (needsReshape) {
    const minX = Math.min(...mainHouse.map((r) => r.x));
    const minY = Math.min(...mainHouse.map((r) => r.y));
    const maxX = Math.max(...mainHouse.map((r) => r.x + r.w));
    const maxY = Math.max(...mainHouse.map((r) => r.y + r.h));
    const curW = Math.max(1, maxX - minX);
    const curH = Math.max(1, maxY - minY);
    const sX = buildW / curW;
    const sY = buildH / curH;

    rooms = baseRooms
      // garden/carport/balcony zones from the original plan are dropped — the new
      // reserved yard strips replace them. Doors/windows use 0..1 wall positions
      // so they stay aligned after scaling.
      .filter((r) => r.type !== 'garden' && r.type !== 'carport' && r.type !== 'balcony')
      .map((r) => {
        const nx = Math.round(buildX + (r.x - minX) * sX);
        const ny = Math.round(buildY + (r.y - minY) * sY);
        const nw = Math.max(4, Math.round(r.w * sX));
        const nh = Math.max(4, Math.round(r.h * sY));
        const newRoom: Room = { ...r, x: nx, y: ny, w: nw, h: nh };
        if (newRoom.furniture && newRoom.furniture.length > 0) {
          try {
            newRoom.furniture = regenerateFurniture(newRoom);
          } catch {
            /* keep old furniture if regeneration fails */
          }
        }
        return newRoom;
      });
  } else {
    rooms = [...baseRooms];
  }

  // ── 3. Place reserved-strip add-ons inside the plan boundary ─────────
  if (wantCarport && carportStrip > 0) {
    rooms.push({
      id: 'addon-carport',
      type: 'carport',
      label: 'CARPORT',
      x: 0,            // Start at the left edge — this IS the reserved strip
      y: buildY,
      w: carportStrip, // Fill the full reserved width so no gap is left
      h: buildH,
      color: COLORS.carport,
      furniture: [],
      doors: [],
      windows: [],
    });
  }

  if (wantTrees && treeStrip > 0) {
    // Right-side garden strip
    rooms.push({
      id: 'addon-yard-right',
      type: 'garden',
      label: 'GARDEN',
      x: W - treeStrip,
      y: buildY,
      w: treeStrip,
      h: buildH,
      color: COLORS.garden,
      furniture: [],
      doors: [],
      windows: [],
    });
    // Bottom garden strip
    rooms.push({
      id: 'addon-yard-bottom',
      type: 'garden',
      label: 'GARDEN',
      x: reserveLeft,
      y: H - treeStrip,
      w: W - reserveLeft - reserveRight,
      h: treeStrip,
      color: COLORS.garden,
      furniture: [],
      doors: [],
      windows: [],
    });
    // Tree markers
    const treeSpots = [
      { id: 'addon-tree-1', x: W - treeStrip + 0.5, y: buildY + 1 },
      { id: 'addon-tree-2', x: W - treeStrip + 0.5, y: buildY + buildH - 4 },
      { id: 'addon-tree-3', x: reserveLeft + 1, y: H - treeStrip + 0.5 },
      { id: 'addon-tree-4', x: W - treeStrip - 4, y: H - treeStrip + 0.5 },
    ];
    treeSpots.forEach((t) => {
      rooms.push({
        ...t,
        type: 'garden',
        label: 'TREE',
        w: 3,
        h: 3,
        color: 'rgba(34, 197, 94, 0.4)',
        furniture: [],
        doors: [],
        windows: [],
      });
    });
  }

  // ── 4. Roof-only markers ─────────────────────────────────────────────
  if (wantSolar) {
    const solarW = Math.min(10, Math.max(6, buildW - 4));
    const solarH = Math.min(4, Math.max(3, buildH - 4));
    rooms.push({
      id: 'addon-solar',
      type: 'garden',
      label: 'SOLAR PANELS (ROOF)',
      x: buildX + 2,
      y: buildY + 2,
      w: solarW,
      h: solarH,
      color: 'rgba(26, 42, 74, 0.4)',
      furniture: [],
      doors: [],
      windows: [],
    });
  }

  if (wantTank) {
    const tankSize = Math.min(4, Math.max(3, Math.min(buildW, buildH) - 2));
    rooms.push({
      id: 'addon-tank',
      type: 'garden',
      label: 'WATER TANK (ROOF)',
      x: buildX + buildW - tankSize - 2,
      y: buildY + 2,
      w: tankSize,
      h: tankSize,
      color: 'rgba(0, 0, 255, 0.2)',
      furniture: [],
      doors: [],
      windows: [],
    });
  }

  // ── 5. Perimeter fence wrapping the entire plan ──────────────────────
  if (wantFence) {
    rooms.push({
      id: 'addon-fence',
      type: 'garden',
      label: 'PERIMETER FENCE',
      x: 0,
      y: 0,
      w: W,
      h: H,
      color: 'transparent',
      furniture: [],
      doors: [],
      windows: [],
      openWalls: ['top', 'bottom', 'left', 'right'],
    });
  }

  return { ...plan, rooms, width: W, height: H };
}

function applyDynamicChanges(plan: Plan, c: ConfigState): Plan {
  let rooms = [...plan.rooms];
  let currentWidth = plan.width;
  let currentHeight = plan.height;
  const removedRooms: Room[] = [];
  
  // 1. Handle Bedrooms
  const beds = rooms.filter(r => r.type === 'bedroom');
  if (beds.length < c.bedrooms) {
    for (let i = beds.length; i < c.bedrooms; i++) {
      const lastBed = beds[beds.length - 1] || rooms[rooms.length - 1];
      rooms.push({
        id: `dynamic-bed-${i}`,
        type: 'bedroom',
        label: `BEDROOM ${i + 1}`,
        x: lastBed.x,
        y: lastBed.y + lastBed.h + 2,
        w: 10,
        h: 12,
        color: COLORS.bedroom,
        furniture: bedroomFurniture(10, 12, false),
        doors: [{ wall: 'top', position: 0.5, width: 3, swing: 'in' }],
        windows: [{ wall: 'right', position: 0.5, width: 4 }],
      });
    }
  } else if (beds.length > c.bedrooms) {
    let toRemove = beds.length - c.bedrooms;
    for (let i = rooms.length - 1; i >= 0 && toRemove > 0; i--) {
      if (rooms[i].type === 'bedroom' && !rooms[i].label.toLowerCase().includes('master')) {
        removedRooms.push(rooms[i]);
        rooms.splice(i, 1);
        toRemove--;
      }
    }
  }

  // 2. Handle Bathrooms
  const baths = rooms.filter(r => r.type === 'bathroom');
  if (baths.length < c.bathrooms) {
    for (let i = baths.length; i < c.bathrooms; i++) {
      const lastBath = baths[baths.length - 1] || rooms[rooms.length - 1];
      rooms.push({
        id: `dynamic-bath-${i}`,
        type: 'bathroom',
        label: `BATH ${i + 1}`,
        x: lastBath.x + lastBath.w + 2,
        y: lastBath.y,
        w: 8,
        h: 6,
        color: COLORS.bathroom,
        furniture: bathroomFurniture(8, 6, false),
        doors: [{ wall: 'left', position: 0.5, width: 2.5, swing: 'in' }],
        windows: [],
      });
    }
  } else if (baths.length > c.bathrooms) {
    let toRemove = baths.length - c.bathrooms;
    for (let i = rooms.length - 1; i >= 0 && toRemove > 0; i--) {
      if (rooms[i].type === 'bathroom' && !rooms[i].label.toLowerCase().includes('master')) {
        removedRooms.push(rooms[i]);
        rooms.splice(i, 1);
        toRemove--;
      }
    }
  }

  // Reclaim the empty footprint left behind by removed bedrooms/bathrooms so the
  // plan stays visually compact instead of showing dead space.
  for (const removedRoom of removedRooms) {
    absorbRemovedRoomSpace(rooms, removedRoom, c);
  }

  // 3. Handle Kitchen Layout
  const kitchenRoom = rooms.find(r => r.id === 'kitchen');
  const diningRoom = rooms.find(r => r.id === 'dining');

  if (kitchenRoom && diningRoom) {
    if (c.kitchen === 'open') {
      // MERGE: Combine kitchen and dining into one large space
      const startY = Math.min(kitchenRoom.y, diningRoom.y);
      const totalH = kitchenRoom.h + diningRoom.h;
      const combinedW = Math.max(kitchenRoom.w, diningRoom.w);
      
      kitchenRoom.y = startY;
      kitchenRoom.h = totalH;
      kitchenRoom.w = combinedW;
      kitchenRoom.label = 'OPEN KITCHEN + DINING';
      kitchenRoom.color = COLORS.kitchen;
      
      // Add a standard door to the hallway
      kitchenRoom.doors = [
        ...(kitchenRoom.doors || []).filter(d => d.connectsTo !== 'dining'), // Clean up old links
        { wall: 'right', position: 0.2, width: 2.8, swing: 'in', doorType: 'standard', connectsTo: 'main-hallway' }
      ];
      
      // Add shared furniture
      kitchenRoom.furniture = [
        ...kitchenFurniture(combinedW, totalH * 0.5, 'open'),
        { type: 'dining_table', x: combinedW * 0.2, y: totalH * 0.6, w: 6, h: 4, rotation: 0 }
      ];
      
      // Remove the separate dining room
      rooms = rooms.filter(r => r.id !== 'dining');
    } else if (c.kitchen === 'galley') {
      // GALLEY: Side-by-side vertical rooms filling the original combined area
      const startX = Math.min(kitchenRoom.x, diningRoom.x);
      const startY = Math.min(kitchenRoom.y, diningRoom.y);
      const endY = Math.max(kitchenRoom.y + kitchenRoom.h, diningRoom.y + diningRoom.h);
      const totalW = Math.max(kitchenRoom.w, diningRoom.w);
      const totalH = endY - startY;

      kitchenRoom.x = startX;
      kitchenRoom.y = startY;
      kitchenRoom.w = totalW * 0.6;
      kitchenRoom.h = totalH;
      kitchenRoom.label = 'KITCHEN (GALLEY)';
      kitchenRoom.furniture = kitchenFurniture(kitchenRoom.w, kitchenRoom.h, 'galley');
      
      diningRoom.x = startX + kitchenRoom.w;
      diningRoom.y = startY;
      diningRoom.w = totalW * 0.4;
      diningRoom.h = totalH;
      diningRoom.label = 'DINING';
      diningRoom.furniture = diningFurniture(diningRoom.w, diningRoom.h);
    } else {
      // STANDARD: Stacked horizontally (original layout)
      // Ensure they are separate and labeled
      kitchenRoom.label = 'KITCHEN';
      diningRoom.label = 'DINING';
      // Reset to original positions if they were modified
      // (The preset defines these, so we just ensure they aren't merged)
    }
  }

  // Final Bounds Calculation & Normalization
  const minX = Math.min(0, ...rooms.map(r => r.x));
  const minY = Math.min(0, ...rooms.map(r => r.y));
  
  if (minX < 0 || minY < 0) {
    rooms = rooms.map(r => ({ ...r, x: r.x - minX, y: r.y - minY }));
  }
  
  const maxX = Math.max(1, ...rooms.map(r => r.x + r.w));
  const maxY = Math.max(1, ...rooms.map(r => r.y + r.h));

  return applyAddOnsToPlan({ ...plan, width: maxX, height: maxY, rooms }, c);
}

// ── Generate empty plan for custom editor ─────────────────────────

export function generateEmptyPlan(homeType: 'starter' | 'family' | 'premium'): Plan {
  const dimensions: Record<string, { w: number, h: number }> = {
    starter:  { w: 25, h: 40 },  // ~1000 sqft
    family:   { w: 32, h: 50 },  // ~1600 sqft
    premium:  { w: 40, h: 60 },  // ~2400 sqft
  };
  const dim = dimensions[homeType];
  return {
    width: dim.w,
    height: dim.h,
    rooms: [],
  };
}

/**
 * Synchronise openWalls of structural rooms (staircases, hallways) between
 * two floors. When a user removes a wall on the ground floor staircase, the
 * matching first-floor staircase should mirror the change.
 *
 * Matching is done by room type + positional overlap (>50% area overlap).
 * Only `openWalls` are propagated — furniture, doors, etc. stay independent.
 */
export function syncStructuralWalls(sourcePlan: Plan, targetPlan: Plan): Plan {
  if (!sourcePlan?.rooms || !targetPlan?.rooms) return targetPlan;

  const structuralTypes = new Set<Room['type']>(['hallway', 'staircase']);

  const sourceStructural = sourcePlan.rooms.filter(r => structuralTypes.has(r.type));
  if (sourceStructural.length === 0) return targetPlan;

  const updatedRooms = targetPlan.rooms.map(targetRoom => {
    if (!structuralTypes.has(targetRoom.type)) return targetRoom;

    // Find the best positional match on the source floor
    let bestMatch: Room | null = null;
    let bestOverlap = 0;

    for (const src of sourceStructural) {
      if (src.type !== targetRoom.type) continue;

      // Calculate 2D overlap area
      const ox = Math.max(0, Math.min(src.x + src.w, targetRoom.x + targetRoom.w) - Math.max(src.x, targetRoom.x));
      const oy = Math.max(0, Math.min(src.y + src.h, targetRoom.y + targetRoom.h) - Math.max(src.y, targetRoom.y));
      const overlap = ox * oy;
      const minArea = Math.min(src.w * src.h, targetRoom.w * targetRoom.h);

      // Require > 50% area overlap to count as a structural match
      if (overlap > minArea * 0.5 && overlap > bestOverlap) {
        bestOverlap = overlap;
        bestMatch = src;
      }
    }

    if (bestMatch && bestMatch.openWalls) {
      return { ...targetRoom, openWalls: [...bestMatch.openWalls] };
    } else if (bestMatch && !bestMatch.openWalls) {
      // Source has no openWalls, so remove any openWalls from target too
      const { openWalls: _removed, ...rest } = targetRoom;
      return rest as Room;
    }
    return targetRoom;
  });

  return { ...targetPlan, rooms: updatedRooms };
}

// ── Double Storey Support ─────────────────────────────────────────

function familyDoubleStorey(W: number, H: number, kitchenType: string = 'standard', bedrooms: number = 3, bathrooms: number = 2): { ground: Plan; first: Plan } {
  // Ground rules for blueprint scale mapping to a standard 40x40 dimension
  // W=40, H=40. Let's arrange them based on relative coordinates from the image.
  
  // X: 0 to W
  // Y: 0 to H
  
  const gRooms: Room[] = [];
  
  // Let's formalize the grid logic based on W and H
  const x1 = Math.round(W * 0.35); // 14
  const x2 = Math.round(W * 0.60); // 24
  
  const y1 = Math.round(H * 0.40); // 16
  const y2 = Math.round(H * 0.65); // 26
  
  // Ground Floor Mapping
  // TOP ROW (y: 0 to y1)
  gRooms.push({
    id: 'gf-bed-0', type: 'bedroom', label: 'BED',
    x: 0, y: 0, w: x1, h: y1, // Bed matches Staircase width (x1)
    color: COLORS.bedroom,
    furniture: bedroomFurniture(x1, y1, true, 1),
    doors: [],
    windows: [{ wall: 'left', position: 0.5, width: 4 }, { wall: 'top', position: 0.5, width: 4 }]
  });
  
  const bathW = 5;
  const bathH = Math.round(y1 * 0.5); // 8

  gRooms.push({
    id: 'bath-attached-gf-bed-0', type: 'bathroom', label: 'TOILET',
    x: x1, y: 0, w: bathW, h: bathH, // Back Bath
    color: COLORS.bathroom,
    furniture: bathroomFurniture(bathW, bathH, true, 0),
    doors: [
      { wall: 'left', position: 0.5, width: 2.5, swing: 'in', doorType: 'standard', connectsTo: 'gf-bed-0' }
    ],
    windows: [{ wall: 'top', position: 0.5, width: 2 }]
  });

  gRooms.push({
    id: 'gf-bath-common', type: 'bathroom', label: 'TOILET',
    x: x1, y: bathH, w: bathW, h: y1 - bathH, // Front Bath
    color: COLORS.bathroom,
    furniture: bathroomFurniture(bathW, y1 - bathH, false, 2),
    doors: [
      { wall: 'bottom', position: 0.5, width: 2.5, swing: 'out', doorType: 'standard', connectsTo: 'gf-dining' }
    ],
    windows: []
  });

  gRooms.push({
    id: 'gf-kitchen', type: 'kitchen', label: kitchenType === 'open' ? 'OPEN KITCHEN + DINING' : kitchenType === 'galley' ? 'KITCHEN (GALLEY)' : 'KITCHEN',
    x: x1 + bathW, y: 0,
    w: kitchenType === 'open' ? W - (x1 + bathW) : kitchenType === 'galley' ? Math.round((W - (x1 + bathW)) * 0.6) : W - (x1 + bathW),
    h: kitchenType === 'open' ? y2 - 0 : y1,
    color: COLORS.kitchen,
    furniture: kitchenType === 'open'
      ? [
          ...kitchenFurniture(W - (x1 + bathW), y1, 'open', 0),
          { type: 'dining_table' as const, x: (W - (x1 + bathW)) * 0.2, y: y1 + 2, w: 6, h: 4, rotation: 0 }
        ]
      : kitchenType === 'galley'
        ? kitchenFurniture(Math.round((W - (x1 + bathW)) * 0.6), y1, 'galley', 0)
        : kitchenFurniture(W - (x1 + bathW), y1, 'standard', 0),
    doors: kitchenType === 'open'
      ? [{ wall: 'bottom' as const, position: 0.5, width: 4, swing: 'out' as const, doorType: 'open' as const, connectsTo: 'gf-living' }]
      : [{ wall: 'bottom' as const, position: 0.5, width: 3.5, swing: 'out' as const, doorType: 'open' as const, connectsTo: 'gf-dining' }],
    windows: [{ wall: 'top', position: 0.5, width: 4 }, { wall: 'right', position: 0.5, width: 4 }]
  });

  // MIDDLE ROW (y: y1 to y2)
  gRooms.push({
    id: 'gf-staircase', type: 'hallway', label: 'STAIRCASE\n↑',
    x: 0, y: y1, w: x1, h: y2 - y1,
    color: COLORS.hallway,
    furniture: [],
    doors: [
      { wall: 'right', position: 0.5, width: 3.5, swing: 'in', doorType: 'open', connectsTo: kitchenType === 'open' ? 'gf-kitchen' : 'gf-dining' }
    ],
    windows: [{ wall: 'left', position: 0.5, width: 4 }]
  });

  // Dining room (only for standard and galley layouts — open plan merges into kitchen above)
  if (kitchenType === 'galley') {
    // Galley: dining sits beside the galley kitchen
    const galleyKitchenW = Math.round((W - (x1 + bathW)) * 0.6);
    gRooms.push({
      id: 'gf-dining', type: 'dining', label: 'DINING',
      x: x1 + bathW + galleyKitchenW, y: 0, w: W - (x1 + bathW + galleyKitchenW), h: y1,
      color: COLORS.dining,
      furniture: diningFurniture(W - (x1 + bathW + galleyKitchenW), y1),
      doors: [
        { wall: 'bottom', position: 0.5, width: 3.5, swing: 'out', doorType: 'open', connectsTo: 'gf-staircase' }
      ],
      windows: [{ wall: 'right', position: 0.5, width: 4 }]
    });
    // Hallway/corridor between staircase and living (middle row)
    gRooms.push({
      id: 'gf-corridor', type: 'hallway', label: '',
      x: x1, y: y1, w: W - x1, h: y2 - y1,
      color: COLORS.hallway,
      openWalls: ['left'],
      furniture: [],
      doors: [
        { wall: 'bottom', position: 0.5, width: 4, swing: 'out', doorType: 'open', connectsTo: 'gf-living' },
        { wall: 'left', position: 0.2, width: 3, swing: 'in', doorType: 'standard', connectsTo: 'gf-bed-0' }
      ],
      windows: [{ wall: 'right', position: 0.5, width: 4 }]
    });
  } else if (kitchenType !== 'open') {
    // Standard: separate dining room in middle row
    gRooms.push({
      id: 'gf-dining', type: 'dining', label: 'DINING',
      x: x1, y: y1, w: W - x1, h: y2 - y1,
      color: COLORS.dining,
      furniture: diningFurniture(W - x1, y2 - y1),
      doors: [
        { wall: 'bottom', position: 0.5, width: 4, swing: 'out', doorType: 'open', connectsTo: 'gf-living' },
        { wall: 'left', position: 0.2, width: 3, swing: 'in', doorType: 'standard', connectsTo: 'gf-bed-0' }
      ],
      windows: [{ wall: 'right', position: 0.5, width: 4 }]
    });
  } else {
    // Open plan: middle row is a corridor connecting staircase to living
    gRooms.push({
      id: 'gf-corridor', type: 'hallway', label: '',
      x: x1, y: y1, w: x1 + bathW > x1 ? bathW : W - x1, h: y2 - y1,
      color: COLORS.hallway,
      openWalls: ['left'],
      furniture: [],
      doors: [
        { wall: 'left', position: 0.2, width: 3, swing: 'in', doorType: 'standard', connectsTo: 'gf-bed-0' }
      ],
      windows: []
    });
  }

  // BOTTOM ROW (y: y2 to H)
  gRooms.push({
    id: 'gf-porch', type: 'carport', label: 'PORCH\n(CAR PARKING)',
    x: 0, y: y2, w: x1, h: H - y2,
    color: COLORS.carport,
    furniture: [],
    doors: [],
    windows: []
  });

  gRooms.push({
    id: 'gf-sitout', type: 'balcony', label: 'SIT OUT',
    x: x1, y: y2, w: x2 - x1, h: H - y2,
    color: COLORS.balcony,
    furniture: [
       { type: 'plant', x: 1, y: 1, w: 2, h: 2 },
       { type: 'plant', x: (x2 - x1) - 3, y: 1, w: 2, h: 2 }
    ],
    doors: [
      { wall: 'left', position: 0.5, width: 3.5, swing: 'out', doorType: 'standard', connectsTo: 'gf-porch' }
    ],
    openWalls: ['bottom'], // Sit out is open to outside
    windows: []
  });

  gRooms.push({
    id: 'gf-living', type: 'living', label: 'LIVING',
    x: x2, y: y2, w: W - x2, h: H - y2,
    color: COLORS.living, // Ensures correct color
    furniture: livingFurniture(W - x2, H - y2, 2),
    doors: [
      { wall: 'left', position: 0.5, width: 4, swing: 'in', doorType: 'standard', connectsTo: 'gf-sitout', label: 'MAIN DOOR' },
      { wall: 'bottom', position: 0.8, width: 3.5, swing: 'in', doorType: 'standard', label: 'OUTSIDE ENTRY' } // Extra door for external access as requested
    ],
    openWalls: [],
    windows: [{ wall: 'bottom', position: 0.3, width: 4 }, { wall: 'right', position: 0.5, width: 4 }]
  });
  
  injectAdjacencyDoors(gRooms);
  cleanupDoors(gRooms);

  // Restore the door from common bath to dining/corridor which cleanupDoors incorrectly strips
  const commonBath = gRooms.find(r => r.id === 'gf-bath-common');
  const corridorTarget = kitchenType === 'open' ? 'gf-corridor' : kitchenType === 'galley' ? 'gf-corridor' : 'gf-dining';
  if (commonBath && !commonBath.doors.some(d => d.connectsTo === corridorTarget)) {
    commonBath.doors.push({ wall: 'bottom', position: 0.5, width: 2.5, swing: 'out', doorType: 'standard', connectsTo: corridorTarget });
  }

  // ══════════════════════════════════════════════════════════════════
  // FIRST FLOOR
  const fRooms: Room[] = [];

  // Above porch: Open Terrace
  fRooms.push({
    id: 'ff-open-terrace', type: 'balcony', label: 'OPEN TERRACE',
    x: 0, y: y2, w: x1, h: H - y2,
    color: COLORS.garden,
    furniture: gardenFurniture(x1, H - y2),
    doors: [],
    windows: []
  });
  
  // Above sit out: Balcony
  fRooms.push({
    id: 'ff-balcony', type: 'balcony', label: 'BALCONY',
    x: x1, y: y2, w: x2 - x1, h: H - y2,
    color: COLORS.balcony,
    furniture: [],
    doors: [
      { wall: 'top', position: 0.5, width: 3.5, swing: 'in', doorType: 'standard', connectsTo: 'ff-upper-living' }
    ],
    windows: []
  });

  // Above living: Bed
  fRooms.push({
    id: 'ff-bed-1', type: 'bedroom', label: 'BED',
    x: x2, y: y2, w: W - x2, h: H - y2,
    color: COLORS.bedroom,
    furniture: bedroomFurniture(W - x2, H - y2, false, 2),
    doors: [
      { wall: 'top', position: 0.2, width: 3, swing: 'in', doorType: 'standard', connectsTo: 'ff-upper-living' }
    ],
    windows: [{ wall: 'bottom', position: 0.5, width: 4 }, { wall: 'right', position: 0.5, width: 4 }]
  });

  // Above Staircase: Staircase
  fRooms.push({
    id: 'ff-staircase', type: 'hallway', label: 'STAIRCASE\n↓',
    x: 0, y: y1, w: x1, h: y2 - y1,
    color: COLORS.hallway,
    furniture: [],
    doors: [
      { wall: 'right', position: 0.5, width: 3.5, swing: 'in', doorType: 'open', connectsTo: 'ff-upper-living' },
      { wall: 'bottom', position: 0.5, width: 3.5, swing: 'in', doorType: 'standard', connectsTo: 'ff-open-terrace' }
    ],
    windows: [{ wall: 'left', position: 0.5, width: 4 }]
  });

  // Above Dining: Upper Living
  fRooms.push({
    id: 'ff-upper-living', type: 'living', label: 'UPPER LIVING',
    x: x1, y: y1, w: W - x1, h: y2 - y1,
    color: COLORS.hallway,
    furniture: livingFurniture(W - x1, y2 - y1, 3), // some sofas
    doors: [],
    windows: []
  });

  // Above Master Bed: Bed
  fRooms.push({
    id: 'ff-bed-2', type: 'bedroom', label: 'BED',
    x: 0, y: 0, w: x1, h: y1,
    color: COLORS.bedroom,
    furniture: bedroomFurniture(x1, y1, false, 1),
    doors: [
      { wall: 'bottom', position: 0.2, width: 3, swing: 'in', doorType: 'standard', connectsTo: 'ff-staircase' }
    ],
    windows: [{ wall: 'left', position: 0.5, width: 4 }, { wall: 'top', position: 0.5, width: 4 }]
  });
  
  // Above Master Bath: Toilet
  fRooms.push({
    id: 'bath-attached-ff-bed-2', type: 'bathroom', label: 'TOILET',
    x: x1, y: 0, w: bathW, h: bathH,
    color: COLORS.bathroom,
    furniture: bathroomFurniture(bathW, bathH, true, 0),
    doors: [
      { wall: 'left', position: 0.5, width: 2.5, swing: 'in', doorType: 'standard', connectsTo: 'ff-bed-2' }
    ],
    windows: [{ wall: 'top', position: 0.5, width: 2 }]
  });

  // Above Kitchen: Rear Open Terrace + Common Toilet
  // Rear Corridor connects Upper Living to the common toilet / rear terrace
  fRooms.push({
    id: 'ff-hallway', type: 'hallway', label: 'CORRIDOR',
    x: x1, y: bathH, w: bathW, h: y1 - bathH,
    color: COLORS.hallway,
    furniture: [],
    doors: [
      { wall: 'bottom', position: 0.5, width: 3, swing: 'out', doorType: 'open', connectsTo: 'ff-upper-living' }
    ],
    windows: []
  });

  fRooms.push({
    id: 'ff-bath-common', type: 'bathroom', label: 'TOILET',
    x: x1 + bathW, y: Math.round(y1 * 0.5), w: 6, h: y1 - bathH,
    color: COLORS.bathroom,
    furniture: bathroomFurniture(6, y1 - bathH, false, 1),
    doors: [
      { wall: 'left', position: 0.5, width: 2.5, swing: 'in', doorType: 'standard', connectsTo: 'ff-hallway' }
    ],
    windows: []
  });

  fRooms.push({
    id: 'ff-rear-terrace', type: 'balcony', label: 'OPEN TERRACE',
    x: x1 + bathW, y: 0, w: W - (x1 + bathW), h: bathH,
    color: COLORS.garden,
    furniture: gardenFurniture(W - (x1 + bathW), bathH),
    doors: [
      { wall: 'bottom', position: 0.2, width: 3.5, swing: 'in', doorType: 'standard', connectsTo: 'ff-hallway' }
    ],
    openWalls: ['top', 'right'],
    windows: []
  });

  const terr2X = x1 + bathW + 6;
  const terr2W = W - terr2X;
  if (terr2W > 0) {
    fRooms.push({
      id: 'ff-rear-terrace-2', type: 'balcony', label: '',
      x: terr2X, y: bathH, w: terr2W, h: y1 - bathH,
      color: COLORS.garden,
      furniture: gardenFurniture(terr2W, y1 - bathH),
      doors: [],
      openWalls: ['top', 'right'],
      windows: []
    });
  }

  injectAdjacencyDoors(fRooms);
  cleanupDoors(fRooms);

  return {
    ground: { width: W, height: H, rooms: gRooms },
    first: { width: W, height: H, rooms: fRooms }
  };
}

/**
 * Split a plan into ground + first floor for double storey.
 * Ground: living, kitchen, dining, MASTER BEDROOM + bath, staircase.
 * First: 2 bedrooms accessible via hallway, common bath, staircase, open terrace.
 * Both floors share the same footprint — every cell filled, zero gaps.
 */
export function splitPlanToFloors(
  plan: Plan,
  homeType?: string,
  kitchen: string = 'standard',
  bedrooms: number = 3,
  bathrooms: number = 2,
  addons: string[] = []
): { ground: Plan; first: Plan } {
  let result: { ground: Plan; first: Plan };

  if (homeType === 'family') {
    result = familyDoubleStorey(plan.width, plan.height, kitchen, bedrooms, bathrooms);
  } else {
    result = _splitPlanGeneric(plan);
  }

  // Apply layout-affecting addons (carport, landscaping) to the ground floor
  const layoutAddons = addons.filter(a => a === 'carport' || a === 'landscaping');
  if (layoutAddons.length > 0) {
    const groundWithAddons = applyAddOnsToPlan(result.ground, { addons: layoutAddons as any[] });
    // Sync first floor dimensions to match ground floor (keep structural alignment)
    const first = { ...result.first, width: groundWithAddons.width, height: groundWithAddons.height };
    result = { ground: groundWithAddons, first };
  }

  return result;
}

// Internal generic double-storey splitter (for non-family home types)
function _splitPlanGeneric(plan: Plan): { ground: Plan; first: Plan } {
  const W = plan.width;
  const H = plan.height;

  // ── Dimensions ───────────────────────────────────────────────────
  const STAIR_W = 6;
  const STAIR_H = 8;

  // ══════════════════════════════════════════════════════════════════
  // GROUND FLOOR
  // ┌──────────────────────┬────────────┐
  // │                      │            │
  // │   HALL + LIVING      │  KITCHEN   │  Row 1 (topH)
  // │                      │            │
  // ├───────┬──────────────┼─────┬──────┤
  // │       │              │MSTR │      │
  // │DINING │ MASTER BED   │BATH │STAIR │  Row 2 (botH)
  // │       │              │     │  ↑   │
  // └───────┴──────────────┴─────┴──────┘
  // ══════════════════════════════════════════════════════════════════

  const gRooms: Room[] = [];
  const topH = Math.round(H * 0.5);
  const botH = H - topH;
  const kitchenW = Math.round(W * 0.32);
  const livingW = W - kitchenW;

  // Bottom row widths
  const diningW = Math.round(W * 0.22);
  const masterBathW = Math.max(7, Math.round(W * 0.15));
  const masterBedW = W - diningW - masterBathW - STAIR_W;

  // Row 1: Living + Kitchen
  gRooms.push({
    id: 'gf-living', type: 'living', label: 'HALL + LIVING ROOM',
    x: 0, y: 0, w: livingW, h: topH,
    color: 'hsl(40 30% 87%)',
    furniture: livingFurniture(livingW, topH),
    doors: [{ wall: 'left', position: 0.75, width: 3.5, swing: 'in', doorType: 'standard' }],
    windows: [{ wall: 'left', position: 0.3, width: 5 }, { wall: 'top', position: 0.4, width: 5 }],
  });

  gRooms.push({
    id: 'gf-kitchen', type: 'kitchen', label: 'KITCHEN',
    x: livingW, y: 0, w: kitchenW, h: topH,
    color: 'hsl(28 38% 72%)',
    furniture: kitchenFurniture(kitchenW, topH, 'open'),
    doors: [],
    windows: [{ wall: 'right', position: 0.4, width: 3 }, { wall: 'top', position: 0.5, width: 3 }],
  });

  // Row 2: Dining | Master Bedroom | Master Bath | Staircase
  gRooms.push({
    id: 'gf-dining', type: 'dining', label: 'DINING',
    x: 0, y: topH, w: diningW, h: botH,
    color: 'hsl(36 28% 82%)',
    furniture: diningFurniture(diningW, botH),
    doors: [],
    windows: [{ wall: 'left', position: 0.5, width: 3 }, { wall: 'bottom', position: 0.5, width: 3 }],
  });

  gRooms.push({
    id: 'gf-master-bed', type: 'bedroom', label: 'MASTER BEDROOM',
    x: diningW, y: topH, w: masterBedW, h: botH,
    color: 'hsl(33 35% 82%)',
    furniture: bedroomFurniture(masterBedW, botH, true),
    doors: [],
    windows: [{ wall: 'bottom', position: 0.5, width: 4 }],
  });

  gRooms.push({
    id: 'gf-master-bath', type: 'bathroom', label: 'MASTER\nBATH',
    x: diningW + masterBedW, y: topH, w: masterBathW, h: botH,
    color: 'hsl(200 30% 82%)',
    furniture: bathroomFurniture(masterBathW, botH, true),
    doors: [],
    windows: [{ wall: 'bottom', position: 0.5, width: 2 }],
  });

  gRooms.push({
    id: 'staircase-gf', type: 'hallway', label: 'STAIRCASE\n↑',
    x: W - STAIR_W, y: topH, w: STAIR_W, h: botH,
    color: 'hsl(38 20% 82%)',
    furniture: [],
    doors: [],
    windows: [],
  });

  injectAdjacencyDoors(gRooms);
  cleanupDoors(gRooms);

  // ══════════════════════════════════════════════════════════════════
  // FIRST FLOOR
  // ┌────────────────┬────────────────┬──────┐
  // │                │                │      │
  // │   BEDROOM 2    │   BEDROOM 3    │      │
  // │                │                │ HALL │  Row 1 (bedsH)
  // │                │                │ WAY  │
  // ├────────────────┴───┬────────────┤      │
  // │                    │            │      │
  // │   OPEN TERRACE     │ COMMON     ├──────┤
  // │                    │  BATH      │STAIR │  Row 2 (restH)
  // │                    │            │  ↓   │
  // └────────────────────┴────────────┴──────┘
  // ══════════════════════════════════════════════════════════════════

  const fRooms: Room[] = [];
  const hallW = Math.max(5, Math.round(W * 0.12));
  const roomsW = W - hallW;  // Width for bedrooms/terrace/bath
  const bedsH = Math.round(H * 0.55);
  const restH = H - bedsH;

  // Row 1: Two bedrooms side by side
  const bed2W = Math.round(roomsW * 0.5);
  const bed3W = roomsW - bed2W;

  fRooms.push({
    id: 'ff-bed-0', type: 'bedroom', label: 'BEDROOM 2',
    x: 0, y: 0, w: bed2W, h: bedsH,
    color: 'hsl(33 35% 82%)',
    furniture: bedroomFurniture(bed2W, bedsH, false),
    doors: [],
    windows: [{ wall: 'left', position: 0.4, width: 4 }, { wall: 'top', position: 0.5, width: 4 }],
  });

  fRooms.push({
    id: 'ff-bed-1', type: 'bedroom', label: 'BEDROOM 3',
    x: bed2W, y: 0, w: bed3W, h: bedsH,
    color: 'hsl(33 35% 82%)',
    furniture: bedroomFurniture(bed3W, bedsH, false),
    doors: [],
    windows: [{ wall: 'top', position: 0.5, width: 4 }],
  });

  // Hallway (right side, full height minus staircase)
  fRooms.push({
    id: 'ff-hallway', type: 'hallway', label: 'HALLWAY',
    x: roomsW, y: 0, w: hallW, h: H - restH,
    color: 'hsl(38 20% 88%)',
    furniture: [],
    doors: [],
    windows: [],
  });

  // Row 2: Terrace + Common Bath + Staircase
  const bathW = Math.max(7, Math.round(roomsW * 0.35));
  const terraceW = roomsW - bathW;

  fRooms.push({
    id: 'ff-terrace', type: 'balcony', label: 'OPEN TERRACE',
    x: 0, y: bedsH, w: terraceW, h: restH,
    color: 'hsl(120 18% 78%)',
    furniture: [
      { type: 'plant', x: 2, y: restH / 2 - 0.75, w: 1.5, h: 1.5 },
      { type: 'plant', x: terraceW - 4, y: restH / 2 - 0.75, w: 1.5, h: 1.5 },
    ],
    doors: [],
    windows: [{ wall: 'left', position: 0.5, width: 5 }, { wall: 'bottom', position: 0.5, width: 5 }],
  });

  fRooms.push({
    id: 'ff-bath', type: 'bathroom', label: 'COMMON\nBATH',
    x: terraceW, y: bedsH, w: bathW, h: restH,
    color: 'hsl(200 30% 82%)',
    furniture: bathroomFurniture(bathW, restH, false),
    doors: [],
    windows: [{ wall: 'bottom', position: 0.5, width: 2 }],
  });

  // Staircase + landing (bottom-right, aligned with ground floor)
  fRooms.push({
    id: 'staircase-ff', type: 'hallway', label: 'STAIRCASE\n↓',
    x: roomsW, y: bedsH, w: hallW, h: restH,
    color: 'hsl(38 20% 82%)',
    furniture: [],
    doors: [],
    windows: [],
  });

  injectAdjacencyDoors(fRooms);
  cleanupDoors(fRooms);

  return {
    ground: { width: W, height: H, rooms: gRooms },
    first: { width: W, height: H, rooms: fRooms },
  };
}


