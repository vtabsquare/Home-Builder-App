import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, QrCode, X } from 'lucide-react';
import { useState } from 'react';

interface LandingPageProps {
  onStart: () => void;
  onExplore?: () => void;
}

export const LandingPage = ({ onStart, onExplore }: LandingPageProps) => {
  const [showQR, setShowQR] = useState(false);
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
            className="flex flex-col sm:flex-row gap-4 mt-12"
          >
            <button
              onClick={onStart}
              className="group relative inline-flex h-12 md:h-14 items-center justify-center gap-3 overflow-hidden rounded-full bg-primary px-6 md:px-8 text-xs md:text-sm font-medium text-primary-foreground transition-all hover:scale-[1.02] active:scale-95 shadow-elev"
            >
              <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-12deg)_translateX(-100%)] group-hover:duration-1000 group-hover:[transform:skew(-12deg)_translateX(100%)]">
                <div className="relative h-full w-8 bg-white/20" />
              </div>
              <span className="relative font-bold tracking-wide uppercase">Start Building</span>
              <ArrowRight className="relative transition-transform group-hover:translate-x-1" size={16} />
            </button>
            
            <button
              onClick={() => setShowQR(true)}
              className="group inline-flex h-12 md:h-14 items-center justify-center gap-3 rounded-full border border-border bg-transparent px-6 md:px-8 text-xs md:text-sm font-medium text-foreground transition-all hover:bg-surface active:scale-95"
            >
              <QrCode className="transition-transform group-hover:scale-110" size={16} />
              <span className="font-bold tracking-wide uppercase">QR Code</span>
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

      {/* QR Code Modal */}
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
    </div>
  );
};
