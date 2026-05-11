import { useState }    from 'react';
import { Activity }    from 'lucide-react';
import { Button }      from '@/components/ui/button';
import DataTable, { type ColumnDef } from '@/components/shared/DataTable';
import EmptyState       from '@/components/shared/EmptyState';
import MeasurementForm  from '@/features/members/components/MeasurementForm';
import { usePermission } from '@/hooks/use-permission';
import { formatDate }    from '@/utils/format';
import { useGetMembersMemberIdMeasurements } from '@/api/generated/members/members';

// ─── Props ────────────────────────────────────────────────────────────────────

interface MeasurementsTabProps {
  memberId: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MeasurementsTab({ memberId }: MeasurementsTabProps) {
  const { can }                   = usePermission();
  const [formOpen, setFormOpen]   = useState(false);

  const { data: response, isLoading } = useGetMembersMemberIdMeasurements(memberId);
  const measurements = response?.data ?? [];

  type Measurement = (typeof measurements)[0];

  const columns: ColumnDef<Measurement>[] = [
    {
      key:    'date',
      header: 'Date',
      cell:   (row) => (row.date ? formatDate(row.date as string) : '—'),
    },
    {
      key:    'weightKg',
      header: 'Weight',
      cell:   (row) => (row.weightKg != null ? `${row.weightKg} kg` : '—'),
    },
    {
      key:          'heightCm',
      header:       'Height',
      hideOnMobile: true,
      cell:         (row) => (row.heightCm != null ? `${row.heightCm} cm` : '—'),
    },
    {
      key:          'bodyFatPercent',
      header:       'Body Fat',
      hideOnMobile: true,
      cell:         (row) =>
        row.bodyFatPercent != null ? `${row.bodyFatPercent}%` : '—',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {measurements.length} record{measurements.length !== 1 ? 's' : ''}
        </p>
        {can('member.update') && (
          <Button size="sm" onClick={() => setFormOpen(true)}>
            <Activity className="mr-2 h-4 w-4" />
            Log Measurement
          </Button>
        )}
      </div>

      {!isLoading && measurements.length === 0 ? (
        <EmptyState
          icon={<Activity className="h-10 w-10" />}
          title="No measurements"
          description="Log a measurement to start tracking progress."
          action={
            can('member.update')
              ? { label: 'Log Measurement', onClick: () => setFormOpen(true) }
              : undefined
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={measurements}
          keyExtractor={(r) => (r as { _id?: string })._id ?? ''}
          loading={isLoading}
          skeletonRows={5}
        />
      )}

      <MeasurementForm
        open={formOpen}
        onOpenChange={setFormOpen}
        memberId={memberId}
      />
    </div>
  );
}