import { useState } from 'react';
import { ScanLine, CheckCircle2, XCircle, Fingerprint, Smartphone, QrCode, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import PageShell from '@/components/layout/PageShell';
import { useMyCheckIns } from './hooks/use-member-portal';
import type { CheckIn, CheckInMethod } from '@/types/member.types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(dateStr?: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleString(undefined, {
    day:    '2-digit',
    month:  'short',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function formatDateOnly(dateStr?: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

function groupByDate(checkIns: CheckIn[]): Map<string, CheckIn[]> {
  const map = new Map<string, CheckIn[]>();
  for (const ci of checkIns) {
    const ts = ci.timestamp ?? ci.checkedInAt ?? '';
    const key = ts ? formatDateOnly(ts) : 'Unknown date';
    const arr = map.get(key) ?? [];
    arr.push(ci);
    map.set(key, arr);
  }
  return map;
}

// ─── Method badge ─────────────────────────────────────────────────────────────

const METHOD_CONFIG: Record<CheckInMethod, { label: string; icon: React.ReactNode; color: string }> = {
  biometric: { label: 'Fingerprint',  icon: <Fingerprint className="h-3 w-3" />, color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' },
  qr:        { label: 'QR Scan',      icon: <QrCode      className="h-3 w-3" />, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'         },
  app:       { label: 'App',          icon: <Smartphone  className="h-3 w-3" />, color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300'              },
  manual:    { label: 'Manual',       icon: <ScanLine    className="h-3 w-3" />, color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'             },
  rfid:      { label: 'RFID',         icon: <ScanLine    className="h-3 w-3" />, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'      },
};

function MethodBadge({ method }: { method: CheckInMethod }) {
  const cfg = METHOD_CONFIG[method] ?? METHOD_CONFIG.manual;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.color}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

// ─── Check-in row ─────────────────────────────────────────────────────────────

function CheckInRow({ ci }: { ci: CheckIn }) {
  const ts = ci.timestamp ?? ci.checkedInAt ?? '';
  const allowed = ci.result !== 'blocked';

  return (
    <div className="flex items-center justify-between py-3 border-b last:border-0">
      <div className="flex items-center gap-3">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          allowed ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
        }`}>
          {allowed
            ? <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            : <XCircle      className="h-4 w-4 text-red-500" />
          }
        </div>
        <div>
          <p className="text-sm font-medium">
            {ts ? new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) : '—'}
          </p>
          {ci.blockReason && (
            <p className="text-xs text-red-500 mt-0.5">{ci.blockReason}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <MethodBadge method={ci.method} />
        <Badge variant={allowed ? 'default' : 'destructive'} className="text-xs">
          {allowed ? 'Allowed' : 'Blocked'}
        </Badge>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MemberAttendancePage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, refetch } = useMyCheckIns(page);

  const checkIns: CheckIn[] = data?.checkIns ?? [];
  const total  = data?.total  ?? 0;
  const limit  = data?.limit  ?? 20;
  const totalPages = Math.ceil(total / limit);

  // ── Summary stats from current page ───────────────────────────────────────
  const allowedCount  = checkIns.filter((c) => c.result !== 'blocked').length;
  const blockedCount  = checkIns.filter((c) => c.result === 'blocked').length;

  const grouped = groupByDate(checkIns);

  return (
    <PageShell title="My Attendance" subtitle="Your gym visit history">
      {/* ── Stats strip ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <CheckCircle2 className="h-8 w-8 text-green-500 shrink-0" />
            <div>
              <p className="text-2xl font-bold">{isLoading ? '…' : total}</p>
              <p className="text-xs text-muted-foreground">Total Visits</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <ScanLine className="h-8 w-8 text-violet-500 shrink-0" />
            <div>
              <p className="text-2xl font-bold">{isLoading ? '…' : allowedCount}</p>
              <p className="text-xs text-muted-foreground">This page (allowed)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Check-in list ───────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Visit Log</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : isError ? (
            <div className="py-8 text-center text-muted-foreground">
              <p className="text-sm">Failed to load attendance.</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={() => refetch()}>Retry</Button>
            </div>
          ) : checkIns.length === 0 ? (
            <div className="py-12 flex flex-col items-center gap-3 text-center text-muted-foreground">
              <ScanLine className="h-12 w-12 opacity-25" />
              <div>
                <p className="text-sm font-medium">No visits recorded yet</p>
                <p className="text-xs mt-1">Your check-ins will appear here after you visit the gym</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {Array.from(grouped.entries()).map(([date, items]) => (
                <div key={date}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{date}</p>
                  <div>
                    {items.map((ci) => (
                      <CheckInRow key={ci._id} ci={ci} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <p className="text-xs text-muted-foreground">Page {page} of {totalPages}</p>
              <div className="flex gap-1">
                <Button
                  variant="outline" size="icon"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline" size="icon"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
