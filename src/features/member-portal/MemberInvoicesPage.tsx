import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import PageShell from '@/components/layout/PageShell';
import PageHeader from '@/components/layout/PageHeader';
import { useMyInvoices } from './hooks/useMemberPortal';
import { formatDate, formatCurrency } from '@/utils/format';
import type { Invoice, InvoiceLineItem } from '@/types/billing.types';

// ─── Status badge helper ──────────────────────────────────────────────────────

function invoiceStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'paid':            return 'default';
    case 'issued':          return 'secondary';
    case 'partially_paid':  return 'outline';
    case 'overdue':         return 'destructive';
    case 'void':            return 'outline';
    default:                return 'outline';
  }
}

// ─── Line items row ───────────────────────────────────────────────────────────

function LineItemRow({ item }: { item: InvoiceLineItem }) {
  return (
    <div className="flex items-center justify-between py-1 text-xs text-muted-foreground">
      <span className="flex-1 truncate">{item.description}</span>
      <span className="ml-4 shrink-0">
        {item.quantity} × {formatCurrency(item.unitPrice)} = {formatCurrency(item.total ?? item.unitPrice * item.quantity)}
      </span>
    </div>
  );
}

// ─── Invoice card ─────────────────────────────────────────────────────────────

function InvoiceCard({ invoice }: { invoice: Invoice }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-sm font-medium leading-tight">
              #{invoice.invoiceNumber}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {invoice.issuedAt ? formatDate(invoice.issuedAt) : formatDate(invoice.createdAt)}
            </p>
          </div>
          <Badge variant={invoiceStatusVariant(invoice.status)} className="shrink-0 capitalize">
            {invoice.status.replace(/_/g, ' ')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="text-sm space-y-2">
        <div className="grid grid-cols-3 gap-2">
          <div>
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="font-semibold">{formatCurrency(invoice.total)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Paid</p>
            <p className="font-semibold text-green-600">{formatCurrency(invoice.amountPaid)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Due</p>
            <p className={`font-semibold ${invoice.amountDue > 0 ? 'text-destructive' : ''}`}>
              {formatCurrency(invoice.amountDue)}
            </p>
          </div>
        </div>

        {invoice.dueDate && (
          <p className="text-xs text-muted-foreground">
            Due date: {formatDate(invoice.dueDate)}
          </p>
        )}

        {/* Expandable line items */}
        {invoice.lineItems && invoice.lineItems.length > 0 && (
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-0 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setExpanded((e) => !e)}
            >
              {expanded ? (
                <ChevronDown className="w-3 h-3 mr-1" />
              ) : (
                <ChevronRight className="w-3 h-3 mr-1" />
              )}
              {invoice.lineItems.length} line item{invoice.lineItems.length > 1 ? 's' : ''}
            </Button>
            {expanded && (
              <div className="mt-1 border-t pt-2 space-y-0.5">
                {invoice.lineItems.map((item, idx) => (
                  <LineItemRow key={idx} item={item} />
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Filter tabs ──────────────────────────────────────────────────────────────

type StatusFilter = 'all' | 'issued' | 'paid' | 'overdue';

const TABS: { value: StatusFilter; label: string }[] = [
  { value: 'all',     label: 'All' },
  { value: 'issued',  label: 'Unpaid' },
  { value: 'paid',    label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MemberInvoicesPage() {
  const [activeTab, setActiveTab] = useState<StatusFilter>('all');
  const { data: invoicesData, isLoading } = useMyInvoices(activeTab === 'all' ? undefined : activeTab);

  const invoices = invoicesData?.invoices ?? [];

  return (
    <PageShell>
      <PageHeader
        title="My Invoices"
        subtitle="Your billing history and outstanding dues"
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as StatusFilter)}>
        <TabsList className="mb-4">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : invoices.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground text-sm">
            No invoices found.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {invoices.map((invoice) => (
            <InvoiceCard key={invoice._id} invoice={invoice} />
          ))}
        </div>
      )}
    </PageShell>
  );
}
