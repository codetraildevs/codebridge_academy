import { htmlToPlainText } from '@utils/rich-text';

/**
 * Assessment checklist auto-generation for manually created exams.
 *
 * Mirrors the structure produced by the document importer (see backend
 * exam-import.service.ts) so manual exams and imported exams share the same
 * data shape: sections with weights + rubric criteria (indicators with max
 * marks) + the tasks assigned to each section.
 *
 * Standard TVET checklist format (as in the sample exam documents, e.g.
 * docs/TASK _1.pdf):
 *   1. Preliminary Activities Performance (15%)
 *   2. Process and Fulfillment of the Task (50%)
 *   3. Product Presentation/Exhibition and Quality Assessment (30%)
 *   4. Closing Activities (5%)
 */

export interface ChecklistCriterion {
  criterionName: string;
  description: string;
  maxScore: number;
}

export interface ChecklistSection {
  title: string;
  sectionType: string;
  weight: number;
  criteria: ChecklistCriterion[];
  /** Indexes into the source tasks array assigned to this section. */
  taskIndexes: number[];
}

export interface ChecklistSourceTask {
  text: string;
}

/** Default marks assigned to every auto-generated (task-derived) indicator. */
export const DEFAULT_CRITERION_MARKS = 5;

const STANDARD_SECTIONS: Array<{
  title: string;
  sectionType: string;
  weight: number;
}> = [
  { title: 'Preliminary Activities Performance', sectionType: 'ERD_DESIGN', weight: 15 },
  { title: 'Process and Fulfillment of the Task', sectionType: 'CODE_WRITING', weight: 50 },
  { title: 'Product Presentation/Exhibition and Quality Assessment', sectionType: 'PRESENTATION', weight: 30 },
  { title: 'Closing Activities', sectionType: 'PROJECT_CLEANUP', weight: 5 },
];

/**
 * The standard TVET indicator catalog — the full assessment checklist used on
 * the sample practical exam documents (see docs/Practical_examination.pdf).
 * Every generated checklist is seeded with these indicators (entity-neutral
 * versions) so manually created exams start from the complete standard
 * checklist, with the author's tasks appended on top.
 */
