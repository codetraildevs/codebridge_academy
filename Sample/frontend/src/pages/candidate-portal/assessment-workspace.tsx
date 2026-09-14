import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardBody } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import { candidatePortalApi, type AssessmentWorkspace } from '@services/candidate-portal-service';
import { WorkspaceEngine } from '@components/workspace/workspace-engine';
import type { AssignedModule } from '@components/workspace/workspace-engine';
import {
  Clock,
  Loader2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Circle,
  Send,
  FileText,
  AlertTriangle,
  Save,
  ListChecks,
  FileCheck,
  Upload,
  BookOpen,
} from 'lucide-react';
import { RichTextRenderer } from '@components/assessment-builder/rich-text-renderer';
import { ChecklistTable } from '@components/assessment-builder/checklist-table';

/**
 * Extracts editable HTML (or plain text) from the stored scenario JSON.
 * Imported assessments store `{ html, text }`; manually created ones may
 * store a plain string.
 */
function getScenarioHtml(scenario: unknown): string | null {
  if (!scenario || typeof scenario !== 'object') return null;
  const value = scenario as { html?: unknown; text?: unknown };
  if (typeof value.html === 'string' && value.html.trim()) return value.html;
  if (typeof value.text === 'string' && value.text.trim()) return value.text;
  return null;
}

