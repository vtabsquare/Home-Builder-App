import { motion } from 'framer-motion';

interface GBTILogoMarkProps {
  size?: number;
  className?: string;
  animate?: boolean;
}

/**
 * GBTI brand icon/logo component rendering the official /gbti-logo.png image.
 * Applies a premium saturation filter to soften the cyan presence.
 */
export const GBTILogoMark = ({ size = 24, className = '', animate = false }: GBTILogoMarkProps) => {
  const imgElement = (
    <img
      src="/gbti-logo.png"
      alt="GBTI Logo"
      className={`${className} object-contain flex-shrink-0`}
      style={{
        height: `${size}px`,
        width: 'auto',
        filter: 'saturate(0.7) brightness(0.92)',
      }}
    />
  );

  if (animate) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="inline-block flex-shrink-0 animate-logo"
      >
        {imgElement}
      </motion.div>
    );
  }

  return imgElement;
};

interface GBTILogoFullProps {
  size?: number;
  className?: string;
  animate?: boolean;
}

/**
 * Full GBTI logo.
 */
export const GBTILogoFull = ({ size = 24, className = '', animate = false }: GBTILogoFullProps) => {
  return <GBTILogoMark size={size} animate={animate} className={className} />;
};
