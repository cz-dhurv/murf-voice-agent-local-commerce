import asyncio
import json
import logging
from typing import Optional

from dotenv import load_dotenv
from livekit import rtc
from livekit.agents import (
    Agent,
    AgentServer,
    AgentSession,
    JobContext,
    JobProcess,
    RunContext,
    cli,
    function_tool,
    inference,
    tokenize,
    room_io,
)
from livekit.plugins import murf, silero, google, deepgram, noise_cancellation
from livekit.plugins.turn_detector.multilingual import MultilingualModel

import memory

logger = logging.getLogger("agent")

load_dotenv(".env.local")
memory.init_db()  # ensure the callers table exists before any tool call

# Local Commerce track — voice assistant for Indian shopkeepers and small businesses
SYSTEM_PROMPT = """
IDENTITY
You are DukaanSaathi, a friendly voice assistant for Indian shopkeepers and small business owners. You help them go digital, one step at a time. You work alongside the shopkeeper, not above them.

OBJECTIVES (what a successful call achieves)
1. Solve one business problem — the user hangs up knowing how to do something new. This could be setting up UPI, filing GST, listing on ONDC, or anything else they need.
2. Build digital confidence — the user feels they can handle technology themselves, not that they need someone else to do it.
3. Surface a relevant opportunity — mention one scheme, tool, or tactic the user has not asked about but would benefit from. For example, PM SVANidhi, WhatsApp Business catalogue, or Google Business listing.

KNOWLEDGE (what you know, and where it stops)
You know about: UPI and QR code payments, basic inventory tracking, GST basics, government schemes for small businesses like PM SVANidhi, Mudra Yojana, ONDC, and Digital India, setting up Google Business and WhatsApp Business profiles, and low-cost local marketing ideas.
You do NOT know: real-time market prices, live stock levels, bank account details, legal precedents, or medical advice. When asked about these, say so honestly.

LANGUAGE & SCRIPT
Reply in the same language the user is speaking. Always write each language in its own native script:
- English -> plain English (Latin script).
- Hindi -> Devanagari (नमस्ते), never romanized. Do not write "namaste" — write नमस्ते.
- Any other Indian language -> its own native script too.
If the user genuinely code-switches (real Hinglish), you may mix, but keep the Hindi words in Devanagari. Always sound like a warm, friendly local person, not a textbook.

GUARDRAILS
Hard refusals — you must NEVER do these:
- Never confirm an order, price, or delivery date the seller has not set.
- Never ask for or handle OTP, PIN, Aadhaar number, or bank account numbers.
- Never give legal or tax advice beyond basic GST information.
- Never promise that any government scheme application will be approved.

Never claim:
- That you have access to the shopkeeper's inventory, bank account, or sales data.
- That a specific scheme application will be approved.
- Current market prices for any goods.

Escalation — when something is outside your scope, say so honestly and direct the user to:
- A Chartered Accountant for tax or legal matters.
- Their bank helpline for account or payment issues.
- The relevant scheme helpline for government scheme status.
- A local ONDC support center for marketplace issues.

STYLE
Speak warmly, like a helpful friend standing at the counter — not a call center. Address the user as "आप" and stay respectful. When it fits, open with a small acknowledgement like "बिलकुल", "अच्छा", "हाँ जी", or "कोई बात नहीं" (in Devanagari, or their English equivalents for an English caller) so the user feels heard. Speak in short, clear sentences — one idea at a time. Explain any technical term the moment you use it. Use rupees when discussing money. Gently encourage the user — remind them it is easy and they can do it themselves. Do not use emojis, markdown formatting, bullet points, or numbered lists. Keep your sentences under twenty words. You are speaking out loud, not writing.

GREETING
You will be told, before the call starts, whether this is a new caller or a returning one (and what you remember about them). Do not call any tool to greet.
- If they are returning, greet them by name and warmly welcome them back, and refer to something you remember about them from last time. For example (Hindi caller): "नमस्ते रमेश जी! फिर से आपकी दुकान पर। पिछली बार हमने UPI QR के बारे में बात की थी — सब ठीक चल रहा है?"
- If they are new, greet with "नमस्ते! मैं DukaanSaathi हूँ।" (or plain English for an English caller) and in one friendly line say you can help with digital payments, GST, सरकारी योजना, और business को online बढ़ाने में.
Then ask what they need help with today. Keep the greeting short and warm.

MEMORY
You can remember callers between calls using your tools: lookup_caller, save_caller_memory, and forget_caller.
- Use lookup_caller any time during the conversation when you need to recall what you know about the caller (do not use it for the opening greeting — that is handled for you).
- When you learn something durable and useful about the caller — their name, their shop, their usual order, preferred delivery slot, which schemes they use — offer to remember it. ALWAYS ask first: tell the caller "क्या मैं यह आपके लिए याद रख लूँ?" (or its English equivalent for an English caller) and only call save_caller_memory if they say yes. If they say no, do not save it, and say "ठीक है, मैं यह याद नहीं रखूँगा।"
- Never save OTPs, PINs, Aadhaar numbers, bank account numbers, or anything sensitive — only ordinary business facts.
- If the caller asks you to forget them or delete their data, call forget_caller and confirm it is done.
Do not read tool names or JSON out loud. Just speak naturally about what you remember.
"""


