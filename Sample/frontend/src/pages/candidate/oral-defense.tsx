import { Card, CardBody } from '@components/ui/card';
import { Mic, Inbox } from 'lucide-react';

export function CandidateOralDefensePage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Oral Defense</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Prepare for and participate in your scheduled oral defense sessions
        </p>
      </div>

      <Card className="!p-0">
        <div className="flex flex-col items-center py-16 text-center">
          <Inbox className="h-8 w-8 text-text-tertiary" />
          <p className="mt-3 text-sm text-text-secondary">
            No oral defense sessions scheduled. Your defense session will appear here once scheduled.
          </p>
        </div>
      </Card>
    </div>
  );
}

export default CandidateOralDefensePage;
