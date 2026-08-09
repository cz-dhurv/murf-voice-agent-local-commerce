'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  BadgeCheck,
  ChevronRight,
  Database,
  Globe,
  HardDrive,
  Info,
  Languages,
  Pencil,
  Save,
  Search,
  Server,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import { useLanguage } from '@/components/app/language-provider';
import { LanguageToggle } from '@/components/app/language-toggle';
import { Button } from '@/components/ui/button';

type Tr = ReturnType<typeof useLanguage>['tr'];

type Caller = {
  user_id: string;
  name: string | null;
  language_preference: string | null;
  facts: Record<string, string>;
  last_interaction: string | null;
};

type DbStatus = {
  engine: string;
  connected: boolean;
  sizeBytes: number;
  records: number;
  driver: string;
};

type View = 'profiles' | 'memory' | 'tools' | 'consent' | 'returning' | 'multilingual';

const PAGE_SIZE = 9;
const INPUT =
  'border-input bg-background focus-visible:ring-ring/50 h-9 w-full rounded-md border px-3 text-sm outline-none focus-visible:ring-2';

function cx(...parts: (string | false | undefined)[]) {
  return parts.filter(Boolean).join(' ');
}

/** sqlite datetime('now') is a UTC "YYYY-MM-DD HH:MM:SS" string. */
function fmtWhen(s: string | null, fallback: string): string {
  if (!s) return fallback;
  const d = new Date(s.replace(' ', 'T') + 'Z');
  return isNaN(d.getTime()) ? s : d.toLocaleString();
}

