import { Card, CardHeader, CardTitle, CardBody } from '@components/ui/card';
import { Badge } from '@components/ui/badge';
import { Brain, Sparkles, Shield, Settings2 } from 'lucide-react';

const aiServices = [
  {
    name: 'Code Evaluation',
    model: 'GPT-4o Mini',
    status: 'active',
    description: 'Evaluates source code quality, functionality, and best practices',
    icon: Brain,
  },
  {
    name: 'Oral Defense',
    model: 'Whisper + GPT-4o Mini',
    status: 'active',
    description: 'Speech-to-text transcription and AI-powered question evaluation',
    icon: Sparkles,
  },
  {
    name: 'Plagiarism Detection',
    model: 'Custom Similarity Engine',
    status: 'active',
    description: 'Cross-checks submissions for similarity and originality',
    icon: Shield,
  },
  {
    name: 'Competency Mapping',
    model: 'GPT-4o Mini',
    status: 'active',
    description: 'Maps assessment results to competency frameworks',
    icon: Settings2,
  },
];

export function AIConfigPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">AI Configuration</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Manage AI models, grading rules, and intelligent assessment services
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {aiServices.map((service) => (
          <Card key={service.name} variant="outlined" padding="lg" className="card-hover">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-50">
                <service.icon className="h-6 w-6 text-primary-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-text-primary">{service.name}</h3>
                  <Badge variant="success" dot size="sm">Active</Badge>
                </div>
                <p className="mt-1 text-sm text-text-secondary">{service.description}</p>
                <p className="mt-2 text-xs text-text-tertiary">
                  Model: <span className="font-medium text-text-primary">{service.model}</span>
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>AI Grading Configuration</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            <div className="rounded-lg bg-surface-secondary p-4">
              <h4 className="text-sm font-semibold text-text-primary mb-2">Scoring Rules</h4>
              <p className="text-sm text-text-secondary">
                Configure scoring thresholds, weighting rules, and AI confidence levels.
                Full AI configuration interface is being implemented.
              </p>
            </div>
            <div className="rounded-lg bg-surface-secondary p-4">
              <h4 className="text-sm font-semibold text-text-primary mb-2">Plagiarism Detection</h4>
              <p className="text-sm text-text-secondary">
                Set similarity thresholds, exclusion patterns, and detection sensitivity.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

export default AIConfigPage;
