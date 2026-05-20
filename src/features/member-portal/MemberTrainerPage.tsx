import { Mail, Phone, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import PageShell from '@/components/layout/PageShell';
import PageHeader from '@/components/layout/PageHeader';
import { useMyTrainer } from './hooks/use-member-portal';
import { formatDate, formatCurrency } from '@/utils/format';

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MemberTrainerPage() {
  const { data: trainerData, isLoading } = useMyTrainer();

  if (isLoading) {
    return (
      <PageShell>
        <PageHeader title="My Trainer" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </PageShell>
    );
  }

  const hasTrainer = trainerData?.trainer && trainerData?.assignment;

  return (
    <PageShell>
      <PageHeader
        title="My Trainer"
        subtitle="Your personal trainer assignment"
      />

      {!hasTrainer ? (
        <Card>
          <CardContent className="py-12 text-center">
            <User className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-sm font-medium">No trainer assigned</p>
            <p className="text-muted-foreground text-xs mt-1">
              Contact your gym to get a personal trainer assigned to you.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Trainer info card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Trainer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h3 className="text-lg font-semibold">
                  {trainerData.trainer!.firstName} {trainerData.trainer!.lastName}
                </h3>
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-4 h-4 shrink-0" />
                  <span>{trainerData.trainer!.email}</span>
                </div>
                {trainerData.trainer!.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-4 h-4 shrink-0" />
                    <span>{trainerData.trainer!.phone}</span>
                  </div>
                )}
              </div>
              {trainerData.trainer!.specializations && trainerData.trainer!.specializations.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Specializations</p>
                  <div className="flex flex-wrap gap-1.5">
                    {trainerData.trainer!.specializations.map((spec) => (
                      <Badge key={spec} variant="secondary" className="text-xs">
                        {spec}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {trainerData.trainer!.bio && (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {trainerData.trainer!.bio}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Assignment details card */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Assignment Details</CardTitle>
                <Badge
                  variant={trainerData.assignment!.status === 'active' ? 'default' : 'secondary'}
                  className="capitalize"
                >
                  {trainerData.assignment!.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Assigned Since</span>
                <span>{formatDate(trainerData.assignment!.startDate)}</span>
              </div>
              {trainerData.assignment!.goal && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Goal</span>
                  <span className="text-right max-w-[60%]">{trainerData.assignment!.goal}</span>
                </div>
              )}
              {trainerData.assignment!.sessionFrequencyPerWeek != null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sessions / Week</span>
                  <span>{trainerData.assignment!.sessionFrequencyPerWeek}</span>
                </div>
              )}
              {trainerData.assignment!.monthlyCharge != null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Monthly Charge</span>
                  <span className="font-semibold">
                    {formatCurrency(trainerData.assignment!.monthlyCharge)}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </PageShell>
  );
}
