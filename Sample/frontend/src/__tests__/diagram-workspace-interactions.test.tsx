import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { DiagramWorkspace, type DiagramElement } from '@components/workspace/diagram-workspace';

// ── jsdom PointerEvent polyfill ─────────────────────
// jsdom (v24) does not implement the PointerEvent constructor, which both
// React's pointer-event handling and fireEvent.pointerDown/Move/Up rely on.
// Provide a minimal MouseEvent-based polyfill so the drag interactions can
// be simulated exactly like a real browser.
if (
  typeof window !== 'undefined' &&
  typeof (window as Window & { PointerEvent?: unknown }).PointerEvent === 'undefined'
) {
  class PointerEventPolyfill extends MouseEvent {
    pointerId: number;
    pointerType: string;
    isPrimary: boolean;
    constructor(type: string, params: PointerEventInit = {}) {
      super(type, {
        bubbles: params.bubbles ?? true,
        cancelable: params.cancelable ?? true,
        composed: params.composed ?? true,
        clientX: params.clientX ?? 0,
        clientY: params.clientY ?? 0,
        button: params.button ?? 0,
      });
      this.pointerId = params.pointerId ?? 1;
      this.pointerType = params.pointerType ?? 'mouse';
      this.isPrimary = params.isPrimary ?? true;
    }
  }
  (window as unknown as { PointerEvent: typeof PointerEventPolyfill }).PointerEvent =
    PointerEventPolyfill;
}

// ── Test fixtures ──────────────────────────────────

function box(id: string, x: number, y: number, w: number, h: number): DiagramElement {
  return { id, type: 'box', x, y, width: w, height: h, text: 'Entity' };
}

function makeConnector(
  id: string,
  points: Array<{ x: number; y: number }>,
  extra: Partial<DiagramElement> = {},
): DiagramElement {
  return { id, type: 'line', x: 0, y: 0, points, color: '#475569', ...extra };
}

// Select a connector with a plain click (no movement → no history commit),
// which reveals its vertex / midpoint / marker handles. Coordinates are only
// cosmetic (events are fired directly on the element) but should sit on the
// line to keep the test self-documenting.
function selectConnector(id: string, at: { x: number; y: number } = { x: 200, y: 100 }) {
  fireEvent.pointerDown(screen.getByTestId(`connector-${id}`), { clientX: at.x, clientY: at.y });
  fireEvent.pointerUp(window);
}

// Select a shape with a plain click (no movement → no history commit), which
// reveals its resize handles.
function selectShape(id: string, at: { x: number; y: number }) {
  fireEvent.pointerDown(screen.getByTestId(`shape-${id}`), { clientX: at.x, clientY: at.y });
  fireEvent.pointerUp(window);
}

function lastOnChange(onChange: ReturnType<typeof vi.fn>): DiagramElement[] {
  return onChange.mock.calls[onChange.mock.calls.length - 1]![0] as DiagramElement[];
}

// The canvas maps client coordinates straight through at zoom=1 (jsdom
// getBoundingClientRect is all zeros), so a drag by (dx, dy) client pixels
// moves the connector by (dx, dy) logical units. All coordinates below are
// on the 20px snap grid.

// ── Whole-connector translation ────────────────────

