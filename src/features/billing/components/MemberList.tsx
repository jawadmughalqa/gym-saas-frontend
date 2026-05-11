import { useState } from 'react';
import { Users, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useGetMembers } from '@/api/generated/members/members';
import { Skeleton } from '@/components/ui/skeleton';
import type { Member } from '@/types/member.types';
import { cn } from '@/lib/utils';

interface MemberListProps {
  onSelectMember: (member: Member) => void;
  selectedMemberId?: string;
}

export function MemberList({ onSelectMember, selectedMemberId }: MemberListProps) {
  const [search, setSearch] = useState('');
  const { data: membersData, isLoading } = useGetMembers(
    { limit: 100, search: search || undefined },
    { query: { staleTime: 1000 * 30, refetchOnWindowFocus: false } }
  );

  const members = membersData?.data ?? [];

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="p-2 space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-2">
            <Skeleton className="w-10 h-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="w-32 h-4" />
              <Skeleton className="w-24 h-3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="px-2">
        <Input
          placeholder="Search members..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 text-sm"
        />
      </div>

      <ScrollArea className="h-[400px]">
        {members.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <Users className="w-8 h-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No members found</p>
          </div>
        ) : (
          <div className="space-y-1">
            {members.map((member) => (
              <div
                key={member._id}
                onClick={() => onSelectMember(member)}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors',
                  selectedMemberId === member._id
                    ? 'bg-primary/10 border border-primary/20'
                    : 'hover:bg-muted/50'
                )}
              >
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {getInitials(member.firstName, member.lastName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {member.firstName} {member.lastName}
                  </p>
                  <p className="text-xs truncate text-muted-foreground">{member.email}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}