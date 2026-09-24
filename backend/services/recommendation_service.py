# Urban Heat AI v2 — Recommendation Service
#
# Simulation is now model-driven: each scenario nudges the physical drivers that
# actually cause cooling (vegetation cover / built-up heat retention) per zone,
# feeds the adjusted zone through the trained RandomForest LST model
# (backend/ml/train_lst_model.py), and re-derives risk/health impact from the
# model's *predicted* LST — instead of a single hardcoded "°C per %" multiplier
# applied uniformly city-wide. Falls back to the old linear formula if the model
# hasn't been trained yet, so the endpoint never breaks.
#
# get_zone_recommendations() now returns THREE things per zone, not one:
#   - actions:            planner/municipal-facing infrastructure interventions,
#                          now hazard-aware (heat / landslide / rain), not just heat
#   - breakdown:           Hazard/Exposure/Vulnerability decomposition of WHY this
#                          zone is risky, instead of one opaque HVI number
#                          (risk_explainer_service.py)
#   - public_safety_tips:  citizen-facing "what to do right now", separate from
#                          the planner actions above (risk_explainer_service.py)

from __future__ import annotations

from backend.config import CITY_REGISTRY, SIM_SCENARIOS
from backend.services.heat_service import _CITY_HEAT, _base_lst_for_city, _generate_grid
from backend.services.ml_service import is_ready, predict_lst
from backend.services.risk_explainer_service import compute_hev_breakdown, get_public_safety_tips, detect_active_hazards
from backend.utils.helpers import compute_hvi, risk_level_from_hvi

STRATEGIES = [
    {"id": "green_cover",    "name": "Green Cover Expansion", "icon": "🌳",
     "description": "Plant trees & create urban forests in heat-stress zones.",
     "effectiveness": "High", "cost_crore_per_km2": 1.2, "implementation_months": 24},
    {"id": "cool_roofs",     "name": "Cool Roof Programme",   "icon": "🏠",
     "description": "White/reflective roof coatings on residential & commercial buildings.",
     "effectiveness": "Medium-High", "cost_crore_per_km2": 0.8, "implementation_months": 12},
    {"id": "cool_pavements", "name": "Permeable Pavements",   "icon": "🛣️",
     "description": "Replace asphalt with permeable, light-coloured paving materials.",
     "effectiveness": "Medium", "cost_crore_per_km2": 1.5, "implementation_months": 18},
    {"id": "water_bodies",   "name": "Water Body Restoration", "icon": "💧",
     "description": "Restore lakes, ponds & fountains for evaporative cooling.",
     "effectiveness": "High", "cost_crore_per_km2": 2.0, "implementation_months": 30},
]

# How strongly each intervention shifts the model's physical drivers at 100% coverage.
# green_cover / water_bodies raise NDVI (more vegetation); cool_roofs / cool_pavements /
# water_bodies reduce urban_index (less impervious-surface heat retention).
SCENARIO_FEATURE_EFFECTS = {
    "green_cover":    {"ndvi_gain": 0.55, "urban_cut": 0.00},
    "cool_roofs":     {"ndvi_gain": 0.00, "urban_cut": 0.35},
    "cool_pavements": {"ndvi_gain": 0.00, "urban_cut": 0.28},
    "water_bodies":   {"ndvi_gain": 0.30, "urban_cut": 0.40},
}


def get_strategies() -> list:
    return STRATEGIES


def _simulate_with_model(city: str, cfg: dict, sc: dict, scenario: str, coverage_pct: float) -> dict:
    heat = _CITY_HEAT.get(city, {"base": 32, "hf": 8})
    base_lst, _calib = _base_lst_for_city(city, heat)
    zones = _generate_grid(city)
    n = len(zones)
    fraction = coverage_pct / 100
    effect = SCENARIO_FEATURE_EFFECTS.get(scenario, SCENARIO_FEATURE_EFFECTS["green_cover"])

    avg_lst = round(sum(z["lst"] for z in zones) / n, 2)
    max_lst = round(max(z["lst"] for z in zones), 2)
    high_before = [z for z in zones if z["risk_level"] in ("High", "Very High")]
    pop_before = sum(z["population_density"] for z in high_before)

    new_lsts = []
    pop_after = 0
    high_after_count = 0
    for z in zones:
        ndvi_gain = min(0.85 - z["ndvi"], effect["ndvi_gain"] * fraction)
        new_ndvi = round(z["ndvi"] + ndvi_gain, 3)
        new_urban = round(z["urban_index"] * (1 - effect["urban_cut"] * fraction), 4)

        predicted = predict_lst(new_ndvi, z["population_density"], new_urban, base_lst, heat["hf"])
        new_lst = predicted if predicted is not None else z["lst"]
        new_lsts.append(new_lst)

        new_uhi = round(new_lst - (base_lst + 4), 2)
        new_hvi = compute_hvi(new_lst, new_ndvi, z["population_density"], new_uhi,
                               base_lst=base_lst, hf=heat["hf"])
        new_risk = risk_level_from_hvi(new_hvi)
        if new_risk in ("High", "Very High"):
            high_after_count += 1
            pop_after += z["population_density"]

    new_avg = round(sum(new_lsts) / n, 2)
    lst_reduction = round(avg_lst - new_avg, 2)

    people_benefited = max(0, pop_before - pop_after)
    deaths_saved = int(people_benefited * 0.00006)
    hosp_saved = int(people_benefited * 0.0007)
    econ_saving = int(sc["econ_per_unit"] * coverage_pct)

    return {
        "city": cfg["name"], "city_key": city,
        "scenario": scenario, "coverage_percent": coverage_pct,
        "current_state":   {"avg_lst": avg_lst, "max_lst": max_lst, "hotspots": len(high_before)},
        "projected_state": {
            "avg_lst": new_avg, "temp_reduction": lst_reduction,
            "hotspots_after": high_after_count,
        },
        "health_impact": {
            "projected_deaths_prevented":           deaths_saved,
            "projected_hospitalizations_prevented": hosp_saved,
            "people_benefited":                     people_benefited,
        },
        "economic_saving_crore": econ_saving,
        "model_used": True,
    }


