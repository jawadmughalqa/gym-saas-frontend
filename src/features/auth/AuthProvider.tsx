import { useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '@/stores/auth.store';
import { Loader2 } from 'lucide-react';

/**
 * Mounts at the top of the app (inside QueryClientProvider, outside RouterProvider).
 * On first render it attempts a silent token refresh using the httpOnly cookie.
 * Sets isInitialised=true whether the refresh succeeded or failed so the router
 * can decide to show the login page or the protected shell — never a blank flash.
 */
export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setAuth, setInitialised, isInitialised } = useAuthStore();

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const { data } = await axios.post<{
          data: {
            accessToken: string;
            user: {
              userId: string;
              tenantId: string | null;
              role: import('@/types/api.types').UserRole;
              email: string;
              name: string;
            };
          };
        }>(
          `${import.meta.env.VITE_API_URL ?? '/api/v1'}/auth/refresh`,
          {},
          { withCredentials: true },
        );

        if (!cancelled) {
          setAuth(data.data.user, data.data.accessToken);
        }
      } catch {
        // No valid refresh token — user must log in. That's fine.
      } finally {
        if (!cancelled) setInitialised();
      }
    }

    bootstrap();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isInitialised) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
