from unittest.mock import AsyncMock, patch

import pytest
from livekit.agents import AgentSession, ChatContext, inference, llm

from agent import Assistant, ReturnsSpecialist, new_call_state


def _llm() -> llm.LLM:
    return inference.LLM(model="openai/gpt-4.1-mini")


@pytest.mark.asyncio
async def test_forward_handoff_preserves_context_identity_and_state() -> None:
    chat = ChatContext.empty()
    chat.add_message(role="user", content="The rice delivered yesterday was wrong.")
    state = new_call_state()
    main = Assistant(chat_ctx=chat, user_id="caller-1", language="en", call_state=state)

    specialist, announcement = await main.transfer_to_returns_specialist(None)

    assert isinstance(specialist, ReturnsSpecialist)
    assert announcement == "I will connect you to our returns and refunds specialist."
    assert specialist.user_id == "caller-1"
    assert specialist.language == "en"
    assert specialist.call_state is state
    assert any(
        "rice delivered yesterday" in msg.text_content
        for msg in specialist.chat_ctx.messages()
    )


@pytest.mark.asyncio
async def test_hand_back_preserves_specialist_conversation_and_state() -> None:
    chat = ChatContext.empty()
    chat.add_message(role="user", content="I want a replacement.")
    state = new_call_state()
    specialist = ReturnsSpecialist(chat, "caller-2", "en", state)

    main, announcement = await specialist.hand_back_to_main(None)

    assert isinstance(main, Assistant)
    assert announcement == "I will connect you back to our main DukaanSaathi assistant."
    assert main.call_state is state
    assert main.user_id == "caller-2"
    assert any("replacement" in msg.text_content for msg in main.chat_ctx.messages())


@pytest.mark.asyncio
async def test_specialist_escalation_updates_shared_day8_state() -> None:
    state = new_call_state()
    specialist = ReturnsSpecialist(ChatContext.empty(), "caller-3", "hi", state)
    fake_escalation = {"escalation_id": "ESC-DAY9", "created": True}

    with (
        patch("agent.memory.aget_caller", AsyncMock(return_value=None)),
        patch(
            "agent.memory.acreate_escalation", AsyncMock(return_value=fake_escalation)
        ) as create,
        patch("agent.memory.aget_escalation", AsyncMock(return_value=None)),
    ):
        result = await specialist.create_escalation(
            None,
            summary="Wrong rice delivered yesterday; caller wants a replacement.",
        )

    assert "ESC-DAY9" in result
    assert state["success"] is True
    assert state["track_outcome"]["escalation_filed"] is True
    assert create.await_args.args[1] == "order_dispute"


def test_main_routing_tool_has_narrow_boundary() -> None:
    description = Assistant.transfer_to_returns_specialist.info.description

    assert "wrong, damaged, missing" in description
    assert "merely delivered late" in description
    assert "catalogue/price" in description


@pytest.mark.asyncio
async def test_llm_routes_wrong_item_to_returns_specialist() -> None:
    async with _llm() as model, AgentSession(llm=model, tts=None) as session:
        await session.start(Assistant(language="en"))
        result = await session.run(
            user_input="The rice delivered yesterday was the wrong kind."
        )

        result.expect.contains_function_call(name="transfer_to_returns_specialist")
        result.expect.contains_agent_handoff(new_agent_type=ReturnsSpecialist)


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "caller_text",
    [
        "Do you have sugar?",
        "The delivery was a day late, but everything arrived correct and undamaged.",
    ],
)
async def test_llm_keeps_non_return_requests_with_main(caller_text: str) -> None:
    async with _llm() as model, AgentSession(llm=model, tts=None) as session:
        await session.start(Assistant(language="en"))
        result = await session.run(user_input=caller_text)

        assert not any(
            getattr(event, "item", None).name == "transfer_to_returns_specialist"
            for event in result.events
            if event.type == "function_call"
        )
        assert not any(
            event.type == "agent_handoff"
            and isinstance(event.new_agent, ReturnsSpecialist)
            for event in result.events
        )
