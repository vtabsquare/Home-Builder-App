import { useState } from 'react';
import { useConfig, RoofType, Material } from '@/store/configurator';
import { StepShell } from '../StepShell';
import { FloorPlanCanvas } from '../FloorPlanCanvas';
import { ElevationCanvas } from '../ElevationCanvas';
import { Plan } from '@/lib/floorplan';
import { motion } from 'framer-motion';

interface Props {
  plan: Plan;
}

const ROOFS: { id: RoofType; label: string }[] = [
  { id: 'gable', label: 'Gable' },
  { id: 'flat', label: 'Flat' },
];
const MATERIALS: { id: Material; label: string; swatch: string }[] = [
  { id: 'budget', label: 'Budget', swatch: '#e7decf' },
  { id: 'modern', label: 'Modern', swatch: '#1a1a1a' },
  { id: 'luxury', label: 'Luxury', swatch: '#c9a84c' },
];

export const StepPreview = ({ plan }: Props) => {
  const { roof, setRoof, material, setMaterial, next, prev } = useConfig();
  const [view, setView] = useState<'2d' | '3d'>('2d');
  const [advanced, setAdvanced] = useState(false);

  return (
    <StepShell
      eyebrow="Step 04 · Preview"
      title="Your home, in real time."
      subtitle="Switch between the floor plan and the front elevation. Drag rooms in advanced mode."
      onNext={next}
      onPrev={prev}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-full bg-surface p-1">
            {(['2d', '3d'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`relative rounded-full px-5 py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
                  view === v ? 'text-ink-foreground' : 'text-muted-foreground'
                }`}
              >
                {view === v && (
                  <motion.div layoutId="view-pill" className="absolute inset-0 rounded-full bg-ink" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />
                )}
                <span className="relative">{v === '2d' ? 'Floor Plan' : 'Elevation 3D'}</span>
              </button>
            ))}
          </div>

          {view === '2d' && (
            <button
              onClick={() => setAdvanced((v) => !v)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                advanced ? 'border-ink bg-ink text-ink-foreground' : 'border-border hover:bg-surface'
              }`}
            >
              {advanced ? 'Advanced · ON' : 'Advanced mode'}
            </button>
          )}

          {view === '3d' && (
            <>
              <Group label="Roof">
                {ROOFS.map((r) => (
                  <Pill key={r.id} active={roof === r.id} onClick={() => setRoof(r.id)}>{r.label}</Pill>
                ))}
              </Group>
              <Group label="Material">
                {MATERIALS.map((m) => (
                  <Pill key={m.id} active={material === m.id} onClick={() => setMaterial(m.id)}>
                    <span className="inline-block h-2.5 w-2.5 rounded-full mr-1.5 align-middle" style={{ background: m.swatch }} />
                    {m.label}
                  </Pill>
                ))}
              </Group>
            </>
          )}
        </div>

        <div className="relative h-[420px] md:h-[520px] overflow-hidden rounded-3xl border border-border shadow-elev">
          {view === '2d' ? (
            <FloorPlanCanvas plan={plan} advanced={advanced} />
          ) : (
            <ElevationCanvas plan={plan} roof={roof} material={material} />
          )}
          <div className="pointer-events-none absolute left-4 top-4 rounded-full glass-panel px-3 py-1.5 text-[10px] font-display font-semibold uppercase tracking-[0.2em]">
            {view === '2d' ? `${plan.width}′ × ${plan.height}′` : 'Front elevation'}
          </div>
        </div>
      </div>
    </StepShell>
  );
};

const Group = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-center gap-1.5">
    <span className="text-[10px] uppercase tracking-widest text-muted-foreground mr-1">{label}</span>
    {children}
  </div>
);

const Pill = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    onClick={onClick}
    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
      active ? 'bg-ink text-ink-foreground' : 'bg-surface hover:bg-muted'
    }`}
  >
    {children}
  </button>
);
