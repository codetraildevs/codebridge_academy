import { useEffect, useState } from 'react';
import { ArrowRight, PlayCircle, ChevronRight } from 'lucide-react';
import { Button } from '@components/ui/button';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] },
  },
};

export function HeroSection() {
  const navigate = useNavigate();
  const { scrollY } = useScroll();
  const [parallaxIntensity, setParallaxIntensity] = useState(1);

  useEffect(() => {
    const checkMobile = () => {
      setParallaxIntensity(window.innerWidth < 768 ? 0.2 : 1);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const deepBgY = useTransform(scrollY, (y) => -(y * 0.06 * parallaxIntensity));
  const dashboardY = useTransform(scrollY, (y) => y * 0.15 * parallaxIntensity);

  return (
    <section className="relative h-screen overflow-hidden">
      {/* ═══════════════════════════════════════════════════════
          GRADIENT BACKGROUND — warm yellow/cream like Outseta
          ═══════════════════════════════════════════════════════ */}
      <motion.div
        className="absolute inset-0"
        style={{ y: deepBgY }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: `
              linear-gradient(180deg, 
                #fef3c7 0%, 
                #fde68a 15%, 
                #fcd34d 30%, 
                #fbbf24 45%,
                #f59e0b 60%,
                #fbbf24 75%,
                #fde68a 90%,
                #fef9e7 100%
              )
            `,
          }}
        />
        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(0,0,0,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,.1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </motion.div>

      {/* ═══════════════════════════════════════════════════════
          FOREGROUND CONTENT
          ═══════════════════════════════════════════════════════ */}
      <div className="relative mx-auto flex h-full max-w-7xl flex-col justify-between px-4 pt-12 sm:px-6 sm:pt-16 lg:px-8 lg:pt-20">
        <motion.div
          className="text-center"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Badge */}
          <motion.div variants={itemVariants} className="mb-3 sm:mb-4 inline-flex">
            <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/80 px-3 py-1 text-xs sm:text-sm font-medium text-black shadow-sm backdrop-blur-sm">
              <span className="rounded bg-black px-2 py-0.5 text-xs font-bold text-white">
                TRY IT
              </span>
              <span>The Qualexas Platform</span>
              <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
            </div>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={itemVariants}
            className="landing-heading mx-auto max-w-4xl font-bold text-black"
          >
            The AI-Powered Assessment Platform
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            variants={itemVariants}
            className="landing-subheading mx-auto mt-3 max-w-2xl text-gray-700 sm:mt-4"
          >
            Skills verification, AI oral defense, proctoring, digital certificates, and analytics — all in one platform. Ditch fragmented assessment tools and validate real competencies with intelligent technology.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            variants={itemVariants}
            className="mt-5 sm:mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
          >
            <Button
              variant="primary"
              size="lg"
              className="group relative overflow-hidden shadow-lg shadow-[#2965ff]/25 hover:shadow-[#2965ff]/40 transition-all duration-300"
              onClick={() => navigate('/auth/register')}
            >
              <span className="relative z-10 flex items-center gap-2">
                Get Started Free
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </span>
            </Button>
            <Button
              variant="secondary"
              size="lg"
              className="bg-white/90 shadow-sm backdrop-blur-sm transition-all duration-300"
              onClick={() =>
                document.getElementById('demo-section')?.scrollIntoView({ behavior: 'smooth' })
              }
            >
              <PlayCircle className="mr-1.5 h-4 w-4" />
              Watch Demo
            </Button>
          </motion.div>

        </motion.div>

        {/* ═══════════════════════════════════════════════════════
            DASHBOARD SCREENSHOT — below the hero text
            ═══════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="relative mx-auto mt-6 max-w-5xl sm:mt-8 lg:mt-10 flex-1"
          style={{ y: dashboardY }}
        >
          <img
            src="/admin-developer.png"
            alt="Qualexas Dashboard - Assessment Management Platform"
            className="w-full rounded-xl shadow-2xl ring-1 ring-black/5 sm:rounded-2xl"
            loading="eager"
          />

          {/* Floating decorative elements */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.2, duration: 0.5 }}
            className="absolute -bottom-3 -left-3 hidden rounded-xl border border-gray-200 bg-white p-2 shadow-lg sm:-bottom-5 sm:-left-5 sm:block sm:p-3"
          >
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                <span className="text-sm">✓</span>
              </div>
              <div>
                <p className="text-xs sm:text-sm font-semibold text-black">AI-Powered</p>
                <p className="text-[10px] sm:text-xs text-gray-500">85% faster assessment</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* ─── Bottom fade to the page background ─── */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#fcf9f7] to-transparent" />
    </section>
  );
}

export default HeroSection;