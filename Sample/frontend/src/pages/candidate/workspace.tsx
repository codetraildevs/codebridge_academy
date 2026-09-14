import { Card, CardBody } from '@components/ui/card';
import { Boxes, Inbox } from 'lucide-react';

export function MyWorkspacePage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">My Workspace</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Your personal workspace for active assessment tasks
        </p>
      </div>

      <Card className="!p-0">
        <div className="flex flex-col items-center py-16 text-center">
          <Inbox className="h-8 w-8 text-text-tertiary" />
          <p className="mt-3 text-sm text-text-secondary">
            No active workspace. Start an assessment to begin working.
          </p>
        </div>
      </Card>
    </div>
  );
}

export default MyWorkspacePage;
