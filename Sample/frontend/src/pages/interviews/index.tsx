import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardBody } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import { Plus, Search, ClipboardList, Calendar, Clock, Code, Users } from 'lucide-react';
import type { InterviewType, InterviewStatus, InterviewDifficulty } from '@app_types/interviews';
import {
  interviewTypeColors,
  interviewStatusColors,
  difficultyColors,
} from '@app_types/interviews';

// ── Mock Data ──────────────────────────────────

const mockTemplates: Array<{
  id: string;
  title: string;
  interviewType: InterviewType;
  difficulty: InterviewDifficulty;
  duration: number;
  totalScore: number;
  status: InterviewStatus;
  sectionsCount: number;
  usedCount: number;
  createdAt: string;
  description?: string;
}> = [
  {
    id: '1',
    title: 'Senior Backend Developer Technical Interview',
    description: 'A comprehensive technical interview covering system design, coding challenges, and behavioral assessment.',
    interviewType: 'LIVE_CODING' as InterviewType,
    difficulty: 'SENIOR' as InterviewDifficulty,
    duration: 90,
    totalScore: 100,
    status: 'PUBLISHED' as InterviewStatus,
    sectionsCount: 4,
    usedCount: 8,
    createdAt: '2026-07-10',
  },
  {
    id: '2',
    title: 'Network Engineer Technical Q&A',
    description: 'Structured technical assessment for network engineering candidates covering routing, switching, and security.',
    interviewType: 'STRUCTURED_QA' as InterviewType,
    difficulty: 'MID' as InterviewDifficulty,
    duration: 60,
    totalScore: 100,
    status: 'PUBLISHED' as InterviewStatus,
    sectionsCount: 3,
    usedCount: 5,
    createdAt: '2026-07-08',
  },
  {
    id: '3',
    title: 'System Design — Enterprise Architecture',
    interviewType: 'SYSTEM_DESIGN' as InterviewType,
    difficulty: 'LEAD' as InterviewDifficulty,
    duration: 120,
    totalScore: 100,
    status: 'DRAFT' as InterviewStatus,
    sectionsCount: 2,
    usedCount: 0,
    createdAt: '2026-07-12',
  },
  {
    id: '4',
    title: 'Tourism Operations Case Study',
    description: 'Scenario-based case study for evaluating tourism and hospitality management candidates.',
    interviewType: 'CASE_STUDY' as InterviewType,
    difficulty: 'MID' as InterviewDifficulty,
    duration: 45,
    totalScore: 50,
    status: 'PUBLISHED' as InterviewStatus,
    sectionsCount: 2,
    usedCount: 3,
    createdAt: '2026-07-05',
  },
  {
    id: '5',
    title: 'Full-Stack Developer Whiteboard Session',
    interviewType: 'WHITEBOARD' as InterviewType,
    difficulty: 'SENIOR' as InterviewDifficulty,
    duration: 60,
    totalScore: 100,
    status: 'DRAFT' as InterviewStatus,
    sectionsCount: 3,
    usedCount: 0,
    createdAt: '2026-07-14',
  },
];

const mockInterviews = [
  {
    id: 'i1',
    candidateName: 'Jean Baptiste Mugabo',
    jobTitle: 'Senior Backend Developer',
    templateTitle: 'Senior Backend Developer Technical Interview',
    status: 'SCHEDULED' as InterviewStatus,
    scheduledAt: '2026-07-18T10:00:00Z',
    overallScore: null,
  },
  {
    id: 'i2',
    candidateName: 'Alice Uwimana',
    jobTitle: 'Network Engineer',
    templateTitle: 'Network Engineer Technical Q&A',
    status: 'IN_PROGRESS' as InterviewStatus,
    scheduledAt: '2026-07-16T14:00:00Z',
    overallScore: null,
  },
  {
    id: 'i3',
    candidateName: 'Patrick Habimana',
    jobTitle: 'Tourism Operations Manager',
    templateTitle: 'Tourism Operations Case Study',
    status: 'COMPLETED' as InterviewStatus,
    scheduledAt: '2026-07-15T09:00:00Z',
    overallScore: 82,
  },
  {
    id: 'i4',
    candidateName: 'Diane Nyiraneza',
    jobTitle: 'Senior Backend Developer',
    templateTitle: 'Senior Backend Developer Technical Interview',
    status: 'COMPLETED' as InterviewStatus,
    scheduledAt: '2026-07-14T11:00:00Z',
    overallScore: 91,
  },
];

// ── Tab Config ─────────────────────────────────

type Tab = 'templates' | 'scheduled';

