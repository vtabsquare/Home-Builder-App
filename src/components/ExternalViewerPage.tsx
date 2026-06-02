import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface ExternalViewerPageProps {
  url: string;
  onBack: () => void;
  onContinue: () => void;
}

export const ExternalViewerPage = ({ url, onBack, onContinue }: ExternalViewerPageProps) => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0a0a0a]">
      {/* Top Header / Navigation */}
      <div className="flex-none h-16 sm:h-20 border-b border-white/5 px-4 sm:px-8 flex items-center justify-between bg-[#0a0a0a] z-10">
        <button
          onClick={onBack}
          className="group flex items-center gap-2 text-xs font-bold tracking-[0.2em] uppercase text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-1" />
          Back
        </button>
        
        <button
          onClick={onContinue}
          className="group flex items-center gap-2 px-6 py-2.5 rounded-full bg-white text-black text-xs font-bold tracking-[0.2em] uppercase transition-transform hover:scale-105 active:scale-95"
        >
          Continue
          <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
        </button>
      </div>

      {/* Main Iframe Container */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="flex-1 relative w-full h-full bg-black"
      >
        <iframe 
          src={url}
          className="absolute inset-0 w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; xr-spatial-tracking"
          allowFullScreen
        />
      </motion.div>
    </div>
  );
};
