import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { getBuiltInPresetKey, getElevationLookupKeys, getElevationPresetKey, getFamilyDoubleStoreyPackageKey, getFamilyDoubleStoreyPackageLookupKeys, useConfig, RoofType, Material, KitchenType } from '@/store/configurator';
import { useKitchenMeta } from '@/hooks/PricingContext';
import { formatMoney } from '@/lib/cost';
import { StepShell } from '../StepShell';
import { FloorPlanCanvas } from '../FloorPlanCanvas';
import { ElevationCanvas } from '../ElevationCanvas';
import { CustomEditorCanvas, ROOM_BLOCKS } from '../CustomEditorCanvas';
import { Plan, splitPlanToFloors, Room, generateEmptyPlan, regenerateFurniture, syncStructuralWalls } from '@/lib/floorplan';
import { fetchElevationImagesByVariant, fetchElevationVariantFamily, normalizeParsedVariantAddons, resolveElevationVariant } from '@/lib/elevationVariants';
import { toast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, BedDouble, Bath, CookingPot, Sofa, Trees, Fence, Eye, ChevronLeft, ChevronRight, X, Check, Save, History, Layers, PenTool, Building2, ArrowUpDown, Trash, Copy, ClipboardPaste, Upload, Plus, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  plan: Plan;
  onChange?: (plan: Plan) => void;
  onResetPlan?: () => void;
}

const ROOFS: { id: RoofType; label: string }[] = [
  { id: 'gable', label: 'Gable' },
  { id: 'flat', label: 'Flat' },
];
const MATERIALS: { id: Material; label: string; swatch: string }[] = [
  { id: 'budget', label: 'Budget', swatch: '#e7decf' },
  { id: 'modern', label: 'Modern', swatch: '#1a1a1a' },
  { id: 'luxury', label: 'Luxury', swatch: '#c9a84c' },
];

// Floor Plan Clipboard (persists across re-renders within the session)
let floorPlanClipboard: { plan: Plan; label: string } | null = null;

interface RoomTab {
  id: string;
  label: string;
  icon: any;
  color: string;
}

function getRoomTabs(plan: Plan): RoomTab[] {
  const tabs: RoomTab[] = [
    { id: 'overview', label: 'OVERVIEW', icon: Eye, color: 'hsl(var(--accent))' },
  ];
  const hasType = (type: string) => plan.rooms?.some((r) => r.type === type) || false;
  if (hasType('living')) tabs.push({ id: 'living', label: 'HALL', icon: Sofa, color: 'hsl(var(--primary))' });
  if (hasType('bedroom')) tabs.push({ id: 'bedroom', label: 'BEDROOMS', icon: BedDouble, color: 'hsl(var(--primary))' });
  if (hasType('kitchen')) tabs.push({ id: 'kitchen', label: 'KITCHEN', icon: CookingPot, color: 'hsl(var(--accent))' });
  if (hasType('bathroom')) tabs.push({ id: 'bathroom', label: 'BATHROOM', icon: Bath, color: 'hsl(var(--primary))' });
  if (hasType('balcony')) tabs.push({ id: 'balcony', label: 'BALCONY', icon: Fence, color: 'hsl(120, 25%, 50%)' });
  if (hasType('garden') || hasType('carport')) tabs.push({ id: 'garden', label: 'GARDEN', icon: Trees, color: 'hsl(120, 30%, 45%)' });
  return tabs;
}

