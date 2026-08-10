'use client';

import {
  Bot,
  Boxes,
  BrainCircuit,
  Ear,
  Languages,
  MessageSquare,
  Mic,
  ReceiptText,
  ShieldCheck,
  Volume2,
} from 'lucide-react';
import { Card, CardTitle, MetaRow, PageHeader, StatusPill } from '@/components/app/dashboard/kit';

// This agent's real pipeline — the actual components backend/src/agent.py runs.
// Not demo: these are the real STT/LLM/TTS/VAD choices baked into the worker.
const PIPELINE: { icon: React.ElementType; label: string; value: string }[] = [
  { icon: Ear, label: 'Speech-to-text', value: 'Deepgram Nova-3 (language=multi)' },
  { icon: MessageSquare, label: 'LLM', value: 'Google Gemini' },
  { icon: Volume2, label: 'Text-to-speech', value: 'Murf Falcon · voice Anisha' },
  { icon: Mic, label: 'Turn detection', value: 'Silero VAD' },
  { icon: Languages, label: 'Languages', value: 'Auto-detected, native script' },
];

// The agent's real function tools (backend/src/memory.py) — what it can actually do.
const CAPABILITIES: { icon: React.ElementType; label: string; detail: string }[] = [
  {
    icon: BrainCircuit,
    label: 'Remembers callers',
    detail: 'Recalls name, language & saved facts between calls',
  },
  {
    icon: Boxes,
    label: 'Catalogue & stock lookup',
    detail: 'Prices and live stock for every listed item',
  },
  {
    icon: ReceiptText,
    label: 'Computes order totals',
    detail: 'Line items at shop price, flags out-of-stock',
  },
  {
    icon: ShieldCheck,
    label: 'Forgets on request',
    detail: 'GDPR-style erasure of a caller’s memory',
  },
];

export default function AgentsPage() {
  return (
    <div>
      <PageHeader
        title="Agent"
        sub="The voice pipeline and capabilities of the DukaanSaathi shopkeeper assistant."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle
            icon={Bot}
            right={
              <StatusPill tone="success" pulse>
                Live pipeline
              </StatusPill>
            }
          >
            Voice pipeline
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

        <Card>
          <CardTitle icon={BrainCircuit}>What it can do</CardTitle>
          <ul className="space-y-3">
            {CAPABILITIES.map(({ icon: Icon, label, detail }) => (
              <li key={label} className="flex items-start gap-3">
                <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                  <Icon className="size-4" />
                </span>
                <div>
                  <div className="text-sm font-medium">{label}</div>
                  <div className="text-muted-foreground text-xs">{detail}</div>
                </div>
              </li>
            ))}
          </ul>
          <p className="text-muted-foreground mt-4 text-xs leading-5">
            Each capability is a real function tool wired to the SQLite store. See{' '}
            <span className="font-medium">Tools &amp; Integrations</span> for the full list.
          </p>
        </Card>
      </div>
    </div>
  );
}
