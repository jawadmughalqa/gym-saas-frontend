import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload, Download, CheckCircle2, XCircle, AlertCircle,
  ChevronRight, ChevronLeft, Users, FileText, ArrowLeft,
  Loader2, SkipForward, Building2,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button }   from '@/components/ui/button';
import { Badge }    from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import PageShell    from '@/components/layout/PageShell';
import { useToast } from '@/hooks/use-toast';
import { api }      from '@/lib/axios';  // still used for POST /members/import
import { getGetMembersQueryKey } from '@/api/generated/members/members';
import { useGetBranches } from '@/api/generated/branches/branches';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ImportRowResult {
  row:       number;
  status:    'success' | 'error' | 'skipped';
  firstName: string;
  lastName:  string;
  email:     string;
  phone:     string;
  error?:    string;
}

interface ImportSummary {
  total:    number;
  imported: number;
  failed:   number;
  skipped:  number;
  rows:     ImportRowResult[];
}

// ─── Simple CSV preview parser (frontend-only, no package needed) ─────────────

function quickParseCsv(text: string): string[][] {
  return text
    .replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    .split('\n')
    .filter(l => l.trim())
    .map(line => {
      const cells: string[] = [];
      let cur = '', inQ = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') { inQ = !inQ; }
        else if (c === ',' && !inQ) { cells.push(cur.trim()); cur = ''; }
        else { cur += c; }
      }
      cells.push(cur.trim());
      return cells;
    });
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepDot({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1 min-w-[80px]">
      <div className={`flex h-9 w-9 items-center justify-center rounded-full border-2 font-bold text-sm transition-colors ${
        done   ? 'border-green-500 bg-green-500 text-white' :
        active ? 'border-primary bg-primary text-primary-foreground' :
                 'border-muted-foreground/30 text-muted-foreground'
      }`}>
        {done ? <CheckCircle2 className="h-5 w-5" /> : n}
      </div>
      <span className={`text-xs font-medium text-center ${active ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</span>
    </div>
  );
}

function StepConnector({ done }: { done: boolean }) {
  return <div className={`flex-1 h-0.5 mt-4 ${done ? 'bg-green-500' : 'bg-muted'}`} />;
}

// ─── Step 1: Upload ───────────────────────────────────────────────────────────

function StepUpload({
  file, onFile, onDownloadTemplate, onNext, branches, branchesLoading,
}: {
  file: File | null;
  onFile: (f: File) => void;
  onDownloadTemplate: () => void;
  onNext: () => void;
  branches: Array<{ _id: string; name: string }>;
  branchesLoading: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.name.endsWith('.csv')) onFile(dropped);
  }, [onFile]);

  return (
    <div className="space-y-6">
      {/* Instructions card */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800">
        <CardContent className="pt-5 pb-4">
          <div className="flex gap-3">
            <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
              <p className="font-semibold">How to import members — 3 easy steps:</p>
              <ol className="space-y-1 list-decimal list-inside">
                <li>Click <strong>"Download Template"</strong> below to get an Excel-ready file</li>
                <li>Open the file, fill in your members (one per row), and save</li>
                <li>Upload the file here and we will add everyone automatically</li>
              </ol>
              <p className="text-blue-700 dark:text-blue-300 mt-1">
                ✅ Only <strong>First Name, Last Name, Phone, Email, and Branch Name</strong> are required.
                Everything else is optional.
              </p>
              <p className="text-blue-700 dark:text-blue-300">
                📌 For <strong>Branch Name</strong>, use one of the names shown in the purple box below — copy it exactly.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Branch names reference */}
      <Card className="border-violet-200 bg-violet-50 dark:bg-violet-950/30 dark:border-violet-800">
        <CardContent className="pt-4 pb-4">
          <div className="flex gap-3">
            <Building2 className="h-4 w-4 text-violet-600 dark:text-violet-400 shrink-0 mt-0.5" />
            <div className="text-sm text-violet-800 dark:text-violet-200 w-full">
              <p className="font-semibold mb-1.5">Your branch names (copy exactly into the file):</p>
              {branchesLoading ? (
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-24 rounded-full" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              ) : branches.length === 0 ? (
                <p className="text-violet-600 dark:text-violet-400 text-xs">No active branches found. Please create a branch first.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {branches.map(b => (
                    <span key={b._id} className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/50 border border-violet-300 dark:border-violet-700 font-mono text-xs font-medium text-violet-900 dark:text-violet-100 select-all">
                      {b.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Download template — plain <a> tag guarantees download works in all browsers */}
      <a href="/members_template.csv" download="gymanger_members_template.csv" className="w-full">
        <Button variant="outline" className="w-full gap-2 h-12 text-base" type="button">
          <Download className="h-5 w-5 text-green-600" />
          Download Template File (CSV)
        </Button>
      </a>

      {/* Upload zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 cursor-pointer transition-colors ${
          dragging ? 'border-primary bg-primary/5' :
          file     ? 'border-green-500 bg-green-50 dark:bg-green-950/20' :
                     'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30'
        }`}
      >
        <input
          ref={inputRef} type="file" accept=".csv" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }}
        />
        {file ? (
          <>
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <div className="text-center">
              <p className="font-semibold text-green-700 dark:text-green-400">{file.name}</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {(file.size / 1024).toFixed(1)} KB — click to change file
              </p>
            </div>
          </>
        ) : (
          <>
            <Upload className="h-12 w-12 text-muted-foreground/50" />
            <div className="text-center">
              <p className="font-semibold">Click here to choose your file</p>
              <p className="text-sm text-muted-foreground mt-0.5">or drag and drop your CSV file</p>
            </div>
          </>
        )}
      </div>

      <Button className="w-full gap-2 h-11 text-base" disabled={!file} onClick={onNext}>
        Preview Members <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