def _simulate_with_formula(city: str, cfg: dict, sc: dict, scenario: str, coverage_pct: float) -> dict:
    """Fallback path — only used if the ML model hasn't been trained yet."""
    zones = _generate_grid(city)
    n = len(zones)
    avg_lst = round(sum(z["lst"] for z in zones) / n, 2)
    max_lst = round(max(z["lst"] for z in zones), 2)
    high_risk = sum(1 for z in zones if z["risk_level"] in ("High", "Very High"))

    lst_reduction = round(sc["lst_factor"] * coverage_pct, 2)
    new_avg       = round(avg_lst - lst_reduction, 2)
    pop_at_risk   = sum(z["population_density"] for z in zones
                        if z["risk_level"] in ("High", "Very High"))
    deaths_saved  = int(pop_at_risk * 0.000025 * (coverage_pct / 100) * 2.5)
    hosp_saved    = int(pop_at_risk * 0.0003  * (coverage_pct / 100) * 2.5)
    benefited     = int(pop_at_risk * (coverage_pct / 100) * 1.8)
    econ_saving   = int(sc["econ_per_unit"] * coverage_pct)

    return {
        "city": cfg["name"], "city_key": city,
        "scenario": scenario, "coverage_percent": coverage_pct,
        "current_state":   {"avg_lst": avg_lst, "max_lst": max_lst, "hotspots": high_risk},
        "projected_state": {
            "avg_lst": new_avg, "temp_reduction": lst_reduction,
            "hotspots_after": max(0, high_risk - int(coverage_pct * 1.5))
        },
        "health_impact": {
            "projected_deaths_prevented":           deaths_saved,
            "projected_hospitalizations_prevented": hosp_saved,
            "people_benefited":                     benefited,
        },
        "economic_saving_crore": econ_saving,
        "model_used": False,
    }


def simulate(city: str, scenario: str, coverage_pct: float) -> dict:
    cfg = CITY_REGISTRY.get(city, CITY_REGISTRY["delhi"])
    sc  = SIM_SCENARIOS.get(scenario, SIM_SCENARIOS["green_cover"])
    if is_ready():
        return _simulate_with_model(city, cfg, sc, scenario, coverage_pct)
    return _simulate_with_formula(city, cfg, sc, scenario, coverage_pct)


def _planner_actions_for_zone(z: dict) -> list:
    """
    Planner/municipal-facing infrastructure actions — now hazard-aware:
    checks heat, landslide AND rain conditions instead of only heat, so a
    zone with e.g. active landslide risk gets landslide-specific actions
    rather than always heat-only advice regardless of what's actually
    happening there.
    """
    active = detect_active_hazards(z)
    actions = []

    if "heat" in active:
        if z["ndvi"] < 0.25:   actions.append("Plant trees / green cover")
        if z["lst"] > 42:      actions.append("Deploy cool roofs")
        if z["population_density"] > 20000: actions.append("Set up cooling shelter")
        if z["uhi_intensity"] > 3: actions.append("Cool pavements & shade structures")

    if "landslide" in active:
        if z.get("slope_deg", 0) > 25:
            actions.append("High-slope zone — restrict new construction")
        if z.get("rainfall_48h_mm", 0) > 50:
            actions.append("Evacuation advisory — monitor next 24h")
        actions.append("Increase drainage / retaining-wall inspection frequency")

    if "rain" in active:
        actions.append("Clear storm drains — waterlogging risk")
        actions.append("Activate flood shelters in low-lying areas")

    return actions or ["Monitor & maintain current green cover"]


def get_zone_recommendations(city: str, top: int = 5) -> list:
    zones = _generate_grid(city)
    # Sort by HVI descending
    zones.sort(key=lambda z: z["hvi"], reverse=True)
    result = []
    for z in zones[:top]:
        breakdown = compute_hev_breakdown(z)
        safety = get_public_safety_tips(z)
        result.append({
            "cell_id": z["cell_id"],
            "hvi": z["hvi"],
            "risk_level": z["risk_level"],
            "lst": z["lst"],
            "active_hazards": safety["active_hazards"],
            "actions": _planner_actions_for_zone(z),
            "breakdown": breakdown,
            "public_safety_tips": safety["tips"],
        })
    return result