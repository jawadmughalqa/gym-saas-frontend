import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Bell, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useNotificationStore } from '@/stores/notification.store';
import { useGetNotificationsUnreadCount } from '@/api/generated/notifications/notifications';
import SidebarNav from './SidebarNav';
import Breadcrumbs from './Breadcrumbs';
import UserMenu from './UserMenu';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import { cn } from '@/lib/utils';

// ─── Unread count sync ────────────────────────────────────────────────────────
// Polls every 60s so the bell badge stays current across all pages.

function useUnreadCountSync() {
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount);
  const { data } = useGetNotificationsUnreadCount({
    query: { staleTime: 1000 * 30, refetchInterval: 1000 * 60 },
  });
  useEffect(() => {
    if (data?.data?.count !== undefined) {
      setUnreadCount(data.data.count);
    }
  }, [data, setUnreadCount]);
}

// ─── Desktop sidebar ──────────────────────────────────────────────────────────

function DesktopSidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <aside
      className={cn(
        'hidden md:flex flex-col border-r bg-card transition-all duration-300 shrink-0',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      {/* Logo row */}
      <div className="flex h-14 items-center border-b px-3 shrink-0">
        {!collapsed && (
          <span className="font-bold text-primary text-lg flex-1">GymPro</span>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="shrink-0"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <Menu className="h-4 w-4" />
        </Button>
      </div>

      {/* Scrollable nav */}
      <ScrollArea className="flex-1">
        <SidebarNav collapsed={collapsed} />
      </ScrollArea>
    </aside>
  );
}

// ─── Mobile sidebar (sheet drawer) ───────────────────────────────────────────

function MobileSidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="left" className="w-64 p-0">
        {/* Logo */}
        <div className="flex h-14 items-center border-b px-4 shrink-0">
          <span className="font-bold text-primary text-lg">GymPro</span>
        </div>
        <ScrollArea className="flex-1 h-[calc(100%-3.5rem)]">
          <SidebarNav collapsed={false} onNavigate={onClose} />
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

// ─── Top bar ──────────────────────────────────────────────────────────────────

function TopBar({
  onMobileMenuOpen,
}: {
  onMobileMenuOpen: () => void;
}) {
  const navigate = useNavigate();
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  return (
    <header className="flex h-14 items-center gap-3 border-b bg-card px-4 shrink-0">
      {/* Mobile hamburger */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onMobileMenuOpen}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Breadcrumbs */}
      <div className="flex-1 hidden sm:block">
        <Breadcrumbs />
      </div>

      <div className="flex-1 sm:flex-none" />

      {/* Right side controls */}
      <div className="flex items-center gap-1">
        {/* Notification bell */}
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          onClick={() => navigate('/notifications')}
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground pointer-events-none">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* User menu */}
        <UserMenu />
      </div>
    </header>
  );
}

// ─── AppShell ─────────────────────────────────────────────────────────────────

export default function AppShell() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  useUnreadCountSync();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <DesktopSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((v) => !v)}
      />

      {/* Mobile drawer */}
      <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <TopBar onMobileMenuOpen={() => setMobileOpen(true)} />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
