import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardBody } from '@components/ui/card';
import { Badge } from '@components/ui/badge';
import { cn } from '@utils/cn';
import { useAuthStore } from '@stores/auth-store';
import { settingsService, type SettingsBundle } from '@services/settings-service';
import {
  User,
  ShieldCheck,
  Bell,
  CreditCard,
  Building2,
  GraduationCap,
  AlertCircle,
  KeyRound,
} from 'lucide-react';

const ROLE_LABELS: Record<string, string> = {
  PLATFORM_OWNER: 'Platform Owner',
  ORGANIZATION_OWNER: 'Organization Owner',
  ADMIN: 'Administrator',
  DESIGNER: 'Designer',
  ASSESSOR: 'Assessor',
  ORGANIZATION_REVIEWER: 'Organization Reviewer',
  CANDIDATE: 'Candidate',
  INDIVIDUAL_CANDIDATE: 'Individual Candidate',
};

function roleBadgeVariant(role: string): 'info' | 'success' | 'warning' | 'neutral' {
  if (role === 'PLATFORM_OWNER') return 'info';
  if (role === 'CANDIDATE' || role === 'INDIVIDUAL_CANDIDATE') return 'success';
  if (role === 'ASSESSOR' || role === 'DESIGNER') return 'warning';
  return 'neutral';
}

function initials(firstName: string, lastName: string) {
  return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase();
}

export function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const [settings, setSettings] = useState<SettingsBundle | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    settingsService
      .getSettings()
      .then(setSettings)
      .catch(() => setError('Failed to load settings.'));
  }, []);

  const summaryCards = [
    {
      label: 'Profile',
      value: settings ? `${settings.firstName} ${settings.lastName}` : '—',
      sub: settings?.email ?? '—',
      icon: User,
      to: '/account',
      accent: 'bg-info-light text-info-dark',
    },
    {
      label: 'Security',
      value: settings?.security.mfaEnabled ? 'MFA enabled' : 'MFA not set up',
      sub: `${settings?.security.activeSessions ?? 0} active session${settings?.security.activeSessions === 1 ? '' : 's'}`,
      icon: ShieldCheck,
      to: '/settings/security',
      accent: 'bg-success-light text-success-dark',
    },
    {
      label: 'Notifications',
      value: settings ? (settings.notificationPreferences?.emailEnabled ? 'Email on' : 'Email off') : '—',
      sub: settings ? `${settings.notificationPreferences?.inAppEnabled ? 'In-app on' : 'In-app off'} · ${settings.notificationPreferences?.securityAlerts ? 'Alerts on' : 'Alerts off'}` : '—',
      icon: Bell,
      to: '/notifications',
      accent: 'bg-warning-light text-warning-dark',
    },
    {
      label: 'Subscription',
      value: settings?.subscriptionPlan?.name ?? 'Free trial',
      sub: settings?.organization?.name ?? `${settings?.security.activeMfaDevices ?? 0} MFA device${settings?.security.activeMfaDevices === 1 ? '' : 's'}`,
      icon: CreditCard,
      to: '/settings/plans',
      accent: 'bg-surface-tertiary text-text-secondary',
    },
  ];

  return (
    <div className="space-y-6">
      {error && (
        <p className="flex items-center gap-1.5 rounded-lg bg-error-light px-3 py-2 text-sm text-error">
          <AlertCircle className="h-4 w-4" /> {error}
        </p>
      )}

      {/* Profile hero */}
      <Card className="bg-gradient-to-r from-[#2965ff]/5 to-transparent">
        <CardHeader className="mb-0">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#2965ff] text-lg font-semibold text-white">
              {initials(settings?.firstName ?? user?.firstName ?? '', settings?.lastName ?? user?.lastName ?? '')}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-text-primary">
                  {settings ? `${settings.firstName} ${settings.lastName}` : user?.firstName ?? 'Account'}
                </h2>
                <Badge variant={roleBadgeVariant(settings?.role ?? user?.role ?? '')}>
                  {ROLE_LABELS[settings?.role ?? user?.role ?? ''] ?? settings?.role ?? user?.role}
                </Badge>
              </div>
              <p className="mt-0.5 text-sm text-text-secondary">{settings?.email ?? user?.email}</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Role-specific context */}
      <div className="grid gap-4 sm:grid-cols-2">
        {settings?.organization && (
          <Card>
            <CardBody className="flex items-start gap-3">
              <Building2 className="mt-0.5 h-5 w-5 text-primary-600" />
              <div>
                <p className="text-sm text-text-secondary">Organization</p>
                <p className="font-medium text-text-primary">{settings.organization.name}</p>
                <p className="text-xs text-text-tertiary">
                  {settings.organization.type.replace(/_/g, ' ').toLowerCase()} · {settings.organization.code}
                </p>
              </div>
            </CardBody>
          </Card>
        )}
        {settings?.candidate && (
          <Card>
            <CardBody className="flex items-start gap-3">
              <GraduationCap className="mt-0.5 h-5 w-5 text-primary-600" />
              <div>
                <p className="text-sm text-text-secondary">Candidate profile</p>
                <p className="font-medium text-text-primary">{settings.candidate.registrationNumber}</p>
                <Badge variant="success" dot>
                  Active
                </Badge>
              </div>
            </CardBody>
          </Card>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <Link key={card.label} to={card.to} className="group">
            <Card interactive>
              <CardBody>
                <div className={cn('mb-3 flex h-9 w-9 items-center justify-center rounded-lg', card.accent)}>
                  <card.icon className="h-4 w-4" />
                </div>
                <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">{card.label}</p>
                <p className="mt-0.5 truncate font-medium text-text-primary" title={card.value}>
                  {card.value}
                </p>
                <p className="mt-0.5 truncate text-xs text-text-secondary" title={card.sub}>
                  {card.sub}
                </p>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick action strip */}
      <Card>
        <CardBody className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-warning-light text-warning-dark">
              <KeyRound className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">Two-factor authentication</p>
              <p className="text-xs text-text-secondary">
                {settings?.security.mfaEnabled
                  ? 'Your account is protected by an authenticator app.'
                  : 'Add an authenticator app to protect your account.'}
              </p>
            </div>
          </div>
          <Link
            to="/settings/security"
            className="rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-tertiary"
          >
            {settings?.security.mfaEnabled ? 'Manage MFA' : 'Set up MFA'}
          </Link>
        </CardBody>
      </Card>
    </div>
  );
}

export default SettingsPage;