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
    <div className="fixed inset-0 z-50 flex flex-col lg:flex-row bg-background overflow-y-auto overflow-x-hidden text-foreground">
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
        
        {/* Brand & Sub-brand */}
        <div>
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-[10px] font-bold tracking-[0.3em] uppercase text-zinc-400 mb-2"
          >
            GBTI Smart Home Builder
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
            className="text-xs font-semibold tracking-[0.2em] uppercase text-zinc-700"
          >
            Interactive Architectural Experience
          </motion.div>
        </div>

        {/* Center Text */}
        <div className="flex-1 flex flex-col justify-center max-w-[540px] pt-12 pb-8">
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            className="text-5xl lg:text-[5rem] font-display text-balance leading-[1.05] tracking-tight text-zinc-900 mb-8"
          >
            Design Your <br className="hidden lg:block" /> Future Home
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
            className="text-base lg:text-lg text-zinc-500 leading-relaxed max-w-md font-light"
          >
            Customize layouts, explore real-time floor plans, and experience immersive architectural visualization through an interactive smart home configurator.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
            className="flex flex-col items-start gap-4 mt-12 w-full"
          >
            <div className="flex flex-col gap-3.5 w-full max-w-[340px]">
              {['Turn Key Build', 'Young Professional Build', 'Private Purchase'].map((label) => (
                <button
                  key={label}
                  disabled
                  className="group relative flex items-center justify-between w-full h-12 lg:h-14 px-6 lg:px-8 rounded-2xl border border-zinc-200/80 bg-white/40 backdrop-blur-md text-zinc-400 cursor-not-allowed overflow-hidden transition-all duration-500 hover:bg-white/60 hover:border-zinc-300/80 shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
                >
                  <span className="relative z-10 text-[10px] lg:text-xs font-bold tracking-[0.2em] uppercase text-zinc-500">{label}</span>
                  <div className="relative z-10 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 group-hover:bg-zinc-400 transition-colors duration-500" />
                    <span className="text-[8px] font-bold uppercase tracking-widest text-zinc-400">Soon</span>
                  </div>
                </button>
              ))}

              <button
                onClick={handleStart}
                disabled={isBuilding}
                className="group relative inline-flex w-full h-14 lg:h-16 items-center justify-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-zinc-900 to-black px-6 lg:px-8 text-xs lg:text-sm font-medium text-white transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-zinc-900/20 active:scale-95 disabled:scale-100 disabled:opacity-90 mt-2 border border-zinc-800"
              >
                {isBuilding ? (
                  <div className="flex items-center justify-center gap-3.5">
                    <HouseBlueprintSVG />
                    <span className="font-bold tracking-wide uppercase text-white animate-pulse">Constructing...</span>
                  </div>
                ) : (
                  <>
                    <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-12deg)_translateX(-100%)] group-hover:duration-1000 group-hover:[transform:skew(-12deg)_translateX(100%)]">
                      <div className="relative h-full w-8 bg-white/10" />
                    </div>
                    <span className="relative font-bold tracking-[0.2em] uppercase text-zinc-100 drop-shadow-sm">Build Your Own</span>
                    <ArrowRight className="relative transition-transform duration-500 group-hover:translate-x-1.5 text-zinc-400 group-hover:text-white" size={18} />
                  </>
                )}
              </button>
            </div>
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
        className="w-full lg:w-[55%] h-[40vh] lg:h-screen lg:sticky lg:top-0 relative overflow-hidden bg-ink"
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
