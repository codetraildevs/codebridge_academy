import type { WorkspaceToolId } from './workspace-tools';

/**
 * Context-aware workspace tools — which tools are relevant for the file or
 * folder the candidate is currently working in. After scaffolding their
 * project (folders + files), candidates select a node in the Explorer and the
 * tools that make sense for it light up in the tab bar.
 *
 * - A file maps to the tools its type needs (a .sql file → Database console,
 *   a diagram.json → Diagram editor, frontend code → Editor + Browser, ...).
 * - A folder maps to the UNION of the tools of every file inside it.
 * - Nothing selected → no highlight (all tabs stay neutral).
 *
 * This is a pure hint layer: tabs are never hidden or auto-switched. The exam's
 * tool configuration (workspaceTools) still decides which tabs exist at all.
 */

// ── File-type → tool mapping ──────────────────────
interface FsLikeNode {
  path: string;
  type: 'file' | 'directory';
  children?: FsLikeNode[];
}

function normalize(p: string): string {
  return p.replace(/^\/+|\/+$/g, '').toLowerCase();
}

function underFolder(path: string, folder: string): boolean {
  const p = normalize(path);
  const f = normalize(folder);
  return p === f || p.startsWith(f + '/');
}

// Extensions that are unambiguous frontend (web) files — plain .js/.ts are not,
// since backend code shares those extensions. Only these (or files under a
// frontend/public folder) get the browser preview tool.
const FRONTEND_EXTS = new Set([
  'html', 'htm', 'css', 'scss', 'sass', 'less', 'jsx', 'tsx', 'vue', 'svelte',
]);
const CODE_EXTS = new Set([
  'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'cpp', 'cs', 'go', 'rb', 'php', 'rs',
  'sh', 'html', 'htm', 'css', 'scss', 'sass', 'less', 'vue', 'svelte', 'json', 'xml',
  'yml', 'yaml', 'toml', 'ini', 'conf', 'cfg', 'sql', 'md', 'txt', 'env',
]);
// Unambiguous presentation/portfolio assets. Note: docs like .md/.txt stay in
// the generic code bucket (editor + terminal) instead — recommending a browser
// for a README is a weak hint.
const PRESENTATION_EXTS = new Set(['pptx', 'ppt', 'pdf', 'docx', 'doc']);

/** Tools relevant to a single file, based on its type and location. */
export function toolsForFilePath(filePath: string): WorkspaceToolId[] {
  const p = normalize(filePath);
  const ext = p.includes('.') ? p.split('.').pop() ?? '' : '';
  const name = p.split('/').pop() ?? p;
  const tools = new Set<WorkspaceToolId>();

  // SQL schema/queries → Database console (a .sql file anywhere, or anything
  // under database/sql / db).
  if (ext === 'sql' || underFolder(p, 'database/sql') || underFolder(p, 'db')) {
    tools.add('DATABASE');
  }

  // Diagram files → Diagram editor. Match diagram.json and the design folders
  // (database/designs, network/designs, designs) where drawings are saved.
  if (name.endsWith('diagram.json') || underFolder(p, 'database/designs') || underFolder(p, 'network/designs') || underFolder(p, 'designs')) {
    tools.add('DIAGRAM_EDITOR');
  }

  // Frontend code → Editor + Browser preview (and terminal for running it).
  if (FRONTEND_EXTS.has(ext) || underFolder(p, 'frontend') || underFolder(p, 'public')) {
    tools.add('CODE_EDITOR');
    tools.add('BROWSER_PREVIEW');
    tools.add('TERMINAL');
  }

  // Backend / general code → Editor (+ terminal for running/testing).
  // Files under frontend/ also count here so .js in frontend/ gets the editor.
  if (CODE_EXTS.has(ext) || underFolder(p, 'backend') || underFolder(p, 'src') || underFolder(p, 'frontend')) {
    tools.add('CODE_EDITOR');
    tools.add('TERMINAL');
  }

  // Presentation / portfolio material → Browser preview (+ upload for hand-in).
  if (PRESENTATION_EXTS.has(ext) || underFolder(p, 'presentation') || underFolder(p, 'portfolio')) {
    tools.add('BROWSER_PREVIEW');
    tools.add('CODE_EDITOR');
  }

  // Environment / network / cleanup docs → Editor + terminal.
  if (underFolder(p, 'environment') || underFolder(p, 'network') || underFolder(p, 'cleanup')) {
    tools.add('CODE_EDITOR');
    tools.add('TERMINAL');
  }

  // Uploaded assets always pair with the upload tool.
  if (ext === 'zip' || ext === 'rar' || ext === '7z' || ext === 'pdf' || ext === 'docx') {
    tools.add('FILE_UPLOAD');
  }

  return [...tools];
}

