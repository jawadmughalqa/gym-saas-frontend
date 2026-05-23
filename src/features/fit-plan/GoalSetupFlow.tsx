import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { Loader2, ChevronRight, ChevronLeft, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { useSetupFitPlanMutation } from "./hooks/use-fit-plan";

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  goal: z.enum(["weight_loss", "muscle_gain", "maintain", "endurance", "recovery"], {
    required_error: "Please select a goal",
  }),
  currentWeight: z.coerce
    .number({ invalid_type_error: "Enter your current weight" })
    .min(20, "Weight must be at least 20 kg")
    .max(400, "Weight must be at most 400 kg"),
  targetWeight: z.coerce.number().min(20).max(400).optional().or(z.literal("")),
  activityLevel: z.enum(["sedentary", "light", "moderate", "active", "very_active"], {
    required_error: "Please select your activity level",
  }),
  fitnessLevel: z.enum(["beginner", "intermediate", "advanced"], {
    required_error: "Please select your fitness level",
  }),
  trainingDaysPerWeek: z.coerce
    .number()
    .int()
    .min(3, "Minimum 3 days")
    .max(6, "Maximum 6 days"),
  dietaryRestrictions: z.array(z.string()).default([]),
});

type FormValues = z.infer<typeof schema>;

// ─── Step field map ───────────────────────────────────────────────────────────

const STEP_FIELDS: Record<number, (keyof FormValues)[]> = {
  0: ["goal"],
  1: ["currentWeight", "activityLevel", "fitnessLevel"],
  2: ["trainingDaysPerWeek"],
};

// ─── Option configs ───────────────────────────────────────────────────────────

const GOALS = [
  { value: "weight_loss", label: "Lose Weight",     emoji: "🔥" },
  { value: "muscle_gain", label: "Build Muscle",     emoji: "💪" },
  { value: "maintain",    label: "Stay Fit",         emoji: "⚖️" },
  { value: "endurance",   label: "Build Endurance",  emoji: "🏃" },
  { value: "recovery",    label: "Active Recovery",  emoji: "🧘" },
] as const;

const ACTIVITY_LEVELS = [
  { value: "sedentary",   label: "Sedentary",         desc: "Little or no exercise" },
  { value: "light",       label: "Lightly Active",    desc: "1–3 days/week" },
  { value: "moderate",    label: "Moderately Active", desc: "3–5 days/week" },
  { value: "active",      label: "Very Active",       desc: "6–7 days/week" },
  { value: "very_active", label: "Extra Active",      desc: "Physical job + training" },
] as const;

const FITNESS_LEVELS = [
  { value: "beginner",     label: "Beginner",     desc: "New to working out" },
  { value: "intermediate", label: "Intermediate", desc: "1–2 years experience" },
  { value: "advanced",     label: "Advanced",     desc: "3+ years experience" },
] as const;

const DIETARY_OPTIONS = [
  "vegetarian", "vegan", "gluten_free", "dairy_free", "halal", "kosher",
];

const STEP_TITLES = [
  "What do you want to achieve?",
  "Tell us about your fitness",
  "Customise your plan",
];

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={cn(
            "h-2 rounded-full transition-all duration-300",
            i < step    ? "w-6 bg-primary"
            : i === step ? "w-6 bg-primary/60"
            : "w-2 bg-muted",
          )}
        />
      ))}
    </div>
  );
}

// ─── GoalSetupFlow ────────────────────────────────────────────────────────────

interface GoalSetupFlowProps {
  onComplete?: () => void;
  /** Pre-filled values when editing an existing plan */
  initialValues?: Partial<FormValues>;
  /** 'setup' = first-time creation, 'edit' = changing goal mid-plan */
  mode?: 'setup' | 'edit';
}

