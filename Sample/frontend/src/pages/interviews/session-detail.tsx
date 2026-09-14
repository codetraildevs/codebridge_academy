import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardBody } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import { ArrowLeft, Clock, User, Calendar, CheckCircle, XCircle, MessageSquare, Code, Star, Play } from 'lucide-react';
import type { InterviewStatus } from '@app_types/interviews';
import { interviewStatusColors } from '@app_types/interviews';

// ── Mock Interview Session ────────────────────

const mockSession = {
  id: 'i1',
  candidateName: 'Jean Baptiste Mugabo',
  jobTitle: 'Senior Backend Developer',
  organizationName: 'RwandaTech Solutions',
  status: 'SCHEDULED' as InterviewStatus,
  scheduledAt: '2026-07-18T10:00:00Z',
  templateTitle: 'Senior Backend Developer Technical Interview',
  overallScore: null,
  interviewer: { firstName: 'Patrick', lastName: 'Hakizimana' },
  template: {
    duration: 90,
    totalScore: 100,
    instructions: 'Evaluate candidates holistically. Use the scoring criteria for each section.',
    sections: [
      {
        id: 's1',
        title: 'System Design Discussion',
        sectionType: 'SYSTEM_DESIGN',
        weight: 30,
        questions: [
          { id: 'q1', questionText: 'Design a URL shortening service like bit.ly. Discuss the database schema, API design, and scaling considerations.', points: 20, orderIndex: 0 },
          { id: 'q2', questionText: 'How would you handle database sharding for a rapidly growing social media platform? Discuss trade-offs.', points: 15, orderIndex: 1 },
        ],
      },
      {
        id: 's2',
        title: 'Coding Challenge',
        sectionType: 'CODING_CHALLENGE',
        weight: 40,
        questions: [
          { id: 'q3', questionText: 'Implement a rate limiter in your language of choice. The rate limiter should allow N requests per second per user.', points: 25, orderIndex: 0 },
          { id: 'q4', questionText: 'Write a function to find the k most frequent elements in an unsorted array. Optimize for time complexity.', points: 15, orderIndex: 1 },
        ],
      },
    ],
  },
  responses: [] as Array<{
    questionId: string;
    responseText: string | null;
    responseCode: string | null;
    score: number | null;
    feedback: string | null;
  }>,
};

// ── Component ──────────────────────────────────

