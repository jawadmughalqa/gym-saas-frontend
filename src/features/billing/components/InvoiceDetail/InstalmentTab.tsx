import { useState } from 'react';
import { AlignLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { CardSkeleton } from '@/components/ui/skeleton';
import EmptyState from '@/components/shared/EmptyState';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import { usePermission } from '@/hooks/use-permission';
import { useConfirm } from '@/hooks/use-confirm';
import { formatDate, formatCurrency } from '@/utils/format';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import {
  useGetInstalmentsPlanId,
  usePostInstalmentsPlanIdCancel,
  getGetInstalmentsPlanIdQueryKey,
} from '@/api/generated/instalments/instalments';
import { getGetInvoicesInvoiceIdQueryKey } from '@/api/generated/invoices/invoices';
import { InstalmentPlanStatusBadge } from '@/components/shared/StatusBadge';
import type { Invoice, InstalmentScheduleEntry } from '@/types/billing.types';
import CreateInstalmentDialog from './CreateInstalmentDialog';

const entryStatusColor: Record<InstalmentScheduleEntry['status'], string> = {
  pending: 'text-muted-foreground',
  paid: 'text-green-600',
  overdue: 'text-destructive',
  waived: 'text-muted-foreground line-through',
};

export default function InstalmentTab({ invoice }: { invoice: Invoice }) {
  const { can } = usePermission();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const { confirm, confirmProps } = useConfirm();

  const { data: planData, isLoading } = useGetInstalmentsPlanId(invoice.instalmentPlanId ?? '', {
    query: { enabled: !!invoice.instalmentPlanId },
  });

  const cancelPlan = usePostInstalmentsPlanIdCancel({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetInstalmentsPlanIdQueryKey(invoice.instalmentPlanId ?? '') });
        queryClient.invalidateQueries({ queryKey: getGetInvoicesInvoiceIdQueryKey(invoice._id) });
        toast({ title: 'Instalment plan cancelled' });
      },
      onError: (err: any) => {
        toast({
          variant: 'destructive',
          title: 'Failed to cancel plan',
          description: err?.response?.data?.message || err?.message,
        });
      },
    },
  });

  if (!invoice.instalmentPlanId) {
    return (
      <div className="space-y-4">
        <EmptyState
          icon={<AlignLeft className="h-10 w-10" />}
          title="No instalment plan"
          description="Set up a payment schedule for this invoice."
          action={
            can('instalment.create') && ['issued', 'partially_paid'].includes(invoice.status)
              ? { label: 'Create Plan', onClick: () => setCreateOpen(true) }
              : undefined
          }
        />
        <CreateInstalmentDialog invoiceId={invoice._id} open={createOpen} onOpenChange={setCreateOpen} />
      </div>
    );
  }

  if (isLoading) return <CardSkeleton />;
  if (!planData) return null;

  const plan = planData.data;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <InstalmentPlanStatusBadge status={plan.status} />
          <span className="text-sm text-muted-foreground">
            {plan.numberOfInstalments} instalments · {formatCurrency(plan.instalmentAmount, plan.currency)} each
          </span>
        </div>
        {can('instalment.update') && plan.status === 'active' && (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() =>
              confirm(
                {
                  title: 'Cancel instalment plan?',
                  description: 'The invoice will remain active. This cannot be undone.',
                  variant: 'destructive',
                  confirmLabel: 'Cancel Plan',
                },
                () => cancelPlan.mutate({ planId: plan._id, data: { reason: 'Cancelled by staff' } }),
              )
            }
          >
            Cancel Plan
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">#</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Due Date</th>
                  <th className="px-4 py-2 text-right font-medium text-muted-foreground">Amount</th>
                  <th className="px-4 py-2 text-center font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {plan.schedule?.map((entry) => (
                  <tr key={entry._id} className="border-b last:border-0">
                    <td className="px-4 py-3 text-muted-foreground">{entry.instalmentNumber}</td>
                    <td className="px-4 py-3">{formatDate(entry.dueDate)}</td>
                    <td className={`px-4 py-3 text-right font-medium ${entryStatusColor[entry.status]}`}>
                      {formatCurrency(entry.amount, plan.currency)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge
                        variant={
                          entry.status === 'paid'    ? 'success'
                          : entry.status === 'overdue' ? 'destructive'
                          : 'outline'
                        }
                      >
                        {entry.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog {...confirmProps} loading={cancelPlan.isPending} />
    </div>
  );
}