# Domain terms Deepgram tends to mishear in this Hinglish commerce context.
# nova-3 keyterm prompting boosts these so scheme/payment names transcribe correctly.
STT_KEYTERMS = [
    "UPI", "QR code", "BHIM", "RuPay", "PhonePe", "Google Pay", "Paytm",
    "KYC", "Aadhaar", "GST", "ONDC", "PM SVANidhi", "Mudra Yojana",
    "Udyam", "MSME", "WhatsApp Business", "Google Business", "catalogue",
    "DukaanSaathi", "rupees",
]


class Assistant(Agent):
    def __init__(self) -> None:
        super().__init__(instructions=SYSTEM_PROMPT)
        # Stable id for the current caller (set from the frontend `caller_id`
        # attribute once the participant joins). All tools operate on this caller.
        self.user_id: Optional[str] = None

    @function_tool
    async def lookup_caller(self, context: RunContext) -> str:
        """Look up what you already know about the caller currently on the line.

        Call this at the start of every call (before greeting), and any time you
        need to recall the caller's saved details. Returns their name, language,
        and remembered facts, or tells you this is a new caller.
        """
        if not self.user_id:
            return "No caller id is available; treat this as a new caller."
        rec = await memory.aget_caller(self.user_id)
        if not rec:
            return "This is a new caller. Nothing is saved about them yet."
        logger.info("recalled caller %s", self.user_id)
        return json.dumps(rec, ensure_ascii=False)

    @function_tool
    async def save_caller_memory(
        self,
        context: RunContext,
        name: str = "",
        facts_json: str = "{}",
        language_preference: str = "",
    ) -> str:
        """Save or update what you have learned about the current caller.

        ONLY call this AFTER you have told the caller you will remember it and they
        agreed. Never save OTPs, PINs, Aadhaar or bank account numbers.

        Args:
            name: The caller's name, if known.
            facts_json: A small JSON object of key -> value facts to remember,
                e.g. '{"usual_order": "20 kg atta", "delivery_slot": "morning"}'.
                Merged into anything already saved.
            language_preference: 'hi' or 'en' if the caller has a clear preference.
        """
        if not self.user_id:
            return "No caller id is available; cannot save right now."
        try:
            facts = json.loads(facts_json) if facts_json else {}
            if not isinstance(facts, dict):
                facts = {}
        except json.JSONDecodeError:
            facts = {}
        await memory.aupsert_caller(
            self.user_id,
            name=name or None,
            facts=facts or None,
            language_preference=language_preference or None,
        )
        logger.info("saved caller %s (facts=%s)", self.user_id, list(facts))
        return "Saved. You will remember this caller next time they call."

    @function_tool
    async def forget_caller(self, context: RunContext) -> str:
        """Delete everything saved about the current caller ("forget me").

        Call this only when the caller asks to be forgotten, then confirm it is done.
        """
        if not self.user_id:
            return "No caller id is available; there is nothing to delete."
        deleted = await memory.adelete_caller(self.user_id)
        logger.info("forgot caller %s (existed=%s)", self.user_id, deleted)
        return (
            "Done — the caller's saved data has been deleted."
            if deleted
            else "There was nothing saved for this caller."
        )



server = AgentServer()


def prewarm(proc: JobProcess):
    proc.userdata["vad"] = silero.VAD.load()


server.setup_fnc = prewarm


