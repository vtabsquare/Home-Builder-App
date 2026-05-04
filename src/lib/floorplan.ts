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
  garden:   'hsl(120 25% 75%)',
};

// ── Furniture helpers (all wall-aligned, walking-space aware) ──────────────

export function regenerateFurniture(room: Room, kitchenType: string = 'open'): FurnitureItem[] {
  const orient = room.orientation || 0;
  switch (room.type) {
    case 'bedroom':
      return bedroomFurniture(room.w, room.h, room.id === 'bed-0', orient);
    case 'bathroom':
      const isMasterBath = room.id === 'bath-attached-bed-0';
      const bType = room.id.includes('attached') ? 'attached' : 'common';
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
    default:
      return room.furniture;
  }
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

  // For simplicity, we rotate the anchor wall
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
  // a's right touches b's left
  if (Math.abs((a.x + a.w) - b.x) < EPS && overlaps1D(a.y, a.y + a.h, b.y, b.y + b.h)) {
    return { shared: true, wall: 'right' };
  }
  // a's left touches b's right
  if (Math.abs(a.x - (b.x + b.w)) < EPS && overlaps1D(a.y, a.y + a.h, b.y, b.y + b.h)) {
    return { shared: true, wall: 'left' };
  }
  // a's bottom touches b's top
  if (Math.abs((a.y + a.h) - b.y) < EPS && overlaps1D(a.x, a.x + a.w, b.x, b.x + b.w)) {
    return { shared: true, wall: 'bottom' };
  }
  // a's top touches b's bottom
  if (Math.abs(a.y - (b.y + b.h)) < EPS && overlaps1D(a.x, a.x + a.w, b.x, b.x + b.w)) {
    return { shared: true, wall: 'top' };
  }
  return { shared: false, wall: 'top' };
}

function overlaps1D(a0: number, a1: number, b0: number, b1: number): boolean {
  return Math.min(a1, b1) - Math.max(a0, b0) > 1.0;
}

/** Returns midpoint (0–1) along room A's wall where it touches room B */
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

