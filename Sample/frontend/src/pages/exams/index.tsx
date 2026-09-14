import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardBody } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import { Plus, Search } from 'lucide-react';

const mockExams = [
  { id: '1', title: 'Software Development Final', trade: 'SWD', status: 'PUBLISHED', candidates: 45, avgScore: 78 },
  { id: '2', title: 'Networking Midterm', trade: 'NET', status: 'DRAFT', candidates: 0, avgScore: null },
  { id: '3', title: 'Tourism Project Assessment', trade: 'TRM', status: 'PUBLISHED', candidates: 32, avgScore: 85 },
  { id: '4', title: 'CSA Architecture Exam', trade: 'CSA', status: 'IN_PROGRESS', candidates: 28, avgScore: 72 },
];

const statusColors: Record<string, 'success' | 'info' | 'warning' | 'neutral'> = {
  PUBLISHED: 'success',
  DRAFT: 'info',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success',
  ARCHIVED: 'neutral',
};

export function ExamsListPage() {
  const [search, setSearch] = useState('');

  const filtered = mockExams.filter((e) =>
    e.title.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Exams</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Manage and create competency assessments
          </p>
        </div>
        <Button icon={<Plus className="h-4 w-4" />}>
          Create Exam
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
        <input
          type="text"
          id="exams-search"
          name="exams-search"
          placeholder="Search exams..."
          aria-label="Search exams"
          className="w-full rounded-lg border border-border bg-white py-2 pl-10 pr-4 text-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Exams Table */}
      <Card>
        <CardBody className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-5 py-3 text-left text-xs font-medium uppercase text-text-tertiary">Title</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase text-text-tertiary">Trade</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase text-text-tertiary">Status</th>
                <th className="px-5 py-3 text-right text-xs font-medium uppercase text-text-tertiary">Candidates</th>
                <th className="px-5 py-3 text-right text-xs font-medium uppercase text-text-tertiary">Avg Score</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((exam) => (
                <tr
                  key={exam.id}
                  className="cursor-pointer border-b border-border last:border-0 hover:bg-surface-secondary"
                >
                  <td className="px-5 py-4 text-sm font-medium text-text-primary">{exam.title}</td>
                  <td className="px-5 py-4 text-sm text-text-secondary">{exam.trade}</td>
                  <td className="px-5 py-4">
                    <Badge variant={statusColors[exam.status] ?? 'neutral'}>{exam.status}</Badge>
                  </td>
                  <td className="px-5 py-4 text-right text-sm text-text-secondary">{exam.candidates}</td>
                  <td className="px-5 py-4 text-right text-sm font-medium text-text-primary">
                    {exam.avgScore ? `${exam.avgScore}%` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}

export default ExamsListPage;
