import { ConfigState } from '@/store/configurator';
import { computeArea } from './cost';

export interface FurnitureItem {
  type: 'bed' | 'wardrobe' | 'desk' | 'nightstand' | 'toilet' | 'sink' | 'shower' | 'bathtub' |
  'stove' | 'fridge' | 'counter' | 'island' | 'dining_table' | 'sofa' | 'tv' | 'coffee_table' |
  'plant' | 'rug' | 'bookshelf' | 'washing_machine';
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
}

export interface WindowInfo {
  wall: 'top' | 'bottom' | 'left' | 'right';
  position: number;
  width: number;
}

export interface Room {
  id: string;
  type: 'bedroom' | 'bathroom' | 'kitchen' | 'living' | 'dining' | 'entry' | 'hallway' | 'balcony' | 'carport' | 'garden';
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
}

export interface Plan {
  width: number;  // ft
  height: number;
  rooms: Room[];
}

const COLORS: Record<string, string> = {
  bedroom:  'hsl(33 35% 82%)',
  bathroom: 'hsl(200 30% 82%)',
  kitchen:  'hsl(28 38% 72%)',
  living:   'hsl(40 30% 87%)',
  dining:   'hsl(36 28% 82%)',
  entry:    'hsl(36 18% 76%)',
  hallway:  'hsl(38 20% 88%)',
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
  const wardH = Math.min(h - 4, 6);

  if (orient === 0 || orient === 2) {
    const bedY = orient === 0 ? G : h - bedH - G;
    items.push({ type: 'bed', x: (w - bedW) / 2, y: bedY, w: bedW, h: bedH, rotation: orient === 0 ? 0 : 180 });
    items.push({ type: 'wardrobe', x: w - 2.5, y: (h - wardH) / 2, w: 2.2, h: wardH });
  } else {
    const bedX = orient === 1 ? w - bedH - G : G;
    items.push({ type: 'bed', x: bedX, y: (h - bedW) / 2, w: bedH, h: bedW, rotation: orient === 1 ? 90 : 270 });
    items.push({ type: 'wardrobe', x: (w - wardH) / 2, y: 0.5, w: wardH, h: 2.2 });
  }
  return items;
}

function bathroomFurniture(w: number, h: number, isMaster: boolean, orient: number = 0): FurnitureItem[] {
  const items: FurnitureItem[] = [];
  const G = 0.4;
  
  // Base items
  const sink = { type: 'sink' as const, w: 2.2, h: 1.6 };
  const toilet = { type: 'toilet' as const, w: 1.6, h: 2.2 };
  const shower = isMaster ? { type: 'bathtub' as const, w: 2.6, h: 5 } : { type: 'shower' as const, w: 3, h: 3 };

  if (orient === 0 || orient === 2) {
    items.push({ ...sink, x: w - sink.w - G, y: G });
    items.push({ ...toilet, x: w - toilet.w - G, y: h - toilet.h - G });
    items.push({ ...shower, x: G, y: h - shower.h - G });
  } else {
    items.push({ ...sink, x: G, y: G, rotation: 90 });
    items.push({ ...toilet, x: w - toilet.w - G, y: G });
    items.push({ ...shower, x: w - shower.w - G, y: h - shower.h - G });
  }
  return items;
}

function kitchenFurniture(w: number, h: number, kitchenType: string, orient: number = 0): FurnitureItem[] {
  const items: FurnitureItem[] = [];
  const G = 0.4;
  const counterDepth = 2;

  if (orient === 0 || orient === 2) {
    items.push({ type: 'counter', x: G, y: G, w: w - 2 * G, h: counterDepth });
    items.push({ type: 'stove',   x: w * 0.3, y: G + 0.1, w: 2.5, h: 1.6 });
    items.push({ type: 'fridge',  x: w - 2.5 - G, y: G + 0.1, w: 2.2, h: 2.2 });
  } else {
    items.push({ type: 'counter', x: G, y: G, w: counterDepth, h: h - 2 * G });
    items.push({ type: 'stove',   x: G + 0.1, y: h * 0.3, w: 1.6, h: 2.5 });
    items.push({ type: 'fridge',  x: G + 0.1, y: h - 2.5 - G, w: 2.2, h: 2.2 });
  }
  return items;
}

