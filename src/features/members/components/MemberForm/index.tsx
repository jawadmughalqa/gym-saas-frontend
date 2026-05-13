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

import { useEffect }      from 'react';
import { useForm }        from 'react-hook-form';
import { zodResolver }    from '@hookform/resolvers/zod';
import { Loader2 }        from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button }              from '@/components/ui/button';
import { Separator }           from '@/components/ui/separator';

import {
  usePostMembers,
  usePatchMembersMemberId,
  getGetMembersQueryKey,
  getGetMembersMemberIdQueryKey,
  usePostMembersMemberIdSubscriptions,
} from '@/api/generated/members/members';
import { usePostTrainersTrainerIdAssignments } from '@/api/generated/trainers/trainers';
import { useGetBranches, getGetBranchesQueryKey }  from '@/api/generated/branches/branches';
import { useQueryClient }  from '@tanstack/react-query';
import { useToast }        from '@/hooks/use-toast';
import type { Member }     from '@/types/member.types';
import { CURRENCY } from '@/config/tenant.config';

import { memberFormSchema, memberFormDefaults, type MemberFormValues } from './types';
import { PersonalInfoSection }      from './PersonalInfoSection';
import { EmergencyContactSection }  from './EmergencyContactSection';
import { ConsentSection }           from './ConsentSection';
import { AssignMembershipSection }  from './AssignMembershipSection';
import { AssignTrainerSection }     from './AssignTrainerSection';

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
        branchId:              (typeof member.branchId === 'object' && member.branchId !== null ? (member.branchId as any)._id : member.branchId) ?? '',
        firstName:             member.firstName,
        lastName:              member.lastName,
        email:                 member.email,
        phone:                 member.phone,
        dateOfBirth:           member.dateOfBirth?.slice(0, 10) ?? '',
        gender:                member.gender,
        notes:                 member.notes ?? '',
        consentMarketing:      member.consentMarketing,
        consentDataProcessing: member.consentDataProcessing,
        ec_name:               member.emergencyContact?.name         ?? '',
        ec_relationship:       member.emergencyContact?.relationship  ?? '',
        ec_phone:              member.emergencyContact?.phone         ?? '',
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
    const emergencyContact = values.ec_name
      ? {
          name:         values.ec_name,
          relationship: values.ec_relationship ?? '',
          phone:        values.ec_phone        ?? '',
        }
      : undefined;

    // ── EDIT path ─────────────────────────────────────────────────────────
    if (isEdit) {
      // Detect branch change so we only send it when it actually changed
      const originalBranchId =
        typeof member!.branchId === 'object' && member!.branchId !== null
          ? (member!.branchId as any)._id
          : member!.branchId;
      const branchChanged = values.branchId && values.branchId !== originalBranchId;

      await updateMutation.mutateAsync({
        memberId: member!._id,
        data: {
          ...(branchChanged ? { branchId: values.branchId } : {}),
          firstName:        values.firstName,
          lastName:         values.lastName,
          phone:            values.phone,
          dateOfBirth:      values.dateOfBirth  || undefined,
          gender:           values.gender,
          notes:            values.notes        || undefined,
          consentMarketing: values.consentMarketing,
          emergencyContact,
        },
      });

      await queryClient.invalidateQueries({ queryKey: getGetMembersQueryKey() });
      await queryClient.invalidateQueries({
        queryKey: getGetMembersMemberIdQueryKey(member!._id),
      });
      // If branch changed, refresh branch list so memberCount updates everywhere
      if (branchChanged) {
        await queryClient.invalidateQueries({ queryKey: getGetBranchesQueryKey() });
      }

      toast({ title: 'Member updated', description: 'Profile saved successfully.' });
      onOpenChange(false);
      return;
    }

    // ── CREATE path ───────────────────────────────────────────────────────
    const created = await createMutation.mutateAsync({
      data: {
        branchId:              values.branchId,
        firstName:             values.firstName,
        lastName:              values.lastName,
        email:                 values.email,
        phone:                 values.phone,
        dateOfBirth:           values.dateOfBirth  || undefined,
        gender:                values.gender,
        notes:                 values.notes        || undefined,
        consentMarketing:      values.consentMarketing,
        consentDataProcessing: values.consentDataProcessing,
        emergencyContact,
      },
    });

    // created.data is the new member object from the API
    const newMemberId = (created as unknown as { data: { _id: string } }).data._id;

    await queryClient.invalidateQueries({ queryKey: getGetMembersQueryKey() });

    // ── Optional membership assignment ────────────────────────────────────
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

        toast({
          title:       'Member registered',
          description: 'Member created and membership assigned.',
        });
      } catch {
        // Member was saved — only subscription failed
        // Don't block the user; let them assign from the detail page
        toast({
          title:       'Member registered',
          description: 'Member created. Plan assignment failed — assign from the profile page.',
          variant:     'destructive',
        });
      }
    } else {
      toast({
        title:       'Member registered',
        description: `${values.firstName} ${values.lastName} has been added.`,
      });
    }

    // ── Optional trainer assignment ────────────────────────────────────────
    const t = values.trainer;
    if (t?.enabled && t.trainerId) {
      try {
        await trainerAssignMutation.mutateAsync({
          trainerId: t.trainerId,
          data: {
            memberId:                newMemberId,
            branchId:                values.branchId,
            goal:                    t.goal           || undefined,
            sessionFrequencyPerWeek: t.sessionFrequencyPerWeek || undefined,
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

    onOpenChange(false);
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto p-0">

        {/* Sticky header */}
        <div className="sticky top-0 bg-background border-b px-6 py-4 z-10">
          <h2 className="text-lg font-semibold">
            {isEdit ? 'Edit Member' : 'Register New Member'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isEdit
              ? 'Update member profile information.'
              : 'Fill in the details to register a new gym member.'}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-6">

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

          <Separator />

          {/* Consents */}
          <ConsentSection
            watch={watch}
            setValue={setValue}
            isEdit={isEdit}
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

          {/* Footer */}
          <div className="flex gap-2 pt-2 pb-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Register Member'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}