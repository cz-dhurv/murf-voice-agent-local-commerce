'use client';

import Link from 'next/link';
import { PhoneOff, Radio } from 'lucide-react';
import { useSessionContext, useVoiceAssistant } from '@livekit/components-react';
import { DEMO_LIVE_CALLS } from '@/components/app/dashboard/demo';
import { Card, DemoBadge, PageHeader, StatusPill, type Tone } from '@/components/app/dashboard/kit';
import { Button } from '@/components/ui/button';

const STATE_TONE: Record<string, Tone> = {
  connected: 'success',
  ringing: 'info',
  'on-hold': 'brand',
};

// Live Calls — the ONE genuinely live row is this browser's own session (top card);
// the fleet list below is demo data (a single-agent local build has no real fleet).
export default function LivePage() {
  const { isConnected, end } = useSessionContext();
  const { state } = useVoiceAssistant();

  return (
    <div>
      <PageHeader title="Live Calls" sub="Active voice sessions across the agent fleet." />

      <Card className="mb-6">
        <div className="flex items-center gap-2">
          <Radio className="text-primary size-5" />
          <span className="font-semibold">This session</span>
          <span className="ml-auto">
            <StatusPill tone={isConnected ? 'success' : 'neutral'} pulse={isConnected}>
              {isConnected ? state : 'idle'}
            </StatusPill>
          </span>
        </div>
        {isConnected ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-muted-foreground text-sm">
              Your browser is connected to the agent. Manage the call from the widget on the home
              screen, or end it here.
            </p>
            <Button size="sm" variant="destructive" onClick={() => end()} className="gap-1.5">
              <PhoneOff className="size-4" /> End Call
            </Button>
          </div>
        ) : (
          <p className="text-muted-foreground mt-4 text-sm">
            No active call.{' '}
            <Link href="/dashboard" className="text-primary font-medium">
              Start one from the Control Center →
            </Link>
          </p>
        )}
      </Card>

      <div className="mb-3 flex items-center gap-2">
        <h2 className="font-semibold">Fleet</h2>
        <DemoBadge />
      </div>
      <div className="grid gap-3">
        {DEMO_LIVE_CALLS.map((c) => (
          <Card key={c.id} className="flex flex-wrap items-center gap-4 p-4">
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{c.name}</div>
              <div className="text-muted-foreground text-xs">
                {c.phone} · {c.track} · <span lang="hi">{c.lang}</span>
              </div>
            </div>
            <span className="text-muted-foreground text-sm tabular-nums">{c.dur}</span>
            <StatusPill tone={STATE_TONE[c.state] ?? 'neutral'} pulse={c.state === 'connected'}>
              {c.state}
            </StatusPill>
          </Card>
        ))}
      </div>
    </div>
  );
}
