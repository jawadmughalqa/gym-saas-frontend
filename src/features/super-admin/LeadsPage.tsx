import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import {
  Download, Search, RefreshCw, Users, TrendingUp,
  Inbox, Bell, Filter, ChevronUp, ChevronDown,
} from 'lucide-react';
import { Button }     from '@/components/ui/button';
import { Badge }      from '@/components/ui/badge';
import { Input }      from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import PageHeader  from '@/components/layout/PageHeader';
import PageShell   from '@/components/layout/PageShell';
import Pagination  from '@/components/shared/Pagination';
import EmptyState  from '@/components/shared/EmptyState';
import { useDebounce }     from '@/hooks/use-debounce';
import { useLeads, useLeadStats, leadsKeys } from '@/hooks/use-leads';
import { getLeadsExportUrl } from '@/api/leads.api';
import { getSocket }   from '@/lib/socket';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore }   from '@/stores/auth.store';
import LeadDetailSheet from './components/LeadDetailSheet';
import type { LeadStatus, LeadFormType, Lead } from '@/api/leads.api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<LeadStatus, { label: string; className: string }> = {
  new:        { label: 'New',        className: 'bg-blue-600 hover:bg-blue-700' },
  contacted:  { label: 'Contacted',  className: 'bg-yellow-600 hover:bg-yellow-700' },
  qualified:  { label: 'Qualified',  className: 'bg-purple-600 hover:bg-purple-700' },
  converted:  { label: 'Converted',  className: 'bg-green-600 hover:bg-green-700' },
  closed:     { label: 'Closed',     className: 'bg-gray-500 hover:bg-gray-600' },
};

const FORM_TYPE_LABELS: Record<LeadFormType, string> = {
  demo_request: '🎯 Demo',
  contact:      '📬 Contact',
  newsletter:   '📧 Newsletter',
};

function LeadStatusBadge({ status }: { status: LeadStatus }) {
  const cfg = STATUS_CONFIG[status];
  return <Badge className={`text-xs ${cfg.className}`}>{cfg.label}</Badge>;
}

