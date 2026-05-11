import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useGetInvoices } from '@/api/generated/invoices/invoices';
import { useGetMembersMemberId } from '@/api/generated/members/members';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';
import { StatusBadge } from './StatusBadge';
import { OutstandingFeesList } from './OutstandingFeesList';
import { CollectPaymentForm } from './CollectPaymentForm';
import { PaymentHistoryList } from './PaymentHistoryList';
import type { Member } from '@/types/member.types';
import { cn } from '@/lib/utils';

interface MemberBillingDialogProps {
  member: Member | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MemberBillingDialog({ member, open, onOpenChange }: MemberBillingDialogProps) {
  const [transactionCode, setTransactionCode] = useState<string | null>(null);

  const { data: memberData, isLoading: memberLoading } = useGetMembersMemberId(member?._id || '', {
    query: { enabled: !!member?._id && open, staleTime: 5000 },
  });

  const { data: invoicesData, isLoading: invoicesLoading } = useGetInvoices(
    { memberId: member?._id, limit: 50 },
    { query: { enabled: !!member?._id && open, staleTime: 5000 } }
  );

  const invoices = invoicesData?.data ?? [];
  const memberDetails = memberData?.data;

  const outstandingFees = invoices.filter(
    (inv: any) => inv.status !== 'paid' && inv.status !== 'void'
  );

  const totalOutstanding = outstandingFees.reduce(
    (sum: number, inv: any) => sum + (inv.amountDue || 0),
    0
  );

  const isLoading = memberLoading || invoicesLoading;

  if (!member) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0">
        {/* Header */}
        <DialogHeader className="px-5 py-3 border-b shrink-0">
          <DialogTitle className="text-lg">
            {isLoading ? 'Loading...' : `${member.firstName} ${member.lastName}`}
          </DialogTitle>
          <DialogDescription className="text-xs mt-0.5">
            {member.email} · {member.phone}
          </DialogDescription>
        </DialogHeader>

        {/* Body */}
        <ScrollArea className="flex-1 px-5 pb-4 pt-2 max-h-[calc(100vh-130px)]">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="w-full h-20" />
              <Skeleton className="w-full h-40" />
            </div>
          ) : (
            <div className="space-y-5">
              {/* Total Pending Amount */}
              <div
                className={cn(
                  'rounded-md p-3',
                  totalOutstanding > 0
                    ? 'bg-red-50 border border-red-100'
                    : 'bg-emerald-50 border border-emerald-100'
                )}
              >
                <p className="mb-1 text-xs text-muted-foreground">Total Pending Amount</p>
                <p
                  className={cn(
                    'text-xl font-bold',
                    totalOutstanding > 0 ? 'text-red-600' : 'text-emerald-600'
                  )}
                >
                  {formatCurrency(totalOutstanding, 'PKR')}
                </p>
              </div>

              {/* Outstanding Fees */}
              <OutstandingFeesList invoices={outstandingFees} />

              {/* Collect Payment Form */}
              {outstandingFees.length > 0 && (
                <>
                  <Separator />
                  <CollectPaymentForm
                    memberId={member._id}
                    totalDue={totalOutstanding}
                    onSuccess={(code) => setTransactionCode(code)}
                  />
                </>
              )}

              {/* Payment History */}
              <PaymentHistoryList memberId={member._id} onViewReceipt={setTransactionCode} />
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}