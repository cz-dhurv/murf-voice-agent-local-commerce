'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  Boxes,
  Languages,
  NotebookPen,
  PackageX,
  Pencil,
  Save,
  ShieldCheck,
  ShoppingCart,
  Trash2,
  TriangleAlert,
  User,
  UserCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { useSessionContext, useVoiceAssistant } from '@livekit/components-react';
import {
  type Caller,
  LOW_STOCK,
  type Product,
  cx,
  fmtInr,
  fmtWhen,
  initials,
  langName,
  useCallers,
  useCatalogue,
} from '@/components/app/dashboard/data';
import {
  Card,
  CardTitle,
  ConfirmDialog,
  EmptyState,
  LoadingRow,
  MetaRow,
  PageHeader,
  StatCard,
  StatusPill,
  type Tone,
} from '@/components/app/dashboard/kit';
import { DukaanExperience } from '@/components/app/dukaan-experience';
import { Button } from '@/components/ui/button';
import { getCallerId } from '@/lib/utils';

const INPUT =
  'border-input bg-background focus-visible:ring-ring/50 h-9 w-full rounded-md border px-3 text-sm outline-none focus-visible:ring-2';

export default function DashboardHome() {
  const { isConnected } = useSessionContext();
  const { state } = useVoiceAssistant();
  const { callers, loading, patch, remove } = useCallers();

  // The current browser's caller id — the row the agent writes for THIS visitor.
  const [callerId, setCallerId] = useState<string | null>(null);
  useEffect(() => setCallerId(getCallerId()), []);
  const me = useMemo(
    () => callers.find((c) => c.user_id === callerId) ?? null,
    [callers, callerId]
  );

  const call: { label: string; tone: Tone; hint: string } = isConnected
    ? { label: 'In Progress', tone: 'success', hint: `Agent ${state}` }
    : { label: 'Idle', tone: 'neutral', hint: 'No active call' };

  return (
    <div>
      <PageHeader
        title="Control Center"
        sub="Live voice session, your shop at a glance, and caller memory in one place."
        actions={
          <StatusPill tone={call.tone} pulse={isConnected}>
            {call.label}
          </StatusPill>
        }
      />

      {/* KPI row — every card is backed by a real source (session + SQLite). */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={Activity}
          tone={call.tone}
          label="Call Status"
          value={call.label}
          hint={call.hint}
        />
        <StatCard
          icon={Languages}
          tone="brand"
          label="Language"
          value={langName(me?.language_preference ?? null) ?? '—'}
          hint={me ? 'Caller preference' : 'Native script'}
        />
        <StatCard
          icon={UserCheck}
          tone={me ? 'success' : 'neutral'}
          label="Returning Caller"
          value={me ? 'Yes' : 'New'}
          hint={me ? `${Object.keys(me.facts).length} facts remembered` : 'First interaction'}
        />
        <StatCard
          icon={User}
          tone="info"
          label="Known Callers"
          value={loading ? '—' : callers.length}
          hint="in memory store"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* left: the real voice widget (live transcript streams inside it) */}
        <div className="space-y-4 lg:col-span-2">
          <DukaanExperience />
        </div>

        {/* right rail: real shop summary + real caller memory */}
        <div className="space-y-4">
          <ShopRail />
          <CallerRail caller={me} loading={loading} onPatch={patch} onRemove={remove} />
        </div>
      </div>
    </div>
  );
}

