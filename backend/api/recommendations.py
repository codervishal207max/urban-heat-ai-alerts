# Urban Heat AI v2 — Recommendations API Routes
from fastapi import APIRouter, Query
from backend.config import DEFAULT_CITY
from backend.services.recommendation_service import (
    get_strategies, simulate, get_zone_recommendations
)

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])

@router.get("/strategies", summary="Available cooling strategies")
def strategies():
    return {"strategies": get_strategies()}

@router.get("/simulate", summary="Simulate a cooling intervention")
def simulate_scenario(
    city:     str   = Query(DEFAULT_CITY),
    scenario: str   = Query("green_cover"),
    coverage: float = Query(20.0, ge=1, le=100)
):
    return simulate(city, scenario, coverage)

@router.get("/zones", summary="Top high-priority zones with actions")
def zone_recs(
    city: str = Query(DEFAULT_CITY),
    top:  int = Query(5, ge=1, le=50)
):
    return {"city": city, "recommendations": get_zone_recommendations(city, top)}