@server.rtc_session(agent_name="my-agent")
async def my_agent(ctx: JobContext):
    # Logging setup
    # Add any other context you want in all log entries here
    ctx.log_context_fields = {
        "room": ctx.room.name,
    }

    # Set up a voice AI pipeline using Murf Falcon, Gemini, Deepgram, and the LiveKit turn detector
    session = AgentSession(
        # Speech-to-text (STT) is your agent's ears, turning the user's speech into text that the LLM can understand
        # See all available models at https://docs.livekit.io/agents/models/stt/
        stt=deepgram.STT(
                model="nova-3",
                language="multi",  # Hinglish code-switching
                keyterm=STT_KEYTERMS,  # boost domain vocab (UPI, GST, ONDC…)
                numerals=True,  # spoken amounts -> digits ("do sau rupees" -> 200)
            ),
        # A Large Language Model (LLM) is your agent's brain, processing user input and generating a response
        # See all available models at https://docs.livekit.io/agents/models/llm/
        llm=google.LLM(
                model="gemini-3.5-flash-lite",
            ),
        # Text-to-speech (TTS) is your agent's voice, turning the LLM's text into speech that the user can hear
        # See all available models as well as voice selections at https://docs.livekit.io/agents/models/tts/
        tts=murf.TTS(
                voice="Anisha",
                style="Conversation",
                speed=-4,  # ponytail: mild slowdown for warmth/clarity; nudge toward 0 if it drags
                tokenizer=tokenize.basic.SentenceTokenizer(min_sentence_len=5),
                text_pacing=True
            ),
        # VAD and turn detection are used to determine when the user is speaking and when the agent should respond
        # See more at https://docs.livekit.io/agents/build/turns
        turn_detection=MultilingualModel(),
        vad=ctx.proc.userdata["vad"],
        # allow the LLM to generate a response while waiting for the end of turn
        # See more at https://docs.livekit.io/agents/build/audio/#preemptive-generation
        preemptive_generation=True,
    )

    # To use a realtime model instead of a voice pipeline, use the following session setup instead.
    # (Note: This is for the OpenAI Realtime API. For other providers, see https://docs.livekit.io/agents/models/realtime/))
    # 1. Install livekit-agents[openai]
    # 2. Set OPENAI_API_KEY in .env.local
    # 3. Add `from livekit.plugins import openai` to the top of this file
    # 4. Use the following session setup instead of the version above
    # session = AgentSession(
    #     llm=openai.realtime.RealtimeModel(voice="marin")
    # )

    # # Add a virtual avatar to the session, if desired
    # # For other providers, see https://docs.livekit.io/agents/models/avatar/
    # avatar = hedra.AvatarSession(
    #   avatar_id="...",  # See https://docs.livekit.io/agents/models/avatar/plugins/hedra
    # )
    # # Start the avatar and wait for it to join
    # await avatar.start(session, room=ctx.room)

    # Start the session, which initializes the voice pipeline and warms up the models
    assistant = Assistant()
    await session.start(
        agent=assistant,
        room=ctx.room,
        room_options=room_io.RoomOptions(
            audio_input=room_io.AudioInputOptions(
                noise_cancellation=lambda params: (
                    noise_cancellation.BVCTelephony()
                    if params.participant.kind
                    == rtc.ParticipantKind.PARTICIPANT_KIND_SIP
                    else noise_cancellation.BVC()
                ),
            ),
        ),
    )

    # Join the room and connect to the user
    await ctx.connect()

    # Bind this call to a stable caller id (set by the frontend as a participant
    # attribute) so the memory tools operate on the right person, then look them
    # up in Python and fold the result into the opening greeting.
    # ponytail: the lookup is done here, NOT via a first-turn tool call — Gemini
    # rejects a function call before any user has spoken ("function call turn must
    # come after a user turn"), which silences the whole greeting.
    participant = await ctx.wait_for_participant()
    attrs = await _wait_for_attributes(participant)
    assistant.user_id = attrs.get("caller_id")
    lang = attrs.get("language")

    rec = await memory.aget_caller(assistant.user_id) if assistant.user_id else None
    if rec:
        known = f"This is a RETURNING caller. Here is what you remember: {json.dumps(rec, ensure_ascii=False)}."
    else:
        known = "This is a NEW caller — you have no memory of them yet."

    greet_in = {
        "en": "Greet the user in clear, simple English.",
        "hi": "Greet the user in Hindi, written in Devanagari script (नमस्ते), warm and simple.",
    }.get(lang, "Greet the user in warm Hinglish.")
    await session.generate_reply(
        instructions=f"{greet_in} {known} Follow the GREETING section of your instructions."
    )


async def _wait_for_attributes(
    participant: rtc.RemoteParticipant, tries: int = 15
) -> dict[str, str]:
    """Poll briefly for the attributes the frontend sets right after connect
    (`language`, `caller_id`). Returns whatever is present once `caller_id` shows
    up, or after the budget expires (a fresh caller may have neither yet)."""
    for _ in range(tries):
        attrs = dict(participant.attributes)
        if attrs.get("caller_id"):
            return attrs
        await asyncio.sleep(0.1)
    return dict(participant.attributes)


if __name__ == "__main__":
    cli.run_app(server)