export const StepPreview = ({ plan, onChange, onResetPlan }: Props) => {
  const { roof, setRoof, material, setMaterial, addons, next, prev, planHistory, addHistoryRecord, removeHistoryRecord, setCustomPlan, customPlan, presetId, setPresetId, homeType, bedrooms, bathrooms, kitchen, setKitchen, advancedEditorMode, setAdvancedEditorMode, isDoubleStorey, setDoubleStorey, activeFloor, setActiveFloor, customFirstFloorPlan, setCustomFirstFloorPlan, savedPresets, packageLayouts, saveAsPreset, loadSavedPreset, loadedPresetId, updateSavedPreset, deleteSavedPreset, savePackageLayout, setPresetOverride, saveBuiltInPreset, presetOverrides, elevationImages, addElevationImage, removeElevationImage } = useConfig();
  const KITCHEN_META = useKitchenMeta();
  const isCustomPreset = presetId === -1;
  const [view, setView] = useState<'2d' | '3d' | 'elevation'>('2d');
  const [advanced, setAdvanced] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [stagedPlan, setStagedPlan] = useState<Plan | null>(null);
  const [roomCounter, setRoomCounter] = useState(0);
  const [hasCopiedPlan, setHasCopiedPlan] = useState(!!floorPlanClipboard);
  const [remoteElevationImages, setRemoteElevationImages] = useState<Record<string, { id: string; image_url: string; image_path: string; variant_id?: string | null; preset_key?: string }[]>>({});
  const [fetchedElevationKeys, setFetchedElevationKeys] = useState<Record<string, boolean>>({});
  const [uploadingElevation, setUploadingElevation] = useState(false);
  const [availableVariants, setAvailableVariants] = useState<{ id: string; preset_key: string; image_count: number; sample_url: string; roof?: string | null; material?: string | null; visual_addons?: string[] }[]>([]);
  const [showVariantRecovery, setShowVariantRecovery] = useState(false);
  const [currentElevationVariantId, setCurrentElevationVariantId] = useState<string | null>(null);
  const tabScrollRef = useRef<HTMLDivElement>(null);

  const currentPresetKey = useMemo(
    () => getBuiltInPresetKey({ homeType, bedrooms, bathrooms, kitchen, isDoubleStorey, addons }, presetId),
    [homeType, bedrooms, bathrooms, kitchen, isDoubleStorey, addons, presetId]
  );

  const currentElevationPresetKey = useMemo(
    () => getElevationPresetKey({ homeType, bedrooms, bathrooms, kitchen, isDoubleStorey, addons, roof, material }, presetId),
    [homeType, bedrooms, bathrooms, kitchen, isDoubleStorey, addons, roof, material, presetId]
  );

  const elevationLookupKeys = useMemo(
    () => getElevationLookupKeys({ homeType, bedrooms, bathrooms, kitchen, isDoubleStorey, addons, roof, material }, presetId),
    [homeType, bedrooms, bathrooms, kitchen, isDoubleStorey, addons, roof, material, presetId]
  );

  const fetchElevationImages = useCallback(async (presetKey: string, variantId: string | null, lookupKeys: string[] = []) => {
    const collected = variantId
      ? await fetchElevationImagesByVariant(variantId, lookupKeys)
      : [];

    setRemoteElevationImages((prev) => ({
      ...prev,
      [presetKey]: collected,
    }));
    setFetchedElevationKeys((prev) => ({
      ...prev,
      [presetKey]: true,
    }));
  }, []);

  const handleElevationUpload = useCallback(async (file: File) => {
    if (!file) return;
    const safePresetKey = currentElevationPresetKey.replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `${safePresetKey}/${Date.now()}-${safeFileName}`;

    setUploadingElevation(true);
    try {
      const { error: uploadError } = await supabase.storage
        .from('elevation-images')
        .upload(filePath, file, { upsert: false });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('elevation-images')
        .getPublicUrl(filePath);

      const imageUrl = publicUrlData.publicUrl;
      const variant = await resolveElevationVariant({ homeType, bedrooms, bathrooms, kitchen, isDoubleStorey, addons, roof, material }, presetId);
      setCurrentElevationVariantId(variant.id);

      const { error: insertError } = await supabase
        .from('elevation_images')
        .insert({
          preset_key: currentElevationPresetKey,
          image_path: filePath,
          image_url: imageUrl,
          variant_id: variant.id,
        });

      if (insertError) throw insertError;

      addElevationImage(currentElevationPresetKey, imageUrl);
      await fetchElevationImages(currentElevationPresetKey, variant.id, elevationLookupKeys);
      toast({ title: 'Image uploaded successfully' });
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error?.message || 'Unable to upload image to Supabase.',
        variant: 'destructive',
      });
    } finally {
      setUploadingElevation(false);
    }
  }, [addElevationImage, addons, bathrooms, bedrooms, currentElevationPresetKey, elevationLookupKeys, fetchElevationImages, homeType, isDoubleStorey, kitchen, material, presetId, roof]);

  const handleElevationDelete = useCallback(async (presetKey: string, index: number) => {
    const images = remoteElevationImages[presetKey] || [];
    const target = images[index];
    if (!target) {
      removeElevationImage(presetKey, index);
      return;
    }

    try {
      const { error: storageError } = await supabase.storage
        .from('elevation-images')
        .remove([target.image_path]);
      if (storageError) throw storageError;

      const { error: deleteError } = await supabase
        .from('elevation_images')
        .delete()
        .eq('id', target.id);
      if (deleteError) throw deleteError;

      removeElevationImage(presetKey, index);
      await fetchElevationImages(presetKey, currentElevationVariantId);
      toast({ title: 'Image removed' });
    } catch (error: any) {
      toast({
        title: 'Delete failed',
        description: error?.message || 'Unable to remove image from Supabase.',
        variant: 'destructive',
      });
    }
  }, [currentElevationVariantId, fetchElevationImages, remoteElevationImages, removeElevationImage]);

  useEffect(() => {
    if (view !== 'elevation') return;
    let cancelled = false;
    (async () => {
      const variant = await resolveElevationVariant({ homeType, bedrooms, bathrooms, kitchen, isDoubleStorey, addons, roof, material }, presetId);
      if (cancelled) return;
      setCurrentElevationVariantId(variant.id);
      await fetchElevationImages(currentElevationPresetKey, variant.id, elevationLookupKeys);
    })().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [addons, bathrooms, bedrooms, currentElevationPresetKey, elevationLookupKeys, fetchElevationImages, homeType, isDoubleStorey, kitchen, material, presetId, roof, view]);

  // Recovery: when the gallery is empty, fetch any uploaded variants matching
  // the current preset family (homeType + bedrooms + bathrooms + kitchen +
  // storey + presetId) so users can jump to the exact uploaded variant.
  useEffect(() => {
    if (view !== 'elevation') return;
    const remote = remoteElevationImages[currentElevationPresetKey] || [];
    if (remote.length > 0) {
      setAvailableVariants([]);
      setShowVariantRecovery(false);
      return;
    }

    const familyPrefix = `__elevation_variant__${homeType}_${bedrooms}bed_${bathrooms}bath_${kitchen}_${isDoubleStorey ? 'double' : 'single'}_`;
    const familySuffix = `_${presetId}`;

    let cancelled = false;
    (async () => {
      const data = await fetchElevationVariantFamily({ homeType, bedrooms, bathrooms, kitchen, isDoubleStorey }, presetId);
      if (cancelled) return;

      const mapped = data
        .filter((row: any) => (row.legacy_preset_key || '').startsWith(familyPrefix) && (row.legacy_preset_key || '').endsWith(familySuffix))
        .map((row: any) => ({
          id: row.id,
          preset_key: row.legacy_preset_key || row.variant_signature,
          image_count: row.image_count,
          sample_url: row.sample_url,
          roof: row.roof,
          material: row.material,
          visual_addons: row.visual_addons || [],
        }))
        .filter((row: any) => row.image_count > 0 && row.sample_url);

      setAvailableVariants(mapped);
      setShowVariantRecovery(mapped.length > 0);
    })();

    return () => {
      cancelled = true;
    };
  }, [view, currentElevationPresetKey, remoteElevationImages, homeType, bedrooms, bathrooms, kitchen, isDoubleStorey, presetId]);

  const parseVariantKey = useCallback((presetKey: string) => {
    const match = presetKey.match(/^__elevation_variant__.*?_roof_(gable|flat)_material_(budget|modern|luxury)_addons_(.+?)_(\d+)$/);
    if (!match) return null;
    return {
      roof: match[1] as RoofType,
      material: match[2] as Material,
      addons: match[3] === 'none' ? [] : match[3].split('-'),
    };
  }, []);

  const applyVariant = useCallback((presetKey: string) => {
    const variant = availableVariants.find((item) => item.preset_key === presetKey);
    const parsed = variant ? {
      roof: variant.roof as RoofType,
      material: variant.material as Material,
      addons: normalizeParsedVariantAddons(variant.visual_addons || []),
    } : parseVariantKey(presetKey);
    if (!parsed) {
      toast({
        title: 'Variant not recognized',
        description: 'This image was uploaded under an older key format and cannot be auto-applied.',
        variant: 'destructive',
      });
      return;
    }
    setRoof(parsed.roof);
    setMaterial(parsed.material);
    const state = useConfig.getState();
    const currentAddons = state.addons;
    const visualAddons = new Set(['carport', 'landscaping', 'fence', 'solar', 'water_tank']);
    const desiredVisual = new Set(parsed.addons);
    parsed.addons.forEach((addon) => {
      if (!currentAddons.includes(addon as any)) {
        useConfig.getState().toggleAddon(addon as any);
      }
    });
    useConfig.getState().addons.forEach((addon) => {
      if (visualAddons.has(addon) && !desiredVisual.has(addon)) {
        useConfig.getState().toggleAddon(addon as any);
      }
    });
    setShowVariantRecovery(false);
    toast({ title: 'Switched to uploaded variant', description: 'Your images for this variant should now appear.' });
  }, [availableVariants, parseVariantKey, setRoof, setMaterial]);

  // Double storey floor splitting
  const canDoubleStorey = homeType === 'family' || homeType === 'premium';
  const familyPackageKey = useMemo(() => getFamilyDoubleStoreyPackageKey({ homeType, bedrooms, bathrooms, kitchen, isDoubleStorey, addons }), [homeType, bedrooms, bathrooms, kitchen, isDoubleStorey, addons]);
  const familyPackageLookupKeys = useMemo(() => getFamilyDoubleStoreyPackageLookupKeys({ homeType, bedrooms, bathrooms, kitchen, isDoubleStorey, addons }), [homeType, bedrooms, bathrooms, kitchen, isDoubleStorey, addons]);
  const familyPackageLayout = useMemo(() => {
    if (!(homeType === 'family' && isDoubleStorey && presetId !== -1)) return null;
    for (const key of familyPackageLookupKeys) {
      if (packageLayouts[key]) return packageLayouts[key];
    }
    return null;
  }, [homeType, isDoubleStorey, presetId, packageLayouts, familyPackageLookupKeys]);

  // Check preset overrides for a saved double storey layout (ground + first floor)
  const builtInOverride = useMemo(() => {
    if (presetId < 0 || !isDoubleStorey) return null;
    const key = getBuiltInPresetKey({ homeType, bedrooms, bathrooms, kitchen, isDoubleStorey, addons }, presetId);
    const override = presetOverrides[key];
    return override?.ground?.rooms ? override : null;
  }, [homeType, bedrooms, bathrooms, kitchen, isDoubleStorey, addons, presetId, presetOverrides]);

  const floors = useMemo(() => {
    if (!isDoubleStorey) return null;
    // Preset override takes priority (user's saved alignment for this addon/storey combo)
    if (builtInOverride) return builtInOverride;
    if (familyPackageLayout) return familyPackageLayout;
    return splitPlanToFloors(plan, homeType, kitchen, bedrooms, bathrooms, addons as string[]);
  }, [isDoubleStorey, plan, homeType, kitchen, bedrooms, bathrooms, addons, familyPackageLayout, builtInOverride]);

  const isEditingFirstFloor = isDoubleStorey && activeFloor === 1;
  const isFamilyDoubleStoreyPackage = homeType === 'family' && isDoubleStorey && presetId !== -1;

  const savedGroundPlan = useMemo(() => {
    if (!isDoubleStorey || !floors) return plan;
    // For family double-storey packages, also honor the in-memory customPlan so
    // that Apply Changes is reflected immediately. setKitchen clears this so
    // each kitchen stays isolated.
    return ((isCustomPreset || isFamilyDoubleStoreyPackage) ? customPlan : null) || floors.ground;
  }, [isDoubleStorey, floors, plan, isCustomPreset, isFamilyDoubleStoreyPackage, customPlan]);

  // Fallback: if floors.first is missing (e.g. corrupted DB data), regenerate it
  const regeneratedFirstFloor = useMemo(() => {
    if (!isDoubleStorey) return null;
    const generated = splitPlanToFloors(plan, homeType, kitchen, bedrooms, bathrooms, addons as string[]);
    return generated.first || null;
  }, [isDoubleStorey, plan, homeType, kitchen, bedrooms, bathrooms, addons]);

  const savedFirstFloorPlan = useMemo(() => {
    if (!isDoubleStorey || !floors) return null;
    // For family double-storey packages, also honor the in-memory
    // customFirstFloorPlan so that Apply Changes shows immediately. setKitchen
    // clears this so each kitchen stays isolated.
    return ((isCustomPreset || isFamilyDoubleStoreyPackage) ? customFirstFloorPlan : null) || floors.first || regeneratedFirstFloor || null;
  }, [isDoubleStorey, floors, isCustomPreset, isFamilyDoubleStoreyPackage, customFirstFloorPlan, regeneratedFirstFloor]);

  // Determine which plan to show based on floor selection
  const displayPlan = useMemo(() => {
    if (!isDoubleStorey || !floors) return plan;
    if (isEditingFirstFloor) return savedFirstFloorPlan || floors.first;
    return savedGroundPlan;
  }, [isDoubleStorey, floors, plan, isEditingFirstFloor, savedGroundPlan, savedFirstFloorPlan]);

  const groundFloorPlan = useMemo(() => {
    if (!isDoubleStorey || !floors) return plan;
    if (!isEditingFirstFloor && stagedPlan) return stagedPlan;
    return savedGroundPlan;
  }, [isDoubleStorey, floors, plan, isEditingFirstFloor, stagedPlan, savedGroundPlan]);

  const firstFloorDisplayPlan = useMemo(() => {
    if (!isDoubleStorey || !floors) return undefined;
    if (isEditingFirstFloor && stagedPlan) return stagedPlan;
    return savedFirstFloorPlan || regeneratedFirstFloor || undefined;
  }, [isDoubleStorey, floors, isEditingFirstFloor, stagedPlan, savedFirstFloorPlan, regeneratedFirstFloor]);

  const currentPlan = useMemo(() => {
    const p = stagedPlan || displayPlan;
    // Ensure plan has required structure
    return p && p.rooms ? p : { width: 0, height: 0, rooms: [] };
  }, [stagedPlan, displayPlan]);

  const handleCopyLayout = () => {
    const planToCopy: Plan = JSON.parse(JSON.stringify(currentPlan));
    const label = isDoubleStorey
      ? (activeFloor === 0 ? 'Ground Floor' : 'First Floor')
      : (isCustomPreset && loadedPresetId ? 'Custom Preset' : 'Preset A');
    floorPlanClipboard = { plan: planToCopy, label };
    setHasCopiedPlan(true);
    toast({ title: 'Layout Copied', description: `${label} layout copied. Switch to another floor plan and paste.` });
  };

  const handlePasteLayout = () => {
    if (!floorPlanClipboard) return;
    const pastedPlan: Plan = JSON.parse(JSON.stringify(floorPlanClipboard.plan));
    const targetW = currentPlan.width;
    const targetH = currentPlan.height;
    if (pastedPlan.width !== targetW || pastedPlan.height !== targetH) {
      const sx = targetW / Math.max(1, pastedPlan.width);
      const sy = targetH / Math.max(1, pastedPlan.height);
      pastedPlan.rooms = pastedPlan.rooms.map((room) => {
        const scaled = { ...room, x: Math.round(room.x * sx), y: Math.round(room.y * sy), w: Math.max(2, Math.round(room.w * sx)), h: Math.max(2, Math.round(room.h * sy)) };
        scaled.furniture = regenerateFurniture(scaled, kitchen);
        return scaled;
      });
      pastedPlan.width = targetW;
      pastedPlan.height = targetH;
    }
    pastedPlan.plotEntranceX = currentPlan.plotEntranceX;
    setStagedPlan(pastedPlan);
    setAdvanced(true);
    toast({ title: 'Layout Pasted', description: `Pasted layout from "${floorPlanClipboard.label}". Click "Update Plan" to save.` });
  };

  const handleAddRoom = (blockIndex: number) => {
    const block = ROOM_BLOCKS[blockIndex];
    if (!block) return;

    const basePlan = currentPlan;
    const blockType = block.type;
    const id = `custom-${blockType}-${roomCounter}`;
    setRoomCounter((prev) => prev + 1);

    const existingCount = basePlan.rooms.filter((r) => r.type === blockType).length;
    let label = block.label.toUpperCase();
    if (blockType === 'bedroom') {
      label = existingCount === 0 ? 'MASTER BEDROOM' : `BEDROOM ${existingCount + 1}`;
    } else if (existingCount > 0) {
      label = `${block.label.toUpperCase()} ${existingCount + 1}`;
    }

    const cx = Math.max(0, Math.min(basePlan.width - block.defaultW, (basePlan.width - block.defaultW) / 2));
    const cy = Math.max(0, Math.min(basePlan.height - block.defaultH, (basePlan.height - block.defaultH) / 2));

    const newRoom: Room = {
      id,
      type: blockType,
      label,
      x: Math.round(cx),
      y: Math.round(cy),
      w: Math.min(block.defaultW, basePlan.width),
      h: Math.min(block.defaultH, basePlan.height),
      color: block.color,
      kitchenType: block.kitchenType,
      furniture: regenerateFurniture(
        {
          id, type: blockType, label, x: 0, y: 0, w: Math.min(block.defaultW, basePlan.width), h: Math.min(block.defaultH, basePlan.height),
          color: block.color, furniture: [], doors: [], windows: [], kitchenType: block.kitchenType,
        },
        kitchen
      ),
      doors: [],
      windows: [],
    };

    const updated = { ...basePlan, rooms: [...basePlan.rooms, newRoom] };
    setStagedPlan(updated);
  };

  const roomTabs = getRoomTabs(displayPlan);

  // Touch swipe support for tabs
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.touches[0].clientX);
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = e.changedTouches[0].clientX - touchStart;
    const currentIdx = roomTabs.findIndex((t) => t.id === activeTab);
    if (Math.abs(diff) > 50) {
      if (diff < 0 && currentIdx < roomTabs.length - 1) {
        setActiveTab(roomTabs[currentIdx + 1].id);
      } else if (diff > 0 && currentIdx > 0) {
        setActiveTab(roomTabs[currentIdx - 1].id);
      }
    }
    setTouchStart(null);
  };

  const scrollTabs = (dir: 'left' | 'right') => {
    tabScrollRef.current?.scrollBy({ left: dir === 'left' ? -120 : 120, behavior: 'smooth' });
  };

  // Get highlighted rooms for the active tab
  const getHighlightedPlan = useCallback((): Plan => {
    if (activeTab === 'overview') return displayPlan;
    const filteredRooms = displayPlan.rooms.map((r) => {
      const match = r.type === activeTab ||
        (activeTab === 'garden' && (r.type === 'garden' || r.type === 'carport'));
      return {
        ...r,
        color: match ? r.color : `hsl(0, 0%, 90%)`,
        furniture: match ? r.furniture : [],
      };
    });
    return { ...displayPlan, rooms: filteredRooms };
  }, [activeTab, displayPlan]);

  const currentTabLabel = roomTabs.find((t) => t.id === activeTab)?.label || 'OVERVIEW';

  const commitStagedPlan = () => {
    if (!stagedPlan) return null;

    const newGround = isEditingFirstFloor
      ? savedGroundPlan
      : stagedPlan;
    // Ensure first floor is never null — fall back to regenerated plan
    const newFirst = isEditingFirstFloor
      ? stagedPlan
      : (savedFirstFloorPlan || regeneratedFirstFloor);

    if (!isCustomPreset) {
      // For family double-storey packages, skip setPresetOverride — the caller
      // will persist via savePackageLayout which writes to package_layouts table.
      // setPresetOverride writes to local presetOverrides which gets wiped by
      // fetchSavedPresets, causing the first floor data to vanish on reload.
      if (!isFamilyDoubleStoreyPackage) {
        setPresetOverride(presetId, newGround, newFirst);
      }
    } else if (isEditingFirstFloor) {
      setCustomFirstFloorPlan(newFirst);
    } else {
      setCustomPlan(newGround);
    }

    return { newGround, newFirst };
  };

  return (
    <StepShell
      eyebrow="Step 04 · Visualization"
      title="Experience your design."
      subtitle="Switch between the technical floor plan and immersive 3D elevation. Navigate room by room."
      onNext={next}
      onPrev={prev}
    >
      <div className="space-y-8">
        {/* View toggle + controls */}
        <div className="flex flex-col gap-6 bg-surface p-6 rounded-3xl border border-border shadow-soft">
          {/* Main Controls Row */}
          {!advancedEditorMode ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
              <div className="inline-flex rounded-xl bg-soft-section p-1 border border-border shadow-inner overflow-x-auto scrollbar-hide">
                {(['2d', '3d', 'elevation'] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => { setView(v); setAdvancedEditorMode(false); }}
                    className={`relative rounded-lg px-6 py-2.5 text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-500 ${
                      view === v && !advancedEditorMode ? 'text-white' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {view === v && !advancedEditorMode && (
                      <motion.div layoutId="view-pill" className="absolute inset-0 rounded-lg bg-primary shadow-lg"
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }} />
                    )}
                    <span className="relative z-10">
                      {v === '2d' ? '2D View' : v === '3d' ? '3D View' : 'Elevation View'}
                    </span>
                  </button>
                ))}
              </div>

              {(view === '2d' || view === 'elevation') && !advancedEditorMode && (
                <div className="inline-flex rounded-xl bg-soft-section/50 p-1 border border-border/50 overflow-x-auto scrollbar-hide">
                  {[0].map((id) => (
                    <button
                      key={id}
                      onClick={() => setPresetId(id)}
                      className={`rounded-lg px-4 py-2.5 text-[9px] font-bold uppercase tracking-[0.2em] transition-all duration-300 ${
                        presetId === id
                          ? 'bg-white text-foreground shadow-sm'
                          : 'text-muted-foreground/60 hover:text-foreground'
                      }`}
                    >
                      Preset A
                    </button>
                  ))}
                  {savedPresets.map((savedPresetObj, i) => (
                    <button
                      key={`saved-${i}`}
                      onClick={() => loadSavedPreset(i)}
                      className={`rounded-lg px-4 py-2.5 text-[9px] font-bold uppercase tracking-[0.2em] transition-all duration-300 ${
                        presetId === -1 && loadedPresetId === savedPresetObj.id
                          ? 'bg-white text-foreground shadow-sm'
                          : 'text-muted-foreground/60 hover:text-foreground'
                      }`}
                    >
                      {savedPresetObj.name || `Custom ${i + 1}`}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 md:gap-4">
              {view === '2d' && !advancedEditorMode && (
                <>
                  {canDoubleStorey && (
                    <button
                      onClick={() => setDoubleStorey(!isDoubleStorey)}
                      className={`flex items-center gap-2 h-11 rounded-xl border border-clay/40 bg-soft-section text-clay px-5 text-[10px] font-bold uppercase tracking-[0.2em] transition-all active:scale-95 ${
                        isDoubleStorey
                          ? 'border-clay/40 bg-soft-section text-clay'
                          : 'border-border bg-white text-muted-foreground hover:bg-soft-section hover:text-foreground'
                      }`}
                    >
                      <Building2 size={14} strokeWidth={1.5} />
                      {isDoubleStorey ? '2 Storey ✓' : '2 Storey'}
                    </button>
                  )}
                  <button
                    onClick={() => setAdvancedEditorMode(true)}
                    className="flex items-center gap-2 h-11 rounded-xl border border-primary/10 bg-primary/5 text-primary px-5 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-primary/10 transition-all active:scale-95"
                  >
                    <PenTool size={14} strokeWidth={1.5} />
                    Custom Editor
                  </button>
                  <button
                    onClick={() => setAdvanced((v) => !v)}
                    className={`h-10 md:h-11 rounded-xl border px-4 md:px-6 text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-500 ${
                      advanced ? 'border-primary bg-primary text-white shadow-lg' : 'border-border bg-white text-muted-foreground hover:bg-soft-section hover:text-foreground'
                    }`}
                  >
                    {advanced ? 'Advanced' : 'Advanced Mode'}
                  </button>
                </>
              )}
              {view === '3d' && !advancedEditorMode && (
                <div className="flex flex-wrap items-center gap-4 md:gap-6">
                  <Group label="Roof">
                    {ROOFS.map((r) => (
                      <Pill key={r.id} active={roof === r.id} onClick={() => setRoof(r.id)}>{r.label}</Pill>
                    ))}
                  </Group>
                  <Group label="Material">
                    {MATERIALS.map((m) => (
                      <Pill key={m.id} active={material === m.id} onClick={() => setMaterial(m.id)}>
                        <span className="inline-block h-2.5 w-2.5 rounded-full mr-1.5 md:mr-2 align-middle shadow-inner" style={{ background: m.swatch }} />
                        {m.label}
                      </Pill>
                    ))}
                  </Group>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-primary/5 text-primary">
                <PenTool size={20} strokeWidth={1.5} className="animate-pulse" />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-foreground">Custom Editor Mode</span>
                <span className="text-[9px] text-muted-foreground/60 uppercase tracking-[0.2em] mt-0.5">Architectural Drafting · Level {activeFloor + 1}</span>
              </div>
            </div>
            <button
              onClick={() => setAdvancedEditorMode(false)}
              className="flex items-center gap-2 h-11 rounded-xl bg-white border border-border text-foreground px-6 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-soft-section transition-all active:scale-95"
            >
              <X size={16} />
              Exit Editor
            </button>
          </div>
        )}

          {/* Advanced Controls Row */}
          <AnimatePresence>
            {advanced && view === '2d' && !advancedEditorMode && (
              <motion.div 
                initial={{ height: 0, opacity: 0, marginTop: 0 }}
                animate={{ height: 'auto', opacity: 1, marginTop: 24 }}
                exit={{ height: 0, opacity: 0, marginTop: 0 }}
                className="overflow-hidden border-t border-border pt-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  {/* Left Column: Room Addition + Kitchen Type */}
                  <div className="space-y-8">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/40">Add Structural Elements</span>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {ROOM_BLOCKS.map((block, index) => {
                          const Icon = block.icon;
                          return (
                            <button
                              key={block.label}
                              onClick={() => handleAddRoom(index)}
                              className="flex h-11 items-center gap-3 rounded-xl px-4 text-[10px] font-bold uppercase tracking-[0.2em] border border-border bg-white hover:bg-soft-section hover:shadow-soft transition-all active:scale-95 group"
                              style={{ borderLeftColor: block.color, borderLeftWidth: 3 }}
                            >
                              <Icon size={14} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                              {block.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Kitchen Type Selector */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CookingPot size={14} strokeWidth={1.5} className="text-muted-foreground/40" />
                        <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/40">Kitchen Layout</span>
                      </div>
                      <div className="flex gap-3">
                        {([
                          { id: 'standard' as KitchenType, label: 'Standard', desc: 'Closed kitchen' },
                          { id: 'open' as KitchenType, label: 'Open Plan', desc: 'Merged layout' },
                          { id: 'galley' as KitchenType, label: 'Galley', desc: 'Two-wall compact' },
                        ]).map((k) => {
                          const active = kitchen === k.id;
                          const kitchenMeta = KITCHEN_META[k.id];
                          return (
                            <button
                              key={k.id}
                              onClick={() => {
                                setKitchen(k.id);
                                setStagedPlan(null);
                              }}
                              className={`group relative flex-1 overflow-hidden rounded-xl p-4 text-left transition-all duration-500 border ${
                                active
                                  ? 'bg-surface shadow-elev border-clay/30 scale-[1.02]'
                                  : 'bg-surface/50 border-border hover:border-muted-foreground/20 hover:bg-surface hover:shadow-soft'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className={`font-display font-medium tracking-tight text-[11px] uppercase ${active ? 'text-foreground' : 'text-foreground/70'}`}>{k.label}</span>
                                <div className="flex items-center gap-2">
                                  {kitchenMeta && <span className="text-[9px] font-bold uppercase tracking-widest text-clay num">+{formatMoney(kitchenMeta.cost)}</span>}
                                  {active && <div className="h-1.5 w-1.5 rounded-full bg-clay" />}
                                </div>
                              </div>
                              <p className="text-[9px] text-muted-foreground leading-relaxed font-light">{k.desc}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Utilities & Actions */}
                  <div className="space-y-8">
                    <div className="flex flex-wrap items-start justify-between gap-8">
                      {/* Clipboard Section */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/40">Clipboard</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={handleCopyLayout}
                            className="flex items-center gap-2 h-11 rounded-xl border border-border bg-white text-muted-foreground px-5 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-soft-section hover:text-foreground transition-all active:scale-95"
                          >
                            <Copy size={14} />
                            Copy Layout
                          </button>
                          {hasCopiedPlan && (
                            <button
                              onClick={handlePasteLayout}
                              className="flex items-center gap-2 h-11 rounded-xl border border-clay/30 bg-soft-section text-clay px-5 text-[10px] font-bold uppercase tracking-[0.2em] hover:brightness-105 transition-all active:scale-95"
                            >
                              <ClipboardPaste size={14} />
                              Paste <span className="opacity-50 lowercase ml-1">({floorPlanClipboard?.label})</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Management Section */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/40">Management</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => { setStagedPlan(null); onResetPlan?.(); }}
                            className="h-11 rounded-xl border border-border bg-white text-muted-foreground px-5 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all active:scale-95"
                          >
                            Reset
                          </button>
                          {presetId === -1 && loadedPresetId && (
                            <button
                              onClick={() => {
                                const idx = savedPresets.findIndex(p => p.id === loadedPresetId);
                                if (idx !== -1) deleteSavedPreset(idx);
                              }}
                              className="h-11 w-11 flex items-center justify-center rounded-xl border border-border text-muted-foreground hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all"
                              title="Delete this custom preset"
                            >
                              <Trash size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Final Actions Row */}
                    {stagedPlan && (
                      <div className="flex items-center gap-4 pt-4 border-t border-border">
                        <button
                          onClick={async () => {
                            const committed = commitStagedPlan();
                            if (!committed) return;
                            try {
                              if (isFamilyDoubleStoreyPackage) {
                                await savePackageLayout(familyPackageKey, committed.newGround, committed.newFirst);
                                toast({ title: 'Plan updated' });
                              } else if (presetId === -1 && loadedPresetId) {
                                await updateSavedPreset(committed.newGround, committed.newFirst);
                                toast({ title: 'Preset updated' });
                              } else if (presetId === 0) {
                                await saveBuiltInPreset(presetId, committed.newGround, committed.newFirst);
                                toast({ title: 'Preset A updated' });
                              }
                              setStagedPlan(null);
                              planHistory.forEach(h => removeHistoryRecord(h.id));
                            } catch (e) {
                              toast({ title: 'Update failed', variant: 'destructive' });
                            }
                          }}
                          className="flex-1 flex items-center justify-center gap-3 h-12 rounded-xl bg-primary text-white text-[10px] font-bold uppercase tracking-[0.3em] shadow-lg hover:brightness-110 transition-all active:scale-[0.98]"
                        >
                          <Check size={18} strokeWidth={2.5} /> Apply Changes
                        </button>
                        <button
                          onClick={async () => {
                            const committed = commitStagedPlan();
                            if (!committed) return;
                            const name = window.prompt('Preset Name:', presetId === 0 ? 'Preset A Copy' : 'Custom Layout');
                            if (!name) return;
                            try {
                              await saveAsPreset(name.trim(), committed.newGround, committed.newFirst);
                              toast({ title: 'Saved as Preset', description: name });
                              setStagedPlan(null);
                              setAdvanced(false);
                            } catch (e) {
                              toast({ title: 'Save failed' });
                            }
                          }}
                          className="flex-1 flex items-center justify-center gap-3 h-12 rounded-xl bg-soft-section border border-border text-foreground text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-muted/10 transition-all active:scale-[0.98]"
                        >
                          <Save size={18} strokeWidth={1.5} /> Save As New
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Double Storey Floor Selector Overlay */}
          {isDoubleStorey && !advancedEditorMode && (
            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-border">
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/40 mr-2">Level Selection:</span>
              <div className="inline-flex rounded-xl bg-soft-section p-1 border border-border shadow-inner overflow-x-auto scrollbar-hide">
                {([0, 1, 2] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setActiveFloor(f)}
                    className={`rounded-lg px-4 md:px-8 py-2 md:py-2.5 text-[8px] md:text-[9px] font-bold uppercase tracking-[0.2em] transition-all duration-500 whitespace-nowrap ${
                      activeFloor === f
                        ? 'bg-white text-foreground shadow-lg scale-[1.02]'
                        : 'text-muted-foreground/60 hover:text-foreground'
                    }`}
                  >
                    {f === 0 ? 'Ground' : f === 1 ? 'First' : 'Full View'}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Canvas area */}
        <div className="flex h-[360px] xs:h-[440px] md:h-[560px] overflow-hidden rounded-3xl border border-border shadow-elev relative bg-white">
          <div
            className="relative flex-1 overflow-hidden"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <AnimatePresence mode="wait">
              {advancedEditorMode ? (
                <motion.div key="editor" className="h-full w-full"
                  initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
                  <CustomEditorCanvas
                    homeType={homeType}
                    onChange={(editorPlan) => {
                      if (isEditingFirstFloor) {
                        setCustomFirstFloorPlan(editorPlan);
                      } else if (isCustomPreset) {
                        setCustomPlan(editorPlan);
                      }
                    }}
                    onSave={async (editorPlan) => {
                      const newGround = isEditingFirstFloor
                        ? savedGroundPlan
                        : editorPlan;
                      // Ensure first floor is never null — fall back to regenerated plan
                      const newFirst = isEditingFirstFloor
                        ? editorPlan
                        : (savedFirstFloorPlan || regeneratedFirstFloor);

                      try {
                        if (isFamilyDoubleStoreyPackage) {
                          await savePackageLayout(familyPackageKey, newGround, newFirst);
                        } else if (!isCustomPreset && presetId === 0) {
                          await saveBuiltInPreset(presetId, newGround, newFirst);
                        } else if (isCustomPreset && loadedPresetId) {
                          await updateSavedPreset(newGround, newFirst);
                        } else if (!isCustomPreset) {
                          setPresetOverride(presetId, newGround, newFirst);
                        }
                        toast({ title: 'Layout saved', description: 'Your floor plan layout has been saved.' });
                      } catch (error) {
                        console.error('Failed to save custom editor layout', error);
                        toast({ title: 'Save failed', description: 'Could not save the floor plan layout. Please try again.' });
                        return;
                      }

                      if (isCustomPreset && isEditingFirstFloor) {
                        setCustomFirstFloorPlan(newFirst);
                      } else if (isCustomPreset) {
                        setCustomPlan(newGround);
                      }

                      setAdvancedEditorMode(false);
                    }}
                    initialPlan={isEditingFirstFloor ? savedFirstFloorPlan : savedGroundPlan}
                    floorLevel={isDoubleStorey ? activeFloor : undefined}
                  />
                </motion.div>
              ) : view === '2d' ? (
                <motion.div key={`2d-${activeFloor}`} className="h-full w-full"
                  initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
                  <FloorPlanCanvas plan={stagedPlan || getHighlightedPlan()} advanced={advanced} hideZoomHelper={true} floorLevel={isDoubleStorey ? activeFloor : undefined} onChange={(updatedHighlightedPlan) => {
                    const newPlan = {
                      ...(stagedPlan || displayPlan),
                      width: updatedHighlightedPlan.width,
                      height: updatedHighlightedPlan.height,
                      rooms: (stagedPlan || displayPlan).rooms
                        .filter(r => updatedHighlightedPlan.rooms.some(ur => ur.id === r.id))
                        .map(r => {
                        const updatedR = updatedHighlightedPlan.rooms.find(ur => ur.id === r.id);
                        if (updatedR) {
                          return {
                            ...r,
                            x: updatedR.x,
                            y: updatedR.y,
                            w: updatedR.w,
                            h: updatedR.h,
                            doors: updatedR.doors,
                            windows: updatedR.windows,
                            orientation: updatedR.orientation,
                            isMirrored: updatedR.isMirrored,
                            openWalls: updatedR.openWalls,
                            furniture: updatedR.furniture.length > 0 ? updatedR.furniture : r.furniture
                          };
                        }
                        return r;
                      })
                    };
                    setStagedPlan(newPlan);
                    
                    // History tracking
                    const changedRoom = updatedHighlightedPlan.rooms.find((ur, i) => {
                      const oldR = (stagedPlan || displayPlan).rooms.find(or => or.id === ur.id);
                      return oldR && (oldR.x !== ur.x || oldR.y !== ur.y || oldR.w !== ur.w || oldR.h !== ur.h || oldR.doors.length !== ur.doors.length);
                    });

                    if (changedRoom) {
                      const oldR = (stagedPlan || displayPlan).rooms.find(or => or.id === changedRoom.id);
                      if (oldR) {
                         const existing = planHistory.find(h => h.targetId === changedRoom.id);
                         if (!existing) {
                           addHistoryRecord({
                             label: `Modified ${changedRoom.label}`,
                             type: 'room-edit',
                             targetId: changedRoom.id,
                             original: oldR
                           });
                         }
                      }
                    }
                  }} />
                </motion.div>
              ) : view === '3d' ? (
                <motion.div key={`3d-${activeFloor}`} className="h-full w-full"
                  initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
                  <ElevationCanvas plan={isDoubleStorey ? groundFloorPlan : currentPlan} roof={roof} material={material} addons={addons} activeRoom={activeTab} isDoubleStorey={isDoubleStorey} firstFloorPlan={firstFloorDisplayPlan} hideHelpers={true} activeFloor={activeFloor} />
                </motion.div>
              ) : (
                <motion.div key="elevation" className="h-full w-full bg-white p-8 flex flex-col"
                  initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
                  
                  {/* Elevation Header with Upload */}
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-foreground">Elevation Gallery</h3>
                      <p className="text-[10px] text-muted-foreground/60 uppercase tracking-[0.1em] mt-1">Manage architectural visuals for this preset</p>
                    </div>
                    
                    <label className={`flex items-center gap-2 h-10 rounded-xl bg-primary text-white px-5 text-[10px] font-bold uppercase tracking-[0.2em] hover:brightness-110 transition-all active:scale-95 cursor-pointer shadow-lg ${uploadingElevation ? 'opacity-70 pointer-events-none' : ''}`}>
                      <Upload size={14} />
                      {uploadingElevation ? 'Uploading...' : 'Upload Image'}
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        disabled={uploadingElevation}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleElevationUpload(file);
                          }
                          e.currentTarget.value = '';
                        }}
                      />
                    </label>
                  </div>

                  {/* Gallery Grid */}
                  <div className="flex-1 overflow-y-auto pr-2">
                    {(() => {
                      const presetKey = currentElevationPresetKey;
                      const remoteImages = remoteElevationImages[presetKey] || [];
                      const hasFetchedRemoteImages = !!fetchedElevationKeys[presetKey];
                      const images = hasFetchedRemoteImages
                        ? remoteImages.map((img) => img.image_url)
                        : (elevationImages[presetKey] || []);
                      
                      if (images.length === 0) {
                        return (
                          <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-border rounded-3xl p-12 text-center">
                            <div className="h-16 w-16 flex items-center justify-center rounded-2xl bg-soft-section text-muted-foreground/40 mb-4">
                              <ImageIcon size={32} strokeWidth={1.5} />
                            </div>
                            <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] text-foreground mb-2">No Images Yet</h4>
                            <p className="text-[10px] text-muted-foreground/60 max-w-[320px] leading-relaxed">
                              Upload architectural elevation drawings or site photos to visualize this specific layout configuration.
                            </p>
                            <p className="mt-4 text-[9px] text-muted-foreground/50 font-mono break-all max-w-md">
                              Current key: <span className="text-foreground/70">{currentElevationPresetKey}</span>
                            </p>
                            {showVariantRecovery && availableVariants.length > 0 && (
                              <div className="mt-8 w-full max-w-2xl text-left">
                                <h5 className="text-[11px] font-bold uppercase tracking-[0.2em] text-foreground mb-3">
                                  Found {availableVariants.length} uploaded {availableVariants.length === 1 ? 'variant' : 'variants'} for this preset
                                </h5>
                                <p className="text-[10px] text-muted-foreground/70 mb-4 leading-relaxed">
                                  Click a variant below to switch the configuration and view its uploaded images.
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {availableVariants.map((variant) => {
                                    const parsed = parseVariantKey(variant.preset_key);
                                    const label = parsed
                                      ? `${parsed.roof} · ${parsed.material} · ${parsed.addons.length ? parsed.addons.join(', ') : 'no add-ons'}`
                                      : variant.preset_key;
                                    return (
                                      <button
                                        key={variant.preset_key}
                                        onClick={() => applyVariant(variant.preset_key)}
                                        className="group flex items-center gap-3 rounded-xl border border-border bg-white hover:border-primary/40 hover:shadow-soft transition-all p-3 text-left"
                                      >
                                        <img src={variant.sample_url} alt="variant" className="h-14 w-14 rounded-lg object-cover" />
                                        <div className="flex-1 min-w-0">
                                          <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-foreground truncate">{label}</div>
                                          <div className="text-[9px] text-muted-foreground/60 mt-1">{variant.image_count} image{variant.image_count === 1 ? '' : 's'}</div>
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      }

                      return (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                          {images.map((img, idx) => (
                            <div key={idx} className="group relative aspect-[4/3] rounded-2xl overflow-hidden border border-border bg-soft-section shadow-soft transition-all hover:shadow-elev">
                              <img src={img} alt={`Elevation ${idx + 1}`} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <button 
                                  onClick={() => remoteImages.length > 0 ? handleElevationDelete(presetKey, idx) : removeElevationImage(presetKey, idx)}
                                  className="h-10 w-10 flex items-center justify-center rounded-xl bg-red-500 text-white shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-transform"
                                >
                                  <Trash size={18} />
                                </button>
                              </div>
                            </div>
                          ))}
                          <label className="aspect-[4/3] rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-3 text-muted-foreground hover:bg-soft-section hover:border-primary/20 hover:text-primary transition-all cursor-pointer group">
                            <div className="h-10 w-10 flex items-center justify-center rounded-full bg-soft-section group-hover:bg-primary/5">
                              <Plus size={20} />
                            </div>
                            <span className="text-[9px] font-bold uppercase tracking-[0.2em]">Add More</span>
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              disabled={uploadingElevation}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleElevationUpload(file);
                                }
                                e.currentTarget.value = '';
                              }}
                            />
                          </label>
                        </div>
                      );
                    })()}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            
            {/* Staged indicator */}
            {stagedPlan && !advancedEditorMode && (
              <div className="pointer-events-none absolute left-8 top-8 flex items-center gap-3 rounded-xl bg-clay/5 border border-clay/20 px-4 py-2.5 shadow-lg backdrop-blur-md">
                <div className="h-1.5 w-1.5 rounded-full bg-clay animate-pulse" /> 
                <span className="text-[10px] font-bold text-clay uppercase tracking-[0.2em]">Unsaved Drafting Changes</span>
              </div>
            )}

          {/* Current room label overlay */}
          {activeTab !== 'overview' && !advancedEditorMode && (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="absolute bottom-28 left-1/2 -translate-x-1/2 rounded-full border border-border bg-white/90 backdrop-blur-md px-10 py-4 shadow-elev"
            >
              <span className="font-display text-lg md:text-2xl font-normal tracking-tight text-foreground whitespace-nowrap">
                {currentTabLabel}
              </span>
            </motion.div>
          )}

          {/* Room navigation tabs (only for non-editor views) */}
          {!advancedEditorMode && (
            <div className="absolute bottom-4 md:bottom-8 left-1/2 -translate-x-1/2 w-[95%] md:w-[90%] max-w-[640px]">
              <div className="relative flex items-center gap-3">
                <button onClick={() => scrollTabs('left')}
                  className="shrink-0 flex h-12 w-12 items-center justify-center rounded-full bg-white/90 backdrop-blur-md border border-border shadow-lg hover:bg-white transition-all hover:scale-105 active:scale-95">
                  <ChevronLeft size={20} className="text-muted-foreground hover:text-foreground" />
                </button>

                <div ref={tabScrollRef}
                  className="flex-1 overflow-x-auto scrollbar-hide flex items-center gap-1.5 md:gap-2 rounded-[2.5rem] bg-white/90 backdrop-blur-md border border-border shadow-elev px-2 md:px-3 py-1.5 md:py-2">
                  {roomTabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`shrink-0 flex items-center gap-2 md:gap-3 rounded-full px-4 md:px-6 py-2.5 md:py-3 text-[8px] md:text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-500 ${
                          isActive
                            ? 'text-white shadow-lg scale-105'
                            : 'text-muted-foreground/60 hover:text-foreground hover:bg-soft-section'
                        }`}
                        style={isActive ? { background: tab.color } : {}}
                      >
                        <Icon size={14} className="md:w-4 md:h-4" strokeWidth={isActive ? 2 : 1.25} />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                <button onClick={() => scrollTabs('right')}
                  className="shrink-0 flex h-12 w-12 items-center justify-center rounded-full bg-white/90 backdrop-blur-md border border-border shadow-lg hover:bg-white transition-all hover:scale-105 active:scale-95">
                  <ChevronRight size={20} className="text-muted-foreground hover:text-foreground" />
                </button>
              </div>
            </div>
          )}
        </div>
          {/* Change Log Sidebar */}
          {advanced && planHistory.length > 0 && !advancedEditorMode && (
            <div className="hidden lg:flex flex-col w-[320px] border-l border-border bg-soft-section/20 p-8 overflow-y-auto">
              <div className="flex items-center gap-3 mb-8 text-[11px] font-bold uppercase tracking-[0.3em] text-muted-foreground/40">
                <History size={18} strokeWidth={1.5} /> Design History
              </div>
              <div className="space-y-4">
                {planHistory.map((record) => (
                  <div key={record.id} className="group relative rounded-2xl bg-white p-5 shadow-soft border border-border hover:border-clay/20 transition-all duration-500">
                    <div className="text-[13px] font-medium text-foreground pr-8 leading-tight tracking-tight">{record.label}</div>
                    <div className="text-[9px] text-muted-foreground/50 uppercase tracking-[0.2em] mt-2 font-bold">{record.type.replace('-', ' ')}</div>
                    <button
                      onClick={() => {
                        // Revert room
                        const revertedPlan = {
                          ...(stagedPlan || plan),
                          rooms: (stagedPlan || plan).rooms.map(r => r.id === record.targetId ? record.original : r)
                        };
                        setStagedPlan(revertedPlan);
                        removeHistoryRecord(record.id);
                      }}
                      className="absolute right-4 top-5 h-8 w-8 flex items-center justify-center rounded-full bg-red-50 text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all duration-300"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-auto pt-8 text-[10px] text-center text-muted-foreground/30 font-bold uppercase tracking-[0.2em]">
                Drafting State Active
              </div>
            </div>
          )}
        </div>
        {/* Swipe hint for mobile */}
        {!advancedEditorMode && (
          <p className="text-center text-[10px] font-bold text-muted-foreground/30 uppercase tracking-[0.3em] md:hidden mt-4">
            ← Swipe tabs to navigate rooms →
          </p>
        )}
      </div>
    </StepShell>
  );
};

const Group = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-center gap-2">
    <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground/60 mr-2">{label}</span>
    <div className="flex items-center gap-1.5">{children}</div>
  </div>
);

const Pill = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    onClick={onClick}
    className={`rounded-2xl px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${
      active 
        ? 'bg-primary text-primary-foreground shadow-md scale-105' 
        : 'bg-surface border border-border/50 hover:bg-white hover:shadow-sm'
    }`}
  >
    {children}
  </button>
);
