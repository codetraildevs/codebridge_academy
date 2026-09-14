import { Link } from 'react-router-dom';
import { Button } from '@components/ui/button';
import { FileQuestion } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-secondary p-4">
      <FileQuestion className="h-16 w-16 text-text-tertiary" />
      <h1 className="mt-4 text-4xl font-bold text-text-primary">404</h1>
      <p className="mt-2 text-lg text-text-secondary">Page not found</p>
      <p className="mt-1 text-sm text-text-tertiary">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link to="/dashboard" className="mt-6">
        <Button>Go to Dashboard</Button>
      </Link>
    </div>
  );
}

export default NotFoundPage;
