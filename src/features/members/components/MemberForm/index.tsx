/**
 * MemberForm
 *
 * Handles both CREATE and EDIT flows in a side Sheet.
 *
 * CREATE flow:
 *   1. Fill personal info, emergency contact, consents
 *   2. Optionally expand "Assign Membership" to assign a plan
 *      or a custom rate (for friends / special pricing) in one step
 *   3. On submit:
 *      a. POST /members  → get memberId
 *      b. If membership.enabled → POST /members/:id/subscriptions
 *      If step (b) fails, member is still saved. A toast tells the
 *      owner to assign the plan from the profile page.
 *
 * EDIT flow:
 *   - Only personal-info fields are editable (email / branch are fixed)
 *   - Membership section is hidden (use the Subscriptions tab instead)
 */

import { useEffect, useState } from 'react';
import { useForm }        from 'react-hook-form';
import { zodResolver }    from '@hookform/resolvers/zod';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button }              from '@/components/ui/button';
import { Separator }           from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';

import {
  usePostMembers,
  usePatchMembersMemberId,
  getGetMembersQueryKey,
  getGetMembersMemberIdQueryKey,
  getGetMembersMemberIdSubscriptionsQueryKey,
  usePostMembersMemberIdSubscriptions,
} from '@/api/generated/members/members';
import { usePostTrainersTrainerIdAssignments } from '@/api/generated/trainers/trainers';
import { useGetBranches, getGetBranchesQueryKey }  from '@/api/generated/branches/branches';
import { useQueryClient }  from '@tanstack/react-query';
import {
  getGetNotificationsQueryKey,
  getGetNotificationsUnreadCountQueryKey,
} from '@/api/generated/notifications/notifications';
import { useToast }        from '@/hooks/use-toast';
import type { Member }     from '@/types/member.types';
import { CURRENCY } from '@/config/tenant.config';

import { memberFormSchema, memberFormDefaults, type MemberFormValues } from './types';
import { PersonalInfoSection }      from './PersonalInfoSection';
import { EmergencyContactSection }  from './EmergencyContactSection';
import { AssignMembershipSection }  from './AssignMembershipSection';
import { AssignTrainerSection }     from './AssignTrainerSection';
import { MemberCredentialsDialog }  from '../MemberCredentialsDialog';

// ─── Props ────────────────────────────────────────────────────────────────────

