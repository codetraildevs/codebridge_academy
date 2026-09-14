import { Card, CardHeader, CardTitle, CardBody, CardFooter } from '@components/ui/card';
import { Button } from '@components/ui/button';
import {
  Wrench,
  Code2,
  Database,
  CheckCircle2,
  AlertCircle,
  Save,
  X,
  RefreshCw,
  Layers,
  PenTool,
  Lock,
  LockOpen,
} from 'lucide-react';
import { cn } from '@utils/cn';
import {
  WORKSPACE_TOOLS,
  ALL_WORKSPACE_TOOLS,
  effectiveWorkspaceTools,
  defaultWorkspaceToolsForTrade,
  resolveTradeWorkspaceDefaults,
  TRADE_WORKSPACE_DEFAULTS,
  sanitizeWorkspaceTools,
  type WorkspaceToolId,
  type WorkspaceToolDef,
} from '@lib/workspace-tools';

// Re-export the catalog so existing imports keep working (exam-detail,
// exam-create, tests). The catalog itself lives in @lib/workspace-tools so the
// candidate workspace can consume it without importing an admin component.
export {
  WORKSPACE_TOOLS,
  ALL_WORKSPACE_TOOLS,
  effectiveWorkspaceTools,
  sanitizeWorkspaceTools,
  defaultWorkspaceToolsForTrade,
  resolveTradeWorkspaceDefaults,
  TRADE_WORKSPACE_DEFAULTS,
  type WorkspaceToolId,
  type WorkspaceToolDef,
};

/**
 * Quick-pick presets shown as a row above the toggle grid. Applying one
 * replaces the current selection in one click.
 */
export interface WorkspaceToolPreset {
  id: string;
  label: string;
  tools: WorkspaceToolId[];
}

export const WORKSPACE_PRESETS: WorkspaceToolPreset[] = [
  { id: 'full-stack', label: 'Full stack', tools: [...ALL_WORKSPACE_TOOLS] },
  { id: 'database', label: 'Database only', tools: ['FILE_EXPLORER', 'TERMINAL', 'DATABASE'] },
  { id: 'design', label: 'Design only', tools: ['FILE_EXPLORER', 'DIAGRAM_EDITOR'] },
  { id: 'code', label: 'Code only', tools: ['FILE_EXPLORER', 'CODE_EDITOR', 'TERMINAL', 'BROWSER_PREVIEW'] },
];

const PRESET_ICONS: Record<string, React.ElementType> = {
  'full-stack': Layers,
  database: Database,
  design: PenTool,
  code: Code2,
};

/** Order-independent comparison of two tool selections. */
function sameTools(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const setA = new Set(a);
  return b.every((t) => setA.has(t));
}

/**
 * Reusable toggle grid for the workspace tools. Controlled — the parent owns
 * the selected `tools` list. Used by the exam detail page (saved per exam) and
 * by the create/upload review screens (submitted with the new exam).
 */
