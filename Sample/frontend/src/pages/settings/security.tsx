import { useCallback, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardBody } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import { Input } from '@components/ui/input';
import { Modal } from '@components/ui/modal';
import { settingsService, type UserSessionInfo } from '@services/settings-service';
import { useAuthStore } from '@stores/auth-store';
import {
  ShieldCheck,
  KeyRound,
  Smartphone,
  MonitorSmartphone,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@utils/cn';

function successMessage(setter: (msg: string) => void, msg: string) {
  setter(msg);
  setTimeout(() => setter(''), 5000);
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

function deviceLabel(session: UserSessionInfo) {
  const parts = [session.browser, session.os, session.deviceType, session.device].filter(Boolean);
  return parts.join(' · ') || 'Unknown device';
}

export function SecuritySettingsPage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const queryClient = useQueryClient();

  const [mfaMsg, setMfaMsg] = useState('');
  const [mfaErr, setMfaErr] = useState('');

  // MFA setup flow
  const [setupOpen, setSetupOpen] = useState(false);
  const [setupStep, setSetupStep] = useState<'password' | 'code'>('password');
  const [setupPassword, setSetupPassword] = useState('');
  const [setupCode, setSetupCode] = useState('');
  const [setupData, setSetupData] = useState<{ secret: string; qrCode: string } | null>(null);

  // MFA disable flow
  const [disableOpen, setDisableOpen] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [disableCode, setDisableCode] = useState('');

  const sessions = useQuery({
    queryKey: ['sessions'],
    queryFn: settingsService.getSessions,
  });

  const startMfaSetupMutation = useMutation({
    mutationFn: () => settingsService.startMfaSetup(setupPassword),
    onSuccess: (data) => {
      setSetupData(data);
      setSetupStep('code');
      setSetupCode('');
      setMfaErr('');
    },
    onError: (e: Error) => setMfaErr(e.message),
  });

  const verifyMfaSetupMutation = useMutation({
    mutationFn: () => settingsService.verifyMfaSetup(setupCode),
    onSuccess: () => {
      setUser({ ...user!, mfaEnabled: true });
      setSetupOpen(false);
      setSetupStep('password');
      setSetupPassword('');
      setSetupData(null);
      successMessage(setMfaMsg, 'Two-factor authentication enabled');
    },
    onError: (e: Error) => setMfaErr(e.message),
  });

  const disableMfaMutation = useMutation({
    mutationFn: () => settingsService.disableMfa(disablePassword, disableCode),
    onSuccess: () => {
      setUser({ ...user!, mfaEnabled: false });
      setDisableOpen(false);
      setDisablePassword('');
      setDisableCode('');
      successMessage(setMfaMsg, 'Two-factor authentication disabled');
    },
    onError: (e: Error) => setMfaErr(e.message),
  });

  const revokeMutation = useMutation({
    mutationFn: settingsService.revokeSession,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sessions'] }),
    onError: (e: Error) => setMfaErr(e.message),
  });

  const revokeAllMutation = useMutation({
    mutationFn: settingsService.revokeAllSessions,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sessions'] }),
    onError: (e: Error) => setMfaErr(e.message),
  });

  const refreshSessions = useCallback(() => {
    sessions.refetch();
  }, [sessions]);

  const openSetup = () => {
    setMfaErr('');
    setSetupStep('password');
    setSetupPassword('');
    setSetupCode('');
    setSetupData(null);
    setSetupOpen(true);
  };

  const openDisable = () => {
    setMfaErr('');
    setDisablePassword('');
    setDisableCode('');
    setDisableOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {mfaMsg && (
        <p className="flex items-center gap-1.5 text-sm text-accent-700">
          <CheckCircle2 className="h-4 w-4" /> {mfaMsg}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Two-Factor Authentication */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary-600" />
              Two-Factor Authentication
            </CardTitle>
          </CardHeader>
          <CardBody>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-lg',
                  user?.mfaEnabled ? 'bg-success-light text-success-dark' : 'bg-surface-tertiary text-text-secondary',
                )}>
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    {user?.mfaEnabled ? 'Enabled' : 'Not set up'}
                  </p>
                  <p className="mt-1 max-w-xs text-xs text-text-tertiary">
                    {user?.mfaEnabled
                      ? 'Sign-in requires a 6-digit code from your authenticator app (e.g. Google Authenticator, Authy).'
                      : 'Add an authenticator app to require a second verification step at sign-in.'}
                  </p>
                </div>
              </div>
              <Badge variant={user?.mfaEnabled ? 'success' : 'neutral'} dot>
                {user?.mfaEnabled ? 'Protected' : 'Off'}
              </Badge>
            </div>

            {mfaErr && (
              <p className="mt-3 flex items-center gap-1.5 text-sm text-error">
                <AlertCircle className="h-4 w-4" /> {mfaErr}
              </p>
            )}

            <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
              {user?.mfaEnabled ? (
                <Button size="sm" variant="danger" onClick={openDisable}>
                  Disable MFA
                </Button>
              ) : (
                <Button size="sm" onClick={openSetup}>
                  Set up MFA
                </Button>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Active sessions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MonitorSmartphone className="h-4 w-4 text-primary-600" />
              Active Sessions
            </CardTitle>
            <Button
              size="xs"
              variant="ghost"
              icon={<RefreshCw className="h-3.5 w-3.5" />}
              onClick={refreshSessions}
              loading={sessions.isFetching}
            >
              Refresh
            </Button>
          </CardHeader>
          <CardBody>
            {sessions.isLoading ? (
              <div className="flex items-center justify-center py-8 text-text-tertiary">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : sessions.error ? (
              <p className="flex items-center gap-1.5 text-sm text-error">
                <AlertCircle className="h-4 w-4" /> Failed to load sessions.
              </p>
            ) : sessions.data && sessions.data.length > 0 ? (
              <ul className="space-y-3">
                {sessions.data.map((session) => (
                  <li key={session.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-secondary px-3 py-2.5">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium text-text-primary">
                          {deviceLabel(session)}
                        </p>
                        {session.isCurrent && (
                          <Badge variant="success" dot>
                            Current
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-text-tertiary">
                        {session.ipAddress ?? 'Unknown IP'} · Active {formatDate(session.lastActiveAt ?? session.createdAt)}
                      </p>
                    </div>
                    {!session.isCurrent && (
                      <Button
                        size="xs"
                        variant="ghost"
                        iconOnly
                        title="Revoke session"
                        loading={revokeMutation.isPending && revokeMutation.variables === session.id}
                        onClick={() => revokeMutation.mutate(session.id)}
                      >
                        <Trash2 className="h-4 w-4 text-text-tertiary hover:text-error" />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-8 text-center text-sm text-text-tertiary">No active sessions.</p>
            )}

            {sessions.data && sessions.data.length > 1 && (
              <div className="mt-4 flex justify-end border-t border-border pt-4">
                <Button
                  size="sm"
                  variant="secondary"
                  loading={revokeAllMutation.isPending}
                  onClick={() => revokeAllMutation.mutate()}
                >
                  Sign out all other sessions
                </Button>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* MFA setup modal */}
      <Modal
        isOpen={setupOpen}
        onClose={() => !startMfaSetupMutation.isPending && !verifyMfaSetupMutation.isPending && setSetupOpen(false)}
        title="Set up two-factor authentication"
        description="Link your authenticator app to protect your account."
        showCloseButton={!startMfaSetupMutation.isPending && !verifyMfaSetupMutation.isPending}
      >
        {setupStep === 'password' ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              startMfaSetupMutation.mutate();
            }}
            className="space-y-4"
          >
            <Input
              label="Current password"
              type="password"
              value={setupPassword}
              onChange={(e) => setSetupPassword(e.target.value)}
              placeholder="Enter your password"
              required
              autoFocus
              fullWidth
              hint="We confirm your identity before generating a secret."
            />
            {mfaErr && (
              <p className="flex items-center gap-1.5 text-sm text-error">
                <AlertCircle className="h-4 w-4" /> {mfaErr}
              </p>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="secondary" onClick={() => setSetupOpen(false)} disabled={startMfaSetupMutation.isPending}>
                Cancel
              </Button>
              <Button type="submit" loading={startMfaSetupMutation.isPending} disabled={!setupPassword}>
                Continue
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-4 rounded-lg border border-border bg-surface-secondary p-4">
              {setupData?.qrCode && (
                <img src={setupData.qrCode} alt="Authenticator QR code" className="h-28 w-28 rounded-lg bg-white p-1" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-primary">Scan with your authenticator app</p>
                <p className="mt-1 text-xs text-text-tertiary">
                  Open Google Authenticator, Authy, or a compatible app and scan the QR code. If you cannot scan, enter the
                  secret manually.
                </p>
                {setupData?.secret && (
                  <p className="mt-2 rounded border border-dashed border-border bg-white px-2 py-1 font-mono text-xs text-text-secondary">
                    {setupData.secret}
                  </p>
                )}
              </div>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                verifyMfaSetupMutation.mutate();
              }}
              className="space-y-3"
            >
              <Input
                label="Verification code"
                type="text"
                inputMode="numeric"
                value={setupCode}
                onChange={(e) => setSetupCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                required
                autoFocus
                fullWidth
                hint="Enter the 6-digit code your app generates to confirm setup."
              />
              {mfaErr && (
                <p className="flex items-center gap-1.5 text-sm text-error">
                  <AlertCircle className="h-4 w-4" /> {mfaErr}
                </p>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setSetupStep('password');
                    setSetupData(null);
                    setMfaErr('');
                  }}
                  disabled={verifyMfaSetupMutation.isPending}
                >
                  Back
                </Button>
                <Button type="submit" loading={verifyMfaSetupMutation.isPending} disabled={setupCode.length !== 6}>
                  Enable MFA
                </Button>
              </div>
            </form>
          </div>
        )}
      </Modal>

      {/* MFA disable modal */}
      <Modal
        isOpen={disableOpen}
        onClose={() => !disableMfaMutation.isPending && setDisableOpen(false)}
        title="Disable two-factor authentication"
        description="Your password and a current code are required."
        size="sm"
        showCloseButton={!disableMfaMutation.isPending}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            disableMfaMutation.mutate();
          }}
          className="space-y-4"
        >
          <Input
            label="Current password"
            type="password"
            value={disablePassword}
            onChange={(e) => setDisablePassword(e.target.value)}
            required
            autoFocus
            fullWidth
          />
          <Input
            label="Authentication code"
            type="text"
            inputMode="numeric"
            value={disableCode}
            onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="123456"
            required
            fullWidth
          />
          {mfaErr && (
            <p className="flex items-center gap-1.5 text-sm text-error">
              <AlertCircle className="h-4 w-4" /> {mfaErr}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={() => setDisableOpen(false)} disabled={disableMfaMutation.isPending}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              loading={disableMfaMutation.isPending}
              disabled={!disablePassword || disableCode.length !== 6}
            >
              <KeyRound className="h-4 w-4" /> Disable MFA
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default SecuritySettingsPage;