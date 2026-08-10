'use client';

import Link from 'next/link';
import { Info, PhoneOff, Radio } from 'lucide-react';
import { useSessionContext, useVoiceAssistant } from '@livekit/components-react';
import { Card, PageHeader, StatusPill, type Tone } from '@/components/app/dashboard/kit';
import { Button } from '@/components/ui/button';

// Maps the LiveKit voice-assistant state to a semantic tone.
const STATE_TONE: Record<string, Tone> = {
  listening: 'success',
  thinking: 'info',
  speaking: 'brand',
  connecting: 'info',
  initializing: 'neutral',
};

// Live Session — this browser's OWN voice session is the only real live call in a
// single-agent local build. No fabricated fleet; the state below is the real one.
export default function LivePage() {
  const { isConnected, end } = useSessionContext();
  const { state } = useVoiceAssistant();

  return (
    <div>
      <PageHeader
        title="Live Session"
        sub="The active voice session running in this browser, straight from the LiveKit pipeline."
      />

      <Card className="mb-4">
        <div className="flex items-center gap-2">
          <Radio className="text-primary size-5" />
          <span className="font-semibold">This session</span>
          <span className="ml-auto">
            <StatusPill
              tone={isConnected ? (STATE_TONE[state] ?? 'success') : 'neutral'}
              pulse={isConnected}
            >
              {isConnected ? state : 'idle'}
            </StatusPill>
          </span>
        </div>
        {isConnected ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-muted-foreground text-sm">
              Your browser is connected to the agent. Manage the call from the widget on the Control
              Center, or end it here.
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

      <Card className="text-muted-foreground flex items-start gap-3 text-sm">
        <Info className="mt-0.5 size-4 shrink-0 text-blue-500" />
        <p>
          This is a single-agent local build — one shopkeeper assistant per browser session, not a
          call-center fleet. There is no fabricated “other agents” list: what you see above is the
          only real session. The live transcript streams inside the voice widget on the Control
          Center while a call is connected.
        </p>
      </Card>
    </div>
  );
}
