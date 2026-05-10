import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button }   from '@/components/ui/button';
import { Input }    from '@/components/ui/input';
import { Label }    from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge }    from '@/components/ui/badge';
import { AlertTriangle, Snowflake, UserX, UserCheck } from 'lucide-react';
import type { MemberStatus } from '@/types/member.types';

// ─── Config per status ────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  active: {
    icon:        <UserCheck className="h-5 w-5 text-green-500" />,
    label:       'Reactivate Member',
    color:       'text-green-600',
    badge:       'default' as const,
    description: 'Member will regain full gym access.',
    impact: [
      'Member can check in immediately',
      'Subscription resumes from where it was paused',
      'If previously frozen, subscription expiry will be extended by actual freeze days',
    ],
    requiresReason:    false,
    requiresResumeDate: false,
  },
  suspended: {
    icon:        <AlertTriangle className="h-5 w-5 text-orange-500" />,
    label:       'Suspend Member',
    color:       'text-orange-600',
    badge:       'destructive' as const,
    description: 'Member will be blocked from entering the gym immediately.',
    impact: [
      'Check-ins blocked immediately',
      'Existing subscription is preserved — not cancelled',
      'Invoices and dues continue to generate',
      'Member can be reactivated at any time',
    ],
    requiresReason:    true,
    requiresResumeDate: false,
  },
  frozen: {
    icon:        <Snowflake className="h-5 w-5 text-blue-500" />,
    label:       'Freeze Membership',
    color:       'text-blue-600',
    badge:       'secondary' as const,
    description: 'Membership will be temporarily paused.',
    impact: [
      'Check-ins blocked during freeze period',
      'Billing pauses — no new invoices',
      'Subscription expiry automatically extends by number of frozen days',
      'Member can be unfrozen early by staff',
    ],
    requiresReason:    false,
    requiresResumeDate: true,
  },
  inactive: {
    icon:        <UserX className="h-5 w-5 text-red-500" />,
    label:       'Deactivate Member',
    color:       'text-red-600',
    badge:       'destructive' as const,
    description: 'Member account will be deactivated.',
    impact: [
      'Check-ins blocked permanently',
      'All active subscriptions cancelled immediately',
      'Member record preserved in history',
      'Member can be reactivated later if they return',
    ],
    requiresReason:    false,
    requiresResumeDate: false,
  },
} as const;

// ─── Schema ───────────────────────────────────────────────────────────────────

const baseSchema = z.object({
  reason:        z.string().max(500).optional(),
  freezeEndDate: z.string().optional(),
  notes:         z.string().max(500).optional(),
});

type FormValues = z.infer<typeof baseSchema>;

// ─── Props ────────────────────────────────────────────────────────────────────

interface MemberStatusDialogProps {
  open:         boolean;
  onOpenChange: (open: boolean) => void;
  memberName:   string;
  currentStatus: MemberStatus;
  targetStatus:  MemberStatus;
  isSubmitting:  boolean;
  onConfirm:    (data: {
    status:        MemberStatus;
    reason?:       string;
    freezeEndDate?: string;
    notes?:        string;
  }) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MemberStatusDialog({
  open,
  onOpenChange,
  memberName,
  currentStatus,
  targetStatus,
  isSubmitting,
  onConfirm,
}: MemberStatusDialogProps) {
  const config = STATUS_CONFIG[targetStatus];

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(
      baseSchema.superRefine((data, ctx) => {
        if (config.requiresReason && !data.reason?.trim()) {
          ctx.addIssue({
            code:    z.ZodIssueCode.custom,
            message: 'Reason is required',
            path:    ['reason'],
          });
        }
        if (config.requiresResumeDate && !data.freezeEndDate) {
          ctx.addIssue({
            code:    z.ZodIssueCode.custom,
            message: 'Resume date is required',
            path:    ['freezeEndDate'],
          });
        }
      }),
    ),
  });

  function handleClose() {
    reset();
    onOpenChange(false);
  }

  function onSubmit(values: FormValues) {
    onConfirm({
      status:        targetStatus,
      reason:        values.reason    || undefined,
      freezeEndDate: values.freezeEndDate || undefined,
      notes:         values.notes     || undefined,
    });
  }

  // Min date for freeze = tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {config.icon}
            <DialogTitle className={config.color}>{config.label}</DialogTitle>
          </div>
          <DialogDescription>
            <span className="font-medium text-foreground">{memberName}</span>
            {' — '}
            {config.description}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

          {/* Impact list */}
          <div className="rounded-lg bg-muted/50 border p-3 space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              What will happen
            </p>
            <ul className="space-y-1">
              {config.impact.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="mt-0.5 text-muted-foreground">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Freeze: resume date */}
          {config.requiresResumeDate && (
            <div className="space-y-1.5">
              <Label htmlFor="freezeEndDate">
                Resume Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="freezeEndDate"
                type="date"
                min={minDate}
                className={errors.freezeEndDate ? 'border-destructive' : ''}
                {...register('freezeEndDate')}
              />
              {errors.freezeEndDate && (
                <p className="text-xs text-destructive">{errors.freezeEndDate.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Subscription expiry will automatically extend by the number of frozen days.
              </p>
            </div>
          )}

          {/* Reason */}
          <div className="space-y-1.5">
            <Label htmlFor="reason">
              Reason
              {config.requiresReason && <span className="text-destructive"> *</span>}
              {!config.requiresReason && (
                <span className="text-muted-foreground text-xs ml-1">(optional)</span>
              )}
            </Label>
            <Textarea
              id="reason"
              rows={2}
              placeholder={
                targetStatus === 'suspended'
                  ? 'e.g. Outstanding dues, rule violation…'
                  : targetStatus === 'frozen'
                  ? 'e.g. Travelling, medical leave…'
                  : targetStatus === 'inactive'
                  ? 'e.g. Member requested cancellation…'
                  : 'e.g. Member returned to gym…'
              }
              className={errors.reason ? 'border-destructive' : ''}
              {...register('reason')}
            />
            {errors.reason && (
              <p className="text-xs text-destructive">{errors.reason.message}</p>
            )}
          </div>

          {/* Frozen: optional notes */}
          {targetStatus === 'frozen' && (
            <div className="space-y-1.5">
              <Label htmlFor="notes">
                Notes <span className="text-muted-foreground text-xs">(optional)</span>
              </Label>
              <Input
                id="notes"
                placeholder="Internal staff notes…"
                {...register('notes')}
              />
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              variant={
                targetStatus === 'active'
                  ? 'default'
                  : targetStatus === 'frozen'
                  ? 'secondary'
                  : 'destructive'
              }
            >
              {isSubmitting ? 'Saving…' : config.label}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}