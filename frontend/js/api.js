// ============================================================
// Urban Heat AI v2 — API Client
// Tries FastAPI backend first; falls back to client-side mock
// Backend base: http://localhost:8000
// ============================================================

const API_BASE = (function () {
  // If page is served by FastAPI (same origin), use relative URLs
  if (window.location.port === '8000' || window.location.port === '') {
    return '';
  }
  return 'http://localhost:8000';
})();

const BACKEND_TIMEOUT = 4500; // ms — if no response, fall back to mock

// ---- Fetch with timeout + fallback ----
async function apiFetch(path) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), BACKEND_TIMEOUT);
  try {
    const res = await fetch(API_BASE + path, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } catch (e) {
    clearTimeout(timer);
    console.error('API call failed:', path, '—', e.message);
    return null; // signal fallback needed
  }
}

// ---- Mock city data (used when backend is offline) ----
const CITY_DATA = {
  delhi:     { name:'Delhi NCR',  avgLST:39.2, maxLST:46.8, highRisk:213, popRisk:'1.2M', climateRisk:'Extreme',  totalZones:900, avgNDVI:'0.18' },
  mumbai:    { name:'Mumbai',     avgLST:34.5, maxLST:41.2, highRisk:156, popRisk:'0.9M', climateRisk:'High',     totalZones:900, avgNDVI:'0.24' },
  bangalore: { name:'Bangalore',  avgLST:32.1, maxLST:38.6, highRisk:89,  popRisk:'0.5M', climateRisk:'Moderate', totalZones:900, avgNDVI:'0.38' },
  chennai:   { name:'Chennai',    avgLST:36.8, maxLST:43.5, highRisk:178, popRisk:'1.0M', climateRisk:'High',     totalZones:900, avgNDVI:'0.22' },
  hyderabad: { name:'Hyderabad',  avgLST:35.4, maxLST:42.1, highRisk:145, popRisk:'0.8M', climateRisk:'High',     totalZones:900, avgNDVI:'0.26' },
  kolkata:   { name:'Kolkata',    avgLST:37.2, maxLST:44.8, highRisk:198, popRisk:'1.1M', climateRisk:'High',     totalZones:900, avgNDVI:'0.21' },
  pune:      { name:'Pune',       avgLST:33.8, maxLST:40.2, highRisk:112, popRisk:'0.6M', climateRisk:'Moderate', totalZones:900, avgNDVI:'0.31' },
  ahmedabad: { name:'Ahmedabad',  avgLST:38.5, maxLST:45.3, highRisk:189, popRisk:'1.0M', climateRisk:'Extreme',  totalZones:900, avgNDVI:'0.19' },
  jaipur:    { name:'Jaipur',     avgLST:40.1, maxLST:46.2, highRisk:201, popRisk:'0.7M', climateRisk:'Extreme',  totalZones:900, avgNDVI:'0.16' },
  lucknow:   { name:'Lucknow',    avgLST:38.9, maxLST:45.6, highRisk:195, popRisk:'0.8M', climateRisk:'High',     totalZones:900, avgNDVI:'0.20' }
};

// ---- City summary — backend first, then mock ----
async function fetchCitySummary(city) {
  const data = await apiFetch('/zones/summary?city=' + city);
  if (data && data.heat_summary) {
    return {
      avgLST:    data.heat_summary.avg_lst,
      maxLST:    data.heat_summary.max_lst,
      highRisk:  data.health_summary.high_risk_zones,
      popRisk:   data.health_summary.population_at_high_risk.toLocaleString('en-IN'),
      totalZones: data.zones,
      fromBackend: true
    };
  }
  // Fallback
  const mock = CITY_DATA[city] || CITY_DATA.delhi;
  return { ...mock, fromBackend: false };
}

// ---- Heat map GeoJSON — backend first ----
async function fetchHeatMap(city) {
  return await apiFetch('/heat/map?city=' + city);
  // null means use client-side generation in map.js
}

// ---- Seasonal LST trend — backend first (real per-city trend, not a random mock) ----
async function fetchTrend(city) {
  return await apiFetch('/heat/trend?city=' + city);
}

