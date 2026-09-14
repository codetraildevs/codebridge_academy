import { Card, CardBody } from '@components/ui/card';
import { History, Inbox } from 'lucide-react';

export function DefenseHistoryPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Defense History</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Review your past oral defense sessions and results
        </p>
      </div>

      <Card className="!p-0">
        <div className="flex flex-col items-center py-16 text-center">
          <Inbox className="h-8 w-8 text-text-tertiary" />
          <p className="mt-3 text-sm text-text-secondary">
            No defense history yet. Completed defense sessions will appear here.
          </p>
        </div>
      </Card>
    </div>
  );
}

export default DefenseHistoryPage;
