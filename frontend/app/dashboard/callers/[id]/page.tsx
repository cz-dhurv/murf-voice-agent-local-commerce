'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Pencil, PhoneOff, PhoneOutgoing, Save, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { cx, fmtWhen, initials, useCallers } from '@/components/app/dashboard/data';
import { ConfirmDialog, LoadingRow, StatusPill } from '@/components/app/dashboard/kit';
import { useLanguage } from '@/components/app/language-provider';
import { Button } from '@/components/ui/button';

type Tr = ReturnType<typeof useLanguage>['tr'];

const INPUT =
  'border-input bg-background focus-visible:ring-ring/50 h-9 w-full rounded-md border px-3 text-sm outline-none focus-visible:ring-2';

function langLabel(pref: string | null, tr: Tr): string | null {
  if (pref === 'en') return tr.memLangEn;
  if (pref === 'hi') return tr.memLangHi;
  return pref || null;
}

// Caller detail — REAL edit (PATCH) + forget (DELETE) through useCallers().
export default function CallerDetailPage() {
  const { tr } = useLanguage();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = decodeURIComponent(params.id);

  const { callers, loading, patch, remove } = useCallers();
  const caller = useMemo(() => callers.find((c) => c.user_id === id), [callers, id]);

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [lang, setLang] = useState('');
  const [facts, setFacts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [calling, setCalling] = useState(false);
  const [confirmForget, setConfirmForget] = useState(false);

  // Seed the form once the real row arrives (or changes).
  useEffect(() => {
    if (!caller) return;
    setName(caller.name ?? '');
    setLang(caller.language_preference ?? '');
    setFacts(caller.facts);
  }, [caller]);

  if (loading) return <LoadingRow label={tr.memLoading} />;

  if (!caller) {
    return (
      <div>
        <BackButton onClick={() => router.push('/dashboard/callers')} label={tr.cdBack} />
        <div className="bg-card rounded-2xl border p-8 text-center">
          <div className="font-semibold">{tr.memUnknown}</div>
          <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm">
            No caller with id <code className="font-mono">{id}</code> exists in the memory store.
          </p>
        </div>
      </div>
    );
  }

  const reset = () => {
    setName(caller.name ?? '');
    setLang(caller.language_preference ?? '');
    setFacts(caller.facts);
    setEditing(false);
  };

  const save = async () => {
    setBusy(true);
    try {
      const ok = await patch(caller.user_id, {
        name: name.trim() || null,
        language_preference: lang || null,
        facts,
      });
      if (ok) {
        toast.success(tr.cdSave);
        setEditing(false);
      } else {
        toast.error('Update failed');
      }
    } finally {
      setBusy(false);
    }
  };

  const forget = async () => {
    setBusy(true);
    try {
      const ok = await remove(caller.user_id);
      if (ok) {
        toast.success(tr.cdDelete);
        router.push('/dashboard/callers');
      } else {
        toast.error('Delete failed');
        setBusy(false);
      }
    } catch {
      setBusy(false);
    }
  };

  const factEntries = Object.entries(editing ? facts : caller.facts);

  // Outbound calling (Day 6): only when the shop has a number to call and the
  // caller hasn't opted out. The server route re-checks both — this just guides UI.
  const optedOut = caller.facts.do_not_call === 'true';
  const hasContact = Boolean(caller.facts.contact);

  const callNow = async () => {
    setCalling(true);
    try {
      const res = await fetch('/api/calls', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ caller_id: caller.user_id }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j?.dispatched) toast.success(`Calling ${j.calling}…`);
      else toast.error(j?.error || 'Could not place the call');
    } catch {
      toast.error('Could not place the call');
    } finally {
      setCalling(false);
    }
  };

  return (
    <div>
      <BackButton onClick={() => router.push('/dashboard/callers')} label={tr.cdBack} />

      <div className="bg-card rounded-2xl border p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="bg-primary/10 text-primary flex size-14 items-center justify-center rounded-2xl text-lg font-bold">
              {initials(caller.name)}
            </span>
            <div>
              {editing ? (
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={tr.cdNameLabel}
                  className={cx(INPUT, 'max-w-56')}
                />
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold">{caller.name || tr.memUnknown}</span>
                  {Object.keys(caller.facts).length > 0 && (
                    <StatusPill tone="success">{tr.reTitle}</StatusPill>
                  )}
                  {optedOut && (
                    <StatusPill tone="neutral">
                      <PhoneOff className="mr-1 inline size-3" /> Do not call
                    </StatusPill>
                  )}
                </div>
              )}
              <div className="text-muted-foreground mt-1 font-mono text-xs">
                {tr.cdUserId}: {caller.user_id}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            {editing ? (
              <>
                <Button size="sm" onClick={save} disabled={busy} className="gap-1.5">
                  <Save className="size-4" /> {busy ? tr.cdSaving : tr.cdSave}
                </Button>
                <Button size="sm" variant="outline" onClick={reset} disabled={busy}>
                  {tr.cdCancel}
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  onClick={callNow}
                  disabled={calling || optedOut || !hasContact}
                  title={
                    optedOut
                      ? 'This caller has opted out of calls'
                      : !hasContact
                        ? 'No phone number on file for this caller'
                        : 'Place an order-confirmation call'
                  }
                  className="gap-1.5"
                >
                  <PhoneOutgoing className="size-4" /> {calling ? 'Calling…' : 'Call Now'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditing(true)}
                  className="gap-1.5"
                >
                  <Pencil className="size-4" /> {tr.cdEdit}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setConfirmForget(true)}
                  disabled={busy}
                  className="text-destructive hover:text-destructive gap-1.5"
                >
                  <Trash2 className="size-4" /> {tr.cdDelete}
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <div className="text-muted-foreground text-xs">{tr.cdLanguage}</div>
            {editing ? (
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                className={cx(INPUT, 'mt-1 max-w-48')}
              >
                <option value="">—</option>
                <option value="en">{tr.memLangEn}</option>
                <option value="hi">{tr.memLangHi}</option>
              </select>
            ) : (
              <div className="mt-1 font-medium">
                {langLabel(caller.language_preference, tr) ?? '—'}
              </div>
            )}
          </div>
          <div>
            <div className="text-muted-foreground text-xs">{tr.cdLastInteraction}</div>
            <div className="mt-1 font-medium">{fmtWhen(caller.last_interaction, tr.memNever)}</div>
          </div>
        </div>
      </div>

      {/* facts */}
      <div className="bg-card mt-4 rounded-2xl border p-6">
        <div className="font-semibold">{tr.cdFactsTitle}</div>
        {factEntries.length === 0 ? (
          <p className="text-muted-foreground mt-3 text-sm italic">{tr.cdNoFactsHint}</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {factEntries.map(([k, v]) => (
              <li
                key={k}
                className="bg-muted/40 flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm"
              >
                <span>
                  <span className="text-muted-foreground">{k.replace(/_/g, ' ')}:</span>{' '}
                  <span className="font-medium">{String(v)}</span>
                </span>
                {editing && (
                  <button
                    type="button"
                    onClick={() =>
                      setFacts((f) => {
                        const next = { ...f };
                        delete next[k];
                        return next;
                      })
                    }
                    className="text-muted-foreground hover:text-destructive inline-flex items-center gap-1 text-xs"
                  >
                    <X className="size-3.5" /> {tr.cdRemoveFact}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={confirmForget}
        onOpenChange={setConfirmForget}
        title={tr.cdDelete}
        body={tr.memForgetConfirm}
        confirmLabel={busy ? tr.cdSaving : tr.cdDelete}
        onConfirm={forget}
        busy={busy}
      />
    </div>
  );
}

function BackButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-muted-foreground hover:text-foreground mb-5 inline-flex items-center gap-1.5 text-sm font-medium"
    >
      <ArrowLeft className="size-4" /> {label}
    </button>
  );
}
