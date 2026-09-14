import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, screen, within, act } from '@testing-library/react';
import { DiagramWorkspace, type DiagramElement } from '@components/workspace/diagram-workspace';

// The save-for-later library and autosave drafts persist to the browser's
// localStorage, so each test starts from a clean slate.
beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

function box(id: string, x: number, y: number, w: number, h: number, text = 'Entity'): DiagramElement {
  return { id, type: 'box', x, y, width: w, height: h, text };
}

describe('DiagramWorkspace save-for-later', () => {
  it('saves the current canvas as a named design in the browser', () => {
    const onChange = vi.fn();
    render(<DiagramWorkspace value={[box('a', 40, 40, 160, 70)]} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    // Modal opens with a name input
    fireEvent.change(screen.getByLabelText('Design name'), { target: { value: 'My ERD' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save design' }));

    // The design is persisted (the modal unmounts behind framer-motion's
    // exit animation, which jsdom does not complete).
    const stored = JSON.parse(window.localStorage.getItem('savedDiagramDesigns') ?? '[]') as Array<{
      name: string;
      diagramType: string;
      elements: DiagramElement[];
    }>;
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ name: 'My ERD', diagramType: 'ERD' });
    expect(stored[0]!.elements).toHaveLength(1);
  });

  it('lists saved designs and loads one back into the canvas', () => {
    const savedElements = [box('a', 40, 40, 160, 70), box('b', 300, 40, 160, 70, 'Customer')];
    window.localStorage.setItem(
      'savedDiagramDesigns',
      JSON.stringify([
        {
          id: 'd-1',
          name: 'Payroll ERD',
          diagramType: 'ERD',
          elements: savedElements,
          savedAt: 1750000000000,
        },
      ]),
    );

    const onChange = vi.fn();
    render(<DiagramWorkspace value={[box('c', 20, 20, 100, 50)]} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Saved' }));
    expect(screen.getByRole('heading', { name: 'Saved designs' })).toBeInTheDocument();
    expect(screen.getByText('Payroll ERD')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Load' }));

    // Canvas replaced with the saved design (via commit → onChange)
    expect(onChange).toHaveBeenCalled();
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1]![0] as DiagramElement[];
    expect(lastCall.map((el) => el.id)).toEqual(['a', 'b']);
  });

  it('deletes a saved design from the library', () => {
    window.localStorage.setItem(
      'savedDiagramDesigns',
      JSON.stringify([
        { id: 'd-1', name: 'Keep me', diagramType: 'ERD', elements: [], savedAt: 1750000000000 },
        { id: 'd-2', name: 'Delete me', diagramType: 'DFD', elements: [], savedAt: 1750000001000 },
      ]),
    );

    render(<DiagramWorkspace value={[]} onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Saved' }));

    const row = screen.getByText('Delete me').closest('li')!;
    fireEvent.click(within(row).getByRole('button', { name: 'Delete this saved design' }));

    expect(screen.queryByText('Delete me')).not.toBeInTheDocument();
    expect(screen.getByText('Keep me')).toBeInTheDocument();

    const stored = JSON.parse(window.localStorage.getItem('savedDiagramDesigns') ?? '[]') as Array<{
      name: string;
    }>;
    expect(stored.map((d) => d.name)).toEqual(['Keep me']);
  });

  it('hides the Save/Saved buttons in read-only mode', () => {
    render(<DiagramWorkspace value={[]} onChange={vi.fn()} readOnly />);
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Saved' })).not.toBeInTheDocument();
  });

  it('shows an empty state when no designs have been saved yet', () => {
    render(<DiagramWorkspace value={[]} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Saved' }));
    expect(screen.getByText(/No saved designs yet/)).toBeInTheDocument();
  });
});

describe('DiagramWorkspace autosave draft', () => {
  // "Clear diagram" asks for confirmation before wiping the canvas.
  beforeEach(() => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('backs up changes to localStorage every few seconds', () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'] });
    render(<DiagramWorkspace value={[box('a', 40, 40, 160, 70)]} onChange={vi.fn()} />);

    // No change since mount → the first tick writes nothing.
    act(() => vi.advanceTimersByTime(3000));
    expect(window.localStorage.getItem('diagramDraft:default:ERD')).toBeNull();

    // Make a change (clear the canvas), then the next tick backs it up.
    fireEvent.click(screen.getByRole('button', { name: 'Clear diagram' }));
    act(() => vi.advanceTimersByTime(3000));

    const draft = JSON.parse(window.localStorage.getItem('diagramDraft:default:ERD') ?? 'null') as {
      elements: DiagramElement[];
      savedAt: number;
    };
    expect(Array.isArray(draft.elements)).toBe(true);
    expect(draft.elements).toEqual([]);
    expect(draft.savedAt).toBeGreaterThan(0);
  });

  it('restores a previous draft when the canvas mounts empty', () => {
    const saved = [box('a', 40, 40, 160, 70)];
    window.localStorage.setItem(
      'diagramDraft:default:ERD',
      JSON.stringify({ elements: saved, savedAt: 1750000000000 }),
    );

    const onChange = vi.fn();
    render(<DiagramWorkspace value={[]} onChange={onChange} />);

    expect(onChange).toHaveBeenCalled();
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1]![0] as DiagramElement[];
    expect(lastCall).toEqual(saved);
  });

  it('does not restore a draft over a canvas that already has content', () => {
    const draft = [box('a', 40, 40, 160, 70)];
    window.localStorage.setItem(
      'diagramDraft:default:ERD',
      JSON.stringify({ elements: draft, savedAt: 1750000000000 }),
    );

    const onChange = vi.fn();
    render(<DiagramWorkspace value={[box('b', 300, 40, 160, 70)]} onChange={onChange} />);

    expect(onChange).not.toHaveBeenCalled();
  });

  it('does not autosave or restore in read-only mode', () => {
    window.localStorage.setItem(
      'diagramDraft:default:ERD',
      JSON.stringify({ elements: [box('a', 40, 40, 160, 70)], savedAt: 1750000000000 }),
    );

    const onChange = vi.fn();
    render(<DiagramWorkspace value={[]} onChange={onChange} readOnly />);

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByText(/Draft saved/)).not.toBeInTheDocument();
  });

  it('uses the provided draftKey for its storage slot', () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'] });
    render(
      <DiagramWorkspace
        value={[box('a', 40, 40, 160, 70)]}
        onChange={vi.fn()}
        draftKey="database/designs/erd/diagram.json"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Clear diagram' }));
    act(() => vi.advanceTimersByTime(3000));

    expect(window.localStorage.getItem('diagramDraft:database/designs/erd/diagram.json')).not.toBeNull();
    expect(window.localStorage.getItem('diagramDraft:default:ERD')).toBeNull();
  });
});
