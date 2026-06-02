import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { GBTILogoMark } from './GBTILogo';

interface LandingPageProps {
  onStart: () => void;
  onExplore?: () => void;
  onTurnkeyBuild?: () => void;
  onYoungProfessionalBuild?: () => void;
}

const HouseBlueprintSVG = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-black">
    {/* Foundation / Floor line */}
    <motion.path
      d="M2 21H22"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.3 }}
    />
    {/* Walls */}
    <motion.path
      d="M4 21V11H20V21"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    />
    {/* Roof */}
    <motion.path
      d="M2 11L12 3L22 11"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.4, delay: 0.6 }}
    />
    {/* Door */}
    <motion.path
      d="M10 21V15H14V21"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.3, delay: 0.9 }}
    />
    {/* Window */}
    <motion.path
      d="M9 7H15"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.2, delay: 1.1 }}
    />
  </svg>
);

export const LandingPage = ({ onStart, onExplore, onTurnkeyBuild, onYoungProfessionalBuild }: LandingPageProps) => {
  const [isBuilding, setIsBuilding] = useState(false);
  const isMobile = useIsMobile();

  // Mouse reactive parallax effect using Framer Motion
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 30, stiffness: 90 };
  const rotateX = useSpring(useTransform(mouseY, [-400, 400], [1.5, -1.5]), springConfig);
  const rotateY = useSpring(useTransform(mouseX, [-400, 400], [-1.5, 1.5]), springConfig);
  const translateX = useSpring(useTransform(mouseX, [-400, 400], [-12, 12]), springConfig);
  const translateY = useSpring(useTransform(mouseY, [-400, 400], [-12, 12]), springConfig);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isMobile) return;
    const { clientX, clientY } = e;
    const width = window.innerWidth;
    const height = window.innerHeight;
    const x = clientX - width / 2;
    const y = clientY - height / 2;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleStart = () => {
    if (isBuilding) return;
    setIsBuilding(true);
    const delay = isMobile ? 250 : 1600;
    setTimeout(() => {
      onStart();
    }, delay);
  };

  return (
    <div 
      className="fixed inset-0 z-50 w-full min-h-[100dvh] overflow-hidden bg-[#F8F7F4] text-zinc-900 flex flex-col font-sans select-none relative"
      onMouseMove={handleMouseMove}
      style={{ touchAction: 'manipulation' }}
    >
      {/* Full-Screen Parallax Blurred Background */}
      <div className="absolute inset-0 z-0 overflow-hidden w-full h-full pointer-events-none">
        <motion.div
          style={{
            x: translateX,
            y: translateY,
            rotateX: rotateX,
            rotateY: rotateY,
            transformPerspective: 1200
          }}
          className="w-[110%] h-[110%] -left-[5%] -top-[5%] absolute"
        >
          <motion.img
            initial={{ scale: 1.05, opacity: 0 }}
            animate={{ 
              scale: isBuilding ? 1.02 : 1.05,
              opacity: 1 
            }}
            transition={{ 
              scale: { duration: isBuilding ? 1.6 : 30, ease: "easeOut" },
              opacity: { duration: 1.2 }
            }}
            src="/hero-render.png"
            alt="Luxury Architectural Home"
            className="w-full h-full object-cover filter blur-[1px] brightness-[0.95] contrast-[1.0] object-center"
          />
          
          {/* Gradients and light overlays matching beige UI */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#F8F7F4]/90 via-[#F8F7F4]/30 to-[#F8F7F4]/10 pointer-events-none" />

          {/* Ambient Lighting Accents */}
          <div className="absolute top-[25%] right-[25%] w-[350px] h-[350px] bg-amber-500/[0.04] rounded-full filter blur-[100px] pointer-events-none animate-ambient-glow-pulse" />
          <div className="absolute bottom-[25%] left-[15%] w-[400px] h-[400px] bg-cyan-500/[0.03] rounded-full filter blur-[120px] pointer-events-none animate-ambient-glow-pulse" style={{ animationDelay: '-4s' }} />

          {/* Dotted micro architectural grid overlay */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' xmlns=\'svg\'%3E%3Cpath d=\'M39 0h1v1h-1V0zM0 39h1v1H0v-1z\' fill=\'%23b89b72\' fill-opacity=\'0.06\' fill-rule=\'evenodd\'/%3E%3C/svg%3E')] pointer-events-none" />
        </motion.div>
      </div>

      {/* Blueprint Grid Scanner (Active during transition) */}
      <AnimatePresence>
        {isBuilding && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.12 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 z-10 bg-[linear-gradient(to_right,rgba(184,155,114,0.15)_1px,transparent_1px),linear-gradient(to_bottom,rgba(184,155,114,0.15)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* Laser scanner sweeping line */}
      <AnimatePresence>
        {isBuilding && (
          <motion.div
            initial={{ top: "-5%" }}
            animate={{ top: "105%" }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            className="absolute left-0 right-0 h-1.5 bg-[#B89B72]/80 shadow-[0_0_20px_#B89B72,0_0_40px_#B89B72] z-25 pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* Central Interactive Menu Container */}
      <div className="relative z-20 w-full h-full flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
        
        {/* Brand & Sub-brand Header */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="mb-1"
          >
            <GBTILogoMark size={36} />
          </motion.div>
          <div className="text-center flex flex-col gap-1.5">
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
              className="text-xs sm:text-sm font-bold tracking-[0.3em] uppercase text-zinc-800 leading-none"
            >
              Smart Home Builder
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
              className="font-semibold uppercase text-zinc-500 leading-none"
              style={{ fontSize: '9px', letterSpacing: '0.28em', opacity: 0.7 }}
            >
              Interactive Architectural Experience
            </motion.div>
          </div>
        </div>

        {/* Vertical Options Rectangle */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-5xl p-6 sm:p-8 rounded-3xl border border-[#B89B72]/20 shadow-[0_20px_50px_rgba(184,155,114,0.1)] backdrop-blur-xl bg-[#F8F7F4]/70 flex flex-col gap-6 relative overflow-hidden"
        >
          {/* Subtle top edge highlight */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#B89B72]/20 to-transparent" />

          <div className="text-center mb-2">
            <h1 className="text-3xl sm:text-4xl font-display font-light leading-[1.1] tracking-tight text-zinc-900 mb-2">
              Design Your Home
            </h1>
            <p className="text-[11px] sm:text-xs text-[#B89B72] font-semibold tracking-widest uppercase">Select an architectural pathway</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 w-full">
            
            {/* 1. Turn Key Build */}
            <motion.button
              disabled={true} // TODO: TEMPORARY - Remove disabled={true} and pointer-events-none tomorrow to enable clicks
              onClick={onTurnkeyBuild}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="group relative flex flex-col justify-between text-left w-full h-[260px] sm:h-[280px] p-5 rounded-2xl bg-white/80 border border-[#B89B72]/15 transition-all duration-300 shadow-sm hover:shadow-[0_12px_30px_rgba(184,155,114,0.12)] hover:bg-white hover:border-[#B89B72]/40 overflow-hidden pointer-events-none cursor-default"
            >
              <div>
                <div className="text-[#B89B72]/60 group-hover:text-[#B89B72] transition-colors duration-300 font-bold text-lg mb-3">01.</div>
                <h3 className="text-base sm:text-lg font-bold tracking-widest uppercase text-zinc-800 mb-2 leading-tight group-hover:text-zinc-950 transition-colors">Turn Key<br/>Build</h3>
                <p className="text-[10px] sm:text-xs text-zinc-500 font-light leading-relaxed group-hover:text-zinc-600 transition-colors">
                  Experience pre-designed luxury homes with automated smart features included.
                </p>
              </div>
              <div className="flex justify-end w-full">
                 <ArrowRight className="text-[#B89B72]/60 group-hover:text-[#B89B72] group-hover:translate-x-2 transition-all duration-300" size={20} />
              </div>
            </motion.button>

            {/* 2. Young Professional Build */}
            <motion.button
              disabled={true} // TODO: TEMPORARY - Remove disabled={true} and pointer-events-none tomorrow to enable clicks
              onClick={onYoungProfessionalBuild}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="group relative flex flex-col justify-between text-left w-full h-[260px] sm:h-[280px] p-5 rounded-2xl bg-white/80 border border-[#B89B72]/15 transition-all duration-300 shadow-sm hover:shadow-[0_12px_30px_rgba(184,155,114,0.12)] hover:bg-white hover:border-[#B89B72]/40 overflow-hidden pointer-events-none cursor-default"
            >
              <div>
                <div className="text-[#B89B72]/60 group-hover:text-[#B89B72] transition-colors duration-300 font-bold text-lg mb-3">02.</div>
                <h3 className="text-base sm:text-lg font-bold tracking-widest uppercase text-zinc-800 mb-2 leading-tight group-hover:text-zinc-950 transition-colors">Young<br/>Professional</h3>
                <p className="text-[10px] sm:text-xs text-zinc-500 font-light leading-relaxed group-hover:text-zinc-600 transition-colors">
                  Modern, efficient, and tailored architectural designs for the ambitious professional.
                </p>
              </div>
              <div className="flex justify-end w-full">
                 <ArrowRight className="text-[#B89B72]/60 group-hover:text-[#B89B72] group-hover:translate-x-2 transition-all duration-300" size={20} />
              </div>
            </motion.button>

            {/* 3. Private Purchase */}
            <div
              className="group relative flex flex-col justify-between text-left w-full h-[260px] sm:h-[280px] p-5 rounded-2xl bg-white/30 border border-[#B89B72]/10 opacity-75 transition-all duration-300 shadow-sm overflow-hidden cursor-not-allowed"
            >
              <div>
                <div className="text-zinc-400 font-bold text-lg mb-3">03.</div>
                <h3 className="text-base sm:text-lg font-bold tracking-widest uppercase text-zinc-400 mb-2 leading-tight">Private<br/>Purchase</h3>
                <p className="text-[10px] sm:text-xs text-zinc-400 font-light leading-relaxed">
                  Exclusive, confidential acquisitions and bespoke developments.
                </p>
              </div>
              <div className="flex items-center justify-between w-full font-sans">
                 <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#B89B72]/40 animate-pulse" />
                  <span className="text-[9px] font-bold uppercase tracking-widest text-[#B89B72]/60">Soon</span>
                 </div>
              </div>
            </div>

            {/* 4. Build Your Own */}
            <motion.button
              onClick={handleStart}
              disabled={isBuilding}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="group relative flex flex-col justify-between text-left w-full h-[260px] sm:h-[280px] p-5 rounded-2xl bg-white/80 border border-[#B89B72]/15 transition-all duration-300 shadow-sm hover:shadow-[0_12px_30px_rgba(184,155,114,0.12)] hover:bg-white hover:border-[#B89B72]/40 overflow-hidden"
            >
              <div>
                <div className="text-[#B89B72]/60 group-hover:text-[#B89B72] transition-colors duration-300 font-bold text-lg mb-3">04.</div>
                <h3 className="text-base sm:text-lg font-bold tracking-widest uppercase text-zinc-800 mb-2 leading-tight group-hover:text-zinc-950 transition-colors">Build<br/>Your Own</h3>
                <p className="text-[10px] sm:text-xs text-zinc-500 font-light leading-relaxed group-hover:text-zinc-600 transition-colors">
                  Fully customize layouts, explore real-time floor plans, and configure smart home features.
                </p>
              </div>
              <div className="flex justify-end w-full">
                 <ArrowRight className="text-[#B89B72]/60 group-hover:text-[#B89B72] group-hover:translate-x-2 transition-all duration-300" size={20} />
              </div>

              {isBuilding && (
                <div className="absolute inset-0 bg-[#F8F7F4]/95 backdrop-blur-md flex flex-col items-center justify-center z-20 gap-3">
                  <HouseBlueprintSVG />
                  <span className="font-bold tracking-widest uppercase text-[#B89B72] animate-pulse text-xs text-center">Constructing...</span>
                </div>
              )}
            </motion.button>

          </div>
          
          {onExplore && (
            <div className="pt-2 flex justify-center border-t border-[#B89B72]/10 mt-1">
              <button
                onClick={onExplore}
                className="text-center py-2 text-[9px] sm:text-[10px] font-bold tracking-[0.25em] uppercase text-zinc-400 hover:text-zinc-600 transition-colors duration-300"
              >
                Direct Architectural Overview
              </button>
            </div>
          )}

        </motion.div>
        
        {/* Footer info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.8 }}
          className="absolute bottom-6 sm:bottom-8 text-[8px] sm:text-[9px] uppercase tracking-widest text-zinc-400"
        >
          Powered by Advanced Visualization Technology
        </motion.div>

      </div>
    </div>
  );
};
