import { z } from 'zod';

// ─── Member form schema ───────────────────────────────────────────────────────

export const memberFormSchema = z.object({
  // Personal info
  branchId:              z.string().min(1, 'Branch is required'),
  firstName:             z.string().min(1, 'First name is required').max(50),
  lastName:              z.string().min(1, 'Last name is required').max(50),
  email:                 z.string().email('Invalid email'),
  phone:                 z.string().min(5, 'Phone is required').max(30),
  age:         z.preprocess(
    (v) => (v === '' || v === null || v === undefined || (typeof v === 'number' && isNaN(v)) ? undefined : Number(v)),
    z.number().int().min(1, 'Age must be at least 1').max(120, 'Age must be 120 or less').optional()
  ),
  dateOfBirth: z.string().optional(),   // ISO date string "YYYY-MM-DD", optional
  gender:      z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
  notes:       z.string().max(1000).optional(),

  // Emergency contact
  ec_name:         z.string().optional(),
  ec_relationship: z.string().optional(),
  ec_phone:        z.string().optional(),

  // Optional membership assignment (create-only)
  // enabled=true means the section is expanded and should be submitted
  membership: z.object({
    enabled:                z.boolean().default(false),
    // plan path
    planId:                 z.string().optional(),
    // custom path
    customLabel:            z.string().optional(),
    customPrice:            z.coerce.number().min(0).optional(),
    customBillingFrequency: z.string().optional(),
    // shared
    discountAmount:         z.coerce.number().min(0).default(0),
    startDate:              z.string().optional(),
    allowedShiftIds:        z.array(z.string()).optional().default([]),
  }).default({
    enabled:                false,
    planId:                 '',
    customLabel:            '',
    customPrice:            0,
    customBillingFrequency: 'monthly',
    discountAmount:         0,
    startDate:              '',
    allowedShiftIds:        [],
  }),

  // Optional trainer assignment (create-only)
  // enabled=true means the section is expanded and should be submitted
  trainer: z.object({
    enabled:                  z.boolean().default(false),
    trainerId:                z.string().optional(),
    goal:                     z.string().max(300).optional(),
    sessionFrequencyPerWeek:  z.coerce.number().min(1).max(7).optional(),
    monthlyCharge:            z.coerce.number().min(0).optional(),
  }).default({
    enabled:   false,
    trainerId: '',
    goal:      '',
    sessionFrequencyPerWeek: undefined,
    monthlyCharge:           undefined,
  }),
});

export type MemberFormValues = z.infer<typeof memberFormSchema>;

// ─── Default values ───────────────────────────────────────────────────────────

export const memberFormDefaults: MemberFormValues = {
  branchId:              '',
  firstName:             '',
  lastName:              '',
  email:                 '',
  phone:                 '',
  age:         undefined,
  dateOfBirth: '',
  gender:      'male' as MemberFormValues['gender'],
  notes:       '',
  ec_name:               '',
  ec_relationship:       '',
  ec_phone:              '',
  membership: {
    enabled:                false,
    planId:                 '',
    customLabel:            '',
    customPrice:            0,
    customBillingFrequency: 'monthly',
    discountAmount:         0,
    startDate:              '',
    allowedShiftIds:        [],
  },
  trainer: {
    enabled:                 false,
    trainerId:               '',
    goal:                    '',
    sessionFrequencyPerWeek: undefined,
    monthlyCharge:           undefined,
  },
};