/**
 * ShiftManagement — CRUD panel for branch access shifts.
 * Rendered as a tab inside BranchDetailPage when the `shifts` feature flag is on.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Clock, Pencil, Trash2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { api } from '@/lib/axios';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Shift {
  _id: string;
  name: string;
  days: number[];       // 0=Sun … 6=Sat, empty = all days
  startTime: string;    // HH:MM
  endTime: string;      // HH:MM
  color?: string;
  isActive: boolean;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DEFAULT_COLORS = [
  '#6366f1', '#22c55e', '#f59e0b', '#ef4444',
  '#8b5cf6', '#14b8a6', '#f97316', '#ec4899',
];

// ─── Empty form state ─────────────────────────────────────────────────────────

const emptyForm = (): Partial<Shift> => ({
  name: '',
  days: [],
  startTime: '06:00',
  endTime:   '14:00',
  color:     DEFAULT_COLORS[0],
  isActive:  true,
});

// ─── ShiftManagement ──────────────────────────────────────────────────────────

export default function ShiftManagement({ branchId }: { branchId: string }) {
  const qc = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing,    setEditing]    = useState<Shift | null>(null);
  const [form,       setForm]       = useState<Partial<Shift>>(emptyForm());
  const [deleteId,   setDeleteId]   = useState<string | null>(null);

  // ── Fetch shifts ────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['shifts', branchId],
    queryFn: () =>
      api.get<{ success: boolean; data: Shift[] }>('/shifts', { params: { branchId } })
         .then((r) => r.data.data),
    staleTime: 30_000,
  });

  const shifts: Shift[] = data ?? [];

  // ── Mutations ───────────────────────────────────────────────────────────────
  const invalidate = () => qc.invalidateQueries({ queryKey: ['shifts', branchId] });

  const createMut = useMutation({
    mutationFn: (body: Partial<Shift>) =>
      api.post('/shifts', { ...body, branchId }).then((r) => r.data),
    onSuccess: () => { toast({ title: 'Shift created' }); invalidate(); setDialogOpen(false); },
    onError: (e: any) => toast({ title: 'Error', description: e?.response?.data?.message ?? 'Failed to create shift', variant: 'destructive' }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<Shift> }) =>
      api.patch(`/shifts/${id}`, body).then((r) => r.data),
    onSuccess: () => { toast({ title: 'Shift updated' }); invalidate(); setDialogOpen(false); },
    onError: (e: any) => toast({ title: 'Error', description: e?.response?.data?.message ?? 'Failed to update shift', variant: 'destructive' }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/shifts/${id}`).then((r) => r.data),
    onSuccess: () => { toast({ title: 'Shift deactivated' }); invalidate(); setDeleteId(null); },
    onError: (e: any) => toast({ title: 'Error', description: e?.response?.data?.message ?? 'Failed to deactivate shift', variant: 'destructive' }),
  });

  // ── Handlers ────────────────────────────────────────────────────────────────
  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setDialogOpen(true);
  }

  function openEdit(s: Shift) {
    setEditing(s);
    setForm({ name: s.name, days: s.days, startTime: s.startTime, endTime: s.endTime, color: s.color, isActive: s.isActive });
    setDialogOpen(true);
  }

  function toggleDay(d: number) {
    setForm((prev) => {
      const days = prev.days ?? [];
      return { ...prev, days: days.includes(d) ? days.filter((x) => x !== d) : [...days, d].sort() };
    });
  }

  function handleSubmit() {
    if (!form.name?.trim()) return;
    if (!form.startTime || !form.endTime) return;
    if (editing) {
      updateMut.mutate({ id: editing._id, body: form });
    } else {
      createMut.mutate(form);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Shifts</h3>
          <p className="text-sm text-muted-foreground">
            Define access windows for this branch. Assign shifts to subscriptions to restrict entry times.
          </p>
        </div>
        <Button size="sm" onClick={openCreate} className="gap-1.5">
          <Plus className="h-4 w-4" /> Add Shift
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      )}

      {!isLoading && shifts.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center">
            <Clock className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm font-medium">No shifts defined</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add a shift to start restricting member check-ins by time.
            </p>
          </CardContent>
        </Card>
      )}

      {!isLoading && shifts.length > 0 && (
        <div className="space-y-2">
          {shifts.map((s) => (
            <Card key={s._id} className={!s.isActive ? 'opacity-50' : ''}>
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Color dot */}
                    <span
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: s.color ?? '#6366f1' }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{s.name}</span>
                        {!s.isActive && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs text-muted-foreground font-mono">
                          {s.startTime} – {s.endTime}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {s.days.length === 0
                            ? 'Every day'
                            : s.days.map((d) => DAY_LABELS[d]).join(', ')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => openEdit(s)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(s._id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Create / Edit Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Shift' : 'New Shift'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="shift-name">Name</Label>
              <Input
                id="shift-name"
                placeholder="Morning, Evening, Night…"
                value={form.name ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            {/* Times */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="shift-start">Start time</Label>
                <Input
                  id="shift-start"
                  type="time"
                  value={form.startTime ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, startTime: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="shift-end">End time</Label>
                <Input
                  id="shift-end"
                  type="time"
                  value={form.endTime ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, endTime: e.target.value }))}
                />
              </div>
            </div>
            {/* Days */}
            <div className="space-y-1.5">
              <Label>Days <span className="text-xs text-muted-foreground">(empty = all days)</span></Label>
              <div className="flex gap-1 flex-wrap">
                {DAY_LABELS.map((label, idx) => {
                  const active = (form.days ?? []).includes(idx);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => toggleDay(idx)}
                      className={`px-2.5 py-1 rounded text-xs font-semibold border transition-colors ${
                        active
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background text-muted-foreground border-border hover:border-primary/50'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
            {/* Color */}
            <div className="space-y-1.5">
              <Label>Colour</Label>
              <div className="flex gap-2 flex-wrap">
                {DEFAULT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, color: c }))}
                    className={`h-6 w-6 rounded-full border-2 transition-all ${
                      form.color === c ? 'border-foreground scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            {/* Active toggle (edit only) */}
            {editing && (
              <div className="flex items-center gap-3">
                <Switch
                  id="shift-active"
                  checked={form.isActive ?? true}
                  onCheckedChange={(v) => setForm((p) => ({ ...p, isActive: v }))}
                />
                <Label htmlFor="shift-active">Active</Label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={createMut.isPending || updateMut.isPending || !form.name?.trim()}
            >
              {editing ? 'Save changes' : 'Create shift'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirm ── */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" /> Deactivate shift?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            The shift will be hidden from new check-ins. Existing records are preserved.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deleteMut.isPending}
              onClick={() => deleteId && deleteMut.mutate(deleteId)}
            >
              Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
