import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { PaginationMeta } from '@/types/api.types';

interface PaginationProps {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

/**
 * Full pagination bar: page buttons + optional rows-per-page selector.
 */
export default function Pagination({
  meta,
  onPageChange,
  onLimitChange,
  pageSizeOptions = [10, 20, 50, 100],
  className,
}: PaginationProps) {
  const { page, pages, total, limit } = meta;
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  // Generate visible page numbers with ellipsis
  function getPageNumbers(): (number | '...')[] {
    if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
    if (page <= 4) return [1, 2, 3, 4, 5, '...', pages];
    if (page >= pages - 3) return [1, '...', pages - 4, pages - 3, pages - 2, pages - 1, pages];
    return [1, '...', page - 1, page, page + 1, '...', pages];
  }

  return (
    <div className={`flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between ${className ?? ''}`}>
      {/* Count summary */}
      <p className="text-sm text-muted-foreground shrink-0">
        {total === 0 ? 'No results' : `${from}–${to} of ${total}`}
      </p>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {/* Rows per page */}
        {onLimitChange && (
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-sm text-muted-foreground whitespace-nowrap">Rows per page</span>
            <Select
              value={String(limit)}
              onValueChange={(v) => onLimitChange(Number(v))}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((n) => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Page controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline" size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(1)}
            disabled={page <= 1}
            aria-label="First page"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline" size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {/* Page numbers */}
          <div className="hidden sm:flex items-center gap-1">
            {getPageNumbers().map((p, i) =>
              p === '...' ? (
                <span key={`ellipsis-${i}`} className="px-1 text-muted-foreground text-sm">…</span>
              ) : (
                <Button
                  key={p}
                  variant={p === page ? 'default' : 'outline'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onPageChange(p as number)}
                  aria-current={p === page ? 'page' : undefined}
                >
                  {p}
                </Button>
              ),
            )}
          </div>

          {/* Mobile: current / total */}
          <span className="sm:hidden text-sm text-muted-foreground px-2">
            {page} / {pages}
          </span>

          <Button
            variant="outline" size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= pages}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline" size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(pages)}
            disabled={page >= pages}
            aria-label="Last page"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
