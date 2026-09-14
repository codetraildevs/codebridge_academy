import { Card, CardBody } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { FolderCheck, Upload, Inbox } from 'lucide-react';

export function MyEvidencePage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">My Evidence</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Upload and manage evidence for your assessments
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
            No evidence uploaded yet. Upload files to support your assessment submissions.
          </p>
        </div>
      </Card>
    </div>
  );
}

export default MyEvidencePage;
