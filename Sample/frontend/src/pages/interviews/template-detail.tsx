import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardBody } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import { ArrowLeft, Clock, Code, BarChart3, ChevronDown, ChevronUp, Edit, Play, Trash2 } from 'lucide-react';
import type { InterviewType, InterviewDifficulty, InterviewSectionType, InterviewQuestionType } from '@app_types/interviews';
import { interviewTypeColors, interviewStatusColors, difficultyColors, sectionTypeLabels } from '@app_types/interviews';

// ── Mock Template Detail ──────────────────────

const mockTemplate = {
  id: '1',
  title: 'Senior Backend Developer Technical Interview',
  description: 'A comprehensive technical interview for senior backend developer candidates covering system design, coding, architecture, and behavioral aspects.',
  interviewType: 'LIVE_CODING' as InterviewType,
  difficulty: 'SENIOR' as InterviewDifficulty,
  duration: 90,
  totalScore: 100,
  status: 'PUBLISHED' as const,
  instructions: 'Evaluate candidates holistically. Use the scoring criteria for each section. Allow candidates to explain their thought process during coding challenges.',
  organization: { id: 'org-1', name: 'RwandaTech Solutions' },
  sections: [
    {
      id: 's1',
      title: 'System Design Discussion',
      description: 'Evaluate the candidate\'s ability to design scalable systems',
      orderIndex: 0,
      sectionType: 'SYSTEM_DESIGN' as InterviewSectionType,
      weight: 30,
      duration: 25,
      questions: [
        { id: 'q1', questionText: 'Design a URL shortening service like bit.ly. Discuss the database schema, API design, and scaling considerations.', questionType: 'TEXT' as InterviewQuestionType, points: 20, orderIndex: 0 },
        { id: 'q2', questionText: 'How would you handle database sharding for a rapidly growing social media platform? Discuss trade-offs.', questionType: 'TEXT' as InterviewQuestionType, points: 15, orderIndex: 1 },
      ],
    },
    {
      id: 's2',
      title: 'Coding Challenge',
      description: 'Live coding exercise to assess problem-solving and code quality',
      orderIndex: 1,
      sectionType: 'CODING_CHALLENGE' as InterviewSectionType,
      weight: 40,
      duration: 35,
      questions: [
        { id: 'q3', questionText: 'Implement a rate limiter in your language of choice. The rate limiter should allow N requests per second per user.', questionType: 'CODE' as InterviewQuestionType, points: 25, orderIndex: 0 },
        { id: 'q4', questionText: 'Write a function to find the k most frequent elements in an unsorted array. Optimize for time complexity.', questionType: 'CODE' as InterviewQuestionType, points: 15, orderIndex: 1 },
      ],
    },
    {
      id: 's3',
      title: 'Technical Q&A',
      description: 'Deep-dive into backend technologies and best practices',
      orderIndex: 2,
      sectionType: 'TECHNICAL_QA' as InterviewSectionType,
      weight: 20,
      duration: 20,
      questions: [
        { id: 'q5', questionText: 'Explain the CAP theorem and how you would make trade-offs in a distributed system.', questionType: 'TEXT' as InterviewQuestionType, points: 10, orderIndex: 0 },
        { id: 'q6', questionText: 'Describe your experience with microservices. What patterns have you used for service-to-service communication?', questionType: 'TEXT' as InterviewQuestionType, points: 10, orderIndex: 1 },
      ],
    },
    {
      id: 's4',
      title: 'Behavioral & Fit',
      description: 'Assess team collaboration, leadership, and cultural fit',
      orderIndex: 3,
      sectionType: 'BEHAVIORAL' as InterviewSectionType,
      weight: 10,
      duration: 10,
      questions: [
        { id: 'q7', questionText: 'Tell me about a time you had a technical disagreement with a colleague. How did you resolve it?', questionType: 'TEXT' as InterviewQuestionType, points: 5, orderIndex: 0 },
      ],
    },
  ],
};

// ── Component ──────────────────────────────────

