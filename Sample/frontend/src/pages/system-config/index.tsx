import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardBody } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { systemConfigApi, type SystemSettingsGrouped, type SystemSettingRow } from '@services/system-config-service';
import { Cog, CheckCircle2, Inbox } from 'lucide-react';

interface DraftEntry {
  key: string;
  value: unknown;
  original: SystemSettingRow;
}

export function SystemConfigPage() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Record<string, DraftEntry>>({});
  const [savedMsg, setSavedMsg] = useState('');

  const { data: grouped, isLoading, isError, refetch } = useQuery({
    queryKey: ['system-config'],
    queryFn: systemConfigApi.getSettings,
  });

  // Load drafts from the fetched settings on first load / refetch.
  useEffect(() => {
    if (grouped) {
      const next: Record<string, DraftEntry> = {};
      for (const rows of Object.values(grouped)) {
        for (const row of rows) {
          next[row.key] = { key: row.key, value: row.value, original: row };
        }
      }
      setDraft(next);
    }
  }, [grouped]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const changed = Object.values(draft)
        .filter((d) => JSON.stringify(d.value) !== JSON.stringify(d.original.value))
        .map((d) => ({ key: d.key, value: d.value }));
      return systemConfigApi.updateSettings(changed);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-config'] });
      setSavedMsg('Settings saved');
      setTimeout(() => setSavedMsg(''), 4000);
    },
  });

  const setValue = (key: string, value: unknown) => {
    setDraft((prev) => (prev[key] ? { ...prev, [key]: { ...prev[key], value } } : prev));
  };

  const changedCount = Object.values(draft).filter(
    (d) => JSON.stringify(d.value) !== JSON.stringify(d.original.value),
  ).length;

  if (isLoading) {
    return <div className="flex items-center justify-center py-16 text-sm text-text-tertiary">Loading settings...</div>;
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <Cog className="h-8 w-8 text-text-tertiary" />
        <p className="mt-3 text-sm text-text-secondary">Couldn't load system configuration.</p>
        <Button variant="secondary" size="sm" className="mt-3" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  if (!grouped || Object.keys(grouped).length === 0) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <Inbox className="h-8 w-8 text-text-tertiary" />
        <p className="mt-3 text-sm text-text-secondary">No system settings configured.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">System Configuration</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Platform-wide settings for branding, assessments, AI, and security
          </p>
        </div>
        <div className="flex items-center gap-3">
          {savedMsg && <span className="flex items-center gap-1.5 text-sm text-accent-700"><CheckCircle2 className="h-4 w-4" /> {savedMsg}</span>}
          <Button size="sm" loading={saveMutation.isPending} disabled={changedCount === 0} onClick={() => saveMutation.mutate()}>
            Save Changes{changedCount > 0 ? ` (${changedCount})` : ''}
          </Button>
        </div>
      </div>

      {Object.entries(grouped as SystemSettingsGrouped).map(([category, rows]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle>{category}</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="divide-y divide-border">
              {rows.map((row) => (
                <div key={row.key} className="grid gap-3 py-3 first:pt-0 last:pb-0 sm:grid-cols-2 sm:items-start">
                  <div>
                    <p className="text-sm font-medium text-text-primary">{row.label}</p>
                    <p className="mt-0.5 text-xs text-text-tertiary">{row.description}</p>
                  </div>
                  <div>
                    <SettingEditor
                      row={row}
                      value={draft[row.key]?.value}
                      onChange={(v) => setValue(row.key, v)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

function SettingEditor({
  row,
  value,
  onChange,
}: {
  row: SystemSettingRow;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  if (typeof row.value === 'boolean' || typeof value === 'boolean') {
    return (
      <select
        value={String(value ?? false)}
        onChange={(e) => onChange(e.target.value === 'true')}
        className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
      >
        <option value="true">Enabled</option>
        <option value="false">Disabled</option>
      </select>
    );
  }

  if (typeof row.value === 'number' || typeof value === 'number') {
    return (
      <input
        type="number"
        value={String(value ?? 0)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-lg border border-border px-3 py-2 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
      />
    );
  }

  return (
    <input
      type="text"
      value={String(value ?? '')}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-border px-3 py-2 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
    />
  );
}

export default SystemConfigPage;
