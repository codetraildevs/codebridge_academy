import { Fragment, useState } from 'react';
import { Trash2, Award, PencilLine, X, ArrowUp, ArrowDown, Percent, Sigma } from 'lucide-react';
import { CHECKLIST_SECTIONS, groupChecklistItems, groupCriteriaBlocks, sectionWeightPct, type SectionMeta } from './checklist-sections';
import { RichTextEditor } from './rich-text-editor';
import { RichTextRenderer } from './rich-text-renderer';
import { cn } from '@utils/cn';

/** Minimal shape a checklist item needs for table rendering. */
export interface ChecklistTableItem {
  id: string;
  /** Indicator text (what the assessor checks). */
  title: string;
  /** Criteria text (the numbered criterion this indicator belongs to). */
  description?: string | null;
  section: string | null;
  weight: number;
}

interface ChecklistTableProps {
  items: ChecklistTableItem[];
  emptyMessage?: string;
  /** When provided, each row shows a × remove button (removes only that indicator). */
  onDelete?: (item: ChecklistTableItem) => void;
  /** When provided, the Max column renders an editable number input (committed on blur/Enter). */
  onWeightChange?: (itemId: string, weight: number) => void;
  /** When provided, the section header shows a selector that moves the whole group. */
  onSectionChange?: (fromSection: string, toSection: string) => void;
  /** When provided, each row shows ▲/▼ buttons that reorder it in the list (orderIndex). */
  onMove?: (itemId: string, direction: 'up' | 'down') => void;
  /** When provided, the criteria cell becomes a click-to-edit rich-text editor (auto-saves on blur). */
  onDescriptionChange?: (itemId: string, html: string) => void;
  /** When provided, the indicator text becomes click-to-edit (auto-saves on blur/Enter). */
  onTitleChange?: (itemId: string, title: string) => void;
  /**
   * Sections the group selector offers (defaults to the canonical four).
   * Imported documents detect sections dynamically, so the wizard passes the
   * union of detected + canonical names.
   */
  sectionOptions?: string[];
  /** Import-engine metadata (weight %, printed subtotal) keyed by section name. */
  sectionMeta?: Record<string, SectionMeta>;
  className?: string;
}

/** Percentage of the grand total required to pass. */
export const PASS_MARK_PERCENT = 70;

/**
 * True when the edited criteria HTML differs from the stored value in real
 * content terms. Tag-normalization (e.g. TipTap wrapping plain text in
 * `<p>…</p>`) is NOT an edit, but text or embedded media (image/table/video)
 * changes are — so a click-away without edits never fires a save.
 */
function hasCriteriaChanged(original: string | null | undefined, edited: string): boolean {
  const plain = (html: string) =>
    html
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;|&#160;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
  if (plain(edited) !== plain(original ?? '')) return true;
  // An image/table/video added without any text change is still an edit.
  const media = (html: string) => (html.match(/<(img|table|video|audio)\b[^>]*>/gi) || []).join(' ');
  return media(edited) !== media(original ?? '');
}

/** Editable Max cell — commits on blur or Enter (no API call per keystroke). */
function EditableWeight({
  value,
  onCommit,
}: {
  value: number;
  onCommit: (weight: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  const commit = () => {
    const next = Math.max(1, Number(draft) || 1);
    setDraft(String(next));
    if (next !== value) onCommit(next);
  };
  return (
    <input
      type="number"
      min={1}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
      }}
      className="block w-16 rounded-lg border border-border bg-white px-2 py-1 text-right text-xs font-medium text-text-primary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
    />
  );
}

