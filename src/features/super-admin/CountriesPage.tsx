/**
 * CountriesPage — Super Admin
 *
 * Lets the super admin pick which countries (and therefore currencies)
 * are available in tenant registration and any other country/currency dropdowns.
 *
 * Data flow:
 *  GET  /super/platform-config              → currently enabled list
 *  PATCH /super/platform-config/countries   → save new list
 */

import { useState, useEffect, useMemo } from 'react';
import { Globe, Search, Check, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import PageShell from '@/components/layout/PageShell';
import PageHeader from '@/components/layout/PageHeader';
import { toast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/utils/error';
import { orvalMutator } from '@/lib/orval-mutator';
import { WORLD_COUNTRIES, type WorldCountry } from '@/config/world-countries';

// ─── API helpers ──────────────────────────────────────────────────────────────

interface EnabledCountry {
  name: string;
  code: string;
  currencyCode: string;
  currencyName: string;
  currencySymbol: string;
}

async function fetchPlatformConfig(): Promise<{ enabledCountries: EnabledCountry[] }> {
  const res = await orvalMutator<{ data: { enabledCountries: EnabledCountry[] } }>({
    url: '/super/platform-config',
    method: 'GET',
  });
  return res.data;
}

async function saveEnabledCountries(countries: EnabledCountry[]): Promise<void> {
  await orvalMutator({ url: '/super/platform-config/countries', method: 'PATCH', data: { countries } });
}

// ─── CountriesPage ────────────────────────────────────────────────────────────

export default function CountriesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  /** Set of country codes currently checked in the UI */
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dirty, setDirty] = useState(false);

  // Load existing enabled countries from the platform config
  const { data: config, isLoading } = useQuery({
    queryKey: ['platform-config'],
    queryFn: fetchPlatformConfig,
  });

  // Seed the selected set when data arrives
  useEffect(() => {
    if (config && !dirty) {
      setSelected(new Set(config.enabledCountries.map((c) => c.code)));
    }
  }, [config, dirty]);

  const saveMutation = useMutation({
    mutationFn: (countries: EnabledCountry[]) => saveEnabledCountries(countries),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['platform-config'] });
      setDirty(false);
      toast({ title: 'Countries saved', description: `${selected.size} countries enabled` });
    },
    onError: (err) => toast({ variant: 'destructive', title: getErrorMessage(err) }),
  });

  // Filtered list based on search
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return WORLD_COUNTRIES;
    return WORLD_COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.currencyCode.toLowerCase().includes(q) ||
        c.currencyName.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q),
    );
  }, [search]);

  function toggle(code: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        if (next.size === 1) {
          toast({ variant: 'destructive', title: 'At least one country must stay enabled' });
          return prev;
        }
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
    setDirty(true);
  }

  function selectAll() {
    setSelected(new Set(filtered.map((c) => c.code)));
    setDirty(true);
  }

  function clearAll() {
    // Keep at least one — keep whatever is already enabled that's not in the filtered list
    const outside = [...selected].filter((code) => !filtered.some((c) => c.code === code));
    if (outside.length === 0 && filtered.length > 0) {
      // keep the first one
      setSelected(new Set([filtered[0]!.code]));
    } else {
      setSelected(new Set(outside.length > 0 ? outside : [filtered[0]?.code ?? 'PK']));
    }
    setDirty(true);
  }

  function handleSave() {
    const countries: EnabledCountry[] = WORLD_COUNTRIES
      .filter((c) => selected.has(c.code))
      .map(({ name, code, currencyCode, currencyName, currencySymbol }) => ({
        name, code, currencyCode, currencyName, currencySymbol,
      }));
    saveMutation.mutate(countries);
  }

  const selectedCount = selected.size;

  return (
    <PageShell>
      <PageHeader
        title="Countries & Currencies"
        subtitle="Choose which countries (and their currencies) are available when registering new gym tenants."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/super-admin')}>
              <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
            </Button>
            <Button
              size="sm"
              disabled={!dirty || saveMutation.isPending}
              onClick={handleSave}
            >
              {saveMutation.isPending ? 'Saving…' : `Save ${selectedCount} country${selectedCount !== 1 ? 'ies' : 'y'}`}
            </Button>
          </div>
        }
      />

      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Badge variant="secondary" className="text-sm py-1 px-3">
          {selectedCount} enabled
        </Badge>
        <div className="flex-1 relative max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search country or currency…"
            className="pl-8 h-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" size="sm" onClick={selectAll}>Select all</Button>
        <Button variant="outline" size="sm" onClick={clearAll}>Clear all</Button>
      </div>

      <Card>
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Globe className="h-4 w-4" />
            {filtered.length} countries
            {search && ` matching "${search}"`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="divide-y divide-border">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-4 w-6 rounded" />
                  <Skeleton className="h-4 flex-1 max-w-[180px]" />
                  <Skeleton className="h-4 w-12 ml-auto" />
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((country: WorldCountry) => {
                const isChecked = selected.has(country.code);
                return (
                  <label
                    key={country.code}
                    className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-muted/40 transition-colors"
                  >
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => toggle(country.code)}
                      className="shrink-0"
                    />

                    {/* Country flag emoji via regional indicator */}
                    <span className="text-xl shrink-0 select-none" aria-hidden>
                      {countryFlag(country.code)}
                    </span>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{country.name}</p>
                      <p className="text-xs text-muted-foreground">{country.code}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-sm font-medium">
                        {country.currencySymbol} {country.currencyCode}
                      </p>
                      <p className="text-xs text-muted-foreground">{country.currencyName}</p>
                    </div>

                    {isChecked && (
                      <Check className="h-4 w-4 text-primary shrink-0" />
                    )}
                  </label>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sticky save footer */}
      {dirty && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur px-6 py-3 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            You have unsaved changes — <span className="font-medium text-foreground">{selectedCount} countries selected</span>
          </p>
          <Button size="sm" disabled={saveMutation.isPending} onClick={handleSave}>
            {saveMutation.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      )}

      {/* Spacer so sticky footer doesn't cover last row */}
      {dirty && <div className="h-16" />}
    </PageShell>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convert ISO 3166-1 alpha-2 code to flag emoji via regional indicator symbols */
function countryFlag(code: string): string {
  return code
    .toUpperCase()
    .split('')
    .map((char) => String.fromCodePoint(0x1f1e6 + char.charCodeAt(0) - 65))
    .join('');
}