// ---- UHI hotspots — backend first (drives the Heat Alerts panel) ----
async function fetchHotspots(city, threshold = 2.0) {
  return await apiFetch(`/heat/hotspots?city=${city}&threshold=${threshold}`);
}

// ---- Simulation — backend first ----
async function fetchSimulation(city, scenario, coverage) {
  const path = `/recommendations/simulate?city=${city}&scenario=${scenario}&coverage=${coverage}`;
  return await apiFetch(path);
}

// ---- Health forecast ----
async function fetchForecast(city) {
  return await apiFetch('/health/forecast?city=' + city);
}

// ---- Search any city (not just the curated dropdown list) ----
async function searchCities(query) {
  return await apiFetch('/cities/search?q=' + encodeURIComponent(query));
}

// Registers a searched city with the backend so every other endpoint can
// use it by city_key immediately (see backend/api/cities.py).
async function registerCity(name, lat, lon) {
  try {
    const res = await fetch(API_BASE + '/cities/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, lat, lon }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

// ---- Zone recommendations (real, per-zone, condition-based — not hardcoded per city) ----
async function fetchRecommendations(city, top = 5) {
  return await apiFetch(`/recommendations/zones?city=${city}&top=${top}`);
}

// ---- Live weather calibration status ----
async function fetchLiveCalibration(city) {
  return await apiFetch('/heat/live?city=' + city);
}

// ---- Activity Logger (backend SQLite first, localStorage as offline fallback) ----
function logActivity(type, activity, detail) {
  const city = window.currentCity || '';
  // Fire-and-forget to backend; don't block the UI on it.
  fetch(API_BASE + '/activity/log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, activity, detail: detail || '', city })
  }).catch(() => { /* offline — localStorage below still has it */ });

  try {
    const acts = JSON.parse(localStorage.getItem('uhai_activity') || '[]');
    acts.push({ timestamp: Date.now(), type, activity, detail: detail || '' });
    if (acts.length > 2000) acts.splice(0, acts.length - 2000);
    localStorage.setItem('uhai_activity', JSON.stringify(acts));
  } catch (e) {}
}

// ---- Toast ----
function showToast(msg, type) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const t = document.createElement('div');
  t.className = 'toast' + (type ? ' toast-' + type : '');
  t.textContent = msg;
  t.style.cssText = 'opacity:0;transform:translateY(16px)';
  container.appendChild(t);
  requestAnimationFrame(() => {
    t.style.cssText += ';transition:opacity 0.3s,transform 0.3s;opacity:1;transform:translateY(0)';
  });
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 400); }, 3500);
}

// ---- Backend status indicator ----
// Checked with retries + a short backoff (not just once): on a real machine the
// very first request after the server starts can be slower than BACKEND_TIMEOUT
// (thread-pool/OS warm-up, antivirus scanning freshly-touched files, etc.) even
// though the backend is completely healthy. A single failed check used to leave
// the app stuck thinking it's offline for the whole session even while every
// other panel was clearly getting real backend data. Retrying makes this
// self-heal instead of latching onto one unlucky first attempt.
//
// No persistent badge anymore — just a ONE-TIME toast the moment the backend
// is confirmed reachable. `_backendToastShown` guards against it firing twice
// (e.g. once from the initial check, once from the periodic self-heal below).
let _backendToastShown = false;
window.backendOnline = false;

async function checkBackendStatus(attempt = 1) {
  const data = await apiFetch('/api/status');
  if (data) {
    window.backendOnline = true;
    if (!_backendToastShown) {
      _backendToastShown = true;
      if (typeof showToast === 'function') showToast('✅ Backend Connected', 'success');
    }
    return true;
  }
  if (attempt < 3) {
    await new Promise(r => setTimeout(r, 800 * attempt));
    return checkBackendStatus(attempt + 1);
  }
  window.backendOnline = false;
  return false;
}

// Self-heal: if the backend wasn't reachable yet, keep quietly re-checking in
// the background — the one-time toast above fires whenever it first succeeds,
// without the user needing to reload the page.
setInterval(() => {
  if (!window.backendOnline) checkBackendStatus();
}, 15000);

// Log page view
document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname.split('/').pop() || 'index.html';
  logActivity('page_view', 'Visited ' + path, path);
  checkBackendStatus();
});