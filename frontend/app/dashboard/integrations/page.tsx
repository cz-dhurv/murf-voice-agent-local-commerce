'use client';

import { CheckCircle2, Circle, KeyRound, Plug } from 'lucide-react';
import { Card, PageHeader, StatusPill, type Tone } from '@/components/app/dashboard/kit';

// Real service status for THIS build. `real` splits what actually runs from what
// is planned/available. Security: never add an API key field here — name only.
type IntegrationStatus = 'connected' | 'available' | 'not-configured';
const INTEGRATIONS: {
  name: string;
  role: string;
  status: IntegrationStatus;
  real: boolean;
}[] = [
  {
    name: 'LiveKit Agents',
    role: 'Real-time voice pipeline & session orchestration',
    status: 'connected',
    real: true,
  },
  {
    name: 'Murf Falcon TTS',
    role: 'Streaming text-to-speech (voice: Anisha)',
    status: 'connected',
    real: true,
  },
  { name: 'Deepgram Nova-3', role: 'Multilingual speech-to-text', status: 'connected', real: true },
  { name: 'Google Gemini', role: 'LLM reasoning & responses', status: 'connected', real: true },
  { name: 'Silero VAD', role: 'Voice activity & turn detection', status: 'connected', real: true },
  {
    name: 'Twilio SIP Trunk',
    role: 'Outbound calling — agent dials customers to confirm orders',
    status: 'available',
    real: true,
  },
  {
    name: 'SQLite (node:sqlite)',
    role: 'Caller memory & catalogue store',
    status: 'connected',
    real: true,
  },
  {
    name: 'PostgreSQL',
    role: 'Production caller store (planned migration)',
    status: 'not-configured',
    real: false,
  },
  { name: 'Pinecone', role: 'Vector search for knowledge base', status: 'available', real: false },
  { name: 'LangChain', role: 'Retrieval & tool orchestration', status: 'available', real: false },
];

const STATUS_TONE: Record<IntegrationStatus, Tone> = {
  connected: 'success',
  available: 'info',
  'not-configured': 'neutral',
};

const STATUS_LABEL: Record<IntegrationStatus, string> = {
  connected: 'Connected',
  available: 'Available',
  'not-configured': 'Not configured',
};

// Tools & Integrations. `real` splits what THIS build actually runs from what the
// mockup lists aspirationally. Security: API keys are NEVER rendered here — only
// the service name and its live/planned status. Keys live in backend/.env.local.
export default function IntegrationsPage() {
  const active = INTEGRATIONS.filter((i) => i.real);
  const planned = INTEGRATIONS.filter((i) => !i.real);

  return (
    <div>
      <PageHeader title="Tools & Integrations" sub="Services powering the voice pipeline." />

      <div className="border-primary/20 bg-primary/5 text-foreground/80 mb-6 flex items-start gap-2 rounded-xl border p-4 text-sm">
        <KeyRound className="text-primary mt-0.5 size-4 shrink-0" />
        API keys and secrets are stored server-side in{' '}
        <code className="font-mono text-xs">backend/.env.local</code> and are never shown in this
        dashboard. This page reflects connection status only.
      </div>

      <h2 className="mb-3 flex items-center gap-2 font-semibold">
        <Plug className="text-primary size-4" /> Active in this build
      </h2>
      <div className="mb-8 grid gap-3 sm:grid-cols-2">
        {active.map((i) => (
          <IntegrationCard key={i.name} {...i} />
        ))}
      </div>

      <h2 className="text-muted-foreground mb-3 font-semibold">Planned / available</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {planned.map((i) => (
          <IntegrationCard key={i.name} {...i} />
        ))}
      </div>
    </div>
  );
}

function IntegrationCard({
  name,
  role,
  status,
}: {
  name: string;
  role: string;
  status: IntegrationStatus;
}) {
  const connected = status === 'connected';
  return (
    <Card className="flex items-start gap-3 p-4">
      <span
        className={
          connected
            ? 'flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            : 'bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg'
        }
      >
        {connected ? <CheckCircle2 className="size-5" /> : <Circle className="size-5" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{name}</span>
          <span className="ml-auto">
            <StatusPill tone={STATUS_TONE[status]} pulse={connected}>
              {STATUS_LABEL[status]}
            </StatusPill>
          </span>
        </div>
        <p className="text-muted-foreground mt-1 text-sm leading-6">{role}</p>
      </div>
    </Card>
  );
}
