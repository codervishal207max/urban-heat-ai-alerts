// ============================================================
// Urban Heat AI v2 — Dashboard Controller
// Live backend data + client-side fallback
// ============================================================

let currentCity = 'delhi';
let riskChart, trendChart;
// Nothing loads until the user searches and picks a city — see
// initCitySearch() and the guarded DOMContentLoaded block below.
let citySelected = false;
window.citySelected = false;

function requireCitySelected() {
  if (!citySelected) {
    showToast('⚠️ Please select your city');
    return false;
  }
  return true;
}

const CLIMATE_ALERTS = [
  '🔴 CRITICAL: India me heatwave frequency 3× increase projected by 2050 — Urban planning abhi badalni chahiye!',
  '⚠️ WARNING: 2024 India ka sabse garam year recorded — UHI mitigation emergency hai',
  '🌍 Monsoon pattern shift: 22% reduced rainfall predicted for next decade in north India',
  '💧 Groundwater depletion 40% faster due to heat stress — Water conservation urgent',
  '📊 IPCC: South Asian cities face 60% more extreme heat days by 2040',
  '💔 Heat-related mortality in India: +127% since 2000 — Cooling infrastructure needed urgently',
  '🌳 Delhi lost 47% green cover in 20 years — UHI rising 0.5°C per decade',
  '⚡ Urban electricity demand during heat peaks causes cascading blackouts — decentralized cooling needed'
];

// Maps the backend's 5-level HVI risk_level onto the same visual vocabulary
// (EXTREME/HIGH/MODERATE/LOW) the Heat Alerts panel already used, so no CSS
// or markup changes were needed to go from hardcoded to backend-driven.
const HVI_TO_ALERT_LEVEL = {
  'Very High': 'EXTREME',
  'High':      'HIGH',
  'Moderate':  'MODERATE',
  'Low':       'LOW',
  'Very Low':  'LOW'
};

const RISK_C = {EXTREME:'#dc2626',HIGH:'#f97316',MODERATE:'#eab308',LOW:'#22c55e'};
const RISK_E = {EXTREME:'🔴',HIGH:'🟠',MODERATE:'🟡',LOW:'🟢'};

const SIM_META = {
  green_cover:   {icon:'🌳',label:'Green Cover +',suffix:'%',lstFactor:0.09,econPerUnit:90},
  cool_roofs:    {icon:'🏠',label:'Cool Roofs',   suffix:'%',lstFactor:0.06,econPerUnit:60},
  cool_pavements:{icon:'🛣️',label:'Cool Pavements',suffix:'%',lstFactor:0.04,econPerUnit:45},
  water_bodies:  {icon:'💧',label:'Water Bodies', suffix:'%',lstFactor:0.05,econPerUnit:110}
};

// ---- Helpers ----
function setText(id, v) { const e = document.getElementById(id); if (e) e.textContent = v; }
function fmt(n, d=1) { return parseFloat(n).toFixed(d); }

// Resolves a display name for a city regardless of which config it's known
// to — CITY_DATA (mock) first, then map.js's CITY_MAP_CFG, then the raw key.
// This is what lets switchCityDashboard() work for a city that only exists
// in the backend's CITY_REGISTRY and hasn't been hand-added to every
// frontend mock object.
function cityDisplayName(city) {
  if (typeof CITY_DATA !== 'undefined' && CITY_DATA[city]) return CITY_DATA[city].name;
  if (typeof CITY_MAP_CFG !== 'undefined' && CITY_MAP_CFG[city]) return CITY_MAP_CFG[city].name;
  return city.charAt(0).toUpperCase() + city.slice(1);
}

// ---- Stats — computed DIRECTLY from real per-zone data (same features
// map.js already fetched), NOT from /zones/summary + a hardcoded mock
// fallback. The old fallback silently showed DELHI'S numbers for any city
// where that endpoint was slow/unavailable — this removes that risk
// entirely by never depending on a separate, possibly-stale summary call. ----
async function updateStats(city) {
  let feats = window.currentHeatFeatures;
  if (!feats || !feats.length) {
    const geojson = (typeof fetchHeatMap === 'function') ? await fetchHeatMap(city) : null;
    feats = geojson && geojson.features ? geojson.features : [];
  }

  if (!feats.length) {
    setText('dash-avg-temp', '—'); setText('dash-max-temp', '—');
    setText('dash-high-risk', '—'); setText('dash-pop-risk', '—');
    updateLiveBadge(city);
    return;
  }

  const n = feats.length;
  const lsts = feats.map(f => f.properties.lst || 0);
  const avgLst = lsts.reduce((s, v) => s + v, 0) / n;
  const maxLst = Math.max(...lsts);
  const highRiskZones = feats.filter(f => ['High', 'Very High'].includes(f.properties.risk_level));
  const popAtRisk = highRiskZones.reduce((s, f) => s + (f.properties.population_density || 0), 0);

  setText('dash-avg-temp', fmt(avgLst) + '°C');
  setText('dash-max-temp', fmt(maxLst) + '°C');
  setText('dash-high-risk', highRiskZones.length.toLocaleString('en-IN'));
  setText('dash-pop-risk', popAtRisk.toLocaleString('en-IN'));
  updateLiveBadge(city);
}

