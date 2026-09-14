import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@components/ui/button';
import { PROJECT_PARTS, foldersForParts, type ProjectPartId } from '@lib/project-structure';
import {
  FolderTree,
  Database,
  Code2,
  Server,
  Network,
  Presentation,
  Settings2,
  Trash2,
  Loader2,
  Check,
  X,
} from 'lucide-react';
import { cn } from '@utils/cn';

// Icons per part (kept local — the lib stays framework-agnostic).
const PART_ICONS: Record<ProjectPartId, React.ElementType> = {
  DATABASE: Database,
  FRONTEND: Code2,
  BACKEND: Server,
  NETWORK: Network,
  PRESENTATION: Presentation,
  ENVIRONMENT: Settings2,
  CLEANUP: Trash2,
};

interface ProjectSetupWizardProps {
  examTitle: string;
  /** Parts pre-selected for the candidate (derived from the exam's sections). */
  suggestedParts: ProjectPartId[];
  /**
   * Parts already chosen (when re-opening the wizard mid-exam). When provided
   * these are pre-selected instead of `suggestedParts`, so the candidate can
   * ADD parts without losing their existing structure.
   */
  initialParts?: ProjectPartId[];
  creating: boolean;
  onCreate: (parts: ProjectPartId[]) => void;
  onCancel?: () => void;
  /** True when re-opening an existing workspace (update copy + cancel allowed). */
  isEdit?: boolean;
}

export function ProjectSetupWizard({
  examTitle,
  suggestedParts,
  initialParts,
  creating,
  onCreate,
  onCancel,
  isEdit = false,
}: ProjectSetupWizardProps) {
  const [selected, setSelected] = useState<Set<ProjectPartId>>(
    () => new Set(initialParts ?? suggestedParts),
  );

  const toggle = (id: ProjectPartId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const chosenParts = PROJECT_PARTS.filter((p) => selected.has(p.id));
  const allFolders = foldersForParts(selected.size > 0 ? [...selected] : ['DATABASE', 'FRONTEND', 'BACKEND']);

  const handleCreate = () => {
    // At least one part is required to scaffold a meaningful project.
    if (selected.size === 0) return;
    onCreate([...selected]);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-3 border-b border-border px-6 py-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-700">
            <FolderTree className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-text-primary">
              {isEdit ? 'Update your project workspace' : 'Set up your project workspace'}
            </h2>
            <p className="mt-0.5 text-sm text-text-secondary">
              <span className="font-medium text-text-primary">{examTitle}</span> — choose the parts of the
              system you will build. Your working area is created from these folders and is used for the
              whole exam.
            </p>
            {isEdit && (
              <p className="mt-1 text-xs text-accent-700">
                Your existing folders and saved work are kept — new parts just add their folders.
              </p>
            )}
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className="rounded-md p-1 text-text-tertiary transition-colors hover:bg-surface-secondary hover:text-text-primary"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Parts grid */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {PROJECT_PARTS.map((part) => {
              const Icon = PART_ICONS[part.id];
              const isSelected = selected.has(part.id);
              return (
                <button
                  key={part.id}
                  onClick={() => toggle(part.id)}
                  className={cn(
                    'flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all',
                    isSelected
                      ? 'border-primary-400 bg-primary-50 ring-2 ring-primary-200'
                      : 'border-border bg-surface-secondary hover:border-primary-200 hover:bg-surface-tertiary',
                  )}
                >
                  <div
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors',
                      isSelected ? 'bg-primary-600 text-white' : 'bg-white text-text-tertiary border border-border',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-text-primary">{part.label}</p>
                      <span
                        className={cn(
                          'flex h-4 w-4 items-center justify-center rounded-full border transition-colors',
                          isSelected ? 'border-primary-600 bg-primary-600' : 'border-text-tertiary/40',
                        )}
                      >
                        {isSelected && <Check className="h-2.5 w-2.5 text-white" />}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-text-tertiary">{part.description}</p>
                    <p className="mt-1 font-mono text-[10px] text-primary-700/80">
                      {part.folders.map((f) => `${f}/`).join(' · ')}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Folder preview */}
          <div className="mt-4 rounded-xl border border-accent-200 bg-accent-50/40 p-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-accent-700">
              {isEdit ? 'Your workspace contains (new folders will be added)' : 'Your workspace will contain'}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {allFolders.map((folder) => (
                <span
                  key={folder}
                  className="rounded-md border border-accent-200 bg-white px-2 py-0.5 font-mono text-[11px] text-text-secondary"
                >
                  {folder}/
                </span>
              ))}
              {allFolders.length === 0 && (
                <span className="text-xs text-text-tertiary">Select at least one part to begin.</span>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-border bg-surface-secondary px-6 py-4">
          <p className="text-[11px] text-text-tertiary">
            You can add folders and files yourself later in the workspace.
          </p>
          <div className="flex items-center gap-2">
            {isEdit && onCancel && (
              <Button variant="ghost" size="sm" onClick={onCancel} disabled={creating}>
                Cancel
              </Button>
            )}
            <Button
              variant="primary"
              onClick={handleCreate}
              disabled={selected.size === 0}
              loading={creating}
            >
              {creating ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  {isEdit ? 'Updating…' : 'Creating…'}
                </>
              ) : isEdit ? (
                'Update Workspace'
              ) : (
                'Create Workspace'
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default ProjectSetupWizard;
