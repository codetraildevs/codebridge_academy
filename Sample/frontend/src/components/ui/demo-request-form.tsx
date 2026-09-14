import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@utils/cn';
import { Button } from './button';

// ─── Zod validation schema ─────────────────────────────
const demoRequestSchema = z.object({
  email: z
    .string()
    .min(1, 'Email address is required')
    .email('Please enter a valid email address'),
});

export type DemoRequestFormData = z.infer<typeof demoRequestSchema>;

// ─── Props ────────────────────────────────────────────
export interface DemoRequestFormProps {
  /** Path to navigate to after successful submission (default: /auth/register/organization) */
  redirectTo?: string;
  /** Optional callback invoked on successful submission */
  onSuccess?: (data: DemoRequestFormData) => void;
  /** Additional classes for the outer form container */
  className?: string;
  /** Override the submit button text */
  submitLabel?: string;
  /** Override the placeholder text */
  placeholder?: string;
}

// ─── Animation variants ───────────────────────────────
const successIconVariants = {
  initial: { scale: 0 },
  animate: {
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 500, damping: 20 },
  },
};

const errorIconVariants = {
  initial: { opacity: 0, scale: 0.5 },
  animate: { opacity: 1, scale: 1 },
};

const errorMessageVariants = {
  initial: { opacity: 0, y: -4, height: 0 },
  animate: { opacity: 1, y: 0, height: 'auto' },
  exit: { opacity: 0, y: -4, height: 0 },
};

// ─── Component ────────────────────────────────────────
export function DemoRequestForm({
  redirectTo = '/auth/register/organization',
  onSuccess,
  className,
  submitLabel = 'Request Demo',
  placeholder = 'Enter your work email',
}: DemoRequestFormProps) {
  const navigate = useNavigate();
  const [isSending, setIsSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const isSendingRef = React.useRef(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DemoRequestFormData>({
    resolver: zodResolver(demoRequestSchema),
    mode: 'onBlur',
  });

  const onSubmit = (data: DemoRequestFormData) => {
    // Guard against double-submit (e.g., rapid Enter key presses)
    if (isSendingRef.current) return;
    isSendingRef.current = true;

    setIsSending(true);
    onSuccess?.(data);

    // Show spinner for 600ms, then success for 900ms, then redirect
    setTimeout(() => {
      setIsSending(false);
      setSubmitted(true);

      setTimeout(() => {
        navigate(redirectTo);
      }, 900);
    }, 600);
  };

  const formId = React.useId();
  const emailErrorId = `${formId}-email-error`;

  return (
    <div className={className}>
      <AnimatePresence mode="wait">
        {submitted ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex items-center justify-center gap-3 rounded-xl border border-accent-200 bg-accent-50 p-4"
          >
            <motion.div
              variants={successIconVariants}
              initial="initial"
              animate="animate"
            >
              <CheckCircle2 className="h-5 w-5 text-accent-600" />
            </motion.div>
            <p className="text-sm font-medium text-accent-800">
              Thank you! Redirecting you to get started...
            </p>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onSubmit={handleSubmit(onSubmit)}
            noValidate
          >
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <input
                  id={`${formId}-email`}
                  type="email"
                  autoComplete="email"
                  placeholder={placeholder}
                  {...register('email')}
                  className={cn(
                    'w-full rounded-lg border bg-white px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary',
                    'transition-all duration-200',
                    'focus:outline-none focus:ring-2',
                    errors.email
                      ? 'border-error focus:border-error focus:ring-error/20'
                      : 'border-gray-300 focus:border-[#2965ff] focus:ring-[#2965ff]/20',
                  )}
                  aria-invalid={errors.email ? 'true' : 'false'}
                  aria-describedby={errors.email ? emailErrorId : undefined}
                />
                {/* Error icon */}
                {errors.email && (
                  <motion.div
                    variants={errorIconVariants}
                    initial="initial"
                    animate="animate"
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    <AlertCircle className="h-4 w-4 text-error" />
                  </motion.div>
                )}
              </div>
              <Button
                variant="primary"
                size="lg"
                disabled={isSending}
                className="group shrink-0 shadow-lg transition-all duration-200"
                style={{
                  // Derive min-width from the longer of submitLabel and 'Sending...' to prevent layout shift
                  minWidth: `${Math.max(submitLabel.length * 12 + 32, 152)}px`,
                }}
                type="submit"
              >
                <AnimatePresence mode="wait">
                  {isSending ? (
                    <motion.span
                      key="spinner"
                      initial={{ opacity: 0, scale: 0.6 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.6 }}
                      transition={{ duration: 0.15 }}
                      className="mr-1 inline-flex"
                    >
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </motion.span>
                  ) : (
                    <motion.span
                      key="send-icon"
                      initial={{ opacity: 0, scale: 0.6 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.6 }}
                      transition={{ duration: 0.15 }}
                      className="mr-1 inline-flex transition-transform duration-200 group-hover:translate-x-0.5"
                    >
                      <Send className="h-4 w-4" />
                    </motion.span>
                  )}
                </AnimatePresence>
                <AnimatePresence mode="wait">
                  {isSending ? (
                    <motion.span
                      key="submitting-text"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.15 }}
                    >
                      Sending...
                    </motion.span>
                  ) : (
                    <motion.span
                      key="submit-text"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.15 }}
                    >
                      {submitLabel}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Button>
            </div>

            {/* Error message */}
            <AnimatePresence mode="wait">
              {errors.email && (
                <motion.p
                  id={emailErrorId}
                  role="alert"
                  variants={errorMessageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.2 }}
                  className="mt-1.5 text-left text-xs font-medium text-error"
                >
                  {errors.email.message}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

export default DemoRequestForm;
