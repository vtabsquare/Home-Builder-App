import { useConfig, HOME_TYPE_DEFAULTS, HomeType } from '@/store/configurator';
import { StepShell, SelectableCard } from '../StepShell';
import { formatMoney } from '@/lib/cost';

const TYPES: { id: HomeType; tag: string; desc: string }[] = [
  { id: 'starter', tag: 'Compact + efficient', desc: 'Smart starter footprint with everything essential. Perfect first build.' },
  { id: 'family', tag: 'Most popular', desc: 'The benchmark family layout. Open social spaces, generous bedrooms.' },
  { id: 'premium', tag: 'Spacious + airy', desc: 'Architectural footprint with multi-zone living and double-height options.' },
];

export const StepHomeType = () => {
  const { homeType, setHomeType, next, prev } = useConfig();

  return (
    <StepShell
      eyebrow="Step 02 · Footprint"
      title="Pick your home type."
      subtitle="Each footprint comes with a base layout that auto-adapts to your customization."
      onNext={next}
      onPrev={prev}
    >
      <div className="grid gap-4 md:grid-cols-3">
        {TYPES.map(({ id, tag, desc }) => {
          const d = HOME_TYPE_DEFAULTS[id];
          const active = homeType === id;
          return (
            <SelectableCard key={id} selected={active} onClick={() => setHomeType(id)} className="min-h-[220px]">
              <div className="text-[10px] uppercase tracking-[0.2em] text-clay font-medium">{tag}</div>
              <h3 className="mt-2 font-display text-3xl font-extrabold">{d.label}</h3>
              <div className="mt-1 text-xs text-muted-foreground num">
                {d.areaRange[0]}–{d.areaRange[1]} sqft · {d.bedrooms} bed
              </div>
              <p className="mt-4 text-sm text-foreground/75 leading-relaxed">{desc}</p>
              <div className="mt-6 flex items-end justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">From</div>
                  <div className="font-display text-xl font-bold num">{formatMoney(d.baseCost)}</div>
                </div>
                <MiniSilhouette type={id} />
              </div>
            </SelectableCard>
          );
        })}
      </div>
    </StepShell>
  );
};

const MiniSilhouette = ({ type }: { type: HomeType }) => {
  const w = type === 'starter' ? 30 : type === 'family' ? 44 : 60;
  return (
    <svg width="80" height="40" viewBox="0 0 80 40" fill="none" className="opacity-70">
      <path
        d={`M${(80 - w) / 2} 30 L${(80 - w) / 2} 18 L${40} 8 L${(80 + w) / 2} 18 L${(80 + w) / 2} 30 Z`}
        stroke="hsl(var(--ink))"
        strokeWidth="1.5"
        fill="hsl(var(--clay) / 0.3)"
      />
      <line x1="0" y1="30" x2="80" y2="30" stroke="hsl(var(--ink))" strokeWidth="1" />
    </svg>
  );
};
