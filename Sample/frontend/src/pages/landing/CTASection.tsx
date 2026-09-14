import { Button } from '@components/ui/button';
import { DemoRequestForm } from '@components/ui/demo-request-form';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export function CTASection() {
  const navigate = useNavigate();

  return (
    <section
      id="demo-section"
      className="relative overflow-hidden py-16 sm:py-24"
    >
      {/* Clean background */}
      <div className="absolute inset-0 bg-[#fcf9f7]" />

      {/* Background decorations */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(0,0,0,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,.04) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        {/* Heading */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="landing-heading mx-auto max-w-4xl font-normal text-black"
        >
          Ready to transform your assessment process?
        </motion.h2>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="landing-subheading mx-auto mt-3 sm:mt-4 max-w-2xl text-gray-600"
        >
          Join 50+ organizations already using Qualexas to assess, verify, and certify
          competencies. Get a personalized demo tailored to your needs.
        </motion.p>

        {/* CTA Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mx-auto mt-10 max-w-md"
        >
          <DemoRequestForm />
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="mt-4 text-xs text-text-tertiary"
        >
          No credit card required. Free trial includes 2 full assessments.
        </motion.p>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
          className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <Button
            variant="ghost"
            className="text-text-secondary hover:text-text-primary transition-all duration-200"
            onClick={() => navigate('/auth/login')}
          >
            Already have an account? Sign in
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </motion.div>
      </div>
    </section>
  );
}

export default CTASection;