// ---- Live weather calibration badge ----
async function updateLiveBadge(city) {
  const el = document.getElementById('live-badge');
  if (!el) return;
  const calib = (typeof fetchLiveCalibration === 'function') ? await fetchLiveCalibration(city) : null;
  if (calib && calib.is_satellite) {
    el.textContent = `🛰️ Real satellite data — ${calib.anchor_temp_c}°C skin temp (NASA POWER, ${calib.obs_date})`;
    el.className = 'live-badge satellite';
  } else if (calib && calib.calibrated) {
    const label = calib.anchor_type === 'daily_max' ? "today's peak" : 'current';
    el.textContent = `🌐 Live-calibrated — ${calib.anchor_temp_c}°C ${label} (Open-Meteo)`;
    el.className = 'live-badge online';
  } else if (calib) {
    el.textContent = '📊 Static baseline (live weather unavailable)';
    el.className = 'live-badge offline';
  } else {
    el.textContent = '📊 Estimated data (backend offline)';
    el.className = 'live-badge offline';
  }
}

// ---- Heat Alerts — NOW backend-driven (real hotspots per city, not a
// hand-written per-city zone list). Falls back to "no alerts" gracefully
// rather than a hardcoded fake list when the backend is unreachable, since
// a fabricated zone name for an arbitrary city would be misleading. ----
async function renderAlerts(city) {
  const panel = document.getElementById('heat-alerts-panel');
  if (!panel) return;
  panel.innerHTML = '<div class="alert-loading">Loading alerts…</div>';

  const hotspotData = (typeof fetchHotspots === 'function') ? await fetchHotspots(city, 2.0) : null;
  const hotspots = hotspotData && hotspotData.hotspots ? hotspotData.hotspots : null;

  if (!hotspots || !hotspots.length) {
    panel.innerHTML = '<div class="alert-loading">No active heat alerts for this city.</div>';
    const badge = document.getElementById('city-alert-badge');
    if (badge) badge.classList.add('hidden');
    return;
  }

  // Highest UHI intensity first, top 4 — same count the old hardcoded list showed.
  const top = [...hotspots].sort((a, b) => (b.uhi_intensity||0) - (a.uhi_intensity||0)).slice(0, 4);
  const zones = top.map(z => ({
    zone: `Zone ${z.cell_id}`,
    lst: z.lst,
    risk: HVI_TO_ALERT_LEVEL[z.risk_level] || 'MODERATE'
  }));

  panel.innerHTML = zones.map(z => `
    <div class="alert-item" style="border-left:3px solid ${RISK_C[z.risk]}">
      <div class="alert-zone">${RISK_E[z.risk]} <b>${z.zone}</b></div>
      <div class="alert-meta">
        <span style="color:${RISK_C[z.risk]}">${z.risk}</span>
        <span>LST: <b>${z.lst}°C</b></span>
      </div>
    </div>`).join('');

  const extreme = zones.filter(z => z.risk === 'EXTREME').length;
  const badge = document.getElementById('city-alert-badge');
  if (badge) { badge.textContent = extreme+' EXTREME'; badge.classList.toggle('hidden', extreme === 0); }
  logActivity('heat_alert', 'Alerts loaded for '+cityDisplayName(city), city);
}

// ---- Today's Conditions summary ----
// "[City] — Today (date): Heat [status], Rain [status], Landslide [status]",
// each color-coded (green = normal, red = alert) from the SAME real
// per-zone data already loaded — no separate fetch.
async function renderTodaySummary(city) {
  const el = document.getElementById('today-summary');
  if (!el) return;

  let feats = window.currentHeatFeatures;
  if (!feats || !feats.length) {
    const geojson = (typeof fetchHeatMap === 'function') ? await fetchHeatMap(city) : null;
    feats = geojson && geojson.features ? geojson.features : [];
  }
  if (!feats.length) { el.innerHTML = ''; return; }

  const n = feats.length;
  const avgLst = feats.reduce((s, f) => s + (f.properties.lst || 0), 0) / n;
  const avgRain = feats.reduce((s, f) => s + (f.properties.rainfall_48h_mm || 0), 0) / n;
  const anyLandslide = feats.some(f => ['High', 'Moderate'].includes(f.properties.landslide_risk_level));

  const heatAlert = avgLst >= 38;
  const rainAlert = avgRain >= 20;

  const dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const cityName = cityDisplayName(city);

  const badge = (label, isAlert, detail) =>
    `<div class="ts-badge ${isAlert ? 'ts-alert' : 'ts-normal'}">${isAlert ? '⚠️' : '✅'} ${label}: ${detail}</div>`;

  el.innerHTML = `
    <b>${cityName}</b>
    <span class="ts-date">📅 ${dateStr}</span>
    ${badge('Heat', heatAlert, heatAlert ? `High (${avgLst.toFixed(1)}°C avg)` : `Normal (${avgLst.toFixed(1)}°C avg)`)}
    ${badge('Rain', rainAlert, rainAlert ? `${avgRain.toFixed(0)}mm — active` : 'No significant rainfall')}
    ${badge('Landslide', anyLandslide, anyLandslide ? 'Risk zones active' : 'Not occurring')}
  `;
}

