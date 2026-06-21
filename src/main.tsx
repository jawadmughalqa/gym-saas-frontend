import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from '@/lib/query-client';
import { setAxiosQueryClient } from '@/lib/axios';
import { Toaster } from '@/components/ui/toaster';
import AuthProvider from '@/features/auth/AuthProvider';
import ThemeProvider from '@/components/providers/ThemeProvider';
import router from './router';
import './index.css';

// Give the axios interceptor a reference to the query client so it can
// call qc.clear() on forced logout (token refresh failure)
setAxiosQueryClient(queryClient);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RouterProvider router={router} />
          <Toaster />
        </AuthProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
);