/**
 * Renders an assessment checklist as a table mirroring the printed TSS
 * practical-exam marking sheet (see `samples/sample_sod.pdf`):
 *   • a section header row spanning the table (section shown once per group)
 *   • "Assessment criteria" merged vertically across the indicators it covers,
 *     rendered as ONE clean cell — no horizontal lines run through it, and
 *     long criteria wraps to its full height instead of being truncated
 *     (no ellipsis, no clipping: break-words + whitespace-normal + auto height)
 *   • indicators and criteria are click-to-edit with auto-save on blur/Enter
 *     (the same ID is preserved — never recreated, never duplicated)
 *   • a × remove button on every indicator row (removes only that indicator)
 *   • a "Delete criterion" action on the merged cell (removes the whole block)
 *   • a subtotal row per section, then a grand total row and a pass mark row
 *   • columns `Assessment criteria | Indicators | Max | Action`
 * The section name is never repeated on data rows, and any legacy items that
 * stored the section name as their description are deduplicated on display.
 */
export function ChecklistTable({
  items,
  emptyMessage,
  onDelete,
  onWeightChange,
  onSectionChange,
  onMove,
  onDescriptionChange,
  onTitleChange,
  sectionOptions,
  sectionMeta,
  className,
}: ChecklistTableProps) {
  const [editingDescriptionId, setEditingDescriptionId] = useState<string | null>(null);
  const [editingDescription, setEditingDescription] = useState('');
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [confirmDeleteBlockId, setConfirmDeleteBlockId] = useState<string | null>(null);

  /**
   * Auto-saves an edited indicator on blur/Enter — the item keeps its id, so
   * the relationship to its criteria block is preserved (never recreated).
   */
  const commitTitle = () => {
    if (editingTitleId) {
      const next = editingTitle.trim();
      const original = items.find((i) => i.id === editingTitleId);
      if (next && original && next !== original.title) {
        onTitleChange?.(editingTitleId, next);
      }
    }
    setEditingTitleId(null);
  };
  const groups = groupChecklistItems(items);

  if (groups.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-text-tertiary">
        {emptyMessage ?? 'No checklist items yet.'}
      </p>
    );
  }

  const grandTotal = groups.reduce((sum, g) => sum + g.totalWeight, 0);
  const passMark = Math.ceil((grandTotal * PASS_MARK_PERCENT) / 100);
  const hasActions = Boolean(onDelete || onSectionChange || onMove);
  const colSpanTotal = hasActions ? 4 : 3; // criteria, indicators, max [, action]
  const moveList = [...items];

  return (
    <div className={cn('overflow-x-auto rounded-xl border border-border', className)}>
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="bg-surface-tertiary/70 text-left text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
            <th className="w-[34%] px-3 py-2.5 font-semibold">Assessment criteria</th>
            <th className="px-3 py-2.5 font-semibold">Indicators</th>
            <th className="w-16 px-3 py-2.5 text-right font-semibold">Max</th>
            {hasActions && <th className="w-10 px-2 py-2.5 text-right font-semibold">Action</th>}
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => {
            // Merge blocks: consecutive rows sharing the same criteria text get
            // one vertically-merged "Assessment criteria" cell (exactly like the
            // printed sheet). Legacy section-label descriptions are normalised
            // to null by groupCriteriaBlocks, so they never repeat on rows.
            const blocks = groupCriteriaBlocks(group.items);

            return (
              <Fragment key={group.section}>
                {/* Section header row — spans the table, exactly like the printed exam */}
                <tr className="bg-primary-600">
                  <td colSpan={colSpanTotal} className="px-3 py-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        {/* min-w-0 lets the label shrink inside the flex row so
                            break-words can actually wrap long section names. */}
                        <span className="min-w-0 break-words text-xs font-semibold uppercase tracking-wider text-white">
                          {group.section}
                        </span>
                        <span className="shrink-0 rounded bg-white/15 px-1.5 py-0.5 text-[10px] font-medium text-primary-50">
                          {group.items.length} item{group.items.length === 1 ? '' : 's'}
                        </span>
                        {/* Import-engine section metadata: printed weight % and
                            subtotal ("Section Name [Weight %] [Subtotal]"). The
                            weight % is derived from the printed name when no
                            engine metadata was supplied. */}
                        {(() => {
                          const meta = sectionMeta?.[group.section];
                          const weightPct = meta?.weightPct ?? sectionWeightPct(group.section);
                          const subtotalMarks = meta?.subtotalMarks ?? null;
                          if (weightPct == null && subtotalMarks == null) return null;
                          return (
                            <span className="flex shrink-0 items-center gap-1.5">
                              {weightPct != null && (
                                <span className="inline-flex items-center gap-1 rounded bg-white/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary-50">
                                  <Percent className="h-3 w-3" /> {weightPct}%
                                </span>
                              )}
                              {subtotalMarks != null && (
                                <span className="inline-flex items-center gap-1 rounded bg-white/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary-50" title="Printed section subtotal">
                                  <Sigma className="h-3 w-3" /> {subtotalMarks} marks
                                </span>
                              )}
                            </span>
                          );
                        })()}
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        {onSectionChange && (
                          <select
                            value={group.section}
                            onChange={(e) => onSectionChange(group.section, e.target.value)}
                            className="rounded-md border border-white/25 bg-white/10 px-2 py-1 text-xs font-medium text-white focus:outline-none focus:ring-2 focus:ring-white/40 [&>option]:bg-white [&>option]:text-text-primary"
                            title="Move this whole section to another group"
                          >
                            {(sectionOptions ?? CHECKLIST_SECTIONS).map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>

                {/* Data rows with merged criteria cells. Horizontal separators are
                    drawn on the Indicator / Max / Action cells only, so no line
                    ever cuts through the merged Assessment criteria cell. The
                    criteria cell is left open at the top of a block (printed-sheet
                    style) and its text wraps (break-words) at full height — it is
                    never truncated, clipped or ellipsized. */}
                {blocks.map((block) =>
                  block.items.map((item, rowIdx) => {
                    const isFirstRow = rowIdx === 0;
                    return (
                      <tr
                        key={item.id}
                        className="bg-white transition-colors hover:bg-surface-secondary/50"
                      >
                        {/* Merged criteria cell — ONE clean cell spanning every
                            indicator row of the block (no internal lines). */}
                        {block.criteria && isFirstRow ? (
                          <td
                            rowSpan={block.items.length}
                            className="whitespace-normal break-words border-r border-border/70 px-4 py-3 align-top leading-relaxed"
                          >
                            {onDescriptionChange && editingDescriptionId === item.id ? (
                              <div
                                className="space-y-1.5"
                                onBlur={(e) => {
                                  // Auto-save when focus leaves the editor entirely, and only
                                  // when the criteria actually changed (no spurious per-row saves
                                  // on a click-away with zero edits). Toolbar clicks stay inside
                                  // this wrapper and never commit. Saving updates EVERY indicator
                                  // row of the block, so it stays merged and never re-duplicates.
                                  if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                                    if (hasCriteriaChanged(item.description, editingDescription)) {
                                      block.items.forEach((b) => onDescriptionChange?.(b.id, editingDescription));
                                    }
                                    setEditingDescriptionId(null);
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Escape') setEditingDescriptionId(null);
                                }}
                              >
                                <RichTextEditor
                                  value={editingDescription}
                                  onChange={setEditingDescription}
                                  placeholder="Criteria — rich text and images supported"
                                  minHeight={80}
                                  autoFocus
                                />
                                <div className="flex items-center gap-3">
                                  <span className="text-[11px] text-text-tertiary">
                                    Click away to save · Esc to cancel
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setEditingDescriptionId(null)}
                                    className="text-xs font-medium text-text-tertiary hover:text-text-primary"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div>
                                {onDescriptionChange ? (
                                  // Click the criteria text to edit it — auto-saves on blur.
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingDescription(item.description ?? '');
                                      setEditingDescriptionId(item.id);
                                    }}
                                    className="group block w-full text-left"
                                    title="Click to edit criteria"
                                  >
                                    <RichTextRenderer
                                      html={block.criteria}
                                      className="font-medium text-text-primary"
                                    />
                                    <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-primary-600 opacity-0 transition-opacity group-hover:opacity-100">
                                      <PencilLine className="h-3 w-3" /> Click to edit
                                    </span>
                                  </button>
                                ) : (
                                  <RichTextRenderer
                                    html={block.criteria}
                                    className="font-medium text-text-primary"
                                  />
                                )}
                                {/* Criterion-level delete — removing indicators never
                                    touches the criterion, and deleting the whole block
                                    is a separate, explicit action (with confirmation). */}
                                {onDelete && block.items.length > 1 && (
                                  confirmDeleteBlockId === item.id ? (
                                    <div className="mt-1.5 flex items-center gap-2 rounded-md bg-error/5 px-1.5 py-1">
                                      <span className="text-[11px] text-text-secondary">
                                        Delete this criterion + {block.items.length} indicators?
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          block.items.forEach((b) => onDelete(b));
                                          setConfirmDeleteBlockId(null);
                                        }}
                                        className="text-[11px] font-semibold text-error hover:underline"
                                      >
                                        Delete
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setConfirmDeleteBlockId(null)}
                                        className="text-[11px] font-medium text-text-tertiary hover:text-text-primary"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteBlockId(item.id)}
                                      className="mt-1 flex items-center gap-1 text-[11px] font-medium text-error/70 opacity-70 transition-opacity hover:opacity-100 hover:text-error"
                                    >
                                      <Trash2 className="h-3 w-3" /> Delete criterion
                                    </button>
                                  )
                                )}
                              </div>
                            )}
                          </td>
                        ) : block.criteria ? null : (
                          // Single-item block without criteria text (still editable)
                          <td className="whitespace-normal break-words border-t border-r border-border/70 px-4 py-3 align-top leading-relaxed">
                            {onDescriptionChange && editingDescriptionId === item.id ? (
                              <div
                                className="space-y-1.5"
                                onBlur={(e) => {
                                  // Same auto-save guard as the merged criteria cell: only commit
                                  // when real content changed (e.g. adding criteria to an empty row).
                                  if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                                    if (hasCriteriaChanged(item.description, editingDescription)) {
                                      block.items.forEach((b) => onDescriptionChange?.(b.id, editingDescription));
                                    }
                                    setEditingDescriptionId(null);
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Escape') setEditingDescriptionId(null);
                                }}
                              >
                                <RichTextEditor
                                  value={editingDescription}
                                  onChange={setEditingDescription}
                                  placeholder="Criteria — rich text and images supported"
                                  minHeight={80}
                                  autoFocus
                                />
                                <div className="flex items-center gap-3">
                                  <span className="text-[11px] text-text-tertiary">
                                    Click away to save · Esc to cancel
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setEditingDescriptionId(null)}
                                    className="text-xs font-medium text-text-tertiary hover:text-text-primary"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div>
                                {onDescriptionChange ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingDescription(item.description ?? '');
                                      setEditingDescriptionId(item.id);
                                    }}
                                    className="group flex items-center gap-2 text-left"
                                    title="Click to add criteria"
                                  >
                                    <span className="text-text-tertiary">—</span>
                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary-600 opacity-0 transition-opacity group-hover:opacity-100">
                                      <PencilLine className="h-3 w-3" /> Click to add
                                    </span>
                                  </button>
                                ) : (
                                  <span className="text-text-tertiary">—</span>
                                )}
                              </div>
                            )}
                          </td>
                        )}

                        <td className="whitespace-normal break-words border-t border-r border-border/70 px-3 py-3 align-top leading-relaxed text-text-secondary">
                          {onTitleChange && editingTitleId === item.id ? (
                            <input
                              autoFocus
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              onBlur={commitTitle}
                              onFocus={(e) => e.target.select()}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                                if (e.key === 'Escape') setEditingTitleId(null);
                              }}
                              className="w-full rounded-lg border border-border bg-white px-2.5 py-1 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                            />
                          ) : onTitleChange ? (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingTitle(item.title);
                                setEditingTitleId(item.id);
                              }}
                              className="group block w-full text-left"
                              title="Click to edit indicator"
                            >
                              <span>{item.title}</span>
                              <span className="ml-1 text-[11px] font-medium text-primary-600 opacity-0 transition-opacity group-hover:opacity-100">
                                edit
                              </span>
                            </button>
                          ) : (
                            <span>{item.title}</span>
                          )}
                        </td>
                        <td className="border-t border-r border-border/70 px-3 py-3 text-right align-top">
                          {onWeightChange ? (
                            <EditableWeight
                              value={item.weight}
                              onCommit={(w) => onWeightChange(item.id, w)}
                            />
                          ) : (
                            <span className="font-medium text-text-primary">{item.weight}</span>
                          )}
                        </td>
                        {hasActions && (
                          <td className="border-t border-border/70 px-2 py-3 text-right align-top">
                            <div className="flex items-center justify-end gap-0.5">
                              {onMove && (() => {
                                const idx = moveList.findIndex((i) => i.id === item.id);
                                return (
                                  <span className="mr-1 inline-flex flex-col">
                                    <button
                                      type="button"
                                      onClick={() => onMove(item.id, 'up')}
                                      disabled={idx <= 0}
                                      aria-label="Move indicator up"
                                      title="Move indicator up"
                                      className="rounded p-0.5 text-text-tertiary transition-colors hover:text-primary-600 disabled:cursor-not-allowed disabled:opacity-30"
                                    >
                                      <ArrowUp className="h-3 w-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => onMove(item.id, 'down')}
                                      disabled={idx === -1 || idx >= moveList.length - 1}
                                      aria-label="Move indicator down"
                                      title="Move indicator down"
                                      className="rounded p-0.5 text-text-tertiary transition-colors hover:text-primary-600 disabled:cursor-not-allowed disabled:opacity-30"
                                    >
                                      <ArrowDown className="h-3 w-3" />
                                    </button>
                                  </span>
                                );
                              })()}
                              {onDelete && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    // Clear a pending criterion-delete confirm if it was
                                    // armed for the indicator being removed.
                                    if (confirmDeleteBlockId === item.id) setConfirmDeleteBlockId(null);
                                    onDelete(item);
                                  }}
                                  aria-label="Remove indicator"
                                  title="Remove this indicator"
                                  className="rounded-md p-1 text-text-tertiary transition-colors hover:bg-error/10 hover:text-error"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  }),
                )}

                {/* Section subtotal row */}
                <tr className="border-t-2 border-border bg-surface-secondary/70">
                  <td colSpan={2} className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                    Section subtotal
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-text-primary">
                    {group.totalWeight}
                  </td>
                  {hasActions && <td />}
                </tr>
              </Fragment>
            );
          })}

          {/* Grand total + pass mark */}
          <tr className="border-t-2 border-primary-600 bg-primary-50">
            <td colSpan={2} className="px-3 py-2 text-right text-[11px] font-bold uppercase tracking-wider text-primary-700">
              Grand total
            </td>
            <td className="px-3 py-2 text-right text-sm font-bold text-primary-700">{grandTotal}</td>
            {hasActions && <td />}
          </tr>
          <tr className="border-t border-border/70 bg-success/10">
            <td colSpan={2} className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
              <Award className="mr-1 inline h-3.5 w-3.5 text-success" />
              Pass mark ({PASS_MARK_PERCENT}%)
            </td>
            <td className="px-3 py-2 text-right text-sm font-bold text-success">{passMark}</td>
            {hasActions && <td />}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default ChecklistTable;
