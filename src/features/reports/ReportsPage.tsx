import { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import PageHeader from '@/components/layout/PageHeader';
import PageShell from '@/components/layout/PageShell';
import { useGetBranches } from '@/api/generated/branches/branches';
import { useAuthStore } from '@/stores/auth.store';
import DashboardTab from './components/DashboardTab';
import RevenueTab from './components/RevenueTab';
import MembersTab from './components/MembersTab';
// import AttendanceTab from './components/AttendanceTab';
// import TrainersTab from './components/TrainersTab';

export default function ReportsPage() {
  const user = useAuthStore((s) => s.user);
  const isBranchManager = user?.role === 'branch_manager';

  const [branchId, setBranchId] = useState('all');

  // useGetBranches is already scoped server-side to the BM's assigned branches
  const { data: branchesData } = useGetBranches({ limit: 100 });
  const branches = branchesData?.data ?? [];

  // Auto-select first branch for BMs — they don't get an "All branches" option
  useEffect(() => {
    if (isBranchManager && branches.length > 0 && branchId === 'all') {
      setBranchId(branches[0]._id ?? 'all');
    }
  }, [isBranchManager, branches]);

  const activeBranchId = branchId !== 'all' ? branchId : undefined;

  return (
    <PageShell>
      <PageHeader
        title="Reports & Analytics"
        subtitle="Business intelligence across members, revenue, attendance, and trainers"
      />

      <Tabs defaultValue="dashboard">
        {/* ── Tab bar + branch selector row ── */}
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
            {/* <TabsTrigger value="attendance">Attendance</TabsTrigger> */}
            {/* <TabsTrigger value="trainers">Trainers</TabsTrigger> */}
          </TabsList>

          {/* Branch selector — hidden for BMs (they only have one branch and it's pre-selected) */}
          {branches.length > 0 && !isBranchManager && (
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger className="h-8 w-44 text-sm ml-auto">
                <SelectValue placeholder="All branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All branches</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b._id} value={b._id ?? ''}>{(b as any).name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <TabsContent value="dashboard" className="mt-6">
          <DashboardTab branchId={activeBranchId} />
        </TabsContent>
        <TabsContent value="revenue" className="mt-6">
          <RevenueTab branchId={activeBranchId} />
        </TabsContent>
        <TabsContent value="members" className="mt-6">
          <MembersTab branchId={activeBranchId} />
        </TabsContent>
        {/* <TabsContent value="attendance" className="mt-6">
          <AttendanceTab branchId={activeBranchId} />
        </TabsContent>
        <TabsContent value="trainers" className="mt-6">
          <TrainersTab branchId={activeBranchId} />
        </TabsContent> */}
      </Tabs>
    </PageShell>
  );
}
