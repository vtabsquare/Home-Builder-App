import { useEffect } from 'react';
import { useConfig, HomeType, LandSize } from '@/store/configurator';
import { StepShell, SelectableCard } from '../StepShell';
import { formatMoney } from '@/lib/cost';
import { useHomeTypeMeta, useLandSqftRate, useLandPackages } from '@/hooks/PricingContext';
import { motion, AnimatePresence } from 'framer-motion';

const TYPES: { id: HomeType; tag: string; desc: string }[] = [
  { id: 'starter', tag: 'Compact + efficient', desc: 'Smart starter footprint with everything essential. Perfect first build.' },
  { id: 'family', tag: 'Most popular', desc: 'The benchmark family layout. Open social spaces, generous bedrooms.' },
  { id: 'premium', tag: 'Spacious + airy', desc: 'Architectural footprint with multi-zone living and generous double-height options.' },
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

  const canProceed = land !== null;

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
      <div className="hidden sm:block max-w-2xl mx-auto mb-8 text-center text-[11px] sm:text-xs text-muted-foreground leading-relaxed p-4 rounded-xl border border-border/40 bg-white/[0.02]">
        &quot;Estimates provided are for informational purposes only. Please note that construction and market costs fluctuate; this estimate should be used for budgeting purposes only. We recommend using these as a starting point for your planning.&quot;
      </div>

      {/* Property Status Segmented Toggle Control */}
      <div className="flex p-1 bg-soft-section border border-border/60 rounded-full max-w-[280px] mx-auto mb-3 sm:mb-10 shadow-sm">
        <button
          type="button"
          onClick={() => setLand('own')}
          className={`flex-1 rounded-full py-1.5 sm:py-2.5 text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.15em] transition-all duration-300 ${
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
          className={`flex-1 rounded-full py-1.5 sm:py-2.5 text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.15em] transition-all duration-300 ${
            land === 'need'
              ? 'bg-surface text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          I Need Land
        </button>
      </div>

      {/* Collapsible Plot Size footprints grid (REMOVED) */}

      {/* Main Home Type cards */}
      <div className="grid gap-2 sm:gap-6 md:gap-8 sm:grid-cols-2 lg:grid-cols-3">
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
              <SelectableCard selected={active} onClick={() => setHomeType(id)} className="h-full flex flex-row sm:flex-col sm:justify-between items-center sm:items-stretch py-2 px-3 sm:p-6">
                <div className="flex-1 text-left">
                  <div className={`text-[8px] sm:text-[10px] uppercase tracking-[0.3em] font-bold mb-0.5 sm:mb-3 ${active ? 'text-clay' : 'text-muted-foreground/40'}`}>{tag}</div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-base sm:text-2xl md:text-3xl font-normal tracking-tight text-foreground leading-none">{d.label}</h3>
                    <div className="sm:hidden text-[9px] font-bold text-muted-foreground/60 px-1.5 py-0.5 rounded bg-muted/20">{d.bedrooms} BED</div>
                  </div>
                  <div className="hidden sm:block mt-1 sm:mt-2 text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 num">
                    {d.areaRange[0].toLocaleString()}/{d.areaRange[1].toLocaleString()} SQ FT · {d.bedrooms} BED
                  </div>
                  <p className="hidden sm:block mt-3 sm:mt-5 text-xs sm:text-sm text-muted-foreground leading-relaxed font-light">
                    {desc}
                  </p>
                </div>
                <div className="mt-0 sm:mt-8 pt-0 sm:pt-6 sm:border-t border-border flex flex-col sm:flex-row items-end justify-between ml-2 sm:ml-0">
                  <div className="text-right sm:text-left mb-1 sm:mb-0">
                    <div className="hidden sm:block text-[8px] sm:text-[9px] uppercase tracking-[0.2em] text-muted-foreground/40 mb-1 font-bold">Estimated</div>
                    <div className="font-display text-[13px] sm:text-xl font-normal num tracking-tight text-foreground">{formatMoney(d.baseCost)}</div>
                  </div>
                  <div className="hidden sm:block">
                    <MiniSilhouette type={id} active={active} />
                  </div>
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
