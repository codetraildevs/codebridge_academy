import { Card, CardBody } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { ScanSearch, Sparkles, Inbox } from 'lucide-react';

export function AiEvaluationPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">AI Evaluation</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Automated AI-powered evaluation of candidate submissions and responses
          </p>
        </div>
        <Button icon={<Sparkles className="h-4 w-4" />}>
          Run AI Evaluation
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardBody>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50">
                <ScanSearch className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">Code Evaluation</p>
                <p className="text-xs text-text-tertiary">Automated code review</p>
              </div>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50">
                <ScanSearch className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">Diagram Evaluation</p>
                <p className="text-xs text-text-tertiary">ERD, DFD, UML analysis</p>
              </div>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50">
                <ScanSearch className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">Similarity Detection</p>
                <p className="text-xs text-text-tertiary">Plagiarism checking</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card className="!p-0">
        <div className="flex flex-col items-center py-16 text-center">
          <Inbox className="h-8 w-8 text-text-tertiary" />
          <p className="mt-3 text-sm text-text-secondary">
            No evaluations run yet. Submit candidate work to trigger AI evaluation.
          </p>
        </div>
      </Card>
    </div>
  );
}

export default AiEvaluationPage;
