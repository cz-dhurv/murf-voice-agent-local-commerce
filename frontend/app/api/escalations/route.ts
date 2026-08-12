import { NextResponse } from 'next/server';
// built into Node 24 — no dependency
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

// Reads the SAME SQLite file the Python agent writes escalations to (Day 7:
// create_escalation). No ORM — the agent owns the schema (see memory.py).
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function dbPath(): string {
  return (
    process.env.MEMORY_DB_PATH ?? path.join(process.cwd(), '..', 'backend', 'data', 'memory.db')
  );
}

type EscalationRow = {
  escalation_id: string;
  user_id: string | null;
  caller_name: string | null;
  reason_category: string;
  summary: string;
  urgency: string;
  language: string | null;
  follow_up_method: string | null;
  status: string;
  parent_id: string | null;
  created_at: string | null;
  updated_at: string | null;
};

const STATUSES = ['open', 'in_progress', 'resolved', 'refunded'];

// Most-urgent-then-newest, matching memory.list_escalations so the dashboard and
// the agent agree on ordering.
const ORDER_BY =
  "ORDER BY CASE urgency WHEN 'emergency' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, datetime(created_at) DESC";

export async function GET() {
  const file = dbPath();
  if (!fs.existsSync(file)) return NextResponse.json({ escalations: [] });

  const db = new DatabaseSync(file);
  try {
    // The table may not exist yet if the agent hasn't run init_db since the
    // upgrade — treat that as "no escalations" rather than a 500.
    const rows = db
      .prepare(`SELECT * FROM escalations ${ORDER_BY}`)
      .all() as unknown as EscalationRow[];
    return NextResponse.json({ escalations: rows });
  } catch {
    return NextResponse.json({ escalations: [] });
  } finally {
    db.close();
  }
}

export async function PATCH(req: Request) {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  let body: { status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }
  if (!body.status || !STATUSES.includes(body.status)) {
    return NextResponse.json({ error: 'invalid status' }, { status: 400 });
  }

  const file = dbPath();
  if (!fs.existsSync(file)) return NextResponse.json({ updated: false }, { status: 404 });

  const db = new DatabaseSync(file);
  try {
    db.exec('PRAGMA busy_timeout = 3000'); // agent may briefly hold the file
    const res = db
      .prepare(
        "UPDATE escalations SET status = ?, updated_at = datetime('now') WHERE escalation_id = ?"
      )
      .run(body.status, id);
    return NextResponse.json({ updated: Number(res.changes) > 0 });
  } finally {
    db.close();
  }
}
