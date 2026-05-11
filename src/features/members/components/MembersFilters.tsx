import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import SearchInput from '@/components/shared/SearchInput';
import type { MemberStatus } from '@/types/member.types';

// ─── Props ────────────────────────────────────────────────────────────────────

interface MembersFiltersProps {
  search:          string;
  onSearchChange:  (v: string) => void;
  statusFilter:    MemberStatus | 'all';
  onStatusChange:  (v: MemberStatus | 'all') => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MembersFilters({
  search,
  onSearchChange,
  statusFilter,
  onStatusChange,
}: MembersFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <SearchInput
        value={search}
        onChange={onSearchChange}
        placeholder="Search by name, email or phone…"
        className="flex-1 max-w-sm"
      />
      <Select
        value={statusFilter}
        onValueChange={(v) => onStatusChange(v as MemberStatus | 'all')}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="inactive">Inactive</SelectItem>
          <SelectItem value="suspended">Suspended</SelectItem>
          <SelectItem value="frozen">Frozen</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}