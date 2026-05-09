import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Users, AlertTriangle, FlaskConical,
  CreditCard, Plus, MoreHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import PageHeader from '@/components/layout/PageHeader';
import PageShell from '@/components/layout/PageShell';
import StatCard from '@/components/shared/StatCard';
import DataTable from '@/components/shared/DataTable';
import SearchInput from '@/components/shared/SearchInput';
import Pagination from '@/components/shared/Pagination';
import EmptyState from '@/components/shared/EmptyState';
import { useDebounce } from '@/hooks/use-debounce';
import {
  useGetSuperDashboard,
  useGetSuperTenants,
  getGetSuperTenantsQueryKey,
} from '@/api/generated/super-admin/super-admin';
import { useQueryClient } from '@tanstack/react-query';
import type { Tenant } from '@/api/generated/schemas/tenant';
import type { GetSuperTenantsStatus } from '@/api/generated/schemas/getSuperTenantsStatus';
import type { GetSuperTenantsPlan } from '@/api/generated/schemas/getSuperTenantsPlan';
import CreateTenantForm from './components/CreateTenantForm';

// ─── Status badge ─────────────────────────────────────────────────────────────

function TenantStatusBadge({ status }: { status?: string }) {
  const map: Record<string, { label: string; className: string }> = {
    active:     { label: 'Active',     className: 'bg-green-600 hover:bg-green-700' },
    trial:      { label: 'Trial',      className: 'bg-blue-600 hover:bg-blue-700' },
    suspended:  { label: 'Suspended',  className: '' },
    terminated: { label: 'Terminated', className: '' },
  };
  const cfg = map[status ?? ''];
  if (!cfg) return <Badge variant="outline">{status ?? '—'}</Badge>;
  if (status === 'suspended' || status === 'terminated') {
    return <Badge variant="destructive">{cfg.label}</Badge>;
  }
  return <Badge className={cfg.className}>{cfg.label}</Badge>;
}

function PlanBadge({ plan }: { plan?: string }) {
  const map: Record<string, string> = {
    starter:    'text-slate-600 border-slate-300',
    pro:        'text-purple-600 border-purple-300',
    enterprise: 'text-amber-600 border-amber-300',
  };
  return (
    <Badge variant="outline" className={`capitalize ${map[plan ?? ''] ?? ''}`}>
      {plan ?? '—'}
    </Badge>
  );
}

// ─── Mini stat card for the dashboard strip ───────────────────────────────────

