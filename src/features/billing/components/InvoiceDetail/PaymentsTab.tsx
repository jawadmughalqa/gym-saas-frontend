import { useState } from 'react';
import { CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { CardSkeleton } from '@/components/ui/skeleton';
import EmptyState from '@/components/shared/EmptyState';
import { usePermission } from '@/hooks/use-permission';
import { formatDate, formatCurrency } from '@/utils/format';
import { useGetPayments } from '@/api/generated/payments/payments';
import type { Invoice } from '@/types/billing.types';
import RecordPaymentDialog from './RecordPaymentDialog';

const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash', card: 'Card', bank_transfer: 'Bank Transfer',
  cheque: 'Cheque', online: 'Online', other: 'Other',
};

export default function PaymentsTab({ invoice }: { invoice: Invoice }) {
  const { can } = usePermission();
  const [payOpen, setPayOpen] = useState(false);

  const { data: paymentsData, isLoading } = useGetPayments(
    { invoiceId: invoice._id, limit: 50 },
    { query: { staleTime: 1000 * 30 } },
  );
  const payments: any[] = (paymentsData as any)?.data ?? [];

  if (isLoading) return <CardSkeleton />;

  return (
    <div className="space-y-4">
      {can('payment.create') && ['issued', 'partially_paid', 'overdue'].includes(invoice.status) && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setPayOpen(true)}>
            <CreditCard className="mr-2 h-4 w-4" />
            Record Payment
          </Button>
        </div>
      )}

      {payments.length === 0 ? (
        <EmptyState
          icon={<CreditCard className="h-10 w-10" />}
          title="No payments yet"
          description="Payments recorded against this invoice will appear here."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Date</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Method</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Reference</th>
                    <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Charged</th>
                    <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Refunded</th>
                    <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Net</th>
                    <th className="px-4 py-2.5 text-center font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {payments.map((p: any) => {
                    const totalRefunded: number = p.totalRefunded ?? 0;
                    const netAmount: number     = p.netAmount ?? p.amount;
                    const statusVariant =
                      p.status === 'completed'           ? 'success'
                      : p.status === 'partially_refunded' ? 'secondary'
                      : p.status === 'refunded'           ? 'destructive'
                      : p.status === 'failed'             ? 'destructive'
                      : 'outline';
                    const statusLabel =
                      p.status === 'partially_refunded' ? 'Partial Refund'
                      : p.status === 'refunded'         ? 'Refunded'
                      : p.status === 'completed'        ? 'Completed'
                      : p.status;
                    return (
                      <tr key={p._id} className="hover:bg-muted/20">
                        <td className="px-4 py-3 text-muted-foreground">{formatDate(p.paidAt ?? p.createdAt)}</td>
                        <td className="px-4 py-3 capitalize">{METHOD_LABELS[p.method] ?? p.method}</td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.reference ?? '—'}</td>
                        <td className="px-4 py-3 text-right font-semibold text-green-700">
                          {formatCurrency(p.amount, invoice.currency)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {totalRefunded > 0 ? (
                            <span className="font-semibold text-red-600">
                              -{formatCurrency(totalRefunded, invoice.currency)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">
                          {formatCurrency(netAmount, invoice.currency)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={statusVariant as any}>{statusLabel}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <RecordPaymentDialog
        invoiceId={invoice._id}
        currency={invoice.currency}
        amountDue={invoice.amountDue}
        open={payOpen}
        onOpenChange={setPayOpen}
      />
    </div>
  );
}
