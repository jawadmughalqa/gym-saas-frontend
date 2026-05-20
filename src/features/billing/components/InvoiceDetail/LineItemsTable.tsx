import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/utils/format';
import type { InvoiceLineItem } from '@/types/billing.types';

export default function LineItemsTable({ items, currency }: { items: InvoiceLineItem[]; currency: string }) {
  const subtotal      = items.reduce((s, li) => s + li.unitPrice * li.quantity, 0);
  const discountTotal = items.reduce((s, li) => s + (li.discountAmount ?? 0), 0);
  const taxTotal      = items.reduce((s, li) => s + (li.taxAmount ?? 0), 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Line Items
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Description</th>
                <th className="px-4 py-2.5 text-center font-medium text-muted-foreground w-16">Qty</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground w-28">Unit Price</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground w-28">Discount</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground w-28">Tax</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground w-28">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((li, i) => {
                const lineTotal = li.unitPrice * li.quantity - (li.discountAmount ?? 0) + (li.taxAmount ?? 0);
                return (
                  <tr key={i} className="hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <p className="font-medium">{li.description}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {li.type.replace(/_/g, ' ')}
                        {li.planSnapshotName && ` · ${li.planSnapshotName}`}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-center text-muted-foreground">{li.quantity}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(li.unitPrice, currency)}</td>
                    <td className="px-4 py-3 text-right text-orange-600">
                      {(li.discountAmount ?? 0) > 0 ? `-${formatCurrency(li.discountAmount!, currency)}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {(li.taxAmount ?? 0) > 0 ? formatCurrency(li.taxAmount!, currency) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">{formatCurrency(lineTotal, currency)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="border-t px-4 py-3 space-y-1.5 bg-muted/10">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal, currency)}</span>
          </div>
          {discountTotal > 0 && (
            <div className="flex justify-between text-sm text-orange-600">
              <span>Total Discount</span>
              <span>-{formatCurrency(discountTotal, currency)}</span>
            </div>
          )}
          {taxTotal > 0 && (
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Total Tax</span>
              <span>{formatCurrency(taxTotal, currency)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold pt-1 border-t">
            <span>Grand Total</span>
            <span>
              {formatCurrency(
                items.reduce((s, li) => s + (li.total ?? li.unitPrice * li.quantity - (li.discountAmount ?? 0) + (li.taxAmount ?? 0)), 0),
                currency,
              )}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
