import { describe, it, expect } from 'vitest';
import {
  generateAssessmentChecklist,
  detectQuestionType,
  extractNumberedTasks,
  makeCriterionName,
  renormalizeChecklistWeights,
  DEFAULT_CRITERION_MARKS,
} from '@pages/admin/components/checklist-generator';

describe('generateAssessmentChecklist', () => {
  it('builds the full standard TVET checklist from tasks (all four sections seeded)', () => {
    const sections = generateAssessmentChecklist([
      { text: 'Design an Entity Relationship Diagram (ERD) for the system.' },
      { text: 'Create the database with Employee and Department tables.' },
      { text: 'Develop the backend with Node.js and Express.' },
      { text: 'Present your product and demonstrate the key features.' },
      { text: 'Save your work in a folder named FirstName_LastName_Exam.' },
    ]);

    expect(sections.length).toBe(4);
    expect(sections.map((s) => s.title)).toEqual([
      'Preliminary Activities Performance',
      'Process and Fulfillment of the Task',
      'Product Presentation/Exhibition and Quality Assessment',
      'Closing Activities',
    ]);
    // Standard weights are always preserved (15/50/30/5).
    expect(sections.map((s) => s.weight)).toEqual([15, 50, 30, 5]);
    // Standard catalog (12/14/8/5) + one task indicator in each section.
    expect(sections.map((s) => s.criteria.length)).toEqual([13, 16, 9, 6]);
    // Every task is assigned to exactly one section.
    expect(sections.flatMap((s) => s.taskIndexes).sort()).toEqual([0, 1, 2, 3, 4]);
  });

  it('always includes all four standard sections with the full sample-exam indicator catalog', () => {
    const sections = generateAssessmentChecklist([
      { text: 'Create the login page with React.' },
      { text: 'Build the REST API endpoints.' },
    ]);
    expect(sections.length).toBe(4);
    expect(sections.map((s) => s.weight)).toEqual([15, 50, 30, 5]);
    // Every section is pre-filled with its standard catalog even when no task maps to it.
    expect(sections[0]!.criteria.some((c) => c.criterionName === 'Required entities are drawn')).toBe(true);
    expect(sections[1]!.criteria.some((c) => c.criterionName === 'Node.js project is created')).toBe(true);
    expect(sections[2]!.criteria.some((c) => c.criterionName === 'The product name is mentioned')).toBe(true);
    expect(sections[3]!.criteria.some((c) => c.criterionName === 'Project folder is permanently removed')).toBe(true);
    // Tasks still land in their detected section (Process, by default).
    expect(sections[1]!.taskIndexes).toEqual([0, 1]);
  });

  it('turns every task into an additional scored indicator', () => {
    const sections = generateAssessmentChecklist([{ text: 'Design an ERD for the system.' }]);
    const taskCriterion = sections[0]!.criteria.find(
      (c) => c.description === 'Design an ERD for the system.',
    );
    expect(taskCriterion).toMatchObject({
      maxScore: DEFAULT_CRITERION_MARKS,
      criterionName: 'Design an ERD for…',
    });
  });

  it('does not duplicate a task that matches a seeded standard indicator', () => {
    const sections = generateAssessmentChecklist([{ text: 'Node.js project is created' }]);
    expect(sections[1]!.criteria.filter((c) => c.description === 'Node.js project is created')).toHaveLength(1);
  });

  it('returns an empty list when there are no tasks', () => {
    expect(generateAssessmentChecklist([])).toEqual([]);
    expect(generateAssessmentChecklist([{ text: '<p></p>' }])).toEqual([]);
  });

  it('handles CKEditor HTML task text', () => {
    const sections = generateAssessmentChecklist([
      { text: '<p>Design an <strong>Entity Relationship Diagram</strong> (ERD).</p>' },
    ]);
    expect(
      sections[0]!.criteria.some((c) => c.description.includes('Entity Relationship Diagram')),
    ).toBe(true);
  });
});

