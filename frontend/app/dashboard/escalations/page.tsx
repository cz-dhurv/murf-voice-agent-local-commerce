'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CircleCheck,
  Clock,
  Database,
  FileText,
  Inbox,
  LifeBuoy,
  Loader2,
  MessageSquare,
  PhoneOutgoing,
  ReceiptText,
  TriangleAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  type Escalation,
  cx,
  fmtAgo,
  useCallers,
  useEscalations,
} from '@/components/app/dashboard/data';
import {
  EmptyState,
  IconChip,
  LoadingRow,
  PageHeader,
  StatCard,
  StatusPill,
  Tabs,
  type Tone,
} from '@/components/app/dashboard/kit';

const INPUT =
  'border-input bg-background focus-visible:ring-ring/50 h-9 rounded-md border px-3 text-sm outline-none focus-visible:ring-2';

// The agent files two kinds of "ask a human" request (memory.create_escalation);
// anything else falls back to "other".
const CATEGORY: Record<string, { label: string; icon: React.ElementType }> = {
  order_dispute: { label: 'Order dispute', icon: ReceiptText },
  scheme_paperwork: { label: 'Scheme / paperwork', icon: FileText },
  other: { label: 'Other', icon: MessageSquare },
};

const URGENCY: Record<string, { label: string; tone: Tone }> = {
  emergency: { label: 'Emergency', tone: 'danger' },
  high: { label: 'High', tone: 'brand' },
  medium: { label: 'Medium', tone: 'info' },
  low: { label: 'Low', tone: 'neutral' },
};

const STATUS: Record<string, { label: string; tone: Tone }> = {
  open: { label: 'Open', tone: 'brand' },
  in_progress: { label: 'In progress', tone: 'info' },
  resolved: { label: 'Resolved', tone: 'success' },
};

const cat = (k: string) => CATEGORY[k] ?? CATEGORY.other;
const urg = (k: string) => URGENCY[k] ?? URGENCY.medium;
const stat = (k: string) => STATUS[k] ?? STATUS.open;

