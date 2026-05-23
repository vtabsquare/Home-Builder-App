import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { ArrowRight, Sun, Cpu, Layers, Waves, Layout, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { GBTILogoMark } from './GBTILogo';

interface LandingPageProps {
  onStart: () => void;
  onExplore?: () => void;
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

const HUD_NODES = [
  {
    id: 1,
    x: 48, // percentages relative to right side visual area
    y: 25,
    title: "Solar Integration",
    desc: "12.4 kW peak grid-tied solar roof tiles with integrated Powerwall backup.",
    icon: "solar",
    lineAngle: "top-right"
  },
  {
    id: 2,
    x: 58,
    y: 35,
    title: "Smart Lighting & HVAC",
    desc: "Automated climate zoning and intelligent ambient scenes.",
    icon: "smart",
    lineAngle: "top-left"
  },
  {
    id: 3,
    x: 82,
    y: 44,
    title: "Triple Glazing",
    desc: "Argon-filled low-E glass panels providing optimal thermal insulation.",
    icon: "glass",
    lineAngle: "top-left"
  },
  {
    id: 4,
    x: 64,
    y: 78,
    title: "Infinity Pool",
    desc: "Smart thermostat, eco-filtration, and automatic cover system.",
    icon: "pool",
    lineAngle: "bottom-right"
  },
  {
    id: 5,
    x: 35,
    y: 65,
    title: "3,200 SQFT Footprint",
    desc: "Double-storey modular steel structure tailored for architectural stability.",
    icon: "ruler",
    lineAngle: "bottom-left"
  }
];

export const LandingPage = ({ onStart, onExplore }: LandingPageProps) => {
  const [isBuilding, setIsBuilding] = useState(false);
  const [activeHud, setActiveHud] = useState<number | null>(null);

  // Mouse reactive parallax effect using Framer Motion
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 30, stiffness: 90 };
  const rotateX = useSpring(useTransform(mouseY, [-400, 400], [1.5, -1.5]), springConfig);
  const rotateY = useSpring(useTransform(mouseX, [-400, 400], [-1.5, 1.5]), springConfig);
  const translateX = useSpring(useTransform(mouseX, [-400, 400], [-12, 12]), springConfig);
  const translateY = useSpring(useTransform(mouseY, [-400, 400], [-12, 12]), springConfig);

  const handleMouseMove = (e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    const width = window.innerWidth;
    const height = window.innerHeight;
    const x = clientX - width / 2;
    const y = clientY - height / 2;
    mouseX.set(x);
    mouseY.set(y);
  };

  // Magnetic CTA Button states
  const [btnOffset, setBtnOffset] = useState({ x: 0, y: 0 });
  const handleBtnMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setBtnOffset({ x: x * 0.15, y: y * 0.15 });
  };
  const handleBtnMouseLeave = () => {
    setBtnOffset({ x: 0, y: 0 });
  };

  const handleStart = () => {
    setIsBuilding(true);
    setTimeout(() => {
      onStart();
    }, 1600);
  };

  const renderIcon = (iconName: string, size = 16) => {
    switch (iconName) {
      case 'solar': return <Sun size={size} />;
      case 'smart': return <Cpu size={size} />;
      case 'glass': return <Layers size={size} />;
      case 'pool': return <Waves size={size} />;
      case 'ruler': return <Layout size={size} />;
      default: return <Sparkles size={size} />;
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 w-full min-h-[100dvh] lg:h-screen overflow-y-auto lg:overflow-hidden bg-[#09090b] text-zinc-100 flex flex-col lg:flex-row font-sans select-none"
      onMouseMove={handleMouseMove}
    >
      {/* Left Frosted Glass Side Panel */}
      <div className="w-full lg:w-[480px] xl:w-[520px] shrink-0 h-auto lg:h-full bg-[#09090b] border-b lg:border-b-0 lg:border-r border-white/5 relative z-20 flex flex-col lg:justify-between gap-10 lg:gap-0 p-6 sm:p-8 lg:p-12 xl:p-14 lg:overflow-y-auto scrollbar-hide">
        
        {/* Brand & Sub-brand */}
        <div className="flex items-center gap-3">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <GBTILogoMark size={36} />
          </motion.div>
          <div>
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="text-[10px] font-bold tracking-[0.3em] uppercase text-zinc-300 mb-0.5"
            >
              GBTI Smart Home Builder
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
              className="text-[8px] font-semibold tracking-[0.2em] uppercase text-zinc-500"
            >
              Interactive Architectural Experience
            </motion.div>
          </div>
        </div>

        {/* Center Editorial Typography Section */}
        <div className="flex-1 flex flex-col justify-center py-10 lg:py-0 max-w-sm">
          <h1 className="text-4xl lg:text-[4.2rem] xl:text-[4.6rem] font-display font-light leading-[1.05] tracking-tight text-white mb-6">
            <motion.span 
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="block font-extralight text-zinc-400"
            >
              Design Your
            </motion.span>
            <motion.span 
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="block font-bold tracking-tight bg-gradient-to-r from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent"
            >
              Future Home
            </motion.span>
          </h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
            className="text-xs lg:text-sm text-zinc-400 leading-relaxed font-light mb-8 lg:mb-10"
          >
            Customize layouts, explore real-time floor plans, and experience immersive architectural visualization through an interactive smart home configurator.
          </motion.p>

          {/* Premium Configuration Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
            className="flex flex-col gap-3 w-full"
          >
            {['Turn Key Build', 'Young Professional Build', 'Private Purchase'].map((label) => (
              <button
                key={label}
                disabled
                className="group relative flex items-center justify-between w-full h-12 px-5 rounded-xl border border-white/5 bg-white/[0.01] backdrop-blur-md text-zinc-500 cursor-not-allowed overflow-hidden transition-all duration-500 hover:border-white/10 hover:bg-white/[0.03]"
              >
                <span className="relative z-10 text-[9px] font-bold tracking-[0.2em] uppercase text-zinc-400 group-hover:text-zinc-300 transition-colors duration-300">{label}</span>
                <div className="relative z-10 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500/60 animate-pulse" />
                  <span className="text-[8px] font-bold uppercase tracking-widest text-amber-500/70">Soon</span>
                </div>
                {/* Micro reflection shimmer */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
              </button>
            ))}

            {/* Dominant Primary "Build Your Own" Button */}
            <motion.button
              onClick={handleStart}
              disabled={isBuilding}
              onMouseMove={handleBtnMouseMove}
              onMouseLeave={handleBtnMouseLeave}
              animate={{ x: btnOffset.x, y: btnOffset.y }}
              transition={{ type: "spring", stiffness: 150, damping: 15 }}
              className="group relative inline-flex w-full h-14 items-center justify-center gap-3 overflow-hidden rounded-xl bg-white text-xs font-bold text-zinc-950 transition-all duration-500 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] active:scale-[0.98] disabled:scale-100 disabled:opacity-90 mt-2 border border-white/15"
            >
              {isBuilding ? (
                <div className="flex items-center justify-center gap-3">
                  <HouseBlueprintSVG />
                  <span className="font-bold tracking-[0.2em] uppercase text-zinc-950 animate-pulse">Constructing...</span>
                </div>
              ) : (
                <>
                  <span className="relative font-bold tracking-[0.25em] uppercase">Build Your Own</span>
                  <ArrowRight className="relative transition-transform duration-500 group-hover:translate-x-1.5 text-zinc-900" size={16} />
                  
                  {/* Glowing sweep highlights */}
                  <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-12deg)_translateX(-100%)] group-hover:duration-1000 group-hover:[transform:skew(-12deg)_translateX(100%)]">
                    <div className="relative h-full w-12 bg-zinc-950/5" />
                  </div>
                </>
              )}
            </motion.button>

            {onExplore && (
              <button
                onClick={onExplore}
                className="w-full text-center py-2.5 text-[9px] font-bold tracking-[0.25em] uppercase text-zinc-500 hover:text-zinc-300 transition-colors duration-300 mt-1"
              >
                Direct Architectural Overview
              </button>
            )}
          </motion.div>
        </div>

        {/* Footer info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.8 }}
          className="text-[8px] uppercase tracking-widest text-zinc-600 mt-6 lg:mt-0"
        >
          Powered by Advanced Visualization Technology
        </motion.div>
      </div>

      {/* Right Side Visual Area (Fully displays the house render without sidebar crop) */}
      <div className="flex-1 min-h-[45vh] lg:min-h-0 lg:h-full relative overflow-hidden bg-[#0c0c0e] z-10 border-t lg:border-t-0 border-white/5">
        
        {/* Ambient Vignette Overlay (Local to Right Panel) */}
        <div className="absolute inset-0 z-20 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_45%,rgba(0,0,0,0.5)_100%)]" />

        {/* Parallax Background Frame */}
        <div className="absolute inset-0 z-0 overflow-hidden w-full h-full">
          <motion.div
            style={{
              x: translateX,
              y: translateY,
              rotateX: rotateX,
              rotateY: rotateY,
              transformPerspective: 1200
            }}
            className="w-[106%] h-[106%] -left-[3%] -top-[3%] absolute"
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
              className="w-full h-full object-cover select-none filter brightness-[0.88] contrast-[1.03] object-center"
            />
            
            {/* Gradients and light overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/10 mix-blend-multiply pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#09090b]/15 via-transparent to-[#09090b]/10 pointer-events-none" />

            {/* Ambient Lighting Accents */}
            <div className="absolute top-[25%] right-[25%] w-[350px] h-[350px] bg-amber-500/[0.04] rounded-full filter blur-[100px] pointer-events-none animate-ambient-glow-pulse" />
            <div className="absolute bottom-[25%] right-[15%] w-[400px] h-[400px] bg-cyan-500/[0.03] rounded-full filter blur-[120px] pointer-events-none animate-ambient-glow-pulse" style={{ animationDelay: '-4s' }} />

            {/* Dotted micro architectural grid overlay */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' xmlns=\'svg\'%3E%3Cpath d=\'M39 0h1v1h-1V0zM0 39h1v1H0v-1z\' fill=\'%23ffffff\' fill-opacity=\'0.045\' fill-rule=\'evenodd\'/%3E%3C/svg%3E')] pointer-events-none" />
          </motion.div>
        </div>

        {/* Blueprint Grid Scanner (Active during transition) */}
        <AnimatePresence>
          {isBuilding && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.16 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 z-10 bg-[linear-gradient(to_right,rgba(34,211,238,0.2)_1px,transparent_1px),linear-gradient(to_bottom,rgba(34,211,238,0.2)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"
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
              className="absolute left-0 right-0 h-1.5 bg-cyan-400/90 shadow-[0_0_20px_#22d3ee,0_0_40px_#22d3ee] z-25 pointer-events-none"
            />
          )}
        </AnimatePresence>

        {/* Interactive Architectural HUD Overlays (Desktop Only) */}
        <div className="absolute inset-0 z-10 hidden lg:block pointer-events-none">
          {HUD_NODES.map((node) => {
            const isHovered = activeHud === node.id;
            return (
              <motion.div
                key={node.id}
                className="absolute pointer-events-auto"
                style={{ left: `${node.x}%`, top: `${node.y}%` }}
                onMouseEnter={() => setActiveHud(node.id)}
                onMouseLeave={() => setActiveHud(null)}
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: node.id * 0.4 }}
              >
                {/* Trigger Pulse Beacon */}
                <div className="relative flex items-center justify-center w-6 h-6 -left-3 -top-3 cursor-pointer group">
                  <span className="absolute w-2 h-2 rounded-full bg-cyan-400 transition-transform duration-300 group-hover:scale-150" />
                  <span className="absolute w-4 h-4 rounded-full bg-cyan-400/40 animate-pulse-ring-luxury" />
                  <span className="absolute w-6 h-6 rounded-full border border-cyan-400/20 scale-75 group-hover:scale-100 transition-transform duration-300" />
                </div>

                {/* Detail Info Card */}
                <AnimatePresence>
                  {isHovered && (
                    <motion.div
                      initial={{ 
                        opacity: 0, 
                        scale: 0.95, 
                        y: node.lineAngle.includes('top') ? 6 : -6 
                      }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ 
                        opacity: 0, 
                        scale: 0.95, 
                        y: node.lineAngle.includes('top') ? 6 : -6 
                      }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      className={`absolute z-30 w-64 p-4 rounded-xl glass-dark-hud border border-cyan-400/20 shadow-[0_0_25px_rgba(34,211,238,0.15)] pointer-events-auto
                        ${node.lineAngle === 'top-right' ? 'left-6 bottom-6 origin-bottom-left' : ''}
                        ${node.lineAngle === 'bottom-right' ? 'left-6 top-6 origin-top-left' : ''}
                        ${node.lineAngle === 'top-left' ? 'right-6 bottom-6 origin-bottom-right' : ''}
                        ${node.lineAngle === 'bottom-left' ? 'right-6 top-6 origin-top-right' : ''}
                      `}
                      style={{
                        transformOrigin: node.lineAngle === 'top-right' ? 'bottom left' : 
                                         node.lineAngle === 'bottom-right' ? 'top left' :
                                         node.lineAngle === 'top-left' ? 'bottom right' : 'top right'
                      }}
                    >
                      {/* SVG Dotted Line Connector */}
                      <svg 
                        width="24" 
                        height="24" 
                        className={`absolute pointer-events-none
                          ${node.lineAngle === 'top-right' ? 'left-[-24px] bottom-[-24px]' : ''}
                          ${node.lineAngle === 'bottom-right' ? 'left-[-24px] top-[-24px]' : ''}
                          ${node.lineAngle === 'top-left' ? 'right-[-24px] bottom-[-24px]' : ''}
                          ${node.lineAngle === 'bottom-left' ? 'right-[-24px] top-[-24px]' : ''}
                        `}
                      >
                        <motion.path 
                          d={
                            node.lineAngle === 'top-right' ? "M 0 24 L 24 0" :
                            node.lineAngle === 'bottom-right' ? "M 0 0 L 24 24" :
                            node.lineAngle === 'top-left' ? "M 24 24 L 0 0" :
                            "M 24 0 L 0 24"
                          }
                          stroke="rgba(34, 211, 238, 0.7)" 
                          strokeWidth="1.5" 
                          strokeDasharray="3 3"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 0.3 }}
                        />
                      </svg>
                      
                      <div className="flex items-center gap-2 mb-2">
                        <span className="p-1 rounded bg-cyan-950/60 text-cyan-400 border border-cyan-500/30">
                          {renderIcon(node.icon, 14)}
                        </span>
                        <span className="text-[10px] font-bold tracking-wider uppercase text-zinc-100">{node.title}</span>
                      </div>
                      <p className="text-[10px] text-zinc-300 leading-relaxed font-light">{node.desc}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {/* Floating HUD Helper Banner */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1 }}
          className="absolute bottom-6 right-8 z-30 hidden lg:flex items-center gap-2 bg-black/40 backdrop-blur-md border border-white/5 px-4 py-2 rounded-full text-[9px] tracking-widest uppercase text-zinc-400"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span>Hover beacons to inspect blueprint</span>
        </motion.div>

      </div>

      {/* Mobile Tech Specs Carousel (Visible under side-panel content on smaller screens) */}
      <div className="lg:hidden p-6 sm:p-8 bg-[#09090b] border-t border-white/5 relative z-20 w-full shrink-0">
        <div className="text-[9px] font-bold tracking-[0.2em] uppercase text-zinc-500 mb-3">
          Architectural Blueprint Details
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide snap-x">
          {HUD_NODES.map((node) => (
            <div 
              key={node.id} 
              className="flex-shrink-0 w-64 snap-start p-4 rounded-xl glass-dark-card border border-white/5"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="p-1 rounded bg-zinc-900 text-cyan-400">
                  {renderIcon(node.icon, 14)}
                </span>
                <span className="text-xs font-semibold tracking-wider text-zinc-200">{node.title}</span>
              </div>
              <p className="text-[10px] text-zinc-400 leading-relaxed font-light">{node.desc}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
