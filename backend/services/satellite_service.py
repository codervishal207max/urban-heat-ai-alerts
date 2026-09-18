# Urban Heat AI v2 — Real Satellite Data Service
#
# Pulls a REAL satellite-informed Earth Skin Temperature reading (our LST
# anchor) from NASA's POWER API (power.larc.nasa.gov) — free, no API key,
# no signup, no GEE service-account setup. POWER's "TS" parameter (Earth
# Skin Temperature, °C) comes from NASA's MERRA-2 reanalysis, which
# assimilates real satellite radiance observations (incl. MODIS) rather
# than being purely modelled.
#
# POWER's daily endpoint has ~3-7 day latency (it isn't "right now" data),
# so we request the last 10 days and use the most recent day that actually
# has a published value. Every one of the 10 cities gets this real anchor —
# not just one — heat_service.py prefers it over the Open-Meteo live-air-
# temp anchor when available, and falls back to Open-Meteo, then the
# static baseline, exactly like before. The app never breaks because of
# this — any network/API/schema issue just falls through silently.
#
# Upgrade path: true PIXEL-LEVEL MODIS/Landsat LST imagery (per-zone, not
# just one city-wide reading) is possible via Google Earth Engine, but
# needs a GEE service account + OAuth — heavier to set up mid-hackathon.
# This gives a genuinely real, independently-verifiable number today with
# zero setup; swapping in GEE later only means replacing this one file.

import time
from datetime import datetime, timedelta

import requests

from backend.config import CITY_REGISTRY

POWER_URL = "https://power.larc.nasa.gov/api/temporal/daily/point"
REQUEST_TIMEOUT_SEC = 6
CACHE_TTL_SEC = 6 * 3600  # 6h — POWER's own data only refreshes every few days anyway
LOOKBACK_DAYS = 10        # enough to ride out POWER's publication latency

_cache: dict[str, dict] = {}


def fetch_real_lst(city_key: str) -> dict | None:
    """
    Returns {lst_c, obs_date, source, fetched_at} using NASA POWER's Earth
    Skin Temperature (TS) — a real satellite-informed reading — for the
    given city, or None if unavailable (unknown city, network/API issue,
    or POWER hasn't published a recent value yet). Cached per city for
    CACHE_TTL_SEC.
    """
    now = time.time()
    cached = _cache.get(city_key)
    if cached and (now - cached["fetched_at"]) < CACHE_TTL_SEC:
        return cached

    cfg = CITY_REGISTRY.get(city_key)
    if not cfg:
        return None

    end = datetime.utcnow().date()
    start = end - timedelta(days=LOOKBACK_DAYS)

    try:
        resp = requests.get(
            POWER_URL,
            params={
                "parameters": "TS",
                "community": "RE",
                "longitude": cfg["lon"],
                "latitude": cfg["lat"],
                "start": start.strftime("%Y%m%d"),
                "end": end.strftime("%Y%m%d"),
                "format": "JSON",
            },
            timeout=REQUEST_TIMEOUT_SEC,
        )
        resp.raise_for_status()
        data = resp.json()
        series = data.get("properties", {}).get("parameter", {}).get("TS", {})

        # POWER uses -999 as a "not published yet" sentinel instead of
        # omitting the key, so filter those out explicitly.
        valid = {d: v for d, v in series.items() if v is not None and v > -900}
        if not valid:
            return None

        latest_date = max(valid.keys())  # "YYYYMMDD" strings sort correctly
        result = {
            "lst_c": round(float(valid[latest_date]), 2),
            "obs_date": f"{latest_date[:4]}-{latest_date[4:6]}-{latest_date[6:]}",
            "source": "NASA POWER (satellite-informed, MERRA-2)",
            "fetched_at": now,
        }
        _cache[city_key] = result
        return result
    except Exception:
        # Network down, API down, unexpected schema, etc. — caller falls
        # back to the Open-Meteo anchor / static baseline.
        return None
