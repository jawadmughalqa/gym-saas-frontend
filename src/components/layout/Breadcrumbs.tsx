import { Link, useMatches } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Attach `handle: { crumb: 'Label' }` to any route in router.tsx
 * and it will automatically appear in the breadcrumb trail.
 *
 * Example route:
 *   { path: 'members', element: <MembersPage />, handle: { crumb: 'Members' } }
 *   { path: ':id',     element: <MemberDetail />, handle: { crumb: 'Member Detail' } }
 */
interface RouteHandle {
  crumb?: string;
}

export default function Breadcrumbs() {
  const matches = useMatches() as Array<{ id: string; pathname: string; handle: unknown }>;

  const crumbs = matches
    .filter((m) => (m.handle as RouteHandle)?.crumb)
    .map((m) => ({
      label: (m.handle as RouteHandle).crumb!,
      to: m.pathname,
    }));

  if (crumbs.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-muted-foreground">
      <Link
        to="/dashboard"
        className="flex items-center hover:text-foreground transition-colors"
        aria-label="Home"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>

      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={crumb.to} className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5 shrink-0" />
            {isLast ? (
              <span className={cn('font-medium text-foreground')}>{crumb.label}</span>
            ) : (
              <Link to={crumb.to} className="hover:text-foreground transition-colors">
                {crumb.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
