import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type LandChoice = 'own' | 'need' | null;
export type HomeType = 'starter' | 'family' | 'premium';
export type KitchenType = 'standard' | 'open' | 'galley';
export type AddOn = 'solar' | 'carport' | 'water_tank' | 'smart_home';
export type RoofType = 'gable' | 'flat';
export type Material = 'budget' | 'modern' | 'luxury';

export interface ConfigState {
  step: number;
  land: LandChoice;
  homeType: HomeType;
  bedrooms: number;
  bathrooms: number;
  kitchen: KitchenType;
  addons: AddOn[];
  roof: RoofType;
  material: Material;
  // Lead
  name: string;
  phone: string;
  email: string;
  timeline: string;
  // Kiosk
  kioskMode: boolean;
  // Presets & Custom Editor
  presetId: number; // 0 or 1
  advancedEditorMode: boolean;
  // Customization
  customPlan: any | null;
  planHistory: { id: string; label: string; type: string; targetId: string; original: any }[];
}

export interface ConfigActions {
  setStep: (s: number) => void;
  next: () => void;
  prev: () => void;
  setLand: (l: LandChoice) => void;
  setHomeType: (h: HomeType) => void;
  setBedrooms: (n: number) => void;
  setBathrooms: (n: number) => void;
  setKitchen: (k: KitchenType) => void;
  toggleAddon: (a: AddOn) => void;
  setRoof: (r: RoofType) => void;
  setMaterial: (m: Material) => void;
  setLead: (p: Partial<Pick<ConfigState, 'name' | 'phone' | 'email' | 'timeline'>>) => void;
  setKioskMode: (v: boolean) => void;
  setPresetId: (id: number) => void;
  setAdvancedEditorMode: (v: boolean) => void;
  setCustomPlan: (p: any | null) => void;
  addHistoryRecord: (record: { label: string; type: string; targetId: string; original: any }) => void;
  removeHistoryRecord: (id: string) => void;
  reset: () => void;
}

export const HOME_TYPE_DEFAULTS: Record<HomeType, { bedrooms: number; bathrooms: number; baseArea: number; baseCost: number; label: string; areaRange: [number, number] }> = {
  starter:  { bedrooms: 2, bathrooms: 1, baseArea: 900,  baseCost: 135000, label: 'Starter', areaRange: [800, 1000] },
  family:   { bedrooms: 3, bathrooms: 2, baseArea: 1400, baseCost: 245000, label: 'Family',  areaRange: [1200, 1600] },
  premium:  { bedrooms: 4, bathrooms: 3, baseArea: 2100, baseCost: 410000, label: 'Premium', areaRange: [1800, 2400] },
};

const initial: ConfigState = {
  step: 0,
  land: null,
  homeType: 'family',
  bedrooms: 3,
  bathrooms: 2,
  kitchen: 'open',
  addons: [],
  roof: 'gable',
  material: 'modern',
  name: '',
  phone: '',
  email: '',
  timeline: '',
  kioskMode: false,
  presetId: 0,
  advancedEditorMode: false,
  customPlan: null,
  planHistory: [],
};

export const useConfig = create<ConfigState & ConfigActions>()(
  persist(
    (set, get) => ({
      ...initial,
      setStep: (step) => set({ step }),
      next: () => set({ step: Math.min(get().step + 1, 4) }),
      prev: () => set({ step: Math.max(get().step - 1, 0) }),
      setLand: (land) => set({ land }),
      setHomeType: (homeType) => {
        const d = HOME_TYPE_DEFAULTS[homeType];
        set({ homeType, bedrooms: d.bedrooms, bathrooms: d.bathrooms, presetId: 0, customPlan: null });
      },
      setBedrooms: (bedrooms) => set({ bedrooms: Math.max(1, Math.min(6, bedrooms)) }),
      setBathrooms: (bathrooms) => set({ bathrooms: Math.max(1, Math.min(5, bathrooms)) }),
      setKitchen: (kitchen) => set({ kitchen }),
      toggleAddon: (a) => set((s) => ({
        addons: s.addons.includes(a) ? s.addons.filter((x) => x !== a) : [...s.addons, a],
      })),
      setRoof: (roof) => set({ roof }),
      setMaterial: (material) => set({ material }),
      setLead: (p) => set((s) => ({ ...s, ...p })),
      setKioskMode: (kioskMode) => set({ kioskMode }),
      setPresetId: (presetId) => set({ presetId, customPlan: null }),
      setAdvancedEditorMode: (advancedEditorMode) => set({ advancedEditorMode }),
      setCustomPlan: (customPlan) => set({ customPlan }),
      addHistoryRecord: (record) => set((s) => {
        // Prevent duplicate history for same target/type if possible, or just append
        const id = Math.random().toString(36).substr(2, 9);
        return { planHistory: [...s.planHistory, { ...record, id }] };
      }),
      removeHistoryRecord: (id) => set((s) => ({ planHistory: s.planHistory.filter(r => r.id !== id) })),
      reset: () => set({ ...initial }),
    }),
    { name: 'gbti-configurator' }
  )
);
