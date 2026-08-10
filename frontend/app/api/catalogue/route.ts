import { NextResponse } from 'next/server';
// built into Node 24 — no dependency (same store the Python agent writes)
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

// Reads the SAME SQLite file the Python agent uses (backend/data/memory.db),
// `catalogue` table. The agent's memory.py owns the schema + seed; this route
// never creates or fabricates rows — an empty/missing table surfaces honestly.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function dbPath(): string {
  return (
    process.env.MEMORY_DB_PATH ?? path.join(process.cwd(), '..', 'backend', 'data', 'memory.db')
  );
}

type ProductRow = {
  item_name: string;
  category: string | null;
  unit: string | null;
  shop_price: number;
  stock_qty: number;
};

function toProduct(r: ProductRow) {
  return {
    name: r.item_name,
    category: r.category,
    unit: r.unit,
    unit_price: r.shop_price,
    in_stock: r.stock_qty > 0,
    stock_qty: r.stock_qty,
  };
}

function dbStatus(file: string, records: number) {
  const exists = fs.existsSync(file);
  return {
    engine: 'SQLite',
    connected: exists,
    sizeBytes: exists ? fs.statSync(file).size : 0,
    records,
    driver: `node:sqlite (Node ${process.version})`,
  };
}

// Does the catalogue table exist? (Agent may not have run yet on a fresh clone.)
function hasCatalogue(db: DatabaseSync): boolean {
  return !!db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='catalogue'")
    .get();
}

export async function GET() {
  const file = dbPath();
  if (!fs.existsSync(file)) {
    return NextResponse.json({ catalogue: [], categories: [], total: 0, db: dbStatus(file, 0) });
  }
  const db = new DatabaseSync(file);
  try {
    if (!hasCatalogue(db)) {
      return NextResponse.json({ catalogue: [], categories: [], total: 0, db: dbStatus(file, 0) });
    }
    const rows = db
      .prepare(
        'SELECT item_name, category, unit, shop_price, stock_qty FROM catalogue ORDER BY category, item_name'
      )
      .all() as unknown as ProductRow[];
    const catalogue = rows.map(toProduct);
    const categories = [...new Set(rows.map((r) => r.category).filter(Boolean))] as string[];
    return NextResponse.json({
      catalogue,
      categories,
      total: catalogue.length,
      db: dbStatus(file, catalogue.length),
    });
  } finally {
    db.close();
  }
}

// Edit one item's price and/or stock — the shopkeeper maintaining their own shelf.
export async function PATCH(req: Request) {
  const name = new URL(req.url).searchParams.get('name');
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

  let body: { shop_price?: number; stock_qty?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  const price = Number(body.shop_price);
  const stock = Number(body.stock_qty);
  if (!Number.isFinite(price) || !Number.isFinite(stock) || price < 0 || stock < 0) {
    return NextResponse.json({ error: 'price and stock must be >= 0' }, { status: 400 });
  }

  const file = dbPath();
  if (!fs.existsSync(file)) return NextResponse.json({ updated: false }, { status: 404 });

  const db = new DatabaseSync(file);
  try {
    db.exec('PRAGMA busy_timeout = 3000'); // agent may briefly hold the file
    const res = db
      .prepare('UPDATE catalogue SET shop_price = ?, stock_qty = ? WHERE item_name = ?')
      .run(price, stock, name);
    return NextResponse.json({ updated: Number(res.changes) > 0 });
  } finally {
    db.close();
  }
}

// Total an order at shop prices. ponytail: mirrors backend/src/memory.py::
// compute_order_total exactly (exact-name match beats LIKE; out-of-stock, unknown
// and ambiguous items go to `issues`, never silently billed) so this gives the
// identical result the voice agent's tool would — the agent is a LiveKit worker
// with no REST endpoint to call, and both read the same SQLite file.
export async function POST(req: Request) {
  let body: { items?: { item_name: string; quantity?: number }[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  const file = dbPath();
  if (!fs.existsSync(file)) {
    return NextResponse.json({ line_items: [], total: 0, issues: ['catalogue unavailable'] });
  }

  const db = new DatabaseSync(file);
  try {
    if (!hasCatalogue(db)) {
      return NextResponse.json({ line_items: [], total: 0, issues: ['catalogue unavailable'] });
    }
    const lineItems: (ReturnType<typeof toProduct> & { quantity: number; line_total: number })[] =
      [];
    const issues: string[] = [];
    let total = 0;

    for (const entry of body.items ?? []) {
      const term = (entry.item_name ?? '').trim().toLowerCase();
      const qty = entry.quantity && entry.quantity > 0 ? entry.quantity : 1;
      if (!term) continue;

      const exact = db.prepare('SELECT * FROM catalogue WHERE lower(item_name) = ?').get(term) as
        ProductRow | undefined;
      const rows = exact
        ? [exact]
        : (db
            .prepare('SELECT * FROM catalogue WHERE item_name LIKE ? ORDER BY item_name')
            .all(`%${term}%`) as unknown as ProductRow[]);

      if (rows.length === 0) {
        issues.push(`${entry.item_name} is not in the catalogue`);
      } else if (rows.length > 1) {
        issues.push(`${entry.item_name} could be ${rows.map((r) => r.item_name).join(' or ')}`);
      } else if (rows[0].stock_qty <= 0) {
        issues.push(`${rows[0].item_name} is out of stock`);
      } else {
        const p = toProduct(rows[0]);
        const line_total = Math.round(rows[0].shop_price * qty * 100) / 100;
        lineItems.push({ ...p, quantity: qty, line_total });
        total += line_total;
      }
    }
    return NextResponse.json({
      line_items: lineItems,
      total: Math.round(total * 100) / 100,
      issues,
    });
  } finally {
    db.close();
  }
}
