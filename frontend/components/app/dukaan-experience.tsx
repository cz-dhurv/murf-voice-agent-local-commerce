'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Track } from 'livekit-client';
import {
  Ear,
  Loader2,
  MessagesSquare,
  Mic,
  MicOff,
  PhoneOff,
  RefreshCw,
  Store,
  TriangleAlert,
  Volume2,
} from 'lucide-react';
import {
  useSessionContext,
  useSessionMessages,
  useTrackToggle,
  useVoiceAssistant,
} from '@livekit/components-react';
import { AgentAudioVisualizerBar } from '@/components/agents-ui/agent-audio-visualizer-bar';
import { AgentChatTranscript } from '@/components/agents-ui/agent-chat-transcript';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/shadcn/utils';

const FEATURES = [
  'UPI & QR payment',
  'GST ki basics',
  'Sarkari yojana',
  'WhatsApp Business',
  'Online listing',
];

const ACTIVE_STATES = ['listening', 'thinking', 'speaking'];

type StatusInfo = {
  title: string;
  sub: string;
  who: 'you' | 'agent';
  Icon: typeof Ear;
  spin?: boolean;
};

function statusFor(state: string): StatusInfo {
  switch (state) {
    case 'speaking':
      return {
        title: 'DukaanSaathi bol raha hai',
        sub: 'Jawab dhyaan se suniye',
        who: 'agent',
        Icon: Volume2,
      };
    case 'thinking':
      return {
        title: 'Soch raha hoon…',
        sub: 'Bas ek pal rukiye',
        who: 'agent',
        Icon: Loader2,
        spin: true,
      };
    case 'listening':
    default:
      return {
        title: 'Sun raha hoon…',
        sub: 'Aap boliye — main dhyaan se sun raha hoon',
        who: 'you',
        Icon: Ear,
      };
  }
}

/** Rounded card wrapper used by every full-screen state. */
function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center px-5 text-center">
      {children}
    </div>
  );
}

