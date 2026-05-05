/**
 * Intelligent Door Placement Engine
 * 
 * Analyzes room adjacency in a custom-editor layout and automatically
 * places doors between rooms following architectural best practices
 * aligned with Guyana-style home layouts.
 *
 * Rules:
 *  1. Every bedroom must have exactly one entrance door (to living/hallway/kitchen/dining).
 *  2. Master bedrooms get an attached bathroom door if a bathroom is adjacent.
 *  3. Common bathrooms get one door to the nearest corridor/living area.
 *  4. Open-plan rooms (living ↔ kitchen ↔ dining) use open archways.
 *  5. One main entrance door on an exterior wall of the living room.
 *  6. Garden/balcony rooms are excluded from door injection.
 *  7. No bedroom-to-bedroom doors.
 *  8. Bathrooms get at most one door.
 */

import { Plan, Room, DoorInfo } from './floorplan';

// ── Helpers ────────────────────────────────────────────────────────────────

function overlaps1D(a0: number, a1: number, b0: number, b1: number): boolean {
  return Math.min(a1, b1) - Math.max(a0, b0) > 1.0;
}

interface AdjacencyResult {
  shared: boolean;
  wall: 'top' | 'bottom' | 'left' | 'right';
  overlapLength: number;
}

function checkAdjacency(a: Room, b: Room): AdjacencyResult {
  const EPS = 1.0; // tolerance for snapping imprecision in custom editor

  // A's right edge → B's left edge
  if (Math.abs((a.x + a.w) - b.x) < EPS && overlaps1D(a.y, a.y + a.h, b.y, b.y + b.h)) {
    const overlap = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    return { shared: true, wall: 'right', overlapLength: overlap };
  }
  // A's left edge → B's right edge
  if (Math.abs(a.x - (b.x + b.w)) < EPS && overlaps1D(a.y, a.y + a.h, b.y, b.y + b.h)) {
    const overlap = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    return { shared: true, wall: 'left', overlapLength: overlap };
  }
  // A's bottom edge → B's top edge
  if (Math.abs((a.y + a.h) - b.y) < EPS && overlaps1D(a.x, a.x + a.w, b.x, b.x + b.w)) {
    const overlap = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    return { shared: true, wall: 'bottom', overlapLength: overlap };
  }
  // A's top edge → B's bottom edge
  if (Math.abs(a.y - (b.y + b.h)) < EPS && overlaps1D(a.x, a.x + a.w, b.x, b.x + b.w)) {
    const overlap = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    return { shared: true, wall: 'top', overlapLength: overlap };
  }
  return { shared: false, wall: 'top', overlapLength: 0 };
}

const OPPOSITE_WALL: Record<string, DoorInfo['wall']> = {
  top: 'bottom', bottom: 'top', left: 'right', right: 'left',
};

function sharedWallMidpoint(a: Room, wall: 'top' | 'bottom' | 'left' | 'right', b: Room): number {
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

function clampDoorPos(v: number): number {
  return Math.max(0.15, Math.min(0.85, v));
}

function getDoorType(typeA: Room['type'], typeB: Room['type']): 'standard' | 'open' {
  const openTypes: Room['type'][] = ['living', 'kitchen', 'dining'];
  if (openTypes.includes(typeA) && openTypes.includes(typeB)) return 'open';
  return 'standard';
}

// Is this a room type that should be excluded from door connections?
function isExcludedType(type: Room['type']): boolean {
  return type === 'garden' || type === 'carport';
}

// "Corridor" rooms that serve as connectors
function isCorridorType(type: Room['type']): boolean {
  return type === 'hallway' || type === 'living';
}

// Can this room serve as an entrance source for a bedroom?
function isEntranceType(type: Room['type']): boolean {
  return type === 'hallway' || type === 'living' || type === 'kitchen' || type === 'dining';
}

// ── Adjacency graph builder ────────────────────────────────────────────────

interface Adjacency {
  roomA: Room;
  roomB: Room;
  wallA: DoorInfo['wall'];
  wallB: DoorInfo['wall'];
  midA: number;
  midB: number;
  overlapLength: number;
}

function buildAdjacencyGraph(rooms: Room[]): Adjacency[] {
  const result: Adjacency[] = [];
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      const a = rooms[i];
      const b = rooms[j];
      if (isExcludedType(a.type) || isExcludedType(b.type)) continue;

      const adj = checkAdjacency(a, b);
      if (!adj.shared) continue;
      if (adj.overlapLength < 2.5) continue; // Need at least 2.5ft of shared wall for a door

      const wallA = adj.wall;
      const wallB = OPPOSITE_WALL[wallA];
      const midA = clampDoorPos(sharedWallMidpoint(a, wallA, b));
      const midB = clampDoorPos(sharedWallMidpoint(b, wallB, a));

      result.push({ roomA: a, roomB: b, wallA, wallB, midA, midB, overlapLength: adj.overlapLength });
    }
  }
  return result;
}

// ── Door placement logic ───────────────────────────────────────────────────

