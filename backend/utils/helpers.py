# Urban Heat AI v2 — Utility Helpers

import random
import math


def risk_level_from_hvi(hvi: float) -> str:
    if hvi >= 0.80: return "Very High"
    if hvi >= 0.60: return "High"
    if hvi >= 0.40: return "Moderate"
    if hvi >= 0.20: return "Low"
    return "Very Low"


def risk_level_from_lst(lst: float) -> str:
    if lst >= 44.0: return "Very High"
    if lst >= 40.0: return "High"
    if lst >= 36.0: return "Moderate"
    if lst >= 32.0: return "Low"
    return "Very Low"


def seeded_noise(i: int, j: int, seed: int = 0) -> float:
    """Deterministic pseudo-noise in [-1, 1]"""
    return math.sin(i * 7.3 + j * 3.7 + seed) * 0.9


def compute_hvi(lst: float, ndvi: float, pop_density: float,
                uhi_intensity: float, base_lst: float = 32.0, hf: float = 8.0) -> float:
    """
    Heat Vulnerability Index (0-1, higher = more vulnerable).

    lst_norm and uhi_norm are normalized against the city's own heat-factor (hf)
    rather than a fixed constant. Every city's synthetic grid only spans an hf of
    ~7-9°C between its coolest and hottest zone, so dividing by a fixed 15/8 (tuned
    for a ~15°C swing) made it mathematically impossible for lower-hf cities
    (Mumbai, Kolkata, Bangalore, Pune) to ever reach the "High"/"Very High"
    thresholds — their simulations always showed 0 lives/people benefited
    regardless of conditions. Normalizing by hf fixes this across all cities.
    """
    lst_norm  = min(1, max(0, (lst - base_lst) / max(hf, 1e-6)))
    ndvi_norm = 1 - min(1, max(0, ndvi / 0.7))
    pop_norm  = min(1, max(0, pop_density / 30000))
    uhi_norm  = min(1, max(0, uhi_intensity / max(hf - 3, 1.0)))
    hvi = 0.40 * lst_norm + 0.25 * uhi_norm + 0.20 * ndvi_norm + 0.15 * pop_norm
    return round(min(1.0, max(0.0, hvi)), 3)


def bbox_from_center(lat: float, lon: float, rows: int, cols: int,
                     lat_step: float, lon_step: float) -> dict:
    return {
        "lat_min": lat - (rows / 2) * lat_step,
        "lat_max": lat + (rows / 2) * lat_step,
        "lon_min": lon - (cols / 2) * lon_step,
        "lon_max": lon + (cols / 2) * lon_step,
    }