/** Inject doors between all adjacent rooms (deduplicating pairs) */
function injectAdjacencyDoors(rooms: Room[]): void {
  const connected = new Set<string>();
  const hasDining = rooms.some(r => r.type === 'dining');

  // Helper to check if a bedroom already has an entrance from a hallway or living room
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

      // Skip balcony-to-balcony or carport internal
      if (a.type === 'carport' || b.type === 'carport') continue;

      const types = [a.type, b.type];
      
      // 1. Bedroom ↔ Bedroom -> REJECT
      if (a.type === 'bedroom' && b.type === 'bedroom') continue;

      // 2. Hall/Living ↔ Kitchen -> REJECT if Dining exists
      if (hasDining && types.includes('kitchen')) {
        if (types.includes('hallway') || types.includes('living')) continue;
      }

      // 3. Bathrooms & Bedrooms -> ONLY Attached to parent
      if (types.includes('bathroom') && types.includes('bedroom')) {
        const bath = a.type === 'bathroom' ? a : b;
        const bed = a.type === 'bedroom' ? a : b;
        if (bath.id !== `bath-attached-${bed.id}`) continue;
      }
      
      // 4. Bathrooms & Hallways -> ONLY Common baths
      if (types.includes('bathroom') && types.includes('hallway')) {
        const bath = a.type === 'bathroom' ? a : b;
        if (bath.id.includes('attached')) continue; // Attached bath has no hallway door
      }

      // 5. Bathrooms ↔ Bathrooms -> REJECT
      if (a.type === 'bathroom' && b.type === 'bathroom') continue;

      // 6. Bathrooms ↔ Living/Kitchen/Dining -> REJECT
      if (types.includes('bathroom') && ['living', 'kitchen', 'dining'].some(t => types.includes(t as any))) continue;

      // 7. BATHROOM SINGLE DOOR ENFORCEMENT
      if (a.type === 'bathroom' && a.doors.length >= 1) continue;
      if (b.type === 'bathroom' && b.doors.length >= 1) continue;

      // 8. BEDROOM SINGLE ENTRANCE ENFORCEMENT
      // A bedroom can only have ONE door to a hallway/living area.
      if (a.type === 'bedroom' && ['hallway', 'living'].includes(b.type)) {
        if (hasEntrance(a)) continue;
      }
      if (b.type === 'bedroom' && ['hallway', 'living'].includes(a.type)) {
        if (hasEntrance(b)) continue;
      }

      // 9. BEDROOM ↔ KITCHEN/DINING -> REJECT
      if (types.includes('bedroom') && ['kitchen', 'dining'].some(t => types.includes(t as any))) continue;

      const adj = roomsAreAdjacent(a, b);
      if (!adj.shared) continue;

      const posA = sharedWallMidpoint(a, adj.wall, b);
      const oppositeWall: Record<string, DoorInfo['wall']> = {
        top: 'bottom', bottom: 'top', left: 'right', right: 'left',
      };
      const posB = sharedWallMidpoint(b, oppositeWall[adj.wall], a);

      // Clamp position so door doesn't fall outside wall
      const clamp = (v: number) => Math.max(0.15, Math.min(0.85, v));

      // Only add door if neither room already has one on this shared wall
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
  // 1. Bathrooms -> exactly 1 door, correct connections
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
          // Attached bathroom must only connect to its assigned bedroom
          isValid = (connectedRoom.id === targetBedId);
        } else {
          // Common bathroom must only connect to a hallway
          isValid = (connectedRoom.type === 'hallway');
        }

        if (isValid && !validDoorFound) {
          validDoors.push(door);
          validDoorFound = true; // Mark that we've found our SINGLE valid door
        } else {
          // Invalid or redundant door -> remove corresponding door from the connected room
          connectedRoom.doors = connectedRoom.doors.filter(d => d.connectsTo !== room.id);
        }
      }

      // Update the bathroom to strictly have only the 1 valid door
      room.doors = validDoors;
    }
  }

  // 2. Bedrooms -> exactly 1 entrance (hallway/living)
  for (const room of rooms) {
    if (room.type === 'bedroom') {
      let entranceFound = false;
      const validDoors: DoorInfo[] = [];

      for (const door of room.doors) {
        if (!door.connectsTo) {
          validDoors.push(door); // Keep external doors (like balcony)
          continue;
        }

        const connectedRoom = rooms.find(r => r.id === door.connectsTo);
        if (!connectedRoom) {
          validDoors.push(door);
          continue;
        }

        if (connectedRoom.type === 'bathroom' || connectedRoom.type === 'balcony') {
          validDoors.push(door); // Internal attached bath or balcony doors are fine
        } else if (connectedRoom.type === 'hallway' || connectedRoom.type === 'living') {
          if (!entranceFound) {
            validDoors.push(door);
            entranceFound = true;
          } else {
            // Remove secondary entrance
            connectedRoom.doors = connectedRoom.doors.filter(d => d.connectsTo !== room.id);
          }
        } else {
          // Connected to kitchen/dining/other bedroom -> Invalid!
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
      // Auto-resize if it violates the "master is largest" rule
      // Shrink the offending bathroom to ensure master is at least 25% larger
      const scale = Math.sqrt((masterArea / 1.25) / area);
      bath.w = Math.max(5, bath.w * scale);
      bath.h = Math.max(7, bath.h * scale);
    }
  }
}

// ── Main plan generator ────────────────────────────────────────────────────

export function generatePlan(c: ConfigState): Plan {
  const area = computeArea(c);
  // Ensure we have enough area for all the rooms
  const minArea = Math.max(area, c.bedrooms * 200 + c.bathrooms * 80 + 400); 
  let planH = Math.round(Math.sqrt(minArea / 1.5));
  let planW = Math.round(minArea / planH);
  let W = Math.max(planW, 32);
  let H = Math.max(planH, 28);

  const rooms: Room[] = [];
  const hasCarport = c.addons.includes('carport');
  const hasBalcony = true;

  const balconyH = hasBalcony ? 4 : 0;
  const carportW = hasCarport ? 7 : 0;
  let mainW = W - carportW;
  let mainH = H - balconyH;

  // --- Layout Regions ---
  const hallW = 4.5;
  let privateTotalW = Math.max(22, Math.floor(mainW * 0.55));
  let bedColW = privateTotalW - hallW;

  if (bedColW < 12) {
    const diff = 12 - bedColW;
    bedColW = 12;
    privateTotalW += diff;
    mainW += diff;
    W = mainW + carportW;
  }

  let livingW = mainW - privateTotalW;
  if (livingW < 12) {
    const diff = 12 - livingW;
    livingW = 12;
    mainW += diff;
    W = mainW + carportW;
  }

  const hallX = carportW + livingW;
  const bedX = hallX + hallW;

  // --- Allocate Bathrooms ---
  let bCount = 1;
  const allocateBath = (isAttached: boolean, parentBed?: number) => {
    const bath = {
      id: isAttached ? `bath-attached-bed-${parentBed}` : `bath-common-${bCount}`,
      bType: isAttached ? 'attached' : 'common',
      label: isAttached && parentBed === 0 ? 'MASTER BATH' : (isAttached ? `ENSUITE ${parentBed! + 1}` : `BATH ${bCount}`),
      parent: parentBed
    };
    if (!isAttached) bCount++;
    return bath;
  };

  const totalBaths = c.bathrooms;
  const bathQueue: any[] = [];
  
  if (totalBaths === c.bedrooms) {
    for (let i = 0; i < c.bedrooms; i++) bathQueue.push(allocateBath(true, i));
  } else if (totalBaths > c.bedrooms) {
    for (let i = 0; i < c.bedrooms; i++) bathQueue.push(allocateBath(true, i));
    const extra = totalBaths - c.bedrooms;
    for (let i = 0; i < extra; i++) bathQueue.push(allocateBath(false));
  } else {
    // totalBaths < c.bedrooms
    if (totalBaths >= 1) bathQueue.push(allocateBath(true, 0));
    for (let i = 1; i < totalBaths; i++) bathQueue.push(allocateBath(false));
  }

  const bathRows: { baths: any[], height: number }[] = Array(c.bedrooms).fill(null).map(() => ({ baths: [], height: 0 }));

  // Distribute Attached Baths
  for (const bath of bathQueue.filter(b => b.bType === 'attached')) {
    bathRows[bath.parent].baths.push(bath);
  }

  // Distribute Common Baths
  const commonBaths = bathQueue.filter(b => b.bType === 'common');
  for (const bath of commonBaths) {
    let bestRow = c.bedrooms > 1 ? 1 : 0;
    for (let i = c.bedrooms > 1 ? 1 : 0; i < c.bedrooms; i++) {
      if (bathRows[i].baths.length < bathRows[bestRow].baths.length) bestRow = i;
    }
    if (c.bedrooms > 1 && bathRows[bestRow].baths.length >= 2 && bathRows[0].baths.length < 2) {
      bestRow = 0;
    }
    bathRows[bestRow].baths.unshift(bath); // Ensure common is on the left
  }

  // Adjust bedColW based on max baths in a row to ensure min width
  const maxBathsInRow = Math.max(...bathRows.map(r => r.baths.length), 0);
  let minBedColW = maxBathsInRow >= 2 ? 14 : 12; // Gives >= 5.6 width for common bath
  
  if (bedColW < minBedColW) {
    const diff = minBedColW - bedColW;
    bedColW = minBedColW;
    privateTotalW += diff;
    mainW += diff;
    W = mainW + carportW;
  }

  // --- Calculate Heights ---
  bathRows.forEach((row) => {
    if (row.baths.length === 0) row.height = 0;
    else if (row.baths.some(b => b.parent === 0)) row.height = 9.0; // Master row is physically taller
    else row.height = 7.0; // Normal row
  });

  const totalBathH = bathRows.reduce((sum, r) => sum + r.height, 0);
  const minBedH = 10;
  const masterMinH = 14;

  let requiredH = totalBathH + masterMinH + (c.bedrooms - 1) * minBedH;
  if (mainH < requiredH) {
    mainH = requiredH;
    H = mainH + balconyH;
  }

  let availableForBeds = mainH - totalBathH;
  let masterH = Math.max(masterMinH, Math.floor(availableForBeds * 0.45));
  let otherH = c.bedrooms > 1 ? Math.max(minBedH, Math.floor((availableForBeds - masterH) / (c.bedrooms - 1))) : 0;

  if (c.bedrooms > 1 && masterH + otherH * (c.bedrooms - 1) > availableForBeds) {
    masterH = availableForBeds - otherH * (c.bedrooms - 1);
  }

  let bedHeights = [masterH];
  for (let i = 1; i < c.bedrooms; i++) bedHeights.push(otherH);
  bedHeights[0] += availableForBeds - bedHeights.reduce((a,b)=>a+b, 0);

  // --- Generate Private Area Rooms ---
  let currentY = 0;
  for (let i = 0; i < c.bedrooms; i++) {
    const bH = bedHeights[i];
    const isMaster = i === 0;
    
    rooms.push({
      id: `bed-${i}`,
      type: 'bedroom',
      label: isMaster ? 'MASTER BEDROOM' : `BEDROOM ${i + 1}`,
      x: bedX,
      y: currentY,
      w: bedColW,
      h: bH,
      color: COLORS.bedroom,
      furniture: bedroomFurniture(bedColW, bH, isMaster),
      doors: [],
      windows: [
        { wall: 'right', position: 0.35, width: 4 },
        ...(isMaster ? [{ wall: 'right' as const, position: 0.72, width: 3 }] : []),
      ],
    });
    currentY += bH;

    const rowBaths = bathRows[i].baths;
    if (rowBaths.length > 0) {
      let currentX = bedX;
      const rowH = bathRows[i].height;
      // Calculate weighted distribution: Master 1.5 > Attached 1.2 > Common 1.0
      const totalWeight = rowBaths.reduce((sum, bath) => {
        if (bath.bType === 'attached' && bath.parent === 0) return sum + 1.5;
        if (bath.bType === 'attached') return sum + 1.2;
        return sum + 1.0;
      }, 0);

      rowBaths.forEach((bath, bIdx) => {
        let weight = 1.0;
        if (bath.bType === 'attached' && bath.parent === 0) weight = 1.5;
        else if (bath.bType === 'attached') weight = 1.2;
        
        const bW = (weight / totalWeight) * bedColW;

        rooms.push({
          id: bath.id,
          type: 'bathroom',
          label: bath.label,
          x: currentX,
          y: currentY,
          w: bW,
          h: rowH,
          color: COLORS.bathroom,
          furniture: bathroomFurniture(bW, rowH, bath.bType === 'attached' && bath.parent === 0, bath.bType),
          doors: [],
          windows: bIdx === rowBaths.length - 1 ? [{ wall: 'right', position: 0.5, width: 2 }] : [],
        });
        currentX += bW;
      });
      currentY += rowH;
    }
  }

  // --- Main Hallway ---
  rooms.push({
    id: 'main-hallway',
    type: 'hallway',
    label: 'HALLWAY',
    x: hallX,
    y: 0,
    w: hallW,
    h: mainH,
    color: COLORS.hallway,
    furniture: [],
    doors: [], 
    windows: [],
  });

  // --- Living / Kitchen / Dining ---
  const livingH = Math.floor(mainH * 0.55);
  rooms.push({
    id: 'living',
    type: 'living',
    label: 'HALL + LIVING ROOM',
    x: carportW,
    y: 0,
    w: livingW,
    h: livingH,
    color: COLORS.living,
    furniture: livingFurniture(livingW, livingH),
    doors: [{ wall: 'left', position: 0.8, width: 3.5, swing: 'in' }], 
    windows: [
      { wall: 'left', position: 0.3, width: 5 },
      { wall: 'top', position: 0.5, width: 6 },
    ],
  });

  const kitchenY = livingH;
  const kitchenH = mainH - livingH;
  let kitchenW = livingW;
  let diningW = 0;

  if (c.kitchen === 'galley') {
    kitchenW = Math.floor(livingW * 0.48);
    diningW = livingW - kitchenW;
  } else if (c.kitchen === 'standard') {
    kitchenW = Math.floor(livingW * 0.62);
    diningW = livingW - kitchenW;
  }

  rooms.push({
    id: 'kitchen',
    type: 'kitchen',
    label: 'KITCHEN',
    x: carportW,
    y: kitchenY,
    w: kitchenW,
    h: kitchenH,
    color: COLORS.kitchen,
    furniture: kitchenFurniture(kitchenW, kitchenH, c.kitchen),
    doors: [],
    windows: [{ wall: 'left', position: 0.5, width: 4 }],
  });

  if (diningW > 0) {
    rooms.push({
      id: 'dining',
      type: 'dining',
      label: 'DINING',
      x: carportW + kitchenW,
      y: kitchenY,
      w: diningW,
      h: kitchenH,
      color: COLORS.dining,
      furniture: diningFurniture(diningW, kitchenH),
      doors: [],
      windows: [],
    });
  }

  // --- Balcony & Carport ---
  if (hasBalcony) {
    rooms.push({
      id: 'balcony',
      type: 'balcony',
      label: 'BALCONY',
      x: carportW,
      y: mainH,
      w: W - carportW,
      h: balconyH,
      color: COLORS.balcony,
      furniture: [
        { type: 'plant', x: 1, y: 0.8, w: 1.5, h: 1.5 },
        { type: 'plant', x: W - carportW - 2.5, y: 0.8, w: 1.5, h: 1.5 },
      ],
      doors: [{ wall: 'top', position: 0.5, width: 5, swing: 'out' }],
      windows: [],
    });
  }

  if (hasCarport) {
    rooms.push({
      id: 'carport',
      type: 'carport',
      label: 'CARPORT',
      x: 0,
      y: 0,
      w: carportW,
      h: H,
      color: COLORS.carport,
      furniture: [],
      doors: [{ wall: 'right', position: 0.5, width: 5 }],
      windows: [],
    });
  }

  injectAdjacencyDoors(rooms);
  cleanupDoors(rooms);
  validateAndFixBathrooms(rooms);
  
  // Final safeguard: filter out invalid rooms mathematically
  return { 
    width: W, 
    height: H, 
    rooms: rooms.filter(r => {
      if (r.type === 'bathroom') return r.w >= 4.9 && r.h >= 6.9;
      if (r.type === 'bedroom') return r.w >= 9.9 && r.h >= 9.9;
      if (r.type === 'hallway' && r.label === '') return false;
      return true;
    }) 
  };
}
