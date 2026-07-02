import { useState } from 'react';
import { format } from 'date-fns';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  MessageSquare, User, Globe, Smartphone,
  Send, Loader2, Phone, Mail, Building2,
} from 'lucide-react';
import { useLead, useUpdateLead, useAddLeadNote, useLeadAssignees } from '@/hooks/use-leads';
import type { LeadStatus } from '@/api/leads.api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<LeadStatus, { label: string; className: string }> = {
  new:        { label: 'New',        className: 'bg-blue-600 hover:bg-blue-700' },
  contacted:  { label: 'Contacted',  className: 'bg-yellow-600 hover:bg-yellow-700' },
  qualified:  { label: 'Qualified',  className: 'bg-purple-600 hover:bg-purple-700' },
  converted:  { label: 'Converted',  className: 'bg-green-600 hover:bg-green-700' },
  closed:     { label: 'Closed',     className: 'bg-muted/600 hover:bg-gray-600' },
};

const FORM_TYPE_LABEL: Record<string, string> = {
  demo_request: '🎯 Demo Request',
  contact:      '📬 Contact',
  newsletter:   '📧 Newsletter',
};

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between py-1.5 text-sm border-b border-border/50 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right max-w-[60%] break-words">{value}</span>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  leadId: string | null;
  onClose: () => void;
}

export default function LeadDetailSheet({ leadId, onClose }: Props) {
  const [noteText, setNoteText] = useState('');

  const { data: lead, isLoading, error } = useLead(leadId);
  const { data: assignees = [] }         = useLeadAssignees();
  const updateMutation  = useUpdateLead();
  const addNoteMutation = useAddLeadNote();

  const handleStatusChange = (status: string) => {
    if (!lead) return;
    updateMutation.mutate({ id: lead._id, status: status as LeadStatus });
  };

  const handleAssigneeChange = (value: string) => {
    if (!lead) return;
    updateMutation.mutate({ id: lead._id, assignedTo: value === '__none__' ? null : value });
  };

  const handleAddNote = () => {
    if (!lead || !noteText.trim()) return;
    addNoteMutation.mutate(
      { id: lead._id, text: noteText.trim() },
      { onSuccess: () => setNoteText('') },
    );
  };

  return (
    <Sheet open={!!leadId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            {lead ? FORM_TYPE_LABEL[lead.formType] ?? lead.formType : 'Lead Detail'}
          </SheetTitle>
        </SheetHeader>

        {isLoading && (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-8 w-full" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-8 w-full" />
              </div>
            </div>
            <Skeleton className="h-px w-full" />
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3 py-2">
                  <Skeleton className="h-4 w-4 rounded shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>Failed to load lead details.</AlertDescription>
          </Alert>
        )}

        {lead && (
          <div className="space-y-6">
            {/* ── Status + Assign ──────────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</p>
                <Select value={lead.status} onValueChange={handleStatusChange}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(STATUS_CONFIG) as LeadStatus[]).map((s) => (
                      <SelectItem key={s} value={s}>
                        <Badge className={`text-xs ${STATUS_CONFIG[s].className}`}>
                          {STATUS_CONFIG[s].label}
                        </Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Assigned To</p>
                <Select
                  value={(lead.assignedTo as { _id: string } | null)?._id ?? '__none__'}
                  onValueChange={handleAssigneeChange}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">
                      <span className="text-muted-foreground">Unassigned</span>
                    </SelectItem>
                    {assignees.map((a) => (
                      <SelectItem key={a._id} value={a._id}>
                        {a.firstName} {a.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* ── Contact info ────────────────────────────────────────── */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <User className="h-3 w-3" /> Contact Information
              </p>
              <div className="space-y-0">
                <InfoRow label="Name"          value={lead.name} />
                <InfoRow label="Email"         value={lead.email} />
                <InfoRow label="Phone"         value={lead.phone} />
                <InfoRow label="Facility"      value={lead.facilityName} />
                <InfoRow label="Facility Type" value={lead.facilityType} />
                {lead.contactMethod && (
                  <InfoRow
                    label="Prefers Contact"
                    value={
                      lead.contactMethod === 'whatsapp' ? '💬 WhatsApp'
                      : lead.contactMethod === 'call'   ? '📞 Call'
                      : '📧 Email'
                    }
                  />
                )}
                {lead.message && (
                  <div className="pt-2">
                    <p className="text-xs text-muted-foreground mb-1">Message</p>
                    <p className="text-sm bg-muted/40 rounded-md p-3 leading-relaxed">{lead.message}</p>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* ── Metadata ────────────────────────────────────────────── */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <Globe className="h-3 w-3" /> Submission Details
              </p>
              <div className="space-y-0">
                <InfoRow label="Submitted"   value={format(new Date(lead.metadata.submittedAt), 'PPpp')} />
                <InfoRow label="Source Page" value={lead.metadata.sourcePage} />
                <InfoRow label="Referrer"    value={lead.metadata.referrer} />
                {lead.metadata.deviceType && (
                  <InfoRow
                    label="Device"
                    value={
                      lead.metadata.deviceType === 'mobile' ? '📱 Mobile'
                      : lead.metadata.deviceType === 'tablet' ? '📋 Tablet'
                      : '🖥️ Desktop'
                    }
                  />
                )}
                <InfoRow label="UTM Source"   value={lead.metadata.utmSource} />
                <InfoRow label="UTM Campaign" value={lead.metadata.utmCampaign} />
                <InfoRow label="UTM Medium"   value={lead.metadata.utmMedium} />
              </div>
            </div>

            <Separator />

            {/* ── Notes ───────────────────────────────────────────────── */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <MessageSquare className="h-3 w-3" /> Internal Notes ({lead.notes.length})
              </p>

              {lead.notes.length > 0 && (
                <div className="space-y-3 mb-4">
                  {[...lead.notes].reverse().map((note) => (
                    <div key={note._id} className="bg-muted/40 rounded-lg p-3 text-sm">
                      <p className="leading-relaxed mb-2">{note.text}</p>
                      <p className="text-xs text-muted-foreground">
                        {note.authorName} · {format(new Date(note.createdAt), 'MMM d, yyyy HH:mm')}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <Textarea
                  placeholder="Add a note..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  className="resize-none text-sm min-h-[72px]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAddNote();
                  }}
                />
                <Button
                  size="sm"
                  className="self-end shrink-0"
                  onClick={handleAddNote}
                  disabled={!noteText.trim() || addNoteMutation.isPending}
                >
                  {addNoteMutation.isPending
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Send className="h-4 w-4" />
                  }
                </Button>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
