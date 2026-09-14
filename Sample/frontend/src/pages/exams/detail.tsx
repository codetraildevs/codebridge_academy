import { useParams, Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardBody } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { ArrowLeft } from 'lucide-react';

export function ExamDetailPage() {
  const { examId } = useParams();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/exams">
          <Button variant="ghost" size="sm" icon={<ArrowLeft className="h-4 w-4" />}>
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Exam Details</h1>
          <p className="text-sm text-text-secondary">ID: {examId}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Exam Configuration</CardTitle>
        </CardHeader>
        <CardBody>
          <p className="text-sm text-text-secondary">
            Exam detail implementation coming soon. Sections, questions, rubrics, and
            candidate management will be displayed here.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}

export default ExamDetailPage;
