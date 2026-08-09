'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  Bug,
  FileText,
  History,
  Languages,
  ListChecks,
  MessageSquare,
  NotebookPen,
  Pencil,
  Play,
  Save,
  ScrollText,
  ShieldCheck,
  Sprout,
  Trash2,
  User,
  UserCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { useSessionContext, useVoiceAssistant } from '@livekit/components-react';
import {
  type Caller,
  cx,
  fmtWhen,
  initials,
  langName,
  useCallers,
} from '@/components/app/dashboard/data';
import {
  DEMO_AGENT_LOGS,
  DEMO_CONVERSATION,
  DEMO_DEBUG,
  DEMO_INSIGHTS,
  DEMO_RECENT,
} from '@/components/app/dashboard/demo';
import {
  Card,
  CardTitle,
  ConfirmDialog,
  DemoBadge,
  EmptyState,
  LoadingRow,
  MetaRow,
  PageHeader,
  StatCard,
  StatusPill,
  Tabs,
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
        sub="Live voice session, caller memory, and call insights in one place."
        actions={
          <StatusPill tone={call.tone} pulse={isConnected}>
            {call.label}
          </StatusPill>
        }
      />

      {/* KPI row — real (call status, language, returning) + badged demo (track, consent) */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard
          icon={Activity}
          tone={call.tone}
          label="Call Status"
          value={call.label}
          hint={call.hint}
        />
        <StatCard
          icon={Sprout}
          tone="success"
          label="Track"
          value="Agriculture"
          hint="Crop: Cotton"
          badge={<DemoBadge label="Demo" />}
        />
        <StatCard
          icon={Languages}
          tone="brand"
          label="Language"
          value={langName(me?.language_preference ?? null) ?? '—'}
          hint={me ? 'Caller preference' : 'Native script'}
        />
        <StatCard
          icon={ShieldCheck}
          tone="success"
          label="Consent"
          value="Granted"
          hint="Stored with consent"
          badge={<DemoBadge label="Demo" />}
        />
        <StatCard
          icon={UserCheck}
          tone={me ? 'success' : 'neutral'}
          label="Returning Caller"
          value={me ? 'Yes' : 'New'}
          hint={me ? `${Object.keys(me.facts).length} facts remembered` : 'First interaction'}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* left: live conversation showcase + the real voice widget */}
        <div className="space-y-4 lg:col-span-2">
          <LiveConversation isConnected={isConnected} state={state} />
          <DukaanExperience />
        </div>

        {/* right rail: real caller memory + quick actions + demo recents */}
        <div className="space-y-4">
          <CallerRail caller={me} loading={loading} onPatch={patch} onRemove={remove} />
          <RecentRail />
        </div>
      </div>
    </div>
  );
}

// ---------------- Live Conversation (tabs) ----------------
// The turn cards, insights, and logs are illustrative — the real live transcript
// streams inside <DukaanExperience/> below. Everything here wears a DemoBadge.
const CONVO_TABS = [
  { id: 'convo', label: 'Live Conversation', icon: MessageSquare },
  { id: 'insights', label: 'Call Insights', icon: ListChecks },
  { id: 'logs', label: 'Agent Logs', icon: ScrollText },
  { id: 'transcript', label: 'Transcript', icon: FileText },
  { id: 'debug', label: 'Debug Info', icon: Bug },
];

const LOG_TONE: Record<'info' | 'ok' | 'warn', Tone> = {
  info: 'info',
  ok: 'success',
  warn: 'brand',
};

