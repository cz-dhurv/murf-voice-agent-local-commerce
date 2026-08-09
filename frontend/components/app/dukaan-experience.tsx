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
import { useLanguage } from '@/components/app/language-provider';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/shadcn/utils';

const ACTIVE_STATES = ['listening', 'thinking', 'speaking'];

type StatusInfo = {
  title: string;
  sub: string;
  who: 'you' | 'agent';
  Icon: typeof Ear;
  spin?: boolean;
};

/** Self-contained card the whole widget lives in — keeps a stable height across states. */
function Frame({ live, children }: { live?: boolean; children: React.ReactNode }) {
  const { tr } = useLanguage();
  return (
    <div className="bg-card relative flex min-h-[26rem] w-full flex-col rounded-3xl border p-6 shadow-xl sm:p-8">
      {live && (
        <span className="text-primary absolute top-5 left-6 inline-flex items-center gap-1.5 text-xs font-semibold">
          <span className="bg-primary size-2 animate-pulse rounded-full" />
          {tr.live}
        </span>
      )}
      <div className="flex flex-1 flex-col items-center justify-center text-center">{children}</div>
      {live && (
        <p className="text-muted-foreground mt-4 text-center text-xs">🔒 {tr.securePrivate}</p>
      )}
    </div>
  );
}

