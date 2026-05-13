/**
 * React context + provider that supplies admin-configured pricing
 * from the Supabase admin_settings table to every component in the tree.
 *
 * Wraps the app via <PricingProvider> and consumed via usePricing().
 */
import { createContext, useContext, ReactNode } from 'react';
import { useDynamicPricing, PricingConfig, computeCostDynamic, formatMoneyDynamic } from './useDynamicPricing';
import type { AddOn } from '@/store/configurator';

interface PricingCtx {
  pricing: PricingConfig;
  loaded: boolean;
}

const Ctx = createContext<PricingCtx | null>(null);

export function PricingProvider({ children }: { children: ReactNode }) {
  const val = useDynamicPricing();
  return <Ctx.Provider value={val}>{children}</Ctx.Provider>;
}

export function usePricing(): PricingConfig {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('usePricing must be used within PricingProvider');
  return ctx.pricing;
}

/** Utility: build ADDON_META dynamically from current pricing */
export function useAddonMeta() {
  const p = usePricing();
  const ADDON_LABELS: Record<AddOn, string> = {
    solar: 'Solar Panels',
    carport: 'Carport',
    water_tank: 'Water Tank',
    smart_home: 'Smart Home Package',
    fence: 'Perimeter Fence',
    landscaping: 'Landscaping',
  };
  return Object.fromEntries(
    (Object.keys(ADDON_LABELS) as AddOn[]).map((k) => [k, { label: ADDON_LABELS[k], cost: p.addon_costs[k] }])
  ) as Record<AddOn, { label: string; cost: number }>;
}

/** Utility: get the dynamic land sqft rate */
export function useLandSqftRate() {
  return usePricing().land_sqft_rate;
}

export { computeCostDynamic, formatMoneyDynamic };