// ---- Recommendations — powers BOTH the "AI Insights" panel (rich HEV
// breakdown cards) and the "Priority Zones" list (compact dot list), from
// ONE backend call so there's no duplicate fetch. ----
const HAZARD_ICON = { heat: '🔥', rain: '🌧️', landslide: '⛰️' };
const HAZARD_COLOR = { heat: '#f97316', rain: '#38bdf8', landslide: '#eab308' };
const HEAT_HEALTH_BY_LEVEL = {
  'Extreme':   { effect: 'High risk of heatstroke, organ stress and heat-related death — especially for children, elderly and outdoor workers.',
                 action: 'Set up cooling centers & free water points, avoid outdoor work 11am–4pm, prioritize emergency health checks for vulnerable residents.' },
  'Very High': { effect: 'Heat exhaustion, dehydration, dizziness and muscle cramps are common; elderly and children are especially vulnerable.',
                 action: 'Increase shaded/green cover urgently, set up hydration points, issue community heat-warning alerts.' },
  'High':      { effect: 'Fatigue and dehydration risk rises sharply; prolonged outdoor exposure becomes unsafe for vulnerable groups.',
                 action: 'Plant trees / cool roofs in this zone, avoid strenuous activity at midday, encourage regular hydration.' },
  'Moderate':  { effect: 'Mild heat discomfort possible for sensitive groups — children, elderly, outdoor workers.',
                 action: 'Maintain existing green cover, monitor vulnerable residents, keep water accessible.' },
  'Low':       { effect: 'No significant heat-related health risk currently in this zone.',
                 action: 'Continue normal precautions and monitor changing conditions.' }
};

function buildHeatHealthCards(zoneRecs) {
  if (!zoneRecs || !zoneRecs.length) {
    return '<div class="alert-loading">No zone risk data available right now.</div>';
  }
  return zoneRecs.slice(0, 5).map(z => {
    const level = z.risk_level || 'Low';
    const info = HEAT_HEALTH_BY_LEVEL[level] || HEAT_HEALTH_BY_LEVEL['Low'];
    const color = HAZARD_COLOR['heat'] || '#f97316';
    return `<div class="insight-item">
      <div class="insight-icon" style="background:${color}22;color:${color}">🌡️</div>
      <div class="insight-body">
        <div class="insight-title">Zone ${z.cell_id} — ${level} heat risk</div>
        <div class="insight-desc">
          <b>Health impact:</b> ${info.effect}<br>
          <b>How to reduce:</b> ${info.action}
        </div>
      </div>
    </div>`;
  }).join('');
}

async function renderRecommendations(city) {
  const listEl = document.getElementById('recommendations-list');
  const insightsEl = document.getElementById('ai-insights-panel');
  if (listEl) listEl.innerHTML = '<div class="alert-loading">Loading…</div>';
  if (insightsEl) insightsEl.innerHTML = '<div class="alert-loading">Loading insights…</div>';

  const data = (typeof fetchRecommendations === 'function') ? await fetchRecommendations(city, 5) : null;
  const zoneRecs = data && data.recommendations ? data.recommendations : [];

  if (!zoneRecs.length) {
    if (listEl) listEl.innerHTML = '<div class="alert-loading">No priority zones right now.</div>';
    if (insightsEl) insightsEl.innerHTML = '<div class="alert-loading">No active insights right now.</div>';
    return;
  }

  // Priority Zones — compact list with a hazard-colored dot
  if (listEl) {
    listEl.innerHTML = zoneRecs.map((z, i) => {
      const hazard = (z.active_hazards && z.active_hazards[0]) || 'heat';
      const color = HAZARD_COLOR[hazard] || '#94a3b8';
      const action = (z.actions && z.actions[0]) || 'Monitor & maintain current green cover';
      return `<div class="rec-item">
        <span class="zone-dot" style="background:${color}"></span>
        <div><b>Zone ${z.cell_id}</b> — ${z.risk_level}<br><span style="color:var(--uha-dim)">${action}</span></div>
      </div>`;
    }).join('');
  }

    // Heat Risk → Human Health Impact & Reduction (replaces old raw AI insights)
  window.__lastZoneRecs = zoneRecs;
  if (insightsEl) {
    insightsEl.innerHTML = buildHeatHealthCards(zoneRecs);
  }
} 

// ---- Land Use & Surface Analysis + Green Cover / Recommended Trees ----
// Derived from real per-zone NDVI + urban_index averaged across the FULL
// city grid (not just top-5 priority zones), fetched via the existing
// /heat/map GeoJSON. This is an ESTIMATE (no true land-use classification
// exists in the pipeline) — labeled "est." in the UI for honesty.
let landUseChart;
async function renderLandStats(city) {
  // Reuse the grid map.js already fetched for this city (window.currentHeatFeatures)
  // instead of calling /heat/map a second time — this was the main duplicate
  // network call slowing the dashboard down on every city switch.
  let feats = window.currentHeatFeatures;
  if (!feats || !feats.length) {
    const geojson = (typeof fetchHeatMap === 'function') ? await fetchHeatMap(city) : null;
    feats = geojson && geojson.features ? geojson.features : [];
  }
  if (!feats.length) return;

  const n = feats.length;
  const avgNdvi = feats.reduce((s, f) => s + (f.properties.ndvi || 0), 0) / n;
  const avgUrban = feats.reduce((s, f) => s + (f.properties.urban_index || 0), 0) / n;
  const treeZones = feats.filter(f => (f.properties.ndvi || 0) < 0.25).length;

  setText('dash-green-cover', Math.round(avgNdvi * 100) + '%');
  setText('dash-tree-zones', treeZones.toLocaleString('en-IN'));

  const builtUp = Math.round(avgUrban * 100);
  const vegetation = Math.round(avgNdvi * 100);
  const openLand = Math.max(0, 100 - builtUp - vegetation);
  const labels = ['Built-up', 'Vegetation', 'Open Land'];
  const values = [builtUp, vegetation, openLand];
  const colors = ['#dc2626', '#22c55e', '#eab308'];

  const ctx = document.getElementById('landUseChart')?.getContext('2d');
  if (ctx) {
    if (landUseChart) landUseChart.destroy();
    landUseChart = new Chart(ctx, {
      type: 'doughnut',
      data: { labels, datasets: [{ data: values, backgroundColor: colors, borderColor: '#11151f', borderWidth: 2 }] },
      options: { responsive: false, plugins: { legend: { display: false } }, cutout: '65%' }
    });
  }
  const legendEl = document.getElementById('land-use-legend');
  if (legendEl) {
    legendEl.innerHTML = labels.map((l, i) =>
      `<div class="dl-row"><span class="dl-swatch" style="background:${colors[i]}"></span>${l}<span class="dl-pct">${values[i]}%</span></div>`
    ).join('');
  }
}