export function DukaanExperience() {
  const session = useSessionContext();
  const { isConnected, start, end } = session;
  const { state, audioTrack } = useVoiceAssistant();
  const { messages } = useSessionMessages(session);
  const { tr } = useLanguage();

  const [hasStarted, setHasStarted] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [showTranscript, setShowTranscript] = useState(true);
  const everConnected = useRef(false);

  const mic = useTrackToggle({
    source: Track.Source.Microphone,
    onDeviceError: (error) => setMicError(error?.name || 'MicError'),
  });

  function statusFor(s: string): StatusInfo {
    switch (s) {
      case 'speaking':
        return { title: tr.wSpeakingTitle, sub: tr.wSpeakingSub, who: 'agent', Icon: Volume2 };
      case 'thinking':
        return {
          title: tr.wThinkingTitle,
          sub: tr.wThinkingSub,
          who: 'agent',
          Icon: Loader2,
          spin: true,
        };
      case 'listening':
      default:
        return { title: tr.wListeningTitle, sub: tr.wListeningSub, who: 'you', Icon: Ear };
    }
  }

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
      // caller_id + language ride in on the token (see getCallerTokenSource), so
      // the agent has them at join — no fire-and-forget setAttributes race.
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
      <Frame>
        <div className="bg-destructive/10 text-destructive flex size-16 items-center justify-center rounded-2xl">
          <TriangleAlert className="size-8" />
        </div>
        <h3 className="mt-5 text-2xl font-bold">{noMic ? tr.micNotFoundTitle : tr.micOffTitle}</h3>
        <p className="text-muted-foreground mt-2 max-w-md leading-6">
          {noMic ? tr.micNotFoundSub : tr.micOffSub}
        </p>
        {!noMic && (
          <ol className="text-muted-foreground mt-4 max-w-md list-decimal space-y-1 pl-5 text-left text-sm">
            <li>{tr.micStep1}</li>
            <li>{tr.micStep2}</li>
            <li>{tr.micStep3}</li>
          </ol>
        )}
        <Button
          size="lg"
          onClick={dismissMicError}
          className="mt-6 w-64 rounded-full font-semibold"
        >
          <RefreshCw className="size-4" /> {tr.micRetry}
        </Button>
      </Frame>
    );
  }

  // ---- Call ended ----
  if (hasEnded && !isConnected) {
    return (
      <Frame>
        <div className="text-primary bg-primary/10 flex size-16 items-center justify-center rounded-2xl">
          <Store className="size-8" />
        </div>
        <h3 className="mt-5 text-2xl font-bold">{tr.wEndedTitle}</h3>
        <p className="text-muted-foreground mt-2 max-w-md leading-6">{tr.wEndedSub}</p>
        <Button size="lg" onClick={startCall} className="mt-6 w-64 rounded-full font-semibold">
          <Mic className="size-4" /> {tr.wRestart}
        </Button>
      </Frame>
    );
  }

  // ---- Ready (not started) ----
  if (!hasStarted && !isConnected) {
    return (
      <Frame>
        <div className="text-primary bg-primary/10 flex size-20 items-center justify-center rounded-3xl">
          <Store className="size-10" />
        </div>
        <h3 className="mt-5 text-3xl font-bold tracking-tight">{tr.wReadyTitle}</h3>
        <p className="text-muted-foreground mt-2 max-w-md leading-6 text-pretty">{tr.wReadySub}</p>
        <Button
          size="lg"
          onClick={startCall}
          className="mt-8 w-72 rounded-full text-base font-semibold shadow-lg"
        >
          <Mic className="size-5" /> {tr.wStart}
        </Button>
        <p className="text-muted-foreground mt-3 text-xs">{tr.wStartHint}</p>
      </Frame>
    );
  }

  // ---- Connecting ----
  if (!isConnected || !agentReady) {
    return (
      <Frame live>
        <div className="text-primary bg-primary/10 flex size-16 items-center justify-center rounded-2xl">
          <Loader2 className="size-8 animate-spin" />
        </div>
        <h3 className="mt-5 text-2xl font-bold">{tr.wConnecting}</h3>
        <p className="text-muted-foreground mt-2">{tr.wConnectingSub}</p>
      </Frame>
    );
  }

  // ---- Active: Listening / Speaking / Thinking ----
  const status = statusFor(state);
  return (
    <Frame live>
      <div className="flex w-full flex-1 flex-col items-center justify-between gap-4">
        {/* Who is speaking */}
        <div className="flex flex-col items-center pt-4 text-center">
          <span
            className={cn(
              'inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold',
              status.who === 'agent'
                ? 'bg-primary/15 text-primary'
                : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
            )}
          >
            <status.Icon className={cn('size-4', status.spin && 'animate-spin')} />
            {status.who === 'agent' ? tr.wAgent : tr.wYou}
          </span>
          <h3 className="mt-3 text-2xl font-bold">{status.title}</h3>
          <p className="text-muted-foreground mt-1 text-sm">{status.sub}</p>
        </div>

        {/* Voice visualizer — green while listening to user, saffron while agent talks */}
        <div className="flex flex-1 items-center justify-center">
          <div
            className={cn(
              status.who === 'agent' ? 'text-primary' : 'text-emerald-600 dark:text-emerald-400'
            )}
          >
            <AgentAudioVisualizerBar size="lg" state={state} audioTrack={audioTrack} barCount={5} />
          </div>
        </div>

        {/* Live transcript */}
        {showTranscript && messages.length > 0 && (
          <div className="bg-background/60 max-h-[16svh] w-full overflow-hidden rounded-2xl border">
            <AgentChatTranscript
              agentState={state}
              messages={messages}
              className="h-full [&>div>div]:px-4 [&>div>div]:py-3"
            />
          </div>
        )}

        {/* Controls */}
        <div className="flex w-full items-center justify-center gap-3">
          <Button
            size="lg"
            variant="secondary"
            onClick={() => setShowTranscript((v) => !v)}
            className="rounded-full"
            aria-label="Transcript"
          >
            <MessagesSquare className="size-5" />
          </Button>

          <Button
            size="lg"
            variant={mic.enabled ? 'secondary' : 'destructive'}
            disabled={mic.pending}
            onClick={() => mic.toggle()}
            className="rounded-full"
            aria-label={tr.wMute}
          >
            {mic.enabled ? <Mic className="size-5" /> : <MicOff className="size-5" />}
          </Button>

          <Button
            size="lg"
            variant="destructive"
            onClick={endCall}
            className="rounded-full px-6 font-semibold"
          >
            <PhoneOff className="size-5" /> {tr.wEndCall}
          </Button>
        </div>
      </div>
    </Frame>
  );
}
