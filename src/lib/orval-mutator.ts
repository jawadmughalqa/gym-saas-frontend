/**
 * Orval custom mutator
 *
 * Orval calls this function for every generated API request.
 * It uses our configured axios instance (auth token + silent-refresh)
 * and unwraps the standard backend envelope { success, data } so
 * the generated hooks return the inner `data` object directly.
 *
 * Error handling:
 *   When the backend returns { success: false, message: '...' } with a 4xx/5xx
 *   status, axios throws an AxiosError. We extract the `message` from the
 *   response body and re-throw a plain Error so hooks can show it directly
 *   via `error.message` without deep-diving into `error.response.data`.
 *
 * Cancellation:
 *   Handled via the AbortSignal that Orval/TanStack Query passes in
 *   config.signal — Axios v1.x supports this natively.
 */
import type { AxiosRequestConfig, AxiosError } from 'axios';
import api from './axios';

// Orval requires these two re-exports for TypeScript to work correctly
export type ErrorType<T> = T;
export type BodyType<T> = T;

/** Shape of every backend error response */
interface BackendErrorBody {
  success: false;
  message: string;
  errors?: Array<{ field: string; message: string }>;
}

export const orvalMutator = <T>(config: AxiosRequestConfig): Promise<T> => {
  return api<T>(config).then(
    (res) => res.data,
    (err: AxiosError<BackendErrorBody>) => {
      const message =
        err.response?.data?.message ?? err.message ?? 'An unexpected error occurred';
      const enhanced = new Error(message) as Error & {
        status: number | undefined;
        errors: BackendErrorBody['errors'];
        isAxiosError: true;
      };
      enhanced.status = err.response?.status;
      enhanced.errors = err.response?.data?.errors;
      enhanced.isAxiosError = true;
      throw enhanced;
    },
  );
};

export default orvalMutator;
