import { describe, it, expect } from 'vitest';
import {
  MARKER_GEOMETRY,
  defaultTargetMarker,
  resolveConnectorPoints,
  anchorOnBorder,
  pointAtT,
  nearestTOnPolyline,
  markerGlyphTransform,
  ERD_PALETTE,
  DFD_PALETTE,
  UML_PALETTE,
  FLOWCHART_PALETTE,
  TOPOLOGY_PALETTE,
  SUBNETTING_PALETTE,
  STORYBOARD_PALETTE,
  UI_MOCKUP_PALETTE,
  renderSvgBody,
  type DiagramElement,
} from '@components/workspace/diagram-workspace';

// ── Test fixtures ──────────────────────────────────

// Marker ids shared by every renderSvgBody export test.
const MARKER_IDS = {
  arrow: 'mk-arrow',
  diamond: 'mk-diamond',
  one: 'mk-one',
  many: 'mk-many',
  'zero-one': 'mk-zero-one',
  'zero-many': 'mk-zero-many',
  'one-many': 'mk-one-many',
};

function box(id: string, x: number, y: number, w: number, h: number): DiagramElement {
  return { id, type: 'box', x, y, width: w, height: h, text: 'Entity' };
}

function element(
  partial: Partial<DiagramElement> & Pick<DiagramElement, 'id' | 'type'>,
): DiagramElement {
  return { x: 0, y: 0, ...partial };
}

// ── MARKER_GEOMETRY — crow's foot marker geometry ──

describe('MARKER_GEOMETRY — crow\'s foot markers', () => {
  it('defines every non-none marker with a refX on the 24×24 grid and SVG inner markup', () => {
    const kinds: Array<keyof typeof MARKER_GEOMETRY> = [
      'arrow', 'diamond', 'one', 'many', 'zero-one', 'zero-many', 'one-many',
    ];
    for (const kind of kinds) {
      const geo = MARKER_GEOMETRY[kind];
      expect(geo.refX).toBeGreaterThanOrEqual(0);
      expect(geo.refX).toBeLessThanOrEqual(24);
      expect(geo.inner.length).toBeGreaterThan(0);
    }
  });

  it('renders the crow\'s foot (many) as three prongs converging at the line end', () => {
    const many = MARKER_GEOMETRY.many;
    // Prongs start at the marker's attachment point (refX, 12) and splay outward.
    expect(many.refX).toBe(4);
    expect(many.inner).toContain('M 4 12 L 21 5');
    expect(many.inner).toContain('M 4 12 L 21 12');
    expect(many.inner).toContain('M 4 12 L 21 19');
    // Exactly three prong paths, stroke-based (not filled).
    expect(many.inner.match(/<path/g)).toHaveLength(3);
    expect(many.inner).toContain('stroke-linecap="round"');
  });

  it('renders "one" as a single perpendicular tick at the line end', () => {
    const one = MARKER_GEOMETRY.one;
    expect(one.refX).toBe(12);
    expect(one.inner).toContain('M 12 3 L 12 21');
    expect(one.inner.match(/<path/g)).toHaveLength(1);
  });

  it('renders "zero-one" as a hollow circle then a tick (0..1)', () => {
    const zo = MARKER_GEOMETRY['zero-one'];
    // Circle sits before the attachment point; tick is exactly at refX.
    expect(zo.inner).toContain('<circle cx="4" cy="12" r="3.4"');
    expect(zo.inner).toContain('fill="#ffffff"');
    expect(zo.inner).toContain('M 12 3 L 12 21');
    expect(zo.refX).toBe(12);
  });

  it('renders "zero-many" as a hollow circle plus crow\'s foot (0..N)', () => {
    const zm = MARKER_GEOMETRY['zero-many'];
    expect(zm.inner).toContain('<circle cx="3" cy="12" r="3.4"');
    // Prongs converge at the attachment point.
    expect(zm.inner).toContain('M 10 12 L 22 6');
    expect(zm.inner).toContain('M 10 12 L 22 12');
    expect(zm.inner).toContain('M 10 12 L 22 18');
    expect(zm.refX).toBe(10);
  });

  it('renders "one-many" as a tick then a distinct crow\'s foot (1..N)', () => {
    const om = MARKER_GEOMETRY['one-many'];
    // Tick at the attachment point, prong base offset past the tick so the
    // two glyphs read as separate marks.
    expect(om.inner).toContain('M 4 3 L 4 21');
    expect(om.inner).toContain('M 8 12 L 20 6');
    expect(om.inner).toContain('M 8 12 L 20 12');
    expect(om.inner).toContain('M 8 12 L 20 18');
    expect(om.refX).toBe(4);
  });

  it('renders "arrow" as a filled triangle with its tip at the attachment point', () => {
    const arrow = MARKER_GEOMETRY.arrow;
    expect(arrow.refX).toBe(22);
    expect(arrow.inner).toContain('M 2 2 L 22 12 L 2 22 Z');
    expect(arrow.inner).toContain('fill="#475569"');
  });

  it('renders "diamond" as a hollow diamond (inheritance / identifying)', () => {
    const diamond = MARKER_GEOMETRY.diamond;
    expect(diamond.refX).toBe(22);
    expect(diamond.inner).toContain('M 2 12 L 12 2 L 22 12 L 12 22 Z');
    expect(diamond.inner).toContain('fill="#ffffff"');
    expect(diamond.inner).toContain('stroke="#475569"');
  });
});

// ── defaultTargetMarker ────────────────────────────

describe('defaultTargetMarker', () => {
  it('gives arrows an arrowhead by default and plain lines no marker', () => {
    expect(defaultTargetMarker('arrow')).toBe('arrow');
    expect(defaultTargetMarker('line')).toBe('none');
  });

  it('gives shapes no marker', () => {
    expect(defaultTargetMarker('box')).toBe('none');
    expect(defaultTargetMarker('weak-entity')).toBe('none');
    expect(defaultTargetMarker('identifying')).toBe('none');
  });
});

