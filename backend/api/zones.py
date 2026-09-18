# Urban Heat AI v2 — Zones API Routes
from fastapi import APIRouter, Query
from backend.config import CITY_REGISTRY, DEFAULT_CITY
from backend.services.heat_service import _generate_grid, get_calibration_info
from backend.services.health_service import get_vulnerable_populations

router = APIRouter(prefix="/zones", tags=["Zones"])

@router.get("/cities", summary="List all supported cities")
def cities():
    return {
        "cities": [
            {"key": k, "name": v["name"], "lat": v["lat"], "lon": v["lon"]}
            for k, v in CITY_REGISTRY.items()
        ]
    }

@router.get("/summary", summary="Complete city summary (heat + health + risk distribution)")
def summary(city: str = Query(DEFAULT_CITY)):
    cfg   = CITY_REGISTRY.get(city, CITY_REGISTRY[DEFAULT_CITY])
    zones = _generate_grid(city)
    n     = len(zones)
    lsts  = [z["lst"]  for z in zones]
    uhis  = [z["uhi_intensity"] for z in zones]
    hvis  = [z["hvi"]  for z in zones]
    dist  = {"Very Low":0,"Low":0,"Moderate":0,"High":0,"Very High":0}
    for z in zones:
        dist[z["risk_level"]] = dist.get(z["risk_level"],0) + 1
    pop_data = get_vulnerable_populations(city)
    return {
        "city":      cfg["name"],
        "city_key":  city,
        "zones":     n,
        "heat_summary": {
            "avg_lst":    round(sum(lsts)/n, 2),
            "max_lst":    round(max(lsts), 2),
            "min_lst":    round(min(lsts), 2),
            "avg_uhi":    round(sum(uhis)/n, 2),
            "uhi_hotspots": sum(1 for u in uhis if u >= 2.0),
        },
        "health_summary": {
            "avg_hvi":              round(sum(hvis)/n, 3),
            "high_risk_zones":      dist["High"] + dist["Very High"],
            "population_at_high_risk": pop_data["population_at_high_risk"],
            "estimated_deaths":     pop_data["estimated_deaths_per_summer"],
        },
        "risk_distribution": dist,
        "calibration": get_calibration_info(city),
    }
