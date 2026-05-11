import { Mail, Phone, Calendar, MapPin } from 'lucide-react';
import { Badge }                          from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton }       from '@/components/ui/skeleton';
import { MemberStatusPanel } from '@/features/members/components/MemberStatusPanel';
import { formatDate }     from '@/utils/format';
import {
  useGetMembersMemberId,
} from '@/api/generated/members/members';

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
                  {member.branchId}
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
    </div>
  );
}