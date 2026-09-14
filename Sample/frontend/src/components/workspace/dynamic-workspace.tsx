import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { cn } from '@utils/cn';
import { createVirtualFileSystem, type VirtualFileSystem, type FSNode } from '@lib/virtual-fs';
import { createSandboxFileSystem, type SandboxFileSystem } from '@lib/sandbox-fs';
import { api } from '@services/api';
import {
  effectiveWorkspaceTools,
  ALL_WORKSPACE_TOOLS,
  WORKSPACE_TOOLS,
  type WorkspaceToolId,
} from '@lib/workspace-tools';
import {
  toolsForSelection,
  describeSelectionTools,
  collectFilesInFolder,
  saveFolderForSelection,
} from '@lib/workspace-context';
import { WorkspaceTerminal } from './workspace-terminal';
import {
  DiagramWorkspace,
  type DiagramElement,
  type DiagramKind,
  type SavedDesign,
  readSavedDesigns,
} from './diagram-workspace';
import {
  Folder,
  FolderOpen,
  FileCode,
  FileText,
  File,
  Plus,
  FolderPlus,
  Upload,
  Download,
  Trash2,
  Edit3,
  Check,
  ChevronRight,
  ChevronDown,
  Terminal as TerminalIcon,
  Globe,
  Code2,
  RotateCcw,
  PanelLeft,
  PanelRight,
  ExternalLink,
  AlertCircle,
  FileSearch,
  Play,
  Square,
  Server,
  Loader2,
  Power,
  Clapperboard,
  Smartphone,
  Waypoints,
  Database,
  Table2,
  RefreshCw,
  TerminalSquare,
  Network,
  Save,
  Settings2,
  X,
  GitBranch,
  Layout,
  Lock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Styles needed for xterm ────────────────────────
// xterm.css is imported globally via the app styles

// ── Types ───────────────────────────────────────────

type TabType = 'editor' | 'terminal' | 'browser' | 'database' | 'diagram';

// ── Candidate tools choice (per session) ──────────
// The platform owner provisions a set of tools for the exam (workspaceTools;
// empty = all tools). The candidate can pick which of those tools to actually
// use in their workspace — every provisioned tool is on by default, and the
// choice is remembered per session so it survives reloads. It never widens
// the provisioned pool.
function readToolsChoice(sessionId?: string | null): WorkspaceToolId[] | null {
  try {
    const raw = window.localStorage.getItem(
      sessionId ? `workspaceToolsChoice:${sessionId}` : 'workspaceToolsChoice',
    );
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as WorkspaceToolId[]) : null;
  } catch {
    return null;
  }
}

function writeToolsChoice(choice: WorkspaceToolId[], sessionId?: string | null) {
  try {
    window.localStorage.setItem(
      sessionId ? `workspaceToolsChoice:${sessionId}` : 'workspaceToolsChoice',
      JSON.stringify(choice),
    );
  } catch {
    /* storage unavailable — best-effort */
  }
}

// Project-mode guidance per section — where the section's deliverable lives
// in the project workspace (mirrors frontend/src/lib/project-structure.ts).
const PROJECT_SECTION_HINTS: Record<string, string> = {
  ERD_DESIGN: 'database/designs/ (ERD diagram)',
  DFD_DESIGN: 'database/designs/ (DFD diagram)',
  FLOWCHART: 'database/designs/ (flowchart)',
  UML_DIAGRAM: 'database/designs/ (UML diagram)',
  DATABASE_DESIGN: 'database/sql/',
  CODE_WRITING: 'frontend/ and backend/',
  ENVIRONMENT_SETUP: 'environment/',
  PROJECT_CLEANUP: 'cleanup/',
  PRESENTATION: 'presentation/',
  PORTFOLIO: 'presentation/',
  TOPOLOGY_BUILDER: 'network/designs/ (topology)',
  SUBNETTING: 'network/config/',
  NETWORK_CONFIG: 'network/config/',
};

// ── Stage (section type) guidance shown in the Explorer ──
// Mirrors the starter-folder mapping in backend sandbox.service.ts — keep in
// sync when adding section types.
const STAGE_HINTS: Record<string, string> = {
  ERD_DESIGN: 'Design your ERD in the Diagram tab (eDraw Max-style editor) or save files in database/designs/erd/. Draw extra diagrams (e.g. a DFD) with the "Add diagram" button.',
  DFD_DESIGN: 'Design your DFD in the Diagram tab (eDraw Max-style editor) or save files in database/designs/dfd/. Draw extra diagrams (e.g. an ERD) with the "Add diagram" button.',
  FLOWCHART: 'Design your flowchart in the Diagram tab (eDraw Max-style editor) or save files in database/designs/flowchart/. Draw extra diagrams with the "Add diagram" button.',
  UML_DIAGRAM: 'Design your UML diagram in the Diagram tab (eDraw Max-style editor) or save files in database/designs/uml/. Draw extra diagrams with the "Add diagram" button.',
  CODE_WRITING: 'Write your code in src/',
  DATABASE_DESIGN: 'Design your schema in db/',
  TOPOLOGY_BUILDER: 'Design your network topology in the Diagram tab (eDraw Max-style editor) or save files in network/designs/topology/.',
  NETWORK_CONFIG: 'Configure the network in config/network/',
  SUBNETTING: 'Plan your subnets in the Diagram tab (eDraw Max-style editor) or save files in network/config/subnetting/.',
  PRESENTATION: 'Prepare your presentation in presentation/',
  PORTFOLIO: 'Build your portfolio in portfolio/',
  ESSAY: 'Write your essay in essays/',
  FILE_UPLOAD: 'Upload your files to uploads/',
  MIXED: 'Organise work across designs/, src/ and db/',
  ENVIRONMENT_SETUP: 'Document the environment in environment/',
  PROJECT_CLEANUP: 'Log your cleanup in cleanup/',
};

// ── Design-stage diagram editor ─────────────────────
// Design sections get a visual Diagram tab in addition to the folder tree.
// Drawings are persisted to a diagram.json file inside the stage's starter
// folder, so they are saved with the workspace files and submitted with the
// answer. Mirrors the starter folders in backend sandbox.service.ts.
const DESIGN_DIAGRAM_TYPES: Record<string, DiagramKind> = {
  ERD_DESIGN: 'ERD',
  DFD_DESIGN: 'DFD',
  FLOWCHART: 'FLOWCHART',
  UML_DIAGRAM: 'UML',
  TOPOLOGY_BUILDER: 'TOPOLOGY',
  SUBNETTING: 'SUBNETTING',
};

// Default diagram file per design stage. Diagrams always live in the project's
// database/designs/<kind> folder (network/designs for topology, network/config
// for subnetting) — the same convention in stage mode and project mode, so an
// ERD is saved to database/designs/erd/diagram.json, a DFD to
// database/designs/dfd/diagram.json, and so on.
const DESIGN_DIAGRAM_PATHS: Record<string, string> = {
  ERD_DESIGN: 'database/designs/erd/diagram.json',
  DFD_DESIGN: 'database/designs/dfd/diagram.json',
  FLOWCHART: 'database/designs/flowchart/diagram.json',
  UML_DIAGRAM: 'database/designs/uml/diagram.json',
  TOPOLOGY_BUILDER: 'network/designs/topology/diagram.json',
  SUBNETTING: 'network/config/subnetting/diagram.json',
};

// Default folder for free-chosen diagrams (non-design sections): each kind
// gets its own folder under the same convention as design stages.
const DIAGRAM_DEFAULT_DIRS: Record<DiagramKind, string> = {
  ERD: 'database/designs/erd',
  DFD: 'database/designs/dfd',
  FLOWCHART: 'database/designs/flowchart',
  UML: 'database/designs/uml',
  TOPOLOGY: 'network/designs/topology',
  SUBNETTING: 'network/config/subnetting',
  STORYBOARD: 'database/designs/storyboard',
  UI_MOCKUP: 'database/designs/ui-mockup',
};

// Short labels + icons for the diagram-type picker on the sub-diagram tab bar.
const DIAGRAM_TYPE_LABELS: Record<DiagramKind, string> = {
  ERD: 'ERD',
  DFD: 'DFD',
  FLOWCHART: 'Flowchart',
  UML: 'UML',
  TOPOLOGY: 'Topology',
  SUBNETTING: 'Subnetting',
  STORYBOARD: 'Storyboard',
  UI_MOCKUP: 'UI Mockup',
};

const ALL_DIAGRAM_TYPES: DiagramKind[] = [
  'ERD',
  'DFD',
  'FLOWCHART',
  'UML',
  'TOPOLOGY',
  'SUBNETTING',
  'STORYBOARD',
  'UI_MOCKUP',
];

// Diagrams relevant to each trade (seed trade codes in backend/prisma/seed.ts).
// The "Add diagram" picker only offers the types a candidate's trade actually
// uses — e.g. a Networking candidate plans topologies/subnets instead of ERDs,
// a Multimedia candidate storyboards and mocks up screens, while Software
// Development candidates get the design diagrams. Unknown/absent trade → all types.
const TRADE_DIAGRAM_TYPES: Record<string, DiagramKind[]> = {
  SWD: ['ERD', 'DFD', 'FLOWCHART', 'UML'],
  CSA: ['ERD', 'DFD', 'FLOWCHART', 'UML'],
  NET: ['FLOWCHART', 'TOPOLOGY', 'SUBNETTING'],
  MMD: ['FLOWCHART', 'STORYBOARD', 'UI_MOCKUP'],
  TRM: ['FLOWCHART'],
};

const DIAGRAM_TYPE_ICONS: Record<DiagramKind, React.ReactNode> = {
  ERD: <Database className="h-3.5 w-3.5" />,
  DFD: <Network className="h-3.5 w-3.5" />,
  FLOWCHART: <GitBranch className="h-3.5 w-3.5" />,
  UML: <Layout className="h-3.5 w-3.5" />,
  TOPOLOGY: <Waypoints className="h-3.5 w-3.5" />,
  SUBNETTING: <Network className="h-3.5 w-3.5" />,
  STORYBOARD: <Clapperboard className="h-3.5 w-3.5" />,
  UI_MOCKUP: <Smartphone className="h-3.5 w-3.5" />,
};

// One canvas in the Diagram tab. A design stage can require several diagrams
// (e.g. an ERD *and* a DFD), so each diagram is its own tab persisted to its
// own file inside the stage folder.
interface DiagramTab {
  id: string;
  diagramType: DiagramKind;
  elements: DiagramElement[];
  filePath: string; // relative path, e.g. 'database/designs/erd/diagram.json'
}

let diagramTabCounter = 0;
function nextDiagramId(): string {
  diagramTabCounter += 1;
  return `diagram-${Date.now().toString(36)}-${diagramTabCounter}`;
}

function makePrimaryTab(
  diagramType: DiagramKind,
  filePath: string,
  elements: DiagramElement[],
): DiagramTab {
  return { id: 'diagram-primary', diagramType, elements, filePath };
}

interface DynamicWorkspaceProps {
  examTitle?: string;
  readOnly?: boolean;
  onFilesChange?: (files: Array<{ path: string; content: string }>) => void;
  initialFiles?: FSNode[];
  sessionId?: string | null;
  sectionType?: string;
  // Trade of the candidate's assessment — restricts which diagram types the
  // "Add diagram" picker offers (e.g. NET only gets Flowchart).
  tradeCode?: string;
  tradeName?: string;
  // Workspace tools enabled for this exam — unselected tools have their tabs
  // and toolbar controls hidden. Empty/absent means all tools (legacy exams).
  workspaceTools?: string[];
  // Tools the platform owner locked — candidates cannot turn these off. They
  // are forced on regardless of the candidate's per-session choice.
  lockedWorkspaceTools?: string[];
  // Practical exams use ONE persistent project workspace (scaffolded by the
  // setup wizard) instead of per-stage starter folders. In project mode the
  // Explorer shows the project structure guidance and diagram files live
  // under database/designs (or network/designs) rather than designs/<stage>.
  projectMode?: boolean;
}

// ── Main Component ──────────────────────────────────

