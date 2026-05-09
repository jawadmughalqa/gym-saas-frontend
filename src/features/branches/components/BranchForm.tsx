import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  usePostBranches,
  usePatchBranchesBranchId,
  getGetBranchesQueryKey,
} from '@/api/generated/branches/branches';
import type { Branch } from '@/api/generated/schemas/branch';

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  code: z
    .string()
    .min(1, 'Code is required')
    .max(20)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Only letters, numbers, hyphens and underscores'),
  city: z.string().min(1, 'City is required'),
  country: z.string().min(1, 'Country is required'),
  street: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  timezone: z.string().optional(),
  isHeadquarters: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

interface BranchFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branch?: Branch | null;
}

// ─── BranchForm ───────────────────────────────────────────────────────────────

export default function BranchForm({ open, onOpenChange, branch }: BranchFormProps) {
  const qc = useQueryClient();
  const isEdit = !!branch;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      code: '',
      city: '',
      country: '',
      street: '',
      state: '',
      postalCode: '',
      phone: '',
      email: '',
      timezone: '',
      isHeadquarters: false,
    },
  });

  // Populate form for editing
  useEffect(() => {
    if (branch) {
      form.reset({
        name: branch.name ?? '',
        code: branch.code ?? '',
        city: branch.address?.city ?? '',
        country: branch.address?.country ?? '',
        street: branch.address?.street ?? '',
        state: branch.address?.state ?? '',
        postalCode: branch.address?.postalCode ?? '',
        phone: branch.phone ?? '',
        email: branch.email ?? '',
        timezone: branch.timezone ?? '',
        isHeadquarters: branch.isHeadquarters ?? false,
      });
    } else {
      form.reset({
        name: '',
        code: '',
        city: '',
        country: '',
        street: '',
        state: '',
        postalCode: '',
        phone: '',
        email: '',
        timezone: '',
        isHeadquarters: false,
      });
    }
  }, [branch, form]);

  function invalidate() {
    qc.invalidateQueries({ queryKey: getGetBranchesQueryKey() });
  }

  const create = usePostBranches({
    mutation: { onSuccess: () => { invalidate(); onOpenChange(false); } },
  });

  const update = usePatchBranchesBranchId({
    mutation: { onSuccess: () => { invalidate(); onOpenChange(false); } },
  });

  function onSubmit(values: FormValues) {
    const address = {
      city: values.city,
      country: values.country,
      ...(values.street && { street: values.street }),
      ...(values.state && { state: values.state }),
      ...(values.postalCode && { postalCode: values.postalCode }),
    };

    const payload = {
      name: values.name,
      address,
      ...(values.phone && { phone: values.phone }),
      ...(values.email && { email: values.email }),
      ...(values.timezone && { timezone: values.timezone }),
      isHeadquarters: values.isHeadquarters,
    };

    if (isEdit) {
      update.mutate({ branchId: branch._id!, data: payload });
    } else {
      create.mutate({ data: { ...payload, code: values.code } });
    }
  }

  const isPending = create.isPending || update.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>{isEdit ? 'Edit Branch' : 'New Branch'}</SheetTitle>
          <SheetDescription>
            {isEdit ? 'Update branch information.' : 'Create a new gym location.'}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Branch Name *</FormLabel>
                  <FormControl><Input placeholder="Downtown Branch" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Code — read-only when editing */}
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Branch Code *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="DT-001"
                      {...field}
                      disabled={isEdit}
                      className={isEdit ? 'bg-muted' : ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Address */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Address</Label>

              <FormField
                control={form.control}
                name="street"
                render={({ field }) => (
                  <FormItem>
                    <FormControl><Input placeholder="Street address" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City *</FormLabel>
                      <FormControl><Input placeholder="London" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State / Province</FormLabel>
                      <FormControl><Input placeholder="England" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="postalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Postal Code</FormLabel>
                      <FormControl><Input placeholder="EC1A 1BB" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country *</FormLabel>
                      <FormControl><Input placeholder="UK" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Contact */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl><Input placeholder="+44 20 0000 0000" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl><Input type="email" placeholder="branch@gym.com" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Timezone */}
            <FormField
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timezone</FormLabel>
                  <FormControl><Input placeholder="Europe/London" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Headquarters toggle */}
            <FormField
              control={form.control}
              name="isHeadquarters"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <FormLabel className="text-sm font-medium">Headquarters</FormLabel>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Mark this as the main / HQ location
                    </p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Footer */}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Branch'}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