export function InterviewSessionPage() {
  const { interviewId } = useParams();
  const session = mockSession; // TODO: Fetch from API
  const statusStyle = interviewStatusColors[session.status];

  const [responses, setResponses] = useState<Record<string, { score: number; feedback: string } | undefined>>({});

  const isCompleted = session.status === 'COMPLETED';
  const isInProgress = session.status === 'IN_PROGRESS';
  const isScheduled = session.status === 'SCHEDULED';

  const handleScoreChange = (questionId: string, score: number) => {
    setResponses((prev) => ({
      ...prev,
      [questionId]: { ...(prev[questionId] ?? { score: 0, feedback: '' }), score },
    }));
  };

  const handleFeedbackChange = (questionId: string, feedback: string) => {
    setResponses((prev) => ({
      ...prev,
      [questionId]: { ...(prev[questionId] ?? { score: 0, feedback: '' }), feedback },
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/interviews">
            <Button variant="ghost" size="sm" icon={<ArrowLeft className="h-4 w-4" />}>
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">{session.candidateName}</h1>
            <p className="text-sm text-text-secondary">{session.jobTitle} · {session.organizationName}</p>
          </div>
        </div>
        <Badge variant="neutral" className={statusStyle.color}>
          {statusStyle.label}
        </Badge>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card padding="sm">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-text-tertiary" />
            <div>
              <p className="text-xs text-text-tertiary">Scheduled</p>
              <p className="text-sm font-medium text-text-primary">
                {session.scheduledAt
                  ? new Date(session.scheduledAt).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Not set'}
              </p>
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-text-tertiary" />
            <div>
              <p className="text-xs text-text-tertiary">Interviewer</p>
              <p className="text-sm font-medium text-text-primary">
                {session.interviewer
                  ? `${session.interviewer.firstName} ${session.interviewer.lastName}`
                  : 'Not assigned'}
              </p>
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-text-tertiary" />
            <div>
              <p className="text-xs text-text-tertiary">Duration</p>
              <p className="text-sm font-medium text-text-primary">{session.template.duration} minutes</p>
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center gap-3">
            <Star className="h-5 w-5 text-text-tertiary" />
            <div>
              <p className="text-xs text-text-tertiary">Overall Score</p>
              <p className="text-sm font-medium text-text-primary">
                {session.overallScore !== null ? `${session.overallScore}%` : 'Pending'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Instructions (for scheduled/in-progress) */}
      {!isCompleted && session.template.instructions && (
        <Card>
          <CardHeader>
            <CardTitle>Interviewer Instructions</CardTitle>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-text-primary">{session.template.instructions}</p>
          </CardBody>
        </Card>
      )}

      {/* Sections with Questions */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-text-primary">Interview Questions</h2>

        {session.template.sections.map((section, sIdx) => (
          <Card key={section.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{section.title}</CardTitle>
                  <p className="mt-1 text-xs text-text-secondary">
                    {section.sectionType.replace(/_/g, ' ')} · {section.weight}% of total
                  </p>
                </div>
                <Badge variant="neutral" className="text-gray-600">
                  {section.weight}%
                </Badge>
              </div>
            </CardHeader>
            <CardBody className="space-y-4">
              {section.questions.map((question, qIdx) => (
                <div key={question.id} className="rounded-lg border border-border bg-white p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-50 text-xs font-medium text-primary-600">
                          {sIdx + 1}.{qIdx + 1}
                        </span>
                        <span className="text-xs font-medium text-text-tertiary">{question.points} pts</span>
                      </div>
                      <p className="text-sm font-medium text-text-primary">{question.questionText}</p>
                    </div>
                  </div>

                  {/* Response Area */}
                  <div className="mt-4">
                    {isCompleted ? (
                      <div className="space-y-3">
                        <div className="rounded-lg bg-surface-secondary p-3">
                          <div className="flex items-center gap-2 text-xs font-medium text-text-tertiary">
                            <MessageSquare className="h-3.5 w-3.5" />
                            Candidate Response
                          </div>
                          <p className="mt-1 text-sm text-text-primary">
                            {responses[question.id]?.feedback || 'Response recorded.'}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-medium text-text-primary">
                            Score: {responses[question.id]?.score ?? '—'}/{question.points}
                          </span>
                        </div>
                      </div>
                    ) : isInProgress ? (
                      <div className="space-y-3">
                        <textarea
                          className="w-full rounded-lg border border-border bg-white p-3 text-sm"
                          rows={3}
                          placeholder="Record candidate response..."
                          onChange={(e) => handleFeedbackChange(question.id, e.target.value)}
                        />
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <label className="text-sm text-text-secondary">Score:</label>
                            <input
                              type="number"
                              min={0}
                              max={question.points}
                              className="w-20 rounded-lg border border-border bg-white p-2 text-sm"
                              onChange={(e) => handleScoreChange(question.id, parseInt(e.target.value) || 0)}
                            />
                            <span className="text-xs text-text-tertiary">/ {question.points}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-lg bg-surface-secondary p-3">
                        <p className="text-sm text-text-tertiary">
                          {isScheduled ? 'Interview not yet started.' : 'Waiting for response.'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3">
        {isScheduled && (
          <>
            <Button variant="secondary" icon={<XCircle className="h-4 w-4" />}>
              Cancel Interview
            </Button>
            <Button icon={<Play className="h-4 w-4" />}>
              Start Interview
            </Button>
          </>
        )}
        {isInProgress && (
          <Button icon={<CheckCircle className="h-4 w-4" />}>
            Complete Interview
          </Button>
        )}
        {isCompleted && (
          <Button variant="secondary" icon={<MessageSquare className="h-4 w-4" />}>
            Send Feedback to Candidate
          </Button>
        )}
      </div>
    </div>
  );
}

export default InterviewSessionPage;
