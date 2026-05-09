import type { ApiError } from '@/types/api.types';
import axios from 'axios';

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiError | undefined;
    return data?.message ?? error.message;
  }
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred';
}

export function getFieldErrors(error: unknown): Record<string, string> {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiError | undefined;
    if (data?.errors) {
      return Object.fromEntries(
        Object.entries(data.errors).map(([k, v]) => [k, v[0] ?? '']),
      );
    }
  }
  return {};
}