// ── ERD_PALETTE — crow's foot shapes & presets ─────

describe('ERD_PALETTE — crow\'s foot shapes', () => {
  it('includes weak entity and identifying relationship shapes', () => {
    const keys = ERD_PALETTE.map((p) => p.key);
    expect(keys).toContain('weak-entity');
    expect(keys).toContain('identifying');
  });

  it('places a weak entity as a double-bordered box', () => {
    const weak = ERD_PALETTE.find((p) => p.key === 'weak-entity');
    expect(weak).toBeDefined();
    const el = weak!.makeElement(40, 60);
    expect(el.type).toBe('weak-entity');
    expect(el.x).toBe(40);
    expect(el.y).toBe(60);
    expect(el.width).toBe(160);
    expect(el.height).toBe(70);
  });

  it('places an identifying relationship as a double diamond', () => {
    const idRel = ERD_PALETTE.find((p) => p.key === 'identifying');
    expect(idRel).toBeDefined();
    const el = idRel!.makeElement(0, 0);
    expect(el.type).toBe('identifying');
    expect(el.width).toBe(150);
    expect(el.height).toBe(84);
  });

  it('labels connector presets with their cardinality in the palette', () => {
    const labels = ERD_PALETTE.filter((p) => p.variant === 'connector').map((p) => p.label);
    expect(labels).toEqual(
      expect.arrayContaining(['1 : 1 (One)', '1 : N (One-Many)', 'N : M (Many-Many)', '0..N (Zero-Many)', '0..1 (Zero-One)']),
    );
  });

  it('wires the correct source/target markers on each cardinality preset', () => {
    const presetMarkers: Record<string, [string, string]> = {
      'c-one': ['one', 'one'],
      'c-one-many': ['one', 'many'],
      'c-many-many': ['many', 'many'],
      'c-zero-many': ['zero-many', 'zero-many'],
      'c-zero-one': ['zero-one', 'zero-one'],
    };
    for (const [key, [sourceMarker, targetMarker]] of Object.entries(presetMarkers)) {
      const item = ERD_PALETTE.find((p) => p.key === key);
      expect(item, `expected a palette item for ${key}`).toBeDefined();
      const el = item!.makeElement(0, 0);
      expect(el.sourceMarker, `${key} sourceMarker`).toBe(sourceMarker);
      expect(el.targetMarker, `${key} targetMarker`).toBe(targetMarker);
    }
  });

  it('draws preset connectors as a diagonal from the drop point', () => {
    const oneMany = ERD_PALETTE.find((p) => p.key === 'c-one-many');
    const el = oneMany!.makeElement(100, 200);
    expect(el.points).toEqual([
      { x: 100, y: 200 },
      { x: 260, y: 280 },
    ]);
  });
});

// ── DFD_PALETTE — data flow diagram shapes ─────────

describe('DFD_PALETTE — data flow diagram shapes', () => {
  it('includes external entity, process, data store, data flow, note and label', () => {
    const keys = DFD_PALETTE.map((p) => p.key);
    expect(keys).toEqual(
      expect.arrayContaining(['external', 'process', 'datastore', 'c-arrow', 'note', 'text']),
    );
  });

  it('places an external entity as a plain box', () => {
    const external = DFD_PALETTE.find((p) => p.key === 'external');
    expect(external).toBeDefined();
    const el = external!.makeElement(40, 60);
    expect(el.type).toBe('box');
    expect(el.x).toBe(40);
    expect(el.y).toBe(60);
    expect(el.width).toBe(170);
    expect(el.height).toBe(70);
    expect(el.color).toBe('#64748b');
  });

  it('places a process as a circle (ellipse geometry)', () => {
    const process = DFD_PALETTE.find((p) => p.key === 'process');
    expect(process).toBeDefined();
    const el = process!.makeElement(0, 0);
    expect(el.type).toBe('circle');
    expect(el.width).toBe(140);
    expect(el.height).toBe(140);
    expect(el.color).toBe('#3b82f6');
  });

  it('places a data store with the Dn numbering hint', () => {
    const ds = DFD_PALETTE.find((p) => p.key === 'datastore');
    expect(ds).toBeDefined();
    const el = ds!.makeElement(0, 0);
    expect(el.type).toBe('datastore');
    expect(el.width).toBe(180);
    expect(el.height).toBe(70);
    expect(el.text).toContain('D1');
    expect(el.color).toBe('#d97706');
  });

  it('draws the data flow connector as an arrow polyline from the drop point', () => {
    const df = DFD_PALETTE.find((p) => p.key === 'c-arrow');
    expect(df).toBeDefined();
    const el = df!.makeElement(100, 200);
    expect(el.type).toBe('arrow');
    expect(el.points).toEqual([
      { x: 100, y: 200 },
      { x: 260, y: 280 },
    ]);
  });
});

// ── UML_PALETTE — class diagram shapes ────────────

describe('UML_PALETTE — class diagram shapes', () => {
  it('includes class, note, association, inheritance and label', () => {
    const keys = UML_PALETTE.map((p) => p.key);
    expect(keys).toEqual(
      expect.arrayContaining(['class', 'note', 'c-line', 'c-arrow', 'text']),
    );
  });

  it('places a UML class with a header-band text layout (name + members)', () => {
    const cls = UML_PALETTE.find((p) => p.key === 'class');
    expect(cls).toBeDefined();
    const el = cls!.makeElement(10, 20);
    expect(el.type).toBe('class');
    expect(el.x).toBe(10);
    expect(el.y).toBe(20);
    expect(el.width).toBe(190);
    expect(el.height).toBe(130);
    const lines = el.text!.split('\n');
    expect(lines[0]).toBe('ClassName');
    expect(lines.length).toBeGreaterThanOrEqual(3); // name + attributes + methods
  });

  it('draws the association as a plain line polyline', () => {
    const assoc = UML_PALETTE.find((p) => p.key === 'c-line');
    expect(assoc).toBeDefined();
    const el = assoc!.makeElement(0, 0);
    expect(el.type).toBe('line');
    expect(el.points).toEqual([
      { x: 0, y: 0 },
      { x: 160, y: 80 },
    ]);
  });

  it('draws the inheritance arrow as a horizontal arrow', () => {
    const inherit = UML_PALETTE.find((p) => p.key === 'c-arrow');
    expect(inherit).toBeDefined();
    const el = inherit!.makeElement(0, 0);
    expect(el.type).toBe('arrow');
    expect(el.points).toEqual([
      { x: 0, y: 0 },
      { x: 160, y: 0 },
    ]);
  });
});

