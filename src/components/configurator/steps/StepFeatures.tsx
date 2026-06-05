import { useConfig, AddOn, KitchenType, HOME_TYPE_LIMITS, type FinishingQuality } from '@/store/configurator';
import { StepShell } from '../StepShell';
import { formatMoney } from '@/lib/cost';
import { useAddonMeta, useKitchenMeta, useRoomPricingMeta, usePricing } from '@/hooks/PricingContext';
import { Minus, Plus, Sun, Car, Droplets, Cpu, Check, Fence, Trees, LucideIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ADDON_ICON: Record<AddOn, LucideIcon> = {
  solar: Sun,
  carport: Car,
  water_tank: Droplets,
  smart_home: Cpu,
  fence: Fence,
  landscaping: Trees,
};

const KITCHENS: { id: KitchenType; label: string; desc: string }[] = [
  { id: 'standard', label: 'Standard', desc: 'Closed kitchen with separate dining' },
  { id: 'open', label: 'Open Plan', desc: 'Merged kitchen + living + dining' },
];

export const StepFeatures = () => {
  const { homeType, bedrooms, bathrooms, kitchen, addons, isDoubleStorey, finishingQuality, setDoubleStorey, setFinishingQuality, setBedrooms, setBathrooms, setKitchen, toggleAddon, next, prev } = useConfig();
  const ADDON_META = useAddonMeta();
  const KITCHEN_META = useKitchenMeta();
  const { bedroomCost, bathroomCost } = useRoomPricingMeta();
  const pricing = usePricing();
  const bedroomLimits = HOME_TYPE_LIMITS[homeType].bedrooms;
  const bathroomLimits = HOME_TYPE_LIMITS[homeType].bathrooms;

  // Compute upgrade cost for premium vs standard
  const finishKey = homeType as 'starter' | 'family' | 'premium';
  const finishConfig = pricing.finishing_costs?.[finishKey];
  const currentFinishCost = finishConfig
    ? (finishingQuality === 'premium'
        ? (isDoubleStorey ? finishConfig.premium_2storey : finishConfig.premium_1storey)
        : (isDoubleStorey ? finishConfig.standard_2storey : finishConfig.standard_1storey))
    : 0;
  const standardCost = finishConfig
    ? (isDoubleStorey ? finishConfig.standard_2storey : finishConfig.standard_1storey)
    : 0;
  const premiumCost = finishConfig
    ? (isDoubleStorey ? finishConfig.premium_2storey : finishConfig.premium_1storey)
    : 0;
  const upgradeDiff = premiumCost - standardCost;

  const showFinishingToggle = homeType === 'starter' || homeType === 'family' || homeType === 'premium';

  return (
    <StepShell
      eyebrow="Step 03 · Configuration"
      title="Define the details."
      subtitle="Adjust room counts, explore spatial layouts, and select architectural enhancements."
      onNext={next}
      onPrev={prev}
    >
      <div className="space-y-3">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-display text-xl font-normal tracking-tight text-foreground/80">Floor Plan Layout</h3>
            <div className="flex items-center gap-4">
              {showFinishingToggle && (
                <div className="flex items-center bg-surface/80 rounded-full p-1 border border-border shadow-sm">
                  <button
                    onClick={() => setFinishingQuality('standard')}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${
                      finishingQuality === 'standard' ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground/60 hover:text-foreground'
                    }`}
                  >
                    Standard
                  </button>
                  <button
                    onClick={() => setFinishingQuality('premium')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${
                      finishingQuality === 'premium' ? 'bg-amber-100/50 text-amber-700 shadow-sm border border-amber-200/50' : 'text-amber-600/60 hover:text-amber-700 hover:bg-amber-50/50'
                    }`}
                  >
                    ★ Premium
                    {finishingQuality !== 'premium' && upgradeDiff > 0 && <span className="opacity-70 lowercase font-medium tracking-normal text-[9px] ml-1">+{formatMoney(upgradeDiff)}</span>}
                  </button>
                </div>
              )}
              <span className="text-[9px] uppercase tracking-[0.3em] text-muted-foreground/40 font-bold hidden sm:inline-block">Base</span>
            </div>
          </div>
          <div className="grid gap-2 md:gap-3 sm:grid-cols-2">
            {[
              { id: false, label: 'Bungalow', desc: 'Single-storey home design' },
              { id: true, label: 'Multi-Storey', desc: 'Two or more floors' }
            ].map((k) => {
              const active = isDoubleStorey === k.id;
              return (
                <button
                  key={k.label}
                  onClick={() => setDoubleStorey(k.id)}
                  className={`group relative overflow-hidden rounded-xl p-2 sm:p-3 text-left transition-all duration-500 border ${
                    active 
                      ? 'bg-surface shadow-elev border-clay/30 scale-[1.02]' 
                      : 'bg-surface/50 border-border hover:border-muted-foreground/20 hover:bg-surface hover:shadow-soft'
                  }`}
                >
                  <div className="relative z-10 flex items-center justify-between mb-2">
                    <span className={`font-display font-medium tracking-tight text-base ${active ? 'text-foreground' : 'text-foreground/80'}`}>{k.label}</span>
                    {active && <div className="h-1.5 w-1.5 rounded-full bg-clay" />}
                  </div>
                  <p className="relative z-10 text-[11px] text-muted-foreground leading-relaxed font-light">{k.desc}</p>
                </button>
              );
            })}
          </div>
        </motion.div>



        <div className="grid gap-2 md:gap-4 sm:grid-cols-2">
          <Stepper
            label="Bedrooms"
            value={bedrooms}
            onChange={setBedrooms}
            min={bedroomLimits.min}
            max={bedroomLimits.max}
            price={bedroomCost}
            hint="Min 10×10 ft"
            note={bedroomLimits.min === bedroomLimits.max ? `Fixed at ${bedroomLimits.min}` : `${bedroomLimits.min} to ${bedroomLimits.max}`}
          />
          <Stepper
            label="Bathrooms"
            value={bathrooms}
            onChange={setBathrooms}
            min={bathroomLimits.min}
            max={bathroomLimits.max}
            price={bathroomCost}
            hint="Min 5×7 ft"
            note={bathroomLimits.min === bathroomLimits.max ? `Fixed at ${bathroomLimits.min}` : `${bathroomLimits.min} to ${bathroomLimits.max}`}
          />
        </div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
          <div className="mb-2 flex items-baseline justify-between">
            <h3 className="font-display text-xl font-normal tracking-tight text-foreground/80">Spatial Layout</h3>
            <span className="text-[9px] uppercase tracking-[0.3em] text-muted-foreground/40 font-bold">Options</span>
          </div>
          <div className="grid gap-2 md:gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {KITCHENS.map((k) => {
              const active = kitchen === k.id;
              const kitchenMeta = KITCHEN_META[k.id];
              return (
                <button
                  key={k.id}
                  onClick={() => setKitchen(k.id)}
                  className={`group relative overflow-hidden rounded-xl p-2 sm:p-3 text-left transition-all duration-500 border ${
                    active 
                      ? 'bg-surface shadow-elev border-clay/30 scale-[1.02]' 
                      : 'bg-surface/50 border-border hover:border-muted-foreground/20 hover:bg-surface hover:shadow-soft'
                  }`}
                >
                  <div className="relative z-10 flex items-center justify-between mb-2">
                    <span className={`font-display font-medium tracking-tight text-base ${active ? 'text-foreground' : 'text-foreground/80'}`}>{k.label}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-clay num">+{formatMoney(kitchenMeta.cost)}</span>
                      {active && <div className="h-1.5 w-1.5 rounded-full bg-clay" />}
                    </div>
                  </div>
                  <p className="relative z-10 text-[11px] text-muted-foreground leading-relaxed font-light">{k.desc}</p>
                </button>
              );
            })}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
          <div className="mb-2 flex items-baseline justify-between">
            <h3 className="font-display text-xl font-normal tracking-tight text-foreground/80">Enhancements</h3>
            <span className="text-[9px] uppercase tracking-[0.3em] text-muted-foreground/40 font-bold">Optional</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {(Object.keys(ADDON_META) as AddOn[]).map((id) => {
              const meta = ADDON_META[id];
              const Icon = ADDON_ICON[id];
              const active = addons.includes(id);
              return (
                <motion.button
                  key={id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => toggleAddon(id)}
                  className={`group relative overflow-hidden flex items-center gap-2 rounded-xl p-2 sm:p-3 text-left transition-all duration-500 border ${
                    active 
                      ? 'bg-surface shadow-elev border-clay/30' 
                      : 'bg-surface/50 border-border hover:border-muted-foreground/20 hover:bg-surface hover:shadow-soft'
                  }`}
                >
                  <div className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-lg border transition-colors duration-500 ${active ? 'bg-clay border-clay text-white shadow-sm' : 'bg-soft-section border-border text-muted-foreground'}`}>
                    <Icon size={14} strokeWidth={1.25} />
                  </div>
                  <div className="relative z-10 flex-1">
                    <div className={`font-medium tracking-tight text-sm ${active ? 'text-foreground' : 'text-foreground/80'}`}>{meta.label}</div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-clay num mt-1">+{formatMoney(meta.cost)}</div>
                  </div>
                  {active && (
                    <div className="relative z-10 h-1.5 w-1.5 rounded-full bg-clay" />
                  )}
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </div>
    </StepShell>
  );
};

const Stepper = ({
  label, value, onChange, min, max, price, hint, note,
}: { label: string; value: number; onChange: (n: number) => void; min: number; max: number; price?: number; hint?: string; note?: string }) => (
  <div className="relative rounded-xl bg-surface border border-border p-2 sm:p-3 shadow-soft transition-all hover:shadow-soft group">
    <div className="flex items-baseline justify-between mb-2">
      <span className="font-display text-base tracking-tight text-foreground/80 font-normal">{label}</span>
      <div className="flex items-center gap-2">
        {price !== undefined && <span className="text-[9px] uppercase tracking-[0.2em] text-clay font-bold num">+{formatMoney(price)}</span>}
        {hint && <span className="text-[8px] uppercase tracking-[0.3em] text-muted-foreground/40 font-bold">{hint}</span>}
      </div>
    </div>
    <div className="flex items-center justify-between bg-soft-section/50 rounded-lg p-1.5 border border-border/50">
      <button
        onClick={() => onChange(value - 1)}
        disabled={value <= min}
        className="flex h-8 w-8 items-center justify-center rounded-md bg-surface border border-border shadow-sm hover:bg-soft-section disabled:opacity-30 transition-all active:scale-95"
      >
        <Minus size={14} className="text-foreground" strokeWidth={1.5} />
      </button>
      
      <div className="relative h-8 flex-1 flex items-center justify-center overflow-hidden">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={value}
            initial={{ y: -15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 15, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="font-display text-xl font-normal num tracking-tight"
          >
            {value}
          </motion.div>
        </AnimatePresence>
      </div>

      <button
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-lg hover:brightness-110 disabled:opacity-30 transition-all active:scale-95"
      >
        <Plus size={14} strokeWidth={1.5} />
      </button>
    </div>
    {note && (
      <div className="mt-2 text-center text-[9px] uppercase tracking-[0.2em] text-muted-foreground/40 font-bold">
        {note}
      </div>
    )}
  </div>
);
