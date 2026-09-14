import type { ReactNode } from 'react';
import { cn } from '@utils/cn';

interface SectionContainerProps {
  children: ReactNode;
  /** Additional classes merged onto the container */
  className?: string;
  /** Optional id for scroll-anchor targeting */
  id?: string;
  /** When true, adds `relative` positioning (default: true) */
  relative?: boolean;
}

/**
 * Shared responsive content container for landing page sections.
 * Provides `mx-auto max-w-7xl px-4 sm:px-6 lg:px-8` so every section
 * has consistent horizontal spacing across breakpoints.
 *
 * Usage:
 * ```tsx
 * <section className="relative py-16 sm:py-24">
 *   <SectionContainer>
 *     {children}
 *   </SectionContainer>
 * </section>
 * ```
 */
export function SectionContainer({
  children,
  className,
  id,
  relative = true,
}: SectionContainerProps) {
  return (
    <div
      id={id}
      className={cn(
        'mx-auto max-w-7xl px-4 sm:px-6 lg:px-8',
        relative && 'relative',
        className,
      )}
    >
      {children}
    </div>
  );
}

export default SectionContainer;
