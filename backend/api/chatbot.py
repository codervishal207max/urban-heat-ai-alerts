# Urban Heat AI v2 — Chatbot API Routes
from fastapi import APIRouter
from pydantic import BaseModel, Field
from backend.config import DEFAULT_CITY
from backend.services.chatbot_service import ask_heatbot, is_configured

router = APIRouter(prefix="/chat", tags=["HeatBot"])


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=500)
    city: str = DEFAULT_CITY


@router.get("/status", summary="Is the LLM-backed HeatBot configured?")
async def chat_status():
    return {"llm_enabled": is_configured(), "provider": "groq" if is_configured() else None}


@router.post("/ask", summary="Ask HeatBot — Groq LLM grounded in live city data")
async def chat_ask(body: ChatRequest):
    result = await ask_heatbot(body.message, body.city)
    if result is None:
        # Signals the frontend to fall back to the local keyword bot.
        return {"ok": False, "reply": None}
    return {"ok": True, "reply": result["reply"], "model": result["model"]}