describe('DiagramWorkspace connector drag — whole line', () => {
  it('translates every point of a free connector by the drag delta', () => {
    const onChange = vi.fn();
    const conn = makeConnector('c1', [
      { x: 100, y: 100 },
      { x: 300, y: 200 },
    ]);
    render(<DiagramWorkspace value={[conn]} onChange={onChange} />);

    fireEvent.pointerDown(screen.getByTestId('connector-c1'), { clientX: 200, clientY: 150 });
    fireEvent.pointerMove(window, { clientX: 240, clientY: 190 }); // dx=40, dy=40
    fireEvent.pointerUp(window);

    expect(onChange).toHaveBeenCalledTimes(1);
    const el = lastOnChange(onChange).find((e) => e.id === 'c1')!;
    expect(el.points).toEqual([
      { x: 140, y: 140 },
      { x: 340, y: 240 },
    ]);
  });

  it('keeps marker settings when the whole line is dragged', () => {
    const onChange = vi.fn();
    const conn = makeConnector('c1', [
      { x: 100, y: 100 },
      { x: 300, y: 200 },
    ], { sourceMarker: 'one', targetMarker: 'many' });
    render(<DiagramWorkspace value={[conn]} onChange={onChange} />);

    fireEvent.pointerDown(screen.getByTestId('connector-c1'), { clientX: 200, clientY: 150 });
    fireEvent.pointerMove(window, { clientX: 240, clientY: 150 }); // dx=40, dy=0
    fireEvent.pointerUp(window);

    const el = lastOnChange(onChange).find((e) => e.id === 'c1')!;
    expect(el.sourceMarker).toBe('one');
    expect(el.targetMarker).toBe('many');
  });

  it('bakes an attached connector into a free polyline on the first move', () => {
    const onChange = vi.fn();
    const a = box('a', 0, 0, 200, 100); // center (100,50)
    const b = box('b', 400, 0, 200, 100); // center (500,50)
    const conn: DiagramElement = {
      id: 'c', type: 'line', x: 0, y: 0,
      sourceId: 'a', targetId: 'b',
      sourceMarker: 'one', targetMarker: 'one',
    };
    render(<DiagramWorkspace value={[a, b, conn]} onChange={onChange} />);

    // Resolved endpoints are (200,50) on a's right edge and (400,50) on b's left edge.
    fireEvent.pointerDown(screen.getByTestId('connector-c'), { clientX: 300, clientY: 50 });
    fireEvent.pointerMove(window, { clientX: 340, clientY: 100 }); // dx=40, dy=50
    fireEvent.pointerUp(window);

    const el = lastOnChange(onChange).find((e) => e.id === 'c')!;
    // Attached geometry is replaced by explicit points; the line no longer
    // follows the shapes.
    expect(el.sourceId).toBeUndefined();
    expect(el.targetId).toBeUndefined();
    expect(el.points).toEqual([
      { x: 240, y: 100 },
      { x: 440, y: 100 },
    ]);
  });
});

// ── Vertex drag ────────────────────────────────────

describe('DiagramWorkspace connector drag — vertex', () => {
  it('moves only the dragged vertex, leaving the others untouched', () => {
    const onChange = vi.fn();
    const conn = makeConnector('c1', [
      { x: 100, y: 100 },
      { x: 300, y: 100 },
    ]);
    render(<DiagramWorkspace value={[conn]} onChange={onChange} />);

    selectConnector('c1');
    fireEvent.pointerDown(screen.getByTestId('vertex-c1-1'), { clientX: 300, clientY: 100 });
    fireEvent.pointerMove(window, { clientX: 300, clientY: 160 }); // dy=60
    fireEvent.pointerUp(window);

    expect(onChange).toHaveBeenCalledTimes(1);
    const el = lastOnChange(onChange).find((e) => e.id === 'c1')!;
    expect(el.points).toEqual([
      { x: 100, y: 100 },
      { x: 300, y: 160 },
    ]);
  });

  it('bakes an attached connector before reshaping its vertex', () => {
    const onChange = vi.fn();
    // h=120 puts the shape centers on the 20px snap grid (y=60).
    const a = box('a', 0, 0, 200, 120);
    const b = box('b', 400, 0, 200, 120);
    const conn: DiagramElement = {
      id: 'c', type: 'line', x: 0, y: 0, sourceId: 'a', targetId: 'b',
    };
    render(<DiagramWorkspace value={[a, b, conn]} onChange={onChange} />);

    selectConnector('c', { x: 300, y: 60 });
    fireEvent.pointerDown(screen.getByTestId('vertex-c-1'), { clientX: 400, clientY: 60 });
    fireEvent.pointerMove(window, { clientX: 440, clientY: 60 }); // dx=40
    fireEvent.pointerUp(window);

    const el = lastOnChange(onChange).find((e) => e.id === 'c')!;
    expect(el.sourceId).toBeUndefined();
    expect(el.points).toEqual([
      { x: 200, y: 60 },
      { x: 440, y: 60 },
    ]);
  });
});

// ── Midpoint bend insertion ────────────────────────

