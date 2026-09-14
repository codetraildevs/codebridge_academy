// ── Project Workspace Structure ──────────────────────
// Practical exams use ONE persistent project workspace scaffolded from the
// parts the candidate chose in the setup wizard (database, frontend, backend,
// ...). This module defines the part catalog, the section→project-folder
// mapping (per-section deliverables), and helpers to filter workspace files.
//
// The part catalog must stay in sync with PROJECT_PART_FOLDERS in
// backend/src/modules/sandbox/sandbox.service.ts.

export type ProjectPartId =
  | 'DATABASE'
  | 'FRONTEND'
  | 'BACKEND'
  | 'NETWORK'
  | 'PRESENTATION'
  | 'ENVIRONMENT'
  | 'CLEANUP';

export interface ProjectPartDef {
  id: ProjectPartId;
  label: string;
  description: string;
  /** Root folders (relative to the workspace root) this part contributes. */
  folders: string[];
}

export const PROJECT_PARTS: ProjectPartDef[] = [
  {
    id: 'DATABASE',
    label: 'Database',
    description: 'ERD/design diagrams and the SQL schema',
    folders: ['database/designs', 'database/sql'],
  },
  {
    id: 'FRONTEND',
    label: 'Frontend',
    description: 'User interface and client-side code',
    folders: ['frontend'],
  },
  {
    id: 'BACKEND',
    label: 'Backend',
    description: 'Server-side code and APIs',
    folders: ['backend'],
  },
  {
    id: 'NETWORK',
    label: 'Network',
    description: 'Topology, configuration and subnetting work',
    folders: ['network/designs', 'network/config'],
  },
  {
    id: 'PRESENTATION',
    label: 'Presentation',
    description: 'Presentation and portfolio materials',
    folders: ['presentation'],
  },
  {
    id: 'ENVIRONMENT',
    label: 'Environment',
    description: 'Environment setup and documentation',
    folders: ['environment'],
  },
  {
    id: 'CLEANUP',
    label: 'Cleanup',
    description: 'Project cleanup and final checks',
    folders: ['cleanup'],
  },
];

export const PROJECT_PART_BY_ID: Record<ProjectPartId, ProjectPartDef> = PROJECT_PARTS.reduce(
  (acc, part) => {
    acc[part.id] = part;
    return acc;
  },
  {} as Record<ProjectPartId, ProjectPartDef>,
);

/** All root folders contributed by the given parts (deduplicated, ordered). */
export function foldersForParts(parts: ProjectPartId[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const part of parts) {
    const def = PROJECT_PART_BY_ID[part];
    if (!def) continue;
    for (const folder of def.folders) {
      if (!seen.has(folder)) {
        seen.add(folder);
        result.push(folder);
      }
    }
  }
  return result;
}

// ── Section → project folder mapping (deliverables) ──
// Each section of a practical exam collects the files saved under ITS part of
// the project. Mapping empty (or unknown section) means "whole project" — used
// by flat imported exams (single MIXED section) where the entire workspace is
// the deliverable.
export const SECTION_DELIVERABLE_FOLDERS: Record<string, string[]> = {
  ERD_DESIGN: ['database/designs'],
  DFD_DESIGN: ['database/designs'],
  FLOWCHART: ['database/designs'],
  UML_DIAGRAM: ['database/designs'],
  DATABASE_DESIGN: ['database/sql'],
  CODE_WRITING: ['frontend', 'backend'],
  ENVIRONMENT_SETUP: ['environment'],
  PROJECT_CLEANUP: ['cleanup'],
  PRESENTATION: ['presentation'],
  PORTFOLIO: ['presentation'],
  TOPOLOGY_BUILDER: ['network/designs'],
  SUBNETTING: ['network/config'],
  NETWORK_CONFIG: ['network/config'],
  MIXED: [],
};

/**
 * Folders that make up the deliverable of a section. Empty array = the whole
 * project (flat / MIXED exams).
 */
export function deliverableFoldersForSection(sectionType?: string): string[] {
  if (!sectionType) return [];
  return SECTION_DELIVERABLE_FOLDERS[sectionType] ?? [];
}

/**
 * Filter a flattened workspace file list down to the files under the section's
 * project folders. When the section has no dedicated folders (MIXED) the whole
 * project is the deliverable.
 */
