import { Card, CardBody } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Mic, Inbox, Plus } from 'lucide-react';

export function OralDefensePage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Oral Defense</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Schedule and manage oral defense sessions for candidate assessments
          </p>
        </div>
        <Button icon={<Plus className="h-4 w-4" />}>
          Schedule Defense
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardBody className="text-center">
            <p className="text-2xl font-bold text-text-primary">0</p>
            <p className="text-xs text-text-tertiary mt-1">Scheduled</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center">
            <p className="text-2xl font-bold text-text-primary">0</p>
            <p className="text-xs text-text-tertiary mt-1">In Progress</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center">
            <p className="text-2xl font-bold text-text-primary">0</p>
            <p className="text-xs text-text-tertiary mt-1">Completed</p>
          </CardBody>
        </Card>
      </div>

      <Card className="!p-0">
        <div className="flex flex-col items-center py-16 text-center">
          <Inbox className="h-8 w-8 text-text-tertiary" />
          <p className="mt-3 text-sm text-text-secondary">
            No oral defense sessions yet. Schedule defense sessions for candidates who require them.
          </p>
        </div>
      </Card>
    </div>
  );
}

export default OralDefensePage;
