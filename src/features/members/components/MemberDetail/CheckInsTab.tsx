import { useState }   from 'react';
import { Clock }      from 'lucide-react';
import { Badge }      from '@/components/ui/badge';
import DataTable, { type ColumnDef } from '@/components/shared/DataTable';
import EmptyState  from '@/components/shared/EmptyState';
import Pagination  from '@/components/shared/Pagination';
import { formatDate, formatRelative } from '@/utils/format';
import { useGetMembersMemberIdCheckins } from '@/api/generated/members/members';

// ─── Constants ────────────────────────────────────────────────────────────────

const METHOD_LABEL: Record<string, string> = {
  qr:     'QR Code',
  rfid:   'RFID',
  manual: 'Manual',
  app:    'App',
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface CheckInsTabProps {
  memberId: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CheckInsTab({ memberId }: CheckInsTabProps) {
  const [page, setPage] = useState(1);

  const { data: response, isLoading } = useGetMembersMemberIdCheckins(
    memberId,
    { page, limit: 20 },
  );

  const checkIns   = response?.data       ?? [];
  const pagination = response?.pagination;

  type CheckIn = (typeof checkIns)[0];

  const columns: ColumnDef<CheckIn>[] = [
    {
      key:    'timestamp',
      header: 'Date & Time',
      cell:   (row) => {
        const ts = (row as { timestamp?: string }).timestamp ?? '';
        return (
          <div>
            <p>{ts ? formatDate(ts) : '—'}</p>
            <p className="text-xs text-muted-foreground">
              {ts ? new Date(ts).toLocaleTimeString() : ''}
            </p>
          </div>
        );
      },
    },
    {
      key:    'method',
      header: 'Method',
      cell:   (row) => (
        <Badge variant="outline">
          {METHOD_LABEL[row.method ?? ''] ?? row.method ?? '—'}
        </Badge>
      ),
    },
    {
      key:    'result',
      header: 'Result',
      cell:   (row) => {
        const result = (row as { result?: string }).result;
        return (
          <Badge variant={result === 'allowed' ? 'default' : 'destructive'}>
            {result ?? '—'}
          </Badge>
        );
      },
    },
    {
      key:          'relative',
      header:       '',
      hideOnMobile: true,
      cell:         (row) => {
        const ts = (row as { timestamp?: string }).timestamp ?? '';
        return (
          <span className="text-xs text-muted-foreground">
            {ts ? formatRelative(ts) : ''}
          </span>
        );
      },
    },
  ];

  if (!isLoading && checkIns.length === 0) {
    return (
      <EmptyState
        icon={<Clock className="h-10 w-10" />}
        title="No check-ins"
        description="This member hasn't checked in yet."
      />
    );
  }

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        data={checkIns}
        keyExtractor={(r) => r._id ?? ''}
        loading={isLoading}
        skeletonRows={10}
      />
      {pagination && (
        <Pagination
          meta={pagination}
          onPageChange={setPage}
          onLimitChange={() => {}}
        />
      )}
    </div>
  );
}