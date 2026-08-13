import json
import sqlite3

import memory


def test_call_lifecycle_records_success_without_conversation_content(tmp_path) -> None:
    original = memory._DB_PATH
    memory._DB_PATH = str(tmp_path / "analytics.db")
    try:
        memory.init_db()
        memory.start_call("room-1", "caller-private", "browser", "hi")
        memory.end_call(
            "room-1",
            "success",
            track_outcome={"order_placed": True, "escalation_filed": False},
        )

        with sqlite3.connect(memory._DB_PATH) as conn:
            conn.row_factory = sqlite3.Row
            row = conn.execute(
                "SELECT * FROM calls WHERE call_id = 'room-1'"
            ).fetchone()

        assert row is not None
        assert row["outcome"] == "success"
        assert row["failure_type"] is None
        assert row["duration_sec"] is not None and row["duration_sec"] >= 0
        assert json.loads(row["track_outcome"])["order_placed"] is True
        columns = set(row.keys())
        assert "transcript" not in columns
        assert "phone" not in columns
    finally:
        memory._DB_PATH = original


def test_call_lifecycle_records_failure_reason(tmp_path) -> None:
    original = memory._DB_PATH
    memory._DB_PATH = str(tmp_path / "analytics.db")
    try:
        memory.init_db()
        memory.start_call("room-2", None, "sip_outbound", None)
        memory.end_call("room-2", "failed", failure_type="not_connected")

        with sqlite3.connect(memory._DB_PATH) as conn:
            row = conn.execute(
                "SELECT outcome, failure_type FROM calls WHERE call_id = 'room-2'"
            ).fetchone()

        assert row == ("failed", "not_connected")
    finally:
        memory._DB_PATH = original
