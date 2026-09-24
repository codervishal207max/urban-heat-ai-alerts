# Urban Heat AI v2 — Cities API Routes
#
# Powers the "search any city" feature: /search resolves free-text queries
# to lat/lon via Nominatim, /register adds the chosen result to
# CITY_REGISTRY so every other endpoint (heat, recommendations, trend,
# hotspots...) works for it immediately by city_key, and /list exposes the
# full registry so the frontend dropdown/map config can be built
# dynamically instead of being hand-duplicated per city.

from __future__ import annotations

from fastapi import APIRouter, Query
from pydantic import BaseModel

from backend.config import CITY_REGISTRY, register_dynamic_city
from backend.services.geocode_service import search_city

router = APIRouter(prefix="/cities", tags=["Cities"])


@router.get("/search", summary="Search for any city by name (Nominatim geocoding)")
def search(q: str = Query(..., min_length=2, description="Free-text city search query")):
    matches = search_city(q)
    return {"query": q, "count": len(matches), "results": matches}


class RegisterCityRequest(BaseModel):
    name: str
    lat: float
    lon: float


@router.post("/register", summary="Register a searched city so it can be used by city_key")
def register(payload: RegisterCityRequest):
    key = register_dynamic_city(payload.name, payload.lat, payload.lon)
    cfg = CITY_REGISTRY[key]
    return {"city_key": key, **cfg}


@router.get("/list", summary="All cities currently in the registry (curated + dynamically added)")
def list_cities():
    return {
        "count": len(CITY_REGISTRY),
        "cities": [
            {"key": key, "name": cfg["name"], "lat": cfg["lat"], "lon": cfg["lon"],
             "is_dynamic": cfg.get("is_dynamic", False)}
            for key, cfg in CITY_REGISTRY.items()
        ],
    }