/** Every file path (recursively) inside a folder. */
export function collectFilesInFolder(nodes: FsLikeNode[], folderPath: string): string[] {
  const target = normalize(folderPath);
  const result: string[] = [];

  const walk = (list: FsLikeNode[]) => {
    for (const node of list) {
      if (node.type === 'file') {
        if (target === '' || underFolder(node.path, target)) result.push(node.path);
      } else if (node.children) {
        // Root folder ('/' or '') covers the whole tree.
        if (target === '' || underFolder(node.path, target)) walk(node.children);
      }
    }
  };

  walk(nodes);
  return result;
}

/**
 * Tools relevant to the current selection: the union of every file's tools for
 * a folder, or the single file's tools. Empty selection → no tools highlighted.
 */
export function toolsForSelection(
  selection: { path: string; type: 'file' | 'directory' } | null,
  nodes: FsLikeNode[],
): WorkspaceToolId[] {
  if (!selection) return [];
  if (selection.type === 'file') return toolsForFilePath(selection.path);

  const files = collectFilesInFolder(nodes, selection.path);
  const union = new Set<WorkspaceToolId>();
  for (const f of files) {
    for (const tool of toolsForFilePath(f)) union.add(tool);
  }
  return [...union];
}

// ── Human-readable reasons for the context panel ──

export interface ToolRecommendation {
  tool: WorkspaceToolId;
  /** Short, human-readable reason why this tool is relevant to the selection. */
  reason: string;
}

const TOOL_REASONS: Record<WorkspaceToolId, string> = {
  FILE_EXPLORER: 'Browse and manage project files',
  CODE_EDITOR: 'Write and edit source code',
  TERMINAL: 'Run commands — npm, git, mysql client',
  DIAGRAM_EDITOR: 'Open and edit the diagram canvas',
  DATABASE: 'Run SQL queries against the exam database',
  BROWSER_PREVIEW: 'Preview the app in a live browser tab',
  FILE_UPLOAD: 'Submit supporting files with your answer',
};

/**
 * Recommended tools WITH a plain-language reason, for the sidebar panel.
 * Same set as toolsForSelection — this just adds the “why” for each tool.
 */
export function describeSelectionTools(
  selection: { path: string; type: 'file' | 'directory' } | null,
  nodes: FsLikeNode[],
): ToolRecommendation[] {
  return toolsForSelection(selection, nodes).map((tool) => ({
    tool,
    reason: TOOL_REASONS[tool],
  }));
}

// ── Folder-scoped saving ───────────────────────────
// Tools save their new artifacts (diagram canvases, SQL scripts, uploaded
// files) INTO the folder the candidate is working in. A selected folder wins;
// a selected file falls back to its parent folder; nothing selected → the
// provided default. Returns a RELATIVE folder path (no leading slash).

function trimSlashes(p: string): string {
  return p.replace(/^\/+|\/+$/g, '');
}

/**
 * Folder a tool should save its new artifacts into, based on the current
 * Explorer selection. Used by the workspace to make tools folder-aware:
 * selecting a folder like `database` makes the diagram canvas, SQL console
 * and new-file actions save inside it.
 */
export function saveFolderForSelection(
  selection: { path: string; type: 'file' | 'directory' } | null,
  defaultFolder: string,
): string {
  if (!selection) return trimSlashes(defaultFolder);
  if (selection.type === 'directory') return trimSlashes(selection.path);
  // File selection → its parent folder (so "save another diagram here" lands
  // next to the file being worked on).
  const idx = selection.path.lastIndexOf('/');
  return trimSlashes(idx <= 0 ? '' : selection.path.slice(0, idx));
}