// ─── Step 2: Preview ─────────────────────────────────────────────────────────

function StepPreview({
  rows, onBack, onImport, isImporting,
}: {
  rows: string[][];
  onBack: () => void;
  onImport: () => void;
  isImporting: boolean;
}) {
  if (rows.length < 2) {
    return (
      <div className="text-center py-12 space-y-3">
        <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto" />
        <p className="font-semibold">The file appears to be empty</p>
        <p className="text-sm text-muted-foreground">Please go back and check your CSV file has at least one member row.</p>
        <Button variant="outline" onClick={onBack}><ChevronLeft className="h-4 w-4 mr-1" /> Go Back</Button>
      </div>
    );
  }

  const headers = rows[0];
  // Filter out the example row (john@example.com)
  const dataRows = rows.slice(1).filter(row => {
    const emailIdx = headers.findIndex(h => h.toLowerCase().includes('email'));
    return emailIdx < 0 || !row[emailIdx]?.toLowerCase().includes('@example.com');
  });

  return (
    <div className="space-y-4">
      <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
        <CardContent className="py-3 px-4 flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>
            Found <strong>{dataRows.length} member{dataRows.length !== 1 ? 's' : ''}</strong> ready to import.
            The example row has been removed automatically.
            Review below, then click <strong>"Import Now"</strong>.
          </span>
        </CardContent>
      </Card>

      {/* Table preview */}
      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted z-10">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">#</th>
                {headers.map((h, i) => (
                  <th key={i} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataRows.map((row, ri) => (
                <tr key={ri} className={ri % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                  <td className="px-3 py-2 text-muted-foreground">{ri + 1}</td>
                  {headers.map((_, ci) => (
                    <td key={ci} className="px-3 py-2 whitespace-nowrap max-w-[200px] truncate">
                      {row[ci] ?? ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" className="gap-1" onClick={onBack} disabled={isImporting}>
          <ChevronLeft className="h-4 w-4" /> Go Back
        </Button>
        <Button className="flex-1 gap-2 h-11 text-base" onClick={onImport} disabled={isImporting}>
          {isImporting ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Importing… please wait</>
          ) : (
            <><Users className="h-4 w-4" /> Import {dataRows.length} Member{dataRows.length !== 1 ? 's' : ''} Now</>
          )}
        </Button>
      </div>
    </div>
  );
}

// ─── Step 3: Results ──────────────────────────────────────────────────────────

function StepResults({
  summary, onImportAgain, onGoToMembers, onDownloadErrors,
}: {
  summary: ImportSummary;
  onImportAgain: () => void;
  onGoToMembers: () => void;
  onDownloadErrors: () => void;
}) {
  const failed  = summary.rows.filter(r => r.status === 'error');
  const skipped = summary.rows.filter(r => r.status === 'skipped');
  const success = summary.rows.filter(r => r.status === 'success');
  const allGood = failed.length === 0 && skipped.length === 0;

  return (
    <div className="space-y-5">
      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-green-200 dark:border-green-800">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-green-600">{summary.imported}</p>
            <p className="text-xs text-muted-foreground mt-1">Members Added ✅</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 dark:border-yellow-800">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-yellow-600">{summary.skipped}</p>
            <p className="text-xs text-muted-foreground mt-1">Already Exist ⚠️</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-red-500">{summary.failed}</p>
            <p className="text-xs text-muted-foreground mt-1">Had Errors ❌</p>
          </CardContent>
        </Card>
      </div>

      {allGood && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/30">
          <CardContent className="pt-5 pb-4 flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-green-500 shrink-0" />
            <div>
              <p className="font-semibold text-green-800 dark:text-green-200">All members imported successfully!</p>
              <p className="text-sm text-green-700 dark:text-green-300 mt-0.5">
                {summary.imported} member{summary.imported !== 1 ? 's' : ''} added. Their login details were created automatically.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error/skip rows */}
      {(failed.length > 0 || skipped.length > 0) && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Rows that need attention</p>
            {failed.length > 0 && (
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={onDownloadErrors}>
                <Download className="h-3.5 w-3.5" /> Download Error Report
              </Button>
            )}
          </div>
          <div className="rounded-lg border overflow-hidden divide-y max-h-64 overflow-y-auto">
            {[...failed, ...skipped].map((row, i) => (
              <div key={i} className="flex items-start gap-3 px-3 py-2.5">
                {row.status === 'error'
                  ? <XCircle      className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  : <SkipForward  className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                }
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    Row {row.row}: {row.firstName} {row.lastName}
                    {row.email && <span className="text-muted-foreground ml-1 font-normal">({row.email})</span>}
                  </p>
                  <p className={`text-xs mt-0.5 ${row.status === 'error' ? 'text-red-600 dark:text-red-400' : 'text-yellow-700 dark:text-yellow-400'}`}>
                    {row.error}
                  </p>
                </div>
                <Badge variant={row.status === 'error' ? 'destructive' : 'outline'} className="text-xs shrink-0">
                  {row.status === 'error' ? 'Error' : 'Skipped'}
                </Badge>
              </div>
            ))}
          </div>

          {failed.length > 0 && (
            <p className="text-xs text-muted-foreground">
              💡 Tip: Download the error report, fix the highlighted rows, and import again.
            </p>
          )}
        </div>
      )}

      {/* Success rows (collapsed by default) */}
      {success.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 list-none">
            <ChevronRight className="h-3.5 w-3.5 group-open:rotate-90 transition-transform" />
            Show {success.length} successfully imported member{success.length !== 1 ? 's' : ''}
          </summary>
          <div className="mt-2 rounded-lg border overflow-hidden divide-y max-h-48 overflow-y-auto">
            {success.map((row, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                <p className="text-sm">{row.firstName} {row.lastName} <span className="text-muted-foreground">({row.email})</span></p>
              </div>
            ))}
          </div>
        </details>
      )}

      <div className="flex gap-3">
        <Button variant="outline" className="gap-1.5" onClick={onImportAgain}>
          <Upload className="h-4 w-4" /> Import Another File
        </Button>
        <Button className="flex-1 gap-1.5" onClick={onGoToMembers}>
          <Users className="h-4 w-4" /> View Members List
        </Button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MemberImportPage() {
  const navigate    = useNavigate();
  const { toast }   = useToast();
  const queryClient = useQueryClient();

  const [step,        setStep]        = useState<1 | 2 | 3>(1);
  const [file,        setFile]        = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  const [summary,     setSummary]     = useState<ImportSummary | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // ── Load branches so we can embed them in the template ───────────────────
  const { data: branchData, isLoading: branchesLoading } = useGetBranches({ status: 'active' });
  const branches = (branchData?.data ?? []) as Array<{ _id: string; name: string }>;

  // ── Download template (generated client-side — no API call needed) ────────
  const handleDownloadTemplate = () => {
    const branchNames = branches.map(b => b.name);
    const exampleBranch = branchNames[0] ?? 'Main Branch';

    // Build CSV: headers + example row + (optional) branch name guide
    const lines: string[] = [
      'First Name,Last Name,Email,Phone,Branch Name,Gender,Date of Birth,Notes',
      `John,Smith,john@example.com,03001234567,${exampleBranch},male,1990-05-15,Joined from referral`,
    ];

    if (branchNames.length > 0) {
      lines.push('');
      lines.push('--- BRANCH NAMES (copy one exactly into the Branch Name column above) ---');
      branchNames.forEach(name => lines.push(name));
    }

    const csv = lines.join('\r\n');
    // Use data: URL (more reliable than blob: on localhost dev servers)
    const dataUrl = 'data:text/csv;charset=utf-8,%EF%BB%BF' + encodeURIComponent(csv);
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'gymanger_members_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // ── File selected → parse for preview ────────────────────────────────────
  const handleFile = (f: File) => {
    setFile(f);
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      setPreviewRows(quickParseCsv(text));
    };
    reader.readAsText(f);
  };

  // ── Go to preview step ────────────────────────────────────────────────────
  const goToPreview = () => setStep(2);

  // ── Upload & import ───────────────────────────────────────────────────────
  const handleImport = async () => {
    if (!file) return;
    setIsImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post<{ data: ImportSummary }>('/members/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const s = res.data.data;
      setSummary(s);
      setStep(3);
      // Refresh member list cache
      queryClient.invalidateQueries({ queryKey: getGetMembersQueryKey() });
      if (s.imported > 0) {
        toast({ title: `${s.imported} member${s.imported !== 1 ? 's' : ''} imported successfully!` });
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Something went wrong. Please try again.';
      toast({ title: 'Import failed', description: msg, variant: 'destructive' });
    } finally {
      setIsImporting(false);
    }
  };

  // ── Download error report ─────────────────────────────────────────────────
  const handleDownloadErrors = () => {
    if (!summary) return;
    const headers = ['Row', 'First Name', 'Last Name', 'Email', 'Phone', 'Status', 'Error'];
    const rows = summary.rows
      .filter(r => r.status !== 'success')
      .map(r => [r.row, r.firstName, r.lastName, r.email, r.phone, r.status, r.error ?? ''].join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const dataUrl = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'gymanger_import_errors.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // ── Reset ─────────────────────────────────────────────────────────────────
  const reset = () => { setStep(1); setFile(null); setPreviewRows([]); setSummary(null); };

  return (
    <PageShell
      title="Import Members"
      subtitle="Add many members at once by uploading a spreadsheet file"
    >
      {/* Back button */}
      <div className="mb-4">
        <Button variant="ghost" size="sm" className="gap-1.5 -ml-2" onClick={() => navigate('/members')}>
          <ArrowLeft className="h-4 w-4" /> Back to Members
        </Button>
      </div>

      {/* Step indicator */}
      <div className="flex items-start mb-8">
        <StepDot n={1} label="Upload File"    active={step === 1} done={step > 1} />
        <StepConnector done={step > 1} />
        <StepDot n={2} label="Review"         active={step === 2} done={step > 2} />
        <StepConnector done={step > 2} />
        <StepDot n={3} label="Done"           active={step === 3} done={false}    />
      </div>

      {/* Step content */}
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">
            {step === 1 && 'Step 1 — Upload Your Member File'}
            {step === 2 && 'Step 2 — Review Before Importing'}
            {step === 3 && 'Step 3 — Import Complete'}
          </CardTitle>
          <CardDescription>
            {step === 1 && 'Download the template, fill it in Excel or Google Sheets, then upload it here.'}
            {step === 2 && 'Check your members below. If something looks wrong, go back and fix the file.'}
            {step === 3 && 'Here is what happened. You can download an error report and fix any issues.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          {step === 1 && (
            <StepUpload
              file={file}
              onFile={handleFile}
              onDownloadTemplate={handleDownloadTemplate}
              onNext={goToPreview}
              branches={branches}
              branchesLoading={branchesLoading}
            />
          )}
          {step === 2 && (
            <StepPreview
              rows={previewRows}
              onBack={() => setStep(1)}
              onImport={handleImport}
              isImporting={isImporting}
            />
          )}
          {step === 3 && summary && (
            <StepResults
              summary={summary}
              onImportAgain={reset}
              onGoToMembers={() => navigate('/members')}
              onDownloadErrors={handleDownloadErrors}
            />
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
