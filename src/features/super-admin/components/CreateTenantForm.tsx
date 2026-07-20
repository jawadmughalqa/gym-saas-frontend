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
import { DatePicker } from '@/components/ui/date-picker';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { KeyRound, Copy, Check, Eye, EyeOff, AlertCircle, Loader2, Info } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/utils/error';
import { usePostSuperTenants, useGetSuperPlans } from '@/api/generated/super-admin/super-admin';
import { orvalMutator } from '@/lib/orval-mutator';
import { COUNTRY_BY_NAME } from '@/config/world-countries';
import { PhoneInput } from '@/components/ui/phone-input';
import { isValidPhoneNumber, isPossiblePhoneNumber, type CountryCode } from 'libphonenumber-js';
import type { CreateTenantResponseData } from '@/api/generated/schemas/createTenantResponseData';

// ─── Types ────────────────────────────────────────────────────────────────────

interface EnabledCountry {
  name: string;
  code: string;
  currencyCode: string;
  currencyName: string;
  currencySymbol: string;
}

// ─── Zod schema ───────────────────────────────────────────────────────────────

const schema = z.object({
  businessName:     z.string().min(2, 'At least 2 characters').max(100),
  contactEmail:     z.string().email('Invalid email'),
  contactPhone:     z.string().optional(),
  country:          z.string().min(1, 'Country is required'),
  currency:         z.string().length(3, 'Currency required'),
  currencySymbol:   z.string().min(1),
  plan:             z.string().optional(),
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

// ─── CopyField ────────────────────────────────────────────────────────────────

function CopyField({ label, value, secret = false }: { label: string; value: string; secret?: boolean }) {
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
          <button type="button" onClick={() => setRevealed((r) => !r)} className="text-muted-foreground hover:text-foreground shrink-0">
            {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
        {!secret && <KeyRound className="h-4 w-4 text-muted-foreground shrink-0" />}
        <span className="flex-1 select-all truncate">{displayed}</span>
        <button type="button" onClick={handleCopy} className="text-muted-foreground hover:text-foreground shrink-0">
          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

// ─── CreateTenantForm ─────────────────────────────────────────────────────────

export default function CreateTenantForm({ open, onOpenChange, onSuccess }: CreateTenantFormProps) {
  const [created, setCreated] = useState<CreateTenantResponseData | null>(null);

  // Phone state
  const [phoneChecking, setPhoneChecking]       = useState(false);
  const [phoneDuplicate, setPhoneDuplicate]     = useState(false);
  const [phoneFormatError, setPhoneFormatError] = useState('');
  const [phoneCountryCode, setPhoneCountryCode] = useState('');   // ISO alpha-2 e.g. "PK"
  const [phoneCallingCode, setPhoneCallingCode] = useState('');   // e.g. "+92"
  const [phoneExample, setPhoneExample]         = useState('');
  const [phoneMask, setPhoneMask]               = useState('');   // for maxLength only

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const todayStr = new Date().toISOString().split('T')[0]!;

  // Load enabled countries from platform config
  const { data: platformConfig } = useQuery({
    queryKey: ['platform-config'],
    queryFn: async () => {
      const res = await orvalMutator<{ data: { enabledCountries: EnabledCountry[] } }>({
        url: '/super/platform-config',
        method: 'GET',
      });
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const enabledCountries: EnabledCountry[] = platformConfig?.enabledCountries ?? [];

  // Load available SaaS plans
  const { data: plansData } = useGetSuperPlans({ query: { staleTime: 5 * 60 * 1000 } });
  const availablePlans = (plansData?.data ?? []).filter((p) => p.isActive !== false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      businessName: '', contactEmail: '', contactPhone: '',
      country: '', currency: '', currencySymbol: '',
      plan: 'starter', ownerFirstName: '', ownerLastName: '', ownerEmail: '',
      trialDays: undefined, firstInvoiceDate: todayStr,
    },
  });

  // ── When country changes ──────────────────────────────────────────────────
  function handleCountryChange(countryName: string) {
    form.setValue('country', countryName);
    form.setValue('contactPhone', '');
    setPhoneDuplicate(false);
    setPhoneFormatError('');

    const enabled = enabledCountries.find((c) => c.name === countryName);
    if (enabled) {
      form.setValue('currency',       enabled.currencyCode,   { shouldValidate: true });
      form.setValue('currencySymbol', enabled.currencySymbol, { shouldValidate: true });
    }

    const meta = COUNTRY_BY_NAME.get(countryName);
    if (meta) {
      setPhoneCountryCode(meta.code);
      setPhoneCallingCode(meta.callingCode);
      setPhoneExample(meta.phoneExample);
      setPhoneMask(meta.phoneMask);
    } else {
      setPhoneCountryCode('');
      setPhoneCallingCode('');
      setPhoneExample('');
      setPhoneMask('');
    }
  }

  // ── Validate phone with libphonenumber-js ─────────────────────────────────
  function isPhoneValid(value: string): boolean {
    if (!phoneCountryCode || !value || value.trim() === phoneCallingCode || value.trim() === phoneCallingCode + ' ') return false;
    try {
      return isValidPhoneNumber(value, phoneCountryCode as CountryCode);
    } catch {
      return false;
    }
  }

  // ── Debounced uniqueness check ────────────────────────────────────────────
  const checkPhoneUniqueness = useCallback(async (phone: string) => {
    if (!phone) { setPhoneDuplicate(false); return; }
    setPhoneChecking(true);
    try {
      const res = await orvalMutator<{ data: { exists: boolean } }>({
        url: `/super/check-phone?phone=${encodeURIComponent(phone)}`,
        method: 'GET',
      });
      setPhoneDuplicate(res.data.exists);
    } catch {
      // ignore — let create attempt surface any server error
    } finally {
      setPhoneChecking(false);
    }
  }, []);

  // ── Free-text phone input handler ────────────────────────────────────────
  function handlePhoneChange(raw: string) {
    form.setValue('contactPhone', raw);
    setPhoneDuplicate(false);

    const stripped = raw.replace(/\D/g, '');
    const hasContent = raw.trim() !== '' && raw.trim() !== phoneCallingCode && raw.trim() !== phoneCallingCode + ' ';

    if (hasContent && phoneCountryCode) {
      const valid = isPhoneValid(raw);

      if (valid) {
        setPhoneFormatError('');
      } else {
        // Only show error once there are enough digits to form a complete national number
        // isPossiblePhoneNumber returns true when digit count is in the valid range for the country
        let possible = false;
        try { possible = isPossiblePhoneNumber(raw, phoneCountryCode as CountryCode); } catch { /* ignore */ }

        // Show error if: number is "possible" length but format is wrong, OR clearly too long (> mask length)
        const tooLong = phoneMask ? stripped.length > phoneMask.replace(/\D/g, '').length : stripped.length > 15;
        if (possible || tooLong) {
          setPhoneFormatError(`Invalid number. Example: ${phoneExample}`);
        } else {
          setPhoneFormatError(''); // Still typing — don't interrupt yet
        }
      }
    } else {
      setPhoneFormatError('');
    }

    // Debounce uniqueness check — only when number is fully valid
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (hasContent && isPhoneValid(raw)) {
      debounceRef.current = setTimeout(() => {
        void checkPhoneUniqueness(raw);
      }, 600);
    }
  }

  // Clean up debounce on unmount
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  // ── Submit ────────────────────────────────────────────────────────────────
  const create = usePostSuperTenants({
    mutation: {
      onSuccess: (res) => {
        setCreated(res.data ?? null);
        onSuccess?.();
        form.reset();
        setPhoneDuplicate(false);
        setPhoneFormatError('');
        setPhoneCountryCode('');
        setPhoneCallingCode('');
        setPhoneExample('');
        setPhoneMask('');
      },
      onError: (err) => toast({ variant: 'destructive', title: 'Failed to provision tenant', description: getErrorMessage(err) }),
    },
  });

  function onSubmit(values: FormValues) {
    if (phoneDuplicate) {
      toast({ variant: 'destructive', title: 'Phone number already registered' });
      return;
    }
    if (values.contactPhone && phoneCountryCode && !isPhoneValid(values.contactPhone)) {
      toast({ variant: 'destructive', title: 'Invalid phone number', description: `Expected: ${phoneExample}` });
      return;
    }

    create.mutate({
      data: {
        businessName:   values.businessName,
        contactEmail:   values.contactEmail,
        ...(values.contactPhone && { contactPhone: values.contactPhone }),
        country:        values.country,
        currency:       values.currency,
        currencySymbol: values.currencySymbol,
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
    if (!v) {
      setCreated(null);
      setPhoneDuplicate(false);
      setPhoneFormatError('');
      setPhoneCountryCode('');
      setPhoneCallingCode('');
      setPhoneExample('');
      setPhoneMask('');
      form.reset();
    }
    onOpenChange(v);
  }

  const selectedCurrency       = form.watch('currency');
  const selectedCurrencySymbol = form.watch('currencySymbol');
  const hasPhoneError          = phoneDuplicate || !!phoneFormatError;
  const phoneValue             = form.watch('contactPhone') ?? '';

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="w-full px-4 sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>Provision New Tenant</SheetTitle>
          <SheetDescription>Create a new gym organisation and its owner account.</SheetDescription>
        </SheetHeader>

        {/* ── Success state ── */}
        {created ? (
          <div className="space-y-4">
            <Alert className="border-green-500 bg-green-500/10 dark:bg-green-950">
              <AlertDescription className="text-green-500 dark:text-green-300 font-medium">
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
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0">One-time — copy now</Badge>
                  </div>
                  <CopyField label="" value={created.tempPassword} secret />
                </>
              )}
              <p className="text-xs text-muted-foreground pt-1">
                These credentials have also been sent to the owner's email address.
              </p>
            </div>
            <Button className="w-full" onClick={() => handleClose(false)}>Done</Button>
          </div>
        ) : (
          /* ── Create form ── */
          <TooltipProvider>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

                {/* Organisation */}
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Organisation</p>

                <FormField
                  control={form.control} name="businessName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Name *</FormLabel>
                      <FormControl><Input placeholder="Apex Fitness" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control} name="contactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Email *</FormLabel>
                      <FormControl><Input type="email" placeholder="info@gym.com" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Country + Plan */}
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control} name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country *</FormLabel>
                        {enabledCountries.length > 0 ? (
                          <Select value={field.value} onValueChange={handleCountryChange}>
                            <FormControl>
                              <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {enabledCountries.map((c) => (
                                <SelectItem key={c.code} value={c.name}>{c.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <FormControl><Input placeholder="Loading countries…" disabled /></FormControl>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control} name="plan"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Plan</FormLabel>
                        <Select value={field.value ?? ''} onValueChange={field.onChange}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {availablePlans.length > 0
                              ? availablePlans.map((p) => (
                                  <SelectItem key={p.name ?? ''} value={p.name ?? ''}>
                                    {p.displayName ?? p.name}
                                  </SelectItem>
                                ))
                              : (
                                <>
                                  <SelectItem value="starter">Starter</SelectItem>
                                  <SelectItem value="pro">Pro</SelectItem>
                                  <SelectItem value="enterprise">Enterprise</SelectItem>
                                </>
                              )
                            }
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Currency pill */}
                {selectedCurrency && (
                  <div className="flex items-center gap-2 rounded-md bg-muted/50 border px-3 py-2 text-sm">
                    <span className="text-muted-foreground">Default currency:</span>
                    <span className="font-semibold">{selectedCurrencySymbol} {selectedCurrency}</span>
                    <span className="text-xs text-muted-foreground ml-auto italic">auto-set from country</span>
                  </div>
                )}

                {/* Phone — masked + tooltip */}
                <FormField
                  control={form.control} name="contactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-1.5">
                        <FormLabel className="mb-0">Phone</FormLabel>

                        {/* Spinner while uniqueness check is in flight */}
                        {phoneChecking && (
                          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                        )}

                        {/* Tooltip: shown only after country selected */}
                        {phoneExample && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className="text-muted-foreground hover:text-foreground">
                                <Info className="h-3.5 w-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="text-xs max-w-[220px]">
                              <p className="font-medium mb-0.5">Phone format for {form.watch('country')}</p>
                              <p className="font-mono text-primary">{phoneExample.replace(/^\+\d+\s*/, '')}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>

                      <FormControl>
                        <PhoneInput
                          value={phoneValue}
                          onChange={handlePhoneChange}
                          defaultCountry={phoneCountryCode || 'US'}
                          disabled={!form.watch('country')}
                          disableCountrySelect
                          className={hasPhoneError ? 'border-destructive focus-visible:ring-destructive' : ''}
                        />
                      </FormControl>

                      {/* Format / incomplete error */}
                      {phoneFormatError && !phoneDuplicate && (
                        <p className="flex items-center gap-1 text-xs text-destructive mt-1">
                          <AlertCircle className="h-3 w-3 shrink-0" />
                          {phoneFormatError}
                        </p>
                      )}

                      {/* Duplicate error */}
                      {phoneDuplicate && (
                        <p className="flex items-center gap-1 text-xs text-destructive mt-1">
                          <AlertCircle className="h-3 w-3 shrink-0" />
                          This phone number is already registered to another tenant.
                        </p>
                      )}

                      {/* Success tick when number is valid + unique */}
                      {!hasPhoneError && !phoneChecking && phoneValue && isPhoneValid(phoneValue) && (
                        <p className="flex items-center gap-1 text-xs text-green-600 mt-1">
                          <Check className="h-3 w-3 shrink-0" />
                          Phone looks good
                        </p>
                      )}
                    </FormItem>
                  )}
                />

                {/* Billing */}
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-1">Billing</p>

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control} name="firstInvoiceDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Invoice Date *</FormLabel>
                        <FormControl>
                          <DatePicker
                            value={field.value ?? todayStr}
                            onChange={(v) => field.onChange(v ?? '')}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control} name="trialDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Trial Days</FormLabel>
                        <FormControl>
                          <Input
                            type="number" min={0} max={90} placeholder="0 = no trial"
                            {...field} value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Owner Account */}
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-1">Owner Account</p>

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control} name="ownerFirstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name *</FormLabel>
                        <FormControl><Input placeholder="John" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control} name="ownerLastName"
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
                  control={form.control} name="ownerEmail"
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
                  <Button type="button" variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
                  <Button
                    type="submit"
                    disabled={create.isPending || enabledCountries.length === 0 || phoneChecking || phoneDuplicate}
                  >
                    {create.isPending ? 'Provisioning…' : 'Create Tenant'}
                  </Button>
                </div>
              </form>
            </Form>
          </TooltipProvider>
        )}
      </SheetContent>
    </Sheet>
  );
}