export function WorkspaceToolsGrid({
  tools,
  onChange,
  lockedTools = [],
  onChangeLocked,
  tradeDefaultTools,
  tradeDefaultLabel,
}: {
  tools: string[];
  onChange: (tools: string[]) => void;
  /** Tools locked by the platform owner — candidates cannot turn these off */
  lockedTools?: string[];
  /** Called when the lock set changes; omit to hide the lock controls */
  onChangeLocked?: (locked: string[]) => void;
  /** Pre-selected environment for the exam's trade — shown as a quick-pick chip */
  tradeDefaultTools?: WorkspaceToolId[];
  /** Label for the trade-default chip, e.g. "Software Development default" */
  tradeDefaultLabel?: string;
}) {
  const canLock = Boolean(onChangeLocked);

  const toggle = (id: string) => {
    // Locked tools stay selected — the candidate must always have them.
    if (lockedTools.includes(id)) return;
    onChange(tools.includes(id) ? tools.filter((t) => t !== id) : [...tools, id]);
  };

  const toggleLock = (id: string) => {
    if (!onChangeLocked) return;
    const next = lockedTools.includes(id)
      ? lockedTools.filter((t) => t !== id)
      : [...lockedTools, id];
    onChangeLocked(next);
    // Locking a tool that is currently off forces it on.
    if (!lockedTools.includes(id) && !tools.includes(id)) onChange([...tools, id]);
  };

  // Presets replace the selection but can never drop a locked tool.
  const applySelection = (selection: WorkspaceToolId[]) => {
    onChange([...new Set([...selection, ...lockedTools])]);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">
        Choose which tools candidates get in their practical workspace. Empty selection
        means <strong>all tools</strong> are available.
        {canLock && (
          <>
            {' '}
            <strong>Lock</strong> a tool to keep it always available — candidates cannot
            turn it off.
          </>
        )}
      </p>

      {/* Quick-pick presets */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
          Quick pick
        </span>
        {tradeDefaultTools && tradeDefaultLabel && (
          <button
            key="trade-default"
            type="button"
            onClick={() => applySelection(tradeDefaultTools)}
            aria-pressed={sameTools(tools, tradeDefaultTools)}
            title={`Select: ${tradeDefaultLabel} environment`}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
              sameTools(tools, tradeDefaultTools)
                ? 'border-primary-300 bg-primary-50 text-primary-700 shadow-sm'
                : 'border-border bg-white text-text-secondary hover:border-primary-300 hover:text-text-primary',
            )}
          >
            <Wrench className="h-3.5 w-3.5" />
            {tradeDefaultLabel}
          </button>
        )}
        {WORKSPACE_PRESETS.map((preset) => {
          const Icon = PRESET_ICONS[preset.id] ?? Wrench;
          const active = sameTools(tools, preset.tools);
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => applySelection(preset.tools)}
              aria-pressed={active}
              title={`Select: ${preset.label}`}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
                active
                  ? 'border-accent-300 bg-accent-50 text-accent-700 shadow-sm'
                  : 'border-border bg-white text-text-secondary hover:border-accent-300 hover:text-text-primary',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {preset.label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        {WORKSPACE_TOOLS.map((tool) => {
          const Icon = tool.icon;
          const selected = tools.includes(tool.id);
          const locked = lockedTools.includes(tool.id);
          return (
            <div
              key={tool.id}
              className={cn(
                'flex items-start gap-2 rounded-xl border p-3 text-left transition-all',
                selected
                  ? 'border-accent-300 bg-accent-50/60 ring-1 ring-accent-200'
                  : 'border-border bg-white hover:border-accent-200 hover:bg-surface-secondary',
                locked && 'border-primary-300 bg-primary-50/60 ring-1 ring-primary-200',
              )}
            >
              <button
                type="button"
                onClick={() => toggle(tool.id)}
                aria-pressed={selected}
                disabled={locked}
                title={
                  locked
                    ? 'Locked — candidates always have this tool'
                    : selected
                      ? 'Remove this tool from the workspace'
                      : 'Add this tool to the workspace'
                }
                className="flex min-w-0 flex-1 items-start gap-3 text-left disabled:cursor-not-allowed"
              >
                <div
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors',
                    selected ? 'bg-accent-100 text-accent-700' : 'bg-surface-tertiary text-text-tertiary',
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-text-primary">{tool.label}</p>
                    {locked ? (
                      <Lock className="h-4 w-4 shrink-0 text-primary-600" />
                    ) : selected ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-accent-600" />
                    ) : (
                      <X className="h-4 w-4 shrink-0 text-text-tertiary/50" />
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-text-tertiary">{tool.description}</p>
                </div>
              </button>
              {canLock && (
                <button
                  type="button"
                  onClick={() => toggleLock(tool.id)}
                  aria-pressed={locked}
                  aria-label={`${locked ? 'Unlock' : 'Lock'} ${tool.label}`}
                  title={
                    locked
                      ? 'Unlock — candidates may turn this tool off'
                      : 'Lock — candidates cannot turn this tool off'
                  }
                  className={cn(
                    'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition-colors',
                    locked
                      ? 'border-primary-300 bg-primary-100 text-primary-700'
                      : 'border-border bg-white text-text-tertiary hover:border-primary-300 hover:text-primary-700',
                  )}
                >
                  {locked ? <Lock className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5" />}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-text-tertiary">
        {tools.length} of {WORKSPACE_TOOLS.length} tools selected
        {lockedTools.length > 0 && (
          <>
            {' '}
            · <Lock className="inline h-3 w-3" /> {lockedTools.length} locked
          </>
        )}
      </p>
    </div>
  );
}

interface WorkspaceToolsEditorProps {
  tools: string[];
  onChange: (tools: string[]) => void;
  /** Tools locked by the platform owner — candidates cannot turn these off */
  lockedTools?: string[];
  /** Called when the lock set changes; omit to hide the lock controls */
  onChangeLocked?: (locked: string[]) => void;
  onSave: () => void;
  saving: boolean;
  error: string;
  success: string;
  /** Pre-selected environment for the exam's trade — shown as a quick-pick chip */
  tradeDefaultTools?: WorkspaceToolId[];
  /** Label for the trade-default chip, e.g. "Software Development default" */
  tradeDefaultLabel?: string;
}

export function WorkspaceToolsEditor({
  tools,
  onChange,
  lockedTools,
  onChangeLocked,
  onSave,
  saving,
  error,
  success,
  tradeDefaultTools,
  tradeDefaultLabel,
}: WorkspaceToolsEditorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5 text-primary-500" />
          Workspace Tools
        </CardTitle>
      </CardHeader>
      <CardBody className="space-y-4">
        <WorkspaceToolsGrid
          tools={tools}
          onChange={onChange}
          lockedTools={lockedTools}
          onChangeLocked={onChangeLocked}
          tradeDefaultTools={tradeDefaultTools}
          tradeDefaultLabel={tradeDefaultLabel}
        />

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-800" role="alert">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-2.5 text-xs text-green-800">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            <span>{success}</span>
          </div>
        )}
      </CardBody>
      <CardFooter className="flex items-center justify-end gap-3">
        <Button onClick={onSave} loading={saving} size="sm">
          {saving ? (
            <><RefreshCw className="mr-1 h-3.5 w-3.5 animate-spin" /> Saving...</>
          ) : (
            <><Save className="mr-1 h-3.5 w-3.5" /> Save Tools</>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

export default WorkspaceToolsEditor;
