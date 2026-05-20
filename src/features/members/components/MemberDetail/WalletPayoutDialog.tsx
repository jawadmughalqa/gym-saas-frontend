/**
 * WalletPayoutDialog
 *
 * Allows a gym owner / admin to record a physical payout from the member's wallet.
 * Deducts the amount from walletBalance and saves a payout record with medium
 * (cash or bank transfer) and optional notes.
 */

import { useState } from 'react';
import { Banknote, Landmark } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button }   from '@/components/ui/button';
import { Label }    from '@/components/ui/label';
import { Input }    from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast }    from '@/hooks/use-toast';
import { api }      from '@/lib/axios';
import { formatCurrency } from '@/utils/format';
import { CURRENCY } from '@/config/tenant.config';
import type { PayoutMedium, CreateWalletPayoutDto } from '@/types/member.types';

// ─── Medium card ──────────────────────────────────────────────────────────────

function MediumCard({
  value,
  selected,
  onSelect,
  icon,
  label,
  description,
}: {
  value:       PayoutMedium;
  selected:    boolean;
  onSelect:    () => void;
  icon:        React.ReactNode;
  label:       string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex-1 text-left rounded-lg border-2 p-3 transition-all ${
        selected
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-muted-foreground/40'
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className={selected ? 'text-primary' : 'text-muted-foreground'}>{icon}</span>
        <span className="text-sm font-medium">{label}</span>
        <div
          className={`ml-auto h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
            selected ? 'border-primary bg-primary' : 'border-muted-foreground/40'
          }`}
        >
          {selected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground leading-snug">{description}</p>
    </button>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  open:          boolean;
  onOpenChange:  (open: boolean) => void;
  memberId:      string;
  walletBalance: number;
  onSuccess:     () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WalletPayoutDialog({ open, onOpenChange, memberId, walletBalance, onSuccess }: Props) {
  const [amount,  setAmount]  = useState('');
  const [medium,  setMedium]  = useState<PayoutMedium>('cash');
  const [notes,   setNotes]   = useState('');
  const [loading, setLoading] = useState(false);

  const parsedAmount = parseFloat(amount);
  const isValid =
    !isNaN(parsedAmount) &&
    parsedAmount > 0 &&
    parsedAmount <= walletBalance;

  function handleClose(v: boolean) {
    if (!v) {
      setAmount('');
      setMedium('cash');
      setNotes('');
    }
    onOpenChange(v);
  }

  async function handleConfirm() {
    if (!isValid) return;
    setLoading(true);
    try {
      const dto: CreateWalletPayoutDto = {
        amount: parsedAmount,
        medium,
        notes:  notes.trim() || undefined,
      };
      await api.post(`/members/${memberId}/wallet/payouts`, dto);
      toast({
        title:       'Payout recorded',
        description: `${formatCurrency(parsedAmount, CURRENCY)} deducted from wallet via ${medium === 'cash' ? 'cash' : 'bank transfer'}.`,
      });
      handleClose(false);
      onSuccess();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to record payout.';
      toast({ variant: 'destructive', title: 'Error', description: msg });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-emerald-600" />
            Pay Out Wallet Balance
          </DialogTitle>
          <DialogDescription>
            Record cash or bank transfer returned to the member.
            Available balance:{' '}
            <strong className="text-emerald-700">
              {formatCurrency(walletBalance, CURRENCY)}
            </strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">

          {/* Amount */}
          <div className="space-y-1.5">
            <Label htmlFor="payoutAmount">
              Amount <span className="text-destructive">*</span>
            </Label>
            <Input
              id="payoutAmount"
              type="number"
              min="0.01"
              step="0.01"
              max={walletBalance}
              placeholder={`Max ${formatCurrency(walletBalance, CURRENCY)}`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={loading}
            />
            {parsedAmount > walletBalance && (
              <p className="text-xs text-destructive">
                Cannot exceed wallet balance of {formatCurrency(walletBalance, CURRENCY)}.
              </p>
            )}
          </div>

          {/* Medium */}
          <div className="space-y-1.5">
            <Label>
              Payment Medium <span className="text-destructive">*</span>
            </Label>
            <div className="flex gap-2">
              <MediumCard
                value="cash"
                selected={medium === 'cash'}
                onSelect={() => setMedium('cash')}
                icon={<Banknote className="h-4 w-4" />}
                label="Cash"
                description="Handed cash at the desk"
              />
              <MediumCard
                value="bank_transfer"
                selected={medium === 'bank_transfer'}
                onSelect={() => setMedium('bank_transfer')}
                icon={<Landmark className="h-4 w-4" />}
                label="Bank Transfer"
                description="Transferred to member's bank account"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="payoutNotes">Notes (optional)</Label>
            <Textarea
              id="payoutNotes"
              placeholder={
                medium === 'bank_transfer'
                  ? 'e.g. Bank: HBL, Account: 1234-XXXX, Reference: TXN-987'
                  : 'e.g. Returned at front desk, authorized by manager'
              }
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => handleClose(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!isValid || loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {loading ? 'Processing…' : `Confirm Payout`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