// Human-help queue — REAL rows from the SQLite escalations table (Day 7). The
// agent stops and files here instead of guessing on order disputes or scheme
// paperwork; a person picks them up. Summaries are already OTP/PIN/Aadhaar-redacted
// at write time (memory._redact), so nothing sensitive lands on this screen.
export default function EscalationsPage() {
  const { escalations, loading, error, setStatus } = useEscalations();
  const { callers } = useCallers();

  const [tab, setTab] = useState<'all' | 'open' | 'in_progress' | 'resolved'>('all');
  const [busyId, setBusyId] = useState<string | null>(null);

  const callerName = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of callers) if (c.name) m.set(c.user_id, c.name);
    return m;
  }, [callers]);

  const counts = useMemo(
    () => ({
      open: escalations.filter((e) => e.status === 'open').length,
      in_progress: escalations.filter((e) => e.status === 'in_progress').length,
      resolved: escalations.filter((e) => e.status === 'resolved').length,
      emergency: escalations.filter((e) => e.urgency === 'emergency' && e.status !== 'resolved')
        .length,
    }),
    [escalations]
  );

  const shown = useMemo(
    () => (tab === 'all' ? escalations : escalations.filter((e) => e.status === tab)),
    [escalations, tab]
  );

  // Flip status; when it becomes "resolved" and we know the caller, call them back
  // to say a person sorted it out (purpose escalation_resolved). The /api/calls
  // route still enforces the do_not_call opt-out and no-phone gates, so a refusal
  // there is expected, not an error.
  const change = async (esc: Escalation, next: string) => {
    if (next === esc.status) return;
    setBusyId(esc.escalation_id);
    try {
      const ok = await setStatus(esc.escalation_id, next);
      if (!ok) {
        toast.error('Could not update status');
        return;
      }
      if (next !== 'resolved') {
        toast.success(`Moved to ${stat(next).label}`);
        return;
      }
      if (!esc.user_id) {
        toast.success('Marked resolved — no linked caller to call back');
        return;
      }
      const res = await fetch('/api/calls', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          caller_id: esc.user_id,
          purpose: 'escalation_resolved',
          escalation_id: esc.escalation_id,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j?.dispatched) toast.success(`Resolved — calling ${j.calling} to confirm…`);
      else if (res.ok && j?.scheduled) toast.success('Resolved — call back scheduled');
      else if (j?.code === 'do_not_call')
        toast.success('Resolved (caller opted out of calls — no call back)');
      else if (j?.code === 'no_phone') toast.success('Resolved (no phone on file — no call back)');
      else toast.error(j?.error || 'Resolved, but the call back could not be placed');
    } catch {
      toast.error('Could not update status');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Human Help Queue"
        sub="When DukaanSaathi isn't sure — an order dispute or a government-scheme form — it stops and files the request here for a person, instead of guessing. Summaries are auto-redacted of OTPs, PINs, Aadhaar and account numbers."
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Inbox} tone="brand" label="Open" value={loading ? '—' : counts.open} />
        <StatCard
          icon={Clock}
          tone="info"
          label="In progress"
          value={loading ? '—' : counts.in_progress}
        />
        <StatCard
          icon={CircleCheck}
          tone="success"
          label="Resolved"
          value={loading ? '—' : counts.resolved}
        />
        <StatCard
          icon={TriangleAlert}
          tone="danger"
          label="Emergency (unresolved)"
          value={loading ? '—' : counts.emergency}
        />
      </div>

      <div className="mb-5">
        <Tabs
          value={tab}
          onChange={(id) => setTab(id as typeof tab)}
          tabs={[
            { id: 'all', label: `All (${escalations.length})` },
            { id: 'open', label: `Open (${counts.open})` },
            { id: 'in_progress', label: `In progress (${counts.in_progress})` },
            { id: 'resolved', label: `Resolved (${counts.resolved})` },
          ]}
        />
      </div>

      {loading ? (
        <LoadingRow label="Loading requests…" />
      ) : error ? (
        <EmptyState
          icon={Database}
          title="Escalation store unreachable"
          sub="The /api/escalations endpoint did not respond. This queue shows real requests only — run the app with the backend SQLite store present."
        />
      ) : shown.length === 0 ? (
        <EmptyState
          icon={LifeBuoy}
          title={
            escalations.length === 0 ? 'No requests yet' : `No ${tab.replace('_', ' ')} requests`
          }
          sub={
            escalations.length === 0
              ? 'When the agent hands something to a human, it shows up here — most urgent first.'
              : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {shown.map((e) => {
            const c = cat(e.reason_category);
            const u = urg(e.urgency);
            const s = stat(e.status);
            const name =
              (e.user_id && callerName.get(e.user_id)) || e.caller_name || 'Unknown caller';
            const busy = busyId === e.escalation_id;
            return (
              <div key={e.escalation_id} className="bg-card rounded-xl border p-4">
                <div className="flex items-start gap-3">
                  <IconChip icon={c.icon} tone={u.tone} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {e.user_id ? (
                        <Link
                          href={`/dashboard/callers/${encodeURIComponent(e.user_id)}`}
                          className="hover:text-primary truncate font-semibold"
                        >
                          {name}
                        </Link>
                      ) : (
                        <span className="truncate font-semibold">{name}</span>
                      )}
                      <StatusPill tone={u.tone} pulse={e.urgency === 'emergency'}>
                        {u.label}
                      </StatusPill>
                      <StatusPill tone={s.tone}>{s.label}</StatusPill>
                      <span className="text-muted-foreground ml-auto font-mono text-xs">
                        {e.escalation_id}
                      </span>
                    </div>

                    <p className="mt-2 text-sm leading-6">{e.summary}</p>

                    <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                      <span className="inline-flex items-center gap-1">
                        <c.icon className="size-3.5" /> {c.label}
                      </span>
                      {e.follow_up_method && <span>· follow up: {e.follow_up_method}</span>}
                      <span>· filed {fmtAgo(e.created_at, '—')}</span>
                      {e.status === 'resolved' && e.updated_at && (
                        <span>· resolved {fmtAgo(e.updated_at, '—')}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-end gap-2 border-t pt-3">
                  {busy && <Loader2 className="text-muted-foreground size-4 animate-spin" />}
                  {e.status !== 'resolved' && e.user_id && (
                    <span className="text-muted-foreground mr-auto inline-flex items-center gap-1 text-xs">
                      <PhoneOutgoing className="size-3.5" /> resolving calls the caller back
                    </span>
                  )}
                  <label className="text-muted-foreground text-xs font-medium">Status</label>
                  <select
                    value={e.status}
                    disabled={busy}
                    onChange={(ev) => change(e, ev.target.value)}
                    className={cx(INPUT, 'h-8')}
                    aria-label={`Status for ${e.escalation_id}`}
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In progress</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
