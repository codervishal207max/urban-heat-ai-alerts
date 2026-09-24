# Urban Heat AI v2 — Risk Explainer Service
#
# Addresses two gaps in the original HVI-only model:
#   1. "High temperature != automatically highest risk" — a single HVI number
#      hides WHY a zone is risky. This decomposes it into Hazard / Exposure /
#      Vulnerability (the standard disaster-risk framework: Risk = f(H, E, V))
#      so a judge/planner can see which factor is actually driving the score,
#      instead of temperature alone standing in for "risk".
#   2. The existing recommendation set (recommendation_service.py) is written
#      for planners/municipal authorities (cool roofs, tree cover — long-term
#      infrastructure). This adds a SEPARATE, citizen-facing set: what an
#      ordinary person in that zone should actually do right now.
#
# Deliberately stays free of any external API — everything here is derived
# from fields _generate_grid() already computes (heat_service.py), so it has
# zero added latency or failure surface.

from __future__ import annotations


def _clamp01(x: float) -> float:
    return max(0.0, min(1.0, x))


def compute_hev_breakdown(zone: dict) -> dict:
    """
    Decomposes a zone's risk into Hazard / Exposure / Vulnerability, each
    0-1, plus which one is the dominant ("primary") driver of its overall
    risk. Hazard itself considers all three live hazard types (heat, rain,
    landslide) this platform tracks, and reports whichever is most severe
    for that zone as the hazard's own "type".

    This does NOT replace the existing HVI (used for risk_level/sorting) —
    it explains what HVI is already weighting, in a form a judge/planner can
    read at a glance instead of reverse-engineering from one number.
    """
    # --- Hazard: worst of the three live hazard types for this zone ---
    heat_hazard = _clamp01(zone.get("uhi_intensity", 0) / 8.0)
    rain_hazard = _clamp01(zone.get("rainfall_48h_mm", 0) / 100.0)
    landslide_hazard = _clamp01(zone.get("landslide_risk_score", 0))

    hazard_candidates = [
        ("heat", heat_hazard, f"LST {zone.get('lst')}°C — {round(max(0, zone.get('uhi_intensity', 0)), 1)}°C above city baseline"),
        ("rain", rain_hazard, f"{zone.get('rainfall_48h_mm', 0)} mm rainfall in the last 48h"),
        ("landslide", landslide_hazard, f"{zone.get('slope_deg', 0)}° slope with {zone.get('rainfall_48h_mm', 0)} mm recent rainfall"),
    ]
    hazard_type, hazard_score, hazard_detail = max(hazard_candidates, key=lambda c: c[1])

    # --- Exposure: how many people are in the path of that hazard ---
    pop = zone.get("population_density", 0)
    exposure_score = _clamp01(pop / 30000.0)
    exposure_detail = f"{pop:,} people in this zone"

    # --- Vulnerability: how little natural buffer/resilience this zone has ---
    ndvi = zone.get("ndvi", 0.3)
    vulnerability_score = _clamp01(1 - ndvi)
    vulnerability_detail = f"NDVI {ndvi} — {'minimal' if ndvi < 0.2 else 'limited' if ndvi < 0.4 else 'moderate'} vegetation buffer"

    scores = {
        "hazard": hazard_score,
        "exposure": exposure_score,
        "vulnerability": vulnerability_score,
    }
    primary_driver = max(scores, key=scores.get)

    return {
        "hazard": {
            "score": round(hazard_score, 3),
            "type": hazard_type,
            "label": {"heat": "Extreme heat", "rain": "Heavy rainfall", "landslide": "Landslide-prone terrain"}[hazard_type],
            "detail": hazard_detail,
        },
        "exposure": {
            "score": round(exposure_score, 3),
            "label": "Population exposure",
            "detail": exposure_detail,
        },
        "vulnerability": {
            "score": round(vulnerability_score, 3),
            "label": "Low green-cover resilience",
            "detail": vulnerability_detail,
        },
        "primary_driver": primary_driver,
    }


# ── Citizen-facing public safety tips (separate from planner recommendations) ──

_HEAT_TIPS = [
    "Avoid stepping outdoors between 12 PM and 4 PM",
    "Drink water frequently, even before feeling thirsty",
    "Keep elderly people and children indoors during peak heat hours",
    "Wear light-colored, loose cotton clothing outdoors",
]

_RAIN_TIPS = [
    "Avoid waterlogged roads and underpasses",
    "Do not walk or drive through flowing floodwater",
    "Keep a flashlight and emergency contacts ready",
    "Move vehicles away from low-lying parking areas",
]

_LANDSLIDE_TIPS = [
    "Avoid staying overnight in this zone while an alert is active",
    "Watch for new cracks appearing in walls, roads, or the ground",
    "Keep an emergency bag ready for quick evacuation",
    "Report unusual water seepage from nearby slopes immediately",
]


def detect_active_hazards(zone: dict) -> list[str]:
    """Which hazard types are currently active for this zone, by simple thresholds."""
    active = []
    if zone.get("lst", 0) > 36 or zone.get("uhi_intensity", 0) > 2:
        active.append("heat")
    if zone.get("landslide_risk_level") in ("Moderate", "High"):
        active.append("landslide")
    if zone.get("rainfall_48h_mm", 0) > 50:
        active.append("rain")
    return active


def get_public_safety_tips(zone: dict) -> dict:
    """
    Returns citizen-facing safety tips per active hazard for this zone —
    what a resident should DO, distinct from recommendation_service.py's
    planner-facing infrastructure actions (cool roofs, tree cover, etc.).
    """
    active = detect_active_hazards(zone)
    tips_by_hazard = {}
    if "heat" in active:
        tips_by_hazard["heat"] = _HEAT_TIPS
    if "rain" in active:
        tips_by_hazard["rain"] = _RAIN_TIPS
    if "landslide" in active:
        tips_by_hazard["landslide"] = _LANDSLIDE_TIPS

    if not tips_by_hazard:
        tips_by_hazard["general"] = ["No active hazard for this zone — routine monitoring only."]

    return {"active_hazards": active, "tips": tips_by_hazard}