function SortIndicator({ field, sortBy, sortOrder }: {
  field: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}) {
  if (sortBy !== field) return <span className="ml-1 opacity-0 group-hover:opacity-40">↕</span>;
  return sortOrder === 'desc'
    ? <ChevronDown className="inline h-3 w-3 ml-1" />
    : <ChevronUp className="inline h-3 w-3 ml-1" />;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LeadsPage() {
  const qc   = useQueryClient();
  const user = useAuthStore((s) => s.user);

  // ── Filters ───────────────────────────────────────────────────────────────
  const [search,     setSearch]     = useState('');
  const [status,     setStatus]     = useState<string>('');
  const [formType,   setFormType]   = useState<string>('');
  const [sortBy,     setSortBy]     = useState<'createdAt' | 'updatedAt'>('createdAt');
  const [sortOrder,  setSortOrder]  = useState<'asc' | 'desc'>('desc');
  const [page,       setPage]       = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newCount,   setNewCount]   = useState(0);  // unread real-time badge

  const debouncedSearch = useDebounce(search, 350);

  const params = {
    page,
    limit:     20,
    search:    debouncedSearch || undefined,
    status:    status   as LeadStatus   || undefined,
    formType:  formType as LeadFormType || undefined,
    sortBy,
    sortOrder,
  };

  const { data, isLoading, isFetching, refetch } = useLeads(params);
  const { data: stats } = useLeadStats();

  const leads      = data?.data ?? [];
  const pagination = data?.pagination;

  // ── Real-time: socket lead:new ─────────────────────────────────────────────
  useEffect(() => {
    const socket = getSocket();
    if (!socket.connected) socket.connect();
    socket.emit('join:super_admin');

    const handleNewLead = (_payload: Partial<Lead>) => {
      // Bump badge counter
      setNewCount((n) => n + 1);
      // Silently refresh the list & stats
      void qc.invalidateQueries({ queryKey: leadsKeys.all });
    };

    socket.on('lead:new', handleNewLead);
    return () => { socket.off('lead:new', handleNewLead); };
  }, [qc]);

  // ── Refresh & clear badge ─────────────────────────────────────────────────
  const handleRefresh = useCallback(() => {
    setNewCount(0);
    void refetch();
  }, [refetch]);

  // ── Sort toggle ───────────────────────────────────────────────────────────
  const handleSort = (field: 'createdAt' | 'updatedAt') => {
    if (sortBy === field) {
      setSortOrder((o) => (o === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setPage(1);
  };

  // ── Filter reset ──────────────────────────────────────────────────────────
  const resetFilters = () => {
    setSearch('');
    setStatus('');
    setFormType('');
    setPage(1);
  };

  const hasActiveFilters = !!search || !!status || !!formType;

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExport = () => {
    const url = getLeadsExportUrl({
      search:   debouncedSearch || undefined,
      status:   status   as LeadStatus   || undefined,
      formType: formType as LeadFormType || undefined,
      sortBy,
      sortOrder,
    });
    // Use a temp anchor to trigger download (bearer token is not needed for
    // the export endpoint — it reads the cookie just like any other request)
    const a = document.createElement('a');
    a.href = url;
    a.download = '';
    a.click();
  };

  return (
    <PageShell>
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            Lead Management
            {newCount > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={handleRefresh}
                      className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-2 py-0.5 text-xs font-semibold text-white animate-pulse"
                    >
                      <Bell className="h-3 w-3" />
                      {newCount} new
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Click to refresh and clear</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </span>
        }
        description="Website form submissions from gymanger.com"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isFetching}>
              <RefreshCw className={`h-4 w-4 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-1.5" />
              Export CSV
            </Button>
          </div>
        }
      />

      {/* ── Stats ─────────────────────────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Inbox className="h-3.5 w-3.5" /> Total Leads
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{stats.recent} this week</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Bell className="h-3.5 w-3.5" /> New / Unworked
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-2xl font-bold text-blue-600">{stats.statusCounts.new}</p>
              <p className="text-xs text-muted-foreground mt-0.5">awaiting contact</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" /> Converted
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-2xl font-bold text-green-600">{stats.statusCounts.converted}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {stats.total > 0
                  ? `${Math.round((stats.statusCounts.converted / stats.total) * 100)}% rate`
                  : '—'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" /> Form Types
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-0.5">
              <p className="text-xs">🎯 Demo: <span className="font-semibold">{stats.formTypeCounts.demo_request}</span></p>
              <p className="text-xs">📬 Contact: <span className="font-semibold">{stats.formTypeCounts.contact}</span></p>
              <p className="text-xs">📧 Newsletter: <span className="font-semibold">{stats.formTypeCounts.newsletter}</span></p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Filters bar ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name, email, phone…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-8"
          />
        </div>

        <Select value={status || '__all__'} onValueChange={(v) => { setStatus(v === '__all__' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-[140px]">
            <Filter className="h-3.5 w-3.5 mr-1.5" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Statuses</SelectItem>
            {(Object.keys(STATUS_CONFIG) as LeadStatus[]).map((s) => (
              <SelectItem key={s} value={s}>
                <Badge className={`text-xs ${STATUS_CONFIG[s].className}`}>{STATUS_CONFIG[s].label}</Badge>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={formType || '__all__'} onValueChange={(v) => { setFormType(v === '__all__' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Form Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Types</SelectItem>
            {(Object.keys(FORM_TYPE_LABELS) as LeadFormType[]).map((t) => (
              <SelectItem key={t} value={t}>{FORM_TYPE_LABELS[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            Clear filters
          </Button>
        )}

        <p className="ml-auto text-sm text-muted-foreground">
          {pagination ? `${pagination.total} results` : ''}
        </p>
      </div>

      {/* ── Table ─────────────────────────────────────────────────────── */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-muted-foreground text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-3 font-medium">Lead</th>
                <th className="text-left px-4 py-3 font-medium">Type</th>
                <th className="text-left px-4 py-3 font-medium">Contact</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Assigned</th>
                <th
                  className="text-left px-4 py-3 font-medium cursor-pointer group select-none"
                  onClick={() => handleSort('createdAt')}
                >
                  Submitted
                  <SortIndicator field="createdAt" sortBy={sortBy} sortOrder={sortOrder} />
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b animate-pulse">
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-muted rounded w-24" />
                      </td>
                    ))}
                  </tr>
                ))}

              {!isLoading && leads.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <EmptyState
                      icon={<Inbox className="h-10 w-10 text-muted-foreground" />}
                      title={hasActiveFilters ? 'No leads match your filters' : 'No leads yet'}
                      description={
                        hasActiveFilters
                          ? 'Try adjusting your search or filter criteria.'
                          : 'Leads submitted from gymanger.com will appear here in real time.'
                      }
                    />
                  </td>
                </tr>
              )}

              {leads.map((lead) => (
                <tr
                  key={lead._id}
                  className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => setSelectedId(lead._id)}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium">{lead.name ?? <span className="text-muted-foreground">—</span>}</p>
                    {lead.facilityName && (
                      <p className="text-xs text-muted-foreground mt-0.5">{lead.facilityName}</p>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <span className="text-sm">{FORM_TYPE_LABELS[lead.formType]}</span>
                  </td>

                  <td className="px-4 py-3 space-y-0.5">
                    {lead.email && <p className="text-xs text-muted-foreground">{lead.email}</p>}
                    {lead.phone && <p className="text-xs text-muted-foreground">{lead.phone}</p>}
                    {!lead.email && !lead.phone && <span className="text-muted-foreground">—</span>}
                  </td>

                  <td className="px-4 py-3">
                    <LeadStatusBadge status={lead.status} />
                  </td>

                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {lead.assignedTo
                      ? `${(lead.assignedTo as any).firstName} ${(lead.assignedTo as any).lastName}`
                      : '—'}
                  </td>

                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(lead.createdAt), 'MMM d, yyyy')}
                    <br />
                    <span className="opacity-60">{format(new Date(lead.createdAt), 'HH:mm')}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── Pagination ────────────────────────────────────────────────── */}
      {pagination && pagination.pages > 1 && (
        <div className="mt-4">
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.pages}
            onPageChange={setPage}
          />
        </div>
      )}

      {/* ── Detail sheet ──────────────────────────────────────────────── */}
      <LeadDetailSheet
        leadId={selectedId}
        onClose={() => setSelectedId(null)}
      />
    </PageShell>
  );
}
