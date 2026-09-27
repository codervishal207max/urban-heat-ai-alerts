# Urban Heat AI v2 — Geocoding Service
#
# Resolves ANY location — down to a locality/college within a city (e.g.
# "Ratibad, Bhopal"), not just city-level — to lat/lon, so the search bar
# works at whatever granularity the user types. Once resolved,
# register_dynamic_city() in config.py adds it to CITY_REGISTRY at runtime,
# so every existing endpoint works for it immediately.
#
# PRIMARY: Google Maps Geocoding API — far better at resolving small
# localities/landmarks than free alternatives. Requires GOOGLE_MAPS_API_KEY
# in .env (Google Cloud Console -> enable "Geocoding API" -> create an API
# key; needs a billing account, but Google's $200/month free credit covers
# hackathon-scale usage).
#
# FALLBACK: Nominatim (OpenStreetMap) -- free, no key -- used automatically
# if GOOGLE_MAPS_API_KEY isn't set, so the app still works without setup,
# just with weaker resolution for very small/local place names.

from __future__ import annotations

import os
import requests

GOOGLE_GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json"
NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
REQUEST_TIMEOUT_SEC = 6
HEADERS = {"User-Agent": "UrbanHeatAI-Hackathon/1.0 (contact: project demo)"}


def _search_google(query: str, limit: int) -> list:
    api_key = os.environ.get("GOOGLE_MAPS_API_KEY")
    if not api_key:
        return []
    try:
        resp = requests.get(
            GOOGLE_GEOCODE_URL,
            params={"address": query, "key": api_key},
            timeout=REQUEST_TIMEOUT_SEC,
        )
        resp.raise_for_status()
        data = resp.json()
        if data.get("status") != "OK":
            return []

        matches = []
        for r in data.get("results", [])[:limit]:
            loc = r["geometry"]["location"]
            # Prefer the most specific short name available (locality,
            # sublocality, or the first address component) over the full
            # formatted address, so "Ratibad" shows as "Ratibad", not the
            # entire "Ratibad, Bhopal, Madhya Pradesh, India" string.
            comps = r.get("address_components", [])
            name = next(
                (c["long_name"] for c in comps
                 if any(t in c.get("types", []) for t in
                        ("sublocality", "locality", "neighborhood", "premise", "establishment"))),
                r.get("formatted_address", query),
            )
            matches.append({
                "name": name,
                "display_name": r.get("formatted_address", name),
                "lat": loc["lat"],
                "lon": loc["lng"],
            })
        return matches
    except Exception:
        return []


def _search_nominatim(query: str, limit: int) -> list:
    try:
        resp = requests.get(
            NOMINATIM_URL,
            params={"q": query.strip(), "format": "json", "limit": limit, "addressdetails": 1},
            headers=HEADERS,
            timeout=REQUEST_TIMEOUT_SEC,
        )
        resp.raise_for_status()
        results = resp.json()

        matches = []
        for r in results:
            addr = r.get("address", {})
            name = (addr.get("suburb") or addr.get("neighbourhood") or addr.get("city")
                    or addr.get("town") or addr.get("village") or addr.get("county")
                    or r.get("display_name", "").split(",")[0])
            matches.append({
                "name": name,
                "display_name": r.get("display_name", name),
                "lat": float(r["lat"]),
                "lon": float(r["lon"]),
            })
        return matches
    except Exception:
        return []


def search_city(query: str, limit: int = 5) -> list:
    """
    Returns up to `limit` matches for a free-text location search (city,
    neighbourhood, landmark, college -- any granularity), each as
    {name, display_name, lat, lon}. Tries Google first, falls back to
    Nominatim if no API key is configured or Google returns nothing.
    """
    if not query or len(query.strip()) < 2:
        return []

    matches = _search_google(query, limit)
    if not matches:
        matches = _search_nominatim(query, limit)
    return matches