// ---------------- Shop at a glance (REAL catalogue) ----------------
function ShopRail() {
  const { catalogue, categories, loading, error } = useCatalogue();

  const summary = useMemo(() => {
    const out = catalogue.filter((p) => p.stock_qty <= 0);
    const low = catalogue.filter((p) => p.stock_qty > 0 && p.stock_qty <= LOW_STOCK);
    const value = catalogue.reduce((s, p) => s + p.unit_price * p.stock_qty, 0);
    return { out, low, value };
  }, [catalogue]);

  return (
    <Card>
      <CardTitle
        icon={Boxes}
        right={
          <Link
            href="/dashboard/catalogue"
            className="text-primary inline-flex items-center gap-1 text-xs font-medium"
          >
            Manage <ArrowRight className="size-3.5" />
          </Link>
        }
      >
        Shop at a Glance
      </CardTitle>

      {loading ? (
        <LoadingRow label="Loading catalogue…" />
      ) : error ? (
        <EmptyState
          icon={Boxes}
          title="Catalogue unreachable"
          sub="The /api/catalogue endpoint did not respond."
        />
      ) : catalogue.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="No items yet"
          sub="Run the voice agent once to seed the shop inventory."
        />
      ) : (
        <>
          <dl className="divide-y">
            <MetaRow label="Items listed">
              {catalogue.length}{' '}
              <span className="text-muted-foreground">· {categories.length} cat.</span>
            </MetaRow>
            <MetaRow label="Inventory value">{fmtInr(summary.value)}</MetaRow>
            <MetaRow label="Low stock">
              <span className={cx(summary.low.length > 0 && 'text-blue-600 dark:text-blue-400')}>
                {summary.low.length}
              </span>
            </MetaRow>
            <MetaRow label="Out of stock">
              <span className={cx(summary.out.length > 0 && 'text-destructive font-medium')}>
                {summary.out.length}
              </span>
            </MetaRow>
          </dl>

          {(summary.out.length > 0 || summary.low.length > 0) && (
            <div className="mt-3 space-y-1.5 border-t pt-3">
              {summary.out.slice(0, 3).map((p) => (
                <RestockRow key={p.name} p={p} out />
              ))}
              {summary.low.slice(0, 3).map((p) => (
                <RestockRow key={p.name} p={p} />
              ))}
            </div>
          )}

          <Link href="/dashboard/orders">
            <Button size="sm" variant="outline" className="mt-4 w-full justify-start gap-2">
              <ShoppingCart className="size-4" /> Build an Order
            </Button>
          </Link>
        </>
      )}
    </Card>
  );
}

function RestockRow({ p, out }: { p: Product; out?: boolean }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {out ? (
        <PackageX className="text-destructive size-3.5 shrink-0" />
      ) : (
        <TriangleAlert className="size-3.5 shrink-0 text-blue-500" />
      )}
      <span className="flex-1 truncate capitalize">{p.name}</span>
      <span className="text-muted-foreground shrink-0 tabular-nums">
        {out ? 'out' : `${p.stock_qty} ${p.unit ?? ''} left`}
      </span>
    </div>
  );
}

