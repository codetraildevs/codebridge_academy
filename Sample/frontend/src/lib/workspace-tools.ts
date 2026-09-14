import type { ElementType } from 'react';
import {
  FolderOpen,
  Code2,
  TerminalSquare,
  Network,
  Database,
  Globe,
  Upload,
} from 'lucide-react';

/**
 * Workspace tools — the tools provisioned in the candidate's practical
 * workspace for an exam (file explorer, code editor, terminal, diagram editor,
 * database console, live preview, file upload).
 *
 * The catalog must stay in sync with the API enum in
 * backend/src/modules/exams/exam.validation.ts (WORKSPACE_TOOL_VALUES).
 */

export type WorkspaceToolId =
  | 'FILE_EXPLORER'
  | 'CODE_EDITOR'
  | 'TERMINAL'
  | 'DIAGRAM_EDITOR'
  | 'DATABASE'
  | 'BROWSER_PREVIEW'
  | 'FILE_UPLOAD';

export interface WorkspaceToolDef {
  id: WorkspaceToolId;
  label: string;
  description: string;
  icon: ElementType;
}

export const WORKSPACE_TOOLS: WorkspaceToolDef[] = [
  { id: 'FILE_EXPLORER', label: 'File Explorer', description: 'Browse, create and edit project files', icon: FolderOpen },
  { id: 'CODE_EDITOR', label: 'Code Editor', description: 'Write code with syntax highlighting', icon: Code2 },
  { id: 'TERMINAL', label: 'Terminal', description: 'Run commands — npm, git, mysql client', icon: TerminalSquare },
  { id: 'DIAGRAM_EDITOR', label: 'Diagram Editor', description: 'Draw ERD, DFD, flowchart & UML diagrams', icon: Network },
  { id: 'DATABASE', label: 'Database Console', description: 'Connect to the MySQL/MariaDB console', icon: Database },
  { id: 'BROWSER_PREVIEW', label: 'Live Preview', description: 'Preview the running app in a browser tab', icon: Globe },
  { id: 'FILE_UPLOAD', label: 'File Upload', description: 'Submit supporting files with the answer', icon: Upload },
];

export const ALL_WORKSPACE_TOOLS: WorkspaceToolId[] = WORKSPACE_TOOLS.map((t) => t.id);

/**
 * Default working environment per trade. When an admin creates an exam and
 * picks a trade, the candidate's practical workspace is pre-configured from
 * this map (still fully editable on the review screens). Unknown/absent trade
 * → all tools (legacy behaviour). Keys are trade codes from the seed data.
 */
export const TRADE_WORKSPACE_DEFAULTS: Record<string, WorkspaceToolId[]> = {
  // Software Development — full-stack building, database and live preview
  SWD: [...ALL_WORKSPACE_TOOLS],
  // Computer Systems & Architecture — systems/database design + implementation
  CSA: ['FILE_EXPLORER', 'CODE_EDITOR', 'TERMINAL', 'DIAGRAM_EDITOR', 'DATABASE', 'FILE_UPLOAD'],
  // Networking — topology/subnetting/config via terminal; no database/preview
  NET: ['FILE_EXPLORER', 'CODE_EDITOR', 'TERMINAL', 'DIAGRAM_EDITOR', 'FILE_UPLOAD'],
  // Multimedia — design tools + browser preview for portfolios/presentations
  MMD: ['FILE_EXPLORER', 'CODE_EDITOR', 'DIAGRAM_EDITOR', 'BROWSER_PREVIEW', 'FILE_UPLOAD'],
  // Tourism — presentations/portfolios with planning diagrams
  TRM: ['FILE_EXPLORER', 'DIAGRAM_EDITOR', 'BROWSER_PREVIEW', 'FILE_UPLOAD'],
};

/**
 * Resolve the default working environment for a trade (by trade code).
 * Unknown or absent trade → all tools (legacy behaviour).
 */
export function defaultWorkspaceToolsForTrade(tradeCode?: string | null): WorkspaceToolId[] {
  if (!tradeCode) return [...ALL_WORKSPACE_TOOLS];
  // Always return a copy so callers (React state, etc.) never mutate the catalog.
  const defaults = TRADE_WORKSPACE_DEFAULTS[tradeCode.toUpperCase()];
  return defaults ? [...defaults] : [...ALL_WORKSPACE_TOOLS];
}

/**
 * Resolve the effective tool list for an exam. An empty/null list means
 * "all tools" — legacy exams (created before this feature) behave exactly
 * as they always did.
 */
export function effectiveWorkspaceTools(tools?: string[] | null): WorkspaceToolId[] {
  if (!tools || tools.length === 0) return [...ALL_WORKSPACE_TOOLS];
  return sanitizeWorkspaceTools(tools);
}

/**
 * Sanitize a tool list to known tool IDs WITHOUT the empty→all fallback.
 * Used for locked tools, where an empty list means "none locked" — never
 * "all tools".
 */
export function sanitizeWorkspaceTools(tools?: string[] | null): WorkspaceToolId[] {
  if (!Array.isArray(tools)) return [];
  return tools.filter(
    (t): t is WorkspaceToolId => ALL_WORKSPACE_TOOLS.includes(t as WorkspaceToolId),
  );
}

/**
 * Resolve the default working environment for a trade loaded from the API.
 * Prefers the DB-configured value (admin-editable, see Trade Environments)
 * and falls back to the built-in per-trade defaults for unconfigured trades.
 * Pass a Trade-shaped object: { code, workspaceTools }.
 */
export function resolveTradeWorkspaceDefaults(trade?: {
  code?: string | null;
  workspaceTools?: string[] | null;
} | null): WorkspaceToolId[] {
  if (trade?.workspaceTools && trade.workspaceTools.length > 0) {
    return effectiveWorkspaceTools(trade.workspaceTools);
  }
  return defaultWorkspaceToolsForTrade(trade?.code);
}
