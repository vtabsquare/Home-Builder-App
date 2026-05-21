import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useState } from 'react';

interface LandingPageProps {
  onStart: () => void;
  onExplore?: () => void;
}

const HouseBlueprintSVG = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-white">
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

export const LandingPage = ({ onStart, onExplore }: LandingPageProps) => {
  const [isBuilding, setIsBuilding] = useState(false);

  const handleStart = () => {
    setIsBuilding(true);
    setTimeout(() => {
      onStart();
    }, 1600);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col lg:flex-row bg-background overflow-hidden text-foreground">
      {/* Blueprint grid construction overlay */}
      <AnimatePresence>
        {isBuilding && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.12 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 z-0 bg-[linear-gradient(to_right,rgba(34,211,238,0.15)_1px,transparent_1px),linear-gradient(to_bottom,rgba(34,211,238,0.15)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* Left Content Column */}
      <div className="w-full lg:w-[45%] flex flex-col justify-between px-8 py-12 lg:px-16 lg:py-20 relative z-10">
        
        {/* Brand */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-xs font-bold tracking-[0.2em] uppercase text-muted-foreground"
        >
          GBTI SMART HOME BUILDER
        </motion.div>

        {/* Center Text */}
        <div className="flex-1 flex flex-col justify-center max-w-xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="text-[10px] font-semibold tracking-[0.3em] uppercase text-primary/70 mb-6"
          >
            INTERACTIVE SMART HOME EXPERIENCE
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
            className="text-4xl xs:text-5xl lg:text-7xl font-display text-balance leading-[1.1] mb-8"
          >
            Design Your <br /> Future Home
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
            className="text-base lg:text-lg text-muted-foreground leading-relaxed max-w-md"
          >
            Customize layouts, explore real-time floor plans, and experience immersive architectural visualization through an interactive smart home configurator.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
            className="flex justify-center lg:justify-start mt-12"
          >
            <button
              onClick={handleStart}
              disabled={isBuilding}
              className="group relative inline-flex h-12 md:h-14 items-center justify-center gap-3 overflow-hidden rounded-full bg-primary px-6 md:px-8 text-xs md:text-sm font-medium text-primary-foreground transition-all hover:scale-[1.02] active:scale-95 shadow-elev disabled:scale-100 disabled:opacity-90 min-w-[180px]"
            >
              {isBuilding ? (
                <div className="flex items-center justify-center gap-3.5">
                  <HouseBlueprintSVG />
                  <span className="font-bold tracking-wide uppercase text-white animate-pulse">Constructing...</span>
                </div>
              ) : (
                <>
                  <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-12deg)_translateX(-100%)] group-hover:duration-1000 group-hover:[transform:skew(-12deg)_translateX(100%)]">
                    <div className="relative h-full w-8 bg-white/20" />
                  </div>
                  <span className="relative font-bold tracking-wide uppercase">Build Your Own</span>
                  <ArrowRight className="relative transition-transform group-hover:translate-x-1" size={16} />
                </>
              )}
            </button>
          </motion.div>
        </div>

        {/* Footer info (optional for balance) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1 }}
          className="text-[10px] uppercase tracking-widest text-muted-foreground/60"
        >
          Powered by Advanced Visualization Technology
        </motion.div>
      </div>

      {/* Right Visual Column */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2 }}
        className="w-full lg:w-[55%] h-[40vh] lg:h-full relative overflow-hidden bg-ink"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/20 to-transparent z-10 lg:w-32" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10 h-32 lg:hidden bottom-0" />
        
        {/* Laser scanner grid line */}
        <AnimatePresence>
          {isBuilding && (
            <motion.div
              initial={{ top: "-5%" }}
              animate={{ top: "105%" }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
              className="absolute left-0 right-0 h-1 bg-cyan-400/80 shadow-[0_0_15px_#22d3ee] z-20 pointer-events-none"
            />
          )}
        </AnimatePresence>

        <motion.img
          initial={{ scale: 1.1 }}
          animate={{ scale: isBuilding ? 1.04 : 1 }}
          transition={{ duration: isBuilding ? 1.5 : 20, ease: "easeOut" }}
          src="/hero-render.png"
          alt="Luxury Architectural Home"
          className="absolute inset-0 w-full h-full object-cover"
        />
        
        {/* Architectural subtle overlay */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M54.627 0l.83.83v58.34h-58.34l-.83-.83V0h58.34zM53.797 1.66H2.49v55.02h51.307V1.66z\' fill=\'%23ffffff\' fill-opacity=\'0.03\' fill-rule=\'evenodd\'/%3E%3C/svg%3E')] z-10" />
      </motion.div>

    </div>
  );
};
