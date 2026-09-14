import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { cn } from '@utils/cn';
import {
  MousePointer2,
  MoveRight,
  Undo2,
  Redo2,
  Trash2,
  Copy,
  ZoomIn,
  ZoomOut,
  Maximize,
  Grid3x3,
  Magnet,
  Download,
  FileJson,
  Image as ImageIcon,
  Eraser,
  Save,
  FolderOpen,
  Clock,
} from 'lucide-react';
import { Modal } from '@components/ui/modal';

// ─────────────────────────────────────────────────────────────────────────
// eDraw Max–style diagram designer
// ─────────────────────────────────────────────────────────────────────────
// A full visual diagram editor for TVET design stages. Palettes cover the
// design diagrams (ERD, DFD, FLOWCHART, UML) plus trade-specific kinds
// (TOPOLOGY, SUBNETTING, STORYBOARD, UI_MOCKUP). Candidates design diagrams
// the same way they would in eDraw Max or draw.io: pick a shape from the
// palette, place it on the canvas, drag to move, drag between shapes to draw
// connectors, double-click to edit text, and use grid/snap/zoom/export tools.
// The drawing is persisted as a plain DiagramElement[] array (the same
// contract as the original editor) so the surrounding workspace (diagram.json
// persistence, backend AI evaluation, dynamic-workspace.tsx and
// assessment-session.tsx integration) is unchanged.

export type DiagramKind =
  | 'ERD'
  | 'DFD'
  | 'FLOWCHART'
  | 'UML'
  | 'TOPOLOGY'
  | 'SUBNETTING'
  | 'STORYBOARD'
  | 'UI_MOCKUP';

export type DiagramElementType =
  | 'box' // entity / external entity / generic process
  | 'weak-entity' // ERD weak entity (double border)
  | 'circle' // DFD process / connector
  | 'diamond' // relationship / decision
  | 'identifying' // ERD identifying relationship (double diamond)
  | 'parallelogram' // I/O
  | 'datastore' // DFD data store (open-ended box)
  | 'terminator' // flowchart start/stop (pill)
  | 'class' // UML class with header band
  | 'note' // comment / sticky note
  | 'text' // plain label
  | 'cloud' // internet / external network (topology, subnetting)
  | 'server' // server rack (topology)
  | 'storyboard-frame' // film frame with a caption strip (storyboard)
  | 'mobile-frame' // phone screen mockup (UI mockup)
  | 'arrow' // connector with arrowhead
  | 'line'; // plain connector

// Cardinality / line-end markers (crow's foot ERD notation).
//   one        — exactly one (single tick)
//   many       — many (crow's foot)
//   zero-one   — zero or one (circle + tick)
//   zero-many  — zero or many (circle + crow's foot)
//   one-many   — one or many (tick + crow's foot)
//   arrow      — plain arrowhead
//   diamond    — hollow diamond (inheritance / identifying)
//   none       — no marker
// A line with lineStyle 'solid' is an identifying relationship in crow's
// foot notation; 'dashed' is a non-identifying relationship.
export type ConnectorMarker =
  | 'none'
  | 'arrow'
  | 'diamond'
  | 'one'
  | 'many'
  | 'zero-one'
  | 'zero-many'
  | 'one-many';

export interface DiagramElement {
  id: string;
  type: DiagramElementType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  color?: string;
  fontSize?: number;
  // Connector attachments: either explicit polyline points, or attached to
  // the center of other elements by id (connector follows element moves).
  points?: Array<{ x: number; y: number }>;
  sourceId?: string;
  targetId?: string;
  // Crow's foot cardinality markers + identifying/non-identifying line style
  sourceMarker?: ConnectorMarker;
  targetMarker?: ConnectorMarker;
  lineStyle?: 'solid' | 'dashed';
  // Slid cardinality marker positions along the connector polyline
  // (0 = source end, 1 = target end). Undefined = default end position.
  sourceMarkerPos?: number;
  targetMarkerPos?: number;
}

interface DiagramWorkspaceProps {
  value: DiagramElement[];
  onChange: (elements: DiagramElement[]) => void;
  readOnly?: boolean;
  diagramType?: DiagramKind;
  // Stable identifier for this canvas (e.g. its diagram file path) so the
  // autosave draft is found again after a page reload. Falls back to the
  // diagram type when not provided.
  draftKey?: string;
  // Fired whenever the browser-local saved-designs library changes (save or
  // delete) — the surrounding workspace syncs the library into the submitted
  // files so assessors can see the saved designs too.
  onSavedDesignsChange?: (designs: SavedDesign[]) => void;
}

// ── Saved designs (personal drafts for future use) ─
// The canvas is always persisted to the workspace file system (diagram.json),
// but candidates may also want to keep a named copy of a design to reuse
// later — e.g. a storyboard or UI mockup sketched in an earlier section.
// Saved designs live in the browser (localStorage) so they survive leaving
// the exam and can be loaded back into any design canvas.
export interface SavedDesign {
  id: string;
  name: string;
  diagramType: DiagramKind;
  elements: DiagramElement[];
  savedAt: number;
}

const SAVED_DESIGNS_KEY = 'savedDiagramDesigns';

export function readSavedDesigns(): SavedDesign[] {
  try {
    const raw = window.localStorage.getItem(SAVED_DESIGNS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedDesign[]) : [];
  } catch {
    return [];
  }
}

function writeSavedDesigns(list: SavedDesign[]) {
  try {
    window.localStorage.setItem(SAVED_DESIGNS_KEY, JSON.stringify(list));
  } catch {
    /* storage unavailable — saving is best-effort */
  }
}

// ── Autosave draft (crash / refresh backup) ────────
// Every few seconds the current canvas is backed up to localStorage under a
// per-canvas key (draftKey defaults to the diagram type). The backup is
// restored automatically when a canvas mounts empty — e.g. the page was
// closed before the workspace file system saved the drawing. Backups are
// skipped in read-only views so an assessor never overwrites a candidate's
// draft.
interface DiagramDraft {
  elements: DiagramElement[];
  savedAt: number;
}

const DRAFT_INTERVAL_MS = 3000;

function draftStorageKey(draftKey: string): string {
  return `diagramDraft:${draftKey}`;
}

function readDiagramDraft(draftKey: string): DiagramDraft | null {
  try {
    const raw = window.localStorage.getItem(draftStorageKey(draftKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.elements)) return null;
    return { elements: parsed.elements as DiagramElement[], savedAt: parsed.savedAt ?? 0 };
  } catch {
    return null;
  }
}

function writeDiagramDraft(draftKey: string, elements: DiagramElement[]): number {
  const savedAt = Date.now();
  try {
    window.localStorage.setItem(
      draftStorageKey(draftKey),
      JSON.stringify({ elements, savedAt } satisfies DiagramDraft),
    );
  } catch {
    /* storage unavailable — autosave is best-effort */
  }
  return savedAt;
}

// ── Canvas geometry ─────────────────────────────────
const CANVAS_W = 2400;
const CANVAS_H = 1600;
const GRID_SIZE = 20;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2;
const MAX_HISTORY = 50;

// ── Per-diagram shape palettes (eDraw Max style) ────
interface PaletteItem {
  key: string;
  label: string;
  variant: 'shape' | 'connector' | 'label';
  makeElement: (x: number, y: number) => DiagramElement;
}

export const ERD_PALETTE: PaletteItem[] = [
  {
    key: 'entity',
    label: 'Entity',
    variant: 'shape',
    makeElement: (x, y) => ({
      id: genId(), type: 'box', x, y, width: 160, height: 70,
      text: 'Entity', color: '#6366f1', fontSize: 13,
    }),
  },
  {
    key: 'weak-entity',
    label: 'Weak Entity',
    variant: 'shape',
    makeElement: (x, y) => ({
      id: genId(), type: 'weak-entity', x, y, width: 160, height: 70,
      text: 'Weak Entity', color: '#6366f1', fontSize: 12,
    }),
  },
  {
    key: 'attribute',
    label: 'Attribute',
    variant: 'shape',
    makeElement: (x, y) => ({
      id: genId(), type: 'circle', x, y, width: 130, height: 62,
      text: 'Attribute', color: '#0d9488', fontSize: 12,
    }),
  },
  {
    key: 'relationship',
    label: 'Relationship',
    variant: 'shape',
    makeElement: (x, y) => ({
      id: genId(), type: 'diamond', x, y, width: 150, height: 84,
      text: 'Relationship', color: '#8b5cf6', fontSize: 12,
    }),
  },
  {
    key: 'identifying',
    label: 'Identifying Rel.',
    variant: 'shape',
    makeElement: (x, y) => ({
      id: genId(), type: 'identifying', x, y, width: 150, height: 84,
      text: 'Identifying', color: '#8b5cf6', fontSize: 11,
    }),
  },
  {
    key: 'note',
    label: 'Note',
    variant: 'shape',
    makeElement: (x, y) => ({
      id: genId(), type: 'note', x, y, width: 170, height: 110,
      text: 'Add a note…', color: '#eab308', fontSize: 11,
    }),
  },
  {
    key: 'c-one',
    label: '1 : 1 (One)',
    variant: 'connector',
    makeElement: (x, y) => ({
      id: genId(), type: 'line', x, y,
      points: [
        { x, y },
        { x: x + 160, y: y + 80 },
      ],
      color: '#475569', sourceMarker: 'one', targetMarker: 'one',
    }),
  },
  {
    key: 'c-one-many',
    label: '1 : N (One-Many)',
    variant: 'connector',
    makeElement: (x, y) => ({
      id: genId(), type: 'line', x, y,
      points: [
        { x, y },
        { x: x + 160, y: y + 80 },
      ],
      color: '#475569', sourceMarker: 'one', targetMarker: 'many',
    }),
  },
  {
    key: 'c-many-many',
    label: 'N : M (Many-Many)',
    variant: 'connector',
    makeElement: (x, y) => ({
      id: genId(), type: 'line', x, y,
      points: [
        { x, y },
        { x: x + 160, y: y + 80 },
      ],
      color: '#475569', sourceMarker: 'many', targetMarker: 'many',
    }),
  },
  {
    key: 'c-zero-many',
    label: '0..N (Zero-Many)',
    variant: 'connector',
    makeElement: (x, y) => ({
      id: genId(), type: 'line', x, y,
      points: [
        { x, y },
        { x: x + 160, y: y + 80 },
      ],
      color: '#475569', sourceMarker: 'zero-many', targetMarker: 'zero-many',
    }),
  },
  {
    key: 'c-zero-one',
    label: '0..1 (Zero-One)',
    variant: 'connector',
    makeElement: (x, y) => ({
      id: genId(), type: 'line', x, y,
      points: [
        { x, y },
        { x: x + 160, y: y + 80 },
      ],
      color: '#475569', sourceMarker: 'zero-one', targetMarker: 'zero-one',
    }),
  },
  {
    key: 'c-arrow',
    label: 'Connector',
    variant: 'connector',
    makeElement: (x, y) => ({
      id: genId(), type: 'arrow', x, y,
      points: [
        { x, y },
        { x: x + 160, y: y + 80 },
      ],
      color: '#475569',
    }),
  },
  {
    key: 'text',
    label: 'Label',
    variant: 'label',
    makeElement: (x, y) => ({
      id: genId(), type: 'text', x, y, width: 160, height: 26,
      text: 'Label text', color: '#334155', fontSize: 13,
    }),
  },
];

export const DFD_PALETTE: PaletteItem[] = [
  {
    key: 'external',
    label: 'External Entity',
    variant: 'shape',
    makeElement: (x, y) => ({
      id: genId(), type: 'box', x, y, width: 170, height: 70,
      text: 'External Entity', color: '#64748b', fontSize: 12,
    }),
  },
  {
    key: 'process',
    label: 'Process',
    variant: 'shape',
    makeElement: (x, y) => ({
      id: genId(), type: 'circle', x, y, width: 140, height: 140,
      text: 'Process', color: '#3b82f6', fontSize: 13,
    }),
  },
  {
    key: 'datastore',
    label: 'Data Store',
    variant: 'shape',
    makeElement: (x, y) => ({
      id: genId(), type: 'datastore', x, y, width: 180, height: 70,
      text: 'D1  Data Store', color: '#d97706', fontSize: 12,
    }),
  },
  {
    key: 'c-arrow',
    label: 'Data Flow',
    variant: 'connector',
    makeElement: (x, y) => ({
      id: genId(), type: 'arrow', x, y,
      points: [
        { x, y },
        { x: x + 160, y: y + 80 },
      ],
      color: '#475569',
    }),
  },
  {
    key: 'note',
    label: 'Note',
    variant: 'shape',
    makeElement: (x, y) => ({
      id: genId(), type: 'note', x, y, width: 170, height: 110,
      text: 'Add a note…', color: '#eab308', fontSize: 11,
    }),
  },
  {
    key: 'text',
    label: 'Label',
    variant: 'label',
    makeElement: (x, y) => ({
      id: genId(), type: 'text', x, y, width: 160, height: 26,
      text: 'Label text', color: '#334155', fontSize: 13,
    }),
  },
];

export const FLOWCHART_PALETTE: PaletteItem[] = [
  {
    key: 'terminator',
    label: 'Start / End',
    variant: 'shape',
    makeElement: (x, y) => ({
      id: genId(), type: 'terminator', x, y, width: 150, height: 64,
      text: 'Start', color: '#10b981', fontSize: 13,
    }),
  },
  {
    key: 'process',
    label: 'Process',
    variant: 'shape',
    makeElement: (x, y) => ({
      id: genId(), type: 'box', x, y, width: 170, height: 70,
      text: 'Process', color: '#3b82f6', fontSize: 12,
    }),
  },
  {
    key: 'decision',
    label: 'Decision',
    variant: 'shape',
    makeElement: (x, y) => ({
      id: genId(), type: 'diamond', x, y, width: 170, height: 100,
      text: 'Decision?', color: '#d97706', fontSize: 12,
    }),
  },
  {
    key: 'io',
    label: 'Input / Output',
    variant: 'shape',
    makeElement: (x, y) => ({
      id: genId(), type: 'parallelogram', x, y, width: 180, height: 70,
      text: 'Input / Output', color: '#a855f7', fontSize: 12,
    }),
  },
  {
    key: 'connector',
    label: 'Connector',
    variant: 'shape',
    makeElement: (x, y) => ({
      id: genId(), type: 'circle', x, y, width: 52, height: 52,
      text: 'A', color: '#64748b', fontSize: 14,
    }),
  },
  {
    key: 'c-arrow',
    label: 'Flow Line',
    variant: 'connector',
    makeElement: (x, y) => ({
      id: genId(), type: 'arrow', x, y,
      points: [
        { x, y },
        { x: x + 160, y },
      ],
      color: '#475569',
    }),
  },
  {
    key: 'text',
    label: 'Label',
    variant: 'label',
    makeElement: (x, y) => ({
      id: genId(), type: 'text', x, y, width: 160, height: 26,
      text: 'Label text', color: '#334155', fontSize: 13,
    }),
  },
];

