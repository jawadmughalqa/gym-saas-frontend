import { useNavigate } from 'react-router-dom';
import { ShieldOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function UnauthorizedPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <ShieldOff className="h-16 w-16 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <h1 className="text-5xl font-bold tracking-tight">403</h1>
          <p className="text-xl text-muted-foreground">Access denied</p>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            You don't have permission to view this page. Contact your administrator if you believe this is a mistake.
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