const STANDARD_INDICATORS: Record<string, ChecklistCriterion[]> = {
  // 1. Preliminary Activities Performance (ERD design) — 12 indicators
  ERD_DESIGN: [
    { criterionName: 'Required entities are drawn', description: 'Required entities are drawn on the ERD', maxScore: 1 },
    { criterionName: 'Entity symbols are used correctly', description: 'Entity symbols are used correctly', maxScore: 1 },
    { criterionName: 'Relationship symbols are used correctly', description: 'Relationship symbols are used correctly', maxScore: 1 },
    { criterionName: 'Link symbols are used correctly', description: 'Link symbols are used correctly', maxScore: 1 },
    { criterionName: 'Primary key rule is respected', description: 'Primary key rule is respected', maxScore: 1 },
    { criterionName: 'Foreign key rule is respected', description: 'Foreign key rule is respected', maxScore: 1 },
    { criterionName: 'Cardinalities are indicated', description: 'Cardinalities are indicated', maxScore: 1 },
    { criterionName: 'Relationships between entities are indicated', description: 'Relationships between entities are indicated', maxScore: 1 },
    { criterionName: 'Primary keys are indicated on each entity', description: 'Primary keys are indicated on each entity', maxScore: 1 },
    { criterionName: 'Foreign keys are indicated where required', description: 'Foreign keys are indicated where required', maxScore: 1 },
    { criterionName: 'Attributes are defined for each entity', description: 'Attributes are defined for each entity', maxScore: 1 },
    { criterionName: 'ERD matches the system requirements', description: 'ERD matches the system requirements', maxScore: 1 },
  ],
  // 2. Process and Fulfillment of the Task (implementation) — 14 indicators
  CODE_WRITING: [
    { criterionName: 'Project folder is named as FirstName_LastName', description: 'Project folder is named as FirstName_LastName', maxScore: 1 },
    { criterionName: 'Node.js project is created', description: 'Node.js project is created', maxScore: 2 },
    { criterionName: 'Express.js is installed', description: 'Express.js is installed', maxScore: 1 },
    { criterionName: 'Cors is installed', description: 'Cors is installed', maxScore: 1 },
    { criterionName: 'Nodemon is installed', description: 'Nodemon is installed', maxScore: 1 },
    { criterionName: 'MySQL/MongoDB is installed in Node.js', description: 'MySQL/MongoDB is installed in Node.js', maxScore: 1 },
    { criterionName: 'React project is created', description: 'React project is created', maxScore: 2 },
    { criterionName: 'React-router-dom is installed', description: 'React-router-dom is installed', maxScore: 1 },
    { criterionName: 'Axios is installed', description: 'Axios is installed', maxScore: 1 },
    { criterionName: 'Database is created', description: 'Database is created', maxScore: 1 },
    { criterionName: 'Required tables are created', description: 'Required tables are created', maxScore: 1 },
    { criterionName: 'CRUD operations are implemented', description: 'CRUD operations are implemented on the forms', maxScore: 2 },
    { criterionName: 'Session-based login is implemented', description: 'Session-based login is implemented', maxScore: 2 },
    { criterionName: 'Frontend communicates with the backend', description: 'Frontend communicates with the backend via API', maxScore: 2 },
  ],
  // 3. Product Presentation/Exhibition and Quality Assessment — 8 indicators
  PRESENTATION: [
    { criterionName: 'The product name is mentioned', description: 'The product name is mentioned', maxScore: 1 },
    { criterionName: 'The candidate presents the product clearly', description: 'The candidate presents the product clearly', maxScore: 2 },
    { criterionName: 'Key features are demonstrated', description: 'Key features of the product are demonstrated', maxScore: 2 },
    { criterionName: 'The candidate explains how the system works', description: 'The candidate explains how the system works', maxScore: 2 },
    { criterionName: 'Challenges faced are explained', description: 'Challenges faced during development are explained', maxScore: 1 },
    { criterionName: 'The presentation is structured and professional', description: 'The presentation is structured and professional', maxScore: 1 },
    { criterionName: 'The product meets the system requirements', description: 'The product meets the system requirements', maxScore: 2 },
    { criterionName: 'The candidate answers assessor questions', description: 'The candidate answers assessor questions confidently', maxScore: 2 },
  ],
  // 4. Closing Activities (cleanup) — 5 indicators
  PROJECT_CLEANUP: [
    { criterionName: 'Work is saved in the candidate real names', description: 'Work is saved in the candidate real names (FirstName_LastName)', maxScore: 1 },
    { criterionName: 'Project folder is permanently removed', description: 'Project folder is permanently removed', maxScore: 1 },
    { criterionName: 'Temporary files are cleaned up', description: 'Temporary files are cleaned up', maxScore: 1 },
    { criterionName: 'All applications are closed properly', description: 'All applications are closed properly', maxScore: 1 },
    { criterionName: 'Workstation is left tidy', description: 'Workstation is left tidy', maxScore: 1 },
  ],
};

/**
 * Detect which standard checklist section a task belongs to.
 * 0 = Preliminary, 1 = Process, 2 = Presentation, 3 = Closing.
 */
export function detectSectionIndex(text: string): number {
  const t = text.toLowerCase();

  // Closing — cleanup / shutdown / saving-work tasks (most specific first)
  if (
    /(?:save|close|shut\s*down|clean|remove|delete|submit|wrap\s*up).*(?:work|folder|project|workstation|temporary|files?|session)/i.test(t) ||
    /(?:cleanup|clean-?up|shut\s*down)/i.test(t)
  ) {
    return 3;
  }
  // Presentation / product demo / defense
  if (/(?:present|demo(?:nstration)?\b|exhibit|defend|oral|audience)/i.test(t)) {
    return 2;
  }
  // Preliminary — design-stage work (ERD, DFD, flowchart, UML, diagrams)
  if (
    /(?:erd\b|entity\s*(?:relationship|diagram)|dfd\b|data\s+flow|flowchart|uml\b|cardinalit|primary\s+key|foreign\s+key|diagram|draw|design)/i.test(t)
  ) {
    return 0;
  }
  // Default: Process and Fulfillment (implementation work)
  return 1;
}

