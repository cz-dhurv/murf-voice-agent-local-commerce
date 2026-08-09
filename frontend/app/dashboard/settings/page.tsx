'use client';

import Link from 'next/link';
import { ArrowRight, Github, Moon, Palette, ShieldCheck } from 'lucide-react';
import { Card, CardTitle, MetaRow, PageHeader } from '@/components/app/dashboard/kit';
import { useLanguage } from '@/components/app/language-provider';
import { LanguageToggle } from '@/components/app/language-toggle';
import { ThemeToggle } from '@/components/app/theme-toggle';

const REPO_URL = 'https://github.com/cz-dhurv/murf-voice-agent-local-commerce';

// Settings — the REAL, working preference controls (theme + UI language) plus a
// link to consent policy. Both toggles persist (next-themes / localStorage).
export default function SettingsPage() {
  const { tr } = useLanguage();

  return (
    <div>
      <PageHeader title="Settings" sub="Appearance, language, and privacy." />

      <div className="grid gap-4">
        <Card>
          <CardTitle icon={Palette}>Appearance</CardTitle>
          <div className="space-y-1 divide-y">
            <MetaRow label="Theme">
              <ThemeToggle className="w-auto" />
            </MetaRow>
            <MetaRow label={tr.language}>
              <LanguageToggle />
            </MetaRow>
          </div>
          <p className="text-muted-foreground mt-3 flex items-center gap-1.5 text-xs">
            <Moon className="size-3.5" /> Preferences are saved on this device.
          </p>
        </Card>

        <Link href="/dashboard/settings/consent" className="block">
          <Card className="hover:border-primary/40 flex items-center gap-3 transition-colors">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{tr.coTitle}</div>
              <p className="text-muted-foreground text-sm">{tr.coSub}</p>
            </div>
            <ArrowRight className="text-muted-foreground size-4 shrink-0" />
          </Card>
        </Link>

        <Card>
          <CardTitle icon={Github}>About</CardTitle>
          <dl className="divide-y">
            <MetaRow label="Project">Voice for Bharat · DukaanSaathi</MetaRow>
            <MetaRow label="Build">Murf Falcon challenge</MetaRow>
            <MetaRow label="Repository">
              <a
                href={REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary font-medium"
              >
                GitHub →
              </a>
            </MetaRow>
          </dl>
        </Card>
      </div>
    </div>
  );
}
