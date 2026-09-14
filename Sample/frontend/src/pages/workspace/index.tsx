import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardBody } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import { workspaceApi, type WorkspaceModule } from '@services/workspace-service';
import { Boxes, Search, Plus, Inbox, Code2, X } from 'lucide-react';

type View = 'modules' | 'configuration';

export function WorkspacePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const view = (searchParams.get('view') as View) || 'modules';

  const setView = (v: View) => {
    if (v === 'modules') setSearchParams({});
    else setSearchParams({ view: v });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Workspace</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Manage the dynamic workspace modules available inside assessments
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-border bg-white p-1">
          {(['modules', 'configuration'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                view === v ? 'bg-primary-50 text-primary-700' : 'text-text-tertiary hover:text-text-primary'
              }`}
            >
              {v === 'modules' ? 'Modules' : 'Configuration'}
            </button>
          ))}
        </div>
      </div>

      {view === 'modules' ? <ModulesView /> : <ConfigurationView />}
    </div>
  );
}

// ── Modules view ────────────────────────────────

function ModulesView() {
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const queryClient = useQueryClient();

  const { data: modules, isLoading, isError, refetch } = useQuery({
    queryKey: ['workspace-modules'],
    queryFn: workspaceApi.listModules,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      workspaceApi.updateModule(id, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workspace-modules'] }),
  });

  const filtered = (modules ?? []).filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.moduleKey.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <>
      <Card>
        <CardBody>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search modules..."
                className="w-full rounded-lg border border-border py-2 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setShowCreate(true)}>
              New Module
            </Button>
          </div>
        </CardBody>
      </Card>

      {showCreate && (
        <CreateModuleForm onDone={() => { setShowCreate(false); queryClient.invalidateQueries({ queryKey: ['workspace-modules'] }); }} />
      )}

      <Card className="!p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-sm text-text-tertiary">Loading modules...</div>
        ) : isError ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Boxes className="h-8 w-8 text-text-tertiary" />
            <p className="mt-3 text-sm text-text-secondary">Couldn't load workspace modules.</p>
            <Button variant="secondary" size="sm" className="mt-3" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Inbox className="h-8 w-8 text-text-tertiary" />
            <p className="mt-3 text-sm text-text-secondary">No modules found.</p>
          </div>
        ) : (
          <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((m) => (
              <ModuleCard
                key={m.id}
                module={m}
                onToggle={(isActive) => toggleMutation.mutate({ id: m.id, isActive })}
                toggling={toggleMutation.isPending && toggleMutation.variables?.id === m.id}
              />
            ))}
          </div>
        )}
      </Card>
    </>
  );
}

function ModuleCard({
  module,
  onToggle,
  toggling,
}: {
  module: WorkspaceModule;
  onToggle: (isActive: boolean) => void;
  toggling: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface-secondary/50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50">
            <Code2 className="h-4.5 w-4.5 h-5 w-5 text-primary-600" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text-primary">{module.name}</p>
            <p className="truncate text-xs text-text-tertiary">{module.moduleKey}</p>
          </div>
        </div>
        <Badge variant={module.isActive ? 'success' : 'neutral'} dot>
          {module.isActive ? 'Active' : 'Inactive'}
        </Badge>
      </div>
      <p className="mt-3 line-clamp-2 min-h-[2.5rem] text-sm text-text-secondary">{module.description}</p>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-text-tertiary">
          Used by <span className="font-medium text-text-primary">{module.usageCount}</span> assessment{module.usageCount === 1 ? '' : 's'}
        </span>
        <button
          onClick={() => onToggle(!module.isActive)}
          disabled={toggling}
          className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50"
          style={{ backgroundColor: module.isActive ? '#059669' : '#d1d5db' }}
          aria-label={`Toggle ${module.name}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              module.isActive ? 'translate-x-4' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>
    </div>
  );
}

function CreateModuleForm({ onDone }: { onDone: () => void }) {
  const [moduleKey, setModuleKey] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => workspaceApi.createModule({ moduleKey: moduleKey.trim().toUpperCase(), name: name.trim(), description: description.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-modules'] });
      onDone();
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <Card variant="outlined">
      <CardHeader className="flex items-center justify-between">
        <CardTitle>New Workspace Module</CardTitle>
        <button onClick={onDone} className="text-text-tertiary hover:text-text-primary" aria-label="Close">
          <X className="h-4 w-4" />
        </button>
      </CardHeader>
      <CardBody>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">Module key</label>
              <input
                value={moduleKey}
                onChange={(e) => setModuleKey(e.target.value)}
                placeholder="e.g. DIAGRAM_VIEWER"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Diagram Viewer"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="What does this module let candidates do?"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          {error && <p className="text-sm text-error">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={onDone}>Cancel</Button>
            <Button size="sm" loading={mutation.isPending} disabled={!moduleKey.trim() || !name.trim()} onClick={() => mutation.mutate()}>
              Create Module
            </Button>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

// ── Configuration view ──────────────────────────

function ConfigurationView() {
  const { data: rows, isLoading, isError, refetch } = useQuery({
    queryKey: ['workspace-configuration'],
    queryFn: workspaceApi.getConfiguration,
  });

  return (
    <Card className="!p-0">
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-sm text-text-tertiary">Loading configuration...</div>
      ) : isError ? (
        <div className="flex flex-col items-center py-16 text-center">
          <Boxes className="h-8 w-8 text-text-tertiary" />
          <p className="mt-3 text-sm text-text-secondary">Couldn't load workspace configuration.</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {(rows ?? []).map((row) => (
            <div key={row.id} className="px-5 py-4">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-text-primary">{row.name}</h3>
                <Badge variant={row.isActive ? 'success' : 'neutral'} size="sm">
                  {row.isActive ? 'Active' : 'Inactive'}
                </Badge>
                <span className="text-xs text-text-tertiary">{row.moduleKey}</span>
              </div>
              <p className="mt-1 text-sm text-text-secondary">{row.description}</p>

              <div className="mt-3 grid gap-4 lg:grid-cols-2">
                <div className="rounded-lg bg-surface-secondary p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Config Schema</p>
                  <pre className="max-h-40 overflow-auto text-xs text-text-secondary">
                    {JSON.stringify(row.configSchema ?? {}, null, 2)}
                  </pre>
                </div>
                <div className="rounded-lg bg-surface-secondary p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    Used by {row.assessments.length} assessment{row.assessments.length === 1 ? '' : 's'}
                  </p>
                  {row.assessments.length === 0 ? (
                    <p className="text-xs text-text-tertiary">Not assigned to any assessment yet.</p>
                  ) : (
                    <ul className="space-y-1">
                      {row.assessments.map((a) => (
                        <li key={a.id} className="flex items-center justify-between gap-2 text-sm">
                          <span className="truncate text-text-secondary">{a.title}</span>
                          <Badge variant={a.status === 'PUBLISHED' ? 'success' : 'neutral'} size="sm">
                            {a.status}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export default WorkspacePage;
