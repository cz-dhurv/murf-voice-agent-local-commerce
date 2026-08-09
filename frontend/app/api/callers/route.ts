import { NextResponse } from 'next/server';
// built into Node 24 — no dependency
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

// This route reads the SAME SQLite file the Python agent writes its caller memory
// to (backend/data/memory.db). No ORM, no extra package — the agent owns the schema.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function dbPath(): string {
  return (
    process.env.MEMORY_DB_PATH ?? path.join(process.cwd(), '..', 'backend', 'data', 'memory.db')
  );
}

type CallerRow = {
  user_id: string;
  name: string | null;
  language_preference: string | null;
  facts: string;
  last_interaction: string | null;
};

function safeFacts(s: string): Record<string, string> {
  try {
    const o = JSON.parse(s || '{}');
    return o && typeof o === 'object' ? o : {};
  } catch {
    return {};
  }
}

// Real, non-fabricated status of the store the agent actually uses.
function dbStatus(file: string, records: number) {
  const exists = fs.existsSync(file);
  const sizeBytes = exists ? fs.statSync(file).size : 0;
  return {
    engine: 'SQLite',
    connected: exists,
    sizeBytes,
    records,
    // node:sqlite ships with the Node runtime; report it truthfully.
    driver: `node:sqlite (Node ${process.version})`,
  };
}

export async function GET() {
  const file = dbPath();
  if (!fs.existsSync(file)) {
    return NextResponse.json({ callers: [], total: 0, db: dbStatus(file, 0) });
  }

  const db = new DatabaseSync(file);
  try {
    const rows = db
      .prepare(
        'SELECT user_id, name, language_preference, facts, last_interaction FROM callers ORDER BY last_interaction DESC'
      )
      .all() as unknown as CallerRow[];
    const callers = rows.map((r) => ({
      user_id: r.user_id,
      name: r.name,
      language_preference: r.language_preference,
      facts: safeFacts(r.facts),
      last_interaction: r.last_interaction,
    }));
    return NextResponse.json({
      callers,
      total: callers.length,
      db: dbStatus(file, callers.length),
    });
  } finally {
    db.close();
  }
}

export async function PATCH(req: Request) {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  let body: { name?: string; language_preference?: string; facts?: Record<string, string> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  const file = dbPath();
  if (!fs.existsSync(file)) return NextResponse.json({ updated: false }, { status: 404 });

  const db = new DatabaseSync(file);
  try {
    db.exec('PRAGMA busy_timeout = 3000'); // agent may briefly hold the file
    // Full overwrite of the editable columns — the dashboard sends the complete
    // desired state (unlike the agent's merge-on-upsert). last_interaction is left
    // untouched so an edit doesn't masquerade as a fresh conversation.
    const res = db
      .prepare('UPDATE callers SET name = ?, language_preference = ?, facts = ? WHERE user_id = ?')
      .run(
        body.name ?? null,
        body.language_preference ?? null,
        JSON.stringify(body.facts ?? {}),
        id
      );
    return NextResponse.json({ updated: Number(res.changes) > 0 });
  } finally {
    db.close();
  }
}

export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const file = dbPath();
  if (!fs.existsSync(file)) return NextResponse.json({ deleted: false });

  const db = new DatabaseSync(file);
  try {
    db.exec('PRAGMA busy_timeout = 3000'); // agent may briefly hold the file
    const res = db.prepare('DELETE FROM callers WHERE user_id = ?').run(id);
    return NextResponse.json({ deleted: Number(res.changes) > 0 });
  } finally {
    db.close();
  }
}
