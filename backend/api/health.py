# Urban Heat AI v2 — Health API Routes
from fastapi import APIRouter, Query
from backend.config import DEFAULT_CITY
from backend.services.health_service import (
    get_risk_map, get_vulnerable_populations, get_health_forecast
)

router = APIRouter(prefix="/health", tags=["Health"])

@router.get("/risk-map", summary="Zone-level HVI risk map")
def risk_map(city: str = Query(DEFAULT_CITY)):
    return get_risk_map(city)

@router.get("/vulnerable-populations", summary="Vulnerable population stats")
def vulnerable(city: str = Query(DEFAULT_CITY)):
    return get_vulnerable_populations(city)

@router.get("/forecast", summary="7-day health risk forecast")
def forecast(city: str = Query(DEFAULT_CITY)):
    return get_health_forecast(city)
