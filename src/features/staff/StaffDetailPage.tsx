import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Pencil, Mail, Phone, User, MapPin, Calendar,
  Clock, Copy, Check, KeyRound, RefreshCw, ShieldOff,
  ShieldCheck, UserX, Info, Eye, EyeOff,
  ShieldCheck as ShieldCheckIcon, ChevronDown, ChevronUp,
  Eye as EyeIcon, Users, FileText, BarChart3, DollarSign,
  Bell, BookOpen, Settings,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { api } from '@/lib/axios';
import { toast } from '@/hooks/use-toast';
import { useStaffMember, useUpdateStaffStatus } from './hooks/use-staff';
import { useGetBranches } from '@/api/generated/branches/branches';
import { usePermission } from '@/hooks/use-permission';
import StaffForm, { JOB_TITLE_OPTIONS } from './components/StaffForm';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StaffUserExt {
  _id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  role?: string;
  jobTitle?: string;
  notes?: string;
  status?: string;
  branchIds?: string[];
  lastLoginAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

interface StaffCredentials {
  loginEmail: string;
  tempPassword: string | null;
  hasSetPassword: boolean;
  forcePasswordChange: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  branch_manager: 'Branch Manager',
  staff: 'Staff',
};

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  active:    'default',
  inactive:  'secondary',
  suspended: 'destructive',
};

const BM_CAPABILITIES = [
  { icon: EyeIcon,      label: 'View & manage members',       detail: 'Add, edit, suspend, view member details'     },
  { icon: Users,        label: 'Manage staff',                detail: 'Create and update staff in their branches'   },
  { icon: FileText,     label: 'Session notes & attendance',  detail: 'View all trainer notes, mark attendance'     },
  { icon: DollarSign,   label: 'Billing & invoices',          detail: 'View invoices, record payments'              },
  { icon: BarChart3,    label: 'Reports & analytics',         detail: 'Access branch-level reports and data'        },
  { icon: Bell,         label: 'Notifications',               detail: 'Receive alerts for key gym events'           },
  { icon: BookOpen,     label: 'Walk-in leads',               detail: 'Manage and follow up on prospects'           },
  { icon: Settings,     label: 'Branch settings',             detail: 'Update branch info and equipment'            },
];