/**
 * Detect a candidate-friendly question type for a task.
 *
 * CODE is checked first (so "Write a program…" is not swallowed by the
 * generic ESSAY verb list), but only against concrete programming signals —
 * explanatory essays about an API or framework stay ESSAY.
 */
export function detectQuestionType(text: string): string {
  const t = htmlToPlainText(text).toLowerCase();
  if (
    /(?:\bcode\b|program(?:ming)?\b|function|implement|script|algorithm|write\s+a\s+(?:program|function|script|code)|node\s*\.?js|express|react|axios|javascript|typescript|backend|frontend|endpoint|server\b)/i.test(t)
  ) {
    return 'CODE';
  }
  if (/(?:diagram|draw|erd|dfd|flowchart|uml|sketch|design\s+(?:an\s+)?(?:erd|entity|database|system))/i.test(t)) {
    return 'DIAGRAM';
  }
  if (/(?:upload|attach|submit\s+(?:file|document)|save\s+(?:your\s+)?(?:work|files?))/i.test(t)) {
    return 'FILE_UPLOAD';
  }
  if (/(?:write|explain|describe|discuss|elaborate|essay|briefly|outline)/i.test(t)) return 'ESSAY';
  if (/(?:short|fill|complete|define|list|name|identify)/i.test(t)) return 'SHORT_ANSWER';
  return 'ESSAY';
}

/** Build a short criterion name from an indicator description (first ~4 words). */
export function makeCriterionName(description: string): string {
  const words = description.split(/\s+/).filter((w) => w.length > 1);
  if (words.length <= 4) return description;
  return words.slice(0, 4).join(' ') + '…';
}

/**
 * Split a rich-text tasks document (as typed in the single tasks editor, like
 * the numbered tasks in the sample exam) into the individual task texts.
 *
 * Handles the shapes authors actually use:
 *  - Explicit numbers: "1. Design an ERD…" — the task runs until the next
 *    number, so wrapped lines and sub-bullets stay part of their task.
 *  - Rich-text numbered lists (CKEditor's list button) — the numbers are not
 *    part of the HTML, so every line becomes its own task.
 *  - Entity/attribute list items such as "1. Employee (employeeNumber, …)"
 *    are treated as sub-items of the enclosing task, never new tasks (the
 *    document importer uses the same heuristic).
 */
export function extractNumberedTasks(html?: string | null): string[] {
  const plain = htmlToPlainText(html);
  const lines = plain
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  /** True when the line is an entity/attribute sub-item of the enclosing task
   *  ("2. Department (DepartementCode,...)" or — when the extractor wrapped the
   *  attribute list onto the next line — "2. Department" followed by a line
   *  starting with "(Code,...)"). Never a new task. */
  const isListItem = (line: string, idx: number) => {
    if (/^\d+[.)]\s*[A-Za-z][A-Za-z ]*\s*\([^)]*,/.test(line)) return true;
    // "2. Department" with the attribute list wrapped onto the next line. The
    // short line must look like a capitalized entity name ("Department",
    // "Order Item") so real tasks like "Create the database" are not swallowed.
    const m = line.match(/^\d+[.)]\s*([A-Z][a-z]+(?: [A-Z][a-z]+){0,2})$/);
    return Boolean(m && lines[idx + 1] && /^\([^)]*,/.test(lines[idx + 1]!));
  };

  const anyNumbered = lines.some((l, i) => /^\d+[.)]/.test(l) && !isListItem(l, i));

  const tasks: string[] = [];
  let current = '';
  let lastNumber = 0;

  const flush = () => {
    if (current.trim()) tasks.push(current.trim());
    current = '';
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const m = line.match(/^(\d+)[.)]\s*([\s\S]*)$/);
    if (m && !isListItem(line, i)) {
      // A real numbered task — a line matching this pattern (and not a list
      // item) guarantees `anyNumbered`, so no extra guard is needed.
      const num = parseInt(m[1]!, 10);
      if (num > lastNumber) {
        flush();
        current = m[2]!.trim();
        lastNumber = num;
      } else {
        // Numbering restarted (nested list) — keep as a continuation.
        current += ' ' + m[2]!.trim();
      }
    } else if (anyNumbered) {
      // Wrapped line / sub-bullet of the current task.
      current += (current ? ' ' : '') + line.replace(/^\d+[.)]\s*/, '');
    } else {
      // No explicit numbers — every line is its own task.
      flush();
      current = line.replace(/^\d+[.)]\s*/, '');
    }
  }
  flush();
  return tasks;
}

