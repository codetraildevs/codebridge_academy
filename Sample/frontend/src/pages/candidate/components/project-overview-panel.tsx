import { motion } from 'framer-motion';
import {
  Database,
  Code2,
  Server,
  Network,
  Presentation,
  Settings2,
  Trash2,
  FolderTree,
  CheckCircle2,
  Circle,
  Pencil,
} from 'lucide-react';
import {
  PROJECT_PARTS,
  deliverableFoldersForSection,
  sectionOverlapsParts,
  type ProjectPartId,
} from '@lib/project-structure';
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

interface ProjectOverviewPanelProps {
  /** Parts the candidate chose in the setup wizard (already ordered). */
  parts: ProjectPartId[];
  /** Live file count per part (computed from saved answers). */
  fileCounts: Record<ProjectPartId, number>;
  /** Section type of the question the candidate is currently on. */
  currentSectionType?: string;
  /** Whether the section the candidate is on maps to a dedicated part. */
  onSelectPart?: (part: ProjectPartId) => void;
  /** Re-opens the setup wizard so the candidate can add more parts. */
  onEditStructure?: () => void;
}

export function ProjectOverviewPanel({
  parts,
  fileCounts,
  currentSectionType,
  onSelectPart,
  onEditStructure,
}: ProjectOverviewPanelProps) {
  const defs = PROJECT_PARTS.filter((p) => parts.includes(p.id));
  const totalFiles = parts.reduce((sum, p) => sum + (fileCounts[p] ?? 0), 0);
  const partsWithWork = parts.filter((p) => (fileCounts[p] ?? 0) > 0).length;

  return (
    <div className="border-b border-border">
      <div className="flex items-center gap-2 px-4 pt-3 pb-2">
        <FolderTree className="h-3.5 w-3.5 text-primary-500" />
        <p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
          Project overview
        </p>
        <span className="ml-auto rounded-full bg-surface-tertiary px-2 py-0.5 text-[10px] font-medium text-text-tertiary">
          {partsWithWork}/{parts.length} parts · {totalFiles} files
        </span>
        {onEditStructure && (
          <button
            onClick={onEditStructure}
            aria-label="Add or remove parts"
            title="Add or remove parts"
            className="flex h-5 w-5 items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-surface-tertiary hover:text-primary-600"
          >
            <Pencil className="h-3 w-3" />
          </button>
        )}
      </div>

      <div className="space-y-1 px-2 pb-3">
        {defs.map((part, index) => {
          const Icon = PART_ICONS[part.id];
          const count = fileCounts[part.id] ?? 0;
          const hasWork = count > 0;
          // Highlight parts whose folders the current section delivers. Uses the
          // same section→folder mapping as the deliverable filter, so it can't
          // drift. Whole-project sections (MIXED) highlight nothing.
          const active =
            !!onSelectPart &&
            deliverableFoldersForSection(currentSectionType).length > 0 &&
            sectionOverlapsParts(currentSectionType, [part.id]);

          return (
            <motion.button
              key={part.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              onClick={() => onSelectPart?.(part.id)}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors',
                active
                  ? 'bg-primary-50 ring-1 ring-primary-200'
                  : 'hover:bg-surface-secondary',
              )}
            >
              <span
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors',
                  hasWork ? 'bg-accent-100 text-accent-700' : 'bg-surface-tertiary text-text-tertiary',
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium text-text-primary">
                  {part.label}
                </span>
                <span className="block truncate font-mono text-[10px] text-text-tertiary">
                  {part.folders.map((f) => `${f}/`).join(' · ')}
                </span>
              </span>

              <span className="flex shrink-0 items-center gap-1.5">
                <span
                  className={cn(
                    'text-[10px] font-medium',
                    hasWork ? 'text-accent-700' : 'text-text-tertiary',
                  )}
                >
                  {hasWork ? `${count} file${count === 1 ? '' : 's'}` : 'empty'}
                </span>
                {hasWork ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-accent-500" />
                ) : (
                  <Circle className="h-3 w-3 text-text-tertiary/40" />
                )}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

export default ProjectOverviewPanel;
