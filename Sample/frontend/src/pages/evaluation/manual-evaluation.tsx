import { Card, CardBody } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { PenLine, Inbox } from 'lucide-react';

export function ManualEvaluationPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Manual Evaluation</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Manually review and score candidate submissions with rubrics
          </p>
        </div>
      </div>

      <Card className="!p-0">
        <div className="flex flex-col items-center py-16 text-center">
          <Inbox className="h-8 w-8 text-text-tertiary" />
          <p className="mt-3 text-sm text-text-secondary">
            No submissions pending manual review. Candidate submissions will appear here for manual scoring.
          </p>
        </div>
      </Card>
    </div>
  );
}

export default ManualEvaluationPage;
