import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { LogOut, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore, selectIsImpersonating } from '@/stores/auth.store';

export default function ImpersonationBanner() {
  const isImpersonating = useAuthStore(selectIsImpersonating);
  const exitImpersonation = useAuthStore((s) => s.exitImpersonation);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const qc = useQueryClient();

  if (!isImpersonating) return null;

  function handleExit() {
    exitImpersonation();
    qc.clear(); // wipe all tenant-scoped cached data
    navigate('/super-admin', { replace: true });
  }

  return (
    <div className="flex items-center justify-between gap-3 bg-amber-500 px-4 py-2 text-amber-950 shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        <ShieldAlert className="h-4 w-4 shrink-0" />
        <span className="text-sm font-medium truncate">
          Impersonating{user ? ` ${user.name || user.email}` : ''} — all actions are logged
        </span>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="h-7 text-xs border-amber-800 bg-amber-50 text-amber-900 hover:bg-amber-100 shrink-0"
        onClick={handleExit}
      >
        <LogOut className="mr-1.5 h-3 w-3" />
        Exit Impersonation
      </Button>
    </div>
  );
}
