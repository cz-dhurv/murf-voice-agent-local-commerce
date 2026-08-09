'use client';

import { Bot, Ear, Languages, MessageSquare, Mic, Volume2 } from 'lucide-react';
import { DEMO_AGENTS } from '@/components/app/dashboard/demo';
import {
  Card,
  CardTitle,
  DemoBadge,
  MetaRow,
  PageHeader,
  StatusPill,
  type Tone,
} from '@/components/app/dashboard/kit';

// This agent's real pipeline — the actual components backend/src/agent.py runs.
// Not demo: these are the real STT/LLM/TTS/VAD choices baked into the worker.
const PIPELINE: { icon: React.ElementType; label: string; value: string }[] = [
  { icon: Ear, label: 'Speech-to-text', value: 'Deepgram Nova-3 (language=multi)' },
  { icon: MessageSquare, label: 'LLM', value: 'Google Gemini' },
  { icon: Volume2, label: 'Text-to-speech', value: 'Murf Falcon · voice Anisha' },
  { icon: Mic, label: 'Turn detection', value: 'Silero VAD' },
  { icon: Languages, label: 'Languages', value: 'Auto-detected, native script' },
];

const STATUS_TONE: Record<string, Tone> = {
  online: 'success',
  draft: 'neutral',
};

export default function AgentsPage() {
  return (
    <div>
      <PageHeader title="Agent Settings" sub="Voice pipeline configuration and the agent fleet." />

      <Card className="mb-6">
        <CardTitle
          icon={Bot}
          right={
            <StatusPill tone="success" pulse>
              Live pipeline
            </StatusPill>
          }
        >
          This agent · DukaanSaathi
        </CardTitle>
        <dl className="divide-y">
          {PIPELINE.map(({ icon: Icon, label, value }) => (
            <MetaRow key={label} label={label}>
              <span className="inline-flex items-center gap-1.5">
                <Icon className="text-primary size-4" /> {value}
              </span>
            </MetaRow>
          ))}
        </dl>
        <p className="text-muted-foreground mt-4 text-xs leading-5">
          These are the real components the Python worker runs (backend/src/agent.py). Model and
          voice are set in the backend configuration, not editable from this screen.
        </p>
      </Card>

      <div className="mb-3 flex items-center gap-2">
        <h2 className="font-semibold">Fleet</h2>
        <DemoBadge />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {DEMO_AGENTS.map((a) => (
          <Card key={a.id} className="p-4">
            <div className="flex items-center gap-2">
              <span className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg">
                <Bot className="size-4" />
              </span>
              <StatusPill tone={STATUS_TONE[a.status] ?? 'neutral'} pulse={a.status === 'online'}>
                {a.status}
              </StatusPill>
            </div>
            <div className="mt-3 font-semibold">{a.name}</div>
            <div className="text-muted-foreground mt-1 text-xs">
              {a.track} · {a.voice}
            </div>
            <div className="text-muted-foreground mt-3 text-xs tabular-nums">
              {a.calls.toLocaleString()} calls handled
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