describe('DiagramWorkspace connector drag — midpoint bend', () => {
  it('inserts a bend point at the midpoint and moves it with the pointer', () => {
    const onChange = vi.fn();
    const conn = makeConnector('c1', [
      { x: 100, y: 100 },
      { x: 300, y: 100 },
    ]);
    render(<DiagramWorkspace value={[conn]} onChange={onChange} />);

    selectConnector('c1');
    fireEvent.pointerDown(screen.getByTestId('midpoint-c1-0'), { clientX: 200, clientY: 100 });
    fireEvent.pointerMove(window, { clientX: 200, clientY: 160 }); // dy=60
    fireEvent.pointerUp(window);

    expect(onChange).toHaveBeenCalledTimes(1);
    const el = lastOnChange(onChange).find((e) => e.id === 'c1')!;
    expect(el.points).toEqual([
      { x: 100, y: 100 },
      { x: 200, y: 160 },
      { x: 300, y: 100 },
    ]);
  });

  it('keeps moving the inserted bend point on continued drags', () => {
    const onChange = vi.fn();
    const conn = makeConnector('c1', [
      { x: 100, y: 100 },
      { x: 300, y: 100 },
    ]);
    render(<DiagramWorkspace value={[conn]} onChange={onChange} />);

    selectConnector('c1');
    fireEvent.pointerDown(screen.getByTestId('midpoint-c1-0'), { clientX: 200, clientY: 100 });
    fireEvent.pointerMove(window, { clientX: 200, clientY: 160 }); // insert + pull down
    fireEvent.pointerMove(window, { clientX: 200, clientY: 220 }); // pull further down
    fireEvent.pointerUp(window);

    const el = lastOnChange(onChange).find((e) => e.id === 'c1')!;
    expect(el.points).toEqual([
      { x: 100, y: 100 },
      { x: 200, y: 220 },
      { x: 300, y: 100 },
    ]);
  });
});

// ── Cardinality marker slide ───────────────────────

describe('DiagramWorkspace drag — cardinality slide', () => {
  it('slides the target cardinality marker along the line and stores its position', () => {
    const onChange = vi.fn();
    const conn = makeConnector('c1', [
      { x: 100, y: 100 },
      { x: 300, y: 100 },
    ], { sourceMarker: 'one', targetMarker: 'many' });
    render(<DiagramWorkspace value={[conn]} onChange={onChange} />);

    selectConnector('c1');
    // Default handle parks 14px past the endpoint along the tangent (300,100) → (314,100).
    fireEvent.pointerDown(screen.getByTestId('marker-target-c1'), { clientX: 314, clientY: 100 });
    fireEvent.pointerMove(window, { clientX: 200, clientY: 100 }); // nearest t = 0.5
    fireEvent.pointerUp(window);

    expect(onChange).toHaveBeenCalledTimes(1);
    const el = lastOnChange(onChange).find((e) => e.id === 'c1')!;
    expect(el.targetMarkerPos).toBe(0.5);
    expect(el.sourceMarkerPos).toBeUndefined();
    // The line geometry itself is untouched.
    expect(el.points).toEqual([
      { x: 100, y: 100 },
      { x: 300, y: 100 },
    ]);
  });

  it('slides the source cardinality marker from its offset handle position', () => {
    const onChange = vi.fn();
    const conn = makeConnector('c1', [
      { x: 100, y: 100 },
      { x: 300, y: 100 },
    ], { sourceMarker: 'one', targetMarker: 'many' });
    render(<DiagramWorkspace value={[conn]} onChange={onChange} />);

    selectConnector('c1');
    // Source handle parks 14px BEFORE the start point (100,100) → (86,100).
    fireEvent.pointerDown(screen.getByTestId('marker-source-c1'), { clientX: 86, clientY: 100 });
    fireEvent.pointerMove(window, { clientX: 150, clientY: 100 }); // nearest t = 0.25
    fireEvent.pointerUp(window);

    const el = lastOnChange(onChange).find((e) => e.id === 'c1')!;
    expect(el.sourceMarkerPos).toBe(0.25);
    expect(el.targetMarkerPos).toBeUndefined();
  });
});

// ── No-op clicks ───────────────────────────────────