interface MemberFormProps {
  open:             boolean;
  onOpenChange:     (open: boolean) => void;
  member?:          Member;          // present → edit mode
  defaultBranchId?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MemberForm({
  open,
  onOpenChange,
  member,
  defaultBranchId,
}: MemberFormProps) {
  const isEdit      = !!member;
  const queryClient = useQueryClient();
  const { toast }   = useToast();

  // ── Credentials dialog state (shown after create) ─────────────────────────
  const [credentials, setCredentials] = useState<{
    memberName: string;
    loginEmail: string;
    tempPassword: string;
  } | null>(null);

  // ── API mutations ─────────────────────────────────────────────────────────
  const createMutation       = usePostMembers();
  const updateMutation       = usePatchMembersMemberId();
  const subscriptionMutation = usePostMembersMemberIdSubscriptions();
  const trainerAssignMutation = usePostTrainersTrainerIdAssignments();

  const isPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    subscriptionMutation.isPending ||
    trainerAssignMutation.isPending;

  // ── Branches ──────────────────────────────────────────────────────────────
  const { data: branchesData, isLoading: branchesLoading } = useGetBranches(
    { limit: 100, status: 'active' },
    { query: { staleTime: 1000 * 60 } },
  );
  const branches = (branchesData?.data ?? []) as { _id: string; name: string }[];

  // ── Form ──────────────────────────────────────────────────────────────────
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<MemberFormValues>({
    resolver: zodResolver(memberFormSchema),
    defaultValues: {
      ...memberFormDefaults,
      branchId: defaultBranchId ?? '',
    },
  });

  // ── Populate form when editing ────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;

    if (member) {
      reset({
        ...memberFormDefaults,
        branchId:        (typeof member.branchId === 'object' && member.branchId !== null ? (member.branchId as any)._id : member.branchId) ?? '',
        firstName:       member.firstName,
        lastName:        member.lastName,
        email:           member.email,
        phone:           member.phone,
        age:             (member as any).age ?? undefined,
        dateOfBirth:     (member as any).dateOfBirth
                           ? new Date((member as any).dateOfBirth).toISOString().split('T')[0]
                           : '',
        gender:          member.gender,
        notes:           member.notes ?? '',
        ec_name:         member.emergencyContact?.name         ?? '',
        ec_relationship: member.emergencyContact?.relationship  ?? '',
        ec_phone:        member.emergencyContact?.phone         ?? '',
      });
    } else {
      reset({
        ...memberFormDefaults,
        branchId: defaultBranchId ?? '',
      });
    }
  }, [open, member, defaultBranchId, reset]);

  // ── Submit ────────────────────────────────────────────────────────────────
  async function onSubmit(values: MemberFormValues) {
    try {
      const emergencyContact = values.ec_name
        ? {
            name:         values.ec_name,
            relationship: values.ec_relationship ?? '',
            phone:        values.ec_phone        ?? '',
          }
        : undefined;

      // ── EDIT path ───────────────────────────────────────────────────────
      if (isEdit) {
        const originalBranchId =
          typeof member!.branchId === 'object' && member!.branchId !== null
            ? (member!.branchId as any)._id
            : member!.branchId;
        const branchChanged = values.branchId && values.branchId !== originalBranchId;

        await updateMutation.mutateAsync({
          memberId: member!._id,
          data: {
            ...(branchChanged ? { branchId: values.branchId } : {}),
            firstName:   values.firstName,
            lastName:    values.lastName,
            phone:       values.phone,
            age:         values.age    || undefined,
            dateOfBirth: values.dateOfBirth ? values.dateOfBirth : undefined,
            gender:      values.gender,
            notes:       values.notes  || undefined,
            emergencyContact,
          },
        });

        await queryClient.invalidateQueries({ queryKey: getGetMembersQueryKey() });
        await queryClient.invalidateQueries({
          queryKey: getGetMembersMemberIdQueryKey(member!._id),
        });
        if (branchChanged) {
          await queryClient.invalidateQueries({ queryKey: getGetBranchesQueryKey() });
        }

        toast({ title: 'Member updated', description: 'Profile saved successfully.' });
        onOpenChange(false);
        return;
      }

      // ── CREATE path ─────────────────────────────────────────────────────
      const created = await createMutation.mutateAsync({
        data: {
          branchId:    values.branchId,
          firstName:   values.firstName,
          lastName:    values.lastName,
          email:       values.email,
          phone:       values.phone,
          age:         values.age    || undefined,
          dateOfBirth: values.dateOfBirth ? values.dateOfBirth : undefined,
          gender:      values.gender,
          notes:       values.notes  || undefined,
          emergencyContact,
        },
      });

      // orvalMutator returns res.data (the API envelope), so we need .data again
      // to get the actual member object: { success, data: { _id, loginEmail, tempPassword } }
      const createdData = (created as unknown as { data: { _id: string; loginEmail?: string; tempPassword?: string } }).data;
      const newMemberId = createdData._id;

      // ── Optional membership assignment ──────────────────────────────────
      const m = values.membership;
      const shouldAssign = m.enabled && (
        (m.planId && m.planId.length > 0) ||
        (m.customLabel && m.customLabel.length > 0 && Number(m.customPrice) > 0)
      );

      if (shouldAssign) {
        const isPlan = !!(m.planId && m.planId.length > 0);

        try {
          await subscriptionMutation.mutateAsync({
            memberId: newMemberId,
            data: isPlan
              ? {
                  pricingType:       'plan',
                  planId:            m.planId!,
                  branchId:          values.branchId,
                  discountAmount:    Number(m.discountAmount) || 0,
                  startDate:         m.startDate || undefined,
                  autoCreateInvoice: true,
                }
              : {
                  pricingType:            'custom',
                  branchId:               values.branchId,
                  customLabel:            m.customLabel!,
                  customPrice:            Number(m.customPrice),
                  customBillingFrequency: (m.customBillingFrequency as 'monthly') ?? 'monthly',
                  currency:               CURRENCY,
                  discountAmount:         Number(m.discountAmount) || 0,
                  startDate:              m.startDate || undefined,
                  autoCreateInvoice:      true,
                },
          });

          await queryClient.invalidateQueries({ queryKey: getGetMembersQueryKey() });
          await queryClient.invalidateQueries({
            queryKey: getGetMembersMemberIdSubscriptionsQueryKey(newMemberId),
          });
          await queryClient.invalidateQueries({
            queryKey: getGetMembersMemberIdQueryKey(newMemberId),
          });

          toast({
            title:       'Member registered',
            description: 'Member created and membership assigned.',
          });
        } catch {
          // Member was saved — only subscription failed
          await queryClient.invalidateQueries({ queryKey: getGetMembersQueryKey() });
          toast({
            title:       'Member registered',
            description: 'Member created. Plan assignment failed — assign from the profile page.',
            variant:     'destructive',
          });
        }
      } else {
        await queryClient.invalidateQueries({ queryKey: getGetMembersQueryKey() });
        toast({
          title:       'Member registered',
          description: `${values.firstName} ${values.lastName} has been added.`,
        });
      }

      // ── Optional trainer assignment ────────────────────────────────────
      const t = values.trainer;
      if (t?.enabled && t.trainerId) {
        try {
          await trainerAssignMutation.mutateAsync({
            trainerId: t.trainerId,
            data: {
              memberId:                newMemberId,
              branchId:                values.branchId,
              goal:                    t.goal                    || undefined,
              sessionFrequencyPerWeek: t.sessionFrequencyPerWeek || undefined,
              monthlyCharge:           t.monthlyCharge            || undefined,
              currency:                CURRENCY,
            },
          });
        } catch {
          toast({
            variant:     'destructive',
            title:       'Trainer assignment failed',
            description: 'Member was created. You can assign a trainer from the member profile page.',
          });
        }
      }

      // Refresh notification bell — member created + optional subscription events dispatched
      queryClient.invalidateQueries({ queryKey: getGetNotificationsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetNotificationsUnreadCountQueryKey() });

      // Show credentials dialog so owner can hand login details to the member
      if (createdData.loginEmail && createdData.tempPassword) {
        setCredentials({
          memberName:   `${values.firstName} ${values.lastName}`,
          loginEmail:   createdData.loginEmail,
          tempPassword: createdData.tempPassword,
        });
      }

      onOpenChange(false);

    } catch (err) {
      // Top-level catch — handles create/update API failures
      // The inner subscription/trainer blocks have their own catches above,
      // so this only fires when the member create/update call itself fails.
      const message =
        (err as Error)?.message ?? 'Something went wrong. Please try again.';
      toast({
        title:       isEdit ? 'Failed to save member' : 'Failed to register member',
        description: message,
        variant:     'destructive',
      });
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
    {credentials && (
      <MemberCredentialsDialog
        open={!!credentials}
        onOpenChange={(o) => { if (!o) setCredentials(null); }}
        memberName={credentials.memberName}
        loginEmail={credentials.loginEmail}
        tempPassword={credentials.tempPassword}
      />
    )}
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col h-full">

        {/* Sticky header */}
        <div className="shrink-0 bg-background border-b px-6 py-4 z-10">
          <h2 className="text-lg font-semibold">
            {isEdit ? 'Edit Member' : 'Register New Member'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isEdit
              ? 'Update member profile information.'
              : 'Fill in the details to register a new gym member.'}
          </p>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          <form id="member-form" onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-6">

            {/* No-branches warning — create mode only */}
            {!isEdit && !branchesLoading && branches.length === 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  No active branches found. Please{' '}
                  <a href="/branches" className="underline font-medium">
                    create a branch
                  </a>{' '}
                  first before registering members.
                </AlertDescription>
              </Alert>
            )}

            {/* Personal info */}
            <PersonalInfoSection
              register={register}
              watch={watch}
              setValue={setValue}
              errors={errors}
              isEdit={isEdit}
              isPending={isPending}
              branches={branches}
              branchesLoading={branchesLoading}
            />

            <Separator />

            {/* Emergency contact */}
            <EmergencyContactSection
              register={register}
              errors={errors}
              isPending={isPending}
            />

            {/* Membership & trainer assignment — create only */}
            {!isEdit && (
              <>
                <Separator />
                <AssignMembershipSection
                  control={control}
                  errors={errors}
                  isPending={isPending}
                />
                <AssignTrainerSection
                  control={control}
                  errors={errors}
                  isPending={isPending}
                  branchId={watch('branchId') || undefined}
                />
              </>
            )}

          </form>
        </div>

        {/* Sticky footer — always visible at bottom */}
        <div className="shrink-0 border-t bg-background px-6 py-4 flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="member-form"
            className="flex-1"
            disabled={isPending || (!isEdit && !branchesLoading && branches.length === 0)}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? 'Save Changes' : 'Register Member'}
          </Button>
        </div>

      </SheetContent>
    </Sheet>
    </>
  );
}