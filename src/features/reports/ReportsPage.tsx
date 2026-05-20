import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import PageHeader from '@/components/layout/PageHeader';
import PageShell from '@/components/layout/PageShell';
import DashboardTab from './components/DashboardTab';
import RevenueTab from './components/RevenueTab';
import MembersTab from './components/MembersTab';
// import AttendanceTab from './components/AttendanceTab';
// import TrainersTab from './components/TrainersTab';

export default function ReportsPage() {
  return (
    <PageShell>
      <PageHeader
        title="Reports & Analytics"
        subtitle="Business intelligence across members, revenue, attendance, and trainers"
      />

      <Tabs defaultValue="dashboard">
        <TabsList className="flex-wrap h-auto gap-1 mb-2">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          {/* <TabsTrigger value="attendance">Attendance</TabsTrigger> */}
          {/* <TabsTrigger value="trainers">Trainers</TabsTrigger> */}
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          <DashboardTab />
        </TabsContent>
        <TabsContent value="revenue" className="mt-6">
          <RevenueTab />
        </TabsContent>
        <TabsContent value="members" className="mt-6">
          <MembersTab />
        </TabsContent>
        {/* <TabsContent value="attendance" className="mt-6">
          <AttendanceTab />
        </TabsContent>
        <TabsContent value="trainers" className="mt-6">
          <TrainersTab />
        </TabsContent> */}
      </Tabs>
    </PageShell>
  );
}
