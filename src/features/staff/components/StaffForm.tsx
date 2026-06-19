import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from '@/components/ui/sheet';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useGetBranches } from '@/api/generated/branches/branches';
import { useCreateStaff, useUpdateStaff } from '../hooks/use-staff';
import type { StaffUser } from '@/api/generated/schemas';

// ─── Constants ────────────────────────────────────────────────────────────────

export const ROLE_LABELS: Record<string, string> = {
  branch_manager: 'Branch Manager',
  staff:          'Staff',
  trainer:        'Trainer',
};

// ─── Form Schema ──────────────────────────────────────────────────────────────

const CreateSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(80),
  lastName:  z.string().min(1, 'Last name is required').max(80),
  email:     z.string().email('Invalid email address'),
  role:      z.enum(['branch_manager', 'staff', 'trainer']),
  branchIds: z.array(z.string()).min(1, 'Select at least one branch'),
});

const EditSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(80),
  lastName:  z.string().min(1, 'Last name is required').max(80),
  role:      z.enum(['branch_manager', 'staff', 'trainer']),
  branchIds: z.array(z.string()).min(1, 'Select at least one branch'),
});

type CreateValues = z.infer<typeof CreateSchema>;
type EditValues   = z.infer<typeof EditSchema>;

// ─── Props ────────────────────────────────────────────────────────────────────

interface StaffFormProps {
  open:      boolean;
  onClose:   () => void;
  /** When provided, form is in edit mode */
  staff?:    StaffUser;
}

// ─── StaffForm ────────────────────────────────────────────────────────────────

