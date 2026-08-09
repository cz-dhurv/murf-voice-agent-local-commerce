'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BadgeCheck, ChevronRight, Database, Languages, Search, Users } from 'lucide-react';
import { type Caller, cx, fmtWhen, initials, useCallers } from '@/components/app/dashboard/data';
import { EmptyState, LoadingRow, PageHeader } from '@/components/app/dashboard/kit';
import { useLanguage } from '@/components/app/language-provider';
import { Button } from '@/components/ui/button';

type Tr = ReturnType<typeof useLanguage>['tr'];

const PAGE_SIZE = 10;
const INPUT =
  'border-input bg-background focus-visible:ring-ring/50 h-9 w-full rounded-md border px-3 text-sm outline-none focus-visible:ring-2';

function langLabel(pref: string | null, tr: Tr): string | null {
  if (pref === 'en') return tr.memLangEn;
  if (pref === 'hi') return tr.memLangHi;
  return pref || null;
}

// Caller Profiles — REAL data from the SQLite caller-memory store via useCallers().
export default function CallersPage() {
  const { tr } = useLanguage();
  const router = useRouter();
  const { callers, loading, error } = useCallers();

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
    return callers.filter((c: Caller) => {
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
      <PageHeader title={tr.cpTitle} sub={tr.cpSub} />

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
        <LoadingRow label={tr.memLoading} />
      ) : error ? (
        <EmptyState
          icon={Database}
          title="Caller store unreachable"
          sub="The /api/callers endpoint did not respond. The dashboard does not fabricate data — start the app with the backend running to see real callers."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={callers.length === 0 ? tr.memEmptyTitle : tr.cpNoResults}
          sub={callers.length === 0 ? tr.memEmptySub : undefined}
        />
      ) : (
        <>
          <div className="grid gap-3 lg:grid-cols-2">
            {shown.map((c) => (
              <button
                key={c.user_id}
                type="button"
                onClick={() => router.push(`/dashboard/callers/${encodeURIComponent(c.user_id)}`)}
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
