import { useNavigate } from 'react-router-dom';
import { FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <FileQuestion className="h-16 w-16 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <h1 className="text-5xl font-bold tracking-tight">404</h1>
          <p className="text-xl text-muted-foreground">Page not found</p>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>
        <div className="flex justify-center gap-3 pt-2">
          <Button variant="outline" onClick={() => navigate(-1)}>Go back</Button>
          <Button onClick={() => navigate('/dashboard')}>Go to dashboard</Button>
        </div>
      </div>
    </div>
  );
}
