# 🌡️ Urban Heat AI Platform v2.0

**AI-powered Urban Heat Island detection, public health risk assessment & climate-resilient urban planning for 10 major Indian cities.**
### 🌍 The Problem: Urban Heat Islands (UHI) in Indian Metros
Rapid urbanization, dense concrete infrastructure, asphalt pavements, and depleting green cover have created severe **Urban Heat Island (UHI)** microclimates across major Indian cities (e.g., Delhi NCR, Mumbai, Jaipur, Ahmedabad). As a result, dense urban cores trap solar radiation, becoming **5°C to 10°C hotter** than surrounding peri-urban and rural areas.

Built for **IS-14 Hackathon** | FastAPI + Leaflet + Chart.js + HeatBot AI

---

## 🏗️ Architecture

```
urban-heat-ai/
├── backend/                   # FastAPI backend
│   ├── main.py                # App entry point, mounts frontend
│   ├── config.py              # City registry, thresholds, scenarios
│   ├── api/
│   │   ├── heat.py            # GET /heat/map, /hotspots, /trend
│   │   ├── health.py          # GET /health/risk-map, /vulnerable-populations, /forecast
│   │   ├── recommendations.py # GET /recommendations/simulate, /zones, /strategies
│   │   └── zones.py           # GET /zones/summary, /cities
│   ├── services/
│   │   ├── heat_service.py    # 30×30 city grid, LST/NDVI/UHI generation
│   │   ├── health_service.py  # HVI risk map, vulnerable population calc
│   │   └── recommendation_service.py # Simulation engine, zone prioritization
│   └── utils/helpers.py       # HVI formula, noise, color helpers
├── frontend/                  # Served by FastAPI at root URL
│   ├── index.html             # Landing page with architecture & quickstart
│   ├── dashboard.html         # Main analytics dashboard
│   ├── database.html          # Activity log & chat history viewer
│   ├── css/style.css          # Full dark-theme stylesheet
│   └── js/
│       ├── api.js             # Backend fetch client + city mock fallback
│       ├── map.js             # Leaflet + CartoDB map engine
│       ├── dashboard.js       # City switcher, charts, simulation, alerts
│       ├── chatbot.js         # HeatBot keyword AI (Hindi+English)
│       └── effects.js         # Background particles, counter animations
├── requirements.txt
├── run.sh                     # Linux/macOS quick start
├── run.bat                    # Windows quick start
└── .env.example
```

---

## ⚡ Quick Start

### Option 1 — One-command (Linux/macOS)
```bash
chmod +x run.sh && ./run.sh
```

### Option 2 — Windows
```bat
run.bat
```

### Option 3 — Manual
```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Start backend (serves frontend too)
python -m backend.main

# 3. Open in browser
# → http://localhost:8000           (Homepage)
# → http://localhost:8000/dashboard.html  (Dashboard)
# → http://localhost:8000/database.html   (Activity DB)
# → http://localhost:8000/docs            (API Swagger)
```

---

## 🌍 Supported Cities

| City | Avg LST | Climate Risk | Population |
|------|---------|--------------|------------|
| 🏛️ Delhi NCR | 39.2°C | **EXTREME** | 31M |
| 🌊 Mumbai | 34.5°C | High | 20.7M |
| 🌿 Bangalore | 32.1°C | Moderate | 12.5M |
| 🌴 Chennai | 36.8°C | High | 10.9M |
| 💎 Hyderabad | 35.4°C | High | 10M |
| 🎭 Kolkata | 37.2°C | High | 14.8M |
| 🏔️ Pune | 33.8°C | Moderate | 7.4M |
| 🦁 Ahmedabad | 38.5°C | **EXTREME** | 8.1M |
| 🌸 Jaipur | 40.1°C | **EXTREME** | 4.1M |
| 🕌 Lucknow | 38.9°C | High | 3.7M |

---

## 🔌 API Endpoints

### Heat
| Endpoint | Description |
|----------|-------------|
| `GET /heat/map?city=delhi` | 900-zone GeoJSON with LST, NDVI, UHI |
| `GET /heat/hotspots?city=delhi&threshold=2.0` | UHI hotspot zones |
| `GET /heat/trend?city=delhi` | 12-month seasonal LST trend |
| `GET /heat/live?city=delhi` | Data calibration status — shows whether the heat grid is anchored to **real NASA POWER satellite data**, live Open-Meteo weather, or the static offline baseline |

### Health
| Endpoint | Description |
|----------|-------------|
| `GET /health/risk-map?city=delhi` | Zone-level HVI risk map |
| `GET /health/vulnerable-populations?city=delhi` | Demographics at risk |
| `GET /health/forecast?city=delhi` | 7-day health risk forecast |

