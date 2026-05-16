import { useState } from 'react';
import { Mail, Phone, Calendar, MapPin, KeyRound, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { Badge }   from '@/components/ui/badge';
import { Button }  from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MemberStatusPanel } from '@/features/members/components/MemberStatusPanel';
import { formatDate } from '@/utils/format';
import { useToast }   from '@/hooks/use-toast';
import { api }        from '@/lib/axios';
import { useQuery }   from '@tanstack/react-query';
import {
  useGetMembersMemberId,
} from '@/api/generated/members/members';

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
    staleTime: 1000 * 30, // 30 s — short so resend refresh picks up quickly
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
  const { data: response, isLoading } = useGetMembersMemberId(memberId);
  const member = response?.data;
  const { toast } = useToast();
  const [resending, setResending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
      void refetchCreds(); // refresh displayed temp password
    } catch {
      toast({ variant: 'destructive', title: 'Failed', description: 'Could not resend credentials. Try again.' });
    } finally {
      setResending(false);
    }
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

      {/* Status panel — full width, always first */}
      <div className="md:col-span-2">
        <MemberStatusPanel
          member={member as Parameters<typeof MemberStatusPanel>[0]['member']}
        />
      </div>

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
            value={member.dateOfBirth ? formatDate(member.dateOfBirth) : undefined}
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
            <p className="text-sm text-muted-foreground italic">
              No emergency contact on file.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Consent & Health */}
      <Card className="md:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Consent & Health
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Badge variant={member.consentMarketing ? 'default' : 'secondary'}>
            Marketing: {member.consentMarketing ? 'Yes' : 'No'}
          </Badge>
          <Badge variant={member.consentDataProcessing ? 'default' : 'secondary'}>
            Data Processing: {member.consentDataProcessing ? 'Yes' : 'No'}
          </Badge>
          {member.waiver && (
            <Badge variant="outline">
              Waiver signed {formatDate(member.waiver.signedAt)}
            </Badge>
          )}
          {member.healthQuestionnaire?.completedAt && (
            <Badge variant="outline">
              Health form completed {formatDate(member.healthQuestionnaire.completedAt)}
            </Badge>
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

      {/* Login Account */}
      <Card className="md:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
            <KeyRound className="h-4 w-4" />
            Login Account (Mobile App)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Email row */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Login Email</p>
            <div className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm font-mono select-all">{member.email}</span>
            </div>
          </div>

          {/* Password row */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Temporary Password</p>
            {credsLoading ? (
              <Skeleton className="h-8 w-40" />
            ) : creds?.hasSetPassword ? (
              <p className="text-sm text-muted-foreground italic">
                Member has set their own password.
              </p>
            ) : creds?.tempPassword ? (
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm select-all">
                  {showPassword ? creds.tempPassword : '••••••••••••'}
                </span>
                <button
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword
                    ? <EyeOff className="h-4 w-4" />
                    : <Eye className="h-4 w-4" />}
                </button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No temporary password on file.</p>
            )}
            {!creds?.hasSetPassword && (
              <p className="text-xs text-muted-foreground mt-1">
                This is the temporary password. The member will be asked to change it on first login. Use <strong>Resend Credentials</strong> to generate a new one.
              </p>
            )}
          </div>

          {/* Resend button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleResendCredentials}
            disabled={resending}
            className="shrink-0"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${resending ? 'animate-spin' : ''}`} />
            {resending ? 'Sending…' : 'Resend Credentials'}
          </Button>

        </CardContent>
      </Card>

    </div>
  );
}