describe('DiagramWorkspace connector clicks', () => {
  it('selects a connector on a plain click without committing history', () => {
    const onChange = vi.fn();
    const conn = makeConnector('c1', [
      { x: 100, y: 100 },
      { x: 300, y: 100 },
    ]);
    render(<DiagramWorkspace value={[conn]} onChange={onChange} />);

    selectConnector('c1');

    expect(onChange).not.toHaveBeenCalled();
    // Selection reveals the editing handles.
    expect(screen.getByTestId('vertex-c1-0')).toBeInTheDocument();
    expect(screen.getByTestId('vertex-c1-1')).toBeInTheDocument();
    expect(screen.getByTestId('midpoint-c1-0')).toBeInTheDocument();
  });

  it('exposes marker slide handles only when the connector carries markers', () => {
    const onChange = vi.fn();
    const bare = makeConnector('plain', [
      { x: 100, y: 100 },
      { x: 300, y: 100 },
    ]);
    const marked = makeConnector('marked', [
      { x: 100, y: 200 },
      { x: 300, y: 200 },
    ], { sourceMarker: 'one', targetMarker: 'many' });
    render(<DiagramWorkspace value={[bare, marked]} onChange={onChange} />);

    selectConnector('marked');
    expect(screen.getByTestId('marker-source-marked')).toBeInTheDocument();
    expect(screen.getByTestId('marker-target-marked')).toBeInTheDocument();

    fireEvent.pointerDown(screen.getByTestId('connector-plain'), { clientX: 200, clientY: 100 });
    fireEvent.pointerUp(window);
    expect(screen.queryByTestId('marker-source-plain')).not.toBeInTheDocument();
    expect(screen.queryByTestId('marker-target-plain')).not.toBeInTheDocument();
  });
});

// ── Shape move (select tool) ───────────────────────

describe('DiagramWorkspace drag — move shape', () => {
  it('moves a shape by the drag delta (snapped to the grid)', () => {
    const onChange = vi.fn();
    const a = box('a', 0, 0, 200, 100);
    render(<DiagramWorkspace value={[a]} onChange={onChange} />);

    fireEvent.pointerDown(screen.getByTestId('shape-a'), { clientX: 150, clientY: 80 });
    fireEvent.pointerMove(window, { clientX: 190, clientY: 100 }); // dx=40, dy=20
    fireEvent.pointerUp(window);

    expect(onChange).toHaveBeenCalledTimes(1);
    const el = lastOnChange(onChange).find((e) => e.id === 'a')!;
    expect(el.x).toBe(40);
    expect(el.y).toBe(20);
  });

  it('snaps off-grid drag deltas to the 20px grid', () => {
    const onChange = vi.fn();
    const a = box('a', 0, 0, 200, 100);
    render(<DiagramWorkspace value={[a]} onChange={onChange} />);

    fireEvent.pointerDown(screen.getByTestId('shape-a'), { clientX: 150, clientY: 80 });
    fireEvent.pointerMove(window, { clientX: 183, clientY: 127 }); // dx=33, dy=47
    fireEvent.pointerUp(window);

    const el = lastOnChange(onChange).find((e) => e.id === 'a')!;
    expect(el.x).toBe(40); // Math.round(33/20) = 2 → 40
    expect(el.y).toBe(40); // Math.round(47/20) = 2 → 40
  });

  it('keeps attached connectors following the shape', () => {
    const onChange = vi.fn();
    const a = box('a', 0, 0, 200, 100);
    const b = box('b', 400, 0, 200, 100);
    const conn: DiagramElement = {
      id: 'c', type: 'line', x: 0, y: 0, sourceId: 'a', targetId: 'b',
    };
    const { container } = render(<DiagramWorkspace value={[a, b, conn]} onChange={onChange} />);

    // The connector starts on a's right edge (200,50) and b's left edge (400,50).
    // The visible path is the only one with the default #475569 stroke — the hit
    // path is transparent and (since nothing is selected) no highlight overlay
    // exists. Both share the same `d`, so the selector only needs to be unique.
    const visiblePath = container.querySelector('[data-testid="connector-c"] path[stroke="#475569"]')!;
    expect(visiblePath.getAttribute('d')).toBe('M 200 50 L 400 50');

    fireEvent.pointerDown(screen.getByTestId('shape-a'), { clientX: 100, clientY: 50 });
    fireEvent.pointerMove(window, { clientX: 140, clientY: 50 }); // dx=40, dy=0
    fireEvent.pointerUp(window);

    const el = lastOnChange(onChange).find((e) => e.id === 'a')!;
    expect(el.x).toBe(40);
    // The connector stayed attached (sourceId/targetId preserved) but its
    // rendered line now starts at a's new right edge (240,50).
    const updatedPath = container.querySelector('[data-testid="connector-c"] path[stroke="#475569"]')!;
    expect(updatedPath.getAttribute('d')).toBe('M 240 50 L 400 50');
  });

  it('selects a shape on a plain click without committing history', () => {
    const onChange = vi.fn();
    const a = box('a', 0, 0, 200, 100);
    render(<DiagramWorkspace value={[a]} onChange={onChange} />);

    selectShape('a', { x: 100, y: 50 });

    expect(onChange).not.toHaveBeenCalled();
    // Selection reveals the resize handles.
    expect(screen.getByTestId('resize-a-br')).toBeInTheDocument();
    expect(screen.getByTestId('resize-a-tl')).toBeInTheDocument();
  });
});