export function DukaanExperience({ startButtonText }: { startButtonText: string }) {
  const session = useSessionContext();
  const { isConnected, start, end } = session;
  const { state, audioTrack } = useVoiceAssistant();
  const { messages } = useSessionMessages(session);

  const [hasStarted, setHasStarted] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [showTranscript, setShowTranscript] = useState(true);
  const everConnected = useRef(false);

  const mic = useTrackToggle({
    source: Track.Source.Microphone,
    onDeviceError: (error) => setMicError(error?.name || 'MicError'),
  });

  // Track real connection so a brief pre-connect gap isn't mistaken for "ended".
  useEffect(() => {
    if (isConnected) {
      everConnected.current = true;
      return;
    }
    if (everConnected.current && hasStarted && !hasEnded && !micError) {
      setHasEnded(true);
    }
  }, [isConnected, hasStarted, hasEnded, micError]);

  const startCall = useCallback(async () => {
    setMicError(null);
    setHasEnded(false);
    everConnected.current = false;
    setHasStarted(true);

    // Ask for the mic up front so a denial is caught with a clear message.
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
    } catch (e) {
      setMicError((e as Error)?.name || 'NotAllowedError');
      setHasStarted(false);
      return;
    }

    try {
      await start();
    } catch {
      setHasStarted(false);
      setHasEnded(true);
    }
  }, [start]);

  const endCall = useCallback(() => {
    end();
    setHasEnded(true);
  }, [end]);

  const dismissMicError = useCallback(() => {
    setMicError(null);
    if (!isConnected) startCall();
  }, [isConnected, startCall]);

  const agentReady = ACTIVE_STATES.includes(state);

  // ---- Mic permission / device error ----
  if (micError) {
    const noMic = micError === 'NotFoundError' || micError === 'DevicesNotFoundError';
    return (
      <Screen>
        <div className="bg-destructive/10 text-destructive flex size-16 items-center justify-center rounded-2xl">
          <TriangleAlert className="size-8" />
        </div>
        <h1 className="mt-5 text-2xl font-bold">
          {noMic ? 'Microphone nahi mila' : 'Microphone band hai'}
        </h1>
        <p className="text-muted-foreground mt-2 max-w-md leading-6">
          {noMic
            ? 'Aapke device par koi microphone nahi mila. Ek mic laga kar dobara koshish karein.'
            : 'DukaanSaathi ko sunne ke liye microphone chahiye. Aapne mic ki permission block kar di hai.'}
        </p>
        {!noMic && (
          <ol className="text-muted-foreground mt-4 max-w-md list-decimal space-y-1 pl-5 text-left text-sm">
            <li>Address bar mein 🔒 (lock) icon par click karein.</li>
            <li>&quot;Microphone&quot; ko &quot;Allow&quot; karein.</li>
            <li>Page reload karke dobara &quot;Baat shuru karein&quot; dabayein.</li>
          </ol>
        )}
        <Button
          size="lg"
          onClick={dismissMicError}
          className="mt-6 w-64 rounded-full font-semibold"
        >
          <RefreshCw className="size-4" /> Dobara koshish karein
        </Button>
      </Screen>
    );
  }

  // ---- Call ended ----
  if (hasEnded && !isConnected) {
    return (
      <Screen>
        <div className="text-primary bg-primary/10 flex size-16 items-center justify-center rounded-2xl">
          <Store className="size-8" />
        </div>
        <h1 className="mt-5 text-2xl font-bold">Baat khatam ho gayi</h1>
        <p className="text-muted-foreground mt-2 max-w-md leading-6">
          Umeed hai aapki madad ho gayi. Jab bhi zaroorat ho, DukaanSaathi hazir hai.
        </p>
        <Button size="lg" onClick={startCall} className="mt-6 w-64 rounded-full font-semibold">
          <Mic className="size-4" /> Nayi baat shuru karein
        </Button>
      </Screen>
    );
  }

  // ---- Ready (not started) ----
  if (!hasStarted && !isConnected) {
    return (
      <Screen>
        <div className="text-primary bg-primary/10 flex size-20 items-center justify-center rounded-3xl">
          <Store className="size-10" />
        </div>
        <h1 className="mt-5 text-3xl font-bold tracking-tight">DukaanSaathi</h1>
        <p className="text-muted-foreground mt-2 max-w-md leading-6 text-pretty">
          Aapka digital dukaan saathi. UPI, GST, sarkari yojana aur online business — sab kuch bas
          bol kar seekhein.
        </p>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {FEATURES.map((f) => (
            <span
              key={f}
              className="border-primary/20 bg-primary/5 text-foreground/80 rounded-full border px-3 py-1 text-xs font-medium"
            >
              {f}
            </span>
          ))}
        </div>

        <Button
          size="lg"
          onClick={startCall}
          className="mt-8 w-72 rounded-full text-base font-semibold shadow-lg"
        >
          <Mic className="size-5" /> {startButtonText}
        </Button>
        <p className="text-muted-foreground mt-3 text-xs">
          Aapko sirf apna sawaal bolna hai — Hindi ya English mein.
        </p>
      </Screen>
    );
  }

  // ---- Connecting ----
  if (!isConnected || !agentReady) {
    return (
      <Screen>
        <div className="text-primary bg-primary/10 flex size-16 items-center justify-center rounded-2xl">
          <Loader2 className="size-8 animate-spin" />
        </div>
        <h1 className="mt-5 text-2xl font-bold">DukaanSaathi se jud rahe hain…</h1>
        <p className="text-muted-foreground mt-2">Kripya thodi der rukiye.</p>
      </Screen>
    );
  }

  // ---- Active: Listening / Speaking / Thinking ----
  const status = statusFor(state);
  return (
    <div className="mx-auto flex h-svh w-full max-w-xl flex-col items-center justify-between gap-4 px-4 py-10">
      {/* Who is speaking */}
      <div className="flex flex-col items-center pt-6 text-center">
        <span
          className={cn(
            'inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold',
            status.who === 'agent'
              ? 'bg-primary/15 text-primary'
              : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
          )}
        >
          <status.Icon className={cn('size-4', status.spin && 'animate-spin')} />
          {status.who === 'agent' ? 'DukaanSaathi' : 'Aap'}
        </span>
        <h2 className="mt-3 text-2xl font-bold">{status.title}</h2>
        <p className="text-muted-foreground mt-1 text-sm">{status.sub}</p>
      </div>

      {/* Voice visualizer */}
      <div className="flex flex-1 items-center justify-center">
        <div className="text-primary">
          <AgentAudioVisualizerBar size="lg" state={state} audioTrack={audioTrack} barCount={5} />
        </div>
      </div>

      {/* Live transcript */}
      {showTranscript && messages.length > 0 && (
        <div className="bg-card/60 max-h-[28svh] w-full overflow-hidden rounded-2xl border">
          <AgentChatTranscript
            agentState={state}
            messages={messages}
            className="h-full [&>div>div]:px-4 [&>div>div]:py-3"
          />
        </div>
      )}

      {/* Controls */}
      <div className="flex w-full items-center justify-center gap-3 pb-2">
        <Button
          size="lg"
          variant="secondary"
          onClick={() => setShowTranscript((v) => !v)}
          className="rounded-full"
          aria-label="Transcript dikhayein ya chupayein"
        >
          <MessagesSquare className="size-5" />
        </Button>

        <Button
          size="lg"
          variant={mic.enabled ? 'secondary' : 'destructive'}
          disabled={mic.pending}
          onClick={() => mic.toggle()}
          className="rounded-full"
          aria-label={mic.enabled ? 'Microphone band karein' : 'Microphone chalu karein'}
        >
          {mic.enabled ? <Mic className="size-5" /> : <MicOff className="size-5" />}
        </Button>

        <Button
          size="lg"
          variant="destructive"
          onClick={endCall}
          className="rounded-full px-6 font-semibold"
        >
          <PhoneOff className="size-5" /> Call band karein
        </Button>
      </div>
    </div>
  );
}