const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'templates', label: 'Interview Templates', icon: ClipboardList },
  { id: 'scheduled', label: 'Scheduled Interviews', icon: Calendar },
];

// ── Page Component ─────────────────────────────

export function InterviewsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('templates');
  const [search, setSearch] = useState('');

  const filteredTemplates = mockTemplates.filter((t) =>
    t.title.toLowerCase().includes(search.toLowerCase()),
  );

  const filteredInterviews = mockInterviews.filter((i) =>
    i.candidateName.toLowerCase().includes(search.toLowerCase()) ||
    i.jobTitle.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Technical Interviews</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Create structured technical assessments and manage interview sessions for candidates
          </p>
        </div>
        {activeTab === 'templates' && (
          <Link to="/interviews/create">
            <Button icon={<Plus className="h-4 w-4" />}>
              Create Template
            </Button>
          </Link>
        )}
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 rounded-lg bg-surface-secondary p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-text-primary shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
        <input
          type="text"
          id="interviews-search"
          name="interviews-search"
          placeholder={activeTab === 'templates' ? 'Search templates...' : 'Search interviews...'}
          aria-label={activeTab === 'templates' ? 'Search interview templates' : 'Search scheduled interviews'}
          className="w-full rounded-lg border border-border bg-white py-2 pl-10 pr-4 text-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filteredTemplates.map((template) => {
            const typeStyle = interviewTypeColors[template.interviewType];
            const statusStyle = interviewStatusColors[template.status];
            const diffStyle = difficultyColors[template.difficulty];
            return (
              <Link key={template.id} to={`/interviews/template/${template.id}`}>
                <Card padding="md" interactive className="h-full">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="neutral" className={typeStyle.color}>
                          {typeStyle.label}
                        </Badge>
                        <Badge variant="neutral" className={statusStyle.color}>
                          {statusStyle.label}
                        </Badge>
                      </div>
                      <h3 className="mt-3 text-base font-semibold text-text-primary">
                        {template.title}
                      </h3>
                      <p className="mt-1 text-sm text-text-secondary line-clamp-2">
                        {template.description ?? template.title}
                      </p>
                      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-text-tertiary">
                        <span className={`rounded-full px-2 py-0.5 ${diffStyle.bg} ${diffStyle.color} font-medium`}>
                          {diffStyle.label}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {template.duration} min
                        </span>
                        <span className="flex items-center gap-1">
                          <Code className="h-3.5 w-3.5" />
                          {template.sectionsCount} sections
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          Used {template.usedCount} times
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
          {filteredTemplates.length === 0 && (
            <div className="col-span-full flex flex-col items-center py-12 text-center">
              <ClipboardList className="h-12 w-12 text-text-tertiary" />
              <h3 className="mt-4 text-lg font-medium text-text-primary">No templates found</h3>
              <p className="mt-2 max-w-md text-sm text-text-secondary">
                {search ? 'Try a different search term.' : 'Create your first interview template to get started.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Scheduled Interviews Tab */}
      {activeTab === 'scheduled' && (
        <Card>
          <CardBody className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase text-text-tertiary">Candidate</th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase text-text-tertiary">Position</th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase text-text-tertiary">Template</th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase text-text-tertiary">Status</th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase text-text-tertiary">Scheduled</th>
                  <th className="px-5 py-3 text-right text-xs font-medium uppercase text-text-tertiary">Score</th>
                </tr>
              </thead>
              <tbody>
                {filteredInterviews.map((interview) => {
                  const statusStyle = interviewStatusColors[interview.status];
                  return (
                    <tr
                      key={interview.id}
                      className="cursor-pointer border-b border-border last:border-0 hover:bg-surface-secondary"
                      onClick={() => window.location.href = `/interviews/session/${interview.id}`}
                    >
                      <td className="px-5 py-4 text-sm font-medium text-text-primary">
                        {interview.candidateName}
                      </td>
                      <td className="px-5 py-4 text-sm text-text-secondary">{interview.jobTitle}</td>
                      <td className="px-5 py-4 text-sm text-text-secondary">{interview.templateTitle}</td>
                      <td className="px-5 py-4">
                        <Badge variant="neutral" className={statusStyle.color}>
                          {statusStyle.label}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 text-sm text-text-secondary">
                        {interview.scheduledAt
                          ? new Date(interview.scheduledAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </td>
                      <td className="px-5 py-4 text-right text-sm font-medium text-text-primary">
                        {interview.overallScore !== null ? `${interview.overallScore}%` : '—'}
                      </td>
                    </tr>
                  );
                })}
                {filteredInterviews.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-sm text-text-secondary">
                      No interviews found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

export default InterviewsPage;
