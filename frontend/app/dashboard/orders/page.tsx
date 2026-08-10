'use client';

import { useMemo, useState } from 'react';
import {
  CircleCheck,
  Database,
  Minus,
  Plus,
  Receipt,
  Search,
  ShoppingCart,
  TriangleAlert,
  X,
} from 'lucide-react';
import { type OrderTotal, cx, fmtInr, useCatalogue } from '@/components/app/dashboard/data';
import { Card, EmptyState, LoadingRow, PageHeader } from '@/components/app/dashboard/kit';
import { Button } from '@/components/ui/button';

const INPUT =
  'border-input bg-background focus-visible:ring-ring/50 h-9 w-full rounded-md border px-3 text-sm outline-none focus-visible:ring-2';

// Order builder — pick items, quantities are totalled SERVER-SIDE via
// POST /api/catalogue (same compute_order_total the voice agent runs), so
// out-of-stock / unknown items surface as issues instead of being billed.
export default function OrdersPage() {
  const { catalogue, loading, error, quote } = useCatalogue();

  const [query, setQuery] = useState('');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [result, setResult] = useState<OrderTotal | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return catalogue;
    return catalogue.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.category ?? '').toLowerCase().includes(q)
    );
  }, [catalogue, query]);

  const cartEntries = Object.entries(cart);

  const bump = (name: string, delta: number) =>
    setCart((c) => {
      const next = (c[name] ?? 0) + delta;
      const copy = { ...c };
      if (next <= 0) delete copy[name];
      else copy[name] = next;
      return copy;
    });

  const clear = () => {
    setCart({});
    setResult(null);
  };

  const calculate = async () => {
    const items = cartEntries.map(([item_name, quantity]) => ({ item_name, quantity }));
    if (items.length === 0) return;
    setBusy(true);
    try {
      setResult(await quote(items));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Order Builder"
        sub="Build an order and total it at shop prices — the same calculation the voice agent runs when a caller places one."
      />

      {loading ? (
        <LoadingRow label="Loading catalogue…" />
      ) : error ? (
        <EmptyState
          icon={Database}
          title="Catalogue store unreachable"
          sub="The /api/catalogue endpoint did not respond. Orders total against real stock only — run the app with the backend SQLite store present."
        />
      ) : catalogue.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="Nothing to order yet"
          sub="The catalogue is empty. Run the voice agent once to seed the shop inventory."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          {/* item picker */}
          <div>
            <div className="relative mb-4">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search item to add…"
                className={cx(INPUT, 'pl-9')}
              />
            </div>
            <div className="bg-card overflow-hidden rounded-2xl border">
              <ul className="max-h-[28rem] divide-y overflow-y-auto">
                {filtered.map((p) => {
                  const qty = cart[p.name] ?? 0;
                  return (
                    <li key={p.name} className="flex items-center gap-3 px-4 py-3 text-sm">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium capitalize">{p.name}</span>
                          {!p.in_stock && (
                            <span className="text-destructive bg-destructive/10 rounded-full px-1.5 py-0.5 text-[11px] font-medium">
                              out of stock
                            </span>
                          )}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {fmtInr(p.unit_price)} / {p.unit ?? 'unit'}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => bump(p.name, -1)}
                          disabled={qty === 0}
                          className="size-8 p-0"
                          aria-label={`Remove one ${p.name}`}
                        >
                          <Minus className="size-3.5" />
                        </Button>
                        <span className="w-6 text-center tabular-nums">{qty}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => bump(p.name, 1)}
                          className="size-8 p-0"
                          aria-label={`Add one ${p.name}`}
                        >
                          <Plus className="size-3.5" />
                        </Button>
                      </div>
                    </li>
                  );
                })}
                {filtered.length === 0 && (
                  <li className="text-muted-foreground px-4 py-8 text-center text-sm">
                    No items match “{query}”.
                  </li>
                )}
              </ul>
            </div>
          </div>

          {/* cart + total */}
          <Card className="h-fit lg:sticky lg:top-20">
            <div className="mb-4 flex items-center gap-2">
              <ShoppingCart className="text-primary size-5" />
              <span className="font-semibold">Order</span>
              {cartEntries.length > 0 && (
                <button
                  type="button"
                  onClick={clear}
                  className="text-muted-foreground hover:text-destructive ml-auto inline-flex items-center gap-1 text-xs"
                >
                  <X className="size-3.5" /> Clear
                </button>
              )}
            </div>

            {cartEntries.length === 0 ? (
              <p className="text-muted-foreground py-6 text-center text-sm">
                Add items from the left to build an order.
              </p>
            ) : (
              <ul className="mb-4 space-y-2">
                {cartEntries.map(([name, qty]) => (
                  <li key={name} className="flex justify-between gap-3 text-sm">
                    <span className="capitalize">
                      {name} <span className="text-muted-foreground">× {qty}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <Button
              onClick={calculate}
              disabled={busy || cartEntries.length === 0}
              className="w-full gap-1.5"
            >
              <Receipt className="size-4" /> {busy ? 'Totalling…' : 'Compute total'}
            </Button>

            {result && (
              <div className="mt-5 border-t pt-4">
                {result.line_items.length > 0 && (
                  <ul className="space-y-2 text-sm">
                    {result.line_items.map((li) => (
                      <li key={li.name} className="flex justify-between gap-3">
                        <span className="min-w-0 truncate capitalize">
                          {li.name}{' '}
                          <span className="text-muted-foreground tabular-nums">
                            {li.quantity} × {fmtInr(li.unit_price)}
                          </span>
                        </span>
                        <span className="shrink-0 font-medium tabular-nums">
                          {fmtInr(li.line_total)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {result.line_items.length > 0 && (
                  <div className="mt-3 flex items-center justify-between border-t pt-3">
                    <span className="flex items-center gap-1.5 font-semibold">
                      <CircleCheck className="size-4 text-emerald-500" /> Total
                    </span>
                    <span className="text-lg font-bold tabular-nums">{fmtInr(result.total)}</span>
                  </div>
                )}

                {result.issues.length > 0 && (
                  <div className="bg-destructive/5 mt-4 space-y-1.5 rounded-lg p-3">
                    {result.issues.map((issue, i) => (
                      <p key={i} className="text-destructive flex items-start gap-1.5 text-xs">
                        <TriangleAlert className="mt-0.5 size-3.5 shrink-0" /> {issue}
                      </p>
                    ))}
                  </div>
                )}

                {result.line_items.length === 0 && result.issues.length === 0 && (
                  <p className="text-muted-foreground text-center text-sm">Nothing to total.</p>
                )}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
