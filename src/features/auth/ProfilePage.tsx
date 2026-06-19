import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  KeyRound, Mail, Shield, User, Building2,
  CreditCard, Sparkles, ArrowRight, Check,
  Users, UserCheck, CreditCard as CreditCardIcon, ScanLine, BarChart3,
  Receipt, GitBranch, Wrench, Bell, Tag, Dumbbell, Smartphone, UserPlus,
  Pencil, Star, MapPin, Clock, Award, Briefcase, TrendingUp, ChevronDown, ChevronUp,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/stores/auth.store';
import { useGetMyTenant } from '@/api/generated/tenants/tenants';
import { cn } from '@/lib/utils';
import { api } from '@/lib/axios';
import { toast } from '@/hooks/use-toast';
import {
  useMyTrainerProfile,
  useMyTrainerRatings,
} from '@/features/trainer-portal/hooks/use-trainer-portal';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function roleLabel(role: string) {
  return role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function roleBadgeVariant(role: string): 'default' | 'secondary' | 'outline' {
  if (role === 'super_admin') return 'default';
  if (role === 'admin' || role === 'owner') return 'secondary';
  return 'outline';
}

function StarRow({ value, size = 4 }: { value: number; size?: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(`h-${size} w-${size}`, i <= value ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30')}
        />
      ))}
    </span>
  );
}

