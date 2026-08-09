'use client';

import Link from 'next/link';
import { ArrowLeft, Info, Wrench } from 'lucide-react';
import { PageHeader } from '@/components/app/dashboard/kit';
import { useLanguage } from '@/components/app/language-provider';

// Agent function tools — the REAL tool surface the Python agent exposes to the LLM.
export default function MemoryToolsPage() {
  const { tr } = useLanguage();

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
      name: 'place_order',
      desc: tr.memTool4Desc,
      input: 'items, delivery_slot, contact',
      output: 'confirmation',
    },
    {
      name: 'lookup_product',
      desc: tr.memTool5Desc,
      input: 'item_name, quantity',
      output: 'unit_price, in_stock, line_total',
    },
    {
      name: 'compute_order_total',
      desc: tr.memTool6Desc,
      input: 'order_json',
      output: 'line_items, total, issues',
    },
    { name: 'forget_caller', desc: tr.memTool3Desc, input: 'user_id', output: 'confirmation' },
  ];

  return (
    <div>
      <Link
        href="/dashboard/memory"
        className="text-muted-foreground hover:text-foreground mb-5 inline-flex items-center gap-1.5 text-sm font-medium"
      >
        <ArrowLeft className="size-4" /> {tr.mdTitle}
      </Link>

      <PageHeader title={tr.mtTitle} sub={tr.mtSub} />

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
