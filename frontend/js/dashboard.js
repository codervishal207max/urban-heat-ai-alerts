// ============================================================
// Urban Heat AI v2 — Dashboard Controller
// Live backend data + client-side fallback
// ============================================================

let currentCity = 'delhi';
let riskChart, trendChart;

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

// ---- Stats (backend-aware) ----
async function updateStats(city) {
  const data = (typeof fetchCitySummary === 'function') ? await fetchCitySummary(city) : null;
  const d = data || (typeof CITY_DATA !== 'undefined' ? CITY_DATA[city] : {}) || {};
  setText('dash-avg-temp',  fmt(d.avgLST || d.avg_lst || 0) + '°C');
  setText('dash-max-temp',  fmt(d.maxLST || d.max_lst || 0) + '°C');
  setText('dash-high-risk', d.highRisk   || d.high_risk_zones || '—');
  setText('dash-pop-risk',  d.popRisk    || (d.population_at_high_risk
    ? parseInt(d.population_at_high_risk).toLocaleString('en-IN') : '—'));
  if (data && data.fromBackend === false) showToast('📴 Demo mode — start backend for live data');
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

// ---- Recommendations — NOW backend-driven, per-zone, condition-based
// (heat/landslide/rain — see recommendation_service.py) instead of one
// fixed hardcoded list per city. Every city works, including new ones
// added only to config.py, with no frontend changes needed. ----
async function renderRecommendations(city) {
  const el = document.getElementById('recommendations-list');
  if (!el) return;
  el.innerHTML = '<div class="alert-loading">Loading recommendations…</div>';

  const data = (typeof fetchRecommendations === 'function') ? await fetchRecommendations(city, 4) : null;
  const zoneRecs = data && data.recommendations ? data.recommendations : [];

  if (!zoneRecs.length) {
    el.innerHTML = '<div class="alert-loading">No priority recommendations right now.</div>';
    return;
  }

  // Flatten: one line per zone with its top action, numbered like the old list.
  const lines = zoneRecs.map(z => {
    const hazardTag = z.active_hazards && z.active_hazards.length
      ? ` [${z.active_hazards.join(', ')}]` : '';
    const action = (z.actions && z.actions[0]) || 'Monitor & maintain current green cover';
    return `Zone ${z.cell_id}${hazardTag}: ${action}`;
  });

  el.innerHTML = lines.map((r,i) =>
    `<div class="rec-item"><span class="rec-num">${i+1}</span><span>${r}</span></div>`
  ).join('');
}

// ---- Charts ----
async function initCharts(city) {
  const mockD = (typeof CITY_DATA !== 'undefined') ? CITY_DATA[city] : {};
  const base  = mockD.avgLST || 36;

  const rctx = document.getElementById('riskChart')?.getContext('2d');
  if (rctx) {
    if (riskChart) riskChart.destroy();
    const hr = mockD.highRisk || 150, total = mockD.totalZones || 900;
    const extreme = Math.round(hr*0.25), high = hr-extreme,
          mod = Math.round(total*0.22), low = total-extreme-high-mod;
    riskChart = new Chart(rctx, {
      type:'doughnut',
      data:{ labels:['Extreme','High','Moderate','Low'],
        datasets:[{ data:[extreme,high,mod,low],
          backgroundColor:['#dc2626','#f97316','#eab308','#22c55e'],
          borderColor:'#1a1a2e', borderWidth:2 }] },
      options:{ responsive:true, plugins:{
        legend:{ position:'bottom', labels:{ color:'#e2e8f0', font:{size:11} } },
        tooltip:{ callbacks:{ label: ctx => ` ${ctx.label}: ${ctx.raw} zones` } }
      }}
    });
  }

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
  const scenario = document.getElementById('sim-scenario').value;
  const coverage = parseInt(document.getElementById('sim-coverage').value);
  const meta     = SIM_META[scenario];
  const mockD    = (typeof CITY_DATA !== 'undefined') ? CITY_DATA[currentCity] : {};

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
  await updateStats(city);
  await renderAlerts(city);
  await renderRecommendations(city);
  await initCharts(city);
  if (typeof switchCity === 'function') switchCity(city);
  showToast('🏙️ Switched to '+cityDisplayName(city));
  logActivity('city_change','Switched to '+cityDisplayName(city), city);
}

// ---- Init ----
document.addEventListener('DOMContentLoaded', async () => {
  const urlCity = new URLSearchParams(window.location.search).get('city');
  if (urlCity) currentCity = urlCity;
  window.currentCity = currentCity;

  const sel = document.getElementById('city-select');
  if (sel) { sel.value = currentCity; sel.addEventListener('change', e => switchCityDashboard(e.target.value)); }

  document.getElementById('sim-coverage')?.addEventListener('input', e => {
    const v = document.getElementById('coverage-value'); if (v) v.textContent = e.target.value+'%';
  });
  document.getElementById('run-simulation')?.addEventListener('click', runSimulation);
  document.getElementById('download-report')?.addEventListener('click', downloadReport);
  document.getElementById('sim-close')?.addEventListener('click', () => document.getElementById('sim-modal').classList.remove('open'));
  document.getElementById('sim-modal')?.addEventListener('click', e => { if (e.target.id==='sim-modal') e.target.classList.remove('open'); });
  document.getElementById('climate-modal-close')?.addEventListener('click', () => document.getElementById('climate-modal').classList.remove('open'));

  await updateStats(currentCity);
  await renderAlerts(currentCity);
  await renderRecommendations(currentCity);
  await initCharts(currentCity);
  initClimateBanner();
});