/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import { Card } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import {
  assessmentBuilderApi,
  type AutoConfigDraft,
  type ApplyAutoConfigPayload,
} from '@services/assessment-builder-service';
import {
  X,
  Loader2,
  AlertCircle,
  Sparkles,
  FileSearch,
  Brain,
  MessageSquare,
  Puzzle,
  RefreshCw,
  Check,
  Lightbulb,
} from 'lucide-react';

// ── Types ──────────────────────────────────────

type Tab = 'evidence' | 'rules' | 'questions' | 'workspace';

interface AutoConfigPanelProps {
  assessmentId: string;
  open: boolean;
  onClose: () => void;
  /** Called after a successful apply so the page can reload the assessment. */
  onApplied: () => void;
}

interface EvidenceEdit {
  title: string;
  evidenceType: string;
}
interface RuleEdit {
  ruleName: string;
  ruleType: string;
  weight: number;
}
interface QuestionEdit {
  questionText: string;
}

const EVIDENCE_TYPES = ['FILE', 'SCREENSHOT', 'VIDEO', 'AUDIO', 'CODE', 'TEXT', 'IMAGE'];
const AI_RULE_TYPES = ['SCORING', 'FEEDBACK', 'PLAGIARISM', 'COMPETENCY_MAPPING', 'SIMILARITY', 'ORAL_EVALUATION'];

const TAB_META: { key: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'evidence', label: 'Evidence', icon: FileSearch },
  { key: 'rules', label: 'AI Rules', icon: Brain },
  { key: 'questions', label: 'Oral Defense', icon: MessageSquare },
  { key: 'workspace', label: 'Workspace', icon: Puzzle },
];

// ── Component ──────────────────────────────────

