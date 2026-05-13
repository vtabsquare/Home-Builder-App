import { useConfig, LandSize } from '@/store/configurator';
import { StepShell, SelectableCard } from '../StepShell';
import { Home, MapPin } from 'lucide-react';
import { formatMoney, LAND_PACKAGES } from '@/lib/cost';
import { useLandSqftRate } from '@/hooks/PricingContext';
import { motion, AnimatePresence } from 'framer-motion';

const PACKAGE_IDS: { id: Exclude<LandSize, 'custom' | null>; tag: string }[] = [
  { id: 'small', tag: 'Compact + efficient' },
  { id: 'medium', tag: 'Most popular' },
  { id: 'large', tag: 'Spacious + premium' },
];

const MiniHouse = ({ active }: { active?: boolean }) => (
  <svg width="40" height="30" viewBox="0 0 44 34" fill="none" className={`flex-shrink-0 transition-all duration-500 ${active ? 'opacity-100 scale-105' : 'opacity-20'}`}>
    <path
      d="M4 28V15L22 5L40 15V28H4Z"
      stroke={active ? "hsl(var(--clay))" : "currentColor"}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <rect x="18" y="18" width="8" height="10" stroke={active ? "hsl(var(--clay))" : "currentColor"} strokeWidth="1" />
    <line x1="0" y1="28" x2="44" y2="28" stroke={active ? "hsl(var(--clay))" : "currentColor"} strokeWidth="1" />
  </svg>
);

export const StepLand = () => {
  const { land, setLand, landSize, setLandSize, customLandArea, setCustomLandArea, next } = useConfig();
  const LAND_SQFT_RATE = useLandSqftRate();

  const handleLandChoice = (choice: 'own' | 'need') => {
    setLand(choice);
  };

  const canProceed =
    land === 'own' ||
    (land === 'need' && landSize !== null && (landSize !== 'custom' || customLandArea > 0));

  return (
    <StepShell
      eyebrow="Step 01 · Planning"
      title="How would you like to start?"
      subtitle="Select whether you already have your land dimensions or if you'd like to explore our curated footprints."
      onNext={next}
      nextDisabled={!canProceed}
      hidePrev
    >
      <div className="grid gap-8 md:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>
          <SelectableCard selected={land === 'own'} onClick={() => handleLandChoice('own')}>
            <div className="flex items-start justify-between gap-4 mb-6">
              <div className={`rounded-xl p-4 border transition-colors duration-500 ${land === 'own' ? 'bg-soft-section border-clay/30 text-clay' : 'bg-surface border-border text-muted-foreground'}`}>
                <Home size={24} strokeWidth={1.25} />
              </div>
              <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-muted-foreground/40">Default</span>
            </div>
            <h3 className="font-display text-3xl font-normal tracking-tight text-foreground">I own land</h3>
            <p className="mt-4 text-base text-muted-foreground leading-relaxed font-light">
              Define your specific plot dimensions for a precise architectural rendering.
            </p>
          </SelectableCard>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>
          <SelectableCard selected={land === 'need'} onClick={() => handleLandChoice('need')}>
            <div className="flex items-start justify-between gap-4 mb-6">
              <div className={`rounded-xl p-4 border transition-colors duration-500 ${land === 'need' ? 'bg-soft-section border-clay/30 text-clay' : 'bg-surface border-border text-muted-foreground'}`}>
                <MapPin size={24} strokeWidth={1.25} />
              </div>
              <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-muted-foreground/40">Options</span>
            </div>
            <h3 className="font-display text-3xl font-normal tracking-tight text-foreground">I need land</h3>
            <p className="mt-4 text-base text-muted-foreground leading-relaxed font-light">
              Explore our standard footprints and tailored square footage options.
            </p>
          </SelectableCard>
        </motion.div>
      </div>
      <AnimatePresence>
        {land === 'need' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="pt-12">
              <h2 className="font-display text-2xl font-normal tracking-tight mb-8 text-foreground/80">
                Land Footprints
              </h2>

              <div className="grid gap-8 md:grid-cols-3">
                {PACKAGE_IDS.map(({ id, tag }, i) => {
                  const pkg = LAND_PACKAGES[id];
                  const price = pkg.baseArea * LAND_SQFT_RATE;
                  const active = landSize === id;
                  return (
                    <motion.div 
                      key={id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * i, duration: 0.5 }}
                      className="h-full"
                    >
                      <SelectableCard selected={active} onClick={() => setLandSize(id)} className="h-full flex flex-col justify-between">
                        <div>
                          <div className={`text-[10px] uppercase tracking-[0.3em] font-bold mb-3 ${active ? 'text-clay' : 'text-muted-foreground/40'}`}>{tag}</div>
                          <h3 className="font-display text-2xl font-normal tracking-tight text-foreground">{pkg.label}</h3>
                          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60 font-bold mt-2">
                            {pkg.baseArea} SQ FT
                          </div>

                          <p className="mt-5 text-sm text-muted-foreground leading-relaxed font-light">{pkg.description}</p>
                        </div>

                        <div className="mt-8 pt-6 border-t border-border flex items-end justify-between">
                          <div>
                            <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground/40 mb-1 font-bold">Estimated</div>
                            <div className="font-display text-xl font-normal num tracking-tight text-foreground">{formatMoney(price)}</div>
                          </div>
                          <MiniHouse active={active} />
                        </div>
                      </SelectableCard>
                    </motion.div>
                  );
                })}

                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className="h-full"
                >
                  <SelectableCard selected={landSize === 'custom'} onClick={() => setLandSize('custom')} className="h-full flex flex-col justify-between">
                    <div>
                      <div className={`text-[10px] uppercase tracking-[0.3em] font-bold mb-3 ${landSize === 'custom' ? 'text-clay' : 'text-muted-foreground/40'}`}>Tailored Size</div>
                      <h3 className="font-display text-2xl font-normal tracking-tight text-foreground">Custom</h3>
                      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60 font-bold mt-2">
                        Above 2400 SQ FT
                      </div>

                      <div className="mt-6 relative">
                        <input
                          type="number"
                          min={1}
                          placeholder="Dimensions"
                          value={customLandArea || ''}
                          onFocus={() => setLandSize('custom')}
                          onChange={(e) => {
                            setLandSize('custom');
                            setCustomLandArea(Math.max(0, Number(e.target.value)));
                          }}
                          className="w-full rounded-xl border border-border bg-soft-section/50 px-5 py-4 text-sm font-medium outline-none focus:ring-1 focus:ring-clay/30 focus:border-clay/30 transition-all pr-20 num"
                        />
                        <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[9px] uppercase tracking-[0.2em] text-muted-foreground/40 font-bold">
                          SQ FT
                        </span>
                      </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-border flex items-end justify-between">
                      <div>
                        <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground/40 mb-1 font-bold">Estimated</div>
                        <div className="font-display text-xl font-normal num tracking-tight text-foreground">
                          {formatMoney((customLandArea || 0) * LAND_SQFT_RATE)}
                        </div>
                      </div>
                      <MiniHouse active={landSize === 'custom'} />
                    </div>
                  </SelectableCard>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </StepShell>
  );
};
