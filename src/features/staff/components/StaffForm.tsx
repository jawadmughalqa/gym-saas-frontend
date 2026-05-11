import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
  password:  z.string().min(8, 'Password must be at least 8 characters'),
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

  const { data: branchesData } = useGetBranches({ limit: 100 });
  const branches = branchesData?.data ?? [];

  const createMutation = useCreateStaff({ onSuccess: onClose });
  const updateMutation = useUpdateStaff(staff?._id ?? '', { onSuccess: onClose });

  // ── Create form ────────────────────────────────────────────────────────────
  const createForm = useForm<CreateValues>({
    resolver: zodResolver(CreateSchema),
    defaultValues: {
      firstName: '',
      lastName:  '',
      email:     '',
      password:  '',
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
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Edit Staff Account' : 'Add Staff Account'}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Update this staff member's details and branch assignments."
              : 'Create a new staff account. The user will be asked to change their password on first login.'}
          </SheetDescription>
        </SheetHeader>

        {/* ── Create form ── */}
        {!isEdit && (
          <form onSubmit={handleCreate} className="mt-6 space-y-4 px-1">
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
              <Label htmlFor="c-password">Temporary password</Label>
              <Input id="c-password" type="password" {...createForm.register('password')} />
              {createForm.formState.errors.password && (
                <p className="text-xs text-destructive">{createForm.formState.errors.password.message}</p>
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

            <SheetFooter className="pt-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Creating…' : 'Create account'}
              </Button>
            </SheetFooter>
          </form>
        )}

        {/* ── Edit form ── */}
        {isEdit && (
          <form onSubmit={handleEdit} className="mt-6 space-y-4 px-1">
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

            <SheetFooter className="pt-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Saving…' : 'Save changes'}
              </Button>
            </SheetFooter>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