// ---- Population Vulnerability — dedicated /health/vulnerable endpoint
// (backend/api/vulnerability.py), reusing the SAME health_service function
// report_service.py already uses successfully for PDF reports. ----
async function renderVulnerability(city) {
  const el = document.getElementById('vulnerability-panel');
  if (!el) return;
  el.innerHTML = '<div class="alert-loading">Loading…</div>';

  const data = (typeof fetchVulnerablePopulations === 'function') ? await fetchVulnerablePopulations(city) : null;
  const demo = data && data.demographics;

  if (!demo) {
    el.innerHTML = '<div class="alert-loading">Vulnerability breakdown unavailable.</div>';
    return;
  }

  const children = demo.children_0_14 ?? demo.children_under_5 ?? 0;
  const rows = [
    { label: 'Children (0–14)', val: children, color: '#f97316' },
    { label: 'Elderly (65+)', val: demo.elderly_65_plus || 0, color: '#dc2626' },
    { label: 'Outdoor Workers', val: demo.outdoor_workers || 0, color: '#38bdf8' },
    { label: 'Low-income Households', val: demo.low_income_households || 0, color: '#eab308' },
  ];
  const total = rows.reduce((sum, row) => sum + row.val, 0);
  const exactPercentages = rows.map(row => total ? (row.val / total) * 100 : 0);
  const percentages = exactPercentages.map(Math.floor);
  let remainingPoints = total ? 100 - percentages.reduce((sum, pct) => sum + pct, 0) : 0;
  const remainderOrder = exactPercentages
    .map((pct, index) => ({ index, remainder: pct - Math.floor(pct) }))
    .sort((a, b) => b.remainder - a.remainder);

  for (let i = 0; i < remainingPoints; i++) {
    percentages[remainderOrder[i].index] += 1;
  }

  el.innerHTML = rows.map((r, index) => {
    const pct = percentages[index];
    return `<div class="vuln-bar-row">
      <div class="vuln-label"><span>${r.label}</span><span>${r.val.toLocaleString('en-IN')} (${pct}%)</span></div>
      <div class="vuln-track"><div class="vuln-fill" style="width:${pct}%;background:${r.color}"></div></div>
    </div>`;
  }).join('');
}


// ============================================================
// Healthcare Risk Advisory
// Uses the same real city-level environmental + vulnerability
// data already loaded by the dashboard.
// ============================================================

