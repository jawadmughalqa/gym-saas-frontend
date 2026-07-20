/**
 * SendWhatsAppMessageDialog
 *
 * Text-only WhatsApp dialog — no PDF generation.
 *
 * Shows:
 *   • Read-only invoice summary (gym, member, invoice #, status, amounts, due date)
 *   • Editable textarea for an optional extra message
 *
 * On "Send": builds the message via buildInvoiceWhatsAppMessage() and opens
 * WhatsApp in a new tab using openWhatsAppWithText().  Existing PDF-based
 * "Send via WhatsApp" flows are completely untouched.
 */

import { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/utils/format';
import {
  buildInvoiceWhatsAppMessage,
  openWhatsAppWithText,
  type WhatsAppInvoiceData,
} from '@/utils/whatsapp-message';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusConfig(status: string): { label: string; cls: string } {
  const map: Record<string, { label: string; cls: string }> = {
    paid:           { label: 'Paid',           cls: 'bg-green-500/10 text-green-600 border-green-300' },
    overdue:        { label: 'Overdue',         cls: 'bg-red-500/10 text-red-500 border-red-300' },
    partially_paid: { label: 'Partially Paid',  cls: 'bg-orange-500/10 text-orange-500 border-orange-300' },
    issued:         { label: 'Issued',          cls: 'bg-blue-500/10 text-blue-500 border-blue-300' },
    draft:          { label: 'Draft',           cls: 'bg-muted text-muted-foreground border-border' },
    void:           { label: 'Void',            cls: 'bg-muted text-muted-foreground border-border' },
    refunded:       { label: 'Refunded',        cls: 'bg-muted text-muted-foreground border-border' },
  };
  return map[status] ?? { label: status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), cls: 'bg-muted text-muted-foreground border-border' };
}

function DetailRow({ label, value }: { label: string; value?: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-baseline gap-3 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: WhatsAppInvoiceData;
  /** phone number to send the WhatsApp to (will be sanitised internally) */
  phone?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SendWhatsAppMessageDialog({ open, onOpenChange, data, phone }: Props) {
  const [extraMessage, setExtraMessage] = useState('');

  const gym         = data.senderName ?? data.gymName ?? 'Gym';
  const isOverdue   = data.status === 'overdue' || (
    !!data.dueDate && new Date(data.dueDate) < new Date() && data.status !== 'paid'
  );
  const daysOverdue = data.dueDate && isOverdue
    ? Math.round((Date.now() - new Date(data.dueDate).getTime()) / 86_400_000)
    : 0;

  const statusCfg = statusConfig(data.status);

  function handleSend() {
    const text = buildInvoiceWhatsAppMessage(data, extraMessage);
    openWhatsAppWithText(phone, text);
    onOpenChange(false);
    setExtraMessage('');
  }

  function handleClose() {
    onOpenChange(false);
    setExtraMessage('');
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-500" />
            Send WhatsApp Message
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* ── Invoice summary (read-only) ─────────────────────────────── */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Invoice Details</p>
              <Badge variant="outline" className={`text-xs ${statusCfg.cls}`}>
                {statusCfg.label}
              </Badge>
            </div>
            <Separator />
            <DetailRow label="Gym" value={gym} />
            <DetailRow label="Member" value={data.memberName} />
            <DetailRow label="Invoice #" value={<span className="font-mono">{data.invoiceNumber}</span>} />
            <DetailRow
              label="Total"
              value={formatCurrency(data.total, data.currency)}
            />
            {(data.amountPaid ?? 0) > 0 && (
              <DetailRow
                label="Paid"
                value={<span className="text-green-600">{formatCurrency(data.amountPaid!, data.currency)}</span>}
              />
            )}
            {(data.amountDue ?? 0) > 0 && (
              <DetailRow
                label="Balance Due"
                value={
                  <span className={isOverdue ? 'text-red-500 font-bold' : 'text-orange-500 font-semibold'}>
                    {formatCurrency(data.amountDue!, data.currency)}
                    {isOverdue && ` (${daysOverdue}d overdue)`}
                  </span>
                }
              />
            )}
            {data.dueDate && (
              <DetailRow
                label="Due Date"
                value={
                  <span className={isOverdue ? 'text-red-500' : ''}>
                    {new Date(data.dueDate).toLocaleDateString(undefined, {
                      day: '2-digit', month: 'short', year: 'numeric',
                    })}
                  </span>
                }
              />
            )}
            {phone && (
              <DetailRow label="Sending to" value={<span className="text-muted-foreground">{phone}</span>} />
            )}
          </div>

          {/* ── Extra message ───────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <Label htmlFor="extra-msg" className="text-sm">
              Additional Message <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="extra-msg"
              placeholder="E.g. Please visit us by Saturday to settle your dues."
              value={extraMessage}
              onChange={(e) => setExtraMessage(e.target.value)}
              rows={3}
              className="resize-none text-sm"
            />
          </div>

          {/* ── Actions ─────────────────────────────────────────────────── */}
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="h-3.5 w-3.5 mr-1.5" />
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={handleSend}
            >
              <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
              Open WhatsApp
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
