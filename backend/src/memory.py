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


# ---- async wrappers (sqlite is blocking; keep the agent event loop free) ----
async def aget_caller(user_id: str) -> Optional[CallerRecord]:
    return await asyncio.to_thread(get_caller, user_id)


async def aupsert_caller(user_id: str, **kwargs: Any) -> CallerRecord:
    return await asyncio.to_thread(lambda: upsert_caller(user_id, **kwargs))


async def adelete_caller(user_id: str) -> bool:
    return await asyncio.to_thread(delete_caller, user_id)


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
        print("memory selfcheck: OK", f"({path})")
    finally:
        os.unlink(path)


if __name__ == "__main__":
    _selfcheck()
