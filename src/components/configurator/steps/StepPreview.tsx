import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { FAMILY_DOUBLE_STOREY_PACKAGE_KEY, getBuiltInPresetKey, getFamilyDoubleStoreyPackageKey, useConfig, RoofType, Material } from '@/store/configurator';
import { StepShell } from '../StepShell';
import { FloorPlanCanvas } from '../FloorPlanCanvas';
import { ElevationCanvas } from '../ElevationCanvas';
import { CustomEditorCanvas, ROOM_BLOCKS } from '../CustomEditorCanvas';
import { Plan, splitPlanToFloors, Room, generateEmptyPlan, regenerateFurniture } from '@/lib/floorplan';
import { toast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, BedDouble, Bath, CookingPot, Sofa, Trees, Fence, Eye, ChevronLeft, ChevronRight, X, Check, Save, History, Layers, PenTool, Building2, ArrowUpDown, Trash } from 'lucide-react';

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

interface RoomTab {
  id: string;
  label: string;
  icon: any;
  color: string;
}

function getRoomTabs(plan: Plan): RoomTab[] {
  const tabs: RoomTab[] = [
    { id: 'overview', label: 'OVERVIEW', icon: Eye, color: 'hsl(33, 40%, 55%)' },
  ];
  const hasType = (type: string) => plan.rooms?.some((r) => r.type === type) || false;
  if (hasType('living')) tabs.push({ id: 'living', label: 'HALL', icon: Sofa, color: 'hsl(215, 35%, 55%)' });
  if (hasType('bedroom')) tabs.push({ id: 'bedroom', label: 'BEDROOMS', icon: BedDouble, color: 'hsl(33, 35%, 60%)' });
  if (hasType('kitchen')) tabs.push({ id: 'kitchen', label: 'KITCHEN', icon: CookingPot, color: 'hsl(28, 40%, 55%)' });
  if (hasType('bathroom')) tabs.push({ id: 'bathroom', label: 'BATHROOM', icon: Bath, color: 'hsl(200, 30%, 55%)' });
  if (hasType('balcony')) tabs.push({ id: 'balcony', label: 'BALCONY', icon: Fence, color: 'hsl(120, 25%, 50%)' });
  if (hasType('garden') || hasType('carport')) tabs.push({ id: 'garden', label: 'GARDEN', icon: Trees, color: 'hsl(120, 30%, 45%)' });
  return tabs;
}

