import type { PaginationMeta } from './api.types';

// ─── Enums ────────────────────────────────────────────────────────────────────

export type MemberStatus    = 'active' | 'inactive' | 'suspended' | 'frozen';
export type Gender          = 'male' | 'female' | 'other' | 'prefer_not_to_say';
export type GovIdType       = 'cnic' | 'passport' | 'driving_license' | 'other';
export type BillingFrequency =
  | 'daily' | 'weekly' | 'monthly' | 'quarterly'
  | 'semi_annual' | 'annual' | 'one_time';
export type SubscriptionStatus  = 'active' | 'cancelled' | 'frozen' | 'expired' | 'pending_payment';
export type SubscriptionPricingType = 'plan' | 'custom';
export type CheckInMethod = 'qr' | 'rfid' | 'manual' | 'app';

// ─── Sub-objects ──────────────────────────────────────────────────────────────

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

export interface HealthQuestionnaire {
  hasCardiacCondition:    boolean;
  hasChronicIllness:      boolean;
  hasPhysicalLimitations: boolean;
  notes?:       string;
  completedAt?: string;
}

export interface WaiverMetadata {
  signedAt:        string;
  documentVersion: string;
}

export interface PlanSnapshot {
  name:             string;
  billingFrequency: string;
  price:            number;
  currency:         string;
  durationDays?:    number;
}

// ─── Member ───────────────────────────────────────────────────────────────────

export interface Member {
  _id:      string;
  tenantId: string;
  branchId: string;
  userId?:  string;

  firstName:      string;
  lastName:       string;
  fullName:       string;
  email:          string;
  phone:          string;
  dateOfBirth?:   string;
  gender?:        Gender;
  profilePhotoUrl?: string;

  govId?:     string;
  govIdType?: GovIdType;

  emergencyContact?:   EmergencyContact;
  healthQuestionnaire?: HealthQuestionnaire;

  consentMarketing:     boolean;
  consentDataProcessing: boolean;
  waiver?: WaiverMetadata;

  status:   MemberStatus;
  joinedAt: string;
  notes?:   string;

  archivedAt?: string;
  createdAt:   string;
  updatedAt:   string;
}

export interface MemberListResponse {
  members:    Member[];
  pagination: PaginationMeta;
}

// ─── Membership Plan ──────────────────────────────────────────────────────────

export interface BranchPricingOverride {
  branchId: string;
  price:    number;
}

export interface MembershipPlan {
  _id:             string;
  tenantId:        string;
  name:            string;
  description?:    string;
  billingFrequency: BillingFrequency;
  durationDays?:   number;
  basePrice:       number;
  currency:        string;
  branchPricingOverrides?: BranchPricingOverride[];
  features?:       string[];
  maxFreezes:      number;
  freezeDurationDays: number;
  isActive:        boolean;
  isArchived:      boolean;
  createdAt:       string;
  updatedAt:       string;
}

// ─── Subscription ─────────────────────────────────────────────────────────────

export interface Subscription {
  _id:      string;
  tenantId: string;
  memberId: string;
  branchId: string;

  // Pricing type
  pricingType: SubscriptionPricingType;

  // Plan-based (only when pricingType === 'plan')
  planId?:       string;
  planSnapshot?: PlanSnapshot;

  // Custom pricing (only when pricingType === 'custom')
  customLabel?:            string;
  customPrice?:            number;
  customBillingFrequency?: BillingFrequency;

  // Shared pricing
  currency:       string;
  discountAmount: number;
  finalPrice:     number;

  // Lifecycle
  status:          SubscriptionStatus;
  startDate:       string;
  endDate?:        string;
  nextRenewalDate?: string;

  freezeHistory?: Array<{
    frozenAt:   string;
    resumedAt?: string;
    reason?:    string;
  }>;

  cancelledAt?:        string;
  cancellationReason?: string;

  initialInvoiceId?: string;
  notes?:            string;
  createdAt:         string;
  updatedAt:         string;
}

// ─── Check-in ─────────────────────────────────────────────────────────────────

export interface CheckIn {
  _id:         string;
  tenantId:    string;
  memberId:    string;
  branchId:    string;
  method:      CheckInMethod;
  checkedInAt: string;
  notes?:      string;
}

export interface CheckInListResponse {
  checkIns:   CheckIn[];
  pagination: PaginationMeta;
}

// ─── Measurements ─────────────────────────────────────────────────────────────

export interface BodyMeasurements {
  chest?: number;
  waist?: number;
  hips?:  number;
  thigh?: number;
  bicep?: number;
  neck?:  number;
}

export interface Measurement {
  _id:            string;
  memberId:       string;
  date:           string;
  weightKg?:      number;
  heightCm?:      number;
  bodyFatPercent?: number;
  measurements?:  BodyMeasurements;
  notes?:         string;
  createdAt:      string;
}

// ─── Request DTOs ─────────────────────────────────────────────────────────────

export interface CreateMemberDto {
  branchId:    string;
  firstName:   string;
  lastName:    string;
  email:       string;
  phone:       string;
  dateOfBirth?: string;
  gender?:      Gender;
  govId?:       string;
  govIdType?:   GovIdType;
  emergencyContact?:    EmergencyContact;
  healthQuestionnaire?: HealthQuestionnaire;
  consentMarketing:      boolean;
  consentDataProcessing: boolean;
  waiverAccepted?: boolean;
  notes?:          string;
}

export interface UpdateMemberDto {
  firstName?:      string;
  lastName?:       string;
  phone?:          string;
  dateOfBirth?:    string;
  gender?:         Gender;
  profilePhotoUrl?: string;
  emergencyContact?:    EmergencyContact;
  healthQuestionnaire?: HealthQuestionnaire;
  consentMarketing?: boolean;
  notes?:            string;
}

export interface ListMembersQuery {
  page?:     number;
  limit?:    number;
  branchId?: string;
  status?:   MemberStatus;
  search?:   string;
  hasActiveSubscription?: boolean;
  sortBy?:  string;
  sortDir?: 'asc' | 'desc';
}

// ── Subscription DTOs ──────────────────────────────────────────────────────────

export interface CreatePlanSubscriptionDto {
  pricingType:       'plan';
  planId:            string;
  branchId:          string;
  discountAmount?:   number;
  startDate?:        string;
  addOns?:           string[];
  notes?:            string;
  autoCreateInvoice?: boolean;
}

export interface CreateCustomSubscriptionDto {
  pricingType:            'custom';
  branchId:               string;
  customLabel:            string;
  customPrice:            number;
  customBillingFrequency: BillingFrequency;
  currency?:              string;
  discountAmount?:        number;
  durationDays?:          number;
  startDate?:             string;
  notes?:                 string;
  autoCreateInvoice?:     boolean;
}

export type CreateSubscriptionDto =
  | CreatePlanSubscriptionDto
  | CreateCustomSubscriptionDto;

export interface FreezeSubscriptionDto {
  resumeAt: string;
  reason?:  string;
}

export interface CancelSubscriptionDto {
  reason: string;
}

export interface CreateMeasurementDto {
  date?:          string;
  weightKg?:      number;
  heightCm?:      number;
  bodyFatPercent?: number;
  measurements?:  BodyMeasurements;
  notes?:         string;
}