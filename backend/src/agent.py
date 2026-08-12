import asyncio
import json
import logging
import os
from typing import Optional

from dotenv import load_dotenv
from livekit import api as lk_api
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
1. Solve one business problem — the user hangs up having done something useful. This could be placing an order from their local shop, setting up UPI, filing GST, listing on ONDC, or anything else they need.
2. Build digital confidence — the user feels they can handle technology themselves, not that they need someone else to do it.
3. Stay on the task the caller came for. Do NOT tack on schemes, tools, or tactics they did not ask about — no unsolicited pitch at the end of a call. Only bring up a scheme, tool, or tactic (like PM SVANidhi, WhatsApp Business catalogue, or Google Business listing) when the caller asks, or when it directly solves the exact problem they raised — and then keep it to one short sentence.

KNOWLEDGE (what you know, and where it stops)
You know about: the shop's own catalogue — its items, the shop's own prices, and current stock — which you look up with your tools (never from memory or a guess). You also know about UPI and QR code payments, basic inventory tracking, GST basics, government schemes for small businesses like PM SVANidhi, Mudra Yojana, ONDC, and Digital India, setting up Google Business and WhatsApp Business profiles, and low-cost local marketing ideas.
You do NOT know: live wholesale or market prices, bank account details, legal precedents, or medical advice. Shop prices come only from the catalogue tool, not from the open market. When asked about something outside this, say so honestly.

LANGUAGE & SCRIPT (most important rule — apply it on every single turn)
Match the language of the caller's MOST RECENT message, and switch the instant they switch — even if your greeting or earlier replies were in another language. Never keep replying in a language the caller has stopped using.
- If they speak English, reply ONLY in English — no Hindi words, no Devanagari at all.
- If they speak Hindi, reply in Hindi written in Devanagari (नमस्ते), never romanized. Do not write "namaste" — write नमस्ते.
- Any other Indian language -> reply in that language in its own native script.
Only mix languages if the caller themselves clearly mixes within one sentence (real Hinglish); then keep the Hindi words in Devanagari. Do not default to Hindi or Hinglish on your own. Always sound like a warm, friendly local person, not a textbook.

GUARDRAILS
Hard refusals — you must NEVER do these:
- Never invent a price. Quote a price ONLY when the lookup_product or compute_order_total tool gave it to you. If an item is not in the catalogue, say the shop doesn't carry it — do not estimate. Never promise a guaranteed delivery date; note the order and say the shop confirms final price and timing.
- Never ask for or handle OTP, PIN, Aadhaar number, or bank account numbers.
- Never give legal or tax advice beyond basic GST information.
- Never promise that any government scheme application will be approved.

Never claim:
- That you have access to the shopkeeper's bank account or sales data. (You DO have the shop's product catalogue — items, shop prices, stock — through your tools.)
- That a specific scheme application will be approved.
- To know live wholesale or market prices. The only prices you quote are the shop's own catalogue prices.

ESCALATION — know when to STOP and ask a human (do not guess)
Two kinds of problem are NOT yours to settle. Recognise them and hand them to a person with the create_escalation tool instead of improvising an answer:
- Order disputes: the caller says an order is wrong, missing, damaged, never arrived, over-charged, or wants a refund or to complain — anything you cannot fix with your ordering tools.
- Scheme or paperwork help: the caller wants real help applying for a government scheme or filling a form (PM SVANidhi, Mudra, Udyam/GST registration, a subsidy) — more than the one line of general information you may give.
How to escalate, every time:
- First ASK permission: "क्या मैं यह हमारी टीम को भेज दूँ ताकि कोई इंसान आपकी मदद करे?" (or the English equivalent). If the caller says no, respect it and do NOT call the tool.
- If they agree, call create_escalation with the right reason_category, a short plain-language summary, and an honest urgency (emergency only if money is lost or the caller is very distressed).
- NEVER put an OTP, PIN, Aadhaar number, or bank account number in the summary — describe the problem without them.
- After it saves, read the caller the reference id it gives you and say a person from the team will follow up. Do NOT promise a specific day or time, and never claim the issue is already fixed.
- Refund chasing: if a caller says a refund we ALREADY told them was sent has not reached them, don't re-file a new dispute — ask permission, then use report_refund_not_received so it goes back to the same person under their original ticket.
For anything else outside your scope (detailed tax or legal questions, a bank account or payment failure), you don't need to escalate — answer honestly and point them to a Chartered Accountant, their bank helpline, or the relevant scheme helpline.