const BM_CANNOT = [
  'Delete members permanently',
  'Access branches they are not assigned to',
  'Change subscription or billing plan',
  'View or reset gym owner credentials',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso?: string | null) {
  if (!iso) return 'Never';
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function jobTitleLabel(value?: string) {
  if (!value) return null;
  return JOB_TITLE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

function initials(s: StaffUserExt) {
  const f = s.firstName?.[0] ?? '';
  const l = s.lastName?.[0] ?? '';
  return (f + l).toUpperCase() || '??';
}

// ─── BM Capabilities Panel ───────────────────────────────────────────────────

function BranchManagerCapabilities() {
  const [open, setOpen] = useState(false);
  return (
    <Card className="border-blue-200 dark:border-blue-800">
      <CardHeader className="pb-0">
        <button
          type="button"
          className="flex items-center gap-2 text-left w-full"
          onClick={() => setOpen((v) => !v)}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/40 flex-shrink-0">
            <ShieldCheckIcon className="h-4 w-4 text-blue-600" />
          </div>
          <CardTitle className="text-base flex-1 text-blue-800 dark:text-blue-300">
            Branch Manager Capabilities
          </CardTitle>
          {open ? <ChevronUp className="h-4 w-4 text-blue-500" /> : <ChevronDown className="h-4 w-4 text-blue-500" />}
        </button>
      </CardHeader>

      {open && (
        <CardContent className="pt-4 space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">✓ Can do</p>
            <div className="grid sm:grid-cols-2 gap-2">
              {BM_CAPABILITIES.map(({ icon: Icon, label, detail }) => (
                <div key={label} className="flex gap-2">
                  <Icon className="h-3.5 w-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">{detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <Separator />
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-destructive uppercase tracking-wide">✗ Cannot do</p>
            {BM_CANNOT.map((item) => (
              <div key={item} className="flex gap-2 items-start">
                <span className="text-destructive text-xs mt-px">✕</span>
                <p className="text-xs text-muted-foreground">{item}</p>
              </div>
            ))}
          </div>
          <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2">
            <div className="flex gap-2 items-start">
              <Info className="h-3.5 w-3.5 text-amber-600 flex-shrink-0 mt-px" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Access is scoped to assigned branches only.
              </p>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ─── Credentials Card ─────────────────────────────────────────────────────────

function CredentialsCard({ staffId }: { staffId: string }) {
  const qc = useQueryClient();
  const [revealed, setRevealed] = useState(false);
  const [showPw, setShowPw]     = useState(false);
  const [copied, setCopied]     = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: creds, isLoading } = useQuery<StaffCredentials>({
    queryKey: ['staff', staffId, 'credentials'],
    queryFn: async () => {
      const res = await api.get(`/staff/${staffId}/credentials`);
      return res.data.data;
    },
    enabled: revealed,
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/staff/${staffId}/reset-password`);
      return res.data.data as { tempPassword: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff', staffId, 'credentials'] });
      toast({ title: 'Password reset', description: 'New temporary password generated.' });
      setConfirmOpen(false);
      setRevealed(true);
    },
    onError: (err: any) => toast({
      variant: 'destructive',
      title: 'Reset failed',
      description: err?.response?.data?.message ?? 'Something went wrong.',
    }),
  });

  function copyText(text: string) {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                <KeyRound className="h-4 w-4 text-muted-foreground" />
              </div>
              <CardTitle className="text-base">Login Credentials</CardTitle>
            </div>
            {!revealed ? (
              <Button size="sm" variant="outline" onClick={() => setRevealed(true)}>
                <Eye className="h-3.5 w-3.5 mr-1.5" />
                Show Credentials
              </Button>
            ) : (
              <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => { setRevealed(false); setShowPw(false); }}>
                <EyeOff className="h-3.5 w-3.5 mr-1.5" />
                Hide
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {!revealed ? (
            <p className="text-sm text-muted-foreground italic">
              Click "Show Credentials" to view this staff member's login details.
            </p>
          ) : isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : creds ? (
            <div className="space-y-4">
              {/* Email */}
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted flex-shrink-0">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Login Email</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-sm font-mono truncate">{creds.loginEmail}</p>
                    <button type="button" onClick={() => copyText(creds.loginEmail)} className="text-muted-foreground hover:text-foreground flex-shrink-0">
                      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Password */}
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted flex-shrink-0">
                  <KeyRound className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-0.5">
                    Password
                    {creds.hasSetPassword && (
                      <span className="ml-2 text-xs text-emerald-600 font-medium">✓ Staff's own password</span>
                    )}
                    {creds.forcePasswordChange && (
                      <span className="ml-2 text-xs text-amber-600 font-medium">⚠ Must change on login</span>
                    )}
                  </p>
                  {creds.tempPassword ? (
                    <div className="flex items-center gap-2 rounded bg-muted px-3 py-2 font-mono text-sm">
                      <span className="flex-1 select-all">
                        {showPw ? creds.tempPassword : '••••••••••••'}
                      </span>
                      <button type="button" onClick={() => setShowPw((v) => !v)} className="text-muted-foreground hover:text-foreground flex-shrink-0">
                        {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                      <button type="button" onClick={() => copyText(creds.tempPassword!)} className="text-muted-foreground hover:text-foreground flex-shrink-0">
                        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      Password not available — staff member manages their own password.
                    </p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Reset button */}
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/5"
                onClick={() => setConfirmOpen(true)}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Reset Password
              </Button>
              <p className="text-xs text-muted-foreground">
                Generates a new temporary password, logs the staff member out of all devices, and emails them the new credentials.
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Confirm reset dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset password?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will log the staff member out of all devices and generate a new temporary password. They'll be emailed the new credentials.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={resetMutation.isPending}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => resetMutation.mutate()}
              disabled={resetMutation.isPending}
            >
              {resetMutation.isPending ? 'Resetting…' : 'Reset Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Status confirm dialog ────────────────────────────────────────────────────

function StatusDialog({
  open,
  onClose,
  staffName,
  action,
  onConfirm,
  isLoading,
}: {
  open: boolean;
  onClose: () => void;
  staffName: string;
  action: 'active' | 'inactive' | 'suspended';
  onConfirm: () => void;
  isLoading: boolean;
}) {
  const labels = { active: 'Reactivate', inactive: 'Deactivate', suspended: 'Suspend' };
  const descs  = {
    active:    'The account will be restored and the user can log in again.',
    inactive:  'The account will be deactivated. Data is preserved.',
    suspended: 'This will immediately block the user from logging in.',
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{labels[action]} {staffName}?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{descs[action]}</p>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button
            variant={action === 'suspended' ? 'destructive' : 'default'}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? `${labels[action]}…` : labels[action]}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── StaffDetailPage ──────────────────────────────────────────────────────────

export default function StaffDetailPage() {
  const { staffId } = useParams<{ staffId: string }>();
  const navigate    = useNavigate();
  const { can }     = usePermission();
  const canManage   = can('role.assign');

  const [editOpen, setEditOpen]     = useState(false);
  const [statusDialog, setStatusDialog] = useState<{
    open: boolean;
    action: 'active' | 'inactive' | 'suspended';
  }>({ open: false, action: 'active' });

  const { data: raw, isLoading } = useStaffMember(staffId ?? '');
  const staff = (raw?.data ?? null) as StaffUserExt | null;

  const { data: branchesData } = useGetBranches({ limit: 100 });
  const allBranches = branchesData?.data ?? [];

  const statusMutation = useUpdateStaffStatus(staffId ?? '', {
    onSuccess: () => setStatusDialog((d) => ({ ...d, open: false })),
  });

  if (isLoading) {
    return (
      <div className="max-w-3xl space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!staff) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Staff member not found.</p>
        <Button variant="link" onClick={() => navigate('/staff')} className="mt-2 px-0">← Back to staff</Button>
      </div>
    );
  }

  const fullName    = `${staff.firstName ?? ''} ${staff.lastName ?? ''}`.trim();
  const role        = staff.role ?? 'staff';
  const status      = staff.status ?? 'active';
  const isActive    = status === 'active';
  const isSuspended = status === 'suspended';

  const assignedBranches = (staff.branchIds ?? [])
    .map((id) => allBranches.find((b) => b._id === id)?.name ?? id);

  return (
    <div className="max-w-3xl space-y-6">
      {/* Back */}
      <Button variant="ghost" size="sm" className="gap-2 -ml-2" onClick={() => navigate('/staff')}>
        <ArrowLeft className="h-4 w-4" />
        Back to Staff
      </Button>

      {/* Profile header card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Avatar + name */}
            <div className="flex items-start gap-4 flex-1 min-w-0">
              <Avatar className="h-16 w-16 flex-shrink-0">
                <AvatarFallback className="text-xl font-bold">{initials(staff)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold truncate">{fullName}</h1>
                  <Badge variant={STATUS_VARIANT[status] ?? 'outline'} className="capitalize">
                    {status}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-xs',
                      role === 'branch_manager'
                        ? 'border-blue-200 text-blue-700 bg-blue-50 dark:border-blue-800 dark:text-blue-300'
                        : '',
                    )}
                  >
                    {ROLE_LABELS[role] ?? role}
                  </Badge>
                  {role === 'staff' && staff.jobTitle && (
                    <Badge variant="secondary" className="text-xs">
                      {jobTitleLabel(staff.jobTitle)}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            {canManage && (
              <div className="flex flex-wrap gap-2 flex-shrink-0">
                <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
                  <Pencil className="h-4 w-4 mr-1.5" />
                  Edit
                </Button>
                {isActive && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-amber-600 border-amber-200 hover:bg-amber-50"
                      onClick={() => setStatusDialog({ open: true, action: 'inactive' })}
                    >
                      <UserX className="h-4 w-4 mr-1.5" />
                      Deactivate
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive border-destructive/30 hover:bg-destructive/5"
                      onClick={() => setStatusDialog({ open: true, action: 'suspended' })}
                    >
                      <ShieldOff className="h-4 w-4 mr-1.5" />
                      Suspend
                    </Button>
                  </>
                )}
                {!isActive && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                    onClick={() => setStatusDialog({ open: true, action: 'active' })}
                  >
                    <ShieldCheck className="h-4 w-4 mr-1.5" />
                    Reactivate
                  </Button>
                )}
              </div>
            )}
          </div>

          <Separator className="my-4" />

          {/* Detail rows */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted flex-shrink-0">
                <Mail className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm font-medium truncate">{staff.email ?? '—'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted flex-shrink-0">
                <Phone className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="text-sm font-medium">{staff.phone ?? '—'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted flex-shrink-0">
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Role</p>
                <p className="text-sm font-medium">{ROLE_LABELS[role] ?? role}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted flex-shrink-0">
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Last Login</p>
                <p className="text-sm font-medium">{fmtDate(staff.lastLoginAt)}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted flex-shrink-0">
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Added On</p>
                <p className="text-sm font-medium">{fmtDate(staff.createdAt)}</p>
              </div>
            </div>

            {assignedBranches.length > 0 && (
              <div className="flex items-start gap-3 sm:col-span-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted flex-shrink-0">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground mb-1">Assigned Branches</p>
                  <div className="flex flex-wrap gap-1.5">
                    {assignedBranches.map((name) => (
                      <Badge key={name} variant="outline" className="text-xs capitalize">{name}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Branch Manager capabilities */}
      {role === 'branch_manager' && <BranchManagerCapabilities />}

      {/* Internal notes */}
      {staff.notes && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                <FileText className="h-4 w-4 text-muted-foreground" />
              </div>
              <CardTitle className="text-base">Internal Notes</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{staff.notes}</p>
            <p className="text-xs text-muted-foreground mt-3 italic">Only visible to gym owner and branch managers.</p>
          </CardContent>
        </Card>
      )}

      {/* Login credentials */}
      {canManage && staffId && <CredentialsCard staffId={staffId} />}

      {/* Edit sheet */}
      <StaffForm
        open={editOpen}
        onClose={() => setEditOpen(false)}
        staff={staff as any}
      />

      {/* Status dialog */}
      <StatusDialog
        open={statusDialog.open}
        onClose={() => setStatusDialog((d) => ({ ...d, open: false }))}
        staffName={fullName}
        action={statusDialog.action}
        onConfirm={() =>
          statusMutation.mutate({
            staffId: staffId!,
            data: { status: statusDialog.action },
          })
        }
        isLoading={statusMutation.isPending}
      />
    </div>
  );
}
