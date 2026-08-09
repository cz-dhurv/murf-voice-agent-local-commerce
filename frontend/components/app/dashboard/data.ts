'use client';

import { useCallback, useEffect, useState } from 'react';

// Shapes returned by /api/callers — the ONLY real backend behind this dashboard
// (a SQLite file the Python agent writes; see app/api/callers/route.ts).
export type Caller = {
  user_id: string;
  name: string | null;
  language_preference: string | null;
  facts: Record<string, string>;
  last_interaction: string | null;
};

export type DbStatus = {
  engine: string;
  connected: boolean;
  sizeBytes: number;
  records: number;
  driver: string;
};

type CallersState = {
  callers: Caller[];
  db: DbStatus | null;
  loading: boolean;
  error: boolean;
  reload: () => Promise<void>;
  patch: (id: string, body: PatchBody) => Promise<boolean>;
  remove: (id: string) => Promise<boolean>;
};

type PatchBody = {
  name: string | null;
  language_preference: string | null;
  facts: Record<string, string>;
};

/**
 * Single source of truth for the real caller-memory data. Every page that shows
 * callers/DB status calls this — no fabricated fallbacks: an unreachable API is
 * surfaced as `error`, not faked as success.
 */
export function useCallers(): CallersState {
  const [data, setData] = useState<{ callers: Caller[]; db: DbStatus | null } | null>(null);
  const [error, setError] = useState(false);

  const reload = useCallback(async () => {
    try {
      const res = await fetch('/api/callers', { cache: 'no-store' });
      const j = await res.json();
      setData({ callers: Array.isArray(j.callers) ? j.callers : [], db: j.db ?? null });
      setError(false);
    } catch {
      setData({ callers: [], db: null });
      setError(true);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const patch = useCallback(
    async (id: string, body: PatchBody) => {
      const res = await fetch(`/api/callers?id=${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const ok = res.ok && (await res.json())?.updated === true;
      await reload();
      return ok;
    },
    [reload]
  );

  const remove = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/callers?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const ok = res.ok && (await res.json())?.deleted === true;
      await reload();
      return ok;
    },
    [reload]
  );

  return {
    callers: data?.callers ?? [],
    db: data?.db ?? null,
    loading: data === null,
    error,
    reload,
    patch,
    remove,
  };
}

// ---------------- formatters (shared by every dashboard surface) ----------------

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

/** sqlite datetime('now') is a UTC "YYYY-MM-DD HH:MM:SS" string. */
export function fmtWhen(s: string | null, fallback: string): string {
  if (!s) return fallback;
  const d = new Date(s.replace(' ', 'T') + 'Z');
  return isNaN(d.getTime()) ? s : d.toLocaleString();
}

/** Relative "3h ago" for compact timelines; falls back to absolute for old rows. */
export function fmtAgo(s: string | null, never: string): string {
  if (!s) return never;
  const d = new Date(s.replace(' ', 'T') + 'Z');
  if (isNaN(d.getTime())) return s;
  const diff = Date.now() - d.getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d ago`;
  return d.toLocaleDateString();
}

export function fmtBytes(n: number): string {
  if (!n) return '0 KB';
  const kb = n / 1024;
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

export function initials(name: string | null): string {
  if (!name) return '?';
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('') || '?'
  );
}

/** Chrome-facing language label (English UI). Ported bilingual pages use tr instead. */
export function langName(pref: string | null): string | null {
  if (pref === 'en') return 'English';
  if (pref === 'hi') return 'हिन्दी (Hindi)';
  return pref || null;
}
