import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useConfig } from '@/store/configurator';
import { computeCost } from '@/lib/cost';
import { generatePlan } from '@/lib/floorplan';
import { ProgressHeader } from '@/components/configurator/ProgressHeader';
import { CostPanel } from '@/components/configurator/CostPanel';
import { FloorPlanCanvas } from '@/components/configurator/FloorPlanCanvas';
import { StepLand } from '@/components/configurator/steps/StepLand';
import { StepHomeType } from '@/components/configurator/steps/StepHomeType';
import { StepFeatures } from '@/components/configurator/steps/StepFeatures';
import { StepPreview } from '@/components/configurator/steps/StepPreview';
import { StepLeadCapture } from '@/components/configurator/steps/StepLeadCapture';
import { useInactivityReset } from '@/hooks/useInactivityReset';
import { Maximize2, Minimize2, Sparkles } from 'lucide-react';

const Index = () => {
  const config = useConfig();
  const { step, kioskMode, setKioskMode, reset } = config;

  const cost = useMemo(() => computeCost(config), [config]);
  const plan = useMemo(() => generatePlan(config), [config.homeType, config.bedrooms, config.bathrooms, config.kitchen]);

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

  useInactivityReset(() => reset(), 60000, kioskMode);

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
      case 0: return <StepLand key="0" />;
      case 1: return <StepHomeType key="1" />;
      case 2: return <StepFeatures key="2" />;
      case 3: return <StepPreview key="3" plan={plan} />;
      case 4: return <StepLeadCapture key="4" cost={cost} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <ProgressHeader onReset={reset} />

      <main className="flex-1">
        <div className="mx-auto max-w-[1480px] px-4 md:px-8 py-6 md:py-10">
          <div className="grid gap-6 lg:gap-8 lg:grid-cols-[1fr_400px]">
            {/* Step content */}
            <div className="min-h-[60vh]">
              <AnimatePresence mode="wait">{renderStep()}</AnimatePresence>
            </div>

            {/* Sticky live preview */}
            <aside className="lg:sticky lg:top-24 lg:self-start space-y-4">
              <div className="relative h-[280px] md:h-[320px] overflow-hidden rounded-3xl border border-border shadow-elev bg-gradient-warm">
                <FloorPlanCanvas plan={plan} />
                <div className="pointer-events-none absolute left-3 top-3 rounded-full glass-panel px-3 py-1 text-[10px] font-display font-semibold uppercase tracking-[0.2em]">
                  Live · {plan.width}′×{plan.height}′
                </div>
                <div className="pointer-events-none absolute right-3 top-3 flex items-center gap-1 rounded-full bg-ink/85 backdrop-blur px-2.5 py-1 text-[10px] text-ink-foreground font-medium">
                  <Sparkles size={11} className="text-clay" /> Auto-layout
                </div>
              </div>
              <CostPanel cost={cost} compact />

              <button
                onClick={toggleFullscreen}
                className="w-full flex items-center justify-center gap-2 rounded-2xl border border-border bg-card/60 backdrop-blur py-2.5 text-xs font-medium text-muted-foreground hover:bg-surface transition-colors"
              >
                {kioskMode ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                {kioskMode ? 'Exit kiosk' : 'Kiosk mode'}
              </button>
            </aside>
          </div>
        </div>
      </main>

      <footer className="border-t border-border py-5 text-center text-[11px] text-muted-foreground">
        © GBTI · Smart Home Builder · Estimates only — final pricing confirmed by your architect
      </footer>
    </div>
  );
};

export default Index;
