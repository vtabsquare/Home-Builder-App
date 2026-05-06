import { AddOn, ConfigState, HOME_TYPE_DEFAULTS, KitchenType } from '@/store/configurator';

const KITCHEN_COST: Record<KitchenType, number> = {
  standard: 8000,
  open: 14000,
  galley: 6500,
};

const ADDON_COST: Record<AddOn, { label: string; cost: number }> = {
  solar: { label: 'Solar Panels', cost: 12500 },
  carport: { label: 'Carport', cost: 8500 },
  water_tank: { label: 'Water Tank', cost: 4200 },
  smart_home: { label: 'Smart Home Package', cost: 15800 },
  fence: { label: 'Perimeter Fence', cost: 15000 },
  landscaping: { label: 'Landscaping', cost: 10000 },
};

const BEDROOM_COST = 9500;
const BATHROOM_COST = 6800;
const SQFT_RATE = 145;

export const LAND_SQFT_RATE = 75;

export const LAND_PACKAGES: Record<'small' | 'medium' | 'large', { label: string; range: [number, number]; baseArea: number; description: string }> = {
  small:  { label: '800–1000',  range: [800, 1000],  baseArea: 900,  description: 'Smart starter footprint with everything essential. Perfect first build.' },
  medium: { label: '1200–1600', range: [1200, 1600], baseArea: 1400, description: 'The benchmark family layout. Open social spaces, generous bedrooms.' },
  large:  { label: '1800–2400', range: [1800, 2400], baseArea: 2100, description: 'Architectural footprint with multi-zone living and double-height options.' },
};

export interface CostBreakdown {
  area: number;
  baseStructure: number;
  bedroomCost: number;
  bathroomCost: number;
  kitchenCost: number;
  addonsCost: number;
  landCost: number;
  total: number;
  downPayment: number;
  loanAmount: number;
  emi: number;
  items: { label: string; amount: number }[];
}

export function computeArea(c: Pick<ConfigState, 'homeType' | 'bedrooms' | 'bathrooms' | 'addons'>) {
  const base = HOME_TYPE_DEFAULTS[c.homeType].baseArea;
  const extraBed = Math.max(0, c.bedrooms - HOME_TYPE_DEFAULTS[c.homeType].bedrooms) * 130;
  const extraBath = Math.max(0, c.bathrooms - HOME_TYPE_DEFAULTS[c.homeType].bathrooms) * 60;
  return base + extraBed + extraBath;
}

export function computeCost(c: ConfigState, opts: { interestRate?: number; tenureYears?: number } = {}): CostBreakdown {
  const { interestRate = 0.065, tenureYears = 25 } = opts;
  const area = computeArea(c);
  const baseStructure = area * SQFT_RATE;
  const bedroomCost = c.bedrooms * BEDROOM_COST;
  const bathroomCost = c.bathrooms * BATHROOM_COST;
  const kitchenCost = KITCHEN_COST[c.kitchen];
  const addonsCost = c.addons.reduce((sum, a) => sum + ADDON_COST[a].cost, 0);
  const landCost = c.land === 'need' && c.landSize
    ? (c.landSize === 'custom' ? c.customLandArea * LAND_SQFT_RATE : LAND_PACKAGES[c.landSize].baseArea * LAND_SQFT_RATE)
    : 0;

  const total = Math.round(baseStructure + bedroomCost + bathroomCost + kitchenCost + addonsCost + landCost);
  const downPayment = Math.round(total * 0.1);
  const loanAmount = total - downPayment;

  const r = interestRate / 12;
  const n = tenureYears * 12;
  const emi = Math.round((loanAmount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));

  const items: { label: string; amount: number }[] = [
    { label: `Base structure · ${area} sqft`, amount: baseStructure },
    { label: `Bedrooms × ${c.bedrooms}`, amount: bedroomCost },
    { label: `Bathrooms × ${c.bathrooms}`, amount: bathroomCost },
    { label: `Kitchen · ${c.kitchen}`, amount: kitchenCost },
    ...c.addons.map((a) => ({ label: ADDON_COST[a].label, amount: ADDON_COST[a].cost })),
  ];
  if (landCost) items.push({ label: 'Land package', amount: landCost });

  return { area, baseStructure, bedroomCost, bathroomCost, kitchenCost, addonsCost, landCost, total, downPayment, loanAmount, emi, items };
}

export const ADDON_META = ADDON_COST;

export function formatMoney(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}
