import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@utils/cn';

interface ScrollToTopProps {
  /** Offset from bottom in pixels */
  offset?: number;
  /** Scroll threshold before button appears */
  threshold?: number;
  /** Additional classes */
  className?: string;
}

/**
 * Floating "Back to Top" button.
 * Appears on the bottom-right after scrolling past the threshold.
 * Smoothly scrolls to the top of the page on click.
 */
export function ScrollToTop({
  offset = 32,
  threshold = 400,
  className,
}: ScrollToTopProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > threshold);
    };

    // Check initial position
    handleScroll();

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.5, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.5, y: 20 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          onClick={scrollToTop}
          aria-label="Scroll to top"
          className={cn(
            'fixed z-50 flex items-center justify-center rounded-2xl shadow-lg',
            'bg-[#2965ff] text-white',
            'hover:bg-[#2965ff] hover:shadow-xl',
            'focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2',
            'transition-shadow duration-200',
            className,
          )}
          style={{ bottom: offset, right: offset }}
        >
          <div className="flex h-11 w-11 items-center justify-center sm:h-12 sm:w-12">
            <ArrowUp className="h-5 w-5 sm:h-5 sm:w-5" />
          </div>
        </motion.button>
      )}
    </AnimatePresence>
  );
}

export default ScrollToTop;
