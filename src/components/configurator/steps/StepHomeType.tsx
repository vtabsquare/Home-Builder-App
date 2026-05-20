import { useEffect } from 'react';
import { useConfig, HomeType, LandSize } from '@/store/configurator';
import { StepShell, SelectableCard } from '../StepShell';
import { formatMoney } from '@/lib/cost';
import { useHomeTypeMeta, useLandSqftRate, useLandPackages } from '@/hooks/PricingContext';
import { motion, AnimatePresence } from 'framer-motion';

const TYPES: { id: HomeType; tag: string; desc: string }[] = [
  { id: 'starter', tag: 'Compact + efficient', desc: 'Smart starter footprint with everything essential. Perfect first build.' },
  { id: 'family', tag: 'Most popular', desc: 'The benchmark family layout. Open social spaces, generous bedrooms.' },
  { id: 'premium', tag: 'Spacious + airy', desc: 'Architectural footprint with multi-zone living and double-height options.' },
];

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

export const StepHomeType = () => {
  const {
    land,
    setLand,
    landSize,
    setLandSize,
    customLandArea,
    setCustomLandArea,
    homeType,
    setHomeType,
    next,
    prev
  } = useConfig();

  const HOME_TYPE_META = useHomeTypeMeta();
  const LAND_SQFT_RATE = useLandSqftRate();
  const LAND_PACKAGES = useLandPackages();

  // Session state healing hook
  useEffect(() => {
    if (land === null) {
      setLand('own');
    }
  }, [land, setLand]);

  const canProceed =
    land === 'own' ||
    (land === 'need' && landSize !== null && (landSize !== 'custom' || customLandArea > 0));

  return (
    <StepShell
      eyebrow="Step 01 · Planning & Selection"
      title="Choose your home type"
      subtitle="Select whether you already have your land or need a footprint, then explore our architectural home layouts."
      onNext={next}
      onPrev={prev}
      nextDisabled={!canProceed}
      hidePrev
    >
      {/* Property Status Segmented Toggle Control */}
      <div className="flex p-1 bg-soft-section border border-border/60 rounded-full max-w-[280px] mx-auto mb-10 shadow-sm">
        <button
          type="button"
          onClick={() => setLand('own')}
          className={`flex-1 rounded-full py-2.5 text-[9px] font-bold uppercase tracking-[0.15em] transition-all duration-300 ${
            land === 'own'
              ? 'bg-surface text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          I Own Land
        </button>
        <button
          type="button"
          onClick={() => setLand('need')}
          className={`flex-1 rounded-full py-2.5 text-[9px] font-bold uppercase tracking-[0.15em] transition-all duration-300 ${
            land === 'need'
              ? 'bg-surface text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          I Need Land
        </button>
      </div>

      {/* Collapsible Plot Size footprints grid */}
      <AnimatePresence initial={false}>
        {land === 'need' && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden mb-12"
          >
            <div className="p-6 rounded-2xl bg-soft-section/40 border border-border/40 shadow-inner">
              <div className="text-[10px] uppercase tracking-[0.25em] font-bold text-muted-foreground/60 mb-6 text-center font-display">
                Select Land Footprint
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {PACKAGE_IDS.map(({ id, tag }) => {
                  const pkg = LAND_PACKAGES[id];
                  const price = pkg.baseArea * LAND_SQFT_RATE;
                  const active = landSize === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setLandSize(id)}
                      className={`flex flex-col justify-between p-4 rounded-xl border text-left transition-all duration-300 ${
                        active
                          ? 'bg-surface border-clay/40 shadow-soft scale-[1.01]'
                          : 'bg-surface/40 border-border hover:border-muted-foreground/20 hover:bg-surface'
                      }`}
                    >
                      <div>
                        <div className={`text-[8px] uppercase tracking-[0.2em] font-bold ${active ? 'text-clay' : 'text-muted-foreground/40'}`}>
                          {tag}
                        </div>
                        <h4 className="font-display text-lg font-normal tracking-tight text-foreground mt-1">
                          {pkg.label}
                        </h4>
                        <div className="text-[9px] uppercase tracking-[0.1em] text-muted-foreground/60 font-bold mt-1">
                          {pkg.baseArea} SQ FT
                        </div>
                        <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed font-light line-clamp-2">
                          {pkg.description}
                        </p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between w-full">
                        <span className="font-display text-sm font-normal tracking-tight text-foreground">
                          {formatMoney(price)}
                        </span>
                        <MiniHouse active={active} />
                      </div>
                    </button>
                  );
                })}

                <div
                  onClick={() => setLandSize('custom')}
                  className={`flex flex-col justify-between p-4 rounded-xl border text-left transition-all duration-300 cursor-pointer ${
                    landSize === 'custom'
                      ? 'bg-surface border-clay/40 shadow-soft scale-[1.01]'
                      : 'bg-surface/40 border-border hover:border-muted-foreground/20 hover:bg-surface'
                  }`}
                >
                  <div>
                    <div className={`text-[8px] uppercase tracking-[0.2em] font-bold ${landSize === 'custom' ? 'text-clay' : 'text-muted-foreground/40'}`}>
                      Tailored Size
                    </div>
                    <h4 className="font-display text-lg font-normal tracking-tight text-foreground mt-1">
                      Custom
                    </h4>
                    <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed font-light">
                      Enter your custom lot size:
                    </p>
                    <div className="mt-2 relative" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="number"
                        min={1}
                        placeholder="e.g. 2500"
                        value={customLandArea || ''}
                        onFocus={() => setLandSize('custom')}
                        onChange={(e) => {
                          setLandSize('custom');
                          setCustomLandArea(Math.max(0, Number(e.target.value)));
                        }}
                        className="w-full rounded-lg border border-border bg-soft-section/50 px-3 py-2 text-xs font-medium outline-none focus:ring-1 focus:ring-clay/30 focus:border-clay/30 transition-all pr-12 num text-foreground"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] uppercase tracking-[0.1em] text-muted-foreground/40 font-bold pointer-events-none">
                        SQ FT
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between w-full">
                    <span className="font-display text-sm font-normal tracking-tight text-foreground">
                      {formatMoney((customLandArea || 0) * LAND_SQFT_RATE)}
                    </span>
                    <MiniHouse active={landSize === 'custom'} />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Home Type cards */}
      <div className="grid gap-6 md:gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {TYPES.map(({ id, tag, desc }, i) => {
          const d = HOME_TYPE_META[id];
          const active = homeType === id;
          return (
            <motion.div
              key={id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="h-full"
            >
              <SelectableCard selected={active} onClick={() => setHomeType(id)} className="h-full flex flex-col justify-between">
                <div>
                  <div className={`text-[10px] uppercase tracking-[0.3em] font-bold mb-3 ${active ? 'text-clay' : 'text-muted-foreground/40'}`}>{tag}</div>
                  <h3 className="font-display text-3xl font-normal tracking-tight text-foreground">{d.label}</h3>
                  <div className="mt-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 num">
                    {d.areaRange[0]}–{d.areaRange[1]} SQ FT · {d.bedrooms} BED
                  </div>
                  <p className="mt-5 text-sm text-muted-foreground leading-relaxed font-light">
                    {desc}
                  </p>
                </div>
                <div className="mt-8 pt-6 border-t border-border flex items-end justify-between">
                  <div>
                    <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground/40 mb-1 font-bold">Estimated</div>
                    <div className="font-display text-xl font-normal num tracking-tight text-foreground">{formatMoney(d.baseCost)}</div>
                  </div>
                  <MiniSilhouette type={id} active={active} />
                </div>
              </SelectableCard>
            </motion.div>
          );
        })}
      </div>
    </StepShell>
  );
};

const MiniSilhouette = ({ type, active }: { type: HomeType, active: boolean }) => {
  const w = type === 'starter' ? 30 : type === 'family' ? 44 : 60;
  return (
    <motion.svg 
      width="80" 
      height="40" 
      viewBox="0 0 80 40" 
      fill="none" 
      className={`transition-all duration-500 ${active ? 'opacity-100 scale-105' : 'opacity-20'}`}
    >
      <path
        d={`M${(80 - w) / 2} 30 L${(80 - w) / 2} 18 L${40} 8 L${(80 + w) / 2} 18 L${(80 + w) / 2} 30 Z`}
        stroke={active ? "hsl(var(--clay))" : "currentColor"}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line x1="0" y1="30" x2="80" y2="30" stroke={active ? "hsl(var(--clay))" : "currentColor"} strokeWidth="1" />
    </motion.svg>
  );
};
