import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShoppingCart, Search, Plus, Minus, Trash2, X,
  CheckCircle2, Loader2, Printer, ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useTenantCurrency } from '@/hooks/use-tenant-currency';
import {
  listProducts, createOrder,
  type Product, type ProductCategory, type PaymentMethod,
  type DiscountType, type PosOrder,
} from '@/api/pos.api';

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES: { value: ProductCategory | 'all'; label: string }[] = [
  { value: 'all',         label: 'All' },
  { value: 'supplements', label: 'Supplements' },
  { value: 'drinks',      label: 'Drinks' },
  { value: 'apparel',     label: 'Apparel' },
  { value: 'accessories', label: 'Accessories' },
  { value: 'equipment',   label: 'Equipment' },
  { value: 'other',       label: 'Other' },
];

// ─── Cart item ────────────────────────────────────────────────────────────────

interface CartItem {
  product:  Product;
  quantity: number;
}

// ─── Receipt modal ────────────────────────────────────────────────────────────

function ReceiptModal({ order, currency, onClose }: { order: PosOrder; currency: string; onClose: () => void }) {
  const fmt = (n: number) => `${currency} ${n.toFixed(2)}`;

  const handlePrint = () => window.print();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-background rounded-xl shadow-2xl w-full max-w-sm">
        {/* Screen view */}
        <div className="p-6 print:hidden">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">Order Placed!</h2>
            <button onClick={onClose}><X className="h-5 w-5" /></button>
          </div>
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <p className="text-2xl font-bold">{fmt(order.total)}</p>
            <p className="text-muted-foreground text-sm">{order.orderNumber} · {order.paymentMethod.toUpperCase()}</p>
          </div>
          <div className="space-y-1 text-sm border rounded-lg p-3 bg-muted/30">
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between">
                <span>{item.quantity}× {item.productName}</span>
                <span>{fmt(item.subtotal)}</span>
              </div>
            ))}
            {order.discountAmount > 0 && (
              <div className="flex justify-between text-green-600 border-t pt-1 mt-1">
                <span>Discount</span>
                <span>-{fmt(order.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold border-t pt-1 mt-1">
              <span>Total</span>
              <span>{fmt(order.total)}</span>
            </div>
          </div>
          {order.memberName && (
            <p className="text-xs text-muted-foreground mt-2 text-center">Member: {order.memberName}</p>
          )}
          <div className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1 gap-2" onClick={handlePrint}>
              <Printer className="h-4 w-4" /> Print receipt
            </Button>
            <Button className="flex-1" onClick={onClose}>Done</Button>
          </div>
        </div>
      </div>

      {/* Print-only receipt */}
      <div className="hidden print:block fixed inset-0 bg-white p-8 text-black text-sm font-mono">
        <div className="max-w-xs mx-auto">
          <p className="text-center text-lg font-bold mb-1">RECEIPT</p>
          <p className="text-center text-xs mb-4">{new Date(order.createdAt).toLocaleString()}</p>
          <p className="text-center mb-4">{order.orderNumber}</p>
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
              <span>Discount</span>
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
          {order.memberName && <p className="mt-2">Member: {order.memberName}</p>}
          {order.cashierName && <p>Served by: {order.cashierName}</p>}
          <p className="text-center mt-4 text-xs">Thank you!</p>
        </div>
      </div>
    </div>
  );
}

// ─── Payment method dropdown ──────────────────────────────────────────────────

function PaymentDropdown({ value, onChange }: { value: PaymentMethod; onChange: (v: PaymentMethod) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
      >
        <span className="capitalize">{value}</span>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-md border bg-popover shadow-md">
          {(['cash', 'card'] as PaymentMethod[]).map(m => (
            <button
              key={m}
              type="button"
              onClick={() => { onChange(m); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-accent capitalize ${m === value ? 'font-medium' : ''}`}
            >
              {m}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main POS page ────────────────────────────────────────────────────────────

export default function POSPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { currencySymbol, currency } = useTenantCurrency();

  const fmt = (n: number) => `${currencySymbol}${n.toFixed(2)}`;

  // Products
  const { data: products = [] } = useQuery({
    queryKey: ['pos-products'],
    queryFn:  () => listProducts({ archived: false }),
  });

  // UI state
  const [search,        setSearch]        = useState('');
  const [activeCategory, setActiveCategory] = useState<ProductCategory | 'all'>('all');
  const [cart,          setCart]          = useState<CartItem[]>([]);
  const [discountType,  setDiscountType]  = useState<DiscountType>('fixed');
  const [discountValue, setDiscountValue] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [note,          setNote]          = useState('');
  const [completedOrder, setCompletedOrder] = useState<PosOrder | null>(null);

  // Filtered products
  const filtered = useMemo(() => {
    return products.filter(p => {
      const matchCat  = activeCategory === 'all' || p.category === activeCategory;
      const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [products, activeCategory, search]);

  // Cart calculations
  const subtotal = cart.reduce((sum, ci) => sum + ci.product.price * ci.quantity, 0);
  const discVal  = parseFloat(discountValue) || 0;
  const discountAmount = discVal > 0
    ? discountType === 'percent'
      ? Math.min(subtotal, (subtotal * discVal) / 100)
      : Math.min(subtotal, discVal)
    : 0;
  const total = subtotal - discountAmount;

  // Cart actions
  const addToCart = (product: Product) => {
    if (product.stock === 0) { toast({ title: 'Out of stock', variant: 'destructive' }); return; }
    setCart(prev => {
      const existing = prev.find(ci => ci.product._id === product._id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          toast({ title: `Only ${product.stock} in stock`, variant: 'destructive' });
          return prev;
        }
        return prev.map(ci => ci.product._id === product._id ? { ...ci, quantity: ci.quantity + 1 } : ci);
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQty = (productId: string, delta: number) => {
    setCart(prev => prev
      .map(ci => ci.product._id === productId ? { ...ci, quantity: ci.quantity + delta } : ci)
      .filter(ci => ci.quantity > 0),
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(ci => ci.product._id !== productId));
  };

  const clearCart = () => { setCart([]); setDiscountValue(''); setNote(''); };

  // Place order
  const orderMut = useMutation({
    mutationFn: () => createOrder({
      items:         cart.map(ci => ({ productId: ci.product._id, quantity: ci.quantity })),
      discountType:  discVal > 0 ? discountType : undefined,
      discountValue: discVal > 0 ? discVal : undefined,
      paymentMethod,
      note:          note || undefined,
    }),
    onSuccess: (order) => {
      setCompletedOrder(order);
      clearCart();
      qc.invalidateQueries({ queryKey: ['pos-products'] });
      qc.invalidateQueries({ queryKey: ['pos-orders'] });
      qc.invalidateQueries({ queryKey: ['pos-summary'] });
    },
    onError: (err: any) => toast({
      title: 'Order failed',
      description: err?.response?.data?.message ?? 'Something went wrong',
      variant: 'destructive',
    }),
  });

  const cartCount = cart.reduce((s, ci) => s + ci.quantity, 0);

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">

      {/* ── Left: Product grid ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden border-r">
        {/* Search + category filter */}
        <div className="p-4 space-y-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {CATEGORIES.map(cat => (
              <button
                key={cat.value}
                onClick={() => setActiveCategory(cat.value as any)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors ${
                  activeCategory === cat.value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background border-border hover:bg-accent'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Product cards */}
        <div className="flex-1 overflow-y-auto p-4">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <p className="text-sm">No products found</p>
              {search && <button onClick={() => setSearch('')} className="text-xs underline mt-1">Clear search</button>}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filtered.map(p => {
                const inCart    = cart.find(ci => ci.product._id === p._id);
                const outOfStock = p.stock === 0;
                return (
                  <button
                    key={p._id}
                    onClick={() => addToCart(p)}
                    disabled={outOfStock}
                    className={`relative flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                      outOfStock
                        ? 'opacity-50 cursor-not-allowed border-border bg-muted/30'
                        : inCart
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-border bg-background hover:border-primary hover:shadow-sm'
                    }`}
                  >
                    {inCart && (
                      <span className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {inCart.quantity}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground capitalize mb-1">{p.category}</span>
                    <span className="font-medium text-sm leading-tight line-clamp-2">{p.name}</span>
                    <span className="mt-2 font-semibold text-primary">{fmt(p.price)}</span>
                    <span className={`text-xs mt-0.5 ${p.stock <= p.lowStockThreshold ? 'text-orange-500' : 'text-muted-foreground'}`}>
                      {outOfStock ? 'Out of stock' : `${p.stock} left`}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Right: Cart ────────────────────────────────────────────────────── */}
      <div className="w-80 xl:w-96 flex flex-col bg-background">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            <span className="font-semibold">Cart</span>
            {cartCount > 0 && (
              <Badge variant="secondary">{cartCount}</Badge>
            )}
          </div>
          {cart.length > 0 && (
            <button onClick={clearCart} className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1">
              <X className="h-3 w-3" /> Clear
            </button>
          )}
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <ShoppingCart className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-sm">Cart is empty</p>
              <p className="text-xs mt-1">Tap a product to add it</p>
            </div>
          ) : (
            cart.map(ci => (
              <div key={ci.product._id} className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{ci.product.name}</p>
                  <p className="text-xs text-muted-foreground">{fmt(ci.product.price)} each</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => updateQty(ci.product._id, -1)}
                    className="h-6 w-6 rounded border flex items-center justify-center hover:bg-accent"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-6 text-center text-sm font-medium">{ci.quantity}</span>
                  <button
                    onClick={() => updateQty(ci.product._id, 1)}
                    disabled={ci.quantity >= ci.product.stock}
                    className="h-6 w-6 rounded border flex items-center justify-center hover:bg-accent disabled:opacity-50"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => removeFromCart(ci.product._id)}
                    className="h-6 w-6 rounded flex items-center justify-center hover:bg-destructive/10 text-muted-foreground hover:text-destructive ml-1"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
                <span className="text-sm font-semibold w-16 text-right shrink-0">
                  {fmt(ci.product.price * ci.quantity)}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Checkout section */}
        {cart.length > 0 && (
          <div className="border-t p-4 space-y-3">
            {/* Discount */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Discount (optional)</Label>
              <div className="flex gap-2">
                <div className="flex rounded-md border overflow-hidden">
                  {(['fixed', 'percent'] as DiscountType[]).map(t => (
                    <button
                      key={t}
                      onClick={() => setDiscountType(t)}
                      className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${
                        discountType === t ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-accent'
                      }`}
                    >
                      {t === 'fixed' ? currencySymbol : '%'}
                    </button>
                  ))}
                </div>
                <Input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={discountValue}
                  onChange={e => setDiscountValue(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            </div>

            {/* Payment method */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Payment method</Label>
              <PaymentDropdown value={paymentMethod} onChange={setPaymentMethod} />
            </div>

            {/* Note */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Note (optional)</Label>
              <Input
                placeholder="e.g. Walk-in customer"
                value={note}
                onChange={e => setNote(e.target.value)}
                className="h-8 text-sm"
              />
            </div>

            <Separator />

            {/* Totals */}
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{fmt(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>-{fmt(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base">
                <span>Total</span>
                <span>{fmt(total)}</span>
              </div>
            </div>

            <Button
              className="w-full gap-2"
              size="lg"
              onClick={() => orderMut.mutate()}
              disabled={orderMut.isPending}
            >
              {orderMut.isPending
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <CheckCircle2 className="h-4 w-4" />}
              {orderMut.isPending ? 'Processing…' : `Charge ${fmt(total)}`}
            </Button>
          </div>
        )}
      </div>

      {/* Receipt modal */}
      {completedOrder && (
        <ReceiptModal
          order={completedOrder}
          currency={currency}
          onClose={() => setCompletedOrder(null)}
        />
      )}
    </div>
  );
}
