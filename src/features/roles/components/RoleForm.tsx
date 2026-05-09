import { useEffect, useMemo } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  useGetRolesPermissions,
  usePostRoles,
  usePatchRolesRoleId,
  getGetRolesQueryKey,
} from '@/api/generated/roles/roles';
import type { Role } from '@/api/generated/schemas/role';

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(80),
  description: z.string().max(300).optional(),
  permissions: z.array(z.string()).min(1, 'Select at least one permission'),
});

type FormValues = z.infer<typeof schema>;

interface RoleFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role?: Role | null;
}

// ─── RoleForm ─────────────────────────────────────────────────────────────────

export default function RoleForm({ open, onOpenChange, role }: RoleFormProps) {
  const qc = useQueryClient();
  const isEdit = !!role;

  const { data: permissionsData } = useGetRolesPermissions({
    query: { staleTime: 1000 * 60 * 5 },
  });

  // permissionsData.data is { [resource]: string[] }
  const groupedPermissions = permissionsData?.data ?? {};
  const allResources = useMemo(() => Object.keys(groupedPermissions).sort(), [groupedPermissions]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      description: '',
      permissions: [],
    },
  });

  const selectedPermissions = form.watch('permissions');

  useEffect(() => {
    if (role) {
      form.reset({
        name: role.name ?? '',
        description: role.description ?? '',
        permissions: role.permissions ?? [],
      });
    } else {
      form.reset({ name: '', description: '', permissions: [] });
    }
  }, [role, form]);

  function invalidate() {
    qc.invalidateQueries({ queryKey: getGetRolesQueryKey() });
  }

  const create = usePostRoles({
    mutation: { onSuccess: () => { invalidate(); onOpenChange(false); } },
  });

  const update = usePatchRolesRoleId({
    mutation: { onSuccess: () => { invalidate(); onOpenChange(false); } },
  });

  function onSubmit(values: FormValues) {
    const payload = {
      name: values.name,
      ...(values.description && { description: values.description }),
      permissions: values.permissions,
    };

    if (isEdit) {
      update.mutate({ roleId: role._id!, data: payload });
    } else {
      create.mutate({ data: payload });
    }
  }

  // Toggle all permissions for a resource group
  function toggleGroup(resource: string) {
    const perms = groupedPermissions[resource] ?? [];
    const current = form.getValues('permissions');
    const allSelected = perms.every((p) => current.includes(p));
    if (allSelected) {
      form.setValue('permissions', current.filter((p) => !perms.includes(p)), { shouldValidate: true });
    } else {
      const merged = Array.from(new Set([...current, ...perms]));
      form.setValue('permissions', merged, { shouldValidate: true });
    }
  }

  function togglePermission(perm: string) {
    const current = form.getValues('permissions');
    if (current.includes(perm)) {
      form.setValue('permissions', current.filter((p) => p !== perm), { shouldValidate: true });
    } else {
      form.setValue('permissions', [...current, perm], { shouldValidate: true });
    }
  }

  const isPending = create.isPending || update.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>{isEdit ? 'Edit Role' : 'New Role'}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? 'Update this role name and its permissions.'
              : 'Create a custom role with specific permissions.'}
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
                  <FormLabel>Role Name *</FormLabel>
                  <FormControl><Input placeholder="Reception Staff" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Brief description of this role's responsibilities…"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Permissions */}
            <FormField
              control={form.control}
              name="permissions"
              render={() => (
                <FormItem>
                  <div className="flex items-center justify-between mb-2">
                    <FormLabel>
                      Permissions *{' '}
                      {selectedPermissions.length > 0 && (
                        <Badge variant="secondary" className="ml-1">
                          {selectedPermissions.length} selected
                        </Badge>
                      )}
                    </FormLabel>
                  </div>

                  <div className="border rounded-lg divide-y max-h-96 overflow-y-auto">
                    {allResources.length === 0 ? (
                      <div className="p-4 text-sm text-muted-foreground text-center">
                        Loading permissions…
                      </div>
                    ) : (
                      allResources.map((resource) => {
                        const perms = groupedPermissions[resource] ?? [];
                        const selectedCount = perms.filter((p) =>
                          selectedPermissions.includes(p),
                        ).length;
                        const allSelected = selectedCount === perms.length;
                        const someSelected = selectedCount > 0 && !allSelected;

                        return (
                          <div key={resource} className="p-3 space-y-2">
                            {/* Group header */}
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id={`group-${resource}`}
                                checked={allSelected}
                                data-indeterminate={someSelected}
                                onCheckedChange={() => toggleGroup(resource)}
                                className={someSelected ? 'data-[state=checked]:bg-primary/50' : ''}
                              />
                              <label
                                htmlFor={`group-${resource}`}
                                className="text-sm font-semibold capitalize cursor-pointer"
                              >
                                {resource.replace(/_/g, ' ')}
                              </label>
                              {selectedCount > 0 && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 ml-auto">
                                  {selectedCount}/{perms.length}
                                </Badge>
                              )}
                            </div>

                            {/* Individual permissions */}
                            <div className="pl-6 grid grid-cols-2 gap-1">
                              {perms.map((perm) => {
                                const action = perm.split('.')[1] ?? perm;
                                return (
                                  <div key={perm} className="flex items-center gap-2">
                                    <Checkbox
                                      id={perm}
                                      checked={selectedPermissions.includes(perm)}
                                      onCheckedChange={() => togglePermission(perm)}
                                    />
                                    <label
                                      htmlFor={perm}
                                      className="text-xs text-muted-foreground capitalize cursor-pointer"
                                    >
                                      {action}
                                    </label>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Footer */}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Role'}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
