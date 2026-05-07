import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';

export type LandChoice = 'own' | 'need' | null;
export type LandSize = 'small' | 'medium' | 'large' | 'custom' | null;
export type HomeType = 'starter' | 'family' | 'premium';
export type KitchenType = 'standard' | 'open' | 'galley';
export type AddOn = 'solar' | 'carport' | 'water_tank' | 'smart_home' | 'fence' | 'landscaping';
export type RoofType = 'gable' | 'flat';
export type Material = 'budget' | 'modern' | 'luxury';
export const FAMILY_DOUBLE_STOREY_PACKAGE_KEY = 'family-double-storey';
const BUILT_IN_PRESET_PREFIX = '__builtin_floor_plan__';

export const getBuiltInPresetKey = (state: Pick<ConfigState, 'homeType' | 'bedrooms' | 'bathrooms' | 'kitchen' | 'isDoubleStorey' | 'addons'>, presetId: number) => {
  // Exclude visual-only addons from the key (smart_home, solar, water_tank, fence)
  // Only layout-affecting addons (carport, landscaping) should trigger different preset overrides
  const layoutAffectingAddons = (state.addons || []).filter(a => a === 'carport' || a === 'landscaping');
  return `${BUILT_IN_PRESET_PREFIX}${state.homeType}_${state.bedrooms}bed_${state.bathrooms}bath_${state.kitchen}_${state.isDoubleStorey ? 'double' : 'single'}_addons_${layoutAffectingAddons.sort().join('-') || 'none'}_${presetId}`;
};

export const getFamilyDoubleStoreyPackageKey = (state: Pick<ConfigState, 'homeType' | 'bedrooms' | 'bathrooms' | 'kitchen' | 'isDoubleStorey'>) =>
  `${FAMILY_DOUBLE_STOREY_PACKAGE_KEY}_${state.homeType}_${state.bedrooms}bed_${state.bathrooms}bath_${state.kitchen}_${state.isDoubleStorey ? 'double' : 'single'}`;

export interface ConfigState {
  step: number;
  land: LandChoice;
  landSize: LandSize;
  customLandArea: number;
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
  loadedPresetId: string | null;
  // Customization
  customPlan: any | null;
  planHistory: { id: string; label: string; type: string; targetId: string; original: any }[];
  // Double Storey
  isDoubleStorey: boolean;
  activeFloor: 0 | 1;
  customFirstFloorPlan: any | null;
  savedPresets: any[];
  packageLayouts: Record<string, any>;
  presetOverrides: Record<string, { ground: any; first: any | null }>;
}

export interface ConfigActions {
  setStep: (s: number) => void;
  next: () => void;
  prev: () => void;
  setLand: (l: LandChoice) => void;
  setLandSize: (s: LandSize) => void;
  setCustomLandArea: (a: number) => void;
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
  setDoubleStorey: (v: boolean) => void;
  setActiveFloor: (f: 0 | 1) => void;
  setCustomFirstFloorPlan: (p: any | null) => void;
  setPresetOverride: (presetId: number, groundPlan: any, firstFloorPlan: any | null) => void;
  saveBuiltInPreset: (presetId: number, groundPlan: any, firstFloorPlan: any | null) => Promise<void>;
  addHistoryRecord: (record: { label: string; type: string; targetId: string; original: any }) => void;
  removeHistoryRecord: (id: string) => void;
  saveAsPreset: (name: string, groundPlan: any, firstFloorPlan: any) => Promise<any | null>;
  updateSavedPreset: (groundPlan: any, firstFloorPlan: any) => Promise<void>;
  deleteSavedPreset: (index: number) => Promise<void>;
  loadSavedPreset: (index: number) => void;
  fetchSavedPresets: () => Promise<void>;
  fetchPackageLayouts: () => Promise<void>;
  savePackageLayout: (packageKey: string, groundPlan: any, firstFloorPlan: any) => Promise<void>;
  reset: () => void;
}

export const HOME_TYPE_DEFAULTS: Record<HomeType, { bedrooms: number; bathrooms: number; baseArea: number; baseCost: number; label: string; areaRange: [number, number] }> = {
  starter: { bedrooms: 2, bathrooms: 2, baseArea: 900, baseCost: 135000, label: 'Starter', areaRange: [800, 1000] },
  family: { bedrooms: 3, bathrooms: 2, baseArea: 1400, baseCost: 245000, label: 'Family', areaRange: [1200, 1600] },
  premium: { bedrooms: 4, bathrooms: 3, baseArea: 2100, baseCost: 410000, label: 'Premium', areaRange: [1800, 2400] },
};

