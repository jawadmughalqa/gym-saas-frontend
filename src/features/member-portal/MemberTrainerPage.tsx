import { useState } from 'react';
import { Mail, Phone, User, FileText, Star, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import PageShell from '@/components/layout/PageShell';
import PageHeader from '@/components/layout/PageHeader';
import { toast } from '@/hooks/use-toast';
import {
  useMyTrainer,
  useMySessionNotes,
  useMyTrainerRating,
  useRateMyTrainer,
} from './hooks/use-member-portal';
import { formatDate, formatCurrency } from '@/utils/format';
import { CURRENCY } from '@/config/tenant.config';

// ─── Star picker ──────────────────────────────────────────────────────────────

function StarPicker({
  value,
  onChange,
  readOnly = false,
}: {
  value: number;
  onChange?: (v: number) => void;
  readOnly?: boolean;
}) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          onClick={() => !readOnly && onChange?.(n)}
          onMouseEnter={() => !readOnly && setHovered(n)}
          onMouseLeave={() => !readOnly && setHovered(0)}
          className={`transition-colors ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}
        >
          <Star
            className={`h-6 w-6 ${
              n <= (hovered || value)
                ? 'fill-amber-400 text-amber-400'
                : 'text-muted-foreground/30'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MemberTrainerPage() {
  const { data: trainerData, isLoading, isError, refetch } = useMyTrainer();

  const hasTrainer = !!(trainerData?.trainer && trainerData?.assignment);

  const { data: notesData,  isLoading: notesLoading  } = useMySessionNotes(hasTrainer);
  const { data: ratingData                            } = useMyTrainerRating(hasTrainer);
  const rateTrainer = useRateMyTrainer();

  const [starValue, setStarValue] = useState(0);
  const [review,    setReview   ] = useState('');

  function handleSubmitRating() {
    if (starValue === 0) {
      toast({ variant: 'destructive', title: 'Please select a star rating' });
      return;
    }
    rateTrainer.mutate(
      { rating: starValue, review: review.trim() || undefined },
      {
        onSuccess: () => {
          toast({ title: 'Rating submitted!' });
          setStarValue(0);
          setReview('');
        },
        onError: (err: any) => {
          toast({
            variant: 'destructive',
            title: 'Could not submit rating',
            description: err?.response?.data?.message || 'Something went wrong.',
          });
        },
      },
    );
  }

  if (isLoading) {
    return (
      <PageShell>
        <PageHeader title="My Trainer" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </PageShell>
    );
  }

  if (isError) {
    return (
      <PageShell>
        <PageHeader title="My Trainer" />
        <Card className="border-destructive/30">
          <CardContent className="py-10 flex flex-col items-center gap-3 text-center">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <p className="text-sm text-muted-foreground">Failed to load trainer information.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>Try again</Button>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader title="My Trainer" subtitle="Your personal trainer assignment" />

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
                    {formatCurrency(trainerData.assignment!.monthlyCharge, CURRENCY)}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Rate your trainer */}
          {ratingData && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  Rate Your Trainer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {ratingData.canRateThisMonth ? (
                  <>
                    {ratingData.rating != null && (
                      <p className="text-xs text-muted-foreground">
                        Your current rating: {ratingData.rating}/5. You can update it this month.
                      </p>
                    )}
                    <StarPicker value={starValue} onChange={setStarValue} />
                    <Textarea
                      placeholder="Leave an optional review…"
                      value={review}
                      onChange={(e) => setReview(e.target.value)}
                      rows={3}
                      className="resize-none text-sm"
                    />
                    <Button
                      size="sm"
                      onClick={handleSubmitRating}
                      disabled={rateTrainer.isPending || starValue === 0}
                    >
                      {rateTrainer.isPending ? 'Submitting…' : ratingData.rating != null ? 'Update Rating' : 'Submit Rating'}
                    </Button>
                  </>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      You rated your trainer this month.
                    </p>
                    <StarPicker value={ratingData.rating ?? 0} readOnly />
                    {ratingData.review && (
                      <p className="text-sm italic text-muted-foreground">"{ratingData.review}"</p>
                    )}
                    {ratingData.nextRatingDate && (
                      <p className="text-xs text-muted-foreground">
                        Next rating available:{' '}
                        <span className="font-medium text-foreground">
                          {formatDate(ratingData.nextRatingDate)}
                        </span>
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Session Notes from trainer */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Session Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {notesLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
                </div>
              ) : !notesData?.notes?.length ? (
                <p className="text-sm text-muted-foreground italic">
                  No session notes shared with you yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {notesData.notes.map((note) => (
                    <div
                      key={note._id}
                      className="rounded-lg border p-3 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium text-muted-foreground">
                          {formatDate(note.sessionDate)}
                        </p>
                        {note.durationMinutes != null && (
                          <Badge variant="outline" className="text-xs">
                            {note.durationMinutes} min
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm leading-relaxed">{note.content}</p>
                      {note.tags && note.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {note.tags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </PageShell>
  );
}
