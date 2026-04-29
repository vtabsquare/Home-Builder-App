import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { ReactNode } from 'react';

export const StepShell = ({
  eyebrow,
  title,
  subtitle,
  children,
  onNext,
  onPrev,
  nextLabel = 'Continue',
  nextDisabled,
  hidePrev,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  onNext?: () => void;
  onPrev?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  hidePrev?: boolean;
}) => {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="flex h-full flex-col"
    >
      <div className="mb-6 md:mb-8">
        <div className="text-[10px] uppercase tracking-[0.28em] text-clay font-medium mb-2">{eyebrow}</div>
        <h1 className="font-display text-3xl md:text-5xl font-extrabold tracking-tight text-balance leading-[1.05]">{title}</h1>
        {subtitle && <p className="mt-3 max-w-xl text-sm md:text-base text-muted-foreground">{subtitle}</p>}
      </div>

      <div className="flex-1">{children}</div>

      {(onNext || onPrev) && (
        <div className="mt-6 flex items-center justify-between gap-3 pt-4 border-t border-border">
          {!hidePrev && onPrev ? (
            <button
              onClick={onPrev}
              className="flex items-center gap-2 rounded-full border border-border bg-card px-5 py-3 text-sm font-medium hover:bg-surface transition-colors"
            >
              <ArrowLeft size={16} /> Back
            </button>
          ) : <span />}
          {onNext && (
            <button
              onClick={onNext}
              disabled={nextDisabled}
              className="group flex items-center gap-2 rounded-full bg-ink text-ink-foreground px-6 py-3 text-sm font-semibold shadow-elev transition-all hover:scale-[1.02] disabled:opacity-40 disabled:hover:scale-100"
            >
              {nextLabel}
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </button>
          )}
        </div>
      )}
    </motion.section>
  );
};

export const SelectableCard = ({
  selected,
  onClick,
  children,
  className = '',
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) => (
  <button
    onClick={onClick}
    className={`group relative w-full overflow-hidden rounded-2xl border-2 p-5 text-left transition-all duration-300 ${
      selected
        ? 'border-ink bg-card shadow-elev scale-[1.01]'
        : 'border-border bg-card/60 hover:border-clay hover:bg-card hover:shadow-soft'
    } ${className}`}
  >
    {selected && (
      <motion.div
        layoutId="card-glow"
        className="absolute inset-0 -z-10 bg-gradient-clay opacity-10"
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      />
    )}
    {children}
  </button>
);
