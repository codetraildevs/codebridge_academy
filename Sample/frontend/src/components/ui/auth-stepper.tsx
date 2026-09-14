import { motion } from 'framer-motion';
import { cn } from '@utils/cn';

interface Step {
  id: string;
  label: string;
  description?: string;
}

interface AuthStepperProps {
  steps: Step[];
  currentStep: number;
  className?: string;
}

export function AuthStepper({ steps, currentStep, className }: AuthStepperProps) {
  return (
    <div className={cn('w-full', className)}>
      {/* Desktop: thin progress line with labels */}
      <div className="hidden sm:block">
        <div className="relative mb-8">
          {/* Track */}
          <div className="h-px w-full bg-[#b8b8b8]/40" />
          {/* Fill */}
          <motion.div
            className="absolute left-0 top-0 h-px bg-[#000100]"
            initial={false}
            animate={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
            transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          />
          {/* Step markers */}
          <div className="absolute inset-0 flex items-center justify-between">
            {steps.map((step, index) => {
              const isCompleted = index < currentStep;
              const isCurrent = index === currentStep;
              return (
                <div key={step.id} className="relative flex flex-col items-center">
                  <motion.div
                    initial={false}
                    animate={{
                      scale: isCurrent ? 1 : 0.8,
                      opacity: isCompleted || isCurrent ? 1 : 0.4,
                    }}
                    transition={{ duration: 0.3 }}
                    className={cn(
                      'relative z-10 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-medium transition-colors duration-300',
                      isCompleted && 'bg-[#000100] text-white',
                      isCurrent && 'bg-[#000100] text-white',
                      !isCompleted && !isCurrent && 'bg-white text-[#b8b8b8] border border-[#b8b8b8]/40',
                    )}
                  >
                    {index + 1}
                  </motion.div>
                  {/* Label below marker */}
                  <div className="absolute top-8 whitespace-nowrap">
                    <p
                      className={cn(
                        'text-[11px] font-medium tracking-wide transition-colors duration-300',
                        (isCompleted || isCurrent) ? 'text-[#000100]' : 'text-[#b8b8b8]',
                      )}
                    >
                      {step.label}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile: compact text indicator */}
      <div className="sm:hidden mb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-[#000100]">
            Step {currentStep + 1} of {steps.length}
          </p>
          <p className="text-xs text-[#b8b8b8]">
            {steps[currentStep]?.label}
          </p>
        </div>
        <div className="h-px w-full bg-[#b8b8b8]/30">
          <motion.div
            className="h-px bg-[#000100]"
            initial={false}
            animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          />
        </div>
      </div>
    </div>
  );
}

export default AuthStepper;