### Recommendations
| Endpoint | Description |
|----------|-------------|
| `GET /recommendations/simulate?city=delhi&scenario=green_cover&coverage=20` | What-if simulation |
| `GET /recommendations/zones?city=delhi&top=5` | Priority zones with actions |
| `GET /recommendations/strategies` | Available cooling strategies |

### Zones
| Endpoint | Description |
|----------|-------------|
| `GET /zones/summary?city=delhi` | Complete city overview |
| `GET /zones/cities` | List all 10 supported cities |

### HeatBot (LLM Chat)
| Endpoint | Description |
|----------|-------------|
| `GET /chat/status` | Whether the Groq-backed LLM is configured |
| `POST /chat/ask` | `{message, city}` → LLM reply grounded in that city's live data (or `{ok:false}` to signal frontend fallback) |

### Report
| Endpoint | Description |
|----------|-------------|
| `GET /report/generate?city=delhi&scenario=green_cover&coverage=20` | Downloads a PDF "policy brief" — current heat/health risk, top-5 priority zones with actions, and projected impact + cost of one cooling intervention. Same numbers as the live dashboard. |

### Activity Database (SQLite)
| Endpoint | Description |
|----------|-------------|
| `POST /activity/log` | Log a frontend event (city switch, layer toggle, simulation run, alert, page view) |
| `GET /activity/list?filter=&limit=` | List logged events, optionally filtered by type |
| `GET /activity/summary` | Counts for the dashboard summary cards |
| `GET /activity/export.csv` | Download the full activity log as CSV |
| `DELETE /activity/clear` | Clear all activity + chat history |
| `POST /activity/chat` | Log one chatbot conversation turn |
| `GET /activity/chats?limit=` | List recent chatbot conversation turns |

---

## 🗺️ Frontend Features

### Dashboard
- **City Selector** — Switch between 10 Indian cities; map flies to new location
- **Live Stats** — Avg/Max LST, high-risk zones, population at risk (backend data)
- **Leaflet Map** — CartoDB Dark Matter tiles (free, no API key!)
  - 🔥 Heat Map (LST colors), ⚠️ Health Risk (HVI), 🌿 NDVI, 📍 Hotspots
  - Smooth fly-to animation on city switch
  - Zone popups with full statistics
- **Heat Alerts** — Real-time zone alerts with EXTREME/HIGH/MODERATE/LOW badges
- **Simulation Panel** — Choose scenario + coverage % → backend ML simulation
- **Charts** — Risk distribution donut + seasonal LST trend line
- **Recommendations** — City-specific cooling actions
- **Download Policy Report** — One click generates a PDF policy brief for the selected city + simulation scenario (see below)
- **Climate Alert Banner** — Rotating IPCC + India climate facts

### HeatBot AI Chatbot
- **Real LLM** (Groq, Llama 3.3 70B) — answers are grounded in the selected city's *live* LST/UHI/HVI/population-at-risk numbers, injected into the system prompt each request
- Free — set `GROQ_API_KEY` in `.env` (get one at console.groq.com/keys)
- Auto-falls back to a Hindi+English keyword bot if no key is set, Groq is down, or the network is offline — the demo never breaks
- All chats logged to Activity Database

### Activity Database Page
- All user interactions logged (city switch, layer toggle, simulation, chat, alerts)
- Filter by event type
- CSV export
- Chat conversation history viewer

---

## 🛰️ Real Satellite Data

Every city's heat grid is anchored to a **real satellite-informed reading** where possible, not just a random/synthetic number:

1. **NASA POWER API** (`backend/services/satellite_service.py`) — free, **no API key, no signup**. Pulls Earth Skin Temperature (`TS`), sourced from NASA's MERRA-2 reanalysis which assimilates real satellite observations (incl. MODIS). Has a few days' publication latency, so the service looks back 10 days and uses the most recent value.
2. **Open-Meteo live weather** — used if satellite data isn't available for that city right now.
3. **Static per-city baseline** — offline fallback, so the demo never breaks with no internet.

The dashboard's live-badge shows which one is active (🛰️ satellite / 🌐 live weather / 📊 static), and `GET /heat/live?city=delhi` exposes it via the API (`is_satellite`, `anchor_temp_c`, `obs_date`). HeatBot also mentions the real data source when asked.

**Upgrade path:** true pixel-level MODIS/Landsat LST imagery (per-zone instead of one city-wide reading) is possible via Google Earth Engine, but needs a GEE service account — heavier to set up mid-hackathon. Swapping it in later only means replacing `satellite_service.py`; nothing else changes.

## 🔄 Backend + Frontend Integration

The frontend (`js/api.js`) uses a **3-second timeout** and automatically falls back to client-side demo data if the backend is offline:

```
User opens dashboard
  → api.js tries GET /zones/summary?city=delhi  (3s timeout)
  → Backend responds → live data shown
  → Backend offline  → demo data shown + toast notification
```

