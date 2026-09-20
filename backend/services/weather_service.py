# Urban Heat AI v2 — Live Weather Service
# Fetches real current temperature/humidity from Open-Meteo (free, no API key)
# and caches it briefly so the synthetic heat grid can be anchored to real
# ground conditions instead of being purely formula-generated.

from typing import Dict, Optional
import time
import requests
from backend.config import CITY_REGISTRY

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"
REQUEST_TIMEOUT_SEC = 2.5
CACHE_TTL_SEC = 900  # 15 minutes — enough to stay "live" without hammering the API

_cache: Dict[str, Dict] = {}


def fetch_live_weather(city_key: str) -> Optional[Dict]:
    """
    Returns {temp_c, humidity_pct, apparent_temp_c, fetched_at, source}
    for the given city, or None if the city is unknown or the request fails.
    Results are cached per city for CACHE_TTL_SEC to avoid excessive calls.
    """
    now = time.time()
    cached = _cache.get(city_key)
    if cached and (now - cached["fetched_at"]) < CACHE_TTL_SEC:
        return cached

    cfg = CITY_REGISTRY.get(city_key)
    if not cfg:
        return None

    try:
        resp = requests.get(
            OPEN_METEO_URL,
            params={
                "latitude": cfg["lat"],
                "longitude": cfg["lon"],
                "current": "temperature_2m,relative_humidity_2m,apparent_temperature",
                "daily": "temperature_2m_max",
                "timezone": "auto",
            },
            timeout=REQUEST_TIMEOUT_SEC,
        )
        resp.raise_for_status()
        data = resp.json()
        current = data.get("current", {})
        daily = data.get("daily", {})
        temp_c = current.get("temperature_2m")
        daily_max_list = daily.get("temperature_2m_max") or []
        daily_max_c = daily_max_list[0] if daily_max_list else None
        if temp_c is None and daily_max_c is None:
            return None

        result = {
            "temp_c": round(float(temp_c), 1) if temp_c is not None else None,
            "daily_max_c": round(float(daily_max_c), 1) if daily_max_c is not None else None,
            "humidity_pct": current.get("relative_humidity_2m"),
            "apparent_temp_c": current.get("apparent_temperature"),
            "fetched_at": now,
            "source": "open-meteo",
        }
        _cache[city_key] = result
        return result
    except Exception:
        # Network down, API down, bad response, etc. — caller falls back to
        # the static baseline so the app never breaks because of this.
        return None
