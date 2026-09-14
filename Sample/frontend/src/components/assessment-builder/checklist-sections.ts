/**
 * The four standard TSS practical-exam marking-sheet sections, in printed
 * order (they match `samples/sample_sod.pdf`). Imported assessments group
 * checklist items under these; the manual builder offers them when adding
 * items, and the candidate workspace renders the checklist grouped by them.
 */
export const CHECKLIST_SECTIONS = [
  'Preliminary activities (15%)',
  'Process and fulfillment of the task (40%)',
  'Product presentation/Exhibition (35%)',
  'Closing activities (10%)',
] as const;

export const DEFAULT_CHECKLIST_SECTION: string = CHECKLIST_SECTIONS[0];

/**
 * Extracts the weight percentage embedded in a section name ("Process and
 * fulfillment of the task (40%)" → 40), or null when absent. Sections are
 * detected dynamically from imported documents, so names vary — this reads the
 * percentage straight off the printed name.
 */
export function sectionWeightPct(section: string | null | undefined): number | null {
  const match = (section ?? '').match(/\(\s*(\d{1,3})\s*%\)/);
  return match ? parseInt(match[1]!, 10) : null;
}

/** Metadata about a checklist section surfaced by the import engine. */
export interface SectionMeta {
  /** Section weight from "(40%)" — null when the document prints none. */
  weightPct: number | null;
  /** Section subtotal from "Subtotal /32 marks" — null when not printed. */
  subtotalMarks: number | null;
}

/**
 * True when text looks like a section header label rather than real checklist
 * content. Mirrors the backend's `detectChecklistSection` patterns and requires
 * a percentage so ordinary criteria/indicator text is never misidentified.
 * Used to deduplicate legacy items whose description stored the section name.
 */
const SECTION_LABEL_PATTERNS = [
  /^\d*\.?\s*preliminary/i,
  /process\s+and\s+fulfil|process\s+and\s+fulfill/i,
  /product\s+present|presentation|exhibition/i,
  /closing\s+activit/i,
];

export function isChecklistSectionLabel(text: string | null | undefined): boolean {
  const trimmed = (text ?? '').trim();
  if (!trimmed.includes('%')) return false;
  return SECTION_LABEL_PATTERNS.some((re) => re.test(trimmed));
}

/** Minimal shape a checklist item needs for criteria-block grouping. */
export interface CriteriaBlockItemLike {
  id: string;
  description?: string | null;
}

export interface CriteriaBlock<T extends CriteriaBlockItemLike> {
  /** Criteria text shown in the merged cell (null → placeholder dash). */
  criteria: string | null;
  items: T[];
}

/**
 * Groups consecutive checklist items sharing the same criteria text into
 * blocks, mirroring the printed marking sheet where one "Assessment criteria"
 * cell spans all of its indicators (see `samples/sample_sod.pdf`). Only blocks
 * with actual criteria text are merged: items with empty/legacy section-label
 * descriptions each get their own block, so in editable tables they stay
 * independently editable (and on read-only tables each shows its own "—").
 */
export function groupCriteriaBlocks<T extends CriteriaBlockItemLike>(items: T[]): CriteriaBlock<T>[] {
  const blocks: CriteriaBlock<T>[] = [];
  for (const item of items) {
    const raw = item.description?.trim() || '';
    const criteria = raw && !isChecklistSectionLabel(raw) ? raw : null;
    const last = blocks[blocks.length - 1];
    if (criteria && last && last.criteria === criteria) last.items.push(item);
    else blocks.push({ criteria, items: [item] });
  }
  return blocks;
}

/** Minimal shape a checklist item needs for section grouping. */
export interface ChecklistItemLike {
  section: string | null;
  weight: number;
}

export interface ChecklistGroup<T extends ChecklistItemLike> {
  section: string;
  items: T[];
  totalWeight: number;
}

/**
 * Groups checklist items by section. Ordering is a hybrid:
 *
 * 1. Sections that exactly match the canonical `CHECKLIST_SECTIONS` labels
 *    (manually built assessments) always render in the printed exam order
 *    (Preliminary → Process → Product → Closing), regardless of item-creation
 *    order — inserting a "Closing activities" item first must never push it
 *    to the top of the sheet.
 * 2. Dynamically-detected sections from imported documents (never the four
 *    hardcoded labels) keep the DOCUMENT order they first appear in the item
 *    list — re-ordering them canonically would scramble them (e.g. SPE's
 *    "Product requirement Analysis (20%)" would land after "Closing").
 * 3. Items with missing/unknown sections collect under "Other", always last.
 */
export function groupChecklistItems<T extends ChecklistItemLike>(items: T[]): ChecklistGroup<T>[] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = item.section?.trim() || 'Other';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }

  const present = Array.from(groups.keys());
  const canonicalSet = new Set<string>(CHECKLIST_SECTIONS);
  const canonical = CHECKLIST_SECTIONS.filter((s) => groups.has(s));
  const dynamic = present.filter((k) => k !== 'Other' && !canonicalSet.has(k));
  const keys = [...canonical, ...dynamic, ...(groups.has('Other') ? ['Other'] : [])];

  return keys.map((key) => {
    const groupItems = groups.get(key)!;
    return {
      section: key,
      items: groupItems,
      totalWeight: groupItems.reduce((sum, it) => sum + (Number(it.weight) || 0), 0),
    };
  });
}
