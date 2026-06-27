import { useNavigate }  from 'react-router-dom';
import { MoreHorizontal } from 'lucide-react';
import { Button }  from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import DataTable, { type ColumnDef } from '@/components/shared/DataTable';
import Pagination  from '@/components/shared/Pagination';
import EmptyState  from '@/components/shared/EmptyState';
import { MembershipStatusBadge } from '@/components/shared/StatusBadge';
import { DueDateBadge }          from '@/components/shared/DueDateBadge';
import { usePermission } from '@/hooks/use-permission';
import { formatDate }    from '@/utils/format';
import { Users }         from 'lucide-react';
import type { Member, MemberStatus } from '@/types/member.types';

// ─── Status transition rules ──────────────────────────────────────────────────

export function getAvailableStatuses(current: MemberStatus): MemberStatus[] {
  switch (current) {
    case 'active':    return ['suspended', 'frozen', 'inactive'];
    case 'suspended': return ['active'];
    case 'frozen':    return ['active'];
    case 'inactive':  return ['active'];
    default:          return [];
  }
}

const STATUS_ACTION_LABEL: Record<MemberStatus, string> = {
  active:    'Reactivate',
  suspended: 'Suspend',
  frozen:    'Freeze',
  inactive:  'Deactivate',
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface MembersTableProps {
  data:          Member[];
  isLoading:     boolean;
  pagination?:   { total: number; page: number; limit: number };
  sort:          { column: string; direction: 'asc' | 'desc' } | null;
  onSortChange:  (sort: { column: string; direction: 'asc' | 'desc' } | null) => void;
  onPageChange:  (page: number) => void;
  onLimitChange: (limit: number) => void;
  onEdit:        (member: Member) => void;
  onStatusClick: (member: Member, target: MemberStatus) => void;
  hasSearch:     boolean;
  onAddMember:   () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MembersTable({
  data,
  isLoading,
  pagination,
  sort,
  onSortChange,
  onPageChange,
  onLimitChange,
  onEdit,
  onStatusClick,
  hasSearch,
  onAddMember,
}: MembersTableProps) {
  const navigate = useNavigate();
  const { can }  = usePermission();

  const columns: ColumnDef<Member>[] = [
    // ── Name + email ─────────────────────────────────────────────────────────
    {
      key:      'fullName',
      header:   'Name',
      sortable: true,
      cell:     (row) => (
        <div>
          <p className="font-medium">{row.firstName} {row.lastName}</p>
          <p className="text-xs text-muted-foreground">{row.email}</p>
        </div>
      ),
    },

    // ── Phone ─────────────────────────────────────────────────────────────────
    {
      key:          'phone',
      header:       'Phone',
      hideOnMobile: true,
      cell:         (row) => row.phone ?? '—',
    },

    // ── Plan ──────────────────────────────────────────────────────────────────
    // Shows plan name from snapshot, or "Custom" for custom pricing,
    // or "—" if no active subscription
    {
      key:          'plan',
      header:       'Plan',
      hideOnMobile: true,
      cell:         (row) => {
        const plan = row.activePlan;
        if (!plan) {
          return <span className="text-muted-foreground text-sm">—</span>;
        }
        return (
          <div>
            <p className="text-sm font-medium">
              {plan.planName ?? (plan.pricingType === 'custom' ? 'Custom' : '—')}
            </p>
            {plan.pricingType === 'custom' && (
              <p className="text-xs text-muted-foreground">Custom rate</p>
            )}
          </div>
        );
      },
    },

    // ── Next due date — colored badge ─────────────────────────────────────────
    {
      key:          'nextRenewal',
      header:       'Next Due',
      hideOnMobile: true,
      cell:         (row) => (
        <DueDateBadge date={row.activePlan?.nextRenewalDate} />
      ),
    },

    // ── Status badge ──────────────────────────────────────────────────────────
    {
      key:      'status',
      header:   'Status',
      sortable: true,
      cell:     (row) => <MembershipStatusBadge status={row.status} />,
    },

    // ── Joined date ───────────────────────────────────────────────────────────
    {
      key:          'joinedAt',
      header:       'Joined',
      sortable:     true,
      hideOnMobile: true,
      cell:         (row) => formatDate(row.joinedAt),
    },

    // ── Actions ───────────────────────────────────────────────────────────────
    {
      key:    'actions',
      header: '',
      width:  'w-12',
      cell:   (row) => {
        if (!can('member.update')) return null;

        const available = getAvailableStatuses(row.status);
        if (available.length === 0) return null;

        // Hold state → single Reactivate button
        if (available.length === 1 && available[0] === 'active') {
          return (
            <Button
              variant="outline"
              size="sm"
              className="text-green-600 border-green-500/25 hover:bg-green-500/10 hover:text-green-500"
              onClick={(e) => {
                e.stopPropagation();
                onStatusClick(row, 'active');
              }}
            >
              Reactivate
            </Button>
          );
        }

        // Active member → full dropdown
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Member actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(row);
                }}
              >
                Edit Profile
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {available.map((target) => (
                <DropdownMenuItem
                  key={target}
                  onClick={(e) => {
                    e.stopPropagation();
                    onStatusClick(row, target);
                  }}
                  className={
                    target === 'inactive' || target === 'suspended'
                      ? 'text-destructive focus:text-destructive'
                      : ''
                  }
                >
                  {STATUS_ACTION_LABEL[target]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  // ── Empty state ───────────────────────────────────────────────────────────
  if (!isLoading && data.length === 0) {
    return (
      <EmptyState
        icon={<Users className="h-12 w-12" />}
        title="No members found"
        description={
          hasSearch
            ? 'Try adjusting your search or filters.'
            : 'Get started by adding your first member.'
        }
        action={
          can('member.create')
            ? { label: 'Add Member', onClick: onAddMember }
            : undefined
        }
      />
    );
  }

  return (
    <>
      <DataTable
        columns={columns}
        data={data}
        keyExtractor={(r) => r._id}
        loading={isLoading}
        skeletonRows={10}
        sort={sort}
        onSortChange={onSortChange}
        onRowClick={(row) => navigate(`/members/${row._id}`)}
      />
      {pagination && (
        <Pagination
          meta={pagination}
          onPageChange={onPageChange}
          onLimitChange={onLimitChange}
        />
      )}
    </>
  );
}