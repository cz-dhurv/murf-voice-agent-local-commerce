'use client';

import { useMemo, useState } from 'react';
import {
  CalendarClock,
  CircleCheck,
  Database,
  Minus,
  PhoneOutgoing,
  Plus,
  Receipt,
  Search,
  ShoppingCart,
  TriangleAlert,
  User,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  type OrderTotal,
  cx,
  fmtInr,
  useCallers,
  useCatalogue,
} from '@/components/app/dashboard/data';
import { Card, EmptyState, LoadingRow, PageHeader } from '@/components/app/dashboard/kit';
import { Button } from '@/components/ui/button';

const INPUT =
  'border-input bg-background focus-visible:ring-ring/50 h-9 w-full rounded-md border px-3 text-sm outline-none focus-visible:ring-2';

// Local "YYYY-MM-DDTHH:MM" (datetime-local wants local wall-clock, not UTC).
function localNow(): string {
  return new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

// Order cockpit — pick a customer + items, then Place & confirm: the bill is
// totalled SERVER-SIDE (POST /api/catalogue, same compute_order_total the voice
// agent runs), saved to the customer's memory, and DukaanSaathi auto-dials to
// confirm it — now, or at a scheduled time.
export default function OrdersPage() {
  const { catalogue, loading, error, quote } = useCatalogue();
  const { callers, patch: patchCaller } = useCallers();

  const [query, setQuery] = useState('');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [result, setResult] = useState<OrderTotal | null>(null);
  const [busy, setBusy] = useState(false);
  const [placing, setPlacing] = useState(false);

  const [customerId, setCustomerId] = useState('');
  const [slot, setSlot] = useState('');
  const [scheduleAt, setScheduleAt] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return catalogue;
    return catalogue.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.category ?? '').toLowerCase().includes(q)
    );
  }, [catalogue, query]);

  const customer = useMemo(
    () => callers.find((c) => c.user_id === customerId) ?? null,
    [callers, customerId]
  );
  const noPhone = Boolean(customer) && !customer!.facts.contact;
  const optedOut = customer?.facts.do_not_call === 'true';

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

  // Place the order for the selected customer and fire the confirmation call.
  // `at` (ISO) schedules the call; omit it to call now. The bill is re-quoted here
  // so we save + speak exactly what's billed, and written into the customer's facts
  // (merged, never clobbering existing memory) with order_status "placed".
  const place = async (at?: string) => {
    if (!customer) return toast.error('Pick a customer first');
    if (noPhone) return toast.error('No phone on file — add one on the caller page');
    if (optedOut) return toast.error('This customer has opted out of calls');
    const items = cartEntries.map(([item_name, quantity]) => ({ item_name, quantity }));
    if (items.length === 0) return toast.error('Add items to the order');

    setPlacing(true);
    try {
      const q = await quote(items);
      setResult(q);
      if (q.line_items.length === 0) {
        toast.error('Nothing could be billed — check stock');
        return;
      }
      const nextFacts: Record<string, string> = {
        ...customer.facts,
        last_bill: q.summary,
        last_bill_total: `₹${q.total}`, // mirrors memory.py f"₹{total:g}"
        order_status: 'placed',
      };
      if (slot.trim()) nextFacts.delivery_slot = slot.trim();

      const saved = await patchCaller(customer.user_id, {
        name: customer.name,
        language_preference: customer.language_preference,
        facts: nextFacts,
      });
      if (!saved) {
        toast.error('Could not save the order');
        return;
      }

      const res = await fetch('/api/calls', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          caller_id: customer.user_id,
          order: q.summary,
          slot: slot.trim(),
          purpose: 'confirm',
          at,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j?.dispatched) toast.success(`Order placed — calling ${j.calling}…`);
      else if (res.ok && j?.scheduled) toast.success('Order placed — confirmation call scheduled');
      else toast.error(j?.error || 'Order saved, but the call could not be placed');
    } catch {
      toast.error('Could not place the order');
    } finally {
      setPlacing(false);
    }
  };

  const scheduleCall = () => {
    if (!scheduleAt) return toast.error('Pick a date and time to schedule');
    place(new Date(scheduleAt).toISOString());
  };

  return (
    <div>
      <PageHeader
        title="Place an Order"
        sub="Build an order for a customer, total it at shop prices, and let DukaanSaathi auto-call to confirm — right away or at a scheduled time."
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

          {/* cart + total + place */}
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

            {/* customer */}
            <label className="text-muted-foreground mb-1 flex items-center gap-1.5 text-xs font-medium">
              <User className="size-3.5" /> Customer
            </label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className={cx(INPUT, 'mb-1')}
            >
              <option value="">Select a saved customer…</option>
              {callers.map((c) => (
                <option key={c.user_id} value={c.user_id}>
                  {c.name || c.user_id}
                  {c.facts.contact ? '' : ' — no phone'}
                </option>
              ))}
            </select>
            {noPhone && (
              <p className="text-destructive mb-3 text-xs">
                No phone number on file — add one on the caller page to enable the confirmation
                call.
              </p>
            )}
            {optedOut && (
              <p className="text-destructive mb-3 text-xs">This customer has opted out of calls.</p>
            )}

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

            {/* delivery slot */}
            <label className="text-muted-foreground mt-1 mb-1 block text-xs font-medium">
              Delivery slot (optional)
            </label>
            <input
              value={slot}
              onChange={(e) => setSlot(e.target.value)}
              placeholder="e.g. morning, kal shaam"
              className={cx(INPUT, 'mb-3')}
            />

            <Button
              onClick={calculate}
              disabled={busy || cartEntries.length === 0}
              variant="outline"
              className="w-full gap-1.5"
            >
              <Receipt className="size-4" /> {busy ? 'Totalling…' : 'Preview total'}
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

            {/* place + confirm */}
            <div className="mt-5 space-y-2 border-t pt-4">
              <Button
                onClick={() => place()}
                disabled={placing || cartEntries.length === 0 || !customer || noPhone || optedOut}
                className="w-full gap-1.5"
              >
                <PhoneOutgoing className="size-4" />
                {placing ? 'Placing…' : 'Place & confirm now'}
              </Button>

              <div className="flex gap-2">
                <input
                  type="datetime-local"
                  value={scheduleAt}
                  min={localNow()}
                  onChange={(e) => setScheduleAt(e.target.value)}
                  className={cx(INPUT, 'flex-1')}
                  aria-label="Schedule confirmation call"
                />
                <Button
                  onClick={scheduleCall}
                  disabled={
                    placing ||
                    cartEntries.length === 0 ||
                    !customer ||
                    noPhone ||
                    optedOut ||
                    !scheduleAt
                  }
                  variant="outline"
                  className="gap-1.5"
                >
                  <CalendarClock className="size-4" /> Schedule
                </Button>
              </div>
              <p className="text-muted-foreground text-[11px]">
                Scheduled calls fire from the running server (up to 24h ahead) and are lost if it
                restarts.
              </p>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
