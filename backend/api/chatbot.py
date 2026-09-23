# Urban Heat AI v2 — Chatbot API Routes
from fastapi import APIRouter
from pydantic import BaseModel, Field
from backend.config import DEFAULT_CITY
from backend.services.chatbot_service import ask_heatbot, is_configured
from backend.services import image_service

router = APIRouter(prefix="/chat", tags=["HeatBot"])


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=500)
    city: str = DEFAULT_CITY


@router.get("/status", summary="Is the LLM-backed HeatBot configured?")
async def chat_status():
    return {
        "llm_enabled": is_configured(),
        "provider": "groq" if is_configured() else None,
        "image_gen_enabled": image_service.is_configured(),
        "wikipedia_enabled": True,
    }


@router.post("/ask", summary="Ask HeatBot — Groq LLM, Wikipedia-grounded facts, and HF image generation")
async def chat_ask(body: ChatRequest):
    result = await ask_heatbot(body.message, body.city)
    if result is None:
        return {"ok": False, "type": "text", "reply": None}

    if result.get("type") == "image":
        return {
            "ok": True,
            "type": "image",
            "image_base64": result["image_base64"],
            "model": result["model"],
            "prompt": result["prompt"],
        }

    return {
        "ok": True,
        "type": "text",
        "reply": result["reply"],
        "model": result["model"],
        "wiki_source": result.get("wiki_source"),
    }