export const UML_PALETTE: PaletteItem[] = [
  {
    key: 'class',
    label: 'Class',
    variant: 'shape',
    makeElement: (x, y) => ({
      id: genId(), type: 'class', x, y, width: 190, height: 130,
      text: 'ClassName\n+ attribute : type\n+ method() : void',
      color: '#6366f1', fontSize: 12,
    }),
  },
  {
    key: 'note',
    label: 'Note',
    variant: 'shape',
    makeElement: (x, y) => ({
      id: genId(), type: 'note', x, y, width: 170, height: 110,
      text: 'Add a note…', color: '#eab308', fontSize: 11,
    }),
  },
  {
    key: 'c-line',
    label: 'Association',
    variant: 'connector',
    makeElement: (x, y) => ({
      id: genId(), type: 'line', x, y,
      points: [
        { x, y },
        { x: x + 160, y: y + 80 },
      ],
      color: '#475569',
    }),
  },
  {
    key: 'c-arrow',
    label: 'Inheritance',
    variant: 'connector',
    makeElement: (x, y) => ({
      id: genId(), type: 'arrow', x, y,
      points: [
        { x, y },
        { x: x + 160, y },
      ],
      color: '#475569',
    }),
  },
  {
    key: 'text',
    label: 'Label',
    variant: 'label',
    makeElement: (x, y) => ({
      id: genId(), type: 'text', x, y, width: 160, height: 26,
      text: 'Label text', color: '#334155', fontSize: 13,
    }),
  },
];

export const TOPOLOGY_PALETTE: PaletteItem[] = [
  {
    key: 'router',
    label: 'Router',
    variant: 'shape',
    makeElement: (x, y) => ({
      id: genId(), type: 'circle', x, y, width: 120, height: 120,
      text: 'Router', color: '#3b82f6', fontSize: 12,
    }),
  },
  {
    key: 'switch',
    label: 'Switch',
    variant: 'shape',
    makeElement: (x, y) => ({
      id: genId(), type: 'box', x, y, width: 150, height: 60,
      text: 'Switch', color: '#0ea5e9', fontSize: 12,
    }),
  },
  {
    key: 'firewall',
    label: 'Firewall',
    variant: 'shape',
    makeElement: (x, y) => ({
      id: genId(), type: 'box', x, y, width: 150, height: 70,
      text: 'Firewall', color: '#ef4444', fontSize: 12,
    }),
  },
  {
    key: 'server',
    label: 'Server',
    variant: 'shape',
    makeElement: (x, y) => ({
      id: genId(), type: 'server', x, y, width: 130, height: 100,
      text: 'Server', color: '#64748b', fontSize: 12,
    }),
  },
  {
    key: 'pc',
    label: 'PC / Client',
    variant: 'shape',
    makeElement: (x, y) => ({
      id: genId(), type: 'box', x, y, width: 110, height: 90,
      text: 'PC', color: '#334155', fontSize: 12,
    }),
  },
  {
    key: 'cloud',
    label: 'Internet / Cloud',
    variant: 'shape',
    makeElement: (x, y) => ({
      id: genId(), type: 'cloud', x, y, width: 200, height: 120,
      text: 'Internet', color: '#0d9488', fontSize: 12,
    }),
  },
  {
    key: 'c-link',
    label: 'Link',
    variant: 'connector',
    makeElement: (x, y) => ({
      id: genId(), type: 'line', x, y,
      points: [
        { x, y },
        { x: x + 160, y: y + 80 },
      ],
      color: '#475569',
    }),
  },
  {
    key: 'text',
    label: 'Label',
    variant: 'label',
    makeElement: (x, y) => ({
      id: genId(), type: 'text', x, y, width: 160, height: 26,
      text: 'Label text', color: '#334155', fontSize: 13,
    }),
  },
];

export const SUBNETTING_PALETTE: PaletteItem[] = [
  {
    key: 'subnet',
    label: 'Subnet',
    variant: 'shape',
    makeElement: (x, y) => ({
      id: genId(), type: 'box', x, y, width: 200, height: 100,
      text: '192.168.1.0/24', color: '#8b5cf6', fontSize: 12,
    }),
  },
  {
    key: 'host',
    label: 'Host',
    variant: 'shape',
    makeElement: (x, y) => ({
      id: genId(), type: 'box', x, y, width: 90, height: 70,
      text: 'Host', color: '#334155', fontSize: 12,
    }),
  },
  {
    key: 'gateway',
    label: 'Gateway',
    variant: 'shape',
    makeElement: (x, y) => ({
      id: genId(), type: 'box', x, y, width: 140, height: 70,
      text: 'Gateway', color: '#d97706', fontSize: 12,
    }),
  },
  {
    key: 'external',
    label: 'External Network',
    variant: 'shape',
    makeElement: (x, y) => ({
      id: genId(), type: 'cloud', x, y, width: 180, height: 110,
      text: 'Internet', color: '#0d9488', fontSize: 12,
    }),
  },
  {
    key: 'c-link',
    label: 'Connection',
    variant: 'connector',
    makeElement: (x, y) => ({
      id: genId(), type: 'line', x, y,
      points: [
        { x, y },
        { x: x + 160, y: y + 80 },
      ],
      color: '#475569',
    }),
  },
  {
    key: 'text',
    label: 'Label',
    variant: 'label',
    makeElement: (x, y) => ({
      id: genId(), type: 'text', x, y, width: 160, height: 26,
      text: 'Label text', color: '#334155', fontSize: 13,
    }),
  },
];

export const STORYBOARD_PALETTE: PaletteItem[] = [
  {
    key: 'frame',
    label: 'Frame',
    variant: 'shape',
    makeElement: (x, y) => ({
      id: genId(), type: 'storyboard-frame', x, y, width: 220, height: 150,
      text: 'Frame 1', color: '#6366f1', fontSize: 12,
    }),
  },
  {
    key: 'caption',
    label: 'Caption',
    variant: 'label',
    makeElement: (x, y) => ({
      id: genId(), type: 'text', x, y, width: 220, height: 30,
      text: 'Caption', color: '#334155', fontSize: 13,
    }),
  },
  {
    key: 'c-transition',
    label: 'Transition',
    variant: 'connector',
    makeElement: (x, y) => ({
      id: genId(), type: 'arrow', x, y,
      points: [
        { x, y },
        { x: x + 160, y },
      ],
      color: '#475569',
    }),
  },
  {
    key: 'dialog',
    label: 'Dialog',
    variant: 'shape',
    makeElement: (x, y) => ({
      id: genId(), type: 'circle', x, y, width: 110, height: 70,
      text: 'Dialog', color: '#a855f7', fontSize: 12,
    }),
  },
  {
    key: 'note',
    label: 'Note',
    variant: 'shape',
    makeElement: (x, y) => ({
      id: genId(), type: 'note', x, y, width: 170, height: 110,
      text: 'Add a note…', color: '#eab308', fontSize: 11,
    }),
  },
  {
    key: 'text',
    label: 'Text',
    variant: 'label',
    makeElement: (x, y) => ({
      id: genId(), type: 'text', x, y, width: 160, height: 26,
      text: 'Label text', color: '#334155', fontSize: 13,
    }),
  },
];

export const UI_MOCKUP_PALETTE: PaletteItem[] = [
  {
    key: 'screen',
    label: 'Mobile Screen',
    variant: 'shape',
    makeElement: (x, y) => ({
      id: genId(), type: 'mobile-frame', x, y, width: 180, height: 320,
      text: 'Screen', color: '#6366f1', fontSize: 12,
    }),
  },
  {
    key: 'header',
    label: 'Header Bar',
    variant: 'shape',
    makeElement: (x, y) => ({
      id: genId(), type: 'box', x, y, width: 160, height: 44,
      text: 'Header', color: '#3b82f6', fontSize: 12,
    }),
  },
  {
    key: 'button',
    label: 'Button',
    variant: 'shape',
    makeElement: (x, y) => ({
      id: genId(), type: 'box', x, y, width: 140, height: 40,
      text: 'Button', color: '#10b981', fontSize: 12,
    }),
  },
  {
    key: 'input',
    label: 'Input Field',
    variant: 'shape',
    makeElement: (x, y) => ({
      id: genId(), type: 'box', x, y, width: 160, height: 38,
      text: 'Input…', color: '#64748b', fontSize: 12,
    }),
  },
  {
    key: 'image',
    label: 'Image Placeholder',
    variant: 'shape',
    makeElement: (x, y) => ({
      id: genId(), type: 'parallelogram', x, y, width: 160, height: 80,
      text: 'Image', color: '#0d9488', fontSize: 12,
    }),
  },
  {
    key: 'navbar',
    label: 'Nav Bar',
    variant: 'shape',
    makeElement: (x, y) => ({
      id: genId(), type: 'box', x, y, width: 180, height: 40,
      text: 'Nav', color: '#334155', fontSize: 12,
    }),
  },
  {
    key: 'c-arrow',
    label: 'Flow Arrow',
    variant: 'connector',
    makeElement: (x, y) => ({
      id: genId(), type: 'arrow', x, y,
      points: [
        { x, y },
        { x: x + 160, y: y + 80 },
      ],
      color: '#475569',
    }),
  },
  {
    key: 'text',
    label: 'Label',
    variant: 'label',
    makeElement: (x, y) => ({
      id: genId(), type: 'text', x, y, width: 160, height: 26,
      text: 'Label text', color: '#334155', fontSize: 13,
    }),
  },
];

const PALETTES: Record<DiagramKind, PaletteItem[]> = {
  ERD: ERD_PALETTE,
  DFD: DFD_PALETTE,
  FLOWCHART: FLOWCHART_PALETTE,
  UML: UML_PALETTE,
  TOPOLOGY: TOPOLOGY_PALETTE,
  SUBNETTING: SUBNETTING_PALETTE,
  STORYBOARD: STORYBOARD_PALETTE,
  UI_MOCKUP: UI_MOCKUP_PALETTE,
};

const KIND_LABELS: Record<DiagramKind, string> = {
  ERD: 'Entity-Relationship Diagram',
  DFD: 'Data Flow Diagram',
  FLOWCHART: 'Flowchart',
  UML: 'UML Class Diagram',
  TOPOLOGY: 'Network Topology',
  SUBNETTING: 'Subnetting Plan',
  STORYBOARD: 'Storyboard',
  UI_MOCKUP: 'UI Mockup',
};

const KIND_HINTS: Record<DiagramKind, string> = {
  ERD: 'Entities (boxes), attributes (ellipses) and relationships (diamonds) joined by connectors — like eDraw Max.',
  DFD: 'External entities, processes, data stores and labelled data flows (arrows).',
  FLOWCHART: 'Start/End pills, process boxes, decision diamonds and I/O parallelograms connected by flow lines.',
  UML: 'Classes with a header band, notes, associations and inheritance arrows.',
  TOPOLOGY: 'Routers, switches, firewalls, servers, PCs and the Internet/cloud joined by links.',
  SUBNETTING: 'Subnets, hosts, gateways and the external network — plan IP ranges and interconnections.',
  STORYBOARD: 'Film frames with captions, dialog bubbles and transition arrows between scenes.',
  UI_MOCKUP: 'Mobile screens with header bars, buttons, input fields and image placeholders.',
};

const COLOR_SWATCHES = [
  '#6366f1', '#3b82f6', '#0d9488', '#10b981', '#d97706',
  '#8b5cf6', '#a855f7', '#ef4444', '#64748b', '#334155',
];

// Cardinality markers offered in the connector property toolbar.
const MARKER_CHOICES: ConnectorMarker[] = [
  'none',
  'one',
  'many',
  'zero-one',
  'zero-many',
  'one-many',
  'arrow',
  'diamond',
];

const MARKER_LABELS: Record<ConnectorMarker, string> = {
  none: 'No marker',
  one: 'Exactly one (1)',
  many: 'Many (crow\'s foot)',
  'zero-one': 'Zero or one (0..1)',
  'zero-many': 'Zero or many (0..N)',
  'one-many': 'One or many (1..N)',
  arrow: 'Arrowhead',
  diamond: 'Hollow diamond',
};

// ── id / geometry helpers ───────────────────────────
let idCounter = 0;
function genId(): string {
  idCounter += 1;
  return `d-${Date.now().toString(36)}-${idCounter}`;
}

function getCenter(el: DiagramElement): { x: number; y: number } {
  const w = el.width ?? 0;
  const h = el.height ?? 0;
  return { x: el.x + w / 2, y: el.y + h / 2 };
}

function getBBox(el: DiagramElement): { x: number; y: number; w: number; h: number } {
  const w = el.width ?? 0;
  const h = el.height ?? 0;
  return { x: el.x, y: el.y, w, h };
}

// Point on an element's border facing `toward` — connectors start/end on the
// shape outline instead of its center.
export function anchorOnBorder(el: DiagramElement, toward: { x: number; y: number }): { x: number; y: number } {
  const c = getCenter(el);
  const dx = toward.x - c.x;
  const dy = toward.y - c.y;
  if (dx === 0 && dy === 0) return c;
  const { w, h } = getBBox(el);
  const hw = Math.max(w / 2, 1);
  const hh = Math.max(h / 2, 1);

  if (el.type === 'circle') {
    const t = 1 / Math.sqrt((dx / hw) ** 2 + (dy / hh) ** 2);
    return { x: c.x + dx * t, y: c.y + dy * t };
  }

  const tX = Math.abs(dx) > 0 ? hw / Math.abs(dx) : Infinity;
  const tY = Math.abs(dy) > 0 ? hh / Math.abs(dy) : Infinity;
  const t = Math.min(tX, tY);
  return { x: c.x + dx * t, y: c.y + dy * t };
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

// ── Polyline geometry (connector editing) ──────────
// Normalized distance t (0..1) along a polyline → point + tangent angle.
// Used to position slid cardinality markers anywhere along a connector.
export function pointAtT(
  pts: Array<{ x: number; y: number }>,
  t: number,
): { x: number; y: number; angleDeg: number } {
  if (pts.length === 0) return { x: 0, y: 0, angleDeg: 0 };
  if (pts.length === 1) return { x: pts[0]!.x, y: pts[0]!.y, angleDeg: 0 };
  let total = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    total += distance(pts[i]!, pts[i + 1]!);
  }
  if (total <= 0) return { x: pts[0]!.x, y: pts[0]!.y, angleDeg: 0 };
  let target = Math.max(0, Math.min(1, t)) * total;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    const seg = distance(a, b);
    if (target <= seg || i === pts.length - 2) {
      const f = seg > 0 ? target / seg : 0;
      const angleDeg = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
      return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, angleDeg };
    }
    target -= seg;
  }
  const last = pts[pts.length - 1]!;
  const prev = pts[pts.length - 2]!;
  return {
    x: last.x,
    y: last.y,
    angleDeg: (Math.atan2(last.y - prev.y, last.x - prev.x) * 180) / Math.PI,
  };
}

// Closest normalized distance along the polyline to a given point — used to
// slide a cardinality marker to wherever the pointer is on the connector.
export function nearestTOnPolyline(
  pts: Array<{ x: number; y: number }>,
  p: { x: number; y: number },
): number {
  if (pts.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    total += distance(pts[i]!, pts[i + 1]!);
  }
  if (total <= 0) return 0;
  let bestT = 0;
  let bestD = Infinity;
  let acc = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    const seg = distance(a, b);
    if (seg > 0) {
      const f = Math.max(
        0,
        Math.min(1, ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / (seg * seg)),
      );
      const px = a.x + (b.x - a.x) * f;
      const py = a.y + (b.y - a.y) * f;
      const d = Math.hypot(p.x - px, p.y - py);
      if (d < bestD) {
        bestD = d;
        bestT = (acc + f * seg) / total;
      }
    }
    acc += seg;
  }
  return bestT;
}

