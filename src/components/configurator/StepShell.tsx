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
    <>
      <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="flex h-full flex-col relative z-10 pb-32"
    >
      <div className="mb-8 md:mb-12">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground font-bold mb-4"
        >
          {eyebrow}
        </motion.div>
        <motion.h1 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="font-display text-4xl md:text-6xl font-normal tracking-tight text-balance leading-[1.05] text-foreground"
        >
          {title}
        </motion.h1>
        {subtitle && (
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="mt-6 max-w-2xl text-base md:text-lg text-muted-foreground leading-relaxed font-light"
          >
            {subtitle}
          </motion.p>
        )}
      </div>

      <div className="flex-1">{children}</div>
    </motion.section>

      {(onNext || onPrev) && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-6 md:bottom-12 left-0 right-0 z-[200] px-4 pointer-events-none"
        >
          <div className="mx-auto max-w-[1440px] w-full relative flex items-center justify-center min-h-[56px] pointer-events-none gap-4">
            {/* Left-aligned Back button */}
            <div className="md:absolute md:left-0 md:top-1/2 md:-translate-y-1/2 pointer-events-auto">
              {!hidePrev && onPrev ? (
                <button
                  onClick={onPrev}
                  className="flex items-center gap-2 rounded-full border border-border bg-surface px-4 md:px-7 py-3 md:py-3.5 text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground hover:bg-soft-section transition-all active:scale-[0.98] shadow-soft whitespace-nowrap"
                >
                  <ArrowLeft size={14} /> <span className="hidden sm:inline">Back</span>
                </button>
              ) : null}
            </div>

            {/* Centered Continue button */}
            <div className="pointer-events-auto flex-1 md:flex-none flex justify-center">
              {onNext && (
                <button
                  onClick={onNext}
                  disabled={nextDisabled}
                  className="group relative flex items-center justify-center gap-4 rounded-full bg-primary text-primary-foreground h-12 md:h-14 w-full md:min-w-[340px] md:w-auto px-6 md:px-12 text-[9px] md:text-[10px] font-bold uppercase tracking-[0.3em] shadow-lg transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-30 disabled:hover:brightness-100 disabled:active:scale-100"
                >
                  <span className="relative z-10">{nextLabel}</span>
                  <ArrowRight size={14} className="relative z-10 transition-transform group-hover:translate-x-1" />
                </button>
              )}
            </div>

            {/* Placeholder to balance the centered button on mobile if needed, 
                but since we use flex gap and absolute positioning on desktop it's fine */}
            {!hidePrev && onPrev && <div className="md:hidden w-0" />}
          </div>
        </motion.div>
      )}
    </>
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
    className={`group relative w-full overflow-hidden rounded-2xl p-6 text-left transition-all duration-500 border ${
      selected
        ? 'bg-surface shadow-elev border-clay/30 scale-[1.01]'
        : 'bg-surface/50 border-border hover:border-muted-foreground/20 hover:bg-surface hover:shadow-soft'
    } ${className}`}
  >
    <div className="relative z-10">{children}</div>
    {selected && (
      <div className="absolute top-4 right-4 h-2 w-2 rounded-full bg-clay" />
    )}
  </button>
);
