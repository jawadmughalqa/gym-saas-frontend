import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { SortState } from '@/components/shared/DataTable';

interface TableStateOptions {
  defaultLimit?: number;
  defaultSort?: SortState;
}

interface TableState {
  page: number;
  limit: number;
  search: string;
  sort: SortState | undefined;

  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  setSearch: (search: string) => void;
  setSort: (sort: SortState | undefined) => void;
  reset: () => void;

  /** Ready-to-spread query params object for API calls */
  queryParams: {
    page: number;
    limit: number;
    search?: string;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
  };
}

/**
 * Manages paginated table state in URL search params so state
 * survives navigation and is shareable via URL.
 *
 * Usage:
 *   const table = useTableState({ defaultLimit: 20 });
 *
 *   const { data } = useQuery({
 *     queryKey: ['members', table.queryParams],
 *     queryFn: () => listMembers(table.queryParams),
 *   });
 *
 *   <SearchInput value={table.search} onChange={table.setSearch} />
 *   <DataTable sort={table.sort} onSortChange={table.setSort} ... />
 *   <Pagination meta={data.pagination} onPageChange={table.setPage} onLimitChange={table.setLimit} />
 */
export function useTableState({
  defaultLimit = 20,
  defaultSort,
}: TableStateOptions = {}): TableState {
  const [params, setParams] = useSearchParams();

  const page   = Number(params.get('page')  ?? 1);
  const limit  = Number(params.get('limit') ?? defaultLimit);
  const search = params.get('search') ?? '';
  const sortBy = params.get('sortBy') ?? defaultSort?.field ?? '';
  const sortDir = (params.get('sortDir') ?? defaultSort?.direction ?? '') as 'asc' | 'desc' | '';

  const sort: SortState | undefined = sortBy && sortDir
    ? { field: sortBy, direction: sortDir }
    : undefined;

  function update(patch: Record<string, string | null>) {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === '') next.delete(k);
        else next.set(k, v);
      }
      return next;
    }, { replace: true });
  }

  const setPage  = useCallback((p: number) => update({ page: String(p) }), []);
  const setLimit = useCallback((l: number) => update({ limit: String(l), page: '1' }), []);
  const setSearch = useCallback((s: string) => update({ search: s || null, page: '1' }), []);
  const setSort  = useCallback((s: SortState | undefined) => {
    update({
      sortBy:  s?.field  ?? null,
      sortDir: s?.direction ?? null,
      page: '1',
    });
  }, []);

  const reset = useCallback(() => {
    setParams({}, { replace: true });
  }, [setParams]);

  const queryParams = useMemo(() => ({
    page,
    limit,
    ...(search ? { search } : {}),
    ...(sort ? { sortBy: sort.field, sortDir: sort.direction } : {}),
  }), [page, limit, search, sort]);

  return { page, limit, search, sort, setPage, setLimit, setSearch, setSort, reset, queryParams };
}