// SVG transform that places a cardinality glyph at an arbitrary point along a
// connector. Mirrors the <marker orient="auto-start-reverse"> behaviour: the
// target marker points along the line direction, the source marker is mirrored.
// Scale matches markerWidth=11 over the 24×24 viewBox (11/24 ≈ 0.4583).
export function markerGlyphTransform(
  kind: Exclude<ConnectorMarker, 'none'>,
  at: { x: number; y: number },
  angleDeg: number,
  isSource: boolean,
): string {
  const s = Math.round((11 / 24) * 10000) / 10000;
  const rot = Math.round((isSource ? angleDeg + 180 : angleDeg) * 100) / 100;
  return `translate(${at.x} ${at.y}) rotate(${rot}) scale(${s}) translate(${-MARKER_GEOMETRY[kind].refX} -12)`;
}

// Short notation labels for cardinality markers (shown near the drag handles).
export const CARDINALITY_LABELS: Record<ConnectorMarker, string> = {
  none: '',
  arrow: '',
  diamond: '',
  one: '1',
  many: 'N',
  'zero-one': '0..1',
  'zero-many': '0..N',
  'one-many': '1..N',
};

// ── Connector point resolution ─────────────────────
// A connector's geometry is either its explicit polyline points, or derived
// from the shapes it attaches to (sourceId/targetId) — so connectors follow
// their shapes when the shapes move. Shared by the live canvas, hit testing
// and the SVG/PNG export.
export function resolveConnectorPoints(
  el: DiagramElement,
  list: DiagramElement[],
): Array<{ x: number; y: number }> {
  if (el.points && el.points.length >= 2) return el.points;
  const src = el.sourceId ? list.find((e) => e.id === el.sourceId) : null;
  const tgt = el.targetId ? list.find((e) => e.id === el.targetId) : null;
  if (src && tgt) {
    const sc = getCenter(src);
    const tc = getCenter(tgt);
    return [anchorOnBorder(src, tc), anchorOnBorder(tgt, sc)];
  }    if (src && el.points?.[0]) {
      return [anchorOnBorder(src, el.points[0]), el.points[0]];
    }
    // Backward compatibility: diagrams saved by the original editor stored
    // arrow/line elements as boxes with x/y/width/height and no connector
    // geometry — derive a diagonal so they keep rendering instead of vanishing.
    if ((el.type === 'arrow' || el.type === 'line') && el.width && el.height) {
      return [
        { x: el.x, y: el.y },
        { x: el.x + el.width, y: el.y + el.height },
      ];
    }
    return el.points ?? [];
  }

// ── Crow's foot marker geometry ─────────────────────
// Markers are drawn in a 24×24 box with the line attaching at (refX, 12).
// Each entry is the inner SVG markup for a <marker> element (same markup is
// reused for the SVG/PNG export).
export const MARKER_GEOMETRY: Record<Exclude<ConnectorMarker, 'none'>, {
  refX: number;
  inner: string;
}> = {
  arrow: {
    refX: 22,
    inner: '<path d="M 2 2 L 22 12 L 2 22 Z" fill="#475569"/>',
  },
  diamond: {
    refX: 22,
    inner: '<path d="M 2 12 L 12 2 L 22 12 L 12 22 Z" fill="#ffffff" stroke="#475569" stroke-width="1.8"/>',
  },
  one: {
    refX: 12,
    inner: '<path d="M 12 3 L 12 21" stroke="#475569" stroke-width="2.6"/>',
  },
  many: {
    refX: 4,
    inner: [
      '<path d="M 4 12 L 21 5" stroke="#475569" stroke-width="1.8" stroke-linecap="round"/>',
      '<path d="M 4 12 L 21 12" stroke="#475569" stroke-width="1.8" stroke-linecap="round"/>',
      '<path d="M 4 12 L 21 19" stroke="#475569" stroke-width="1.8" stroke-linecap="round"/>',
    ].join(''),
  },
  'zero-one': {
    refX: 12,
    inner: [
      '<circle cx="4" cy="12" r="3.4" fill="#ffffff" stroke="#475569" stroke-width="1.8"/>',
      '<path d="M 12 3 L 12 21" stroke="#475569" stroke-width="2.6"/>',
    ].join(''),
  },
  'zero-many': {
    // The line ends where the prongs converge (refX = prong base) and passes
    // THROUGH the circle, so circle + crow's foot read as one connected glyph.
    refX: 10,
    inner: [
      '<circle cx="3" cy="12" r="3.4" fill="#ffffff" stroke="#475569" stroke-width="1.8"/>',
      '<path d="M 10 12 L 22 6" stroke="#475569" stroke-width="1.8" stroke-linecap="round"/>',
      '<path d="M 10 12 L 22 12" stroke="#475569" stroke-width="1.8" stroke-linecap="round"/>',
      '<path d="M 10 12 L 22 18" stroke="#475569" stroke-width="1.8" stroke-linecap="round"/>',
    ].join(''),
  },
  'one-many': {
    // Distinct tick (one) right at the line end, then the crow's foot (many)
    // with its prong base offset past the tick so the two read as separate
    // glyphs: tick at x=4 (refX), prongs from x=8..20.
    refX: 4,
    inner: [
      '<path d="M 4 3 L 4 21" stroke="#475569" stroke-width="2.6"/>',
      '<path d="M 8 12 L 20 6" stroke="#475569" stroke-width="1.8" stroke-linecap="round"/>',
      '<path d="M 8 12 L 20 12" stroke="#475569" stroke-width="1.8" stroke-linecap="round"/>',
      '<path d="M 8 12 L 20 18" stroke="#475569" stroke-width="1.8" stroke-linecap="round"/>',
    ].join(''),
  },
};

// Default end markers: arrows point at the target; plain lines get nothing.
export function defaultTargetMarker(type: DiagramElement['type']): ConnectorMarker {
  return type === 'arrow' ? 'arrow' : 'none';
}

// ── Shape geometry (SVG path helpers) ───────────────
function diamondPoints(el: DiagramElement): string {
  const { x, y, w, h } = getBBox(el);
  return `${x + w / 2},${y} ${x + w},${y + h / 2} ${x + w / 2},${y + h} ${x},${y + h / 2}`;
}

function parallelogramPoints(el: DiagramElement): string {
  const { x, y, w, h } = getBBox(el);
  const skew = Math.min(h * 0.55, w * 0.3);
  return `${x + skew},${y} ${x + w},${y} ${x + w - skew},${y + h} ${x},${y + h}`;
}

function datastorePath(el: DiagramElement): string {
  const { x, y, w, h } = getBBox(el);
  const bar = h * 0.35;
  return [
    `M ${x},${y} L ${x + w},${y}`,
    `L ${x + w},${y + h}`,
    `L ${x},${y + h}`,
    `L ${x},${y}`,
    `M ${x + w - bar},${y} L ${x + w - bar},${y + h}`,
  ].join(' ');
}

function notePath(el: DiagramElement): string {
  const { x, y, w, h } = getBBox(el);
  const fold = Math.min(24, w * 0.18, h * 0.3);
  return [
    `M ${x},${y}`,
    `L ${x + w - fold},${y}`,
    `L ${x + w},${y + fold}`,
    `L ${x + w},${y + h}`,
    `L ${x},${y + h}`,
    'Z',
  ].join(' ');
}

// Round to 1 decimal place so exported SVG doesn't carry float noise (e.g.
// 0.82 * 120 = 98.40000000000001) from the proportional cloud/screen geometry.
function r1(v: number): number {
  return Math.round(v * 10) / 10;
}

// Cloud (internet / external network) — a bubbly closed curve inside the
// element's bounding box, shared by the live canvas and the SVG export.
function cloudPath(el: DiagramElement): string {
  const { x, y, w, h } = getBBox(el);
  return [
    `M ${r1(x + w * 0.3)} ${r1(y + h * 0.82)}`,
    `C ${r1(x + w * 0.02)} ${r1(y + h * 0.82)}, ${r1(x + w * 0.04)} ${r1(y + h * 0.48)}, ${r1(x + w * 0.24)} ${r1(y + h * 0.46)}`,
    `C ${r1(x + w * 0.1)} ${r1(y + h * 0.16)}, ${r1(x + w * 0.46)} ${r1(y + h * 0.1)}, ${r1(x + w * 0.56)} ${r1(y + h * 0.3)}`,
    `C ${r1(x + w * 0.64)} ${r1(y + h * 0.04)}, ${r1(x + w * 0.94)} ${r1(y + h * 0.12)}, ${r1(x + w * 0.9)} ${r1(y + h * 0.34)}`,
    `C ${r1(x + w * 1.06)} ${r1(y + h * 0.42)}, ${r1(x + w * 1.0)} ${r1(y + h * 0.74)}, ${r1(x + w * 0.78)} ${r1(y + h * 0.74)}`,
    `C ${r1(x + w * 0.72)} ${r1(y + h * 0.94)}, ${r1(x + w * 0.36)} ${r1(y + h * 0.98)}, ${r1(x + w * 0.3)} ${r1(y + h * 0.82)}`,
    'Z',
  ].join(' ');
}

// SVG-export markup for a server rack (front face with LED + vent lines).
function serverSvg(el: DiagramElement, fill: string, color: string): string {
  const { x, y, w, h } = getBBox(el);
  return (
    `<rect x="${x - 5}" y="${y + 8}" width="5" height="${h - 16}" rx="2" fill="${color}" opacity="0.5"/>` +
    `<rect x="${x + w}" y="${y + 8}" width="5" height="${h - 16}" rx="2" fill="${color}" opacity="0.5"/>` +
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${fill}" stroke="${color}" stroke-width="1.6"/>` +
    `<line x1="${x + 8}" y1="${r1(y + h * 0.5)}" x2="${x + w - 8}" y2="${r1(y + h * 0.5)}" stroke="${color}" stroke-width="1.2" opacity="0.45"/>` +
    `<line x1="${x + 8}" y1="${r1(y + h * 0.72)}" x2="${x + w - 8}" y2="${r1(y + h * 0.72)}" stroke="${color}" stroke-width="1.2" opacity="0.45"/>` +
    `<circle cx="${x + 16}" cy="${y + 18}" r="3" fill="#22c55e" stroke="none"/>` +
    `<circle cx="${x + 28}" cy="${y + 18}" r="3" fill="#facc15" stroke="none"/>`
  );
}

// SVG-export markup for a film frame (sprocket holes + caption strip).
function storyboardSvg(el: DiagramElement, fill: string, color: string): string {
  const { x, y, w, h } = getBBox(el);
  const sprocket = 6;
  const holes = 3;
  let holesStr = '';
  for (let i = 0; i < holes; i++) {
    const hy = r1(y + 8 + i * ((h - 16) / holes));
    holesStr +=
      `<rect x="${x + 4}" y="${hy}" width="${sprocket}" height="${sprocket}" rx="1" fill="#ffffff" stroke="${color}" stroke-width="1"/>` +
      `<rect x="${x + w - 4 - sprocket}" y="${hy}" width="${sprocket}" height="${sprocket}" rx="1" fill="#ffffff" stroke="${color}" stroke-width="1"/>`;
  }
  return (
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="${fill}" stroke="${color}" stroke-width="1.6"/>` +
    holesStr +
    `<rect x="${x}" y="${y + h - 24}" width="${w}" height="24" fill="${color}22"/>`
  );
}

// SVG-export markup for a phone screen (notch + home indicator).
function mobileSvg(el: DiagramElement, fill: string, color: string): string {
  const { x, y, w, h } = getBBox(el);
  return (
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="16" fill="${fill}" stroke="${color}" stroke-width="2"/>` +
    `<rect x="${x + 3}" y="${y + 3}" width="${w - 6}" height="${h - 6}" rx="13" fill="#ffffff" stroke="${color}" stroke-width="1" opacity="0.9"/>` +
    `<rect x="${r1(x + w * 0.32)}" y="${y + 4}" width="${r1(w * 0.36)}" height="5" rx="2.5" fill="${color}"/>` +
    `<rect x="${r1(x + w * 0.3)}" y="${y + h - 6}" width="${r1(w * 0.4)}" height="4" rx="2" fill="${color}" opacity="0.55"/>`
  );
}

