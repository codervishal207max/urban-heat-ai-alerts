# Urban Heat AI v2 — Heat API Routes
from fastapi import APIRouter, Query
from backend.config import DEFAULT_CITY
from backend.services.heat_service import get_heat_map, get_hotspots, get_trend, get_calibration_info

router = APIRouter(prefix="/heat", tags=["Heat"])


@router.get("/live", summary="Live weather calibration status for a city")
def live_calibration(city: str = Query(DEFAULT_CITY, description="City key")):
    """
    Tells the frontend whether the heat grid is currently anchored to a real
    Open-Meteo temperature reading, or running on the static offline baseline.
    """
    return get_calibration_info(city)


@router.get("/map", summary="GeoJSON heat map for a city")
def heat_map(city: str = Query(DEFAULT_CITY, description="City key")):
    return get_heat_map(city)


@router.get("/hotspots", summary="UHI hotspot zones (UHI intensity ≥ threshold)")
def hotspots(
    city: str = Query(DEFAULT_CITY),
    threshold: float = Query(2.0, description="Min UHI intensity (°C)")
):
    spots = get_hotspots(city, threshold)
    return {"city": city, "threshold": threshold, "count": len(spots), "hotspots": spots}


@router.get("/trend", summary="Monthly LST seasonal trend")
def trend(city: str = Query(DEFAULT_CITY)):
    return get_trend(city)

