'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CircleCheck,
  Clock,
  CornerDownRight,
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
  refunded: { label: 'Refunded', tone: 'success' },
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

  const [tab, setTab] = useState<'all' | 'open' | 'in_progress' | 'resolved' | 'refunded'>('all');
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
      refunded: escalations.filter((e) => e.status === 'refunded').length,
      emergency: escalations.filter(
        (e) => e.urgency === 'emergency' && e.status !== 'resolved' && e.status !== 'refunded'
      ).length,
    }),
    [escalations]
  );

  const shown = useMemo(
    () => (tab === 'all' ? escalations : escalations.filter((e) => e.status === tab)),
    [escalations, tab]
  );

  // A refund-not-received follow-up is filed against the SAME parent ticket
  // (memory.create_refund_followup sets parent_id) so the whole story stays under
  // one id. Render children nested beneath their parent; treat an orphan whose
  // parent isn't loaded as its own root so it never vanishes.
  const byId = useMemo(() => new Map(escalations.map((e) => [e.escalation_id, e])), [escalations]);
  const childrenByParent = useMemo(() => {
    const m = new Map<string, Escalation[]>();
    for (const e of escalations) {
      if (!e.parent_id) continue;
      const arr = m.get(e.parent_id);
      if (arr) arr.push(e);
      else m.set(e.parent_id, [e]);
    }
    return m;
  }, [escalations]);
  // ponytail: roots come from the tab-filtered set; a child whose own status
  // matches the tab but whose parent is filtered out won't show under a non-'all'
  // tab. Fine for a help queue — widen to always-attach-children if it matters.
  const roots = useMemo(
    () => shown.filter((e) => !e.parent_id || !byId.has(e.parent_id)),
    [shown, byId]
  );

  // Flip status; when it becomes "resolved" or "refunded" and we know the caller,
  // call them back — a person sorted it out (escalation_resolved), or the refund has
  // now been processed (refund_processed). The /api/calls route still enforces the
  // do_not_call opt-out and no-phone gates, so a refusal there is expected, not an error.
  const change = async (esc: Escalation, next: string) => {
    if (next === esc.status) return;
    setBusyId(esc.escalation_id);
    try {
      const ok = await setStatus(esc.escalation_id, next);
      if (!ok) {
        toast.error('Could not update status');
        return;
      }
      const label = stat(next).label;
      const notify = next === 'resolved' || next === 'refunded';
      if (!notify) {
        toast.success(`Moved to ${label}`);
        return;
      }
      if (!esc.user_id) {
        toast.success(`Marked ${label.toLowerCase()} — no linked caller to call back`);
        return;
      }
      const res = await fetch('/api/calls', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          caller_id: esc.user_id,
          purpose: next === 'refunded' ? 'refund_processed' : 'escalation_resolved',
          escalation_id: esc.escalation_id,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j?.dispatched) toast.success(`${label} — calling ${j.calling} to confirm…`);
      else if (res.ok && j?.scheduled) toast.success(`${label} — call back scheduled`);
      else if (j?.code === 'do_not_call')
        toast.success(`${label} (caller opted out of calls — no call back)`);
      else if (j?.code === 'no_phone') toast.success(`${label} (no phone on file — no call back)`);
      else toast.error(j?.error || `${label}, but the call back could not be placed`);
    } catch {
      toast.error('Could not update status');
    } finally {
      setBusyId(null);
    }
  };

  // One card, reused for a parent ticket and for a nested customer sub-issue
  // (isChild) — a refund-not-received follow-up filed under the same parent id.
  const renderCard = (e: Escalation, isChild: boolean) => {
    const c = cat(e.reason_category);
    const u = urg(e.urgency);
    const s = stat(e.status);
    const name = (e.user_id && callerName.get(e.user_id)) || e.caller_name || 'Unknown caller';
    const busy = busyId === e.escalation_id;
    const terminal = e.status === 'resolved' || e.status === 'refunded';
    return (
      <div key={e.escalation_id} className="bg-card rounded-xl border p-4">
        <div className="flex items-start gap-3">
          <IconChip icon={isChild ? CornerDownRight : c.icon} tone={u.tone} />
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
              {isChild && <StatusPill tone="danger">Refund not received</StatusPill>}
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
                {isChild ? (
                  <>
                    <CornerDownRight className="size-3.5" /> Customer sub-issue under{' '}
                    <span className="font-mono">{e.parent_id}</span>
                  </>
                ) : (
                  <>
                    <c.icon className="size-3.5" /> {c.label}
                  </>
                )}
              </span>
              {e.follow_up_method && <span>· follow up: {e.follow_up_method}</span>}
              <span>· filed {fmtAgo(e.created_at, '—')}</span>
              {terminal && e.updated_at && (
                <span>
                  · {s.label.toLowerCase()} {fmtAgo(e.updated_at, '—')}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-end gap-2 border-t pt-3">
          {busy && <Loader2 className="text-muted-foreground size-4 animate-spin" />}
          {!terminal && e.user_id && (
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
            <option value="refunded">Refunded</option>
          </select>
        </div>
      </div>
    );
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
            { id: 'refunded', label: `Refunded (${counts.refunded})` },
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
      ) : roots.length === 0 ? (
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
          {roots.map((e) => {
            const kids = childrenByParent.get(e.escalation_id) ?? [];
            return (
              <div key={e.escalation_id} className={kids.length ? 'space-y-2' : undefined}>
                {renderCard(e, false)}
                {kids.length > 0 && (
                  <div className="border-border ml-4 space-y-2 border-l-2 border-dashed pl-4">
                    {kids.map((k) => renderCard(k, true))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
