import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardBody } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import { adminService } from '@services/admin-service';
import { subscriptionService } from '@services/subscription-service';
import type { SubscriptionPlan } from '../../types';
import {
  Settings2,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  Save,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { cn } from '@utils/cn';

interface EnvFormState {
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
  allowOrgOverride: boolean;
}

export function AdminPlanEnvironmentPage() {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();

  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState<EnvFormState>({
    allowPracticalExam: true,
    allowTheoreticalExam: true,
    allowMixedExam: true,
    enableAiScoring: false,
    enableAiOralDefense: false,
    enableAiPlagiarismCheck: false,
    enableAiFeedback: false,
    enableAiLearningRecs: false,
    enableDynamicWorkspace: false,
    enableDiagramEditor: false,
    enableCodeEditor: false,
    enableFileUpload: false,
    enableWebcamProctoring: false,
    enableFullScreenLockdown: false,
    enableOralDefense: false,
    enablePortfolioBuilder: false,
    enableCertificateIssue: false,
    maxDurationPerExam: 120,
    maxSectionsPerExam: 10,
    maxQuestionsPerSection: 20,
    allowOrgOverride: true,
  });

  useEffect(() => {
    if (planId) loadData();
  }, [planId]);

  const loadData = async () => {
    if (!planId) return;
    setLoading(true);
    setError('');
    try {
      const plans = await subscriptionService.listPlans();
      const foundPlan = plans.find((p) => p.id === planId);
      if (!foundPlan) {
        setError('Plan not found');
        setLoading(false);
        return;
      }
      setPlan(foundPlan);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load plan');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!planId) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await adminService.updatePlanEnvironment(planId, form);
      setSuccess('Environment configuration saved successfully');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save environment config');
    } finally {
      setSaving(false);
    }
  };

  const toggleFeature = (key: keyof EnvFormState) => {
    setForm((prev) => ({
      ...prev,
      [key]: typeof prev[key] === 'boolean' ? !prev[key] : prev[key],
    }));
  };

  const updateNumber = (key: keyof EnvFormState, value: number) => {
    setForm((prev) => ({ ...prev, [key]: Math.max(1, value) }));
  };

  const featureGroups = [
    {
      title: 'Exam Types',
      features: [
        { key: 'allowPracticalExam', label: 'Practical Exams' },
        { key: 'allowTheoreticalExam', label: 'Theoretical Exams' },
        { key: 'allowMixedExam', label: 'Mixed Exams' },
      ],
    },
    {
      title: 'AI Features',
      features: [
        { key: 'enableAiScoring', label: 'AI Scoring' },
        { key: 'enableAiOralDefense', label: 'AI Oral Defense' },
        { key: 'enableAiPlagiarismCheck', label: 'AI Plagiarism Detection' },
        { key: 'enableAiFeedback', label: 'AI Feedback' },
        { key: 'enableAiLearningRecs', label: 'AI Learning Recommendations' },
      ],
    },
    {
      title: 'Environment Capabilities',
      features: [
        { key: 'enableDynamicWorkspace', label: 'Dynamic Workspace' },
        { key: 'enableDiagramEditor', label: 'Diagram Editor' },
        { key: 'enableCodeEditor', label: 'Code Editor' },
        { key: 'enableFileUpload', label: 'File Upload' },
        { key: 'enableWebcamProctoring', label: 'Webcam Proctoring' },
        { key: 'enableFullScreenLockdown', label: 'Full Screen Lockdown' },
        { key: 'enableOralDefense', label: 'Oral Defense' },
        { key: 'enablePortfolioBuilder', label: 'Portfolio Builder' },
        { key: 'enableCertificateIssue', label: 'Certificate Issuance' },
      ],
    },
  ] as const;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="text-center py-20">
        <p className="text-text-tertiary">Plan not found</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate('/admin/subscription-plans')}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to Plans
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/admin/subscription-plans')}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              {plan.name} - Environment Config
            </h1>
            <p className="text-sm text-text-tertiary">
              {plan.planType === 'INDIVIDUAL' ? 'Individual' : 'Organization'} Plan
            </p>
          </div>
        </div>
        <Button onClick={handleSave} loading={saving}>
          <Save className="mr-1 h-4 w-4" /> Save Configuration
        </Button>
      </div>

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
                  onClick={() => toggleFeature(key as keyof EnvFormState)}
                  className={cn(
                    'flex cursor-pointer items-center justify-between rounded-lg border px-4 py-3 transition-all',
                    form[key as keyof EnvFormState]
                      ? 'border-primary-300 bg-primary-50'
                      : 'border-border bg-white hover:bg-surface-secondary',
                  )}
                >
                  <span className="text-sm font-medium text-text-primary">{label}</span>
                  {form[key as keyof EnvFormState] ? (
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

      {/* Override Setting */}
      <Card>
        <CardHeader>
          <CardTitle>Organization Override</CardTitle>
        </CardHeader>
        <CardBody>
          <div
            onClick={() => toggleFeature('allowOrgOverride')}
            className={cn(
              'flex cursor-pointer items-center justify-between rounded-lg border px-4 py-3 transition-all',
              form.allowOrgOverride
                ? 'border-primary-300 bg-primary-50'
                : 'border-border bg-white hover:bg-surface-secondary',
            )}
          >
            <div>
              <p className="text-sm font-medium text-text-primary">Allow Organization Override</p>
              <p className="text-xs text-text-tertiary">
                When enabled, organizations can customize their environment settings
              </p>
            </div>
            {form.allowOrgOverride ? (
              <CheckCircle2 className="h-5 w-5 text-primary-600" />
            ) : (
              <XCircle className="h-5 w-5 text-text-tertiary" />
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

export default AdminPlanEnvironmentPage;
