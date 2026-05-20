import { useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '@/stores/auth.store';
import { Loader2 } from 'lucide-react';
import type { ApiResponse, LoginResponse } from '@/types/api.types';

/**
 * Module-level singleton promise.
 *
 * React 18 StrictMode intentionally mounts → unmounts → remounts every component
 * in development. This causes useEffect to fire twice, which would send two
 * concurrent POST /auth/refresh calls.
 *
 * By hoisting the promise outside React, both effect invocations await the SAME
 * request. The first call initiates the fetch; the second reuses it. In
 * production (StrictMode is a dev-only behaviour) this remains a no-op after the
 * first mount.
 *
 * The promise is intentionally never reset — bootstrap should only happen once
 * per page load.
 */
let bootstrapPromise: Promise<void> | null = null;

function runBootstrap(): Promise<void> {
  if (bootstrapPromise) return bootstrapPromise;

  bootstrapPromise = (async () => {
    try {
      // Use a raw axios call (not the api instance) to avoid the response
      // interceptor triggering another refresh while we're bootstrapping.
      const { data } = await axios.post<ApiResponse<LoginResponse>>(
        `${import.meta.env.VITE_API_URL ?? '/api/v1'}/auth/refresh`,
        {},
        { withCredentials: true },
      );

      // data.data contains { accessToken, user } — same shape as login response.
      // setAuth writes both user (role, tenantId, etc.) and accessToken to the
      // Zustand store. usePermission derives permissions from role at read time,
      // so once user.role is set the sidebar renders correctly.
      useAuthStore.getState().setAuth(data.data.user, data.data.accessToken);
    } catch {
      // No valid refresh token cookie — user will be sent to /login. That's fine.
    } finally {
      useAuthStore.getState().setInitialised();
    }
  })();

  return bootstrapPromise;
}

/**
 * Mounts at the top of the app (inside QueryClientProvider, outside RouterProvider).
 * On first render it attempts a silent token refresh using the httpOnly cookie.
 * Sets isInitialised=true whether the refresh succeeded or failed so the router
 * can decide to show the login page or the protected shell — never a blank flash.
 */
export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const isInitialised = useAuthStore((s) => s.isInitialised);

  useEffect(() => {
    runBootstrap();
    // No cleanup needed — we want this promise to keep running even if the
    // component re-mounts (StrictMode). The singleton ensures it only fires once.
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
