import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Re-export formatting utilities from the canonical location.
// Import from '@/utils/format' directly when you need locale-aware variants.
export {
  formatDate,
  formatDateTime,
  formatRelative,
  formatCurrency,
  formatPercent,
} from '@/utils/format';