// ── FLOWCHART_PALETTE — flowchart shapes ──────────

describe('FLOWCHART_PALETTE — flowchart shapes', () => {
  it('includes terminator, process, decision, I/O, connector, flow line and label', () => {
    const keys = FLOWCHART_PALETTE.map((p) => p.key);
    expect(keys).toEqual(
      expect.arrayContaining(['terminator', 'process', 'decision', 'io', 'connector', 'c-arrow', 'text']),
    );
  });

  it('places a terminator as a pill-shaped start/end (rounded box)', () => {
    const term = FLOWCHART_PALETTE.find((p) => p.key === 'terminator');
    expect(term).toBeDefined();
    const el = term!.makeElement(40, 60);
    expect(el.type).toBe('terminator');
    expect(el.x).toBe(40);
    expect(el.y).toBe(60);
    expect(el.width).toBe(150);
    expect(el.height).toBe(64);
    expect(el.text).toBe('Start');
    expect(el.color).toBe('#10b981');
  });

  it('places a process as a plain box', () => {
    const process = FLOWCHART_PALETTE.find((p) => p.key === 'process');
    expect(process).toBeDefined();
    const el = process!.makeElement(0, 0);
    expect(el.type).toBe('box');
    expect(el.width).toBe(170);
    expect(el.height).toBe(70);
    expect(el.color).toBe('#3b82f6');
  });

  it('places a decision as a diamond', () => {
    const decision = FLOWCHART_PALETTE.find((p) => p.key === 'decision');
    expect(decision).toBeDefined();
    const el = decision!.makeElement(0, 0);
    expect(el.type).toBe('diamond');
    expect(el.width).toBe(170);
    expect(el.height).toBe(100);
    expect(el.text).toBe('Decision?');
    expect(el.color).toBe('#d97706');
  });

  it('places an I/O node as a parallelogram', () => {
    const io = FLOWCHART_PALETTE.find((p) => p.key === 'io');
    expect(io).toBeDefined();
    const el = io!.makeElement(0, 0);
    expect(el.type).toBe('parallelogram');
    expect(el.width).toBe(180);
    expect(el.height).toBe(70);
    expect(el.text).toBe('Input / Output');
    expect(el.color).toBe('#a855f7');
  });

  it('places a small circular connector labelled A', () => {
    const conn = FLOWCHART_PALETTE.find((p) => p.key === 'connector');
    expect(conn).toBeDefined();
    const el = conn!.makeElement(0, 0);
    expect(el.type).toBe('circle');
    expect(el.width).toBe(52);
    expect(el.height).toBe(52);
    expect(el.text).toBe('A');
  });

  it('draws the flow line as a horizontal arrow', () => {
    const flow = FLOWCHART_PALETTE.find((p) => p.key === 'c-arrow');
    expect(flow).toBeDefined();
    const el = flow!.makeElement(0, 0);
    expect(el.type).toBe('arrow');
    expect(el.points).toEqual([
      { x: 0, y: 0 },
      { x: 160, y: 0 },
    ]);
  });
});

// ── TOPOLOGY_PALETTE — network topology shapes ──

describe('TOPOLOGY_PALETTE — network topology shapes', () => {
  it('includes router, switch, firewall, server, PC, cloud, link and label', () => {
    const keys = TOPOLOGY_PALETTE.map((p) => p.key);
    expect(keys).toEqual(
      expect.arrayContaining(['router', 'switch', 'firewall', 'server', 'pc', 'cloud', 'c-link', 'text']),
    );
  });

  it('places a router as a circle', () => {
    const router = TOPOLOGY_PALETTE.find((p) => p.key === 'router');
    expect(router).toBeDefined();
    const el = router!.makeElement(0, 0);
    expect(el.type).toBe('circle');
    expect(el.width).toBe(120);
    expect(el.height).toBe(120);
    expect(el.text).toBe('Router');
    expect(el.color).toBe('#3b82f6');
  });

  it('places a server as a server-rack shape', () => {
    const server = TOPOLOGY_PALETTE.find((p) => p.key === 'server');
    expect(server).toBeDefined();
    const el = server!.makeElement(20, 40);
    expect(el.type).toBe('server');
    expect(el.x).toBe(20);
    expect(el.y).toBe(40);
    expect(el.width).toBe(130);
    expect(el.height).toBe(100);
    expect(el.color).toBe('#64748b');
  });

  it('places the Internet as a cloud shape', () => {
    const cloud = TOPOLOGY_PALETTE.find((p) => p.key === 'cloud');
    expect(cloud).toBeDefined();
    const el = cloud!.makeElement(0, 0);
    expect(el.type).toBe('cloud');
    expect(el.width).toBe(200);
    expect(el.height).toBe(120);
    expect(el.text).toBe('Internet');
    expect(el.color).toBe('#0d9488');
  });

  it('draws the link as a plain diagonal line', () => {
    const link = TOPOLOGY_PALETTE.find((p) => p.key === 'c-link');
    expect(link).toBeDefined();
    const el = link!.makeElement(0, 0);
    expect(el.type).toBe('line');
    expect(el.points).toEqual([
      { x: 0, y: 0 },
      { x: 160, y: 80 },
    ]);
  });
});

// ── SUBNETTING_PALETTE — subnet planning shapes ──