STYLE
Speak warmly, like a helpful friend standing at the counter — not a call center. Address the user as "आप" and stay respectful. When it fits, open with a small acknowledgement like "बिलकुल", "अच्छा", "हाँ जी", or "कोई बात नहीं" (in Devanagari, or their English equivalents for an English caller) so the user feels heard. Speak in short, clear sentences — one idea at a time. Explain any technical term the moment you use it. Use rupees when discussing money. Gently encourage the user — remind them it is easy and they can do it themselves. Do not use emojis, markdown formatting, bullet points, or numbered lists. Keep your sentences under twenty words. You are speaking out loud, not writing.

GREETING
You will be told, before the call starts, whether this is a new caller or a returning one (and what you remember about them). Do not call any tool to greet.
- If they are returning, greet them by name and warmly welcome them back, and refer to something you remember about them from last time. For example (Hindi caller): "नमस्ते रमेश जी! फिर से आपकी दुकान पर। पिछली बार हमने UPI QR के बारे में बात की थी — सब ठीक चल रहा है?"
- If they are new, greet with "नमस्ते! मैं DukaanSaathi हूँ।" (or plain English for an English caller) and in one friendly line say you can help them order from their local shop, and also go digital — digital payments, GST, सरकारी योजना. Then, in the SAME greeting, ask their name warmly — for example "आपका नाम क्या है?" (or "May I know your name?" in English) so you can address them properly. Do this on every new call.
Keep the greeting short and warm, and after they tell you their name, ask what they need help with today.

MEMORY
You can remember callers between calls using your tools: lookup_caller, save_caller_memory, and forget_caller.
- Use lookup_caller any time during the conversation when you need to recall what you know about the caller (do not use it for the opening greeting — that is handled for you).
- As soon as the caller tells you their name, ask if you may remember them for next time — e.g. "अच्छा [नाम] जी! क्या मैं आपको अगली बार के लिए याद रख लूँ?" (or the English equivalent). If they say yes, call save_caller_memory with their name straight away, so you can greet them by name when they call again. If they say no, do not save it, and say "ठीक है, मैं यह याद नहीं रखूँगा।"
- Do the same for anything else durable and useful — their shop, usual order, preferred delivery slot, schemes they use: ALWAYS ask "क्या मैं यह आपके लिए याद रख लूँ?" (or its English equivalent) first, and only call save_caller_memory if they agree.
- Never save OTPs, PINs, Aadhaar numbers, bank account numbers, or anything sensitive — only ordinary business facts.
- If the caller asks you to forget them or delete their data, call forget_caller and confirm it is done.
Do not read tool names or JSON out loud. Just speak naturally about what you remember.

