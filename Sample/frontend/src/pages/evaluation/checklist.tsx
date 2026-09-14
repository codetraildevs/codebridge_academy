import { Card, CardBody } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { ListChecks, Plus, Inbox } from 'lucide-react';

export function AssessmentChecklistPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Assessment Checklist</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Define and manage checklists for assessment evaluation criteria
          </p>
        </div>
        <Button icon={<Plus className="h-4 w-4" />}>
          Create Checklist
        </Button>
      </div>

      <Card className="!p-0">
        <div className="flex flex-col items-center py-16 text-center">
          <Inbox className="h-8 w-8 text-text-tertiary" />
          <p className="mt-3 text-sm text-text-secondary">
            No checklists created yet. Build checklists to standardize assessment evaluation.
          </p>
          <Button size="sm" className="mt-3" icon={<Plus className="h-4 w-4" />}>
            Create Checklist
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default AssessmentChecklistPage;