describe('SUBNETTING_PALETTE — subnet planning shapes', () => {
  it('includes subnet, host, gateway, external network, link and label', () => {
    const keys = SUBNETTING_PALETTE.map((p) => p.key);
    expect(keys).toEqual(
      expect.arrayContaining(['subnet', 'host', 'gateway', 'external', 'c-link', 'text']),
    );
  });

  it('places a subnet box with a CIDR block as its default text', () => {
    const subnet = SUBNETTING_PALETTE.find((p) => p.key === 'subnet');
    expect(subnet).toBeDefined();
    const el = subnet!.makeElement(0, 0);
    expect(el.type).toBe('box');
    expect(el.width).toBe(200);
    expect(el.height).toBe(100);
    expect(el.text).toBe('192.168.1.0/24');
    expect(el.color).toBe('#8b5cf6');
  });

  it('places the external network as a cloud shape', () => {
    const ext = SUBNETTING_PALETTE.find((p) => p.key === 'external');
    expect(ext).toBeDefined();
    const el = ext!.makeElement(0, 0);
    expect(el.type).toBe('cloud');
    expect(el.width).toBe(180);
    expect(el.height).toBe(110);
    expect(el.text).toBe('Internet');
  });
});

// ── STORYBOARD_PALETTE — storyboard shapes ──

describe('STORYBOARD_PALETTE — storyboard shapes', () => {
  it('includes frame, caption, transition, dialog, note and text', () => {
    const keys = STORYBOARD_PALETTE.map((p) => p.key);
    expect(keys).toEqual(
      expect.arrayContaining(['frame', 'caption', 'c-transition', 'dialog', 'note', 'text']),
    );
  });

  it('places a film frame with a caption-friendly size', () => {
    const frame = STORYBOARD_PALETTE.find((p) => p.key === 'frame');
    expect(frame).toBeDefined();
    const el = frame!.makeElement(0, 0);
    expect(el.type).toBe('storyboard-frame');
    expect(el.width).toBe(220);
    expect(el.height).toBe(150);
    expect(el.text).toBe('Frame 1');
    expect(el.color).toBe('#6366f1');
  });

  it('draws the transition as a horizontal arrow between scenes', () => {
    const trans = STORYBOARD_PALETTE.find((p) => p.key === 'c-transition');
    expect(trans).toBeDefined();
    const el = trans!.makeElement(0, 0);
    expect(el.type).toBe('arrow');
    expect(el.points).toEqual([
      { x: 0, y: 0 },
      { x: 160, y: 0 },
    ]);
  });

  it('places a dialog bubble as a rounded shape', () => {
    const dialog = STORYBOARD_PALETTE.find((p) => p.key === 'dialog');
    expect(dialog).toBeDefined();
    const el = dialog!.makeElement(0, 0);
    expect(el.type).toBe('circle');
    expect(el.width).toBe(110);
    expect(el.height).toBe(70);
    expect(el.text).toBe('Dialog');
  });
});

// ── UI_MOCKUP_PALETTE — screen mockup shapes ──

describe('UI_MOCKUP_PALETTE — screen mockup shapes', () => {
  it('includes screen, header, button, input, image, navbar, flow arrow and label', () => {
    const keys = UI_MOCKUP_PALETTE.map((p) => p.key);
    expect(keys).toEqual(
      expect.arrayContaining(['screen', 'header', 'button', 'input', 'image', 'navbar', 'c-arrow', 'text']),
    );
  });

  it('places a mobile screen as a tall phone frame', () => {
    const screen = UI_MOCKUP_PALETTE.find((p) => p.key === 'screen');
    expect(screen).toBeDefined();
    const el = screen!.makeElement(0, 0);
    expect(el.type).toBe('mobile-frame');
    expect(el.width).toBe(180);
    expect(el.height).toBe(320);
    expect(el.text).toBe('Screen');
    expect(el.color).toBe('#6366f1');
  });

  it('places an image placeholder as a parallelogram', () => {
    const image = UI_MOCKUP_PALETTE.find((p) => p.key === 'image');
    expect(image).toBeDefined();
    const el = image!.makeElement(0, 0);
    expect(el.type).toBe('parallelogram');
    expect(el.width).toBe(160);
    expect(el.height).toBe(80);
    expect(el.text).toBe('Image');
    expect(el.color).toBe('#0d9488');
  });

  it('draws the flow arrow as a diagonal arrow between screens', () => {
    const flow = UI_MOCKUP_PALETTE.find((p) => p.key === 'c-arrow');
    expect(flow).toBeDefined();
    const el = flow!.makeElement(0, 0);
    expect(el.type).toBe('arrow');
    expect(el.points).toEqual([
      { x: 0, y: 0 },
      { x: 160, y: 80 },
    ]);
  });
});

// ── anchorOnBorder — connectors meet the shape edge ─

describe('anchorOnBorder', () => {
  it('anchors to the right edge when the target is due east of center', () => {
    // Box at (0,0) 200×100 → center (100,50)
    const el = box('a', 0, 0, 200, 100);
    const p = anchorOnBorder(el, { x: 300, y: 50 });
    expect(p).toEqual({ x: 200, y: 50 });
  });

  it('anchors to the bottom edge when the target is due south', () => {
    const el = box('a', 0, 0, 200, 100);
    const p = anchorOnBorder(el, { x: 100, y: 300 });
    expect(p).toEqual({ x: 100, y: 100 });
  });

  it('clamps diagonal targets to the nearest edge, not the corner', () => {
    const el = box('a', 0, 0, 200, 100);
    const p = anchorOnBorder(el, { x: 300, y: 100 });
    expect(p).toEqual({ x: 200, y: 75 });
  });

  it('treats circles as ellipses and hits the outline', () => {
    const el = element({ id: 'c', type: 'circle', x: 0, y: 0, width: 200, height: 100 });
    // Center (100,50), ellipse reaches x=200 at mid-height.
    const p = anchorOnBorder(el, { x: 300, y: 50 });
    expect(p).toEqual({ x: 200, y: 50 });
  });

  it('returns the center when the target overlaps the center', () => {
    const el = box('a', 0, 0, 200, 100);
    const p = anchorOnBorder(el, { x: 100, y: 50 });
    expect(p).toEqual({ x: 100, y: 50 });
  });
});

