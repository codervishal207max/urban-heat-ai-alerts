# Urban Heat AI v2 — Geocoding Service
#
# Lets the frontend search bar resolve ANY city (not just the ~50 pre-loaded
# in config.CITY_REGISTRY) to a lat/lon via Nominatim (OpenStreetMap) — free,
# no API key, no signup. Once resolved, register_dynamic_city() in config.py
# adds it to CITY_REGISTRY at runtime, so every existing endpoint (heat map,
# recommendations, trend, etc.) works for it immediately with zero changes
# to the rest of the codebase — they only ever look up a city by key.
#
# Nominatim's usage policy requires a real User-Agent header and caps abuse
# at roughly 1 req/sec — fine here since this fires once per user search,
# not in a loop.

from __future__ import annotations

import requests

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
REQUEST_TIMEOUT_SEC = 6
HEADERS = {"User-Agent": "UrbanHeatAI-Hackathon/1.0 (contact: project demo)"}


def search_city(query: str, limit: int = 5) -> list:
    """
    Returns up to `limit` matches for a free-text city search, each as
    {name, display_name, lat, lon}. Empty list on any failure — caller
    should show "no results" rather than crash.
    """
    if not query or len(query.strip()) < 2:
        return []

    try:
        resp = requests.get(
            NOMINATIM_URL,
            params={
                "q": query.strip(),
                "format": "json",
                "limit": limit,
                "addressdetails": 1,
            },
            headers=HEADERS,
            timeout=REQUEST_TIMEOUT_SEC,
        )
        resp.raise_for_status()
        results = resp.json()

        matches = []
        for r in results:
            addr = r.get("address", {})
            name = (addr.get("city") or addr.get("town") or addr.get("village")
                    or addr.get("county") or r.get("display_name", "").split(",")[0])
            matches.append({
                "name": name,
                "display_name": r.get("display_name", name),
                "lat": float(r["lat"]),
                "lon": float(r["lon"]),
            })
        return matches
    except Exception:
        return []