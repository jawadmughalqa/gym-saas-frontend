import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { KeyRound, Copy, Check, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/utils/error';
import { usePostSuperTenants } from '@/api/generated/super-admin/super-admin';
import type { CreateTenantResponseData } from '@/api/generated/schemas/createTenantResponseData';

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  businessName:     z.string().min(2, 'At least 2 characters').max(100),
  contactEmail:     z.string().email('Invalid email'),
  contactPhone:     z.string().optional(),
  country:          z.string().min(1, 'Country is required'),
  plan:             z.enum(['starter', 'pro', 'enterprise']).optional(),
  ownerFirstName:   z.string().min(1, 'Required'),
  ownerLastName:    z.string().min(1, 'Required'),
  ownerEmail:       z.string().email('Invalid email'),
  trialDays: z
    .string()
    .optional()
    .transform((v) => (v === '' || v === undefined ? undefined : Number(v)))
    .pipe(z.number().min(0).max(90).optional()),
  firstInvoiceDate: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface CreateTenantFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

// ─── CopyField — shows value + copy button ────────────────────────────────────

function CopyField({
  label,
  value,
  secret = false,
}: {
  label: string;
  value: string;
  secret?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(false);

  function handleCopy() {
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const displayed = secret && !revealed ? '••••••••••••' : value;

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <div className="flex items-center gap-2 rounded bg-muted px-3 py-2 font-mono text-sm">
        {secret && (
          <button
            type="button"
            onClick={() => setRevealed((r) => !r)}
            className="text-muted-foreground hover:text-foreground shrink-0"
          >
            {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
        {!secret && <KeyRound className="h-4 w-4 text-muted-foreground shrink-0" />}
        <span className="flex-1 select-all truncate">{displayed}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="text-muted-foreground hover:text-foreground shrink-0"
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}

// ─── CreateTenantForm ─────────────────────────────────────────────────────────

export default function CreateTenantForm({ open, onOpenChange, onSuccess }: CreateTenantFormProps) {
  const [created, setCreated] = useState<CreateTenantResponseData | null>(null);

  // Default firstInvoiceDate to today
  const todayStr = new Date().toISOString().split('T')[0]!;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      businessName:     '',
      contactEmail:     '',
      contactPhone:     '',
      country:          'Pakistan',
      plan:             'starter',
      ownerFirstName:   '',
      ownerLastName:    '',
      ownerEmail:       '',
      trialDays:        undefined,
      firstInvoiceDate: todayStr,
    },
  });

  const create = usePostSuperTenants({
    mutation: {
      onSuccess: (res) => {
        setCreated(res.data ?? null);
        onSuccess?.();
        form.reset();
      },
      onError: (err) => toast({ variant: 'destructive', title: 'Failed to provision tenant', description: getErrorMessage(err) }),
    },
  });

  function onSubmit(values: FormValues) {
    create.mutate({
      data: {
        businessName:  values.businessName,
        contactEmail:  values.contactEmail,
        ...(values.contactPhone && { contactPhone: values.contactPhone }),
        country:       values.country,
        ...(values.plan && { plan: values.plan }),
        ownerFirstName: values.ownerFirstName,
        ownerLastName:  values.ownerLastName,
        ownerEmail:     values.ownerEmail,
        ...(values.trialDays !== undefined && { trialDays: values.trialDays }),
        ...(values.firstInvoiceDate && { firstInvoiceDate: values.firstInvoiceDate }),
      },
    });
  }

  function handleClose(v: boolean) {
    if (!v) setCreated(null);
    onOpenChange(v);
  }

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="w-full px-4 sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>Provision New Tenant</SheetTitle>
          <SheetDescription>
            Create a new gym organisation and its owner account.
          </SheetDescription>
        </SheetHeader>

        {/* ── Success state — show credentials ── */}
        {created ? (
          <div className="space-y-4">
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
              <AlertDescription className="text-green-700 dark:text-green-300 font-medium">
                ✓ Tenant provisioned successfully!
              </AlertDescription>
            </Alert>

            <div className="rounded-lg border p-4 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Business</p>
                <p className="font-medium">{created.tenant?.businessName}</p>
              </div>

              <CopyField label="Owner Email" value={created.ownerEmail ?? ''} />

              {created.tempPassword && (
                <>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground">Temporary Password</p>
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                      One-time — copy now
                    </Badge>
                  </div>
                  <CopyField
                    label=""
                    value={created.tempPassword}
                    secret
                  />
                </>
              )}

              <p className="text-xs text-muted-foreground pt-1">
                These credentials have also been sent to the owner's email address.
              </p>
            </div>

            <Button className="w-full" onClick={() => handleClose(false)}>
              Done
            </Button>
          </div>
        ) : (
          /* ── Create form ── */
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

              {/* Organisation */}
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Organisation
              </p>

              <FormField
                control={form.control}
                name="businessName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Name *</FormLabel>
                    <FormControl><Input placeholder="Apex Fitness" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Email *</FormLabel>
                      <FormControl><Input type="email" placeholder="info@gym.com" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl><Input placeholder="+92..." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country *</FormLabel>
                      <FormControl><Input placeholder="Pakistan" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="plan"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plan</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="starter">Starter</SelectItem>
                          <SelectItem value="pro">Pro</SelectItem>
                          <SelectItem value="enterprise">Enterprise</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Billing */}
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-1">
                Billing
              </p>

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="firstInvoiceDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Invoice Date *</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          value={field.value ?? todayStr}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="trialDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Trial Days</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          max={90}
                          placeholder="0 = no trial"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Owner Account */}
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-1">
                Owner Account
              </p>

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="ownerFirstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name *</FormLabel>
                      <FormControl><Input placeholder="John" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="ownerLastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name *</FormLabel>
                      <FormControl><Input placeholder="Smith" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="ownerEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Owner Email *</FormLabel>
                    <FormControl><Input type="email" placeholder="owner@gym.com" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <p className="text-xs text-muted-foreground">
                A secure temporary password will be auto-generated and emailed to the owner.
              </p>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => handleClose(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={create.isPending}>
                  {create.isPending ? 'Provisioning…' : 'Create Tenant'}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </SheetContent>
    </Sheet>
  );
}
