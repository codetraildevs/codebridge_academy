import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardBody } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Badge } from '@components/ui/badge';
import {
  adminService,
  type AdminOrganizationDetail,
  type SubscriptionPlanDetail,
  type SubscriberEnvironmentResponse,
} from '@services/admin-service';
import { subscriptionService } from '@services/subscription-service';
import type { SubscriptionPlan } from '../../types';
import { EnvironmentConfigEditor, type EnvFormState } from './components/EnvironmentConfigEditor';
import {
  Building2,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Users,
  FileCheck,
  Award,
  CreditCard,
  Save,
  Settings2,
  ExternalLink,
  Edit3,
} from 'lucide-react';

const ORG_TYPE_LABELS: Record<string, string> = {
  TVET_SCHOOL: 'TVET School',
  SECONDARY_SCHOOL: 'Secondary School',
  UNIVERSITY: 'University',
  COMPANY: 'Company',
  GOVERNMENT_INSTITUTION: 'Government',
  EXAMINATION_AUTHORITY: 'Exam Authority',
  CERTIFICATION_BODY: 'Certification Body',
  NGO: 'NGO',
  TRAINING_CENTER: 'Training Center',
  OTHER: 'Other',
};

export function AdminOrganizationDetailPage() {
  const { organizationId } = useParams<{ organizationId: string }>();
  const navigate = useNavigate();

  const [org, setOrg] = useState<AdminOrganizationDetail | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [subscriptionStatus, setSubscriptionStatus] = useState('');
  const [maxUsers, setMaxUsers] = useState(0);
  const [maxCandidates, setMaxCandidates] = useState(0);
  const [maxJobPostings, setMaxJobPostings] = useState(0);

  // ── Environment override state ────────────────
  const [showEnvEditor, setShowEnvEditor] = useState(false);
  const [subscriberEnv, setSubscriberEnv] = useState<SubscriberEnvironmentResponse | null>(null);
  const [envForm, setEnvForm] = useState<EnvFormState>({
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
  });
  const [envSaving, setEnvSaving] = useState(false);
  const [envError, setEnvError] = useState('');
  const [envSuccess, setEnvSuccess] = useState('');

  useEffect(() => {
    if (organizationId) loadData();
  }, [organizationId]);

  const loadData = async () => {
    if (!organizationId) return;
    setLoading(true);
    setError('');
    try {
      const [orgData, plansData, envData] = await Promise.all([
        adminService.getOrganizationDetail(organizationId),
        subscriptionService.listPlans('ORGANIZATION'),
        adminService.getSubscriberEnvironment('organization', organizationId),
      ]);
      setOrg(orgData);
      setPlans(plansData);
      setSubscriberEnv(envData);
      setSelectedPlanId(orgData.subscriptionPlanId || '');
      setSubscriptionStatus(orgData.subscriptionStatus);
      setMaxUsers(orgData.maxUsers);
      setMaxCandidates(orgData.maxCandidates);
      setMaxJobPostings(orgData.maxJobPostings);

      // Load env form from subscriber override or plan defaults
      const source = envData.subscriberEnvironmentConfig ?? envData.planEnvironmentConfig;
      if (source) {
        setEnvForm({
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
      setError(err?.response?.data?.message || 'Failed to load organization');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEnv = async () => {
    if (!organizationId) return;
    setEnvSaving(true);
    setEnvError('');
    setEnvSuccess('');
    try {
      await adminService.updateSubscriberEnvironment('organization', organizationId, envForm);
      setEnvSuccess('Environment configuration saved');
      loadData();
    } catch (err: any) {
      setEnvError(err?.response?.data?.message || 'Failed to save');
    } finally {
      setEnvSaving(false);
    }
  };

  const handleResetEnv = async () => {
    if (!organizationId) return;
    setEnvSaving(true);
    setEnvError('');
    setEnvSuccess('');
    try {
      await adminService.deleteSubscriberEnvironment('organization', organizationId);
      setEnvSuccess('Reset to plan defaults');
      loadData();
    } catch (err: any) {
      setEnvError(err?.response?.data?.message || 'Failed to reset');
    } finally {
      setEnvSaving(false);
    }
  };

  const handleSaveSubscription = async () => {
    if (!organizationId) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await adminService.updateOrganizationSubscription(organizationId, {
        subscriptionPlanId: selectedPlanId || undefined,
        subscriptionStatus: subscriptionStatus || undefined,
        maxUsers,
        maxCandidates,
        maxJobPostings,
      });
      setSuccess('Subscription updated successfully');
      loadData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to update subscription');
    } finally {
      setSaving(false);
    }
  };

  const handleVerify = async () => {
    if (!organizationId) return;
    try {
      await adminService.verifyOrganization(organizationId);
      setSuccess('Organization verified and activated');
      loadData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to verify organization');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!org) {
    return (
      <div className="text-center py-20">
        <p className="text-text-tertiary">Organization not found</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate('/admin/organizations')}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to Organizations
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/admin/organizations')}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">{org.name}</h1>
            <p className="text-sm text-text-tertiary">
              {ORG_TYPE_LABELS[org.organizationType]} &middot; {org.code}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={loadData}>
            <RefreshCw className="mr-1 h-3 w-3" /> Refresh
          </Button>
          {!org.isVerified && (
            <Button variant="success" size="sm" onClick={handleVerify}>
              <CheckCircle2 className="mr-1 h-3 w-3" /> Verify & Activate
            </Button>
          )}
        </div>
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

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card padding="sm">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-primary-500" />
            <div>
              <p className="text-xs text-text-tertiary">Users</p>
              <p className="text-lg font-bold">{org._count.users}</p>
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-secondary-500" />
            <div>
              <p className="text-xs text-text-tertiary">Candidates</p>
              <p className="text-lg font-bold">{org._count.candidates}</p>
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center gap-3">
            <FileCheck className="h-5 w-5 text-accent-500" />
            <div>
              <p className="text-xs text-text-tertiary">Exams</p>
              <p className="text-lg font-bold">{org._count.exams}</p>
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center gap-3">
            <Award className="h-5 w-5 text-warning" />
            <div>
              <p className="text-xs text-text-tertiary">Certificates</p>
              <p className="text-lg font-bold">{org._count.certificates}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Subscription Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary-500" />
            Subscription Management
          </CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">
                Subscription Plan
              </label>
              <select
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="">No plan</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (RWF {p.price.toLocaleString()}/{p.billingCycle})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">
                Subscription Status
              </label>
              <select
                value={subscriptionStatus}
                onChange={(e) => setSubscriptionStatus(e.target.value)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="">Select status</option>
                <option value="ACTIVE">Active</option>
                <option value="TRIAL">Trial</option>
                <option value="PENDING">Pending</option>
                <option value="EXPIRED">Expired</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              label="Max Users"
              type="number"
              value={maxUsers}
              onChange={(e) => setMaxUsers(Number(e.target.value))}
            />
            <Input
              label="Max Candidates"
              type="number"
              value={maxCandidates}
              onChange={(e) => setMaxCandidates(Number(e.target.value))}
            />
            <Input
              label="Max Job Postings"
              type="number"
              value={maxJobPostings}
              onChange={(e) => setMaxJobPostings(Number(e.target.value))}
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSaveSubscription} loading={saving}>
              <Save className="mr-1 h-4 w-4" /> Save Changes
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Environment Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary-500" />
            Environment Configuration
          </CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          {!showEnvEditor ? (
            <>
              {subscriberEnv?.planEnvironmentConfig ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-text-secondary">
                      {subscriberEnv.subscriberEnvironmentConfig
                        ? 'This organization has a custom environment override.'
                        : `Using environment settings from the plan.`}
                    </p>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setShowEnvEditor(true)}
                    >
                      <Edit3 className="mr-1 h-3 w-3" />
                      {subscriberEnv.subscriberEnvironmentConfig ? 'Edit Override' : 'Override Settings'}
                    </Button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <EnvToggle
                      label="Practical Exams"
                      enabled={subscriberEnv.effectiveConfig?.allowPracticalExam ?? false}
                    />
                    <EnvToggle
                      label="Theoretical Exams"
                      enabled={subscriberEnv.effectiveConfig?.allowTheoreticalExam ?? false}
                    />
                    <EnvToggle
                      label="Mixed Exams"
                      enabled={subscriberEnv.effectiveConfig?.allowMixedExam ?? false}
                    />
                    <EnvToggle
                      label="AI Scoring"
                      enabled={subscriberEnv.effectiveConfig?.enableAiScoring ?? false}
                    />
                    <EnvToggle
                      label="AI Oral Defense"
                      enabled={subscriberEnv.effectiveConfig?.enableAiOralDefense ?? false}
                    />
                    <EnvToggle
                      label="AI Plagiarism Check"
                      enabled={subscriberEnv.effectiveConfig?.enableAiPlagiarismCheck ?? false}
                    />
                    <EnvToggle
                      label="Dynamic Workspace"
                      enabled={subscriberEnv.effectiveConfig?.enableDynamicWorkspace ?? false}
                    />
                    <EnvToggle
                      label="Diagram Editor"
                      enabled={subscriberEnv.effectiveConfig?.enableDiagramEditor ?? false}
                    />
                    <EnvToggle
                      label="Code Editor"
                      enabled={subscriberEnv.effectiveConfig?.enableCodeEditor ?? false}
                    />
                    <EnvToggle
                      label="Webcam Proctoring"
                      enabled={subscriberEnv.effectiveConfig?.enableWebcamProctoring ?? false}
                    />
                    <EnvToggle
                      label="Full Screen Lockdown"
                      enabled={subscriberEnv.effectiveConfig?.enableFullScreenLockdown ?? false}
                    />
                    <EnvToggle
                      label="Oral Defense"
                      enabled={subscriberEnv.effectiveConfig?.enableOralDefense ?? false}
                    />
                    <EnvToggle
                      label="Portfolio Builder"
                      enabled={subscriberEnv.effectiveConfig?.enablePortfolioBuilder ?? false}
                    />
                    <EnvToggle
                      label="Certificate Issuance"
                      enabled={subscriberEnv.effectiveConfig?.enableCertificateIssue ?? false}
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <InfoBox
                      label="Max Duration"
                      value={`${subscriberEnv.effectiveConfig?.maxDurationPerExam ?? 120} min`}
                    />
                    <InfoBox
                      label="Max Sections"
                      value={String(subscriberEnv.effectiveConfig?.maxSectionsPerExam ?? 10)}
                    />
                    <InfoBox
                      label="Max Questions/Section"
                      value={String(subscriberEnv.effectiveConfig?.maxQuestionsPerSection ?? 20)}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-lg bg-surface-tertiary p-4">
                  <AlertCircle className="h-5 w-5 text-text-tertiary" />
                  <p className="text-sm text-text-tertiary">
                    No environment configuration found. Assign a subscription plan with an environment config, or create an override.
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowEnvEditor(true)}
                  >
                    <Edit3 className="mr-1 h-3 w-3" /> Create Override
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-text-primary">
                  {subscriberEnv?.subscriberEnvironmentConfig
                    ? 'Editing Custom Environment Override'
                    : 'Creating Custom Environment Override'}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setShowEnvEditor(false); loadData(); }}
                >
                  Cancel
                </Button>
              </div>
              <EnvironmentConfigEditor
                form={envForm}
                onChange={setEnvForm}
                onSave={handleSaveEnv}
                onReset={handleResetEnv}
                saving={envSaving}
                error={envError}
                success={envSuccess}
                showReset={!!subscriberEnv?.subscriberEnvironmentConfig}
              />
            </div>
          )}
        </CardBody>
      </Card>

      {/* Usage Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5 text-primary-500" />
            Usage Summary
          </CardTitle>
        </CardHeader>
        <CardBody>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg bg-surface-secondary p-4">
              <p className="text-xs text-text-tertiary">Usage Records</p>
              <p className="mt-1 text-2xl font-bold">{org.usage?.totalRecords ?? 0}</p>
            </div>
            <div className="rounded-lg bg-surface-secondary p-4">
              <p className="text-xs text-text-tertiary">Total Billed</p>
              <p className="mt-1 text-2xl font-bold">
                RWF {(org.usage?.totalBilled ?? 0).toLocaleString()}
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function EnvToggle({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-white px-3 py-2">
      <span className="text-xs font-medium text-text-primary">{label}</span>
      {enabled ? (
        <Badge variant="success" size="sm">Enabled</Badge>
      ) : (
        <Badge variant="neutral" size="sm">Disabled</Badge>
      )}
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface-secondary p-3">
      <p className="text-xs text-text-tertiary">{label}</p>
      <p className="mt-1 text-sm font-semibold text-text-primary">{value}</p>
    </div>
  );
}

export default AdminOrganizationDetailPage;
