# Urban Heat AI v2 — HeatBot LLM Service
# Real LLM chatbot via Groq (free tier, Llama 3.3 70B) — grounded in the
# platform's own live data so answers are specific to the current city
# instead of generic chit-chat.
#
# Falls back cleanly to `None` (caller falls back to keyword bot) if:
#   - GROQ_API_KEY is not set
#   - Groq API is unreachable / errors / times out
# This keeps the whole app demoable even with no internet / no key.

from typing import Optional
import os
import re
import httpx
from backend.config import CITY_REGISTRY, DEFAULT_CITY
from backend.services.heat_service import _generate_grid, get_calibration_info
from backend.services.health_service import get_vulnerable_populations
from backend.services import image_service, wikipedia_service

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "").strip()
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = os.environ.get("GROQ_MODEL", "openai/gpt-oss-20b")
REQUEST_TIMEOUT_SEC = 8

if not GROQ_API_KEY:
    print("[HeatBot/Groq] WARNING: GROQ_API_KEY not set — HeatBot will use the offline keyword bot only. "
          "Add it to your .env file (see .env.example) and restart the server.")

SYSTEM_PROMPT_TEMPLATE = """You are HeatBot, the AI assistant embedded in the Urban Heat AI platform \
— a real-time urban heat island analytics tool for Indian cities.

Answer the user's question using ONLY the live data snapshot below, plus your \
general knowledge of urban heat islands, climate, and public health. Keep answers \
concise (under 120 words unless the user asks for detail), practical, and specific \
to the numbers given — don't invent numbers that aren't in the snapshot.

Reply in the same language style the user writes in (Hindi/English/Hinglish are all fine).
You may use short markdown (bold, bullet points) for readability.

LIVE DATA SNAPSHOT — {city_name}:
- Avg LST (land surface temperature): {avg_lst}°C | Max: {max_lst}°C
- Avg UHI intensity: {avg_uhi}°C | Hotspot zones (UHI >= 2.0°C): {uhi_hotspots}
- Avg HVI (heat vulnerability index): {avg_hvi} | High/Very-High risk zones: {high_risk_zones}
- Population at high risk: {pop_at_risk} | Estimated heat deaths/summer: {est_deaths}
- Data source: {calib_source} (real satellite-calibrated: {is_satellite})

If the user asks about a different city than {city_name}, answer generally and \
suggest they switch the city selector on the dashboard for live numbers.
"""


def _build_context(city: str) -> dict:
    cfg = CITY_REGISTRY.get(city, CITY_REGISTRY[DEFAULT_CITY])
    zones = _generate_grid(city)
    n = len(zones)
    lsts = [z["lst"] for z in zones]
    uhis = [z["uhi_intensity"] for z in zones]
    hvis = [z["hvi"] for z in zones]
    high_risk = sum(1 for z in zones if z["risk_level"] in ("High", "Very High"))
    pop_data = get_vulnerable_populations(city)
    calib = get_calibration_info(city)
    return {
        "city_name": cfg["name"],
        "avg_lst": round(sum(lsts) / n, 1),
        "max_lst": round(max(lsts), 1),
        "avg_uhi": round(sum(uhis) / n, 2),
        "uhi_hotspots": sum(1 for u in uhis if u >= 2.0),
        "avg_hvi": round(sum(hvis) / n, 3),
        "high_risk_zones": high_risk,
        "pop_at_risk": f"{pop_data['population_at_high_risk']:,}",
        "est_deaths": pop_data.get("estimated_deaths_per_summer", "N/A"),
        "calib_source": calib.get("source", "static baseline"),
        "calibrated": calib.get("calibrated", False),
        "is_satellite": calib.get("is_satellite", False),
    }


def is_configured() -> bool:
    return bool(GROQ_API_KEY)


# ── Intent detection ──────────────────────────────────────────────────────
IMAGE_TRIGGERS = [
    "generate image", "generate an image", "create image", "create an image",
    "make an image", "draw", "image banao", "photo banao", "picture banao",
    "tasveer banao", "chitra banao", "image generate", "banao image", "img banao",
]
WIKI_TRIGGERS = [
    "wikipedia", "wiki ", " wiki", "who is", "who was", "what is the history",
    "live data", "latest info", "current info", "real time info", "real-time info",
    "tell me about", "kaun hai", "kya hai wikipedia",
]


def _wants_image(q: str) -> bool:
    return any(t in q for t in IMAGE_TRIGGERS)


def _wants_wikipedia(q: str) -> bool:
    return any(t in q for t in WIKI_TRIGGERS)


def _strip_image_trigger(message: str) -> str:
    q = message
    for t in IMAGE_TRIGGERS:
        q = re.sub(re.escape(t), "", q, flags=re.IGNORECASE)
    q = q.strip(" :,-")
    return q if q else message


async def ask_heatbot(message: str, city: str = DEFAULT_CITY) -> Optional[dict]:
    """
    Returns one of:
      {"type": "image", "image_base64": str, "model": str, "prompt": str}
      {"type": "text", "reply": str, "model": str, "grounded_on": {...}, "wiki_source": {...}|None}
      None  — nothing available, caller falls back to the offline keyword bot.
    """
    q = message.lower().strip()

    # 1) Image-generation intent — routed to Hugging Face, independent of Groq.
    if _wants_image(q):
        prompt = _strip_image_trigger(message)
        img = await image_service.generate_image(prompt)
        if img:
            return {"type": "image", **img}
        return {
            "type": "text",
            "reply": "⚠️ Image generation abhi available nahi hai — HF_API_KEY check karo .env file mein, "
                     "ya model load ho raha hoga, thodi der baad try karo.",
            "model": "system",
            "grounded_on": None,
            "wiki_source": None,
        }

    if not GROQ_API_KEY:
        return None

    ctx = _build_context(city)
    system_prompt = SYSTEM_PROMPT_TEMPLATE.format(**ctx)

    # 2) Wikipedia-grounded intent — fetch a live summary and hand it to the LLM
    #    as extra context so factual / "who is / what is X" questions outside
    #    the platform's own heat data still get accurate, current answers.
    wiki_source = None
    if _wants_wikipedia(q):
        wiki = await wikipedia_service.get_summary(message)
        if wiki:
            wiki_source = wiki
            system_prompt += (
                f"\n\nLIVE WIKIPEDIA CONTEXT — \"{wiki['title']}\":\n{wiki['extract']}\n"
                "Use this only if it's relevant to the user's question, alongside the live data snapshot above. "
                "Mention that the info is sourced from Wikipedia."
            )

    payload = {
        "model": GROQ_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": message},
        ],
        "temperature": 0.4,
        "max_tokens": 400,
    }
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SEC) as client:
            resp = await client.post(GROQ_URL, json=payload, headers=headers)
            resp.raise_for_status()
            data = resp.json()
        reply = data["choices"][0]["message"]["content"].strip()
        return {"type": "text", "reply": reply, "model": GROQ_MODEL, "grounded_on": ctx, "wiki_source": wiki_source}
    except Exception as e:
        print(f"[HeatBot/Groq] LLM call failed, falling back to keyword bot: {e!r}")
        if wiki_source:
            return {
                "type": "text",
                "reply": f"📖 **{wiki_source['title']}** (Wikipedia se):\n\n{wiki_source['extract']}",
                "model": "wikipedia-direct",
                "grounded_on": None,
                "wiki_source": wiki_source,
            }
        return None 