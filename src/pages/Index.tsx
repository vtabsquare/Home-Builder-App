import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { getBuiltInPresetKey, getFamilyDoubleStoreyPackageLookupKeys, useConfig } from '@/store/configurator';
import { computeCost } from '@/lib/cost';
import { PricingProvider, usePricing } from '@/hooks/PricingContext';
import { computeCostDynamic } from '@/hooks/useDynamicPricing';
import { applyAddOnsToPlan, generatePlan, Plan } from '@/lib/floorplan';
import { ProgressHeader } from '@/components/configurator/ProgressHeader';
import { CostPanel } from '@/components/configurator/CostPanel';
import { FloorPlanCanvas } from '@/components/configurator/FloorPlanCanvas';
import { StepHomeType } from '@/components/configurator/steps/StepHomeType';
import { StepFeatures } from '@/components/configurator/steps/StepFeatures';
import { StepPreview } from '@/components/configurator/steps/StepPreview';
import { StepLeadCapture } from '@/components/configurator/steps/StepLeadCapture';
import { LandingPage } from '@/components/LandingPage';
import { GatePage } from '@/components/GatePage';
import { useInactivityReset } from '@/hooks/useInactivityReset';
import { Maximize2, Minimize2, Sparkles } from 'lucide-react';

const IndexInner = () => {
  const config = useConfig();
  const { step, kioskMode, setKioskMode, reset, customPlan, setCustomPlan, isDoubleStorey, customFirstFloorPlan, setCustomFirstFloorPlan, homeType, packageLayouts, presetOverrides } = config;

  const [showGate, setShowGate] = useState(true);
  const [showLanding, setShowLanding] = useState(true);
  const pricing = usePricing();

  const cost = useMemo(() => computeCostDynamic(config, pricing), [config, pricing]);
  const basePlan = useMemo(() => {
    if (config.presetId !== -1) {
      const override = presetOverrides[getBuiltInPresetKey(config, config.presetId)];
      if (override?.ground?.rooms) return override.ground;
    }
    return generatePlan(config);
  }, [config.homeType, config.bedrooms, config.bathrooms, config.kitchen, config.addons, config.presetId, config.land, config.landSize, config.customLandArea, config.roof, config.material, config.isDoubleStorey, config.activeFloor, presetOverrides]);

  const familyPackageLookupKeys = useMemo(() => getFamilyDoubleStoreyPackageLookupKeys(config), [config.homeType, config.bedrooms, config.bathrooms, config.kitchen, config.isDoubleStorey, config.addons]);
  const isFamilyDoubleStoreyPackage = homeType === 'family' && isDoubleStorey && config.presetId !== -1;
  const packageLayout = homeType === 'family' && isDoubleStorey
    ? familyPackageLookupKeys.map((key) => packageLayouts[key]).find(Boolean)
    : null;
  const selectedPlan = (config.presetId === -1 ? customPlan : null) || packageLayout?.ground || basePlan || { width: 0, height: 0, rooms: [] };
  // If a preset override exists for the current addon combination, the rooms are already
  // correctly positioned (including any carport/addon adjustments the user manually aligned).
  // Skip applyAddOnsToPlan to avoid double-shifting room positions.
  const hasActiveOverride = config.presetId !== -1 && !!presetOverrides[getBuiltInPresetKey(config, config.presetId)]?.ground?.rooms;
  const hasPackageBackedPlan = isFamilyDoubleStoreyPackage && !!selectedPlan?.rooms;
  const plan = useMemo(() => (hasActiveOverride || hasPackageBackedPlan) ? selectedPlan : applyAddOnsToPlan(selectedPlan, config), [selectedPlan, config.addons, hasActiveOverride, hasPackageBackedPlan]);

  useEffect(() => {
    config.fetchSavedPresets();
    config.fetchPackageLayouts();
  }, []);

  useEffect(() => {
    if (homeType !== 'family' || !isDoubleStorey || !packageLayout) return;
    if (config.presetId === -1) {
      if (packageLayout.ground?.rooms && !customPlan?.rooms) setCustomPlan(packageLayout.ground);
      if (packageLayout.first?.rooms && !customFirstFloorPlan?.rooms) setCustomFirstFloorPlan(packageLayout.first);
    }
  }, [homeType, isDoubleStorey, packageLayout, config.presetId, customPlan, customFirstFloorPlan, setCustomPlan, setCustomFirstFloorPlan]);

  // Clear custom plan when switching away from Family Double Storey
  useEffect(() => {
    if (homeType !== 'family' || !isDoubleStorey) {
      if (customPlan) setCustomPlan(null);
      if (customFirstFloorPlan) setCustomFirstFloorPlan(null);
    }
  }, [homeType, isDoubleStorey, customPlan, customFirstFloorPlan, setCustomPlan, setCustomFirstFloorPlan]);

  // SEO
  useEffect(() => {
    document.title = 'GBTI Smart Home Builder · Design your dream home in minutes';
    const desc = document.querySelector('meta[name="description"]');
    const content = 'Premium interactive home configurator. Pick your land, plan, features and see your floor plan, 3D elevation and price live.';
    if (desc) desc.setAttribute('content', content);
    else {
      const m = document.createElement('meta');
      m.name = 'description';
      m.content = content;
      document.head.appendChild(m);
    }
  }, []);

  useInactivityReset(() => {
    reset();
    setShowGate(true);
    setShowLanding(true);
  }, 60000, kioskMode);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen().catch(() => {});
      setKioskMode(true);
    } else {
      await document.exitFullscreen().catch(() => {});
      setKioskMode(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0: return <StepHomeType key="0" />;
      case 1: return <StepFeatures key="1" />;
      case 2: return <StepPreview key="2" plan={plan} onChange={setCustomPlan} onResetPlan={() => setCustomPlan(null)} />;
      case 3: return <StepLeadCapture key="3" cost={cost} />;
      default: return null;
    }
  };

  return (
    <>
      <AnimatePresence>
        {showGate && (
          <motion.div
            key="gate"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.08, filter: "blur(20px)" }}
            transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[60]"
          >
            <GatePage onProceed={() => setShowGate(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLanding && (
          <motion.div
            key="landing"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.02, filter: "blur(10px)" }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="fixed inset-0 z-50"
          >
            <LandingPage 
              onStart={() => {
                setShowLanding(false);
                config.setStep(0);
              }}
              onExplore={() => {
                setShowLanding(false);
                config.setStep(2);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: showLanding ? 0 : 1 }}
        transition={{ duration: 1, delay: 0.4 }}
        className="min-h-screen flex flex-col cinematic-bg"
      >
        <div className="cinematic-vignette" />
        
        <ProgressHeader onReset={() => {
          reset();
          setShowLanding(true);
        }} />

      <main className="flex-1 relative">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 md:px-8 py-4 md:py-6 lg:py-8">
          <div className={`grid gap-8 lg:gap-10 ${[2].includes(step) ? 'max-w-6xl mx-auto w-full' : 'lg:grid-cols-[1fr_400px]'}`}>
            {/* Step content */}
            <div className="min-h-[60vh]">
              <AnimatePresence mode="wait">
                {renderStep()}
              </AnimatePresence>
            </div>

            {/* Sticky live preview / Cost Sidebar */}
            {![2].includes(step) && (
              <aside className="lg:sticky lg:top-28 lg:self-start space-y-6 md:space-y-8 pb-12 lg:pb-0">
                <AnimatePresence>
                  <motion.div 
                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className="relative overflow-hidden rounded-2xl border border-border/40 glass-dark-panel shadow-elev"
                  >
                    <div className="h-[240px] md:h-[280px]">
                      <FloorPlanCanvas plan={plan} minimal={true} onChange={setCustomPlan} />
                    </div>
                    <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-ink/60 backdrop-blur-md px-2.5 py-1 text-[9px] font-display font-semibold uppercase tracking-[0.15em] text-white/80 border border-white/5">
                      Live Overview · {plan?.width || 0}′×{plan?.height || 0}′
                    </div>
                    <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_30px_rgba(0,0,0,0.3)] mix-blend-overlay rounded-2xl" />
                  </motion.div>
                </AnimatePresence>
                  
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <CostPanel cost={cost} compact />
                  </motion.div>

                  <button
                    onClick={toggleFullscreen}
                    className="w-full flex items-center justify-center gap-2 rounded-xl border border-border/40 glass-subtle py-3 text-[10px] font-semibold text-muted-foreground/80 hover:bg-surface hover:text-foreground transition-all active:scale-[0.98] shadow-sm uppercase tracking-[0.15em]"
                  >
                    {kioskMode ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                    {kioskMode ? 'Exit kiosk' : 'Kiosk mode'}
                  </button>
                </aside>
              )}
            </div>
          </div>
        </main>

        <footer className="relative z-0 border-t border-border/40 py-6 text-center text-[10px] text-muted-foreground uppercase tracking-widest bg-background/50 backdrop-blur-sm mt-auto">
          © GBTI · Smart Home Builder · Estimates only — final pricing confirmed by your architect
        </footer>
      </motion.div>
    </>
  );
};

const Index = () => (
  <PricingProvider>
    <IndexInner />
  </PricingProvider>
);

export default Index;
