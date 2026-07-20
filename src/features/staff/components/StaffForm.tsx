import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Copy, Check, Info, ChevronDown, ChevronUp,
  ShieldCheck, Eye, Users, FileText, BarChart3,
  DollarSign, Bell, BookOpen, Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from '@/components/ui/sheet';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useGetBranches } from '@/api/generated/branches/branches';
import { useCreateStaff, useUpdateStaff } from '../hooks/use-staff';
import type { StaffUser } from '@/api/generated/schemas';
import { useTenantCurrency } from '@/hooks/use-tenant-currency';
import { useTenantPhoneCountry } from '@/hooks/use-tenant-phone-country';
import { PhoneInput } from '@/components/ui/phone-input';

// ─── Constants ────────────────────────────────────────────────────────────────

export const ROLE_LABELS: Record<string, string> = {
  branch_manager: 'Branch Manager',
  staff:          'Staff',
};

export const JOB_TITLE_OPTIONS = [
  { value: 'receptionist',    label: 'Receptionist'            },
  { value: 'gym_floor_staff', label: 'Gym Floor Staff'         },
  { value: 'gate_keeper',     label: 'Gate Keeper'             },
  { value: 'security',        label: 'Security Guard'          },
  { value: 'cleaner',         label: 'Cleaner / Housekeeping'  },
  { value: 'gym_boy',         label: 'Gym Boy'                 },
  { value: 'other',           label: 'Other'                   },
] as const;

export const GENDER_OPTIONS = [
  { value: 'male',   label: 'Male'              },
  { value: 'female', label: 'Female'            },
  { value: 'other',  label: 'Prefer not to say' },
] as const;


// What a Branch Manager can do — shown before gym owner assigns the role
const BM_CAPABILITIES = [
  { icon: Eye,        label: 'View & manage members',      detail: 'Add, edit, suspend, and view member details'     },
  { icon: Users,      label: 'Manage staff',               detail: 'Create and update staff accounts in their branch'},
  { icon: FileText,   label: 'Session notes & attendance', detail: 'View all trainer notes and mark attendance'      },
  { icon: DollarSign, label: 'Billing & invoices',         detail: 'View invoices and record payments'               },
  { icon: BarChart3,  label: 'Reports & analytics',        detail: 'Access branch-level reports and data'            },
  { icon: Bell,       label: 'Notifications',              detail: 'Receive alerts for key gym events'               },
  { icon: BookOpen,   label: 'Walk-in leads',              detail: 'Manage and follow up on walk-in prospects'       },
  { icon: Settings,   label: 'Branch settings',            detail: 'Update branch info, schedule, and equipment'     },
];

const BM_CANNOT = [
  'Delete members permanently',
  'Access other branches (unless assigned)',
  'Change subscription / billing plan',
  'Manage gym-owner-level settings',
  'View or reset gym owner credentials',
];

// ─── Form Schema ──────────────────────────────────────────────────────────────

const BaseSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(80),
  lastName:  z.string().min(1, 'Last name is required').max(80),
  phone:     z.string().max(30).optional().or(z.literal('')),
  role:      z.enum(['branch_manager', 'staff']),
  jobTitle:  z.string().optional(),
  gender:    z.enum(['male', 'female', 'other']).optional(),
  age:       z.coerce.number().int().min(16, 'Min age is 16').max(100, 'Max age is 100').optional().or(z.literal('')),
  country:   z.string().optional(),
  city:      z.string().max(100).optional().or(z.literal('')),
  address:   z.string().max(500).optional().or(z.literal('')),
  notes:     z.string().max(1000).optional(),
  branchIds: z.array(z.string()).min(1, 'Select at least one branch'),
});

const CreateSchema = BaseSchema.extend({
  email: z.string().email('Invalid email address'),
});

const EditSchema = BaseSchema;

type CreateValues = z.infer<typeof CreateSchema>;
type EditValues   = z.infer<typeof EditSchema>;

