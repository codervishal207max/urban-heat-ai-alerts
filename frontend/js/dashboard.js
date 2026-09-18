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

const ALERT_ZONES = {
  delhi:     [{zone:'Zone 2549 (Okhla)',   lst:46.1,risk:'EXTREME'},{zone:'Zone 1832 (Karol Bagh)',lst:43.5,risk:'HIGH'},{zone:'Zone 3011 (Shahdara)',lst:42.8,risk:'HIGH'},{zone:'Zone 0445 (CP)',lst:39.2,risk:'MODERATE'}],
  mumbai:    [{zone:'Zone 1122 (Kurla E)', lst:41.0,risk:'HIGH'},   {zone:'Zone 0889 (Bhandup)',  lst:39.8,risk:'HIGH'},{zone:'Zone 2001 (Dharavi)', lst:38.5,risk:'MODERATE'},{zone:'Zone 0312 (Andheri)',lst:35.2,risk:'LOW'}],
  bangalore: [{zone:'Zone 0671 (Whitefield)',lst:38.4,risk:'MODERATE'},{zone:'Zone 1200 (E.City)', lst:37.1,risk:'MODERATE'},{zone:'Zone 0345 (Yelahanka)',lst:34.2,risk:'LOW'},{zone:'Zone 0112 (Indiranagar)',lst:32.6,risk:'LOW'}],
  chennai:   [{zone:'Zone 1450 (Ambattur)',lst:43.2,risk:'HIGH'},   {zone:'Zone 0980 (Perambur)', lst:41.5,risk:'HIGH'},{zone:'Zone 2100 (Adyar)',   lst:38.0,risk:'MODERATE'},{zone:'Zone 0220 (Besant Nagar)',lst:34.1,risk:'LOW'}],
  hyderabad: [{zone:'Zone 1800 (Uppal)',   lst:41.8,risk:'HIGH'},   {zone:'Zone 0990 (LB Nagar)',  lst:40.5,risk:'HIGH'},{zone:'Zone 2210 (Ameerpet)',lst:37.4,risk:'MODERATE'},{zone:'Zone 0150 (Madhapur)', lst:34.6,risk:'LOW'}],
  kolkata:   [{zone:'Zone 2050 (Howrah)',  lst:44.5,risk:'EXTREME'},{zone:'Zone 1340 (Ultadanga)',  lst:42.1,risk:'HIGH'},{zone:'Zone 0780 (Salt Lake)',lst:39.3,risk:'MODERATE'},{zone:'Zone 0320 (Alipore)', lst:35.8,risk:'LOW'}],
  pune:      [{zone:'Zone 1120 (Hadapsar)',lst:40.0,risk:'HIGH'},   {zone:'Zone 0870 (Lohegaon)',  lst:38.5,risk:'MODERATE'},{zone:'Zone 0440 (Kothrud)',lst:36.2,risk:'MODERATE'},{zone:'Zone 0210 (Pashan)',  lst:33.1,risk:'LOW'}],
  ahmedabad: [{zone:'Zone 1900 (Naroda)',  lst:45.0,risk:'EXTREME'},{zone:'Zone 1250 (Vatva)',      lst:43.4,risk:'HIGH'},{zone:'Zone 0780 (Maninagar)',lst:40.2,risk:'HIGH'},{zone:'Zone 0340 (SG Hwy)', lst:36.8,risk:'MODERATE'}],
  jaipur:    [{zone:'Zone 1680 (Sitapura)',lst:45.8,risk:'EXTREME'},{zone:'Zone 1020 (Mansarovar)',  lst:43.9,risk:'HIGH'},{zone:'Zone 0560 (Walled City)',lst:41.2,risk:'HIGH'},{zone:'Zone 0220 (C-Scheme)',lst:37.4,risk:'MODERATE'}],
  lucknow:   [{zone:'Zone 1750 (Amausi)', lst:45.1,risk:'EXTREME'},{zone:'Zone 1100 (Chowk)',        lst:43.2,risk:'HIGH'},{zone:'Zone 0680 (Gomtinagar)',lst:40.5,risk:'HIGH'},{zone:'Zone 0290 (Hazratganj)',lst:37.1,risk:'MODERATE'}]
};

const RISK_C = {EXTREME:'#dc2626',HIGH:'#f97316',MODERATE:'#eab308',LOW:'#22c55e'};
const RISK_E = {EXTREME:'🔴',HIGH:'🟠',MODERATE:'🟡',LOW:'🟢'};

const SIM_META = {
  green_cover:   {icon:'🌳',label:'Green Cover +',suffix:'%',lstFactor:0.09,econPerUnit:90},
  cool_roofs:    {icon:'🏠',label:'Cool Roofs',   suffix:'%',lstFactor:0.06,econPerUnit:60},
  cool_pavements:{icon:'🛣️',label:'Cool Pavements',suffix:'%',lstFactor:0.04,econPerUnit:45},
  water_bodies:  {icon:'💧',label:'Water Bodies', suffix:'%',lstFactor:0.05,econPerUnit:110}
};

