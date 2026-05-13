import { useConfig, HomeType } from '@/store/configurator';
import { StepShell, SelectableCard } from '../StepShell';
import { formatMoney } from '@/lib/cost';
import { useHomeTypeMeta } from '@/hooks/PricingContext';
import { motion } from 'framer-motion';

const TYPES: { id: HomeType; tag: string; desc: string }[] = [
  { id: 'starter', tag: 'Compact + efficient', desc: 'Smart starter footprint with everything essential. Perfect first build.' },
  { id: 'family', tag: 'Most popular', desc: 'The benchmark family layout. Open social spaces, generous bedrooms.' },
  { id: 'premium', tag: 'Spacious + airy', desc: 'Architectural footprint with multi-zone living and double-height options.' },
];

export const StepHomeType = () => {
  const { homeType, setHomeType, next, prev } = useConfig();
  const HOME_TYPE_META = useHomeTypeMeta();

  return (
    <StepShell
      eyebrow="Step 02 · Selection"
      title="Choose your home type."
      subtitle="Each blueprint represents a foundational layout optimized for light, flow, and structural efficiency."
      onNext={next}
      onPrev={prev}
    >
      <div className="grid gap-8 md:grid-cols-3">
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
