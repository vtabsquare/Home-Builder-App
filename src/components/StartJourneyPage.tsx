import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Smartphone } from 'lucide-react';
import { GBTILogoMark, GBTILogoFull } from './GBTILogo';

interface StartJourneyPageProps {
  onProceed: () => void;
  onSkip?: () => void;
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
export const StartJourneyPage = ({ onProceed, onSkip }: StartJourneyPageProps) => {
  const [isExiting, setIsExiting] = useState(false);
  const [logoReady, setLogoReady] = useState(false);
  const [qrUrl, setQrUrl] = useState('');

  useEffect(() => {
    const url = 'https://gbti-homebuilder.vtabsquare.com/';
    setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(url)}&bgcolor=0a0a0a&color=ffffff&format=svg`);
    
    const t = setTimeout(() => setLogoReady(true), 300);
    return () => clearTimeout(t);
  }, []);

  const handleProceed = () => {
    setIsExiting(true);
    setTimeout(() => onProceed(), 900);
  };

  const handleSkip = () => {
    setIsExiting(true);
    setTimeout(() => {
      (onSkip || onProceed)();
    }, 900);
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
            {/* Logo mark and powered by text */}
            <div className="flex flex-col items-center mb-8 gap-5 relative z-10">
              <motion.div
                initial={{ opacity: 0, scale: 0.6, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
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
                  <GBTILogoMark size={140} animate={logoReady} />
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
                className="font-bold uppercase text-white leading-none drop-shadow-md text-center"
                style={{ fontSize: '10px', letterSpacing: '0.25em', opacity: 0.9 }}
              >
                Powered by Beharry-Amber Technologies
              </motion.div>
            </div>

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
              className="text-white/30 text-xs sm:text-sm max-w-md leading-relaxed mb-10"
            >
              Design, visualize, and build your dream home with GBTI's immersive 3D configurator.<br/>
              Scan the QR code to continue on your mobile device, or proceed directly below.
            </motion.p>

            {/* QR Code */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={isExiting ? {
                scale: [1, 0.85, 8],
                opacity: [1, 1, 0],
              } : {
                opacity: 1, scale: 1
              }}
              transition={isExiting ? { duration: 0.6, times: [0, 0.3, 1], ease: "easeInOut" } : { delay: 1.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className={`inline-block mb-10 ${isExiting ? 'pointer-events-none relative z-50' : ''}`}
              style={{ willChange: 'transform, opacity' }}
            >
              <div className="relative p-5 sm:p-6 rounded-3xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm overflow-hidden">
                {/* Subtle glow behind QR */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#00A1B3]/10 to-transparent blur-xl opacity-60" />
                <div className="relative bg-white rounded-2xl p-4">
                  {qrUrl ? (
                    <img
                      src={qrUrl}
                      alt="Scan to continue on mobile"
                      className="w-[160px] h-[160px] sm:w-[200px] sm:h-[200px] md:w-[220px] md:h-[220px]"
                      style={{ imageRendering: 'pixelated' }}
                    />
                  ) : (
                    <div className="w-[160px] h-[160px] sm:w-[200px] sm:h-[200px] md:w-[220px] md:h-[220px] flex items-center justify-center">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, ease: 'linear', duration: 1 }}
                        className="w-6 h-6 border-2 border-gray-200 border-t-gray-500 rounded-full"
                      />
                    </div>
                  )}
                </div>
                {/* Corner accents */}
                <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#00A1B3]/40 rounded-tl-lg" />
                <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#00A1B3]/40 rounded-tr-lg" />
                <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#00A1B3]/40 rounded-bl-lg" />
                <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#00A1B3]/40 rounded-br-lg" />
              </div>
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 1.35 }}
              className="flex flex-col items-center gap-4"
            >
              <button
                id="journey-continue"
                onClick={handleProceed}
                disabled={isExiting}
                className="group relative inline-flex items-center gap-3 px-8 sm:px-10 py-3.5 sm:py-4 rounded-2xl overflow-hidden text-white text-xs sm:text-sm font-semibold transition-all duration-500 hover:scale-[1.04] hover:shadow-2xl active:scale-[0.97] disabled:opacity-60 border border-white/[0.08]"
                style={{
                  background: 'linear-gradient(135deg, #0057A4 0%, #00A1B3 100%)',
                  boxShadow: '0 8px 32px rgba(0, 161, 179, 0.18), 0 2px 8px rgba(0, 87, 164, 0.12)',
                }}
              >
                {/* Shine sweep */}
                <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-12deg)_translateX(-100%)] group-hover:duration-1000 group-hover:[transform:skew(-12deg)_translateX(100%)]">
                  <div className="relative h-full w-10 bg-white/15" />
                </div>
                <span className="relative tracking-[0.15em] uppercase">Continue Here</span>
                <ArrowRight size={16} className="relative transition-transform duration-500 group-hover:translate-x-1" />
              </button>

              <button
                onClick={handleSkip}
                disabled={isExiting}
                className="text-[10px] text-white/20 hover:text-white/40 uppercase tracking-[0.2em] transition-colors mt-1"
              >
                Skip (Dev)
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
