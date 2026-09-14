import { useQuery } from '@tanstack/react-query';
import { Card, CardBody } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { api } from '@services/api';
import { formatDate } from '@utils/format';
import { FileStack, Inbox, Plus, Clock, BarChart } from 'lucide-react';

interface AssessmentTemplate {
  id: string;
  name: string;
  description: string | null;
  assessmentType: string;
  difficulty: string;
  durationMinutes: number;
  passingScore: number;
  isPublic: boolean;
  createdAt: string;
}

const difficultyColors: Record<string, string> = {
  BEGINNER: 'bg-green-50 text-green-700',
  INTERMEDIATE: 'bg-blue-50 text-blue-700',
  ADVANCED: 'bg-orange-50 text-orange-700',
  EXPERT: 'bg-red-50 text-red-700',
};

export function AssessmentTemplatesPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['assessment-templates'],
    queryFn: async () => {
      const res = await api.get('/assessment-builder/templates');
      return res.data.data as AssessmentTemplate[];
    },
  });

  const templates = data ?? [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Assessment Templates</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Reusable assessment templates to quickly create new assessments
          </p>
        </div>
        <Button icon={<Plus className="h-4 w-4" />}>
          Create Template
        </Button>
      </div>

      <Card className="!p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-sm text-text-tertiary">
            Loading templates...
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center py-16 text-center">
            <FileStack className="h-8 w-8 text-text-tertiary" />
            <p className="mt-3 text-sm text-text-secondary">Couldn't load templates.</p>
            <Button variant="secondary" size="sm" className="mt-3" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : templates.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Inbox className="h-8 w-8 text-text-tertiary" />
            <p className="mt-3 text-sm text-text-secondary">
              No templates yet. Create a template to reuse assessment structures.
            </p>
            <Button size="sm" className="mt-3" icon={<Plus className="h-4 w-4" />}>
              Create Template
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            <div className="hidden lg:grid lg:grid-cols-12 gap-4 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
              <div className="lg:col-span-4">Template</div>
              <div className="lg:col-span-2">Type</div>
              <div className="lg:col-span-2">Difficulty</div>
              <div className="lg:col-span-2">Duration</div>
              <div className="lg:col-span-2">Pass Score</div>
            </div>
            {templates.map((t) => (
              <div
                key={t.id}
                className="grid grid-cols-1 gap-2 px-5 py-3.5 lg:grid-cols-12 lg:gap-4 lg:items-center hover:bg-surface-secondary cursor-pointer transition-colors"
              >
                <div className="lg:col-span-4">
                  <p className="text-sm font-medium text-text-primary">{t.name}</p>
                  {t.description && (
                    <p className="truncate text-xs text-text-tertiary mt-0.5">{t.description}</p>
                  )}
                </div>
                <div className="lg:col-span-2">
                  <span className="inline-flex items-center rounded-full bg-surface-tertiary px-2.5 py-0.5 text-xs font-medium text-text-secondary">
                    {t.assessmentType}
                  </span>
                </div>
                <div className="lg:col-span-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${difficultyColors[t.difficulty] || 'bg-surface-tertiary text-text-secondary'}`}
                  >
                    {t.difficulty}
                  </span>
                </div>
                <div className="lg:col-span-2 flex items-center gap-1.5 text-sm text-text-secondary">
                  <Clock className="h-3.5 w-3.5 text-text-tertiary" />
                  {t.durationMinutes} min
                </div>
                <div className="lg:col-span-2 flex items-center gap-1.5 text-sm text-text-secondary">
                  <BarChart className="h-3.5 w-3.5 text-text-tertiary" />
                  {t.passingScore}%
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

export default AssessmentTemplatesPage;
