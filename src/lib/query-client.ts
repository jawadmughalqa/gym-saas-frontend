import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,  // 5 minutes
      retry: (failureCount, error: unknown) => {
        // Don't retry on 4xx
        if (axios4xx(error)) return false;
        return failureCount < 2;
      },
    },
  },
});

function axios4xx(error: unknown): boolean {
  if (error && typeof error === 'object' && 'response' in error) {
    const status = (error as { response: { status: number } }).response?.status;
    return status >= 400 && status < 500;
  }
  return false;
}
