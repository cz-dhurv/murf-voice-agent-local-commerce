'use client';

import { useState } from 'react';
import { PhoneCall } from 'lucide-react';
import { cx } from '@/components/app/dashboard/data';
import { DEMO_HISTORY } from '@/components/app/dashboard/demo';
import {
  DemoBadge,
  EmptyState,
  PageHeader,
  StatusPill,
  type Tone,
} from '@/components/app/dashboard/kit';

const OUTCOME_TONE: Record<string, Tone> = {
  'order-placed': 'success',
  info: 'info',
  missed: 'danger',
};

const INPUT =
  'border-input bg-background focus-visible:ring-ring/50 h-9 w-full rounded-md border px-3 text-sm outline-none focus-visible:ring-2';

// Call History — demo data (no historical call log is persisted in this local build yet).
export default function HistoryPage() {
  const [query, setQuery] = useState('');
  const [outcome, setOutcome] = useState<'all' | 'order-placed' | 'info' | 'missed'>('all');

  const q = query.trim().toLowerCase();
  const rows = DEMO_HISTORY.filter((h) => {
    if (outcome !== 'all' && h.outcome !== outcome) return false;
    if (!q) return true;
    return h.name.toLowerCase().includes(q) || h.phone.toLowerCase().includes(q);
  });

  return (
    <div>
      <PageHeader
        title="Call History"
        sub="Past conversations, outcomes, and durations."
        actions={<DemoBadge />}
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or phone…"
          className={cx(INPUT, 'flex-1')}
        />
        <select
          value={outcome}
          onChange={(e) => setOutcome(e.target.value as typeof outcome)}
          className={cx(INPUT, 'sm:w-48')}
          aria-label="Filter by outcome"
        >
          <option value="all">All outcomes</option>
          <option value="order-placed">Order placed</option>
          <option value="info">Info</option>
          <option value="missed">Missed</option>
        </select>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={PhoneCall}
          title="No calls match"
          sub="Try a different search or filter."
        />
      ) : (
        <div className="bg-card overflow-hidden rounded-2xl border">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-muted-foreground text-left text-xs">
                <tr>
                  <th className="px-4 py-3 font-medium">Caller</th>
                  <th className="px-4 py-3 font-medium">When</th>
                  <th className="px-4 py-3 font-medium">Duration</th>
                  <th className="px-4 py-3 font-medium">Track</th>
                  <th className="px-4 py-3 font-medium">Language</th>
                  <th className="px-4 py-3 font-medium">Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((h) => (
                  <tr key={h.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="font-medium">{h.name}</div>
                      <div className="text-muted-foreground text-xs">{h.phone}</div>
                    </td>
                    <td className="text-muted-foreground px-4 py-3 whitespace-nowrap">{h.when}</td>
                    <td className="px-4 py-3 tabular-nums">{h.dur}</td>
                    <td className="px-4 py-3">{h.track}</td>
                    <td className="px-4 py-3" lang="hi">
                      {h.lang}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill tone={OUTCOME_TONE[h.outcome] ?? 'neutral'}>
                        {h.outcome}
                      </StatusPill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