// ── Shape resize ───────────────────────────────────

describe('DiagramWorkspace drag — resize shape', () => {
  it('grows the box from the bottom-right handle', () => {
    const onChange = vi.fn();
    const a = box('a', 0, 0, 200, 100);
    render(<DiagramWorkspace value={[a]} onChange={onChange} />);

    selectShape('a', { x: 100, y: 50 });
    fireEvent.pointerDown(screen.getByTestId('resize-a-br'), { clientX: 200, clientY: 100 });
    fireEvent.pointerMove(window, { clientX: 240, clientY: 140 }); // dx=40, dy=40
    fireEvent.pointerUp(window);

    expect(onChange).toHaveBeenCalledTimes(1);
    const el = lastOnChange(onChange).find((e) => e.id === 'a')!;
    expect(el.x).toBe(0);
    expect(el.y).toBe(0);
    expect(el.width).toBe(240);
    expect(el.height).toBe(140);
  });

  it('shrinks the box and clamps to the minimum size', () => {
    const onChange = vi.fn();
    const a = box('a', 0, 0, 200, 100);
    render(<DiagramWorkspace value={[a]} onChange={onChange} />);

    selectShape('a', { x: 100, y: 50 });
    fireEvent.pointerDown(screen.getByTestId('resize-a-br'), { clientX: 200, clientY: 100 });
    fireEvent.pointerMove(window, { clientX: -200, clientY: -200 }); // dx=-400, dy=-300
    fireEvent.pointerUp(window);

    const el = lastOnChange(onChange).find((e) => e.id === 'a')!;
    expect(el.width).toBe(30);
    expect(el.height).toBe(24);
  });

  it('resizes from the left handle and shifts x accordingly', () => {
    const onChange = vi.fn();
    const a = box('a', 0, 0, 200, 100);
    render(<DiagramWorkspace value={[a]} onChange={onChange} />);

    selectShape('a', { x: 100, y: 50 });
    fireEvent.pointerDown(screen.getByTestId('resize-a-l'), { clientX: 0, clientY: 50 });
    fireEvent.pointerMove(window, { clientX: -40, clientY: 50 }); // dx=-40
    fireEvent.pointerUp(window);

    const el = lastOnChange(onChange).find((e) => e.id === 'a')!;
    expect(el.x).toBe(-40);
    expect(el.width).toBe(240);
    expect(el.height).toBe(100);
  });

  it('resizes from the top handle and shifts y accordingly', () => {
    const onChange = vi.fn();
    const a = box('a', 0, 0, 200, 100);
    render(<DiagramWorkspace value={[a]} onChange={onChange} />);

    selectShape('a', { x: 100, y: 50 });
    fireEvent.pointerDown(screen.getByTestId('resize-a-t'), { clientX: 100, clientY: 0 });
    fireEvent.pointerMove(window, { clientX: 100, clientY: -40 }); // dy=-40
    fireEvent.pointerUp(window);

    const el = lastOnChange(onChange).find((e) => e.id === 'a')!;
    expect(el.y).toBe(-40);
    expect(el.height).toBe(140);
  });
});