// ── Main component ──────────────────────────────────
export function DiagramWorkspace({
  value,
  onChange,
  readOnly = false,
  diagramType = 'ERD',
  draftKey,
  onSavedDesignsChange,
}: DiagramWorkspaceProps) {
  const gridPatternId = useId().replace(/:/g, '');
  const arrowMarkerId = useId().replace(/:/g, '');
  const diamondMarkerId = useId().replace(/:/g, '');
  const oneMarkerId = useId().replace(/:/g, '');
  const manyMarkerId = useId().replace(/:/g, '');
  const zeroOneMarkerId = useId().replace(/:/g, '');
  const zeroManyMarkerId = useId().replace(/:/g, '');
  const oneManyMarkerId = useId().replace(/:/g, '');

  // Marker id lookup shared by the live canvas and the connector renderer.
  const markerIds = useMemo<Record<Exclude<ConnectorMarker, 'none'>, string>>(
    () => ({
      arrow: arrowMarkerId,
      diamond: diamondMarkerId,
      one: oneMarkerId,
      many: manyMarkerId,
      'zero-one': zeroOneMarkerId,
      'zero-many': zeroManyMarkerId,
      'one-many': oneManyMarkerId,
    }),
    [arrowMarkerId, diamondMarkerId, oneMarkerId, manyMarkerId, zeroOneMarkerId, zeroManyMarkerId, oneManyMarkerId],
  );

  const palette = useMemo(() => PALETTES[diagramType] ?? ERD_PALETTE, [diagramType]);

  // Autosave draft key — the parent passes a stable per-canvas key (the
  // diagram file path) so the backup survives page reloads; standalone
  // canvases fall back to the diagram type.
  const effectiveDraftKey = draftKey ?? `default:${diagramType}`;

  // ── Local state (source of truth during editing) ──
  const [elements, setElements] = useState<DiagramElement[]>(value);
  const elementsRef = useRef(elements);
  elementsRef.current = elements;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onSavedDesignsChangeRef = useRef(onSavedDesignsChange);
  onSavedDesignsChangeRef.current = onSavedDesignsChange;

  // Sync from parent (e.g. workspace reset / diagram load) unless an
  // interaction is mid-flight or the value is the one we last emitted.
  const draggingRef = useRef(false);
  useEffect(() => {
    if (draggingRef.current) return;
    if (JSON.stringify(elementsRef.current) === JSON.stringify(value)) return;
    elementsRef.current = value;
    setElements(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // ── Autosave draft backup ────────────────────────
  // The canvas counts as already-saved at mount, so the draft only backs up
  // changes made afterwards. Every few seconds a changed canvas is written to
  // localStorage; on unmount any unsaved change is flushed. When a canvas
  // mounts empty, a stored draft is restored through commit() so it also lands
  // back in the workspace file (diagram.json). Skipped entirely in read-only
  // views so assessors never overwrite a candidate's backup.
  useEffect(() => {
    if (readOnly) return;
    lastSavedRef.current = JSON.stringify(elementsRef.current);
    if (elementsRef.current.length === 0) {
      const draft = readDiagramDraft(effectiveDraftKey);
      if (draft && draft.elements.length > 0) {
        commit(draft.elements);
        lastSavedRef.current = JSON.stringify(draft.elements);
        setDraftSavedAt(draft.savedAt);
      }
    }
    const timer = setInterval(() => {
      const current = JSON.stringify(elementsRef.current);
      if (current === lastSavedRef.current) return;
      lastSavedRef.current = current;
      setDraftSavedAt(writeDiagramDraft(effectiveDraftKey, elementsRef.current));
    }, DRAFT_INTERVAL_MS);
    return () => {
      clearInterval(timer);
      const current = JSON.stringify(elementsRef.current);
      if (current !== lastSavedRef.current) {
        writeDiagramDraft(effectiveDraftKey, elementsRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveDraftKey, readOnly]);

  const [tool, setTool] = useState<string>('select');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [gridOn, setGridOn] = useState(true);
  const [snapOn, setSnapOn] = useState(true);

  // Saved-designs library (browser-local drafts for future use)
  const [savedDesigns, setSavedDesigns] = useState<SavedDesign[]>(readSavedDesigns);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [libraryOpen, setLibraryOpen] = useState(false);

  // Autosave draft — last write time (shown in the toolbar) + the last
  // serialized canvas the draft was written for.
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);
  const lastSavedRef = useRef<string | null>(null);

  // Undo / redo (mirrored in refs so callbacks stay pure and StrictMode-safe)
  const [past, setPast] = useState<DiagramElement[][]>([]);
  const [future, setFuture] = useState<DiagramElement[][]>([]);
  const pastRef = useRef<DiagramElement[][]>([]);
  const futureRef = useRef<DiagramElement[][]>([]);
  pastRef.current = past;
  futureRef.current = future;

  // Connector drawing state
  const [pendingSource, setPendingSource] = useState<{ id: string } | null>(null);
  const [pendingFreeStart, setPendingFreeStart] = useState<{ x: number; y: number } | null>(null);
  const [previewPoint, setPreviewPoint] = useState<{ x: number; y: number } | null>(null);
  const connectorDraggingRef = useRef(false);
  const pendingSourceRef = useRef(pendingSource);
  pendingSourceRef.current = pendingSource;

  // Drag / resize interaction. Connector editing uses the extra fields:
  //   connector — drag the whole polyline (translated as one unit)
  //   point     — drag a single vertex (or insert a bend point at a midpoint)
  //   marker    — slide a cardinality marker along the line (markerField)
  const dragRef = useRef<{
    mode: 'move' | 'resize' | 'connector' | 'point' | 'marker';
    id: string;
    startClient: { x: number; y: number };
    startEl: { x: number; y: number; w: number; h: number };
    handle?: string;
    startPoints?: Array<{ x: number; y: number }>;
    pointIndex?: number;
    insertIndex?: number;
    markerField?: 'sourceMarkerPos' | 'targetMarkerPos';
    baked?: boolean;
    inserted?: boolean;
    moved?: boolean;
  } | null>(null);
  // Snapshot of elements captured when a drag starts — this is what Undo
  // should restore to (not the live-dragged state).
  const dragStartElementsRef = useRef<DiagramElement[]>([]);

  const canvasRef = useRef<HTMLDivElement>(null);

  // ── Commit helper: pushes history + notifies parent ──
  // historySnapshot defaults to the pre-change state; drag/resize passes the
  // snapshot captured at drag start so Undo restores the pre-drag layout.
  const commit = useCallback((next: DiagramElement[], historySnapshot?: DiagramElement[]) => {
    const snap = historySnapshot ?? elementsRef.current;
    const newPast = [...pastRef.current.slice(-(MAX_HISTORY - 1)), snap];
    pastRef.current = newPast;
    setPast(newPast);
    futureRef.current = [];
    setFuture([]);
    elementsRef.current = next;
    setElements(next);
    onChangeRef.current(next);
  }, []);

  const undo = useCallback(() => {
    const p = pastRef.current;
    if (p.length === 0) return;
    const prev = p[p.length - 1]!;
    const newPast = p.slice(0, -1);
    pastRef.current = newPast;
    setPast(newPast);
    const current = elementsRef.current;
    const newFuture = [...futureRef.current, current];
    futureRef.current = newFuture;
    setFuture(newFuture);
    elementsRef.current = prev;
    setElements(prev);
    onChangeRef.current(prev);
    setSelectedId(null);
    setEditing(null);
  }, []);

  const redo = useCallback(() => {
    const f = futureRef.current;
    if (f.length === 0) return;
    const next = f[f.length - 1]!;
    const newFuture = f.slice(0, -1);
    futureRef.current = newFuture;
    setFuture(newFuture);
    const current = elementsRef.current;
    const newPast = [...pastRef.current.slice(-(MAX_HISTORY - 1)), current];
    pastRef.current = newPast;
    setPast(newPast);
    elementsRef.current = next;
    setElements(next);
    onChangeRef.current(next);
    setSelectedId(null);
    setEditing(null);
  }, []);

  // ── Coordinate conversion ──────────────────────────
  const toLogical = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: (clientX - rect.left) / zoom,
        y: (clientY - rect.top) / zoom,
      };
    },
    [zoom],
  );

  const snap = useCallback(
    (v: number) => (snapOn ? Math.round(v / GRID_SIZE) * GRID_SIZE : Math.round(v)),
    [snapOn],
  );

  // ── Place a palette shape / label ──────────────────
  const placePaletteItem = useCallback(
    (key: string, x: number, y: number) => {
      const item = palette.find((p) => p.key === key);
      if (!item) return;
      const el = item.makeElement(snap(x), snap(y));
      commit([...elementsRef.current, el]);
      setSelectedId(el.id);
    },
    [palette, commit, snap],
  );

  // ── Hit testing ────────────────────────────────────
  function pointIsBetween(
    a: { x: number; y: number },
    b: { x: number; y: number },
    p: { x: number; y: number },
  ): boolean {
    return (
      p.x >= Math.min(a.x, b.x) - 12 &&
      p.x <= Math.max(a.x, b.x) + 12 &&
      p.y >= Math.min(a.y, b.y) - 12 &&
      p.y <= Math.max(a.y, b.y) + 12
    );
  }

  const hitTest = useCallback(
    (point: { x: number; y: number }): DiagramElement | null => {
      const list = elementsRef.current;
      for (let i = list.length - 1; i >= 0; i--) {
        const el = list[i]!;
        if (el.type === 'arrow' || el.type === 'line') {
          const pts = resolveConnectorPoints(el, list);
          for (let k = 0; k < pts.length - 1; k++) {
            const a = pts[k]!;
            const b = pts[k + 1]!;
            const d = Math.abs(
              (b.x - a.x) * (a.y - point.y) - (a.x - point.x) * (b.y - a.y),
            ) / (distance(a, b) || 1);
            if (d <= 10 && pointIsBetween(a, b, point)) return el;
          }
          continue;
        }
        const { x, y, w, h } = getBBox(el);
        if (point.x >= x && point.x <= x + w && point.y >= y && point.y <= y + h) return el;
      }
      return null;
    },
    [],
  );

  // ── Connector pointer down (whole-line drag) ─────
  const startConnectorDrag = useCallback(
    (e: React.PointerEvent | PointerEvent, el: DiagramElement) => {
      e.stopPropagation();
      setSelectedId(el.id);
      if (readOnly || tool !== 'select') return;
      // Resolve the connector's current polyline and record it as the drag
      // baseline. The connector is baked into a free polyline (explicit
      // points, no source/target ids) the first time the pointer moves, so
      // dragging an attached connector stops it from following its shapes.
      const pts = resolveConnectorPoints(el, elementsRef.current);
      dragRef.current = {
        mode: 'connector',
        id: el.id,
        startClient: { x: e.clientX, y: e.clientY },
        startEl: getBBox(el),
        startPoints: pts,
        baked: false,
        moved: false,
      };
      dragStartElementsRef.current = elementsRef.current;
      draggingRef.current = true;
    },
    [readOnly, tool],
  );

  // ── Drag a single connector vertex ────────────────
  const startVertexDrag = useCallback(
    (e: React.PointerEvent, el: DiagramElement, pointIndex: number) => {
      e.stopPropagation();
      e.preventDefault();
      if (readOnly) return;
      setSelectedId(el.id);
      const pts = resolveConnectorPoints(el, elementsRef.current);
      dragRef.current = {
        mode: 'point',
        id: el.id,
        startClient: { x: e.clientX, y: e.clientY },
        startEl: getBBox(el),
        startPoints: pts,
        pointIndex,
        baked: false,
        moved: false,
      };
      dragStartElementsRef.current = elementsRef.current;
      draggingRef.current = true;
    },
    [readOnly],
  );

  // ── Drag a connector midpoint → insert a bend point ──
  const startMidpointDrag = useCallback(
    (e: React.PointerEvent, el: DiagramElement, insertIndex: number) => {
      e.stopPropagation();
      e.preventDefault();
      if (readOnly) return;
      setSelectedId(el.id);
      const pts = resolveConnectorPoints(el, elementsRef.current);
      dragRef.current = {
        mode: 'point',
        id: el.id,
        startClient: { x: e.clientX, y: e.clientY },
        startEl: getBBox(el),
        startPoints: pts,
        insertIndex,
        baked: false,
        inserted: false,
        moved: false,
      };
      dragStartElementsRef.current = elementsRef.current;
      draggingRef.current = true;
    },
    [readOnly],
  );

  // ── Slide a cardinality marker along the connector ──
  const startMarkerDrag = useCallback(
    (e: React.PointerEvent, el: DiagramElement, field: 'sourceMarkerPos' | 'targetMarkerPos') => {
      e.stopPropagation();
      e.preventDefault();
      if (readOnly) return;
      setSelectedId(el.id);
      dragRef.current = {
        mode: 'marker',
        id: el.id,
        startClient: { x: e.clientX, y: e.clientY },
        startEl: getBBox(el),
        markerField: field,
        moved: false,
      };
      dragStartElementsRef.current = elementsRef.current;
      draggingRef.current = true;
    },
    [readOnly],
  );

  // ── Complete a connector (shared by click + drag) ──
  const finishConnector = useCallback(
    (target?: DiagramElement) => {
      const src = pendingSourceRef.current;
      if (!src) return;
      const srcEl = elementsRef.current.find((e) => e.id === src.id);
      const validTarget =
        target && target.id !== src.id && target.type !== 'arrow' && target.type !== 'line';
      let next: DiagramElement | null = null;
      if (validTarget) {
        next = {
          id: genId(),
          type: 'arrow',
          x: 0,
          y: 0,
          sourceId: src.id,
          targetId: target!.id,
          color: '#475569',
        };
      } else if (previewPointRef.current && srcEl) {
        // Dropped on empty canvas → connector to that point. Only create it
        // when the pointer actually left the source shape (i.e. a real drag),
        // so a simple click keeps the pending source for click-click mode.
        const srcCenter = getCenter(srcEl);
        const dist = distance(srcCenter, previewPointRef.current);
        const nearSource = dist < Math.max(srcEl.width ?? 60, srcEl.height ?? 60);
        if (!nearSource) {
          next = {
            id: genId(),
            type: 'arrow',
            x: 0,
            y: 0,
            sourceId: src.id,
            points: [previewPointRef.current],
            color: '#475569',
          };
        }
      }
      if (next) {
        commit([...elementsRef.current, next]);
        setSelectedId(next.id);
      }
      // In click-click mode the first click keeps the pending source so the
      // next click on another shape completes the connector.
      if (next) {
        setPendingSource(null);
        setPendingFreeStart(null);
        setPreviewPoint(null);
      }
    },
    [commit],
  );

  const previewPointRef = useRef(previewPoint);
  previewPointRef.current = previewPoint;

  // ── Canvas pointer down ────────────────────────────
  const handleCanvasPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (readOnly) return;
      const logical = toLogical(e.clientX, e.clientY);
      const hit = hitTest(logical);

      if (tool === 'arrow') {
        if (!hit) {
          if (pendingSourceRef.current) {
            // Click empty canvas with a pending source → free-end connector
            const srcEl = elementsRef.current.find((x) => x.id === pendingSourceRef.current!.id);
            if (srcEl) {
              const next: DiagramElement = {
                id: genId(),
                type: 'arrow',
                x: 0,
                y: 0,
                sourceId: srcEl.id,
                points: [{ x: snap(logical.x), y: snap(logical.y) }],
                color: '#475569',
              };
              commit([...elementsRef.current, next]);
              setSelectedId(next.id);
            }
            setPendingSource(null);
            setPreviewPoint(null);
            return;
          }
          if (pendingFreeStart) {
            const next: DiagramElement = {
              id: genId(),
              type: 'arrow',
              x: Math.min(pendingFreeStart.x, logical.x),
              y: Math.min(pendingFreeStart.y, logical.y),
              points: [pendingFreeStart, { x: snap(logical.x), y: snap(logical.y) }],
              color: '#475569',
            };
            commit([...elementsRef.current, next]);
            setSelectedId(next.id);
            setPendingFreeStart(null);
            setPreviewPoint(null);
          } else {
            setPendingFreeStart({ x: snap(logical.x), y: snap(logical.y) });
          }
          return;
        }
        // Click on a shape while connector tool is active
        if (hit.type !== 'arrow' && hit.type !== 'line') {
          if (pendingSourceRef.current && pendingSourceRef.current.id !== hit.id) {
            finishConnector(hit);
          } else if (!pendingSourceRef.current) {
            setPendingSource({ id: hit.id });
            connectorDraggingRef.current = true;
            setPreviewPoint(logical);
          }
        }
        return;
      }

      // Shape tool → place on empty canvas
      if (tool !== 'select') {
        if (hit) {
          setSelectedId(hit.id);
          return;
        }
        placePaletteItem(tool, logical.x, logical.y);
        return;
      }

      // Select tool
      if (hit) {
        setSelectedId(hit.id);
        if (hit.type !== 'arrow' && hit.type !== 'line') {
          dragRef.current = {
            mode: 'move',
            id: hit.id,
            startClient: { x: e.clientX, y: e.clientY },
            startEl: getBBox(hit),
          };
          dragStartElementsRef.current = elementsRef.current;
          draggingRef.current = true;
        } else {
          startConnectorDrag(e, hit);
        }
      } else {
        setSelectedId(null);
        setPendingSource(null);
        setPendingFreeStart(null);
      }
    },
    [readOnly, toLogical, hitTest, tool, pendingFreeStart, placePaletteItem, commit, finishConnector, snap, startConnectorDrag],
  );

  // ── Move / resize / connector preview (window-level) ──
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const logical = toLogical(e.clientX, e.clientY);
      const drag = dragRef.current;

      if (!drag) {
        if ((pendingSourceRef.current || pendingFreeStart) && !readOnly) {
          setPreviewPoint({ x: snap(logical.x), y: snap(logical.y) });
        }
        return;
      }

      const dx = (e.clientX - drag.startClient.x) / zoom;
      const dy = (e.clientY - drag.startClient.y) / zoom;
      drag.moved = true;

      if (drag.mode === 'marker') {
        // Slide a cardinality marker: snap its normalized position (0..1)
        // along the connector polyline to the nearest point under the pointer.
        const el = elementsRef.current.find((x) => x.id === drag.id);
        if (el) {
          const pts = resolveConnectorPoints(el, elementsRef.current);
          const t = Math.max(0, Math.min(1, nearestTOnPolyline(pts, logical)));
          const field = drag.markerField!;
          const next = elementsRef.current.map((x) =>
            x.id === drag.id ? { ...x, [field]: Math.round(t * 100) / 100 } : x,
          );
          elementsRef.current = next;
          setElements(next);
        }
        return;
      }

      if (drag.mode === 'connector' || drag.mode === 'point') {
        // First real movement: bake an attached connector (sourceId/targetId)
        // into a free polyline so the user's edit sticks instead of being
        // recomputed from the shapes. For midpoint drags, insert the bend
        // point once, then treat the new vertex as the dragged point.
        if (!drag.baked) {
          const el = elementsRef.current.find((x) => x.id === drag.id);
          if (el && (el.sourceId || el.targetId)) {
            drag.startPoints = resolveConnectorPoints(el, elementsRef.current);
          }
          drag.baked = true;
        }
        let pts = drag.startPoints ?? [];
        let pointIndex = drag.pointIndex;
        if (drag.mode === 'point' && drag.insertIndex != null && !drag.inserted) {
          const a = pts[drag.insertIndex];
          const b = pts[drag.insertIndex + 1];
          if (a && b) {
            const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
            pts = [...pts.slice(0, drag.insertIndex + 1), mid, ...pts.slice(drag.insertIndex + 1)];
            pointIndex = drag.insertIndex + 1;
            drag.startPoints = pts;
            // Persist the inserted point's index so later pointermove events
            // keep dragging the bend instead of losing track of it.
            drag.pointIndex = pointIndex;
            drag.inserted = true;
          }
        }

        setElements((prev) => {
          const next = prev.map((el) => {
            if (el.id !== drag.id) return el;
            if (drag.mode === 'connector') {
              // Whole connector: translate every point by the drag delta.
              return {
                ...el,
                sourceId: undefined,
                targetId: undefined,
                points: pts.map((p) => ({ x: snap(p.x + dx), y: snap(p.y + dy) })),
              };
            }
            // Single vertex: move only the dragged point.
            return {
              ...el,
              sourceId: undefined,
              targetId: undefined,
              points: pts.map((p, i) =>
                i === pointIndex ? { x: snap(p.x + dx), y: snap(p.y + dy) } : p,
              ),
            };
          });
          elementsRef.current = next;
          return next;
        });
        return;
      }

      setElements((prev) => {
        const next = prev.map((el) => {
          if (el.id !== drag.id) return el;
          if (drag.mode === 'move') {
            return {
              ...el,
              x: snap(drag.startEl.x + dx),
              y: snap(drag.startEl.y + dy),
            };
          }
          // Resize (handles labelled t/b/l/r/tl/tr/bl/br)
          const h = drag.handle!;
          let { x, y, w, h: hh } = drag.startEl;
          if (h.includes('r')) w = Math.max(30, drag.startEl.w + dx);
          if (h.includes('b')) hh = Math.max(24, drag.startEl.h + dy);
          if (h.includes('l')) {
            w = Math.max(30, drag.startEl.w - dx);
            x = drag.startEl.x + (drag.startEl.w - w);
          }
          if (h.includes('t')) {
            hh = Math.max(24, drag.startEl.h - dy);
            y = drag.startEl.y + (drag.startEl.h - hh);
          }
          return { ...el, x: Math.round(x), y: Math.round(y), width: Math.round(w), height: Math.round(hh) };
        });
        elementsRef.current = next;
        return next;
      });
    };

    const onUp = (e: PointerEvent) => {
      const drag = dragRef.current;
      dragRef.current = null;
      draggingRef.current = false;

      if (drag) {
        // Only record history when the pointer actually moved — a plain click
        // on a shape/connector (to select it) is not an edit.
        if (drag.moved) {
          commit(elementsRef.current, dragStartElementsRef.current);
        }
        setPreviewPoint(null);
        return;
      }

      // Connector drag release (always reset the flag, even on no-op)
      if (connectorDraggingRef.current) {
        connectorDraggingRef.current = false;
        if (pendingSourceRef.current) {
          const logical = toLogical(e.clientX, e.clientY);
          const hit = hitTest(logical);
          finishConnector(hit ?? undefined);
        }
      }
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [zoom, snap, commit, readOnly, pendingFreeStart, toLogical, hitTest, finishConnector]);

  // ── Start resize from a handle ─────────────────────
  const startResize = useCallback(
    (e: React.PointerEvent, id: string, handle: string) => {
      e.stopPropagation();
      e.preventDefault();
      if (readOnly) return;
      const el = elementsRef.current.find((x) => x.id === id);
      if (!el) return;
      dragRef.current = {
        mode: 'resize',
        id,
        handle,
        startClient: { x: e.clientX, y: e.clientY },
        startEl: getBBox(el),
      };
      dragStartElementsRef.current = elementsRef.current;
      draggingRef.current = true;
    },
    [readOnly],
  );

  // ── Shape pointer down ─────────────────────────────
  const handleShapePointerDown = useCallback(
    (e: React.PointerEvent, el: DiagramElement) => {
      e.stopPropagation();
      if (readOnly) return;

      if (tool === 'arrow') {
        if (pendingSourceRef.current && pendingSourceRef.current.id !== el.id) {
          finishConnector(el);
        } else if (!pendingSourceRef.current) {
          setPendingSource({ id: el.id });
          connectorDraggingRef.current = true;
          setPreviewPoint(toLogical(e.clientX, e.clientY));
        }
        return;
      }

      if (tool !== 'select') {
        setSelectedId(el.id);
        return;
      }

      setSelectedId(el.id);
      dragRef.current = {
        mode: 'move',
        id: el.id,
        startClient: { x: e.clientX, y: e.clientY },
        startEl: getBBox(el),
      };
      dragStartElementsRef.current = elementsRef.current;
      draggingRef.current = true;
    },
    [readOnly, tool, toLogical, finishConnector],
  );

  // ── Delete / duplicate / clear ─────────────────────
  const deleteSelected = useCallback(() => {
    if (readOnly) return;
    const id = selectedId;
    if (!id) return;
    // Remove the element AND any connectors attached to it — a detached
    // connector would otherwise linger as an invisible orphan.
    const next = elementsRef.current.filter(
      (el) => el.id !== id && el.sourceId !== id && el.targetId !== id,
    );
    commit(next);
    setSelectedId(null);
    setEditing(null);
  }, [readOnly, selectedId, commit]);

  const duplicateSelected = useCallback(() => {
    if (readOnly) return;
    const id = selectedId;
    const el = elementsRef.current.find((e) => e.id === id);
    if (!el || el.type === 'arrow' || el.type === 'line') return;
    const copy: DiagramElement = {
      ...el,
      id: genId(),
      x: el.x + 24,
      y: el.y + 24,
    };
    commit([...elementsRef.current, copy]);
    setSelectedId(copy.id);
  }, [readOnly, selectedId, commit]);

  const clearAll = useCallback(() => {
    if (readOnly) return;
    if (elementsRef.current.length === 0) return;
    if (window.confirm('Clear the entire diagram?')) {
      commit([]);
      setSelectedId(null);
      setEditing(null);
      setPendingSource(null);
      setPendingFreeStart(null);
    }
  }, [readOnly, commit]);

  // ── Text editing ───────────────────────────────────
  const commitText = useCallback(
    (id: string, text: string) => {
      const next = elementsRef.current.map((el) => (el.id === id ? { ...el, text } : el));
      commit(next);
      setEditing(null);
    },
    [commit],
  );

  // ── Color change for the selected element ──────────
  const setColor = useCallback(
    (color: string) => {
      if (!selectedId || readOnly) return;
      const next = elementsRef.current.map((el) => (el.id === selectedId ? { ...el, color } : el));
      commit(next);
    },
    [selectedId, readOnly, commit],
  );

  // ── Crow's foot marker / line style for connectors ──
  const setConnectorMarker = useCallback(
    (field: 'sourceMarker' | 'targetMarker', marker: ConnectorMarker) => {
      if (!selectedId || readOnly) return;
      const next = elementsRef.current.map((el) =>
        el.id === selectedId && (el.type === 'arrow' || el.type === 'line')
          ? { ...el, [field]: marker }
          : el,
      );
      commit(next);
    },
    [selectedId, readOnly, commit],
  );

  const toggleLineStyle = useCallback(() => {
    if (!selectedId || readOnly) return;
    const next = elementsRef.current.map((el) =>
      el.id === selectedId && (el.type === 'arrow' || el.type === 'line')
        ? { ...el, lineStyle: el.lineStyle === 'dashed' ? 'solid' as const : 'dashed' as const }
        : el,
    );
    commit(next);
  }, [selectedId, readOnly, commit]);

  // ── Keyboard shortcuts ─────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (readOnly) return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT' || target.isContentEditable) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        duplicateSelected();
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (!selectedId) return;
        e.preventDefault();
        deleteSelected();
        return;
      }
      if (e.key === 'Escape') {
        setTool('select');
        setPendingSource(null);
        setPendingFreeStart(null);
        setPreviewPoint(null);
        setEditing(null);
        setSelectedId(null);
      }
      // Arrow-key nudge
      const step = e.shiftKey ? 20 : 5;
      if (selectedId && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        const next = elementsRef.current.map((el) =>
          el.id === selectedId ? { ...el, x: el.x + dx, y: el.y + dy } : el,
        );
        commit(next);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [readOnly, undo, redo, duplicateSelected, deleteSelected, selectedId, commit]);

  // ── Zoom helpers ───────────────────────────────────
  const fitToContent = useCallback(() => {
    const list = elementsRef.current;
    if (list.length === 0) {
      setZoom(1);
      return;
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const el of list) {
      const pts = resolveConnectorPoints(el, list);
      if (pts.length >= 2) {
        for (const p of pts) {
          minX = Math.min(minX, p.x);
          minY = Math.min(minY, p.y);
          maxX = Math.max(maxX, p.x);
          maxY = Math.max(maxY, p.y);
        }
      } else {
        const { x, y, w, h } = getBBox(el);
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + w);
        maxY = Math.max(maxY, y + h);
      }
    }
    const w = Math.max(maxX - minX, 200);
    const h = Math.max(maxY - minY, 200);
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.min(1000 / w, 700 / h)));
    setZoom(Math.round(next * 100) / 100);
  }, []);

  // ── Export ─────────────────────────────────────────
  const exportSvg = useCallback(() => {
    const body = renderSvgBody(elementsRef.current, gridPatternId, markerIds, gridOn);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_W}" height="${CANVAS_H}" viewBox="0 0 ${CANVAS_W} ${CANVAS_H}">
<rect width="${CANVAS_W}" height="${CANVAS_H}" fill="#ffffff"/>
${body}
</svg>`;
    downloadBlob(svg, 'diagram.svg', 'image/svg+xml');
  }, [gridPatternId, markerIds, gridOn]);

  const exportPng = useCallback(async () => {
    const body = renderSvgBody(elementsRef.current, gridPatternId, markerIds, gridOn);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_W}" height="${CANVAS_H}" viewBox="0 0 ${CANVAS_W} ${CANVAS_H}">
<rect width="${CANVAS_W}" height="${CANVAS_H}" fill="#ffffff"/>
${body}
</svg>`;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = CANVAS_W;
      canvas.height = CANVAS_H;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob((png) => {
        if (png) downloadBlob(png, 'diagram.png', 'image/png');
      });
    };
    img.src = url;
  }, [gridPatternId, markerIds, gridOn]);

  const exportJson = useCallback(() => {
    const json = JSON.stringify(elementsRef.current, null, 2);
    downloadBlob(json, 'diagram.json', 'application/json');
  }, []);

  // ── Save design for future use ────────────────────
  // Stores a named copy of the current canvas in the browser so the candidate
  // can load it back into any design canvas later (e.g. reuse a UI mockup).
  const saveCurrentDesign = useCallback(() => {
    const name = saveName.trim() || `Design ${new Date().toLocaleDateString()}`;
    const design: SavedDesign = {
      id: genId(),
      name,
      diagramType,
      elements: elementsRef.current,
      savedAt: Date.now(),
    };
    const next = [design, ...savedDesigns.filter((d) => d.id !== design.id)];
    writeSavedDesigns(next);
    setSavedDesigns(next);
    setSaveName('');
    setSaveOpen(false);
    onSavedDesignsChangeRef.current?.(next);
  }, [saveName, diagramType, savedDesigns]);

  const loadSavedDesign = useCallback(
    (design: SavedDesign) => {
      setLibraryOpen(false);
      // Replacing the canvas goes through commit() so Undo restores the
      // previous drawing.
      commit(design.elements);
    },
    [commit],
  );

  const deleteSavedDesign = useCallback(
    (id: string) => {
      const next = savedDesigns.filter((d) => d.id !== id);
      writeSavedDesigns(next);
      setSavedDesigns(next);
      onSavedDesignsChangeRef.current?.(next);
    },
    [savedDesigns],
  );

  function downloadBlob(data: BlobPart, name: string, type: string) {
    const blob = data instanceof Blob ? data : new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  const selected = elements.find((el) => el.id === selectedId) ?? null;
  const selectedConnector = !!selected && (selected.type === 'arrow' || selected.type === 'line');

  const toolItem = palette.find((p) => p.key === tool);

  // ── Tool switching helper (clears any in-flight connector state) ──
  const switchTool = useCallback((nextTool: string) => {
    setTool(nextTool);
    setPendingSource(null);
    setPendingFreeStart(null);
    setPreviewPoint(null);
    connectorDraggingRef.current = false;
  }, []);

  // ── Render ─────────────────────────────────────────
  return (
    <div className="flex h-full min-h-[460px] flex-col overflow-hidden rounded-xl border border-border bg-white">
      {/* ── Toolbar ─────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-border bg-surface-secondary px-2.5 py-1.5">
        <div className="flex items-center gap-1">
          <span className="mr-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
            {KIND_LABELS[diagramType]}
          </span>
          <ToolButton
            active={tool === 'select'}
            onClick={() => switchTool('select')}
            title="Select & move (V)"
            icon={<MousePointer2 className="h-3.5 w-3.5" />}
            label="Select"
            disabled={readOnly}
          />
          {!readOnly && (
            <ToolButton
              active={tool === 'arrow'}
              onClick={() => switchTool('arrow')}
              title="Draw connectors — click a shape, then click another (or drag)"
              icon={<MoveRight className="h-3.5 w-3.5" />}
              label="Connector"
            />
          )}
        </div>

        <div className="mx-1 h-4 w-px bg-border" />

        {/* History */}
        <div className="flex items-center gap-0.5">
          <ToolButton
            onClick={undo}
            title="Undo (Ctrl+Z)"
            icon={<Undo2 className="h-3.5 w-3.5" />}
            disabled={readOnly || past.length === 0}
          />
          <ToolButton
            onClick={redo}
            title="Redo (Ctrl+Shift+Z)"
            icon={<Redo2 className="h-3.5 w-3.5" />}
            disabled={readOnly || future.length === 0}
          />
        </div>

        <div className="mx-1 h-4 w-px bg-border" />

        {/* Edit actions */}
        <div className="flex items-center gap-0.5">
          <ToolButton
            onClick={duplicateSelected}
            title="Duplicate selection (Ctrl+D)"
            icon={<Copy className="h-3.5 w-3.5" />}
            disabled={readOnly || !selected || selectedConnector}
          />
          <ToolButton
            onClick={deleteSelected}
            title="Delete selection (Del)"
            icon={<Trash2 className="h-3.5 w-3.5" />}
            danger
            disabled={readOnly || !selected}
          />
          <ToolButton
            onClick={clearAll}
            title="Clear diagram"
            icon={<Eraser className="h-3.5 w-3.5" />}
            danger
            disabled={readOnly || elements.length === 0}
          />
        </div>

        {/* Color swatches for the selected shape */}
        {selected && !selectedConnector && !readOnly && (
          <div className="flex items-center gap-1">
            <div className="mx-1 h-4 w-px bg-border" />
            {COLOR_SWATCHES.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                title={`Stroke color ${c}`}
                className={cn(
                  'h-4 w-4 rounded-full border transition-transform hover:scale-110',
                  selected.color === c ? 'border-text-primary ring-2 ring-primary-300' : 'border-border',
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        )}

        {/* Crow's foot properties for the selected connector */}
        {selectedConnector && !readOnly && (
          <div className="flex items-center gap-1.5">
            <div className="mx-1 h-4 w-px bg-border" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
              Cardinality
            </span>
            <span className="text-[10px] text-text-tertiary">start</span>
            {MARKER_CHOICES.map((m) => (
              <MarkerButton
                key={m}
                marker={m}
                active={(selected.sourceMarker ?? 'none') === m}
                onClick={() => setConnectorMarker('sourceMarker', m)}
              />
            ))}
            <div className="mx-0.5 h-4 w-px bg-border" />
            <span className="text-[10px] text-text-tertiary">end</span>
            {MARKER_CHOICES.map((m) => (
              <MarkerButton
                key={m}
                marker={m}
                active={(selected.targetMarker ?? defaultTargetMarker(selected.type)) === m}
                onClick={() => setConnectorMarker('targetMarker', m)}
              />
            ))}
            <div className="mx-0.5 h-4 w-px bg-border" />
            <ToolButton
              onClick={toggleLineStyle}
              title="Toggle identifying (solid) / non-identifying (dashed)"
              icon={<DashedLineIcon />}
              label={selected.lineStyle === 'dashed' ? 'Non-identifying' : 'Identifying'}
              active={selected.lineStyle === 'dashed'}
            />
          </div>
        )}

        <div className="ml-auto flex items-center gap-0.5">
          {/* Grid & snap */}
          <ToolButton
            onClick={() => setGridOn((g) => !g)}
            title="Toggle grid"
            icon={<Grid3x3 className="h-3.5 w-3.5" />}
            active={gridOn}
            disabled={readOnly}
          />
          <ToolButton
            onClick={() => setSnapOn((s) => !s)}
            title="Snap to grid"
            icon={<Magnet className="h-3.5 w-3.5" />}
            active={snapOn}
            disabled={readOnly}
          />
          <div className="mx-1 h-4 w-px bg-border" />
          {/* Zoom */}
          <ToolButton
            onClick={() => setZoom((z) => Math.max(MIN_ZOOM, Math.round((z - 0.1) * 100) / 100))}
            title="Zoom out"
            icon={<ZoomOut className="h-3.5 w-3.5" />}
          />
          <span className="w-12 text-center text-[11px] tabular-nums text-text-secondary">
            {Math.round(zoom * 100)}%
          </span>
          <ToolButton
            onClick={() => setZoom((z) => Math.min(MAX_ZOOM, Math.round((z + 0.1) * 100) / 100))}
            title="Zoom in"
            icon={<ZoomIn className="h-3.5 w-3.5" />}
          />
          <ToolButton
            onClick={fitToContent}
            title="Fit to content"
            icon={<Maximize className="h-3.5 w-3.5" />}
          />
          <div className="mx-1 h-4 w-px bg-border" />
          {/* Save for later */}
          {!readOnly && (
            <>
              <ToolButton
                onClick={() => setSaveOpen(true)}
                title="Save this design for future use"
                icon={<Save className="h-3.5 w-3.5" />}
                label="Save"
              />
              <ToolButton
                onClick={() => {
                  // Re-read the library so designs saved in another tab appear
                  setSavedDesigns(readSavedDesigns());
                  setLibraryOpen(true);
                }}
                title="Open your saved designs"
                icon={<FolderOpen className="h-3.5 w-3.5" />}
                label="Saved"
              />
              {draftSavedAt !== null && (
                <span
                  className="flex items-center gap-1 pl-1 text-[10px] text-text-tertiary"
                  title="Autosaved draft — restored automatically if this canvas is opened empty"
                >
                  <Clock className="h-3 w-3" />
                  Draft saved {new Date(draftSavedAt).toLocaleTimeString()}
                </span>
              )}
            </>
          )}
          <div className="mx-1 h-4 w-px bg-border" />
          {/* Export */}
          <ToolButton
            onClick={exportSvg}
            title="Export as SVG"
            icon={<Download className="h-3.5 w-3.5" />}
          />
          <ToolButton
            onClick={exportPng}
            title="Export as PNG"
            icon={<ImageIcon className="h-3.5 w-3.5" />}
          />
          <ToolButton
            onClick={exportJson}
            title="Export diagram data (JSON)"
            icon={<FileJson className="h-3.5 w-3.5" />}
          />
        </div>
      </div>

      {/* ── Body: palette + canvas ────────────────── */}
      <div className="flex min-h-0 flex-1">
        {/* Shape palette */}
        {!readOnly && (
          <div className="flex w-[148px] shrink-0 flex-col overflow-y-auto border-r border-border bg-surface-secondary/60">
            <div className="border-b border-border px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
                {KIND_LABELS[diagramType]}
              </p>
              <p className="mt-0.5 text-[10px] leading-snug text-text-tertiary">
                Click a shape, then click the canvas to place it.
              </p>
            </div>
            <div className="flex flex-col gap-1.5 p-2">
              {palette.map((item) => (
                <PaletteButton
                  key={item.key}
                  item={item}
                  active={tool === item.key}
                  onClick={() => {
                    if (tool === item.key) switchTool('select');
                    else switchTool(item.key);
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Canvas */}
        <div className="relative min-w-0 flex-1 overflow-auto bg-surface-primary">
          <div
            ref={canvasRef}
            className="relative"
            style={{
              width: CANVAS_W * zoom,
              height: CANVAS_H * zoom,
            }}
            onPointerDown={handleCanvasPointerDown}
          >
            <div
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: 'top left',
              }}
            >
              <svg
                width={CANVAS_W}
                height={CANVAS_H}
                className="block bg-white"
              >
                <defs>
                  {(Object.keys(MARKER_GEOMETRY) as Array<Exclude<ConnectorMarker, 'none'>>).map((kind) => (
                    <marker
                      key={kind}
                      id={markerIds[kind]}
                      viewBox="0 0 24 24"
                      refX={MARKER_GEOMETRY[kind].refX}
                      refY="12"
                      markerWidth="11"
                      markerHeight="11"
                      orient="auto-start-reverse"
                    >
                      <g dangerouslySetInnerHTML={{ __html: MARKER_GEOMETRY[kind].inner }} />
                    </marker>
                  ))}
                </defs>

                {/* Grid dots */}
                {gridOn && (
                  <pattern id={gridPatternId} width={GRID_SIZE} height={GRID_SIZE} patternUnits="userSpaceOnUse">
                    <circle cx={1} cy={1} r={0.8} fill="#cbd5e1" />
                  </pattern>
                )}
                <rect width={CANVAS_W} height={CANVAS_H} fill={gridOn ? `url(#${gridPatternId})` : 'none'} />

                {/* Preview connector while drawing */}
                {!readOnly && (
                  <PreviewConnector
                    pendingSource={pendingSource}
                    pendingFreeStart={pendingFreeStart}
                    previewPoint={previewPoint}
                    elements={elements}
                    arrowMarkerId={arrowMarkerId}
                  />
                )}

                {/* Elements (connectors under shapes) */}
                {elements
                  .filter((el) => el.type === 'arrow' || el.type === 'line')
                  .map((el) => (
                    <ConnectorShape
                      key={el.id}
                      el={el}
                      elements={elements}
                      selected={el.id === selectedId}
                      markerIds={markerIds}
                      readOnly={readOnly}
                      onPointerDown={startConnectorDrag}
                      onVertexPointerDown={startVertexDrag}
                      onMidpointPointerDown={startMidpointDrag}
                      onMarkerPointerDown={startMarkerDrag}
                    />
                  ))}

                {elements
                  .filter((el) => el.type !== 'arrow' && el.type !== 'line')
                  .map((el) => (
                    <ShapeShape
                      key={el.id}
                      el={el}
                      selected={el.id === selectedId}
                      readOnly={readOnly}
                      onPointerDown={handleShapePointerDown}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        if (!readOnly) setEditing({ id: el.id, text: el.text ?? '' });
                      }}
                      onResizeStart={startResize}
                    />
                  ))}
              </svg>

              {/* Inline text editor overlay */}
              {editing && !readOnly && (
                <InlineTextEditor
                  el={elements.find((e) => e.id === editing.id)}
                  initialText={editing.text}
                  onCommit={(text) => commitText(editing.id, text)}
                  onCancel={() => setEditing(null)}
                />
              )}
            </div>
          </div>

          {/* Hint bar */}
          {!readOnly && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-center justify-between bg-white/85 px-3 py-1.5 backdrop-blur-sm">
              <p className="text-[10px] text-text-tertiary">
                {toolItem ? (
                  <>
                    <span className="font-medium text-text-secondary">{toolItem.label}</span> —{' '}
                    {tool === 'arrow' ? (
                      <>click a shape, then another shape to connect them (or drag).</>
                    ) : (
                      <>click the canvas to place it. Double-click a shape to edit its text.</>
                    )}
                  </>
                ) : (
                  <>
                    <span className="font-medium text-text-secondary">{KIND_HINTS[diagramType]}</span> Double-click to
                    edit text · Drag shapes/connectors to move · Drag vertex/midpoint handles to reshape
                    connectors · Drag the purple dots to slide cardinalities along a line.
                  </>
                )}
              </p>
              <p className="text-[10px] text-text-tertiary">
                {elements.length} element{elements.length === 1 ? '' : 's'} · {Math.round(zoom * 100)}%
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Save-design modal ─────────────────────── */}
      <Modal
        isOpen={saveOpen}
        onClose={() => setSaveOpen(false)}
        title="Save design for future use"
        description="Keep a named copy of this canvas in your browser — you can load it back into any design canvas later."
        size="sm"
      >
        <div className="flex flex-col gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-text-secondary">Design name</span>
            <input
              autoFocus
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveCurrentDesign();
              }}
              placeholder={`${KIND_LABELS[diagramType]} design`}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-tertiary focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            />
          </label>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setSaveOpen(false)}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-tertiary"
            >
              Cancel
            </button>
            <button
              onClick={saveCurrentDesign}
              className="flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
            >
              <Save className="h-3.5 w-3.5" />
              Save design
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Saved-designs library modal ────────────── */}
      <Modal
        isOpen={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        title="Saved designs"
        description="Designs you saved for future use — load one into this canvas or delete it."
        size="sm"
      >
        {savedDesigns.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <FolderOpen className="h-8 w-8 text-text-tertiary" />
            <p className="text-sm text-text-tertiary">
              No saved designs yet. Use the <span className="font-medium text-text-secondary">Save</span> button to
              keep a design for later.
            </p>
          </div>
        ) : (
          <ul className="flex max-h-[50vh] flex-col gap-2 overflow-y-auto pr-1">
            {savedDesigns.map((design) => (
              <li
                key={design.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-secondary/50 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text-primary">{design.name}</p>
                  <p className="text-[11px] text-text-tertiary">
                    {KIND_LABELS[design.diagramType]} · {new Date(design.savedAt).toLocaleString()} ·{' '}
                    {design.elements.length} element{design.elements.length === 1 ? '' : 's'}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => loadSavedDesign(design)}
                    title="Load this design into the canvas"
                    className="rounded-md px-2 py-1 text-[11px] font-medium text-primary-700 transition-colors hover:bg-primary-50"
                  >
                    Load
                  </button>
                  <button
                    onClick={() => deleteSavedDesign(design.id)}
                    title="Delete this saved design"
                    className="flex h-6 w-6 items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-red-50 hover:text-error"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────

// Mini SVG preview of a crow's foot marker (drawn as a horizontal line with
// the marker glyph at the right end).
function MarkerGlyph({ marker }: { marker: ConnectorMarker }) {
  const color = '#475569';
  if (marker === 'none') {
    return (
      <svg width="22" height="12" viewBox="0 0 22 12">
        <line x1="0" y1="6" x2="22" y2="6" stroke={color} strokeWidth="1.6" />
      </svg>
    );
  }
  const geo = MARKER_GEOMETRY[marker];
  return (
    <svg width="22" height="12" viewBox="0 0 22 12">
      <line x1="0" y1="6" x2="12" y2="6" stroke={color} strokeWidth="1.6" />
      <g
        transform={`translate(${12 - (geo.refX * 11) / 24} ${6 - 5.5}) scale(${11 / 24})`}
        dangerouslySetInnerHTML={{ __html: geo.inner }}
      />
    </svg>
  );
}

function MarkerButton({
  marker,
  active,
  onClick,
}: {
  marker: ConnectorMarker;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={MARKER_LABELS[marker]}
      className={cn(
        'flex h-6 items-center justify-center rounded-md border px-1 transition-colors',
        active
          ? 'border-primary-400 bg-primary-50 ring-1 ring-primary-200'
          : 'border-transparent hover:bg-surface-tertiary',
      )}
    >
      <MarkerGlyph marker={marker} />
    </button>
  );
}

function DashedLineIcon() {
  return (
    <svg width="14" height="10" viewBox="0 0 14 10">
      <line x1="1" y1="5" x2="13" y2="5" stroke="currentColor" strokeWidth="2" strokeDasharray="3 2.5" />
    </svg>
  );
}

function ToolButton({
  onClick,
  icon,
  title,
  label,
  active,
  danger,
  disabled,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  title?: string;
  label?: string;
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={cn(
        'flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-medium transition-colors',
        active
          ? 'bg-primary-100 text-primary-700'
          : danger
            ? 'text-text-secondary hover:bg-red-50 hover:text-error'
            : 'text-text-secondary hover:bg-surface-tertiary hover:text-text-primary',
        disabled && 'cursor-not-allowed opacity-35 hover:bg-transparent hover:text-text-secondary',
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function PaletteButton({
  item,
  active,
  onClick,
}: {
  item: PaletteItem;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition-all',
        active
          ? 'border-primary-400 bg-primary-50 shadow-sm ring-1 ring-primary-200'
          : 'border-border bg-white hover:border-primary-200 hover:shadow-sm',
      )}
    >
      <span className="flex h-6 w-8 shrink-0 items-center justify-center">
        <PaletteIcon item={item} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[11px] font-medium text-text-primary">{item.label}</span>
        <span className="block text-[9px] uppercase tracking-wide text-text-tertiary">{item.variant}</span>
      </span>
    </button>
  );
}

function PaletteIcon({ item }: { item: PaletteItem }) {
  const color = '#6366f1';
  const common = { fill: `${color}18`, stroke: color, strokeWidth: 1.5 };
  if (item.variant === 'connector') {
    return (
      <svg width="26" height="20" viewBox="0 0 26 20">
        <line x1="2" y1="15" x2="18" y2="6" {...common} />
        <path d="M 12 4 L 21 3.5 L 19 11 z" {...common} fill={color} />
      </svg>
    );
  }
  if (item.variant === 'label') {
    return (
      <svg width="26" height="20" viewBox="0 0 26 20">
        <text x="13" y="14" textAnchor="middle" fontSize="11" fontWeight="600" fill="#334155">
          Aa
        </text>
      </svg>
    );
  }
  return (
    <svg width="26" height="20" viewBox="0 0 26 20">
      <rect x="2" y="3" width="22" height="14" rx="2" {...common} />
    </svg>
  );
}

// ── Shape renderer (SVG element bodies) ──────────────
function ShapeShape({
  el,
  selected,
  readOnly,
  onPointerDown,
  onDoubleClick,
  onResizeStart,
}: {
  el: DiagramElement;
  selected: boolean;
  readOnly: boolean;
  onPointerDown: (e: React.PointerEvent, el: DiagramElement) => void;
  onDoubleClick: (e: React.MouseEvent) => void;
  onResizeStart: (e: React.PointerEvent, id: string, handle: string) => void;
}) {
  const color = el.color ?? '#6366f1';
  const fill = el.type === 'note' ? '#fef9c3' : `${color}12`;
  const w = el.width ?? 100;
  const h = el.height ?? 60;
  const fontSize = el.fontSize ?? 12;
  const { x, y } = el;

  const textLines = (el.text ?? '').split('\n');

  let body: React.ReactNode = null;
  let textX = x + w / 2;
  let textY = y + h / 2;
  let textAnchor: 'middle' | 'start' = 'middle';
  let textColor = '#334155';

  switch (el.type) {
    case 'circle':
      body = (
        <ellipse cx={x + w / 2} cy={y + h / 2} rx={w / 2} ry={h / 2} fill={fill} stroke={color} strokeWidth={1.6} />
      );
      break;
    case 'diamond':
      body = <polygon points={diamondPoints(el)} fill={fill} stroke={color} strokeWidth={1.6} />;
      break;
    case 'weak-entity':
      // Double-bordered box (Chen notation weak entity).
      body = (
        <g>
          <rect x={x} y={y} width={w} height={h} rx={5} fill={fill} stroke={color} strokeWidth={1.6} />
          <rect x={x + 4} y={y + 4} width={w - 8} height={h - 8} rx={3} fill="none" stroke={color} strokeWidth={1.2} />
        </g>
      );
      break;
    case 'identifying': {
      // Double diamond (Chen notation identifying relationship).
      const inner = {
        ...el,
        x: x + 6,
        y: y + 6,
        width: w - 12,
        height: h - 12,
      };
      body = (
        <g>
          <polygon points={diamondPoints(el)} fill={fill} stroke={color} strokeWidth={1.6} />
          <polygon points={diamondPoints(inner)} fill="none" stroke={color} strokeWidth={1.2} />
        </g>
      );
      break;
    }
    case 'parallelogram':
      body = <polygon points={parallelogramPoints(el)} fill={fill} stroke={color} strokeWidth={1.6} />;
      break;
    case 'datastore':
      body = <path d={datastorePath(el)} fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />;
      textColor = '#92400e';
      break;
    case 'terminator':
      body = (
        <rect x={x} y={y} width={w} height={h} rx={h / 2} fill={fill} stroke={color} strokeWidth={1.6} />
      );
      break;
    case 'class': {
      const headerH = Math.max(24, Math.min(36, h * 0.28));
      const lines = (el.text ?? 'ClassName').split('\n');
      const title = lines[0] ?? '';
      const members = lines.slice(1);
      body = (
        <g>
          <rect x={x} y={y} width={w} height={h} fill="#ffffff" stroke={color} strokeWidth={1.6} />
          <rect x={x} y={y} width={w} height={headerH} fill={`${color}22`} stroke="none" />
          <line x1={x} y1={y + headerH} x2={x + w} y2={y + headerH} stroke={color} strokeWidth={1.2} />
          <line
            x1={x}
            y1={y + headerH + (h - headerH) / 2}
            x2={x + w}
            y2={y + headerH + (h - headerH) / 2}
            stroke={color}
            strokeWidth={1}
            opacity={0.5}
          />
          <text x={x + w / 2} y={y + headerH / 2 + 4} textAnchor="middle" fontSize={fontSize} fontWeight="700" fill={color}>
            {title}
          </text>
          {members.map((line, i) => (
            <text key={i} x={x + 6} y={y + headerH + (h - headerH) / 4 + 4 + i * (fontSize + 3)} fontSize={fontSize - 1} fill="#334155">
              {line || ' '}
            </text>
          ))}
        </g>
      );
      break;
    }
    case 'note':
      body = <path d={notePath(el)} fill={fill} stroke={color} strokeWidth={1.4} />;
      textX = x + 8;
      textY = y + 18;
      textAnchor = 'start';
      textColor = '#713f12';
      break;
    case 'text':
      textX = x;
      textY = y + fontSize;
      textAnchor = 'start';
      textColor = color;
      break;
    case 'cloud':
      // Internet / external network — bubbly cloud outline.
      body = <path d={cloudPath(el)} fill={fill} stroke={color} strokeWidth={1.6} strokeLinejoin="round" />;
      textColor = '#0f766e';
      break;
    case 'server':
      // Server rack: rack ears, front face with LED + vent lines.
      body = (
        <g>
          <rect x={x - 5} y={y + 8} width={5} height={h - 16} rx={2} fill={color} opacity={0.5} />
          <rect x={x + w} y={y + 8} width={5} height={h - 16} rx={2} fill={color} opacity={0.5} />
          <rect x={x} y={y} width={w} height={h} rx={6} fill={fill} stroke={color} strokeWidth={1.6} />
          <line x1={x + 8} y1={y + h * 0.5} x2={x + w - 8} y2={y + h * 0.5} stroke={color} strokeWidth={1.2} opacity={0.45} />
          <line x1={x + 8} y1={y + h * 0.72} x2={x + w - 8} y2={y + h * 0.72} stroke={color} strokeWidth={1.2} opacity={0.45} />
          <circle cx={x + 16} cy={y + 18} r={3} fill="#22c55e" stroke="none" />
          <circle cx={x + 28} cy={y + 18} r={3} fill="#facc15" stroke="none" />
        </g>
      );
      break;
    case 'storyboard-frame': {
      // Film frame: sprocket holes down both edges + caption strip at the base.
      const sprocket = 6;
      const holes = 3;
      body = (
        <g>
          <rect x={x} y={y} width={w} height={h} rx={4} fill={fill} stroke={color} strokeWidth={1.6} />
          {Array.from({ length: holes }).map((_, i) => {
            const hy = y + 8 + i * ((h - 16) / holes);
            return (
              <g key={i}>
                <rect x={x + 4} y={hy} width={sprocket} height={sprocket} rx={1} fill="#ffffff" stroke={color} strokeWidth={1} />
                <rect x={x + w - 4 - sprocket} y={hy} width={sprocket} height={sprocket} rx={1} fill="#ffffff" stroke={color} strokeWidth={1} />
              </g>
            );
          })}
          <rect x={x} y={y + h - 24} width={w} height={24} fill={`${color}22`} />
        </g>
      );
      break;
    }
    case 'mobile-frame':
      // Phone screen: rounded bezel, notch, home indicator.
      body = (
        <g>
          <rect x={x} y={y} width={w} height={h} rx={16} fill={fill} stroke={color} strokeWidth={2} />
          <rect x={x + 3} y={y + 3} width={w - 6} height={h - 6} rx={13} fill="#ffffff" stroke={color} strokeWidth={1} opacity={0.9} />
          <rect x={x + w * 0.32} y={y + 4} width={w * 0.36} height={5} rx={2.5} fill={color} />
          <rect x={x + w * 0.3} y={y + h - 6} width={w * 0.4} height={4} rx={2} fill={color} opacity={0.55} />
        </g>
      );
      break;
    default:
      body = <rect x={x} y={y} width={w} height={h} rx={5} fill={fill} stroke={color} strokeWidth={1.6} />;
  }

  return (
    <g
      className="cursor-move"
      data-testid={`shape-${el.id}`}
      onPointerDown={(e) => onPointerDown(e, el)}
      onDoubleClick={onDoubleClick}
    >
      {body}
      {textLines.length === 1 ? (
        <text
          x={textX}
          y={textY + 4}
          textAnchor={textAnchor}
          fontSize={fontSize}
          fontWeight={500}
          fill={textColor}
        >
          {el.text ?? ''}
        </text>
      ) : (
        <g>
          {textLines.map((line, i) => {
            const total = textLines.length;
            const startY = textY - ((total - 1) * (fontSize + 3)) / 2;
            return (
              <text key={i} x={textX} y={startY + 4 + i * (fontSize + 3)} textAnchor={textAnchor} fontSize={fontSize} fontWeight={500} fill={textColor}>
                {line}
              </text>
            );
          })}
        </g>
      )}
      {selected && !readOnly && <SelectionOutline el={el} />}
      {selected && !readOnly && <ResizeHandles el={el} onResizeStart={onResizeStart} />}
    </g>
  );
}

function SelectionOutline({ el }: { el: DiagramElement }) {
  const { x, y, w, h } = getBBox(el);
  return (
    <rect
      x={x - 3}
      y={y - 3}
      width={w + 6}
      height={h + 6}
      rx={4}
      fill="none"
      stroke="#6366f1"
      strokeWidth={1.2}
      strokeDasharray="4 3"
      pointerEvents="none"
    />
  );
}

const RESIZE_HANDLES = ['tl', 'tr', 'bl', 'br', 't', 'b', 'l', 'r'] as const;

function ResizeHandles({
  el,
  onResizeStart,
}: {
  el: DiagramElement;
  onResizeStart: (e: React.PointerEvent, id: string, handle: string) => void;
}) {
  const { x, y, w, h } = getBBox(el);
  const pos: Record<string, { x: number; y: number; cursor: string }> = {
    tl: { x, y, cursor: 'nwse-resize' },
    tr: { x: x + w, y, cursor: 'nesw-resize' },
    bl: { x, y: y + h, cursor: 'nesw-resize' },
    br: { x: x + w, y: y + h, cursor: 'nwse-resize' },
    t: { x: x + w / 2, y, cursor: 'ns-resize' },
    b: { x: x + w / 2, y: y + h, cursor: 'ns-resize' },
    l: { x, y: y + h / 2, cursor: 'ew-resize' },
    r: { x: x + w, y: y + h / 2, cursor: 'ew-resize' },
  };
  return (
    <g>
      {RESIZE_HANDLES.map((handle) => {
        const p = pos[handle];
        if (!p) return null;
        return (
          <rect
            key={handle}
            x={p.x - 4}
            y={p.y - 4}
            width={8}
            height={8}
            rx={1.5}
            fill="#ffffff"
            stroke="#6366f1"
            strokeWidth={1.4}
            data-testid={`resize-${el.id}-${handle}`}
            style={{ cursor: p.cursor }}
            onPointerDown={(e) => onResizeStart(e, el.id, handle)}
          />
        );
      })}
    </g>
  );
}

// ── Connector renderer ───────────────────────────────
function ConnectorShape({
  el,
  elements,
  selected,
  markerIds,
  readOnly,
  onPointerDown,
  onVertexPointerDown,
  onMidpointPointerDown,
  onMarkerPointerDown,
}: {
  el: DiagramElement;
  elements: DiagramElement[];
  selected: boolean;
  markerIds: Record<Exclude<ConnectorMarker, 'none'>, string>;
  readOnly: boolean;
  onPointerDown: (e: React.PointerEvent, el: DiagramElement) => void;
  onVertexPointerDown: (e: React.PointerEvent, el: DiagramElement, pointIndex: number) => void;
  onMidpointPointerDown: (e: React.PointerEvent, el: DiagramElement, insertIndex: number) => void;
  onMarkerPointerDown: (
    e: React.PointerEvent,
    el: DiagramElement,
    field: 'sourceMarkerPos' | 'targetMarkerPos',
  ) => void;
}) {
  const pts = resolveConnectorPoints(el, elements);
  if (pts.length < 2) return null;

  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  // Crow's foot markers: explicit sourceMarker/targetMarker win; otherwise
  // fall back to a plain arrowhead on arrows and no marker on plain lines.
  const sourceMarker = el.sourceMarker ?? 'none';
  const targetMarker = el.targetMarker ?? defaultTargetMarker(el.type);
  // A marker slid away from its default end is rendered manually at its
  // position instead of via marker-start/marker-end (which always hug the
  // path ends).
  const sourcePos = el.sourceMarkerPos ?? 0;
  const targetPos = el.targetMarkerPos ?? 1;
  const slidSource = sourceMarker !== 'none' && sourcePos !== 0;
  const slidTarget = targetMarker !== 'none' && targetPos !== 1;
  const atSource = slidSource ? pointAtT(pts, sourcePos) : null;
  const atTarget = slidTarget ? pointAtT(pts, targetPos) : null;
  const markerStart =
    sourceMarker !== 'none' && !slidSource ? `url(#${markerIds[sourceMarker]})` : undefined;
  const markerEnd =
    targetMarker !== 'none' && !slidTarget ? `url(#${markerIds[targetMarker]})` : undefined;
  const dashed = el.lineStyle === 'dashed';
  const showHandles = selected && !readOnly;

  // Marker handle anchors: where the glyph sits. When the marker is at its
  // default end, nudge the handle past the endpoint along the tangent so it
  // never covers the vertex handle that shares the same point.
  const sourceAnchor = atSource ? { x: atSource.x, y: atSource.y } : pts[0]!;
  const targetAnchor = atTarget ? { x: atTarget.x, y: atTarget.y } : pts[pts.length - 1]!;
  const sourceAngle = atSource?.angleDeg ?? pointAtT(pts, 0).angleDeg;
  const targetAngle = atTarget?.angleDeg ?? pointAtT(pts, 1).angleDeg;
  const tangentOffset = (angleDeg: number, len: number) => ({
    x: (Math.cos((angleDeg * Math.PI) / 180) * len),
    y: (Math.sin((angleDeg * Math.PI) / 180) * len),
  });
  // The source glyph (orient auto-start-reverse) extends BACKWARD past the
  // endpoint; the target glyph extends FORWARD. Park the handles there.
  const sourceH = {
    x: sourceAnchor.x - tangentOffset(sourceAngle, 14).x,
    y: sourceAnchor.y - tangentOffset(sourceAngle, 14).y,
  };
  const targetH = {
    x: targetAnchor.x + tangentOffset(targetAngle, 14).x,
    y: targetAnchor.y + tangentOffset(targetAngle, 14).y,
  };

  return (
    <g className="cursor-pointer" data-testid={`connector-${el.id}`} onPointerDown={(e) => onPointerDown(e, el)}>
      {/* Invisible fat hit path */}
      <path d={pathD} stroke="transparent" strokeWidth={14} fill="none" style={{ pointerEvents: 'stroke' }} />
      <path
        d={pathD}
        stroke={el.color ?? '#475569'}
        strokeWidth={selected ? 2.2 : 1.8}
        strokeLinecap="round"
        strokeDasharray={dashed ? '6 5' : undefined}
        fill="none"
        markerStart={markerStart}
        markerEnd={markerEnd}
      />
      {selected && (
        <path d={pathD} stroke="#6366f1" strokeWidth={5} strokeLinecap="round" fill="none" opacity={0.25} pointerEvents="none" />
      )}

      {/* Manually rendered slid cardinality markers */}
      {atSource && sourceMarker !== 'none' && (
        <g
          pointerEvents="none"
          transform={markerGlyphTransform(sourceMarker, atSource, atSource.angleDeg, true)}
          dangerouslySetInnerHTML={{ __html: MARKER_GEOMETRY[sourceMarker].inner }}
        />
      )}
      {atTarget && targetMarker !== 'none' && (
        <g
          pointerEvents="none"
          transform={markerGlyphTransform(targetMarker, atTarget, atTarget.angleDeg, false)}
          dangerouslySetInnerHTML={{ __html: MARKER_GEOMETRY[targetMarker].inner }}
        />
      )}

      {/* Editing handles (select tool only) */}
      {showHandles && (
        <g>
          {/* Vertex handles — drag to reshape */}
          {pts.map((p, i) => (
            <g
              key={`v-${i}`}
              className="cursor-move"
              data-testid={`vertex-${el.id}-${i}`}
              onPointerDown={(e) => onVertexPointerDown(e, el, i)}
            >
              <circle cx={p.x} cy={p.y} r={7} fill="transparent" />
              <rect
                x={p.x - 3.5}
                y={p.y - 3.5}
                width={7}
                height={7}
                rx={1.5}
                fill="#ffffff"
                stroke="#6366f1"
                strokeWidth={1.4}
              />
            </g>
          ))}
          {/* Midpoint handles — drag to insert a bend point */}
          {pts.slice(0, -1).map((p, i) => {
            const a = p;
            const b = pts[i + 1]!;
            const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
            return (
              <g
                key={`m-${i}`}
                className="cursor-copy"
                data-testid={`midpoint-${el.id}-${i}`}
                onPointerDown={(e) => onMidpointPointerDown(e, el, i)}
              >
                <circle cx={mid.x} cy={mid.y} r={7} fill="transparent" />
                <circle cx={mid.x} cy={mid.y} r={3} fill="#e0e7ff" stroke="#6366f1" strokeWidth={1.2} />
              </g>
            );
          })}
          {/* Cardinality marker handles — drag to slide along the line. The
              handle sits just beyond the glyph along the tangent so it does
              not cover the vertex handle at the same endpoint. */}
          {sourceMarker !== 'none' && (
            <g
              className="cursor-ew-resize"
              data-testid={`marker-source-${el.id}`}
              onPointerDown={(e) => onMarkerPointerDown(e, el, 'sourceMarkerPos')}
            >
              <circle cx={sourceH.x} cy={sourceH.y} r={8} fill="transparent" />
              <circle cx={sourceH.x} cy={sourceH.y} r={4.5} fill="#faf5ff" stroke="#a855f7" strokeWidth={1.8} />
              {CARDINALITY_LABELS[sourceMarker] && (
                <text
                  x={sourceH.x + 9}
                  y={sourceH.y - 7}
                  fontSize={10}
                  fontWeight={600}
                  fill="#a855f7"
                  pointerEvents="none"
                >
                  {CARDINALITY_LABELS[sourceMarker]}
                </text>
              )}
            </g>
          )}
          {targetMarker !== 'none' && (
            <g
              className="cursor-ew-resize"
              data-testid={`marker-target-${el.id}`}
              onPointerDown={(e) => onMarkerPointerDown(e, el, 'targetMarkerPos')}
            >
              <circle cx={targetH.x} cy={targetH.y} r={8} fill="transparent" />
              <circle cx={targetH.x} cy={targetH.y} r={4.5} fill="#faf5ff" stroke="#a855f7" strokeWidth={1.8} />
              {CARDINALITY_LABELS[targetMarker] && (
                <text
                  x={targetH.x + 9}
                  y={targetH.y - 7}
                  fontSize={10}
                  fontWeight={600}
                  fill="#a855f7"
                  pointerEvents="none"
                >
                  {CARDINALITY_LABELS[targetMarker]}
                </text>
              )}
            </g>
          )}
        </g>
      )}
    </g>
  );
}

// ── Connector drawing preview ────────────────────────
function PreviewConnector({
  pendingSource,
  pendingFreeStart,
  previewPoint,
  elements,
  arrowMarkerId,
}: {
  pendingSource: { id: string } | null;
  pendingFreeStart: { x: number; y: number } | null;
  previewPoint: { x: number; y: number } | null;
  elements: DiagramElement[];
  arrowMarkerId: string;
}) {
  if (pendingSource) {
    const src = elements.find((e) => e.id === pendingSource.id);
    if (!src || !previewPoint) return null;
    const start = anchorOnBorder(src, previewPoint);
    return (
      <g pointerEvents="none">
        <path
          d={`M ${start.x} ${start.y} L ${previewPoint.x} ${previewPoint.y}`}
          stroke="#8b5cf6"
          strokeWidth={1.6}
          strokeDasharray="5 4"
          fill="none"
          markerEnd={`url(#${arrowMarkerId})`}
        />
        <circle cx={start.x} cy={start.y} r={4} fill="#8b5cf6" />
      </g>
    );
  }
  if (pendingFreeStart && previewPoint) {
    return (
      <g pointerEvents="none">
        <path
          d={`M ${pendingFreeStart.x} ${pendingFreeStart.y} L ${previewPoint.x} ${previewPoint.y}`}
          stroke="#8b5cf6"
          strokeWidth={1.6}
          strokeDasharray="5 4"
          fill="none"
          markerEnd={`url(#${arrowMarkerId})`}
        />
        <circle cx={pendingFreeStart.x} cy={pendingFreeStart.y} r={4} fill="#8b5cf6" />
      </g>
    );
  }
  return null;
}

// ── Inline text editor ───────────────────────────────
function InlineTextEditor({
  el,
  initialText,
  onCommit,
  onCancel,
}: {
  el: DiagramElement | undefined;
  initialText: string;
  onCommit: (text: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState(initialText);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  if (!el) return null;
  const w = el.width ?? 160;
  const h = el.height ?? 60;

  return (
    <div className="absolute z-10" style={{ left: el.x, top: el.y, width: w, height: h }}>
      <textarea
        ref={ref}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => onCommit(text)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onCommit(text);
          }
          if (e.key === 'Escape') {
            e.preventDefault();
            onCancel();
          }
        }}
        spellCheck={false}
        className="h-full w-full resize-none rounded-sm border-2 border-primary-500 bg-white p-1.5 text-center text-xs leading-snug text-text-primary shadow-lg outline-none"
        style={{ fontSize: el.fontSize ?? 12 }}
      />
    </div>
  );
}

// ── Export helper: render all elements as SVG markup ──
export function renderSvgBody(
  elements: DiagramElement[],
  gridPatternId: string,
  markerIds: Record<Exclude<ConnectorMarker, 'none'>, string>,
  gridOn: boolean,
): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const parts: string[] = [];
  const arrows = elements.filter((el) => el.type === 'arrow' || el.type === 'line');
  const shapes = elements.filter((el) => el.type !== 'arrow' && el.type !== 'line');

  for (const el of shapes) {
    const color = el.color ?? '#6366f1';
    const w = el.width ?? 100;
    const h = el.height ?? 60;
    const { x, y } = el;
    const lines = (el.text ?? '').split('\n');
    const fill = el.type === 'note' ? '#fef9c3' : `${color}12`;

    let body = '';
    let tx = x + w / 2;
    let ty = y + h / 2 + 4;
    switch (el.type) {
      case 'circle':
        body = `<ellipse cx="${x + w / 2}" cy="${y + h / 2}" rx="${w / 2}" ry="${h / 2}" fill="${fill}" stroke="${color}" stroke-width="1.6"/>`;
        break;
      case 'diamond':
        body = `<polygon points="${diamondPoints(el)}" fill="${fill}" stroke="${color}" stroke-width="1.6"/>`;
        break;
      case 'weak-entity':
        body =
          `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${fill}" stroke="${color}" stroke-width="1.6"/>` +
          `<rect x="${x + 4}" y="${y + 4}" width="${w - 8}" height="${h - 8}" rx="3" fill="none" stroke="${color}" stroke-width="1.2"/>`;
        break;
      case 'identifying': {
        const inner = { ...el, x: x + 6, y: y + 6, width: w - 12, height: h - 12 };
        body =
          `<polygon points="${diamondPoints(el)}" fill="${fill}" stroke="${color}" stroke-width="1.6"/>` +
          `<polygon points="${diamondPoints(inner)}" fill="none" stroke="${color}" stroke-width="1.2"/>`;
        break;
      }
      case 'parallelogram':
        body = `<polygon points="${parallelogramPoints(el)}" fill="${fill}" stroke="${color}" stroke-width="1.6"/>`;
        break;
      case 'datastore':
        body = `<path d="${datastorePath(el)}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linejoin="round"/>`;
        break;
      case 'terminator':
        body = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="${fill}" stroke="${color}" stroke-width="1.6"/>`;
        break;
      case 'class': {
        const headerH = Math.max(24, Math.min(36, h * 0.28));
        const title = esc(lines[0] ?? '');
        const members = lines.slice(1).map(esc);
        body =
          `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#ffffff" stroke="${color}" stroke-width="1.6"/>` +
          `<rect x="${x}" y="${y}" width="${w}" height="${headerH}" fill="${color}22"/>` +
          `<line x1="${x}" y1="${y + headerH}" x2="${x + w}" y2="${y + headerH}" stroke="${color}" stroke-width="1.2"/>` +
          `<text x="${x + w / 2}" y="${y + headerH / 2 + 4}" text-anchor="middle" font-size="12" font-weight="700" fill="${color}">${title}</text>` +
          members
            .map(
              (m, i) =>
                `<text x="${x + 6}" y="${y + headerH + (h - headerH) / 4 + 4 + i * 15}" font-size="11" fill="#334155">${m}</text>`,
            )
            .join('');
        parts.push(body);
        continue;
      }
      case 'note':
        body = `<path d="${notePath(el)}" fill="${fill}" stroke="${color}" stroke-width="1.4"/>`;
        tx = x + 8;
        ty = y + 20;
        break;
      case 'text':
        tx = x;
        ty = y + 14;
        break;
      case 'cloud':
        body = `<path d="${cloudPath(el)}" fill="${fill}" stroke="${color}" stroke-width="1.6" stroke-linejoin="round"/>`;
        break;
      case 'server':
        body = serverSvg(el, fill, color);
        break;
      case 'storyboard-frame':
        body = storyboardSvg(el, fill, color);
        break;
      case 'mobile-frame':
        body = mobileSvg(el, fill, color);
        break;
      default:
        body = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${fill}" stroke="${color}" stroke-width="1.6"/>`;
    }
    const anchor = el.type === 'text' || el.type === 'note' ? 'start' : 'middle';
    const textBlock = lines
      .map((line, i) => {
        const total = lines.length;
        const startY = ty - ((total - 1) * 15) / 2;
        return `<text x="${tx}" y="${startY + i * 15}" text-anchor="${anchor}" font-size="${el.fontSize ?? 12}" font-weight="500" fill="#334155">${esc(line)}</text>`;
      })
      .join('');
    parts.push(body + textBlock);
  }

  for (const el of arrows) {
    const pts = resolveConnectorPoints(el, elements);
    if (pts.length < 2) continue;
    const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const sourceMarker = el.sourceMarker ?? 'none';
    const targetMarker = el.targetMarker ?? defaultTargetMarker(el.type);
    // Markers slid away from their default ends are exported as positioned
    // glyphs instead of marker-start/marker-end attributes.
    const sourcePos = el.sourceMarkerPos ?? 0;
    const targetPos = el.targetMarkerPos ?? 1;
    const slidSource = sourceMarker !== 'none' && sourcePos !== 0;
    const slidTarget = targetMarker !== 'none' && targetPos !== 1;
    const markerStart =
      sourceMarker !== 'none' && !slidSource ? `url(#${markerIds[sourceMarker]})` : '';
    const markerEnd =
      targetMarker !== 'none' && !slidTarget ? `url(#${markerIds[targetMarker]})` : '';
    const dashed = el.lineStyle === 'dashed' ? ' stroke-dasharray="6 5"' : '';
    let markerGlyphs = '';
    if (slidSource) {
      const at = pointAtT(pts, sourcePos);
      markerGlyphs += `<g transform="${markerGlyphTransform(sourceMarker, at, at.angleDeg, true)}">${MARKER_GEOMETRY[sourceMarker].inner}</g>`;
    }
    if (slidTarget) {
      const at = pointAtT(pts, targetPos);
      markerGlyphs += `<g transform="${markerGlyphTransform(targetMarker, at, at.angleDeg, false)}">${MARKER_GEOMETRY[targetMarker].inner}</g>`;
    }
    parts.push(
      `<path d="${d}" stroke="${el.color ?? '#475569'}" stroke-width="1.8" stroke-linecap="round" fill="none"${dashed} marker-start="${markerStart}" marker-end="${markerEnd}"/>${markerGlyphs}`,
    );
  }

  const defs =
    `<defs>` +
    (gridOn
      ? `<pattern id="${gridPatternId}" width="${GRID_SIZE}" height="${GRID_SIZE}" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="0.8" fill="#cbd5e1"/></pattern>`
      : '') +
    (Object.keys(MARKER_GEOMETRY) as Array<Exclude<ConnectorMarker, 'none'>>)
      .map(
        (kind) =>
          `<marker id="${markerIds[kind]}" viewBox="0 0 24 24" refX="${MARKER_GEOMETRY[kind].refX}" refY="12" markerWidth="11" markerHeight="11" orient="auto-start-reverse">${MARKER_GEOMETRY[kind].inner}</marker>`,
      )
      .join('') +
    `</defs>`;

  return (
    defs +
    (gridOn ? `<rect width="${CANVAS_W}" height="${CANVAS_H}" fill="url(#${gridPatternId})"/>` : '') +
    parts.join('')
  );
}

export default DiagramWorkspace;
