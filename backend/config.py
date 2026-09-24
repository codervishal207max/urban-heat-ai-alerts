# Urban Heat AI v2 — Central Configuration

from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"

# ── City Registry ─────────────────────────────────────────────────────────────
# Seeds must stay unique per city (used to deterministically vary the
# synthetic grid noise pattern). Hilly cities (Shimla, Gangtok, Dehradun,
# Siliguri) are included deliberately — they give the landslide-risk layer
# real visual contrast against the flat metros, since slope is derived from
# real elevation data (climate_risk_service.py) rather than being faked.
CITY_REGISTRY = {
    # --- Original 10 ---
    "delhi":         {"name": "Delhi NCR",         "lat": 28.61, "lon": 77.21, "area_km2": 1484, "population": 31_000_000, "seed": 42},
    "mumbai":        {"name": "Mumbai",            "lat": 19.07, "lon": 72.87, "area_km2": 603,  "population": 20_700_000, "seed": 43},
    "bangalore":     {"name": "Bangalore",         "lat": 12.97, "lon": 77.59, "area_km2": 741,  "population": 12_500_000, "seed": 44},
    "chennai":       {"name": "Chennai",           "lat": 13.08, "lon": 80.27, "area_km2": 426,  "population": 10_900_000, "seed": 45},
    "hyderabad":     {"name": "Hyderabad",         "lat": 17.38, "lon": 78.47, "area_km2": 650,  "population": 10_000_000, "seed": 46},
    "kolkata":       {"name": "Kolkata",           "lat": 22.57, "lon": 88.36, "area_km2": 185,  "population": 14_800_000, "seed": 47},
    "pune":          {"name": "Pune",              "lat": 18.52, "lon": 73.86, "area_km2": 450,  "population": 7_400_000,  "seed": 48},
    "ahmedabad":     {"name": "Ahmedabad",         "lat": 23.03, "lon": 72.58, "area_km2": 464,  "population": 8_100_000,  "seed": 49},
    "jaipur":        {"name": "Jaipur",            "lat": 26.92, "lon": 75.82, "area_km2": 467,  "population": 4_100_000,  "seed": 50},
    "lucknow":       {"name": "Lucknow",           "lat": 26.85, "lon": 80.95, "area_km2": 349,  "population": 3_700_000,  "seed": 51},

    # --- Major metros / tier-1 ---
    "surat":         {"name": "Surat",             "lat": 21.17, "lon": 72.83, "area_km2": 326,  "population": 6_500_000,  "seed": 52},
    "kanpur":        {"name": "Kanpur",            "lat": 26.45, "lon": 80.33, "area_km2": 403,  "population": 3_200_000,  "seed": 53},
    "nagpur":        {"name": "Nagpur",             "lat": 21.15, "lon": 79.09, "area_km2": 228,  "population": 2_900_000,  "seed": 54},
    "indore":        {"name": "Indore",             "lat": 22.72, "lon": 75.86, "area_km2": 530,  "population": 3_300_000,  "seed": 55},
    "thane":         {"name": "Thane",              "lat": 19.22, "lon": 72.98, "area_km2": 147,  "population": 1_900_000,  "seed": 56},
    "bhopal":        {"name": "Bhopal",             "lat": 23.26, "lon": 77.41, "area_km2": 286,  "population": 2_400_000,  "seed": 57},
    "visakhapatnam": {"name": "Visakhapatnam",      "lat": 17.69, "lon": 83.22, "area_km2": 682,  "population": 2_200_000,  "seed": 58},
    "patna":         {"name": "Patna",              "lat": 25.59, "lon": 85.14, "area_km2": 250,  "population": 2_500_000,  "seed": 59},
    "vadodara":      {"name": "Vadodara",           "lat": 22.31, "lon": 73.19, "area_km2": 235,  "population": 2_100_000,  "seed": 60},
    "ghaziabad":     {"name": "Ghaziabad",          "lat": 28.67, "lon": 77.42, "area_km2": 210,  "population": 2_400_000,  "seed": 61},
    "ludhiana":      {"name": "Ludhiana",           "lat": 30.90, "lon": 75.86, "area_km2": 310,  "population": 1_900_000,  "seed": 62},
    "agra":          {"name": "Agra",               "lat": 27.18, "lon": 78.02, "area_km2": 190,  "population": 1_900_000,  "seed": 63},
    "nashik":        {"name": "Nashik",             "lat": 19.99, "lon": 73.79, "area_km2": 264,  "population": 1_700_000,  "seed": 64},
    "faridabad":     {"name": "Faridabad",          "lat": 28.41, "lon": 77.32, "area_km2": 210,  "population": 1_600_000,  "seed": 65},
    "meerut":        {"name": "Meerut",             "lat": 28.98, "lon": 77.71, "area_km2": 140,  "population": 1_600_000,  "seed": 66},
    "rajkot":        {"name": "Rajkot",             "lat": 22.30, "lon": 70.80, "area_km2": 170,  "population": 1_500_000,  "seed": 67},
    "varanasi":      {"name": "Varanasi",           "lat": 25.32, "lon": 82.97, "area_km2": 112,  "population": 1_500_000,  "seed": 68},
    "srinagar":      {"name": "Srinagar",           "lat": 34.08, "lon": 74.79, "area_km2": 294,  "population": 1_300_000,  "seed": 69},
    "aurangabad":    {"name": "Aurangabad",         "lat": 19.88, "lon": 75.34, "area_km2": 139,  "population": 1_300_000,  "seed": 70},
    "amritsar":      {"name": "Amritsar",           "lat": 31.63, "lon": 74.87, "area_km2": 139,  "population": 1_200_000,  "seed": 71},
    "navi_mumbai":   {"name": "Navi Mumbai",        "lat": 19.03, "lon": 73.02, "area_km2": 344,  "population": 1_200_000,  "seed": 72},
    "prayagraj":     {"name": "Prayagraj",          "lat": 25.44, "lon": 81.85, "area_km2": 85,   "population": 1_500_000,  "seed": 73},
    "ranchi":        {"name": "Ranchi",             "lat": 23.34, "lon": 85.31, "area_km2": 175,  "population": 1_200_000,  "seed": 74},
    "howrah":        {"name": "Howrah",             "lat": 22.59, "lon": 88.31, "area_km2": 63,   "population": 1_100_000,  "seed": 75},
    "coimbatore":    {"name": "Coimbatore",         "lat": 11.02, "lon": 76.96, "area_km2": 257,  "population": 2_100_000,  "seed": 76},
    "jabalpur":      {"name": "Jabalpur",           "lat": 23.18, "lon": 79.99, "area_km2": 125,  "population": 1_300_000,  "seed": 77},
    "gwalior":       {"name": "Gwalior",            "lat": 26.22, "lon": 78.18, "area_km2": 289,  "population": 1_200_000,  "seed": 78},
    "vijayawada":    {"name": "Vijayawada",         "lat": 16.51, "lon": 80.65, "area_km2": 61,   "population": 1_500_000,  "seed": 79},
    "jodhpur":       {"name": "Jodhpur",            "lat": 26.24, "lon": 73.02, "area_km2": 233,  "population": 1_300_000,  "seed": 80},
    "madurai":       {"name": "Madurai",            "lat": 9.93,  "lon": 78.12, "area_km2": 148,  "population": 1_500_000,  "seed": 81},
    "raipur":        {"name": "Raipur",             "lat": 21.25, "lon": 81.63, "area_km2": 226,  "population": 1_100_000,  "seed": 82},
    "kota":          {"name": "Kota",               "lat": 25.21, "lon": 75.86, "area_km2": 221,  "population": 1_200_000,  "seed": 83},
    "guwahati":      {"name": "Guwahati",           "lat": 26.14, "lon": 91.74, "area_km2": 328,  "population": 1_000_000,  "seed": 84},
    "chandigarh":    {"name": "Chandigarh",         "lat": 30.73, "lon": 76.78, "area_km2": 114,  "population": 1_100_000,  "seed": 85},
    "thiruvananthapuram": {"name": "Thiruvananthapuram", "lat": 8.52, "lon": 76.94, "area_km2": 215, "population": 1_700_000, "seed": 86},
    "kochi":         {"name": "Kochi",              "lat": 9.93,  "lon": 76.27, "area_km2": 94,   "population": 2_100_000,  "seed": 87},
    "bhubaneswar":   {"name": "Bhubaneswar",        "lat": 20.30, "lon": 85.82, "area_km2": 135,  "population": 900_000,    "seed": 88},

    # --- Hilly / hill-station cities — deliberately included for landslide-risk
    # visual contrast (steep real elevation via Open-Elevation vs flat metros) ---
    "dehradun":      {"name": "Dehradun",           "lat": 30.32, "lon": 78.03, "area_km2": 300,  "population": 800_000,    "seed": 89},
    "shimla":        {"name": "Shimla",             "lat": 31.10, "lon": 77.17, "area_km2": 35,   "population": 200_000,    "seed": 90},
    "gangtok":       {"name": "Gangtok",            "lat": 27.33, "lon": 88.61, "area_km2": 29,   "population": 100_000,    "seed": 91},
    "siliguri":      {"name": "Siliguri",           "lat": 26.73, "lon": 88.43, "area_km2": 41,   "population": 700_000,    "seed": 92},
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


# ── Dynamic city registration (for the search-any-city feature) ───────────────
# Cities found via geocode_service.search_city() aren't in the curated list
# above, so this adds them to CITY_REGISTRY IN PLACE (mutating the existing
# dict, not replacing it) at runtime. Every other module that already did
# `from backend.config import CITY_REGISTRY` sees the new entry immediately —
# no restart needed, and zero changes required anywhere else in the codebase,
# since every service only ever looks a city up by its key.
import hashlib
import re


def _slugify_city_key(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "_", name.strip().lower()).strip("_")
    return slug or "city"


def register_dynamic_city(name: str, lat: float, lon: float) -> str:
    """
    Adds a searched city to CITY_REGISTRY if not already present, and
    returns its city_key for use with every existing endpoint. Population
    and area are rough defaults (Nominatim doesn't reliably provide them) —
    fine for this platform's demo/estimation purposes; real cities in the
    curated list above still use their accurate figures.
    """
    key = _slugify_city_key(name)
    if key in CITY_REGISTRY:
        return key

    # Deterministic seed from the city name, so the same searched city
    # always generates the same-looking synthetic grid across requests.
    seed = int(hashlib.md5(key.encode()).hexdigest()[:6], 16) % 100000

    CITY_REGISTRY[key] = {
        "name": name,
        "lat": lat,
        "lon": lon,
        "area_km2": 200,          # generic default — unknown for searched cities
        "population": 500_000,    # generic default — unknown for searched cities
        "seed": seed,
        "is_dynamic": True,       # lets the frontend flag "estimated" data if needed
    }
    return key