async function renderHealthcareAdvisory(city) {

  const content = document.getElementById('healthcare-content');
  const badge = document.getElementById('health-risk-badge');

  if (!content || !badge) return;

  content.innerHTML = `
    <div class="healthcare-loading">
      🔄 Analysing environmental health risk...
    </div>
  `;

  // ----------------------------------------------------------
  // Get the same heat-map features already loaded by map.js
  // ----------------------------------------------------------

  let feats = window.currentHeatFeatures;

  if (!feats || !feats.length) {
    const geojson =
      (typeof fetchHeatMap === 'function')
        ? await fetchHeatMap(city)
        : null;

    feats = geojson && geojson.features
      ? geojson.features
      : [];
  }

  if (!feats.length) {

    badge.textContent = 'LOW';
    badge.className = 'health-risk-badge low';

    content.innerHTML = `
      <div class="healthcare-loading">
        📍 Select a city to generate healthcare advisory.
      </div>
    `;

    return;
  }

  // ----------------------------------------------------------
  // Environmental conditions
  // ----------------------------------------------------------

  const n = feats.length;

  const avgLst =
    feats.reduce(
      (sum, f) => sum + (f.properties.lst || 0),
      0
    ) / n;

  const maxLst = Math.max(
    ...feats.map(f => f.properties.lst || 0)
  );

  const avgRain =
    feats.reduce(
      (sum, f) =>
        sum + (f.properties.rainfall_48h_mm || 0),
      0
    ) / n;

  const landslideActive =
    feats.some(f =>
      ['High', 'Moderate'].includes(
        f.properties.landslide_risk_level
      )
    );

  // ----------------------------------------------------------
  // Heat risk
  //
  // NOTE:
  // LST is satellite Land Surface Temperature.
  // It is used here as an environmental heat-risk indicator,
  // not as a direct measurement of human body temperature.
  // ----------------------------------------------------------

  let heatLevel = 'LOW';

  if (avgLst >= 42) {
    heatLevel = 'EXTREME';
  } else if (avgLst >= 38) {
    heatLevel = 'HIGH';
  } else if (avgLst >= 35) {
    heatLevel = 'MODERATE';
  }

  // ----------------------------------------------------------
  // Rain risk
  // Same threshold already used by renderTodaySummary()
  // ----------------------------------------------------------

  const heavyRain = avgRain >= 20;

  // ----------------------------------------------------------
  // Overall environmental health risk
  // ----------------------------------------------------------

  let overallRisk = 'LOW';

  if (heatLevel === 'EXTREME') {
    overallRisk = 'EXTREME';
  } else if (
    heatLevel === 'HIGH' ||
    heavyRain ||
    landslideActive
  ) {
    overallRisk = 'HIGH';
  } else if (heatLevel === 'MODERATE') {
    overallRisk = 'MODERATE';
  }

  // ----------------------------------------------------------
  // Badge
  // ----------------------------------------------------------

  badge.textContent = overallRisk;
  badge.className =
    'health-risk-badge ' + overallRisk.toLowerCase();

  // ----------------------------------------------------------
  // Active hazards
  // ----------------------------------------------------------

  const hazards = [];

  if (heatLevel !== 'LOW') {
    hazards.push({
      icon:
        heatLevel === 'EXTREME'
          ? '🔥'
          : '🌡️',

      title:
        heatLevel === 'EXTREME'
          ? 'Extreme heat conditions'
          : heatLevel === 'HIGH'
            ? 'High heat conditions'
            : 'Elevated heat conditions',

      detail:
        `Avg LST ${avgLst.toFixed(1)}°C`
    });
  }

  if (heavyRain) {
    hazards.push({
      icon: '🌧️',
      title: 'Heavy rainfall conditions',
      detail: `${avgRain.toFixed(1)} mm rainfall / 48h`
    });
  }

  if (landslideActive) {
    hazards.push({
      icon: '⛰️',
      title: 'Landslide risk zones active',
      detail: 'Moderate/High risk areas detected'
    });
  }

  // ----------------------------------------------------------
  // Potential health impacts
  // ----------------------------------------------------------

  const impacts = [];

  if (heatLevel === 'EXTREME' || heatLevel === 'HIGH') {
    impacts.push(
      'Dizziness or light-headedness',
      'Fatigue and weakness',
      'Dehydration',
      'Heat exhaustion'
    );
  } else if (heatLevel === 'MODERATE') {
    impacts.push(
      'Fatigue during prolonged heat exposure',
      'Dehydration risk'
    );
  }

  if (heavyRain) {
    impacts.push(
      'Mobility and water-exposure hazards'
    );
  }

  if (landslideActive) {
    impacts.push(
      'Injury risk near unstable slopes'
    );
  }

  if (!impacts.length) {
    impacts.push(
      'No major environmental health hazard detected'
    );
  }

  // ----------------------------------------------------------
  // Recommendations
  // ----------------------------------------------------------

  const recommendations = [];

  if (heatLevel === 'EXTREME' || heatLevel === 'HIGH') {

    recommendations.push(
      'Drink water frequently and maintain hydration.',
      'Avoid prolonged outdoor exposure during peak heat.',
      'Use shaded or cool areas whenever possible.',
      'Monitor children, elderly people and outdoor workers.'
    );

  } else if (heatLevel === 'MODERATE') {

    recommendations.push(
      'Stay hydrated during outdoor activities.',
      'Take breaks from prolonged heat exposure.'
    );
  }

  if (heavyRain) {

    recommendations.push(
      'Avoid flooded roads and waterlogged areas.',
      'Follow local weather and emergency advisories.'
    );
  }

  if (landslideActive) {

    recommendations.push(
      'Avoid unstable slopes and landslide-prone areas.',
      'Follow local evacuation or emergency instructions.'
    );
  }

  if (!recommendations.length) {

    recommendations.push(
      'Continue normal precautions and monitor changing conditions.'
    );
  }

  // ----------------------------------------------------------
  // Population vulnerability
  // Uses the existing backend endpoint already used by
  // renderVulnerability().
  // ----------------------------------------------------------

  let vulnerabilityText = 'Data unavailable';

  try {

    const vulnData =
      (typeof fetchVulnerablePopulations === 'function')
        ? await fetchVulnerablePopulations(city)
        : null;

    const demo =
      vulnData && vulnData.demographics;

    if (demo) {

      const vulnerablePopulation =
        (demo.elderly_65_plus || 0) +
        (demo.children_under_5 || 0) +
        (demo.outdoor_workers || 0) +
        (demo.low_income_households || 0);

      if (vulnerablePopulation > 0) {

        vulnerabilityText =
          vulnerablePopulation.toLocaleString('en-IN');
      }
    }

  } catch (error) {

    console.warn(
      'Healthcare vulnerability data unavailable:',
      error
    );
  }

  // ----------------------------------------------------------
  // Render
  // ----------------------------------------------------------

  content.innerHTML = `

    <div class="healthcare-section">

      <div class="healthcare-section-title">
        Current Conditions
      </div>

      <div class="healthcare-data-row">
        <span>🌡️ Avg LST</span>
        <span class="healthcare-data-value">
          ${avgLst.toFixed(1)}°C
        </span>
      </div>

      <div class="healthcare-data-row">
        <span>🔥 Max LST</span>
        <span class="healthcare-data-value">
          ${maxLst.toFixed(1)}°C
        </span>
      </div>

      <div class="healthcare-data-row">
        <span>🌧️ Rainfall</span>
        <span class="healthcare-data-value">
          ${avgRain.toFixed(1)} mm
        </span>
      </div>

      <div class="healthcare-data-row">
        <span>👥 Vulnerable Population</span>
        <span class="healthcare-data-value">
          ${vulnerabilityText}
        </span>
      </div>

    </div>


    <div class="healthcare-section">

      <div class="healthcare-section-title">
        Active Environmental Risks
      </div>

      ${
        hazards.length
          ? hazards.map(h => `
              <div class="healthcare-hazard">
                <span class="healthcare-hazard-icon">
                  ${h.icon}
                </span>

                <div class="healthcare-hazard-text">
                  <b>${h.title}</b><br>
                  ${h.detail}
                </div>
              </div>
            `).join('')
          : `
            <div class="healthcare-hazard"
                 style="border-left-color:#22c55e;">
              <span class="healthcare-hazard-icon">✅</span>
              <div class="healthcare-hazard-text">
                No significant environmental hazard detected.
              </div>
            </div>
          `
      }

    </div>


    <div class="healthcare-section">

      <div class="healthcare-section-title">
        Potential Health Impacts
      </div>

      <div class="healthcare-impact">
        ${impacts.map(i => `• ${i}`).join('<br>')}
      </div>

    </div>


    <div class="healthcare-section">

      <div class="healthcare-section-title">
        Recommended Actions
      </div>

      ${
        recommendations
          .map(r => `
            <div class="healthcare-recommendation">
              ${r}
            </div>
          `)
          .join('')
      }

    </div>
  `;

  logActivity(
    'healthcare_advisory',
    'Healthcare advisory generated for ' +
      cityDisplayName(city),
    overallRisk
  );
}


