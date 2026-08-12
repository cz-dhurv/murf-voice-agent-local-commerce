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
import logging
import os
import re
import secrets
import sqlite3
from contextlib import contextmanager
from typing import Any, Iterator, Optional, TypedDict

logger = logging.getLogger("memory")

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
        # Day 7: requests the agent hands off to a human (order disputes, scheme/
        # paperwork help). status: open -> in_progress -> resolved. One row per
        # caller+category stays open at a time (see create_escalation dedupe).
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS escalations (
                escalation_id    TEXT PRIMARY KEY,
                user_id          TEXT,
                caller_name      TEXT,
                reason_category  TEXT NOT NULL,
                summary          TEXT NOT NULL,
                urgency          TEXT NOT NULL DEFAULT 'medium',
                language         TEXT,
                follow_up_method TEXT,
                status           TEXT NOT NULL DEFAULT 'open',
                created_at       TEXT,
                updated_at       TEXT
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


# ---- booking: phone + itemised bill (Local Commerce) ----
def normalize_phone(raw: str) -> Optional[str]:
    """Return a clean 10-digit Indian mobile number, or None if it isn't one.

    Strips spaces, dashes, and a +91 / 0 prefix. A booking needs a real number
    the shop can call back, so anything that isn't 10 digits starting 6-9 is
    rejected — the agent then asks again instead of booking a bad contact.
    """
    digits = re.sub(r"\D", "", raw or "")
    if len(digits) == 12 and digits.startswith("91"):
        digits = digits[2:]
    elif len(digits) == 11 and digits.startswith("0"):
        digits = digits[1:]
    if len(digits) == 10 and digits[0] in "6789":
        return digits
    return None


# Spoken form of catalogue units, so an order reads naturally over the phone
# ("2 litre milk", "5 kilo basmati rice") instead of the unreadable "milk x2".
# Falls back to the raw unit for anything unmapped.
_UNIT_SPOKEN = {"kg": "kilo", "litre": "litre", "packet": "packet", "piece": "piece"}


def order_line_phrase(li: dict[str, Any]) -> str:
    """One order line as a human/phone-friendly phrase, e.g. "2 litre milk".

    `li` is a line item from compute_order_total (has quantity_asked, unit, name).
    """
    qty = f"{li['quantity_asked']:g}"
    unit = _UNIT_SPOKEN.get(li.get("unit") or "", li.get("unit") or "")
    return " ".join(p for p in (qty, unit, li["name"]) if p)


def build_bill(items: list[dict[str, Any]], phone: str) -> dict[str, Any]:
    """Price an order at shop rates and wrap it as a caller bill.

    Prices come from the catalogue (never the caller/LLM), so the stored bill is
    the shop's own truth. Returns the order total dict plus `phone` and a short
    `summary` line — the dashboard shows it as a fact AND the agent speaks it on
    the confirmation call, so it must read naturally out loud (no "x2").
    """
    order = compute_order_total(items)
    parts = [order_line_phrase(li) for li in order["line_items"]]
    summary = f"{', '.join(parts)} = ₹{order['total']:g}" if parts else "no billable items"
    return {**order, "phone": phone, "summary": summary}


# ---- escalations (Day 7: know when to ask a human for help) ----
# Two things the agent must hand to a person instead of guessing at.
_REASON_CATEGORIES = ("order_dispute", "scheme_paperwork")
_URGENCIES = ("low", "medium", "high", "emergency")
# Urgency rank for list ordering: most urgent first, then newest.
_URGENCY_ORDER = (
    "CASE urgency WHEN 'emergency' THEN 0 WHEN 'high' THEN 1 "
    "WHEN 'medium' THEN 2 ELSE 3 END"
)

# Sensitive tokens that must NEVER reach storage, the dashboard, or Discord —
# a safety net UNDER the prompt rule (the agent is told not to include these, but
# we never trust an LLM with secret data). Order: labelled OTP/PIN first, then
# bare Aadhaar-shaped (12 digits) and bank-account-shaped (9-18 digit) runs.
_SENSITIVE_PATTERNS = [
    re.compile(r"\b(?:otp|pin|password|cvv|passcode)\b\D{0,8}\d{3,8}", re.I),
    re.compile(r"\b\d{4}\s?\d{4}\s?\d{4}\b"),
    re.compile(r"\b\d{9,18}\b"),
]


def _redact(text: str) -> str:
    """Replace OTP/PIN/Aadhaar/bank-account-shaped tokens with [redacted]."""
    clean = text or ""
    for pat in _SENSITIVE_PATTERNS:
        clean = pat.sub("[redacted]", clean)
    return clean


def create_escalation(
    user_id: Optional[str],
    reason_category: str,
    summary: str,
    *,
    urgency: str = "medium",
    caller_name: Optional[str] = None,
    language: Optional[str] = None,
    follow_up_method: Optional[str] = None,
) -> dict[str, Any]:
    """Log a request for human help, redacting sensitive tokens from the summary.

    De-dupe: if this caller already has a non-resolved escalation in the SAME
    category, refresh it (summary/urgency) instead of filing a second — a caller
    who repeats themselves must not spam the shopkeeper. Anonymous callers (no
    user_id) can't be de-duped, so each of theirs is filed fresh.
    Returns {"escalation_id": str, "created": bool}.
    """
    category = reason_category if reason_category in _REASON_CATEGORIES else "other"
    level = urgency if urgency in _URGENCIES else "medium"
    clean_summary = _redact(summary or "").strip()[:600]
    with _connect() as conn:
        if user_id:
            existing = conn.execute(
                "SELECT escalation_id FROM escalations "
                "WHERE user_id = ? AND reason_category = ? AND status != 'resolved'",
                (user_id, category),
            ).fetchone()
            if existing:
                eid = existing["escalation_id"]
                conn.execute(
                    "UPDATE escalations SET summary = ?, urgency = ?, "
                    "updated_at = datetime('now') WHERE escalation_id = ?",
                    (clean_summary, level, eid),
                )
                return {"escalation_id": eid, "created": False}
        eid = "ESC-" + secrets.token_hex(3).upper()
        conn.execute(
            "INSERT INTO escalations (escalation_id, user_id, caller_name, "
            "reason_category, summary, urgency, language, follow_up_method, status, "
            "created_at, updated_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', datetime('now'), datetime('now'))",
            (eid, user_id, caller_name, category, clean_summary, level, language,
             follow_up_method),
        )
    return {"escalation_id": eid, "created": True}


def list_escalations(status: Optional[str] = None) -> list[dict[str, Any]]:
    """All escalations (or one status), most-urgent-then-newest first."""
    query = "SELECT * FROM escalations"
    params: tuple[Any, ...] = ()
    if status:
        query += " WHERE status = ?"
        params = (status,)
    query += f" ORDER BY {_URGENCY_ORDER}, datetime(created_at) DESC"
    with _connect() as conn:
        rows = conn.execute(query, params).fetchall()
    return [dict(r) for r in rows]


def get_escalation(escalation_id: str) -> Optional[dict[str, Any]]:
    with _connect() as conn:
        row = conn.execute(
            "SELECT * FROM escalations WHERE escalation_id = ?", (escalation_id,)
        ).fetchone()
    return dict(row) if row else None


def update_escalation_status(escalation_id: str, status: str) -> bool:
    """Move an escalation between open/in_progress/resolved. False on unknown status."""
    if status not in ("open", "in_progress", "resolved"):
        return False
    with _connect() as conn:
        cur = conn.execute(
            "UPDATE escalations SET status = ?, updated_at = datetime('now') "
            "WHERE escalation_id = ?",
            (status, escalation_id),
        )
    return cur.rowcount > 0


async def send_discord_alert(esc: dict[str, Any]) -> bool:
    """Best-effort ping to a Discord webhook when an escalation is filed.

    The DB row is the source of truth; this is a convenience so a human sees it
    immediately. No-ops (returns False) when DISCORD_ESCALATION_WEBHOOK_URL is
    unset, and never raises into the call path — a failed alert is logged, not fatal.
    """
    url = os.getenv("DISCORD_ESCALATION_WEBHOOK_URL", "").strip()
    if not url or not esc:
        return False
    emoji = {"emergency": "🔴", "high": "🟠", "medium": "🟡", "low": "🟢"}.get(
        esc.get("urgency", ""), "🟡"
    )
    cat = {"order_dispute": "Order dispute", "scheme_paperwork": "Scheme / paperwork"}.get(
        esc.get("reason_category", ""), esc.get("reason_category") or "other"
    )
    who = esc.get("caller_name") or esc.get("user_id") or "unknown caller"
    lines = [
        f"{emoji} **Human help needed** · `{esc.get('escalation_id', '')}`",
        f"**{cat}** — urgency **{esc.get('urgency', 'medium')}**",
        f"Caller: {who}",
        f"> {esc.get('summary') or '(no summary)'}",
    ]
    if esc.get("follow_up_method"):
        lines.append(f"Follow up via: {esc['follow_up_method']}")
    try:
        import httpx  # lazy: keeps memory.py stdlib-only at import time

        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(url, json={"content": "\n".join(lines)})
        return resp.status_code < 300
    except Exception:
        logger.warning("discord escalation alert failed", exc_info=True)
        return False



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


async def abuild_bill(items: list[dict[str, Any]], phone: str) -> dict[str, Any]:
    return await asyncio.to_thread(build_bill, items, phone)


async def acreate_escalation(
    user_id: Optional[str], reason_category: str, summary: str, **kwargs: Any
) -> dict[str, Any]:
    return await asyncio.to_thread(
        lambda: create_escalation(user_id, reason_category, summary, **kwargs)
    )


async def aget_escalation(escalation_id: str) -> Optional[dict[str, Any]]:
    return await asyncio.to_thread(get_escalation, escalation_id)


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

        # phone: accept clean/prefixed 10-digit mobiles, reject junk
        assert normalize_phone("98765 43210") == "9876543210"
        assert normalize_phone("+91 98765-43210") == "9876543210"
        assert normalize_phone("098765 43210") == "9876543210"
        assert normalize_phone("12345") is None          # too short
        assert normalize_phone("1234567890") is None      # bad leading digit
        assert normalize_phone("") is None

        # bill: priced from the catalogue, carries phone + a spoken summary that
        # reads naturally out loud ("2 kilo rice", never "rice x2").
        bill = build_bill([{"item_name": "rice", "quantity": 2}], "9876543210")
        assert bill["total"] == round(58.0 * 2, 2)
        assert bill["phone"] == "9876543210"
        assert bill["summary"] == "2 kilo rice = ₹116", bill["summary"]
        assert "x" not in bill["summary"]  # the old "rice x2" bug must stay gone
        # multi-line order reads with each item's own unit
        two = build_bill(
            [{"item_name": "milk", "quantity": 2}, {"item_name": "basmati rice", "quantity": 5}],
            "9876543210",
        )
        assert two["summary"] == "2 litre milk, 5 kilo basmati rice = ₹587", two["summary"]

        # escalations (Day 7): file, redact, dedupe, status transitions, ordering
        e1 = create_escalation(
            "u9", "order_dispute", "Paid but order not delivered. OTP is 445566.",
            urgency="high", caller_name="Sita",
        )
        assert e1["created"] is True and e1["escalation_id"].startswith("ESC-")
        row = get_escalation(e1["escalation_id"])
        assert row and row["status"] == "open" and row["urgency"] == "high"
        # sensitive token stripped, rest of the summary kept
        assert "445566" not in row["summary"] and "[redacted]" in row["summary"], row["summary"]
        assert "not delivered" in row["summary"]
        # dedupe: same caller + category while open -> refresh, no second row
        e2 = create_escalation("u9", "order_dispute", "Still nothing, very upset", urgency="emergency")
        assert e2["created"] is False and e2["escalation_id"] == e1["escalation_id"]
        assert get_escalation(e1["escalation_id"])["urgency"] == "emergency"  # refreshed
        assert len(list_escalations()) == 1
        # a different category is its own escalation
        e3 = create_escalation("u9", "scheme_paperwork", "Needs help with PM SVANidhi form")
        assert e3["created"] is True and e3["escalation_id"] != e1["escalation_id"]
        assert len(list_escalations()) == 2
        # resolving frees the dedupe slot -> a later same-category request files fresh
        assert update_escalation_status(e1["escalation_id"], "resolved") is True
        assert update_escalation_status(e1["escalation_id"], "bogus") is False
        e4 = create_escalation("u9", "order_dispute", "A brand new dispute")
        assert e4["created"] is True and e4["escalation_id"] != e1["escalation_id"]
        # redaction also covers Aadhaar- and bank-account-shaped digit runs
        r = _redact("aadhaar 1234 5678 9012 and account 123456789012345 pending")
        assert "1234 5678 9012" not in r and "123456789012345" not in r, r
        # most-urgent-first ordering (the resolved emergency still sorts to the top)
        assert list_escalations()[0]["urgency"] == "emergency"

        print("memory selfcheck: OK", f"({path})")
    finally:
        os.unlink(path)


if __name__ == "__main__":
    _selfcheck()
