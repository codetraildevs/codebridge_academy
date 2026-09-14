import { Card, CardBody } from '@components/ui/card';
import { ListChecks, Inbox } from 'lucide-react';

export function MyTasksPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">My Tasks</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Track your assigned assessment tasks and deadlines
        </p>
      </div>

      <Card className="!p-0">
        <div className="flex flex-col items-center py-16 text-center">
          <Inbox className="h-8 w-8 text-text-tertiary" />
          <p className="mt-3 text-sm text-text-secondary">
            No tasks assigned yet. Tasks will appear here when assessments are assigned to you.
          </p>
        </div>
      </Card>
    </div>
  );
}

export default MyTasksPage;
