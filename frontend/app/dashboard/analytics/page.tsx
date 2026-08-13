'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  CircleCheck,
  Clock3,
  LifeBuoy,
  ShoppingCart,
  TriangleAlert,
} from 'lucide-react';
import {
  Card,
  CardTitle,
  EmptyState,
  PageHeader,
  StatCard,
  StatusPill,
} from '@/components/app/dashboard/kit';

type Stats = {
  total: number;
  successful: number;
  failed: number;
  success_rate: number;
  orders_placed: number;
  escalations_filed: number;
  average_duration_sec: number;
  calls_per_day: { date: string; total: number; successful: number; failed: number }[];
  channel_breakdown: { channel: string; total: number; successful: number; failed: number }[];
  recent_calls: {
    started_at: string;
    duration_sec: number | null;
    channel: string;
    outcome: string | null;
  }[];
};
const EMPTY: Stats = {
  total: 0,
  successful: 0,
  failed: 0,
  success_rate: 0,
  orders_placed: 0,
  escalations_filed: 0,
  average_duration_sec: 0,
  calls_per_day: [],
  channel_breakdown: [],
  recent_calls: [],
};
const fmtDuration = (s: number | null) =>
  s == null ? '—' : `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;

export default function AnalyticsPage() {
  const [stats, setStats] = useState(EMPTY),
    [loading, setLoading] = useState(true),
    [channel, setChannel] = useState('all'),
    [language, setLanguage] = useState(''),
    [from, setFrom] = useState(''),
    [to, setTo] = useState('');
  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (from) p.set('from', from);
    if (to) p.set('to', to);
    if (channel !== 'all') p.set('channel', channel);
    if (language) p.set('language', language);
    return p.toString();
  }, [from, to, channel, language]);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch(`/api/call-stats${query ? `?${query}` : ''}`, {
          cache: 'no-store',
        });
        const data = await res.json();
        if (alive) setStats({ ...EMPTY, ...data });
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    const id = window.setInterval(load, 7000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [query]);
  const maxDay = Math.max(1, ...stats.calls_per_day.map((d) => d.total));
  return (
    <div>
      <PageHeader
        title="Call Analytics"
        sub="A call succeeds when a real product is found, an order is placed, or a human handoff is filed. No transcript, phone number, caller identity, or sensitive facts are exposed."
        actions={
          <StatusPill tone="success" pulse>
            Live · 7s refresh
          </StatusPill>
        }
      />
      <div className="bg-card mb-5 flex flex-wrap items-end gap-2 rounded-xl border p-3">
        <label className="text-muted-foreground text-xs">
          From
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="border-input bg-background mt-1 block h-9 rounded-md border px-2 text-sm"
          />
        </label>
        <label className="text-muted-foreground text-xs">
          To
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="border-input bg-background mt-1 block h-9 rounded-md border px-2 text-sm"
          />
        </label>
        <label className="text-muted-foreground text-xs">
          Channel
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            className="border-input bg-background mt-1 block h-9 rounded-md border px-2 text-sm"
          >
            <option value="all">All</option>
            <option value="browser">Browser</option>
            <option value="sip_outbound">Outbound SIP</option>
          </select>
        </label>
        <label className="text-muted-foreground text-xs">
          Language
          <input
            value={language}
            onChange={(e) => setLanguage(e.target.value.replace(/[^a-zA-Z-]/g, '').slice(0, 12))}
            placeholder="hi / en"
            className="border-input bg-background mt-1 block h-9 w-24 rounded-md border px-2 text-sm"
          />
        </label>
      </div>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={Activity}
          label="Total calls"
          value={loading ? '—' : stats.total}
          hint="all recorded calls"
        />
        <StatCard
          icon={CircleCheck}
          tone="success"
          label="Successful"
          value={loading ? '—' : stats.successful}
          hint={`${stats.success_rate}% success rate`}
        />
        <StatCard
          icon={TriangleAlert}
          tone="danger"
          label="Failed"
          value={loading ? '—' : stats.failed}
          hint="no qualifying outcome"
        />
        <StatCard
          icon={Clock3}
          tone="info"
          label="Avg duration"
          value={loading ? '—' : fmtDuration(stats.average_duration_sec)}
          hint="finished calls"
        />
      </div>
      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle icon={BarChart3}>Calls per day</CardTitle>
          {stats.calls_per_day.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="No calls recorded yet"
              sub="Make a real browser or SIP call and this chart will update automatically."
            />
          ) : (
            <div className="mt-5 flex h-44 items-end gap-2">
              {stats.calls_per_day.map((d) => (
                <div key={d.date} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                  <span className="text-xs font-semibold">{d.total}</span>
                  <div
                    className="bg-primary/70 w-full rounded-t"
                    style={{ height: `${Math.max(8, (d.total / maxDay) * 120)}px` }}
                    title={`${d.date}: ${d.total} calls`}
                  />
                  <span className="text-muted-foreground truncate text-[10px]">
                    {d.date.slice(5)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card>
          <CardTitle icon={Activity}>Channel & outcome</CardTitle>
          <div className="mt-5 space-y-4">
            {stats.channel_breakdown.length === 0 ? (
              <EmptyState icon={Activity} title="No channel data" />
            ) : (
              stats.channel_breakdown.map((b) => (
                <div key={b.channel}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{b.channel === 'sip_outbound' ? 'Outbound SIP' : 'Browser'}</span>
                    <span className="font-semibold">{b.total}</span>
                  </div>
                  <div className="bg-muted flex h-3 overflow-hidden rounded-full">
                    <span
                      className="bg-emerald-500"
                      style={{ width: `${(b.successful / b.total) * 100}%` }}
                    />
                    <span
                      className="bg-red-400"
                      style={{ width: `${(b.failed / b.total) * 100}%` }}
                    />
                  </div>
                  <div className="text-muted-foreground mt-1 text-xs">
                    {b.successful} successful · {b.failed} failed
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
      <div className="mb-6 grid grid-cols-2 gap-3">
        <StatCard
          icon={ShoppingCart}
          tone="success"
          label="Orders placed"
          value={stats.orders_placed}
          hint="track-specific outcome"
        />
        <StatCard
          icon={LifeBuoy}
          tone="info"
          label="Escalations filed"
          value={stats.escalations_filed}
          hint="completed enquiries"
        />
      </div>
      <Card>
        <CardTitle icon={Activity}>Recent calls</CardTitle>
        {stats.recent_calls.length === 0 ? (
          <EmptyState icon={Activity} title="No call history" />
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-muted-foreground border-b text-xs">
                <tr>
                  <th className="px-2 py-2">Time</th>
                  <th className="px-2 py-2">Duration</th>
                  <th className="px-2 py-2">Channel</th>
                  <th className="px-2 py-2">Outcome</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent_calls.map((c, i) => (
                  <tr key={`${c.started_at}-${i}`} className="border-b last:border-0">
                    <td className="px-2 py-2">{new Date(c.started_at).toLocaleString()}</td>
                    <td className="px-2 py-2">{fmtDuration(c.duration_sec)}</td>
                    <td className="px-2 py-2">
                      {c.channel === 'sip_outbound' ? 'Outbound SIP' : 'Browser'}
                    </td>
                    <td className="px-2 py-2">
                      <StatusPill
                        tone={
                          c.outcome === 'success'
                            ? 'success'
                            : c.outcome === 'failed'
                              ? 'danger'
                              : 'neutral'
                        }
                      >
                        {c.outcome ?? 'In progress'}
                      </StatusPill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
