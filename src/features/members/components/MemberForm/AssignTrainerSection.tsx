/**
 * AssignTrainerSection
 *
 * Collapsible section shown during member CREATION only.
 * Lets staff optionally pick a trainer, set a monthly PT charge (pre-filled
 * from the trainer's default rate), goal, and sessions/week.
 *
 * When a trainer + charge are provided the backend will auto-create a
 * personal_training invoice on assignment.
 */

import { useEffect } from 'react';
import { useController, type Control, type FieldErrors } from 'react-hook-form';
import { ChevronDown, ChevronUp, Plus, User } from 'lucide-react';
import { Input }  from '@/components/ui/input';
import { Label }  from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useGetTrainers } from '@/api/generated/trainers/trainers';
import { CURRENCY } from '@/config/tenant.config';
import type { MemberFormValues } from './types';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  control:   Control<MemberFormValues>;
  errors:    FieldErrors<MemberFormValues>;
  isPending: boolean;
  branchId?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AssignTrainerSection({ control, errors, isPending, branchId }: Props) {
  // ── Controlled fields ─────────────────────────────────────────────────────
  const { field: enabledField }  = useController({ control, name: 'trainer.enabled' });
  const { field: trainerField }  = useController({ control, name: 'trainer.trainerId' });
  const { field: goalField }     = useController({ control, name: 'trainer.goal' });
  const { field: sessionsField } = useController({ control, name: 'trainer.sessionFrequencyPerWeek' });
  const { field: chargeField }   = useController({ control, name: 'trainer.monthlyCharge' });

  const expanded = !!enabledField.value;

  // ── Fetch trainers only when section is opened ────────────────────────────
  const { data: trainersData, isLoading: loadingTrainers } = useGetTrainers(
    {
      status:        'active',
      availableOnly: true,
      ...(branchId ? { branchId } : {}),
      limit: 100,
    },
    { query: { enabled: expanded } },
  );
  const trainers = trainersData?.data ?? [];

  // ── Pre-fill monthlyCharge from trainer's monthlyRate when trainer changes ─
  useEffect(() => {
    if (!trainerField.value) {
      chargeField.onChange(undefined);
      return;
    }
    const t = trainers.find((tr) => tr._id === trainerField.value);
    const rate = (t as any)?.monthlyRate;
    if (rate != null) {
      chargeField.onChange(rate);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trainerField.value, trainers.length]);

  // ── Toggle ────────────────────────────────────────────────────────────────
  function handleToggle() {
    const next = !expanded;
    enabledField.onChange(next);
    if (!next) {
      trainerField.onChange('');
      goalField.onChange('');
      sessionsField.onChange(undefined);
      chargeField.onChange(undefined);
    }
  }

  // ── Selected trainer display name ─────────────────────────────────────────
  const selectedTrainer = trainers.find((t) => t._id === trainerField.value);
  const trainerName = selectedTrainer
    ? `${(selectedTrainer as any).userId?.firstName ?? ''} ${(selectedTrainer as any).userId?.lastName ?? ''}`.trim()
    : null;

  const chargeVal = chargeField.value as number | undefined;

  return (
    <section className="space-y-3">
      {/* ── Toggle button ──────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={handleToggle}
        className={`w-full flex items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors ${
          expanded
            ? 'border-primary bg-primary/5 text-primary'
            : 'border-dashed border-muted-foreground/40 text-muted-foreground hover:border-primary/50 hover:text-foreground'
        }`}
      >
        <div className="flex items-center gap-2">
          {!expanded && <Plus className="h-4 w-4" />}
          <div>
            <p className="text-sm font-medium">
              {expanded ? 'Assign Trainer' : 'Assign Trainer (optional)'}
            </p>
            {!expanded && (
              <p className="text-xs opacity-70">
                Assign a personal trainer — PT fee invoice auto-created
              </p>
            )}
          </div>
        </div>
        {expanded
          ? <ChevronUp   className="h-4 w-4 shrink-0" />
          : <ChevronDown className="h-4 w-4 shrink-0" />}
      </button>

      {/* ── Expanded content ───────────────────────────────────────────────── */}
      {expanded && (
        <div className="rounded-lg border p-4 space-y-4">

          {/* Trainer selector */}
          <div className="space-y-1.5">
            <Label>
              Trainer <span className="text-destructive">*</span>
            </Label>
            <Select
              value={trainerField.value as string}
              onValueChange={(v) => trainerField.onChange(v)}
              disabled={isPending || loadingTrainers}
            >
              <SelectTrigger
                className={errors.trainer?.trainerId ? 'border-destructive' : ''}
              >
                <SelectValue
                  placeholder={
                    loadingTrainers
                      ? 'Loading trainers…'
                      : trainers.length === 0
                        ? 'No available trainers'
                        : 'Select a trainer'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {trainers.map((trainer) => {
                  const user = (trainer as any).userId;
                  const name = user
                    ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
                    : trainer._id;
                  const specs: string[] = (trainer as any).specializations ?? [];
                  const slots = (trainer as any).maxClients - (trainer as any).currentClientCount;
                  const rate  = (trainer as any).monthlyRate;
                  return (
                    <SelectItem key={trainer._id} value={trainer._id ?? ''}>
                      <div className="flex items-center justify-between w-full gap-4">
                        <div className="flex items-center gap-2">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{name}</span>
                          {specs.length > 0 && (
                            <span className="text-xs text-muted-foreground">
                              · {specs.slice(0, 2).join(', ')}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {rate != null && (
                            <span className="text-xs text-muted-foreground">
                              {CURRENCY} {Number(rate).toLocaleString()}/mo
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {slots} slot{slots !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {errors.trainer?.trainerId && (
              <p className="text-xs text-destructive">
                {errors.trainer.trainerId.message}
              </p>
            )}
          </div>

          {/* Show rest of fields only after trainer is selected */}
          {trainerField.value && (
            <>
              {/* Monthly PT charge */}
              <div className="space-y-1.5">
                <Label htmlFor="ptCharge">PT Charge / Month ({CURRENCY})</Label>
                <Input
                  id="ptCharge"
                  type="number"
                  min="0"
                  placeholder="e.g. 5000"
                  disabled={isPending}
                  value={chargeVal ?? ''}
                  onChange={(e) =>
                    chargeField.onChange(e.target.value ? Number(e.target.value) : undefined)
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Pre-filled from trainer's default rate. A PT fee invoice is created automatically when set.
                </p>
              </div>

              {/* Goal */}
              <div className="space-y-1.5">
                <Label htmlFor="trainerGoal">Goal</Label>
                <Input
                  id="trainerGoal"
                  placeholder="e.g. Weight loss, Muscle gain, Rehabilitation"
                  disabled={isPending}
                  value={goalField.value as string}
                  onChange={(e) => goalField.onChange(e.target.value)}
                />
              </div>

              {/* Sessions per week */}
              <div className="space-y-1.5">
                <Label htmlFor="sessionsPerWeek">Sessions per Week</Label>
                <Select
                  value={String(sessionsField.value ?? '')}
                  onValueChange={(v) => sessionsField.onChange(v ? Number(v) : undefined)}
                  disabled={isPending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}x per week
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Summary card */}
              <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 flex items-center gap-3">
                <User className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-medium text-primary">{trainerName}</p>
                  <p className="text-xs text-muted-foreground">
                    {chargeVal && chargeVal > 0
                      ? `PT fee invoice of ${CURRENCY} ${chargeVal.toLocaleString()} will be created`
                      : 'No PT fee invoice (charge not set)'}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
