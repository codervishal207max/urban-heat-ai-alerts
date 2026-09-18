# Urban Heat AI v2 — HeatBot LLM Service
# Real LLM chatbot via Groq (free tier, Llama 3.3 70B) — grounded in the
# platform's own live data so answers are specific to the current city
# instead of generic chit-chat.
#
# Falls back cleanly to `None` (caller falls back to keyword bot) if:
#   - GROQ_API_KEY is not set
#   - Groq API is unreachable / errors / times out
# This keeps the whole app demoable even with no internet / no key.

import os
import httpx
from backend.config import CITY_REGISTRY, DEFAULT_CITY
from backend.services.heat_service import _generate_grid, get_calibration_info
from backend.services.health_service import get_vulnerable_populations

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "").strip()
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = os.environ.get("GROQ_MODEL", "llama-3.1-8b-instant")
REQUEST_TIMEOUT_SEC = 8

if not GROQ_API_KEY:
    print("[HeatBot/Groq] WARNING: GROQ_API_KEY not set — HeatBot will use the offline keyword bot only. "
          "Add it to your .env file (see .env.example) and restart the server.")

# Keep a short rolling history per (city) session isn't needed for a hackathon
# demo — each request is grounded fresh from live data instead, which is
# actually more reliable than trusting client-sent history.

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


async def ask_heatbot(message: str, city: str = DEFAULT_CITY) -> dict | None:
    """
    Returns {"reply": str, "model": str, "grounded_on": {...}} on success,
    or None if the LLM path isn't available (caller should fall back).
    """
    if not GROQ_API_KEY:
        return None

    ctx = _build_context(city)
    system_prompt = SYSTEM_PROMPT_TEMPLATE.format(**ctx)

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
        return {"reply": reply, "model": GROQ_MODEL, "grounded_on": ctx}
    except Exception as e:
        # Groq down / rate-limited / bad key / network issue — caller falls
        # back to the keyword bot so the demo never breaks. Printed so it's
        # visible in the terminal instead of failing silently.
        print(f"[HeatBot/Groq] LLM call failed, falling back to keyword bot: {e!r}")
        return None
