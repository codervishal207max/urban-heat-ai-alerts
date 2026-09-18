# Urban Heat AI v2 — Central Configuration

from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"

# ── City Registry ─────────────────────────────────────────────────────────────
CITY_REGISTRY = {
    "delhi":     {"name": "Delhi NCR",  "lat": 28.61, "lon": 77.21, "area_km2": 1484, "population": 31_000_000, "seed": 42},
    "mumbai":    {"name": "Mumbai",     "lat": 19.07, "lon": 72.87, "area_km2": 603,  "population": 20_700_000, "seed": 43},
    "bangalore": {"name": "Bangalore",  "lat": 12.97, "lon": 77.59, "area_km2": 741,  "population": 12_500_000, "seed": 44},
    "chennai":   {"name": "Chennai",    "lat": 13.08, "lon": 80.27, "area_km2": 426,  "population": 10_900_000, "seed": 45},
    "hyderabad": {"name": "Hyderabad",  "lat": 17.38, "lon": 78.47, "area_km2": 650,  "population": 10_000_000, "seed": 46},
    "kolkata":   {"name": "Kolkata",    "lat": 22.57, "lon": 88.36, "area_km2": 185,  "population": 14_800_000, "seed": 47},
    "pune":      {"name": "Pune",       "lat": 18.52, "lon": 73.86, "area_km2": 450,  "population": 7_400_000,  "seed": 48},
    "ahmedabad": {"name": "Ahmedabad",  "lat": 23.03, "lon": 72.58, "area_km2": 464,  "population": 8_100_000,  "seed": 49},
    "jaipur":    {"name": "Jaipur",     "lat": 26.92, "lon": 75.82, "area_km2": 467,  "population": 4_100_000,  "seed": 50},
    "lucknow":   {"name": "Lucknow",    "lat": 26.85, "lon": 80.95, "area_km2": 349,  "population": 3_700_000,  "seed": 51},
}

DEFAULT_CITY = "delhi"

# ── Grid Parameters ────────────────────────────────────────────────────────────
GRID_ROWS = 30
GRID_COLS = 30
LAT_STEP  = 0.011
LON_STEP  = 0.0165

# ── Risk Thresholds ────────────────────────────────────────────────────────────
RISK_LEVELS = ["Very Low", "Low", "Moderate", "High", "Very High"]
HEAT_THRESHOLDS = {"extreme": 44.0, "high": 40.0, "moderate": 36.0, "low": 32.0}

# ── Simulation Scenarios ───────────────────────────────────────────────────────
SIM_SCENARIOS = {
    "green_cover":    {"label": "Green Cover +%",   "lst_factor": 0.09, "econ_per_unit": 90},
    "cool_roofs":     {"label": "Cool Roofs",        "lst_factor": 0.06, "econ_per_unit": 60},
    "cool_pavements": {"label": "Cool Pavements",    "lst_factor": 0.04, "econ_per_unit": 45},
    "water_bodies":   {"label": "Water Bodies",      "lst_factor": 0.05, "econ_per_unit": 110},
}
