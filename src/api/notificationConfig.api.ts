import api from '@/lib/axios';
import type { ApiResponse } from '@/types/api.types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SmtpConfig {
  enabled:   boolean;
  host:      string;
  port:      number;
  secure:    boolean;
  user:      string;
  hasPass:   boolean;
  fromName:  string;
  fromEmail: string;
}

export interface WhatsAppConfig {
  enabled:       boolean;
  hasToken:      boolean;   // true = token saved (never returned as plain text)
  phoneNumberId: string;
}

export interface NotificationConfig {
  smtp:            SmtpConfig;
  whatsapp:        WhatsAppConfig;
  reminderEnabled: boolean;
  reminderDays:    number[];
}

export interface SaveSmtpPayload {
  enabled?:   boolean;
  host?:      string;
  port?:      number;
  secure?:    boolean;
  user?:      string;
  pass?:      string;
  fromName?:  string;
  fromEmail?: string;
}

export interface SaveWhatsAppPayload {
  enabled?:       boolean;
  accessToken?:   string;
  phoneNumberId?: string;
}

export interface SaveRemindersPayload {
  enabled?: boolean;
  days?:    number[];
}

// ─── API ─────────────────────────────────────────────────────────────────────

export async function getNotificationConfig(): Promise<NotificationConfig> {
  const res = await api.get<ApiResponse<NotificationConfig>>('/notification-config');
  return res.data.data!;
}

export async function saveSmtp(payload: SaveSmtpPayload): Promise<void> {
  await api.patch('/notification-config/smtp', payload);
}

export interface TestSmtpPayload {
  to: string;
  host?: string;
  port?: number;
  secure?: boolean;
  user?: string;
  pass?: string;
  fromName?: string;
  fromEmail?: string;
}

export async function testSmtp(payload: TestSmtpPayload): Promise<void> {
  await api.post('/notification-config/smtp/test', payload);
}

export async function saveWhatsApp(payload: SaveWhatsAppPayload): Promise<void> {
  await api.patch('/notification-config/whatsapp', payload);
}

export async function verifyWhatsApp(
  payload?: { accessToken?: string; phoneNumberId?: string },
): Promise<{ phoneNumber: string }> {
  const res = await api.post<ApiResponse<{ phoneNumber: string }>>(
    '/notification-config/whatsapp/verify',
    payload ?? {},
  );
  return res.data.data!;
}

export async function testWhatsApp(phone: string): Promise<void> {
  await api.post('/notification-config/whatsapp/test', { phone });
}

export async function saveReminders(payload: SaveRemindersPayload): Promise<void> {
  await api.patch('/notification-config/reminders', payload);
}

// ─── Broadcast ───────────────────────────────────────────────────────────────

export type RecipientGroup = 'all' | 'active' | 'overdue';
export type BroadcastChannel = 'email' | 'whatsapp';

export interface BroadcastPayload {
  subject?: string;
  message: string;
  recipientGroup: RecipientGroup;
  channels: BroadcastChannel[];
}

export interface BroadcastResult {
  sent: number;
  failed: number;
  skipped: number;
  total: number;
}

export async function broadcastMessage(payload: BroadcastPayload): Promise<BroadcastResult> {
  const res = await api.post<ApiResponse<BroadcastResult>>('/notification-config/broadcast', payload);
  return res.data.data!;
}