export function AssessmentWorkspacePage() {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session') || '';
  const registrationId = searchParams.get('registration') || '';

  const [workspace, setWorkspace] = useState<AssessmentWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTaskIndex, setActiveTaskIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<string | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    if (!assessmentId) return;
    setLoading(true);
    candidatePortalApi.getAssessmentWorkspace(assessmentId)
      .then(setWorkspace)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [assessmentId]);

  // Session heartbeat every 30s
  useEffect(() => {
    if (!sessionId) return;
    heartbeatRef.current = setInterval(() => {
      candidatePortalApi.sessionHeartbeat(sessionId).catch(() => {});
    }, 30000);
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [sessionId]);

  const tasks = workspace?.assessment?.tasks || [];
  const modules = (workspace?.assessment?.workspaceModules || []) as unknown as AssignedModule[];
  const currentTask = tasks[activeTaskIndex];
  const scenarioHtml = workspace ? getScenarioHtml(workspace.assessment.scenario) : null;

  // Find existing draft submission for this registration
  const currentSubmission = workspace?.submissions?.find((s) => s.status === 'DRAFT');

  // Initialize / sync textarea when task or submission content changes
  useEffect(() => {
    if (textareaRef.current && currentSubmission?.content) {
      const contentStr = typeof currentSubmission.content === 'string'
        ? currentSubmission.content
        : JSON.stringify(currentSubmission.content, null, 2);
      textareaRef.current.value = contentStr;
    }
  }, [activeTaskIndex, currentSubmission?.content]);

  // Debounced auto-save: triggers 2 seconds after the last keystroke
  const handleTextareaChange = () => {
    // Clear any pending auto-save
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    setAutoSaveStatus('idle');

    // Schedule a new auto-save in 2 seconds
    const currentAssessmentId = assessmentId;
    const currentRegistrationId = registrationId;
    debounceTimerRef.current = setTimeout(async () => {
      const value = textareaRef.current?.value;
      if (!value || !currentAssessmentId || !currentRegistrationId) return;

      setAutoSaveStatus('saving');
      try {
        const updated = await candidatePortalApi.createOrUpdateSubmission({
          assessmentId: currentAssessmentId,
          registrationId: currentRegistrationId,
          submissionType: 'MIXED',
          content: value,
        });
        // Update local workspace state so "Submit All" sees the auto-saved draft
        setWorkspace((prev) => {
          if (!prev) return prev;
          const existing = prev.submissions.findIndex((s) => s.id === updated.id);
          const newSubmissions = [...prev.submissions];
          if (existing >= 0) {
            newSubmissions[existing] = updated;
          } else {
            newSubmissions.push(updated);
          }
          return { ...prev, submissions: newSubmissions };
        });
        setAutoSaveStatus('saved');
        setTimeout(() => setAutoSaveStatus('idle'), 2000);
      } catch {
        setAutoSaveStatus('error');
      }
    }, 2000);
  };

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleSave = async (content: unknown) => {
    if (!assessmentId || !registrationId) return;
    // Cancel any pending auto-save to prevent double-save
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    setSaving(true);
    try {
      const updated = await candidatePortalApi.createOrUpdateSubmission({
        assessmentId,
        registrationId,
        submissionType: 'MIXED',
        content,
      });
      // Update submissions locally instead of refetching everything
      setWorkspace((prev) => {
        if (!prev) return prev;
        const existing = prev.submissions.findIndex((s) => s.id === updated.id);
        const newSubmissions = [...prev.submissions];
        if (existing >= 0) {
          newSubmissions[existing] = updated;
        } else {
          newSubmissions.push(updated);
        }
        return { ...prev, submissions: newSubmissions };
      });
      setSubmissionStatus('Saved');
      setTimeout(() => setSubmissionStatus(null), 2000);
    } catch (err) {
      console.error('Save failed:', err);
      setSubmissionStatus('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitAll = async () => {
    if (!assessmentId || !registrationId) return;
    setSubmitting(true);
    try {
      const drafts = workspace?.submissions?.filter((s) => s.status === 'DRAFT') || [];
      // Submit all drafts in parallel
      const results = await Promise.all(
        drafts.map((draft) => candidatePortalApi.submitSubmission(draft.id)),
      );
      setSubmissionStatus('All submitted!');
      // Update submissions locally
      setWorkspace((prev) => {
        if (!prev) return prev;
        const updatedSubmissions = prev.submissions.map((s) => {
          const result = results.find((r) => r.id === s.id);
          return result || s;
        });
        return { ...prev, submissions: updatedSubmissions };
      });
      setTimeout(() => setSubmissionStatus(null), 3000);
    } catch (err) {
      console.error('Submit failed:', err);
      setSubmissionStatus('Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const tasksCompleted = tasks.filter((t) =>
    workspace?.submissions?.some((s) => s.sectionId === t.id && s.status !== 'DRAFT'),
  ).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-10 w-10 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="flex flex-col items-center py-24 text-center">
        <AlertTriangle className="h-16 w-16 text-text-tertiary" />
        <h3 className="mt-4 text-lg font-medium text-text-primary">Assessment not found</h3>
        <Button className="mt-4" variant="secondary" onClick={() => navigate('/candidate-portal')}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-border bg-white px-6 py-3 shrink-0">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/candidate-portal')}
            icon={<ChevronLeft className="h-4 w-4" />}
          >
            Back
          </Button>
          <div>
            <h2 className="text-base font-semibold text-text-primary">{workspace.assessment.title}</h2>
            <p className="text-xs text-text-tertiary">
              {workspace.assessment.field?.name} &middot; {workspace.assessment.durationMinutes} min
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Timer (display only for now) */}
          <div className="flex items-center gap-1.5 text-sm text-text-secondary">
            <Clock className="h-4 w-4" />
            <span>{workspace.assessment.durationMinutes} min</span>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <FileCheck className="h-4 w-4" />
            <span>{tasksCompleted}/{tasks.length} tasks</span>
          </div>

          {/* Save indicators */}
          {/* Auto-save indicator */}
          {autoSaveStatus === 'saving' && (
            <Badge variant="info" size="sm">
              <Loader2 className="h-3 w-3 mr-1 inline animate-spin" />
              Auto-saving...
            </Badge>
          )}
          {autoSaveStatus === 'saved' && (
            <Badge variant="success" size="sm">
              <CheckCircle2 className="h-3 w-3 mr-1 inline" />
              Auto-saved
            </Badge>
          )}
          {autoSaveStatus === 'error' && (
            <Badge variant="error" size="sm">
              <AlertTriangle className="h-3 w-3 mr-1 inline" />
              Auto-save failed
            </Badge>
          )}
          {/* Manual save indicator */}
          {submissionStatus && (
            <Badge variant={submissionStatus === 'Save failed' || submissionStatus === 'Submission failed' ? 'error' : 'success'} size="sm">
              {submissionStatus === 'Saved' || submissionStatus === 'All submitted!' ? (
                <CheckCircle2 className="h-3 w-3 mr-1 inline" />
              ) : (
                <AlertTriangle className="h-3 w-3 mr-1 inline" />
              )}
              {submissionStatus}
            </Badge>
          )}

          {/* Save & Submit */}
          {currentTask && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                // If no workspace modules, save the textarea content; otherwise fallback to task
                const content = modules.length === 0
                  ? textareaRef.current?.value || ''
                  : currentTask;
                handleSave(content);
              }}
              loading={saving}
              icon={<Save className="h-4 w-4" />}
            >
              Save
            </Button>
          )}

          <Button
            size="sm"
            onClick={handleSubmitAll}
            loading={submitting}
            icon={<Send className="h-4 w-4" />}
            disabled={tasksCompleted === tasks.length}
          >
            Submit All
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Task Sidebar */}
        <div className="w-64 border-r border-border bg-white overflow-y-auto shrink-0">
          <div className="p-3 border-b border-border">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">Tasks</h3>
          </div>
          <div className="p-2 space-y-1">
            {tasks.map((task, index) => {
              const isCompleted = workspace.submissions?.some(
                (s) => s.sectionId === task.id && s.status !== 'DRAFT',
              );
              const hasDraft = workspace.submissions?.some(
                (s) => s.sectionId === task.id && s.status === 'DRAFT',
              );
              return (
                <button
                  key={task.id}
                  onClick={() => setActiveTaskIndex(index)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    index === activeTaskIndex
                      ? 'bg-primary-50 text-primary-700 font-medium'
                      : 'text-text-secondary hover:bg-surface-tertiary hover:text-text-primary'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                    ) : hasDraft ? (
                      <FileText className="h-4 w-4 text-amber-500 shrink-0" />
                    ) : (
                      <Circle className="h-4 w-4 text-text-tertiary shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate">{task.title || `Task ${index + 1}`}</p>
                      <p className="text-xs text-text-tertiary">{task.points} pts &middot; {task.taskType.replace(/_/g, ' ')}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Task Content + Workspace */}
        <div className="flex-1 overflow-y-auto">
          {currentTask ? (
            <div className="p-6 space-y-6">
              {/* Scenario (from imported or manually created content) */}
              {scenarioHtml && (
                <Card variant="outlined" padding="md">
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen className="h-4 w-4 text-primary-600" />
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                      Scenario
                    </h4>
                  </div>
                  <RichTextRenderer html={scenarioHtml} />
                </Card>
              )}

              {/* Assessment Checklist (read-only reference for the candidate) */}
              {workspace.assessment.checklistItems.length > 0 && (
                <Card variant="outlined" padding="md">
                  <details className="group">
                    <summary className="flex items-center justify-between cursor-pointer select-none list-none">
                      <div className="flex items-center gap-2">
                        <ListChecks className="h-4 w-4 text-primary-600" />
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                          Assessment Checklist
                        </h4>
                      </div>
                      <Badge variant="neutral" size="sm">
                        {workspace.assessment.checklistItems.length} criteria
                      </Badge>
                    </summary>
                    <ChecklistTable
                      items={workspace.assessment.checklistItems}
                      className="mt-3"
                    />
                  </details>
                </Card>
              )}

              {/* Task Header */}
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Badge variant="info" size="sm">{currentTask.taskType.replace(/_/g, ' ')}</Badge>
                  <span className="text-sm text-text-tertiary">{currentTask.points} points</span>
                </div>
                <h3 className="text-lg font-semibold text-text-primary">{currentTask.title}</h3>
                {currentTask.description && (
                  <RichTextRenderer
                    html={currentTask.description}
                    className="mt-1 text-text-secondary"
                  />
                )}
                {currentTask.expectedOutput && (
                  <div className="mt-3 p-3 rounded-lg bg-surface-secondary border border-border">
                    <p className="text-xs font-medium text-text-tertiary mb-1">Expected Output</p>
                    <RichTextRenderer
                      html={currentTask.expectedOutput}
                      className="text-text-primary"
                    />
                  </div>
                )}
              </div>

          {/* Workspace Modules */}
          {modules.length > 0 ? (
            <div className="space-y-4">
              {modules.map((mod) => (
                <WorkspaceEngine
                  key={mod.workspaceModuleId}
                  modules={[mod as unknown as AssignedModule]}
                  onModuleSave={(_moduleKey, data) => handleSave(data)}
                  readOnly={false}
                />
              ))}
            </div>
          ) : (
            <Card variant="outlined" padding="md">
              <div className="flex flex-col items-center py-8 text-center">
                <FileText className="h-12 w-12 text-text-tertiary" />
                <p className="mt-3 text-sm text-text-secondary">
                  Use the text area below to write your response.
                </p>
                <textarea
                  ref={textareaRef}
                  onChange={handleTextareaChange}
                  className="mt-4 w-full max-w-2xl rounded-lg border border-border bg-white p-4 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 min-h-[200px]"
                  placeholder="Write your answer here..."
                  defaultValue={
                    currentSubmission?.content
                      ? typeof currentSubmission.content === 'string'
                        ? currentSubmission.content
                        : JSON.stringify(currentSubmission.content, null, 2)
                      : ''
                  }
                />
              </div>
            </Card>
          )}

          {/* File Upload Section */}
          {currentSubmission && (
            <Card variant="outlined" padding="md">
              <CardHeader>
                <CardTitle>Attach Files</CardTitle>
              </CardHeader>
              <CardBody>
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      candidatePortalApi.addSubmissionFile({
                        submissionId: currentSubmission.id,
                        fileName: file.name,
                        fileSize: file.size,
                        mimeType: file.type,
                      }).then(() => {
                        // Refresh to show the file
                        if (assessmentId) {
                          candidatePortalApi.getAssessmentWorkspace(assessmentId).then(setWorkspace);
                        }
                      }).catch(console.error);
                    }}
                  />
                  <label
                    htmlFor="file-upload"
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-white text-sm font-medium text-text-secondary hover:bg-surface-tertiary hover:text-text-primary cursor-pointer transition-colors"
                  >
                    <Upload className="h-4 w-4" />
                    Upload File
                  </label>
                  {currentSubmission.files && currentSubmission.files.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {currentSubmission.files.map((f) => (
                        <Badge key={f.id} variant="neutral" size="sm">
                          {f.fileName}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          )}
            </div>
          ) : (
            <div className="flex flex-col items-center py-24 text-center">
              <ListChecks className="h-16 w-16 text-text-tertiary" />
              <h3 className="mt-4 text-lg font-medium text-text-primary">No tasks configured</h3>
              <p className="mt-2 text-sm text-text-secondary">
                This assessment doesn't have any tasks yet.
              </p>
            </div>
          )}
        </div>

        {/* Navigation Footer */}
        <div className="absolute bottom-0 left-64 right-0 border-t border-border bg-white px-6 py-3 flex items-center justify-between">
          <Button
            variant="secondary"
            size="sm"
            disabled={activeTaskIndex === 0}
            onClick={() => setActiveTaskIndex((i) => Math.max(0, i - 1))}
            icon={<ChevronLeft className="h-4 w-4" />}
          >
            Previous
          </Button>
          <span className="text-sm text-text-secondary">
            Task {activeTaskIndex + 1} of {tasks.length}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={activeTaskIndex >= tasks.length - 1}
            onClick={() => setActiveTaskIndex((i) => Math.min(tasks.length - 1, i + 1))}
          >
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default AssessmentWorkspacePage;