// ---------------- Caller rail (REAL memory: edit + forget) ----------------
function CallerRail({
  caller,
  loading,
  onPatch,
  onRemove,
}: {
  caller: Caller | null;
  loading: boolean;
  onPatch: (
    id: string,
    body: { name: string | null; language_preference: string | null; facts: Record<string, string> }
  ) => Promise<boolean>;
  onRemove: (id: string) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [lang, setLang] = useState('');
  const [confirmForget, setConfirmForget] = useState(false);
  const [busy, setBusy] = useState(false);

  // Re-seed the edit form whenever the underlying caller changes.
  useEffect(() => {
    setName(caller?.name ?? '');
    setLang(caller?.language_preference ?? '');
    setEditing(false);
  }, [caller]);

  if (loading) {
    return (
      <Card>
        <CardTitle icon={User}>Caller Profile</CardTitle>
        <LoadingRow label="Loading caller memory…" />
      </Card>
    );
  }

  if (!caller) {
    return (
      <Card>
        <CardTitle icon={User}>Caller Profile</CardTitle>
        <EmptyState
          icon={User}
          title="No caller yet"
          sub="Start a call from the voice widget. Once the agent saves something with your consent, your remembered profile shows up here — pulled live from the caller-memory store."
        />
      </Card>
    );
  }

  const save = async () => {
    setBusy(true);
    try {
      const ok = await onPatch(caller.user_id, {
        name: name.trim() || null,
        language_preference: lang || null,
        facts: caller.facts,
      });
      if (ok) {
        toast.success('Caller updated');
        setEditing(false);
      } else {
        toast.error('Could not update caller');
      }
    } finally {
      setBusy(false);
    }
  };

  const forget = async () => {
    setBusy(true);
    try {
      const ok = await onRemove(caller.user_id);
      if (ok) toast.success('Caller forgotten (GDPR)');
      else toast.error('Could not forget caller');
      setConfirmForget(false);
    } finally {
      setBusy(false);
    }
  };

  const facts = Object.entries(caller.facts);

  return (
    <>
      <Card>
        <div className="flex items-start gap-3">
          <span className="bg-primary/10 text-primary flex size-12 shrink-0 items-center justify-center rounded-2xl text-base font-bold">
            {initials(caller.name)}
          </span>
          <div className="min-w-0 flex-1">
            {editing ? (
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Caller name"
                className={INPUT}
              />
            ) : (
              <div className="flex items-center gap-2">
                <span className="truncate text-lg font-bold">
                  {caller.name || 'Unknown caller'}
                </span>
                <StatusPill tone="success">Returning</StatusPill>
              </div>
            )}
            <div className="text-muted-foreground mt-1 truncate font-mono text-xs">
              {caller.user_id}
            </div>
          </div>
        </div>

        <dl className="mt-4 divide-y">
          <MetaRow label="Language">
            {editing ? (
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                className={cx(INPUT, 'h-8 w-32')}
              >
                <option value="">—</option>
                <option value="en">English</option>
                <option value="hi">हिन्दी (Hindi)</option>
              </select>
            ) : (
              (langName(caller.language_preference) ?? '—')
            )}
          </MetaRow>
          <MetaRow label="Last interaction">{fmtWhen(caller.last_interaction, 'Never')}</MetaRow>
          <MetaRow label="Total facts">{facts.length}</MetaRow>
        </dl>

        {/* Useful facts — the actual remembered key/values */}
        <div className="mt-4">
          <div className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
            Useful facts
          </div>
          {facts.length === 0 ? (
            <p className="text-muted-foreground text-sm italic">Nothing remembered yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {facts.map(([k, v]) => (
                <li key={k} className="flex items-start gap-2 text-sm">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                  <span>
                    <span className="text-muted-foreground">{k.replace(/_/g, ' ')}:</span>{' '}
                    <span className="font-medium">{v}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Quick actions */}
        <div className="mt-5 space-y-2 border-t pt-4">
          {editing ? (
            <div className="flex gap-2">
              <Button size="sm" onClick={save} disabled={busy} className="flex-1 gap-1.5">
                <Save className="size-4" /> {busy ? 'Saving…' : 'Save'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditing(false)}
                disabled={busy}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditing(true)}
              className="w-full justify-start gap-2"
            >
              <Pencil className="size-4" /> Update Caller Info
            </Button>
          )}
          <Link href="/dashboard/callers">
            <Button size="sm" variant="outline" className="w-full justify-start gap-2">
              <NotebookPen className="size-4" /> View All Callers
            </Button>
          </Link>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setConfirmForget(true)}
            disabled={busy}
            className="text-destructive hover:text-destructive w-full justify-start gap-2"
          >
            <Trash2 className="size-4" /> Forget Caller (GDPR)
          </Button>
        </div>
      </Card>

      <ConfirmDialog
        open={confirmForget}
        onOpenChange={setConfirmForget}
        title="Forget this caller?"
        body={
          <>
            This permanently deletes <b>{caller.name || caller.user_id}</b> and all remembered facts
            from the caller-memory store. This is a real, irreversible GDPR erasure — it cannot be
            undone.
          </>
        }
        confirmLabel={busy ? 'Forgetting…' : 'Forget caller'}
        onConfirm={forget}
        busy={busy}
      />
    </>
  );
}
