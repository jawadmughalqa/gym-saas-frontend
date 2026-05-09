import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useLogMeasurement } from '../hooks/use-members';

// ─── Schema ───────────────────────────────────────────────────────────────────

const optionalNumber = z
  .string()
  .optional()
  .transform((v) => (v === '' || v === undefined ? undefined : Number(v)))
  .pipe(z.number().positive('Must be positive').optional());

const formSchema = z.object({
  date:            z.string().optional(),
  weightKg:        optionalNumber,
  heightCm:        optionalNumber,
  bodyFatPercent:  optionalNumber,
  chest:           optionalNumber,
  waist:           optionalNumber,
  hips:            optionalNumber,
  thigh:           optionalNumber,
  bicep:           optionalNumber,
  neck:            optionalNumber,
  notes:           z.string().max(500).optional(),
});

type FormValues = z.infer<typeof formSchema>;

// ─── Props ────────────────────────────────────────────────────────────────────

interface MeasurementFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MeasurementForm({ open, onOpenChange, memberId }: MeasurementFormProps) {
  const logMeasurement = useLogMeasurement(memberId, { onSuccess: () => onOpenChange(false) });
  const isPending = logMeasurement.isPending;

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  function onSubmit(values: FormValues) {
    logMeasurement.mutate({
      date:           values.date || undefined,
      weightKg:       values.weightKg,
      heightCm:       values.heightCm,
      bodyFatPercent: values.bodyFatPercent,
      measurements: {
        chest: values.chest,
        waist: values.waist,
        hips:  values.hips,
        thigh: values.thigh,
        bicep: values.bicep,
        neck:  values.neck,
      },
      notes: values.notes || undefined,
    });
  }

  function handleOpenChange(val: boolean) {
    if (!val) reset();
    onOpenChange(val);
  }

  function numField(label: string, name: keyof FormValues, unit?: string) {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={name}>
          {label}{unit && <span className="ml-1 text-muted-foreground text-xs">({unit})</span>}
        </Label>
        <Input
          id={name}
          type="number"
          step="0.1"
          min="0"
          placeholder="—"
          disabled={isPending}
          className={errors[name] ? 'border-destructive' : ''}
          {...register(name as Parameters<typeof register>[0])}
        />
        {errors[name] && (
          <p className="text-xs text-destructive">{(errors[name] as { message?: string })?.message}</p>
        )}
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log Measurement</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

          {/* Date */}
          <div className="space-y-1.5">
            <Label htmlFor="measureDate">Date</Label>
            <Input id="measureDate" type="date" disabled={isPending} {...register('date')} />
            <p className="text-xs text-muted-foreground">Defaults to today if left blank.</p>
          </div>

          <Separator />

          {/* Body stats */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Body Stats</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {numField('Weight', 'weightKg', 'kg')}
              {numField('Height', 'heightCm', 'cm')}
              {numField('Body Fat', 'bodyFatPercent', '%')}
            </div>
          </div>

          <Separator />

          {/* Circumferences */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Circumferences (cm)</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {numField('Chest', 'chest')}
              {numField('Waist', 'waist')}
              {numField('Hips', 'hips')}
              {numField('Thigh', 'thigh')}
              {numField('Bicep', 'bicep')}
              {numField('Neck', 'neck')}
            </div>
          </div>

          <Separator />

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="measureNotes">Notes</Label>
            <Textarea
              id="measureNotes"
              placeholder="Optional notes…"
              disabled={isPending}
              {...register('notes')}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Measurement
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
