import { useState } from 'react';
import { Mail, Phone, Calendar, MapPin, KeyRound, RefreshCw, Eye, EyeOff, Wallet, ArrowDownToLine, Copy, Check } from 'lucide-react';
import { Button }  from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { MemberStatusPanel } from '@/features/members/components/MemberStatusPanel';
import { formatDate, formatCurrency } from '@/utils/format';
import { CURRENCY } from '@/config/tenant.config';
import { useToast }   from '@/hooks/use-toast';
import { api }        from '@/lib/axios';
import { useQuery, useQueryClient }   from '@tanstack/react-query';
import {
  useGetMembersMemberId,
  getGetMembersMemberIdQueryKey,
} from '@/api/generated/members/members';
import { WalletPayoutDialog } from './WalletPayoutDialog';
import { usePermission } from '@/hooks/use-permission';

// ─── Login credentials fetch ──────────────────────────────────────────────────

interface LoginCredentials {
  loginEmail: string;
  tempPassword: string | null;
  hasSetPassword: boolean;
}

function useLoginCredentials(memberId: string) {
  return useQuery<LoginCredentials>({
    queryKey: ['member-login-credentials', memberId],
    queryFn: async () => {
      const res = await api.get<{ data: LoginCredentials }>(`/members/${memberId}/login-credentials`);
      return res.data.data;
    },
    staleTime: 1000 * 30,
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground uppercase tracking-wide">
        {label}
      </span>
      <span className="text-sm">{value}</span>
    </div>
  );
}

const GENDER_LABEL: Record<string, string> = {
  male:              'Male',
  female:            'Female',
  other:             'Other',
  prefer_not_to_say: 'Prefer not to say',
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface ProfileTabProps {
  memberId: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProfileTab({ memberId }: ProfileTabProps) {
  const { data: response, isLoading } = useGetMembersMemberId(memberId, {
    query: { staleTime: 0 },
  });
  const member = response?.data;
  const { toast } = useToast();
  const { can } = usePermission();
  const queryClient = useQueryClient();

  const [resending,  setResending]  = useState(false);
  const [revealed,   setRevealed]   = useState(false);
  const [showPw,     setShowPw]     = useState(false);
  const [copied,     setCopied]     = useState(false);
  const [payoutOpen, setPayoutOpen] = useState(false);

  const {
    data: creds,
    isLoading: credsLoading,
    refetch: refetchCreds,
  } = useLoginCredentials(memberId);

  const handleResendCredentials = async () => {
    setResending(true);
    try {
      await api.post(`/members/${memberId}/resend-credentials`);
      toast({ title: 'Credentials sent', description: 'New login credentials emailed to the member.' });
      void refetchCreds();
    } catch {
      toast({ variant: 'destructive', title: 'Failed', description: 'Could not resend credentials. Try again.' });
    } finally {
      setResending(false);
    }
  };

  const copyText = (text: string) => {
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!member) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2">

      {/* Status panel — full width */}
      <div className="md:col-span-2">
        <MemberStatusPanel
          member={member as Parameters<typeof MemberStatusPanel>[0]['member']}
        />
      </div>

      {/* Wallet credit balance */}
      {((member as typeof member & { walletBalance?: number }).walletBalance ?? 0) > 0 && (
        <div className="md:col-span-2">
          <Card className="border-emerald-500/25 bg-emerald-500/10">
            <CardContent className="flex flex-wrap items-center gap-3 py-3 px-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/15 shrink-0">
                <Wallet className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-emerald-500 font-medium uppercase tracking-wide">Wallet Credit</p>
                <p className="text-lg font-bold text-emerald-500 leading-tight">
                  {formatCurrency(
                    (member as typeof member & { walletBalance?: number }).walletBalance!,
                    CURRENCY,
                  )}
                </p>
              </div>
              <p className="text-xs text-emerald-600 leading-snug flex-1 min-w-[120px]">
                Credited from prorated subscription cancellation
              </p>
              {can('member.update') && (
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 border-emerald-300 text-emerald-500 hover:bg-emerald-500/15 hover:text-emerald-500"
                  onClick={() => setPayoutOpen(true)}
                >
                  <ArrowDownToLine className="h-3.5 w-3.5 mr-1.5" />
                  Pay Out
                </Button>
              )}
            </CardContent>
          </Card>

          {payoutOpen && (
            <WalletPayoutDialog
              open={payoutOpen}
              onOpenChange={setPayoutOpen}
              memberId={memberId}
              walletBalance={(member as typeof member & { walletBalance?: number }).walletBalance!}
              onSuccess={() => {
                void queryClient.invalidateQueries({
                  queryKey: getGetMembersMemberIdQueryKey(memberId),
                });
              }}
            />
          )}
        </div>
      )}

      {/* Personal info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <InfoRow
            label="Full Name"
            value={`${member.firstName ?? ''} ${member.lastName ?? ''}`.trim()}
          />
          <InfoRow
            label="Email"
            value={
              member.email ? (
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  {member.email}
                </span>
              ) : undefined
            }
          />
          <InfoRow
            label="Phone"
            value={
              member.phone ? (
                <span className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  {member.phone}
                </span>
              ) : undefined
            }
          />
          <InfoRow
            label="Date of Birth"
            value={(member as any).dateOfBirth ? formatDate((member as any).dateOfBirth) : undefined}
          />
          <InfoRow
            label="Age"
            value={(member as any).age != null ? `${(member as any).age} years` : undefined}
          />
          <InfoRow
            label="Gender"
            value={member.gender ? GENDER_LABEL[member.gender] : undefined}
          />
          <InfoRow
            label="Joined"
            value={
              member.joinedAt ? (
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  {formatDate(member.joinedAt)}
                </span>
              ) : undefined
            }
          />
          <InfoRow
            label="Branch"
            value={
              member.branchId ? (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  {typeof member.branchId === 'object'
                    ? (member.branchId as any).name
                    : member.branchId}
                </span>
              ) : undefined
            }
          />
        </CardContent>
      </Card>

      {/* Emergency contact */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Emergency Contact
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {member.emergencyContact ? (
            <>
              <InfoRow label="Name"         value={member.emergencyContact.name} />
              <InfoRow label="Relationship" value={member.emergencyContact.relationship} />
              <InfoRow
                label="Phone"
                value={
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    {member.emergencyContact.phone}
                  </span>
                }
              />
            </>
          ) : (
            <p className="text-sm text-muted-foreground italic">No emergency contact on file.</p>
          )}
        </CardContent>
      </Card>

      {/* Staff notes */}
      {member.notes && (
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Staff Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{member.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Login Credentials — matches StaffDetailPage design */}
      <Card className="md:col-span-2">
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
              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground"
                onClick={() => { setRevealed(false); setShowPw(false); }}
              >
                <EyeOff className="h-3.5 w-3.5 mr-1.5" />
                Hide
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {!revealed ? (
            <p className="text-sm text-muted-foreground italic">
              Click "Show Credentials" to view this member's login details.
            </p>
          ) : credsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : creds ? (
            <div className="space-y-4">
              {/* Email row */}
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted flex-shrink-0">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Login Email</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-sm font-mono truncate">{creds.loginEmail}</p>
                    <button
                      type="button"
                      onClick={() => copyText(creds.loginEmail)}
                      className="text-muted-foreground hover:text-foreground flex-shrink-0"
                    >
                      {copied
                        ? <Check className="h-3.5 w-3.5 text-green-500" />
                        : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Password row */}
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted flex-shrink-0">
                  <KeyRound className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-0.5">
                    Password
                    {creds.hasSetPassword && (
                      <span className="ml-2 text-xs text-emerald-600 font-medium">✓ Member's own password</span>
                    )}
                    {!creds.hasSetPassword && creds.tempPassword && (
                      <span className="ml-2 text-xs text-amber-600 font-medium">⚠ Must change on first login</span>
                    )}
                  </p>
                  <div className="flex items-center gap-2 rounded bg-muted px-3 py-2 font-mono text-sm">
                    <span className="flex-1 select-all">
                      {showPw
                        ? (creds.tempPassword ?? '(password set by member)')
                        : '••••••••••••'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      className="text-muted-foreground hover:text-foreground flex-shrink-0"
                    >
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    {creds.tempPassword && (
                      <button
                        type="button"
                        onClick={() => copyText(creds.tempPassword!)}
                        className="text-muted-foreground hover:text-foreground flex-shrink-0"
                      >
                        {copied
                          ? <Check className="h-4 w-4 text-green-500" />
                          : <Copy className="h-4 w-4" />}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Resend button */}
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/5"
                onClick={handleResendCredentials}
                disabled={resending}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${resending ? 'animate-spin' : ''}`} />
                {resending ? 'Sending…' : 'Resend Credentials'}
              </Button>
              <p className="text-xs text-muted-foreground">
                Generates a new temporary password, logs the member out of all devices, and emails them the new credentials.
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

    </div>
  );
}
