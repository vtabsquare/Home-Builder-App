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
  bedroom_cost: number;
  bathroom_cost: number;
  home_types: Record<HomeType, { baseCost: number; baseArea: number }>;
  kitchen_costs: Record<KitchenType, number>;
  addon_costs: Record<AddOn, number>;
}

const DEFAULTS: PricingConfig = {
  sqft_rate: 145,
  land_sqft_rate: 75,
  bedroom_cost: 9500,
  bathroom_cost: 6800,
  home_types: {
    starter: { baseCost: 135000, baseArea: 900 },
    family: { baseCost: 245000, baseArea: 1400 },
    premium: { baseCost: 410000, baseArea: 2100 },
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
};

const ADDON_LABELS: Record<AddOn, string> = {
  solar: 'Solar Panels',
  carport: 'Carport',
  water_tank: 'Water Tank',
  smart_home: 'Smart Home Package',
  fence: 'Perimeter Fence',
  landscaping: 'Landscaping',
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
}

// ── Merge admin-saved pricing with defaults ─────────────────────────────────

function mergePricing(saved: any): PricingConfig {
  if (!saved) return DEFAULTS;
  return {
    sqft_rate: saved.sqft_rate ?? DEFAULTS.sqft_rate,
    land_sqft_rate: saved.land_sqft_rate ?? DEFAULTS.land_sqft_rate,
    bedroom_cost: saved.bedroom_cost ?? DEFAULTS.bedroom_cost,
    bathroom_cost: saved.bathroom_cost ?? DEFAULTS.bathroom_cost,
    home_types: {
      starter: { ...DEFAULTS.home_types.starter, ...saved.home_types?.starter },
      family: { ...DEFAULTS.home_types.family, ...saved.home_types?.family },
      premium: { ...DEFAULTS.home_types.premium, ...saved.home_types?.premium },
    },
    kitchen_costs: { ...DEFAULTS.kitchen_costs, ...saved.kitchen_costs },
    addon_costs: { ...DEFAULTS.addon_costs, ...saved.addon_costs },
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
  const { interestRate = 0.065, tenureYears = 25 } = opts;
  const area = computeArea(c, p);
  const baseStructure = area * p.sqft_rate;
  const bedroomCost = c.bedrooms * p.bedroom_cost;
  const bathroomCost = c.bathrooms * p.bathroom_cost;
  const kitchenCost = p.kitchen_costs[c.kitchen];
  const addonsCost = c.addons.reduce((sum, a) => sum + (p.addon_costs[a] || 0), 0);
  const landCost = c.land === 'need' && c.landSize
    ? (c.landSize === 'custom' ? c.customLandArea * p.land_sqft_rate : LAND_PACKAGES_STATIC[c.landSize].baseArea * p.land_sqft_rate)
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
    ...c.addons.map((a) => ({ label: ADDON_LABELS[a] || a, amount: p.addon_costs[a] || 0 })),
  ];
  if (landCost) items.push({ label: 'Land package', amount: landCost });

  return { area, baseStructure, bedroomCost, bathroomCost, kitchenCost, addonsCost, landCost, total, downPayment, loanAmount, emi, items };
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
