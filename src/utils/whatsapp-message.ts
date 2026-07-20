/**
 * whatsapp-message.ts
 *
 * Pure utility — no React, no PDF, no side-effects beyond opening a URL.
 *
 * Responsibilities:
 *   1. Build the pre-filled WhatsApp message string from invoice data.
 *   2. Sanitise a phone number into the format wa.me expects (digits only, no leading +).
 *   3. Open WhatsApp (native app with fallback to WhatsApp Web).
 */

import { formatCurrency } from './format';

// ─── Data shape ───────────────────────────────────────────────────────────────

export interface WhatsAppInvoiceData {
  invoiceNumber: string;
  status: string;
  memberName: string;
  memberPhone?: string;
  gymName?: string;
  currency: string;
  total: number;
  amountPaid?: number;
  amountDue?: number;
  dueDate?: string;
  /** SaaS context: the platform name to show instead of gym name */
  senderName?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** First name only — "lhr_m2 lhr_m2" → "lhr_m2", "John Smith" → "John" */
function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName.trim();
}

const DIVIDER = '━━━━━━━━━━━━━━━━━━━━━';

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// ─── Message builder ──────────────────────────────────────────────────────────

/**
 * Build the WhatsApp message body.
 *
 * Context-aware: paid invoices get a receipt tone; overdue get a reminder
 * tone; issued/partially-paid get a neutral summary tone.
 *
 * @param data         Invoice data
 * @param extraMessage Optional user-written note appended before the sign-off
 */
export function buildInvoiceWhatsAppMessage(
  data: WhatsAppInvoiceData,
  extraMessage?: string,
): string {
  const gym = data.senderName ?? data.gymName ?? 'Gym';
  const name = firstName(data.memberName);

  const isPaid     = data.status === 'paid';
  const isOverdue  = data.status === 'overdue' ||
    (!!data.dueDate && new Date(data.dueDate) < new Date() && !isPaid);
  const isPartial  = data.status === 'partially_paid';

  // ── Title based on context ────────────────────────────────────────────────
  const title = isPaid
    ? '🧾 *Payment Confirmation*'
    : isOverdue
      ? '⚠️ *Payment Reminder*'
      : '📄 *Invoice Summary*';

  // ── Due-date line (hidden for paid invoices) ──────────────────────────────
  const dueDateLine = (() => {
    if (isPaid || !data.dueDate) return null;
    const dateStr = fmtDate(data.dueDate);
    if (isOverdue) {
      const days = Math.round((Date.now() - new Date(data.dueDate).getTime()) / 86_400_000);
      return `📅 Due: ${dateStr} _(*${days} day${days !== 1 ? 's' : ''} overdue*)_`;
    }
    return `📅 Due: ${dateStr}`;
  })();

  // ── Amount block ─────────────────────────────────────────────────────────
  const amountLines: string[] = [
    `💳 Total:  *${formatCurrency(data.total, data.currency)}*`,
  ];

  if ((data.amountPaid ?? 0) > 0) {
    amountLines.push(`✅ Paid:    ${formatCurrency(data.amountPaid!, data.currency)}`);
  }

  if (isPaid) {
    // no balance due line needed
  } else if ((data.amountDue ?? 0) > 0) {
    amountLines.push(
      isOverdue
        ? `🔴 *Balance Due: ${formatCurrency(data.amountDue!, data.currency)}*`
        : `⚠️ *Balance Due: ${formatCurrency(data.amountDue!, data.currency)}*`,
    );
  }

  // ── Context line ─────────────────────────────────────────────────────────
  const contextLine = isPaid
    ? `🎉 *Invoice fully paid — thank you!*`
    : isOverdue
      ? `Please settle your balance at your earliest convenience.`
      : isPartial
        ? `Your partial payment has been recorded. Please clear the remaining balance.`
        : null;

  // ── Assemble ─────────────────────────────────────────────────────────────
  const lines: string[] = [
    `Hi ${name}! 👋`,
    ``,
    title,
    DIVIDER,
    `🏋️ *${gym}*`,
    ``,
    `📋 Invoice: ${data.invoiceNumber}`,
    `👤 Member:  ${data.memberName || '—'}`,
  ];

  if (dueDateLine) lines.push(dueDateLine);

  lines.push(DIVIDER);
  lines.push(...amountLines);
  lines.push(DIVIDER);

  if (contextLine) lines.push(``, contextLine);

  if (extraMessage?.trim()) {
    lines.push(``, extraMessage.trim());
  }

  lines.push(``, `Thank you for choosing *${gym}*! 🙏`);

  return lines.join('\n');
}

// ─── Phone sanitiser ──────────────────────────────────────────────────────────

/**
 * Strip everything except digits. wa.me expects the number without a leading +.
 * E.g.  "+1 (212) 555-0147"  →  "12125550147"
 */
export function sanitisePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

// ─── WhatsApp URL builder ────────────────────────────────────────────────────

export function buildWhatsAppUrl(phone: string, text: string): string {
  const digits = sanitisePhone(phone);
  const encoded = encodeURIComponent(text);
  if (digits.length >= 7) {
    return `https://wa.me/${digits}?text=${encoded}`;
  }
  // No phone — open WhatsApp with contact picker
  return `https://wa.me/?text=${encoded}`;
}

// ─── Opener ──────────────────────────────────────────────────────────────────

/**
 * Open WhatsApp in a new tab with the given phone and pre-filled text.
 * No PDF generation, no download — text only.
 */
export function openWhatsAppWithText(phone: string | undefined, text: string): void {
  const url = buildWhatsAppUrl(phone ?? '', text);
  window.open(url, '_blank', 'noopener,noreferrer');
}
