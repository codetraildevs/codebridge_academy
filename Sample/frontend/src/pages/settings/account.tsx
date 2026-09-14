import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@stores/auth-store';
import { settingsService } from '@services/settings-service';

function successMessage(setter: (msg: string) => void, msg: string) {
  setter(msg);
  setTimeout(() => setter(''), 4000);
}

const avatarPalette = ['#f37d2d', '#2965ff', '#10b981', '#7c3aed', '#ef4444', '#f59e0b', '#14b8a6', '#3b82f6'];

function getAvatarStyle(name: string) {
  const value = name.trim() || 'Workspace';
  const hash = [...value].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const background = avatarPalette[hash % avatarPalette.length];
  return {
    background,
    initials: value
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'W',
  };
}

export function AccountSettingsPage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [displayName, setDisplayName] = useState(() => [user?.firstName, user?.lastName].filter(Boolean).join(' '));
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const hasChanges = displayName.trim() !== [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();

  const profileMutation = useMutation({
    mutationFn: () => settingsService.updateProfile({ firstName: firstName.trim(), lastName: lastName.trim() }),
    onSuccess: (updated) => {
      setUser({ ...user!, ...updated });
      successMessage(setMsg, 'Profile updated successfully');
    },
    onError: (e: Error) => setErr(e.message),
  });

  const avatar = getAvatarStyle(displayName || 'Workspace');

  const handleWorkspaceNameChange = (value: string) => {
    setDisplayName(value);

    const trimmedValue = value.trim();
    const parts = trimmedValue.split(/\s+/).filter(Boolean);

    if (parts.length === 0) {
      setFirstName('');
      setLastName('');
      return;
    }

    setFirstName(parts[0] ?? '');
    setLastName(parts.slice(1).join(' '));
  };

  return (
    <div className="min-h-[60vh] bg-transparent px-2 py-6 text-[#1d2a40] sm:px-4 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-8 text-[1.9rem] font-semibold tracking-[-0.04em] text-[#1d2a40]">Basic info</h2>

        <div className="space-y-6">
          <div className="grid items-center gap-6 border-b border-[#dfe3e8] pb-6 lg:grid-cols-[1fr_1.7fr]">
            <div>
              <h3 className="text-[1.6rem] font-semibold tracking-[-0.03em] text-[#1f2d3d]">Account logo</h3>
              <p className="mt-2 max-w-xs text-base leading-7 text-[#5a6473]">An image to represent your account</p>
            </div>

            <div className="flex justify-center lg:justify-start">
              <div className="relative inline-flex items-center justify-center">
                <div
                  className="flex h-[150px] w-[150px] items-center justify-center rounded-full text-[3.2rem] font-semibold tracking-[-0.08em] text-white shadow-[0_8px_20px_rgba(29,42,64,0.12)]"
                  style={{ backgroundColor: avatar.background }}
                >
                  {avatar.initials}
                </div>
              </div>
            </div>
          </div>

          <div className="grid items-center gap-6 border-b border-[#dfe3e8] pb-6 lg:grid-cols-[1fr_1.7fr]">
            <div>
              <h3 className="text-[1.6rem] font-semibold tracking-[-0.03em] text-[#1f2d3d]">Account name</h3>
              <p className="mt-2 max-w-xs text-base leading-7 text-[#5a6473]">e.g. your full name</p>
            </div>

            <div className="w-full max-w-[700px]">
              <div className="flex flex-col gap-3">
                <input
                  type="text"
                  value={displayName}
                  aria-label="Account name"
                  onChange={(e) => handleWorkspaceNameChange(e.target.value)}
                  className="h-[52px] w-full rounded-xl border border-[#d5d9df] bg-white px-4 text-[1.1rem] font-medium tracking-[-0.02em] text-[#1e2d3d] outline-none transition focus:border-[#b8c4d9] focus:ring-2 focus:ring-[#dfeaff]"
                />

                <div className="flex items-center justify-end gap-3">
                  {msg && <p className="flex items-center gap-1.5 text-sm text-[#1d7f56]"><CheckCircle2 className="h-4 w-4" /> {msg}</p>}
                  {err && <p className="flex items-center gap-1.5 text-sm text-[#d62d4d]"><AlertCircle className="h-4 w-4" /> {err}</p>}
                  {hasChanges && (
                    <button
                      type="button"
                      onClick={() => profileMutation.mutate()}
                      disabled={profileMutation.isPending || (!firstName.trim() && !lastName.trim())}
                      className="inline-flex items-center justify-center rounded-full bg-[#1f2d3d] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#172434] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {profileMutation.isPending ? 'Saving...' : 'Save changes'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AccountSettingsPage;