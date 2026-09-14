import { Fragment, useState } from 'react';
import { Award, ClipboardList, X } from 'lucide-react';
import { groupChecklistItems, groupCriteriaBlocks } from '@components/assessment-builder/checklist-sections';
import { RichTextRenderer } from '@components/assessment-builder/rich-text-renderer';
import { cn } from '@utils/cn';

/** Minimal shape a checklist item needs for rubric scoring. */
export interface RubricScoringItem {
  id: string;
  title: string;
  description?: string | null;
  section: string | null;
  weight: number;
}

interface RubricScoringProps {
  items: RubricScoringItem[];
  /** Current scores keyed by checklist item id (empty values are absent). */
  scores: Record<string, number>;
  /** Fires when a score is committed on blur/Enter (null clears it). */
  onScoreChange: (itemId: string, score: number | null) => void;
}

/**
 * Per-indicator score input — commits on blur or Enter (no API call per
 * keystroke), clamped to the indicator's max mark, Esc reverts.
 */
function ScoreInput({
  value,
  max,
  label,
  onCommit,
}: {
  value: number | null;
  max: number;
  label: string;
  onCommit: (v: number | null) => void;
}) {
  const [draft, setDraft] = useState(value !== null ? String(value) : '');
  const commit = () => {
    const raw = draft.trim();
    if (raw === '') {
      setDraft('');
      // Only a real change commits — blurring an already-empty input is a no-op.
      if (value !== null) onCommit(null);
      return;
    }
    const n = Number(raw);
    if (Number.isFinite(n)) {
      // Half marks allowed; never above the indicator's max or below 0.
      const clamped = Math.min(Math.max(Math.round(n * 10) / 10, 0), max);
      setDraft(String(clamped));
      if (clamped !== value) onCommit(clamped);
    } else {
      setDraft(value !== null ? String(value) : '');
    }
  };
  return (
    <input
      type="number"
      min={0}
      max={max}
      step={1}
      value={draft}
      aria-label={label}
      placeholder="—"
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        // Enter commits and keeps focus (rapid scoring); Esc reverts; blur commits.
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') setDraft(value !== null ? String(value) : '');
      }}
      className="block w-16 rounded-lg border border-border bg-white px-2 py-1 text-center text-sm font-medium text-text-primary placeholder:text-text-tertiary/60 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
    />
  );
}