const CITY_RECS = {
  delhi:     ['Plant 50,000+ native trees in Okhla, Karol Bagh hotspot zones','Cool roof mandate for all industrial buildings in Shahdara','Water tanker deployment in Very High LST slum clusters','Green corridor along Ring Road & NH-8'],
  mumbai:    ['Mangrove restoration along eastern coastline (Kurla, Bhandup)','Permeable pavements in dense commercial zones','Rooftop garden mandate for commercial buildings > 500 sqm','Cool pavement pilot on Eastern Express Highway'],
  bangalore: ['Protect remaining lakes from encroachment','Urban tree canopy program for Electronic City corridor','Cool roofs in Whitefield IT zone','Green buffer zones around Outer Ring Road'],
  chennai:   ['Sea-breeze corridor planning near Marina Beach area','Tree plantation in Ambattur Industrial Estate','Cool roof for low-income housing in North Chennai','Rainwater harvesting to replenish urban lakes'],
  hyderabad: ['Hussain Sagar lake restoration for evaporative cooling','Green cover in HITEC City tech corridor','Cool pavements in Old City dense areas','Urban farming on vacant government plots'],
  kolkata:   ['East Kolkata Wetlands buffer zone protection','Tree plantation in Salt Lake IT sector','Cool roof program for North Kolkata dense housing','Green parks in industrial Howrah areas'],
  pune:      ['Khadakwasla watershed green belt protection','Cool pavements in Hadapsar IT zone','Urban heat shelter for construction workers','Green terrace program for housing societies'],
  ahmedabad: ['Shade structure in dense Walled City','Cool roof mandate for Naroda industrial zone','Lake restoration: Kankaria & Vastrapur','Tree plantation along Sabarmati riverfront'],
  jaipur:    ['Desert-adapted tree species in Pink City outskirts','Cool roof program for Walled City heritage buildings','Shade corridors in Sitapura industrial area','Traditional step-well (baoli) restoration for micro-cooling'],
  lucknow:   ['Restore Gomti river green corridor','Cool roof in Chowk old-city dense area','Urban park expansion in Trans-Gomti zone','Industrial green buffer in Amausi area']
};

// ---- Helpers ----
function setText(id, v) { const e = document.getElementById(id); if (e) e.textContent = v; }
function fmt(n, d=1) { return parseFloat(n).toFixed(d); }

// ---- Stats (backend-aware) ----
async function updateStats(city) {
  const data = (typeof fetchCitySummary === 'function') ? await fetchCitySummary(city) : null;
  const d = data || (typeof CITY_DATA !== 'undefined' ? CITY_DATA[city] : {});
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

// ---- Heat Alerts ----
function renderAlerts(city) {
  const panel = document.getElementById('heat-alerts-panel');
  if (!panel) return;
  const zones = ALERT_ZONES[city] || [];
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
  logActivity('heat_alert', 'Alerts loaded for '+(CITY_DATA&&CITY_DATA[city]?CITY_DATA[city].name:city), city);
}

// ---- Recommendations ----
function renderRecommendations(city) {
  const el = document.getElementById('recommendations-list');
  if (!el) return;
  const recs = CITY_RECS[city] || [];
  el.innerHTML = recs.map((r,i) =>
    `<div class="rec-item"><span class="rec-num">${i+1}</span><span>${r}</span></div>`
  ).join('');
}

// ---- Charts ----
function initCharts(city) {
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

  const tctx = document.getElementById('trendChart')?.getContext('2d');
  if (tctx) {
    if (trendChart) trendChart.destroy();
    const offs = [-6,-4,-2,0,3,6,7,5,1,-2,-4,-5];
    const vals = offs.map(v => +(base+v+(Math.random()-0.5)*0.4).toFixed(1));
    trendChart = new Chart(tctx, {
      type:'line',
      data:{ labels:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
        datasets:[{ label:'Avg LST (°C)', data:vals,
          borderColor:'#f97316', backgroundColor:'rgba(249,115,22,0.12)',
          pointBackgroundColor:'#f97316', tension:0.4, fill:true, pointRadius:4 }] },
      options:{ responsive:true,
        scales:{
          x:{ ticks:{color:'#94a3b8'}, grid:{color:'rgba(255,255,255,0.05)'} },
          y:{ ticks:{color:'#94a3b8'}, grid:{color:'rgba(255,255,255,0.05)'}, min:base-9, max:base+10 }
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
        <div class="sim-result-city">${(CITY_DATA&&CITY_DATA[currentCity]?CITY_DATA[currentCity].name:currentCity)}</div>
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
  logActivity('simulation', meta.label+' '+coverage+meta.suffix+' on '+(CITY_DATA&&CITY_DATA[currentCity]?CITY_DATA[currentCity].name:currentCity), 'LST drop: '+lstDrop+'°C');
  showToast('🧪 Simulation: −'+lstDrop+'°C projected');
}

// ---- Policy Report (PDF download) ----
function downloadReport() {
  const scenario = document.getElementById('sim-scenario')?.value || 'green_cover';
  const coverage = document.getElementById('sim-coverage')?.value || 20;
  const url = API_BASE + `/report/generate?city=${currentCity}&scenario=${scenario}&coverage=${coverage}`;
  window.open(url, '_blank');
  showToast('📄 Generating policy report…');
  logActivity('report_download', 'Downloaded policy report for ' +
    (CITY_DATA && CITY_DATA[currentCity] ? CITY_DATA[currentCity].name : currentCity), scenario + ' ' + coverage + '%');
}

// ---- City Switcher ----
async function switchCityDashboard(city) {
  if (!CITY_DATA || !CITY_DATA[city]) return;
  currentCity = city;
  window.currentCity = city;
  await updateStats(city);
  renderAlerts(city);
  renderRecommendations(city);
  initCharts(city);
  if (typeof switchCity === 'function') switchCity(city);
  showToast('🏙️ Switched to '+(CITY_DATA[city]?.name||city));
  logActivity('city_change','Switched to '+(CITY_DATA[city]?.name||city), city);
}

// ---- Init ----
document.addEventListener('DOMContentLoaded', async () => {
  const urlCity = new URLSearchParams(window.location.search).get('city');
  if (urlCity && typeof CITY_DATA !== 'undefined' && CITY_DATA[urlCity]) currentCity = urlCity;
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
  renderAlerts(currentCity);
  renderRecommendations(currentCity);
  initCharts(currentCity);
  initClimateBanner();
});
