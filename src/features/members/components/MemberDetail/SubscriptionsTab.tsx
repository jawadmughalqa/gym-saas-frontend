import { useState }    from 'react';
import { CreditCard }  from 'lucide-react';
import { Button }      from '@/components/ui/button';
import { useQueryClient } from '@tanstack/react-query';
import DataTable, { type ColumnDef } from '@/components/shared/DataTable';
import EmptyState    from '@/components/shared/EmptyState';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import { SubscriptionStatusBadge } from '@/components/shared/StatusBadge';
import { useConfirm }    from '@/hooks/use-confirm';
import { usePermission } from '@/hooks/use-permission';
import { formatDate }    from '@/utils/format';
import {
  useGetMembersMemberIdSubscriptions,
  usePostMembersMemberIdSubscriptionsSubscriptionIdCancel,
  getGetMembersMemberIdSubscriptionsQueryKey,
  getGetMembersMemberIdQueryKey,
} from '@/api/generated/members/members';
import SubscriptionForm from '@/features/members/components/SubscriptionForm';
import { FreezeDialog } from './FreezeDialog';
import { CURRENCY } from '@/config/tenant.config';

// ─── Props ────────────────────────────────────────────────────────────────────

interface SubscriptionsTabProps {
  memberId:  string;
  branchId:  string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SubscriptionsTab({ memberId, branchId }: SubscriptionsTabProps) {
  const { can }         = usePermission();
  const queryClient     = useQueryClient();
  const { confirm, confirmProps } = useConfirm();

  const { data: subResponse, isLoading } = useGetMembersMemberIdSubscriptions(memberId);
  const subscriptions = subResponse?.data ?? [];

  const cancelMutation = usePostMembersMemberIdSubscriptionsSubscriptionIdCancel({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: getGetMembersMemberIdSubscriptionsQueryKey(memberId),
        });
        void queryClient.invalidateQueries({
          queryKey: getGetMembersMemberIdQueryKey(memberId),
        });
      },
    },
  });

  const [subFormOpen,      setSubFormOpen]      = useState(false);
  const [freezeDialogOpen, setFreezeDialogOpen] = useState(false);
  const [selectedSubId,    setSelectedSubId]    = useState<string | null>(null);

  // ── Column definitions ────────────────────────────────────────────────────
  type Sub = (typeof subscriptions)[0];

  const columns: ColumnDef<Sub>[] = [
    {
      key:    'plan',
      header: 'Plan',
      cell:   (row) => (
        <div>
          <p className="font-medium">
            {row.planSnapshot?.name ??
              (row as { customLabel?: string }).customLabel ??
              row.planId ??
              '—'}
          </p>
          <p className="text-xs text-muted-foreground">
            {row.planSnapshot?.billingFrequency ??
              (row as { customBillingFrequency?: string }).customBillingFrequency ??
              ''}
          </p>
        </div>
      ),
    },
    {
      key:    'finalPrice',
      header: 'Amount',
      cell:   (row) => {
        const price    = (row as { finalPrice?: number }).finalPrice;
        const currency = (row as { currency?: string }).currency ?? CURRENCY;
        return price != null ? `${currency} ${price.toFixed(2)}` : '—';
      },
    },
    {
      key:    'status',
      header: 'Status',
      cell:   (row) => <SubscriptionStatusBadge status={row.status ?? 'active'} />,
    },
    {
      key:          'startDate',
      header:       'Start',
      hideOnMobile: true,
      cell:         (row) => (row.startDate ? formatDate(row.startDate) : '—'),
    },
    {
      key:          'endDate',
      header:       'End',
      hideOnMobile: true,
      cell:         (row) => (row.endDate ? formatDate(row.endDate) : 'Ongoing'),
    },
    {
      key:    'actions',
      header: '',
      width:  'w-32',
      cell:   (row) =>
        row.status === 'active' ? (
          <div className="flex items-center gap-1 justify-end">
            {can('subscription.freeze') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedSubId(row._id ?? null);
                  setFreezeDialogOpen(true);
                }}
              >
                Freeze
              </Button>
            )}
            {can('subscription.cancel') && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  confirm(
                    {
                      title:        'Cancel subscription?',
                      description:  'This will cancel the subscription immediately.',
                      variant:      'destructive',
                      confirmLabel: 'Cancel Subscription',
                    },
                    () =>
                      cancelMutation.mutate({
                        memberId,
                        subscriptionId: row._id ?? '',
                        data: { reason: 'Cancelled by staff' },
                      }),
                  );
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        ) : null,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {subscriptions.length} subscription
          {subscriptions.length !== 1 ? 's' : ''} total
        </p>
        {can('subscription.create') && (
          <Button size="sm" onClick={() => setSubFormOpen(true)}>
            <CreditCard className="mr-2 h-4 w-4" />
            Assign Plan
          </Button>
        )}
      </div>

      {/* Table or empty state */}
      {!isLoading && subscriptions.length === 0 ? (
        <EmptyState
          icon={<CreditCard className="h-10 w-10" />}
          title="No subscriptions"
          description="Assign a membership plan to get started."
          action={
            can('subscription.create')
              ? { label: 'Assign Plan', onClick: () => setSubFormOpen(true) }
              : undefined
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={subscriptions}
          keyExtractor={(r) => r._id ?? ''}
          loading={isLoading}
          skeletonRows={3}
        />
      )}

      {/* Assign plan sheet */}
      <SubscriptionForm
        open={subFormOpen}
        onOpenChange={setSubFormOpen}
        memberId={memberId}
        defaultBranchId={branchId}
      />

      {/* Freeze dialog */}
      {freezeDialogOpen && selectedSubId && (
        <FreezeDialog
          memberId={memberId}
          subscriptionId={selectedSubId}
          open={freezeDialogOpen}
          onOpenChange={(o) => {
            setFreezeDialogOpen(o);
            if (!o) setSelectedSubId(null);
          }}
        />
      )}

      {/* Cancel confirm */}
      <ConfirmDialog {...confirmProps} loading={cancelMutation.isPending} />
    </div>
  );
}