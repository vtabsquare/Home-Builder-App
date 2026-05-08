import { motion } from 'framer-motion';
import { ArrowRight, Play } from 'lucide-react';

interface LandingPageProps {
  onStart: () => void;
  onExplore: () => void;
}

export const LandingPage = ({ onStart, onExplore }: LandingPageProps) => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col lg:flex-row bg-background overflow-hidden text-foreground">
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
            className="text-5xl lg:text-7xl font-display text-balance leading-[1.1] mb-8"
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
            className="flex flex-col sm:flex-row gap-4 mt-12"
          >
            <button
              onClick={onStart}
              className="group relative inline-flex h-14 items-center justify-center gap-3 overflow-hidden rounded-full bg-primary px-8 text-sm font-medium text-primary-foreground transition-all hover:scale-[1.02] active:scale-95 shadow-elev"
            >
              <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-12deg)_translateX(-100%)] group-hover:duration-1000 group-hover:[transform:skew(-12deg)_translateX(100%)]">
                <div className="relative h-full w-8 bg-white/20" />
              </div>
              <span className="relative font-bold tracking-wide uppercase">Start Building</span>
              <ArrowRight className="relative transition-transform group-hover:translate-x-1" size={16} />
            </button>
            
            <button
              onClick={onExplore}
              className="group inline-flex h-14 items-center justify-center gap-3 rounded-full border border-border bg-transparent px-8 text-sm font-medium text-foreground transition-all hover:bg-surface active:scale-95"
            >
              <Play className="transition-transform group-hover:scale-110" size={16} fill="currentColor" />
              <span className="font-bold tracking-wide uppercase">Explore Preview</span>
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
        
        <motion.img
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 20, ease: "linear", repeat: Infinity, repeatType: "reverse" }}
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
