'use client';

import { BadgeCheck, Globe, Languages } from 'lucide-react';
import { Card, PageHeader } from '@/components/app/dashboard/kit';
import { useLanguage } from '@/components/app/language-provider';

// Native-script capability samples — same regardless of UI language.
const SAMPLES: [string, string][] = [
  ['हिंदी', 'नमस्ते, आप कैसे हैं?'],
  ['मराठी', 'नमस्कार, तुम्ही कसे आहात?'],
  ['ગુજરાતી', 'નમસ્તે, તમે કેમ છો?'],
  ['தமிழ்', 'வணக்கம், எப்படி இருக்கிறீர்கள்?'],
  ['বাংলা', 'নমস্কার, আপনি কেমন আছেন?'],
];

export default function MultilingualPage() {
  const { tr } = useLanguage();
  return (
    <div>
      <PageHeader title={tr.mlTitle} sub={tr.mlSub} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-6">
          <Globe className="text-primary size-5" />
          <div className="mt-3 font-semibold">{tr.mlDetectTitle}</div>
          <p className="text-muted-foreground mt-1 text-sm leading-6">{tr.mlDetectBody}</p>
        </Card>
        <Card className="p-6">
          <Languages className="text-primary size-5" />
          <div className="mt-3 font-semibold">{tr.mlScriptTitle}</div>
          <p className="text-muted-foreground mt-1 text-sm leading-6">{tr.mlScriptBody}</p>
        </Card>
      </div>

      <Card className="mt-4 p-6">
        <div className="font-semibold">{tr.mlExamplesTitle}</div>
        <ul className="mt-4 space-y-2">
          {SAMPLES.map(([label, text]) => (
            <li
              key={label}
              className="bg-muted/40 flex items-center justify-between gap-4 rounded-lg px-4 py-2.5"
            >
              <span className="text-muted-foreground w-20 shrink-0 text-xs">{label}</span>
              <span className="flex-1 text-sm" lang="hi">
                {text}
              </span>
              <BadgeCheck className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