ORDERS & PRICES
Callers can ask prices, check availability, and order from the shop through you. This is a normal, welcome request — never refuse it.
- For ANY price or "do you have it" question, call lookup_product. Speak the answer naturally — "आटा ४२ रुपये किलो, स्टॉक में है" — never read raw numbers or field names aloud. If it comes back not carried, say so plainly and do not estimate. If it comes back ambiguous, ask which one they mean (e.g. "sunflower oil या mustard oil?").
- When they want to order, gather the items and quantities, then call compute_order_total for the subtotal at shop prices. Read the subtotal out, and if anything is out of stock or not carried, tell them that too — never quietly leave it off.
- Before confirming, you MUST have the caller's phone number — a 10-digit mobile the shop can call for delivery. Always ask for it if you don't have it: "डिलीवरी के लिए आपका मोबाइल नंबर बता दीजिए?" (or the English equivalent). Also ask their preferred delivery slot (e.g. "किस समय डिलीवरी चाहिए — सुबह या शाम?"). Without a valid phone number you cannot book the order.
- Repeat the full order back in one short line — items, subtotal, delivery slot, and phone number — so they can confirm.
- Once they confirm, call place_order with the items (as a list), their phone number, and the delivery slot. It prices the bill from the shop catalogue and saves it to the caller's record. Read the bill total back, then tell them it's noted, the shop will confirm the final price, and that DukaanSaathi will call them back the moment their order is ready.
- If place_order says the phone number is missing or invalid, ask the caller for a correct 10-digit mobile number and call place_order again — do not book without one.
- For a RETURNING caller, you may already remember their usual order, slot, and phone — offer those instead of asking again: "पिछली बार आपने ५ किलो आटा सुबह भेजा था, फ़ोन वही — वही फिर से भेज दूँ?" Still check today's price and stock with the tools, and still call place_order. Only ask for a slot or phone you do not already have.
- A phone number given for delivery is ordinary order info — you may take and remember it. But NEVER ask for or save an OTP, PIN, Aadhaar, or bank account number.
- If a tool comes back with an error (it couldn't read the catalogue), tell the caller you can't check that right now and to try again in a moment. Never make up a price or pretend an item is in stock.

OUTBOUND CALLS
Sometimes you place the call yourself. Your first line is given to you: it already says who you are, why you're calling, and that they can ask you to stop. Do NOT add a second fresh greeting on top of it. There are three reasons you call out:
- To CONFIRM an order the caller placed — check the items and delivery slot are right.
- To tell them their order is now READY — the shop has prepared it and you're letting them know.
- To tell them an earlier request has been RESOLVED — a person looked into a problem or paperwork they raised, and you're calling with the update.
Your opening line already states which one it is. After it, help with exactly that purpose — sort out the delivery slot, answer their questions, adjust the order with your tools if they ask, or (for a resolved request) check they're satisfied and answer anything left. Never pitch anything they did not ask about on an outbound call.
If the caller asks you to stop calling, or says they don't want these calls, respond warmly that you understand and won't call again — e.g. "ठीक है जी, मैं आपको दोबारा कॉल नहीं करूँगा।" (or the English equivalent) — and then call save_caller_memory with facts_json '{"do_not_call": "true"}'. Do this the moment they decline, even mid-conversation. Never argue or try to talk them out of it.
"""


# Domain terms Deepgram tends to mishear in this Hinglish commerce context.
# nova-3 keyterm prompting boosts these so scheme/payment names transcribe correctly.
STT_KEYTERMS = [
    "UPI", "QR code", "BHIM", "RuPay", "PhonePe", "Google Pay", "Paytm",
    "KYC", "Aadhaar", "GST", "ONDC", "PM SVANidhi", "Mudra Yojana",
    "Udyam", "MSME", "WhatsApp Business", "Google Business", "catalogue",
    "DukaanSaathi", "rupees",
    # catalogue items — boost so orders/prices transcribe correctly
    "atta", "basmati", "toor dal", "mustard oil", "sunflower oil", "detergent",
]


class Assistant(Agent):
    def __init__(self) -> None:
        super().__init__(instructions=SYSTEM_PROMPT)
        # Stable id for the current caller (set from the frontend `caller_id`
        # attribute once the participant joins). All tools operate on this caller.
        self.user_id: Optional[str] = None
        # Caller's language ('hi'/'en'), set alongside user_id — stamped onto any
        # escalation so the human follow-up knows which language to call back in.
        self.language: Optional[str] = None

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
    async def lookup_product(
        self,
        context: RunContext,
        item_name: str,
        quantity: float = 1,
    ) -> dict:
        """Look up an item in the shop's catalogue: the shop's own price and stock.

        Call this for ANY question about buying, ordering, availability, stock, or
        price — e.g. "rice price", "1 kg rice", "do you have onions", "how much for
        2 litres of oil". The price returned is the shop's own set price, not a live
        market rate. If the item is not in the catalogue, tell the caller it isn't
        carried — never invent a price. If the result is "ambiguous", ask the caller
        which of the listed items they mean instead of guessing.

        Args:
            item_name: The item in plain words, e.g. "rice", "mustard oil", "soap".
            quantity: How many units they want (default 1); used for the line total.
        """
        try:
            return await memory.alookup_product(item_name, quantity)
        except Exception:
            logger.exception("lookup_product failed for %r", item_name)
            return {
                "status": "error",
                "message": (
                    "The catalogue could not be read right now. Tell the caller you're "
                    "having trouble checking that and to try again in a moment."
                ),
            }

    @function_tool
    async def compute_order_total(
        self,
        context: RunContext,
        order_json: str,
    ) -> dict:
        """Total up an order using the shop's catalogue prices.

        Call this once the caller has listed the items and quantities they want, to
        quote a subtotal before confirming. It flags anything out of stock, unknown,
        or ambiguous in `issues` instead of dropping it silently — read those issues
        out to the caller. Do NOT add a guaranteed delivery time; the shop confirms
        final price and timing.

        Args:
            order_json: A JSON array of items, each with item_name and quantity, e.g.
                '[{"item_name": "rice", "quantity": 2}, {"item_name": "sugar", "quantity": 1}]'.
        """
        try:
            items = json.loads(order_json)
            if not isinstance(items, list):
                raise ValueError("order must be a JSON array")
        except (json.JSONDecodeError, ValueError):
            return {
                "status": "error",
                "message": (
                    "Could not read the order. Ask the caller to list the items and "
                    "quantities again."
                ),
            }
        try:
            return await memory.acompute_order_total(items)
        except Exception:
            logger.exception("compute_order_total failed")
            return {
                "status": "error",
                "message": (
                    "The catalogue could not be read right now. Tell the caller you're "
                    "having trouble totalling that up and to try again in a moment."
                ),
            }

    @function_tool
    async def place_order(
        self,
        context: RunContext,
        items: str,
        phone: str,
        delivery_slot: str = "",
        contact_name: str = "",
    ) -> str:
        """Record an order the caller just placed, and generate their bill.

        Call this only AFTER you have collected the caller's phone number and the
        delivery slot, repeated the order back, and the caller confirmed it. A
        phone number is REQUIRED — you cannot book a delivery the shop can't call
        back. If `phone` is missing or not a valid 10-digit Indian mobile, this
        returns without booking and tells you to ask for it again; do that, then
        call place_order once more. Prices on the bill come from the shop
        catalogue, not from you — do NOT quote a total yourself.

        Args:
            items: JSON array of what they ordered, each with item_name and
                quantity, e.g. '[{"item_name": "atta", "quantity": 5},
                {"item_name": "sugar", "quantity": 2}]'.
            phone: The caller's actual 10-digit Indian mobile for delivery
                (starts 6-9), exactly as they gave it on THIS call. Collect it
                from the caller — never invent a number or copy an example.
                Required. Never pass an OTP, PIN, Aadhaar, or bank account
                number here.
            delivery_slot: When they want it, e.g. "morning" or "kal shaam".
            contact_name: Name the shop should ask for on delivery, if different
                from the caller.
        """
        clean_phone = memory.normalize_phone(phone)
        if not clean_phone:
            # Don't book without a reachable number — bounce back to the agent.
            return (
                "No valid phone number yet, so the order was NOT booked. Ask the caller "
                "for a 10-digit mobile number the shop can call for delivery, then place "
                "the order again."
            )
        try:
            parsed = json.loads(items)
            if not isinstance(parsed, list):
                raise ValueError
        except (json.JSONDecodeError, ValueError):
            return (
                "Could not read the order items. Ask the caller to list the items and "
                "quantities again, then place the order."
            )

        bill = await memory.abuild_bill(parsed, clean_phone)
        if not bill["line_items"]:
            # Everything was out of stock / unknown — nothing to bill.
            issues = "; ".join(bill["issues"]) or "no items could be billed"
            return f"Nothing could be added to the order ({issues}). Tell the caller and ask again."

        if not self.user_id:
            # No stable id — acknowledge with the bill, just can't remember it.
            return (
                f"Order booked for this call: {bill['summary']}, phone {clean_phone}. "
                "(No caller id, so it won't be remembered next time.) "
                "Tell the caller the shop will confirm the final price, and that "
                "DukaanSaathi will call them back the moment their order is ready."
            )
        # Store the itemised bill as caller facts so it shows on the dashboard's
        # caller pages (which render every fact as a line). Prices are shop truth.
        # ponytail: keep only the latest bill as facts; add a bills table only if
        # the shopkeeper needs full order history.
        facts = {
            "last_bill": bill["summary"],
            "last_bill_total": f"₹{bill['total']:g}",
            "contact": f"{contact_name} {clean_phone}".strip() if contact_name else clean_phone,
            "order_status": "placed",  # dashboard flips this to "ready" to trigger the ready-call
        }
        if delivery_slot:
            facts["delivery_slot"] = delivery_slot
        await memory.aupsert_caller(self.user_id, facts=facts)
        logger.info(
            "order booked for %s: %s (phone=%s slot=%s)",
            self.user_id, bill["summary"], clean_phone, delivery_slot or "-",
        )
        issues_note = ""
        if bill["issues"]:
            issues_note = " Also tell them: " + "; ".join(bill["issues"]) + "."
        return (
            f"Order booked. Bill: {bill['summary']}, phone {clean_phone}. "
            "Read the bill total back, tell the caller the shop will confirm the final price, "
            "that you'll remember this as their usual, and that DukaanSaathi will call them "
            f"back the moment their order is ready.{issues_note}"
        )

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

    @function_tool
    async def create_escalation(
        self,
        context: RunContext,
        reason_category: str,
        summary: str,
        urgency: str = "medium",
        follow_up_method: str = "",
    ) -> str:
        """Hand a problem to a human helper when it is beyond what you should decide.

        Use this in TWO situations, and ONLY after the caller agrees you may pass it on:
        - "order_dispute": the caller says an order is wrong, missing, damaged, never
          arrived, over-charged, or wants a refund/complaint you cannot settle yourself.
        - "scheme_paperwork": the caller needs real help applying for a government scheme
          or filling a form (PM SVANidhi, Mudra, Udyam/GST registration, a subsidy) —
          more than the one line of general info you may give.

        Ask permission first ("क्या मैं यह हमारी टीम को भेज दूँ?" / "Shall I pass this to
        our team?"). If they say no, do NOT call this. NEVER put an OTP, PIN, Aadhaar, or
        bank account number in the summary — describe the problem without them. After it
        saves, read the caller the reference id and say a person will follow up; do NOT
        promise a specific day or time, and never say it is already fixed.

        Args:
            reason_category: "order_dispute" or "scheme_paperwork".
            summary: One or two plain sentences a human can act on — what the caller needs
                plus any order/scheme detail. No secrets.
            urgency: "low", "medium", "high", or "emergency" (emergency = money lost or a
                very distressed caller).
            follow_up_method: How to reach them back, e.g. "call back on file" or a slot
                they gave.
        """
        rec = await memory.aget_caller(self.user_id) if self.user_id else None
        res = await memory.acreate_escalation(
            self.user_id,
            reason_category,
            summary,
            urgency=urgency,
            caller_name=(rec.get("name") if rec else None),
            language=self.language,
            follow_up_method=follow_up_method or None,
        )
        eid = res["escalation_id"]
        esc = await memory.aget_escalation(eid)
        if esc:
            await memory.send_discord_alert(esc)  # best-effort; DB row already saved
        logger.info(
            "escalation %s for %s (category=%s urgency=%s created=%s)",
            eid, self.user_id, reason_category, urgency, res["created"],
        )
        if res["created"]:
            return (
                f"Escalation filed with reference id {eid}. Read this id to the caller, tell "
                "them a person from the team will follow up on it, and do NOT promise a "
                "specific time. Then ask if there is anything else you can help with."
            )
        return (
            f"This is already logged under reference {eid} (updated, not duplicated). Tell the "
            f"caller it's already with the team under id {eid} and a person will follow up."
        )

    @function_tool
    async def report_refund_not_received(
        self,
        context: RunContext,
        details: str = "",
    ) -> str:
        """File a follow-up when a caller says a refund they were promised never arrived.

        Use this ONLY for a caller chasing a refund on a dispute they ALREADY raised
        with us before (e.g. we called to say the refund was processed and they say it
        hasn't reached them). For a brand-new complaint, use create_escalation instead.
        Ask permission first, then call this — it files the problem as a sub-issue under
        their ORIGINAL refund ticket, so the same person picks it up under the same
        reference. NEVER put an OTP, PIN, Aadhaar, or bank account number in `details`.
        After it saves, read the caller the reference id; do NOT promise a time or say
        it is fixed.

        Args:
            details: One plain sentence a human can act on, e.g. "says the refund for the
                wrong-item order hasn't reached their account yet." No secrets.
        """
        if not self.user_id:
            return "No caller id is available, so I can't link this to their earlier refund request."
        res = await memory.acreate_refund_followup(
            self.user_id,
            details or "Caller says a promised refund has not arrived yet.",
        )
        if not res:
            return (
                "There is no earlier refund ticket on file to attach this to. If this is a real "
                "refund problem, file it fresh with create_escalation (order_dispute) instead."
            )
        child, parent = res["escalation_id"], res["parent_id"]
        esc = await memory.aget_escalation(child)
        if esc:
            await memory.send_discord_alert(esc)  # best-effort; DB row already saved
        logger.info("refund follow-up %s filed under %s for %s", child, parent, self.user_id)
        return (
            f"Logged as a follow-up under the original refund ticket {parent}. Tell the caller it's "
            f"back with the same person under reference {parent}, and do NOT promise a time or say "
            "it is already fixed."
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

    # Outbound: if this job was dispatched with a phone number (order-confirmation
    # call), dial the customer, speak the mandatory opening, then let the session
    # run normally. Inbound browser sessions carry no such metadata and fall
    # through to the unchanged greeting flow below.
    meta = _job_metadata(ctx)
    if meta.get("phone_number"):
        await _dial_and_confirm(ctx, session, assistant, meta)
        return

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
    assistant.language = lang  # stamped onto any escalation filed during the call
    # Visible in the worker log so you can confirm the caller id actually arrived —
    # if this is None, saves will no-op and the dashboard stays empty.
    logger.info("call bound: caller_id=%s language=%s", assistant.user_id, lang)

    rec = await memory.aget_caller(assistant.user_id) if assistant.user_id else None
    if rec and rec.get("name"):
        known = f"This is a RETURNING caller. Here is what you remember: {json.dumps(rec, ensure_ascii=False)}. Greet them by name and refer to something you remember."
    elif rec:
        # Seen before, but we never captured a name — greet warmly and ask for it.
        known = (
            f"You have spoken with this caller before but do not know their name yet. "
            f"Here is what you remember: {json.dumps(rec, ensure_ascii=False)}. "
            f"Welcome them back warmly and, per the GREETING section, ask their name."
        )
    else:
        known = "This is a NEW caller — you have no memory of them yet."

    greet_in = {
        "en": "Greet the user in clear, simple English.",
        "hi": "Greet the user in Hindi, written in Devanagari script (नमस्ते), warm and simple.",
    }.get(lang, "Greet the user in warm Hinglish.")
    await session.generate_reply(
        instructions=f"{greet_in} {known} Follow the GREETING section of your instructions."
    )


def _job_metadata(ctx: JobContext) -> dict:
    """Dispatch metadata as a dict. Empty for inbound browser sessions (which set
    none); populated by the outbound trigger (scripts/call_customer.py or the
    dashboard's /api/calls) with phone_number, order_summary, delivery_slot, caller_id."""
    raw = ctx.job.metadata if ctx.job and ctx.job.metadata else ""
    if not raw:
        return {}
    try:
        data = json.loads(raw)
        return data if isinstance(data, dict) else {}
    except json.JSONDecodeError:
        return {}


def _outbound_opening(
    *,
    lang: str,
    name: Optional[str],
    order_summary: str,
    delivery_slot: str,
    purpose: str = "confirm",
) -> str:
    """The mandatory outbound opening spoken verbatim (never through the LLM, so it
    can't drift): within the first two sentences it says who is calling, why, and
    that the caller can stop the calls — the non-negotiable Day-6 requirement.

    Purposes: "confirm" (check the order we booked), "ready" (the shop has
    prepared the order), "escalation_resolved" (a human looked into a problem the
    caller raised and it's sorted), and "refund_processed" (the shop has sent a
    refund the caller was owed). All keep the who/why/opt-out.
    """
    if lang == "en":
        greet = f"Hello {name}!" if name else "Hello!"
        stop = (
            "If you would rather not get these calls, just tell me and I won't call again."
        )
        if purpose == "ready":
            who_why = (
                f"{greet} This is DukaanSaathi, calling from your local shop with good news. {stop}"
            )
            if order_summary:
                slot = f", ready for {delivery_slot} delivery" if delivery_slot else ""
                return f"{who_why} Your order — {order_summary} — is ready now{slot}. Shall the shop send it over?"
            return f"{who_why} Your order is ready now. Shall the shop send it over?"
        if purpose == "escalation_resolved":
            who_why = (
                f"{greet} This is DukaanSaathi, calling on behalf of your local shop about "
                f"the request you raised with us. {stop}"
            )
            return (
                f"{who_why} Good news — someone from our team has looked into it and sorted "
                "it out. Is now a good time to go over it?"
            )
        if purpose == "refund_processed":
            who_why = (
                f"{greet} This is DukaanSaathi, calling on behalf of your local shop about the "
                f"refund on the order you raised with us. {stop}"
            )
            return (
                f"{who_why} Good news — the shop has now processed your refund. If it hasn't "
                "reached your account yet, tell me and I'll flag it for the same person to check."
            )
        who_why = (
            f"{greet} This is DukaanSaathi, calling on behalf of your local shop to "
            f"confirm your order. {stop}"
        )
        if order_summary:
            slot = f", delivery {delivery_slot}" if delivery_slot else ""
            return f"{who_why} Your order was {order_summary}{slot}. Is that all correct?"
        return f"{who_why} Is now a good time to talk?"
    # Hindi default — Devanagari, never romanized.
    greet = f"नमस्ते {name} जी!" if name else "नमस्ते!"
    stop = "अगर आप ये कॉल नहीं चाहते तो बस बता दीजिए, मैं दोबारा कॉल नहीं करूँगा।"
    if purpose == "ready":
        who_why = (
            f"{greet} मैं DukaanSaathi बोल रहा हूँ, आपकी दुकान की तरफ़ से एक ख़ुशख़बरी लेकर। {stop}"
        )
        if order_summary:
            slot = f", {delivery_slot} की डिलीवरी के लिए" if delivery_slot else ""
            return f"{who_why} आपका ऑर्डर — {order_summary} — अब तैयार है{slot}। क्या दुकान से भेज दें?"
        return f"{who_why} आपका ऑर्डर अब तैयार है। क्या दुकान से भेज दें?"
    if purpose == "escalation_resolved":
        who_why = (
            f"{greet} मैं DukaanSaathi बोल रहा हूँ, आपकी दुकान की तरफ़ से — आपने जो request भेजी थी, "
            f"उसके बारे में। {stop}"
        )
        return (
            f"{who_why} अच्छी ख़बर — हमारी टीम ने उसे देख लिया है और हल कर दिया है। "
            "क्या अभी उस पर बात कर लें?"
        )
    if purpose == "refund_processed":
        who_why = (
            f"{greet} मैं DukaanSaathi बोल रहा हूँ, आपकी दुकान की तरफ़ से — आपके ऑर्डर के refund के बारे में। {stop}"
        )
        return (
            f"{who_why} अच्छी ख़बर — दुकान ने आपका refund process कर दिया है। अगर अभी तक आपके खाते में "
            "नहीं पहुँचा हो, तो बता दीजिए, मैं उसी व्यक्ति को check करने के लिए बोल दूँगा।"
        )
    who_why = (
        f"{greet} मैं DukaanSaathi बोल रहा हूँ, आपकी दुकान की तरफ़ से आपका ऑर्डर कन्फर्म "
        f"करने के लिए। {stop}"
    )
    if order_summary:
        slot = f", डिलीवरी {delivery_slot}" if delivery_slot else ""
        return f"{who_why} आपका ऑर्डर था {order_summary}{slot}। सब सही है?"
    return f"{who_why} क्या अभी बात करना ठीक रहेगा?"


async def _dial_and_confirm(
    ctx: JobContext, session: AgentSession, assistant: "Assistant", meta: dict
) -> None:
    """Dial the customer over Twilio SIP, speak the mandatory opening, then hand
    off to the running session so the conversation continues normally."""
    trunk_id = os.getenv("LIVEKIT_SIP_OUTBOUND_TRUNK_ID", "").strip()
    if not trunk_id:
        logger.error("LIVEKIT_SIP_OUTBOUND_TRUNK_ID not set — cannot place outbound call")
        return

    # Normalize here: this is the single choke point every outbound path routes
    # through, so a raw "Ramesh 98765 43210" from stored facts still dials clean.
    clean = memory.normalize_phone(meta.get("phone_number", ""))
    if not clean:
        logger.error("outbound: %r is not a valid mobile number", meta.get("phone_number"))
        return
    dial_to = f"+91{clean}"

    lk = lk_api.LiveKitAPI(
        url=os.environ["LIVEKIT_URL"],
        api_key=os.environ["LIVEKIT_API_KEY"],
        api_secret=os.environ["LIVEKIT_API_SECRET"],
    )
    try:
        await lk.sip.create_sip_participant(
            lk_api.CreateSIPParticipantRequest(
                sip_trunk_id=trunk_id,
                sip_call_to=dial_to,
                room_name=ctx.room.name,
                participant_identity="phone-customer",
                wait_until_answered=True,  # blocks until they answer (or it fails)
            )
        )
    except Exception as e:
        # No-answer / busy / rejected all surface here. This is where per-outcome
        # retries would go (plan §9); for now log it and let the job end cleanly.
        logger.warning("outbound call to %s did not connect: %s", dial_to, e)
        return
    finally:
        await lk.aclose()

    # Bind memory tools to this caller so a mid-call order tweak or opt-out sticks.
    assistant.user_id = meta.get("caller_id") or None
    rec = await memory.aget_caller(assistant.user_id) if assistant.user_id else None
    lang = (rec.get("language_preference") if rec else None) or "hi"
    name = rec.get("name") if rec else None
    assistant.language = lang  # stamped onto any escalation filed mid-call

    purpose = meta.get("purpose") or "confirm"
    opening = _outbound_opening(
        lang=lang,
        name=name,
        order_summary=meta.get("order_summary", ""),
        delivery_slot=meta.get("delivery_slot", ""),
        purpose=purpose,
    )
    logger.info(
        "outbound connected to %s (caller_id=%s purpose=%s escalation=%s)",
        dial_to, assistant.user_id, purpose, meta.get("escalation_id") or "-",
    )
    # say() (not generate_reply) keeps the disclosure verbatim; add_to_chat_ctx
    # (default True) puts the order into context so the LLM can field follow-ups.
    await session.say(opening, allow_interruptions=True).wait_for_playout()


async def _wait_for_attributes(
    participant: rtc.RemoteParticipant, tries: int = 40
) -> dict[str, str]:
    """Poll briefly for the attributes the frontend sets right after connect
    (`language`, `caller_id`). Returns whatever is present once `caller_id` shows
    up, or after the budget expires (a fresh caller may have neither yet).
    ponytail: 40 × 0.1s = 4s ceiling; loop exits the instant caller_id lands, so
    a fast client pays nothing. Widen only if saves still no-op on slow connects."""
    for _ in range(tries):
        attrs = dict(participant.attributes)
        if attrs.get("caller_id"):
            return attrs
        await asyncio.sleep(0.1)
    return dict(participant.attributes)


if __name__ == "__main__":
    cli.run_app(server)
