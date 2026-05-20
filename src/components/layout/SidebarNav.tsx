import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { usePermission } from '@/hooks/use-permission';
import { NAV_GROUPS, BOTTOM_NAV_ITEMS, type NavItem } from '@/lib/nav';
import { useAuthStore } from '@/stores/auth.store';
import type { UserRole } from '@/types/api.types';

interface SidebarNavProps {
  collapsed: boolean;
  onNavigate?: () => void;
}

function NavItemLink({
  item,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <NavLink
      to={item.to}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-150',
          isActive
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
          collapsed && 'justify-center px-0 w-10 mx-auto',
        )
      }
    >
      <item.icon className="h-[1.05rem] w-[1.05rem] shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </NavLink>
  );
}

export default function SidebarNav({ collapsed, onNavigate }: SidebarNavProps) {
  const { can } = usePermission();
  const userRole = useAuthStore((s) => s.user?.role);

  function isVisible(item: NavItem): boolean {
    if (item.roles && userRole && !item.roles.includes(userRole as UserRole)) return false;
    if (item.permission && !can(item.permission)) return false;
    return true;
  }

  const visibleBottom = BOTTOM_NAV_ITEMS.filter(isVisible);

  return (
    <div className="flex flex-col h-full">
      {/* Main grouped nav */}
      <nav className="flex-1 px-3 py-3 space-y-5">
        {NAV_GROUPS.map((group) => {
          const visibleItems = group.items.filter(isVisible);
          if (visibleItems.length === 0) return null;
          return (
            <div key={group.label} className="space-y-0.5">
              {/* Group label — hidden when collapsed */}
              {!collapsed && (
                <p className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 select-none">
                  {group.label}
                </p>
              )}
              {visibleItems.map((item) => (
                <NavItemLink
                  key={item.to}
                  item={item}
                  collapsed={collapsed}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          );
        })}
      </nav>

      {/* Bottom nav (Settings, Super Admin) */}
      {visibleBottom.length > 0 && (
        <nav className="px-3 py-3 border-t border-border/60 space-y-0.5">
          {visibleBottom.map((item) => (
            <NavItemLink
              key={item.to}
              item={item}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          ))}
        </nav>
      )}
    </div>
  );
}
