import { useConfig, AddOn, KitchenType, HOME_TYPE_LIMITS } from '@/store/configurator';
import { StepShell } from '../StepShell';
import { ADDON_META, formatMoney } from '@/lib/cost';
import { Minus, Plus, Sun, Car, Droplets, Cpu, Check, Fence, Trees } from 'lucide-react';
import { motion } from 'framer-motion';

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
  const bedroomLimits = HOME_TYPE_LIMITS[homeType].bedrooms;
  const bathroomLimits = HOME_TYPE_LIMITS[homeType].bathrooms;
  const bathroomLocked = bathroomLimits.min === bathroomLimits.max;

  return (
    <StepShell
      eyebrow="Step 03 · Customize"
      title="Shape every detail."
      subtitle="The floor plan and your estimate update in real time on the right."
      onNext={next}
      onPrev={prev}
    >
      <div className="space-y-7">
        <div className="grid gap-4 md:grid-cols-2">
          <Stepper
            label="Bedrooms"
            value={bedrooms}
            onChange={setBedrooms}
            min={bedroomLimits.min}
            max={bedroomLimits.max}
            hint="Min 10×10 ft each"
            note={homeType === 'starter' ? 'Starter allows 1–2 bedrooms' : `Allowed: ${bedroomLimits.min}–${bedroomLimits.max}`}
          />
          <Stepper
            label="Bathrooms"
            value={bathrooms}
            onChange={setBathrooms}
            min={bathroomLimits.min}
            max={bathroomLimits.max}
            hint="Min 5×7 ft each"
            note={bathroomLocked ? 'Starter bathrooms are fixed at 2' : `Allowed: ${bathroomLimits.min}–${bathroomLimits.max}`}
          />
        </div>

        <div>
          <div className="mb-3 flex items-baseline justify-between">
            <h3 className="font-display text-lg font-bold">Kitchen layout</h3>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Choose one</span>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {KITCHENS.map((k) => {
              const active = kitchen === k.id;
              return (
                <button
                  key={k.id}
                  onClick={() => setKitchen(k.id)}
                  className={`relative rounded-2xl border-2 p-4 text-left transition-all ${
                    active ? 'border-ink bg-card shadow-soft' : 'border-border bg-card/50 hover:border-clay'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display font-bold">{k.label}</span>
                    {active && <Check size={16} className="text-clay" />}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground leading-snug">{k.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-baseline justify-between">
            <h3 className="font-display text-lg font-bold">Add-ons</h3>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Tap to toggle</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {(Object.keys(ADDON_META) as AddOn[]).map((id) => {
              const meta = ADDON_META[id];
              const Icon = ADDON_ICON[id];
              const active = addons.includes(id);
              return (
                <motion.button
                  key={id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => toggleAddon(id)}
                  className={`flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition-all ${
                    active ? 'border-ink bg-clay/15 shadow-soft' : 'border-border bg-card/50 hover:border-clay'
                  }`}
                >
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${active ? 'bg-ink text-ink-foreground' : 'bg-surface'}`}>
                    <Icon size={20} />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{meta.label}</div>
                    <div className="text-xs text-muted-foreground num">+{formatMoney(meta.cost)}</div>
                  </div>
                  <div className={`h-5 w-5 rounded-full border-2 transition-all flex items-center justify-center ${
                    active ? 'border-ink bg-ink' : 'border-border'
                  }`}>
                    {active && <Check size={12} className="text-ink-foreground" strokeWidth={3} />}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    </StepShell>
  );
};

const Stepper = ({
  label, value, onChange, min, max, hint, note,
}: { label: string; value: number; onChange: (n: number) => void; min: number; max: number; hint?: string; note?: string }) => (
  <div className="rounded-2xl border border-border bg-card p-4">
    <div className="flex items-baseline justify-between">
      <span className="font-display font-bold">{label}</span>
      {hint && <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{hint}</span>}
    </div>
    <div className="mt-3 flex items-center justify-between">
      <button
        onClick={() => onChange(value - 1)}
        disabled={value <= min}
        className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-surface hover:bg-muted disabled:opacity-30 transition-colors"
      >
        <Minus size={18} />
      </button>
      <motion.div
        key={value}
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="font-display text-4xl font-extrabold num tabular-nums"
      >
        {value}
      </motion.div>
      <button
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-ink text-ink-foreground hover:scale-105 disabled:opacity-30 transition-transform"
      >
        <Plus size={18} />
      </button>
    </div>
    {note && (
      <div className="mt-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {value <= min ? `Minimum reached · ${note}` : value >= max ? `Maximum reached · ${note}` : note}
      </div>
    )}
  </div>
);