export function AutoConfigPanel({ assessmentId, open, onClose, onApplied }: AutoConfigPanelProps) {
  const [draft, setDraft] = useState<AutoConfigDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('evidence');
  const [confirmApply, setConfirmApply] = useState(false);

  // Include toggles — keyed by item index so edits survive regenerate only when
  // the index is still meaningful; simpler: reset on each analyze.
  const [includedEvidence, setIncludedEvidence] = useState<Set<number>>(new Set());
  const [includedRules, setIncludedRules] = useState<Set<number>>(new Set());
  const [includedQuestions, setIncludedQuestions] = useState<Set<number>>(new Set());
  const [includedModules, setIncludedModules] = useState<Set<number>>(new Set());

  // Inline edits
  const [evidenceEdits, setEvidenceEdits] = useState<Record<number, EvidenceEdit>>({});
  const [ruleEdits, setRuleEdits] = useState<Record<number, RuleEdit>>({});
  const [questionEdits, setQuestionEdits] = useState<Record<number, QuestionEdit>>({});

  const analyze = useCallback(async () => {
    setLoading(true);
    setError(null);
    setConfirmApply(false);
    try {
      const d = await assessmentBuilderApi.analyzeAssessment(assessmentId);
      setDraft(d);
      setIncludedEvidence(new Set(d.evidenceReqs.map((_, i) => i)));
      setIncludedRules(new Set(d.aiRules.map((_, i) => i)));
      setIncludedQuestions(new Set(d.oralQuestions.map((_, i) => i)));
      setIncludedModules(new Set(d.workspaceModules.map((_, i) => i)));
      setEvidenceEdits({});
      setRuleEdits({});
      setQuestionEdits({});
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to analyze the assessment');
    } finally {
      setLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => {
    if (open) {
      setActiveTab('evidence');
      analyze();
    } else {
      setDraft(null);
      setError(null);
      setConfirmApply(false);
      setSaving(false);
    }
  }, [open, analyze]);

  const toggle = (set: Set<number>, setter: (s: Set<number>) => void, index: number) => {
    const next = new Set(set);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setter(next);
  };

  // ── Payload ──────────────────────────────────

  const buildPayload = (): ApplyAutoConfigPayload => {
    const payload: ApplyAutoConfigPayload = {};

    if (draft) {
      payload.evidenceReqs = draft.evidenceReqs
        .map((item, i) => ({ item, i }))
        .filter(({ i }) => includedEvidence.has(i))
        .map(({ item, i }, order) => {
          const edit = evidenceEdits[i];
          return {
            title: edit?.title?.trim() || item.title,
            description: item.description || null,
            evidenceType: edit?.evidenceType || item.evidenceType,
            isRequired: item.isRequired,
            maxFiles: item.maxFiles,
            orderIndex: order,
          };
        });

      payload.aiRules = draft.aiRules
        .map((item, i) => ({ item, i }))
        .filter(({ i }) => includedRules.has(i))
        .map(({ item, i }, order) => {
          const edit = ruleEdits[i];
          return {
            ruleName: edit?.ruleName?.trim() || item.ruleName,
            description: item.description || null,
            ruleType: edit?.ruleType || item.ruleType,
            config: item.config,
            weight: edit?.weight ?? item.weight,
            isActive: item.isActive,
            orderIndex: order,
          };
        });

      payload.oralQuestions = draft.oralQuestions
        .map((item, i) => ({ item, i }))
        .filter(({ i }) => includedQuestions.has(i))
        .map(({ item, i }, order) => {
          const edit = questionEdits[i];
          return {
            questionText: edit?.questionText?.trim() || item.questionText,
            questionType: item.questionType,
            category: item.category || null,
            orderIndex: order,
            timeLimitSeconds: item.timeLimitSeconds,
            passingScore: item.passingScore,
          };
        });

      payload.workspaceModuleKeys = draft.workspaceModules
        .map((item, i) => ({ item, i }))
        .filter(({ i }) => includedModules.has(i))
        .map(({ item }) => item.moduleKey);
    }

    return payload;
  };

  const totalIncluded =
    includedEvidence.size + includedRules.size + includedQuestions.size + includedModules.size;

  const handleApply = async () => {
    if (saving || totalIncluded === 0) return;
    if (!confirmApply) {
      setConfirmApply(true);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await assessmentBuilderApi.applyAutoConfig(assessmentId, buildPayload());
      setSaving(false);
      onApplied();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to apply the configuration');
      setSaving(false);
    }
  };

  if (!open) return null;

  // ── Render ────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-border w-full max-w-3xl max-h-[88vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-600 to-accent-600 text-white shadow-lg shadow-primary-600/25">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-text-primary">Analyze Assessment & Configure</h2>
              <p className="text-xs text-text-secondary">
                {draft
                  ? `Generated from ${draft.summary.taskCount} task(s), ${draft.summary.checklistCount} checklist item(s)${draft.summary.competencyCount ? ` and ${draft.summary.competencyCount} competencies` : ''} — ${draft.summary.fieldName}`
                  : 'Reviewing the assessment content…'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-md p-1.5 text-text-tertiary hover:bg-surface-tertiary hover:text-text-primary transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="relative">
              <div className="h-12 w-12 rounded-full border-2 border-primary-100" />
              <Loader2 className="h-12 w-12 animate-spin text-primary-600 absolute inset-0" />
            </div>
            <p className="mt-4 text-sm font-medium text-text-primary">Analyzing the assessment…</p>
            <p className="mt-1 text-xs text-text-secondary">
              Reading tasks, checklist, competencies and workspace modules
            </p>
          </div>
        ) : error && !draft ? (
          <div className="flex flex-col items-center py-16 text-center px-6">
            <AlertCircle className="h-12 w-12 text-error mb-3" />
            <p className="text-sm font-medium text-text-primary">Analysis failed</p>
            <p className="text-sm text-text-secondary mt-1">{error}</p>
            <div className="flex gap-2 mt-4">
              <Button variant="secondary" size="sm" onClick={analyze} icon={<RefreshCw className="h-4 w-4" />}>
                Retry
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        ) : draft ? (
          <>
            {/* Tabs */}
            <div className="flex gap-1 border-b border-border px-4 pt-2 shrink-0">
              {TAB_META.map((tab) => {
                const counts: Record<Tab, [number, number]> = {
                  evidence: [includedEvidence.size, draft.evidenceReqs.length],
                  rules: [includedRules.size, draft.aiRules.length],
                  questions: [includedQuestions.size, draft.oralQuestions.length],
                  workspace: [includedModules.size, draft.workspaceModules.length],
                };
                const [sel, total] = counts[tab.key];
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                      activeTab === tab.key
                        ? 'border-primary-600 text-primary-600'
                        : 'border-transparent text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <tab.icon className="h-4 w-4" />
                    {tab.label}
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none ${
                        sel === total && total > 0
                          ? 'bg-primary-100 text-primary-700'
                          : sel > 0
                            ? 'bg-accent-100 text-accent-700'
                            : 'bg-surface-tertiary text-text-tertiary'
                      }`}
                    >
                      {sel}/{total}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {activeTab === 'evidence' && (
                <div className="space-y-2">
                  <p className="text-xs text-text-tertiary">
                    Evidence candidates must submit — derived from your tasks, checklist sections and workspace.
                  </p>
                  {draft.evidenceReqs.length === 0 && (
                    <p className="text-sm text-text-secondary">No evidence requirements were generated.</p>
                  )}
                  {draft.evidenceReqs.map((item, i) => {
                    const edit = evidenceEdits[i] || { title: item.title, evidenceType: item.evidenceType };
                    return (
                      <Card key={i} variant="outlined" padding="sm">
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={includedEvidence.has(i)}
                            onChange={() => toggle(includedEvidence, setIncludedEvidence, i)}
                            className="mt-1 h-4 w-4 rounded border-border text-primary-600 focus:ring-primary-500"
                          />
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="grid gap-2 sm:grid-cols-[1fr_140px]">
                              <input
                                value={edit.title}
                                onChange={(e) =>
                                  setEvidenceEdits((prev) => ({ ...prev, [i]: { ...edit, title: e.target.value } }))
                                }
                                className="block w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                              />
                              <select
                                value={edit.evidenceType}
                                onChange={(e) =>
                                  setEvidenceEdits((prev) => ({ ...prev, [i]: { ...edit, evidenceType: e.target.value } }))
                                }
                                className="block w-full rounded-lg border border-border bg-white px-2.5 py-2 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                              >
                                {EVIDENCE_TYPES.map((t) => (
                                  <option key={t} value={t}>
                                    {t.replace(/_/g, ' ')}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <p className="text-xs text-text-tertiary flex items-start gap-1">
                              <Lightbulb className="h-3.5 w-3.5 mt-0.5 shrink-0 text-accent-600" />
                              {item.reason}
                            </p>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}

              {activeTab === 'rules' && (
                <div className="space-y-2">
                  <p className="text-xs text-text-tertiary">
                    AI evaluation rules — generated from the checklist, competencies and task types. Scoring stays
                    human-reviewable before publishing.
                  </p>
                  {draft.aiRules.length === 0 && (
                    <p className="text-sm text-text-secondary">No AI rules were generated.</p>
                  )}
                  {draft.aiRules.map((item, i) => {
                    const edit = ruleEdits[i] || { ruleName: item.ruleName, ruleType: item.ruleType, weight: item.weight };
                    return (
                      <Card key={i} variant="outlined" padding="sm">
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={includedRules.has(i)}
                            onChange={() => toggle(includedRules, setIncludedRules, i)}
                            className="mt-1 h-4 w-4 rounded border-border text-primary-600 focus:ring-primary-500"
                          />
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="grid gap-2 sm:grid-cols-[1fr_150px_70px]">
                              <input
                                value={edit.ruleName}
                                onChange={(e) =>
                                  setRuleEdits((prev) => ({ ...prev, [i]: { ...edit, ruleName: e.target.value } }))
                                }
                                className="block w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                              />
                              <select
                                value={edit.ruleType}
                                onChange={(e) =>
                                  setRuleEdits((prev) => ({ ...prev, [i]: { ...edit, ruleType: e.target.value } }))
                                }
                                className="block w-full rounded-lg border border-border bg-white px-2.5 py-2 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                              >
                                {AI_RULE_TYPES.map((t) => (
                                  <option key={t} value={t}>
                                    {t.replace(/_/g, ' ')}
                                  </option>
                                ))}
                              </select>
                              <input
                                type="number"
                                min={1}
                                value={edit.weight}
                                onChange={(e) =>
                                  setRuleEdits((prev) => ({ ...prev, [i]: { ...edit, weight: Number(e.target.value) || 1 } }))
                                }
                                title="Rule weight"
                                className="block w-full rounded-lg border border-border bg-white px-2.5 py-2 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                              />
                            </div>
                            <p className="text-xs text-text-tertiary flex items-start gap-1">
                              <Lightbulb className="h-3.5 w-3.5 mt-0.5 shrink-0 text-accent-600" />
                              {item.reason}
                            </p>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}

              {activeTab === 'questions' && (
                <div className="space-y-2">
                  <p className="text-xs text-text-tertiary">
                    Oral-defense questions generated from your tasks, checklist indicators and competencies — no
                    generic bank.
                  </p>
                  {draft.oralQuestions.length === 0 && (
                    <p className="text-sm text-text-secondary">No oral-defense questions were generated.</p>
                  )}
                  {draft.oralQuestions.map((item, i) => {
                    const edit = questionEdits[i] || { questionText: item.questionText };
                    return (
                      <Card key={i} variant="outlined" padding="sm">
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={includedQuestions.has(i)}
                            onChange={() => toggle(includedQuestions, setIncludedQuestions, i)}
                            className="mt-1 h-4 w-4 rounded border-border text-primary-600 focus:ring-primary-500"
                          />
                          <div className="flex-1 min-w-0 space-y-1.5">
                            <textarea
                              value={edit.questionText}
                              onChange={(e) =>
                                setQuestionEdits((prev) => ({ ...prev, [i]: { questionText: e.target.value } }))
                              }
                              rows={2}
                              className="block w-full resize-none rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                            />
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge size="sm" variant="info">{item.category}</Badge>
                              {item.timeLimitSeconds && (
                                <Badge size="sm" variant="neutral">{item.timeLimitSeconds}s</Badge>
                              )}
                              {item.passingScore && (
                                <Badge size="sm" variant="neutral">Pass {item.passingScore}%</Badge>
                              )}
                            </div>
                            <p className="text-xs text-text-tertiary flex items-start gap-1">
                              <Lightbulb className="h-3.5 w-3.5 mt-0.5 shrink-0 text-accent-600" />
                              {item.reason}
                            </p>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}

              {activeTab === 'workspace' && (
                <div className="space-y-2">
                  <p className="text-xs text-text-tertiary">
                    Recommended workspace modules — detected from your tasks and content, with field defaults only
                    used to fill gaps.
                  </p>
                  {draft.workspaceModules.length === 0 && (
                    <p className="text-sm text-text-secondary">No workspace modules were recommended.</p>
                  )}
                  <div className="grid gap-2 sm:grid-cols-2">
                    {draft.workspaceModules.map((item, i) => (
                      <Card
                        key={i}
                        variant={includedModules.has(i) ? 'default' : 'outlined'}
                        padding="sm"
                        className={includedModules.has(i) ? 'border-primary-500 bg-primary-50/30 ring-1 ring-primary-500' : 'opacity-80'}
                      >
                        <label className="flex items-start gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={includedModules.has(i)}
                            onChange={() => toggle(includedModules, setIncludedModules, i)}
                            className="mt-1 h-4 w-4 rounded border-border text-primary-600 focus:ring-primary-500"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-text-primary truncate">{item.name}</span>
                              <Badge size="sm" variant="neutral">{item.moduleKey.replace(/_/g, ' ')}</Badge>
                            </div>
                            <p className="mt-1 text-xs text-text-tertiary flex items-start gap-1">
                              <Lightbulb className="h-3.5 w-3.5 mt-0.5 shrink-0 text-accent-600" />
                              {item.reason}
                            </p>
                          </div>
                        </label>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-border px-6 py-4 shrink-0 space-y-3">
              {error && (
                <div className="flex items-center gap-2 rounded-lg border border-error bg-error-light/10 px-3 py-2 text-sm text-error">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}
              {confirmApply && (
                <div className="flex items-center gap-2 rounded-lg border border-accent-600 bg-accent-600/10 px-3 py-2.5">
                  <AlertCircle className="h-4 w-4 text-accent-700 shrink-0" />
                  <p className="text-sm text-accent-800">
                    Applying replaces the assessment's current Evidence, AI Rules, Oral Defense questions and
                    Workspace assignments with the {totalIncluded} selected items.
                  </p>
                </div>
              )}
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm text-text-tertiary">
                  {totalIncluded > 0 ? (
                    <span className="font-medium text-text-primary">{totalIncluded} items selected</span>
                  ) : (
                    'Select at least one item to apply'
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={analyze}
                    loading={loading}
                    icon={<RefreshCw className="h-4 w-4" />}
                    title="Regenerate the draft from the latest assessment content"
                  >
                    Regenerate
                  </Button>
                  <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleApply}
                    loading={saving}
                    disabled={totalIncluded === 0}
                    variant={confirmApply ? 'success' : 'primary'}
                    icon={confirmApply ? <Check className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                  >
                    {confirmApply ? 'Confirm & Apply' : 'Apply Configuration'}
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

export default AutoConfigPanel;
