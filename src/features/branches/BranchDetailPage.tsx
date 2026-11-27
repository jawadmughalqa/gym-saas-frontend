import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe,
  Users,
  Crown,
  BadgeCheck,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import PageShell from "@/components/layout/PageShell";
import DataTable, { type ColumnDef } from "@/components/shared/DataTable";
import Pagination from "@/components/shared/Pagination";
import EmptyState from "@/components/shared/EmptyState";
import { useGetBranchesBranchId } from "@/api/generated/branches/branches";
import { useGetMembers } from "@/api/generated/members/members";
import BranchForm from "./components/BranchForm";
import ShiftManagement from "./components/ShiftManagement";
import { usePlanFeatures } from "@/hooks/use-plan-features";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status?: string }) {
  if (status === "active")
    return <Badge className="bg-green-600 hover:bg-green-700">Active</Badge>;
  if (status === "inactive") return <Badge variant="secondary">Inactive</Badge>;
  if (status === "archived") return <Badge variant="outline">Archived</Badge>;
  return <Badge variant="outline">{status ?? "—"}</Badge>;
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value?: string | null;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium break-all">{value}</p>
      </div>
    </div>
  );
}

// ─── BranchDetailPage ─────────────────────────────────────────────────────────

export default function BranchDetailPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const navigate = useNavigate();

  const [editOpen, setEditOpen] = useState(false);
  const [membersPage, setMembersPage] = useState(1);
  const { hasFeature } = usePlanFeatures();

  const { data: branchData, isLoading: branchLoading } = useGetBranchesBranchId(
    branchId!,
    { query: { staleTime: 1000 * 30 } },
  );

  const { data: membersData, isLoading: membersLoading } = useGetMembers(
    { branchId: branchId!, page: membersPage, limit: 20 },
    { query: { staleTime: 1000 * 30, enabled: !!branchId } },
  );

  const branch = branchData?.data;
  const members = (membersData as any)?.data ?? [];
  const membersPagination = (membersData as any)?.pagination;

  if (branchLoading) {
    return (
      <PageShell>
        <div className="space-y-4">
          <div className="h-8 w-64 bg-muted animate-pulse rounded" />
          <div className="h-48 bg-muted animate-pulse rounded-lg" />
        </div>
      </PageShell>
    );
  }

  if (!branch) {
    return (
      <PageShell>
        <EmptyState
          icon={<Building2 className="h-12 w-12" />}
          title="Branch not found"
          description="This branch may have been removed."
          action={{
            label: "Back to Branches",
            onClick: () => navigate("/branches"),
          }}
        />
      </PageShell>
    );
  }

  // ── Member columns ─────────────────────────────────────────────────────────
  const memberColumns: ColumnDef<any>[] = [
    {
      key: "firstName",
      header: "Name",
      cell: (row) => (
        <span className="font-medium">
          {row.firstName} {row.lastName}
        </span>
      ),
    },
    {
      key: "email",
      header: "Email",
      cell: (row) => (
        <span className="text-sm text-muted-foreground">{row.email ?? "—"}</span>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      cell: (row) => (
        <span className="text-sm text-muted-foreground">{row.phone ?? "—"}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <Badge
          variant={row.status === "active" ? "default" : "secondary"}
          className={row.status === "active" ? "bg-green-600 hover:bg-green-700" : ""}
        >
          {row.status ?? "—"}
        </Badge>
      ),
    },
    {
      key: "membershipId",
      header: "Member ID",
      cell: (row) => (
        <span className="text-xs font-mono text-muted-foreground">
          {row.membershipId ?? "—"}
        </span>
      ),
    },
    {
      key: "_id",
      header: "",
      cell: (row) => (
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      ),
    },
  ];

  return (
    <PageShell>
      {/* Back + header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 mt-0.5 shrink-0"
            onClick={() => navigate("/branches")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold">{branch.name}</h1>
              {branch.isHeadquarters && (
                <Badge variant="outline" className="gap-1">
                  <Crown className="h-3 w-3" /> HQ
                </Badge>
              )}
              <StatusBadge status={branch.status} />
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Code: {branch.code}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
          Edit Branch
        </Button>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Details</TabsTrigger>
          <TabsTrigger value="members">
            Members
            {branch.memberCount !== undefined && (
              <Badge variant="secondary" className="ml-1.5 text-xs">
                {branch.memberCount}
              </Badge>
            )}
          </TabsTrigger>
          {hasFeature('shifts') && (
            <TabsTrigger value="shifts">Shifts</TabsTrigger>
          )}
        </TabsList>

        {/* ── Details tab ── */}
        <TabsContent value="info" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Location card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> Location
                </CardTitle>
              </CardHeader>
              <CardContent className="divide-y divide-border">
                {branch.address ? (
                  <div className="py-2 space-y-0.5">
                    {branch.address.street && (
                      <p className="text-sm">{branch.address.street}</p>
                    )}
                    <p className="text-sm">
                      {[
                        branch.address.city,
                        branch.address.state,
                        branch.address.postalCode,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                    <p className="text-sm font-medium">
                      {branch.address.country}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-2">
                    No address on file
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Contact card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Phone className="h-4 w-4" /> Contact & Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="divide-y divide-border">
                <InfoRow icon={Phone} label="Phone" value={branch.phone} />
                <InfoRow icon={Mail} label="Email" value={branch.email} />
                <InfoRow
                  icon={Globe}
                  label="Timezone"
                  value={branch.timezone}
                />
              </CardContent>
            </Card>

            {/* Stats card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Users className="h-4 w-4" /> Stats
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-3xl font-bold">
                      {branch.memberCount ?? 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Members</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-3xl font-bold">
                      {branch.trainerCount ?? 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Trainers</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Managers card */}
            {branchData?.data?.managers &&
              branchData.data.managers.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <BadgeCheck className="h-4 w-4" /> Managers
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {branchData.data.managers.map((m) => (
                      <div key={m._id} className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                          {m.firstName?.[0]}
                          {m.lastName?.[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {m.firstName} {m.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {m.email}
                          </p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
          </div>
        </TabsContent>

        {/* ── Members tab ── */}
        <TabsContent value="members" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Members registered at this branch
            </p>
          </div>

          <Separator />

          {!membersLoading && members.length === 0 ? (
            <EmptyState
              icon={<Users className="h-12 w-12" />}
              title="No members yet"
              description="Members registered at this branch will appear here."
            />
          ) : (
            <DataTable
              columns={memberColumns}
              data={members}
              keyExtractor={(row) => row._id ?? ""}
              loading={membersLoading}
              onRowClick={(row) => navigate(`/members/${row._id}`)}
            />
          )}

          {membersPagination && members.length > 0 && (
            <Pagination meta={membersPagination} onPageChange={setMembersPage} />
          )}
        </TabsContent>

        {/* ── Shifts tab ── */}
        {hasFeature('shifts') && (
          <TabsContent value="shifts" className="mt-4">
            <ShiftManagement branchId={branchId!} />
          </TabsContent>
        )}
      </Tabs>

      {/* Edit form */}
      <BranchForm open={editOpen} onOpenChange={setEditOpen} branch={branch} />
    </PageShell>
  );
}
