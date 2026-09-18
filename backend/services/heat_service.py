# Urban Heat AI v2 — Heat Data Service
import math, random
from backend.config import CITY_REGISTRY, GRID_ROWS, GRID_COLS, LAT_STEP, LON_STEP
from backend.utils.helpers import seeded_noise, compute_hvi, risk_level_from_hvi
from backend.services.weather_service import fetch_live_weather
from backend.services.satellite_service import fetch_real_lst

# Base LST and heat-factor per city
_CITY_HEAT = {
    "delhi":     {"base": 33, "hf": 9},
    "mumbai":    {"base": 28, "hf": 7},
    "bangalore": {"base": 26, "hf": 7},
    "chennai":   {"base": 30, "hf": 8},
    "hyderabad": {"base": 29, "hf": 8},
    "kolkata":   {"base": 31, "hf": 8},
    "pune":      {"base": 27, "hf": 7},
    "ahmedabad": {"base": 32, "hf": 8},
    "jaipur":    {"base": 33, "hf": 9},
    "lucknow":   {"base": 32, "hf": 8},
}


def _base_lst_for_city(city: str, heat: dict) -> tuple[float, dict]:
    """
    Anchors the synthetic grid's baseline LST to the most real reading available,
    in priority order:
      1. NASA POWER satellite-informed Earth Skin Temperature (real, satellite-based)
      2. Open-Meteo live/forecast air temperature (real, but air not ground temp)
      3. Static per-city baseline (offline fallback)
    Falls through silently on any failure so the app keeps working offline.

    Satellite path: POWER's Earth Skin Temperature is already a ground-temperature
    reading (not air temp), so it only gets a small urban-core bump — it's much
    closer to true LST than the Open-Meteo anchor is.

    Open-Meteo path: uses TODAY'S FORECASTED DAYTIME MAX temperature (not the
    current live temp) as the anchor, since LST is a satellite reading captured
    during daytime peak heat — anchoring to right-now temperature would make the
    grid go unrealistically cool at night/early morning. Falls back to current
    temp if daily max is unavailable. India-specific note: dense urban cores
    commonly run 5-10°C hotter than ambient air temperature (LST vs air temp
    gap), scaled here by each city's heat-factor (hf) since that already
    reflects how "urban-heavy" the city is.
    """
    sat = fetch_real_lst(city)
    if sat:
        base = round(sat["lst_c"] + heat["hf"] * 0.15, 2)
        meta = {
            "calibrated": True,
            "is_satellite": True,
            "source": sat["source"],
            "anchor_type": "satellite_skin_temp",
            "anchor_temp_c": sat["lst_c"],
            "obs_date": sat["obs_date"],
        }
        return base, meta

    live = fetch_live_weather(city)
    if live:
        anchor_temp = live.get("daily_max_c") if live.get("daily_max_c") is not None else live.get("temp_c")
        if anchor_temp is not None:
            base = round(anchor_temp + heat["hf"] * 0.6, 2)
            meta = {
                "calibrated": True,
                "is_satellite": False,
                "source": "open-meteo (live)",
                "anchor_type": "daily_max" if live.get("daily_max_c") is not None else "current",
                "anchor_temp_c": anchor_temp,
                "live_air_temp_c": live.get("temp_c"),
                "humidity_pct": live.get("humidity_pct"),
            }
            return base, meta
    return heat["base"], {"calibrated": False, "is_satellite": False, "source": "static baseline (offline)"}


def get_calibration_info(city: str) -> dict:
    """Public helper for the API layer to expose live-vs-static data source status."""
    heat = _CITY_HEAT.get(city, {"base": 32, "hf": 8})
    _, meta = _base_lst_for_city(city, heat)
    return {"city": city, **meta}


def _generate_grid(city: str) -> list[dict]:
    cfg  = CITY_REGISTRY.get(city, CITY_REGISTRY["delhi"])
    heat = _CITY_HEAT.get(city, {"base": 32, "hf": 8})
    clat, clon = cfg["lat"], cfg["lon"]
    seed = cfg["seed"]
    base_lst, _calib = _base_lst_for_city(city, heat)
    lat_off = clat - (GRID_ROWS / 2) * LAT_STEP
    lon_off = clon - (GRID_COLS / 2) * LON_STEP
    total_pop = cfg["population"]
    zones = []
    for i in range(GRID_ROWS):
        for j in range(GRID_COLS):
            lat = lat_off + i * LAT_STEP
            lon = lon_off + j * LON_STEP
            d = math.hypot((i - GRID_ROWS/2)/(GRID_ROWS/2), (j - GRID_COLS/2)/(GRID_COLS/2))
            urban = math.exp(-2.2 * d)
            noise = seeded_noise(i, j, seed)

            # NDVI has a typical value for a given built-up density (urban), plus an
            # independent component (a park in a dense area, a bare lot in a green
            # suburb) — decorrelating it from urban_index so the ML model can learn
            # vegetation's OWN cooling effect instead of just re-learning urban_index.
            ndvi_base = 0.65 - 0.5 * urban
            ndvi_noise = seeded_noise(i + 41, j + 67, seed) * 0.15
            ndvi = min(0.85, max(0.02, ndvi_base + ndvi_noise))
            # Real UHI science: vegetation cools independent of built-up density
            # (~1.2°C per 0.1 NDVI, matching the HeatBot's own stated figure).
            ndvi_cooling = (ndvi - ndvi_base) * -12

            lst   = base_lst + heat["hf"] * urban + noise * 0.8 + ndvi_cooling
            pop   = int(2000 + 26000 * urban * 0.7)
            uhi   = round(lst - (base_lst + 4), 2)
            hvi   = compute_hvi(lst, ndvi, pop, uhi, base_lst=base_lst, hf=heat["hf"])
            risk  = risk_level_from_hvi(hvi)
            zones.append({
                "cell_id": i * GRID_COLS + j,
                "lat": round(lat, 5), "lon": round(lon, 5),
                "lst": round(lst, 2), "ndvi": round(ndvi, 3),
                "uhi_intensity": uhi, "population_density": pop,
                "hvi": hvi, "risk_level": risk,
                "urban_index": round(urban, 4),
            })
    return zones


def get_heat_map(city: str) -> dict:
    zones = _generate_grid(city)
    features = []
    for z in zones:
        lat, lon = z["lat"], z["lon"]
        features.append({
            "type": "Feature",
            "properties": {k: v for k, v in z.items() if k not in ("lat", "lon")},
            "geometry": {"type": "Polygon", "coordinates": [[
                [lon-0.008, lat-0.005], [lon+0.008, lat-0.005],
                [lon+0.008, lat+0.005], [lon-0.008, lat+0.005], [lon-0.008, lat-0.005]
            ]]}
        })
    return {"type": "FeatureCollection", "features": features, "city": city}


def get_hotspots(city: str, threshold: float = 2.0) -> list[dict]:
    return [z for z in _generate_grid(city) if z["uhi_intensity"] >= threshold]


def get_trend(city: str) -> dict:
    heat = _CITY_HEAT.get(city, {"base": 32, "hf": 8})
    base = heat["base"]
    offsets = [-6, -4, -2, 0, 3, 6, 7, 5, 1, -2, -4, -5]
    months  = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
    cfg = CITY_REGISTRY.get(city, CITY_REGISTRY["delhi"])
    rng = random.Random(cfg["seed"])
    return {
        "city": cfg["name"],
        "months": months,
        "city_average": [round(base + o + rng.uniform(-0.4, 0.4), 1) for o in offsets],
        "uhi_zones":    [round(base + o + 4.5 + rng.uniform(-0.3, 0.3), 1) for o in offsets],
    }
