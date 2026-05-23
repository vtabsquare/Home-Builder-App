import { motion } from 'framer-motion';

interface GBTILogoMarkProps {
  size?: number;
  className?: string;
  animate?: boolean;
}

/**
 * GBTI brand icon — the dual-flame / leaf mark.
 * Updated to use the new brand logo image from the public folder.
 */
export const GBTILogoMark = ({ size = 60, className = '', animate = false }: GBTILogoMarkProps) => {
  const imgElement = (
    <img
      src="/gbti-logo.jpeg"
      alt="GBTI Logo"
      className={`${className} object-contain`}
      style={{
        width: size,
        height: 'auto',
      }}
    />
  );

  if (animate) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="inline-block"
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
  light?: boolean;          // true → text is white; false → text is dark
}

/**
 * Full GBTI logo: icon mark + "GBTI" wordmark.
 * Updated to render the logo mark directly since the new image already contains full branding.
 */
export const GBTILogoFull = ({ size = 44, className = '', animate = false }: GBTILogoFullProps) => {
  return <GBTILogoMark size={size} animate={animate} className={className} />;
};