export default function GoalSetupFlow({ onComplete, initialValues, mode = 'setup' }: GoalSetupFlowProps) {
  const [step, setStep] = useState(0);
  const setup = useSetupFitPlanMutation();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      goal:                initialValues?.goal                ?? "weight_loss",
      currentWeight:       initialValues?.currentWeight       ?? ('' as unknown as number),
      targetWeight:        initialValues?.targetWeight        ?? '',
      activityLevel:       initialValues?.activityLevel       ?? "moderate",
      fitnessLevel:        initialValues?.fitnessLevel        ?? "beginner",
      trainingDaysPerWeek: initialValues?.trainingDaysPerWeek ?? 4,
      dietaryRestrictions: initialValues?.dietaryRestrictions ?? [],
    },
  });

  const watchGoal     = form.watch("goal");
  const watchActivity = form.watch("activityLevel");
  const watchFitness  = form.watch("fitnessLevel");
  const watchDays     = form.watch("trainingDaysPerWeek");
  const watchDietary  = form.watch("dietaryRestrictions") ?? [];

  // Validate fields for the current step, then advance
  async function handleNext() {
    const valid = await form.trigger(STEP_FIELDS[step]);
    if (valid) setStep((s) => s + 1);
  }

  // Called only from the final step's button — never from form submit event
  function handleSubmit() {
    void form.handleSubmit((values: FormValues) => {
      const payload = {
        ...values,
        targetWeight:
          values.targetWeight === "" ? undefined : (values.targetWeight as number | undefined),
      };
      setup.mutate({ data: payload }, { onSuccess: () => onComplete?.() });
    })();
  }

  function toggleDietary(val: string) {
    const next = watchDietary.includes(val)
      ? watchDietary.filter((d) => d !== val)
      : [...watchDietary, val];
    form.setValue("dietaryRestrictions", next);
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
          <Target className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">
          {mode === 'edit' ? 'Update Your FitPlan' : 'Set Up Your FitPlan'}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Step {step + 1} of 3 — {STEP_TITLES[step]}
        </p>
      </div>

      <StepIndicator step={step} total={3} />

      {/*
        NOTE: No onSubmit on the <form> tag intentionally.
        Submission is triggered only by the explicit button on step 2.
        This prevents Enter-key implicit submit and button-swap accidents.
      */}
      <Form {...form}>
        <form noValidate>

          {/* ── Step 0: Goal ─────────────────────────────────────────── */}
          {step === 0 && (
            <FormField
              control={form.control}
              name="goal"
              render={({ field, fieldState }) => (
                <FormItem>
                  <div className="space-y-2">
                    {GOALS.map((g) => (
                      <button
                        key={g.value}
                        type="button"
                        onClick={() => field.onChange(g.value)}
                        className={cn(
                          "w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all",
                          field.value === g.value
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/40",
                        )}
                      >
                        <span className="text-2xl">{g.emoji}</span>
                        <span className="font-medium">{g.label}</span>
                      </button>
                    ))}
                  </div>
                  {fieldState.error && (
                    <FormMessage>{fieldState.error.message}</FormMessage>
                  )}
                </FormItem>
              )}
            />
          )}

          {/* ── Step 1: Weight + Activity + Fitness ──────────────────── */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="currentWeight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Current Weight (kg) <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="75"
                          {...field}
                          // Prevent Enter key from submitting the form
                          onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="targetWeight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Weight (kg)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="70 (optional)"
                          {...field}
                          onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="activityLevel"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>
                      Activity Level <span className="text-destructive">*</span>
                    </FormLabel>
                    <div className="space-y-1.5">
                      {ACTIVITY_LEVELS.map((a) => (
                        <button
                          key={a.value}
                          type="button"
                          onClick={() => field.onChange(a.value)}
                          className={cn(
                            "w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm transition-all",
                            field.value === a.value
                              ? "border-primary bg-primary/5 font-medium"
                              : "border-border hover:border-primary/40",
                          )}
                        >
                          <span>{a.label}</span>
                          <span className="text-xs text-muted-foreground">{a.desc}</span>
                        </button>
                      ))}
                    </div>
                    {fieldState.error && (
                      <FormMessage>{fieldState.error.message}</FormMessage>
                    )}
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fitnessLevel"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>
                      Fitness Level <span className="text-destructive">*</span>
                    </FormLabel>
                    <div className="grid grid-cols-3 gap-2">
                      {FITNESS_LEVELS.map((f) => (
                        <button
                          key={f.value}
                          type="button"
                          onClick={() => field.onChange(f.value)}
                          className={cn(
                            "flex flex-col items-center py-3 rounded-xl border-2 text-sm transition-all",
                            field.value === f.value
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/40",
                          )}
                        >
                          <span className="font-medium">{f.label}</span>
                          <span className="text-xs text-muted-foreground">{f.desc}</span>
                        </button>
                      ))}
                    </div>
                    {fieldState.error && (
                      <FormMessage>{fieldState.error.message}</FormMessage>
                    )}
                  </FormItem>
                )}
              />
            </div>
          )}

          {/* ── Step 2: Training days + dietary ──────────────────────── */}
          {step === 2 && (
            <div className="space-y-5">
              <FormField
                control={form.control}
                name="trainingDaysPerWeek"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>
                      Training Days Per Week <span className="text-destructive">*</span>
                    </FormLabel>
                    <div className="flex gap-2">
                      {[3, 4, 5, 6].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => field.onChange(n)}
                          className={cn(
                            "flex-1 py-3 rounded-xl border-2 font-semibold text-sm transition-all",
                            field.value === n
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/40",
                          )}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                    {fieldState.error && (
                      <FormMessage>{fieldState.error.message}</FormMessage>
                    )}
                  </FormItem>
                )}
              />

              <FormItem>
                <FormLabel>
                  Dietary Restrictions{" "}
                  <span className="text-muted-foreground text-xs font-normal">(optional)</span>
                </FormLabel>
                <div className="flex flex-wrap gap-2">
                  {DIETARY_OPTIONS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleDietary(d)}
                      className={cn(
                        "px-3 py-1.5 rounded-full border text-sm capitalize transition-all",
                        watchDietary.includes(d)
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:border-primary/40",
                      )}
                    >
                      {d.replace(/_/g, " ")}
                    </button>
                  ))}
                </div>
              </FormItem>
            </div>
          )}

          {/* ── Navigation ────────────────────────────────────────────── */}
          <div className="flex gap-3 mt-8">
            {step > 0 && (
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                disabled={setup.isPending}
                onClick={() => setStep((s) => s - 1)}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
            )}

            {step < 2 ? (
              <Button
                type="button"
                className="flex-1"
                onClick={handleNext}
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              /* type="button" — never submit via Enter or button-swap.
                 handleSubmit is called explicitly via onClick only. */
              <Button
                type="button"
                className="flex-1"
                disabled={setup.isPending}
                onClick={handleSubmit}
              >
                {setup.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === 'edit' ? 'Update My FitPlan 🔄' : 'Create My FitPlan 🚀'}
              </Button>
            )}
          </div>

        </form>
      </Form>
    </div>
  );
}
