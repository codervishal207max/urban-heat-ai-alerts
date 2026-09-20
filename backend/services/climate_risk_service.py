# Urban Heat AI v2 — Climate Risk Service (Rain + Landslide)
#
# Batches rainfall (Open-Meteo) and elevation (Open-Elevation) requests across
# an entire city grid in ONE API call each, instead of one call per zone —
# keeps this fast enough to run inside _generate_grid() without rate-limiting.
# Slope is derived from the elevation grid via finite differences between
# neighbouring cells. Falls through to safe defaults (0 rainfall, 0 slope) on
# any failure, so heat data never breaks because of this.

from __future__ import annotations
import time
import math
import requests

RAIN_URL = "https://api.open-meteo.com/v1/forecast"
ELEVATION_URL = "https://api.open-elevation.com/api/v1/lookup"
REQUEST_TIMEOUT_SEC = 8
CACHE_TTL_SEC = 6 * 3600  # rainfall/elevation don't need per-minute freshness

_rain_cache: dict[str, dict] = {}
_elev_cache: dict[str, dict] = {}


def fetch_grid_rainfall(city_key: str, zones: list) -> list:
    """
    Returns a list of 48h cumulative rainfall (mm), aligned index-for-index
    with `zones`. One batched Open-Meteo call for the whole grid.
    """
    now = time.time()
    cached = _rain_cache.get(city_key)
    if cached and (now - cached["fetched_at"]) < CACHE_TTL_SEC:
        return cached["values"]

    lats = ",".join(str(z["lat"]) for z in zones)
    lons = ",".join(str(z["lon"]) for z in zones)

    try:
        resp = requests.get(
            RAIN_URL,
            params={
                "latitude": lats,
                "longitude": lons,
                "daily": "precipitation_sum",
                "past_days": 2,
                "timezone": "auto",
            },
            timeout=REQUEST_TIMEOUT_SEC,
        )
        resp.raise_for_status()
        data = resp.json()

        # Open-Meteo returns a list of per-point objects when multiple
        # lat/lon are passed, a single object when only one is passed.
        points = data if isinstance(data, list) else [data]
        values = []
        for pt in points:
            daily_vals = pt.get("daily", {}).get("precipitation_sum", [])
            valid = [v for v in daily_vals if v is not None]
            values.append(round(sum(valid), 2) if valid else 0.0)

        if len(values) != len(zones):
            return [0.0] * len(zones)

        _rain_cache[city_key] = {"values": values, "fetched_at": now}
        return values
    except Exception:
        return [0.0] * len(zones)


def fetch_grid_elevation(city_key: str, zones: list) -> list:
    """
    Returns elevation (metres) per zone, aligned with `zones`. One batched
    Open-Elevation call for the whole grid.
    """
    now = time.time()
    cached = _elev_cache.get(city_key)
    if cached and (now - cached["fetched_at"]) < CACHE_TTL_SEC:
        return cached["values"]

    locations = "|".join(f"{z['lat']},{z['lon']}" for z in zones)

    try:
        resp = requests.get(
            ELEVATION_URL,
            params={"locations": locations},
            timeout=REQUEST_TIMEOUT_SEC,
        )
        resp.raise_for_status()
        results = resp.json().get("results", [])
        values = [r.get("elevation", 0.0) for r in results]

        if len(values) != len(zones):
            return [0.0] * len(zones)

        _elev_cache[city_key] = {"values": values, "fetched_at": now}
        return values
    except Exception:
        return [0.0] * len(zones)


def compute_slope_grid(elevations: list, grid_rows: int, grid_cols: int, lat_step_deg: float) -> list:
    """
    Derives slope (degrees) per cell from neighbouring elevations using a
    finite-difference approximation. `elevations` is a flat list matching
    the row-major (i * grid_cols + j) ordering used in _generate_grid.
    """
    meters_per_deg_lat = 111_000
    cell_dist_m = lat_step_deg * meters_per_deg_lat
    slopes = [0.0] * len(elevations)

    def elev_at(i, j):
        if 0 <= i < grid_rows and 0 <= j < grid_cols:
            return elevations[i * grid_cols + j]
        return None

    for i in range(grid_rows):
        for j in range(grid_cols):
            here = elev_at(i, j)
            neighbours = [e for e in (elev_at(i-1, j), elev_at(i+1, j),
                                       elev_at(i, j-1), elev_at(i, j+1)) if e is not None]
            if here is None or not neighbours:
                continue
            max_diff = max(abs(here - n) for n in neighbours)
            slope_rad = math.atan(max_diff / cell_dist_m) if cell_dist_m > 0 else 0
            slopes[i * grid_cols + j] = round(math.degrees(slope_rad), 2)

    return slopes


def calculate_landslide_risk(rainfall_48h_mm: float, slope_deg: float, ndvi: float) -> dict:
    """
    Rainfall-threshold heuristic (mirrors published early-warning models like
    NASA LHASA): risk scales with recent rainfall + terrain steepness, offset
    by vegetation's soil-binding effect. Returns a 0-1 score + a level label.
    """
    rainfall_score = min(rainfall_48h_mm / 100, 1.0)
    slope_score = min(slope_deg / 45, 1.0)
    veg_score = 1 - ndvi

    risk = round((0.5 * rainfall_score) + (0.3 * slope_score) + (0.2 * veg_score), 3)

    if risk > 0.7:
        level = "High"
    elif risk > 0.4:
        level = "Moderate"
    else:
        level = "Low"

    return {"risk_score": risk, "risk_level": level}