import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RubricScoring, type RubricScoringItem } from '@components/assessor-review/rubric-scoring';

const S1 = 'Preliminary activities (15%)';

const items: RubricScoringItem[] = [
  { id: 'item-1', title: 'Employee entity is drawn', description: '1.1. Conceptual database schema is properly designed', section: S1, weight: 2 },
  { id: 'item-2', title: 'Employee attributes are included', description: '1.1. Conceptual database schema is properly designed', section: S1, weight: 2 },
  { id: 'item-3', title: 'Position entity is drawn', description: '1.2. Entity relationships are correct', section: S1, weight: 2 },
];

describe('RubricScoring', () => {
  it('renders the section band once with merged criteria cells and a score input per indicator', () => {
    render(<RubricScoring items={items} scores={{}} onScoreChange={vi.fn()} />);
    // Section header appears once, criteria text appears once (merged across 2 rows).
    expect(screen.getAllByText(S1)).toHaveLength(1);
    expect(screen.getAllByText('1.1. Conceptual database schema is properly designed')).toHaveLength(1);
    // One labelled score input per indicator.
    expect(screen.getByLabelText('Score for Employee entity is drawn')).toBeInTheDocument();
    expect(screen.getByLabelText('Score for Employee attributes are included')).toBeInTheDocument();
    expect(screen.getByLabelText('Score for Position entity is drawn')).toBeInTheDocument();
  });

  it('commits a score on blur and clamps it to the indicator max', () => {
    const onScoreChange = vi.fn();
    render(<RubricScoring items={items} scores={{}} onScoreChange={onScoreChange} />);
    const input = screen.getByLabelText('Score for Employee entity is drawn');
    fireEvent.change(input, { target: { value: '99' } });
    fireEvent.blur(input);
    // Max mark is 2 — the value is clamped on commit.
    expect(onScoreChange).toHaveBeenCalledWith('item-1', 2);
  });

  it('commits a score on Enter as well', () => {
    const onScoreChange = vi.fn();
    render(<RubricScoring items={items} scores={{}} onScoreChange={onScoreChange} />);
    const input = screen.getByLabelText('Score for Employee entity is drawn');
    fireEvent.change(input, { target: { value: '1' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onScoreChange).toHaveBeenCalledWith('item-1', 1);
  });

  it('clears a score via the per-row clear button', () => {
    const onScoreChange = vi.fn();
    render(<RubricScoring items={items} scores={{ 'item-1': 2 }} onScoreChange={onScoreChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Clear score for Employee entity is drawn' }));
    expect(onScoreChange).toHaveBeenCalledWith('item-1', null);
  });

  it('does not commit when the input is emptied without a change (blur with no value)', () => {
    const onScoreChange = vi.fn();
    render(<RubricScoring items={items} scores={{ 'item-1': 2 }} onScoreChange={onScoreChange} />);
    const input = screen.getByLabelText('Score for Employee entity is drawn');
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);
    // Explicitly clearing an entered score IS a change (null)…
    expect(onScoreChange).toHaveBeenCalledWith('item-1', null);
    // …but an empty input over an already-empty score stays a no-op.
    onScoreChange.mockClear();
    const empty = screen.getByLabelText('Score for Position entity is drawn');
    fireEvent.blur(empty);
    expect(onScoreChange).not.toHaveBeenCalled();
  });

  it('shows live section subtotals, grand total and percentage', () => {
    render(<RubricScoring items={items} scores={{ 'item-1': 2, 'item-2': 1 }} onScoreChange={vi.fn()} />);
    // Entered total 2+1 = 3 (section subtotal and grand total both show it),
    // max total 6 (section subtotal and grand total), percentage 3/6 = 50%.
    expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('6').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('shows a friendly empty state when there are no checklist items', () => {
    render(<RubricScoring items={[]} scores={{}} onScoreChange={vi.fn()} />);
    expect(screen.getByText(/no checklist items yet/i)).toBeInTheDocument();
  });
});