/** Rounds to 1 decimal and drops a trailing .0 (half marks can be fractional). */
function formatMark(n: number): string {
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/**
 * Rubric scoring table for the assessor-review page. Mirrors the printed
 * marking sheet (sections → merged assessment-criteria cells → indicators)
 * with an editable Score column per indicator. The assessor enters marks up to
 * each indicator's max; the section subtotals, grand total and percentage are
 * computed live and saved into the review's `rubricScores` (keyed by checklist
 * item id — the same keys the marking-sheet export matches its Scored column
 * against).
 */
export function RubricScoring({ items, scores, onScoreChange }: RubricScoringProps) {
  const groups = groupChecklistItems(items);

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center py-10 text-center">
        <ClipboardList className="h-12 w-12 text-text-tertiary" />
        <p className="mt-3 text-sm text-text-secondary">
          This assessment has no checklist items yet. Add indicators in the Assessment
          Builder (Checklist tab) and publish — they appear here for scoring.
        </p>
      </div>
    );
  }

  const grandTotal = groups.reduce((sum, g) => sum + g.totalWeight, 0);
  const enteredTotal = items.reduce((sum, it) => sum + (scores[it.id] ?? 0), 0);
  const pct = grandTotal > 0 ? (enteredTotal / grandTotal) * 100 : 0;

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[560px] border-collapse text-sm">
        <thead>
          <tr className="bg-surface-tertiary/70 text-left text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
            <th className="w-[36%] px-3 py-2.5 font-semibold">Assessment criteria</th>
            <th className="px-3 py-2.5 font-semibold">Indicators</th>
            <th className="w-16 px-3 py-2.5 text-right font-semibold">Max</th>
            <th className="w-24 px-3 py-2.5 text-right font-semibold">Score</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => {
            const blocks = groupCriteriaBlocks(group.items);
            const enteredSection = group.items.reduce((sum, it) => sum + (scores[it.id] ?? 0), 0);
            return (
              <Fragment key={group.section}>
                {/* Section band */}
                <tr className="bg-primary-600">
                  <td colSpan={4} className="px-3 py-2">
                    <div className="flex min-w-0 items-center justify-between gap-3">
                      <span className="min-w-0 break-words text-xs font-semibold uppercase tracking-wider text-white">
                        {group.section}
                      </span>
                      <span className="shrink-0 rounded bg-white/15 px-1.5 py-0.5 text-[10px] font-medium text-primary-50">
                        {group.items.length} item{group.items.length === 1 ? '' : 's'}
                      </span>
                    </div>
                  </td>
                </tr>

                {/* Indicator rows with merged criteria cells (no lines through them) */}
                {blocks.map((block) =>
                  block.items.map((item, rowIdx) => {
                    const isFirstRow = rowIdx === 0;
                    const score = scores[item.id] ?? null;
                    return (
                      <tr key={item.id} className="bg-white transition-colors hover:bg-surface-secondary/50">
                        {block.criteria && isFirstRow ? (
                          <td
                            rowSpan={block.items.length}
                            className="whitespace-normal break-words border-r border-border/70 px-4 py-3 align-top leading-relaxed"
                          >
                            <RichTextRenderer html={block.criteria} className="font-medium text-text-primary" />
                          </td>
                        ) : block.criteria ? null : (
                          <td className="whitespace-normal break-words border-t border-r border-border/70 px-4 py-3 align-top leading-relaxed text-text-tertiary">
                            —
                          </td>
                        )}
                        <td className="whitespace-normal break-words border-t border-r border-border/70 px-3 py-3 align-top leading-relaxed text-text-secondary">
                          {item.title}
                        </td>
                        <td className="border-t border-r border-border/70 px-3 py-3 text-right align-top">
                          <span className="font-medium text-text-primary">{item.weight}</span>
                        </td>
                        <td className="border-t border-border/70 px-3 py-3 text-right align-top">
                          <div className="flex items-center justify-end gap-1.5">
                            <ScoreInput
                              value={score}
                              max={item.weight}
                              label={`Score for ${item.title}`}
                              onCommit={(v) => onScoreChange(item.id, v)}
                            />
                            {score !== null && (
                              <button
                                type="button"
                                onClick={() => onScoreChange(item.id, null)}
                                aria-label={`Clear score for ${item.title}`}
                                title="Clear this score"
                                className="rounded-md p-1 text-text-tertiary transition-colors hover:bg-error/10 hover:text-error"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  }),
                )}

                {/* Section subtotal of entered marks */}
                <tr className="border-t-2 border-border bg-surface-secondary/70">
                  <td colSpan={2} className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                    Section subtotal (entered)
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-text-primary">{group.totalWeight}</td>
                  <td className="px-3 py-2 text-right font-semibold text-primary-700">{formatMark(enteredSection)}</td>
                </tr>
              </Fragment>
            );
          })}

          {/* Grand total + percentage */}
          <tr className="border-t-2 border-primary-600 bg-primary-50">
            <td colSpan={2} className="px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-primary-700">
              Total entered
            </td>
            <td className="px-3 py-2.5 text-right text-sm font-bold text-primary-700">{grandTotal}</td>
            <td className="px-3 py-2.5 text-right text-sm font-bold text-primary-700">{formatMark(enteredTotal)}</td>
          </tr>
          <tr className="border-t border-border/70 bg-success/10">
            <td colSpan={2} className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
              <Award className="mr-1 inline h-3.5 w-3.5 text-success" />
              Percentage
            </td>
            <td className="px-3 py-2.5 text-right" />
            <td className={cn('px-3 py-2.5 text-right text-sm font-bold', enteredTotal > 0 ? 'text-success' : 'text-text-tertiary')}>
              {formatMark(pct)}%
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default RubricScoring;
