import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@components/ui/button';
import { User, Building2, Check, ArrowRight } from 'lucide-react';
import { cn } from '@utils/cn';

type AccountType = 'individual' | 'organization';

interface AccountOption {
  id: AccountType;
  title: string;
  description: string;
  icon: typeof User;
}

const accountOptions: AccountOption[] = [
  {
    id: 'individual',
    title: 'Individual',
    description: 'For students, graduates, job seekers, professionals, and self-learners',
    icon: User,
  },
  {
    id: 'organization',
    title: 'Enterprise',
    description: 'For TVET schools, universities, companies, government institutions, and training centers',
    icon: Building2,
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, delay: i * 0.1, ease: 'easeOut' },
  }),
};

export function RegisterPage() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<AccountType>('individual');

  const handleContinue = () => {
    if (selected === 'individual') {
      navigate('/auth/register/individual');
    } else {
      navigate('/auth/register/organization');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="text-center">
        <motion.h2
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-2xl font-bold tracking-tight text-[#000100] sm:text-3xl"
        >
          What kind of account would you open today?
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-2 text-sm text-[#b8b8b8]"
        >
          You can add another account later on, too.
        </motion.p>
      </div>

      {/* Account type options */}
      <div className="space-y-3">
        {accountOptions.map((option, i) => {
          const isSelected = selected === option.id;
          const Icon = option.icon;

          return (
            <motion.button
              key={option.id}
              custom={i}
              initial="hidden"
              animate="visible"
              variants={cardVariants}
              onClick={() => setSelected(option.id)}
              className={cn(
                'group relative w-full text-left rounded-xl border-0 p-4 sm:p-5 transition-all duration-200 cursor-pointer',
                isSelected
                  ? 'bg-[#f5f5f5]'
                  : 'bg-white hover:bg-[#f5f5f5]',
              )}
            >
              <div className="flex items-center gap-4">
                {/* Radio indicator */}
                <div className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200',
                  isSelected
                    ? 'border-[#000100] bg-[#000100]'
                    : 'border-[#b8b8b8]/50 bg-transparent',
                )}>
                  <AnimatePresence>
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                      >
                        <Check className="h-3 w-3 text-white" strokeWidth={3} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Icon */}
                <div className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-lg transition-colors duration-200',
                  isSelected ? 'bg-[#000100]/5 text-[#000100]' : 'bg-[#f5f5f5] text-[#b8b8b8]',
                )}>
                  <Icon className="h-5 w-5" />
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <h3 className={cn(
                    'text-base font-semibold transition-colors duration-200',
                    isSelected ? 'text-[#000100]' : 'text-[#000100]',
                  )}>
                    {option.title}
                  </h3>
                  <p className="mt-0.5 text-sm text-[#b8b8b8] leading-relaxed">
                    {option.description}
                  </p>
                </div>

                {/* Checkbox indicator */}
                <div className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all duration-200',
                  isSelected
                    ? 'border-[#000100] bg-[#000100]'
                    : 'border-[#b8b8b8]/50 bg-transparent',
                )}>
                  <AnimatePresence>
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                      >
                        <Check className="h-3 w-3 text-white" strokeWidth={3} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Continue button */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Button fullWidth size="lg" onClick={handleContinue}>
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </motion.div>

      {/* Sign in link */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-center text-sm text-[#b8b8b8]"
      >
        Already have an account?{' '}
        <Link to="/auth/login" className="font-medium text-[#000100] hover:underline transition-colors">
          Sign in
        </Link>
      </motion.p>
    </motion.div>
  );
}

export default RegisterPage;