function livingFurniture(w: number, h: number, orient: number = 0): FurnitureItem[] {
  const items: FurnitureItem[] = [];
  const G = 0.5;

  const tvW = Math.min(5.5, w * 0.4);
  const sofaW = Math.min(8, w * 0.6);

  if (orient === 0 || orient === 2) {
    const tvY = orient === 0 ? G : h - 1.2 - G;
    const sofaY = orient === 0 ? h - 3 - G : G;
    items.push({ type: 'tv', x: (w - tvW) / 2, y: tvY, w: tvW, h: 1.2 });
    items.push({ type: 'sofa', x: (w - sofaW) / 2, y: sofaY, w: sofaW, h: 3 });
  } else {
    const tvX = orient === 1 ? w - 1.2 - G : G;
    const sofaX = orient === 1 ? G : w - 3 - G;
    items.push({ type: 'tv', x: tvX, y: (h - tvW) / 2, w: 1.2, h: tvW, rotation: 90 });
    items.push({ type: 'sofa', x: sofaX, y: (h - sofaW) / 2, w: 3, h: sofaW, rotation: 90 });
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

function injectAdjacencyDoors(rooms: Room[]): void {
  const connected = new Set<string>();
  const hasDining = rooms.some(r => r.type === 'dining');

  const hasEntrance = (room: Room) => room.doors.some(d => {
    const c = rooms.find(r => r.id === d.connectsTo);
    return c && (c.type === 'hallway' || c.type === 'living');
  });

  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      const a = rooms[i];
      const b = rooms[j];
      const key = [a.id, b.id].sort().join('|');
      if (connected.has(key)) continue;

      if (a.type === 'carport' || b.type === 'carport') continue;
      // Skip garden doors - garden is outdoor
      if (a.type === 'garden' || b.type === 'garden') continue;

      const types = [a.type, b.type];
      
      if (a.type === 'bedroom' && b.type === 'bedroom') continue;

      if (hasDining && types.includes('kitchen')) {
        if (types.includes('hallway') || types.includes('living')) continue;
      }

      if (types.includes('bathroom') && types.includes('bedroom')) {
        const bath = a.type === 'bathroom' ? a : b;
        const bed = a.type === 'bedroom' ? a : b;
        if (bath.id !== `bath-attached-${bed.id}`) continue;
      }
      
      if (types.includes('bathroom') && types.includes('hallway')) {
        const bath = a.type === 'bathroom' ? a : b;
        if (bath.id.includes('attached')) continue;
      }

      if (a.type === 'bathroom' && b.type === 'bathroom') continue;
      if (types.includes('bathroom') && ['living', 'kitchen', 'dining'].some(t => types.includes(t as any))) continue;
      if (a.type === 'bathroom' && a.doors.length >= 1) continue;
      if (b.type === 'bathroom' && b.doors.length >= 1) continue;

      if (a.type === 'bedroom' && ['hallway', 'living'].includes(b.type)) {
        if (hasEntrance(a)) continue;
      }
      if (b.type === 'bedroom' && ['hallway', 'living'].includes(a.type)) {
        if (hasEntrance(b)) continue;
      }

      if (types.includes('bedroom') && ['kitchen', 'dining'].some(t => types.includes(t as any))) continue;

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

      if (!aHasDoor) {
        a.doors.push({ wall: adj.wall, position: clamp(posA), width: doorW, swing: 'in', connectsTo: b.id });
      }
      if (!bHasDoor) {
        b.doors.push({ wall: oppositeWall[adj.wall], position: clamp(posB), width: doorW, swing: 'in', connectsTo: a.id });
      }

      connected.add(key);
    }
  }
}

// ── Validation ─────────────────────────────────────────────────────────────