// ---- Charts ----
async function initCharts(city) {
  const mockD = (typeof CITY_DATA !== 'undefined' && CITY_DATA[city]) ? CITY_DATA[city] : {};
  const base  = mockD.avgLST || 36;


  // Trend chart — NOW backend-driven (real per-city seasonal average from
  // heat_service.get_trend, anchored to the satellite/live-calibrated base).
  // Falls back to the old random-jitter mock only if the backend is
  // unreachable, so the demo never breaks offline.
  const tctx = document.getElementById('trendChart')?.getContext('2d');
  if (tctx) {
    if (trendChart) trendChart.destroy();

    const trendData = (typeof fetchTrend === 'function') ? await fetchTrend(city) : null;
    let labels, vals, isLive;

    if (trendData && trendData.months && trendData.city_average) {
      labels = trendData.months;
      vals = trendData.city_average;
      isLive = true;
    } else {
      const offs = [-6,-4,-2,0,3,6,7,5,1,-2,-4,-5];
      labels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      vals = offs.map(v => +(base+v+(Math.random()-0.5)*0.4).toFixed(1));
      isLive = false;
    }

    trendChart = new Chart(tctx, {
      type:'line',
      data:{ labels, datasets:[{ label: isLive ? 'Avg LST (°C) — live' : 'Avg LST (°C) — demo', data:vals,
          borderColor:'#f97316', backgroundColor:'rgba(249,115,22,0.12)',
          pointBackgroundColor:'#f97316', tension:0.4, fill:true, pointRadius:4 }] },
      options:{ responsive:true,
        scales:{
          x:{ ticks:{color:'#94a3b8'}, grid:{color:'rgba(255,255,255,0.05)'} },
          y:{ ticks:{color:'#94a3b8'}, grid:{color:'rgba(255,255,255,0.05)'} }
        },
        plugins:{ legend:{ labels:{color:'#e2e8f0'} } }
      }
    });
  }
}

// ---- Climate Banner ----
let bannerIdx = 0;
function initClimateBanner() {
  const el = document.getElementById('climate-banner-text');
  if (!el) return;
  el.textContent = CLIMATE_ALERTS[0];
  el.style.transition = 'opacity 0.4s';
  setInterval(() => {
    el.style.opacity = '0';
    setTimeout(() => { bannerIdx = (bannerIdx+1)%CLIMATE_ALERTS.length; el.textContent = CLIMATE_ALERTS[bannerIdx]; el.style.opacity = '1'; }, 420);
  }, 6000);
  document.getElementById('climate-close-btn')?.addEventListener('click', () => {
    document.getElementById('climate-alert-banner').style.display = 'none';
    logActivity('climate_alert','Dismissed climate banner','');
  });
  logActivity('climate_alert','Climate banner shown', CLIMATE_ALERTS[0].slice(0,60));
}

// ---- Simulation (backend-aware) ----
async function runSimulation() {
  if (!requireCitySelected()) return;
  const scenario = document.getElementById('sim-scenario').value;
  const coverage = parseInt(document.getElementById('sim-coverage').value);
  const meta     = SIM_META[scenario];
  const mockD    = (typeof CITY_DATA !== 'undefined' && CITY_DATA[currentCity]) ? CITY_DATA[currentCity] : {};

  // Try backend
  let result = (typeof fetchSimulation === 'function')
    ? await fetchSimulation(currentCity, scenario, coverage) : null;

  let avgLST, newAvg, lstDrop, saved, benefited, econCrore;
  if (result && result.projected_state) {
    avgLST    = result.current_state.avg_lst;
    newAvg    = result.projected_state.avg_lst;
    lstDrop   = result.projected_state.temp_reduction;
    saved     = result.health_impact.projected_deaths_prevented;
    benefited = result.health_impact.people_benefited.toLocaleString('en-IN');
    econCrore = result.economic_saving_crore ? '₹'+result.economic_saving_crore+' Cr' : '—';
  } else {
    // client fallback
    lstDrop   = +(meta.lstFactor * coverage).toFixed(2);
    avgLST    = mockD.avgLST || 37;
    newAvg    = +(avgLST - lstDrop).toFixed(1);
    saved     = Math.round(80 * (coverage/20) * meta.lstFactor * 10);
    benefited = (Math.round(30000 * coverage/20)).toLocaleString('en-IN');
    econCrore = '₹'+ Math.round(meta.econPerUnit * coverage) + ' Cr';
  }

  const modal   = document.getElementById('sim-modal');
  const content = document.getElementById('sim-results');
  if (!modal || !content) return;
  content.innerHTML = `
    <div class="sim-result-grid">
      <div class="sim-result-card">
        <div class="sim-result-icon">${meta.icon}</div>
        <div class="sim-result-label">${meta.label} ${coverage}${meta.suffix}</div>
        <div class="sim-result-city">${cityDisplayName(currentCity)}</div>
      </div>
      <div class="sim-metrics">
        <div class="sim-metric"><span class="sim-metric-label">Current Avg LST</span><span class="sim-metric-val">${avgLST}°C</span></div>
        <div class="sim-metric"><span class="sim-metric-label">Projected Avg LST</span><span class="sim-metric-val" style="color:#22c55e">${newAvg}°C</span></div>
        <div class="sim-metric"><span class="sim-metric-label">Temp Reduction</span><span class="sim-metric-val" style="color:#38bdf8">−${lstDrop}°C</span></div>
        <div class="sim-metric"><span class="sim-metric-label">Lives Protected/yr</span><span class="sim-metric-val" style="color:#a78bfa">${saved}</span></div>
        <div class="sim-metric"><span class="sim-metric-label">People Benefited</span><span class="sim-metric-val" style="color:#f97316">${benefited}</span></div>
        <div class="sim-metric"><span class="sim-metric-label">Economic Savings</span><span class="sim-metric-val" style="color:#fbbf24">${econCrore}</span></div>
      </div>
    </div>
    <div class="sim-note">💡 ${result?'Live backend simulation':'Demo simulation — start backend for ML-based results'}. Implement via city-level policy for maximum impact.</div>`;
  modal.classList.add('open');
  logActivity('simulation', meta.label+' '+coverage+meta.suffix+' on '+cityDisplayName(currentCity), 'LST drop: '+lstDrop+'°C');
  showToast('🧪 Simulation: −'+lstDrop+'°C projected');
}

