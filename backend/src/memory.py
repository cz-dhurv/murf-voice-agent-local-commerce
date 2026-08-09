"""Persistent caller memory for DukaanSaathi.

SQLite via the stdlib — zero dependency, and the file survives a full agent
restart (the Day 4 requirement). Postgres would be overkill for one table.
ponytail: single-table key/value; move to Postgres only if we outgrow one file.

The agent reads/writes this through function tools, never through the prompt.
`facts` is a free-form JSON blob so each track can store whatever matters
(for Local Commerce: past orders, usual quantities, preferred delivery slot).
"""

import asyncio
import json
import os
import sqlite3
from contextlib import contextmanager
from typing import Any, Iterator, Optional, TypedDict

_DB_PATH = os.getenv(
    "MEMORY_DB_PATH",
    os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "memory.db"),
)

# Day 5: the shop's own catalogue — a hand-built LOCAL dataset, not a live market
# feed. Prices are the shop's own rates in ₹; stock is in the item's unit.
# ponytail: seeded once via INSERT OR IGNORE, so editing a price here won't change
# an already-seeded row — the shopkeeper maintains the DB. Delete memory.db to reseed.
# Deliberate demo cases: onion is out of stock; "oil" is ambiguous (two oils).
_SEED_CATALOGUE = [
    # (item_name, category, unit, shop_price, stock_qty)
    ("rice", "staples", "kg", 58.0, 120.0),
    ("basmati rice", "staples", "kg", 95.0, 40.0),
    ("wheat flour", "staples", "kg", 42.0, 200.0),
    ("atta", "staples", "kg", 42.0, 200.0),  # Hindi name shoppers actually say
    ("sugar", "staples", "kg", 45.0, 80.0),
    ("salt", "staples", "kg", 22.0, 60.0),
    ("toor dal", "staples", "kg", 130.0, 35.0),
    ("onion", "vegetables", "kg", 35.0, 0.0),  # out of stock (graceful-path demo)
    ("potato", "vegetables", "kg", 28.0, 90.0),
    ("tomato", "vegetables", "kg", 40.0, 25.0),
    ("sunflower oil", "oils", "litre", 145.0, 30.0),
    ("mustard oil", "oils", "litre", 165.0, 20.0),
    ("tea", "packaged", "packet", 140.0, 50.0),
    ("biscuits", "packaged", "packet", 30.0, 100.0),
    ("soap", "packaged", "piece", 35.0, 75.0),
    ("shampoo", "packaged", "piece", 90.0, 40.0),
    ("detergent", "packaged", "kg", 110.0, 45.0),
    ("milk", "dairy", "litre", 56.0, 60.0),
]


class CallerRecord(TypedDict):
    user_id: str
    name: Optional[str]
    language_preference: Optional[str]
    facts: dict[str, Any]
    last_interaction: Optional[str]


