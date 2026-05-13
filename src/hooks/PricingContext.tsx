/**
 * React context + provider that supplies admin-configured pricing
 * from the Supabase admin_settings table to every component in the tree.
 *
 * Wraps the app via <PricingProvider> and consumed via usePricing().
 */
import { createContext, useContext, ReactNode } from 'react';
import { useDynamicPricing, PricingConfig, computeCostDynamic, formatMoneyDynamic, LAND_PACKAGES_STATIC } from './useDynamicPricing';
import { HOME_TYPE_DEFAULTS } from '@/store/configurator';
import type { AddOn, HomeType, KitchenType } from '@/store/configurator';

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

export function useKitchenMeta() {
  const p = usePricing();
  const KITCHEN_LABELS: Record<KitchenType, string> = {
    standard: 'Standard',
    open: 'Open Plan',
    galley: 'Galley',
  };

  return Object.fromEntries(
    (Object.keys(KITCHEN_LABELS) as KitchenType[]).map((k) => [k, { label: KITCHEN_LABELS[k], cost: p.kitchen_costs[k] }])
  ) as Record<KitchenType, { label: string; cost: number }>;
}

export function useRoomPricingMeta() {
  const p = usePricing();
  return {
    bedroomCost: p.bedroom_cost,
    bathroomCost: p.bathroom_cost,
  };
}

export function useHomeTypeMeta() {
  const p = usePricing();

  return Object.fromEntries(
    (Object.keys(HOME_TYPE_DEFAULTS) as HomeType[]).map((homeType) => [
      homeType,
      {
        ...HOME_TYPE_DEFAULTS[homeType],
        baseArea: p.home_types[homeType].baseArea,
        baseCost: p.home_types[homeType].baseCost,
      },
    ])
  ) as Record<HomeType, (typeof HOME_TYPE_DEFAULTS)[HomeType]>;
}

export function useLandPackages() {
  const p = usePricing();

  return {
    small: {
      ...LAND_PACKAGES_STATIC.small,
      baseArea: p.home_types.starter.baseArea,
    },
    medium: {
      ...LAND_PACKAGES_STATIC.medium,
      baseArea: p.home_types.family.baseArea,
    },
    large: {
      ...LAND_PACKAGES_STATIC.large,
      baseArea: p.home_types.premium.baseArea,
    },
  };
}

/** Utility: get the dynamic land sqft rate */
export function useLandSqftRate() {
  return usePricing().land_sqft_rate;
}

export { computeCostDynamic, formatMoneyDynamic };
