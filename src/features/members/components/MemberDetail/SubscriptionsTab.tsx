import { useState }    from 'react';
import { CreditCard }  from 'lucide-react';
import { Button }      from '@/components/ui/button';
import { useQueryClient } from '@tanstack/react-query';
import DataTable, { type ColumnDef } from '@/components/shared/DataTable';
import EmptyState    from '@/components/shared/EmptyState';
import { SubscriptionStatusBadge } from '@/components/shared/StatusBadge';
import { usePermission } from '@/hooks/use-permission';
import { formatDate, formatCurrency } from '@/utils/format';
import {
  useGetMembersMemberIdSubscriptions,
  getGetMembersMemberIdSubscriptionsQueryKey,
  getGetMembersMemberIdQueryKey,
} from '@/api/generated/members/members';
import SubscriptionForm from '@/features/members/components/SubscriptionForm';
import { FreezeDialog }              from './FreezeDialog';
import { CancelSubscriptionDialog }  from './CancelSubscriptionDialog';
import { ChangePlanDialog }          from './ChangePlanDialog';
import { CURRENCY } from '@/config/tenant.config';

// ─── Props ────────────────────────────────────────────────────────────────────

interface SubscriptionsTabProps {
  memberId:  string;
  branchId:  string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SubscriptionsTab({ memberId, branchId }: SubscriptionsTabProps) {
  const { can }     = usePermission();
  const queryClient = useQueryClient();

  const { data: subResponse, isLoading } = useGetMembersMemberIdSubscriptions(memberId);
  const subscriptions = subResponse?.data ?? [];

  // ── Dialog state ──────────────────────────────────────────────────────────
  const [subFormOpen,      setSubFormOpen]      = useState(false);
  const [freezeDialogOpen, setFreezeDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [changePlanOpen,   setChangePlanOpen]   = useState(false);
  const [selectedSubId,    setSelectedSubId]    = useState<string | null>(null);
  const [selectedPlanName, setSelectedPlanName] = useState('');
  const [selectedSub,      setSelectedSub]      = useState<Sub | null>(null);

  // ── Shared success handler — refetch subscriptions list ───────────────────
  function handleMutationSuccess() {
    void queryClient.invalidateQueries({
      queryKey: getGetMembersMemberIdSubscriptionsQueryKey(memberId),
    });
    void queryClient.invalidateQueries({
      queryKey: getGetMembersMemberIdQueryKey(memberId),
    });
  }

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
      cell:   (row) => {
        const sub = row as typeof row & {
          cancelAtPeriodEnd?: boolean;
          cancelMode?: string;
          cancelledAt?: string;
          cancellationReason?: string;
          prorationRefundAmount?: number;
        };

        // For end-of-period scheduled cancellations, show a special badge
        if (sub.cancelAtPeriodEnd && row.status === 'active') {
          return (
            <div className="space-y-1">
              <SubscriptionStatusBadge status="active" />
              <span className="block text-[10px] text-amber-600 font-medium">
                Cancels at period end
              </span>
            </div>
          );
        }

        if (row.status === 'cancelled') {
          return (
            <div className="space-y-1">
              <SubscriptionStatusBadge status="cancelled" />
              {sub.cancelMode && (
                <span className="block text-[10px] text-muted-foreground">
                  {sub.cancelMode === 'end_of_period'    ? 'End of period'    :
                   sub.cancelMode === 'immediate_prorated' ? 'Immediate + refund' :
                   'Immediate, no refund'}
                </span>
              )}
              {(sub.prorationRefundAmount ?? 0) > 0 && (
                <span className="block text-[10px] text-emerald-600 font-medium">
                  +{formatCurrency(sub.prorationRefundAmount!, CURRENCY)} wallet
                </span>
              )}
            </div>
          );
        }

        return <SubscriptionStatusBadge status={row.status ?? 'active'} />;
      },
    },
    {
      key:          'startDate',
      header:       'Start',
      hideOnMobile: true,
      cell:         (row) => (row.startDate ? formatDate(row.startDate) : '—'),
    },
    {
      key:          'nextRenewalDate',
      header:       'Renewal / Expiry',
      hideOnMobile: true,
      cell:         (row) => {
        const sub = row as typeof row & { cancelAtPeriodEnd?: boolean; cancelledAt?: string };
        const d   = (row as { nextRenewalDate?: string }).nextRenewalDate;

        if (sub.cancelAtPeriodEnd && d) {
          return (
            <div>
              <p className="text-xs font-medium text-amber-600">Expires</p>
              <p className="text-sm">{formatDate(d)}</p>
            </div>
          );
        }

        if (row.status === 'cancelled' && sub.cancelledAt) {
          return (
            <div>
              <p className="text-xs text-muted-foreground">Cancelled</p>
              <p className="text-sm">{formatDate(sub.cancelledAt)}</p>
            </div>
          );
        }

        return d ? formatDate(d) : 'Ongoing';
      },
    },
    {
      key:    'actions',
      header: '',
      width:  'w-40',
      cell:   (row) => {
        if (row.status !== 'active' && row.status !== 'frozen') return null;

        const planName =
          row.planSnapshot?.name ??
          (row as { customLabel?: string }).customLabel ??
          'Membership';

        return (
          <div className="flex items-center gap-1 justify-end flex-wrap">
            {/* Freeze — only for active */}
            {can('subscription.freeze') && row.status === 'active' && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedSubId(row._id ?? null);
                  setFreezeDialogOpen(true);
                }}
              >
                Freeze
              </Button>
            )}

            {/* Change Plan — only plan-based active subscriptions */}
            {can('subscription.cancel') &&
              row.status === 'active' &&
              (row as { pricingType?: string }).pricingType === 'plan' && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedSubId(row._id ?? null);
                  setSelectedPlanName(planName);
                  setChangePlanOpen(true);
                }}
              >
                Change Plan
              </Button>
            )}

            {/* Cancel */}
            {can('subscription.cancel') && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedSubId(row._id ?? null);
                  setSelectedPlanName(planName);
                  setSelectedSub(row);
                  setCancelDialogOpen(true);
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        );
      },
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
        onOpenChange={(o) => {
          setSubFormOpen(o);
          if (!o) handleMutationSuccess();
        }}
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

      {/* Cancel subscription dialog */}
      {cancelDialogOpen && selectedSubId && selectedSub && (
        <CancelSubscriptionDialog
          open={cancelDialogOpen}
          onOpenChange={(o) => {
            setCancelDialogOpen(o);
            if (!o) { setSelectedSubId(null); setSelectedSub(null); }
          }}
          memberId={memberId}
          subscriptionId={selectedSubId}
          planName={selectedPlanName}
          subscription={selectedSub}
          onSuccess={handleMutationSuccess}
        />
      )}

      {/* Change plan dialog */}
      {changePlanOpen && selectedSubId && (
        <ChangePlanDialog
          open={changePlanOpen}
          onOpenChange={(o) => {
            setChangePlanOpen(o);
            if (!o) setSelectedSubId(null);
          }}
          memberId={memberId}
          subscriptionId={selectedSubId}
          currentPlanName={selectedPlanName}
          onSuccess={handleMutationSuccess}
        />
      )}
    </div>
  );
}
