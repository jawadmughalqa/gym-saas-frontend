import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, User, Users, FileText, Edit, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DetailHeaderSkeleton, CardSkeleton } from "@/components/ui/skeleton";
import PageShell from "@/components/layout/PageShell";
import { usePermission } from "@/hooks/use-permission";
import { useGetTrainersTrainerId } from "@/api/generated/trainers/trainers";
import TrainerForm from "./components/TrainerForm";
import ProfileTab from "./components/TrainerDetail/ProfileTab";
import AssignmentsTab from "./components/TrainerDetail/AssignmentsTab";
import NotesTab from "./components/TrainerDetail/NotesTab";

// ─── Status badge variant map ─────────────────────────────────────────────────

const STATUS_VARIANT: Record<string, "success" | "secondary" | "warning"> = {
  active: "success",
  inactive: "secondary",
  on_leave: "warning",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TrainerDetailPage() {
  const { trainerId } = useParams<{ trainerId: string }>();
  const navigate = useNavigate();
  const { can } = usePermission();
  const [editOpen, setEditOpen] = useState(false);

  const { data: trainerData, isLoading } = useGetTrainersTrainerId(trainerId ?? "");
  const trainer = trainerData?.data;

  if (isLoading) {
    return (
      <PageShell>
        <DetailHeaderSkeleton />
        <CardSkeleton />
      </PageShell>
    );
  }

  if (!trainer) {
    return (
      <PageShell>
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Trainer not found</h2>
          <Button variant="outline" onClick={() => navigate("/trainers")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Trainers
          </Button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex items-start gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="-ml-2 mt-0.5"
          onClick={() => navigate("/trainers")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">
                {trainer.userId?.firstName} {trainer.userId?.lastName}
              </h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant={STATUS_VARIANT[trainer.status ?? "inactive"]}>
                  {trainer.status === "on_leave"
                    ? "On Leave"
                    : (trainer.status?.charAt(0).toUpperCase() ?? "") +
                      (trainer.status?.slice(1) ?? "")}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {trainer.userId?.email}
                </span>
              </div>
            </div>

            {can("trainer.update") && (
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Profile
              </Button>
            )}
          </div>
        </div>
      </div>

      <Separator />

      {/* ── Tabs ─────────────────────────────────────────────────────── */}
      <Tabs defaultValue="profile">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="profile" className="flex items-center gap-1.5">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="assignments" className="flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Assignments</span>
          </TabsTrigger>
          <TabsTrigger value="notes" className="flex items-center gap-1.5">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Session Notes</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          <ProfileTab trainerId={trainer._id!} />
        </TabsContent>
        <TabsContent value="assignments" className="mt-4">
          <AssignmentsTab trainerId={trainer._id!} />
        </TabsContent>
        <TabsContent value="notes" className="mt-4">
          <NotesTab trainerId={trainer._id!} />
        </TabsContent>
      </Tabs>

      <TrainerForm open={editOpen} onOpenChange={setEditOpen} trainer={trainer as any} />
    </PageShell>
  );
}
