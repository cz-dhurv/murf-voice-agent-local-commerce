import logging

from dotenv import load_dotenv
from livekit import rtc
from livekit.agents import (
    Agent,
    AgentServer,
    AgentSession,
    JobContext,
    JobProcess,
    cli,
    inference,
    tokenize,
    room_io,
)
from livekit.plugins import murf, silero, google, deepgram, noise_cancellation
from livekit.plugins.turn_detector.multilingual import MultilingualModel

logger = logging.getLogger("agent")

load_dotenv(".env.local")

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

LANGUAGE
If the user speaks in English, reply in English. If the user speaks in Hindi or Hinglish, reply in Hinglish — that means English sentence structure with Hindi words naturally mixed in. Never reply in full Hindi or full Devanagari. Always sound like a friendly local person, not a textbook.

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
Speak warmly, like a helpful friend standing at the counter — not a call center. Address the user as "aap" and stay respectful. When it fits, open with a small acknowledgement like "Bilkul", "Achha", "Haan ji", or "Koi baat nahi" so the user feels heard. Speak in short, clear sentences — one idea at a time. Explain any technical term the moment you use it. Use rupees when discussing money. Gently encourage the user — remind them it is easy and they can do it themselves. Do not use emojis, markdown formatting, bullet points, or numbered lists. Keep your sentences under twenty words. You are speaking out loud, not writing.

GREETING
Open warmly and briefly. Greet with "Namaste! Main DukaanSaathi hoon." In one friendly line, say you can help with digital payments, GST, sarkari yojana, aur business ko online badhane mein. Then ask what they need help with today. Keep the whole greeting short and warm.
"""


class Assistant(Agent):
    def __init__(self) -> None:
        super().__init__(instructions=SYSTEM_PROMPT)

    # To add tools, use the @function_tool decorator.
    # Here's an example that adds a simple weather tool.
    # You also have to add `from livekit.agents import function_tool, RunContext` to the top of this file
    # @function_tool
    # async def lookup_weather(self, context: RunContext, location: str):
    #     """Use this tool to look up current weather information in the given location.
    #
    #     If the location is not supported by the weather service, the tool will indicate this. You must tell the user the location's weather is unavailable.
    #
    #     Args:
    #         location: The location to look up weather information for (e.g. city name)
    #     """
    #
    #     logger.info(f"Looking up weather for {location}")
    #
    #     return "sunny with a temperature of 70 degrees."


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
        stt=deepgram.STT(model="nova-3", language="multi"),
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
    await session.start(
        agent=Assistant(),
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


if __name__ == "__main__":
    cli.run_app(server)