@contextmanager
def _connect() -> Iterator[sqlite3.Connection]:
    """Open a connection that commits on success and always closes.

    `with sqlite3.connect(...)` alone commits but leaves the handle open — on
    Windows that holds a file lock, so we manage close() explicitly here.
    """
    os.makedirs(os.path.dirname(_DB_PATH), exist_ok=True)
    conn = sqlite3.connect(_DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        with conn:
            yield conn
    finally:
        conn.close()


def init_db() -> None:
    with _connect() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS callers (
                user_id             TEXT PRIMARY KEY,
                name                TEXT,
                language_preference TEXT,
                facts               TEXT NOT NULL DEFAULT '{}',
                last_interaction    TEXT
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS catalogue (
                item_name   TEXT PRIMARY KEY,
                category    TEXT,
                unit        TEXT,
                shop_price  REAL NOT NULL,
                stock_qty   REAL NOT NULL
            )
            """
        )
        # Seed the shop's own local dataset. INSERT OR IGNORE keeps existing rows,
        # so a shopkeeper's price/stock edits survive a restart.
        conn.executemany(
            "INSERT OR IGNORE INTO catalogue "
            "(item_name, category, unit, shop_price, stock_qty) VALUES (?, ?, ?, ?, ?)",
            _SEED_CATALOGUE,
        )


def _row_to_record(row: sqlite3.Row) -> CallerRecord:
    return CallerRecord(
        user_id=row["user_id"],
        name=row["name"],
        language_preference=row["language_preference"],
        facts=json.loads(row["facts"] or "{}"),
        last_interaction=row["last_interaction"],
    )


def get_caller(user_id: str) -> Optional[CallerRecord]:
    with _connect() as conn:
        row = conn.execute(
            "SELECT * FROM callers WHERE user_id = ?", (user_id,)
        ).fetchone()
    return _row_to_record(row) if row else None


def upsert_caller(
    user_id: str,
    *,
    name: Optional[str] = None,
    language_preference: Optional[str] = None,
    facts: Optional[dict[str, Any]] = None,
) -> CallerRecord:
    """Create or update a caller. `facts` is merged into any existing facts
    (new keys win); name/language are only overwritten when provided."""
    existing = get_caller(user_id)
    merged_facts = dict(existing["facts"]) if existing else {}
    if facts:
        merged_facts.update(facts)
    new_name = name if name is not None else (existing["name"] if existing else None)
    new_lang = (
        language_preference
        if language_preference is not None
        else (existing["language_preference"] if existing else None)
    )
    with _connect() as conn:
        conn.execute(
            """
            INSERT INTO callers (user_id, name, language_preference, facts, last_interaction)
            VALUES (?, ?, ?, ?, datetime('now'))
            ON CONFLICT(user_id) DO UPDATE SET
                name                = excluded.name,
                language_preference = excluded.language_preference,
                facts               = excluded.facts,
                last_interaction    = excluded.last_interaction
            """,
            (user_id, new_name, new_lang, json.dumps(merged_facts, ensure_ascii=False)),
        )
    record = get_caller(user_id)
    assert record is not None  # just wrote it
    return record


def delete_caller(user_id: str) -> bool:
    """Wipe a caller's record ("forget me"). Returns True if a row was removed."""
    with _connect() as conn:
        cur = conn.execute("DELETE FROM callers WHERE user_id = ?", (user_id,))
    return cur.rowcount > 0


# ---- catalogue (Day 5: real function-call data over a local shop dataset) ----
def _product_row(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "name": row["item_name"],
        "category": row["category"],
        "unit": row["unit"],
        "unit_price": row["shop_price"],
        "in_stock": row["stock_qty"] > 0,
        "stock_qty": row["stock_qty"],
    }


def lookup_product(item_name: str, quantity: float = 1.0) -> dict[str, Any]:
    """Look up one item in the shop's catalogue, priced at the shop's own rate.

    Returns a status-tagged dict so the agent can react without guessing:
      - {"status": "found", unit_price, line_total, in_stock, stock_qty, unit, ...}
      - {"status": "ambiguous", "matches": [names]}  when the term hits >1 item
      - {"status": "not_found", "item_name": ...}     when nothing matches
    Raises sqlite3.Error on a DB failure — the calling tool turns that into a
    graceful spoken fallback rather than a crash.
    """
    term = (item_name or "").strip().lower()
    if not term:
        return {"status": "not_found", "item_name": item_name}
    with _connect() as conn:
        # An exact name wins outright, so "rice" resolves to rice and never reads
        # as ambiguous against "basmati rice".
        exact = conn.execute(
            "SELECT * FROM catalogue WHERE lower(item_name) = ?", (term,)
        ).fetchone()
        rows = (
            [exact]
            if exact
            else conn.execute(
                "SELECT * FROM catalogue WHERE item_name LIKE ? ORDER BY item_name",
                (f"%{term}%",),
            ).fetchall()
        )
    if not rows:
        return {"status": "not_found", "item_name": item_name}
    if len(rows) > 1:
        return {
            "status": "ambiguous",
            "item_name": item_name,
            "matches": [r["item_name"] for r in rows],
        }
    row = rows[0]
    qty = quantity if quantity and quantity > 0 else 1.0
    result = _product_row(row)
    result["status"] = "found"
    result["quantity_asked"] = qty
    result["line_total"] = round(row["shop_price"] * qty, 2)
    return result


def compute_order_total(items: list[dict[str, Any]]) -> dict[str, Any]:
    """Total an order at shop prices, flagging every item that can't be billed.

    `items` is a list of {"item_name": str, "quantity": float}. Out-of-stock,
    unknown, and ambiguous items are collected in `issues` (never silently
    dropped) so the agent can read both the total and the problems out loud.
    Raises sqlite3.Error on a DB failure (handled by the calling tool).
    """
    line_items: list[dict[str, Any]] = []
    issues: list[str] = []
    total = 0.0
    for entry in items or []:
        name = entry.get("item_name", "")
        qty = entry.get("quantity", 1) or 1
        res = lookup_product(name, qty)
        status = res.get("status")
        if status == "not_found":
            issues.append(f"{name} is not in the catalogue")
        elif status == "ambiguous":
            issues.append(
                f"{name} could be {' or '.join(res['matches'])} — ask which one"
            )
        elif not res.get("in_stock"):
            issues.append(f"{res['name']} is out of stock")
        else:
            line_items.append(res)
            total += res["line_total"]
    return {"line_items": line_items, "total": round(total, 2), "issues": issues}


# ---- async wrappers (sqlite is blocking; keep the agent event loop free) ----
async def aget_caller(user_id: str) -> Optional[CallerRecord]:
    return await asyncio.to_thread(get_caller, user_id)


async def aupsert_caller(user_id: str, **kwargs: Any) -> CallerRecord:
    return await asyncio.to_thread(lambda: upsert_caller(user_id, **kwargs))


async def adelete_caller(user_id: str) -> bool:
    return await asyncio.to_thread(delete_caller, user_id)


async def alookup_product(item_name: str, quantity: float = 1.0) -> dict[str, Any]:
    return await asyncio.to_thread(lookup_product, item_name, quantity)


async def acompute_order_total(items: list[dict[str, Any]]) -> dict[str, Any]:
    return await asyncio.to_thread(compute_order_total, items)


def _selfcheck() -> None:
    """Run against a throwaway DB: assert persistence, merge, and delete work."""
    global _DB_PATH
    import tempfile

    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    os.unlink(path)  # let sqlite create it fresh
    _DB_PATH = path
    try:
        init_db()
        assert get_caller("u1") is None
        upsert_caller("u1", name="Ramesh", language_preference="hi", facts={"crop": "cotton"})
        rec = get_caller("u1")
        assert rec and rec["name"] == "Ramesh" and rec["facts"]["crop"] == "cotton"
        # merge: new fact added, existing kept, name preserved when omitted
        upsert_caller("u1", facts={"delivery_slot": "morning"})
        rec = get_caller("u1")
        assert rec["name"] == "Ramesh", "name must survive a facts-only update"
        assert rec["facts"] == {"crop": "cotton", "delivery_slot": "morning"}
        assert rec["last_interaction"]  # timestamp set

        # persistence across a fresh connection (simulates agent restart)
        rec2 = get_caller("u1")
        assert rec2 and rec2["facts"]["crop"] == "cotton"

        # forget-me
        assert delete_caller("u1") is True
        assert get_caller("u1") is None
        assert delete_caller("u1") is False  # already gone

        # catalogue: seeded on init_db, priced at shop rates
        rice = lookup_product("rice", 2)
        assert rice["status"] == "found" and rice["line_total"] == round(58.0 * 2, 2)
        assert lookup_product("rice")["in_stock"] is True
        # exact name beats the LIKE fallback (rice != basmati rice ambiguity)
        assert lookup_product("rice")["name"] == "rice"
        # ambiguous term -> ask which one
        oil = lookup_product("oil")
        assert oil["status"] == "ambiguous" and len(oil["matches"]) == 2
        # unknown item -> not found (agent must not invent a price)
        assert lookup_product("caviar")["status"] == "not_found"
        # out of stock surfaces, never silently billed
        assert lookup_product("onion")["in_stock"] is False

        order = compute_order_total(
            [
                {"item_name": "rice", "quantity": 2},   # billed
                {"item_name": "onion", "quantity": 1},  # out of stock -> issue
                {"item_name": "caviar", "quantity": 1}, # unknown -> issue
                {"item_name": "oil", "quantity": 1},    # ambiguous -> issue
            ]
        )
        assert order["total"] == round(58.0 * 2, 2)
        assert len(order["line_items"]) == 1
        assert len(order["issues"]) == 3

        print("memory selfcheck: OK", f"({path})")
    finally:
        os.unlink(path)


if __name__ == "__main__":
    _selfcheck()
