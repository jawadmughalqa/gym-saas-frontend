import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Receipt, Printer, X, ChevronLeft, ChevronRight,
  Loader2, Search, ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Badge } from '@/components/ui/badge';
import { useTenantCurrency } from '@/hooks/use-tenant-currency';
import { listOrders, getOrder, type PosOrder, type PaymentMethod } from '@/api/pos.api';

// ─── Receipt print view ───────────────────────────────────────────────────────

function OrderDetailModal({ orderId, currency, symbol, onClose }: {
  orderId: string; currency: string; symbol: string; onClose: () => void;
}) {
  const { data: order, isLoading } = useQuery({
    queryKey: ['pos-order', orderId],
    queryFn:  () => getOrder(orderId),
  });

  const fmt = (n: number) => `${symbol}${n.toFixed(2)}`;

  const handlePrint = () => window.print();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-background rounded-xl shadow-2xl w-full max-w-md">
        {/* Screen view */}
        <div className="print:hidden">
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="font-semibold text-lg">Order Details</h2>
            <button onClick={onClose}><X className="h-5 w-5" /></button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !order ? (
            <div className="p-6 text-center text-muted-foreground">Order not found</div>
          ) : (
            <div className="p-6 space-y-4">
              {/* Header info */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Order #</p>
                  <p className="font-medium">{order.orderNumber}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Date</p>
                  <p className="font-medium">{new Date(order.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Payment</p>
                  <Badge variant="outline" className="capitalize mt-0.5">{order.paymentMethod}</Badge>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Cashier</p>
                  <p className="font-medium">{order.cashierName}</p>
                </div>
                {order.memberName && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground text-xs">Member</p>
                    <p className="font-medium">{order.memberName}</p>
                  </div>
                )}
              </div>

              {/* Items */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/30 text-muted-foreground text-xs">
                      <th className="text-left px-3 py-2">Item</th>
                      <th className="text-center px-2 py-2">Qty</th>
                      <th className="text-right px-3 py-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-2">
                          <div className="font-medium">{item.productName}</div>
                          <div className="text-xs text-muted-foreground">{fmt(item.price)} each</div>
                        </td>
                        <td className="text-center px-2 py-2">{item.quantity}</td>
                        <td className="text-right px-3 py-2 font-medium">{fmt(item.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{fmt(order.subtotal)}</span>
                </div>
                {order.discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>
                      Discount
                      {order.discountType === 'percent' ? ` (${order.discountValue}%)` : ''}
                    </span>
                    <span>-{fmt(order.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base border-t pt-1.5">
                  <span>Total</span>
                  <span>{fmt(order.total)}</span>
                </div>
              </div>

              {order.note && (
                <p className="text-xs text-muted-foreground italic border rounded px-3 py-2 bg-muted/20">
                  Note: {order.note}
                </p>
              )}

              <Button onClick={handlePrint} variant="outline" className="w-full gap-2">
                <Printer className="h-4 w-4" /> Print Receipt
              </Button>
            </div>
          )}
        </div>

        {/* Print-only receipt */}
        {order && (
          <div className="hidden print:block fixed inset-0 bg-white p-8 text-black text-sm font-mono">
            <div className="max-w-xs mx-auto">
              <p className="text-center text-xl font-bold mb-1">RECEIPT</p>
              <p className="text-center text-xs mb-1">{order.orderNumber}</p>
              <p className="text-center text-xs mb-4">{new Date(order.createdAt).toLocaleString()}</p>
              <div className="border-t border-b border-black py-2 my-2 space-y-1">
                {order.items.map((item, i) => (
                  <div key={i} className="flex justify-between">
                    <span>{item.quantity}× {item.productName}</span>
                    <span>{fmt(item.subtotal)}</span>
                  </div>
                ))}
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between">
                  <span>Discount{order.discountType === 'percent' ? ` (${order.discountValue}%)` : ''}</span>
                  <span>-{fmt(order.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base mt-1">
                <span>TOTAL</span>
                <span>{fmt(order.total)}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span>Payment</span>
                <span>{order.paymentMethod.toUpperCase()}</span>
              </div>
              {order.memberName  && <p className="mt-2">Member: {order.memberName}</p>}
              {order.cashierName && <p>Served by: {order.cashierName}</p>}
              {order.note        && <p className="mt-2 italic">Note: {order.note}</p>}
              <p className="text-center mt-6 text-xs">Thank you for your purchase!</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Payment filter dropdown ──────────────────────────────────────────────────

function PaymentFilterDropdown({ value, onChange }: {
  value: PaymentMethod | 'all'; onChange: (v: PaymentMethod | 'all') => void;
}) {
  const [open, setOpen] = useState(false);
  const options: { value: PaymentMethod | 'all'; label: string }[] = [
    { value: 'all', label: 'All methods' },
    { value: 'cash', label: 'Cash' },
    { value: 'card', label: 'Card' },
  ];
  const selected = options.find(o => o.value === value);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(p => !p)}
        className="flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm"
      >
        {selected?.label}
        <ChevronDown className="h-3.5 w-3.5 opacity-50" />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-36 rounded-md border bg-popover shadow-md right-0">
          {options.map(o => (
            <button
              key={o.value}
              type="button"
              onClick={() => { onChange(o.value); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-accent ${o.value === value ? 'font-medium' : ''}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function OrderHistoryPage() {
  const { currencySymbol, currency } = useTenantCurrency();

  const fmt = (n: number) => `${currencySymbol}${n.toFixed(2)}`;

  const [page,          setPage]          = useState(1);
  const [from,          setFrom]          = useState('');
  const [to,            setTo]            = useState('');
  const [paymentFilter, setPaymentFilter] = useState<PaymentMethod | 'all'>('all');
  const [selectedId,    setSelectedId]    = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['pos-orders', page, from, to, paymentFilter],
    queryFn:  () => listOrders({
      page,
      limit: 20,
      from:          from || undefined,
      to:            to   || undefined,
      paymentMethod: paymentFilter !== 'all' ? paymentFilter : undefined,
    }),
  });

  const orders = data?.data ?? [];
  const meta   = data?.meta;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Order History</h1>
        <p className="text-muted-foreground text-sm mt-0.5">View and print past POS orders</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">From</span>
          <DatePicker value={from} onChange={(v) => { setFrom(v ?? ''); setPage(1); }} className="w-36 h-9 text-sm" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">To</span>
          <DatePicker value={to} onChange={(v) => { setTo(v ?? ''); setPage(1); }} className="w-36 h-9 text-sm" />
        </div>
        <PaymentFilterDropdown value={paymentFilter} onChange={v => { setPaymentFilter(v); setPage(1); }} />
        {(from || to || paymentFilter !== 'all') && (
          <button
            onClick={() => { setFrom(''); setTo(''); setPaymentFilter('all'); setPage(1); }}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <X className="h-3 w-3" /> Clear filters
          </button>
        )}
        <span className="ml-auto text-sm text-muted-foreground">
          {meta ? `${meta.total} order${meta.total !== 1 ? 's' : ''}` : ''}
        </span>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground border rounded-xl">
          <Receipt className="h-10 w-10 mb-3 opacity-30" />
          <p className="text-sm">No orders found</p>
        </div>
      ) : (
        <>
          <div className="border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30 text-muted-foreground">
                  <th className="text-left px-4 py-3 font-medium">Order #</th>
                  <th className="text-left px-4 py-3 font-medium">Date</th>
                  <th className="text-left px-4 py-3 font-medium">Items</th>
                  <th className="text-left px-4 py-3 font-medium">Member</th>
                  <th className="text-left px-4 py-3 font-medium">Payment</th>
                  <th className="text-right px-4 py-3 font-medium">Total</th>
                  <th className="text-right px-4 py-3 font-medium w-20"></th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr
                    key={order._id}
                    className="border-b last:border-0 hover:bg-muted/20 transition-colors cursor-pointer"
                    onClick={() => setSelectedId(order._id)}
                  >
                    <td className="px-4 py-3 font-mono text-xs font-medium">{order.orderNumber}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString()}{' '}
                      <span className="text-xs">{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-muted-foreground">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {order.memberName ?? <span className="italic text-xs">Walk-in</span>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={order.paymentMethod === 'cash' ? 'secondary' : 'outline'} className="capitalize">
                        {order.paymentMethod}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">{fmt(order.total)}</td>
                    <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setSelectedId(order._id)}
                        title="View & print"
                      >
                        <Printer className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta && meta.pages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Page {meta.page} of {meta.pages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => setPage(p => p - 1)}
                  disabled={meta.page <= 1}
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => setPage(p => p + 1)}
                  disabled={meta.page >= meta.pages}
                >
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {selectedId && (
        <OrderDetailModal
          orderId={selectedId}
          currency={currency}
          symbol={currencySymbol}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
