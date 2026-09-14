import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardBody } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import { adminService, type SubscriberEnvironmentResponse } from '@services/admin-service';
import { EnvironmentConfigEditor, type EnvFormState } from './components/EnvironmentConfigEditor';
import {
  ArrowLeft,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

const DEFAULT_ENV: EnvFormState = {
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
};

export function AdminUserEnvironmentPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [subscriberData, setSubscriberData] = useState<SubscriberEnvironmentResponse | null>(null);
  const [form, setForm] = useState<EnvFormState>(DEFAULT_ENV);

  useEffect(() => {
    if (userId) loadData();
  }, [userId]);

  const loadData = async () => {
    if (!userId) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const data = await adminService.getSubscriberEnvironment('user', userId);
      setSubscriberData(data);
      // Load from subscriber override first, or plan defaults, or fallback defaults
      const source = data.subscriberEnvironmentConfig ?? data.planEnvironmentConfig;
      if (source) {
        setForm({
          allowPracticalExam: source.allowPracticalExam,
          allowTheoreticalExam: source.allowTheoreticalExam,
          allowMixedExam: source.allowMixedExam,
          enableAiScoring: source.enableAiScoring,
          enableAiOralDefense: source.enableAiOralDefense,
          enableAiPlagiarismCheck: source.enableAiPlagiarismCheck,
          enableAiFeedback: source.enableAiFeedback,
          enableAiLearningRecs: source.enableAiLearningRecs,
          enableDynamicWorkspace: source.enableDynamicWorkspace,
          enableDiagramEditor: source.enableDiagramEditor,
          enableCodeEditor: source.enableCodeEditor,
          enableFileUpload: source.enableFileUpload,
          enableWebcamProctoring: source.enableWebcamProctoring,
          enableFullScreenLockdown: source.enableFullScreenLockdown,
          enableOralDefense: source.enableOralDefense,
          enablePortfolioBuilder: source.enablePortfolioBuilder,
          enableCertificateIssue: source.enableCertificateIssue,
          maxDurationPerExam: source.maxDurationPerExam,
          maxSectionsPerExam: source.maxSectionsPerExam,
          maxQuestionsPerSection: source.maxQuestionsPerSection,
        });
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load environment config');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await adminService.updateSubscriberEnvironment('user', userId, form);
      setSuccess('Environment configuration saved successfully');
      loadData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save environment config');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!userId) return;
    try {
      setSaving(true);
      await adminService.deleteSubscriberEnvironment('user', userId);
      setSuccess('Reset to plan defaults. Refresh to see plan config.');
      loadData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to reset');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!subscriberData) {
    return (
      <div className="text-center py-20">
        <p className="text-text-tertiary">User not found</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate('/admin/individual-environments')}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to Users
        </Button>
      </div>
    );
  }

  const hasOverride = !!subscriberData.subscriberEnvironmentConfig;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/admin/individual-environments')}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              {subscriberData.subscriber.name}
            </h1>
            <p className="text-sm text-text-tertiary">
              {subscriberData.subscriber.email} · Individual Candidate
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={loadData}>
            <RefreshCw className="mr-1 h-3 w-3" /> Refresh
          </Button>
          {hasOverride && (
            <Badge variant="warning" size="sm">Custom Override</Badge>
          )}
        </div>
      </div>

      {/* Plan Info */}
      <Card>
        <CardBody>
          <div className="flex items-center gap-3">
            <ExternalLink className="h-5 w-5 text-primary-500" />
            <div className="text-sm">
              <span className="text-text-secondary">Subscription Plan: </span>
              <span className="font-medium text-text-primary">
                {subscriberData.planEnvironmentConfig ? 'Has Active Plan' : 'No Plan / Free Trial'}
              </span>
              {subscriberData.subscriberEnvironmentConfig && (
                <span className="ml-2 text-text-tertiary">
                  · Using custom override (reset to use plan defaults)
                </span>
              )}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Environment Config Editor */}
      <EnvironmentConfigEditor
        form={form}
        onChange={setForm}
        onSave={handleSave}
        onReset={handleReset}
        saving={saving}
        error={error}
        success={success}
        title={`Environment Configuration for ${subscriberData.subscriber.name}`}
        showReset={true}
      />
    </div>
  );
}

export default AdminUserEnvironmentPage;