// ── resolveConnectorPoints ─────────────────────────

describe('resolveConnectorPoints', () => {
  it('returns explicit polyline points for free connectors', () => {
    const pts = [
      { x: 10, y: 20 },
      { x: 210, y: 120 },
    ];
    const el = element({ id: 'l', type: 'line', points: pts });
    expect(resolveConnectorPoints(el, [el])).toEqual(pts);
  });

  it('resolves attached connectors to the border of each shape', () => {
    const a = box('a', 0, 0, 200, 100); // center (100,50)
    const b = box('b', 400, 0, 200, 100); // center (500,50)
    const conn = element({ id: 'c', type: 'line', sourceId: 'a', targetId: 'b' });
    const pts = resolveConnectorPoints(conn, [a, b, conn]);
    // Right edge of a facing b, and left edge of b facing a.
    expect(pts).toEqual([
      { x: 200, y: 50 },
      { x: 400, y: 50 },
    ]);
  });

  it('recomputes connector geometry when a shape moves', () => {
    const a = box('a', 0, 0, 200, 100);
    const b = box('b', 400, 0, 200, 100);
    const conn = element({ id: 'c', type: 'line', sourceId: 'a', targetId: 'b' });
    const movedB = { ...b, x: 600 };
    const pts = resolveConnectorPoints(conn, [a, movedB, conn]);
    expect(pts[1]).toEqual({ x: 600, y: 50 });
  });

  it('supports free-end connectors (sourceId + a single target point)', () => {
    const a = box('a', 0, 0, 200, 100);
    const conn = element({
      id: 'c', type: 'arrow', sourceId: 'a', points: [{ x: 300, y: 50 }],
    });
    const pts = resolveConnectorPoints(conn, [a, conn]);
    expect(pts).toEqual([
      { x: 200, y: 50 },
      { x: 300, y: 50 },
    ]);
  });

  it('keeps legacy box-shaped arrows rendering (backward compatibility)', () => {
    // Diagrams saved by the original editor stored arrows as boxes with
    // width/height and no connector geometry.
    const legacy = element({ id: 'old', type: 'arrow', x: 10, y: 20, width: 120, height: 80 });
    const pts = resolveConnectorPoints(legacy, [legacy]);
    expect(pts).toEqual([
      { x: 10, y: 20 },
      { x: 130, y: 100 },
    ]);
  });
});

// ── pointAtT / nearestTOnPolyline — connector editing geometry ──

describe('pointAtT — normalized position along a polyline', () => {
  const line = [
    { x: 0, y: 0 },
    { x: 200, y: 0 },
  ];

  it('returns the first point at t=0 and the last point at t=1', () => {
    expect(pointAtT(line, 0)).toMatchObject({ x: 0, y: 0, angleDeg: 0 });
    expect(pointAtT(line, 1)).toMatchObject({ x: 200, y: 0, angleDeg: 0 });
  });

  it('interpolates halfway along a straight horizontal line', () => {
    expect(pointAtT(line, 0.5)).toMatchObject({ x: 100, y: 0, angleDeg: 0 });
  });

  it('clamps t outside 0..1 to the polyline ends', () => {
    expect(pointAtT(line, -1).x).toBe(0);
    expect(pointAtT(line, 2).x).toBe(200);
  });

  it('walks a bent polyline using arc length and reports the segment angle', () => {
    const bent = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
    ];
    // 3/4 of the way along the whole path = middle of the vertical segment.
    expect(pointAtT(bent, 0.75)).toMatchObject({ x: 100, y: 50, angleDeg: 90 });
  });

  it('handles degenerate single-point polylines', () => {
    expect(pointAtT([{ x: 5, y: 6 }], 0.5)).toEqual({ x: 5, y: 6, angleDeg: 0 });
  });
});

describe('nearestTOnPolyline — closest normalized position to a point', () => {
  const line = [
    { x: 0, y: 0 },
    { x: 200, y: 0 },
  ];

  it('projects onto the middle of a horizontal line', () => {
    expect(nearestTOnPolyline(line, { x: 100, y: 30 })).toBeCloseTo(0.5);
  });

  it('clamps to the nearest end when beyond the polyline', () => {
    expect(nearestTOnPolyline(line, { x: 500, y: 0 })).toBe(1);
    expect(nearestTOnPolyline(line, { x: -50, y: 0 })).toBe(0);
  });

  it('finds the correct segment on a bent polyline', () => {
    const bent = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
    ];
    // Nearest to the vertical segment, 30% of the way up it.
    expect(nearestTOnPolyline(bent, { x: 120, y: 30 })).toBeCloseTo(0.65);
  });

  it('returns 0 for degenerate polylines', () => {
    expect(nearestTOnPolyline([{ x: 1, y: 1 }], { x: 0, y: 0 })).toBe(0);
  });
});

describe('markerGlyphTransform — positions a cardinality glyph on the line', () => {
  it('rotates the target marker to the line angle and scales to 11/24', () => {
    // Horizontal line → rotate(0); 'one' refX=12 → translate(-12 -12).
    const t = markerGlyphTransform('one', { x: 100, y: 0 }, 0, false);
    expect(t).toBe('translate(100 0) rotate(0) scale(0.4583) translate(-12 -12)');
  });

  it('mirrors the source marker with a 180° rotation', () => {
    const t = markerGlyphTransform('many', { x: 0, y: 50 }, 45, true);
    expect(t).toContain('rotate(225)');
    expect(t).toContain('translate(0 50)');
  });

  it('rounds fractional angles', () => {
    const t = markerGlyphTransform('one', { x: 10, y: 10 }, 33.3333, false);
    expect(t).toContain('rotate(33.33)');
  });
});

// ── renderSvgBody — export fidelity ────────────────

