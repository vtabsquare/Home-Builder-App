import { motion } from 'framer-motion';

interface GBTILogoMarkProps {
  size?: number;
  className?: string;
  animate?: boolean;
}

/**
 * GBTI brand icon — the dual-flame / leaf mark.
 * Colours: dark blue (#0057A4) upper · teal (#00A1B3) lower.
 */
export const GBTILogoMark = ({ size = 60, className = '', animate = false }: GBTILogoMarkProps) => {
  const height = size * 1.22; // aspect ~80:98

  const pathProps = animate
    ? {
        initial: { pathLength: 0, fillOpacity: 0 } as any,
        animate: { pathLength: 1, fillOpacity: 1 } as any,
      }
    : {};

  const UpperPath = animate ? motion.path : 'path';
  const LowerPath = animate ? motion.path : 'path';

  return (
    <svg
      width={size}
      height={height}
      viewBox="0 0 80 98"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Dark blue upper flame */}
      <UpperPath
        d="M40 2 C58 8, 72 28, 62 50 C55 62, 45 62, 40 50 C35 38, 22 32, 12 38 C2 44, 16 10, 40 2Z"
        fill="#0057A4"
        stroke="#0057A4"
        strokeWidth="0.5"
        {...pathProps}
        {...(animate ? { transition: { duration: 1.2, ease: 'easeInOut' } } : {})}
      />
      {/* Teal lower flame */}
      <LowerPath
        d="M40 96 C22 90, 8 70, 18 48 C25 36, 35 36, 40 48 C45 60, 58 66, 68 60 C78 54, 64 88, 40 96Z"
        fill="#00A1B3"
        stroke="#00A1B3"
        strokeWidth="0.5"
        {...pathProps}
        {...(animate ? { transition: { duration: 1.2, delay: 0.3, ease: 'easeInOut' } } : {})}
      />
    </svg>
  );
};

interface GBTILogoFullProps {
  size?: number;
  className?: string;
  animate?: boolean;
  light?: boolean;          // true → text is white; false → text is dark
}

/**
 * Full GBTI logo: icon mark + "GBTI" wordmark.
 */
export const GBTILogoFull = ({ size = 44, className = '', animate = false, light = true }: GBTILogoFullProps) => {
  const textColor = light ? '#ffffff' : '#0a0a0a';

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <GBTILogoMark size={size} animate={animate} />
      {animate ? (
        <motion.span
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="font-display font-bold tracking-tight"
          style={{ fontSize: size * 0.72, color: textColor }}
        >
          GBTI
        </motion.span>
      ) : (
        <span
          className="font-display font-bold tracking-tight"
          style={{ fontSize: size * 0.72, color: textColor }}
        >
          GBTI
        </span>
      )}
    </div>
  );
};