/**
 * Re-scale section weights (new array) so they always sum to exactly 100%.
 * Generic over any section-like shape that carries a `weight` field — used
 * after generating a checklist and after removing a section (create + edit).
 */
export function renormalizeChecklistWeights<T extends { weight: number }>(sections: T[]): T[] {
  const next = sections.map((s) => ({ ...s }));
  if (next.length === 0) return next;
  const total = next.reduce((sum, s) => sum + s.weight, 0);
  if (total <= 0) {
    const equal = Math.floor(100 / next.length);
    next.forEach((s, i) => {
      s.weight = i < next.length - 1 ? equal : 100 - equal * (next.length - 1);
    });
    return next;
  }
  const scaled = next.map((s) => Math.round((s.weight / total) * 100));
  const drift = 100 - scaled.reduce((a, b) => a + b, 0);
  if (next.length > 0) {
    scaled[scaled.length - 1] = (scaled[scaled.length - 1] ?? 0) + drift;
  }
  next.forEach((s, i) => {
    s.weight = scaled[i]!;
  });
  return next;
}

/**
 * Generate the assessment checklist from the exam's tasks using the standard
 * TVET format of the sample exam documents.
 *
 * All four standard sections are ALWAYS present, each pre-filled with its
 * standard indicator catalog (see STANDARD_INDICATORS) so the checklist
 * mirrors the full sample-exam checklist. Every author task is then appended
 * as an additional scored indicator in its detected section. Weights stay at
 * the standard 15/50/30/5 (which sums to 100).
 */
export function generateAssessmentChecklist(tasks: ChecklistSourceTask[]): ChecklistSection[] {
  if (!tasks || tasks.length === 0) return [];

  // Seed every standard section with its full indicator catalog.
  const sections: ChecklistSection[] = STANDARD_SECTIONS.map((s) => ({
    ...s,
    criteria: (STANDARD_INDICATORS[s.sectionType] ?? []).map((c) => ({ ...c })),
    taskIndexes: [] as number[],
  }));

  let addedTask = false;
  tasks.forEach((task, idx) => {
    const text = htmlToPlainText(task.text).trim();
    if (!text) return;
    const section = sections[detectSectionIndex(text)]!;
    section.taskIndexes.push(idx);
    addedTask = true;

    // Skip a task-derived indicator that duplicates a seeded standard row
    // (exact description match) — the standard catalog already covers it.
    const alreadySeeded = section.criteria.some(
      (c) => c.description.trim().toLowerCase() === text.toLowerCase(),
    );
    if (!alreadySeeded) {
      section.criteria.push({
        criterionName: makeCriterionName(text),
        description: text,
        maxScore: DEFAULT_CRITERION_MARKS,
      });
    }
  });

  // No real task text was found (blank/empty entries only) — nothing to build.
  if (!addedTask) return [];

  return sections;
}

export default generateAssessmentChecklist;
