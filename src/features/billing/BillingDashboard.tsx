import { useState } from 'react';
import { DollarSign, Clock, TrendingUp, Users, AlertCircle, Wallet, Plus } from 'lucide-react';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import PageShell from '@/components/layout/PageShell';
import PageHeader from '@/components/layout/PageHeader';
import { useGetInvoices } from '@/api/generated/invoices/invoices';
import { useGetPayments } from '@/api/generated/payments/payments';
import { MetricCard } from './components/MetricCard';
import { MemberList } from './components/MemberList';
import { MemberBillingDialog } from './components/MemberBillingDialog';
import { RecentTransactions } from './components/RecentTransactions';
import type { Member } from '@/types/member.types';

function MetricCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-2">
            <Skeleton className="w-20 h-3" />
            <Skeleton className="h-7 w-28" />
          </div>
          <Skeleton className="w-8 h-8 rounded-lg" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function BillingDashboard() {
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  const { data: invoicesData, isLoading: invoicesLoading } = useGetInvoices(
    { limit: 100 },
    { query: { staleTime: 1000 * 30, refetchOnWindowFocus: false } }
  );

  const { data: paymentsData, isLoading: paymentsLoading } = useGetPayments(
    { limit: 100 },
    { query: { staleTime: 1000 * 30, refetchOnWindowFocus: false } }
  );

  const invoices = invoicesData?.data ?? [];
  const payments = paymentsData?.data ?? [];

  const totalRevenue = payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
  const pendingFees = invoices.reduce((sum: number, inv: any) => {
    if (inv.status !== 'paid' && inv.status !== 'void') {
      return sum + (inv.amountDue || 0);
    }
    return sum;
  }, 0);

  const todayCollection = payments
    .filter((p: any) => new Date(p.paidAt).toDateString() === new Date().toDateString())
    .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

  const isLoading = invoicesLoading || paymentsLoading;

  const handleSelectMember = (member: Member) => {
    setSelectedMember(member);
    setShowPaymentDialog(true);
  };

  return (
    <>
      <PageShell>
        <PageHeader
          title="Billing Dashboard"
          subtitle="Manage member payments, track revenue, and collect fees"
          actions={
            <Button variant="outline" onClick={() => window.location.href = '/billing/invoices'}>
              <Plus className="w-4 h-4 mr-2" />
              New Invoice
            </Button>
          }
        />

        {/* Metrics Row */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <MetricCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-3">
            <MetricCard
              title="Total Revenue"
              value={totalRevenue}
              icon={DollarSign}
              variant="success"
            />
            <MetricCard
              title="Pending Fees"
              value={pendingFees}
              icon={Clock}
              variant="warning"
              subtitle={`${invoices.filter((i: any) => i.status !== 'paid').length} invoices`}
            />
            <MetricCard
              title="Today's Collection"
              value={todayCollection}
              icon={TrendingUp}
              variant="info"
            />
          </div>
        )}

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Members List */}
          <Card className="lg:col-span-2">
            <CardTitle className="px-5 py-3 text-sm font-semibold border-b">
              Members
            </CardTitle>
            <CardContent className="p-3">
              <MemberList onSelectMember={handleSelectMember} selectedMemberId={selectedMember?._id} />
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card>
            <CardTitle className="px-5 py-3 text-sm font-semibold border-b">
              Recent Transactions
            </CardTitle>
            <CardContent className="p-0">
              <RecentTransactions />
            </CardContent>
          </Card>
        </div>
      </PageShell>

      {/* Member Billing Dialog */}
      <MemberBillingDialog
        member={selectedMember}
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
      />
    </>
  );
}