export default function StaffForm({ open, onClose, staff }: StaffFormProps) {
  const isEdit = !!staff;
  const [credentials, setCredentials] = useState<{ email: string; tempPassword: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: branchesData } = useGetBranches({ limit: 100 });
  const branches = branchesData?.data ?? [];

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
      if (data.tempPassword) {
        setCredentials(data);
      } else {
        handleClose();
      }
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
      role:      'staff',
      branchIds: [],
    },
  });

  // ── Edit form ──────────────────────────────────────────────────────────────
  const editForm = useForm<EditValues>({
    resolver: zodResolver(EditSchema),
    defaultValues: {
      firstName: staff?.firstName ?? '',
      lastName:  staff?.lastName  ?? '',
      role:      (staff?.role as 'branch_manager' | 'staff' | 'trainer') ?? 'staff',
      branchIds: staff?.branchIds ?? [],
    },
  });

  // Reset edit form when staff prop changes
  useEffect(() => {
    if (staff) {
      editForm.reset({
        firstName: staff.firstName ?? '',
        lastName:  staff.lastName  ?? '',
        role:      (staff.role as 'branch_manager' | 'staff' | 'trainer') ?? 'staff',
        branchIds: staff.branchIds ?? [],
      });
    } else {
      createForm.reset();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staff]);

  // ── Submit handlers ────────────────────────────────────────────────────────

  const handleCreate = createForm.handleSubmit((values) => {
    createMutation.mutate({ data: values });
  });

  const handleEdit = editForm.handleSubmit((values) => {
    updateMutation.mutate({ staffId: staff!._id!, data: values });
  });

  // ── Shared branch toggle helper ────────────────────────────────────────────

  const toggleBranch = (branchId: string, current: string[], onChange: (v: string[]) => void) => {
    if (current.includes(branchId)) {
      onChange(current.filter((id) => id !== branchId));
    } else {
      onChange([...current, branchId]);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Sheet open={open} onOpenChange={(v) => !v && handleClose()}>
      <SheetContent className="sm:max-w-md p-0 flex flex-col h-full">
        <SheetHeader className="shrink-0 border-b px-4 py-4">
          <SheetTitle>{isEdit ? 'Edit Staff Account' : 'Add Staff Account'}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Update this staff member's details and branch assignments."
              : 'Create a new staff account. A temporary password will be auto-generated.'}
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 py-5">

        {/* ── Credentials shown after successful creation ── */}
        {credentials && (
          <div className="mt-6 space-y-4">
            <div className="rounded-lg border border-green-500 bg-green-50 dark:bg-green-950 p-3 text-sm text-green-700 dark:text-green-300 font-medium">
              ✓ Staff account created successfully!
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
                  <button type="button" onClick={() => copyPassword(credentials.tempPassword)} className="text-muted-foreground hover:text-foreground shrink-0">
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Credentials have also been emailed to the staff member.</p>
            </div>
            <Button className="w-full" onClick={handleClose}>Done</Button>
          </div>
        )}

        {/* ── Create form ── */}
        {!isEdit && !credentials && (
          <form id="staff-create-form" onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="c-firstName">First name</Label>
                <Input id="c-firstName" {...createForm.register('firstName')} />
                {createForm.formState.errors.firstName && (
                  <p className="text-xs text-destructive">{createForm.formState.errors.firstName.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-lastName">Last name</Label>
                <Input id="c-lastName" {...createForm.register('lastName')} />
                {createForm.formState.errors.lastName && (
                  <p className="text-xs text-destructive">{createForm.formState.errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="c-email">Email</Label>
              <Input id="c-email" type="email" {...createForm.register('email')} />
              {createForm.formState.errors.email && (
                <p className="text-xs text-destructive">{createForm.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select
                value={createForm.watch('role')}
                onValueChange={(v) => createForm.setValue('role', v as 'branch_manager' | 'staff' | 'trainer', { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Branch assignments</Label>
              <p className="text-xs text-muted-foreground">Select all branches this staff member can access.</p>
              <div className="space-y-2 rounded-md border p-3 max-h-48 overflow-y-auto">
                {branches.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No branches found</p>
                ) : (
                  branches.map((b) => {
                    const checked = createForm.watch('branchIds').includes(b._id);
                    return (
                      <label key={b._id} className="flex items-center gap-2 cursor-pointer text-sm">
                        <input
                          type="checkbox"
                          className="rounded border-border"
                          checked={checked}
                          onChange={() =>
                            toggleBranch(
                              b._id,
                              createForm.watch('branchIds'),
                              (v) => createForm.setValue('branchIds', v, { shouldValidate: true }),
                            )
                          }
                        />
                        <span>{b.name}</span>
                      </label>
                    );
                  })
                )}
              </div>
              {createForm.formState.errors.branchIds && (
                <p className="text-xs text-destructive">{createForm.formState.errors.branchIds.message}</p>
              )}
            </div>

          </form>
        )}

        {/* ── Edit form ── */}
        {isEdit && (
          <form id="staff-edit-form" onSubmit={handleEdit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="e-firstName">First name</Label>
                <Input id="e-firstName" {...editForm.register('firstName')} />
                {editForm.formState.errors.firstName && (
                  <p className="text-xs text-destructive">{editForm.formState.errors.firstName.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e-lastName">Last name</Label>
                <Input id="e-lastName" {...editForm.register('lastName')} />
                {editForm.formState.errors.lastName && (
                  <p className="text-xs text-destructive">{editForm.formState.errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select
                value={editForm.watch('role')}
                onValueChange={(v) => editForm.setValue('role', v as 'branch_manager' | 'staff' | 'trainer', { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Branch assignments</Label>
              <div className="space-y-2 rounded-md border p-3 max-h-48 overflow-y-auto">
                {branches.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No branches found</p>
                ) : (
                  branches.map((b) => {
                    const checked = editForm.watch('branchIds').includes(b._id);
                    return (
                      <label key={b._id} className="flex items-center gap-2 cursor-pointer text-sm">
                        <input
                          type="checkbox"
                          className="rounded border-border"
                          checked={checked}
                          onChange={() =>
                            toggleBranch(
                              b._id,
                              editForm.watch('branchIds'),
                              (v) => editForm.setValue('branchIds', v, { shouldValidate: true }),
                            )
                          }
                        />
                        <span>{b.name}</span>
                      </label>
                    );
                  })
                )}
              </div>
              {editForm.formState.errors.branchIds && (
                <p className="text-xs text-destructive">{editForm.formState.errors.branchIds.message}</p>
              )}
            </div>

          </form>
        )}
        </div>

        {!credentials && (
          <div className="shrink-0 border-t bg-background px-4 py-4 flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={handleClose} disabled={isPending}>
              Cancel
            </Button>
            <Button
              type="submit"
              form={isEdit ? 'staff-edit-form' : 'staff-create-form'}
              className="flex-1"
              disabled={isPending}
            >
              {isPending ? (isEdit ? 'Saving…' : 'Creating…') : (isEdit ? 'Save Changes' : 'Create Account')}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
