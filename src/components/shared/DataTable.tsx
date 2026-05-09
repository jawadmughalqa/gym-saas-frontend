import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SortDirection = 'asc' | 'desc';

export interface SortState {
  field: string;
  direction: SortDirection;
}

export interface ColumnDef<T> {
  /** Unique key; also used as sort field when sortable=true */
  key: string;
  header: string;
  /** Render cell content. Receives the full row object. */
  cell: (row: T) => React.ReactNode;
  /** Width class e.g. 'w-32' or 'w-[120px]' */
  width?: string;
  /** If true, clicking the header cycles asc/desc/none */
  sortable?: boolean;
  /** Hide on small screens */
  hideOnMobile?: boolean;
  className?: string;
}

export interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  keyExtractor: (row: T) => string;

  /** Show skeleton rows instead of data */
  loading?: boolean;
  skeletonRows?: number;

  /** Shown when data is empty and loading=false */
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;

  /** Current sort state */
  sort?: SortState;
  onSortChange?: (sort: SortState | undefined) => void;

  /** Row click handler */
  onRowClick?: (row: T) => void;

  className?: string;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCell() {
  return (
    <div className="h-4 rounded bg-muted animate-pulse" style={{ width: `${40 + Math.random() * 40}%` }} />
  );
}

// ─── Sort icon ────────────────────────────────────────────────────────────────

function SortIcon({ field, sort }: { field: string; sort?: SortState }) {
  if (!sort || sort.field !== field) return <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />;
  return sort.direction === 'asc'
    ? <ArrowUp className="h-3.5 w-3.5" />
    : <ArrowDown className="h-3.5 w-3.5" />;
}

// ─── DataTable ────────────────────────────────────────────────────────────────

export default function DataTable<T>({
  columns,
  data,
  keyExtractor,
  loading = false,
  skeletonRows = 8,
  emptyMessage = 'No results found.',
  emptyIcon,
  sort,
  onSortChange,
  onRowClick,
  className,
}: DataTableProps<T>) {

  function handleHeaderClick(col: ColumnDef<T>) {
    if (!col.sortable || !onSortChange) return;
    if (!sort || sort.field !== col.key) {
      onSortChange({ field: col.key, direction: 'asc' });
    } else if (sort.direction === 'asc') {
      onSortChange({ field: col.key, direction: 'desc' });
    } else {
      onSortChange(undefined);
    }
  }

  const showEmpty = !loading && data.length === 0;

  return (
    <div className={cn('w-full overflow-auto rounded-md border', className)}>
      <table className="w-full caption-bottom text-sm">
        {/* Head */}
        <thead className="[&_tr]:border-b bg-muted/40">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'h-11 px-4 text-left align-middle font-medium text-muted-foreground',
                  col.width,
                  col.sortable && 'cursor-pointer select-none hover:text-foreground',
                  col.hideOnMobile && 'hidden md:table-cell',
                  col.className,
                )}
                onClick={() => handleHeaderClick(col)}
              >
                <div className="flex items-center gap-1.5">
                  {col.header}
                  {col.sortable && <SortIcon field={col.key} sort={sort} />}
                </div>
              </th>
            ))}
          </tr>
        </thead>

        {/* Body */}
        <tbody className="[&_tr:last-child]:border-0">
          {/* Loading skeleton */}
          {loading &&
            Array.from({ length: skeletonRows }).map((_, i) => (
              <tr key={i} className="border-b">
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      'px-4 py-3',
                      col.hideOnMobile && 'hidden md:table-cell',
                    )}
                  >
                    <SkeletonCell />
                  </td>
                ))}
              </tr>
            ))}

          {/* Data rows */}
          {!loading &&
            data.map((row) => (
              <tr
                key={keyExtractor(row)}
                className={cn(
                  'border-b transition-colors hover:bg-muted/50',
                  onRowClick && 'cursor-pointer',
                )}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      'px-4 py-3 align-middle',
                      col.hideOnMobile && 'hidden md:table-cell',
                      col.className,
                    )}
                  >
                    {col.cell(row)}
                  </td>
                ))}
              </tr>
            ))}

          {/* Empty state */}
          {showEmpty && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  {emptyIcon && <div className="mb-1">{emptyIcon}</div>}
                  <p className="text-sm">{emptyMessage}</p>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
