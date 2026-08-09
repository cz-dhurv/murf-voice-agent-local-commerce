'use client';

import { useMemo } from 'react';
import { useSession } from '@livekit/components-react';
import { WarningIcon } from '@phosphor-icons/react/dist/ssr';
import type { AppConfig } from '@/app-config';
import { AgentSessionProvider } from '@/components/agents-ui/agent-session-provider';
import { StartAudioButton } from '@/components/agents-ui/start-audio-button';
import { LanguageProvider } from '@/components/app/language-provider';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { getCallerTokenSource, getSandboxTokenSource } from '@/lib/utils';
import { Shell } from './shell';

// Client root for the whole /dashboard segment. Mirrors components/app/app.tsx so
// the dashboard gets the SAME real LiveKit voice session — the header's live-call
// banner and the control-center voice widget both read it from this one provider.
export function DashboardApp({
  appConfig,
  children,
}: {
  appConfig: AppConfig;
  children: React.ReactNode;
}) {
  const tokenSource = useMemo(() => {
    return typeof process.env.NEXT_PUBLIC_CONN_DETAILS_ENDPOINT === 'string'
      ? getSandboxTokenSource(appConfig)
      : getCallerTokenSource(appConfig);
  }, [appConfig]);

  const session = useSession(
    tokenSource,
    appConfig.agentName ? { agentName: appConfig.agentName } : undefined
  );

  return (
    <AgentSessionProvider session={session}>
      <LanguageProvider defaultLanguage={appConfig.defaultLanguage}>
        <TooltipProvider delayDuration={200}>
          <Shell>{children}</Shell>
          <StartAudioButton label="Start Audio" />
          <Toaster
            icons={{ warning: <WarningIcon weight="bold" /> }}
            position="top-center"
            className="toaster group"
            style={
              {
                '--normal-bg': 'var(--popover)',
                '--normal-text': 'var(--popover-foreground)',
                '--normal-border': 'var(--border)',
              } as React.CSSProperties
            }
          />
        </TooltipProvider>
      </LanguageProvider>
    </AgentSessionProvider>
  );
}
