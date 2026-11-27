import { useState, useCallback } from 'react';
import { ScanLine, Search, CheckCircle2, XCircle, Clock, RefreshCw, UserPlus, Timer } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { usePlanFeatures } from '@/hooks/use-plan-features';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import PageHeader from '@/components/layout/PageHeader';
import PageShell from '@/components/layout/PageShell';
import { useGetBranches } from '@/api/generated/branches/branches';
import {
  useAttendance, recordQuickCheckIn,
  type AttendanceRecord, type CheckInResult, type AttendanceListParams,
} from '@/api/attendance.api';
import { formatDateTime, formatDate } from '@/utils/format';
import { useQueryClient } from '@tanstack/react-query';
import { attendanceKeys } from '@/api/attendance.api';
import { toast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/utils/error';
import { useAuthStore } from '@/stores/auth.store';
import { differenceInDays, isBefore } from 'date-fns';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function memberName(r: AttendanceRecord) {
  if (!r.member) return 'Unknown member';
  return `${r.member.firstName} ${r.member.lastName}`.trim();
}

function initials(r: AttendanceRecord) {
  if (!r.member) return '?';
  return `${r.member.firstName?.[0] ?? ''}${r.member.lastName?.[0] ?? ''}`.toUpperCase();
}

function ExpiryBadge({ sub }: { sub: AttendanceRecord['subscription'] }) {
  if (!sub || !sub.endDate) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  const end   = new Date(sub.endDate);
  const now   = new Date();
  const days  = differenceInDays(end, now);
  const label = formatDate(sub.endDate);

  if (isBefore(end, now)) {
    return (
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-medium text-red-500">{label}</span>
        <span className="text-[10px] text-red-400">Expired</span>
      </div>
    );
  }
  if (days <= 7) {
    return (
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-medium text-amber-500">{label}</span>
        <span className="text-[10px] text-amber-400">Expires in {days}d</span>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-green-600 dark:text-green-400">{label}</span>
      {sub.planName && <span className="text-[10px] text-muted-foreground">{sub.planName}</span>}
    </div>
  );
}

function MethodBadge({ method }: { method: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    manual: { label: 'Manual',    cls: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
    qr:     { label: 'QR Scan',   cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
    rfid:   { label: 'RFID',      cls: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300' },
    app:    { label: 'App',       cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' },
  };
  const { label, cls } = map[method] ?? { label: method, cls: '' };
  return <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${cls}`}>{label}</span>;
}

// ─── Quick Check-in Dialog ────────────────────────────────────────────────────

function QuickCheckInDialog({
  open,
  onOpenChange,
  branches,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  branches: { _id: string; name: string }[];
  onDone: () => void;
}) {
  const [identifier, setIdentifier] = useState('');
  const [branchId, setBranchId]     = useState(branches[0]?._id ?? '');
  const [loading, setLoading]       = useState(false);

  async function handleCheckIn() {
    if (!identifier.trim()) return;
    setLoading(true);
    try {
      const res = await recordQuickCheckIn({ identifier: identifier.trim(), branchId });
      const ci = res.data.checkIn;
      if (ci.result === 'allowed') {
        toast({ title: `✅ ${res.data.member.name} checked in` });
      } else {
        toast({ variant: 'destructive', title: `❌ Blocked`, description: ci.blockReason });
      }
      setIdentifier('');
      onDone();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: getErrorMessage(e) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Quick Check-in</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium mb-1 block">Member (name / email / phone)</label>
            <Input
              placeholder="Search member…"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCheckIn()}
              autoFocus
            />
          </div>
          {branches.length > 1 && (
            <div>
              <label className="text-sm font-medium mb-1 block">Branch</label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
              >
                {branches.map((b) => (
                  <option key={b._id} value={b._id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleCheckIn} disabled={loading || !identifier.trim()}>
            {loading ? 'Checking in…' : 'Check In'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50;

export default function AttendancePage() {
  const qc   = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const [search,    setSearch]    = useState('');
  const [branchId,  setBranchId]  = useState('');
  const [shiftId,   setShiftId]   = useState('');
  const [result,    setResult]    = useState<CheckInResult | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate,   setEndDate]   = useState('');
  const [page,      setPage]      = useState(1);
  const [quickOpen, setQuickOpen] = useState(false);

  const { hasFeature } = usePlanFeatures();

  const { data: branchesData } = useGetBranches({ limit: 100 });
  const branches = branchesData?.data ?? [];

  // Fetch shifts for the selected branch (only when shifts feature is on)
  const { data: shiftsData } = useQuery({
    queryKey: ['shifts-for-filter', branchId || 'all'],
    queryFn: () =>
      api.get('/shifts', { params: { ...(branchId && { branchId }), isActive: 'true' } })
         .then((r) => r.data.data as { _id: string; name: string }[]),
    enabled: hasFeature('shifts'),
    staleTime: 60_000,
  });
  const availableShifts = shiftsData ?? [];

  // BMs are scoped to their own branch
  const effectiveBranch = user?.role === 'branch_manager'
    ? (user.branchIds?.[0] ?? '')
    : branchId;

  const params: AttendanceListParams = {
    page,
    limit: PAGE_SIZE,
    ...(effectiveBranch && { branchId: effectiveBranch }),
    ...(shiftId         && { shiftId }),
    ...(result          && { result }),
    ...(search          && { search }),
    ...(startDate       && { startDate }),
    ...(endDate         && { endDate }),
  };

  const { data, isLoading, isFetching, refetch } = useAttendance(params);

  const records     = data?.data ?? [];
  const total       = data?.total ?? 0;
  const totalPages  = data?.totalPages ?? 1;

  const handleReset = useCallback(() => {
    setSearch(''); setBranchId(''); setShiftId(''); setResult('');
    setStartDate(''); setEndDate(''); setPage(1);
  }, []);

  const invalidate = () => void qc.invalidateQueries({ queryKey: attendanceKeys.list(params) });

  // ── Today stats from records ───────────────────────────────────────────────
  const todayStr = new Date().toDateString();
  const todayAllowed = records.filter(
    (r) => r.result === 'allowed' && new Date(r.timestamp).toDateString() === todayStr,
  ).length;

  return (
    <PageShell>
      <PageHeader
        title="Attendance"
        subtitle="Live member check-in log with subscription status"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button size="sm" onClick={() => setQuickOpen(true)}>
              <UserPlus className="mr-1.5 h-3.5 w-3.5" />
              Quick Check-in
            </Button>
          </div>
        }
      />

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {[
          { label: 'Total Records',   value: total,       icon: ScanLine,       color: 'text-blue-500'  },
          { label: 'Checked In Today', value: todayAllowed, icon: CheckCircle2,   color: 'text-green-500' },
          { label: 'Allowed',         value: records.filter((r) => r.result === 'allowed').length, icon: CheckCircle2, color: 'text-emerald-500' },
          { label: 'Blocked',         value: records.filter((r) => r.result === 'blocked').length, icon: XCircle,      color: 'text-red-500'     },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center gap-3">
              <Icon className={`h-5 w-5 flex-shrink-0 ${color}`} />
              <div>
                <p className="text-2xl font-bold leading-none">{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            className="pl-8 h-8 text-sm"
            placeholder="Search member name, email, phone…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        {/* Branch filter — hidden for BMs */}
        {user?.role !== 'branch_manager' && branches.length > 1 && (
          <select
            className="border rounded-md px-3 h-8 text-sm bg-background"
            value={branchId}
            onChange={(e) => { setBranchId(e.target.value); setPage(1); }}
          >
            <option value="">All Branches</option>
            {branches.map((b) => (
              <option key={b._id} value={b._id}>{b.name}</option>
            ))}
          </select>
        )}

        <select
          className="border rounded-md px-3 h-8 text-sm bg-background"
          value={result}
          onChange={(e) => { setResult(e.target.value as CheckInResult | ''); setPage(1); }}
        >
          <option value="">All Results</option>
          <option value="allowed">Allowed</option>
          <option value="blocked">Blocked</option>
        </select>

        {/* Shift filter — only shown when shifts feature is on */}
        {hasFeature('shifts') && availableShifts.length > 0 && (
          <select
            className="border rounded-md px-3 h-8 text-sm bg-background"
            value={shiftId}
            onChange={(e) => { setShiftId(e.target.value); setPage(1); }}
          >
            <option value="">All Shifts</option>
            {availableShifts.map((s) => (
              <option key={s._id} value={s._id}>{s.name}</option>
            ))}
          </select>
        )}

        <DatePicker
          value={startDate}
          onChange={(v) => { setStartDate(v ?? ''); setPage(1); }}
          className="h-8"
        />
        <DatePicker
          value={endDate}
          onChange={(v) => { setEndDate(v ?? ''); setPage(1); }}
          className="h-8"
        />

        {(search || branchId || shiftId || result || startDate || endDate) && (
          <Button variant="ghost" size="sm" className="h-8" onClick={handleReset}>
            Clear
          </Button>
        )}
      </div>

      {/* ── Table ── */}
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 text-left text-xs text-muted-foreground uppercase tracking-wider">
              <th className="px-4 py-2.5 font-medium">Member</th>
              <th className="px-4 py-2.5 font-medium">Branch</th>
              <th className="px-4 py-2.5 font-medium">Time</th>
              <th className="px-4 py-2.5 font-medium">Method</th>
              <th className="px-4 py-2.5 font-medium">Result</th>
              {hasFeature('shifts') && <th className="px-4 py-2.5 font-medium">Shift</th>}
              <th className="px-4 py-2.5 font-medium">Subscription Expiry</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: hasFeature('shifts') ? 7 : 6 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={hasFeature('shifts') ? 7 : 6} className="px-4 py-16 text-center text-muted-foreground text-sm">
                  No check-in records found.
                </td>
              </tr>
            ) : (
              records.map((record) => (
                <tr
                  key={record._id}
                  className={`hover:bg-muted/30 transition-colors ${
                    record.result === 'blocked' ? 'bg-red-500/[0.03]' : ''
                  }`}
                >
                  {/* Member */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary flex-shrink-0">
                        {initials(record)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{memberName(record)}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {record.member?.phone ?? record.member?.email ?? ''}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Branch */}
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {record.branch?.name ?? '—'}
                  </td>

                  {/* Time */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm">{formatDateTime(record.timestamp)}</span>
                    </div>
                  </td>

                  {/* Method */}
                  <td className="px-4 py-3">
                    <MethodBadge method={record.method} />
                  </td>

                  {/* Result */}
                  <td className="px-4 py-3">
                    {record.result === 'allowed' ? (
                      <Badge className="bg-green-500/15 text-green-600 dark:text-green-400 border-0 gap-1 text-xs">
                        <CheckCircle2 className="h-3 w-3" /> Allowed
                      </Badge>
                    ) : (
                      <div>
                        <Badge className="bg-red-500/15 text-red-600 dark:text-red-400 border-0 gap-1 text-xs">
                          <XCircle className="h-3 w-3" /> Blocked
                        </Badge>
                        {record.blockReason && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">{record.blockReason}</p>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Shift — only when feature is on */}
                  {hasFeature('shifts') && (
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {record.shiftName ? (
                        <span className="flex items-center gap-1">
                          <Timer className="h-3 w-3 flex-shrink-0" />
                          {record.shiftName}
                        </span>
                      ) : '—'}
                    </td>
                  )}

                  {/* Expiry */}
                  <td className="px-4 py-3">
                    <ExpiryBadge sub={record.subscription} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            {total} records · page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}

      <QuickCheckInDialog
        open={quickOpen}
        onOpenChange={setQuickOpen}
        branches={branches.map((b) => ({ _id: b._id ?? '', name: b.name ?? '' }))}
        onDone={() => { setQuickOpen(false); invalidate(); }}
      />
    </PageShell>
  );
}
