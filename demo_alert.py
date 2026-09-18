"""Judge demo: python demo_alert.py [city] — fires a mock SMS + WhatsApp alert."""
import sys
from dotenv import load_dotenv; load_dotenv()
from backend.services.alert_service import check_alerts, build_alert_message
from backend.services.heat_service import _generate_grid

city = sys.argv[1] if len(sys.argv) > 1 else "delhi"
zones = sorted(_generate_grid(city), key=lambda z: -z["hvi"])
hottest = zones[0]
print("=" * 60)
print("MOCK SMS  -> +91-98765-43210")
print("-" * 60); print(build_alert_message(hottest, city, demo=True))
print("=" * 60)
print("MOCK WhatsApp -> +91-91234-56780 (same body)")
print("=" * 60)
result = check_alerts(city, force_demo=True)
print(f"Zones scanned: {result['zones_scanned']} | EXTREME zones: {result['zones_in_extreme']} | Alerts fired: {result['alert_count']}")
print("Full log: backend/data/sent_alerts.log | History: GET /alerts/history")
