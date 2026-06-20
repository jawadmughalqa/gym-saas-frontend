import { useState } from 'react';
import { Tag, Loader2, Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import {
  usePostInvoicesInvoiceIdDiscount,
  getGetInvoicesInvoiceIdQueryKey,
  getGetInvoicesQueryKey,
} from '@/api/generated/invoices/invoices';
import { useGetDiscounts } from '@/api/generated/discounts/discounts';
import { orvalMutator } from '@/lib/orval-mutator';
import { cn } from '@/lib/utils';

interface Props {
  invoiceId: string;
  invoiceTotal: number;
  memberId: string;
  currency: string;
  appliedCode?: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export default function ApplyDiscountDialog({
  invoiceId, invoiceTotal, currency, appliedCode,
  open, onOpenChange,
}: Props) {
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<'coupon' | 'manual'>('coupon');
  const [selectedCode, setSelectedCode] = useState('');
  const [couponOpen, setCouponOpen] = useState(false);
  const [manualAmount, setManualAmount] = useState('');
  const [manualType, setManualType] = useState<'fixed' | 'percent'>('fixed');
  const [manualReason, setManualReason] = useState('');

  // Available coupons
  const { data: discountsData } = useGetDiscounts({ query: { staleTime: 1000 * 60 * 5 } });
  const allDiscounts: any[] = (discountsData as any)?.data ?? [];
  const discounts = allDiscounts.filter((d: any) => d.isActive !== false);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getGetInvoicesInvoiceIdQueryKey(invoiceId) });
    queryClient.invalidateQueries({ queryKey: getGetInvoicesQueryKey() });
  }

  const applyDiscount = usePostInvoicesInvoiceIdDiscount({
    mutation: {
      onSuccess: () => {
        invalidate();
        toast({ title: 'Discount applied' });
        onOpenChange(false);
      },
      onError: (err: any) => {
        toast({
          variant: 'destructive',
          title: 'Failed to apply discount',
          description: err?.response?.data?.message ?? err?.message,
        });
      },
    },
  });

  const applyManual = useMutation({
    mutationFn: (data: { amount: number; reason?: string }) =>
      orvalMutator<unknown>({
        url: `/invoices/${invoiceId}/manual-discount`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        data,
      }),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Manual discount applied' });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({
        variant: 'destructive',
        title: 'Failed to apply discount',
        description: err?.response?.data?.message ?? err?.message,
      });
    },
  });

  const removeDiscount = useMutation({
    mutationFn: () =>
      orvalMutator<unknown>({ url: `/invoices/${invoiceId}/discount`, method: 'DELETE' }),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Discount removed' });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({
        variant: 'destructive',
        title: 'Failed to remove discount',
        description: err?.response?.data?.message ?? err?.message,
      });
    },
  });

  const isPending = applyDiscount.isPending || applyManual.isPending || removeDiscount.isPending;

  function handleApply() {
    if (mode === 'coupon') {
      if (!selectedCode) {
        toast({ variant: 'destructive', title: 'Select a coupon code' });
        return;
      }
      applyDiscount.mutate({ invoiceId, data: { discountCode: selectedCode } });
    } else {
      const amt = parseFloat(manualAmount);
      if (!amt || amt <= 0) {
        toast({ variant: 'destructive', title: 'Enter a valid discount amount' });
        return;
      }
      const finalAmount = manualType === 'percent' ? (invoiceTotal * amt) / 100 : amt;
      applyManual.mutate({ amount: finalAmount, reason: manualReason || undefined });
    }
  }

  function handleClose() {
    setSelectedCode('');
    setManualAmount('');
    setManualReason('');
    onOpenChange(false);
  }

  // ── If a discount is already applied — show remove UI ────────────────────
  if (appliedCode) {
    return (
      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Discount Applied</DialogTitle>
          </DialogHeader>
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 flex items-center gap-3">
            <Tag className="h-4 w-4 text-green-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-green-800">Active discount</p>
              <p className="font-mono text-sm font-bold text-green-900">{appliedCode}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            To apply a different discount, remove the current one first.
          </p>
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="outline" size="sm" onClick={handleClose} disabled={isPending}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => removeDiscount.mutate()}
              disabled={isPending}
            >
              {removeDiscount.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
              Remove Discount
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ── Apply form ────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Apply Discount</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Mode toggle */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode('coupon')}
              className={cn(
                'flex-1 px-3 py-2 rounded-md text-sm font-medium border transition-colors',
                mode === 'coupon'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border hover:border-primary/50',
              )}
            >
              Coupon Code
            </button>
            <button
              type="button"
              onClick={() => setMode('manual')}
              className={cn(
                'flex-1 px-3 py-2 rounded-md text-sm font-medium border transition-colors',
                mode === 'manual'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border hover:border-primary/50',
              )}
            >
              Manual Discount
            </button>
          </div>

          {mode === 'coupon' ? (
            /* ── Coupon dropdown ─────────────────────────────────────── */
            <div className="space-y-1.5">
              <Label>Coupon Code</Label>
              <Popover open={couponOpen} onOpenChange={setCouponOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={couponOpen}
                    className="w-full justify-between h-9 font-normal"
                    disabled={isPending}
                  >
                    {selectedCode
                      ? (() => {
                          const d = discounts.find((x: any) => x.code === selectedCode);
                          return d
                            ? <span className="flex items-center gap-2">
                                <span className="font-mono font-semibold">{d.code}</span>
                                <span className="text-muted-foreground text-xs">
                                  {d.discountType === 'percentage' ? `${d.value}% off` : `${currency} ${d.value} off`}
                                </span>
                              </span>
                            : selectedCode;
                        })()
                      : <span className="text-muted-foreground">Select a coupon…</span>
                    }
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search coupons…" className="h-8" />
                    <CommandList>
                      <CommandEmpty>No coupons found.</CommandEmpty>
                      <CommandGroup>
                        {discounts.map((d: any) => (
                          <CommandItem
                            key={d._id ?? d.code}
                            value={d.code}
                            onSelect={(val) => {
                              setSelectedCode(val.toUpperCase());
                              setCouponOpen(false);
                            }}
                          >
                            <Check className={cn('mr-2 h-3.5 w-3.5', selectedCode === d.code ? 'opacity-100' : 'opacity-0')} />
                            <span className="font-mono font-semibold mr-2">{d.code}</span>
                            <span className="text-xs text-muted-foreground">
                              {d.discountType === 'percentage' ? `${d.value}% off` : `${currency} ${d.value} off`}
                            </span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          ) : (
            /* ── Manual discount ─────────────────────────────────────── */
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Discount Type</Label>
                <div className="flex gap-2">
                  {(['fixed', 'percent'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setManualType(t)}
                      className={cn(
                        'flex-1 px-3 py-1.5 rounded border text-xs font-medium transition-colors',
                        manualType === t
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background text-muted-foreground border-border hover:border-primary/50',
                      )}
                    >
                      {t === 'fixed' ? `Fixed (${currency})` : 'Percentage (%)'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Amount {manualType === 'percent' ? '(%)' : `(${currency})`}</Label>
                <Input
                  type="number"
                  min={0}
                  max={manualType === 'percent' ? 100 : invoiceTotal}
                  step="0.01"
                  placeholder={manualType === 'percent' ? 'e.g. 10' : 'e.g. 500'}
                  value={manualAmount}
                  onChange={(e) => setManualAmount(e.target.value)}
                  disabled={isPending}
                />
                {manualAmount && parseFloat(manualAmount) > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Discount:{' '}
                    <span className="font-medium text-green-700">
                      {manualType === 'percent'
                        ? `${currency} ${((invoiceTotal * parseFloat(manualAmount)) / 100).toFixed(2)}`
                        : `${currency} ${parseFloat(manualAmount).toFixed(2)}`}
                    </span>
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Reason <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input
                  placeholder="e.g. Loyalty discount"
                  value={manualReason}
                  onChange={(e) => setManualReason(e.target.value)}
                  disabled={isPending}
                />
              </div>
            </div>
          )}

          <div className="flex gap-2 justify-end pt-1">
            <Button variant="outline" size="sm" onClick={handleClose} disabled={isPending}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleApply} disabled={isPending}>
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
              Apply
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
