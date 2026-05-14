import { useState }    from 'react';
import { CreditCard }  from 'lucide-react';
import { Button }      from '@/components/ui/button';
import { useQueryClient } from '@tanstack/react-query';
import DataTable, { type ColumnDef } from '@/components/shared/DataTable';
import EmptyState    from '@/components/shared/EmptyState';
import { SubscriptionStatusBadge } from '@/components/shared/StatusBadge';
import { usePermission } from '@/hooks/use-permission';
import { formatDate }    from '@/utils/format';
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
      cell:   (row) => <SubscriptionStatusBadge status={row.status ?? 'active'} />,
    },
    {
      key:          'startDate',
      header:       'Start',
      hideOnMobile: true,
      cell:         (row) => (row.startDate ? formatDate(row.startDate) : '—'),
    },
    {
      key:          'nextRenewalDate',
      header:       'Next Renewal',
      hideOnMobile: true,
      cell:         (row) => {
        const d = (row as { nextRenewalDate?: string }).nextRenewalDate;
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
      {cancelDialogOpen && selectedSubId && (
        <CancelSubscriptionDialog
          open={cancelDialogOpen}
          onOpenChange={(o) => {
            setCancelDialogOpen(o);
            if (!o) setSelectedSubId(null);
          }}
          memberId={memberId}
          subscriptionId={selectedSubId}
          planName={selectedPlanName}
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
