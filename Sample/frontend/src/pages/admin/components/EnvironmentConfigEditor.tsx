import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardBody } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import {
  Save,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  RotateCcw,
  Settings2,
} from 'lucide-react';
import { cn } from '@utils/cn';

export interface EnvFormState {
  allowPracticalExam: boolean;
  allowTheoreticalExam: boolean;
  allowMixedExam: boolean;
  enableAiScoring: boolean;
  enableAiOralDefense: boolean;
  enableAiPlagiarismCheck: boolean;
  enableAiFeedback: boolean;
  enableAiLearningRecs: boolean;
  enableDynamicWorkspace: boolean;
  enableDiagramEditor: boolean;
  enableCodeEditor: boolean;
  enableFileUpload: boolean;
  enableWebcamProctoring: boolean;
  enableFullScreenLockdown: boolean;
  enableOralDefense: boolean;
  enablePortfolioBuilder: boolean;
  enableCertificateIssue: boolean;
  maxDurationPerExam: number;
  maxSectionsPerExam: number;
  maxQuestionsPerSection: number;
}

interface Props {
  form: EnvFormState;
  onChange: (form: EnvFormState) => void;
  onSave: () => Promise<void>;
  onReset?: () => Promise<void>;
  saving: boolean;
  error: string;
  success: string;
  title?: string;
  showReset?: boolean;
}

export function EnvironmentConfigEditor({
  form,
  onChange,
  onSave,
  onReset,
  saving,
  error,
  success,
  title = 'Environment Configuration',
  showReset = true,
}: Props) {
  const toggleFeature = (key: keyof EnvFormState) => {
    const newVal = typeof form[key] === 'boolean' ? !form[key] : form[key];
    onChange({ ...form, [key]: newVal });
  };

  const updateNumber = (key: keyof EnvFormState, value: number) => {
    onChange({ ...form, [key]: Math.max(1, value) });
  };

  const featureGroups = [
    {
      title: 'Exam Types',
      features: [
        { key: 'allowPracticalExam' as const, label: 'Practical Exams' },
        { key: 'allowTheoreticalExam' as const, label: 'Theoretical Exams' },
        { key: 'allowMixedExam' as const, label: 'Mixed Exams' },
      ],
    },
    {
      title: 'AI Features',
      features: [
        { key: 'enableAiScoring' as const, label: 'AI Scoring' },
        { key: 'enableAiOralDefense' as const, label: 'AI Oral Defense' },
        { key: 'enableAiPlagiarismCheck' as const, label: 'AI Plagiarism Detection' },
        { key: 'enableAiFeedback' as const, label: 'AI Feedback' },
        { key: 'enableAiLearningRecs' as const, label: 'AI Learning Recommendations' },
      ],
    },
    {
      title: 'Environment Capabilities',
      features: [
        { key: 'enableDynamicWorkspace' as const, label: 'Dynamic Workspace' },
        { key: 'enableDiagramEditor' as const, label: 'Diagram Editor' },
        { key: 'enableCodeEditor' as const, label: 'Code Editor' },
        { key: 'enableFileUpload' as const, label: 'File Upload' },
        { key: 'enableWebcamProctoring' as const, label: 'Webcam Proctoring' },
        { key: 'enableFullScreenLockdown' as const, label: 'Full Screen Lockdown' },
        { key: 'enableOralDefense' as const, label: 'Oral Defense' },
        { key: 'enablePortfolioBuilder' as const, label: 'Portfolio Builder' },
        { key: 'enableCertificateIssue' as const, label: 'Certificate Issuance' },
      ],
    },
  ] as const;

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          {success}
        </div>
      )}

      {/* Feature Toggles */}
      {featureGroups.map((group) => (
        <Card key={group.title}>
          <CardHeader>
            <CardTitle>{group.title}</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.features.map(({ key, label }) => (
                <div
                  key={key}
                  onClick={() => toggleFeature(key)}
                  className={cn(
                    'flex cursor-pointer items-center justify-between rounded-lg border px-4 py-3 transition-all',
                    form[key]
                      ? 'border-primary-300 bg-primary-50'
                      : 'border-border bg-white hover:bg-surface-secondary',
                  )}
                >
                  <span className="text-sm font-medium text-text-primary">{label}</span>
                  {form[key] ? (
                    <CheckCircle2 className="h-5 w-5 text-primary-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-text-tertiary" />
                  )}
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      ))}

      {/* Limits */}
      <Card>
        <CardHeader>
          <CardTitle>Per-Exam Limits</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">
                Max Duration (minutes)
              </label>
              <input
                type="number"
                value={form.maxDurationPerExam}
                onChange={(e) => updateNumber('maxDurationPerExam', Number(e.target.value))}
                className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">
                Max Sections Per Exam
              </label>
              <input
                type="number"
                value={form.maxSectionsPerExam}
                onChange={(e) => updateNumber('maxSectionsPerExam', Number(e.target.value))}
                className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">
                Max Questions Per Section
              </label>
              <input
                type="number"
                value={form.maxQuestionsPerSection}
                onChange={(e) => updateNumber('maxQuestionsPerSection', Number(e.target.value))}
                className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button onClick={onSave} loading={saving}>
          <Save className="mr-1 h-4 w-4" /> Save Configuration
        </Button>
        {showReset && onReset && (
          <Button variant="ghost" onClick={onReset}>
            <RotateCcw className="mr-1 h-4 w-4" /> Reset to Plan Defaults
          </Button>
        )}
      </div>
    </div>
  );
}

export default EnvironmentConfigEditor;