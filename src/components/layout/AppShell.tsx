import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Bell, Menu, PanelLeftClose, PanelLeftOpen, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/hooks/use-theme';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useNotificationStore } from '@/stores/notification.store';
import { useGetNotificationsUnreadCount } from '@/api/generated/notifications/notifications';
import SidebarNav from './SidebarNav';
import Breadcrumbs from './Breadcrumbs';
import UserMenu from './UserMenu';
import ImpersonationBanner from './ImpersonationBanner';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import { cn } from '@/lib/utils';
import { useAutoBackup } from '@/hooks/use-auto-backup';

// ─── Unread count sync ────────────────────────────────────────────────────────
// Polls every 60s so the bell badge stays current across all pages.

function useUnreadCountSync() {
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount);
  const { data } = useGetNotificationsUnreadCount({
    query: { staleTime: 0, refetchOnMount: true, refetchOnWindowFocus: true, refetchInterval: 1000 * 30 },
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
        'hidden md:flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 ease-in-out shrink-0',
        collapsed ? 'w-[4.5rem]' : 'w-[15.5rem]',
      )}
    >
      {/* Logo row */}
      <div
        className={cn(
          'flex h-14 items-center border-b border-sidebar-border shrink-0',
          collapsed ? 'justify-center px-0' : 'px-4 gap-2',
        )}
      >
        {/* Logo mark */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary shadow-sm">
          <span className="text-xs font-bold text-primary-foreground">G</span>
        </div>
        {!collapsed && (
          <span className="font-semibold text-[15px] tracking-tight text-sidebar-foreground flex-1">
            Gymanger
          </span>
        )}
        {!collapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Expand toggle when collapsed */}
      {collapsed && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="mx-auto mt-2 h-8 w-8 text-muted-foreground hover:text-foreground"
          aria-label="Expand sidebar"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </Button>
      )}

      {/* Scrollable nav */}
      <ScrollArea className="flex-1 overflow-hidden">
        <SidebarNav collapsed={collapsed} />
      </ScrollArea>
    </aside>
  );
}

// ─── Mobile sidebar (sheet drawer) ───────────────────────────────────────────

function MobileSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="left" className="w-[15.5rem] p-0 bg-sidebar border-sidebar-border">
        {/* Logo */}
        <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4 shrink-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary shadow-sm">
            <span className="text-xs font-bold text-primary-foreground">G</span>
          </div>
          <span className="font-semibold text-[15px] tracking-tight text-sidebar-foreground">
            Gymanger
          </span>
        </div>
        <ScrollArea className="flex-1 h-[calc(100%-3.5rem)]">
          <SidebarNav collapsed={false} onNavigate={onClose} />
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

// ─── Top bar ──────────────────────────────────────────────────────────────────

function TopBar({ onMobileMenuOpen }: { onMobileMenuOpen: () => void }) {
  const navigate = useNavigate();
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <header className="flex h-14 items-center gap-3 border-b bg-card/80 backdrop-blur-sm px-4 shrink-0">
      {/* Mobile hamburger */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden h-8 w-8"
        onClick={onMobileMenuOpen}
        aria-label="Open menu"
      >
        <Menu className="h-4 w-4" />
      </Button>

      {/* Breadcrumbs */}
      <div className="flex-1 hidden sm:block">
        <Breadcrumbs />
      </div>

      <div className="flex-1 sm:flex-none" />

      {/* Right side controls */}
      <div className="flex items-center gap-1">
        {/* Theme quick-toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          aria-label="Toggle theme"
        >
          {resolvedTheme === 'dark'
            ? <Sun className="h-4 w-4" />
            : <Moon className="h-4 w-4" />}
        </Button>

        {/* Notification bell */}
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8"
          onClick={() => navigate('/notifications')}
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-[1.1rem] w-[1.1rem] items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground pointer-events-none ring-2 ring-background">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>

        <Separator orientation="vertical" className="h-5 mx-1 opacity-50" />

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
  useAutoBackup();

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
        {/* Impersonation warning banner — shown above topbar when active */}
        <ImpersonationBanner />

        <TopBar onMobileMenuOpen={() => setMobileOpen(true)} />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-muted/30 p-4 sm:p-6 lg:p-7">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