// ---- Policy Report (PDF download) ----
function downloadReport() {
  if (!requireCitySelected()) return;
  const scenario = document.getElementById('sim-scenario')?.value || 'green_cover';
  const coverage = document.getElementById('sim-coverage')?.value || 20;
  const url = API_BASE + `/report/generate?city=${currentCity}&scenario=${scenario}&coverage=${coverage}`;
  window.open(url, '_blank');
  showToast('📄 Generating policy report…');
  logActivity('report_download', 'Downloaded policy report for ' + cityDisplayName(currentCity), scenario + ' ' + coverage + '%');
}

// ---- City Switcher ----
// NOTE: previously gated on `if (!CITY_DATA || !CITY_DATA[city]) return;` —
// that silently no-op'd for any city not hand-added to the CITY_DATA mock
// object, which would have blocked every newly-added city (config.py) from
// working in the dashboard. Removed: every panel below already has its own
// backend-first-then-fallback logic, so there's nothing left that requires
// CITY_DATA to contain the city.
async function switchCityDashboard(city) {
  currentCity = city;
  window.currentCity = city;

  // switchCity (map.js) runs FIRST and alone — it populates
  // window.currentHeatFeatures, which renderLandStats() below reuses instead
  // of re-fetching. Everything else here is independent of each other, so
  // they run in parallel instead of one-by-one — this is the main fix for
  // "dashboard data load hone me time leta hai".
  if (typeof switchCity === 'function') switchCity(city);

  await Promise.all([
    updateStats(city),
    renderTodaySummary(city),
    renderAlerts(city),
    renderRecommendations(city),
    renderLandStats(city),
    renderVulnerability(city),
    renderHealthcareAdvisory(city),
    initCharts(city),
  ]);

  showToast('🏙️ Switched to '+cityDisplayName(city));
  logActivity('city_change','Switched to '+cityDisplayName(city), city);
}

// ---- City search (any city, not just the curated dropdown) ----
let _citySearchTimer = null;

function initCitySearch() {
  const input = document.getElementById('city-search-input');
  const results = document.getElementById('city-search-results');
  if (!input || !results) return;

  input.addEventListener('input', () => {
    clearTimeout(_citySearchTimer);
    const q = input.value.trim();
    if (q.length < 2) { results.classList.add('hidden'); return; }
    _citySearchTimer = setTimeout(async () => {
      const data = (typeof searchCities === 'function') ? await searchCities(q) : null;
      const matches = data && data.results ? data.results : [];
      if (!matches.length) {
        results.innerHTML = '<div class="city-search-empty">No matches found.</div>';
        results.classList.remove('hidden');
        return;
      }
      results.innerHTML = matches.map((m, i) =>
        `<div class="city-search-item" data-idx="${i}"><b>${m.name}</b><small>${m.display_name}</small></div>`
      ).join('');
      results.classList.remove('hidden');

      results.querySelectorAll('.city-search-item').forEach(el => {
        el.addEventListener('click', async () => {
          const m = matches[parseInt(el.dataset.idx)];
          results.classList.add('hidden');
          input.value = m.name;
          showToast('📍 Adding ' + m.name + '…');

          const reg = (typeof registerCity === 'function') ? await registerCity(m.name, m.lat, m.lon) : null;
          if (!reg || !reg.city_key) { showToast('⚠️ Could not add this city'); return; }

          // Register into map.js's CITY_MAP_CFG at runtime so the map can
          // center on it — real backend data (heat, recommendations, etc.)
          // already works for it via city_key regardless of this.
          if (typeof CITY_MAP_CFG !== 'undefined') {
            CITY_MAP_CFG[reg.city_key] = { name: reg.name, center: [reg.lat, reg.lon], zoom: 11, baseLST: 30, heatFactor: 8 };
          }

          // Persist the selection so navigating Home → Dashboard (or a
          // refresh) doesn't lose it — stays selected until the user
          // searches a different city, not just for this page view.
          try {
            sessionStorage.setItem('uhai_last_city', JSON.stringify(
              { key: reg.city_key, name: reg.name, lat: reg.lat, lon: reg.lon }));
          } catch (e) {}

          selectCity(reg.city_key);
        });
      });
    }, 400); // debounce — avoid a request per keystroke
  });

  document.addEventListener('click', (e) => {
    if (!results.contains(e.target) && e.target !== input) results.classList.add('hidden');
  });
}

