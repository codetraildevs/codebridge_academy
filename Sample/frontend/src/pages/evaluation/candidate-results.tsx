import { Card, CardBody } from '@components/ui/card';
import { Award, Inbox } from 'lucide-react';

export function CandidateResultsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Candidate Results</h1>
        <p className="mt-1 text-sm text-text-secondary">
          View assessment results and scores for your assigned candidates
        </p>
      </div>

      <Card className="!p-0">
        <div className="flex flex-col items-center py-16 text-center">
          <Inbox className="h-8 w-8 text-text-tertiary" />
          <p className="mt-3 text-sm text-text-secondary">
            No candidate results yet. Results will appear here once assessments are completed.
          </p>
        </div>
      </Card>
    </div>
  );
}

export default CandidateResultsPage;
