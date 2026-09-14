import { useEffect, useRef, useState, type ComponentType } from 'react';
import { cn } from '@utils/cn';
import { motion, useInView } from 'framer-motion';
import { SectionContainer } from '@components/ui/section-container';
import { Building2, Users, FileCheck, Star } from 'lucide-react';

interface StatItemProps {
  value: number;
  suffix?: string;
  prefix?: string;
  label: string;
  description?: string;
  icon: ComponentType<{ className?: string }>;
}

function AnimatedCounter({ value, suffix = '', prefix = '' }: { value: number; suffix?: string; prefix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  useEffect(() => {
    if (!inView) return;

    const duration = 2000;
    const steps = 60;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [inView, value]);

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  );
}

const stats: StatItemProps[] = [
  { value: 50, suffix: '+', label: 'Organizations', description: 'TVET schools, universities, and companies', icon: Building2 },
  { value: 10000, suffix: '+', label: 'Candidates Assessed', description: 'Across 6 trades and growing', icon: Users },
  { value: 500, suffix: '+', label: 'Exams Created', description: 'Practical and theoretical assessments', icon: FileCheck },
  { value: 95, suffix: '%', label: 'Satisfaction Rate', description: 'From organizations and candidates', icon: Star },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
};

export function StatsSection() {
  return (
    <section className="relative border-b border-border/50 bg-gradient-to-b from-amber-50/40 to-white py-16 sm:py-20">
      {/* Decorative top border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-border/60" />

      <SectionContainer>
        <motion.div
          className="grid grid-cols-2 gap-8 lg:grid-cols-4"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
        >
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                variants={itemVariants}
                className="group relative text-center"
              >
                {/* Divider */}
                {i < stats.length - 1 && (
                  <div className="absolute -right-4 top-1/2 hidden h-16 w-px -translate-y-1/2 bg-border/60 lg:block" />
                )}

                {/* Icon */}
                <div className="mb-3 inline-flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-amber-100 shadow-sm transition-all duration-300 group-hover:shadow-md group-hover:scale-110">
                  <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600" />
                </div>

                {/* Counter */}
                <div className="text-3xl font-bold text-text-primary sm:text-4xl sm:leading-tight lg:text-5xl">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} prefix={stat.prefix} />
                </div>
                <p className="mt-2 text-sm font-semibold text-text-primary">{stat.label}</p>
                <p className="mt-1 text-xs text-text-tertiary">{stat.description}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </SectionContainer>
    </section>
  );
}

export default StatsSection;
