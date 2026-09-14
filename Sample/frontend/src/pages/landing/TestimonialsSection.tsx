import { Star, Quote, Sparkles } from 'lucide-react';
import { cn } from '@utils/cn';
import { motion } from 'framer-motion';
import { SectionContainer } from '@components/ui/section-container';

interface Testimonial {
  quote: string;
  name: string;
  role: string;
  organization: string;
  initials: string;
  initialsBg: string;
  accentBar: string;
  color: string;
}

const testimonials: Testimonial[] = [
  {
    quote: 'Qualexas has completely transformed how we assess our TVET students. The AI-powered code evaluation and oral defense features have reduced our assessment time by 70% while improving accuracy.',
    name: 'Dr. Jean Pierre Habimana',
    role: 'Director of Academics',
    organization: 'Rwanda Polytechnic',
    initials: 'JH',
    initialsBg: 'bg-primary-100 text-primary-700',
    accentBar: 'bg-primary-500',
    color: 'primary',
  },
  {
    quote: "The platform's multi-tenant architecture allows us to manage assessments across multiple partner schools seamlessly. The digital certificates with QR verification have been a game-changer for our certification process.",
    name: 'Alice Uwimana',
    role: 'CEO',
    organization: 'Workforce Development Authority (WDA)',
    initials: 'AU',
    initialsBg: 'bg-accent-100 text-accent-700',
    accentBar: 'bg-accent-500',
    color: 'accent',
  },
  {
    quote: "We've been able to scale our technical recruitment process efficiently using Qualexas. The interview templates and AI-scored responses help us identify top talent faster than ever before.",
    name: 'Patrick Mugisha',
    role: 'Head of Talent Acquisition',
    organization: 'MTN Rwanda',
    initials: 'PM',
    initialsBg: 'bg-secondary-100 text-secondary-700',
    accentBar: 'bg-secondary-500',
    color: 'secondary',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.1 },
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

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="relative bg-surface-secondary py-16 sm:py-24 overflow-hidden">
      {/* Background decorations */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-secondary-50 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-primary-50 blur-3xl" />
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
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-secondary-200 bg-secondary-50 px-4 py-1.5 text-sm font-medium text-secondary-700">
            <Quote className="h-4 w-4" />
            Testimonials
          </div>
          <h2 className="landing-section-heading text-3xl font-normal text-text-primary sm:text-4xl" style={{ fontFamily: 'Kaio, PPMori, sans-serif' }}>
            Success Stories
          </h2>
          <p className="landing-subheading mt-4 text-text-secondary">
            See how organizations across Rwanda are using Qualexas to transform their competency
            assessment processes.
          </p>
        </motion.div>

        {/* Testimonial cards */}
        <motion.div
          className="mt-12 sm:mt-16 grid gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-3"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
        >
          {testimonials.map((t) => (
            <motion.div
              key={t.name}
              variants={cardVariants}
              className={cn(
                'group relative overflow-hidden rounded-2xl border border-border/60 bg-white p-5 sm:p-6',
                'transition-all duration-300 ease-out',
                'hover:shadow-elevation-medium hover:-translate-y-1',
              )}
            >
              {/* Top accent line */}
              <div
                className={cn(
                  'absolute top-0 left-0 right-0 h-1 opacity-80',
                  t.accentBar,
                )}
              />

              {/* Quote mark */}
              <div className="absolute -top-3 -right-3 text-6xl font-serif text-slate-100 select-none">
                &ldquo;
              </div>

              {/* Stars */}
              <div className="mb-4 flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <motion.div
                    key={star}
                    initial={{ opacity: 0, scale: 0 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 * star }}
                  >
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  </motion.div>
                ))}
              </div>

              {/* Quote */}
              <blockquote className="mb-6 text-sm leading-relaxed text-text-secondary">
                &ldquo;{t.quote}&rdquo;
              </blockquote>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold shadow-sm transition-transform duration-300 group-hover:scale-110',
                    t.initialsBg,
                  )}
                >
                  {t.initials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary">{t.name}</p>
                  <p className="text-xs text-text-tertiary">
                    {t.role}, {t.organization}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Partner highlight — subtle reference to the dedicated section above */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-16 text-center"
        >
          <p className="text-xs font-medium uppercase tracking-widest text-text-tertiary">
            Part of a growing network of{' '}
            <a
              href="#partners"
              className="text-primary-600 hover:text-primary-700 underline-offset-2 hover:underline transition-colors"
            >
              trusted partner institutions
            </a>{' '}
            across East Africa.
          </p>
        </motion.div>
      </SectionContainer>
    </section>
  );
}

export default TestimonialsSection;