describe('renderSvgBody — export fidelity', () => {
  const markerIds = MARKER_IDS;

  it('emits the grid pattern only when gridOn is true', () => {
    const on = renderSvgBody([], 'grid-pattern', markerIds, true);
    expect(on).toContain('<pattern id="grid-pattern"');
    const off = renderSvgBody([], 'grid-pattern', markerIds, false);
    expect(off).not.toContain('<pattern');
  });

  it('renders weak entities as double rectangles in the export', () => {
    const el = element({
      id: 'w', type: 'weak-entity', x: 10, y: 20, width: 160, height: 70, color: '#6366f1',
    });
    const body = renderSvgBody([el], 'g', markerIds, false);
    expect(body.match(/<rect/g)).toHaveLength(2);
    expect(body).toContain('stroke-width="1.2"'); // inner outline
  });

  it('renders identifying relationships as double diamonds in the export', () => {
    const el = element({
      id: 'i', type: 'identifying', x: 10, y: 20, width: 150, height: 84, color: '#8b5cf6',
    });
    const body = renderSvgBody([el], 'g', markerIds, false);
    expect(body.match(/<polygon/g)).toHaveLength(2);
  });

  it('renders dashed (non-identifying) connectors with stroke-dasharray', () => {
    const a = box('a', 0, 0, 100, 100);
    const b = box('b', 300, 0, 100, 100);
    const conn = element({ id: 'c', type: 'line', sourceId: 'a', targetId: 'b', lineStyle: 'dashed' });
    const body = renderSvgBody([a, b, conn], 'g', markerIds, false);
    expect(body).toContain('stroke-dasharray="6 5"');
  });

  it('references the requested markers on connector start/end', () => {
    const a = box('a', 0, 0, 100, 100);
    const b = box('b', 300, 0, 100, 100);
    const conn = element({
      id: 'c', type: 'line', sourceId: 'a', targetId: 'b',
      sourceMarker: 'one', targetMarker: 'many',
    });
    const body = renderSvgBody([a, b, conn], 'g', markerIds, false);
    expect(body).toContain('marker-start="url(#mk-one)"');
    expect(body).toContain('marker-end="url(#mk-many)"');
  });

  it('defaults an arrow without explicit markers to an arrowhead at the end', () => {
    const a = box('a', 0, 0, 100, 100);
    const b = box('b', 300, 0, 100, 100);
    const conn = element({ id: 'c', type: 'arrow', sourceId: 'a', targetId: 'b' });
    const body = renderSvgBody([a, b, conn], 'g', markerIds, false);
    // No explicit source marker, but the arrow type gets marker-end via defaultTargetMarker.
    expect(body).toContain('marker-start=""');
    expect(body).toContain('marker-end="url(#mk-arrow)"');
  });

  it('omits marker attributes entirely for a plain line with no markers', () => {
    const a = box('a', 0, 0, 100, 100);
    const b = box('b', 300, 0, 100, 100);
    const conn = element({ id: 'c', type: 'line', sourceId: 'a', targetId: 'b' });
    const body = renderSvgBody([a, b, conn], 'g', markerIds, false);
    // Both attributes present but empty — no marker is referenced.
    expect(body).toContain('marker-start=""');
    expect(body).toContain('marker-end=""');
    expect(body).not.toContain('marker-start="url(');
    expect(body).not.toContain('marker-end="url(');
  });

  it('includes the full marker defs (crow\'s foot geometry) in the export', () => {
    const body = renderSvgBody([], 'g', markerIds, false);
    for (const id of Object.values(markerIds)) {
      expect(body).toContain(`<marker id="${id}"`);
    }
    expect(body).toContain('orient="auto-start-reverse"');
    expect(body).toContain('refX="4"'); // crow's foot attachment point
  });
});

// ── renderSvgBody — DFD export rendering ──────────

describe('renderSvgBody — DFD export rendering', () => {
  const markerIds = MARKER_IDS;

  it('renders a data store as an open-ended box with an inner side bar', () => {
    const ds = element({
      id: 'd1', type: 'datastore', x: 10, y: 20, width: 180, height: 70,
      text: 'D1  Data Store', color: '#d97706',
    });
    const body = renderSvgBody([ds], 'g', markerIds, false);
    // Outer frame traced counter-clockwise, then the DFD side bar at
    // x + w - bar where bar = h * 0.35 = 24.5 → 165.5.
    expect(body).toContain(
      '<path d="M 10,20 L 190,20 L 190,90 L 10,90 L 10,20 M 165.5,20 L 165.5,90"',
    );
    expect(body).toContain('fill="none"'); // open-ended → no fill
    expect(body).toContain('stroke-width="1.8"');
    expect(body).toContain('stroke-linejoin="round"');
    expect(body).toContain('D1  Data Store'); // label preserved in the export
  });

  it('renders a process as an ellipse centered on its bbox', () => {
    const proc = element({
      id: 'p1', type: 'circle', x: 10, y: 20, width: 140, height: 140, color: '#3b82f6',
    });
    const body = renderSvgBody([proc], 'g', markerIds, false);
    expect(body).toContain('<ellipse cx="80" cy="90" rx="70" ry="70"');
    expect(body).toContain('stroke="#3b82f6"');
  });

  it('renders an external entity as a rounded box', () => {
    const ext = element({
      id: 'e1', type: 'box', x: 10, y: 20, width: 170, height: 70,
      text: 'External Entity', color: '#64748b',
    });
    const body = renderSvgBody([ext], 'g', markerIds, false);
    expect(body).toContain('<rect x="10" y="20" width="170" height="70" rx="5"');
    expect(body).toContain('External Entity');
  });

  it('renders the data flow connector with an arrowhead at the target', () => {
    const a = box('e1', 0, 0, 170, 70);
    const b = box('e2', 400, 0, 170, 70);
    const flow = element({ id: 'f1', type: 'arrow', sourceId: 'e1', targetId: 'e2' });
    const body = renderSvgBody([a, b, flow], 'g', markerIds, false);
    // DFD data flows carry an arrowhead (default arrow marker) but no source marker.
    expect(body).toContain('marker-start=""');
    expect(body).toContain('marker-end="url(#mk-arrow)"');
  });

  it('resolves data flow connectors to the shape borders', () => {
    const a = box('e1', 0, 0, 170, 70); // center (85,35)
    const b = box('e2', 400, 0, 170, 70); // center (485,35)
    const flow = element({ id: 'f1', type: 'arrow', sourceId: 'e1', targetId: 'e2' });
    const body = renderSvgBody([a, b, flow], 'g', markerIds, false);
    // Path goes from the right edge of e1 to the left edge of e2.
    expect(body).toContain('d="M 170 35 L 400 35"');
  });
});