function cleanupDoors(rooms: Room[]): void {
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
          isValid = (connectedRoom.type === 'hallway');
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
        } else if (connectedRoom.type === 'hallway' || connectedRoom.type === 'living') {
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

// ══════════════════════════════════════════════════════════════════════════════
// ── PRESET-BASED PLAN GENERATION ──────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

// Each home type has 2 presets with unique layouts scaled to their target sqft.
// Family and Premium presets include a front corner garden.

// ── STARTER PRESETS (1000 sqft → ~25×40) ─────────────────────────────────

function starterPresetA(c: ConfigState): Plan {
  // Horizontal layout: Living left, bedrooms right
  const W = 25;
  const H = 40;
  const rooms: Room[] = [];

  // Living + Kitchen on left side (top-to-bottom)
  rooms.push({
    id: 'living', type: 'living', label: 'HALL + LIVING ROOM',
    x: 0, y: 0, w: 14, h: 18,
    color: COLORS.living,
    furniture: livingFurniture(14, 18),
    doors: [{ wall: 'left', position: 0.8, width: 3.5, swing: 'in' }],
    windows: [{ wall: 'left', position: 0.35, width: 4 }, { wall: 'top', position: 0.4, width: 5 }],
  });

  rooms.push({
    id: 'kitchen', type: 'kitchen', label: 'KITCHEN',
    x: 0, y: 18, w: 14, h: 12,
    color: COLORS.kitchen,
    furniture: kitchenFurniture(14, 12, c.kitchen),
    doors: [],
    windows: [{ wall: 'left', position: 0.5, width: 3 }],
  });

  rooms.push({
    id: 'dining', type: 'dining', label: 'DINING',
    x: 0, y: 30, w: 14, h: 10,
    color: COLORS.dining,
    furniture: diningFurniture(14, 10),
    doors: [],
    windows: [{ wall: 'left', position: 0.5, width: 3 }],
  });

  // Hallway
  rooms.push({
    id: 'main-hallway', type: 'hallway', label: 'HALLWAY',
    x: 14, y: 0, w: 3, h: H,
    color: COLORS.hallway,
    furniture: [],
    doors: [],
    windows: [],
  });

  // Right column: Bedrooms
  rooms.push({
    id: 'bed-0', type: 'bedroom', label: 'MASTER BEDROOM',
    x: 17, y: 0, w: 8, h: 16,
    color: COLORS.bedroom,
    furniture: bedroomFurniture(8, 16, true),
    doors: [],
    windows: [{ wall: 'right', position: 0.4, width: 3 }],
  });

  rooms.push({
    id: 'bath-attached-bed-0', type: 'bathroom', label: 'MASTER BATH',
    x: 17, y: 16, w: 8, h: 7,
    color: COLORS.bathroom,
    furniture: bathroomFurniture(8, 7, true),
    doors: [],
    windows: [{ wall: 'right', position: 0.5, width: 2 }],
  });

  rooms.push({
    id: 'bed-1', type: 'bedroom', label: 'BEDROOM 2',
    x: 17, y: 23, w: 8, h: 13,
    color: COLORS.bedroom,
    furniture: bedroomFurniture(8, 13, false),
    doors: [],
    windows: [{ wall: 'right', position: 0.4, width: 3 }],
  });

  // Balcony at bottom
  rooms.push({
    id: 'balcony', type: 'balcony', label: 'BALCONY',
    x: 0, y: H - 4, w: W, h: 4,
    color: COLORS.balcony,
    furniture: [
      { type: 'plant', x: 1, y: 0.8, w: 1.5, h: 1.5 },
      { type: 'plant', x: W - 3, y: 0.8, w: 1.5, h: 1.5 },
    ],
    doors: [{ wall: 'top', position: 0.5, width: 5, swing: 'out' }],
    windows: [],
  });

  // Adjust dining room to not overlap balcony
  const diningRoom = rooms.find(r => r.id === 'dining');
  if (diningRoom) {
    diningRoom.h = H - 4 - diningRoom.y;
  }
  // Adjust bed-1 to not overlap balcony
  const bed1 = rooms.find(r => r.id === 'bed-1');
  if (bed1) {
    bed1.h = H - 4 - bed1.y;
  }

  injectAdjacencyDoors(rooms);
  cleanupDoors(rooms);
  validateAndFixBathrooms(rooms);

  return { width: W, height: H, rooms };
}

function starterPresetB(c: ConfigState): Plan {
  // L-shaped layout: Living top, bedrooms bottom-right
  const W = 33;
  const H = 30;
  const rooms: Room[] = [];

  // Top row: Living Room
  rooms.push({
    id: 'living', type: 'living', label: 'HALL + LIVING ROOM',
    x: 0, y: 0, w: 18, h: 14,
    color: COLORS.living,
    furniture: livingFurniture(18, 14),
    doors: [{ wall: 'top', position: 0.3, width: 3.5, swing: 'in' }],
    windows: [{ wall: 'top', position: 0.65, width: 5 }, { wall: 'left', position: 0.4, width: 4 }],
  });

  // Kitchen right of living
  rooms.push({
    id: 'kitchen', type: 'kitchen', label: 'KITCHEN',
    x: 18, y: 0, w: 15, h: 14,
    color: COLORS.kitchen,
    furniture: kitchenFurniture(15, 14, c.kitchen),
    doors: [],
    windows: [{ wall: 'right', position: 0.5, width: 3 }, { wall: 'top', position: 0.5, width: 3 }],
  });

  // Hallway horizontal
  rooms.push({
    id: 'main-hallway', type: 'hallway', label: 'HALLWAY',
    x: 0, y: 14, w: W, h: 3,
    color: COLORS.hallway,
    furniture: [],
    doors: [],
    windows: [],
  });

  // Bottom row: Bedrooms + bath
  rooms.push({
    id: 'bed-0', type: 'bedroom', label: 'MASTER BEDROOM',
    x: 0, y: 17, w: 14, h: 13,
    color: COLORS.bedroom,
    furniture: bedroomFurniture(14, 13, true),
    doors: [],
    windows: [{ wall: 'left', position: 0.5, width: 4 }, { wall: 'bottom', position: 0.5, width: 3 }],
  });

  rooms.push({
    id: 'bath-attached-bed-0', type: 'bathroom', label: 'BATH',
    x: 14, y: 17, w: 8, h: 8,
    color: COLORS.bathroom,
    furniture: bathroomFurniture(8, 8, true),
    doors: [],
    windows: [{ wall: 'bottom', position: 0.5, width: 2 }],
  });

  rooms.push({
    id: 'bed-1', type: 'bedroom', label: 'BEDROOM 2',
    x: 14, y: 25, w: 8, h: 5,
    color: COLORS.bedroom,
    furniture: bedroomFurniture(8, 5, false),
    doors: [],
    windows: [{ wall: 'bottom', position: 0.5, width: 3 }],
  });

  // Fix bedroom 2 to be taller
  const bed1 = rooms.find(r => r.id === 'bed-1');
  if (bed1) {
    bed1.y = 17;
    bed1.x = 22;
    bed1.w = 11;
    bed1.h = 13;
    bed1.furniture = bedroomFurniture(11, 13, false);
    bed1.windows = [{ wall: 'right', position: 0.4, width: 3 }, { wall: 'bottom', position: 0.5, width: 3 }];
  }
  // Bath also needs adjustment
  const bath = rooms.find(r => r.id === 'bath-attached-bed-0');
  if (bath) {
    bath.x = 14;
    bath.y = 17;
    bath.w = 8;
    bath.h = 13;
    bath.furniture = bathroomFurniture(8, 13, true);
  }

  injectAdjacencyDoors(rooms);
  cleanupDoors(rooms);
  validateAndFixBathrooms(rooms);

  return { width: W, height: H, rooms };
}

// ── FAMILY PRESETS (1600 sqft → ~32×50) ──────────────────────────────────

function familyPresetA(c: ConfigState): Plan {
  // Classic two-wing layout with garden at front-left corner
  const W = 40;
  const H = 40;
  const gardenW = 10;
  const gardenH = 12;
  const rooms: Room[] = [];

  // Garden at front-left corner (top-left)
  rooms.push({
    id: 'garden-0', type: 'garden', label: 'GARDEN',
    x: 0, y: 0, w: gardenW, h: gardenH,
    color: COLORS.garden,
    furniture: gardenFurniture(gardenW, gardenH),
    doors: [],
    windows: [],
  });

  // Living room next to garden
  rooms.push({
    id: 'living', type: 'living', label: 'HALL + LIVING ROOM',
    x: gardenW, y: 0, w: 18, h: 20,
    color: COLORS.living,
    furniture: livingFurniture(18, 20),
    doors: [{ wall: 'left', position: 0.8, width: 3.5, swing: 'in' }],
    windows: [{ wall: 'top', position: 0.4, width: 6 }],
  });

  // Kitchen below garden
  rooms.push({
    id: 'kitchen', type: 'kitchen', label: 'KITCHEN',
    x: 0, y: gardenH, w: gardenW + 4, h: 14,
    color: COLORS.kitchen,
    furniture: kitchenFurniture(gardenW + 4, 14, c.kitchen),
    doors: [],
    windows: [{ wall: 'left', position: 0.5, width: 4 }],
  });

  rooms.push({
    id: 'dining', type: 'dining', label: 'DINING',
    x: 0, y: gardenH + 14, w: gardenW + 4, h: H - gardenH - 14 - 4,
    color: COLORS.dining,
    furniture: diningFurniture(gardenW + 4, H - gardenH - 14 - 4),
    doors: [],
    windows: [{ wall: 'left', position: 0.5, width: 3 }],
  });

  // Hallway
  rooms.push({
    id: 'main-hallway', type: 'hallway', label: 'HALLWAY',
    x: gardenW + 18, y: 0, w: 4, h: H - 4,
    color: COLORS.hallway,
    furniture: [],
    doors: [],
    windows: [],
  });

  // Private wing - right side
  const bedX = gardenW + 18 + 4;
  const bedW = W - bedX;

  rooms.push({
    id: 'bed-0', type: 'bedroom', label: 'MASTER BEDROOM',
    x: bedX, y: 0, w: bedW, h: 14,
    color: COLORS.bedroom,
    furniture: bedroomFurniture(bedW, 14, true),
    doors: [],
    windows: [{ wall: 'right', position: 0.35, width: 4 }, { wall: 'top', position: 0.5, width: 3 }],
  });

  rooms.push({
    id: 'bath-attached-bed-0', type: 'bathroom', label: 'MASTER BATH',
    x: bedX, y: 14, w: bedW, h: 8,
    color: COLORS.bathroom,
    furniture: bathroomFurniture(bedW, 8, true),
    doors: [],
    windows: [{ wall: 'right', position: 0.5, width: 2 }],
  });

  rooms.push({
    id: 'bed-1', type: 'bedroom', label: 'BEDROOM 2',
    x: bedX, y: 22, w: bedW, h: 10,
    color: COLORS.bedroom,
    furniture: bedroomFurniture(bedW, 10, false),
    doors: [],
    windows: [{ wall: 'right', position: 0.4, width: 3 }],
  });

  rooms.push({
    id: 'bath-common-1', type: 'bathroom', label: 'BATH',
    x: bedX, y: 32, w: bedW, h: 8,
    color: COLORS.bathroom,
    furniture: bathroomFurniture(bedW, 8, false),
    doors: [],
    windows: [{ wall: 'right', position: 0.5, width: 2 }],
  });

  // Balcony at bottom
  rooms.push({
    id: 'balcony', type: 'balcony', label: 'BALCONY',
    x: 0, y: H - 4, w: W, h: 4,
    color: COLORS.balcony,
    furniture: [
      { type: 'plant', x: 1, y: 0.8, w: 1.5, h: 1.5 },
      { type: 'plant', x: W - 3, y: 0.8, w: 1.5, h: 1.5 },
    ],
    doors: [{ wall: 'top', position: 0.5, width: 5, swing: 'out' }],
    windows: [],
  });

  // Fix bath-common to not overlap balcony
  const bCommon = rooms.find(r => r.id === 'bath-common-1');
  if (bCommon) {
    bCommon.h = H - 4 - bCommon.y;
  }

  // Add bed-2
  rooms.push({
    id: 'bed-2', type: 'bedroom', label: 'BEDROOM 3',
    x: gardenW + 4, y: 20, w: 14, h: H - 20 - 4,
    color: COLORS.bedroom,
    furniture: bedroomFurniture(14, H - 20 - 4, false),
    doors: [],
    windows: [{ wall: 'bottom', position: 0.5, width: 3 }],
  });

  injectAdjacencyDoors(rooms);
  cleanupDoors(rooms);
  validateAndFixBathrooms(rooms);

  return { width: W, height: H, rooms };
}

function familyPresetB(c: ConfigState): Plan {
  // Open plan with garden at front-right corner
  const W = 40;
  const H = 40;
  const gardenW = 10;
  const gardenH = 10;
  const rooms: Room[] = [];

  // Garden at front-right corner (top-right)
  rooms.push({
    id: 'garden-0', type: 'garden', label: 'GARDEN',
    x: W - gardenW, y: 0, w: gardenW, h: gardenH,
    color: COLORS.garden,
    furniture: gardenFurniture(gardenW, gardenH),
    doors: [],
    windows: [],
  });

  // Top left: Living room (spans most width)
  rooms.push({
    id: 'living', type: 'living', label: 'HALL + LIVING ROOM',
    x: 0, y: 0, w: W - gardenW, h: 16,
    color: COLORS.living,
    furniture: livingFurniture(W - gardenW, 16),
    doors: [{ wall: 'left', position: 0.7, width: 3.5, swing: 'in' }],
    windows: [{ wall: 'top', position: 0.3, width: 6 }, { wall: 'left', position: 0.3, width: 4 }],
  });

  // Below living: Kitchen + Dining side by side
  rooms.push({
    id: 'kitchen', type: 'kitchen', label: 'KITCHEN',
    x: 0, y: 16, w: 16, h: 12,
    color: COLORS.kitchen,
    furniture: kitchenFurniture(16, 12, c.kitchen),
    doors: [],
    windows: [{ wall: 'left', position: 0.5, width: 4 }],
  });

  rooms.push({
    id: 'dining', type: 'dining', label: 'DINING',
    x: 16, y: 16, w: 14, h: 12,
    color: COLORS.dining,
    furniture: diningFurniture(14, 12),
    doors: [],
    windows: [],
  });

  // Hallway - horizontal between public and private
  rooms.push({
    id: 'main-hallway', type: 'hallway', label: 'HALLWAY',
    x: 0, y: 28, w: W, h: 3,
    color: COLORS.hallway,
    furniture: [],
    doors: [],
    windows: [],
  });

  // Right side of garden down
  rooms.push({
    id: 'bed-2', type: 'bedroom', label: 'BEDROOM 3',
    x: W - gardenW, y: gardenH, w: gardenW, h: 18,
    color: COLORS.bedroom,
    furniture: bedroomFurniture(gardenW, 18, false),
    doors: [],
    windows: [{ wall: 'right', position: 0.4, width: 3 }],
  });

  // Bottom row: Bedrooms
  const bottomY = 31;
  const bottomH = H - bottomY;

  rooms.push({
    id: 'bed-0', type: 'bedroom', label: 'MASTER BEDROOM',
    x: 0, y: bottomY, w: 14, h: bottomH,
    color: COLORS.bedroom,
    furniture: bedroomFurniture(14, bottomH, true),
    doors: [],
    windows: [{ wall: 'left', position: 0.4, width: 4 }, { wall: 'bottom', position: 0.5, width: 3 }],
  });

  rooms.push({
    id: 'bath-attached-bed-0', type: 'bathroom', label: 'MASTER BATH',
    x: 14, y: bottomY, w: 8, h: bottomH,
    color: COLORS.bathroom,
    furniture: bathroomFurniture(8, bottomH, true),
    doors: [],
    windows: [{ wall: 'bottom', position: 0.5, width: 2 }],
  });

  rooms.push({
    id: 'bed-1', type: 'bedroom', label: 'BEDROOM 2',
    x: 22, y: bottomY, w: 10, h: bottomH,
    color: COLORS.bedroom,
    furniture: bedroomFurniture(10, bottomH, false),
    doors: [],
    windows: [{ wall: 'right', position: 0.4, width: 3 }, { wall: 'bottom', position: 0.5, width: 3 }],
  });

  rooms.push({
    id: 'bath-common-1', type: 'bathroom', label: 'BATH',
    x: 32, y: bottomY, w: 8, h: bottomH,
    color: COLORS.bathroom,
    furniture: bathroomFurniture(8, bottomH, false),
    doors: [],
    windows: [{ wall: 'right', position: 0.5, width: 2 }],
  });

  injectAdjacencyDoors(rooms);
  cleanupDoors(rooms);
  validateAndFixBathrooms(rooms);

  return { width: W, height: H, rooms };
}

// ── PREMIUM PRESETS (2400 sqft → ~40×60) ─────────────────────────────────

function premiumPresetA(c: ConfigState): Plan {
  // Grand U-shape with garden at front-left corner
  const W = 48;
  const H = 50;
  const gardenW = 14;
  const gardenH = 14;
  const rooms: Room[] = [];

  // Garden at front-left corner
  rooms.push({
    id: 'garden-0', type: 'garden', label: 'GARDEN',
    x: 0, y: 0, w: gardenW, h: gardenH,
    color: COLORS.garden,
    furniture: gardenFurniture(gardenW, gardenH),
    doors: [],
    windows: [],
  });

  // Grand living room
  rooms.push({
    id: 'living', type: 'living', label: 'HALL + LIVING ROOM',
    x: gardenW, y: 0, w: 20, h: 22,
    color: COLORS.living,
    furniture: livingFurniture(20, 22),
    doors: [{ wall: 'left', position: 0.85, width: 4, swing: 'in' }],
    windows: [{ wall: 'top', position: 0.3, width: 6 }, { wall: 'top', position: 0.7, width: 5 }],
  });

  // Kitchen below garden
  rooms.push({
    id: 'kitchen', type: 'kitchen', label: 'KITCHEN',
    x: 0, y: gardenH, w: gardenW, h: 16,
    color: COLORS.kitchen,
    furniture: kitchenFurniture(gardenW, 16, c.kitchen),
    doors: [],
    windows: [{ wall: 'left', position: 0.4, width: 4 }],
  });

  rooms.push({
    id: 'dining', type: 'dining', label: 'DINING',
    x: 0, y: gardenH + 16, w: gardenW, h: H - gardenH - 16 - 4,
    color: COLORS.dining,
    furniture: diningFurniture(gardenW, H - gardenH - 16 - 4),
    doors: [],
    windows: [{ wall: 'left', position: 0.5, width: 3 }],
  });

  // Hallway vertical
  rooms.push({
    id: 'main-hallway', type: 'hallway', label: 'HALLWAY',
    x: gardenW + 20, y: 0, w: 4, h: H - 4,
    color: COLORS.hallway,
    furniture: [],
    doors: [],
    windows: [],
  });

  // Private wing - right
  const bedX = gardenW + 20 + 4;
  const bedW = W - bedX;

  rooms.push({
    id: 'bed-0', type: 'bedroom', label: 'MASTER BEDROOM',
    x: bedX, y: 0, w: bedW, h: 16,
    color: COLORS.bedroom,
    furniture: bedroomFurniture(bedW, 16, true),
    doors: [],
    windows: [{ wall: 'right', position: 0.3, width: 4 }, { wall: 'right', position: 0.7, width: 3 }, { wall: 'top', position: 0.5, width: 4 }],
  });

  rooms.push({
    id: 'bath-attached-bed-0', type: 'bathroom', label: 'MASTER BATH',
    x: bedX, y: 16, w: bedW, h: 9,
    color: COLORS.bathroom,
    furniture: bathroomFurniture(bedW, 9, true),
    doors: [],
    windows: [{ wall: 'right', position: 0.5, width: 2 }],
  });

  rooms.push({
    id: 'bed-1', type: 'bedroom', label: 'BEDROOM 2',
    x: bedX, y: 25, w: bedW, h: 11,
    color: COLORS.bedroom,
    furniture: bedroomFurniture(bedW, 11, false),
    doors: [],
    windows: [{ wall: 'right', position: 0.4, width: 3 }],
  });

  rooms.push({
    id: 'bath-attached-bed-1', type: 'bathroom', label: 'ENSUITE 2',
    x: bedX, y: 36, w: bedW, h: 7,
    color: COLORS.bathroom,
    furniture: bathroomFurniture(bedW, 7, false),
    doors: [],
    windows: [{ wall: 'right', position: 0.5, width: 2 }],
  });

  rooms.push({
    id: 'bed-2', type: 'bedroom', label: 'BEDROOM 3',
    x: gardenW, y: 22, w: 20, h: 12,
    color: COLORS.bedroom,
    furniture: bedroomFurniture(20, 12, false),
    doors: [],
    windows: [{ wall: 'left', position: 0.5, width: 3 }],
  });

  rooms.push({
    id: 'bed-3', type: 'bedroom', label: 'BEDROOM 4',
    x: gardenW, y: 34, w: 20, h: 12,
    color: COLORS.bedroom,
    furniture: bedroomFurniture(20, 12, false),
    doors: [],
    windows: [{ wall: 'left', position: 0.5, width: 3 }],
  });

  rooms.push({
    id: 'bath-common-1', type: 'bathroom', label: 'BATH',
    x: bedX, y: 43, w: bedW, h: H - 43 - 4,
    color: COLORS.bathroom,
    furniture: bathroomFurniture(bedW, H - 43 - 4, false),
    doors: [],
    windows: [{ wall: 'right', position: 0.5, width: 2 }],
  });

  // Balcony
  rooms.push({
    id: 'balcony', type: 'balcony', label: 'BALCONY',
    x: 0, y: H - 4, w: W, h: 4,
    color: COLORS.balcony,
    furniture: [
      { type: 'plant', x: 1, y: 0.8, w: 1.5, h: 1.5 },
      { type: 'plant', x: W - 3, y: 0.8, w: 1.5, h: 1.5 },
    ],
    doors: [{ wall: 'top', position: 0.5, width: 5, swing: 'out' }],
    windows: [],
  });

  injectAdjacencyDoors(rooms);
  cleanupDoors(rooms);
  validateAndFixBathrooms(rooms);

  return { width: W, height: H, rooms };
}

function premiumPresetB(c: ConfigState): Plan {
  // H-shape layout with garden at front-right
  const W = 50;
  const H = 48;
  const gardenW = 12;
  const gardenH = 12;
  const rooms: Room[] = [];

  // Garden at front-right corner (top-right)
  rooms.push({
    id: 'garden-0', type: 'garden', label: 'GARDEN',
    x: W - gardenW, y: 0, w: gardenW, h: gardenH,
    color: COLORS.garden,
    furniture: gardenFurniture(gardenW, gardenH),
    doors: [],
    windows: [],
  });

  // Left wing top: Living
  rooms.push({
    id: 'living', type: 'living', label: 'HALL + LIVING ROOM',
    x: 0, y: 0, w: 22, h: 20,
    color: COLORS.living,
    furniture: livingFurniture(22, 20),
    doors: [{ wall: 'left', position: 0.8, width: 4, swing: 'in' }],
    windows: [{ wall: 'top', position: 0.3, width: 6 }, { wall: 'left', position: 0.35, width: 5 }],
  });

  // Kitchen + Dining below living
  rooms.push({
    id: 'kitchen', type: 'kitchen', label: 'KITCHEN',
    x: 0, y: 20, w: 14, h: 14,
    color: COLORS.kitchen,
    furniture: kitchenFurniture(14, 14, c.kitchen),
    doors: [],
    windows: [{ wall: 'left', position: 0.5, width: 4 }],
  });

  rooms.push({
    id: 'dining', type: 'dining', label: 'DINING',
    x: 14, y: 20, w: 8, h: 14,
    color: COLORS.dining,
    furniture: diningFurniture(8, 14),
    doors: [],
    windows: [],
  });

  // Central hallway
  rooms.push({
    id: 'main-hallway', type: 'hallway', label: 'HALLWAY',
    x: 22, y: 0, w: 4, h: H - 4,
    color: COLORS.hallway,
    furniture: [],
    doors: [],
    windows: [],
  });

  // Right wing: Bedrooms
  const bedX = 26;
  const bedW = W - bedX;

  // Below garden
  rooms.push({
    id: 'bed-0', type: 'bedroom', label: 'MASTER BEDROOM',
    x: bedX, y: 0, w: W - gardenW - bedX, h: 16,
    color: COLORS.bedroom,
    furniture: bedroomFurniture(W - gardenW - bedX, 16, true),
    doors: [],
    windows: [{ wall: 'top', position: 0.4, width: 4 }],
  });

  rooms.push({
    id: 'bath-attached-bed-0', type: 'bathroom', label: 'MASTER BATH',
    x: bedX, y: 16, w: bedW, h: 9,
    color: COLORS.bathroom,
    furniture: bathroomFurniture(bedW, 9, true),
    doors: [],
    windows: [{ wall: 'right', position: 0.5, width: 2 }],
  });

  rooms.push({
    id: 'bed-1', type: 'bedroom', label: 'BEDROOM 2',
    x: bedX, y: 25, w: bedW, h: 10,
    color: COLORS.bedroom,
    furniture: bedroomFurniture(bedW, 10, false),
    doors: [],
    windows: [{ wall: 'right', position: 0.4, width: 3 }],
  });

  rooms.push({
    id: 'bath-attached-bed-1', type: 'bathroom', label: 'ENSUITE 2',
    x: bedX, y: 35, w: bedW * 0.5, h: 7,
    color: COLORS.bathroom,
    furniture: bathroomFurniture(bedW * 0.5, 7, false),
    doors: [],
    windows: [],
  });

  rooms.push({
    id: 'bed-2', type: 'bedroom', label: 'BEDROOM 3',
    x: bedX + bedW * 0.5, y: 35, w: bedW * 0.5, h: 7,
    color: COLORS.bedroom,
    furniture: bedroomFurniture(bedW * 0.5, 7, false),
    doors: [],
    windows: [{ wall: 'right', position: 0.5, width: 3 }],
  });

  rooms.push({
    id: 'bed-3', type: 'bedroom', label: 'BEDROOM 4',
    x: bedX, y: 42, w: bedW * 0.6, h: H - 42 - 4,
    color: COLORS.bedroom,
    furniture: bedroomFurniture(bedW * 0.6, H - 42 - 4, false),
    doors: [],
    windows: [{ wall: 'bottom', position: 0.5, width: 3 }],
  });

  rooms.push({
    id: 'bath-common-1', type: 'bathroom', label: 'BATH',
    x: bedX + bedW * 0.6, y: 42, w: bedW * 0.4, h: H - 42 - 4,
    color: COLORS.bathroom,
    furniture: bathroomFurniture(bedW * 0.4, H - 42 - 4, false),
    doors: [],
    windows: [{ wall: 'right', position: 0.5, width: 2 }],
  });

  // Extra rooms at bottom-left
  rooms.push({
    id: 'bed-extra', type: 'bedroom', label: 'STUDY',
    x: 0, y: 34, w: 22, h: H - 34 - 4,
    color: COLORS.bedroom,
    furniture: bedroomFurniture(22, H - 34 - 4, false),
    doors: [],
    windows: [{ wall: 'left', position: 0.4, width: 4 }, { wall: 'bottom', position: 0.5, width: 3 }],
  });

  // Right of master: room for garden connection
  rooms.push({
    id: 'bed-0-ext', type: 'bedroom', label: 'MASTER WALK-IN',
    x: W - gardenW, y: gardenH, w: gardenW, h: 16 - gardenH + 4,
    color: COLORS.bedroom,
    furniture: [{ type: 'wardrobe', x: 1, y: 1, w: gardenW - 2, h: 3 }],
    doors: [],
    windows: [{ wall: 'right', position: 0.5, width: 3 }],
  });

  // Balcony
  rooms.push({
    id: 'balcony', type: 'balcony', label: 'BALCONY',
    x: 0, y: H - 4, w: W, h: 4,
    color: COLORS.balcony,
    furniture: [
      { type: 'plant', x: 1, y: 0.8, w: 1.5, h: 1.5 },
      { type: 'plant', x: W - 3, y: 0.8, w: 1.5, h: 1.5 },
    ],
    doors: [{ wall: 'top', position: 0.5, width: 5, swing: 'out' }],
    windows: [],
  });

  injectAdjacencyDoors(rooms);
  cleanupDoors(rooms);
  validateAndFixBathrooms(rooms);

  return { width: W, height: H, rooms };
}


// ── Main plan generator ────────────────────────────────────────────────────

export function generatePlan(c: ConfigState): Plan {
  const presetId = c.presetId || 0;
  
  switch (c.homeType) {
    case 'starter':
      return presetId === 0 ? starterPresetA(c) : starterPresetB(c);
    case 'family':
      return presetId === 0 ? familyPresetA(c) : familyPresetB(c);
    case 'premium':
      return presetId === 0 ? premiumPresetA(c) : premiumPresetB(c);
    default:
      return starterPresetA(c);
  }
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