function LiveConversation({ isConnected, state }: { isConnected: boolean; state: string }) {
  const [tab, setTab] = useState('convo');

  return (
    <Card className="p-0">
      <div className="flex items-center gap-2 px-5 pt-5 sm:px-6">
        <MessageSquare className="text-primary size-5" />
        <span className="font-semibold">Live Conversation</span>
        <DemoBadge className="ml-2" />
        <span className="ml-auto">
          <StatusPill tone={isConnected ? 'success' : 'neutral'} pulse={isConnected}>
            {isConnected ? state : 'offline'}
          </StatusPill>
        </span>
      </div>

      <div className="mt-4 px-5 sm:px-6">
        <Tabs tabs={CONVO_TABS} value={tab} onChange={setTab} />
      </div>

      <div className="p-5 sm:p-6">
        {tab === 'convo' && (
          <div className="space-y-3">
            {DEMO_CONVERSATION.map((turn, i) => (
              <div
                key={i}
                className={cx(
                  'flex flex-col gap-1 rounded-2xl border p-3.5 text-sm',
                  turn.who === 'agent'
                    ? 'bg-primary/5 border-primary/15'
                    : 'border-emerald-500/15 bg-emerald-500/5'
                )}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cx(
                      'text-xs font-semibold',
                      turn.who === 'agent'
                        ? 'text-primary'
                        : 'text-emerald-600 dark:text-emerald-400'
                    )}
                  >
                    {turn.who === 'agent' ? 'AI Agent' : 'Caller'}
                  </span>
                  <span className="text-muted-foreground ml-auto text-xs tabular-nums">
                    {turn.at}
                  </span>
                  <button
                    type="button"
                    aria-label="Play audio"
                    className="text-muted-foreground hover:text-primary"
                  >
                    <Play className="size-3.5" />
                  </button>
                </div>
                <p className="font-medium" lang="hi">
                  {turn.native}
                </p>
                <p className="text-muted-foreground text-xs">{turn.translation}</p>
              </div>
            ))}
          </div>
        )}

        {tab === 'insights' && (
          <div className="grid gap-3 sm:grid-cols-2">
            {DEMO_INSIGHTS.map((it) => (
              <div key={it.label} className="bg-muted/40 rounded-xl px-4 py-3">
                <div className="text-muted-foreground text-xs">{it.label}</div>
                <div className="mt-1 font-semibold">{it.value}</div>
              </div>
            ))}
          </div>
        )}

        {tab === 'logs' && (
          <ul className="space-y-2 font-mono text-xs">
            {DEMO_AGENT_LOGS.map((l, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="text-muted-foreground shrink-0 tabular-nums">{l.t}</span>
                <StatusPill tone={LOG_TONE[l.level]}>{l.level}</StatusPill>
                <span className="min-w-0 break-words">{l.msg}</span>
              </li>
            ))}
          </ul>
        )}

        {tab === 'transcript' && (
          <p className="text-muted-foreground text-sm leading-6">
            The full turn-by-turn transcript streams live inside the voice widget below while a call
            is connected. This tab is a placeholder for the exported transcript view.
          </p>
        )}

        {tab === 'debug' && (
          <dl className="divide-y">
            {Object.entries(DEMO_DEBUG).map(([k, v]) => (
              <MetaRow key={k} label={k}>
                <code className="font-mono text-xs">{String(v)}</code>
              </MetaRow>
            ))}
          </dl>
        )}
      </div>
    </Card>
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
              <NotebookPen className="size-4" /> View Full Profile
            </Button>
          </Link>
          <Link href="/dashboard/history">
            <Button size="sm" variant="outline" className="w-full justify-start gap-2">
              <History className="size-4" /> Call History
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

// ---------------- Recent conversations (demo rail) ----------------
function RecentRail() {
  return (
    <Card>
      <CardTitle icon={History} right={<DemoBadge />}>
        Recent Conversations
      </CardTitle>
      <ul className="space-y-1">
        {DEMO_RECENT.map((r) => (
          <li
            key={r.id}
            className="hover:bg-muted/50 flex items-center gap-3 rounded-lg px-2 py-2 transition-colors"
          >
            <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg text-xs font-semibold">
              {initials(r.name)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{r.name}</div>
              <div className="text-muted-foreground truncate text-xs">{r.snippet}</div>
            </div>
            <span className="text-muted-foreground shrink-0 text-xs">{r.when}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