function addDoorPair(a: Room, wallA: DoorInfo['wall'], posA: number, b: Room, wallB: DoorInfo['wall'], posB: number, doorWidth: number = 3) {
  const doorType = getDoorType(a.type, b.type);
  a.doors.push({ wall: wallA, position: posA, width: doorWidth, swing: 'in', connectsTo: b.id, doorType });
  b.doors.push({ wall: wallB, position: posB, width: doorWidth, swing: 'in', connectsTo: a.id, doorType });
}

/**
 * Intelligently place doors on a plan from the custom editor.
 * This modifies rooms in-place and returns the updated plan.
 */
export function intelligentlyPlaceDoors(plan: Plan): Plan {
  const rooms = plan.rooms.map(r => ({ ...r, doors: [] as DoorInfo[] })); // clear all doors
  const adjacencies = buildAdjacencyGraph(rooms);

  const connected = new Set<string>();
  const key = (a: string, b: string) => [a, b].sort().join('|');

  // Track which rooms have an entrance already
  const hasEntrance = new Set<string>();
  const bathroomDoorCount = new Map<string, number>();

  // ── Phase 1: Connect open-plan rooms (living ↔ kitchen ↔ dining) ──

  for (const adj of adjacencies) {
    const types = [adj.roomA.type, adj.roomB.type];
    const openTypes: Room['type'][] = ['living', 'kitchen', 'dining'];
    if (openTypes.includes(types[0] as Room['type']) && openTypes.includes(types[1] as Room['type'])) {
      const k = key(adj.roomA.id, adj.roomB.id);
      if (connected.has(k)) continue;
      addDoorPair(adj.roomA, adj.wallA, adj.midA, adj.roomB, adj.wallB, adj.midB, 4);
      connected.add(k);
    }
  }

  // ── Phase 2: Connect bedrooms to master bathrooms (attached) ──

  // Heuristic: if a bedroom label contains "MASTER" and a bathroom is adjacent, treat it as attached
  const bedrooms = rooms.filter(r => r.type === 'bedroom');
  const bathrooms = rooms.filter(r => r.type === 'bathroom');

  for (const bed of bedrooms) {
    const isMaster = bed.label.toLowerCase().includes('master');
    if (!isMaster) continue;

    // Find best adjacent bathroom (largest overlap)
    const candidates = adjacencies
      .filter(a =>
        ((a.roomA.id === bed.id && a.roomB.type === 'bathroom') ||
         (a.roomB.id === bed.id && a.roomA.type === 'bathroom'))
      )
      .sort((a, b) => b.overlapLength - a.overlapLength);

    if (candidates.length > 0) {
      const best = candidates[0];
      const bath = best.roomA.id === bed.id ? best.roomB : best.roomA;
      const k = key(bed.id, bath.id);
      if (!connected.has(k)) {
        const wallBed = best.roomA.id === bed.id ? best.wallA : best.wallB;
        const wallBath = best.roomA.id === bed.id ? best.wallB : best.wallA;
        const posBed = best.roomA.id === bed.id ? best.midA : best.midB;
        const posBath = best.roomA.id === bed.id ? best.midB : best.midA;
        addDoorPair(bed, wallBed, posBed, bath, wallBath, posBath, 2.5);
        connected.add(k);
        bathroomDoorCount.set(bath.id, (bathroomDoorCount.get(bath.id) || 0) + 1);
      }
    }
  }

  // ── Phase 3: Connect bedrooms to living/hallway/kitchen/dining ──

  for (const bed of bedrooms) {
    if (hasEntrance.has(bed.id)) continue;

    // Priority: hallway > living > kitchen > dining
    const priority: Room['type'][] = ['hallway', 'living', 'kitchen', 'dining'];

    let bestAdj: Adjacency | null = null;
    let bestPriority = priority.length;

    for (const adj of adjacencies) {
      const other = adj.roomA.id === bed.id ? adj.roomB : (adj.roomB.id === bed.id ? adj.roomA : null);
      if (!other) continue;
      if (!isEntranceType(other.type)) continue;

      const idx = priority.indexOf(other.type);
      if (idx < bestPriority || (idx === bestPriority && bestAdj && adj.overlapLength > bestAdj.overlapLength)) {
        bestAdj = adj;
        bestPriority = idx;
      }
    }

    if (bestAdj) {
      const k = key(bed.id, bestAdj.roomA.id === bed.id ? bestAdj.roomB.id : bestAdj.roomA.id);
      if (!connected.has(k)) {
        const wallBed = bestAdj.roomA.id === bed.id ? bestAdj.wallA : bestAdj.wallB;
        const wallOther = bestAdj.roomA.id === bed.id ? bestAdj.wallB : bestAdj.wallA;
        const posBed = bestAdj.roomA.id === bed.id ? bestAdj.midA : bestAdj.midB;
        const posOther = bestAdj.roomA.id === bed.id ? bestAdj.midB : bestAdj.midA;
        addDoorPair(bed, wallBed, posBed,
          bestAdj.roomA.id === bed.id ? bestAdj.roomB : bestAdj.roomA,
          wallOther, posOther, 3);
        connected.add(k);
        hasEntrance.add(bed.id);
      }
    }
  }

  // ── Phase 4: Connect common bathrooms ──
  // Common bathrooms (not already connected via master attach) need a door to corridor/living

  for (const bath of bathrooms) {
    if ((bathroomDoorCount.get(bath.id) || 0) > 0) continue;

    // Priority: hallway > living > bedroom (as fallback) > kitchen > dining
    const priority: Room['type'][] = ['hallway', 'living', 'bedroom', 'kitchen', 'dining'];

    let bestAdj: Adjacency | null = null;
    let bestPriority = priority.length;

    for (const adj of adjacencies) {
      const other = adj.roomA.id === bath.id ? adj.roomB : (adj.roomB.id === bath.id ? adj.roomA : null);
      if (!other) continue;

      const idx = priority.indexOf(other.type);
      if (idx === -1) continue;
      if (idx < bestPriority || (idx === bestPriority && bestAdj && adj.overlapLength > bestAdj.overlapLength)) {
        bestAdj = adj;
        bestPriority = idx;
      }
    }

    if (bestAdj) {
      const k = key(bath.id, bestAdj.roomA.id === bath.id ? bestAdj.roomB.id : bestAdj.roomA.id);
      if (!connected.has(k)) {
        const wallBath = bestAdj.roomA.id === bath.id ? bestAdj.wallA : bestAdj.wallB;
        const wallOther = bestAdj.roomA.id === bath.id ? bestAdj.wallB : bestAdj.wallA;
        const posBath = bestAdj.roomA.id === bath.id ? bestAdj.midA : bestAdj.midB;
        const posOther = bestAdj.roomA.id === bath.id ? bestAdj.midB : bestAdj.midA;
        addDoorPair(bath, wallBath, posBath,
          bestAdj.roomA.id === bath.id ? bestAdj.roomB : bestAdj.roomA,
          wallOther, posOther, 2.5);
        connected.add(k);
        bathroomDoorCount.set(bath.id, 1);
      }
    }
  }

  // ── Phase 5: Add main entrance door on living room exterior wall ──

  const livingRoom = rooms.find(r => r.type === 'living');
  if (livingRoom) {
    // Find the exterior wall (wall that faces the boundary edge)
    const walls: DoorInfo['wall'][] = ['left', 'top', 'bottom', 'right'];
    let entranceWall: DoorInfo['wall'] = 'left';

    // Check which walls are on the building perimeter
    for (const wall of walls) {
      let isExterior = false;
      switch (wall) {
        case 'left':   isExterior = livingRoom.x <= 1; break;
        case 'right':  isExterior = livingRoom.x + livingRoom.w >= plan.width - 1; break;
        case 'top':    isExterior = livingRoom.y <= 1; break;
        case 'bottom': isExterior = livingRoom.y + livingRoom.h >= plan.height - 1; break;
      }
      if (isExterior) {
        // Check that this wall doesn't already have a door
        const hasDoor = livingRoom.doors.some(d => d.wall === wall);
        if (!hasDoor) {
          entranceWall = wall;
          break;
        }
      }
    }

    // Add main entrance door if living room doesn't have one already on an exterior wall
    const hasExteriorDoor = livingRoom.doors.some(d => {
      switch (d.wall) {
        case 'left': return livingRoom.x <= 1;
        case 'right': return livingRoom.x + livingRoom.w >= plan.width - 1;
        case 'top': return livingRoom.y <= 1;
        case 'bottom': return livingRoom.y + livingRoom.h >= plan.height - 1;
      }
      return false;
    });

    if (!hasExteriorDoor) {
      livingRoom.doors.push({
        wall: entranceWall,
        position: 0.5,
        width: 3.5,
        swing: 'in',
        doorType: 'standard',
      });
    }
  }

  // ── Phase 6: Connect balcony to living/bedroom ──

  const balconies = rooms.filter(r => r.type === 'balcony');
  for (const balc of balconies) {
    const candidates = adjacencies.filter(a =>
      (a.roomA.id === balc.id || a.roomB.id === balc.id) &&
      (a.roomA.type === 'living' || a.roomB.type === 'living' ||
       a.roomA.type === 'bedroom' || a.roomB.type === 'bedroom')
    ).sort((a, b) => b.overlapLength - a.overlapLength);

    if (candidates.length > 0) {
      const best = candidates[0];
      const k = key(best.roomA.id, best.roomB.id);
      if (!connected.has(k)) {
        const wallBalc = best.roomA.id === balc.id ? best.wallA : best.wallB;
        const wallOther = best.roomA.id === balc.id ? best.wallB : best.wallA;
        const posBalc = best.roomA.id === balc.id ? best.midA : best.midB;
        const posOther = best.roomA.id === balc.id ? best.midB : best.midA;
        addDoorPair(balc, wallBalc, posBalc,
          best.roomA.id === balc.id ? best.roomB : best.roomA,
          wallOther, posOther, 4);
        connected.add(k);
      }
    }
  }

  return { ...plan, rooms };
}
