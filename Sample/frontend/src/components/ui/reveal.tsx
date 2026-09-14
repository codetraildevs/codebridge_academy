import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  duration?: number;
}

const directionOffset = {
  up: { y: 60 },
  down: { y: -60 },
  left: { x: -60 },
  right: { x: 60 },
};

/**
 * Reusable scroll-reveal wrapper.
 * Animates children from hidden to visible when they enter the viewport.
 * Plays once (viewport={{ once: true }}).
 */
export function Reveal({
  children,
  className,
  delay = 0,
  direction = 'up',
  duration = 0.7,
}: RevealProps) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        ...directionOffset[direction],
      }}
      whileInView={{
        opacity: 1,
        x: 0,
        y: 0,
      }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{
        duration,
        delay,
        ease: [0.25, 0.1, 0.25, 1], // cubic-bezier ease-in-out
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default Reveal;
