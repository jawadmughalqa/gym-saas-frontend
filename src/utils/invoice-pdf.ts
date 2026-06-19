import { jsPDF } from 'jspdf';

// ─── Brand colours ────────────────────────────────────────────────────────────

const GREEN  = [14, 164, 114]  as const; // #0ea472
const NAVY   = [15,  23,  42]  as const; // #0f172a
const TEAL   = [56, 206, 151]  as const; // #38ce97 (light accent)
const WHITE  = [255, 255, 255] as const;
const DARK   = [20,  20,  30]  as const; // near-black text
const MUTED  = [100, 116, 139] as const; // slate-500
const LIGHT  = [241, 245, 249] as const; // slate-100

// ─── Shared data type ─────────────────────────────────────────────────────────

export interface InvoicePdfData {
  invoiceNumber: string;
  status: string;
  recipientName: string;
  currency: string;
  total: number;
  amountPaid?: number;
  amountDue?: number;
  dueDate?: string;
  createdAt?: string;
  lineLabel?: string;
  /** Gym invoice extras */
  gymName?: string;
  gymWebsite?: string;
  recipientEmail?: string;
  /** SaaS invoice extras */
  tenantPlan?: string;
  senderName?: string;     // defaults to "Gymanger Platform"
}

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmt(n: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'PKR' }).format(n);
}

function statusColors(status: string): [number, number, number] {
  if (status === 'paid')    return [14, 164, 114];
  if (status === 'overdue') return [220, 38, 38];
  if (status === 'pending') return [234, 179, 8];
  return [100, 116, 139];
}

// ═════════════════════════════════════════════════════════════════════════════
// 1.  GYM INVOICE  (Gym → Member)
//     Dark navy header with gym name, green table, styled like the reference
// ═════════════════════════════════════════════════════════════════════════════