export const StepPreview = ({ plan, onChange, onResetPlan }: Props) => {
  const { roof, setRoof, material, setMaterial, addons, next, prev, planHistory, addHistoryRecord, removeHistoryRecord, setCustomPlan, customPlan, presetId, setPresetId, homeType, bedrooms, bathrooms, kitchen, advancedEditorMode, setAdvancedEditorMode, isDoubleStorey, setDoubleStorey, activeFloor, setActiveFloor, customFirstFloorPlan, setCustomFirstFloorPlan, savedPresets, packageLayouts, saveAsPreset, loadSavedPreset, loadedPresetId, updateSavedPreset, deleteSavedPreset, savePackageLayout, setPresetOverride, saveBuiltInPreset, presetOverrides } = useConfig();
  const isCustomPreset = presetId === -1;
  const [view, setView] = useState<'2d' | '3d'>('2d');
  const [advanced, setAdvanced] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [stagedPlan, setStagedPlan] = useState<Plan | null>(null);
  const [roomCounter, setRoomCounter] = useState(0);
  const tabScrollRef = useRef<HTMLDivElement>(null);

  // Double storey floor splitting
  const canDoubleStorey = homeType === 'family' || homeType === 'premium';
  const familyPackageKey = useMemo(() => getFamilyDoubleStoreyPackageKey({ homeType, bedrooms, bathrooms, kitchen, isDoubleStorey }), [homeType, bedrooms, bathrooms, kitchen, isDoubleStorey]);
  const familyPackageLayout = useMemo(() => {
    if (!(homeType === 'family' && isDoubleStorey && presetId !== -1)) return null;
    return packageLayouts[familyPackageKey] || packageLayouts[FAMILY_DOUBLE_STOREY_PACKAGE_KEY] || null;
  }, [homeType, isDoubleStorey, presetId, packageLayouts, familyPackageKey]);

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
    return splitPlanToFloors(plan, homeType);
  }, [isDoubleStorey, plan, homeType, familyPackageLayout, builtInOverride]);

  // Determine which plan to show based on floor selection
  const displayPlan = useMemo(() => {
    if (!isDoubleStorey || !floors) return plan;
    if (activeFloor === 0) return (isCustomPreset ? customPlan : null) || floors.ground;
    return (isCustomPreset ? customFirstFloorPlan : null) || floors.first;
  }, [isDoubleStorey, floors, activeFloor, plan, customFirstFloorPlan, customPlan, isCustomPreset]);

  const currentPlan = useMemo(() => {
    const p = stagedPlan || displayPlan;
    // Ensure plan has required structure
    return p && p.rooms ? p : { width: 0, height: 0, rooms: [] };
  }, [stagedPlan, displayPlan]);

  const isFamilyDoubleStoreyPackage = homeType === 'family' && isDoubleStorey && presetId !== -1;

  const handleAddRoom = (blockType: Room['type']) => {
    const block = ROOM_BLOCKS.find((b) => b.type === blockType);
    if (!block) return;

    const basePlan = currentPlan;
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
      furniture: regenerateFurniture(
        {
          id, type: blockType, label, x: 0, y: 0, w: block.defaultW, h: block.defaultH,
          color: block.color, furniture: [], doors: [], windows: [],
        },
        'open'
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

    const newGround = (isDoubleStorey && activeFloor === 1)
      ? ((isCustomPreset ? customPlan : null) || familyPackageLayout?.ground || floors?.ground || plan)
      : stagedPlan;
    const newFirst = (isDoubleStorey && activeFloor === 1)
      ? stagedPlan
      : ((isCustomPreset ? customFirstFloorPlan : null) || familyPackageLayout?.first || floors?.first || null);

    if (!isCustomPreset) {
      setPresetOverride(presetId, newGround, newFirst);
    } else if (isDoubleStorey && activeFloor === 1) {
      setCustomFirstFloorPlan(newFirst);
    } else {
      setCustomPlan(newGround);
    }

    return { newGround, newFirst };
  };

  return (
    <StepShell
      eyebrow="Step 04 · Preview"
      title="Your home, in real time."
      subtitle="Switch between floor plan and 3D elevation. Navigate rooms with the tabs below."
      onNext={next}
      onPrev={prev}
    >
      <div className="space-y-4">
        {/* View toggle + controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-full bg-surface p-1">
            {(['2d', '3d'] as const).map((v) => (
              <button
                key={v}
                onClick={() => { setView(v); setAdvancedEditorMode(false); }}
                className={`relative rounded-full px-5 py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
                  view === v && !advancedEditorMode ? 'text-ink-foreground' : 'text-muted-foreground'
                }`}
              >
                {view === v && !advancedEditorMode && (
                  <motion.div layoutId="view-pill" className="absolute inset-0 rounded-full bg-ink"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }} />
                )}
                <span className="relative">{v === '2d' ? '📐 Floor Plan' : '🏠 3D Tour'}</span>
              </button>
            ))}
          </div>

          {view === '2d' && !advancedEditorMode && (
            <div className="flex items-center gap-2">
              {/* Preset selector */}
              <div className="inline-flex rounded-full bg-surface/80 p-0.5 border border-border">
                {[0, 1].map((id) => (
                  <button
                    key={id}
                    onClick={() => setPresetId(id)}
                    className={`rounded-full px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all ${
                      presetId === id
                        ? 'bg-clay text-white shadow-md'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Layers size={10} className="inline mr-1 -mt-0.5" />
                    Preset {String.fromCharCode(65 + id)}
                  </button>
                ))}
                {savedPresets.map((savedPresetObj, i) => (
                  <button
                    key={`saved-${i}`}
                    onClick={() => loadSavedPreset(i)}
                    className={`rounded-full px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all ${
                      presetId === -1 && loadedPresetId === savedPresetObj.id
                        ? 'bg-clay text-white shadow-md'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Layers size={10} className="inline mr-1 -mt-0.5" />
                    {savedPresetObj.name || `Custom ${i + 1}`}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setAdvanced((v) => !v)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  advanced ? 'border-ink bg-ink text-ink-foreground' : 'border-border hover:bg-surface'
                }`}
              >
                {advanced ? 'Advanced · ON' : 'Advanced mode'}
              </button>
              {advanced && (
                <>
                  <button
                    onClick={() => {
                      setStagedPlan(null);
                      onResetPlan?.();
                    }}
                    className="rounded-full border border-red-200 bg-red-50 text-red-600 px-3 py-1.5 text-xs font-medium hover:bg-red-100 transition-colors"
                  >
                    Reset
                  </button>
                  <div className="flex flex-wrap items-center gap-1.5 ml-2 border-l pl-2 border-border">
                    {ROOM_BLOCKS.map((block) => {
                      const Icon = block.icon;
                      return (
                        <button
                          key={block.type}
                          onClick={() => handleAddRoom(block.type)}
                          title={`Add ${block.label}`}
                          className="flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[10px] font-bold uppercase tracking-wider border border-border hover:bg-surface transition-all active:scale-95 shadow-sm"
                          style={{ borderLeftColor: block.color, borderLeftWidth: 3 }}
                        >
                          <Icon size={12} />
                          {block.label.split(' ')[0]}
                        </button>
                      );
                    })}
                  </div>
                  {stagedPlan && (
                    <>
                      <button
                        onClick={async () => {
                          const committed = commitStagedPlan();
                          if (!committed) return;

                          try {
                            if (isFamilyDoubleStoreyPackage) {
                              await savePackageLayout(getFamilyDoubleStoreyPackageKey({ homeType, bedrooms, bathrooms, kitchen, isDoubleStorey }), committed.newGround, committed.newFirst);
                              toast({ title: 'Plan updated', description: 'Family double-storey package saved successfully.' });
                            } else if (presetId === -1 && loadedPresetId) {
                              await updateSavedPreset(committed.newGround, committed.newFirst);
                              toast({ title: 'Preset updated', description: 'Your saved preset has been updated.' });
                            } else if (presetId === 0 || presetId === 1) {
                              await saveBuiltInPreset(presetId, committed.newGround, committed.newFirst);
                              toast({ title: 'Preset updated', description: `${presetId === 0 ? 'Preset A' : 'Preset B'} has been updated.` });
                            } else {
                              toast({ title: 'Preset updated', description: 'Changes have been applied locally.' });
                            }

                            setStagedPlan(null);
                            planHistory.forEach(h => removeHistoryRecord(h.id));
                          } catch (error) {
                            console.error('Failed to update plan', error);
                            toast({ title: 'Update failed', description: 'Could not update the plan. Please try again.' });
                          }
                        }}
                        className="flex items-center gap-1.5 rounded-full bg-clay px-4 py-1.5 text-xs font-bold text-white shadow-lg hover:bg-clay/90 transition-all active:scale-95"
                      >
                        <Save size={14} /> Update Plan
                      </button>
                      <button
                        onClick={async () => {
                          const committed = commitStagedPlan();
                          if (!committed) return;

                          const fallbackName = presetId === 0 ? 'Preset A Copy' : presetId === 1 ? 'Preset B Copy' : 'Custom Preset';
                          const name = window.prompt('Enter a name for this preset', fallbackName);
                          if (!name || !name.trim()) {
                            toast({ title: 'Save cancelled', description: 'Preset name is required to save a new preset.' });
                            return;
                          }

                          try {
                            await saveAsPreset(name.trim(), committed.newGround, committed.newFirst);
                            toast({ title: 'Preset saved', description: `Saved as ${name.trim()}.` });
                            setStagedPlan(null);
                            planHistory.forEach(h => removeHistoryRecord(h.id));
                            setAdvanced(false);
                          } catch (error) {
                            console.error('Failed to save preset', error);
                            toast({ title: 'Save failed', description: 'Could not save the preset. Please try again.' });
                          }
                        }}
                        className="flex items-center gap-1.5 rounded-full bg-blue-500 px-4 py-1.5 text-xs font-bold text-white shadow-lg hover:bg-blue-600 transition-all active:scale-95"
                      >
                        <Save size={14} /> Save as Preset
                      </button>
                    </>
                  )}
                </>
              )}

              {/* Custom Editor Button */}
              <button
                onClick={() => setAdvancedEditorMode(true)}
                className="flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 text-blue-600 px-3 py-1.5 text-xs font-bold hover:bg-blue-100 transition-all active:scale-95"
              >
                <PenTool size={12} />
                Custom Editor
              </button>

              {presetId === -1 && loadedPresetId && (
                <button
                  onClick={() => {
                    const idx = savedPresets.findIndex(p => p.id === loadedPresetId);
                    if (idx !== -1) deleteSavedPreset(idx);
                  }}
                  className="rounded-full border border-red-200 text-red-500 hover:bg-red-50 p-1.5 transition-colors"
                  title="Delete Layout"
                >
                  <Trash size={14} />
                </button>
              )}

              {/* Double Storey Toggle (Family/Premium only) */}
              {canDoubleStorey && (
                <button
                  onClick={() => setDoubleStorey(!isDoubleStorey)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-all active:scale-95 ${
                    isDoubleStorey
                      ? 'border-amber-400 bg-amber-50 text-amber-700'
                      : 'border-border bg-surface text-muted-foreground hover:bg-white'
                  }`}
                >
                  <Building2 size={12} />
                  {isDoubleStorey ? 'Double Storey ✓' : 'Double Storey'}
                </button>
              )}
            </div>
          )}

          {/* Floor Selector (only when double storey is enabled) */}
          {isDoubleStorey && !advancedEditorMode && (
            <div className="inline-flex rounded-full bg-amber-50 border border-amber-200 p-0.5">
              {([0, 1] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setActiveFloor(f)}
                  className={`rounded-full px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all ${
                    activeFloor === f
                      ? 'bg-amber-500 text-white shadow-md'
                      : 'text-amber-700 hover:bg-amber-100'
                  }`}
                >
                  <ArrowUpDown size={10} className="inline mr-1 -mt-0.5" />
                  {f === 0 ? 'Ground Floor' : 'First Floor'}
                </button>
              ))}
            </div>
          )}

          {advancedEditorMode && (
            <button
              onClick={() => setAdvancedEditorMode(false)}
              className="flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 text-red-600 px-3 py-1.5 text-xs font-bold hover:bg-red-100 transition-all"
            >
              <X size={12} />
              Exit Custom Editor
            </button>
          )}

          {view === '3d' && !advancedEditorMode && (
            <>
              <Group label="Roof">
                {ROOFS.map((r) => (
                  <Pill key={r.id} active={roof === r.id} onClick={() => setRoof(r.id)}>{r.label}</Pill>
                ))}
              </Group>
              <Group label="Material">
                {MATERIALS.map((m) => (
                  <Pill key={m.id} active={material === m.id} onClick={() => setMaterial(m.id)}>
                    <span className="inline-block h-2.5 w-2.5 rounded-full mr-1.5 align-middle" style={{ background: m.swatch }} />
                    {m.label}
                  </Pill>
                ))}
              </Group>
            </>
          )}
        </div>

        {/* Canvas area */}
        <div className="flex h-[420px] md:h-[520px] overflow-hidden rounded-3xl border border-border shadow-elev">
          <div
            className="relative flex-1 overflow-hidden"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <AnimatePresence mode="wait">
              {advancedEditorMode ? (
                <motion.div key="editor" className="h-full w-full"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}>
                  <CustomEditorCanvas
                    homeType={homeType}
                    onChange={(editorPlan) => {
                      if (isDoubleStorey && activeFloor === 1) {
                        setCustomFirstFloorPlan(editorPlan);
                      } else if (isCustomPreset) {
                        setCustomPlan(editorPlan);
                      }
                    }}
                    onSave={async (editorPlan) => {
                      const newGround = (isDoubleStorey && activeFloor === 1)
                        ? ((isCustomPreset ? customPlan : null) || familyPackageLayout?.ground || floors?.ground || plan)
                        : editorPlan;
                      const newFirst = (isDoubleStorey && activeFloor === 1)
                        ? editorPlan
                        : ((isCustomPreset ? customFirstFloorPlan : null) || familyPackageLayout?.first || floors?.first || null);

                      try {
                        if (isFamilyDoubleStoreyPackage) {
                          await savePackageLayout(familyPackageKey, newGround, newFirst);
                        } else if (!isCustomPreset && (presetId === 0 || presetId === 1)) {
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

                      if (isCustomPreset && isDoubleStorey && activeFloor === 1) {
                        setCustomFirstFloorPlan(newFirst);
                      } else if (isCustomPreset) {
                        setCustomPlan(newGround);
                      }

                      setAdvancedEditorMode(false);
                    }}
                    initialPlan={isDoubleStorey && activeFloor === 1 ? ((isCustomPreset ? customFirstFloorPlan : null) || floors?.first || null) : null}
                  />
                </motion.div>
              ) : view === '2d' ? (
                <motion.div key={`2d-${activeFloor}`} className="h-full w-full"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}>
                  <FloorPlanCanvas plan={stagedPlan || getHighlightedPlan()} advanced={advanced} onChange={(updatedHighlightedPlan) => {
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
              ) : (
                <motion.div key="3d" className="h-full w-full"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}>
                  <ElevationCanvas plan={currentPlan} roof={roof} material={material} addons={addons} activeRoom={activeTab} isDoubleStorey={isDoubleStorey} firstFloorPlan={isDoubleStorey && floors ? ((isCustomPreset ? customFirstFloorPlan : null) || floors.first) : undefined} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Top-left badge (only for non-editor views) */}
            {!advancedEditorMode && (
              <div className="pointer-events-none absolute left-4 top-4 rounded-full glass-panel px-3 py-1.5 text-[10px] font-display font-semibold uppercase tracking-[0.2em]">
                {view === '2d' 
                  ? `${currentPlan.width}′ × ${currentPlan.height}′${isDoubleStorey ? ` · ${activeFloor === 0 ? 'Ground' : 'First'} Floor` : ''}`
                  : 'Front elevation'}
              </div>
            )}
            
            {/* Staged indicator */}
            {stagedPlan && !advancedEditorMode && (
              <div className="pointer-events-none absolute left-4 top-14 flex items-center gap-1.5 rounded-full bg-clay/10 border border-clay/30 px-3 py-1 text-[9px] font-bold text-clay uppercase tracking-widest animate-pulse">
                <Check size={10} /> Unsaved Changes
              </div>
            )}

          {/* Current room label overlay */}
          {activeTab !== 'overview' && !advancedEditorMode && (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="absolute bottom-20 left-1/2 -translate-x-1/2 rounded-2xl bg-white/90 backdrop-blur-md px-6 py-2.5 shadow-elev"
            >
              <span className="font-display text-lg md:text-xl font-extrabold tracking-wider text-foreground">
                {currentTabLabel}
              </span>
            </motion.div>
          )}

          {/* Room navigation tabs (only for non-editor views) */}
          {!advancedEditorMode && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-[90%] max-w-[520px]">
              <div className="relative flex items-center gap-1">
                <button onClick={() => scrollTabs('left')}
                  className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full glass-panel hover:bg-white/80 transition-colors">
                  <ChevronLeft size={14} />
                </button>

                <div ref={tabScrollRef}
                  className="flex-1 overflow-x-auto scrollbar-hide flex items-center gap-1.5 rounded-2xl glass-panel px-2 py-1.5">
                  {roomTabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`shrink-0 flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all ${
                          isActive
                            ? 'text-white shadow-md'
                            : 'text-foreground/70 hover:bg-white/50'
                        }`}
                        style={isActive ? { background: tab.color } : {}}
                      >
                        <Icon size={12} />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                <button onClick={() => scrollTabs('right')}
                  className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full glass-panel hover:bg-white/80 transition-colors">
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>

          {/* Change Log Sidebar */}
          {advanced && planHistory.length > 0 && !advancedEditorMode && (
            <div className="hidden lg:flex flex-col w-[240px] border-l border-border bg-surface/30 backdrop-blur-sm p-4 overflow-y-auto">
              <div className="flex items-center gap-2 mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                <History size={14} /> Change Log
              </div>
              <div className="space-y-2">
                {planHistory.map((record) => (
                  <div key={record.id} className="group relative rounded-xl bg-white p-3 shadow-sm border border-transparent hover:border-border transition-all">
                    <div className="text-[11px] font-bold text-ink pr-6">{record.label}</div>
                    <div className="text-[9px] text-muted-foreground uppercase tracking-tight mt-1">{record.type.replace('-', ' ')}</div>
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
                      className="absolute right-2 top-2 h-5 w-5 flex items-center justify-center rounded-md bg-red-50 text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-100 hover:text-red-600 transition-all"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-auto pt-4 text-[9px] text-center text-muted-foreground italic">
                Changes persist locally after you click Save.
              </div>
            </div>
          )}
        </div>

        {/* Swipe hint for mobile */}
        {!advancedEditorMode && (
          <p className="text-center text-[10px] text-muted-foreground uppercase tracking-widest md:hidden">
            ← Swipe tabs to navigate rooms →
          </p>
        )}
      </div>
    </StepShell>
  );
};

const Group = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-center gap-1.5">
    <span className="text-[10px] uppercase tracking-widest text-muted-foreground mr-1">{label}</span>
    {children}
  </div>
);

const Pill = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    onClick={onClick}
    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
      active ? 'bg-ink text-ink-foreground' : 'bg-surface hover:bg-muted'
    }`}
  >
    {children}
  </button>
);
