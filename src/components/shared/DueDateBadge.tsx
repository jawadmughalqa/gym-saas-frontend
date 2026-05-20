/**
 * DueDateBadge
 *
 * Shared component used in MembersTable and InvoicesList.
 *
 * Color rules:
 *   overdue   (date < today)         → red   background
 *   due soon  (date within 5 days)   → yellow background
 *   ok        (date > 5 days away)   → default/muted
 *   no date                          → "—"
 */

import { formatDate } from '@/utils/format';

type DueDateStatus = 'overdue' | 'due-soon' | 'ok';

export function getDueDateStatus(dateStr: string | null | undefined): DueDateStatus | null {
  if (!dateStr) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(dateStr);
  due.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil((due.getTime() - today.getTime()) / 86_400_000);

  if (diffDays < 0)  return 'overdue';
  if (diffDays <= 5) return 'due-soon';
  return 'ok';
}

interface DueDateBadgeProps {
  date: string | null | undefined;
}

export function DueDateBadge({ date }: DueDateBadgeProps) {
  if (!date) return <span className="text-muted-foreground text-sm">—</span>;

  const status = getDueDateStatus(date);

  const styles: Record<DueDateStatus, string> = {
    'overdue':  'bg-red-100 text-red-700 border border-red-300',
    'due-soon': 'bg-yellow-100 text-yellow-700 border border-yellow-300',
    'ok':       'bg-muted text-muted-foreground border border-border',
  };

  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${styles[status!]}`}
    >
      {formatDate(date)}
    </span>
  );
}