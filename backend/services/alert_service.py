# Urban Heat AI v2 — Heat Alert Service
#
# SOCIAL IMPACT LAYER: turns the dashboard's HVI data into real warnings for
# vulnerable populations (elderly 65+, children under 5, outdoor workers,
# low-income households). When a zone's Heat Vulnerability Index crosses the
# EXTREME threshold, this service:
#   1. builds a targeted alert message with zone-level people-at-risk counts
#   2. dispatches it via Twilio SMS / WhatsApp (if credentials are configured)
#      or falls back to a fully-functional MOCK dispatcher that logs the exact
#      messages to backend/data/sent_alerts.log (demo mode — zero setup)
#   3. persists every alert in SQLite (heat_alerts table) for the dashboard
#      banner and the /database.html audit view
#
# Env vars (see .env.example):
#   ALERT_HVI_THRESHOLD      default 0.80  (HVI >= this => EXTREME alert)
#   ALERT_COOLDOWN_MINUTES   default 60    (per-zone re-alert suppression)
#   ALERT_DEMO_RECIPIENTS    comma-separated phone numbers for demo sends
#   TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_PHONE_NUMBER
#   TWILIO_WHATSAPP_FROM     e.g. whatsapp:+14155238886 (sandbox number)
import os
import time
import logging
from pathlib import Path
from backend.config import CITY_REGISTRY, DEFAULT_CITY
from backend.services.heat_service import _generate_grid
from backend.services.health_service import get_vulnerable_populations
from backend.database import save_alert, list_alerts as db_list_alerts, recent_alert_ts
from backend.database import log_activity, init_db

log = logging.getLogger("urban_heat_ai.alerts")

EXTREME_HVI_THRESHOLD = float(os.getenv("ALERT_HVI_THRESHOLD", "0.80"))
COOLDOWN_SECONDS = int(os.getenv("ALERT_COOLDOWN_MINUTES", "60")) * 60
MAX_PER_CHECK = int(os.getenv("ALERT_MAX_PER_CHECK", "5"))  # top-N worst zones per scan
ALERT_LANG = os.getenv("ALERT_LANGUAGE", "both").lower()   # hindi | english | both
LOG_PATH = Path(__file__).resolve().parent.parent / "data" / "sent_alerts.log"

# Twilio credentials (optional — app runs fully in mock mode without them)
TWILIO_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_FROM = os.getenv("TWILIO_PHONE_NUMBER", "")
TWILIO_WA_FROM = os.getenv("TWILIO_WHATSAPP_FROM", "")
RECIPIENTS = [p.strip() for p in os.getenv("ALERT_DEMO_RECIPIENTS", "+91-98765-43210 (demo)").split(",") if p.strip()]

twilio_available = bool(TWILIO_SID and TWILIO_TOKEN)
try:
    if twilio_available:
        from twilio.rest import Client  # optional dependency
        _twilio_client = Client(TWILIO_SID, TWILIO_TOKEN)
    else:
        _twilio_client = None
except Exception:  # twilio package not installed -> mock mode
    _twilio_client = None


def alert_channels() -> dict:
    return {
        "sms": "twilio-live" if (_twilio_client and TWILIO_FROM) else "mock (log)",
        "whatsapp": "twilio-live" if (_twilio_client and TWILIO_WA_FROM) else "mock (log)",
        "recipients": RECIPIENTS,
        "hvi_threshold": EXTREME_HVI_THRESHOLD,
        "cooldown_minutes": COOLDOWN_SECONDS // 60,
    }


def _fmt(n: int) -> str:
    return f"{n:,}"


def _hindi_msg(zone, city, tag):
    return (
        f"{tag}आपातकालीन सूचना (गंभीर गर्मी) - {city}\n"
        f"ज़ोन #{zone.get('cell_id')}: तापमान {zone.get('lst')}°C\n"
        f"दोपहर 12-4 बजे का काम टालें, पानी/ORS पीएं, बुज़ुर्गों का ख़याल रखें।"
        f" - अर्बन हीट AI नगर निगम सूचना"
    )


def _english_msg(zone, city, tag, pop, elderly, children, outdoor):
    return (
        f"{tag}HEAT ALERT (EXTREME) - {city}\n"
        f"Zone #{zone.get('cell_id')} near {zone.get('lat')}N, {zone.get('lon')}E\n"
        f"Land surface temp {zone.get('lst')}C | Vulnerability index {zone.get('hvi')}\n"
        f"~{_fmt(pop)} people at risk in this zone, incl. {_fmt(elderly)} elderly (65+), "
        f"{_fmt(children)} children under 5 and {_fmt(outdoor)} outdoor workers.\n"
        f"Avoid outdoor work 12-4 PM. Drink ORS/water often. Check on elderly neighbours. "
        f"- Urban Heat AI municipal warning"
    )