function MiniStat({ label, value, className }: { label: string; value?: number; className?: string }) {
  return (
    <div className="text-center">
      <p className={`text-2xl font-bold ${className ?? ''}`}>{value ?? 0}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

// ─── SuperAdminPage ───────────────────────────────────────────────────────────

export default function SuperAdminPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<GetSuperTenantsStatus | 'all'>('all');
  const [planFilter, setPlanFilter] = useState<GetSuperTenantsPlan | 'all'>('all');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const limit = 20;

  const debouncedSearch = useDebounce(search, 300);

  // Dashboard KPIs
  const { data: dashData } = useGetSuperDashboard({
    query: { staleTime: 1000 * 60 },
  });
  const dash = dashData?.data;

  // Tenant list
  const { data, isLoading } = useGetSuperTenants(
    {
      page,
      limit,
      ...(statusFilter !== 'all' && { status: statusFilter }),
      ...(planFilter !== 'all' && { plan: planFilter }),
      ...(debouncedSearch && { search: debouncedSearch }),
    },
    { query: { staleTime: 1000 * 30 } },
  );

  const tenants: Tenant[] = data?.data ?? [];
  const pagination = data?.pagination;

  const columns = [
    {
      key: 'businessName',
      label: 'Tenant',
      render: (_: unknown, row: Tenant) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.businessName}</span>
          <span className="text-xs text-muted-foreground">{row.contactEmail}</span>
        </div>
      ),
    },
    {
      key: 'plan',
      label: 'Plan',
      render: (v: unknown) => <PlanBadge plan={v as string} />,
    },
    {
      key: 'status',
      label: 'Status',
      render: (v: unknown) => <TenantStatusBadge status={v as string} />,
    },
    {
      key: 'country',
      label: 'Country',
      render: (v: unknown) => <span className="text-sm">{(v as string) || '—'}</span>,
    },
    {
      key: 'trialEndsAt',
      label: 'Trial Ends',
      render: (v: unknown) =>
        v ? (
          <span className="text-sm text-muted-foreground">
            {new Date(v as string).toLocaleDateString()}
          </span>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        ),
    },
    {
      key: 'createdAt',
      label: 'Created',
      render: (v: unknown) => (
        <span className="text-sm text-muted-foreground">
          {v ? new Date(v as string).toLocaleDateString() : '—'}
        </span>
      ),
    },
    {
      key: '_id',
      label: '',
      render: (_: unknown, row: Tenant) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/super-admin/tenants/${row._id}`); }}>
              View Details
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <PageShell>
      <PageHeader
        title="Super Admin"
        subtitle="Platform-wide tenant and billing management"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/super-admin/plans')}>
              Manage Plans
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              New Tenant
            </Button>
          </div>
        }
      />

      {/* Dashboard KPI strip */}
      {dash && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard
            title="Total Tenants"
            value={dash.tenants?.total ?? 0}
            icon={Building2}
          />
          <StatCard
            title="Active"
            value={dash.tenants?.active ?? 0}
            icon={Users}
            iconClassName="bg-green-500/10"
          />
          <StatCard
            title="On Trial"
            value={dash.tenants?.trial ?? 0}
            icon={FlaskConical}
            iconClassName="bg-blue-500/10"
          />
          <StatCard
            title="Suspended"
            value={dash.tenants?.suspended ?? 0}
            icon={AlertTriangle}
            iconClassName="bg-yellow-500/10"
          />
          <StatCard
            title="Pending Invoices"
            value={dash.billing?.pendingInvoices ?? 0}
            icon={CreditCard}
            iconClassName="bg-orange-500/10"
          />
        </div>
      )}

      {/* Plan breakdown */}
      {dash?.planBreakdown && dash.planBreakdown.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Plan Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-8">
              {dash.planBreakdown.map((p) => (
                <MiniStat
                  key={p._id}
                  label={p._id ?? ''}
                  value={p.count}
                  className={
                    p._id === 'enterprise' ? 'text-amber-600' :
                    p._id === 'pro' ? 'text-purple-600' : 'text-slate-600'
                  }
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={(v) => { setSearch(v); setPage(1); }}
          placeholder="Search tenants…"
          className="w-64"
        />
        <Select
          value={statusFilter}
          onValueChange={(v) => { setStatusFilter(v as GetSuperTenantsStatus | 'all'); setPage(1); }}
        >
          <SelectTrigger className="w-36 h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="trial">Trial</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="terminated">Terminated</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={planFilter}
          onValueChange={(v) => { setPlanFilter(v as GetSuperTenantsPlan | 'all'); setPage(1); }}
        >
          <SelectTrigger className="w-36 h-9">
            <SelectValue placeholder="Plan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All plans</SelectItem>
            <SelectItem value="starter">Starter</SelectItem>
            <SelectItem value="pro">Pro</SelectItem>
            <SelectItem value="enterprise">Enterprise</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {!isLoading && tenants.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-12 w-12" />}
          title="No tenants found"
          description={
            debouncedSearch || statusFilter !== 'all' || planFilter !== 'all'
              ? 'Try adjusting your search or filters.'
              : 'No tenants have been provisioned yet.'
          }
          action={
            !debouncedSearch && statusFilter === 'all' && planFilter === 'all'
              ? { label: 'New Tenant', onClick: () => setCreateOpen(true) }
              : undefined
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={tenants}
          loading={isLoading}
          onRowClick={(row) => navigate(`/super-admin/tenants/${row._id}`)}
          rowClassName="cursor-pointer"
        />
      )}

      {pagination && tenants.length > 0 && (
        <Pagination meta={pagination} onPageChange={setPage} />
      )}

      <CreateTenantForm
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => qc.invalidateQueries({ queryKey: getGetSuperTenantsQueryKey() })}
      />
    </PageShell>
  );
}