export function TemplateDetailPage() {
  const { templateId } = useParams();
  const template = mockTemplate; // TODO: Fetch from API
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const typeStyle = interviewTypeColors[template.interviewType as InterviewType];
  const statusStyle = interviewStatusColors[template.status as keyof typeof interviewStatusColors];
  const diffStyle = difficultyColors[template.difficulty as InterviewDifficulty];

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6">
      {/* Back + Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/interviews">
            <Button variant="ghost" size="sm" icon={<ArrowLeft className="h-4 w-4" />}>
              Back
            </Button>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" icon={<Edit className="h-4 w-4" />}>
            Edit
          </Button>
          <Button variant="secondary" size="sm" icon={<Play className="h-4 w-4" />}>
            Schedule Interview
          </Button>
          <Button variant="ghost" size="sm" className="text-red-500" icon={<Trash2 className="h-4 w-4" />}>
            Delete
          </Button>
        </div>
      </div>

      {/* Template Header */}
      <Card>
        <CardBody>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="neutral" className={typeStyle.color}>{typeStyle.label}</Badge>
                <Badge variant="neutral" className={statusStyle.color}>{statusStyle.label}</Badge>
                <Badge variant="neutral" className={`${diffStyle.color} ${diffStyle.bg}`}>{diffStyle.label}</Badge>
              </div>
              <h1 className="mt-3 text-2xl font-bold text-text-primary">{template.title}</h1>
              <p className="mt-2 max-w-2xl text-sm text-text-secondary">{template.description}</p>
              <div className="mt-4 flex flex-wrap items-center gap-6 text-sm text-text-tertiary">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {template.duration} minutes
                </span>
                <span className="flex items-center gap-1.5">
                  <Code className="h-4 w-4" />
                  {template.sections.length} sections · {template.sections.reduce((s, sec) => s + sec.questions.length, 0)} questions
                </span>
                <span className="flex items-center gap-1.5">
                  <BarChart3 className="h-4 w-4" />
                  {template.totalScore} total points
                </span>
              </div>
            </div>
            <div className="text-right text-sm text-text-secondary">
              <p className="font-medium text-text-primary">{template.organization.name}</p>
            </div>
          </div>

          {template.instructions && (
            <div className="mt-4 rounded-lg bg-surface-secondary p-4">
              <p className="text-xs font-medium uppercase text-text-tertiary">Interviewer Instructions</p>
              <p className="mt-1 text-sm text-text-primary">{template.instructions}</p>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Sections */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">Sections & Questions</h2>
        </div>

        {template.sections.map((section, idx) => {
          const isExpanded = expandedSections[section.id] ?? true;
          return (
            <Card key={section.id} padding="sm">
              <button
                className="flex w-full items-center justify-between px-4 py-3"
                onClick={() => toggleSection(section.id)}
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-50 text-xs font-bold text-primary-600">
                    {idx + 1}
                  </div>
                  <div className="text-left">
                    <span className="text-sm font-medium text-text-primary">{section.title}</span>
                    <span className="ml-3 text-xs text-text-tertiary">
                      {sectionTypeLabels[section.sectionType]} · {section.weight}% weight · {section.duration} min
                    </span>
                  </div>
                </div>
                {isExpanded ? <ChevronUp className="h-4 w-4 text-text-tertiary" /> : <ChevronDown className="h-4 w-4 text-text-tertiary" />}
              </button>

              {isExpanded && (
                <div className="border-t border-border px-4 pb-4 pt-3">
                  {section.description && (
                    <p className="mb-3 text-xs text-text-secondary">{section.description}</p>
                  )}

                  <div className="space-y-2">
                    {section.questions.map((question, qIdx) => (
                      <div key={question.id} className="rounded-lg border border-border bg-white p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-text-tertiary">Q{qIdx + 1}</span>
                              <Badge variant="neutral" className="text-gray-600">
                                {question.questionType === 'CODE' ? 'Code' : question.questionType === 'TEXT' ? 'Spoken Response' : 'File Upload'}
                              </Badge>
                              <span className="text-xs text-text-tertiary">{question.points} pts</span>
                            </div>
                            <p className="mt-1 text-sm text-text-primary">{question.questionText}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default TemplateDetailPage;
