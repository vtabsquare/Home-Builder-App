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
    <header className="sticky top-0 z-30 bg-surface/80 backdrop-blur-md border-b border-border">
      <div className="mx-auto flex max-w-[1480px] items-center justify-between px-4 md:px-8 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-display font-bold text-xs">
            G
          </div>
          <div>
            <div className="font-display text-sm font-bold leading-tight tracking-tight uppercase">GBTI</div>
            <div className="text-[9px] uppercase tracking-[0.3em] text-muted-foreground/60 leading-tight">Architectural Configurator</div>
          </div>
        </div>

        <ol className="hidden md:flex items-center gap-1">
          {STEPS.map((label, i) => {
            const active = i === step;
            const done = i < step;
            return (
              <li key={label}>
                <button
                  onClick={() => i <= step && setStep(i)}
                  className={`group relative flex items-center gap-2 rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] transition-all ${
                    active ? 'text-foreground' : done ? 'text-muted-foreground hover:text-foreground' : 'text-muted-foreground/40'
                  }`}
                  disabled={i > step}
                >
                  <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[8px] transition-colors ${
                    active ? 'bg-clay text-white' : done ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground/40'
                  }`}>
                    {done ? <Check size={8} strokeWidth={4} /> : i + 1}
                  </span>
                  <span className="hidden lg:inline">{label}</span>
                </button>
              </li>
            );
          })}
        </ol>

        <div className="flex items-center gap-4">
          <div className="md:hidden text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            Step <span className="num">{step + 1}</span>/{STEPS.length}
          </div>
          {onReset && (
            <button
              onClick={onReset}
              className="rounded-full border border-border px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground hover:bg-soft-section hover:text-foreground transition-all active:scale-[0.98]"
            >
              Restart
            </button>
          )}
        </div>
      </div>

      {/* Progress line */}
      <div className="h-[1px] bg-border w-full">
        <motion.div
          className="h-full bg-clay"
          initial={false}
          animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </header>
  );
};
