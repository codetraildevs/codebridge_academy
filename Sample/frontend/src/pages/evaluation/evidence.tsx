import { Card, CardBody } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { FolderCheck, Inbox, Upload } from 'lucide-react';

export function EvidencePage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Evidence Collection</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Review and manage candidate evidence submissions for assessments
          </p>
        </div>
        <Button icon={<Upload className="h-4 w-4" />}>
          Upload Evidence
        </Button>
      </div>

      <Card className="!p-0">
        <div className="flex flex-col items-center py-16 text-center">
          <Inbox className="h-8 w-8 text-text-tertiary" />
          <p className="mt-3 text-sm text-text-secondary">
            No evidence submissions yet. Candidate evidence will appear here once submitted.
          </p>
        </div>
      </Card>
    </div>
  );
}

export default EvidencePage;
