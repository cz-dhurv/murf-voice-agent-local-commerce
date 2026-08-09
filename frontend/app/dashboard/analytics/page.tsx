'use client';

import { BarChart3, TrendingDown, TrendingUp } from 'lucide-react';
import { cx } from '@/components/app/dashboard/data';
import { DEMO_ANALYTICS } from '@/components/app/dashboard/demo';
import { Card, CardTitle, DemoBadge, PageHeader } from '@/components/app/dashboard/kit';

// Analytics — all figures are demo data (no metrics warehouse in this local build).
export default function AnalyticsPage() {
  const { kpis, volume, languages, tracks } = DEMO_ANALYTICS;
  const peak = Math.max(...volume);

  return (
    <div>
      <PageHeader
        title="Analytics"
        sub="Call volume, outcomes, and language mix."
        actions={<DemoBadge />}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="p-4 sm:p-5">
            <div className="text-muted-foreground text-xs font-medium">{k.label}</div>
            <div className="mt-2 text-2xl font-bold tabular-nums">{k.value}</div>
            <div
              className={cx(
                'mt-1 inline-flex items-center gap-1 text-xs font-medium',
                k.up ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
              )}
            >
              {k.up ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
              {k.delta}
            </div>
          </Card>
        ))}
      </div>

      <Card className="mb-6">
        <CardTitle icon={BarChart3}>Call volume · last 14 days</CardTitle>
        <div className="flex h-40 items-end gap-1.5 sm:gap-2">
          {volume.map((v, i) => (
            <div key={i} className="group flex flex-1 flex-col items-center gap-1.5">
              <span className="text-muted-foreground text-[10px] opacity-0 transition-opacity group-hover:opacity-100">
                {v}
              </span>
              <div
                className="bg-primary/80 hover:bg-primary w-full rounded-t transition-colors"
                style={{ height: `${Math.round((v / peak) * 100)}%` }}
                title={`Day ${i + 1}: ${v} calls`}
              />
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardTitle>Languages</CardTitle>
          <BarList items={languages} />
        </Card>
        <Card>
          <CardTitle>Tracks</CardTitle>
          <BarList items={tracks} />
        </Card>
      </div>
    </div>
  );
}

// Horizontal proportion bars — no chart lib for five rows.
function BarList({ items }: { items: { label: string; pct: number }[] }) {
  return (
    <ul className="space-y-3">
      {items.map((it) => (
        <li key={it.label}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span>{it.label}</span>
            <span className="text-muted-foreground tabular-nums">{it.pct}%</span>
          </div>
          <div className="bg-muted h-2 overflow-hidden rounded-full">
            <div className="bg-primary h-full rounded-full" style={{ width: `${it.pct}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
