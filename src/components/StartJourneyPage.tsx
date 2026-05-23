import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { GBTILogoMark, GBTILogoFull } from './GBTILogo';

interface StartJourneyPageProps {
  onProceed: () => void;
}

/* ── Floating dot particle ─────────────────────────────────── */
const FloatingDot = ({ delay, x, y, size }: { delay: number; x: number; y: number; size: number }) => (
  <motion.div
    className="absolute rounded-full"
    style={{
      width: size,
      height: size,
      left: `${x}%`,
      top: `${y}%`,
      background: `radial-gradient(circle, rgba(0,161,179,0.35) 0%, rgba(0,87,164,0.12) 60%, transparent 100%)`,
    }}
    initial={{ opacity: 0, scale: 0 }}
    animate={{
      opacity: [0, 0.6, 0.3, 0.6, 0],
      scale: [0.4, 1, 0.8, 1, 0.4],
      y: [0, -20, -10, -25, 0],
    }}
    transition={{
      duration: 8,
      delay,
      repeat: Infinity,
      ease: 'easeInOut',
    }}
  />
);

/* ── Main Component ────────────────────────────────────────── */
export const StartJourneyPage = ({ onProceed }: StartJourneyPageProps) => {
  const [isExiting, setIsExiting] = useState(false);
  const [logoReady, setLogoReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLogoReady(true), 300);
    return () => clearTimeout(t);
  }, []);

  const handleProceed = () => {
    setIsExiting(true);
    setTimeout(() => onProceed(), 900);
  };

  /* Stable set of particles so they don't re-render on state changes */
  const particles = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 3 + Math.random() * 4,
        delay: Math.random() * 6,
      })),
    [],
  );

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#060608] overflow-hidden select-none">
      {/* ── Background layers ─────────────────────────────── */}

      {/* Radial glow behind logo */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-[#00A1B3]/[0.04] blur-[140px]" />
        <div className="absolute top-[30%] left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full bg-[#0057A4]/[0.05] blur-[120px]" />
      </div>

      {/* Dot grid */}
      <div
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.2) 1px, transparent 0)`,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Floating particles */}
      <div className="absolute inset-0 pointer-events-none">
        {particles.map((p) => (
          <FloatingDot key={p.id} delay={p.delay} x={p.x} y={p.y} size={p.size} />
        ))}
      </div>

      {/* Corner watermark logos */}
      <div className="absolute top-6 left-6 opacity-[0.06] pointer-events-none">
        <GBTILogoMark size={28} />
      </div>
      <div className="absolute bottom-6 right-6 opacity-[0.06] pointer-events-none rotate-180">
        <GBTILogoMark size={28} />
      </div>

      {/* ── Content ───────────────────────────────────────── */}
      <AnimatePresence>
        {!isExiting && (
          <motion.div
            key="journey-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.06, filter: 'blur(16px)' }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 flex flex-col items-center text-center px-6"
          >
            {/* Logo mark — animated on mount */}
            <motion.div
              initial={{ opacity: 0, scale: 0.6, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="mb-8"
            >
              {/* Glowing ring behind logo */}
              <div className="relative">
                <motion.div
                  className="absolute -inset-6 rounded-full"
                  style={{
                    background: 'radial-gradient(circle, rgba(0,161,179,0.12) 0%, transparent 70%)',
                  }}
                  animate={{
                    scale: [1, 1.15, 1],
                    opacity: [0.6, 1, 0.6],
                  }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                />
                <GBTILogoMark size={72} animate={logoReady} />
              </div>
            </motion.div>

            {/* GBTI wordmark */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.6 }}
              className="font-display text-2xl font-bold tracking-tight text-white/90 mb-10"
            >
              GBTI
            </motion.div>

            {/* Thin separator */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.8, delay: 0.75, ease: [0.16, 1, 0.3, 1] }}
              className="w-12 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mb-10 origin-center"
            />

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.9 }}
              className="font-display text-4xl sm:text-5xl md:text-6xl font-bold text-white tracking-tight leading-[1.1] mb-4"
            >
              Start Your Journey
            </motion.h1>

            {/* Sub-headline */}
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 1.05 }}
              className="text-white/30 text-sm sm:text-base max-w-md leading-relaxed mb-12"
            >
              Design, visualize, and build your dream home with
              GBTI's immersive 3D configurator
            </motion.p>

            {/* CTA Button */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 1.2 }}
            >
              <button
                id="journey-begin"
                onClick={handleProceed}
                disabled={isExiting}
                className="group relative inline-flex items-center gap-3 px-10 py-4 rounded-2xl overflow-hidden text-white text-sm font-semibold transition-all duration-500 hover:scale-[1.04] hover:shadow-2xl active:scale-[0.97] disabled:opacity-60 border border-white/[0.08]"
                style={{
                  background: 'linear-gradient(135deg, #0057A4 0%, #00A1B3 100%)',
                  boxShadow: '0 8px 32px rgba(0, 161, 179, 0.18), 0 2px 8px rgba(0, 87, 164, 0.12)',
                }}
              >
                {/* Shine sweep */}
                <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-12deg)_translateX(-100%)] group-hover:duration-1000 group-hover:[transform:skew(-12deg)_translateX(100%)]">
                  <div className="relative h-full w-10 bg-white/15" />
                </div>
                <span className="relative tracking-[0.15em] uppercase">Begin</span>
                <ArrowRight size={16} className="relative transition-transform duration-500 group-hover:translate-x-1" />
              </button>
            </motion.div>

            {/* Decorative bottom dots */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 1.5 }}
              className="flex items-center gap-1.5 mt-14"
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-1 h-1 rounded-full bg-white/15"
                  animate={{ opacity: [0.2, 0.6, 0.2] }}
                  transition={{ duration: 2, delay: i * 0.4, repeat: Infinity, ease: 'easeInOut' }}
                />
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Footer ────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isExiting ? 0 : 1 }}
        transition={{ duration: 0.8, delay: 1.6 }}
        className="absolute bottom-6 inset-x-0 text-center"
      >
        <span className="text-[9px] font-semibold uppercase tracking-[0.25em] text-white/[0.12]">
          GBTI Smart Home Builder
        </span>
      </motion.div>
    </div>
  );
};
