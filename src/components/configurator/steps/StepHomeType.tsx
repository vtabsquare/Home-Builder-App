import { useEffect } from 'react';
import { useConfig, HomeType, LandSize } from '@/store/configurator';
import { StepShell } from '../StepShell';
import { formatMoney } from '@/lib/cost';
import { useHomeTypeMeta, useLandSqftRate, useLandPackages } from '@/hooks/PricingContext';
import { motion } from 'framer-motion';

const TYPES: { id: HomeType; tag: string; desc: string; popular?: boolean }[] = [
  { id: 'starter', tag: 'Compact + Efficient', desc: 'Smart starter footprint with everything essential. Perfect first build.' },
  { id: 'family', tag: 'Most Popular', desc: 'The benchmark family layout. Open social spaces, generous bedrooms.', popular: true },
  { id: 'premium', tag: 'Spacious + Airy', desc: 'Architectural footprint with multi-zone living and generous double-height options.' },
];

const PACKAGE_IDS: { id: Exclude<LandSize, 'custom' | null>; tag: string }[] = [
  { id: 'small', tag: 'Compact + efficient' },
  { id: 'medium', tag: 'Most popular' },
  { id: 'large', tag: 'Spacious + premium' },
];

/* ── House silhouette SVG — matches reference image ──────────── */
const HouseSilhouette = ({ type, active }: { type: HomeType; active: boolean }) => {
  const isFamily = type === 'family';
  const isPremium = type === 'premium';

  return (
    <svg
      width={isPremium ? 90 : isFamily ? 76 : 60}
      height="40"
      viewBox="0 0 90 42"
      fill="none"
      className={`flex-shrink-0 transition-all duration-500 ${active ? 'opacity-100' : 'opacity-25'}`}
    >
      {isPremium ? (
        /* Premium — wide two-section house with taller profile */
        <>
          <path
            d="M5 34V20L30 8L55 20V34H5Z"
            stroke={active ? 'hsl(var(--clay))' : 'currentColor'}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M50 34V22L72 12L85 19V34H50Z"
            stroke={active ? 'hsl(var(--clay))' : 'currentColor'}
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <line x1="0" y1="34" x2="90" y2="34" stroke={active ? 'hsl(var(--clay))' : 'currentColor'} strokeWidth="1" />
        </>
      ) : isFamily ? (
        /* Family — medium wider house */
        <>
          <path
            d="M8 34V19L38 7L68 19V34H8Z"
            stroke={active ? 'hsl(var(--clay))' : 'currentColor'}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <line x1="0" y1="34" x2="76" y2="34" stroke={active ? 'hsl(var(--clay))' : 'currentColor'} strokeWidth="1" />
        </>
      ) : (
        /* Starter — compact smaller house */
        <>
          <path
            d="M10 34V21L30 11L50 21V34H10Z"
            stroke={active ? 'hsl(var(--clay))' : 'currentColor'}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <line x1="0" y1="34" x2="60" y2="34" stroke={active ? 'hsl(var(--clay))' : 'currentColor'} strokeWidth="1" />
        </>
      )}
    </svg>
  );
};

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
      {/* Disclaimer — desktop only */}
      <div className="hidden sm:block max-w-2xl mx-auto mb-8 text-center text-[11px] sm:text-xs text-muted-foreground leading-relaxed p-4 rounded-xl border border-border/40 bg-white/[0.02]">
        &quot;Estimates provided are for informational purposes only. Please note that construction and market costs fluctuate; this estimate should be used for budgeting purposes only. We recommend using these as a starting point for your planning.&quot;
      </div>

      {/* Disclaimer — mobile only, compact */}
      <div className="sm:hidden max-w-full mx-auto mb-4 text-center text-[9px] text-muted-foreground leading-relaxed px-3 py-2 rounded-lg border border-border/30 bg-white/[0.015]">
        &quot;Estimates provided are for informational purposes only. Please note that construction and market costs fluctuate; this estimate should be used for budgeting purposes only. We recommend using these as a starting point for your planning.&quot;
      </div>

      {/* Property Status Segmented Toggle Control */}
      <div className="flex p-1 bg-soft-section border border-border/60 rounded-full max-w-[280px] mx-auto mb-4 sm:mb-10 shadow-sm">
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

      {/* ── MOBILE: Full-width stacked cards (reference image layout) ── */}
      <div className="flex flex-col gap-3 sm:hidden">
        {TYPES.map(({ id, tag, desc, popular }, i) => {
          const d = HOME_TYPE_META[id];
          const active = homeType === id;
          return (
            <motion.button
              key={id}
              type="button"
              onClick={() => setHomeType(id)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className={`relative w-full text-left rounded-2xl border transition-all duration-300 overflow-hidden ${
                active
                  ? 'bg-surface border-clay/40 shadow-[0_4px_24px_-8px_rgba(184,155,114,0.25)]'
                  : 'bg-surface/60 border-border/60 hover:bg-surface hover:border-border'
              }`}
            >
              {/* Selected indicator dot */}
              {active && (
                <span className="absolute top-3.5 right-3.5 w-2 h-2 rounded-full bg-clay" />
              )}

              <div className="px-4 pt-4 pb-0">
                {/* Tag row */}
                <div
                  className={`text-[8px] uppercase tracking-[0.28em] font-bold mb-2 ${
                    popular
                      ? active ? 'text-clay' : 'text-clay/70'
                      : active ? 'text-muted-foreground/80' : 'text-muted-foreground/40'
                  }`}
                >
                  {tag}
                </div>

                {/* Title */}
                <h3 className="font-display text-[26px] font-normal tracking-tight text-foreground leading-none mb-1">
                  {d.label}
                </h3>

                {/* Sqft + Bed */}
                <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 mb-3 num">
                  {d.areaRange[0].toLocaleString()}–{d.areaRange[1].toLocaleString()} SQ FT · {d.bedrooms} BED
                </div>

                {/* Description */}
                <p className="text-[11px] text-muted-foreground leading-relaxed font-light mb-4">
                  {desc}
                </p>
              </div>

              {/* Divider */}
              <div className={`mx-4 border-t ${active ? 'border-clay/20' : 'border-border/60'}`} />

              {/* Bottom row: Estimated price + house silhouette */}
              <div className="px-4 pt-3 pb-4 flex items-end justify-between">
                <div>
                  <div className="text-[8px] uppercase tracking-[0.2em] text-muted-foreground/50 mb-1 font-bold">
                    Estimated
                  </div>
                  <div className={`font-display text-[20px] font-normal num tracking-tight ${active ? 'text-foreground' : 'text-foreground/80'}`}>
                    {formatMoney(d.baseCost)}
                  </div>
                </div>

                <HouseSilhouette type={id} active={active} />
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* ── DESKTOP: Original grid layout (unchanged) ── */}
      <div className="hidden sm:grid gap-6 md:gap-8 sm:grid-cols-2 lg:grid-cols-3">
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
              <button
                type="button"
                onClick={() => setHomeType(id)}
                className={`group relative w-full h-full overflow-hidden rounded-2xl p-6 text-left transition-all duration-500 border flex flex-col justify-between ${
                  active
                    ? 'bg-surface shadow-elev border-clay/30 scale-[1.01]'
                    : 'bg-surface/50 border-border hover:border-muted-foreground/20 hover:bg-surface hover:shadow-soft'
                }`}
              >
                <div className="relative z-10 flex-1 flex flex-col">
                  <div className={`text-[10px] uppercase tracking-[0.3em] font-bold mb-3 ${active ? 'text-clay' : 'text-muted-foreground/40'}`}>
                    {tag}
                  </div>
                  <h3 className="font-display text-2xl md:text-3xl font-normal tracking-tight text-foreground leading-none">
                    {d.label}
                  </h3>
                  <div className="mt-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 num">
                    {d.areaRange[0].toLocaleString()}/{d.areaRange[1].toLocaleString()} SQ FT · {d.bedrooms} BED
                  </div>
                  <p className="mt-5 text-sm text-muted-foreground leading-relaxed font-light flex-1">
                    {desc}
                  </p>
                </div>

                <div className="mt-8 pt-6 border-t border-border flex flex-row items-end justify-between">
                  <div>
                    <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground/40 mb-1 font-bold">Estimated</div>
                    <div className="font-display text-xl font-normal num tracking-tight text-foreground">{formatMoney(d.baseCost)}</div>
                  </div>
                  <HouseSilhouette type={id} active={active} />
                </div>

                {active && (
                  <div className="absolute top-4 right-4 h-2 w-2 rounded-full bg-clay" />
                )}
              </button>
            </motion.div>
          );
        })}
      </div>
    </StepShell>
  );
};
