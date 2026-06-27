import { useNavigate } from 'react-router-dom';

import { KeyRound, LogOut, User, HardDrive, Sun, Moon, Monitor } from 'lucide-react';


import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/stores/auth.store';
import { useLogout } from '@/features/auth/hooks/use-auth';
import { useTheme, type Theme } from '@/hooks/use-theme';
import { cn } from '@/lib/utils';

const BACKUP_ROLES         = ['gym_owner', 'branch_manager', 'super_admin'];
const NOTIFICATION_ROLES   = ['gym_owner', 'branch_manager'];

// ─── Theme toggle row ─────────────────────────────────────────────────────────

const THEME_OPTIONS: { value: Theme; icon: React.ElementType; label: string }[] = [
  { value: 'light',  icon: Sun,     label: 'Light'  },
  { value: 'dark',   icon: Moon,    label: 'Dark'   },
  { value: 'system', icon: Monitor, label: 'System' },
];

function ThemeToggleRow() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="px-2 py-1.5">
      <p className="text-xs text-muted-foreground mb-1.5 px-0.5">Appearance</p>
      <div className="flex gap-1 rounded-lg border border-border bg-muted/50 p-0.5">
        {THEME_OPTIONS.map(({ value, icon: Icon, label }) => (
          <button
            key={value}
            onClick={() => setTheme(value)}
            title={label}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-md py-1 text-xs font-medium transition-all',
              theme === value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── UserMenu ─────────────────────────────────────────────────────────────────

export default function UserMenu() {
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();

  const canAccessBackup        = BACKUP_ROLES.includes(user?.role ?? '');
  const canAccessNotifications = NOTIFICATION_ROLES.includes(user?.role ?? '');

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '??';

  // Show which theme is active via the icon in the avatar button
  const ThemeIcon = resolvedTheme === 'dark' ? Moon : Sun;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-md px-1 py-1 hover:bg-accent transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Avatar className="h-8 w-8 cursor-pointer">
            <AvatarFallback className="text-xs font-semibold">{initials}</AvatarFallback>
          </Avatar>
          <div className="hidden sm:block text-left">
            <p className="text-sm font-medium leading-none">{user?.name}</p>
            <p className="text-xs text-muted-foreground capitalize mt-0.5">{user?.role?.replace('_', ' ')}</p>
          </div>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-60" align="end">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user?.name}</p>
            <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* Theme selector */}
        <ThemeToggleRow />

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => navigate('/profile')}>
            <User className="mr-2 h-4 w-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/settings/change-password')}>
            <KeyRound className="mr-2 h-4 w-4" />
            Change password
          </DropdownMenuItem>
          {canAccessNotifications && (
            <DropdownMenuItem onClick={() => navigate('/settings/notifications')}>
              <Bell className="mr-2 h-4 w-4" />
              Notification Channels
            </DropdownMenuItem>
          )}
          {canAccessBackup && (
            <DropdownMenuItem onClick={() => navigate('/settings/backup')}>
              <HardDrive className="mr-2 h-4 w-4" />
              Backup &amp; Restore
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
