import { cn } from '@/lib/utils';

// ─── Base skeleton ────────────────────────────────────────────────────────────

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted', className)}
      {...props}
    />
  );
}

// ─── Pre-built skeleton layouts ───────────────────────────────────────────────

/** Single-row skeleton for a table */
function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className="h-4 flex-1" style={{ maxWidth: `${80 + (i % 3) * 20}px` }} />
      ))}
    </div>
  );
}

/** Stack of table row skeletons */
function TableSkeleton({ rows = 8, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-md border">
      {/* Header */}
      <div className="flex items-center gap-4 px-4 py-2.5 border-b bg-muted/40">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-20" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRowSkeleton key={i} cols={cols} />
      ))}
    </div>
  );
}

/** Card with a title bar and content lines */
function CardSkeleton() {
  return (
    <div className="rounded-lg border p-6 space-y-4">
      <Skeleton className="h-5 w-1/3" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
    </div>
  );
}

/** Horizontal stat card skeleton */
function StatCardSkeleton() {
  return (
    <div className="rounded-lg border p-6 space-y-3">
      <div className="flex justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4 rounded-full" />
      </div>
      <Skeleton className="h-8 w-20" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

/** Detail page header skeleton */
function DetailHeaderSkeleton() {
  return (
    <div className="flex items-center gap-4 mb-6">
      <Skeleton className="h-14 w-14 rounded-full" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
  );
}

export {
  Skeleton,
  TableSkeleton,
  TableRowSkeleton,
  CardSkeleton,
  StatCardSkeleton,
  DetailHeaderSkeleton,
};
