import { Flame, Snowflake, Trophy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { StreakInfo } from '@/api/generated/schemas';

interface StreakCardProps {
  streak: StreakInfo | undefined;
  isLoading?: boolean;
  onUseFreeze?: () => void;
  freezeLoading?: boolean;
}

export default function StreakCard({ streak, isLoading, onUseFreeze, freezeLoading }: StreakCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-28" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-12 w-20" />
          <Skeleton className="h-4 w-40" />
        </CardContent>
      </Card>
    );
  }

  const current  = streak?.currentStreak  ?? 0;
  const longest  = streak?.longestStreak  ?? 0;
  const freezes  = streak?.freezesAvailable ?? 0;
  const emoji    = streak?.tierEmoji ?? '🔥';
  const tierLabel = streak?.tierLabel ?? 'Beginner';

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <Flame className="h-4 w-4 text-orange-500" />
          Streak
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current streak counter */}
        <div className="flex items-end gap-2">
          <span className="text-5xl font-bold leading-none tabular-nums">{current}</span>
          <span className="text-muted-foreground mb-1">day{current !== 1 ? 's' : ''}</span>
        </div>

        {/* Tier badge */}
        <div className="flex items-center gap-2">
          <span className="text-lg">{emoji}</span>
          <Badge variant="secondary" className="text-xs">{tierLabel}</Badge>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Trophy className="h-3.5 w-3.5" />
            <span>Best: <span className="font-medium text-foreground">{longest}</span></span>
          </div>
          <div className="flex items-center gap-1">
            <Snowflake className="h-3.5 w-3.5 text-blue-400" />
            <span>Freezes: <span className="font-medium text-foreground">{freezes}</span></span>
          </div>
        </div>

        {/* Freeze button */}
        {onUseFreeze && (
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            disabled={freezes === 0 || freezeLoading}
            onClick={onUseFreeze}
          >
            <Snowflake className="h-3.5 w-3.5" />
            Use Freeze ({freezes} left)
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