// ---- Init ----
document.addEventListener('DOMContentLoaded', () => {
  const urlCity = new URLSearchParams(window.location.search).get('city');
  // A URL-provided city still requires going through the normal search+select
  // flow's data loading path (selectCity below) rather than silently
  // auto-loading, so the "nothing shows until a city is chosen" rule holds
  // even for direct links — this just pre-fills the search box for convenience.
  if (urlCity) {
    const input = document.getElementById('city-search-input');
    if (input) input.value = urlCity;
  }

  document.getElementById('sim-coverage')?.addEventListener('input', e => {
    const v = document.getElementById('coverage-value'); if (v) v.textContent = e.target.value+'%';
  });
  document.getElementById('run-simulation')?.addEventListener('click', runSimulation);
    document.getElementById('open-insights-report')?.addEventListener('click', () => {
    const riskDst = document.getElementById('insights-modal-risk');
    if (riskDst) riskDst.innerHTML = buildHeatHealthCards(window.__lastZoneRecs || []);

    const cityLabel = document.getElementById('insights-modal-city');
    if (cityLabel && typeof currentCity !== 'undefined') cityLabel.textContent = cityDisplayName(currentCity);

    document.getElementById('insights-modal')?.classList.add('open');
  }); 
  
  document.getElementById('insights-modal-close')?.addEventListener('click', () =>
    document.getElementById('insights-modal')?.classList.remove('open'));
  document.getElementById('insights-modal')?.addEventListener('click', e => {
    if (e.target.id === 'insights-modal') e.target.classList.remove('open');
  });
  document.getElementById('download-report')?.addEventListener('click', downloadReport);
  document.getElementById('sim-close')?.addEventListener('click', () => document.getElementById('sim-modal').classList.remove('open'));
  document.getElementById('sim-modal')?.addEventListener('click', e => { if (e.target.id==='sim-modal') e.target.classList.remove('open'); });
  document.getElementById('climate-modal-close')?.addEventListener('click', () => document.getElementById('climate-modal').classList.remove('open'));

  // Guard "Compare Before/After" — attached BEFORE compare.js's own listener
  // (this script loads first), so stopImmediatePropagation here blocks
  // compare.js's handler from running at all when no city is selected yet.
  document.getElementById('compare-toggle-btn')?.addEventListener('click', (e) => {
    if (!requireCitySelected()) { e.stopImmediatePropagation(); e.preventDefault(); }
  });

  initCitySearch();

  // Restore the last city the user selected — but ONLY on navigation
  // (clicking Home ↔ Dashboard), not on a page refresh. The Navigation
  // Timing API tells us which one just happened: a real reload clears the
  // saved city (fresh start); any other navigation type restores it.
  const navEntry = performance.getEntriesByType('navigation')[0];
  const wasReload = navEntry ? navEntry.type === 'reload' : (performance.navigation && performance.navigation.type === 1);
  if (wasReload) {
    try { sessionStorage.removeItem('uhai_last_city'); } catch (e) {}
  }

  let restored = null;
  try {
    restored = JSON.parse(sessionStorage.getItem('uhai_last_city') || 'null');
  } catch (e) {}

  if (restored && restored.key) {
    if (typeof CITY_MAP_CFG !== 'undefined') {
      CITY_MAP_CFG[restored.key] = { name: restored.name, center: [restored.lat, restored.lon], zoom: 11, baseLST: 30, heatFactor: 8 };
    }
    const input = document.getElementById('city-search-input');
    if (input) input.value = restored.name;
    selectCity(restored.key);
  } else {
    showEmptyState();
  }

  initClimateBanner();
});

// Nothing is loaded on page load — every panel shows a "select your city"
// placeholder until the user searches and picks one (initCitySearch()).
function showEmptyState() {
  const msg = '📍 Please select your city to see data';
  const heatAlerts = document.getElementById('heat-alerts-panel');
  const insights = document.getElementById('ai-insights-panel');
  const recList = document.getElementById('recommendations-list');
  const vuln = document.getElementById('vulnerability-panel');
  const landLegend = document.getElementById('land-use-legend');
  if (heatAlerts) heatAlerts.innerHTML = `<div class="alert-loading">${msg}</div>`;
  if (insights) insights.innerHTML = `<div class="alert-loading">${msg}</div>`;
  if (recList) recList.innerHTML = `<div class="alert-loading">${msg}</div>`;
  if (vuln) vuln.innerHTML = `<div class="alert-loading">${msg}</div>`;
  if (landLegend) landLegend.innerHTML = `<div class="alert-loading">${msg}</div>`;
  const liveBadge = document.getElementById('live-badge');
  if (liveBadge) { liveBadge.textContent = msg; liveBadge.className = 'live-badge offline'; }
}

// Called once, right after a city is successfully searched + registered —
// this is the ONLY path that actually loads real data anywhere in the app.
async function selectCity(cityKey) {
  citySelected = true;
  window.citySelected = true;
  currentCity = cityKey;
  window.currentCity = cityKey;
  await switchCityDashboard(cityKey);
}