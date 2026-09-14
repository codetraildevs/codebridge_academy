import { Award, ArrowRight, Boxes, Code2, FileEdit, Mic, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { cn } from '@utils/cn';
import { motion } from 'framer-motion';
import { SectionContainer } from '@components/ui/section-container';

const steps = [
  {
    number: '01',
    icon: FileEdit,
    title: 'Create & Configure',
    description: 'Design practical exams with sections, rubrics, and AI assessment criteria. Choose from multiple workspace types including code editors, ERD designers, and topology builders.',
    visual: 'setup',
    accent: 'bg-[#fff1cf]',
    badge: 'bg-primary-600',
    border: 'border-primary-200',
  },
  {
    number: '02',
    icon: Users,
    title: 'Assess & Monitor',
    description: 'Candidates complete assessments in real-time with auto-save, proctoring, and AI-powered oral defense. Track progress and receive instant AI evaluation results.',
    visual: 'workspace',
    accent: 'bg-[#fff8dc]',
    badge: 'bg-accent-600',
    border: 'border-accent-200',
  },
  {
    number: '03',
    icon: Award,
    title: 'Verify & Certify',
    description: 'Review AI assessments, generate digital certificates with QR verification, and access detailed competency analytics. Share results with employers and institutions.',
    visual: 'results',
    accent: 'bg-[#f8e8fb]',
    badge: 'bg-secondary-600',
    border: 'border-secondary-200',
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55 },
  },
};

const cardsContainerVariants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12 },
  },
};

function StepVisual({ type }: { type: string }) {
  if (type === 'setup') {
    return (
      <div className="relative flex h-full items-center justify-center bg-[radial-gradient(circle_at_80%_30%,#ffe47e,transparent_45%),linear-gradient(135deg,#fffdf6,#ffe7b2)] px-8">
        <div className="w-full max-w-[280px] space-y-5">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center gap-3 text-sm font-medium text-text-primary">
              <span className="grid size-6 place-items-center rounded-md bg-amber-100 text-amber-600"><FileEdit className="size-3.5" /></span>
              Assessment configuration
            </div>
          </div>
          <div className="mx-auto h-7 w-px bg-amber-400" />
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center gap-3 text-sm font-medium text-text-primary">
              <span className="grid size-6 place-items-center rounded-md bg-pink-100 text-pink-600"><Sparkles className="size-3.5" /></span>
              Rubrics and workspace types
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'workspace') {
    const apps = [Code2, Boxes, Mic, ShieldCheck, Users, FileEdit];
    return (
      <div className="grid h-full min-h-0 grid-cols-4 grid-rows-4 gap-2 overflow-hidden bg-[#fff9e8] p-3 sm:p-5">
        {Array.from({ length: 16 }, (_, index) => {
          const Icon = apps[index % apps.length]!;
          return (
            <div key={index} className="grid min-h-0 place-items-center rounded-lg border border-amber-100 bg-white/70">
              {index % 3 === 0 ? <Icon className="size-6 text-primary-600" strokeWidth={1.8} /> : <span className="size-5 rounded-md bg-amber-100" />}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_55%_45%,#f1c7f7,transparent_58%),linear-gradient(135deg,#fffaff,#f6e7fb)] px-8">
      <div className="w-full max-w-[300px] space-y-3">
        <p className="text-sm text-slate-500">Competency results</p>
        <div className="rounded-xl border border-white/80 bg-white/80 p-3 shadow-sm backdrop-blur">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-secondary-700"><Sparkles className="size-4" /> AI evaluation summary</div>
          <div className="space-y-2">
            <div className="h-2 w-full rounded-full bg-secondary-100"><div className="h-full w-[82%] rounded-full bg-secondary-500" /></div>
            <div className="h-2 w-4/5 rounded-full bg-secondary-100"><div className="h-full w-[68%] rounded-full bg-secondary-400" /></div>
            <div className="h-2 w-3/5 rounded-full bg-secondary-100"><div className="h-full w-[91%] rounded-full bg-secondary-600" /></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="relative bg-white py-16 sm:py-24 overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-primary-50/30 blur-3xl" />
      </div>

      <SectionContainer>
        <div className="mb-12 flex items-end justify-between gap-8 sm:mb-16">
          <div>
            <p className="mb-3 flex items-center gap-3 text-sm font-semibold text-text-secondary">
              <span className="grid size-5 place-items-center rounded bg-slate-500 text-white"><Sparkles className="size-3" /></span>
              Easy as one, two, three.
            </p>
            <h2 className="landing-section-heading text-4xl font-normal text-text-primary sm:text-5xl">
              Three steps to transform your assessment process
            </h2>
          </div>
          <button
            type="button"
            onClick={() => document.getElementById('demo-section')?.scrollIntoView({ behavior: 'smooth' })}
            className="hidden shrink-0 items-center gap-3 rounded-xl bg-[#2965ff] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1f54dd] sm:inline-flex"
          >
            Get started <ArrowRight className="size-4" />
          </button>
        </div>

        <motion.div
          className="grid gap-2 sm:gap-3 lg:grid-cols-3"
          variants={cardsContainerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
        >
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <motion.article key={step.number} variants={cardVariants} className={cn('overflow-hidden rounded-xl border bg-white', step.border)}>
                <div className={cn('h-64 sm:h-72', step.accent)}>
                  <StepVisual type={step.visual} />
                </div>
                <div className="min-h-[162px] border-t border-slate-100 bg-white p-5 sm:p-6">
                  <div className="mb-3 flex items-center gap-3">
                    <span className="grid size-7 place-items-center rounded bg-slate-100 text-sm font-semibold text-slate-500">{step.number}</span>
                    <h3 className="text-xl font-semibold text-text-primary">{step.title}</h3>
                  </div>
                  <p className="text-base leading-6 text-text-secondary">{step.description}</p>
                  <Icon className="sr-only" aria-hidden="true" />
                </div>
              </motion.article>
            );
          })}
        </motion.div>
      </SectionContainer>
    </section>
  );
}

export default HowItWorksSection;
