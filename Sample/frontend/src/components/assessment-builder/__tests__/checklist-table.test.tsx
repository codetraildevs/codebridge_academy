import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ChecklistTable, type ChecklistTableItem } from '@components/assessment-builder/checklist-table';

const S1 = 'Preliminary activities (15%)';
const S2 = 'Closing activities (10%)';

const items: ChecklistTableItem[] = [
  { id: '1', title: 'Employee entity is drawn', description: '1.1. Conceptual database schema is properly designed', section: S1, weight: 2 },
  { id: '2', title: 'Employee attributes are included', description: '1.1. Conceptual database schema is properly designed', section: S1, weight: 2 },
  { id: '3', title: 'Position entity is drawn', description: '1.2. Entity relationships are correct', section: S1, weight: 2 },
  { id: '4', title: 'Work area is cleaned', description: null, section: S2, weight: 2 },
];

describe('ChecklistTable', () => {
  it('renders each section header once (no per-row duplication)', () => {
    render(<ChecklistTable items={items} />);
    expect(screen.getAllByText(S1)).toHaveLength(1);
    expect(screen.getAllByText(S2)).toHaveLength(1);
  });

  it('merges the criteria cell across rows that share the same description', () => {
    render(<ChecklistTable items={items} />);
    // The shared criteria must appear exactly once (merged via rowSpan),
    // not once per indicator row.
    expect(screen.getAllByText('1.1. Conceptual database schema is properly designed')).toHaveLength(1);
    expect(screen.getAllByText('1.2. Entity relationships are correct')).toHaveLength(1);
  });

  it('never truncates criteria text — the merged cell wraps instead of clipping', () => {
    render(<ChecklistTable items={items} />);
    const criteriaCell = screen
      .getByText('1.1. Conceptual database schema is properly designed')
      .closest('td');
    expect(criteriaCell).toBeTruthy();
    // Explicit wrapping + normal whitespace; no truncate / ellipsis / clipping.
    expect(criteriaCell!.className).toContain('break-words');
    expect(criteriaCell!.className).toContain('whitespace-normal');
    expect(criteriaCell!.className).not.toMatch(/truncate|line-clamp|max-h/);
    // The merged cell spans both indicator rows of the block (full text stays visible).
    expect(criteriaCell!.getAttribute('rowspan')).toBe('2');
  });

  it('wraps long indicator text instead of truncating it', () => {
    render(<ChecklistTable items={items} />);
    const indicatorCell = screen.getByText('Employee entity is drawn').closest('td');
    expect(indicatorCell).toBeTruthy();
    expect(indicatorCell!.className).toContain('break-words');
    expect(indicatorCell!.className).not.toMatch(/truncate|line-clamp/);
  });

  it('renders per-section subtotals, grand total and a 70% pass mark', () => {
    render(<ChecklistTable items={items} />);
    // Section 1 subtotal = 2+2+2 = 6, section 2 subtotal = 2, grand total = 8
    const subtotals = screen.getAllByText('Section subtotal');
    expect(subtotals).toHaveLength(2);
    expect(screen.getAllByText('8')).toHaveLength(1); // grand total
    expect(screen.getByText('Grand total')).toBeInTheDocument();
    // Pass mark = ceil(8 * 0.7) = 6; '6' appears as section-1 subtotal and pass mark
    expect(screen.getByText(/Pass mark \(70%\)/)).toBeInTheDocument();
    expect(screen.getAllByText('6')).toHaveLength(2);
  });

  it('deduplicates legacy items whose description is the section name', () => {
    const legacy: ChecklistTableItem[] = [
      { id: '9', title: 'Employee entity is drawn', description: '1. Preliminary activities performance (15%)', section: S1, weight: 2 },
    ];
    render(<ChecklistTable items={legacy} />);
    // The section label must NOT be repeated as criteria text on the row.
    expect(screen.getAllByText(/Preliminary activities/)).toHaveLength(1); // only the header
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('allows editing the Max mark via onWeightChange (committed on blur)', () => {
    const onWeightChange = vi.fn();
    render(<ChecklistTable items={items} onWeightChange={onWeightChange} />);
    const inputs = screen.getAllByRole('spinbutton');
    expect(inputs).toHaveLength(4);
    fireEvent.change(inputs[0]!, { target: { value: '5' } });
    fireEvent.blur(inputs[0]!);
    expect(onWeightChange).toHaveBeenCalledWith('1', 5);
  });

  it('clicking the merged criteria text opens ONE editor for the whole block', () => {
    render(<ChecklistTable items={items} onDescriptionChange={vi.fn()} />);
    // The merged criteria text is rendered once — clicking it enters edit mode.
    fireEvent.click(screen.getByText('1.1. Conceptual database schema is properly designed'));
    // Exactly one click-to-edit editor for the 2-row block, never one per indicator row.
    expect(screen.getAllByText('Click away to save · Esc to cancel')).toHaveLength(1);
  });

  it('auto-saves an edited merged criteria on blur — updating every indicator row of the block', async () => {
    const onDescriptionChange = vi.fn();
    render(<ChecklistTable items={items} onDescriptionChange={onDescriptionChange} />);
    fireEvent.click(screen.getByText('1.1. Conceptual database schema is properly designed'));
    // Type a real edit into the rich-text editor (ProseMirror picks up the DOM
    // change on input, exactly like typing in a browser)…
    const pm = document.querySelector('.ProseMirror') as HTMLElement;
    expect(pm).toBeTruthy();
    pm.textContent = '1.1. schema designed from requirements';
    fireEvent.input(pm);
    await new Promise((r) => setTimeout(r, 30));
    // …then click away — the whole block auto-saves (fireEvent.blur dispatches
    // a bubbling focusout, like a real blur would).
    fireEvent.blur(pm);
    // Both rows of the merged block are updated, so the criteria never re-duplicates.
    expect(onDescriptionChange).toHaveBeenCalledTimes(2);
    expect(onDescriptionChange.mock.calls.map((c) => c[0]).sort()).toEqual(['1', '2']);
    // The committed value is the edited rich-text HTML.
    expect(String(onDescriptionChange.mock.calls[0]![1])).toContain('schema designed from requirements');
  });

  it('does not save the criteria on a click-away with no edits', () => {
    const onDescriptionChange = vi.fn();
    render(<ChecklistTable items={items} onDescriptionChange={onDescriptionChange} />);
    fireEvent.click(screen.getByText('1.1. Conceptual database schema is properly designed'));
    const pm = document.querySelector('.ProseMirror') as HTMLElement;
    fireEvent.blur(pm);
    // Zero net edits → no spurious per-row updates / API calls.
    expect(onDescriptionChange).not.toHaveBeenCalled();
  });

  it('click-to-edit an indicator: inline input auto-saves on blur with the same id', () => {
    const onTitleChange = vi.fn();
    render(<ChecklistTable items={items} onTitleChange={onTitleChange} />);
    fireEvent.click(screen.getByText('Employee entity is drawn'));
    const input = screen.getByDisplayValue('Employee entity is drawn') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Employee entity is designed' } });
    fireEvent.blur(input);
    // Same id ('1') is preserved — the indicator is updated in place, never recreated.
    expect(onTitleChange).toHaveBeenCalledTimes(1);
    expect(onTitleChange).toHaveBeenCalledWith('1', 'Employee entity is designed');
  });

  it('auto-saves an edited indicator on Enter as well', () => {
    const onTitleChange = vi.fn();
    render(<ChecklistTable items={items} onTitleChange={onTitleChange} />);
    fireEvent.click(screen.getByText('Position entity is drawn'));
    const input = screen.getByDisplayValue('Position entity is drawn') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Position entities are drawn' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onTitleChange).toHaveBeenCalledWith('3', 'Position entities are drawn');
  });

  it('cancels indicator editing with Esc without saving', () => {
    const onTitleChange = vi.fn();
    render(<ChecklistTable items={items} onTitleChange={onTitleChange} />);
    fireEvent.click(screen.getByText('Employee entity is drawn'));
    const input = screen.getByDisplayValue('Employee entity is drawn') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Should not persist' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(onTitleChange).not.toHaveBeenCalled();
  });

  it('shows a per-row × button that removes only the clicked indicator', () => {
    const onDelete = vi.fn();
    render(<ChecklistTable items={items} onDelete={onDelete} />);
    const removeButtons = screen.getAllByRole('button', { name: 'Remove indicator' });
    expect(removeButtons).toHaveLength(4); // one per indicator row
    fireEvent.click(removeButtons[0]!);
    expect(onDelete).toHaveBeenCalledTimes(1);
    // Only that indicator is removed — the rest of the block is untouched.
    expect(onDelete.mock.calls[0]![0].id).toBe('1');
  });

  it('deletes a whole criterion block via the merged-cell Delete criterion action', () => {
    const onDelete = vi.fn();
    render(<ChecklistTable items={items} onDelete={onDelete} />);
    // Only multi-indicator blocks expose the criterion-level delete (2-item 1.1. block).
    expect(screen.getAllByText('Delete criterion')).toHaveLength(1);
    fireEvent.click(screen.getByText('Delete criterion'));
    // Inline confirmation before the block is removed.
    expect(screen.getByText(/Delete this criterion \+ 2 indicators\?/)).toBeInTheDocument();
    fireEvent.click(screen.getByText('Delete'));
    expect(onDelete.mock.calls.map((c) => c[0].id)).toEqual(['1', '2']);
  });

  it('hides the Action column in read-only contexts', () => {
    render(<ChecklistTable items={items} />);
    expect(screen.queryByText('Action')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove indicator' })).not.toBeInTheDocument();
  });

  it('renders import-engine section metadata (weight % and printed subtotal)', () => {
    render(
      <ChecklistTable
        items={items}
        sectionMeta={{
          [S1]: { weightPct: 40, subtotalMarks: 32 },
          [S2]: { weightPct: 10, subtotalMarks: null },
        }}
      />,
    );
    expect(screen.getByText('40%')).toBeInTheDocument();
    expect(screen.getByText('32 marks')).toBeInTheDocument();
    // A section without a printed subtotal shows only its weight
    expect(screen.getAllByText('10%')).toHaveLength(1);
  });

  it('renders dynamically-detected sections in DOCUMENT order, not canonical order', () => {
    // SPE-style imported sections appear in the printed order — canonical
    // re-ordering would push "Product presentation/…" after "Closing activities"
    // and scramble the sheet. First-appearance order must be preserved.
    const dynamic: ChecklistTableItem[] = [
      { id: '1', title: 'ERD is drawn', description: '1.1. Schema', section: 'Preliminary activities performance (15%)', weight: 2 },
      { id: '2', title: 'Product is presented', description: '3.1. Live demo', section: 'Product presentation/Exhibition and/or quality assessment (25%)', weight: 7 },
      { id: '3', title: 'Work area is cleaned', description: '4.1. Cleanup', section: 'Closing activities (5%)', weight: 1 },
    ];
    render(<ChecklistTable items={dynamic} />);
    const s1 = screen.getByText('Preliminary activities performance (15%)');
    const s2 = screen.getByText('Product presentation/Exhibition and/or quality assessment (25%)');
    const s3 = screen.getByText('Closing activities (5%)');
    expect(s1.compareDocumentPosition(s2) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(s2.compareDocumentPosition(s3) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('keeps canonical manual-builder sections in printed order even when items are listed out of order', () => {
    // A manual-builder assessment uses the exact CHECKLIST_SECTIONS labels;
    // the sheet must still render Preliminary → … → Closing even if the user
    // created the Closing item first.
    const outOfOrder: ChecklistTableItem[] = [
      { id: '1', title: 'Work area is cleaned', description: '4.1. Cleanup', section: 'Closing activities (10%)', weight: 1 },
      { id: '2', title: 'ERD is drawn', description: '1.1. Schema', section: 'Preliminary activities (15%)', weight: 2 },
    ];
    render(<ChecklistTable items={outOfOrder} />);
    const prelim = screen.getByText('Preliminary activities (15%)');
    const closing = screen.getByText('Closing activities (10%)');
    expect(prelim.compareDocumentPosition(closing) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('renders items with no section under a trailing "Other" group', () => {
    const mixed: ChecklistTableItem[] = [
      { id: '1', title: 'ERD is drawn', description: null, section: 'Closing activities (10%)', weight: 2 },
      { id: '2', title: 'Notes on the sheet', description: null, section: null, weight: 0 },
    ];
    render(<ChecklistTable items={mixed} />);
    expect(screen.getByText('Closing activities (10%)')).toBeInTheDocument();
    expect(screen.getByText('Other')).toBeInTheDocument();
    // The bucket appears after the real sections.
    const closing = screen.getByText('Closing activities (10%)');
    const other = screen.getByText('Other');
    expect(closing.compareDocumentPosition(other) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('offers dynamically-detected sections in the group selector', () => {
    const onSectionChange = vi.fn();
    render(
      <ChecklistTable
        items={items}
        onSectionChange={onSectionChange}
        sectionOptions={[S1, S2, 'Product requirement Analysis (20%)']}
      />,
    );
    const select = screen.getAllByRole('combobox')[0]!;
    const options = Array.from(select.querySelectorAll('option')).map((o) => o.textContent);
    expect(options).toContain('Product requirement Analysis (20%)');
  });

  it('calls onMove with the direction and disables at list boundaries', () => {
    const onMove = vi.fn();
    render(<ChecklistTable items={items} onMove={onMove} />);
    const upButtons = screen.getAllByRole('button', { name: 'Move indicator up' });
    const downButtons = screen.getAllByRole('button', { name: 'Move indicator down' });
    expect(upButtons).toHaveLength(4);
    // First row cannot move up, last row cannot move down
    expect(upButtons[0]).toBeDisabled();
    expect(downButtons[3]).toBeDisabled();
    fireEvent.click(downButtons[0]!);
    expect(onMove).toHaveBeenCalledWith('1', 'down');
    fireEvent.click(upButtons[1]!);
    expect(onMove).toHaveBeenCalledWith('2', 'up');
  });
});
