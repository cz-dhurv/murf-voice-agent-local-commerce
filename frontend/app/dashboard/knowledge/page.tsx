'use client';

import { useState } from 'react';
import { BookOpen, FileStack } from 'lucide-react';
import { cx } from '@/components/app/dashboard/data';
import { DEMO_KB } from '@/components/app/dashboard/demo';
import {
  Card,
  DemoBadge,
  EmptyState,
  PageHeader,
  StatusPill,
} from '@/components/app/dashboard/kit';

const INPUT =
  'border-input bg-background focus-visible:ring-ring/50 h-9 w-full rounded-md border px-3 text-sm outline-none focus-visible:ring-2';

// Knowledge Base — demo data (RAG store not wired in this local build; the agent
// answers from the LLM + shop catalogue today, per the Integrations page).
export default function KnowledgePage() {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const rows = DEMO_KB.filter(
    (k) => !q || k.title.toLowerCase().includes(q) || k.track.toLowerCase().includes(q)
  );

  return (
    <div>
      <PageHeader
        title="Knowledge Base"
        sub="Reference documents the agent can draw on."
        actions={<DemoBadge />}
      />

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search documents…"
        className={cx(INPUT, 'mb-5 max-w-md')}
      />

      {rows.length === 0 ? (
        <EmptyState icon={BookOpen} title="No documents match" sub="Try a different search." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map((k) => (
            <Card key={k.id} className="flex items-start gap-3 p-4">
              <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
                <FileStack className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{k.title}</div>
                <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-xs">
                  <StatusPill tone="info">{k.track}</StatusPill>
                  <span>{k.chunks} chunks</span>
                  <span>· updated {k.updated}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
