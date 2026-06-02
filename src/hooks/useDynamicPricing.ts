/**
 * Dynamic pricing hook — fetches admin-configured pricing from Supabase
 * and provides a computeCost function that uses those prices.
 * Falls back to hardcoded defaults when no admin settings exist.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { AddOn, ConfigState, HomeType, KitchenType } from '@/store/configurator';

// ── Default (hardcoded) pricing — same as original cost.ts values ──────────

export interface PricingConfig {
  sqft_rate: number;
  land_sqft_rate: number;
  flat_land_cost: number;
  bedroom_cost: number;
  bathroom_cost: number;
  home_types: Record<HomeType, { baseCost: number; baseArea: number }>;
  kitchen_costs: Record<KitchenType, number>;
  addon_costs: Record<AddOn, number>;
  turnkey_cost: number;
  young_professional_cost: number;
}

const DEFAULTS: PricingConfig = {
  sqft_rate: 145,
  land_sqft_rate: 75,
  flat_land_cost: 50000,
  bedroom_cost: 9500,
  bathroom_cost: 6800,
  home_types: {
    starter: { baseCost: 135000, baseArea: 900 },
    family: { baseCost: 245000, baseArea: 1400 },
    premium: { baseCost: 410000, baseArea: 2100 },
    turnkey: { baseCost: 350000, baseArea: 0 },
    young_professional: { baseCost: 180000, baseArea: 0 },
  },
  kitchen_costs: { standard: 8000, open: 14000, galley: 6500 },
  addon_costs: {
    solar: 12500,
    carport: 8500,
    water_tank: 4200,
    smart_home: 15800,
    fence: 15000,
    landscaping: 10000,
  },
  turnkey_cost: 350000,
  young_professional_cost: 180000,
};

const ADDON_LABELS: Record<AddOn, string> = {
  solar: 'Solar Panels',
  carport: 'Carport',
  water_tank: 'Water Tank',
  smart_home: 'Smart Home Package',
  fence: 'Perimeter Fence/Bridge',
  landscaping: 'Furniture',
};

export const LAND_PACKAGES_STATIC: Record<'small' | 'medium' | 'large', { label: string; range: [number, number]; baseArea: number; description: string }> = {
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
  downPaymentPercent: number;
}

// ── Merge admin-saved pricing with defaults ─────────────────────────────────

function mergePricing(saved: any): PricingConfig {
  if (!saved) return DEFAULTS;
  return {
    sqft_rate: saved.sqft_rate ?? DEFAULTS.sqft_rate,
    land_sqft_rate: saved.land_sqft_rate ?? DEFAULTS.land_sqft_rate,
    flat_land_cost: saved.flat_land_cost ?? DEFAULTS.flat_land_cost,
    bedroom_cost: saved.bedroom_cost ?? DEFAULTS.bedroom_cost,
    bathroom_cost: saved.bathroom_cost ?? DEFAULTS.bathroom_cost,
    home_types: {
      starter: { ...DEFAULTS.home_types.starter, ...saved.home_types?.starter },
      family: { ...DEFAULTS.home_types.family, ...saved.home_types?.family },
      premium: { ...DEFAULTS.home_types.premium, ...saved.home_types?.premium },
      turnkey: { ...DEFAULTS.home_types.turnkey, ...saved.home_types?.turnkey },
      young_professional: { ...DEFAULTS.home_types.young_professional, ...saved.home_types?.young_professional },
    },
    kitchen_costs: { ...DEFAULTS.kitchen_costs, ...saved.kitchen_costs },
    addon_costs: { ...DEFAULTS.addon_costs, ...saved.addon_costs },
    turnkey_cost: saved.turnkey_cost ?? DEFAULTS.turnkey_cost,
    young_professional_cost: saved.young_professional_cost ?? DEFAULTS.young_professional_cost,
  };
}

// ── Compute cost with a given pricing config ────────────────────────────────

function computeArea(c: Pick<ConfigState, 'homeType' | 'bedrooms' | 'bathrooms'>, p: PricingConfig) {
  const base = p.home_types[c.homeType].baseArea;
  const defaultBed = c.homeType === 'starter' ? 2 : c.homeType === 'family' ? 3 : 4;
  const defaultBath = c.homeType === 'starter' ? 1 : c.homeType === 'family' ? 2 : 3;
  const extraBed = Math.max(0, c.bedrooms - defaultBed) * 130;
  const extraBath = Math.max(0, c.bathrooms - defaultBath) * 60;
  return base + extraBed + extraBath;
}

export function computeCostDynamic(c: ConfigState, p: PricingConfig, opts: { interestRate?: number; tenureYears?: number } = {}): CostBreakdown {
  const interestRate = c.interestRate / 100;
  const tenureYears = c.tenureYears;

  let area = 0;
  let baseStructure = 0;
  let bedroomCost = 0;
  let bathroomCost = 0;
  let kitchenCost = 0;
  let addonsCost = 0;
  let landCost = 0;
  let items: { label: string; amount: number }[] = [];

  if (c.homeType === 'turnkey' || c.homeType === 'young_professional') {
    // Fixed price flows
    baseStructure = c.homeType === 'turnkey' ? p.turnkey_cost : p.young_professional_cost;
    const label = c.homeType === 'turnkey' ? 'Turnkey Build Package' : 'Young Professional Package';
    items = [
      { label, amount: baseStructure }
    ];
  } else {
    // Standard modular pricing
    area = computeArea(c, p);
    const includedArea = p.home_types[c.homeType].baseArea;
    const extraArea = Math.max(0, area - includedArea);
    
    baseStructure = p.home_types[c.homeType].baseCost + extraArea * p.sqft_rate;
    bedroomCost = c.bedrooms * p.bedroom_cost;
    bathroomCost = c.bathrooms * p.bathroom_cost;
    kitchenCost = p.kitchen_costs[c.kitchen];
    addonsCost = c.addons.reduce((sum, a) => sum + (p.addon_costs[a] || 0), 0);
    landCost = c.land === 'need' ? p.flat_land_cost : 0;
    
    items = [
      { label: `Base structure · ${area} sqft`, amount: baseStructure },
      { label: `Bedrooms × ${c.bedrooms}`, amount: bedroomCost },
      { label: `Bathrooms × ${c.bathrooms}`, amount: bathroomCost },
      { label: `Kitchen · ${c.kitchen}`, amount: kitchenCost },
      ...c.addons.map((a) => ({ label: ADDON_LABELS[a] || a, amount: p.addon_costs[a] || 0 })),
    ];
    if (landCost) items.push({ label: 'Land package', amount: landCost });
  }

  const total = Math.round(baseStructure + bedroomCost + bathroomCost + kitchenCost + addonsCost + landCost);
  const downPayment = Math.round(total * (c.downPaymentPercent / 100));
  const loanAmount = total - downPayment;

  const r = interestRate / 12;
  const n = tenureYears * 12;
  const emi = Math.round((loanAmount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));

  return { area, baseStructure, bedroomCost, bathroomCost, kitchenCost, addonsCost, landCost, total, downPayment, loanAmount, emi, items, downPaymentPercent: c.downPaymentPercent };
}

// ── React Hook ──────────────────────────────────────────────────────────────

export function useDynamicPricing() {
  const [pricing, setPricing] = useState<PricingConfig>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);
  const fetchedRef = useRef(false);

  const fetchPricing = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('key', 'pricing')
        .maybeSingle();
      if (!error && data?.value) {
        setPricing(mergePricing(data.value));
      }
      // If error (table doesn't exist yet), just use defaults silently
    } catch {
      // admin_settings table may not exist — use defaults
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchPricing();
    }
  }, [fetchPricing]);

  return { pricing, loaded };
}

// ── Re-export formatMoney for convenience ───────────────────────────────────

export function formatMoneyDynamic(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}
