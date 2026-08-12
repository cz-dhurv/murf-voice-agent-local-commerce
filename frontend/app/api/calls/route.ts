import { NextResponse } from 'next/server';
import { AgentDispatchClient } from 'livekit-server-sdk';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

// Places an outbound order-confirmation call: dispatches the agent into a fresh
// room with the customer's number + order as metadata (agent.py dials from there).
// Reads the SAME SQLite file the agent writes, so the do_not_call opt-out and the
// saved contact/order are honoured server-side — a caller who opted out is refused
// here, before any dispatch.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL;
const AGENT_NAME = process.env.AGENT_NAME ?? 'my-agent';

function dbPath(): string {
  return (
    process.env.MEMORY_DB_PATH ?? path.join(process.cwd(), '..', 'backend', 'data', 'memory.db')
  );
}

// Same normalization as the Python side (memory.normalize_phone): a clean 10-digit
// Indian mobile, or null. The agent re-normalizes too — this is the early gate so we
// don't dispatch a job that can't dial.
function normalizePhone(raw: string): string | null {
  let d = (raw || '').replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  else if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  return d.length === 10 && '6789'.includes(d[0]) ? d : null;
}

type Facts = Record<string, string>;

function readCaller(id: string): { facts: Facts; user_id: string } | null {
  const file = dbPath();
  if (!fs.existsSync(file)) return null;
  const db = new DatabaseSync(file);
  try {
    const row = db.prepare('SELECT user_id, facts FROM callers WHERE user_id = ?').get(id) as
      { user_id: string; facts: string } | undefined;
    if (!row) return null;
    let facts: Facts = {};
    try {
      const o = JSON.parse(row.facts || '{}');
      if (o && typeof o === 'object') facts = o;
    } catch {
      /* keep {} */
    }
    return { user_id: row.user_id, facts };
  } finally {
    db.close();
  }
}

type CallBody = {
  caller_id?: string;
  phone?: string;
  order?: string;
  slot?: string;
  purpose?: string;
  escalation_id?: string; // set when calling back to say a request was resolved
  at?: string; // ISO datetime to schedule the call; omit to call now
};

const PURPOSES = ['confirm', 'ready', 'escalation_resolved', 'refund_processed'];

type Resolved =
  | { ok: true; clean: string; metadata: string }
  | { ok: false; status: number; error: string; code: string };

// Turn a request into dispatch-ready metadata, or a reason not to call. Re-run at
// fire time for scheduled calls, so a do_not_call opt-out (or a number change) made
// AFTER scheduling is still honoured — the opt-out gate must hold at dispatch time.
function resolveCall(body: CallBody): Resolved {
  const rec = body.caller_id ? readCaller(body.caller_id) : null;
  const facts = rec?.facts ?? {};

  if (facts.do_not_call === 'true') {
    return {
      ok: false,
      status: 409,
      error: 'This caller has opted out of calls.',
      code: 'do_not_call',
    };
  }

  const clean = normalizePhone(body.phone || facts.contact || '');
  if (!clean) {
    return {
      ok: false,
      status: 400,
      error: 'No valid 10-digit mobile number to call.',
      code: 'no_phone',
    };
  }

  const metadata = JSON.stringify({
    phone_number: `+91${clean}`,
    order_summary: body.order || facts.last_bill || '',
    delivery_slot: body.slot || facts.delivery_slot || '',
    caller_id: rec?.user_id || body.caller_id || '',
    purpose: PURPOSES.includes(body.purpose || '') ? body.purpose : 'confirm',
    escalation_id: body.escalation_id || '',
  });
  return { ok: true, clean, metadata };
}

async function dispatch(metadata: string): Promise<string> {
  const room = `outbound-${crypto.randomUUID().slice(0, 12)}`;
  const client = new AgentDispatchClient(LIVEKIT_URL!, API_KEY!, API_SECRET!);
  await client.createDispatch(room, AGENT_NAME, { metadata });
  return room;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export async function POST(req: Request) {
  if (!LIVEKIT_URL || !API_KEY || !API_SECRET) {
    return NextResponse.json({ error: 'LiveKit env not configured' }, { status: 500 });
  }

  let body: CallBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  const r = resolveCall(body);
  if (!r.ok) return NextResponse.json({ error: r.error, code: r.code }, { status: r.status });

  // Scheduled call: fire it later with an in-process timer. ponytail: setTimeout in
  // the Next server — survives the browser tab closing, but is LOST on a server
  // restart (no durable job store). Add a real queue (cron table / BullMQ) only if
  // scheduled calls must survive restarts.
  if (body.at) {
    const when = new Date(body.at).getTime();
    const now = Date.now();
    if (!Number.isFinite(when) || when <= now) {
      return NextResponse.json(
        { error: 'Schedule time must be in the future.', code: 'bad_time' },
        { status: 400 }
      );
    }
    if (when - now > DAY_MS) {
      return NextResponse.json(
        { error: 'Calls can only be scheduled up to 24 hours ahead.', code: 'too_far' },
        { status: 400 }
      );
    }
    setTimeout(() => {
      const fire = resolveCall(body); // re-check opt-out/number at fire time
      if (!fire.ok) {
        console.warn('scheduled call skipped:', fire.code, fire.error);
        return;
      }
      dispatch(fire.metadata)
        .then((room) => console.log('scheduled call dispatched', room))
        .catch((e) => console.error('scheduled dispatch failed', e));
    }, when - now);
    return NextResponse.json({ scheduled: true, at: body.at, calling: `+91${r.clean}` });
  }

  try {
    const room = await dispatch(r.metadata);
    return NextResponse.json({ dispatched: true, room, calling: `+91${r.clean}` });
  } catch (e) {
    console.error('dispatch failed', e);
    return NextResponse.json({ error: 'Could not place the call.' }, { status: 502 });
  }
}
