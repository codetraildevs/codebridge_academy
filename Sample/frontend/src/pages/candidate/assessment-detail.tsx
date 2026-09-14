import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardBody } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import { candidateService, type AssignedAssessment } from '@services/candidate-service';
import { examService } from '@services/exam-service';
import type { Exam } from '@app_types/index';
import { RichTextView } from '@components/editor/rich-text-view';
import { WORKSPACE_TOOLS, effectiveWorkspaceTools } from '@lib/workspace-tools';
import {
  FileCheck,
  Clock,
  GraduationCap,
  AlertCircle,
  Loader2,
  ArrowLeft,
  PlayCircle,
  BookOpen,
  ListChecks,
  Shield,
  Monitor,
  Video,
  Wrench,
} from 'lucide-react';

export function AssessmentDetailPage() {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const navigate = useNavigate();

  const [exam, setExam] = useState<Exam | null>(null);
  const [assessment, setAssessment] = useState<AssignedAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!assessmentId) return;
    loadData();
  }, [assessmentId]);

  const loadData = async () => {
    if (!assessmentId) return;
    setLoading(true);
    try {
      const [examData, assessmentsData] = await Promise.all([
        examService.getById(assessmentId),
        candidateService.getAssignedAssessments({ limit: 100 }),
      ]);
      setExam(examData);
      const found = assessmentsData.data.find((a) => a.id === assessmentId);
      setAssessment(found || null);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load assessment');
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    if (!assessmentId) return;
    setStarting(true);
    setError('');
    try {
      await candidateService.startAssessment(assessmentId);
      navigate(`/candidate/assessments/${assessmentId}/session`);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to start assessment');
    } finally {
      setStarting(false);
    }
  };

  const handleContinue = () => {
    if (!assessmentId) return;
    navigate(`/candidate/assessments/${assessmentId}/session`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-10 w-10 animate-spin text-primary-500" />
      </div>
    );
  }

  if (error && !exam) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <AlertCircle className="h-12 w-12 text-error" />
        <h3 className="mt-4 text-lg font-semibold">Something went wrong</h3>
        <p className="mt-2 text-sm text-text-secondary">{error}</p>
        <Button variant="primary" className="mt-6" onClick={loadData}>
          Try Again
        </Button>
      </div>
    );
  }

  if (!exam) return null;

  const isInProgress = assessment?.registrationStatus === 'IN_PROGRESS';
  const isCompleted = assessment?.registrationStatus === 'COMPLETED';
  const totalSections = exam.sections?.length || 0;
  const totalQuestions = exam.sections?.reduce((s, sec) => s + (sec.questions?.length || 0), 0) || 0;

  if (isCompleted) {
    navigate('/candidate/results');
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-3xl space-y-6"
    >
      {/* Back */}
      <Button variant="ghost" onClick={() => navigate('/candidate/assessments')}>
        <ArrowLeft className="mr-1 h-4 w-4" /> Back to Assessments
      </Button>

      {/* Header */}
      <Card>
        <CardBody className="space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant={isInProgress ? 'warning' : 'info'} size="sm">
                  {isInProgress ? 'In Progress' : 'Not Started'}
                </Badge>
                <Badge variant="neutral" size="sm">{exam.examType}</Badge>
              </div>
              <h1 className="text-2xl font-bold text-text-primary">{exam.title}</h1>
              <p className="mt-1 text-sm text-text-secondary flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                {exam.tradeName}
              </p>
            </div>
            <div className="hidden sm:block">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-100">
                <FileCheck className="h-8 w-8 text-primary-600" />
              </div>
            </div>
          </div>

          {exam.description && (
            <div className="rounded-lg bg-surface-secondary p-4">
              <RichTextView html={exam.description} />
            </div>
          )}

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-border bg-white p-3 text-center">
              <Clock className="mx-auto h-5 w-5 text-primary-500" />
              <p className="mt-1 text-lg font-bold text-text-primary">{exam.duration}</p>
              <p className="text-xs text-text-tertiary">Minutes</p>
            </div>
            <div className="rounded-xl border border-border bg-white p-3 text-center">
              <BookOpen className="mx-auto h-5 w-5 text-secondary-500" />
              <p className="mt-1 text-lg font-bold text-text-primary">{totalSections}</p>
              <p className="text-xs text-text-tertiary">Sections</p>
            </div>
            <div className="rounded-xl border border-border bg-white p-3 text-center">
              <ListChecks className="mx-auto h-5 w-5 text-accent-500" />
              <p className="mt-1 text-lg font-bold text-text-primary">{totalQuestions}</p>
              <p className="text-xs text-text-tertiary">Questions</p>
            </div>
            <div className="rounded-xl border border-border bg-white p-3 text-center">
              <Shield className="mx-auto h-5 w-5 text-warning" />
              <p className="mt-1 text-lg font-bold text-text-primary">{exam.passingScore}%</p>
              <p className="text-xs text-text-tertiary">Pass Score</p>
            </div>
          </div>

          {/* Instructions */}
          {exam.instructions && (
            <div className="rounded-xl border border-border bg-white p-4">
              <h3 className="text-sm font-semibold text-text-primary mb-2">Instructions</h3>
              <p className="text-sm text-text-secondary whitespace-pre-wrap">{exam.instructions}</p>
            </div>
          )}

          {/* Environment requirements */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-text-primary">Environment Requirements</h3>
            <div className="flex flex-wrap gap-2">
              {exam.requireFullScreen && (
                <div className="flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-xs text-text-secondary">
                  <Monitor className="h-3.5 w-3.5" /> Full Screen Required
                </div>
              )}
              {exam.requireWebcam && (
                <div className="flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-xs text-text-secondary">
                  <Video className="h-3.5 w-3.5" /> Webcam Required
                </div>
              )}
              {exam.allowOralDefense && (
                <div className="flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-xs text-text-secondary">
                  <PlayCircle className="h-3.5 w-3.5" /> Oral Defense Available
                </div>
              )}
            </div>
          </div>

          {/* Working environment — tools provisioned for this exam (from its trade).
              Only practical/mixed exams have a practical workspace, so theoretical
              exams don't list workspace tools to candidates. */}
          {exam.examType !== 'THEORETICAL' && (
            <div className="space-y-2">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-text-primary">
                <Wrench className="h-4 w-4 text-primary-500" /> Working Environment
              </h3>
              <p className="text-xs text-text-tertiary">
                The tools available in your practical workspace for this assessment.
              </p>
              <div className="flex flex-wrap gap-2">
                {effectiveWorkspaceTools(exam.workspaceTools).map((toolId) => {
                  const def = WORKSPACE_TOOLS.find((t) => t.id === toolId);
                  if (!def) return null;
                  const Icon = def.icon;
                  return (
                    <div
                      key={toolId}
                      className="flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-xs text-text-secondary"
                    >
                      <Icon className="h-3.5 w-3.5 text-primary-500" /> {def.label}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sections overview */}
          {exam.sections && exam.sections.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-text-primary mb-3">Sections Overview</h3>
              <div className="space-y-2">
                {exam.sections.map((section, idx) => (
                  <div
                    key={section.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-white px-4 py-2.5"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-text-primary">{section.title}</p>
                        <p className="text-xs text-text-tertiary">
                          {section.questions?.length || 0} questions &middot; {section.weight}% weight
                          {section.duration ? ` &middot; ${section.duration} min` : ''}
                        </p>
                      </div>
                    </div>
                    <Badge variant="neutral" size="sm">{section.sectionType}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action button */}
          <div className="flex justify-end border-t border-border pt-4">
            {isInProgress ? (
              <Button variant="primary" size="lg" onClick={handleContinue}>
                <PlayCircle className="mr-2 h-5 w-5" /> Continue Assessment
              </Button>
            ) : (
              <Button variant="primary" size="lg" onClick={handleStart} loading={starting}>
                <PlayCircle className="mr-2 h-5 w-5" /> Start Assessment
              </Button>
            )}
          </div>
        </CardBody>
      </Card>
    </motion.div>
  );
}

export default AssessmentDetailPage;
