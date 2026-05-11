import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}


import { format, formatDistanceToNow } from 'date-fns';

export const formatDate = (date: string | Date) =>
  format(new Date(date), 'MMM d, yyyy');

export const formatDateTime = (date: string | Date) =>
  format(new Date(date), 'MMM d, yyyy HH:mm');

export const formatRelative = (date: string | Date) =>
  formatDistanceToNow(new Date(date), { addSuffix: true });

export const formatCurrency = (amount: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);

export const formatPercent = (value: number) =>
  `${(value * 100).toFixed(1)}%`;
