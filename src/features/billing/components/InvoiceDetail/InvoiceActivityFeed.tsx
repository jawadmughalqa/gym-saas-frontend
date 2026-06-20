/**
 * InvoiceActivityFeed
 *
 * Shows a chronological audit trail of all discount and payment actions on an invoice.
 * Each entry shows: who did it (name + role), what they did, and when.
 */

import { Tag, CreditCard, XCircle, Send, Undo2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { orvalMutator } from '@/lib/orval-mutator';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActivityEntry {
  _id: string;
  action: string;
  actorName: string;
  actorRole: string;
  after?: Record<string, unknown>;
  createdAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ACTION_META: Record<string, {
  icon: React.ReactNode;
  label: (entry: ActivityEntry) => string;
  color: string;
}> = {
  'invoice.discount_applied': {
    icon: <Tag className="h-3.5 w-3.5" />,
    label: (e) => {
      const code = (e.after?.code as string) ?? 'a coupon';
      return `Applied discount code ${code}`;
    },
    color: 'bg-green-100 text-green-700',
  },
  'invoice.manual_discount_applied': {
    icon: <Tag className="h-3.5 w-3.5" />,
    label: (e) => {
      const amt = e.after?.amount as number | undefined;
      const reason = e.after?.reason as string | undefined;
      return `Applied manual discount${amt != null ? ` of ${amt}` : ''}${reason ? ` — ${reason}` : ''}`;
    },
    color: 'bg-blue-100 text-blue-700',
  },
  'invoice.discount_removed': {
    icon: <Undo2 className="h-3.5 w-3.5" />,
    label: () => 'Removed discount',
    color: 'bg-orange-100 text-orange-700',
  },
  'payment.recorded': {
    icon: <CreditCard className="h-3.5 w-3.5" />,
    label: () => 'Recorded a payment',
    color: 'bg-primary/10 text-primary',
  },
  'invoice.issued': {
    icon: <Send className="h-3.5 w-3.5" />,
    label: () => 'Issued invoice',
    color: 'bg-muted text-muted-foreground',
  },
  'invoice.voided': {
    icon: <XCircle className="h-3.5 w-3.5" />,
    label: () => 'Voided invoice',
    color: 'bg-red-100 text-red-700',
  },
};

function roleLabel(role: string) {
  const map: Record<string, string> = {
    gym_owner: 'Gym Owner',
    branch_manager: 'Branch Manager',
    admin: 'Admin',
    super_admin: 'Super Admin',
    staff: 'Staff',
  };
  return map[role] ?? role;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Fetch hook ───────────────────────────────────────────────────────────────

function useInvoiceActivity(invoiceId: string) {
  return useQuery<ActivityEntry[]>({
    queryKey: ['invoice-activity', invoiceId],
    queryFn: async () => {
      const res = await orvalMutator<{ data: ActivityEntry[] }>({
        url: `/invoices/${invoiceId}/activity`,
        method: 'GET',
      });
      return (res as any)?.data ?? [];
    },
    staleTime: 1000 * 30,
    enabled: !!invoiceId,
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  invoiceId: string;
  /** compact: no card wrapper, smaller padding — for use inside the modal */
  compact?: boolean;
}

export default function InvoiceActivityFeed({ invoiceId, compact }: Props) {
  const { data: entries = [], isLoading } = useInvoiceActivity(invoiceId);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div key={i} className="flex items-start gap-2">
            <Skeleton className="h-6 w-6 rounded-full shrink-0 mt-0.5" />
            <div className="space-y-1 flex-1">
              <Skeleton className="h-3.5 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic">No activity recorded yet.</p>
    );
  }

  return (
    <div className={cn('space-y-0', compact ? '' : '')}>
      {entries.map((entry, idx) => {
        const meta = ACTION_META[entry.action];
        if (!meta) return null;
        const isLast = idx === entries.length - 1;
        return (
          <div key={entry._id} className="flex items-start gap-3 relative">
            {/* Timeline line */}
            {!isLast && (
              <div className="absolute left-[11px] top-7 bottom-0 w-px bg-border" />
            )}

            {/* Icon bubble */}
            <div className={cn(
              'h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 z-10',
              meta.color,
            )}>
              {meta.icon}
            </div>

            {/* Content */}
            <div className="flex-1 pb-4 min-w-0">
              <p className="text-sm font-medium text-foreground leading-tight">
                {meta.label(entry)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                <span className="font-medium text-foreground">{entry.actorName || '—'}</span>
                {' · '}
                <span className={cn(
                  'inline-block px-1.5 py-0 rounded text-[10px] font-semibold uppercase tracking-wide',
                  entry.actorRole === 'gym_owner'
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground',
                )}>
                  {roleLabel(entry.actorRole)}
                </span>
                {' · '}
                <span title={new Date(entry.createdAt).toLocaleString()}>
                  {timeAgo(entry.createdAt)}
                </span>
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
