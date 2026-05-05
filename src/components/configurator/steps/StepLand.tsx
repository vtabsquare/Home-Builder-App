import { useConfig, LandSize } from '@/store/configurator';
import { StepShell, SelectableCard } from '../StepShell';
import { Home, MapPin } from 'lucide-react';
import { formatMoney, LAND_PACKAGES, LAND_SQFT_RATE } from '@/lib/cost';
import { motion, AnimatePresence } from 'framer-motion';

const PACKAGE_IDS: { id: Exclude<LandSize, 'custom' | null>; tag: string }[] = [
  { id: 'small', tag: 'Compact + efficient' },
  { id: 'medium', tag: 'Most popular' },
  { id: 'large', tag: 'Spacious + premium' },
];

const MiniHouse = () => (
  <svg width="44" height="34" viewBox="0 0 44 34" fill="none" className="opacity-50 flex-shrink-0">
    <path
      d="M4 28V15L22 5L40 15V28H4Z"
      stroke="hsl(var(--ink))"
      strokeWidth="1.5"
      fill="hsl(var(--clay) / 0.15)"
    />
    <rect x="17" y="19" width="10" height="9" rx="0.5" stroke="hsl(var(--ink))" strokeWidth="1" fill="hsl(var(--surface))" />
    <line x1="0" y1="28" x2="44" y2="28" stroke="hsl(var(--ink))" strokeWidth="1" />
  </svg>
);

export const StepLand = () => {
  const { land, setLand, landSize, setLandSize, customLandArea, setCustomLandArea, next } = useConfig();

  const handleLandChoice = (choice: 'own' | 'need') => {
    setLand(choice);
  };

  const canProceed =
    land === 'own' ||
    (land === 'need' && landSize !== null && (landSize !== 'custom' || customLandArea > 0));

  return (
    <StepShell
      eyebrow="Step 01 · Mode Selection"
      title="How do you want to begin?"
      subtitle="Whether you have your own dimensions or want to pick from standard footprints, we'll help you visualize your plot."
      onNext={next}
      nextDisabled={!canProceed}
      hidePrev
    >
      {/* ── Main choice cards ── */}
      <div className="grid gap-4 md:grid-cols-2">
        <SelectableCard selected={land === 'own'} onClick={() => handleLandChoice('own')}>
          <div className="flex items-start justify-between gap-4">
            <div className="rounded-xl bg-surface p-3"><Home size={22} /></div>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Included</span>
          </div>
          <h3 className="mt-6 font-display text-2xl font-bold">I own land</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Input your specific Front, Back, Left, and Right dimensions for a precise rendering.
          </p>
        </SelectableCard>

        <SelectableCard selected={land === 'need'} onClick={() => handleLandChoice('need')}>
          <div className="flex items-start justify-between gap-4">
            <div className="rounded-xl bg-surface p-3"><MapPin size={22} /></div>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Add-on</span>
          </div>
          <h3 className="mt-6 font-display text-2xl font-bold">I need a land</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse our benchmark footprints and tailored square footage options for your future home.
          </p>
        </SelectableCard>
      </div>

      {/* ── Land packages (revealed on "I need land") ── */}
      <AnimatePresence>
        {land === 'need' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="pt-8">
              <h2 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight mb-6">
                Pick your land type
              </h2>

              {/* Preset cards */}
              <div className="grid gap-4 md:grid-cols-3">
                {PACKAGE_IDS.map(({ id, tag }) => {
                  const pkg = LAND_PACKAGES[id];
                  const price = pkg.baseArea * LAND_SQFT_RATE;
                  const active = landSize === id;
                  return (
                    <SelectableCard key={id} selected={active} onClick={() => setLandSize(id)} className="min-h-[240px]">
                      {/* Warm gradient strip */}
                      <div className="h-3 -mx-5 -mt-5 mb-5 rounded-t-2xl bg-gradient-to-r from-[hsl(var(--clay)/0.25)] to-[hsl(var(--surface))]" />

                      <h3 className="font-display text-2xl md:text-3xl font-extrabold">{pkg.label}</h3>
                      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mt-1">
                        SQ FT
                      </div>

                      <p className="mt-4 text-sm text-foreground/70 leading-relaxed">{pkg.description}</p>

                      <div className="mt-6 flex items-end justify-between">
                        <div className="font-display text-xl font-bold num">{formatMoney(price)}</div>
                        <MiniHouse />
                      </div>
                    </SelectableCard>
                  );
                })}
              </div>

              {/* Custom card */}
              <div className="mt-4 max-w-sm">
                <SelectableCard selected={landSize === 'custom'} onClick={() => setLandSize('custom')} className="min-h-[200px]">
                  <div className="h-3 -mx-5 -mt-5 mb-5 rounded-t-2xl bg-gradient-to-r from-[hsl(var(--clay)/0.25)] to-[hsl(var(--surface))]" />

                  <h3 className="font-display text-2xl font-extrabold">Custom</h3>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mt-1">
                    ABOVE 2400 SQ FT
                  </div>

                  {/* Area input */}
                  <div className="mt-4 relative">
                    <input
                      type="number"
                      min={1}
                      placeholder="Enter Area"
                      value={customLandArea || ''}
                      onFocus={() => setLandSize('custom')}
                      onChange={(e) => {
                        setLandSize('custom');
                        setCustomLandArea(Math.max(0, Number(e.target.value)));
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-ring transition-shadow pr-16 num"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                      SQ FT
                    </span>
                  </div>

                  <div className="mt-4 flex items-end justify-between">
                    <div className="font-display text-xl font-bold num">
                      {formatMoney((customLandArea || 0) * LAND_SQFT_RATE)}
                    </div>
                    <MiniHouse />
                  </div>
                </SelectableCard>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </StepShell>
  );
};