export function filterFilesForSection(
  files: Array<{ path: string; content: string }>,
  sectionType?: string,
): Array<{ path: string; content: string }> {
  const folders = deliverableFoldersForSection(sectionType);
  if (folders.length === 0) return files;

  const normalized = folders.map((f) => f.replace(/^\/+|\/+$/g, ''));
  return files.filter((f) => {
    const p = f.path.replace(/^\/+/, '');
    // Manual saved-designs drafts are meta-deliverables: they accompany every
    // section's answer so assessors can see them in the results view, even
    // though they live in the kind folders (database/designs/erd/<name>.json,
    // network/designs/topology/<name>.json) rather than the section's own
    // deliverable folders. Section canvases (diagram*.json) are regular files.
    if (p === 'saved-designs' || p.startsWith('saved-designs/')) return true;
    if (
      !/\/diagram(-\d+)?\.json$/.test(p) &&
      /^(database|network)\/designs\/[^/]+\/[^/]+\.json$/.test(p)
    ) {
      return true;
    }
    return normalized.some(
      (folder) => p === folder || p.startsWith(folder + '/'),
    );
  });
}

/**
 * Whether any of the section's deliverable folders overlap with the folders
 * contributed by the candidate's chosen parts. When a candidate deselects a
 * part that a section maps to, that section's deliverable folder would never
 * exist — so per-section filtering would silently empty the answer. Sections
 * with no dedicated folders (MIXED) always "overlap" (whole project).
 */
export function sectionOverlapsParts(
  sectionType: string | undefined,
  parts: ProjectPartId[],
): boolean {
  const deliverable = deliverableFoldersForSection(sectionType);
  if (deliverable.length === 0) return true;
  const chosen = foldersForParts(parts);
  return deliverable.some((folder) =>
    chosen.some(
      (c) =>
        folder === c ||
        folder.startsWith(c + '/') ||
        c.startsWith(folder + '/'),
    ),
  );
}

// ── Per-part file counts (project overview) ───────
// Aggregates a flattened list of every file the candidate has saved (across
// all answered sections) into a count per project part, so the overview panel
// can show at a glance which parts already have work.
/**
 * Count files that live under each part's folders. Files not under any part's
 * folders (e.g. a README at the workspace root) are counted for no part.
 */
export function countFilesPerPart(
  files: Array<{ path: string }>,
  parts: ProjectPartId[],
): Record<ProjectPartId, number> {
  const counts = Object.fromEntries(parts.map((p) => [p, 0])) as Record<ProjectPartId, number>;
  const normalizedParts = parts.map((part) => ({
    id: part,
    folders: (PROJECT_PART_BY_ID[part]?.folders ?? []).map((f) => f.replace(/^\/+|\/+$/g, '')),
  }));

  for (const file of files) {
    const p = file.path.replace(/^\/+/, '');
    for (const part of normalizedParts) {
      if (
        part.folders.some(
          (folder) => p === folder || p.startsWith(folder + '/'),
        )
      ) {
        counts[part.id] += 1;
        break; // a file belongs to exactly one part
      }
    }
  }
  return counts;
}

// ── Suggested parts for the setup wizard ───────────
// Derive sensible defaults from the exam's sections so the wizard pre-checks
// the parts the exam actually exercises (e.g. a DATABASE_DESIGN section ⇒
// database part). Falls back to a full-stack default (database + frontend +
// backend) when nothing matches.
export function partsForSections(
  sections: Array<{ sectionType?: string }>,
): ProjectPartId[] {
  const types = new Set(sections.map((s) => s.sectionType).filter(Boolean));
  const wanted = new Set<ProjectPartId>();

  if (
    ['ERD_DESIGN', 'DFD_DESIGN', 'FLOWCHART', 'UML_DIAGRAM', 'DATABASE_DESIGN'].some((t) =>
      types.has(t),
    )
  ) {
    wanted.add('DATABASE');
  }
  if (types.has('CODE_WRITING') || types.has('MIXED')) {
    wanted.add('FRONTEND');
    wanted.add('BACKEND');
  }
  // Flat imported exams have a single MIXED section whose tasks cover the whole
  // system (ERD + SQL schema + code), so the full-stack default applies.
  if (types.has('MIXED')) {
    wanted.add('DATABASE');
  }
  if (
    ['TOPOLOGY_BUILDER', 'SUBNETTING', 'NETWORK_CONFIG'].some((t) => types.has(t))
  ) {
    wanted.add('NETWORK');
  }
  if (types.has('PRESENTATION') || types.has('PORTFOLIO')) {
    wanted.add('PRESENTATION');
  }
  if (types.has('ENVIRONMENT_SETUP')) wanted.add('ENVIRONMENT');
  if (types.has('PROJECT_CLEANUP')) wanted.add('CLEANUP');

  if (wanted.size === 0) {
    return ['DATABASE', 'FRONTEND', 'BACKEND'];
  }
  return PROJECT_PARTS.filter((p) => wanted.has(p.id)).map((p) => p.id);
}
