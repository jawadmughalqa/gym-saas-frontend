import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CardSkeleton } from "@/components/ui/skeleton";
import { useGetTrainersTrainerId } from "@/api/generated/trainers/trainers";
import { useGetBranches } from "@/api/generated/branches/branches";
import Stars from "./Stars";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function ProfileTab({ trainerId }: { trainerId: string }) {
  const { data, isLoading } = useGetTrainersTrainerId(trainerId);
  const trainer = data?.data;

  const { data: branchesData } = useGetBranches({ limit: 100 });
  const allBranches = branchesData?.data ?? [];

  const trainerBranches = allBranches.filter((branch) =>
    trainer?.branchIds?.includes(branch._id!),
  );

  if (isLoading) return <CardSkeleton />;
  if (!trainer) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Details Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Assigned Branches
            </p>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {trainerBranches.length > 0 ? (
                trainerBranches.map((branch) => (
                  <Badge key={branch._id} variant="outline" className="text-xs">
                    {branch.name}
                    {branch.isHeadquarters && (
                      <span className="ml-1 text-primary">(HQ)</span>
                    )}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No branches assigned
                </p>
              )}
            </div>
          </div>

          {trainer.bio && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Bio
              </p>
              <p className="text-sm mt-1">{trainer.bio}</p>
            </div>
          )}

          {trainer.experienceYears != null && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Experience
              </p>
              <p className="text-sm font-medium">
                {trainer.experienceYears} year
                {trainer.experienceYears !== 1 ? "s" : ""}
              </p>
            </div>
          )}

          {trainer.hourlyRate != null && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Monthly Rate
              </p>
              <p className="text-sm font-medium">
                {trainer.currency} {trainer.hourlyRate}/month
              </p>
            </div>
          )}

          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Client Capacity
            </p>
            <p className="text-sm font-medium">
              {trainer.currentClientCount} / {trainer.maxClients} clients
            </p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Rating
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <Stars value={Math.round(trainer.ratingAvg ?? 0)} />
              <span className="text-sm text-muted-foreground">
                {(trainer.ratingAvg ?? 0) > 0
                  ? `${trainer.ratingAvg!.toFixed(1)} (${trainer.ratingCount})`
                  : "No ratings yet"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Skills & Certifications Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Skills & Certifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
              Specializations
            </p>
            {(trainer.specializations?.length ?? 0) > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {trainer.specializations!.map((s) => (
                  <Badge key={s} variant="secondary" className="capitalize">
                    {s}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">None listed</p>
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
              Certifications
            </p>
            {(trainer.certifications?.length ?? 0) > 0 ? (
              <ul className="space-y-1">
                {trainer.certifications!.map((c) => (
                  <li key={c} className="text-sm flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                    {c}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground italic">None listed</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Availability Card */}
      <Card className="md:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Weekly Availability
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(trainer.availability?.length ?? 0) > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {trainer.availability!.map((slot, i) => (
                <div key={i} className="rounded-md border px-3 py-2 text-sm">
                  <p className="font-medium">{DAY_NAMES[slot.day]}</p>
                  <p className="text-xs text-muted-foreground">
                    {slot.startTime} – {slot.endTime}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              No availability set.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
