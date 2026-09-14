import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AssessmentDetailPage } from '@pages/assessment-builder/[id]';
import { assessmentBuilderApi } from '@services/assessment-builder-service';
import type { Assessment, AssessmentTask } from '@services/assessment-builder-service';

// ── Mocks ───────────────────────────────────────

// The RichTextEditor is driven by TipTap (needs a real DOM + clipboard APIs);
// swap it for a plain textarea that emits the same `<p>…</p>` HTML shape.
vi.mock('@components/assessment-builder/rich-text-editor', () => ({
  RichTextEditor: ({
    value,
    onChange,
    placeholder,
  }: {
    value?: string | null;
    onChange?: (html: string) => void;
    placeholder?: string;
  }) => (
    <textarea
      data-testid="rich-text-editor"
      placeholder={placeholder}
      value={value ?? ''}
      onChange={(e) => onChange?.(`<p>${e.target.value}</p>`)}
    />
  ),
  hasRichTextContent: (html: string | null | undefined) => {
    if (!html) return false;
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim().length > 0;
  },
}));

vi.mock('@components/workspace/workspace-engine', () => ({
  WorkspaceEngine: () => <div data-testid="workspace-engine" />,
}));

vi.mock('@components/ai-evaluation/ai-evaluation-tab', () => ({
  AiEvaluationTab: () => <div data-testid="ai-evaluation-tab" />,
}));

vi.mock('@services/assessment-builder-service', () => ({
  assessmentBuilderApi: {
    getById: vi.fn(),
    updateTask: vi.fn(),
    listWorkspaceModules: vi.fn().mockResolvedValue([]),
    downloadChecklistPdf: vi.fn(),
  },
}));

vi.mock('@services/field-service', () => ({
  fieldService: { list: vi.fn().mockResolvedValue([]) },
}));

vi.mock('@services/organization-service', () => ({
  organizationService: { list: vi.fn().mockResolvedValue({ data: [] }) },
}));

// ── Fixtures ────────────────────────────────────

const baseTask: AssessmentTask = {
  id: 'task-1',
  assessmentId: 'assess-1',
  title: 'Build ER Diagram',
  description: null,
  taskType: 'DIAGRAM',
  orderIndex: 0,
  points: 10,
  expectedOutput: null,
  config: null,
  createdAt: '2026-08-08T00:00:00.000Z',
  updatedAt: '2026-08-08T00:00:00.000Z',
};

const baseAssessment: Assessment = {
  id: 'assess-1',
  organizationId: null,
  fieldId: 'field-1',
  title: 'Software Development Final',
  description: null,
  assessmentType: 'PRACTICAL',
  difficulty: 'INTERMEDIATE',
  status: 'DRAFT',
  durationMinutes: 120,
  passingScore: 50,
  maxAttempts: 1,
  instructions: null,
  scenario: null,
  resources: null,
  allowOralDefense: true,
  requireFullScreen: true,
  requireWebcam: false,
  createdBy: 'user-1',
  createdAt: '2026-08-08T00:00:00.000Z',
  updatedAt: '2026-08-08T00:00:00.000Z',
  tasks: [baseTask],
  checklistItems: [],
  evidenceReqs: [],
  aiRules: [],
  oralQuestions: [],
};

