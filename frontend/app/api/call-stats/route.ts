import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function dbPath(): string {
  return (
    process.env.MEMORY_DB_PATH ?? path.join(process.cwd(), '..', 'backend', 'data', 'memory.db')
  );
}

type CallRow = {
  started_at: string;
  duration_sec: number | null;
  channel: string;
  outcome: 'success' | 'failed' | null;
  track_outcome: string | null;
};
const EMPTY = {
  total: 0,
  successful: 0,
  failed: 0,
  success_rate: 0,
  orders_placed: 0,
  escalations_filed: 0,
  average_duration_sec: 0,
  calls_per_day: [] as { date: string; total: number; successful: number; failed: number }[],
  channel_breakdown: [] as { channel: string; total: number; successful: number; failed: number }[],
  recent_calls: [] as {
    started_at: string;
    duration_sec: number | null;
    channel: string;
    outcome: string | null;
  }[],
};

export async function GET(req: Request) {
  const file = dbPath();
  if (!fs.existsSync(file)) return NextResponse.json(EMPTY);
  const url = new URL(req.url);
  const where: string[] = [];
  const params: string[] = [];
  const addDate = (key: 'from' | 'to', op: '>=' | '<=') => {
    const value = url.searchParams.get(key)?.slice(0, 10);
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      where.push(`date(started_at) ${op} date(?)`);
      params.push(value);
    }
  };
  addDate('from', '>=');
  addDate('to', '<=');
  const channel = url.searchParams.get('channel');
  if (channel === 'browser' || channel === 'sip_outbound') {
    where.push('channel = ?');
    params.push(channel);
  }
  const language = url.searchParams.get('language');
  if (language && /^[a-zA-Z-]{2,12}$/.test(language)) {
    where.push('language = ?');
    params.push(language);
  }
  const db = new DatabaseSync(file);
  try {
    db.exec('PRAGMA busy_timeout = 3000');
    const rows = db
      .prepare(
        `SELECT started_at, duration_sec, channel, outcome, track_outcome FROM calls ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY datetime(started_at) DESC`
      )
      .all(...params) as unknown as CallRow[];
    const total = rows.length,
      successful = rows.filter((r) => r.outcome === 'success').length,
      failed = rows.filter((r) => r.outcome === 'failed').length;
    const durations = rows
      .map((r) => r.duration_sec)
      .filter((v): v is number => typeof v === 'number');
    const byDay = new Map<
      string,
      { date: string; total: number; successful: number; failed: number }
    >();
    const byChannel = new Map<
      string,
      { channel: string; total: number; successful: number; failed: number }
    >();
    let orders = 0,
      escalations = 0;
    for (const r of rows) {
      const date = r.started_at.slice(0, 10),
        day = byDay.get(date) ?? { date, total: 0, successful: 0, failed: 0 },
        bucket = byChannel.get(r.channel) ?? {
          channel: r.channel,
          total: 0,
          successful: 0,
          failed: 0,
        };
      day.total++;
      bucket.total++;
      if (r.outcome === 'success') {
        day.successful++;
        bucket.successful++;
      }
      if (r.outcome === 'failed') {
        day.failed++;
        bucket.failed++;
      }
      byDay.set(date, day);
      byChannel.set(r.channel, bucket);
      try {
        const track = JSON.parse(r.track_outcome || '{}') as Record<string, unknown>;
        if (track.order_placed === true) orders++;
        if (track.escalation_filed === true) escalations++;
      } catch {}
    }
    return NextResponse.json({
      total,
      successful,
      failed,
      success_rate: total ? Math.round((successful / total) * 100) : 0,
      orders_placed: orders,
      escalations_filed: escalations,
      average_duration_sec: durations.length
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : 0,
      calls_per_day: [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date)),
      channel_breakdown: [...byChannel.values()],
      recent_calls: rows.slice(0, 25).map(({ started_at, duration_sec, channel, outcome }) => ({
        started_at,
        duration_sec,
        channel,
        outcome,
      })),
    });
  } catch {
    return NextResponse.json(EMPTY);
  } finally {
    db.close();
  }
}
