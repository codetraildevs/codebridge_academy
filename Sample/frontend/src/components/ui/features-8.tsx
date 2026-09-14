import {
  Code2,
  Users,
  Lightbulb,
  Mic,
  FileCheck,
  Network,
  LayoutGrid,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card-shadcn';
import { cn } from '@utils/cn';

interface CompactFeature {
  icon: typeof Lightbulb;
  name: string;
  description: string;
  iconBg: string;
  iconColor: string;
}

const compactFeatures: CompactFeature[] = [
  {
    icon: Mic,
    name: 'AI Oral Defense',
    description:
      'Speech-to-text powered oral examinations with AI-generated questions and real-time response evaluation.',
    iconBg: 'bg-secondary-100',
    iconColor: 'text-secondary-600',
  },
  {
    icon: FileCheck,
    name: 'Digital Certificates',
    description:
      'Blockchain-ready digital certificates with QR verification, secure sharing, and competency breakdowns.',
    iconBg: 'bg-cyan-100',
    iconColor: 'text-cyan-600',
  },
  {
    icon: Network,
    name: 'Multi-Tenant Platform',
    description:
      'Unified organization management supporting schools, universities, companies, and government agencies on one platform.',
    iconBg: 'bg-primary-100',
    iconColor: 'text-primary-400',
  },
];

export function Features8() {
  return (
    <section id="features" className="w-full bg-surface-secondary py-16 sm:py-24">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 md:px-8">
        {/* Section header */}
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col justify-center gap-2">
            <div className="mb-2 flex gap-2 py-1">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-4 py-1.5 text-sm font-medium text-primary-700">
                <LayoutGrid className="h-4 w-4" />
                Platform Features
              </div>
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl lg:text-5xl">
              Everything you need for modern{' '}
              <span className="text-primary-600">competency assessment</span>
            </h2>
          </div>

          <div className="flex max-w-sm flex-col justify-center gap-2">
            <p className="text-base leading-relaxed text-text-secondary sm:text-lg">
              From AI-powered evaluation to digital certification — Qualexas
              provides a complete end-to-end platform for skills assessment and
              verification.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
          {/* Card 1 — AI-Powered Assessment */}
          <Card className="relative col-span-full flex overflow-hidden rounded-2xl bg-white p-0 sm:col-span-2 sm:h-80 md:col-span-2 md:h-80 sm:flex-col">
            <div className="absolute top-6 right-5">
              <svg viewBox="0 0 220 160" className="h-32 w-40">
                <path
                  d="M 5 155 C 40 155, 45 120, 75 120 C 105 120, 110 90, 140 90 C 170 90, 165 60, 195 60 L 215 60"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-primary-400"
                />
                <path
                  d="M 5 155 C 40 155, 45 120, 75 120 C 105 120, 110 90, 140 90 C 170 90, 165 60, 195 60 L 215 60"
                  fill="none"
                  stroke="currentColor"
                  strokeOpacity="0.25"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                  className="text-primary-600"
                />
              </svg>
            </div>
            <CardContent className="mt-auto p-6">
              <h3 className="text-4xl font-bold tracking-tight text-primary-600 sm:text-3xl">
                100%
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Automated scoring, matching, and feedback generation
              </p>
              <div className="mt-4 flex h-1.5 w-3/4 items-center justify-end rounded-full bg-primary-600/15">
                <div className="h-1.5 w-2/3 rounded-full bg-primary-600" />
              </div>
              <p className="mt-5 text-xl font-semibold text-primary-600">
                AI-Powered Assessment
              </p>
            </CardContent>
          </Card>

          {/* Card 2 — Anti-Cheating System */}
          <Card className="col-span-full flex flex-col items-center justify-center gap-4 p-5 bg-surface-tertiary sm:col-span-2 sm:h-80 md:col-span-2 md:h-80">
            <svg
              viewBox="0 0 200 200"
              className="mx-auto h-28 w-28 shrink-0"
            >
              <circle cx="100" cy="100" r="100" fill="currentColor" className="text-primary-100" />
              <g
                transform="translate(100 100)"
                className="-translate-x-1/2 -translate-y-1/2 origin-center scale-75"
              >
                <circle
                  cx="0"
                  cy="-20"
                  r="32"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="5"
                  className="text-primary-600"
                />
                <path
                  d="M -55 40 Q -55 -15 0 -15 Q 55 -15 55 40 Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="5"
                  strokeLinecap="round"
                  className="text-primary-600"
                />
              </g>
            </svg>
            <div className="flex flex-col items-center gap-2 text-center">
              <h3 className="text-xl font-semibold text-primary-600">
                Anti-Cheating System
              </h3>
              <p className="max-w-64 text-center text-sm text-text-secondary">
                Comprehensive proctoring with tab-switch detection, plagiarism
                checking, activity logging, and risk scoring.
              </p>
            </div>
            <div className="mx-auto h-1.5 w-16 rounded-full bg-primary-600" />
          </Card>

          {/* Card 3 — Skills Intelligence */}
          <Card className="relative col-span-full overflow-hidden rounded-2xl bg-secondary-100/40 p-0 sm:col-span-2 sm:h-80 md:col-span-2 md:h-80">
            <div className="flex h-full flex-col items-start justify-between gap-4 p-5">
              <svg viewBox="0 0 280 120" className="h-24 w-full">
                <path
                  d="M 5 60 Q 30 60 40 40 T 80 50 T 120 25 T 170 55 T 215 30 T 260 45 L 275 45"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  className="text-secondary-600"
                />
                <path
                  d="M 5 90 Q 30 90 40 70 T 80 80 T 120 55 T 170 85 T 215 60 T 260 75 L 275 75"
                  fill="none"
                  stroke="currentColor"
                  strokeOpacity="0.3"
                  strokeWidth="2"
                  strokeDasharray="4 6"
                  strokeLinecap="round"
                  className="text-secondary-600"
                />
              </svg>
              <div className="flex flex-col gap-2">
                <h3 className="text-xl font-semibold text-primary-600">
                  Skills Intelligence
                </h3>
                <p className="max-w-64 text-sm text-text-secondary">
                  Advanced analytics with competency mapping, skills gap
                  analysis, national-level reporting, and trend insights.
                </p>
              </div>
            </div>
          </Card>

          {/* Card 4 — Practical Workspaces */}
          <Card className="rounded-2xl bg-white p-4 flex-col sm:col-span-3 sm:h-72 md:col-span-3 md:h-72">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent-100 text-accent-600">
                <Code2 className="size-6" />
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="mt-1.5 flex items-center justify-between text-lg font-semibold text-primary-600">
                  Practical Workspaces
                </h3>
                <p className="max-w-64 text-sm text-text-secondary">
                  Built-in ERD designer, code editor with Monaco, database
                  workspace, and topology builder for hands-on assessments.
                </p>
              </div>
            </div>
            <div className="mt-6 hidden w-full rounded-xl bg-surface-primary px-4 py-3 font-mono text-xs text-text-secondary shadow-inner md:block">
              <div className="mb-2 flex gap-1.5">
                <span className="h-2 w-2 rounded-full bg-red-400" />
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
              </div>
              <p>
                <span className="text-primary-400">export</span> const assessment
                = ...;
              </p>
              <p>
                <span className="text-primary-400">await</span> erdDesigner
                .validate();
              </p>
              <p>
                score = evaluator.score(code, rubric);
              </p>
            </div>
          </Card>

          {/* Card 5 — Interview Management */}
          <Card className="rounded-2xl bg-white p-4 flex-col sm:col-span-3 sm:h-72 md:col-span-3 md:h-72">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                <Users className="size-6" />
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="mt-1.5 flex items-center justify-between text-lg font-semibold text-primary-600">
                  Interview Management
                </h3>
                <p className="max-w-64 text-sm text-text-secondary">
                  Structured interview templates, AI-scored responses,
                  scheduling, and collaborative evaluation workflows.
                </p>
              </div>
            </div>
            <div className="mt-6 flex items-center gap-4">
              <div className="flex -space-x-2">
                {[
                  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=96&h=96&fit=crop&crop=faces',
                  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&h=96&fit=crop&crop=faces',
                  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=96&h=96&fit=crop&crop=faces',
                ].map((src) => (
                  <img
                    key={src}
                    src={src}
                    alt="Interviewer"
                    loading="lazy"
                    className="h-10 w-10 rounded-full border-2 border-white object-cover"
                  />
                ))}
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium text-primary-600">Assessors</p>
                <p className="text-xs text-text-secondary">
                  Joint AI + human scoring
                </p>
              </div>
            </div>
          </Card>

          {/* Compact feature cards — AI Oral Defense, Digital Certificates, Multi-Tenant Platform */}
          {compactFeatures.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card
                key={feature.name}
                className="col-span-full rounded-2xl bg-white p-6 sm:col-span-2 sm:h-56 md:col-span-2 md:h-56"
              >
                <div className="flex h-full w-full flex-col items-start justify-between gap-4">
                  <div
                    className={cn(
                      'flex h-12 w-12 items-center justify-center rounded-xl',
                      feature.iconBg,
                    )}
                  >
                    <Icon className={cn('size-6', feature.iconColor)} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <h3 className="text-lg font-semibold text-primary-600">
                      {feature.name}
                    </h3>
                    <p className="text-sm text-text-secondary">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default Features8;