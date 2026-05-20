// src/pages/members/components/PaymentsTab.tsx
import { useState } from "react";
import { CreditCard, Receipt, DollarSign, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DataTable, { type ColumnDef } from "@/components/shared/DataTable";
import EmptyState from "@/components/shared/EmptyState";
import { formatDate } from "@/utils/format";
import { CURRENCY } from "@/config/tenant.config";
import {
  useGetInvoices,
  useGetPayments,
} from "@/api/generated/billing/billing";

interface PaymentsTabProps {
  memberId: string;
}

// Status badge component
function InvoiceStatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    draft: "secondary",
    issued: "default",
    partially_paid: "warning",
    paid: "success",
    overdue: "destructive",
    void: "outline",
    refunded: "secondary",
  };
  return <Badge variant={variants[status] as any}>{status.replace("_", " ")}</Badge>;
}

export function PaymentsTab({ memberId }: PaymentsTabProps) {
  const [invoicePage, setInvoicePage] = useState(1);
  const [paymentPage, setPaymentPage] = useState(1);

  const { data: invoicesResponse, isLoading: invoicesLoading } = useGetInvoices({
    memberId,
    page: invoicePage,
    limit: 10,
  });

  const { data: paymentsResponse, isLoading: paymentsLoading } = useGetPayments({
    memberId,
    page: paymentPage,
    limit: 10,
  });

  const invoices = invoicesResponse?.data ?? [];
  const payments = paymentsResponse?.data ?? [];
  const invoicePagination = invoicesResponse?.pagination;
  const paymentPagination = paymentsResponse?.pagination;

  // Calculate summary stats
  const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
  const totalPaid = payments.reduce((sum, pay) => sum + (pay.amount || 0), 0);
  const outstandingBalance = invoices
    .filter(inv => ["issued", "partially_paid"].includes(inv.status))
    .reduce((sum, inv) => sum + (inv.amountDue || 0), 0);

  const invoiceColumns: ColumnDef<(typeof invoices)[0]>[] = [
    {
      key: "invoiceNumber",
      header: "Invoice #",
      cell: (row) => <span className="font-mono text-sm">{row.invoiceNumber}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <InvoiceStatusBadge status={row.status} />,
    },
    {
      key: "total",
      header: "Total",
      cell: (row) => (
        <span className="font-medium">
          {row.currency} {row.total?.toFixed(2)}
        </span>
      ),
    },
    {
      key: "amountPaid",
      header: "Paid",
      hideOnMobile: true,
      cell: (row) => (
        <span className="text-green-600">
          {row.currency} {row.amountPaid?.toFixed(2)}
        </span>
      ),
    },
    {
      key: "amountDue",
      header: "Due",
      cell: (row) => (
        <span className={row.amountDue > 0 ? "text-red-600 font-medium" : "text-muted-foreground"}>
          {row.currency} {row.amountDue?.toFixed(2)}
        </span>
      ),
    },
    {
      key: "dueDate",
      header: "Due Date",
      hideOnMobile: true,
      cell: (row) => (row.dueDate ? formatDate(row.dueDate) : "—"),
    },
    {
      key: "createdAt",
      header: "Issued",
      hideOnMobile: true,
      cell: (row) => formatDate(row.createdAt),
    },
  ];

  const paymentColumns: ColumnDef<(typeof payments)[0]>[] = [
    {
      key: "paidAt",
      header: "Date",
      cell: (row) => formatDate(row.paidAt),
    },
    {
      key: "amount",
      header: "Amount",
      cell: (row) => (
        <span className="font-medium text-green-600">
          {row.currency} {row.amount?.toFixed(2)}
        </span>
      ),
    },
    {
      key: "method",
      header: "Method",
      cell: (row) => (
        <Badge variant="outline" className="capitalize">
          {row.method?.replace("_", " ")}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => {
        const status = row.status;
        if (status === "completed") return <Badge variant="success">Completed</Badge>;
        if (status === "refunded") return <Badge variant="secondary">Refunded</Badge>;
        if (status === "partially_refunded") return <Badge variant="warning">Partial Refund</Badge>;
        return <Badge variant="outline">{status}</Badge>;
      },
    },
    {
      key: "reference",
      header: "Reference",
      hideOnMobile: true,
      cell: (row) => row.reference || "—",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Invoiced
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">
                {CURRENCY} {totalInvoiced.toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-green-600" />
              <span className="text-2xl font-bold text-green-600">
                {CURRENCY} {totalPaid.toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Outstanding Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-red-600" />
              <span className="text-2xl font-bold text-red-600">
                {CURRENCY} {outstandingBalance.toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoices Table */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Invoices</h3>
          <Button variant="outline" size="sm" onClick={() => window.location.href = `/invoices?memberId=${memberId}`}>
            View All
          </Button>
        </div>

        {!invoicesLoading && invoices.length === 0 ? (
          <EmptyState
            icon={<Receipt className="h-10 w-10" />}
            title="No invoices"
            description="No invoices have been created for this member yet."
          />
        ) : (
          <>
            <DataTable
              columns={invoiceColumns}
              data={invoices}
              keyExtractor={(r) => r._id}
              loading={invoicesLoading}
              skeletonRows={5}
            />
            {invoicePagination && invoicePagination.totalPages > 1 && (
              <div className="mt-4 flex justify-end">
                {/* Pagination component here */}
              </div>
            )}
          </>
        )}
      </div>

      {/* Payments Table */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Payment History</h3>
          <Button variant="outline" size="sm" onClick={() => window.location.href = `/payments?memberId=${memberId}`}>
            View All
          </Button>
        </div>

        {!paymentsLoading && payments.length === 0 ? (
          <EmptyState
            icon={<CreditCard className="h-10 w-10" />}
            title="No payments"
            description="No payments have been recorded for this member yet."
          />
        ) : (
          <DataTable
            columns={paymentColumns}
            data={payments}
            keyExtractor={(r) => r._id}
            loading={paymentsLoading}
            skeletonRows={5}
          />
        )}
      </div>
    </div>
  );
}