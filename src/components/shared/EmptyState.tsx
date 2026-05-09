import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

/**
 * Centered empty / no-results state.
 * Drop inside a page, card, or table cell.
 */
export default function EmptyState({
  title = 'No results',
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-16 text-center', className)}>
      <div className="text-muted-foreground">
        {icon ?? <Inbox className="h-12 w-12" />}
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        {description && (
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">{description}</p>
        )}
      </div>
      {action && (
        <Button size="sm" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
