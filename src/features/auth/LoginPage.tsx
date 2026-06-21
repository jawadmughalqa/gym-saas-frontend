import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2, Dumbbell, BarChart3, Users, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useLogin } from './hooks/use-auth';
import { getErrorMessage } from '@/utils/error';

// ─── Schema (unchanged) ───────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

// ─── Decorative feature list ──────────────────────────────────────────────────

const FEATURES = [
  { icon: Users,       text: 'Member & trainer management' },
  { icon: BarChart3,   text: 'Revenue analytics & reports' },
  { icon: Dumbbell,    text: 'Equipment & maintenance tracking' },
  { icon: ShieldCheck, text: 'Role-based access control' },
];

// ─── LoginPage ────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const login = useLogin();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  return (
    <div className="flex min-h-screen">
      {/* ── Left: form panel ── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-background px-6 py-12 lg:px-12">
        <div className="w-full max-w-sm space-y-8">
          {/* Logo */}
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 mb-6">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-sm">
                <span className="text-sm font-bold text-primary-foreground">G</span>
              </div>
              <span className="text-xl font-semibold tracking-tight">Gymanger</span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
            <p className="text-sm text-muted-foreground">
              Sign in to your account to continue
            </p>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit((values) => login.mutate(values))}
            className="space-y-5"
            noValidate
          >
            {/* Server-level error */}
            {login.isError && (
              <Alert variant="destructive">
                <AlertDescription>
                  {getErrorMessage(login.error)}
                </AlertDescription>
              </Alert>
            )}

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                autoFocus
                disabled={login.isPending}
                className={errors.email ? 'border-destructive focus-visible:ring-destructive/30' : ''}
                {...register('email')}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  disabled={login.isPending}
                  className={errors.password ? 'border-destructive focus-visible:ring-destructive/30 pr-10' : 'pr-10'}
                  {...register('password')}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={login.isPending}>
              {login.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            Having trouble?{' '}
            <span className="text-foreground/60">Contact your system administrator.</span>
          </p>
        </div>
      </div>

      {/* ── Right: decorative panel — hidden below lg ── */}
      <div className="hidden lg:flex flex-1 flex-col items-center justify-center bg-primary px-12 py-12 text-primary-foreground">
        <div className="max-w-md space-y-10">
          {/* Headline */}
          <div className="space-y-3">
            <h2 className="text-3xl font-semibold tracking-tight leading-snug">
              Everything you need to run your gym — in one place.
            </h2>
            <p className="text-primary-foreground/70 text-base leading-relaxed">
              Gymanger brings members, trainers, equipment, billing, and analytics together in a single, streamlined platform.
            </p>
          </div>

          {/* Feature list */}
          <ul className="space-y-4">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-card/15">
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-sm text-primary-foreground/90">{text}</span>
              </li>
            ))}
          </ul>

          {/* Testimonial */}
          <div className="rounded-xl bg-card/10 px-5 py-4 border border-white/15">
            <p className="text-sm text-primary-foreground/80 italic leading-relaxed">
              "Gymanger cut our admin time in half. Everything from member check-ins to monthly invoices just works."
            </p>
            {/* <p className="mt-3 text-xs font-medium text-primary-foreground/60">
              — Gym Owner, Apex Fitness
            </p> */}
          </div>
        </div>
      </div>
    </div>
  );
}