describe('extractNumberedTasks', () => {
  it('splits explicitly numbered tasks', () => {
    expect(
      extractNumberedTasks('1. Design an ERD\n2. Create the database\n3. Present your work'),
    ).toEqual(['Design an ERD', 'Create the database', 'Present your work']);
  });

  it('keeps wrapped lines and sub-bullets with their task', () => {
    expect(
      extractNumberedTasks(
        '1. Design an ERD\n   Identify primary keys\n2. Create the database',
      ),
    ).toEqual(['Design an ERD Identify primary keys', 'Create the database']);
  });

  it('treats entity list items as sub-items, not new tasks', () => {
    const tasks = extractNumberedTasks(
      '1. Design an ERD with these entities:\n1. Employee (employeeNumber, FirstName)\n2. Department (DepartementCode, name)\n2. Create the database',
    );
    expect(tasks).toHaveLength(2);
    expect(tasks[0]).toContain('Employee (employeeNumber, FirstName)');
    expect(tasks[1]).toBe('Create the database');
  });

  it('keeps attribute lists wrapped onto the next line with their parent task', () => {
    const tasks = extractNumberedTasks(
      '1. Design an ERD with these entities:\n1. Employee (employeeNumber, FirstName)\n2. Department\n(DepartementCode, name, GrossSalary)\n3. Salary (GlossSalary, TotalDeduction)\n4. Create the database',
    );
    expect(tasks).toHaveLength(2);
    expect(tasks[0]).toContain('Employee (employeeNumber, FirstName)');
    expect(tasks[0]).toContain('Department (DepartementCode, name, GrossSalary)');
    expect(tasks[0]).toContain('Salary (GlossSalary, TotalDeduction)');
    expect(tasks[1]).toBe('Create the database');
  });

  it('does not treat a short numbered line as a list item when the next line is not an attribute list', () => {
    const tasks = extractNumberedTasks(
      '1. Design an ERD\n2. Create the database\n(see the ERD above)\n3. Test the app',
    );
    expect(tasks).toHaveLength(3);
    expect(tasks[0]).toBe('Design an ERD');
    expect(tasks[1]).toBe('Create the database (see the ERD above)');
    expect(tasks[2]).toBe('Test the app');
  });

  it('treats every line as a task when no explicit numbers are used', () => {
    expect(
      extractNumberedTasks('Design an ERD\nCreate the database\nPresent your work'),
    ).toEqual(['Design an ERD', 'Create the database', 'Present your work']);
  });

  it('handles CKEditor HTML and returns an empty list for empty input', () => {
    expect(
      extractNumberedTasks('<p>1. Design an <strong>ERD</strong></p><p>2. Build the API</p>'),
    ).toEqual(['Design an ERD', 'Build the API']);
    expect(extractNumberedTasks('')).toEqual([]);
    expect(extractNumberedTasks(undefined)).toEqual([]);
    expect(extractNumberedTasks('<p></p>')).toEqual([]);
  });
});

describe('detectQuestionType', () => {
  it('detects diagram tasks', () => {
    expect(detectQuestionType('Design an ERD for the system')).toBe('DIAGRAM');
  });
  it('detects code tasks', () => {
    expect(detectQuestionType('Implement the backend with Node.js and Express')).toBe('CODE');
    expect(detectQuestionType('Write a program to calculate salaries')).toBe('CODE');
  });
  it('detects essay tasks', () => {
    expect(detectQuestionType('Explain the key features of the system')).toBe('ESSAY');
  });
  it('detects file-upload tasks', () => {
    expect(detectQuestionType('Upload your project files')).toBe('FILE_UPLOAD');
  });
  it('defaults to essay', () => {
    expect(detectQuestionType('Build the practical assessment')).toBe('ESSAY');
  });
});

describe('renormalizeChecklistWeights', () => {
  it('re-scales remaining sections to sum to 100', () => {
    const sections = [
      { title: 'A', sectionType: 'ERD_DESIGN', weight: 15, criteria: [], taskIndexes: [] },
      { title: 'B', sectionType: 'CODE_WRITING', weight: 50, criteria: [], taskIndexes: [] },
    ];
    const next = renormalizeChecklistWeights(sections);
    expect(next.reduce((sum, s) => sum + s.weight, 0)).toBe(100);
    expect(next[0]!.weight).toBe(23);
    expect(next[1]!.weight).toBe(77);
    // Original array is untouched (pure).
    expect(sections.map((s) => s.weight)).toEqual([15, 50]);
  });
});

describe('makeCriterionName', () => {
  it('keeps short descriptions as-is', () => {
    expect(makeCriterionName('Department entity is drawn')).toBe('Department entity is drawn');
  });
  it('truncates long descriptions to four words', () => {
    expect(makeCriterionName('Design an Entity Relationship Diagram for the system')).toBe('Design an Entity Relationship…');
  });
});