export function buildGymInvoicePdf(data: InvoicePdfData): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210;
  const margin = 14;
  const gymName = data.gymName || 'GYM';

  // ── Dark navy hero header (0 – 48 mm) ────────────────────────────────────
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, W, 48, 'F');

  // Green diagonal accent strip (top-right)
  doc.setFillColor(...GREEN);
  doc.triangle(W - 60, 0, W, 0, W, 30, 'F');

  // Teal inner accent (smaller)
  doc.setFillColor(...TEAL);
  doc.triangle(W - 35, 0, W, 0, W, 16, 'F');

  // Gym name (left, white)
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(gymName.toUpperCase(), margin, 20);

  // Tagline
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...TEAL);
  doc.text('FITNESS & WELLNESS', margin, 27);

  // Green horizontal rule under header (below 48 mm block)
  doc.setFillColor(...GREEN);
  doc.rect(0, 48, W, 3, 'F');

  // ── "INVOICE" heading ─────────────────────────────────────────────────────
  let y = 62;
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.text('INVOICE', margin, y);

  // Invoice number watermark (right, large, muted)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...MUTED);
  doc.text(data.invoiceNumber, W - margin, y, { align: 'right' });

  // Status pill
  const sc = statusColors(data.status);
  doc.setFillColor(...sc);
  doc.roundedRect(W - margin - 30, y - 8, 30, 8, 2, 2, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(8);
  doc.text(data.status.toUpperCase().replace(/_/g, ' '), W - margin - 15, y - 2.5, { align: 'center' });

  y += 10;

  // ── Bill to / Date grid ───────────────────────────────────────────────────
  doc.setFillColor(...LIGHT);
  doc.rect(margin, y, W - margin * 2, 24, 'F');

  const col2 = W / 2 + 4;
  doc.setTextColor(...MUTED);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Bill to:', margin + 4, y + 7);
  doc.text('Invoice N°:', col2, y + 7);

  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(data.recipientName, margin + 4, y + 15);
  doc.text(data.invoiceNumber, col2, y + 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  if (data.recipientEmail) doc.text(data.recipientEmail, margin + 4, y + 20);
  if (data.createdAt) {
    doc.text('Date:', col2, y + 20);
    doc.setTextColor(...DARK);
    doc.setFont('helvetica', 'bold');
    doc.text(new Date(data.createdAt).toLocaleDateString(), col2 + 12, y + 20);
  }

  y += 32;

  // ── Line items table ──────────────────────────────────────────────────────
  // Table header (green)
  doc.setFillColor(...GREEN);
  doc.rect(margin, y, W - margin * 2, 9, 'F');
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Description', margin + 4, y + 6);
  doc.text('Price', W - margin - 22, y + 6, { align: 'right' });
  doc.text('Total', W - margin - 2, y + 6, { align: 'right' });

  y += 9;

  // Single line item row
  const rowH = 10;
  doc.setFillColor(255, 255, 255);
  doc.rect(margin, y, W - margin * 2, rowH, 'F');
  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(data.lineLabel || 'Membership / Service', margin + 4, y + 6.5);
  doc.text(fmt(data.total, data.currency), W - margin - 22, y + 6.5, { align: 'right' });
  doc.text(fmt(data.total, data.currency), W - margin - 2, y + 6.5, { align: 'right' });

  y += rowH;

  // Light divider
  doc.setDrawColor(...LIGHT);
  doc.setLineWidth(0.3);
  doc.line(margin, y, W - margin, y);
  y += 10;

  // ── Totals block (right-aligned, dark navy panel) ─────────────────────────
  const totX = W / 2 + 4;
  const totW = W / 2 - margin - 4;

  doc.setFillColor(...NAVY);
  const due = data.amountDue ?? data.total;
  const paidRow = data.amountPaid && data.amountPaid > 0 ? 1 : 0;
  const totH = 9 + (paidRow * 8) + 10;
  doc.rect(totX, y, totW, totH, 'F');

  doc.setTextColor(...MUTED);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  let ty = y + 7;
  doc.text('Sub-total:', totX + 4, ty);
  doc.setTextColor(...WHITE);
  doc.text(fmt(data.total, data.currency), totX + totW - 4, ty, { align: 'right' });

  if (paidRow) {
    ty += 8;
    doc.setTextColor(...MUTED);
    doc.text('Amount Paid:', totX + 4, ty);
    doc.setTextColor(...TEAL);
    doc.text(fmt(data.amountPaid!, data.currency), totX + totW - 4, ty, { align: 'right' });
  }

  ty += 10;
  doc.setDrawColor(...GREEN);
  doc.setLineWidth(0.5);
  doc.line(totX + 4, ty - 5, totX + totW - 4, ty - 5);
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Total:', totX + 4, ty);
  doc.setTextColor(...GREEN);
  doc.text(fmt(due, data.currency), totX + totW - 4, ty, { align: 'right' });

  y += totH + 6;

  // Due date note (if present)
  if (data.dueDate) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(
      `Payment due by: ${new Date(data.dueDate).toLocaleDateString()}`,
      margin,
      y,
    );
    y += 6;
  }

  // ── Additional / Payment info ─────────────────────────────────────────────
  y = Math.max(y, 220);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.text('Payment info:', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text('Please make payment to the gym reception or via bank transfer as advised by your gym.', margin, y + 6);

  // ── Footer bar ────────────────────────────────────────────────────────────
  doc.setFillColor(...NAVY);
  doc.rect(0, 282, W, 15, 'F');
  doc.setFillColor(...GREEN);
  doc.rect(0, 280, W, 2, 'F');
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  const website = data.gymWebsite || 'www.gymanger.com';
  doc.text(website, W / 2, 291, { align: 'center' });

  return doc;
}

// ═════════════════════════════════════════════════════════════════════════════
// 2.  SAAS INVOICE  (Gymanger Platform → Gym Owner / Tenant)
//     Clean, professional B2B invoice from the platform
// ═════════════════════════════════════════════════════════════════════════════

export function buildSaasInvoicePdf(data: InvoicePdfData): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210;
  const margin = 18;

  // ── Left green accent bar ─────────────────────────────────────────────────
  doc.setFillColor(...GREEN);
  doc.rect(0, 0, 6, 297, 'F');

  // Teal stripe below green
  doc.setFillColor(...TEAL);
  doc.rect(6, 0, 2, 297, 'F');

  // ── Platform header ───────────────────────────────────────────────────────
  const startX = margin + 4;

  // Logo placeholder box
  doc.setFillColor(...NAVY);
  doc.roundedRect(startX, 12, 28, 14, 2, 2, 'F');
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('GYMANGER', startX + 14, 21, { align: 'center' });

  // Platform label
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text('SaaS Gym Management Platform', startX + 32, 18);
  doc.text('www.gymanger.com', startX + 32, 24);

  // Invoice title (top-right)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(...NAVY);
  doc.text('INVOICE', W - margin, 24, { align: 'right' });

  let y = 38;
  doc.setDrawColor(...LIGHT);
  doc.setLineWidth(0.5);
  doc.line(startX, y, W - margin, y);
  y += 10;

  // ── From / To grid ────────────────────────────────────────────────────────
  const col2 = startX + (W - startX - margin) / 2 + 4;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...GREEN);
  doc.text('FROM', startX, y);
  doc.text('BILLED TO', col2, y);

  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.text(data.senderName ?? 'Gymanger Platform', startX, y);
  doc.text(data.recipientName, col2, y);

  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text('support@gymanger.com', startX, y);
  if (data.tenantPlan) {
    doc.text(`Plan: ${data.tenantPlan.toUpperCase()}`, col2, y);
  }

  y += 14;
  doc.setLineWidth(0.5);
  doc.setDrawColor(...LIGHT);
  doc.line(startX, y, W - margin, y);
  y += 8;

  // ── Invoice meta row ──────────────────────────────────────────────────────
  const metaCols = [
    { label: 'Invoice No.', value: data.invoiceNumber },
    { label: 'Issue Date',  value: data.createdAt ? new Date(data.createdAt).toLocaleDateString() : '—' },
    { label: 'Due Date',    value: data.dueDate ? new Date(data.dueDate).toLocaleDateString() : '—' },
    { label: 'Status',      value: data.status.toUpperCase().replace(/_/g, ' ') },
  ];
  const cellW = (W - startX - margin) / metaCols.length;

  metaCols.forEach((col, i) => {
    const cx = startX + i * cellW;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(col.label, cx, y);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    // Colour the status value
    if (col.label === 'Status') {
      doc.setTextColor(...statusColors(data.status));
    } else {
      doc.setTextColor(...DARK);
    }
    doc.text(col.value, cx, y + 6);
  });

  y += 18;

  // ── Line items table ──────────────────────────────────────────────────────
  // Header row
  doc.setFillColor(...NAVY);
  doc.rect(startX, y, W - startX - margin, 9, 'F');
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('DESCRIPTION', startX + 4, y + 6);
  doc.text('AMOUNT', W - margin - 2, y + 6, { align: 'right' });

  y += 9;

  // Item row
  doc.setFillColor(255, 255, 255);
  doc.rect(startX, y, W - startX - margin, 11, 'F');
  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(data.lineLabel || 'SaaS Subscription', startX + 4, y + 7);
  doc.text(fmt(data.total, data.currency), W - margin - 2, y + 7, { align: 'right' });

  y += 11;

  // Subtle stripe
  doc.setFillColor(...LIGHT);
  doc.rect(startX, y, W - startX - margin, 8, 'F');
  doc.setTextColor(...MUTED);
  doc.setFontSize(8);
  doc.text('Billing period: monthly subscription', startX + 4, y + 5.5);

  y += 18;

  // ── Totals panel ─────────────────────────────────────────────────────────
  const totW = 70;
  const totX = W - margin - totW;
  const due  = data.amountDue ?? data.total;

  // Background
  doc.setFillColor(...LIGHT);
  doc.roundedRect(totX, y, totW, 36, 2, 2, 'F');

  // Green left border accent on totals panel
  doc.setFillColor(...GREEN);
  doc.rect(totX, y, 2, 36, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  let ty = y + 9;

  doc.text('Subtotal', totX + 6, ty);
  doc.setTextColor(...DARK);
  doc.text(fmt(data.total, data.currency), totX + totW - 4, ty, { align: 'right' });

  if (data.amountPaid && data.amountPaid > 0) {
    ty += 8;
    doc.setTextColor(...MUTED);
    doc.text('Paid', totX + 6, ty);
    doc.setTextColor(...GREEN);
    doc.text(`–${fmt(data.amountPaid, data.currency)}`, totX + totW - 4, ty, { align: 'right' });
  }

  ty += 8;
  doc.setDrawColor(...MUTED);
  doc.setLineWidth(0.3);
  doc.line(totX + 6, ty - 3, totX + totW - 4, ty - 3);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  doc.text('Total Due', totX + 6, ty + 5);
  doc.setTextColor(...GREEN);
  doc.text(fmt(due, data.currency), totX + totW - 4, ty + 5, { align: 'right' });

  y += 44;

  // ── Payment instructions ──────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...NAVY);
  doc.text('Payment Instructions', startX, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text('Please process payment before the due date to avoid service interruption.', startX, y);
  doc.text('For billing queries: billing@gymanger.com', startX, y + 5);

  // ── Footer ────────────────────────────────────────────────────────────────
  // Green bottom bar
  doc.setFillColor(...NAVY);
  doc.rect(0, 278, W, 19, 'F');
  doc.setFillColor(...GREEN);
  doc.rect(0, 278, W, 2, 'F');

  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('www.gymanger.com', W / 2, 288, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...TEAL);
  doc.text('Gymanger · SaaS Gym Management Platform · support@gymanger.com', W / 2, 293, { align: 'center' });

  return doc;
}

// ─── Generic builder (kept for backwards-compat, routes to gym design) ────────

export function buildInvoicePdf(data: InvoicePdfData): jsPDF {
  return buildGymInvoicePdf(data);
}

// ─── Download helpers ─────────────────────────────────────────────────────────

export function downloadInvoicePdf(data: InvoicePdfData): void {
  buildGymInvoicePdf(data).save(`${data.invoiceNumber}.pdf`);
}

export function downloadSaasInvoicePdf(data: InvoicePdfData): void {
  buildSaasInvoicePdf(data).save(`${data.invoiceNumber}.pdf`);
}

// ─── Print helpers ────────────────────────────────────────────────────────────

function openAndPrint(doc: jsPDF): void {
  const blob = doc.output('blob');
  const url  = URL.createObjectURL(blob);
  const win  = window.open(url, '_blank');
  if (win) {
    win.addEventListener('load', () => { win.print(); URL.revokeObjectURL(url); });
  }
}

export function printInvoicePdf(data: InvoicePdfData): void {
  openAndPrint(buildGymInvoicePdf(data));
}

export function printSaasInvoicePdf(data: InvoicePdfData): void {
  openAndPrint(buildSaasInvoicePdf(data));
}

// ─── WhatsApp share ───────────────────────────────────────────────────────────

async function shareOrDownload(
  doc: jsPDF,
  filename: string,
  phone?: string,
): Promise<'shared' | 'downloaded'> {
  const blob = doc.output('blob');
  const file = new File([blob], filename, { type: 'application/pdf' });

  const isMobile = navigator.maxTouchPoints > 0;
  if (isMobile && navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({ files: [file], title: filename });
    return 'shared';
  }

  doc.save(filename);
  if (phone) {
    const digits = phone.replace(/[^\d]/g, '');
    setTimeout(() => {
      // If native WhatsApp app opens, the browser window loses focus (blur).
      // If no blur fires within 1.5 s the app isn't installed → fall back to WhatsApp Web.
      let appOpened = false;
      const onBlur = () => { appOpened = true; };
      window.addEventListener('blur', onBlur, { once: true });

      // Try native app first
      const a = document.createElement('a');
      a.href = `whatsapp://send?phone=${digits}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Fallback check after 1.5 s
      setTimeout(() => {
        window.removeEventListener('blur', onBlur);
        if (!appOpened) {
          window.open(`https://web.whatsapp.com/send?phone=${digits}`, '_blank');
        }
      }, 1500);
    }, 400);
  }
  return 'downloaded';
}

/** Gym invoice → member WhatsApp */
export async function shareInvoicePdfViaWhatsApp(
  data: InvoicePdfData,
  phone?: string,
): Promise<'shared' | 'downloaded'> {
  return shareOrDownload(buildGymInvoicePdf(data), `${data.invoiceNumber}.pdf`, phone);
}

/** SaaS invoice → tenant WhatsApp */
export async function shareSaasInvoicePdfViaWhatsApp(
  data: InvoicePdfData,
  phone?: string,
): Promise<'shared' | 'downloaded'> {
  return shareOrDownload(buildSaasInvoicePdf(data), `${data.invoiceNumber}.pdf`, phone);
}
