'use client';

import Link from 'next/link';
import { ArrowLeft, BadgeCheck, ShieldCheck } from 'lucide-react';
import { Card, PageHeader } from '@/components/app/dashboard/kit';
import { useLanguage } from '@/components/app/language-provider';

// Consent policy — the REAL behaviour of the agent's memory: it asks before saving,
// and never stores secrets. Ported from the old dashboard Consent view.
export default function ConsentPage() {
  const { tr } = useLanguage();

  return (
    <div>
      <Link
        href="/dashboard/settings"
        className="text-muted-foreground hover:text-foreground mb-5 inline-flex items-center gap-1.5 text-sm font-medium"
      >
        <ArrowLeft className="size-4" /> {tr.dashName}
      </Link>

      <PageHeader title={tr.coTitle} sub={tr.coSub} />

      <Card>
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
      </Card>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Card>
          <BadgeCheck className="text-primary size-5" />
          <div className="mt-3 font-semibold">{tr.coNeverTitle}</div>
          <p className="text-muted-foreground mt-1 text-sm leading-6">{tr.coNeverBody}</p>
        </Card>
        <Card>
          <ShieldCheck className="text-primary size-5" />
          <div className="mt-3 font-semibold">{tr.memConsentTitle}</div>
          <p className="text-muted-foreground mt-1 text-sm leading-6">{tr.coRefuse}</p>
        </Card>
      </div>
    </div>
  );
}
