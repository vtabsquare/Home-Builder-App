import { useConfig } from '@/store/configurator';
import { StepShell, SelectableCard } from './StepShell';
import { Home, MapPin } from 'lucide-react';
import { formatMoney } from '@/lib/cost';

export const StepLand = () => {
  const { land, setLand, next } = useConfig();
  return (
    <StepShell
      eyebrow="Step 01 · Foundation"
      title="Where will your home be built?"
      subtitle="We'll factor land into your estimate when needed. Tap a card to continue."
      onNext={next}
      nextDisabled={!land}
      hidePrev
    >
      <div className="grid gap-4 md:grid-cols-2">
        <SelectableCard selected={land === 'own'} onClick={() => setLand('own')}>
          <div className="flex items-start justify-between gap-4">
            <div className="rounded-xl bg-surface p-3"><Home size={22} /></div>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Included</span>
          </div>
          <h3 className="mt-6 font-display text-2xl font-bold">I own land</h3>
          <p className="mt-1 text-sm text-muted-foreground">Build on your existing plot. We'll align the design to your lot constraints.</p>
          <div className="mt-6 text-xs uppercase tracking-wider text-clay font-medium">No land cost</div>
        </SelectableCard>

        <SelectableCard selected={land === 'need'} onClick={() => setLand('need')}>
          <div className="flex items-start justify-between gap-4">
            <div className="rounded-xl bg-surface p-3"><MapPin size={22} /></div>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Add-on</span>
          </div>
          <h3 className="mt-6 font-display text-2xl font-bold">I need land</h3>
          <p className="mt-1 text-sm text-muted-foreground">Bundled plot from our partner inventory in growth corridors.</p>
          <div className="mt-6 text-xs uppercase tracking-wider text-clay font-medium num">+ {formatMoney(65000)} land package</div>
        </SelectableCard>
      </div>
    </StepShell>
  );
};
