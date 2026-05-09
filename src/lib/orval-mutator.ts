/**
 * Orval custom mutator
 *
 * Orval calls this function for every generated API request.
 * It uses our configured axios instance (auth token + silent-refresh)
 * and unwraps the standard backend envelope { success, data } so
 * the generated hooks return the inner `data` object directly.
 */
import type { AxiosRequestConfig } from 'axios';
import api from './axios';

// Orval requires these two re-exports for TypeScript to work correctly
export type ErrorType<T> = T;
export type BodyType<T> = T;

export const orvalMutator = <T>(config: AxiosRequestConfig): Promise<T> => {
  const source = api.CancelToken.source();

  const promise = api<{ success: boolean; data: T }>({
    ...config,
    cancelToken: source.token,
  }).then((res) => res.data.data);

  // Attach cancel function so TanStack Query can abort in-flight requests
  (promise as Promise<T> & { cancel?: () => void }).cancel = () => {
    source.cancel('Query was cancelled by React Query');
  };

  return promise;
};

export default orvalMutator;
