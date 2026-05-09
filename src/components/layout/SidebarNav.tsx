import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { usePermission } from '@/hooks/use-permission';
import { NAV_ITEMS, BOTTOM_NAV_ITEMS, type NavItem } from '@/lib/nav';
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
          'flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors',
          isActive
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
          collapsed && 'justify-center px-2',
        )
      }
    >
      <item.icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span>{item.label}</span>}
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

  const visibleMain = NAV_ITEMS.filter(isVisible);
  const visibleBottom = BOTTOM_NAV_ITEMS.filter(isVisible);

  return (
    <div className="flex flex-col h-full">
      {/* Main nav */}
      <nav className="flex-1 space-y-0.5 px-2 py-2">
        {visibleMain.map((item) => (
          <NavItemLink
            key={item.to}
            item={item}
            collapsed={collapsed}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      {/* Bottom nav */}
      {visibleBottom.length > 0 && (
        <nav className="space-y-0.5 px-2 py-2 border-t">
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
