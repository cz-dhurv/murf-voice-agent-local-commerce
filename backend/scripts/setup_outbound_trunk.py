"""One-time: register the Twilio SIP trunk with LiveKit for outbound calls.

Run this ONCE after the Twilio Elastic SIP Trunk is set up. It prints the
`ST_...` trunk id — copy that into .env.local as LIVEKIT_SIP_OUTBOUND_TRUNK_ID,
and the agent can then place outbound calls (scripts/call_customer.py).

    python scripts/setup_outbound_trunk.py

Reads from the environment (put them in .env.local, never commit real values):
    LIVEKIT_URL / LIVEKIT_API_KEY / LIVEKIT_API_SECRET
    TWILIO_SIP_TERM_URI   e.g. dukaansaathi-outbound.pstn.twilio.com
    TWILIO_SIP_USERNAME   the trunk's Credential List username
    TWILIO_SIP_PASSWORD   the trunk's Credential List password
    TWILIO_PHONE_NUMBER   your Twilio number in E.164, e.g. +15205232708

ponytail: idempotency is manual — re-running makes a second trunk. List/cleanup
with `lk sip outbound list` if you fumble one; not worth codifying for a one-shot.
"""

import asyncio
import os

from dotenv import load_dotenv
from livekit import api

load_dotenv(".env.local")


def _require(name: str) -> str:
    val = os.getenv(name, "").strip()
    if not val:
        raise SystemExit(f"Missing required env var {name} (set it in .env.local).")
    return val


async def main() -> None:
    term_uri = _require("TWILIO_SIP_TERM_URI")
    number = _require("TWILIO_PHONE_NUMBER")
    lk = api.LiveKitAPI(
        url=_require("LIVEKIT_URL"),
        api_key=_require("LIVEKIT_API_KEY"),
        api_secret=_require("LIVEKIT_API_SECRET"),
    )
    try:
        info = await lk.sip.create_sip_outbound_trunk(
            api.CreateSIPOutboundTrunkRequest(
                trunk=api.SIPOutboundTrunkInfo(
                    name="DukaanSaathi outbound (Twilio)",
                    address=term_uri,
                    transport=api.SIPTransport.SIP_TRANSPORT_AUTO,
                    numbers=[number],
                    auth_username=_require("TWILIO_SIP_USERNAME"),
                    auth_password=_require("TWILIO_SIP_PASSWORD"),
                )
            )
        )
    finally:
        await lk.aclose()

    print("\nOutbound trunk created.")
    print(f"  LIVEKIT_SIP_OUTBOUND_TRUNK_ID={info.sip_trunk_id}")
    print("\nAdd that line to .env.local, then run scripts/call_customer.py.")


if __name__ == "__main__":
    asyncio.run(main())