The backend also **serves the frontend** at the root URL via FastAPI `StaticFiles`, so you only need to run one process.

---

## 🧮 HVI Formula

```
HVI = 0.40 × LST_norm + 0.25 × UHI_norm + 0.20 × (1 - NDVI) + 0.15 × PopDensity_norm
```

| HVI | Risk Level |
|-----|------------|
| ≥ 0.80 | Very High |
| ≥ 0.60 | High |
| ≥ 0.40 | Moderate |
| ≥ 0.20 | Low |
| < 0.20 | Very Low |

---

## 🌐 Tech Stack

| Layer | Technology |
|-------|------------|
| Backend API | FastAPI + Uvicorn |
| Data science | NumPy, Pandas, Scikit-learn |
| Real satellite data | NASA POWER API (Earth Skin Temperature, MERRA-2 reanalysis) — free, no key |
| Mapping | Leaflet.js + CartoDB (free tiles) |
| Charts | Chart.js |
| Frontend | Vanilla HTML/CSS/JS (no framework needed) |
| Chatbot | Groq LLM (Llama 3.1 8B Instant by default — configurable via `GROQ_MODEL`), grounded in live city data — auto-falls back to keyword AI (Hindi+English) if no API key / offline |
| Activity log | SQLite (`backend/data/urban_heat_ai.db`) — auto-falls back to localStorage if backend is offline |

---

## 👩‍💻 Team

Built for **IS-14 Hackathon** — Urban Heat Island Challenge, India 2024


## \u{1F525} Heat Alert Notifications (social-impact layer)

Dashboard pe dikhne se koi bacha nahi — warning us elderly worker tak pahunchti hai
jiske paas dashboard nahi, sirf phone hai. When any zone's **Heat Vulnerability Index
crosses 0.80 (EXTREME)**, the backend automatically dispatches a targeted warning:

- **SMS + WhatsApp** via Twilio (free trial) — or **mock mode** out of the box,
  which logs the exact messages to `backend/data/sent_alerts.log`
- **Municipal email blast** channel (mock, ready for SMTP wiring)
- Message is **bilingual (Hindi + English)** and names the vulnerable groups in
  that zone: elderly 65+, children under 5, outdoor workers — with a plain
  advisory (avoid outdoor work 12-4 PM, drink ORS, check on elderly neighbours)
- Per-zone **cooldown** (default 60 min) + top-N **rate cap** per scan prevent spam
- Every alert persists in SQLite (`heat_alerts` table) as a municipal audit trail

### Quick demo (no setup)
```bash
python demo_alert.py jaipur      # prints the exact mock SMS/WhatsApp + fires alerts
```
Live API: `GET /alerts/check?city=delhi` · `GET /alerts/history` ·
`GET /alerts/demo` (render only) · `POST /alerts/test-send` (force-fire).
The dashboard shows a pulsing red alert banner and polls every 5 minutes.

### Going live with Twilio
Fill `TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_PHONE_NUMBER /
TWILIO_WHATSAPP_FROM` and `ALERT_DEMO_RECIPIENTS` in `.env`
(get a free trial key at https://console.twilio.com). Until then the app runs
fully in mock mode — nothing breaks.

Env knobs: `ALERT_HVI_THRESHOLD` (0.80), `ALERT_COOLDOWN_MINUTES` (60),
`ALERT_MAX_PER_CHECK` (5), `ALERT_LANGUAGE` (both|hindi|english).

## 🤖 HeatBot — AI Chatbot Features

HeatBot platform ke andar embedded ek smart assistant hai jo teen tareeko se answer deta hai:

### 1. 🌡️ Live Heat Data (Groq LLM)
City ke live LST, UHI, HVI data ke sawaal poocho:
- "What is the UHI intensity in Delhi?"
- "Health risks in high temperature zones?"
- "Best cooling solutions for my city?"

### 2. 🎨 AI Image Generation (Hugging Face)
"generate image of..." ya "draw..." keywords use karke AI image banwao:

**Example prompts:**
generate image of a green cool city with parks
generate image of a futuristic solar powered building
generate image of trees planted along a busy road
generate image of a hot desert city with no trees
draw a cooling center with air conditioning for heat wave relief
generate image of a rooftop garden reducing urban heat
generate image of children playing in a shaded park during summer
draw an urban heat island effect diagram over a city skyline
generate image of white reflective cool roofs on buildings
generate image of a water fountain cooling a busy street


### 3. 📖 Live Wikipedia Facts
"wikipedia..." ya "who is/what is..." keywords use karke live factual info lao:

**Example prompts:**
wikipedia heat wave
wikipedia urban heat island
wikipedia climate change in India
who is the founder of NASA
what is the history of air conditioning
tell me about monsoon in India 