// ── renderSvgBody — UML export rendering ──────────

describe('renderSvgBody — UML export rendering', () => {
  const markerIds = MARKER_IDS;

  it('renders a class with outer frame, header band, divider, title and members', () => {
    const cls = element({
      id: 'c1', type: 'class', x: 10, y: 20, width: 190, height: 130,
      text: 'ClassName\n+ attribute : type\n+ method() : void',
      color: '#6366f1', fontSize: 12,
    });
    const body = renderSvgBody([cls], 'g', markerIds, false);
    // Outer frame + header band.
    expect(body.match(/<rect/g)).toHaveLength(2);
    // Header band uses the stroke color with an alpha suffix.
    expect(body).toContain('fill="#6366f122"');
    // Divider line under the header band.
    expect(body.match(/<line/g)).toHaveLength(1);
    // Bold centered title + member rows.
    expect(body).toContain('font-weight="700"');
    expect(body).toContain('>ClassName</text>');
    expect(body).toContain('+ attribute : type');
    expect(body).toContain('+ method() : void');
  });

  it('renders an association (plain line) with no end markers', () => {
    const a = box('a', 0, 0, 100, 100);
    const b = box('b', 300, 0, 100, 100);
    const assoc = element({ id: 'x', type: 'line', sourceId: 'a', targetId: 'b' });
    const body = renderSvgBody([a, b, assoc], 'g', markerIds, false);
    expect(body).toContain('marker-start=""');
    expect(body).toContain('marker-end=""');
    expect(body).not.toContain('marker-end="url(');
  });

  it('renders an inheritance arrow with an arrowhead at the target', () => {
    const a = box('a', 0, 0, 100, 100);
    const b = box('b', 300, 0, 100, 100);
    const inh = element({ id: 'x', type: 'arrow', sourceId: 'a', targetId: 'b' });
    const body = renderSvgBody([a, b, inh], 'g', markerIds, false);
    expect(body).toContain('marker-end="url(#mk-arrow)"');
  });

  it('keeps the class title and member texts escaped in the export', () => {
    const cls = element({
      id: 'c1', type: 'class', x: 0, y: 0, width: 190, height: 130,
      text: 'Order<Item>\n- total & tax',
      color: '#6366f1',
    });
    const body = renderSvgBody([cls], 'g', markerIds, false);
    expect(body).toContain('Order&lt;Item&gt;');
    expect(body).toContain('- total &amp; tax');
  });
});

// ── renderSvgBody — FLOWCHART export rendering ────

describe('renderSvgBody — FLOWCHART export rendering', () => {
  const markerIds = MARKER_IDS;

  it('renders a terminator as a pill with rx = half its height', () => {
    const term = element({
      id: 't1', type: 'terminator', x: 10, y: 20, width: 150, height: 64,
      text: 'Start', color: '#10b981',
    });
    const body = renderSvgBody([term], 'g', markerIds, false);
    expect(body).toContain('<rect x="10" y="20" width="150" height="64" rx="32"');
    expect(body).toContain('stroke="#10b981"');
    expect(body).toContain('Start');
  });

  it('renders a decision as a diamond polygon', () => {
    const decision = element({
      id: 'd1', type: 'diamond', x: 10, y: 20, width: 170, height: 100,
      text: 'Decision?', color: '#d97706',
    });
    const body = renderSvgBody([decision], 'g', markerIds, false);
    // Points at (95,20) (180,70) (95,120) (10,70) — centered on the bbox.
    expect(body).toContain('<polygon points="95,20 180,70 95,120 10,70"');
    expect(body).toContain('Decision?');
  });

  it('renders an I/O node as a parallelogram polygon with a skew', () => {
    const io = element({
      id: 'i1', type: 'parallelogram', x: 10, y: 20, width: 180, height: 70,
      text: 'Input / Output', color: '#a855f7',
    });
    const body = renderSvgBody([io], 'g', markerIds, false);
    // skew = min(70*0.55, 180*0.3) = 38.5 → top-left at x+38.5=48.5,
    // top-right at x+180=190, bottom-right at 190-38.5=151.5.
    expect(body).toContain('<polygon points="48.5,20 190,20 151.5,90 10,90"');
    expect(body).toContain('Input / Output');
  });

  it('renders a process as a rounded box (default shape)', () => {
    const process = element({
      id: 'p1', type: 'box', x: 10, y: 20, width: 170, height: 70,
      text: 'Process', color: '#3b82f6',
    });
    const body = renderSvgBody([process], 'g', markerIds, false);
    expect(body).toContain('<rect x="10" y="20" width="170" height="70" rx="5"');
  });

  it('renders a small circular connector as an ellipse', () => {
    const conn = element({
      id: 'c1', type: 'circle', x: 10, y: 20, width: 52, height: 52, text: 'A', color: '#64748b',
    });
    const body = renderSvgBody([conn], 'g', markerIds, false);
    expect(body).toContain('<ellipse cx="36" cy="46" rx="26" ry="26"');
    // Label centered on the connector (tx = x + w/2, ty = y + h/2 + 4 = 50).
    expect(body).toContain('<text x="36" y="50" text-anchor="middle" font-size="12" font-weight="500" fill="#334155">A</text>');
  });

  it('renders the flow line as a horizontal arrow with an arrowhead', () => {
    const flow = element({
      id: 'f1', type: 'arrow', points: [
        { x: 10, y: 20 },
        { x: 170, y: 20 },
      ],
    });
    const body = renderSvgBody([flow], 'g', markerIds, false);
    expect(body).toContain('d="M 10 20 L 170 20"');
    expect(body).toContain('marker-end="url(#mk-arrow)"');
  });

  it('keeps the flow-line y coordinate constant when placed from the palette', () => {
    const flow = FLOWCHART_PALETTE.find((p) => p.key === 'c-arrow')!;
    const el = flow.makeElement(100, 200);
    expect(el.points).toEqual([
      { x: 100, y: 200 },
      { x: 260, y: 200 },
    ]);
    const body = renderSvgBody([el], 'g', markerIds, false);
    expect(body).toContain('d="M 100 200 L 260 200"');
  });
});