export const HOME_TYPE_LIMITS: Record<HomeType, { bedrooms: { min: number; max: number }; bathrooms: { min: number; max: number } }> = {
  starter: { bedrooms: { min: 1, max: 2 }, bathrooms: { min: 2, max: 2 } },
  family: { bedrooms: { min: 2, max: 3 }, bathrooms: { min: 2, max: 3 } },
  premium: { bedrooms: { min: 2, max: 4 }, bathrooms: { min: 2, max: 4 } },
};

const initial: ConfigState = {
  step: 0,
  land: null,
  landSize: null,
  customLandArea: 0,
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
  loadedPresetId: null,
  customPlan: null,
  planHistory: [],
  isDoubleStorey: false,
  activeFloor: 0 as 0 | 1,
  customFirstFloorPlan: null,
  savedPresets: [],
  packageLayouts: {},
  presetOverrides: {},
};

export const useConfig = create<ConfigState & ConfigActions>()(
  persist(
    (set, get) => ({
      ...initial,
      setStep: (step) => set({ step }),
      next: () => set({ step: Math.min(get().step + 1, 4) }),
      prev: () => set({ step: Math.max(get().step - 1, 0) }),
      setLand: (land) => set(land === 'own' ? { land, landSize: null, customLandArea: 0 } : { land }),
      setLandSize: (landSize) => set({ landSize }),
      setCustomLandArea: (customLandArea) => set({ customLandArea }),
      setHomeType: (homeType) => {
        const d = HOME_TYPE_DEFAULTS[homeType];
        set({ homeType, bedrooms: d.bedrooms, bathrooms: d.bathrooms, presetId: 0, loadedPresetId: null, customPlan: null, isDoubleStorey: false, activeFloor: 0, customFirstFloorPlan: null });
      },
      setBedrooms: (bedrooms) => set((state) => {
        const limits = HOME_TYPE_LIMITS[state.homeType].bedrooms;
        return {
          bedrooms: Math.max(limits.min, Math.min(limits.max, bedrooms)),
          customPlan: null,
          customFirstFloorPlan: null,
        };
      }),
      setBathrooms: (bathrooms) => set((state) => {
        const limits = HOME_TYPE_LIMITS[state.homeType].bathrooms;
        return {
          bathrooms: Math.max(limits.min, Math.min(limits.max, bathrooms)),
          customPlan: null,
          customFirstFloorPlan: null,
        };
      }),
      setKitchen: (kitchen) => set({ kitchen }),
      toggleAddon: (a) => set((s) => {
        const newAddons = s.addons.includes(a) ? s.addons.filter((x) => x !== a) : [...s.addons, a];
        // presetOverrides are keyed per addon combination, so no need to clear them.
        // Each addon combo (e.g. with-carport vs without) has its own saved layout.
        return {
          addons: newAddons,
          customPlan: null,
          customFirstFloorPlan: null,
        };
      }),
      setRoof: (roof) => set({ roof }),
      setMaterial: (material) => set({ material }),
      setLead: (p) => set((s) => ({ ...s, ...p })),
      setKioskMode: (kioskMode) => set({ kioskMode }),
      setPresetId: (presetId) => set({ presetId, customPlan: null, loadedPresetId: null }),
      setAdvancedEditorMode: (advancedEditorMode) => set({ advancedEditorMode }),
      setCustomPlan: (customPlan) => set({ customPlan }),
      setDoubleStorey: (isDoubleStorey) => set({ isDoubleStorey, activeFloor: 0, customPlan: null, customFirstFloorPlan: null }),
      setActiveFloor: (activeFloor) => set({ activeFloor }),
      setCustomFirstFloorPlan: (customFirstFloorPlan) => set({ customFirstFloorPlan }),
      setPresetOverride: (presetId, groundPlan, firstFloorPlan) => set((s) => ({
        ...s,
        presetOverrides: {
          ...s.presetOverrides,
          [getBuiltInPresetKey(s, presetId)]: { ground: groundPlan, first: firstFloorPlan },
        },
      })),
      saveBuiltInPreset: async (presetId, groundPlan, firstFloorPlan) => {
        const state = get();
        const key = getBuiltInPresetKey(state, presetId);
        const fullPlan = { ground: groundPlan, first: firstFloorPlan };
        set((s) => ({
          presetOverrides: {
            ...s.presetOverrides,
            [key]: { ground: groundPlan, first: firstFloorPlan },
          },
        }));

        const { data: existing, error: selectError } = await supabase
          .from('presets')
          .select('id')
          .eq('name', key)
          .maybeSingle();

        if (selectError) {
          throw selectError;
        }

        if (existing?.id) {
          const { error } = await supabase
            .from('presets')
            .update({ plan_data: fullPlan as any })
            .eq('id', existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('presets')
            .insert({ name: key, plan_data: fullPlan as any });
          if (error) throw error;
        }
      },
      addHistoryRecord: (record) => set((s) => {
        // Prevent duplicate history for same target/type if possible, or just append
        const id = Math.random().toString(36).substr(2, 9);
        return { planHistory: [...s.planHistory, { ...record, id }] };
      }),
      removeHistoryRecord: (id) => set((s) => ({ planHistory: s.planHistory.filter(r => r.id !== id) })),
      fetchSavedPresets: async () => {
        const { data, error } = await supabase.from('presets').select('*').order('created_at', { ascending: true });
        if (!error && data) {
          const state = get();
          const builtInRows = data.filter((row) => row.name?.startsWith(BUILT_IN_PRESET_PREFIX));
          const presetOverrides = builtInRows.reduce<Record<string, { ground: any; first: any | null }>>((acc, row) => {
            const presetId = Number(row.name.slice(row.name.lastIndexOf('_') + 1));
            const planData = row.plan_data as any;
            if ((presetId === 0 || presetId === 1) && planData?.ground?.rooms) {
              acc[row.name] = { ground: planData.ground, first: planData.first || null };
            }
            return acc;
          }, {});
          set({ savedPresets: data.filter((row) => !row.name?.startsWith(BUILT_IN_PRESET_PREFIX)), presetOverrides });
        }
      },
      fetchPackageLayouts: async () => {
        const { data, error } = await supabase.from('package_layouts').select('*');
        if (!error && data) {
          const packageLayouts = data.reduce<Record<string, any>>((acc, row) => {
            acc[row.package_key] = row.plan_data;
            return acc;
          }, {});
          set({ packageLayouts });
        }
      },
      savePackageLayout: async (packageKey, groundPlan, firstFloorPlan) => {
        const fullPlan = { ground: groundPlan, first: firstFloorPlan };
        set((s) => ({
          packageLayouts: {
            ...s.packageLayouts,
            [packageKey]: fullPlan,
          },
          customPlan: groundPlan,
          customFirstFloorPlan: firstFloorPlan,
        }));
        await supabase.from('package_layouts').upsert({
          package_key: packageKey,
          plan_data: fullPlan as any,
          updated_at: new Date().toISOString(),
        });
      },
      saveAsPreset: async (name, groundPlan, firstFloorPlan) => {
        const fullPlan = { ground: groundPlan, first: firstFloorPlan };
        const presetName = name.trim() || `Custom Preset ${get().savedPresets.length + 1}`;
        const { data, error } = await supabase.from('presets').insert({
          name: presetName,
          plan_data: fullPlan as any,
        }).select().single();

        if (error) {
          throw error;
        }

        if (data) {
          set({
            presetId: -1,
            loadedPresetId: data.id,
            customPlan: groundPlan,
            customFirstFloorPlan: firstFloorPlan,
          });
          await get().fetchSavedPresets();
        }

        return data ?? null;
      },
      updateSavedPreset: async (groundPlan, firstFloorPlan) => {
        const state = get();
        const fullPlan = { ground: groundPlan, first: firstFloorPlan };
        set({ customPlan: groundPlan, customFirstFloorPlan: firstFloorPlan });
        
        if (state.loadedPresetId) {
          await supabase.from('presets').update({ plan_data: fullPlan as any }).eq('id', state.loadedPresetId);
          await state.fetchSavedPresets();
        } else {
          await state.saveAsPreset('Updated Preset', groundPlan, firstFloorPlan);
        }
      },
      deleteSavedPreset: async (index) => {
        const state = get();
        const target = state.savedPresets[index];
        if (target && target.id) {
          await supabase.from('presets').delete().eq('id', target.id);
        }
        set((s) => {
          const isDeletingLoaded = s.loadedPresetId === target?.id;
          return {
            savedPresets: s.savedPresets.filter((_, i) => i !== index),
            ...(isDeletingLoaded ? { presetId: 0, loadedPresetId: null, customPlan: null, customFirstFloorPlan: null } : {})
          };
        });
      },
      loadSavedPreset: (index) => set((s) => {
        const dbData = s.savedPresets[index]?.plan_data;
        if (!dbData) return s;
        
        const ground = dbData.ground || dbData;
        const first = dbData.first || null;
        
        // Ensure ground has required structure
        const safeGround = ground && ground.rooms ? ground : { width: 0, height: 0, rooms: [] };
        const safeFirst = first && first.rooms ? first : null;
        
        const hasFirstFloor = safeFirst && safeFirst.rooms && safeFirst.rooms.length > 0;
        return { 
          customPlan: safeGround, 
          customFirstFloorPlan: safeFirst, 
          loadedPresetId: s.savedPresets[index].id, 
          presetId: -1,
          isDoubleStorey: hasFirstFloor ? true : s.isDoubleStorey
        };
      }),
      reset: () => set({ ...initial }),
    }),
    { name: 'gbti-configurator' }
  )
);