// Extended StaffUser with new fields (orval types are generated from old spec)
interface StaffUserExt extends StaffUser {
  phone?: string;
  jobTitle?: string;
  notes?: string;
  gender?: string;
  age?: number;
  country?: string;
  city?: string;
  address?: string;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface StaffFormProps {
  open:    boolean;
  onClose: () => void;
  staff?:  StaffUserExt;
}

// ─── Branch Manager Capabilities Panel ───────────────────────────────────────

function BranchManagerInfo() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-blue-500/25 bg-blue-500/10 dark:bg-blue-950/30 dark:border-blue-800 overflow-hidden">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <ShieldCheck className="h-4 w-4 text-blue-600 flex-shrink-0" />
        <span className="flex-1 text-sm font-semibold text-blue-500 dark:text-blue-300">
          Branch Manager — what they can do
        </span>
        {expanded
          ? <ChevronUp className="h-4 w-4 text-blue-600" />
          : <ChevronDown className="h-4 w-4 text-blue-600" />
        }
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-blue-500/25 dark:border-blue-800 pt-3">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-blue-500 dark:text-blue-400 uppercase tracking-wide">
              ✓ Can do
            </p>
            <div className="grid gap-2">
              {BM_CAPABILITIES.map(({ icon: Icon, label, detail }) => (
                <div key={label} className="flex gap-2">
                  <Icon className="h-3.5 w-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-blue-500 dark:text-blue-200">{label}</p>
                    <p className="text-xs text-blue-600 dark:text-blue-400">{detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator className="bg-blue-200 dark:bg-blue-800" />

          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide">
              ✗ Cannot do
            </p>
            {BM_CANNOT.map((item) => (
              <div key={item} className="flex gap-2 items-start">
                <span className="text-red-400 text-xs mt-px">✕</span>
                <p className="text-xs text-red-500 dark:text-red-400">{item}</p>
              </div>
            ))}
          </div>

          <div className="rounded bg-amber-500/10 dark:bg-amber-950/40 border border-amber-500/25 dark:border-amber-800 px-2.5 py-2">
            <div className="flex gap-1.5 items-start">
              <Info className="h-3.5 w-3.5 text-amber-600 flex-shrink-0 mt-px" />
              <p className="text-xs text-amber-500 dark:text-amber-400">
                A Branch Manager only sees data from branches they are assigned to.
                Assigning to multiple branches gives access to all of them.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── StaffForm ────────────────────────────────────────────────────────────────

export default function StaffForm({ open, onClose, staff }: StaffFormProps) {
  const isEdit = !!staff;
  const [credentials, setCredentials] = useState<{ email: string; tempPassword: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: branchesData } = useGetBranches({ limit: 100 });
  const branches = branchesData?.data ?? [];

  const { countryCode: phoneIsoCode, country: tenantCountryObj } = useTenantPhoneCountry();
  const tenantCountry = tenantCountryObj?.name ?? '';

  function handleClose() {
    setCredentials(null);
    onClose();
  }

  function copyPassword(pw: string) {
    void navigator.clipboard.writeText(pw).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const createMutation = useCreateStaff({
    onSuccess: (data) => {
      if (data.tempPassword) setCredentials(data);
      else handleClose();
    },
  });
  const updateMutation = useUpdateStaff(staff?._id ?? '', { onSuccess: handleClose });

  // ── Create form ────────────────────────────────────────────────────────────
  const createForm = useForm<CreateValues>({
    resolver: zodResolver(CreateSchema),
    defaultValues: {
      firstName: '',
      lastName:  '',
      email:     '',
      phone:     '',
      role:      'staff',
      jobTitle:  '',
      gender:    undefined,
      age:       '',
      country:   tenantCountry || '',
      city:      '',
      address:   '',
      notes:     '',
      branchIds: [],
    },
  });

  const createRole = createForm.watch('role');

  // ── Edit form ──────────────────────────────────────────────────────────────
  const editForm = useForm<EditValues>({
    resolver: zodResolver(EditSchema),
    defaultValues: {
      firstName: staff?.firstName ?? '',
      lastName:  staff?.lastName  ?? '',
      phone:     staff?.phone     ?? '',
      role:      (staff?.role as 'branch_manager' | 'staff') ?? 'staff',
      jobTitle:  staff?.jobTitle  ?? '',
      gender:    (staff?.gender as 'male' | 'female' | 'other' | undefined),
      age:       staff?.age ?? '',
      country:   staff?.country   ?? tenantCountry ?? '',
      city:      staff?.city      ?? '',
      address:   staff?.address   ?? '',
      notes:     staff?.notes     ?? '',
      branchIds: staff?.branchIds ?? [],
    },
  });

  const editRole = editForm.watch('role');

  useEffect(() => {
    if (staff) {
      editForm.reset({
        firstName: staff.firstName ?? '',
        lastName:  staff.lastName  ?? '',
        phone:     staff.phone     ?? '',
        role:      (staff.role as 'branch_manager' | 'staff') ?? 'staff',
        jobTitle:  staff.jobTitle  ?? '',
        gender:    (staff.gender as 'male' | 'female' | 'other' | undefined),
        age:       staff.age ?? '',
        country:   staff.country   ?? tenantCountry ?? '',
        city:      staff.city      ?? '',
        address:   staff.address   ?? '',
        notes:     staff.notes     ?? '',
        branchIds: staff.branchIds ?? [],
      });
    } else {
      createForm.reset({
        firstName: '',
        lastName:  '',
        email:     '',
        phone:     '',
        role:      'staff',
        jobTitle:  '',
        gender:    undefined,
        age:       '',
        country:   tenantCountry || '',
        city:      '',
        address:   '',
        notes:     '',
        branchIds: [],
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staff, tenantCountry]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const toggleBranch = (
    branchId: string,
    current: string[],
    onChange: (v: string[]) => void,
  ) => {
    onChange(current.includes(branchId)
      ? current.filter((id) => id !== branchId)
      : [...current, branchId]);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleCreate = createForm.handleSubmit((values) => {
    const payload = {
      ...values,
      phone:    values.phone    || undefined,
      jobTitle: values.jobTitle || undefined,
      gender:   values.gender   || undefined,
      age:      values.age      || undefined,
      country:  values.country  || undefined,
      city:     values.city     || undefined,
      address:  values.address  || undefined,
      notes:    values.notes    || undefined,
    };
    createMutation.mutate({ data: payload as any });
  });

  const handleEdit = editForm.handleSubmit((values) => {
    const payload = {
      ...values,
      phone:    values.phone    || undefined,
      jobTitle: values.jobTitle || undefined,
      gender:   values.gender   || undefined,
      age:      values.age      || undefined,
      country:  values.country  || undefined,
      city:     values.city     || undefined,
      address:  values.address  || undefined,
      notes:    values.notes    || undefined,
    };
    updateMutation.mutate({ staffId: staff!._id!, data: payload as any });
  });

  // ── Shared components ──────────────────────────────────────────────────────

  function BranchSelector({
    value,
    onChange,
    error,
  }: {
    value: string[];
    onChange: (v: string[]) => void;
    error?: string;
  }) {
    return (
      <div className="space-y-1.5">
        <Label>Branch assignments</Label>
        <p className="text-xs text-muted-foreground">Select all branches this person can access.</p>
        <div className="space-y-2 rounded-md border p-3 max-h-40 overflow-y-auto">
          {branches.length === 0 ? (
            <p className="text-xs text-muted-foreground">No branches found</p>
          ) : (
            branches.map((b) => (
              <label key={b._id} className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  className="rounded border-border"
                  checked={value.includes(b._id)}
                  onChange={() => toggleBranch(b._id, value, onChange)}
                />
                <span>{b.name}</span>
              </label>
            ))
          )}
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  // ── Field group: personal details (reused in both forms) ───────────────────

  function PersonalFields({
    form,
    prefix,
  }: {
    form: typeof createForm | typeof editForm;
    prefix: string;
  }) {
    return (
      <>
        {/* Gender + Age */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Gender</Label>
            <Controller
              control={form.control as any}
              name="gender"
              render={({ field }) => (
                <Select
                  value={field.value ?? ''}
                  onValueChange={(v) => field.onChange(v === '__none__' ? undefined : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Not specified —</SelectItem>
                    {GENDER_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${prefix}-age`}>Age</Label>
            <Input
              id={`${prefix}-age`}
              type="number"
              min={16}
              max={100}
              placeholder="e.g. 28"
              {...(form as any).register('age')}
            />
            {(form.formState.errors as any).age && (
              <p className="text-xs text-destructive">{(form.formState.errors as any).age?.message}</p>
            )}
          </div>
        </div>

        {/* Country */}
        <div className="space-y-1.5">
          <Label htmlFor={`${prefix}-country`}>Country</Label>
          <Input
            id={`${prefix}-country`}
            placeholder="e.g. United States"
            {...(form as any).register('country')}
          />
        </div>

        {/* City */}
        <div className="space-y-1.5">
          <Label htmlFor={`${prefix}-city`}>City</Label>
          <Input
            id={`${prefix}-city`}
            placeholder="e.g. New York"
            {...(form as any).register('city')}
          />
        </div>

        {/* Address */}
        <div className="space-y-1.5">
          <Label htmlFor={`${prefix}-address`}>Address</Label>
          <Input
            id={`${prefix}-address`}
            placeholder="Street address, area…"
            {...(form as any).register('address')}
          />
        </div>
      </>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Sheet open={open} onOpenChange={(v) => !v && handleClose()}>
      <SheetContent className="sm:max-w-md p-0 flex flex-col h-full">
        <SheetHeader className="shrink-0 border-b px-4 py-4">
          <SheetTitle>{isEdit ? 'Edit Staff Account' : 'Add Staff Account'}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Update this staff member's details and branch assignments."
              : 'Create a new account. A temporary password will be generated and emailed.'}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-5">

          {/* ── Credentials shown after creation ── */}
          {credentials && (
            <div className="space-y-4">
              <div className="rounded-lg border border-green-500 bg-green-500/10 dark:bg-green-950 p-3 text-sm text-green-500 dark:text-green-300 font-medium">
                ✓ Account created successfully!
              </div>
              <div className="rounded-lg border p-4 space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Login Email</p>
                  <p className="font-mono text-sm">{credentials.email}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Temporary Password <span className="text-destructive font-semibold">— copy now</span>
                  </p>
                  <div className="flex items-center gap-2 rounded bg-muted px-3 py-2 font-mono text-sm">
                    <span className="flex-1 select-all">{credentials.tempPassword}</span>
                    <button
                      type="button"
                      onClick={() => copyPassword(credentials.tempPassword)}
                      className="text-muted-foreground hover:text-foreground shrink-0"
                    >
                      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Credentials also sent to the staff member's email.</p>
              </div>
              <Button className="w-full" onClick={handleClose}>Done</Button>
            </div>
          )}

          {/* ── Create form ── */}
          {!isEdit && !credentials && (
            <form id="staff-create-form" onSubmit={handleCreate} className="space-y-4">

              {/* Name */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="c-firstName">First name *</Label>
                  <Input id="c-firstName" {...createForm.register('firstName')} />
                  {createForm.formState.errors.firstName && (
                    <p className="text-xs text-destructive">{createForm.formState.errors.firstName.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="c-lastName">Last name *</Label>
                  <Input id="c-lastName" {...createForm.register('lastName')} />
                  {createForm.formState.errors.lastName && (
                    <p className="text-xs text-destructive">{createForm.formState.errors.lastName.message}</p>
                  )}
                </div>
              </div>

              {/* Email + Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="c-email">Email *</Label>
                  <Input id="c-email" type="email" {...createForm.register('email')} />
                  {createForm.formState.errors.email && (
                    <p className="text-xs text-destructive">{createForm.formState.errors.email.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="c-phone">Phone</Label>
                  <Controller
                    control={createForm.control}
                    name="phone"
                    render={({ field }) => (
                      <PhoneInput
                        id="c-phone"
                        value={field.value ?? ''}
                        onChange={field.onChange}
                        defaultCountry={phoneIsoCode}
                      />
                    )}
                  />
                </div>
              </div>

              {/* Role */}
              <div className="space-y-1.5">
                <Label>Role *</Label>
                <Controller
                  control={createForm.control}
                  name="role"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(ROLE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {/* Branch Manager capabilities info */}
              {createRole === 'branch_manager' && <BranchManagerInfo />}

              {/* Job Title — only for staff role */}
              {createRole === 'staff' && (
                <div className="space-y-1.5">
                  <Label>Job Title</Label>
                  <Controller
                    control={createForm.control}
                    name="jobTitle"
                    render={({ field }) => (
                      <Select value={field.value ?? ''} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select job title…" />
                        </SelectTrigger>
                        <SelectContent>
                          {JOB_TITLE_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              )}

              <Separator />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Personal Details</p>

              <PersonalFields form={createForm} prefix="c" />

              <Separator />

              {/* Branch assignments */}
              <Controller
                control={createForm.control}
                name="branchIds"
                render={({ field }) => (
                  <BranchSelector
                    value={field.value}
                    onChange={field.onChange}
                    error={createForm.formState.errors.branchIds?.message}
                  />
                )}
              />

              {/* Internal notes */}
              <div className="space-y-1.5">
                <Label htmlFor="c-notes">Internal notes</Label>
                <Textarea
                  id="c-notes"
                  rows={2}
                  placeholder="Shift schedule, emergency contact, any notes for admins…"
                  {...createForm.register('notes')}
                />
                <p className="text-xs text-muted-foreground">Only visible to gym owner and branch managers.</p>
              </div>

            </form>
          )}

          {/* ── Edit form ── */}
          {isEdit && (
            <form id="staff-edit-form" onSubmit={handleEdit} className="space-y-4">

              {/* Name */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="e-firstName">First name *</Label>
                  <Input id="e-firstName" {...editForm.register('firstName')} />
                  {editForm.formState.errors.firstName && (
                    <p className="text-xs text-destructive">{editForm.formState.errors.firstName.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="e-lastName">Last name *</Label>
                  <Input id="e-lastName" {...editForm.register('lastName')} />
                  {editForm.formState.errors.lastName && (
                    <p className="text-xs text-destructive">{editForm.formState.errors.lastName.message}</p>
                  )}
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <Label htmlFor="e-phone">Phone</Label>
                <Controller
                  control={editForm.control}
                  name="phone"
                  render={({ field }) => (
                    <PhoneInput
                      id="e-phone"
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      defaultCountry={phoneIsoCode}
                    />
                  )}
                />
              </div>

              {/* Role */}
              <div className="space-y-1.5">
                <Label>Role *</Label>
                <Controller
                  control={editForm.control}
                  name="role"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(ROLE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {/* Branch Manager info */}
              {editRole === 'branch_manager' && <BranchManagerInfo />}

              {/* Job Title */}
              {editRole === 'staff' && (
                <div className="space-y-1.5">
                  <Label>Job Title</Label>
                  <Controller
                    control={editForm.control}
                    name="jobTitle"
                    render={({ field }) => (
                      <Select value={field.value ?? ''} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select job title…" />
                        </SelectTrigger>
                        <SelectContent>
                          {JOB_TITLE_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              )}

              <Separator />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Personal Details</p>

              <PersonalFields form={editForm} prefix="e" />

              <Separator />

              {/* Branch assignments */}
              <Controller
                control={editForm.control}
                name="branchIds"
                render={({ field }) => (
                  <BranchSelector
                    value={field.value}
                    onChange={field.onChange}
                    error={editForm.formState.errors.branchIds?.message}
                  />
                )}
              />

              {/* Internal notes */}
              <div className="space-y-1.5">
                <Label htmlFor="e-notes">Internal notes</Label>
                <Textarea
                  id="e-notes"
                  rows={2}
                  placeholder="Shift schedule, emergency contact, any notes for admins…"
                  {...editForm.register('notes')}
                />
                <p className="text-xs text-muted-foreground">Only visible to gym owner and branch managers.</p>
              </div>

            </form>
          )}
        </div>

        {!credentials && (
          <SheetFooter className="shrink-0 border-t bg-background px-4 py-4 flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={handleClose} disabled={isPending}>
              Cancel
            </Button>
            <Button
              type="submit"
              form={isEdit ? 'staff-edit-form' : 'staff-create-form'}
              className="flex-1"
              disabled={isPending}
            >
              {isPending
                ? (isEdit ? 'Saving…' : 'Creating…')
                : (isEdit ? 'Save Changes' : 'Create Account')}
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
