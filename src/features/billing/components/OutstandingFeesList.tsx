import { CheckCircle2, CreditCard, ChevronDown, ChevronUp, Ban } from 'lucide-react';
import { useState } from 'react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useTenantCurrency } from '@/hooks/use-tenant-currency';
import { Checkbox } from '@/components/ui/checkbox';
import { StatusBadge } from './StatusBadge';
import { cn } from '@/lib/utils';

export interface OutstandingLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  type: string;
  discountAmount?: number; // per-line discount in currency
  subtotal?: number;       // unitPrice × quantity before discount
}

export interface OutstandingInvoice {
  _id: string;
  invoiceNumber: string;
  status: string;
  amountDue: number;
  amountPaid: number;
  total: number;
  subtotal?: number;       // pre-discount total
  discountTotal?: number;  // sum of all line discounts
  currency: string;
  dueDate?: string;
  lineItems?: OutstandingLineItem[];
}

interface OutstandingFeesListProps {
  invoices: OutstandingInvoice[];
  /** ID of the invoice currently open in the payment form */
  activeInvoiceId?: string | null;
  /** Called when the user clicks "Collect" on a single invoice */
  onCollect?: (invoiceId: string) => void;
  /** Multi-select mode: selected invoice IDs */
  selectedIds?: Set<string>;
  /** Called when a checkbox is toggled */
  onToggleSelect?: (invoiceId: string) => void;
  /** Called when "Pay Selected" is clicked */
  onPaySelected?: (invoiceIds: string[]) => void;
  /** Called when the user clicks the void button on an invoice */
  onVoid?: (invoiceId: string) => void;
}

export function OutstandingFeesList({
  invoices,
  activeInvoiceId,
  onCollect,
  selectedIds,
  onToggleSelect,
  onPaySelected,
  onVoid,
}: OutstandingFeesListProps) {
  const { currency: tenantCurrency } = useTenantCurrency();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  if (invoices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
        <CheckCircle2 className="w-10 h-10 text-emerald-500" />
        <p className="text-sm font-medium">All fees paid</p>
        <p className="text-xs text-muted-foreground">No outstanding dues</p>
      </div>
    );
  }

  const multiSelectMode = !!(selectedIds && onToggleSelect);
  const selectedCount = selectedIds?.size ?? 0;
  const selectedTotal = invoices
    .filter((inv) => selectedIds?.has(inv._id))
    .reduce((sum, inv) => sum + inv.amountDue, 0);

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
          Outstanding Fees
        </p>
        {multiSelectMode && selectedCount > 0 && onPaySelected && (
          <Button
            size="sm"
            className="h-7 text-xs"
            onClick={() => onPaySelected(Array.from(selectedIds!))}
          >
            <CreditCard className="h-3 w-3 mr-1.5" />
            Pay {selectedCount} Selected ({formatCurrency(selectedTotal, invoices[0]?.currency || tenantCurrency)})
          </Button>
        )}
      </div>

      {invoices.map((invoice) => {
        const isActive = activeInvoiceId === invoice._id;
        const isSelected = selectedIds?.has(invoice._id) ?? false;
        const isExpanded = expandedIds.has(invoice._id);
        const lineItems = invoice.lineItems ?? [];
        const hasMultipleItems = lineItems.length > 1;

        // Primary label: if single item use its description; if multiple items summarise
        const primaryLabel =
          lineItems.length === 1
            ? (lineItems[0]?.description || 'Invoice')
            : lineItems.length > 1
              ? `${lineItems.length} items`
              : 'Invoice';

        const isPartiallyPaid = invoice.amountPaid > 0 && invoice.amountDue > 0;

        return (
          <div
            key={invoice._id}
            className={cn(
              'border rounded-lg transition-colors',
              isActive ? 'border-primary/40 bg-primary/5' : '',
              isSelected ? 'border-primary/60 bg-primary/5' : 'hover:bg-muted/30',
            )}
          >
            {/* Main invoice row */}
            <div className="flex items-start gap-2 p-3">
              {/* Multi-select checkbox */}
              {multiSelectMode && (
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => onToggleSelect!(invoice._id)}
                  className="mt-0.5 shrink-0"
                />
              )}

              {/* Left: invoice details */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium truncate">{primaryLabel}</p>
                  <StatusBadge status={invoice.status} />
                </div>
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  {invoice.invoiceNumber}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Due: {invoice.dueDate ? formatDate(invoice.dueDate) : 'No due date'}
                </p>
                {(invoice.discountTotal ?? 0) > 0 && (
                  <p className="text-xs text-emerald-600 font-medium mt-0.5">
                    Discount: −{formatCurrency(invoice.discountTotal!, invoice.currency || tenantCurrency)}
                  </p>
                )}
                {isPartiallyPaid && (
                  <p className="text-xs text-orange-600 mt-0.5">
                    Paid: {formatCurrency(invoice.amountPaid, invoice.currency || tenantCurrency)} —{' '}
                    Remaining: {formatCurrency(invoice.amountDue, invoice.currency || tenantCurrency)}
                  </p>
                )}
              </div>

              {/* Right: amount + buttons */}
              <div className="ml-2 flex flex-col items-end gap-2 shrink-0">
                {/* Show original price struck through when a discount was applied */}
                {(invoice.discountTotal ?? 0) > 0 && (
                  <p className="text-xs text-muted-foreground line-through">
                    {formatCurrency(invoice.subtotal ?? (invoice.total + (invoice.discountTotal ?? 0)), invoice.currency || tenantCurrency)}
                  </p>
                )}
                <p className="font-semibold text-red-600">
                  {formatCurrency(invoice.amountDue, invoice.currency || tenantCurrency)}
                </p>
                <div className="flex items-center gap-1">
                  {hasMultipleItems && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs px-1.5"
                      onClick={() => toggleExpand(invoice._id)}
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                    </Button>
                  )}
                  {onCollect && !multiSelectMode && (
                    <Button
                      variant={isActive ? 'default' : 'outline'}
                      size="sm"
                      className="h-6 text-xs px-2"
                      onClick={() => onCollect(invoice._id)}
                    >
                      <CreditCard className="h-3 w-3 mr-1" />
                      {isActive ? 'Cancel' : 'Collect'}
                    </Button>
                  )}
                  {onVoid && invoice.amountPaid === 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs px-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => onVoid(invoice._id)}
                      title="Void invoice"
                    >
                      <Ban className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Expanded line items breakdown */}
            {(isExpanded || lineItems.length === 1) && lineItems.length > 0 && (
              <div className="px-3 pb-3 pt-0 border-t mx-3 mb-3">
                <div className="space-y-1.5 pt-2">
                  {lineItems.map((item, idx) => {
                    const originalTotal = item.subtotal ?? item.unitPrice * item.quantity;
                    const lineDiscount = item.discountAmount ?? 0;
                    const lineTotal = item.total ?? (originalTotal - lineDiscount);
                    return (
                      <div key={idx} className="text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground truncate flex-1 mr-2">
                            {item.description || 'Item'}
                            {item.quantity > 1 && (
                              <span className="ml-1 text-muted-foreground/70">×{item.quantity}</span>
                            )}
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="font-medium">
                              {formatCurrency(lineTotal, invoice.currency || tenantCurrency)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {/* Invoice-level discount summary row */}
                  {(invoice.discountTotal ?? 0) > 0 && lineItems.length > 1 && (
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-dashed">
                      <span className="text-emerald-600 font-medium">Total Discount</span>
                      <span className="text-emerald-600 font-medium">
                        −{formatCurrency(invoice.discountTotal!, invoice.currency || tenantCurrency)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
