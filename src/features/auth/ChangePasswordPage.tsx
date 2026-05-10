import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { usePostAuthPasswordChange } from "@/api/generated/auth/auth";

const schema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain at least one uppercase letter")
      .regex(/[0-9]/, "Must contain at least one number"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ChangePasswordForm = z.infer<typeof schema>;

function PasswordField({
  id,
  label,
  disabled,
  error,
  registration,
}: {
  id: string;
  label: string;
  disabled: boolean;
  error?: string;
  registration: ReturnType<
    ReturnType<typeof useForm<ChangePasswordForm>>["register"]
  >;
}) {
  const [show, setShow] = useState(false);

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          autoComplete={id === "currentPassword" ? "current-password" : "new-password"}
          disabled={disabled}
          className={error ? "border-destructive pr-10" : "pr-10"}
          {...registration}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShow((v) => !v)}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export default function ChangePasswordPage() {
  // ✅ Hook called at component top-level — never inside an event handler
  const { mutate, isPending, isError, error } = usePostAuthPasswordChange();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordForm>({ resolver: zodResolver(schema) });

  function onSubmit(values: ChangePasswordForm) {
    // ✅ orval wraps the body in { data: DTO } — not the DTO directly
    mutate(
      {
        data: {
          currentPassword: values.currentPassword,
          confirmPassword: values.confirmPassword,
          newPassword: values.newPassword,
        },
      },
      { onSuccess: () => reset() },
    );
  }

  // orval ErrorType wraps Axios — the API message lives at error.response.data.message
  const errorMessage =
    error != null &&
    typeof error === "object" &&
    "response" in error &&
    (error as { response?: { data?: { message?: string } } }).response?.data?.message
      ? (error as { response: { data: { message: string } } }).response.data.message
      : "Failed to update password.";

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Change Password</h1>
        <p className="text-sm text-muted-foreground">
          Update your account password.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Password requirements</CardTitle>
          <CardDescription>
            At least 8 characters, one uppercase letter, and one number.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4"
            noValidate
          >
            {isError && (
              <div
                role="alert"
                className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive"
              >
                {errorMessage}
              </div>
            )}

            <PasswordField
              id="currentPassword"
              label="Current password"
              disabled={isPending}
              error={errors.currentPassword?.message}
              registration={register("currentPassword")}
            />

            <PasswordField
              id="newPassword"
              label="New password"
              disabled={isPending}
              error={errors.newPassword?.message}
              registration={register("newPassword")}
            />

            <PasswordField
              id="confirmPassword"
              label="Confirm new password"
              disabled={isPending}
              error={errors.confirmPassword?.message}
              registration={register("confirmPassword")}
            />

            <div className="pt-2">
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating…
                  </>
                ) : (
                  "Update password"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}