def build_alert_message(zone: dict, city_key: str, demo: bool = False) -> str:
    """Targeted, plain-language warning aimed at vulnerable groups.
    Language via ALERT_LANGUAGE env: 'hindi', 'english' or 'both' (default)."""
    city = CITY_REGISTRY.get(city_key, {}).get("name", city_key.title())
    pop = zone.get("population_density", 0)
    elderly, outdoor, children = int(pop * 0.18), int(pop * 0.28), int(pop * 0.12)
    tag = "[DEMO] " if demo else ""
    en = _english_msg(zone, city, tag, pop, elderly, children, outdoor)
    hi = _hindi_msg(zone, city, tag)
    if ALERT_LANG == "hindi":
        return hi
    if ALERT_LANG == "english":
        return en
    return hi + "\n---\n" + en


def _mock_dispatch(channel: str, to: str, body: str) -> dict:
    """Demo-mode dispatcher: writes the exact message to the alerts log."""
    LOG_PATH.parent.mkdir(exist_ok=True)
    stamp = time.strftime("%Y-%m-%d %H:%M:%S")
    with open(LOG_PATH, "a", encoding="utf-8") as f:
        f.write(f"--- [{stamp}] MOCK {channel} -> {to} ---\n{body}\n\n")
    log.info("MOCK %s dispatched to %s", channel, to)
    return {"channel": channel, "to": to, "mode": "mock", "sid": f"mock-{int(time.time()*1000)}"}


def _live_dispatch(channel: str, to: str, body: str) -> dict:
    if not _twilio_client:
        return _mock_dispatch(channel, to, body)
    try:
        if channel == "whatsapp":
            msg = _twilio_client.messages.create(from_=TWILIO_WA_FROM, to=f"whatsapp:{to}", body=body)
        else:
            msg = _twilio_client.messages.create(from_=TWILIO_FROM, to=to, body=body)
        return {"channel": channel, "to": to, "mode": "live", "sid": msg.sid}
    except Exception as exc:
        log.warning("Twilio %s send failed (%s); falling back to mock", channel, exc)
        return _mock_dispatch(channel, to, body)


def dispatch_alert(zone: dict, city_key: str, demo: bool = False) -> list[dict]:
    body = build_alert_message(zone, city_key, demo=demo)
    deliveries = []
    for to in RECIPIENTS:
        deliveries.append(_live_dispatch("sms", to, body))
        deliveries.append(_live_dispatch("whatsapp", to, body))
    # Municipal email blast (mock channel — logged, ready for SMTP wiring)
    deliveries.append(_mock_dispatch("email", "heat-response-cell@municipal.gov.in", body))
    return deliveries


def check_alerts(city: str = DEFAULT_CITY, force_demo: bool = False) -> dict:
    """
    Scan the city's heat grid. Any zone with HVI >= EXTREME threshold that
    hasn't been alerted within the cooldown window triggers a real dispatch.
    Returns the fired alerts (empty list = all clear).
    """
    init_db()  # idempotent; ensures tables exist outside FastAPI lifespan
    cfg = CITY_REGISTRY.get(city, CITY_REGISTRY[DEFAULT_CITY])
    zones = _generate_grid(city)
    vuln = get_vulnerable_populations(city)
    fired = []
    extreme = sorted((z for z in zones if z["hvi"] >= EXTREME_HVI_THRESHOLD),
                     key=lambda z: -z["hvi"])
    suppressed = 0  # zones already in cooldown this scan
    for z in extreme:
        last = recent_alert_ts(city, z["cell_id"])
        # force_demo (judge test-send) bypasses cooldown so it always fires
        if not force_demo and last and (time.time() * 1000 - last) < COOLDOWN_SECONDS * 1000:
            suppressed += 1
            continue  # cooldown: already warned recently, don't spam
        if len(fired) >= MAX_PER_CHECK and not force_demo:
            suppressed += 1
            continue  # rate cap: worst zones first, rest next scan
        deliveries = dispatch_alert(z, city, demo=force_demo or not twilio_available)
        alert = {
            "city": city, "city_name": cfg["name"],
            "cell_id": z["cell_id"], "lat": z["lat"], "lon": z["lon"],
            "lst": z["lst"], "hvi": z["hvi"], "risk_level": z["risk_level"],
            "population_at_risk": z["population_density"],
            "message": build_alert_message(z, city, demo=force_demo or not twilio_available),
            "deliveries": deliveries,
        }
        save_alert(alert)
        log_activity("heat_alert",
                     f"EXTREME heat alert fired for zone #{z['cell_id']} ({cfg['name']})",
                     detail=f"LST {z['lst']}C, HVI {z['hvi']}, ~{z['population_density']:,} people at risk",
                     city=city)
        fired.append(alert)
    return {
        "city": city, "city_name": cfg["name"],
        "hvi_threshold": EXTREME_HVI_THRESHOLD,
        "zones_scanned": len(zones),
        "zones_in_extreme": len(extreme),
        "zones_suppressed_by_cooldown_or_cap": suppressed,
        "max_alerts_per_check": MAX_PER_CHECK,
        "population_at_high_risk": vuln["population_at_high_risk"],
        "vulnerable_demographics": vuln["demographics"],
        "channels": alert_channels(),
        "alerts_fired": fired,
        "alert_count": len(fired),
    }


def alert_history(city: str = "", limit: int = 100) -> list[dict]:
    return db_list_alerts(city=city, limit=limit)
