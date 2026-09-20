# Urban Heat AI v2 — Heat Alert API Routes (social-impact notification layer)
from fastapi import APIRouter, Query
from backend.config import DEFAULT_CITY
from backend.services.alert_service import check_alerts, alert_history, alert_channels, build_alert_message
from backend.services.heat_service import _generate_grid

router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.get("/check", summary="Scan city grid and fire EXTREME-HVI alerts (SMS/WhatsApp)")
def run_alert_check(city: str = Query(DEFAULT_CITY)):
    """
    Pollable endpoint — the dashboard calls this on load and every few minutes.
    Any zone crossing the EXTREME HVI threshold triggers a notification to
    registered recipients (vulnerable-population warning), with per-zone
    cooldown so nobody gets spammed.
    """
    return check_alerts(city)


@router.get("/history", summary="Past heat alerts from SQLite")
def history(city: str = Query(""), limit: int = Query(50)):
    return {"count": 0 if not alert_history(city, 1) else len(alert_history(city, limit)),
            "alerts": alert_history(city, limit)}


@router.get("/status", summary="Alert channel configuration")
def status():
    return alert_channels()


@router.get("/demo", summary="Render the exact SMS/WhatsApp message for the hottest zone (judge demo)")
def demo(city: str = Query(DEFAULT_CITY)):
    """Returns the notification that WOULD be sent right now — no dispatch."""
    zones = sorted(_generate_grid(city), key=lambda z: -z["hvi"])
    hottest = zones[0]
    return {
        "city": city,
        "zone": hottest,
        "demo_recipients": alert_channels()["recipients"],
        "sms_body": build_alert_message(hottest, city, demo=True),
        "channels": alert_channels(),
    }

# backend/api/heat.py ya alerts.py me
@router.get("/rain-map")
def rain_map(city: str = Query(DEFAULT_CITY)):
    zones = _generate_grid(city)
    return {"zones": [{"cell_id": z["cell_id"], "lat": z["lat"], "lon": z["lon"],
                        "rainfall_mm": z["rainfall_48h_mm"]} for z in zones]}

@router.get("/landslide-map")
def landslide_map(city: str = Query(DEFAULT_CITY)):
    zones = _generate_grid(city)
    return {"zones": [{"cell_id": z["cell_id"], "lat": z["lat"], "lon": z["lon"],
                        "risk_score": z["landslide_risk_score"]} for z in zones]}



@router.post("/test-send", summary="Force-fire one demo alert (mock SMS+WhatsApp) for the hottest zone")
def test_send(city: str = Query(DEFAULT_CITY)):
    """Judge-demo endpoint: dispatches a real (mock) SMS+WhatsApp for the hottest zone."""
    zones = sorted(_generate_grid(city), key=lambda z: -z["hvi"])
    result = check_alerts(city, force_demo=True)
    # force_demo bypasses cooldown; if nothing crossed threshold, fire one anyway
    if not result["alerts_fired"]:
        from backend.services.alert_service import dispatch_alert, save_alert
        import time as _time
        from backend.config import CITY_REGISTRY
        z = zones[0]
        deliveries = dispatch_alert(z, city, demo=True)
        alert = {"city": city, "cell_id": z["cell_id"], "lat": z["lat"], "lon": z["lon"],
                 "lst": z["lst"], "hvi": z["hvi"], "risk_level": z["risk_level"],
                 "population_at_risk": z["population_density"],
                 "message": build_alert_message(z, city, demo=True),
                 "deliveries": deliveries}
        save_alert(alert)
        result["alerts_fired"] = [alert]
        result["alert_count"] = 1
    return result
