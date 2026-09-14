import { Handshake, ArrowRight, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@components/ui/button';
import { SectionContainer } from '@components/ui/section-container';
import { PartnerLogoImage, partnerSlugs, fallbackLogos, RwandaPolytechnicLogo } from '@components/ui/partner-logos';

interface Partner {
  name: string;
  abbr: string;
  description: string;
  bgLight: string;
  accentColor: string;
  badgeBg: string;
  slug: string;
}

const partners: Partner[] = [
  {
    name: 'Rwanda Polytechnic',
    abbr: 'RP',
    description: 'Leading TVET institution',
    bgLight: 'bg-primary-50',
    accentColor: 'bg-primary-500',
    badgeBg: 'bg-primary-600',
    slug: 'Rwanda Polytechnic',
  },
  {
    name: 'Rwanda TVET Board',
    abbr: 'RTB',
    description: 'National TVET authority',
    bgLight: 'bg-accent-50',
    accentColor: 'bg-accent-500',
    badgeBg: 'bg-accent-600',
    slug: 'Rwanda TVET Board',
  },
  {
    name: 'MTN Rwanda',
    abbr: 'MTN',
    description: 'Telecommunications leader',
    bgLight: 'bg-secondary-50',
    accentColor: 'bg-secondary-500',
    badgeBg: 'bg-secondary-600',
    slug: 'MTN Rwanda',
  },
  {
    name: 'CodeBridge Academy',
    abbr: 'CBA',
    description: 'Tech education hub',
    bgLight: 'bg-primary-50',
    accentColor: 'bg-primary-500',
    badgeBg: 'bg-primary-600',
    slug: 'CodeBridge Academy',
  },
  {
    name: 'NESA',
    abbr: 'NESA',
    description: 'National exam authority',
    bgLight: 'bg-accent-50',
    accentColor: 'bg-accent-500',
    badgeBg: 'bg-accent-600',
    slug: 'NESA',
  },
  {
    name: 'IPRC Kigali',
    abbr: 'IPRC',
    description: 'Integrated Polytechnic college',
    bgLight: 'bg-secondary-50',
    accentColor: 'bg-secondary-500',
    badgeBg: 'bg-secondary-600',
    slug: 'IPRC Kigali',
  },
];

// ─── Seamless infinite scroll animation ────────
// Duplicate partners array for seamless loop
const allPartners = [...partners, ...partners];

const marqueeVariants = {
  animate: {
    x: [0, -2000], // Approx. 6 cards × (300px + 24px gap) for seamless loop
    transition: {
      x: {
        duration: 60,
        repeat: Infinity,
        ease: 'linear',
        repeatType: 'loop',
      },
    },
  },
};

export function PartnersSection() {
  return (
    <section id="partners" className="relative bg-white py-16 sm:py-24 overflow-hidden">
      {/* Background decorations */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 bg-primary-50/30 blur-3xl" />
        <div className="absolute right-0 bottom-0 h-64 w-64 rounded-full bg-secondary-50/30 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full bg-primary-50/20 blur-3xl" />
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
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-4 py-1.5 text-sm font-medium text-primary-700">
            <Handshake className="h-4 w-4" />
            <span>Trusted Partners</span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl lg:text-5xl">
            Trusted by{' '}
            <span className="text-primary-600">
              leading institutions
            </span>
          </h2>
          <p className="mt-4 text-lg text-text-secondary">
            Organizations across East Africa rely on Qualexas to power their competency assessment
            and skills verification programs.
          </p>
        </motion.div>

        {/* ── Infinite Horizontal Marquee ── */}
        <div className="relative mt-12 sm:mt-16">
          {/* Scrollable viewport with hidden overflow for clean edges */}
          <div className="overflow-hidden">
            <motion.div
              className="flex gap-5 sm:gap-6"
              variants={marqueeVariants}
              initial="animate"
              animate="animate"
              whileHover={{ transition: { x: { duration: 120 } } }} // Slow down on hover
            >
              {allPartners.map((partner, idx) => {
                const fileSlug = partnerSlugs[partner.slug] ?? partner.slug.toLowerCase().replace(/\s+/g, '-');
                const fallbackSvg = fallbackLogos[partner.slug] ?? RwandaPolytechnicLogo;
                return (
                  <motion.div
                    key={`${partner.name}-${idx}`}
                    className="group relative w-[260px] sm:w-[300px] shrink-0 cursor-default overflow-hidden rounded-2xl border border-border/60 bg-white p-5 transition-shadow duration-300 hover:shadow-elevation-medium"
                    whileHover={{ y: -4, scale: 1.02 }}
                  >
                    {/* Top accent */}
                    <div
                      className={`absolute top-0 left-0 right-0 h-1 ${partner.accentColor} opacity-80`}
                    />

                    {/* Card content */}
                    <div className="flex items-start gap-4">
                      {/* Logo: loads real image, falls back to inline SVG */}
                      <div
                        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${partner.bgLight} transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg p-1.5`}
                      >
                        <PartnerLogoImage
                          slug={fileSlug}
                          fallback={fallbackSvg}
                          className="h-full w-full"
                        />
                      </div>

                      {/* Text */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-semibold text-text-primary">{partner.name}</h3>
                          <span
                            className={`inline-flex items-center justify-center rounded-md ${partner.badgeBg} px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm`}
                          >
                            {partner.abbr}
                          </span>
                        </div>
                        <p className="mt-0.5 text-sm text-text-tertiary">{partner.description}</p>
                      </div>
                    </div>

                    {/* Bottom hover indicator */}
                    <div className="mt-4 flex items-center gap-1 text-xs font-medium text-text-tertiary transition-all duration-200 group-hover:text-primary-600">
                      <Sparkles className="h-3 w-3" />
                      <span>Active partner</span>
                      <ArrowRight className="ml-auto h-3.5 w-3.5 translate-x-0 opacity-0 transition-all duration-200 group-hover:translate-x-1 group-hover:opacity-100" />
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="mt-12 text-center"
        >
          <p className="text-sm text-text-tertiary mb-4">
            Join these organizations in transforming skills assessment across Africa.
          </p>
          <Button
            variant="secondary"
            size="lg"
            className="border-2 border-border text-text-secondary hover:bg-surface-secondary hover:border-primary-300 hover:text-primary-700"
            onClick={() => document.getElementById('demo-section')?.scrollIntoView({ behavior: 'smooth' })}
          >
            Become a Partner
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </motion.div>
      </SectionContainer>
    </section>
  );
}

export default PartnersSection;
