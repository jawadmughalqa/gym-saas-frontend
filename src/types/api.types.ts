// ─── Generic API response wrapper ─────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}

// ─── Common enums ─────────────────────────────────────────────────────────────

export type MembershipStatus = 'active' | 'inactive' | 'suspended' | 'frozen';
export type EquipmentStatus = 'operational' | 'maintenance' | 'out_of_service' | 'retired';
// Note: SubscriptionStatus, InvoiceStatus, PaymentStatus are in their feature type files
export type UserRole = 'super_admin' | 'gym_owner' | 'branch_manager' | 'staff' | 'trainer' | 'member';
export type NotificationType =
  | 'subscription.created'
  | 'subscription.expiring_soon'
  | 'subscription.expired'
  | 'subscription.renewed'
  | 'subscription.cancelled'
  | 'invoice.issued'
  | 'invoice.overdue'
  | 'payment.received'
  | 'instalment.due'
  | 'instalment.overdue';

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: {
    userId: string;
    tenantId: string | null;
    role: UserRole;
    email: string;
    name: string;
  };
}

// ─── Error ────────────────────────────────────────────────────────────────────

export interface ApiError {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
}
