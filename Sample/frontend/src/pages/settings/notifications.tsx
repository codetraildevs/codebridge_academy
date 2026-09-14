import { useCallback, useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardBody } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { settingsService, type NotificationPreferences } from '@services/settings-service';
import { Mail, Smartphone, Bell, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@utils/cn';

type PrefKey = keyof NotificationPreferences;
type PrefGroup = { key: PrefKey; label: string; description: string };

const CHANNEL_GROUPS: PrefGroup[] = [
  { key: 'emailEnabled', label: 'Email notifications', description: 'Receive updates via email.' },
  { key: 'smsEnabled', label: 'SMS notifications', description: 'Receive updates via SMS.' },
  { key: 'inAppEnabled', label: 'In-app notifications', description: 'Show updates in your notification inbox.' },
];

const TOPIC_GROUPS: PrefGroup[] = [
  { key: 'examPublished', label: 'Exam published', description: 'When a new exam you care about is published.' },
  { key: 'examReminders', label: 'Exam reminders', description: 'Reminders before scheduled exams or assessments.' },
  { key: 'submissionUpdates', label: 'Submission updates', description: 'Progress updates on your exam submissions.' },
  { key: 'resultsReleased', label: 'Results released', description: 'When your results or scores are published.' },
  { key: 'certificates', label: 'Certificates', description: 'When a certificate is issued or becomes available.' },
  { key: 'assessmentReviews', label: 'Assessment reviews', description: 'When an assessor reviews or completes your assessment.' },
  { key: 'systemAnnouncements', label: 'System announcements', description: 'Important platform announcements and maintenance.' },
  { key: 'securityAlerts', label: 'Security alerts', description: 'Sign-in alerts, password changes, and MFA events.' },
  { key: 'marketing', label: 'Marketing & tips', description: 'Occasional product news, tips, and offers.' },
];

const CHANNEL_ICONS = {
  emailEnabled: Mail,
  smsEnabled: Smartphone,
  inAppEnabled: Bell,
};

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#2965ff] focus:ring-offset-2',
        checked ? 'bg-[#2965ff]' : 'bg-gray-300',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1',
        )}
      />
    </button>
  );
}

export function NotificationsSettingsPage() {
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const settings = await settingsService.getSettings();
      setPrefs(settings.notificationPreferences);
    } catch (e) {
      const err = e as { response?: { status?: number; data?: { message?: string } }; message?: string };
      const status = err?.response?.status;
      const message = err?.response?.data?.message || err?.message || 'Unknown error';
      setError(`Failed to load notification preferences (${status ?? 'network'}): ${message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveMutation = useMutation({
    mutationFn: () => settingsService.updateNotificationPreferences(prefs!),
    onSuccess: (updated) => {
      setPrefs(updated);
      setDirty(false);
      setMsg('Notification preferences saved');
      setTimeout(() => setMsg(''), 4000);
    },
    onError: (e: Error) => {
      setError(e.message);
      setTimeout(() => setError(''), 5000);
    },
  });

  const toggle = (key: PrefKey) => {
    setPrefs((prev) => {
      if (!prev) return prev;
      return { ...prev, [key]: !prev[key] };
    });
    setDirty(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-text-tertiary">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!prefs) {
    return (
      <div className="space-y-4 animate-fade-in">
        <p className="flex items-center gap-1.5 rounded-lg bg-error-light px-3 py-2 text-sm text-error">
          <AlertCircle className="h-4 w-4" /> {error || 'Failed to load notification preferences.'}
        </p>
        <Button variant="secondary" size="sm" onClick={load}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {msg && (
        <p className="flex items-center gap-1.5 text-sm text-accent-700">
          <CheckCircle2 className="h-4 w-4" /> {msg}
        </p>
      )}
      {error && (
        <p className="flex items-center gap-1.5 rounded-lg bg-error-light px-3 py-2 text-sm text-error">
          <AlertCircle className="h-4 w-4" /> {error}
        </p>
      )}

      {/* Channels */}
      <Card>
        <CardHeader>
          <CardTitle>Delivery channels</CardTitle>
        </CardHeader>
        <CardBody>
          <ul className="space-y-4">
            {CHANNEL_GROUPS.map((group) => {
              const Icon = CHANNEL_ICONS[group.key as keyof typeof CHANNEL_ICONS];
              return (
                <li key={group.key} className="flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-tertiary text-text-secondary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-primary">{group.label}</p>
                      <p className="text-xs text-text-secondary">{group.description}</p>
                    </div>
                  </div>
                  <Toggle checked={prefs[group.key]} onChange={() => toggle(group.key)} />
                </li>
              );
            })}
          </ul>
        </CardBody>
      </Card>

      {/* Topics */}
      <Card>
        <CardHeader>
          <CardTitle>Topics</CardTitle>
        </CardHeader>
        <CardBody>
          <ul className="divide-y divide-border">
            {TOPIC_GROUPS.map((group) => (
              <li key={group.key} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="text-sm font-medium text-text-primary">{group.label}</p>
                  <p className="text-xs text-text-secondary">{group.description}</p>
                </div>
                <Toggle checked={prefs[group.key]} onChange={() => toggle(group.key)} />
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>

      <div className="flex justify-end">
        <Button loading={saveMutation.isPending} disabled={!dirty} onClick={() => saveMutation.mutate()}>
          Save Preferences
        </Button>
      </div>
    </div>
  );
}

export default NotificationsSettingsPage;