function daysSince(from: string, to?: string): number {
  const a = new Date(from).getTime();
  const b = to ? new Date(to).getTime() : Date.now();
  return Math.max(0, Math.floor((b - a) / 86_400_000));
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

const PLAN_TIER_STYLES: Record<string, { badge: string; accent: string; border: string }> = {
  starter:    { badge: 'bg-slate-100 text-slate-700',   accent: 'text-slate-700',  border: 'border-slate-200'  },
  pro:        { badge: 'bg-purple-100 text-purple-700', accent: 'text-purple-700', border: 'border-purple-200' },
  enterprise: { badge: 'bg-amber-100 text-amber-700',   accent: 'text-amber-700',  border: 'border-amber-200'  },
};

const FLAG_DISPLAY: Record<string, { label: string; icon: React.ElementType }> = {
  members:       { label: 'Members',          icon: Users           },
  trainers:      { label: 'Trainers',          icon: UserCheck       },
  billing:       { label: 'Billing',           icon: CreditCardIcon  },
  attendance:    { label: 'Attendance',        icon: ScanLine        },
  notifications: { label: 'Notifications',     icon: Bell            },
  memberPortal:  { label: 'Member Portal',     icon: Smartphone      },
  reports:       { label: 'Reports',           icon: BarChart3       },
  expenses:      { label: 'Expenses',          icon: Receipt         },
  branches:      { label: 'Multi-Branch',      icon: GitBranch       },
  equipment:     { label: 'Equipment',         icon: Wrench          },
  discounts:     { label: 'Discounts',         icon: Tag             },
  fitPlan:       { label: 'FitPlan',           icon: Dumbbell        },
  walkInLeads:   { label: 'Walk-in Leads',     icon: UserPlus        },
};

// ─── Subscription Plan Card (gym_owner only) ──────────────────────────────────

function SubscriptionCard() {
  const navigate = useNavigate();
  const { data, isLoading } = useGetMyTenant({ query: { staleTime: 1000 * 60 * 5 } });

  const tenant     = data?.data;
  const planName   = tenant?.plan ?? '';
  const styles     = PLAN_TIER_STYLES[planName] ?? PLAN_TIER_STYLES['starter'];
  const tenantAny  = tenant as (typeof tenant) & { billingCycle?: string; billingCycleDay?: number };
  const billing    = tenantAny?.billingCycle ?? 'monthly';
  const flags      = (tenant?.featureFlags ?? {}) as Record<string, boolean>;

  const enabledFeatures = Object.entries(FLAG_DISPLAY).filter(([key]) => flags[key]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-4 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  if (!tenant) return null;

  return (
    <Card className={cn('border-2', styles.border)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <CreditCard className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-base">Subscription</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1 text-muted-foreground"
            onClick={() => navigate('/settings/pricing')}
          >
            View Plans
            <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full capitalize', styles.badge)}>
              {planName}
            </span>
            <span className="text-sm text-muted-foreground capitalize">{billing}</span>
          </div>
          {tenant.status && (
            <Badge
              variant="outline"
              className={cn(
                'text-xs capitalize',
                tenant.status === 'active' && 'border-green-200 text-green-700 dark:border-green-800 dark:text-green-400',
                tenant.status === 'trial'  && 'border-blue-200 text-blue-700 dark:border-blue-800 dark:text-blue-400',
                tenant.status === 'suspended' && 'border-red-200 text-red-700',
              )}
            >
              {tenant.status}
            </Badge>
          )}
        </div>

        <Separator />

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Active Features
          </p>
          <div className="grid grid-cols-1 xs:grid-cols-2 gap-1.5">
            {enabledFeatures.map(([key, { label, icon: Icon }]) => (
              <div key={key} className="flex items-center gap-1.5 text-xs min-w-0">
                <Check className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                <Icon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                <span className="font-medium truncate">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {tenant.quotas && (
          <>
            <Separator />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Limits
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {[
                  { label: 'Members',   val: tenant.quotas.maxMembers  },
                  { label: 'Trainers',  val: tenant.quotas.maxTrainers  },
                  { label: 'Branches',  val: tenant.quotas.maxBranches  },
                  { label: 'Emails/mo', val: tenant.quotas.maxEmailSendsPerMonth },
                ].map(({ label, val }) => (
                  <div key={label} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-semibold">{val === -1 ? '∞' : (val ?? '—')}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {planName !== 'enterprise' && (
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2 text-xs h-8"
            onClick={() => navigate('/settings/pricing')}
          >
            <Sparkles className="h-3.5 w-3.5" />
            See All Plans & Upgrade
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Trainer Professional Info Card ───────────────────────────────────────────

function TrainerProfessionalCard() {
  const { data: profile, isLoading } = useMyTrainerProfile();
  const { data: tenant } = useGetMyTenant({ query: { staleTime: 1000 * 60 * 5 } });

  const gymName  = (tenant?.data as any)?.name ?? null;
  const currency = profile?.currency ?? 'PKR';

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-4 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  if (!profile) return null;

  const branches    = (profile.branchIds ?? []) as { _id: string; name: string }[];
  const specs       = profile.specializations ?? [];
  const certs       = profile.certifications ?? [];
  const current     = profile.currentClientCount ?? 0;
  const max         = profile.maxClients ?? 10;
  const capPct      = Math.round((current / max) * 100);
  const capColor    = capPct >= 90 ? 'text-destructive' : capPct >= 70 ? 'text-amber-600' : 'text-emerald-600';

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Briefcase className="h-4 w-4 text-primary" />
          </div>
          <CardTitle className="text-base">Trainer Details</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">

        {/* Gym */}
        {gymName && (
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted flex-shrink-0">
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Gym</p>
              <p className="text-sm font-semibold">{gymName}</p>
            </div>
          </div>
        )}

        {/* Branches */}
        {branches.length > 0 && (
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted flex-shrink-0">
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Assigned Branches</p>
              <div className="flex flex-wrap gap-1">
                {branches.map((b) => (
                  <Badge key={b._id} variant="outline" className="text-xs capitalize">{b.name}</Badge>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Experience */}
        {(profile.experienceYears ?? 0) > 0 && (
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted flex-shrink-0">
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Experience</p>
              <p className="text-sm font-medium">
                {profile.experienceYears} {profile.experienceYears === 1 ? 'year' : 'years'}
              </p>
            </div>
          </div>
        )}

        {/* Monthly Rate */}
        {(profile.hourlyRate ?? 0) > 0 && (
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted flex-shrink-0">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Monthly Rate</p>
              <p className="text-sm font-medium">
                {currency} {profile.hourlyRate?.toLocaleString()}/month
              </p>
            </div>
          </div>
        )}

        {/* Client Capacity */}
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted flex-shrink-0">
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">Client Capacity</p>
              <span className={cn('text-xs font-semibold', capColor)}>
                {current} / {max} clients
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', capPct >= 90 ? 'bg-destructive' : capPct >= 70 ? 'bg-amber-500' : 'bg-emerald-500')}
                style={{ width: `${capPct}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {max - current} slot{max - current !== 1 ? 's' : ''} remaining
            </p>
          </div>
        </div>

        {/* Status */}
        {profile.status && (
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className={cn(
                'text-xs capitalize',
                profile.status === 'active'      && 'border-green-200 text-green-700',
                profile.status === 'inactive'    && 'border-slate-200 text-slate-500',
                profile.status === 'unavailable' && 'border-amber-200 text-amber-700',
              )}
            >
              {profile.status}
            </Badge>
          </div>
        )}

        {/* Specializations */}
        {specs.length > 0 && (
          <>
            <Separator />
            <div>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Specializations</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {specs.map((s) => (
                  <Badge key={s} variant="secondary" className="text-xs capitalize">{s}</Badge>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Certifications */}
        {certs.length > 0 && (
          <>
            {specs.length === 0 && <Separator />}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Award className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Certifications</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {certs.map((c) => (
                  <Badge key={c} variant="outline" className="text-xs">
                    <Check className="h-3 w-3 mr-1 text-emerald-500" />
                    {c}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Bio */}
        {profile.bio && (
          <>
            <Separator />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Bio</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{profile.bio}</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Trainer Ratings Card ─────────────────────────────────────────────────────

function TrainerRatingsCard() {
  const { data: profile } = useMyTrainerProfile();
  const trainerId = profile?._id;

  const [expanded, setExpanded] = useState(false);
  const { data: ratings = [], isLoading } = useMyTrainerRatings(trainerId);

  const avg   = profile?.ratingAvg   ?? 0;
  const count = profile?.ratingCount ?? 0;

  const visible = expanded ? ratings : ratings.slice(0, 3);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
              <Star className="h-4 w-4 text-amber-500" />
            </div>
            <CardTitle className="text-base">My Ratings</CardTitle>
          </div>
          {count > 0 && (
            <div className="flex items-center gap-2">
              <StarRow value={Math.round(avg)} size={4} />
              <span className="text-sm font-semibold">{avg.toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">({count})</span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : count === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No ratings yet — members can rate you after they've trained with you.
          </p>
        ) : (
          <div className="space-y-3">
            {/* Summary bar */}
            <div className="rounded-lg bg-muted/40 p-3 flex items-center gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold">{avg.toFixed(1)}</p>
                <StarRow value={Math.round(avg)} size={3} />
                <p className="text-xs text-muted-foreground mt-0.5">{count} rating{count !== 1 ? 's' : ''}</p>
              </div>
              <div className="flex-1 space-y-1">
                {[5, 4, 3, 2, 1].map((star) => {
                  const starCount = ratings.filter((r) => r.rating === star).length;
                  const pct = count > 0 ? (starCount / count) * 100 : 0;
                  return (
                    <div key={star} className="flex items-center gap-2">
                      <span className="text-xs w-4 text-right text-muted-foreground">{star}</span>
                      <Star className="h-3 w-3 text-amber-400 fill-amber-400 flex-shrink-0" />
                      <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground w-4">{starCount}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Individual ratings */}
            <div className="space-y-3">
              {visible.map((r) => {
                const memberName = r.memberId
                  ? `${r.memberId.firstName} ${r.memberId.lastName}`.trim()
                  : 'Member';
                const initials = memberName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
                const enrolled = r.assignmentId?.startDate
                  ? daysSince(r.assignmentId.startDate, r.updatedAt)
                  : null;

                return (
                  <div key={r._id} className="flex gap-3">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback className="text-xs font-semibold">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className="text-sm font-medium truncate">{memberName}</span>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <StarRow value={r.rating} size={3} />
                          <span className="text-xs font-semibold">{r.rating}.0</span>
                        </div>
                      </div>
                      {r.review && (
                        <p className="text-xs text-muted-foreground leading-relaxed mb-1">{r.review}</p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{fmtDate(r.updatedAt)}</span>
                        {enrolled !== null && (
                          <span>· {enrolled} day{enrolled !== 1 ? 's' : ''} after enrollment</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Show more / less */}
            {ratings.length > 3 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full gap-1 text-xs mt-1"
                onClick={() => setExpanded((v) => !v)}
              >
                {expanded ? (
                  <><ChevronUp className="h-3.5 w-3.5" /> Show less</>
                ) : (
                  <><ChevronDown className="h-3.5 w-3.5" /> Show {ratings.length - 3} more</>
                )}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Edit Profile Dialog ──────────────────────────────────────────────────────

interface EditProfileForm {
  firstName: string;
  lastName: string;
}

function EditProfileDialog({
  open,
  onOpenChange,
  currentName,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  currentName: string;
}) {
  const { user, accessToken, setAuth } = useAuthStore();
  const [saving, setSaving] = useState(false);

  const nameParts = currentName.trim().split(/\s+/);
  const defaultFirst = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : nameParts[0] ?? '';
  const defaultLast  = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';

  const { register, handleSubmit, reset, formState: { errors } } = useForm<EditProfileForm>({
    defaultValues: { firstName: defaultFirst, lastName: defaultLast },
  });

  function onClose() {
    reset();
    onOpenChange(false);
  }

  async function onSubmit(data: EditProfileForm) {
    setSaving(true);
    try {
      const res = await api.patch('/auth/me', data);
      const updated = res.data?.data;
      if (user && accessToken) {
        const newName = `${updated?.firstName ?? data.firstName} ${updated?.lastName ?? data.lastName}`.trim();
        setAuth({ ...user, name: newName }, accessToken);
      }
      toast({ title: 'Profile updated' });
      onClose();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description: err?.response?.data?.message || 'Something went wrong.',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="ep-firstName">First name</Label>
            <Input
              id="ep-firstName"
              {...register('firstName', { required: 'First name is required' })}
              placeholder="First name"
            />
            {errors.firstName && (
              <p className="text-xs text-destructive">{errors.firstName.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ep-lastName">Last name</Label>
            <Input
              id="ep-lastName"
              {...register('lastName', { required: 'Last name is required' })}
              placeholder="Last name"
            />
            {errors.lastName && (
              <p className="text-xs text-destructive">{errors.lastName.message}</p>
            )}
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── ProfilePage ──────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const user     = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);

  if (!user) return null;

  const initials = user.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '??';

  const isGymOwner = user.role === 'gym_owner';
  const isTrainer  = user.role === 'trainer';

  return (
    <div className="w-full max-w-2xl space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">My Profile</h1>
        <p className="text-sm text-muted-foreground">
          View your account details and manage settings.
        </p>
      </div>

      {/* Profile card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <Avatar className="h-14 w-14 sm:h-16 sm:w-16 flex-shrink-0">
              <AvatarFallback className="text-lg sm:text-xl font-bold">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <CardTitle className="text-lg sm:text-xl truncate">{user.name}</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                  onClick={() => setEditOpen(true)}
                  title="Edit name"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Badge variant={roleBadgeVariant(user.role)} className="capitalize">
                {roleLabel(user.role)}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <Separator />

        <CardContent className="pt-5 space-y-4">
          {/* Email */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted flex-shrink-0">
              <Mail className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Email address</p>
              <p className="text-sm font-medium truncate">{user.email}</p>
            </div>
          </div>

          {/* Role */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted flex-shrink-0">
              <User className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Role</p>
              <p className="text-sm font-medium capitalize">{roleLabel(user.role)}</p>
            </div>
          </div>

          {/* Tenant — show workspace ID only for non-trainers (trainers see gym name in professional card) */}
          {user.tenantId && !isTrainer && (
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted flex-shrink-0">
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Workspace ID</p>
                <p className="text-sm font-medium font-mono truncate">{user.tenantId}</p>
              </div>
            </div>
          )}

          {/* Permissions count */}
          {(user.permissions?.length ?? 0) > 0 && (
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted flex-shrink-0">
                <Shield className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Permissions</p>
                <p className="text-sm font-medium">{user.permissions?.length ?? 0} granted</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trainer-specific cards */}
      {isTrainer && (
        <>
          <TrainerProfessionalCard />
          <TrainerRatingsCard />
        </>
      )}

      {/* Subscription — gym owner only */}
      {isGymOwner && <SubscriptionCard />}

      {/* Account actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Account settings</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="h-4 w-4" />
            Edit Profile
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => navigate('/settings/change-password')}
          >
            <KeyRound className="h-4 w-4" />
            Change password
          </Button>
          {isGymOwner && (
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => navigate('/settings/pricing')}
            >
              <Sparkles className="h-4 w-4" />
              View plans
            </Button>
          )}
        </CardContent>
      </Card>

      <EditProfileDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        currentName={user.name}
      />
    </div>
  );
}