export function DynamicWorkspace({
  examTitle = 'Workspace',
  readOnly = false,
  onFilesChange,
  initialFiles,
  sessionId,
  sectionType,
  tradeCode,
  tradeName,
  workspaceTools,
  lockedWorkspaceTools,
  projectMode = false,
}: DynamicWorkspaceProps) {
  // Design stages open on the Diagram tab (drawing canvas) while keeping the
  // folder tree available so candidates can also save files alongside. In
  // project mode the diagram is saved under the project's design folder so it
  // belongs to the section's deliverable.
  const designDiagramType = sectionType ? DESIGN_DIAGRAM_TYPES[sectionType] : undefined;
  // Design diagrams always default to database/designs/<kind>/ (ERD →
  // database/designs/erd, DFD → database/designs/dfd, ...) in stage and
  // project mode alike.
  const diagramFilePath = sectionType ? DESIGN_DIAGRAM_PATHS[sectionType] : undefined;
  // Diagram types the candidate may add, driven by their trade. Without a
  // trade (admin preview, tests) every type is offered.
  const availableDiagramTypes: DiagramKind[] = tradeCode
    ? TRADE_DIAGRAM_TYPES[tradeCode.toUpperCase()] ?? ALL_DIAGRAM_TYPES
    : ALL_DIAGRAM_TYPES;
  // Workspace tools provisioned for this exam — the candidate's choice is
  // never wider than this pool. Empty/absent means all tools (legacy).
  const configuredTools = useMemo(() => effectiveWorkspaceTools(workspaceTools), [workspaceTools]);
  // Tools the platform owner locked — always on, never toggleable by the
  // candidate. Empty/absent means none locked.
  const lockedTools = useMemo(
    () =>
      (lockedWorkspaceTools ?? []).filter(
        (t): t is WorkspaceToolId =>
          ALL_WORKSPACE_TOOLS.includes(t as WorkspaceToolId) && configuredTools.includes(t as WorkspaceToolId),
      ),
    [lockedWorkspaceTools, configuredTools],
  );
  // Which provisioned tools the candidate has enabled. Every configured tool
  // is on by default; the per-session choice (localStorage) is applied when
  // present, clamped to the configured pool — locked tools are always forced on.
  const [enabledTools, setEnabledTools] = useState<WorkspaceToolId[]>(() => {
    const saved = readToolsChoice(sessionId);
    const base = saved ? configuredTools.filter((t) => saved.includes(t)) : configuredTools;
    return [...new Set([...base, ...lockedTools])];
  });
  const [toolsMenuOpen, setToolsMenuOpen] = useState(false);
  const canUse = (tool: WorkspaceToolId) => enabledTools.includes(tool);
  // Tabs that may be opened, in priority order for the initial active tab.
  // The Diagram tab is available whenever the diagram editor is enabled — design
  // stages open on it by default, while other sections keep the editor first
  // and let the candidate draw freely (picking a diagram type per their trade).
  const visibleTabs: TabType[] = [
    ...(designDiagramType && canUse('DIAGRAM_EDITOR') ? ['diagram' as const] : []),
    ...(canUse('CODE_EDITOR') ? ['editor' as const] : []),
    ...(!designDiagramType && canUse('DIAGRAM_EDITOR') ? ['diagram' as const] : []),
    ...(canUse('TERMINAL') ? ['terminal' as const] : []),
    ...(canUse('BROWSER_PREVIEW') ? ['browser' as const] : []),
    ...(canUse('DATABASE') ? ['database' as const] : []),
  ];
  const [activeTab, setActiveTab] = useState<TabType>(() => visibleTabs[0] ?? 'editor');
  const [showExplorer, setShowExplorer] = useState(() => canUse('FILE_EXPLORER'));
  // Persistent “recommended tools” sidebar on the right — always available,
  // even without a selection (it then shows the full enabled tool set).
  const [showContextPanel, setShowContextPanel] = useState(true);
  const [showTerminal, setShowTerminal] = useState(false);
  const [showBrowser, setShowBrowser] = useState(false);

  // ── Candidate tools picker ────────────────────────
  // Toggle one provisioned tool on/off; the choice is persisted per session.
  // Re-enabling the explorer re-opens the file tree.
  const toggleTool = useCallback(
    (tool: WorkspaceToolId) => {
      // Locked tools cannot be turned off by the candidate.
      if (lockedTools.includes(tool)) return;
      const turningOn = !enabledTools.includes(tool);
      const next = turningOn
        ? [...enabledTools, tool]
        : enabledTools.filter((t) => t !== tool);
      setEnabledTools(next);
      writeToolsChoice(next, sessionId);
      if (turningOn && tool === 'FILE_EXPLORER') setShowExplorer(true);
    },
    [enabledTools, sessionId, lockedTools],
  );

  const resetTools = useCallback(() => {
    writeToolsChoice(configuredTools, sessionId);
    setEnabledTools(configuredTools);
    setShowExplorer(configuredTools.includes('FILE_EXPLORER'));
  }, [configuredTools, sessionId]);

  // Keep the active tab on a visible one — when the exam's tool selection hides
  // the current tab (e.g. selecting a file while the editor is disabled) the
  // workspace falls back to the first enabled tab instead of a blank panel.
  useEffect(() => {
    setActiveTab((prev) => (visibleTabs.includes(prev) ? prev : (visibleTabs[0] ?? 'editor')));
  }, [visibleTabs, activeTab]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  // Currently selected folder in the Explorer — folders highlight the union of
  // the tools of every file inside them (context-aware tool bar).
  const [selectedDir, setSelectedDir] = useState<string | null>(null);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set(['/src']));
  const [editorContent, setEditorContent] = useState('');
  const [editorLanguage, setEditorLanguage] = useState('plaintext');
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [newFileName, setNewFileName] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFileInput, setShowNewFileInput] = useState(false);
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  // Directory where the next New File / New Folder will be created (default: root)
  const [createTargetDir, setCreateTargetDir] = useState('/');
  const sandboxPreviewBase = sessionId
    ? `${window.location.origin}/api/sandbox/workspace/${sessionId}/preview/`
    : 'http://localhost:3000';
  const [browserUrl, setBrowserUrl] = useState(sandboxPreviewBase);
  const [browserInputValue, setBrowserInputValue] = useState(sandboxPreviewBase);
  const [serverStatus, setServerStatus] = useState<
    'checking' | 'running' | 'stopped' | 'starting' | 'error'
  >('checking');
  const [serverPort, setServerPort] = useState<number | null>(null);
  // MySQL (XAMPP) console state
  const [mysqlStatus, setMysqlStatus] = useState<'checking' | 'connected' | 'offline' | 'error'>('checking');
  const [mysqlVersion, setMysqlVersion] = useState('');
  const [mysqlError, setMysqlError] = useState(''); // last status-check error (e.g. access denied)
  const [mysqlEndpoint, setMysqlEndpoint] = useState(''); // host:port from the backend status payload
  const [sqlInput, setSqlInput] = useState('');
  const [sqlRunning, setSqlRunning] = useState(false);
  // "Save script" — persists the SQL console input into the folder the
  // candidate is working in (selected folder, else the exam's db folder).
  const [showSqlSave, setShowSqlSave] = useState(false);
  const [sqlScriptName, setSqlScriptName] = useState('schema.sql');
  const [sqlResult, setSqlResult] = useState<{
    type: 'SELECT' | 'OK';
    columns?: string[];
    rows?: Array<Record<string, unknown>>;
    rowCount?: number;
    affectedRows?: number;
    message?: string;
  } | null>(null);
  const [sqlError, setSqlError] = useState('');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; path: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  // Guards against Enter+blur firing createNewFile/createNewFolder twice
  const createLockRef = useRef(false);

  // File system — use sandbox-backed when sessionId provided, in-memory otherwise
  const fs = useRef<VirtualFileSystem | SandboxFileSystem>(
    sessionId
      ? createSandboxFileSystem(sessionId, sectionType, { projectMode })
      : createVirtualFileSystem(initialFiles)
  ).current;
  const [treeData, setTreeData] = useState<FSNode[]>(fs.getNodes());
  const isSandboxFs = !!sessionId;

  // ── Diagram editor state (design stages) ────────
  // A design stage can require several diagrams (e.g. an ERD *and* a DFD).
  // Each diagram is a separate canvas tab persisted to its own file in the
  // stage folder — the primary to diagram.json (legacy array format) and any
  // extras to diagram-2.json / diagram-3.json ({diagramType, elements}).
  const primaryFilePath = diagramFilePath;
  const primaryDir = diagramFilePath ? diagramFilePath.replace(/\/[^/]+$/, '') : '';
  const [diagramTabs, setDiagramTabs] = useState<DiagramTab[]>([]);
  const [activeDiagramId, setActiveDiagramId] = useState<string | null>(null);
  const diagramTabsRef = useRef<DiagramTab[]>([]);
  diagramTabsRef.current = diagramTabs;
  const diagramLoadedRef = useRef(false);

  // Expand the starter folders for the current stage once the tree loads.
  // The sandbox tree arrives asynchronously (init → fetch), so this watches
  // treeData and only fires once, when directories first appear.
  const didAutoExpand = useRef(false);
  useEffect(() => {
    if (!isSandboxFs || didAutoExpand.current) return;
    const topDirs = treeData.filter((n) => n.type === 'directory').map((n) => n.path);
    if (topDirs.length === 0) return;
    didAutoExpand.current = true;
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      topDirs.forEach((p) => next.add(p));
      // Also expand the stage folder so the saved diagram file is visible
      if (diagramFilePath) {
        const parts = diagramFilePath.split('/');
        let acc = '';
        for (let i = 0; i < parts.length - 1; i++) {
          acc += '/' + parts[i];
          next.add(acc);
        }
      }
      return next;
    });
  }, [isSandboxFs, treeData, diagramFilePath]);

  // Load the saved diagram tabs from their files once the tree is available.
  // Sandbox tree nodes carry no content, so fetch each file from the backend
  // readFile route when needed — this restores diagrams on a returning visit.
  // Design sections restore their stage diagrams (primary + extras); non-design
  // sections restore whatever free diagrams the candidate saved anywhere in the
  // workspace (they land in designs/ or database/designs/ via addDiagramTab).
  useEffect(() => {
    if (diagramLoadedRef.current) return;

    // Distinguish "file missing" (stop probing) from "file present but
    // malformed/empty" (skip it and keep looking for later diagrams).
    const readContent = async (
      filePath: string,
    ): Promise<{ present: boolean; content?: string }> => {
      const node = fs.findNode('/' + filePath);
      if (node && node.type === 'file' && node.content) {
        return { present: true, content: node.content };
      }
      if (sessionId) {
        // Sandbox tree nodes carry no content — fetch the file body from the
        // backend so diagrams saved in ANY folder (not just the stage dir)
        // restore correctly on a returning visit.
        try {
          const res = await api.get(`/sandbox/workspace/${sessionId}/files/${filePath}`);
          const content = res.data?.data?.content;
          if (typeof content === 'string') return { present: true, content };
        } catch {
          /* ignore fetch failure — treat as absent */
        }
        return { present: true }; // file exists in the sandbox tree
      }
      return { present: node?.type === 'file' };
    };
    const parseFile = (
      content: string,
    ): { diagramType: DiagramKind; elements: DiagramElement[] } | null => {
      try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          // Legacy single-diagram file — elements only; type comes from the
          // section. A free diagram (no section) can't be typed — skip it.
          if (!designDiagramType) return null;
          return { diagramType: designDiagramType, elements: parsed as DiagramElement[] };
        }
        if (
          parsed &&
          typeof parsed === 'object' &&
          Array.isArray((parsed as any).elements) &&
          (parsed as any).diagramType
        ) {
          return {
            diagramType: (parsed as any).diagramType as DiagramKind,
            elements: (parsed as any).elements as DiagramElement[],
          };
        }
      } catch {
        /* ignore malformed diagram */
      }
      return null;
    };

    if (designDiagramType && primaryFilePath) {
      const primaryNode = fs.findNode('/' + primaryFilePath);
      if (primaryNode && primaryNode.type === 'file') {
        // Claim the load synchronously so tree updates can't trigger a second fetch
        diagramLoadedRef.current = true;
        const loadDiagramTabs = async () => {
          const tabs: DiagramTab[] = [];
          const primary = await readContent(primaryFilePath);
          const primaryParsed = primary.content ? parseFile(primary.content) : null;
          tabs.push(makePrimaryTab(designDiagramType!, primaryFilePath, primaryParsed?.elements ?? []));

          // Probe for saved extra diagrams (diagram-2.json, diagram-3.json, …)
          let n = 2;
          for (;;) {
            const extraPath = `${primaryDir}/diagram-${n}.json`;
            const extra = await readContent(extraPath);
            if (!extra.present) break; // no more saved diagrams
            const parsed = extra.content ? parseFile(extra.content) : null;
            if (!parsed) {
              // File exists but is malformed — skip it rather than hiding the
              // diagrams saved after it.
              n += 1;
              continue;
            }
            tabs.push({
              id: nextDiagramId(),
              diagramType: parsed.diagramType,
              elements: parsed.elements,
              filePath: extraPath,
            });
            n += 1;
          }

          // Also restore diagrams saved into other folders — the candidate can
          // select a folder (e.g. database/) so new canvases save there; scan the
          // whole tree for diagram files we haven't loaded yet.
          const loadedPaths = new Set(tabs.map((t) => t.filePath));
          const flattened = fs.getFlattenedFiles();
          for (const f of flattened) {
            const rel = f.path.replace(/^\/+/, '');
            if (!/diagram(-\d+)?\.json$/.test(rel)) continue;
            if (loadedPaths.has(rel)) continue;
            const extra = await readContent(rel);
            if (!extra.present) continue;
            const parsed = extra.content ? parseFile(extra.content) : null;
            if (!parsed) continue; // malformed or empty file — keep looking
            tabs.push({
              id: nextDiagramId(),
              diagramType: parsed.diagramType,
              elements: parsed.elements,
              filePath: rel,
            });
            loadedPaths.add(rel);
          }

          setDiagramTabs(tabs);
          setActiveDiagramId(tabs[0]?.id ?? null);
        };
        loadDiagramTabs();
      } else if (treeData.length > 0) {
        // Tree is loaded but there is no diagram file yet — start with a single
        // empty primary canvas so the candidate can draw straight away.
        diagramLoadedRef.current = true;
        setDiagramTabs([makePrimaryTab(designDiagramType, primaryFilePath, [])]);
        setActiveDiagramId('diagram-primary');
      }
    } else if (canUse('DIAGRAM_EDITOR') && treeData.length > 0) {
      // Non-design section — restore the candidate's free diagrams. They are
      // saved into the workspace folders (designs/ or database/designs/), so
      // scan the whole tree for diagram files and reopen each as a canvas.
      diagramLoadedRef.current = true;
      const loadSavedDiagrams = async () => {
        const tabs: DiagramTab[] = [];
        const flattened = fs.getFlattenedFiles();
        for (const f of flattened) {
          const rel = f.path.replace(/^\/+/, '');
          if (!/diagram(-\d+)?\.json$/.test(rel)) continue;
          const extra = await readContent(rel);
          if (!extra.present) continue;
          const parsed = extra.content ? parseFile(extra.content) : null;
          if (!parsed) continue; // malformed or empty file — keep looking
          tabs.push({
            id: nextDiagramId(),
            diagramType: parsed.diagramType,
            elements: parsed.elements,
            filePath: rel,
          });
        }
        setDiagramTabs(tabs);
        setActiveDiagramId(tabs[0]?.id ?? null);
      };
      loadSavedDiagrams();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [designDiagramType, primaryFilePath, primaryDir, fs, treeData]);

  // Cleanup sandbox FS poll timer on unmount
  useEffect(() => {
    return () => {
      if (isSandboxFs && 'destroy' in fs) {
        (fs as SandboxFileSystem).destroy();
      }
    };
  }, []);

  // Subscribe to FS changes
  useEffect(() => {
    const unsub = fs.subscribe((nodes: FSNode[]) => {
      setTreeData(nodes);
      if (onFilesChange) {
        onFilesChange(fs.getFlattenedFiles());
      }
    });
    return () => {
      unsub();
    };
  }, [fs, onFilesChange]);

  // Auto-select first file (with slight delay for SandboxFS init) so the
  // editor opens with content. Only runs while the EDITOR tab is active — if
  // the candidate is on the Terminal/Browser/Database/Diagram tab, selecting
  // a file would yank them back to the editor and kill the shell/preview.
  useEffect(() => {
    if (activeTab !== 'editor') return;
    const timer = setTimeout(() => {
      if (!selectedFile && !designDiagramType) {
        const files = fs.getFlattenedFiles();
        if (files.length > 0) {
          selectFile(files[0]!.path);
        }
      }
    }, isSandboxFs ? 500 : 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isSandboxFs]);

  // ── File Selection ───────────────────────────────
  const selectFile = useCallback((path: string) => {
    const node = fs.findNode(path);
    if (node && node.type === 'file') {
      setSelectedFile(path);
      setSelectedDir(null); // a file selection supersedes the folder context
      setEditorContent(node.content ?? '');
      setEditorLanguage(node.language || 'plaintext');
      setActiveTab('editor');
    }
  }, [fs]);

  // ── Folder Selection ─────────────────────────────
  // Clicking a folder both expands it and makes it the current context, so the
  // tab bar highlights the tools relevant to the work inside that folder, and
  // tools (diagram canvas, SQL console, new file/upload) save INTO that folder.
  const selectFolder = useCallback((path: string) => {
    setSelectedDir(path);
    setCreateTargetDir(path);
  }, []);

  // ── Editor Content Change ─────────────────────────
  const handleEditorChange = useCallback((content: string) => {
    setEditorContent(content);
    if (selectedFile) {
      fs.updateFile(selectedFile, content);
    }
  }, [fs, selectedFile]);

  // ── Diagram change (design stages) ───────────────
  // Persist every drawing change back into that diagram's file so the diagrams
  // are saved with the workspace files and included in the answer. The primary
  // file keeps the legacy plain-array format; extras store {diagramType, elements}.
  // Note: the backend AI evaluator reads only the primary diagram.json — extra
  // diagrams are saved with the submission for the assessor, not auto-scored.
  const handleDiagramChange = useCallback(
    (tabId: string, elements: DiagramElement[]) => {
      setDiagramTabs((prev) => prev.map((t) => (t.id === tabId ? { ...t, elements } : t)));
      const tab = diagramTabsRef.current.find((t) => t.id === tabId);
      if (!tab || !tab.filePath) return;
      const path = '/' + tab.filePath;
      const json =
        tab.filePath === primaryFilePath
          ? JSON.stringify(elements)
          : JSON.stringify({ diagramType: tab.diagramType, elements });
      const existing = fs.findNode(path);
      if (existing && existing.type === 'file') {
        fs.updateFile(path, json);
      } else {
        fs.createFile(path, json);
      }
    },
    [fs, primaryFilePath],
  );

  // ── Saved-designs → workspace sync ────────────────
  // The manual Saved-designs library lives in the browser (localStorage). To
  // make those drafts part of the submitted answer — so assessors can see them
  // in the results/review view — each saved design is mirrored into its kind's
  // folder in the workspace files (an ERD draft lands next to the section
  // diagrams in database/designs/erd/). Those files ride along in the
  // flattened file array that design-stage sections submit, and the results
  // endpoint surfaces them (see backend candidate.service extractDesignsFromAnswer).
  const syncSavedDesignsToWorkspace = useCallback(
    (designs: SavedDesign[]) => {
      if (readOnly) return;
      const currentPaths = new Set<string>();
      const used = new Set<string>();
      for (const design of designs) {
        const dir = DIAGRAM_DEFAULT_DIRS[design.diagramType] ?? 'database/designs';
        let base =
          (design.name || 'design')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') || 'design';
        // Never collide with the section's own canvases (diagram.json,
        // diagram-2.json, ...).
        if (/^diagram(-\d+)?$/.test(base)) base = `${base}-saved`;
        let slug = base;
        let n = 2;
        while (used.has(`${dir}:${slug}`)) {
          slug = `${base}-${n}`;
          n += 1;
        }
        used.add(`${dir}:${slug}`);
        const relPath = `${dir}/${slug}.json`;
        currentPaths.add(relPath);
        const payload = JSON.stringify({
          name: design.name,
          diagramType: design.diagramType,
          elements: design.elements,
          savedAt: design.savedAt,
        });
        const existing = fs.findNode('/' + relPath);
        if (existing && existing.type === 'file') {
          fs.updateFile('/' + relPath, payload);
        } else {
          fs.createFile('/' + relPath, payload);
        }
      }
      // Reconcile: drop saved-design files in the kind folders whose library
      // entry was deleted. Saved-design files are identified by their name
      // field, and section canvases (diagram*.json) are never touched.
      for (const dir of Object.values(DIAGRAM_DEFAULT_DIRS)) {
        const dirNode = fs.findNode('/' + dir);
        if (!dirNode || dirNode.type !== 'directory' || !dirNode.children) continue;
        for (const child of dirNode.children) {
          if (child.type !== 'file' || !child.name.endsWith('.json')) continue;
          if (/^diagram(-\d+)?\.json$/.test(child.name)) continue;
          if (currentPaths.has(`${dir}/${child.name}`)) continue;
          try {
            const body = JSON.parse(child.content ?? '');
            if (
              body &&
              typeof body === 'object' &&
              typeof (body as { name?: unknown }).name === 'string' &&
              Array.isArray((body as { elements?: unknown }).elements)
            ) {
              fs.deleteNode(child.path);
            }
          } catch {
            /* not JSON — leave it */
          }
        }
      }
    },
    [fs, readOnly],
  );

  // Sync designs saved in a previous visit once the workspace tree is ready
  // (the sandbox tree arrives asynchronously after init).
  const savedDesignsSyncedRef = useRef(false);
  useEffect(() => {
    if (readOnly || savedDesignsSyncedRef.current) return;
    if (treeData.length === 0) return;
    savedDesignsSyncedRef.current = true;
    syncSavedDesignsToWorkspace(readSavedDesigns());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [treeData, readOnly]);

  // ── Add / remove diagram canvases (design stages) ──
  const addDiagramTab = useCallback(
    (diagramType: DiagramKind) => {
      // Save new canvases into the folder the candidate is working in (the
      // selected folder) so the design lands next to its SQL/files — falling
      // back to the stage's diagram folder when nothing is selected, or the
      // kind's default folder (database/designs/erd, database/designs/dfd, ...)
      // on non-design sections. The first canvas in a FRESH folder takes
      // diagram.json; in the stage folder the primary canvas already owns
      // diagram.json, so extras are diagram-2.json…
      const saveDir = selectedDir
        ? selectedDir.replace(/^\/+|\/+$/g, '')
        : primaryDir || DIAGRAM_DEFAULT_DIRS[diagramType];
      let n = saveDir === primaryDir ? 2 : 1;
      while (
        fs.findNode(`/${saveDir}/diagram${n === 1 ? '' : `-${n}`}.json`)?.type === 'file'
      ) n += 1;
      const filePath = `${saveDir}/diagram${n === 1 ? '' : `-${n}`}.json`;
      const tab: DiagramTab = {
        id: nextDiagramId(),
        diagramType,
        elements: [],
        filePath,
      };
      // Create the file immediately so the tab survives a reload even when empty.
      fs.createFile('/' + filePath, JSON.stringify({ diagramType, elements: [] }));
      setDiagramTabs((prev) => [...prev, tab]);
      setActiveDiagramId(tab.id);
      // Expand the stage folder so the new file is visible in the explorer.
      const parts = filePath.split('/');
      let acc = '';
      for (let i = 0; i < parts.length - 1; i++) {
        acc += '/' + parts[i];
        setExpandedDirs((prev) => new Set(prev).add(acc));
      }
    },
    [fs, primaryDir, selectedDir],
  );

  const removeDiagramTab = useCallback(
    (tabId: string) => {
      const tab = diagramTabsRef.current.find((t) => t.id === tabId);
      if (!tab || tab.filePath === primaryFilePath) return; // the primary canvas is fixed
      fs.deleteNode('/' + tab.filePath);
      const next = diagramTabsRef.current.filter((t) => t.id !== tabId);
      setDiagramTabs(next);
      setActiveDiagramId((prev) => (prev === tabId ? (next[0]?.id ?? null) : prev));
    },
    [fs, primaryFilePath],
  );

  // ── Create File ──────────────────────────────────
  // Names may be plain (e.g. "index.js") or nested paths (e.g. "src/utils/helper.js").
  // targetDir defaults to createTargetDir (set via the context menu) so new items
  // can be created inside a selected folder.
  const createNewFile = useCallback((name: string, targetDir?: string) => {
    if (createLockRef.current) return;
    if (!name.trim()) return;
    const clean = name.trim().replace(/^\/+|\/+$/g, '');
    if (!clean) return;
    const dir = (targetDir ?? createTargetDir).replace(/\/+$/g, '') || '/';
    const path = dir === '/' ? '/' + clean : dir + '/' + clean;
    const success = fs.createFile(path, '');
    if (success) {
      showNotification(`Created ${clean}`, 'success');
      selectFile(path);
      // Expand parent dirs
      const parts = path.split('/').filter(Boolean);
      if (parts.length > 1) {
        let parentPath = '';
        for (let i = 0; i < parts.length - 1; i++) {
          parentPath += '/' + parts[i]!;
          setExpandedDirs((prev) => new Set(prev).add(parentPath));
        }
      }
    } else {
      showNotification(`File "${clean}" already exists`, 'error');
    }
    setNewFileName('');
    setShowNewFileInput(false);
    // Release the lock after the current event loop tick (blur may follow Enter)
    setTimeout(() => {
      createLockRef.current = false;
    }, 0);
  }, [fs, selectFile, createTargetDir]);

  // ── Create Folder ────────────────────────────────
  const createNewFolder = useCallback((name: string, targetDir?: string) => {
    if (createLockRef.current) return;
    if (!name.trim()) return;
    const clean = name.trim().replace(/^\/+|\/+$/g, '');
    if (!clean) return;
    const dir = (targetDir ?? createTargetDir).replace(/\/+$/g, '') || '/';
    const path = dir === '/' ? '/' + clean : dir + '/' + clean;
    const success = fs.createDirectory(path);
    if (success) {
      showNotification(`Created folder ${clean}`, 'success');
      // Expand the new folder's parents (and the folder itself)
      const parts = path.split('/').filter(Boolean);
      if (parts.length > 1) {
        let parentPath = '';
        for (let i = 0; i < parts.length - 1; i++) {
          parentPath += '/' + parts[i]!;
          setExpandedDirs((prev) => new Set(prev).add(parentPath));
        }
      }
      setExpandedDirs((prev) => new Set(prev).add(path));
    } else {
      showNotification(`Folder "${clean}" already exists`, 'error');
    }
    setNewFolderName('');
    setShowNewFolderInput(false);
    // Release the lock after the current event loop tick (blur may follow Enter)
    setTimeout(() => {
      createLockRef.current = false;
    }, 0);
  }, [fs, createTargetDir]);

  // Parent directory of a path (e.g. /src/utils/helper.js → /src/utils)
  const getParentDirOf = useCallback((nodePath: string): string => {
    if (nodePath === '/' || nodePath === '') return '/';
    const idx = nodePath.lastIndexOf('/');
    return idx <= 0 ? '/' : nodePath.slice(0, idx);
  }, []);

  // ── Rename ──────────────────────────────────────
  const startRename = useCallback((path: string) => {
    const node = fs.findNode(path);
    if (node) {
      setRenamingPath(path);
      setRenameValue(node.name);
    }
    setContextMenu(null);
  }, [fs]);

  const confirmRename = useCallback(() => {
    if (!renamingPath || !renameValue.trim()) return;
    const success = fs.renameNode(renamingPath, renameValue.trim());
    if (success) {
      showNotification(`Renamed to ${renameValue}`, 'success');
    } else {
      showNotification('Rename failed - name may already exist', 'error');
    }
    setRenamingPath(null);
    setRenameValue('');
  }, [fs, renamingPath, renameValue]);

  // ── Delete ──────────────────────────────────────
  const deleteNode = useCallback((path: string) => {
    const node = fs.findNode(path);
    if (!node) return;
    const name = node.name;
    const success = fs.deleteNode(path);
    if (success) {
      showNotification(`Deleted ${name}`, 'info');
      if (selectedFile === path) {
        setSelectedFile(null);
        setEditorContent('');
      }
    }
    setContextMenu(null);
  }, [fs, selectedFile]);

  // ── Upload File ─────────────────────────────────
  const handleUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const dir = createTargetDir === '/' ? '' : createTargetDir;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        fs.createFile(dir + '/' + file.name, content);
      };
      reader.readAsText(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [fs, createTargetDir]);

  // ── Download ────────────────────────────────────
  const downloadProject = useCallback(() => {
    const files = fs.getFlattenedFiles();
    // Create a simple text manifest
    let manifest = '# Workspace Files\n\n';
    for (const f of files) {
      manifest += `## ${f.path}\n\`\`\`\n${f.content}\n\`\`\`\n\n`;
    }
    const blob = new Blob([manifest], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'workspace-export.txt';
    a.click();
    URL.revokeObjectURL(url);
    showNotification('Workspace exported', 'success');
  }, [fs]);

  // ── Reset Workspace ─────────────────────────────
  const resetWorkspace = useCallback(() => {
    if (confirm('Reset workspace to default? This will discard all changes.')) {
      fs.reset();
      setSelectedFile(null);
      setEditorContent('');
      if (designDiagramType && primaryFilePath) {
        setDiagramTabs([makePrimaryTab(designDiagramType, primaryFilePath, [])]);
        setActiveDiagramId('diagram-primary');
      } else {
        // Non-design section — clear the free canvases so the type chooser
        // (and no diagram files) is what the candidate sees again.
        setDiagramTabs([]);
        setActiveDiagramId(null);
      }
      diagramLoadedRef.current = false;
      showNotification('Workspace reset', 'info');
    }
  }, [fs, designDiagramType, primaryFilePath]);

  // ── Toggle panels ────────────────────────────────
  const toggleExplorer = () => setShowExplorer((p) => !p);
  const toggleContextPanel = () => setShowContextPanel((p) => !p);
  const toggleTerminal = () => {
    setShowTerminal((p) => !p);
    if (!showTerminal) setActiveTab('terminal');
  };
  const toggleBrowser = () => {
    setShowBrowser((p) => !p);
    if (!showBrowser) setActiveTab('browser');
  };

  // ── Notification helper ──────────────────────────
  const notificationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const showNotification = useCallback(
    (message: string, type: 'success' | 'error' | 'info') => {
      setNotification({ message, type });
      if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);
      notificationTimerRef.current = setTimeout(() => setNotification(null), 2500);
    },
    [],
  );
  
  useEffect(() => {
    return () => {
      if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);
    };
  }, []);

  // ── Tree rendering ───────────────────────────────
  const renderTreeNode = (node: FSNode, depth: number): React.ReactNode => {
    const isExpanded = expandedDirs.has(node.path);
    const isSelected =
      node.type === 'file' ? selectedFile === node.path : selectedDir === node.path;
    const isRenaming = renamingPath === node.path;

    if (node.type === 'directory') {
      return (
        <div key={node.path}>
          <div
            className={cn(
              'flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors',
              'hover:bg-surface-tertiary text-text-secondary hover:text-text-primary',
              isSelected && 'bg-primary-50 text-primary-700',
            )}
            style={{ paddingLeft: `${12 + depth * 14}px` }}
            onClick={() => {
              setExpandedDirs((prev) => {
                const next = new Set(prev);
                if (next.has(node.path)) next.delete(node.path);
                else next.add(node.path);
                return next;
              });
              selectFolder(node.path);
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              setContextMenu({ x: e.clientX, y: e.clientY, path: node.path });
            }}
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3 shrink-0" />
            ) : (
              <ChevronRight className="h-3 w-3 shrink-0" />
            )}
            {isExpanded ? (
              <FolderOpen className="h-3.5 w-3.5 shrink-0 text-warning" />
            ) : (
              <Folder className="h-3.5 w-3.5 shrink-0 text-warning" />
            )}
            <span className="truncate">{node.name}</span>
          </div>
          {isExpanded &&
            node.children?.map((child: any) => renderTreeNode(child, depth + 1))}
        </div>
      );
    }

    return (
      <div
        key={node.path}
        className={cn(
          'flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors',
          'hover:bg-surface-tertiary text-text-secondary hover:text-text-primary',
          isSelected && 'bg-primary-50 text-primary-700 font-medium',
        )}
        style={{ paddingLeft: `${12 + depth * 14}px` }}
        onClick={() => selectFile(node.path)}
        onContextMenu={(e) => {
          e.preventDefault();
          setContextMenu({ x: e.clientX, y: e.clientY, path: node.path });
        }}
      >
        <FileIcon fileName={node.name} />
        {isRenaming ? (
          <input
            autoFocus
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={confirmRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') confirmRename();
              if (e.key === 'Escape') setRenamingPath(null);
            }}
            className="flex-1 rounded border border-primary-400 bg-white px-1 py-0 text-xs text-text-primary outline-none"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="truncate">{node.name}</span>
        )}
      </div>
    );
  };

  // ── Context Menu ────────────────────────────────
  const contextMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // ── Selected file node ──────────────────────────
  const selectedNode = selectedFile ? fs.findNode(selectedFile) : null;
  // The node shown in the context sidebar — a selected folder OR file.
  const contextNode = selectedDir
    ? fs.findNode(selectedDir)
    : selectedFile
      ? fs.findNode(selectedFile)
      : null;

  // ── Context-aware tool highlighting ───────────────
  // Tools that make sense for the current file/folder selection. A folder
  // highlights the union of every file's tools inside it; a file highlights its
  // own tools; nothing selected means no highlight. Only tools the exam enabled
  // can ever be highlighted (hidden tabs simply don't appear).
  const contextSelection = useMemo(
    () =>
      selectedDir
        ? { path: selectedDir, type: 'directory' as const }
        : selectedFile
          ? { path: selectedFile, type: 'file' as const }
          : null,
    [selectedDir, selectedFile],
  );

  const highlightedTools = useMemo(
    () =>
      toolsForSelection(contextSelection, treeData).filter((t) => enabledTools.includes(t)),
    [contextSelection, treeData, enabledTools],
  );

  // Recommended tools WITH reasons, for the persistent sidebar panel. Empty
  // selection → no recommendations (the panel falls back to listing the
  // enabled tools as “available” instead). Only tools the exam enabled can be
  // recommended — a disabled tool must never appear as a suggestion.
  const toolRecommendations = useMemo(
    () =>
      describeSelectionTools(contextSelection, treeData).filter((r) =>
        enabledTools.includes(r.tool),
      ),
    [contextSelection, treeData, enabledTools],
  );

  // Enabled tools that are NOT recommended for the current selection.
  const availableTools = useMemo(
    () => enabledTools.filter((t) => !toolRecommendations.some((r) => r.tool === t)),
    [enabledTools, toolRecommendations],
  );

  // File count inside the selected directory (for the panel's node summary).
  const contextDirFileCount = useMemo(
    () =>
      contextNode?.type === 'directory' ? collectFilesInFolder(treeData, contextNode.path).length : 0,
    [contextNode, treeData],
  );

  // ── Show/hide toggles effects ────────────────────
  useEffect(() => {
    if (showTerminal) setActiveTab('terminal');
  }, [showTerminal]);

  useEffect(() => {
    if (showBrowser) setActiveTab('browser');
  }, [showBrowser]);

  // ── Poll server status (only for sandbox sessions) ─
  const refreshServerStatus = useCallback(async () => {
    if (!sessionId) {
      setServerStatus('stopped');
      return;
    }
    try {
      const res = await api.get(`/sandbox/workspace/${sessionId}/server/status`);
      const data = res.data?.data;
      setServerStatus(data?.running ? 'running' : 'stopped');
      setServerPort(data?.port ?? null);
    } catch {
      setServerStatus('error');
    }
  }, [sessionId]);

  useEffect(() => {
    refreshServerStatus();
    // Poll only while the tab is visible
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshServerStatus();
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [refreshServerStatus]);

  const handleStartServer = useCallback(async () => {
    if (!sessionId) return;
    setServerStatus('starting');
    try {
      const res = await api.post(`/sandbox/workspace/${sessionId}/server/start`);
      const data = res.data?.data;
      if (data?.started && data?.url) {
        setServerPort(data.port ?? null);
        const url = `${window.location.origin}/api/sandbox/workspace/${sessionId}/preview/`;
        setBrowserUrl(url);
        setBrowserInputValue(url);
        setServerStatus('running');
        showNotification('Dev server started — refresh the preview', 'success');
      } else {
        setServerStatus('stopped');
        showNotification('Dev server did not start. Check the Terminal for errors.', 'error');
      }
    } catch {
      setServerStatus('error');
      showNotification('Failed to start dev server. Try npm start in the Terminal tab.', 'error');
    }
  }, [sessionId]);

  const handleStopServer = useCallback(async () => {
    if (!sessionId) return;
    try {
      await api.post(`/sandbox/workspace/${sessionId}/server/stop`);
      setServerStatus('stopped');
      showNotification('Dev server stopped', 'info');
    } catch {
      showNotification('Failed to stop dev server', 'error');
    }
  }, [sessionId]);

  // ── MySQL (XAMPP) console ──────────────────────
  const refreshMysqlStatus = useCallback(async () => {
    if (!sessionId) {
      setMysqlStatus('offline');
      return;
    }
    try {
      const res = await api.get(`/sandbox/workspace/${sessionId}/mysql/status`);
      const data = res.data?.data;
      const endpoint = data?.port ? `${data.host ?? '127.0.0.1'}:${data.port}` : '';
      setMysqlEndpoint(endpoint);
      if (data?.connected) {
        setMysqlStatus('connected');
        setMysqlVersion(data.version ?? '');
        setMysqlError('');
      } else {
        // The backend distinguishes "server down" from "auth/plugin failed"
        // via data.error — surface it so the real cause isn't hidden.
        setMysqlStatus('offline');
        setMysqlVersion('');
        setMysqlError(data?.error ?? '');
      }
    } catch {
      setMysqlStatus('error');
      setMysqlVersion('');
      setMysqlError('');
    }
  }, [sessionId]);

  useEffect(() => {
    refreshMysqlStatus();
    // Poll only while the tab is visible
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshMysqlStatus();
      }
    }, 15000);
    return () => clearInterval(timer);
  }, [refreshMysqlStatus]);

  const runSql = useCallback(async () => {
    if (!sessionId || !sqlInput.trim() || sqlRunning) return;
    setSqlRunning(true);
    setSqlError('');
    setSqlResult(null);
    try {
      const res = await api.post(`/sandbox/workspace/${sessionId}/mysql/query`, {
        sql: sqlInput,
      });
      setSqlResult(res.data?.data ?? null);
    } catch (err: any) {
      setSqlError(err?.response?.data?.message || 'SQL query failed');
    } finally {
      setSqlRunning(false);
    }
  }, [sessionId, sqlInput, sqlRunning]);

  const insertSnippet = useCallback((sql: string) => {
    setSqlInput((prev) => (prev.trim() ? `${prev.trim()}\n${sql}` : sql));
  }, []);

  // Save the SQL console input as a script file. The script lands inside the
  // folder the candidate is working in (the selected folder), or the exam's
  // database folder (db/ or database/sql/) when nothing is selected — so the
  // schema lives with the other files of the same task.
  const saveSqlScript = useCallback(() => {
    if (!sqlInput.trim()) {
      showNotification('Type some SQL first, then save the script', 'error');
      return;
    }
    const name = sqlScriptName.trim() || 'schema.sql';
    const dir = saveFolderForSelection(
      contextSelection,
      projectMode ? 'database/sql' : 'db',
    );
    const path = dir ? `${dir}/${name}` : name;
    const existing = fs.findNode('/' + path);
    if (existing && existing.type === 'file') {
      fs.updateFile('/' + path, sqlInput);
    } else {
      fs.createFile('/' + path, sqlInput);
    }
    // Expand the folder chain so the saved script is visible in the explorer.
    const parts = path.split('/');
    let acc = '';
    for (let i = 0; i < parts.length - 1; i++) {
      acc += '/' + parts[i];
      setExpandedDirs((prev) => new Set(prev).add(acc));
    }
    showNotification(`Saved ${path}`, 'success');
    setShowSqlSave(false);
  }, [
    fs,
    sqlInput,
    sqlScriptName,
    contextSelection,
    projectMode,
    showNotification,
  ]);

  // ── Render ───────────────────────────────────────
  return (
    <div className="flex h-full min-h-[500px] flex-col overflow-hidden rounded-xl border border-border bg-white">
      {/* ── Top Toolbar ───────────────────────────── */}
      <div className="flex items-center justify-between border-b border-border bg-surface-secondary px-3 py-1.5">
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-1.5 mr-2">
            <div className="h-2.5 w-2.5 rounded-full bg-error" />
            <div className="h-2.5 w-2.5 rounded-full bg-warning" />
            <div className="h-2.5 w-2.5 rounded-full bg-accent-500" />
          </div>
          <span className="text-xs font-medium text-text-tertiary mr-3">
            {examTitle}
          </span>

          {/* Toolbar buttons */}
          <div className="flex items-center gap-0.5 border-r border-border pr-2 mr-2">
            {canUse('FILE_EXPLORER') && (
              <button
                onClick={toggleExplorer}
                className={cn(
                  'rounded-md p-1 transition-colors',
                  showExplorer
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-text-tertiary hover:bg-surface-tertiary hover:text-text-primary',
                )}
                title="Toggle File Explorer"
              >
                <PanelLeft className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              onClick={toggleContextPanel}
              className={cn(
                'rounded-md p-1 transition-colors',
                showContextPanel
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-text-tertiary hover:bg-surface-tertiary hover:text-text-primary',
              )}
              title="Toggle context panel"
            >
              <PanelRight className="h-3.5 w-3.5" />
            </button>
            {canUse('TERMINAL') && (
              <button
                onClick={toggleTerminal}
                className={cn(
                  'rounded-md p-1 transition-colors',
                  showTerminal
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-text-tertiary hover:bg-surface-tertiary hover:text-text-primary',
                )}
                title="Toggle Terminal"
              >
                <TerminalIcon className="h-3.5 w-3.5" />
              </button>
            )}
            {canUse('BROWSER_PREVIEW') && (
              <button
                onClick={toggleBrowser}
                className={cn(
                  'rounded-md p-1 transition-colors',
                  showBrowser
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-text-tertiary hover:bg-surface-tertiary hover:text-text-primary',
                )}
                title="Toggle Browser Preview"
              >
                <Globe className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {!readOnly && (
            <>
              <button
                onClick={() => {
                  setCreateTargetDir(selectedDir ?? '/');
                  setShowNewFileInput(true);
                  setShowNewFolderInput(false);
                }}
                className="rounded-md p-1 text-text-tertiary hover:bg-surface-tertiary hover:text-text-primary transition-colors"
                title={selectedDir ? `New File (in ${selectedDir})` : 'New File (in root)'}
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => {
                  setCreateTargetDir(selectedDir ?? '/');
                  setShowNewFolderInput(true);
                  setShowNewFileInput(false);
                }}
                className="rounded-md p-1 text-text-tertiary hover:bg-surface-tertiary hover:text-text-primary transition-colors"
                title={selectedDir ? `New Folder (in ${selectedDir})` : 'New Folder (in root)'}
              >
                <FolderPlus className="h-3.5 w-3.5" />
              </button>
              {canUse('FILE_UPLOAD') && (
                <>
                  <button
                    onClick={() => {
                      setCreateTargetDir(selectedDir ?? '/');
                      fileInputRef.current?.click();
                    }}
                    className="rounded-md p-1 text-text-tertiary hover:bg-surface-tertiary hover:text-text-primary transition-colors"
                    title={selectedDir ? `Upload Files (to ${selectedDir})` : 'Upload Files (to root)'}
                  >
                    <Upload className="h-3.5 w-3.5" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleUpload}
                  />
                </>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={downloadProject}
            className="rounded-md p-1 text-text-tertiary hover:bg-surface-tertiary hover:text-text-primary transition-colors"
            title="Export Workspace"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
          {!readOnly && (
            <button
              onClick={resetWorkspace}
              className="rounded-md p-1 text-text-tertiary hover:bg-surface-tertiary hover:text-text-primary transition-colors"
              title="Reset Workspace"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Main Content ─────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* File Explorer */}
        <AnimatePresence>
          {canUse('FILE_EXPLORER') && showExplorer && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 240, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="flex shrink-0 flex-col border-r border-border bg-surface-secondary overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-border px-3 py-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
                  Explorer
                </span>
                <span className="text-[10px] text-text-tertiary">{treeData.length} items</span>
              </div>

              {/* Stage guidance banner */}
              {sectionType && (
                <div className="mx-2 mt-2 rounded-lg border border-primary-100 bg-primary-50 px-2.5 py-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-primary-700">
                    {projectMode ? 'Project workspace' : `Stage: ${sectionType.replace(/_/g, ' ')}`}
                  </p>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-text-secondary">
                    {projectMode
                      ? `This section is saved under ${PROJECT_SECTION_HINTS[sectionType] ?? 'its project folder'}. Build your whole system here — the exam uses this workspace for every section.`
                      : STAGE_HINTS[sectionType] ?? 'Create folders and files to save your designs.'}
                  </p>
                </div>
              )}

              {/* New file/folder inputs */}
              <div className="px-2 py-1 space-y-1">
                {(showNewFileInput || showNewFolderInput) && createTargetDir !== '/' && (
                  <div
                    className="flex items-center gap-1 px-2 text-[10px] text-text-tertiary"
                    style={{ paddingLeft: '14px' }}
                  >
                    <FolderOpen className="h-3 w-3 shrink-0 text-warning" />
                    <span className="truncate">creating in {createTargetDir}</span>
                  </div>
                )}
                {showNewFileInput && (
                  <div className="flex items-center gap-1 px-2" style={{ paddingLeft: '14px' }}>
                    <File className="h-3 w-3 shrink-0 text-text-tertiary" />
                    <input
                      autoFocus
                      value={newFileName}
                      onChange={(e) => setNewFileName(e.target.value)}
                      onBlur={() => {
                        if (!newFileName.trim()) setShowNewFileInput(false);
                        else createNewFile(newFileName, createTargetDir);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') createNewFile(newFileName, createTargetDir);
                        if (e.key === 'Escape') {
                          setShowNewFileInput(false);
                          setNewFileName('');
                        }
                      }}
                      placeholder={createTargetDir === '/' ? 'filename.ext' : 'name or nested/path'}
                      title="Enter a filename (e.g. index.js) or a nested path (e.g. src/utils/helper.js)"
                      className="flex-1 rounded border border-primary-300 bg-white px-1.5 py-0.5 text-xs text-text-primary outline-none"
                    />
                  </div>
                )}
                {showNewFolderInput && (
                  <div className="flex items-center gap-1 px-2" style={{ paddingLeft: '14px' }}>
                    <Folder className="h-3 w-3 shrink-0 text-warning" />
                    <input
                      autoFocus
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      onBlur={() => {
                        if (!newFolderName.trim()) setShowNewFolderInput(false);
                        else createNewFolder(newFolderName, createTargetDir);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') createNewFolder(newFolderName, createTargetDir);
                        if (e.key === 'Escape') {
                          setShowNewFolderInput(false);
                          setNewFolderName('');
                        }
                      }}
                      placeholder={createTargetDir === '/' ? 'folder-name' : 'name or nested/path'}
                      title="Enter a folder name or a nested path (e.g. src/components/ui)"
                      className="flex-1 rounded border border-primary-300 bg-white px-1.5 py-0.5 text-xs text-text-primary outline-none"
                    />
                  </div>
                )}
              </div>

              {/* File Tree */}
              <div className="flex-1 overflow-y-auto py-1">
                {treeData.map((node) => renderTreeNode(node, 0))}
                {treeData.length === 0 && (
                  <div className="flex flex-col items-center py-8 text-text-tertiary">
                    <FileSearch className="h-8 w-8 mb-2" />
                    <p className="text-xs">Empty workspace</p>
                    <p className="text-[10px]">Create a file to get started</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Panel */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Tabs */}
          <div className="flex items-center border-b border-border bg-surface-secondary">
            {canUse('DIAGRAM_EDITOR') && (
              <TabButton
                active={activeTab === 'diagram'}
                icon={<Network className="h-3.5 w-3.5" />}
                label="Diagram"
                onClick={() => setActiveTab('diagram')}
                highlighted={highlightedTools.includes('DIAGRAM_EDITOR')}
                hasContext={selectedFile !== null || selectedDir !== null}
              />
            )}
            {canUse('CODE_EDITOR') && (
              <TabButton
                active={activeTab === 'editor'}
                icon={<Code2 className="h-3.5 w-3.5" />}
                label="Editor"
                onClick={() => setActiveTab('editor')}
                highlighted={highlightedTools.includes('CODE_EDITOR')}
                hasContext={selectedFile !== null || selectedDir !== null}
              />
            )}
            {canUse('TERMINAL') && (
              <TabButton
                active={activeTab === 'terminal'}
                icon={<TerminalIcon className="h-3.5 w-3.5" />}
                label="Terminal"
                onClick={() => setActiveTab('terminal')}
                badge={showTerminal ? undefined : 'hidden'}
                highlighted={highlightedTools.includes('TERMINAL')}
                hasContext={selectedFile !== null || selectedDir !== null}
              />
            )}
            {canUse('BROWSER_PREVIEW') && (
              <TabButton
                active={activeTab === 'browser'}
                icon={<Globe className="h-3.5 w-3.5" />}
                label="Browser"
                onClick={() => setActiveTab('browser')}
                badge={showBrowser ? undefined : 'hidden'}
                highlighted={highlightedTools.includes('BROWSER_PREVIEW')}
                hasContext={selectedFile !== null || selectedDir !== null}
              />
            )}
            {canUse('DATABASE') && (
              <TabButton
                active={activeTab === 'database'}
                icon={<Database className="h-3.5 w-3.5" />}
                label="Database"
                onClick={() => setActiveTab('database')}
                highlighted={highlightedTools.includes('DATABASE')}
                hasContext={selectedFile !== null || selectedDir !== null}
              />
            )}

            {/* Candidate tools picker — choose which provisioned tools to use.
                Every tool set by the platform owner is on by default; the
                candidate can turn any of them off (or back on). */}
            {!readOnly && (
              <div className="relative ml-auto mr-1">
                <button
                  onClick={() => setToolsMenuOpen((o) => !o)}
                  className={cn(
                    'flex items-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors',
                    toolsMenuOpen
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-text-secondary hover:bg-surface-tertiary hover:text-text-primary',
                  )}
                  title="Choose which workspace tools to use"
                >
                  <Settings2 className="h-3.5 w-3.5" />
                  Tools
                  <span className="rounded-full bg-primary-100 px-1.5 text-[10px] font-semibold text-primary-700">
                    {enabledTools.length}/{configuredTools.length}
                  </span>
                </button>
                {toolsMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setToolsMenuOpen(false)} />
                    <div className="absolute right-0 top-full z-30 mt-1 w-72 rounded-xl border border-border bg-white p-2 shadow-modal">
                      <p className="px-2 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
                        Workspace tools
                      </p>
                      {configuredTools.map((toolId) => {
                        const def = WORKSPACE_TOOLS.find((t) => t.id === toolId);
                        if (!def) return null;
                        const on = enabledTools.includes(toolId);
                        const locked = lockedTools.includes(toolId);
                        const Icon = def.icon;
                        return (
                          <button
                            key={toolId}
                            onClick={() => toggleTool(toolId)}
                            disabled={locked}
                            title={locked ? `${def.label} — locked by the exam owner` : undefined}
                            className={cn(
                              'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors',
                              on ? 'bg-primary-50' : 'hover:bg-surface-tertiary',
                              locked && 'cursor-not-allowed opacity-90',
                            )}
                          >
                            <span
                              className={cn(
                                'flex h-6 w-6 shrink-0 items-center justify-center rounded-md',
                                on ? 'bg-primary-600 text-white' : 'bg-surface-tertiary text-text-tertiary',
                              )}
                            >
                              <Icon className="h-3.5 w-3.5" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-xs font-medium text-text-primary">{def.label}</span>
                              <span className="block truncate text-[10px] text-text-tertiary">
                                {locked ? 'Locked by the exam owner' : def.description}
                              </span>
                            </span>
                            <span
                              className={cn(
                                'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                                on ? 'border-primary-600 bg-primary-600' : 'border-text-tertiary/40',
                              )}
                            >
                              {locked ? (
                                <Lock className="h-2.5 w-2.5 text-white" />
                              ) : on ? (
                                <Check className="h-2.5 w-2.5 text-white" />
                              ) : null}
                            </span>
                          </button>
                        );
                      })}
                      <div className="mt-1 flex items-center justify-between gap-2 border-t border-border px-2 pt-1.5">
                        <p className="text-[10px] text-text-tertiary">
                          On by default — set by the exam owner.
                        </p>
                        <button
                          onClick={resetTools}
                          className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-primary-700 transition-colors hover:bg-primary-50"
                        >
                          <RotateCcw className="h-3 w-3" /> Reset
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'diagram' && canUse('DIAGRAM_EDITOR') && (
              <div className="flex h-full flex-col overflow-hidden">
                {/* Sub-diagram tab bar — a section can ask for several
                    diagrams (e.g. an ERD and a DFD), each on its own canvas.
                    On non-design sections the candidate starts from an empty
                    canvas set and picks a diagram type per their trade. */}
                <div
                  role="tablist"
                  aria-label="Diagram canvases"
                  className="flex items-center gap-1.5 overflow-x-auto border-b border-border bg-surface-secondary px-2 py-1.5"
                >
                  {diagramTabs.map((tab) => {
                    const active = activeDiagramId === tab.id;
                    return (
                      <div
                        key={tab.id}
                        className={cn(
                          'flex items-center overflow-hidden rounded-md border shadow-sm transition-colors',
                          active
                            ? 'border-primary-300 bg-white'
                            : 'border-border bg-surface-secondary/60 hover:border-primary-200',
                        )}
                      >
                        <button
                          role="tab"
                          aria-selected={active}
                          onClick={() => setActiveDiagramId(tab.id)}
                          title={`${DIAGRAM_TYPE_LABELS[tab.diagramType]} diagram`}
                          className={cn(
                            'flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium transition-colors',
                            active
                              ? 'text-primary-700'
                              : 'text-text-tertiary hover:text-text-primary',
                          )}
                        >
                          <span
                            className={cn(
                              'h-1.5 w-1.5 rounded-full',
                              active ? 'bg-primary-500' : 'bg-text-tertiary/40',
                            )}
                          />
                          {DIAGRAM_TYPE_LABELS[tab.diagramType]}
                          {tab.filePath !== primaryFilePath && (
                            <span className="ml-1 text-[9px] font-normal text-text-tertiary">
                              {tab.filePath.split('/').pop()}
                            </span>
                          )}
                        </button>
                        {!readOnly && tab.filePath !== primaryFilePath && (
                          <button
                            onClick={() => removeDiagramTab(tab.id)}
                            title="Remove this diagram"
                            className="px-1.5 py-1 text-text-tertiary transition-colors hover:bg-red-50 hover:text-error"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {!readOnly && (
                    <AddDiagramMenu
                      onAdd={addDiagramTab}
                      types={availableDiagramTypes}
                      tradeLabel={tradeName}
                    />
                  )}
                  {selectedDir && canUse('DIAGRAM_EDITOR') && (
                    <span
                      className="ml-1 flex shrink-0 items-center gap-1 rounded-md bg-primary-50 px-2 py-1 text-[10px] font-medium text-primary-700"
                      title="New diagrams are saved into the selected folder"
                    >
                      <FolderOpen className="h-3 w-3" />
                      saving to {selectedDir}
                    </span>
                  )}
                </div>

                {/* Canvases — all kept mounted so each diagram keeps its undo
                    history; only the active one is visible. */}
                <div className="relative flex-1 overflow-hidden">
                  {diagramTabs.map((tab) => (
                    <div
                      key={tab.id}
                      className={cn(
                        'h-full overflow-auto bg-surface-secondary p-3',
                        activeDiagramId !== tab.id && 'hidden',
                      )}
                    >
                      <DiagramWorkspace
                        value={tab.elements}
                        onChange={(els) => handleDiagramChange(tab.id, els)}
                        readOnly={readOnly}
                        diagramType={tab.diagramType}
                        // Stable per-canvas key — the autosave draft is found
                        // again after a page reload because file paths persist.
                        draftKey={tab.filePath}
                        // Mirror library changes into saved-designs/ so they are
                        // submitted with the answer and visible to assessors.
                        onSavedDesignsChange={syncSavedDesignsToWorkspace}
                      />
                    </div>
                  ))}
                  {diagramTabs.length === 0 && (
                    designDiagramType ? (
                      <div className="flex h-full items-center justify-center text-xs text-text-tertiary">
                        Loading diagram…
                      </div>
                    ) : (
                      // Non-design section — no canvas exists yet. Let the
                      // candidate pick a diagram type (filtered by their trade)
                      // to start drawing; extra canvases can be added later via
                      // the "Add diagram" menu.
                      <DiagramTypeChooser
                        types={availableDiagramTypes}
                        tradeLabel={tradeName}
                        onPick={(type) => {
                          if (!readOnly) addDiagramTab(type);
                        }}
                        readOnly={readOnly}
                      />
                    )
                  )}
                </div>
              </div>
            )}

            {activeTab === 'editor' && canUse('CODE_EDITOR') && (
              <div className="flex h-full flex-col">
                {/* File header */}
                {selectedNode && (
                  <div className="flex items-center justify-between border-b border-border bg-surface-secondary px-3 py-1">
                    <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                      <FileIcon fileName={selectedNode.name} />
                      <span>{selectedNode.name}</span>
                      <span className="text-text-tertiary ml-2">
                        {selectedNode.language}
                      </span>
                    </div>
                    <span className="text-[10px] text-text-tertiary">
                      {(editorContent.length / 1024).toFixed(1)} KB
                    </span>
                  </div>
                )}

                {/* Code Editor */}
                <div className="flex-1 overflow-hidden">
                  {selectedFile && selectedNode && selectedNode.type === 'file' ? (
                    <textarea
                      value={editorContent}
                      onChange={(e) => handleEditorChange(e.target.value)}
                      readOnly={readOnly}
                      className="h-full w-full resize-none border-0 bg-white px-4 py-3 font-mono text-sm leading-6 text-text-primary placeholder:text-text-tertiary/50 focus:outline-none"
                      placeholder="Start coding..."
                      spellCheck={false}
                      style={{ tabSize: 2 }}
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center text-text-tertiary">
                      <Code2 className="h-12 w-12 mb-3 text-text-tertiary/30" />
                      <p className="text-sm">Select a file to edit</p>
                      <p className="text-xs mt-1">
                        Use the Explorer to browse files
                      </p>
                    </div>
                  )}
                </div>

                {/* Status bar */}
                {selectedFile && (
                  <div className="flex items-center justify-between border-t border-border bg-surface-secondary px-3 py-1 text-[10px] text-text-tertiary">
                    <div className="flex items-center gap-3">
                      <span>{selectedNode?.language || 'plaintext'}</span>
                      <span>UTF-8</span>
                      <span>LF</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span>Ln 1, Col 1</span>
                      <span>
                        {(editorContent.length / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'terminal' && canUse('TERMINAL') && (
              <WorkspaceTerminal
                sessionId={sessionId ?? null}
                fs={fs}
                readOnly={readOnly}
                // The shell starts inside the selected folder (e.g. database/)
                // so the terminal works where the candidate is working.
                cwd={saveFolderForSelection(contextSelection, '')}
              />
            )}

            {activeTab === 'browser' && canUse('BROWSER_PREVIEW') && (
              <div className="flex h-full flex-col bg-white">
                {/* URL bar */}
                <div className="flex items-center gap-2 border-b border-border bg-surface-secondary px-3 py-2">
                  <div className="flex items-center gap-1 flex-1 rounded-md border border-border bg-white px-3 py-1.5 text-xs">
                    <Globe className="h-3.5 w-3.5 text-text-tertiary shrink-0" />
                    <input
                      value={browserInputValue}
                      onChange={(e) => setBrowserInputValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') setBrowserUrl(browserInputValue);
                      }}
                      className="flex-1 border-0 bg-transparent text-text-primary text-xs outline-none"
                    />
                    <button
                      onClick={() => setBrowserUrl(browserInputValue)}
                      className="rounded bg-primary-100 px-2 py-0.5 text-[10px] font-medium text-primary-700 hover:bg-primary-200 transition-colors"
                    >
                      Go
                    </button>
                  </div>
                  <a
                    href={browserUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md p-1.5 text-text-tertiary hover:bg-surface-tertiary hover:text-text-primary transition-colors"
                    title="Open in new tab"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>

                {/* Server status bar */}
                {sessionId && (
                  <div className="flex items-center justify-between border-b border-border bg-surface-secondary px-3 py-1.5">
                    <div className="flex items-center gap-2 text-[11px]">
                      <Server className="h-3.5 w-3.5 text-text-tertiary" />
                      {serverStatus === 'checking' && (
                        <span className="flex items-center gap-1.5 text-text-tertiary">
                          <Loader2 className="h-3 w-3 animate-spin" /> Checking server...
                        </span>
                      )}
                      {serverStatus === 'running' && (
                        <span className="flex items-center gap-1.5 text-accent-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-accent-500 animate-pulse" />
                          Dev server running{serverPort ? ` on port ${serverPort}` : ''}
                        </span>
                      )}
                      {serverStatus === 'starting' && (
                        <span className="flex items-center gap-1.5 text-warning">
                          <Loader2 className="h-3 w-3 animate-spin" /> Starting dev server...
                        </span>
                      )}
                      {serverStatus === 'stopped' && (
                        <span className="flex items-center gap-1.5 text-text-tertiary">
                          <span className="h-1.5 w-1.5 rounded-full bg-text-tertiary" />
                          Dev server stopped
                        </span>
                      )}
                      {serverStatus === 'error' && (
                        <span className="flex items-center gap-1.5 text-error">
                          <AlertCircle className="h-3 w-3" /> Cannot reach server
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {serverStatus !== 'running' && serverStatus !== 'starting' && (
                        <button
                          onClick={handleStartServer}
                          className="flex items-center gap-1 rounded-md bg-primary-600 px-2 py-1 text-[10px] font-medium text-white hover:bg-primary-700 transition-colors"
                          title="Start npm start in the backend folder"
                        >
                          <Play className="h-3 w-3" /> Start Server
                        </button>
                      )}
                      {serverStatus === 'running' && (
                        <button
                          onClick={handleStopServer}
                          className="flex items-center gap-1 rounded-md bg-surface-tertiary px-2 py-1 text-[10px] font-medium text-text-secondary hover:bg-red-50 hover:text-error transition-colors"
                          title="Stop the dev server"
                        >
                          <Square className="h-3 w-3" /> Stop
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Browser iframe */}
                <div className="relative flex-1 bg-white">
                  {sessionId && (serverStatus === 'checking' || serverStatus === 'stopped') && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-surface-secondary p-6 text-center">
                      {serverStatus === 'checking' ? (
                        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
                      ) : (
                        <Power className="h-10 w-10 text-text-tertiary" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-text-primary">
                          {serverStatus === 'checking'
                            ? 'Checking dev server...'
                            : 'Start the dev server to preview your app'}
                        </p>
                        {serverStatus === 'stopped' && (
                          <p className="mt-1 text-xs text-text-tertiary">
                            Open the Terminal tab and run{' '}
                            <code className="rounded bg-surface-tertiary px-1.5 py-0.5 font-mono text-[10px]">cd backend && npm start</code>
                          </p>
                        )}
                      </div>
                      {serverStatus === 'stopped' && (
                        <button
                          onClick={handleStartServer}
                          className="flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-xs font-medium text-white hover:bg-primary-700 transition-colors"
                        >
                          <Play className="h-3.5 w-3.5" /> Start Server
                        </button>
                      )}
                    </div>
                  )}
                  <iframe
                    src={browserUrl}
                    className="h-full w-full border-0"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
                    title="Browser Preview"
                  />
                </div>

                {/* Info bar */}
                <div className="border-t border-border bg-surface-secondary px-3 py-1.5 text-[10px] text-text-tertiary flex items-center gap-2">
                  <AlertCircle className="h-3 w-3" />
                  <span>
                    {sessionId
                      ? 'Preview proxies your local dev server into this tab — no need to minimize or open a new tab.'
                      : 'Browser preview may not work for all URLs due to sandbox restrictions.'}
                  </span>
                </div>
              </div>
            )}

            {activeTab === 'database' && canUse('DATABASE') && (
              <div className="flex h-full flex-col bg-white">
                {/* MySQL status bar */}
                <div className="flex items-center justify-between border-b border-border bg-surface-secondary px-3 py-1.5">
                  <div className="flex items-center gap-2 text-[11px]">
                    <Database className="h-3.5 w-3.5 text-text-tertiary" />
                    {mysqlStatus === 'checking' && (
                      <span className="flex items-center gap-1.5 text-text-tertiary">
                        <Loader2 className="h-3 w-3 animate-spin" /> Checking MySQL...
                      </span>
                    )}
                    {mysqlStatus === 'connected' && (
                      <span className="flex items-center gap-1.5 text-accent-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-accent-500 animate-pulse" />
                        MySQL connected{mysqlVersion ? ` · ${mysqlVersion}` : ''}
                      </span>
                    )}
                    {mysqlStatus === 'offline' && (
                      <span className="flex items-center gap-1.5 text-warning">
                        <AlertCircle className="h-3 w-3" />
                        MySQL offline{mysqlEndpoint ? ` (${mysqlEndpoint})` : ''}
                      </span>
                    )}
                    {mysqlStatus === 'error' && (
                      <span className="flex items-center gap-1.5 text-error">
                        <AlertCircle className="h-3 w-3" /> Cannot check MySQL
                      </span>
                    )}
                  </div>
                  <button
                    onClick={refreshMysqlStatus}
                    className="rounded-md p-1 text-text-tertiary hover:bg-surface-tertiary hover:text-text-primary transition-colors"
                    title="Refresh MySQL status"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* MySQL error detail — the backend reports the real cause
                    (server down vs access denied vs plugin missing) */}
                {mysqlError && (
                  <div className="border-b border-border bg-red-50 px-3 py-1.5 text-[10px] leading-relaxed text-error">
                    <span className="font-medium">MySQL reason:</span> {mysqlError}
                    <span className="ml-1 text-text-tertiary">
                      — start MariaDB with <code className="rounded bg-surface-tertiary px-1 py-0.5 font-mono">npm run db:mysql:start</code> (backend/)
                    </span>
                  </div>
                )}

                {/* SQL console */}
                <div className="flex flex-1 flex-col overflow-hidden">
                  <div className="flex items-center gap-1.5 border-b border-border bg-surface-secondary px-3 py-1.5">
                    <TerminalSquare className="h-3.5 w-3.5 text-text-tertiary" />
                    <span className="text-[11px] font-medium text-text-primary">SQL Console</span>
                    <span className="ml-auto flex items-center gap-1.5">
                      <button
                        onClick={() => insertSnippet('CREATE DATABASE IF NOT EXISTS myapp;')}
                        className="rounded-md bg-surface-tertiary px-2 py-0.5 text-[10px] text-text-secondary hover:bg-primary-100 hover:text-primary-700 transition-colors"
                        title="Insert CREATE DATABASE snippet"
                      >
                        Create DB
                      </button>
                      <button
                        onClick={() => insertSnippet('CREATE TABLE IF NOT EXISTS users (\n  id INT AUTO_INCREMENT PRIMARY KEY,\n  name VARCHAR(100) NOT NULL,\n  email VARCHAR(150) NOT NULL UNIQUE\n);')}
                        className="rounded-md bg-surface-tertiary px-2 py-0.5 text-[10px] text-text-secondary hover:bg-primary-100 hover:text-primary-700 transition-colors"
                        title="Insert CREATE TABLE snippet"
                      >
                        Create Table
                      </button>
                      <button
                        onClick={() => insertSnippet('SHOW TABLES;')}
                        className="rounded-md bg-surface-tertiary px-2 py-0.5 text-[10px] text-text-secondary hover:bg-primary-100 hover:text-primary-700 transition-colors"
                        title="Insert SHOW TABLES"
                      >
                        Show Tables
                      </button>
                      <button
                        onClick={() => setShowSqlSave((p) => !p)}
                        className="flex items-center gap-1 rounded-md bg-surface-tertiary px-2 py-0.5 text-[10px] text-text-secondary hover:bg-primary-100 hover:text-primary-700 transition-colors"
                        title="Save this script into the selected folder"
                      >
                        <Save className="h-3 w-3" />
                        Save script
                      </button>
                    </span>
                  </div>

                  {/* Save script row — saves the input as a .sql file in the
                      folder the candidate is working in (selected folder, else
                      db/ or database/sql/). */}
                  {showSqlSave && (
                    <div className="flex items-center gap-1.5 border-b border-border bg-surface-secondary px-3 py-1.5">
                      <Save className="h-3 w-3 shrink-0 text-text-tertiary" />
                      <input
                        value={sqlScriptName}
                        onChange={(e) => setSqlScriptName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveSqlScript();
                        }}
                        placeholder="schema.sql"
                        title="Script filename"
                        className="w-36 rounded border border-primary-300 bg-white px-1.5 py-0.5 font-mono text-[10px] text-text-primary outline-none"
                      />
                      <span className="text-[10px] text-text-tertiary">
                        into{' '}
                        {saveFolderForSelection(
                          contextSelection,
                          projectMode ? 'database/sql' : 'db',
                        ) || '/'}
                      </span>
                      <button
                        onClick={saveSqlScript}
                        disabled={!sqlInput.trim()}
                        className="ml-auto rounded-md bg-primary-600 px-2.5 py-0.5 text-[10px] font-medium text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
                      >
                        Save
                      </button>
                    </div>
                  )}

                  {/* SQL input */}
                  <div className="border-b border-border p-2">
                    <textarea
                      value={sqlInput}
                      onChange={(e) => setSqlInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                          runSql();
                        }
                      }}
                      placeholder="Type SQL here… e.g.  CREATE DATABASE myapp;  (Ctrl/Cmd + Enter to run)"
                      spellCheck={false}
                      className="h-24 w-full resize-none rounded-md border border-border bg-surface-secondary px-3 py-2 font-mono text-xs leading-5 text-text-primary placeholder:text-text-tertiary/50 focus:border-primary-400 focus:outline-none"
                    />
                  <div className="mt-1.5 flex items-center justify-between">
                      <span className="text-[10px] text-text-tertiary">
                        Connections use the host XAMPP MariaDB{mysqlEndpoint ? ` at ${mysqlEndpoint}` : ''} (see db/README.md in the explorer)
                      </span>
                      <button
                        onClick={runSql}
                        disabled={sqlRunning || !sqlInput.trim() || mysqlStatus !== 'connected'}
                        className="flex items-center gap-1.5 rounded-md bg-primary-600 px-3 py-1 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
                      >
                        {sqlRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                        Run SQL
                      </button>
                    </div>
                  </div>

                  {/* Results */}
                  <div className="flex-1 overflow-auto p-3">
                    {sqlError && (
                      <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-error">
                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <pre className="whitespace-pre-wrap font-mono">{sqlError}</pre>
                      </div>
                    )}
                    {!sqlError && sqlResult && sqlResult.type === 'OK' && (
                      <div className="flex items-center gap-2 rounded-lg border border-accent-200 bg-accent-50 px-3 py-2 text-xs text-accent-700">
                        <Check className="h-3.5 w-3.5" />
                        Query OK
                        {sqlResult.affectedRows !== undefined && ` — ${sqlResult.affectedRows} row(s) affected`}
                        {sqlResult.message ? ` · ${sqlResult.message}` : ''}
                      </div>
                    )}
                    {!sqlError && sqlResult && sqlResult.type === 'SELECT' && (
                      <div className="overflow-hidden rounded-lg border border-border">
                        <div className="flex items-center justify-between border-b border-border bg-surface-secondary px-3 py-1.5 text-[10px] text-text-tertiary">
                          <span className="flex items-center gap-1.5">
                            <Table2 className="h-3 w-3" />
                            {sqlResult.rowCount ?? sqlResult.rows?.length ?? 0} row(s)
                          </span>
                          <span>{sqlResult.columns?.length ?? 0} column(s)</span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="bg-surface-secondary text-text-secondary">
                                {(sqlResult.columns ?? []).map((col) => (
                                  <th key={col} className="whitespace-nowrap px-3 py-1.5 font-medium border-b border-border">
                                    {col}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {(sqlResult.rows ?? []).map((row, i) => (
                                <tr key={i} className="odd:bg-white even:bg-surface-secondary/40">
                                  {(sqlResult.columns ?? []).map((col) => (
                                    <td key={col} className="whitespace-nowrap px-3 py-1.5 font-mono text-text-primary">
                                      {String(row[col] ?? 'NULL')}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                    {!sqlError && !sqlResult && !sqlRunning && (
                      <div className="flex h-full min-h-[120px] flex-col items-center justify-center text-text-tertiary">
                        <Database className="h-8 w-8 mb-2 text-text-tertiary/30" />
                        <p className="text-xs">Run a query to create databases and tables</p>
                        <p className="text-[10px] mt-1">Try the snippets above, or the db/schema.sql starter file</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recommended-tools sidebar — a persistent panel showing which tools
            fit the selected file/folder (with a short reason), and which
            enabled tools are still available. Stays visible even without a
            selection so candidates always know what they can use. */}
        <AnimatePresence>
          {showContextPanel && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 240, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="flex shrink-0 flex-col border-l border-border bg-surface-secondary overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-border px-3 py-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
                  Context
                </span>
                <button
                  onClick={toggleContextPanel}
                  className="rounded-md p-1 text-text-tertiary hover:bg-surface-tertiary hover:text-text-primary transition-colors"
                  title="Hide context panel"
                >
                  <PanelRight className="h-3 w-3" />
                </button>
              </div>

              {/* Selected node summary */}
              {contextNode ? (
                <div className="border-b border-border px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    {contextNode.type === 'directory' ? (
                      <Folder className="h-3.5 w-3.5 shrink-0 text-warning" />
                    ) : (
                      <FileCode className="h-3.5 w-3.5 shrink-0 text-text-secondary" />
                    )}
                    <span className="truncate text-xs font-medium text-text-primary">
                      {contextNode.name}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-[10px] text-text-tertiary" title={contextNode.path}>
                    {contextNode.path}
                  </p>
                  {contextNode.type === 'directory' && (
                    <>
                      <p className="mt-0.5 text-[10px] text-text-secondary">
                        {contextDirFileCount} file(s) inside
                      </p>
                      <p className="mt-0.5 text-[10px] text-accent-700">
                        Tools save their work into this folder
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <div className="border-b border-border px-3 py-3">
                  <p className="text-[11px] font-medium text-text-primary">No selection</p>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-text-tertiary">
                    Select a file or folder in the Explorer to see which tools fit it.
                  </p>
                </div>
              )}

              {/* Tool list — recommended on top, the rest dimmed below */}
              <div className="flex-1 overflow-y-auto px-2 py-2">
                {toolRecommendations.length > 0 && (
                  <>
                    <p className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-accent-700">
                      Recommended
                    </p>
                    <div className="space-y-1">
                      {toolRecommendations.map(({ tool, reason }) => {
                        const def = WORKSPACE_TOOLS.find((t) => t.id === tool);
                        if (!def) return null;
                        const Icon = def.icon;
                        return (
                          <div
                            key={tool}
                            className="rounded-lg border border-accent-200 bg-accent-50/70 px-2.5 py-1.5"
                          >
                            <div className="flex items-center gap-1.5">
                              <Icon className="h-3.5 w-3.5 shrink-0 text-accent-700" />
                              <span className="text-xs font-medium text-accent-700">{def.label}</span>
                              <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent-500 animate-pulse" />
                            </div>
                            <p className="mt-0.5 text-[10px] leading-relaxed text-text-secondary">
                              {reason}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* Other enabled tools not recommended for this selection */}
                {availableTools.length > 0 && (
                  <>
                    <p className="px-1 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
                      Available
                    </p>
                    <div className="space-y-1">
                      {availableTools.map((tool) => {
                        const def = WORKSPACE_TOOLS.find((t) => t.id === tool);
                        if (!def) return null;
                        const Icon = def.icon;
                        return (
                          <div
                            key={tool}
                            className="flex items-center gap-2 rounded-md px-2 py-1 opacity-60"
                          >
                            <Icon className="h-3.5 w-3.5 shrink-0 text-text-tertiary" />
                            <span className="text-xs text-text-secondary">{def.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Context Menu ──────────────────────────── */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 w-44 rounded-lg border border-border bg-white py-1 shadow-elevation-medium"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <ContextMenuItem
            icon={<Plus className="h-3.5 w-3.5" />}
            label="New File"
            onClick={() => {
              const node = fs.findNode(contextMenu.path);
              const dir = node?.type === 'directory' ? node.path : getParentDirOf(contextMenu.path);
              setCreateTargetDir(dir);
              setShowNewFileInput(true);
              setShowNewFolderInput(false);
              setNewFileName('');
              setContextMenu(null);
            }}
          />
          <ContextMenuItem
            icon={<FolderPlus className="h-3.5 w-3.5" />}
            label="New Folder"
            onClick={() => {
              const node = fs.findNode(contextMenu.path);
              const dir = node?.type === 'directory' ? node.path : getParentDirOf(contextMenu.path);
              setCreateTargetDir(dir);
              setShowNewFolderInput(true);
              setShowNewFileInput(false);
              setNewFolderName('');
              setContextMenu(null);
            }}
          />
          <div className="my-1 border-t border-border" />
          <ContextMenuItem
            icon={<Edit3 className="h-3.5 w-3.5" />}
            label="Rename"
            onClick={() => startRename(contextMenu.path)}
          />
          <ContextMenuItem
            icon={<Trash2 className="h-3.5 w-3.5" />}
            label="Delete"
            onClick={() => deleteNode(contextMenu.path)}
            danger
          />
        </div>
      )}

      {/* ── Notification ──────────────────────────── */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={cn(
              'fixed bottom-6 right-6 z-50 rounded-xl px-4 py-2.5 text-sm shadow-elevation-medium',
              notification.type === 'success' && 'bg-accent-50 text-accent-800 border border-accent-200',
              notification.type === 'error' && 'bg-red-50 text-red-800 border border-red-200',
              notification.type === 'info' && 'bg-primary-50 text-primary-800 border border-primary-200',
            )}
          >
            <div className="flex items-center gap-2">
              {notification.type === 'success' && <Check className="h-4 w-4" />}
              {notification.type === 'error' && <AlertCircle className="h-4 w-4" />}
              {notification.type === 'info' && <FileSearch className="h-4 w-4" />}
              {notification.message}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────

function TabButton({
  active,
  icon,
  label,
  onClick,
  badge,
  highlighted,
  hasContext,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  badge?: string;
  /** Tool is relevant to the currently selected file/folder. */
  highlighted?: boolean;
  /** A file/folder is selected (enables the dim-vs-highlight contrast). */
  hasContext?: boolean;
}) {
  const showHighlight = highlighted && hasContext && !active;
  const showDim = hasContext && !highlighted && !active;
  return (
    <button
      onClick={onClick}
      title={
        showHighlight
          ? `${label} — recommended for this file/folder`
          : undefined
      }
      className={cn(
        'group flex items-center gap-1.5 border-b-2 px-4 py-2 text-xs font-medium transition-colors',
        active
          ? 'border-primary-500 text-primary-700 bg-white'
          : 'border-transparent text-text-tertiary hover:text-text-primary hover:bg-surface-tertiary',
        showHighlight && 'text-primary-600 bg-primary-50/60 hover:bg-primary-50',
        showDim && 'opacity-45',
      )}
    >
      {showHighlight && (
        <span className="h-1.5 w-1.5 rounded-full bg-accent-500 animate-pulse" />
      )}
      {icon}
      {label}
      {badge === 'hidden' && (
        <span className="text-[9px] text-text-tertiary">(off)</span>
      )}
    </button>
  );
}

// ── Diagram type chooser (non-design sections) ─────
// Shown when the Diagram tab is opened on a section without a fixed diagram
// (e.g. a flat MIXED or CODE_WRITING section): the candidate picks what to
// draw from the types their trade actually uses, then a canvas opens.
function DiagramTypeChooser({
  types,
  tradeLabel,
  onPick,
  readOnly,
}: {
  types: DiagramKind[];
  tradeLabel?: string;
  onPick: (type: DiagramKind) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 bg-surface-secondary/60 p-6">
      <Network className="h-10 w-10 text-text-tertiary/30" />
      <div className="text-center">
        <p className="text-sm font-medium text-text-primary">
          What diagram would you like to draw?
        </p>
        <p className="mt-0.5 text-[11px] text-text-tertiary">
          {tradeLabel
            ? `${tradeLabel} diagrams`
            : 'Pick a diagram type to start drawing'}
          {!readOnly && ' — more can be added later'}
        </p>
      </div>
      {!readOnly && (
        <div className="flex max-w-md flex-wrap items-center justify-center gap-2">
          {types.map((type) => (
            <button
              key={type}
              onClick={() => onPick(type)}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2 text-xs font-medium text-text-primary transition-colors hover:border-primary-400 hover:text-primary-700"
            >
              {DIAGRAM_TYPE_ICONS[type]}
              {DIAGRAM_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Sub-diagram picker (Diagram tab) ───────────────
// Offers only the diagram types relevant to the candidate's trade.
function AddDiagramMenu({
  onAdd,
  types,
  tradeLabel,
}: {
  onAdd: (type: DiagramKind) => void;
  types: DiagramKind[];
  tradeLabel?: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [open]);

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((p) => !p);
        }}
        className="flex shrink-0 items-center gap-1 rounded-md border border-dashed border-border px-2.5 py-1.5 text-xs font-medium text-text-tertiary transition-colors hover:border-primary-400 hover:text-primary-700"
        title="Add a diagram canvas (e.g. draw a DFD alongside the ERD, or a fresh canvas on non-design sections)"
      >
        <Plus className="h-3.5 w-3.5" />
        Add diagram
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 w-48 rounded-lg border border-border bg-white py-1 shadow-elevation-medium">
          {tradeLabel && (
            <p className="border-b border-border px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-text-tertiary">
              {tradeLabel} diagrams
            </p>
          )}
          {types.map((type) => (
            <button
              key={type}
              onClick={() => {
                setOpen(false);
                onAdd(type);
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-text-primary transition-colors hover:bg-surface-secondary"
            >
              {DIAGRAM_TYPE_ICONS[type]}
              {DIAGRAM_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ContextMenuItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 px-3 py-1.5 text-xs transition-colors',
        danger
          ? 'text-error hover:bg-red-50'
          : 'text-text-primary hover:bg-surface-secondary',
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function FileIcon({ fileName }: { fileName: string }) {
  const ext = fileName.split('.').pop()?.toLowerCase();
  const name = fileName.toLowerCase();

  if (ext === 'js' || ext === 'jsx' || ext === 'mjs') {
    return <FileCode className="h-3.5 w-3.5 shrink-0 text-yellow-500" />;
  }
  if (ext === 'ts' || ext === 'tsx') {
    return <FileCode className="h-3.5 w-3.5 shrink-0 text-blue-500" />;
  }
  if (ext === 'py') {
    return <FileCode className="h-3.5 w-3.5 shrink-0 text-emerald-500" />;
  }
  if (ext === 'html' || ext === 'htm') {
    return <FileCode className="h-3.5 w-3.5 shrink-0 text-orange-500" />;
  }
  if (ext === 'css' || ext === 'scss' || ext === 'less') {
    return <FileCode className="h-3.5 w-3.5 shrink-0 text-pink-500" />;
  }
  if (ext === 'json') {
    return <FileCode className="h-3.5 w-3.5 shrink-0 text-amber-500" />;
  }
  if (ext === 'md') {
    return <FileText className="h-3.5 w-3.5 shrink-0 text-sky-500" />;
  }
  if (ext === 'sql') {
    return <FileCode className="h-3.5 w-3.5 shrink-0 text-purple-500" />;
  }
  if (name === 'dockerfile') {
    return <FileCode className="h-3.5 w-3.5 shrink-0 text-blue-600" />;
  }
  if (ext === 'sh' || ext === 'bash') {
    return <FileCode className="h-3.5 w-3.5 shrink-0 text-lime-600" />;
  }
  return <File className="h-3.5 w-3.5 shrink-0 text-text-tertiary" />;
}

export default DynamicWorkspace;
