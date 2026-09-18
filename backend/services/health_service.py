# Urban Heat AI v2 — Health Service
import math
from backend.config import CITY_REGISTRY
from backend.services.heat_service import _generate_grid
from backend.utils.helpers import risk_level_from_hvi


def get_risk_map(city: str) -> dict:
    zones = _generate_grid(city)
    summary = {"Very Low": 0, "Low": 0, "Moderate": 0, "High": 0, "Very High": 0}
    for z in zones:
        summary[z["risk_level"]] = summary.get(z["risk_level"], 0) + 1
    return {
        "city": CITY_REGISTRY.get(city, {}).get("name", city),
        "total_zones": len(zones),
        "risk_distribution": summary,
        "zones": zones[:50],  # first 50 for lightweight response
    }


def get_vulnerable_populations(city: str) -> dict:
    cfg   = CITY_REGISTRY.get(city, CITY_REGISTRY["delhi"])
    zones = _generate_grid(city)
    high  = [z for z in zones if z["risk_level"] in ("High", "Very High")]
    pop_at_risk = sum(z["population_density"] for z in high)
    # Demographic model
    return {
        "city": cfg["name"],
        "total_population": cfg["population"],
        "population_at_high_risk": pop_at_risk,
        "estimated_deaths_per_summer": int(pop_at_risk * 0.000025),
        "estimated_hospitalizations":  int(pop_at_risk * 0.0003),
        "demographics": {
            "elderly_65_plus": int(pop_at_risk * 0.18),
            "children_under_5": int(pop_at_risk * 0.12),
            "outdoor_workers": int(pop_at_risk * 0.28),
            "low_income_households": int(pop_at_risk * 0.35),
        },
    }


def get_health_forecast(city: str) -> dict:
    cfg = CITY_REGISTRY.get(city, CITY_REGISTRY["delhi"])
    return {
        "city": cfg["name"],
        "forecast_days": 7,
        "daily_risk": [
            {"day": d+1, "risk": ["Moderate","High","High","Extreme","Extreme","High","Moderate"][d],
             "est_heat_stroke_cases": [12,28,35,67,72,41,19][d]}
            for d in range(7)
        ],
    }
