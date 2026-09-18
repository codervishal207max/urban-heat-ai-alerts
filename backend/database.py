# Urban Heat AI v2 — SQLite Persistence Layer
#
# Replaces the "database" that used to live only in the browser's
# localStorage. Real, file-backed SQLite (stdlib — no extra dependency),
# so activity/chat data survives server restarts and is visible from
# any device that hits this backend, not just the browser that logged it.

import sqlite3
import csv
import io
import time
from pathlib import Path
from contextlib import contextmanager

DB_DIR = Path(__file__).resolve().parent / "data"
DB_DIR.mkdir(exist_ok=True)
DB_PATH = DB_DIR / "urban_heat_ai.db"


@contextmanager
def get_conn():
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db():
    with get_conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS activity_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER NOT NULL,
                type TEXT NOT NULL,
                activity TEXT NOT NULL,
                detail TEXT,
                city TEXT
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS chat_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER NOT NULL,
                city TEXT,
                user_msg TEXT NOT NULL,
                bot_reply TEXT NOT NULL,
                source TEXT
            )
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_activity_type ON activity_log(type)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_activity_ts ON activity_log(timestamp)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_chat_ts ON chat_history(timestamp)")


# ── Activity log ─────────────────────────────────────────────────────────────

def log_activity(type_: str, activity: str, detail: str = "", city: str = "") -> dict:
    ts = int(time.time() * 1000)
    with get_conn() as conn:
        cur = conn.execute(
            "INSERT INTO activity_log (timestamp, type, activity, detail, city) VALUES (?, ?, ?, ?, ?)",
            (ts, type_, activity, detail, city),
        )
        return {"id": cur.lastrowid, "timestamp": ts, "type": type_, "activity": activity,
                "detail": detail, "city": city}


def list_activity(filter_type: str = "all", limit: int = 500) -> list[dict]:
    with get_conn() as conn:
        if filter_type and filter_type != "all":
            rows = conn.execute(
                "SELECT * FROM activity_log WHERE type = ? ORDER BY id DESC LIMIT ?",
                (filter_type, limit),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM activity_log ORDER BY id DESC LIMIT ?", (limit,)
            ).fetchall()
        return [dict(r) for r in rows]


def activity_summary() -> dict:
    with get_conn() as conn:
        total = conn.execute("SELECT COUNT(*) c FROM activity_log").fetchone()["c"]
        chats = conn.execute("SELECT COUNT(*) c FROM activity_log WHERE type='chat'").fetchone()["c"]
        alerts = conn.execute(
            "SELECT COUNT(*) c FROM activity_log WHERE type IN ('heat_alert','climate_alert')"
        ).fetchone()["c"]
        cities = conn.execute(
            "SELECT COUNT(DISTINCT detail) c FROM activity_log WHERE type='city_change'"
        ).fetchone()["c"]
        sims = conn.execute("SELECT COUNT(*) c FROM activity_log WHERE type='simulation'").fetchone()["c"]
        return {"total": total, "chats": chats, "alerts": alerts, "cities": cities, "simulations": sims}


def export_activity_csv() -> str:
    with get_conn() as conn:
        rows = conn.execute("SELECT * FROM activity_log ORDER BY id DESC").fetchall()
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["Timestamp", "Type", "Activity", "Detail", "City"])
    for r in rows:
        writer.writerow([r["timestamp"], r["type"], r["activity"], r["detail"] or "", r["city"] or ""])
    return buf.getvalue()


def clear_activity():
    with get_conn() as conn:
        conn.execute("DELETE FROM activity_log")
        conn.execute("DELETE FROM chat_history")


# ── Chat history ─────────────────────────────────────────────────────────────

def log_chat(city: str, user_msg: str, bot_reply: str, source: str = "keyword") -> dict:
    ts = int(time.time() * 1000)
    with get_conn() as conn:
        cur = conn.execute(
            "INSERT INTO chat_history (timestamp, city, user_msg, bot_reply, source) VALUES (?, ?, ?, ?, ?)",
            (ts, city, user_msg, bot_reply, source),
        )
        return {"id": cur.lastrowid, "timestamp": ts, "city": city,
                "user_msg": user_msg, "bot_reply": bot_reply, "source": source}


def list_chats(limit: int = 200) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM chat_history ORDER BY id DESC LIMIT ?", (limit,)
        ).fetchall()
        return [dict(r) for r in rows]


# ── Heat alerts (social-impact notification layer) ────────────────────────────

def init_alerts_table():
    with get_conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS heat_alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER NOT NULL,
                city TEXT NOT NULL,
                cell_id INTEGER NOT NULL,
                lat REAL, lon REAL,
                lst REAL, hvi REAL, risk_level TEXT,
                population_at_risk INTEGER,
                message TEXT,
                deliveries TEXT
            )
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_heat_alerts_ts ON heat_alerts(timestamp)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_heat_alerts_city ON heat_alerts(city)")


def save_alert(alert: dict) -> dict:
    init_alerts_table()
    ts = int(time.time() * 1000)
    import json as _json
    with get_conn() as conn:
        cur = conn.execute(
            """INSERT INTO heat_alerts
               (timestamp, city, cell_id, lat, lon, lst, hvi, risk_level,
                population_at_risk, message, deliveries)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (ts, alert.get("city", ""), alert.get("cell_id", -1),
             alert.get("lat"), alert.get("lon"), alert.get("lst"), alert.get("hvi"),
             alert.get("risk_level", ""), alert.get("population_at_risk", 0),
             alert.get("message", ""), _json.dumps(alert.get("deliveries", []))),
        )
        return {"id": cur.lastrowid, "timestamp": ts, **alert}


def list_alerts(city: str = "", limit: int = 100) -> list[dict]:
    import json as _json
    init_alerts_table()
    with get_conn() as conn:
        if city:
            rows = conn.execute(
                "SELECT * FROM heat_alerts WHERE city = ? ORDER BY id DESC LIMIT ?",
                (city, limit)).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM heat_alerts ORDER BY id DESC LIMIT ?", (limit,)).fetchall()
    out = [dict(r) for r in rows]
    for r in out:
        try:
            r["deliveries"] = _json.loads(r.get("deliveries") or "[]")
        except Exception:
            r["deliveries"] = []
    return out


def recent_alert_ts(city: str, cell_id: int) -> int | None:
    """Timestamp (ms) of the most recent alert for this zone, or None."""
    init_alerts_table()
    with get_conn() as conn:
        row = conn.execute(
            "SELECT MAX(timestamp) ts FROM heat_alerts WHERE city = ? AND cell_id = ?",
            (city, cell_id)).fetchone()
    return row["ts"] if row and row["ts"] else None
