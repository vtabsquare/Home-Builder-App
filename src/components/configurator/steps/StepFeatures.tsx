import { useConfig, AddOn, KitchenType, HOME_TYPE_LIMITS } from '@/store/configurator';
import { StepShell } from '../StepShell';
import { formatMoney } from '@/lib/cost';
import { useAddonMeta, useKitchenMeta, useRoomPricingMeta } from '@/hooks/PricingContext';
import { Minus, Plus, Sun, Car, Droplets, Cpu, Check, Fence, Trees } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ADDON_ICON: Record<AddOn, any> = {
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
  { id: 'galley', label: 'Galley', desc: 'Compact two-wall kitchen' },
];

export const StepFeatures = () => {
  const { homeType, bedrooms, bathrooms, kitchen, addons, setBedrooms, setBathrooms, setKitchen, toggleAddon, next, prev } = useConfig();
  const ADDON_META = useAddonMeta();
  const KITCHEN_META = useKitchenMeta();
  const { bedroomCost, bathroomCost } = useRoomPricingMeta();
  const bedroomLimits = HOME_TYPE_LIMITS[homeType].bedrooms;
  const bathroomLimits = HOME_TYPE_LIMITS[homeType].bathrooms;

  return (
    <StepShell
      eyebrow="Step 03 · Configuration"
      title="Define the details."
      subtitle="Adjust room counts, explore spatial layouts, and select architectural enhancements."
      onNext={next}
      onPrev={prev}
    >
      <div className="space-y-10">
        <div className="grid gap-8 md:grid-cols-2">
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
          <div className="mb-4 flex items-baseline justify-between">
            <h3 className="font-display text-xl font-normal tracking-tight text-foreground/80">Spatial Layout</h3>
            <span className="text-[9px] uppercase tracking-[0.3em] text-muted-foreground/40 font-bold">Options</span>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {KITCHENS.map((k) => {
              const active = kitchen === k.id;
              const kitchenMeta = KITCHEN_META[k.id];
              return (
                <button
                  key={k.id}
                  onClick={() => setKitchen(k.id)}
                  className={`group relative overflow-hidden rounded-xl p-6 text-left transition-all duration-500 border ${
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
          <div className="mb-4 flex items-baseline justify-between">
            <h3 className="font-display text-xl font-normal tracking-tight text-foreground/80">Enhancements</h3>
            <span className="text-[9px] uppercase tracking-[0.3em] text-muted-foreground/40 font-bold">Optional</span>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {(Object.keys(ADDON_META) as AddOn[]).map((id) => {
              const meta = ADDON_META[id];
              const Icon = ADDON_ICON[id];
              const active = addons.includes(id);
              return (
                <motion.button
                  key={id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => toggleAddon(id)}
                  className={`group relative overflow-hidden flex items-center gap-5 rounded-xl p-5 text-left transition-all duration-500 border ${
                    active 
                      ? 'bg-surface shadow-elev border-clay/30' 
                      : 'bg-surface/50 border-border hover:border-muted-foreground/20 hover:bg-surface hover:shadow-soft'
                  }`}
                >
                  <div className={`relative z-10 flex h-12 w-12 items-center justify-center rounded-lg border transition-colors duration-500 ${active ? 'bg-clay border-clay text-white shadow-sm' : 'bg-soft-section border-border text-muted-foreground'}`}>
                    <Icon size={20} strokeWidth={1.25} />
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
  <div className="relative rounded-xl bg-surface border border-border p-6 shadow-soft transition-all hover:shadow-soft group">
    <div className="flex items-baseline justify-between mb-5">
      <span className="font-display text-lg tracking-tight text-foreground/80 font-normal">{label}</span>
      <div className="flex items-center gap-3">
        {price !== undefined && <span className="text-[10px] uppercase tracking-[0.2em] text-clay font-bold num">+{formatMoney(price)}</span>}
        {hint && <span className="text-[9px] uppercase tracking-[0.3em] text-muted-foreground/40 font-bold">{hint}</span>}
      </div>
    </div>
    <div className="flex items-center justify-between bg-soft-section/50 rounded-xl p-2 border border-border/50">
      <button
        onClick={() => onChange(value - 1)}
        disabled={value <= min}
        className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface border border-border shadow-sm hover:bg-soft-section disabled:opacity-30 transition-all active:scale-95"
      >
        <Minus size={18} className="text-foreground" strokeWidth={1.5} />
      </button>
      
      <div className="relative h-12 flex-1 flex items-center justify-center overflow-hidden">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={value}
            initial={{ y: -15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 15, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="font-display text-3xl font-normal num tracking-tighter"
          >
            {value}
          </motion.div>
        </AnimatePresence>
      </div>

      <button
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-lg hover:brightness-110 disabled:opacity-30 transition-all active:scale-95"
      >
        <Plus size={18} strokeWidth={1.5} />
      </button>
    </div>
    {note && (
      <div className="mt-4 text-center text-[10px] uppercase tracking-[0.2em] text-muted-foreground/40 font-bold">
        {note}
      </div>
    )}
  </div>
);
