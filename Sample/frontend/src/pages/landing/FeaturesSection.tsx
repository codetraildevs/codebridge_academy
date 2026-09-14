import {
  Lightbulb,
  Code2,
  Mic,
  Shield,
  Users,
  BarChart3,
  FileCheck,
  Network,
  LayoutGrid,
} from 'lucide-react';
import { cn } from '@utils/cn';
import { motion } from 'framer-motion';
import { SectionContainer } from '@components/ui/section-container';

interface FeatureCardProps {
  icon: typeof Lightbulb;
  title: string;
  description: string;
  iconBg: string;
  iconColor: string;
  accentBar: string;
}

const features: FeatureCardProps[] = [
  {
    icon: Lightbulb,
    title: 'AI-Powered Assessment',
    description: 'Automated code evaluation, ERD analysis, and rubric matching with intelligent scoring and feedback generation.',
    iconBg: 'bg-primary-100',
    iconColor: 'text-primary-600',
    accentBar: 'bg-primary-500',
  },
  {
    icon: Code2,
    title: 'Practical Workspaces',
    description: 'Built-in ERD designer, code editor with Monaco, database workspace, and topology builder for hands-on assessments.',
    iconBg: 'bg-accent-100',
    iconColor: 'text-accent-600',
    accentBar: 'bg-accent-500',
  },
  {
    icon: Mic,
    title: 'AI Oral Defense',
    description: 'Speech-to-text powered oral examinations with AI-generated questions and real-time response evaluation.',
    iconBg: 'bg-secondary-100',
    iconColor: 'text-secondary-600',
    accentBar: 'bg-secondary-500',
  },
  {
    icon: Shield,
    title: 'Anti-Cheating System',
    description: 'Comprehensive proctoring with tab-switch detection, plagiarism checking, activity logging, and risk scoring.',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    accentBar: 'bg-amber-500',
  },
  {
    icon: FileCheck,
    title: 'Digital Certificates',
    description: 'Blockchain-ready digital certificates with QR verification, secure sharing, and competency breakdowns.',
    iconBg: 'bg-cyan-100',
    iconColor: 'text-cyan-600',
    accentBar: 'bg-cyan-500',
  },
  {
    icon: Users,
    title: 'Interview Management',
    description: 'Structured interview templates, AI-scored responses, scheduling, and collaborative evaluation workflows.',
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-600',
    accentBar: 'bg-rose-500',
  },
  {
    icon: BarChart3,
    title: 'Skills Intelligence',
    description: 'Advanced analytics with competency mapping, skills gap analysis, national-level reporting, and trend insights.',
    iconBg: 'bg-secondary-100',
    iconColor: 'text-secondary-600',
    accentBar: 'bg-secondary-500',
  },
  {
    icon: Network,
    title: 'Multi-Tenant Platform',
    description: 'Unified organization management supporting schools, universities, companies, and government agencies on one platform.',
    iconBg: 'bg-primary-100',
    iconColor: 'text-primary-400',
    accentBar: 'bg-primary-400',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] },
  },
};

export function FeaturesSection() {
  return (
    <section id="features" className="relative bg-surface-secondary py-16 sm:py-24 overflow-hidden">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary-100/50 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-accent-100/50 blur-3xl" />
      </div>

      <SectionContainer>
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-3xl text-center"
        >
          <h2 className="landing-section-heading text-3xl font-bold text-text-primary sm:text-4xl">
            Everything you need for modern{' '}
            <span className="text-primary-600">
              competency assessment
            </span>
          </h2>
          <p className="landing-subheading mt-4 text-text-secondary">
            Built for modern assessment teams — from AI scoring to secure verification, all in one platform.
          </p>
        </motion.div>

        {/* Features grid */}
        <motion.div
          className="mt-12 sm:mt-16 grid gap-5 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
        >
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                variants={cardVariants}
                className={cn(
                  'group relative overflow-hidden rounded-2xl border border-border/60 bg-white p-5 sm:p-6',
                  'transition-all duration-300 ease-out',
                  'hover:shadow-elevation-medium hover:-translate-y-1',
                  'hover:border-transparent',
                )}
              >
                {/* Hover background */}
                <div
                  className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-surface-tertiary"
                />

                {/* Content */}
                <div className="relative">
                  <div
                    className={cn(
                      'mb-3 sm:mb-4 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-110 group-hover:shadow-md',
                      feature.iconBg,
                    )}
                  >
                    <Icon className={cn('h-6 w-6 transition-transform duration-300 group-hover:scale-110', feature.iconColor)} />
                  </div>
                  <h3 className="mb-2 text-base font-semibold text-text-primary">
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-text-secondary">
                    {feature.description}
                  </p>
                </div>

                {/* Bottom accent bar */}
                <div
                  className={cn(
                    'absolute bottom-0 left-0 right-0 h-1 scale-x-0 transition-transform duration-300 ease-out group-hover:scale-x-100',
                    feature.accentBar,
                  )}
                />

                {/* Corner accent */}
                <div className="absolute -top-6 -right-6 h-12 w-12 rounded-full transition-all duration-300 group-hover:bg-primary-100/50" />
              </motion.div>
            );
          })}
        </motion.div>
      </SectionContainer>
    </section>
  );
}

export default FeaturesSection;
