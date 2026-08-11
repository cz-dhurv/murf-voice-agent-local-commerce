"""Trigger an outbound order-confirmation call.

Dispatches the `my-agent` worker into a fresh room with call metadata; the agent
(agent.py `_dial_and_confirm`) then dials the customer over the Twilio SIP trunk
and speaks the mandatory who/why/opt-out opening. Inbound browser calls are
unaffected — they carry no metadata and never hit this path.

    # confirm the order we already have on file for a remembered caller
    python scripts/call_customer.py --caller <caller_id>

    # or an ad-hoc call with an explicit number + order line
    python scripts/call_customer.py --phone "98765 43210" --order "5kg atta = ₹210" --slot morning

    python scripts/call_customer.py --selfcheck    # offline: assert resolve/skip/E.164

Callers who opted out (facts do_not_call == "true") are refused here, before any
dispatch — the opt-out is honoured even if someone triggers a call by mistake.

Needs LIVEKIT_URL / LIVEKIT_API_KEY / LIVEKIT_API_SECRET (and, for a real call to
connect, LIVEKIT_SIP_OUTBOUND_TRUNK_ID) in .env.local.
"""

import argparse
import asyncio
import json
import sys
import uuid
from typing import Any, Optional

from dotenv import load_dotenv

import memory

AGENT_NAME = "my-agent"


class SkipCall(Exception):
    """Raised when a caller must not be dialled (opted out, or no valid number)."""


def resolve_call(
    rec: Optional[dict[str, Any]],
    *,
    phone: str = "",
    order: str = "",
    slot: str = "",
) -> dict[str, str]:
    """Build the dispatch metadata for one outbound call, or raise SkipCall.

    Explicit args win over the caller's saved facts, so an ad-hoc call needs no
    stored record. Honours the do_not_call opt-out and refuses a caller with no
    reachable mobile — the two reasons we must never place the call.
    """
    facts = (rec or {}).get("facts", {}) or {}
    if facts.get("do_not_call") == "true":
        raise SkipCall("caller has opted out of calls (do_not_call)")

    raw_phone = phone or facts.get("contact", "")
    clean = memory.normalize_phone(raw_phone)
    if not clean:
        raise SkipCall(f"no valid 10-digit mobile to call (got {raw_phone!r})")

    return {
        "phone_number": f"+91{clean}",  # E.164; the agent re-normalizes defensively
        "order_summary": order or facts.get("last_bill", ""),
        "delivery_slot": slot or facts.get("delivery_slot", ""),
        "caller_id": (rec or {}).get("user_id", "") or "",
    }


async def dispatch(meta: dict[str, str]) -> str:
    """Create a room-scoped dispatch of the agent with `meta`. Returns the room."""
    from livekit import api

    import os

    room = f"outbound-{uuid.uuid4().hex[:12]}"
    lk = api.LiveKitAPI(
        url=os.environ["LIVEKIT_URL"],
        api_key=os.environ["LIVEKIT_API_KEY"],
        api_secret=os.environ["LIVEKIT_API_SECRET"],
    )
    try:
        await lk.agent_dispatch.create_dispatch(
            api.CreateAgentDispatchRequest(
                agent_name=AGENT_NAME,
                room=room,
                metadata=json.dumps(meta, ensure_ascii=False),
            )
        )
    finally:
        await lk.aclose()
    return room


def _selfcheck() -> None:
    # resolve from saved facts
    rec = {
        "user_id": "web-abc",
        "facts": {
            "contact": "Ramesh 9876543210",
            "last_bill": "5kg atta = ₹210",
            "delivery_slot": "morning",
        },
    }
    m = resolve_call(rec)
    assert m["phone_number"] == "+919876543210", m  # name stripped, E.164 built
    assert m["order_summary"] == "5kg atta = ₹210"
    assert m["delivery_slot"] == "morning"
    assert m["caller_id"] == "web-abc"

    # explicit args override stored facts
    m = resolve_call(rec, phone="+91 98765-00000", order="1L milk", slot="shaam")
    assert m["phone_number"] == "+919876500000", m
    assert m["order_summary"] == "1L milk" and m["delivery_slot"] == "shaam"

    # opt-out is refused before anything else, even with a valid number present
    try:
        resolve_call({"user_id": "x", "facts": {"contact": "9876543210", "do_not_call": "true"}})
        raise AssertionError("opted-out caller must be skipped")
    except SkipCall as e:
        assert "opted out" in str(e)

    # no reachable number -> skip (bad leading digit, junk, empty)
    for bad in ({"facts": {"contact": "12345"}}, {"facts": {}}, None):
        try:
            resolve_call(bad)
            raise AssertionError(f"should have skipped: {bad!r}")
        except SkipCall as e:
            assert "no valid" in str(e)

    # ad-hoc call with no record at all, phone given explicitly
    m = resolve_call(None, phone="9812345678", order="tea packet")
    assert m["phone_number"] == "+919812345678" and m["caller_id"] == ""

    print("call_customer selfcheck: OK")


def main() -> int:
    ap = argparse.ArgumentParser(description="Trigger an outbound order-confirmation call.")
    ap.add_argument("--caller", help="caller_id whose saved order/phone to confirm")
    ap.add_argument("--phone", default="", help="explicit mobile (overrides saved contact)")
    ap.add_argument("--order", default="", help="order summary to read back")
    ap.add_argument("--slot", default="", help="delivery slot to confirm")
    ap.add_argument("--dry-run", action="store_true", help="resolve + print metadata, don't dial")
    ap.add_argument("--selfcheck", action="store_true", help="run offline logic asserts and exit")
    args = ap.parse_args()

    if args.selfcheck:
        _selfcheck()
        return 0

    load_dotenv(".env.local")
    memory.init_db()

    rec = None
    if args.caller:
        rec = memory.get_caller(args.caller)
        if rec is None and not args.phone:
            print(f"No caller {args.caller!r} on file and no --phone given.", file=sys.stderr)
            return 2

    try:
        meta = resolve_call(rec, phone=args.phone, order=args.order, slot=args.slot)
    except SkipCall as e:
        print(f"Not calling: {e}", file=sys.stderr)
        return 1

    if args.dry_run:
        print(json.dumps(meta, ensure_ascii=False, indent=2))
        return 0

    room = asyncio.run(dispatch(meta))
    print(f"Dispatched {AGENT_NAME} to room {room} — calling {meta['phone_number']}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