function fmtBytes(n: number): string {
  if (!n) return '0 KB';
  const kb = n / 1024;
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

function langLabel(pref: string | null, tr: Tr): string | null {
  if (pref === 'en') return tr.memLangEn;
  if (pref === 'hi') return tr.memLangHi;
  return pref || null;
}

function initials(name: string | null): string {
  if (!name) return '?';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

// ---------------- shell ----------------
export function Dashboard() {
  const { tr } = useLanguage();
  const [data, setData] = useState<{ callers: Caller[]; db: DbStatus | null } | null>(null); // null = loading
  const [view, setView] = useState<View>('profiles');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/callers', { cache: 'no-store' });
      const j = await res.json();
      setData({ callers: Array.isArray(j.callers) ? j.callers : [], db: j.db ?? null });
    } catch {
      setData({ callers: [], db: null }); // API unreachable — treat as empty, not a crash
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const callers = data?.callers ?? [];
  const selected = selectedId ? callers.find((c) => c.user_id === selectedId) : undefined;

  const nav: [View, string, typeof Users][] = [
    ['profiles', tr.dnProfiles, Users],
    ['memory', tr.dnMemory, Database],
    ['tools', tr.dnTools, Wrench],
    ['consent', tr.dnConsent, ShieldCheck],
    ['returning', tr.dnReturning, UserCheck],
    ['multilingual', tr.dnMultilingual, Languages],
  ];

  const go = (v: View) => {
    setSelectedId(null);
    setView(v);
  };

  return (
    <div className="bg-muted/20 flex min-h-svh flex-col lg:flex-row">
      {/* sidebar */}
      <aside className="bg-background lg:sticky lg:top-0 lg:h-svh lg:w-64 lg:shrink-0 lg:border-r">
        <div className="flex items-center gap-2 border-b px-5 py-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/dukaan-logo.svg" alt="DukaanSaathi" className="size-7" />
          <div className="leading-tight">
            <div className="text-sm font-bold tracking-tight">
              Voice for <span className="text-primary">Bharat</span>
            </div>
            <div className="text-muted-foreground text-xs">{tr.dashName}</div>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto p-3 lg:flex-col">
          {nav.map(([v, label, Icon]) => {
            const active = view === v && !selected;
            return (
              <button
                key={v}
                type="button"
                onClick={() => go(v)}
                className={cx(
                  'flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="size-4" /> {label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-background/80 sticky top-0 z-40 flex items-center justify-between gap-3 border-b px-5 py-3 backdrop-blur">
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm font-medium"
          >
            <ArrowLeft className="size-4" /> {tr.dashBack}
          </Link>
          <LanguageToggle />
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-8">
          {selected ? (
            <CallerDetail
              caller={selected}
              tr={tr}
              onBack={() => setSelectedId(null)}
              onChanged={load}
            />
          ) : view === 'profiles' ? (
            <CallerProfiles
              callers={callers}
              loading={data === null}
              tr={tr}
              onOpen={setSelectedId}
            />
          ) : view === 'memory' ? (
            <MemoryData db={data?.db ?? null} loading={data === null} tr={tr} />
          ) : view === 'tools' ? (
            <MemoryTools tr={tr} />
          ) : view === 'consent' ? (
            <Consent tr={tr} />
          ) : view === 'returning' ? (
            <Returning tr={tr} />
          ) : (
            <Multilingual tr={tr} />
          )}
        </main>
      </div>
    </div>
  );
}

function PageHead({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <p className="text-muted-foreground mt-1 text-sm">{sub}</p>
    </div>
  );
}

// ---------------- caller profiles ----------------
function CallerProfiles({
  callers,
  loading,
  tr,
  onOpen,
}: {
  callers: Caller[];
  loading: boolean;
  tr: Tr;
  onOpen: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [langFilter, setLangFilter] = useState<'all' | 'en' | 'hi'>('all');
  const [page, setPage] = useState(0);

  const stats = [
    [Users, tr.statTotal, callers.length],
    [BadgeCheck, tr.statNamed, callers.filter((c) => c.name).length],
    [Database, tr.statWithFacts, callers.filter((c) => Object.keys(c.facts).length > 0).length],
    [Languages, tr.statHindi, callers.filter((c) => c.language_preference === 'hi').length],
  ] as const;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return callers.filter((c) => {
      if (langFilter !== 'all' && c.language_preference !== langFilter) return false;
      if (!q) return true;
      return (c.name ?? '').toLowerCase().includes(q) || c.user_id.toLowerCase().includes(q);
    });
  }, [callers, query, langFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const safePage = Math.min(page, Math.max(0, totalPages - 1));
  const shown = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  return (
    <div>
      <PageHead title={tr.cpTitle} sub={tr.cpSub} />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(([Icon, label, value]) => (
          <div key={label} className="bg-card rounded-xl border p-4">
            <div className="flex items-center gap-2">
              <span className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg">
                <Icon className="size-4" />
              </span>
              <span className="text-muted-foreground text-xs">{label}</span>
            </div>
            <div className="mt-2 text-2xl font-bold tabular-nums">{value}</div>
          </div>
        ))}
      </div>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            placeholder={tr.cpSearchPh}
            className={cx(INPUT, 'pl-9')}
          />
        </div>
        <select
          value={langFilter}
          onChange={(e) => {
            setLangFilter(e.target.value as 'all' | 'en' | 'hi');
            setPage(0);
          }}
          className={cx(INPUT, 'sm:w-48')}
          aria-label={tr.cdLangLabel}
        >
          <option value="all">{tr.cpAllLangs}</option>
          <option value="en">{tr.memLangEn}</option>
          <option value="hi">{tr.memLangHi}</option>
        </select>
      </div>

      {loading ? (
        <p className="text-muted-foreground py-16 text-center text-sm">{tr.memLoading}</p>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center">
          <div className="text-foreground font-semibold">
            {callers.length === 0 ? tr.memEmptyTitle : tr.cpNoResults}
          </div>
          {callers.length === 0 && (
            <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm">{tr.memEmptySub}</p>
          )}
        </div>
      ) : (
        <>
          <div className="grid gap-3 lg:grid-cols-2">
            {shown.map((c) => (
              <button
                key={c.user_id}
                type="button"
                onClick={() => onOpen(c.user_id)}
                className="bg-card hover:border-primary/40 group flex items-center gap-4 rounded-xl border p-4 text-left transition-colors"
              >
                <span className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-xl font-semibold">
                  {initials(c.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold">{c.name || tr.memUnknown}</span>
                    {langLabel(c.language_preference, tr) && (
                      <span className="text-muted-foreground bg-muted rounded-full px-2 py-0.5 text-xs">
                        {langLabel(c.language_preference, tr)}
                      </span>
                    )}
                  </div>
                  <div className="text-muted-foreground mt-0.5 truncate text-xs">
                    {Object.keys(c.facts).length > 0
                      ? Object.entries(c.facts)
                          .slice(0, 2)
                          .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
                          .join(' · ')
                      : tr.memNoFacts}
                  </div>
                  <div className="text-muted-foreground mt-1 text-xs">
                    {tr.memLastSeen}: {fmtWhen(c.last_interaction, tr.memNever)}
                  </div>
                </div>
                <ChevronRight className="text-muted-foreground group-hover:text-primary size-5 shrink-0" />
              </button>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={safePage === 0}
                onClick={() => setPage(safePage - 1)}
              >
                ‹
              </Button>
              <span className="text-muted-foreground text-sm tabular-nums">
                {safePage + 1} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={safePage >= totalPages - 1}
                onClick={() => setPage(safePage + 1)}
              >
                ›
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ---------------- caller detail (edit / delete) ----------------
function CallerDetail({
  caller,
  tr,
  onBack,
  onChanged,
}: {
  caller: Caller;
  tr: Tr;
  onBack: () => void;
  onChanged: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(caller.name ?? '');
  const [lang, setLang] = useState(caller.language_preference ?? '');
  const [facts, setFacts] = useState<Record<string, string>>(caller.facts);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setName(caller.name ?? '');
    setLang(caller.language_preference ?? '');
    setFacts(caller.facts);
    setEditing(false);
  };

  const save = async () => {
    setBusy(true);
    try {
      await fetch(`/api/callers?id=${encodeURIComponent(caller.user_id)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || null,
          language_preference: lang || null,
          facts,
        }),
      });
      await onChanged();
      setEditing(false);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(tr.memForgetConfirm)) return;
    setBusy(true);
    try {
      await fetch(`/api/callers?id=${encodeURIComponent(caller.user_id)}`, { method: 'DELETE' });
      await onChanged();
      onBack();
    } finally {
      setBusy(false);
    }
  };

  const factEntries = Object.entries(editing ? facts : caller.facts);

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="text-muted-foreground hover:text-foreground mb-5 inline-flex items-center gap-1.5 text-sm font-medium"
      >
        <ArrowLeft className="size-4" /> {tr.cdBack}
      </button>

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
                <div className="text-xl font-bold">{caller.name || tr.memUnknown}</div>
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
                  variant="outline"
                  onClick={() => setEditing(true)}
                  className="gap-1.5"
                >
                  <Pencil className="size-4" /> {tr.cdEdit}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={remove}
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
    </div>
  );
}

// ---------------- memory & data ----------------
function MemoryData({ db, loading, tr }: { db: DbStatus | null; loading: boolean; tr: Tr }) {
  const rows: [string, string][] = [
    [tr.mdEngine, db?.engine ?? 'SQLite'],
    [tr.mdStatus, db?.connected ? tr.mdConnected : tr.mdOffline],
    [tr.mdRecords, String(db?.records ?? 0)],
    [tr.mdSize, fmtBytes(db?.sizeBytes ?? 0)],
    [tr.mdDriver, db?.driver ?? 'node:sqlite'],
  ];
  return (
    <div>
      <PageHead title={tr.mdTitle} sub={tr.mdSub} />

      <div className="bg-card rounded-2xl border p-6">
        <div className="mb-4 flex items-center gap-2">
          <Server className="text-primary size-5" />
          <span className="font-semibold">{tr.mdStoreTitle}</span>
          {!loading && (
            <span
              className={cx(
                'ml-auto rounded-full px-2.5 py-0.5 text-xs font-medium',
                db?.connected
                  ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {db?.connected ? tr.mdConnected : tr.mdOffline}
            </span>
          )}
        </div>
        <dl className="divide-y">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-4 py-2.5 text-sm">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="font-medium">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="bg-card rounded-2xl border p-6">
          <HardDrive className="text-primary size-5" />
          <div className="mt-3 font-semibold">{tr.mdPersistTitle}</div>
          <p className="text-muted-foreground mt-1 text-sm leading-6">{tr.mdPersistBody}</p>
        </div>
        <div className="bg-card rounded-2xl border p-6">
          <Info className="text-primary size-5" />
          <div className="mt-3 font-semibold">{tr.mdBackupTitle}</div>
          <p className="text-muted-foreground mt-1 text-sm leading-6">{tr.mdBackupBody}</p>
        </div>
      </div>
    </div>
  );
}

// ---------------- memory tools ----------------
function MemoryTools({ tr }: { tr: Tr }) {
  const tools = [
    {
      name: 'lookup_caller',
      desc: tr.memTool1Desc,
      input: 'user_id',
      output: 'name, language_preference, facts, last_interaction',
    },
    {
      name: 'save_caller_memory',
      desc: tr.memTool2Desc,
      input: 'name, facts_json, language_preference',
      output: 'confirmation',
    },
    {
      name: 'forget_caller',
      desc: tr.memTool3Desc,
      input: 'user_id',
      output: 'confirmation',
    },
  ];
  return (
    <div>
      <PageHead title={tr.mtTitle} sub={tr.mtSub} />
      <div className="space-y-4">
        {tools.map((t) => (
          <div key={t.name} className="bg-card rounded-2xl border p-6">
            <div className="flex items-center gap-2">
              <span className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg">
                <Wrench className="size-4" />
              </span>
              <code className="text-primary font-mono font-semibold">{t.name}</code>
            </div>
            <p className="text-muted-foreground mt-3 text-sm leading-6">{t.desc}</p>
            <div className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
              <div className="bg-muted/40 rounded-lg px-3 py-2">
                <span className="text-muted-foreground">{tr.mtInput}: </span>
                <code className="font-mono">{t.input}</code>
              </div>
              <div className="bg-muted/40 rounded-lg px-3 py-2">
                <span className="text-muted-foreground">{tr.mtOutput}: </span>
                <code className="font-mono">{t.output}</code>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="border-primary/20 bg-primary/5 text-foreground/80 mt-4 flex items-start gap-2 rounded-xl border p-4 text-sm">
        <Info className="text-primary mt-0.5 size-4 shrink-0" /> {tr.mtNote}
      </div>
    </div>
  );
}

// ---------------- consent ----------------
function Consent({ tr }: { tr: Tr }) {
  return (
    <div>
      <PageHead title={tr.coTitle} sub={tr.coSub} />
      <div className="bg-card rounded-2xl border p-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-primary size-5" />
          <span className="font-semibold">{tr.coPromptTitle}</span>
        </div>
        <blockquote className="border-primary/30 bg-primary/5 mt-4 rounded-r-lg border-l-4 px-4 py-3">
          <p className="font-medium" lang="hi">
            “क्या मैं यह आपके लिए याद रख लूँ?”
          </p>
          <p className="text-muted-foreground mt-1 text-sm">“May I remember this for you?”</p>
        </blockquote>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="bg-card rounded-2xl border p-6">
          <BadgeCheck className="text-primary size-5" />
          <div className="mt-3 font-semibold">{tr.coNeverTitle}</div>
          <p className="text-muted-foreground mt-1 text-sm leading-6">{tr.coNeverBody}</p>
        </div>
        <div className="bg-card rounded-2xl border p-6">
          <ShieldCheck className="text-primary size-5" />
          <div className="mt-3 font-semibold">{tr.memConsentTitle}</div>
          <p className="text-muted-foreground mt-1 text-sm leading-6">{tr.coRefuse}</p>
        </div>
      </div>
    </div>
  );
}

// ---------------- returning caller ----------------
function Returning({ tr }: { tr: Tr }) {
  const steps = [tr.reStep1, tr.reStep2, tr.reStep3, tr.reStep4];
  return (
    <div>
      <PageHead title={tr.reTitle} sub={tr.reSub} />
      <div className="bg-card rounded-2xl border p-6">
        <div className="flex items-center gap-2">
          <UserCheck className="text-primary size-5" />
          <span className="font-semibold">{tr.reStepsTitle}</span>
        </div>
        <ol className="mt-4 space-y-3">
          {steps.map((s, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="bg-primary/10 text-primary flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                {i + 1}
              </span>
              <span className="text-sm leading-6">{s}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="bg-card mt-4 rounded-2xl border p-6">
        <div className="font-semibold">{tr.reExampleTitle}</div>
        <div className="mt-4 space-y-3">
          <div>
            <div className="text-muted-foreground mb-1 text-xs font-medium">
              {tr.reExampleFirstLabel}
            </div>
            <p className="bg-muted/40 rounded-lg px-4 py-3 text-sm" lang="hi">
              “नमस्ते! मैं DukaanSaathi हूँ। बताइए, मैं आपकी क्या मदद कर सकता हूँ?”
            </p>
          </div>
          <div>
            <div className="text-muted-foreground mb-1 text-xs font-medium">
              {tr.reExampleReturnLabel}
            </div>
            <p
              className="border-primary/20 bg-primary/5 rounded-lg border px-4 py-3 text-sm"
              lang="hi"
            >
              “नमस्ते रमेश जी! फिर से आपकी दुकान पर। पिछली बार हमने UPI QR के बारे में बात की थी —
              सब ठीक चल रहा है?”
            </p>
          </div>
        </div>
        <p className="text-muted-foreground mt-4 text-sm">{tr.reNote}</p>
      </div>
    </div>
  );
}

// ---------------- multilingual ----------------
function Multilingual({ tr }: { tr: Tr }) {
  // Native-script samples — the same regardless of the UI language.
  const samples: [string, string][] = [
    ['हिंदी', 'नमस्ते, आप कैसे हैं?'],
    ['मराठी', 'नमस्कार, तुम्ही कसे आहात?'],
    ['ગુજરાતી', 'નમસ્તે, તમે કેમ છો?'],
    ['தமிழ்', 'வணக்கம், எப்படி இருக்கிறீர்கள்?'],
    ['বাংলা', 'নমস্কার, আপনি কেমন আছেন?'],
  ];
  return (
    <div>
      <PageHead title={tr.mlTitle} sub={tr.mlSub} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="bg-card rounded-2xl border p-6">
          <Globe className="text-primary size-5" />
          <div className="mt-3 font-semibold">{tr.mlDetectTitle}</div>
          <p className="text-muted-foreground mt-1 text-sm leading-6">{tr.mlDetectBody}</p>
        </div>
        <div className="bg-card rounded-2xl border p-6">
          <Languages className="text-primary size-5" />
          <div className="mt-3 font-semibold">{tr.mlScriptTitle}</div>
          <p className="text-muted-foreground mt-1 text-sm leading-6">{tr.mlScriptBody}</p>
        </div>
      </div>

      <div className="bg-card mt-4 rounded-2xl border p-6">
        <div className="font-semibold">{tr.mlExamplesTitle}</div>
        <ul className="mt-4 space-y-2">
          {samples.map(([label, text]) => (
            <li
              key={label}
              className="bg-muted/40 flex items-center justify-between gap-4 rounded-lg px-4 py-2.5"
            >
              <span className="text-muted-foreground w-20 shrink-0 text-xs">{label}</span>
              <span className="flex-1 text-sm" lang="hi">
                {text}
              </span>
              <BadgeCheck className="size-4 shrink-0 text-green-600 dark:text-green-400" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
