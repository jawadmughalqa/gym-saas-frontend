/**
 * Orval custom mutator
 *
 * Orval calls this function for every generated API request.
 * It uses our configured axios instance (auth token + silent-refresh)
 * and unwraps the standard backend envelope { success, data } so
 * the generated hooks return the inner `data` object directly.
 *
 * Cancellation is handled via the AbortSignal that Orval/TanStack Query
 * passes in config.signal — Axios v1.x supports this natively.
 * The legacy CancelToken API is NOT used (it was removed from axios instances).
 */
import type { AxiosRequestConfig } from 'axios';
import api from './axios';

// Orval requires these two re-exports for TypeScript to work correctly
export type ErrorType<T> = T;
export type BodyType<T> = T;

export const orvalMutator = <T>(config: AxiosRequestConfig): Promise<T> => {
  return api<T>(config).then((res) => res.data);
};

export default orvalMutator;
