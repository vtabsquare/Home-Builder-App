import { motion } from 'framer-motion';
import { useConfig } from '@/store/configurator';
import { Check } from 'lucide-react';

const STEPS = ['Land', 'Home Type', 'Customize', 'Preview', 'Lead'];

interface Props {
  onReset?: () => void;
}

export const ProgressHeader = ({ onReset }: Props) => {
  const { step, setStep } = useConfig();

  return (
    <header className="sticky top-0 z-30 glass-subtle border-b border-border">
      <div className="mx-auto flex max-w-[1480px] items-center justify-between px-4 md:px-8 py-3.5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink text-ink-foreground font-display font-black text-sm">
            G
          </div>
          <div>
            <div className="font-display text-sm md:text-base font-bold leading-tight">GBTI</div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground leading-tight">Smart Home Builder</div>
          </div>
        </div>

        <ol className="hidden md:flex items-center gap-1.5">
          {STEPS.map((label, i) => {
            const active = i === step;
            const done = i < step;
            return (
              <li key={label}>
                <button
                  onClick={() => i <= step && setStep(i)}
                  className={`group relative flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    active ? 'bg-ink text-ink-foreground' : done ? 'text-foreground hover:bg-surface' : 'text-muted-foreground'
                  }`}
                  disabled={i > step}
                >
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] num font-display ${
                    active ? 'bg-clay text-clay-foreground' : done ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'
                  }`}>
                    {done ? <Check size={10} strokeWidth={3} /> : i + 1}
                  </span>
                  <span className="hidden lg:inline">{label}</span>
                </button>
              </li>
            );
          })}
        </ol>

        <div className="flex items-center gap-2">
          <div className="md:hidden text-xs text-muted-foreground">
            <span className="num">{step + 1}</span>/{STEPS.length}
          </div>
          {onReset && (
            <button
              onClick={onReset}
              className="rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface transition-colors"
            >
              Restart
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-[2px] bg-muted">
        <motion.div
          className="h-full bg-gradient-clay"
          initial={false}
          animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </header>
  );
};
