'use client';

import { useMemo, useState } from 'react';
import {
  Boxes,
  Database,
  IndianRupee,
  PackageCheck,
  PackageX,
  Pencil,
  Save,
  Search,
  TriangleAlert,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { LOW_STOCK, type Product, cx, fmtInr, useCatalogue } from '@/components/app/dashboard/data';
import {
  EmptyState,
  LoadingRow,
  PageHeader,
  StatCard,
  StatusPill,
  type Tone,
} from '@/components/app/dashboard/kit';
import { Button } from '@/components/ui/button';

const INPUT =
  'border-input bg-background focus-visible:ring-ring/50 h-9 w-full rounded-md border px-3 text-sm outline-none focus-visible:ring-2';

type Level = 'out' | 'low' | 'in';
function level(p: Product): Level {
  if (p.stock_qty <= 0) return 'out';
  if (p.stock_qty <= LOW_STOCK) return 'low';
  return 'in';
}
const LEVEL_TONE: Record<Level, Tone> = { out: 'danger', low: 'info', in: 'success' };
const LEVEL_LABEL: Record<Level, string> = { out: 'Out of stock', low: 'Low', in: 'In stock' };

// Catalogue & Stock — REAL inventory from the SQLite catalogue table via
// useCatalogue(). Same rows the voice agent quotes from; edits PATCH back.
export default function CataloguePage() {
  const { catalogue, categories, db, loading, error, patch } = useCatalogue();

  const [query, setQuery] = useState('');
  const [cat, setCat] = useState('all');
  const [editing, setEditing] = useState<string | null>(null);
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [busy, setBusy] = useState(false);

  const stats = useMemo(() => {
    const inStock = catalogue.filter((p) => level(p) === 'in').length;
    const low = catalogue.filter((p) => level(p) === 'low').length;
    const out = catalogue.filter((p) => level(p) === 'out').length;
    const value = catalogue.reduce((s, p) => s + p.unit_price * p.stock_qty, 0);
    return { inStock, low, out, value };
  }, [catalogue]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalogue.filter((p) => {
      if (cat !== 'all' && p.category !== cat) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || (p.category ?? '').toLowerCase().includes(q);
    });
  }, [catalogue, query, cat]);

  const startEdit = (p: Product) => {
    setEditing(p.name);
    setPrice(String(p.unit_price));
    setStock(String(p.stock_qty));
  };

  const save = async (p: Product) => {
    const shop_price = Number(price);
    const stock_qty = Number(stock);
    if (
      !Number.isFinite(shop_price) ||
      !Number.isFinite(stock_qty) ||
      shop_price < 0 ||
      stock_qty < 0
    ) {
      toast.error('Price and stock must be 0 or more');
      return;
    }
    setBusy(true);
    try {
      const ok = await patch(p.name, { shop_price, stock_qty });
      if (ok) {
        toast.success(`Updated ${p.name}`);
        setEditing(null);
      } else {
        toast.error('Update failed');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Catalogue & Stock"
        sub="Live inventory the voice agent quotes from. Edit a price or stock level and it applies to the next call."
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={Boxes}
          tone="brand"
          label="Items"
          value={catalogue.length}
          hint={`${categories.length} categories`}
        />
        <StatCard
          icon={PackageCheck}
          tone="success"
          label="In stock"
          value={stats.inStock}
          hint={stats.low > 0 ? `${stats.low} running low` : 'all healthy'}
        />
        <StatCard
          icon={PackageX}
          tone={stats.out > 0 ? 'danger' : 'neutral'}
          label="Out of stock"
          value={stats.out}
          hint={stats.out > 0 ? 'needs restock' : 'none'}
        />
        <StatCard
          icon={IndianRupee}
          tone="info"
          label="Inventory value"
          value={fmtInr(stats.value)}
          hint="stock × shop price"
        />
      </div>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search item or category…"
            className={cx(INPUT, 'pl-9')}
          />
        </div>
        <select
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          className={cx(INPUT, 'capitalize sm:w-52')}
          aria-label="Filter by category"
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <LoadingRow label="Loading catalogue…" />
      ) : error ? (
        <EmptyState
          icon={Database}
          title="Catalogue store unreachable"
          sub="The /api/catalogue endpoint did not respond. The dashboard does not fabricate stock — run the app with the backend SQLite store present to see real items."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title={catalogue.length === 0 ? 'Catalogue is empty' : 'No matching items'}
          sub={
            catalogue.length === 0
              ? 'The catalogue table has no rows yet. Run the voice agent once — it seeds the shop inventory on first start.'
              : undefined
          }
        />
      ) : (
        <div className="bg-card overflow-hidden rounded-2xl border">
          <div className="text-muted-foreground bg-muted/40 hidden grid-cols-[1.6fr_1fr_0.9fr_0.9fr_auto] gap-4 border-b px-5 py-3 text-xs font-medium sm:grid">
            <span>Item</span>
            <span>Category</span>
            <span className="text-right">Shop price</span>
            <span className="text-right">Stock</span>
            <span className="w-24 text-right">Status</span>
          </div>
          <ul className="divide-y">
            {filtered.map((p) => {
              const lv = level(p);
              const isEditing = editing === p.name;
              return (
                <li
                  key={p.name}
                  className="grid grid-cols-2 items-center gap-x-4 gap-y-2 px-5 py-3.5 text-sm sm:grid-cols-[1.6fr_1fr_0.9fr_0.9fr_auto]"
                >
                  <div className="min-w-0">
                    <div className="truncate font-semibold capitalize">{p.name}</div>
                    <div className="text-muted-foreground text-xs">per {p.unit ?? 'unit'}</div>
                  </div>

                  <div className="text-muted-foreground hidden capitalize sm:block">
                    {p.category ?? '—'}
                  </div>

                  <div className="text-right tabular-nums sm:text-right">
                    {isEditing ? (
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className={cx(INPUT, 'ml-auto h-8 max-w-24 text-right')}
                        aria-label="Shop price"
                      />
                    ) : (
                      <span className="font-medium">{fmtInr(p.unit_price)}</span>
                    )}
                  </div>

                  <div className="text-right tabular-nums">
                    {isEditing ? (
                      <input
                        type="number"
                        min={0}
                        step="0.5"
                        value={stock}
                        onChange={(e) => setStock(e.target.value)}
                        className={cx(INPUT, 'ml-auto h-8 max-w-20 text-right')}
                        aria-label="Stock quantity"
                      />
                    ) : (
                      <span className={cx(lv === 'out' && 'text-destructive font-medium')}>
                        {p.stock_qty} {p.unit ?? ''}
                      </span>
                    )}
                  </div>

                  <div className="col-span-2 flex items-center justify-end gap-2 sm:col-span-1">
                    {!isEditing && (
                      <StatusPill tone={LEVEL_TONE[lv]} pulse={lv === 'out'}>
                        {LEVEL_LABEL[lv]}
                      </StatusPill>
                    )}
                    {isEditing ? (
                      <>
                        <Button
                          size="sm"
                          onClick={() => save(p)}
                          disabled={busy}
                          className="h-8 gap-1.5"
                        >
                          <Save className="size-3.5" /> Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditing(null)}
                          disabled={busy}
                          className="h-8 px-2"
                          aria-label="Cancel"
                        >
                          <X className="size-4" />
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEdit(p)}
                        className="text-muted-foreground hover:text-foreground h-8 px-2"
                        aria-label={`Edit ${p.name}`}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {db && (
        <p className="text-muted-foreground mt-4 flex items-center gap-1.5 text-xs">
          <TriangleAlert className="size-3.5 text-amber-500" />
          Low-stock threshold is {LOW_STOCK} {`—`} items at or below show as “Low”.
        </p>
      )}
    </div>
  );
}
