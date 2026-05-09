import { cn } from '@/lib/utils';

interface PageShellProps {
  children: React.ReactNode;
  /** Extra class names for the outer container */
  className?: string;
  /** Constrain content width (default: true) */
  constrain?: boolean;
}

/**
 * Thin wrapper every feature page renders inside.
 * Provides consistent vertical spacing and optional max-width constraint.
 *
 * Usage:
 *   <PageShell>
 *     <PageHeader title="Members" />
 *     <MembersTable />
 *   </PageShell>
 */
export default function PageShell({ children, className, constrain = false }: PageShellProps) {
  return (
    <div className={cn('space-y-6', constrain && 'max-w-5xl', className)}>
      {children}
    </div>
  );
}