// ── renderSvgBody — TOPOLOGY / SUBNETTING / STORYBOARD / UI export ──

describe('renderSvgBody — topology & subnetting export rendering', () => {
  const markerIds = MARKER_IDS;

  it('renders a cloud as a closed bubbly path with a teal fill', () => {
    const cloud = element({
      id: 'cl1', type: 'cloud', x: 10, y: 20, width: 200, height: 120,
      text: 'Internet', color: '#0d9488',
    });
    const body = renderSvgBody([cloud], 'g', markerIds, false);
    // Cloud path starts at (x + 0.3w, y + 0.82h) = (70, 118.4).
    expect(body).toContain('<path d="M 70 118.4');
    expect(body).toContain('stroke-linejoin="round"');
    expect(body).toContain('fill="#0d948812"');
    expect(body).toContain('>Internet</text>');
  });

  it('renders a server rack with ears, front face and LEDs', () => {
    const server = element({
      id: 'srv1', type: 'server', x: 10, y: 20, width: 130, height: 100,
      text: 'Server', color: '#64748b',
    });
    const body = renderSvgBody([server], 'g', markerIds, false);
    // Rack ears sit outside the main body (x - 5 … x, y + 8 … y + h - 8).
    expect(body).toContain('<rect x="5" y="28" width="5" height="84" rx="2"');
    expect(body).toContain('<rect x="10" y="20" width="130" height="100" rx="6"');
    expect(body).toContain('#22c55e'); // green power LED
    expect(body).toContain('>Server</text>');
  });

  it('renders a film frame with sprocket holes and a caption strip', () => {
    const frame = element({
      id: 'fr1', type: 'storyboard-frame', x: 10, y: 20, width: 220, height: 150,
      text: 'Frame 1', color: '#6366f1',
    });
    const body = renderSvgBody([frame], 'g', markerIds, false);
    expect(body).toContain('<rect x="10" y="20" width="220" height="150" rx="4"');
    // First sprocket hole at (x + 4, y + 8) = (14, 28).
    expect(body).toContain('<rect x="14" y="28" width="6" height="6" rx="1"');
    // Caption strip across the bottom 24px.
    expect(body).toContain('<rect x="10" y="146" width="220" height="24" fill="#6366f122"/>');
    expect(body).toContain('>Frame 1</text>');
  });

  it('renders a phone screen with bezel, notch and home indicator', () => {
    const screen = element({
      id: 'scr1', type: 'mobile-frame', x: 10, y: 20, width: 180, height: 320,
      text: 'Screen', color: '#6366f1',
    });
    const body = renderSvgBody([screen], 'g', markerIds, false);
    expect(body).toContain('<rect x="10" y="20" width="180" height="320" rx="16"');
    // Inner white screen (3px inset) + notch + home indicator.
    expect(body).toContain('<rect x="13" y="23" width="174" height="314" rx="13"');
    expect(body).toContain('width="64.8" height="5" rx="2.5"'); // notch
    expect(body).toContain('x="64" y="334" width="72" height="4" rx="2"'); // home indicator
    expect(body).toContain('>Screen</text>');
  });
});

// ── renderSvgBody — slid cardinality markers ──────

describe('renderSvgBody — slid cardinality markers', () => {
  const markerIds = {
    arrow: 'mk-arrow',
    diamond: 'mk-diamond',
    one: 'mk-one',
    many: 'mk-many',
    'zero-one': 'mk-zero-one',
    'zero-many': 'mk-zero-many',
    'one-many': 'mk-one-many',
  };

  it('renders a slid target marker as a positioned glyph instead of marker-end', () => {
    const a = box('a', 0, 0, 100, 100);
    const b = box('b', 300, 0, 100, 100);
    const conn = element({
      id: 'c', type: 'line', sourceId: 'a', targetId: 'b',
      sourceMarker: 'one', targetMarker: 'many',
      targetMarkerPos: 0.5,
    });
    const body = renderSvgBody([a, b, conn], 'g', markerIds, false);
    // targetMarkerPos 0.5 → no marker-end attribute, manual glyph at midpoint.
    expect(body).toContain('marker-end=""');
    expect(body).toContain('<g transform="translate(');
    expect(body).toContain('M 4 12 L 21 5'); // many prongs rendered manually
    // Source marker still at its default end → uses marker-start attribute.
    expect(body).toContain('marker-start="url(#mk-one)"');
  });

  it('keeps both markers manual when both are slid', () => {
    const conn = element({
      id: 'c', type: 'line', points: [
        { x: 0, y: 0 },
        { x: 200, y: 0 },
      ],
      sourceMarker: 'one', targetMarker: 'many',
      sourceMarkerPos: 0.25, targetMarkerPos: 0.75,
    });
    const body = renderSvgBody([conn], 'g', markerIds, false);
    expect(body).not.toContain('marker-start="url(');
    expect(body).not.toContain('marker-end="url(');
    // Two manual glyph groups (source at x=50, target at x=150).
    expect(body).toContain('translate(50 0)');
    expect(body).toContain('translate(150 0)');
  });
});
