import { useNavigate } from 'react-router-dom';
import { KeyRound, Mail, Shield, User, Building2 } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuthStore } from '@/stores/auth.store';

function roleLabel(role: string) {
  return role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function roleBadgeVariant(role: string): 'default' | 'secondary' | 'outline' {
  if (role === 'super_admin') return 'default';
  if (role === 'admin' || role === 'owner') return 'secondary';
  return 'outline';
}

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  if (!user) return null;

  const initials = user.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '??';

  return (
    <div className="max-w-2xl space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>
        <p className="text-sm text-muted-foreground">
          View your account details and manage settings.
        </p>
      </div>

      {/* Profile card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-xl font-bold">{initials}</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <CardTitle className="text-xl">{user.name}</CardTitle>
              <Badge variant={roleBadgeVariant(user.role)} className="capitalize">
                {roleLabel(user.role)}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <Separator />

        <CardContent className="pt-5 space-y-4">
          {/* Email */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
              <Mail className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Email address</p>
              <p className="text-sm font-medium">{user.email}</p>
            </div>
          </div>

          {/* Role */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
              <User className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Role</p>
              <p className="text-sm font-medium capitalize">{roleLabel(user.role)}</p>
            </div>
          </div>

          {/* Tenant (if not super admin) */}
          {user.tenantId && (
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Workspace ID</p>
                <p className="text-sm font-medium font-mono">{user.tenantId}</p>
              </div>
            </div>
          )}

          {/* Permissions count */}
          {(user.permissions?.length ?? 0) > 0 && (
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                <Shield className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Permissions</p>
                <p className="text-sm font-medium">{user.permissions?.length ?? 0} granted</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Account settings</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => navigate('/settings/change-password')}
          >
            <KeyRound className="mr-2 h-4 w-4" />
            Change password
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
