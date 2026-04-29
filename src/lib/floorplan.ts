import { ConfigState } from '@/store/configurator';
import { computeArea } from './cost';

export interface Room {
  id: string;
  type: 'bedroom' | 'bathroom' | 'kitchen' | 'living' | 'dining' | 'entry';
  label: string;
  x: number; // ft
  y: number;
  w: number;
  h: number;
  color: string;
}

export interface Plan {
  width: number;  // ft
  height: number;
  rooms: Room[];
}

const COLORS = {
  bedroom:  'hsl(33 35% 75%)',
  bathroom: 'hsl(195 25% 75%)',
  kitchen:  'hsl(28 40% 65%)',
  living:   'hsl(40 30% 85%)',
  dining:   'hsl(36 30% 80%)',
  entry:    'hsl(36 18% 70%)',
};

/**
 * Auto-layout engine. Generates a plausible rectangular plan with:
 * - bedrooms arranged on one side (≥10x10)
 * - bathrooms (≥5x7) clustered near bedrooms
 * - kitchen adjacent to living/dining
 * - no overlaps, wall-aligned, snapped to 1ft grid
 */
export function generatePlan(c: ConfigState): Plan {
  const area = computeArea(c);
  // Aspect ratio ~ 1.5:1
  const planH = Math.round(Math.sqrt(area / 1.5));
  const planW = Math.round(area / planH);
  const W = Math.max(planW, 24);
  const H = Math.max(planH, 20);

  const rooms: Room[] = [];

  // Right side: bedroom column
  const bedroomColW = Math.max(11, Math.floor(W * 0.32));
  const bedroomZoneH = H;
  const perBedH = Math.max(10, Math.floor(bedroomZoneH / c.bedrooms));
  for (let i = 0; i < c.bedrooms; i++) {
    const isLast = i === c.bedrooms - 1;
    const h = isLast ? bedroomZoneH - perBedH * i : perBedH;
    rooms.push({
      id: `bed-${i}`,
      type: 'bedroom',
      label: i === 0 ? 'Master Bed' : `Bedroom ${i + 1}`,
      x: W - bedroomColW,
      y: i * perBedH,
      w: bedroomColW,
      h,
      color: COLORS.bedroom,
    });
  }

  // Bathroom column to the left of bedrooms
  const bathW = 6;
  const bathH = 7;
  const bathZoneH = Math.min(H, c.bathrooms * (bathH + 1));
  for (let i = 0; i < c.bathrooms; i++) {
    rooms.push({
      id: `bath-${i}`,
      type: 'bathroom',
      label: i === 0 ? 'Master Bath' : `Bath ${i + 1}`,
      x: W - bedroomColW - bathW,
      y: i * (bathH + 1),
      w: bathW,
      h: bathH,
      color: COLORS.bathroom,
    });
  }

  // Living / Kitchen / Dining occupy left zone
  const leftW = W - bedroomColW - bathW;
  const livingH = Math.floor(H * 0.55);
  rooms.push({
    id: 'living',
    type: 'living',
    label: 'Living Room',
    x: 0,
    y: 0,
    w: leftW,
    h: livingH,
    color: COLORS.living,
  });

  // Kitchen variants
  const kitchenH = H - livingH;
  let kitchenW = leftW;
  let diningW = 0;
  if (c.kitchen === 'galley') {
    kitchenW = Math.floor(leftW * 0.45);
    diningW = leftW - kitchenW;
  } else if (c.kitchen === 'standard') {
    kitchenW = Math.floor(leftW * 0.6);
    diningW = leftW - kitchenW;
  } else {
    // open: kitchen + dining merged
    kitchenW = leftW;
    diningW = 0;
  }

  rooms.push({
    id: 'kitchen',
    type: 'kitchen',
    label: c.kitchen === 'open' ? 'Kitchen / Dining' : 'Kitchen',
    x: 0,
    y: livingH,
    w: kitchenW,
    h: kitchenH,
    color: COLORS.kitchen,
  });

  if (diningW > 0) {
    rooms.push({
      id: 'dining',
      type: 'dining',
      label: 'Dining',
      x: kitchenW,
      y: livingH,
      w: diningW,
      h: kitchenH,
      color: COLORS.dining,
    });
  }

  return { width: W, height: H, rooms };
}
