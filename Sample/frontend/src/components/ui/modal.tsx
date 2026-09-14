import { useEffect, useCallback, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@utils/cn';

const modalSizes = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-[95vw] h-[90vh]',
} as const;

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: keyof typeof modalSizes;
  children: ReactNode;
  className?: string;
  showCloseButton?: boolean;
  closeOnOverlay?: boolean;
}

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const panelVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring', damping: 25, stiffness: 300 },
  },
  exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.15 } },
};

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  size = 'md',
  children,
  className,
  showCloseButton = true,
  closeOnOverlay = true,
}: ModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          {/* Overlay */}
          <motion.div
            key="modal-overlay"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeOnOverlay ? onClose : undefined}
          />

          {/* Panel */}
          <motion.div
            key="modal-panel"
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={cn(
              'relative w-full overflow-hidden rounded-2xl bg-white shadow-modal',
              modalSizes[size],
              className,
            )}
          >
            {/* Header */}
            {(title || showCloseButton) && (
              <div className="flex items-start justify-between border-b border-border px-6 py-4">
                <div className="min-w-0 flex-1 pr-4">
                  {title && (
                    <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
                  )}
                  {description && (
                    <p className="mt-0.5 text-sm text-text-tertiary">{description}</p>
                  )}
                </div>
                {showCloseButton && (
                  <button
                    onClick={onClose}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-tertiary transition-colors hover:bg-surface-tertiary hover:text-text-primary"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}

            {/* Content */}
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 8rem)' }}>
              <div className="px-6 py-4">{children}</div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default Modal;