function renderPage(assessment: Assessment = baseAssessment) {
  vi.mocked(assessmentBuilderApi.getById).mockResolvedValue(assessment);
  return render(
    <MemoryRouter initialEntries={['/assessment-builder/assess-1']}>
      <Routes>
        <Route path="/assessment-builder/:id" element={<AssessmentDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

/** Opens the Tasks tab and expands the first task. */
async function openFirstTask() {
  await waitFor(() => {
    expect(screen.getByRole('button', { name: 'Tasks' })).toBeInTheDocument();
  });
  fireEvent.click(screen.getByRole('button', { name: 'Tasks' }));
  await waitFor(() => {
    expect(screen.getByText('Build ER Diagram')).toBeInTheDocument();
  });
  fireEvent.click(screen.getByText('Build ER Diagram'));
  // Expanded tasks show "Add description" (no description yet) or "Edit description"
  await waitFor(() => {
    const addBtn = screen.queryByText('Add description');
    const editBtn = screen.queryByText('Edit description');
    expect(addBtn || editBtn).toBeTruthy();
  });
}

// ── Test suite ──────────────────────────────────

describe('AssessmentDetailPage — task description edit/save flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('adds a rich-text description to a task and saves it via the API', async () => {
    vi.mocked(assessmentBuilderApi.updateTask).mockResolvedValue({
      ...baseTask,
      description: '<p>Design the entity-relationship diagram with all attributes.</p>',
    });

    renderPage();
    await openFirstTask();

    fireEvent.click(screen.getByText('Add description'));

    const editor = screen.getByPlaceholderText('Describe what the candidate must do...');
    fireEvent.change(editor, { target: { value: 'Design the entity-relationship diagram with all attributes.' } });

    fireEvent.click(screen.getByText('Save Description'));

    await waitFor(() => {
      expect(assessmentBuilderApi.updateTask).toHaveBeenCalledWith('task-1', {
        description: '<p>Design the entity-relationship diagram with all attributes.</p>',
      });
    });

    // The saved HTML is rendered back in the expanded task
    await waitFor(() => {
      expect(screen.getByText('Design the entity-relationship diagram with all attributes.')).toBeInTheDocument();
    });
    expect(screen.queryByText('No description yet.')).not.toBeInTheDocument();
  });

  it('edits an existing task description and saves the updated rich text', async () => {
    vi.mocked(assessmentBuilderApi.updateTask).mockResolvedValue({
      ...baseTask,
      description: '<p>Design the schema and include foreign keys.</p>',
    });
    const withDescription = {
      ...baseAssessment,
      tasks: [{ ...baseTask, description: '<p>Design the schema.</p>' }],
    };

    renderPage(withDescription);
    await openFirstTask();

    // Edit mode is entered with the existing value
    fireEvent.click(screen.getByText('Edit description'));
    const editor = screen.getByPlaceholderText('Describe what the candidate must do...');
    expect(editor).toHaveValue('<p>Design the schema.</p>');

    fireEvent.change(editor, { target: { value: 'Design the schema and include foreign keys.' } });
    fireEvent.click(screen.getByText('Save Description'));

    await waitFor(() => {
      expect(assessmentBuilderApi.updateTask).toHaveBeenCalledWith('task-1', {
        description: '<p>Design the schema and include foreign keys.</p>',
      });
    });
    expect(screen.getByText('Design the schema and include foreign keys.')).toBeInTheDocument();
  });

  it('clears the description when the editor is emptied', async () => {
    vi.mocked(assessmentBuilderApi.updateTask).mockResolvedValue({ ...baseTask, description: null });
    const withDescription = {
      ...baseAssessment,
      tasks: [{ ...baseTask, description: '<p>Old description</p>' }],
    };

    renderPage(withDescription);
    await openFirstTask();

    fireEvent.click(screen.getByText('Edit description'));
    const editor = screen.getByPlaceholderText('Describe what the candidate must do...');
    fireEvent.change(editor, { target: { value: '' } });
    fireEvent.click(screen.getByText('Save Description'));

    await waitFor(() => {
      expect(assessmentBuilderApi.updateTask).toHaveBeenCalledWith('task-1', {
        description: null,
      });
    });
    // Back to the empty state
    await waitFor(() => {
      expect(screen.getByText('No description yet.')).toBeInTheDocument();
    });
  });

  it('saves an expected output as rich text for a task', async () => {
    vi.mocked(assessmentBuilderApi.updateTask).mockResolvedValue({
      ...baseTask,
      expectedOutput: '<p>ER diagram exported as a PNG file.</p>',
    });

    renderPage();
    await openFirstTask();

    fireEvent.click(screen.getByText('Add expected output'));
    const editor = screen.getByPlaceholderText('Describe the expected result / final output...');
    fireEvent.change(editor, { target: { value: 'ER diagram exported as a PNG file.' } });
    fireEvent.click(screen.getByText('Save Expected Output'));

    await waitFor(() => {
      expect(assessmentBuilderApi.updateTask).toHaveBeenCalledWith('task-1', {
        expectedOutput: '<p>ER diagram exported as a PNG file.</p>',
      });
    });
    await waitFor(() => {
      expect(screen.getByText('ER diagram exported as a PNG file.')).toBeInTheDocument();
    });
  });

  it('downloads the checklist as a printable marking-sheet PDF from the Checklist tab', async () => {
    const withItems: Assessment = {
      ...baseAssessment,
      checklistItems: [
        {
          id: 'c1',
          assessmentId: 'assess-1',
          title: 'User entity is drawn',
          description: '1.1. Conceptual database schema is properly designed',
          section: 'Preliminary activities (15%)',
          weight: 2,
          isRequired: true,
          assessmentMethod: 'ASSESSOR_REVIEW',
          expectedResult: null,
          orderIndex: 0,
          createdAt: '2026-08-08T00:00:00.000Z',
        },
      ],
    };
    const createObjectURL = vi.fn(() => 'blob:mock');
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL: vi.fn() });
    vi.mocked(assessmentBuilderApi.downloadChecklistPdf).mockResolvedValue(
      new Blob(['%PDF'], { type: 'application/pdf' }),
    );

    renderPage(withItems);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Checklist' })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Checklist' }));

    const exportBtn = await screen.findByRole('button', { name: /export pdf/i });
    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(assessmentBuilderApi.downloadChecklistPdf).toHaveBeenCalledWith('assess-1');
    });
    expect(createObjectURL).toHaveBeenCalled();
  });
});
