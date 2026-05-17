import { motion, AnimatePresence } from 'framer-motion';
import { useConfig } from '@/store/configurator';
import { Check, QrCode, X } from 'lucide-react';
import { useState } from 'react';

const STEPS = ['Land', 'Home Type', 'Customize', 'Preview', 'Lead'];

interface Props {
  onReset?: () => void;
}

export const ProgressHeader = ({ onReset }: Props) => {
  const { step, setStep } = useConfig();
  const [showQR, setShowQR] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 bg-surface/80 backdrop-blur-md border-b border-border">
        <div className="mx-auto flex max-w-[1480px] items-center justify-between px-4 md:px-8 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 md:h-8 md:w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-display font-bold text-[10px] md:text-xs">
              G
            </div>
            <div>
              <div className="font-display text-xs md:text-sm font-bold leading-tight tracking-tight uppercase">GBTI</div>
              <div className="text-[8px] md:text-[9px] uppercase tracking-[0.2em] md:tracking-[0.3em] text-muted-foreground/60 leading-tight">Architectural Configurator</div>
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

          <div className="flex items-center gap-2 md:gap-4">
            <div className="md:hidden text-[10px] font-bold text-muted-foreground uppercase tracking-widest mr-2">
              Step <span className="num">{step + 1}</span>/{STEPS.length}
            </div>
            
            <button
              onClick={() => setShowQR(true)}
              className="flex items-center gap-2 rounded-full border border-border px-3 md:px-4 py-1.5 md:py-2 text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground hover:bg-soft-section hover:text-foreground transition-all active:scale-[0.98]"
            >
              <QrCode size={14} />
              <span className="hidden xs:inline">QR Code</span>
            </button>

            {onReset && (
              <button
                onClick={onReset}
                className="rounded-full border border-border px-3 md:px-4 py-1.5 md:py-2 text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground hover:bg-soft-section hover:text-foreground transition-all active:scale-[0.98]"
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

      <AnimatePresence>
        {showQR && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center bg-background/95 backdrop-blur-xl p-8"
          >
            <motion.button
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={() => setShowQR(false)}
              className="absolute top-8 right-8 h-12 w-12 flex items-center justify-center rounded-full bg-surface border border-border text-foreground hover:bg-soft-section transition-all z-20 shadow-elev"
            >
              <X size={24} />
            </motion.button>

            <motion.div
              initial={{ y: 40, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 40, opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative max-w-lg w-full aspect-square bg-white rounded-[2.5rem] p-12 shadow-[0_32px_80px_-16px_rgba(0,0,0,0.1)] border border-border flex flex-col items-center justify-center text-center"
            >
              <div className="absolute top-8 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-[0.4em] text-muted-foreground/40">
                Scan to Continue
              </div>
              
              <div className="w-full h-full relative p-4 bg-white rounded-3xl overflow-hidden mt-4">
                <img 
                  src="/my_qr.png" 
                  alt="QR Code" 
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="mt-8">
                <h3 className="font-display text-2xl font-normal tracking-tight text-foreground">Mobile Experience</h3>
                <p className="mt-2 text-[11px] text-muted-foreground uppercase tracking-widest leading-relaxed">
                  Open your camera to seamlessly <br /> explore this home on your device.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
