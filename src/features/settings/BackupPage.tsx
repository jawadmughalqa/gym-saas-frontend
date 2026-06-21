import { useState, useRef } from 'react';
import { Download, Upload, History, Shield, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import PageHeader from '@/components/layout/PageHeader';
import PageShell from '@/components/layout/PageShell';
import { useToast } from '@/hooks/use-toast';
import { useBackupStore, type BackupFrequency } from '@/stores/backup.store';
import { downloadBackup, importBackup, getBackupLogs, type BackupLog } from '@/api/backup.api';
import { formatDistanceToNow, format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function lastBackupLabel(lastAutoBackup: string | null): string {
  if (!lastAutoBackup) return 'Never';
  return formatDistanceToNow(new Date(lastAutoBackup), { addSuffix: true });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BackupPage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { enabled, frequency, lastAutoBackup, setEnabled, setFrequency } = useBackupStore();

  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<Record<string, number> | null>(null);

  // ─── Backup logs ────────────────────────────────────────────────────────────

  const { data: logs = [], refetch: refetchLogs } = useQuery<BackupLog[]>({
    queryKey: ['backup-logs'],
    queryFn: getBackupLogs,
  });

  // ─── Handlers ────────────────────────────────────────────────────────────────

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await downloadBackup('manual');
      toast({ title: 'Backup downloaded', description: 'Your data has been exported successfully.' });
      refetchLogs();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Export failed';
      toast({ title: 'Export failed', description: msg, variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportResult(null);
    try {
      const result = await importBackup(file);
      setImportResult(result.imported);
      toast({ title: 'Restore complete', description: 'Your backup was restored successfully.' });
      refetchLogs();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Restore failed';
      toast({ title: 'Restore failed', description: msg, variant: 'destructive' });
    } finally {
      setIsImporting(false);
      // Reset file input so the same file can be re-selected if needed
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <PageShell>
      <PageHeader
        title="Backup & Restore"
        subtitle="Export your gym data, schedule automatic backups, and restore from a previous backup."
        icon={<Shield className="h-5 w-5" />}
      />

      <div className="space-y-6 max-w-3xl">

        {/* ── Manual Backup ──────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Manual Backup
            </CardTitle>
            <CardDescription>
              Export all your gym data as a single JSON file you can save locally.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleExport} disabled={isExporting}>
              {isExporting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Exporting…</>
              ) : (
                <><Download className="mr-2 h-4 w-4" />Download Backup</>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* ── Auto-Backup ────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>Auto-Backup</CardTitle>
            <CardDescription>
              Automatically download a backup when you open the app on schedule.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-backup-toggle" className="text-sm font-medium">
                Enable auto-backup
              </Label>
              <Switch
                id="auto-backup-toggle"
                checked={enabled}
                onCheckedChange={setEnabled}
              />
            </div>

            {enabled && (
              <>
                <Separator />
                <div className="flex items-center gap-4">
                  <Label className="text-sm font-medium w-24 shrink-0">Frequency</Label>
                  <Select
                    value={frequency}
                    onValueChange={(v) => setFrequency(v as BackupFrequency)}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-sm text-muted-foreground">
                  Last backup: <span className="font-medium">{lastBackupLabel(lastAutoBackup)}</span>
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* ── Restore ───────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Restore from Backup
            </CardTitle>
            <CardDescription>
              Upload a <code>.json</code> backup file to restore your data.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Restoring will overwrite existing records with the data from the backup file.
                This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleFileSelect}
                id="backup-file-input"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
              >
                {isImporting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Restoring…</>
                ) : (
                  <><Upload className="mr-2 h-4 w-4" />Choose backup file</>
                )}
              </Button>
            </div>

            {importResult && (
              <div className="rounded-md border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950/30">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <p className="text-sm font-medium text-green-700 dark:text-green-300">Restore complete</p>
                </div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-1">
                  {Object.entries(importResult).map(([collection, count]) => (
                    <div key={collection} className="flex justify-between text-xs text-green-700 dark:text-green-400">
                      <span className="capitalize">{collection.replace(/([A-Z])/g, ' $1')}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Backup History ────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Backup History
            </CardTitle>
            <CardDescription>Last 20 backup and restore operations.</CardDescription>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No backup history yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 font-medium pr-4">Date</th>
                      <th className="pb-2 font-medium pr-4">Triggered By</th>
                      <th className="pb-2 font-medium pr-4">Type</th>
                      <th className="pb-2 font-medium pr-4">Size</th>
                      <th className="pb-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {logs.map((log) => (
                      <tr key={log._id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2 pr-4 whitespace-nowrap text-muted-foreground">
                          {format(new Date(log.createdAt), 'dd MMM yyyy, HH:mm')}
                        </td>
                        <td className="py-2 pr-4">
                          {log.triggeredBy?.name ?? '—'}
                        </td>
                        <td className="py-2 pr-4">
                          <Badge variant={log.triggerType === 'auto' ? 'secondary' : 'outline'}>
                            {log.triggerType === 'auto' ? 'Auto' : 'Manual'}
                          </Badge>
                        </td>
                        <td className="py-2 pr-4 text-muted-foreground">
                          {formatBytes(log.sizeBytes)}
                        </td>
                        <td className="py-2">
                          <Badge variant={log.status === 'success' ? 'success' : 'destructive'}>
                            {log.status === 'success' ? 'Success' : 'Failed'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </PageShell>
  );
}
