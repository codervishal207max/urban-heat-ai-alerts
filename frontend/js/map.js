// ============================================================
// Urban Heat AI v2 — Map Engine
// CartoDB Dark Matter tiles (free, no API key)
// Tries backend GeoJSON first; generates client-side if offline
// ============================================================

const CITY_MAP_CFG = {
  delhi:     { name:'Delhi NCR',   center:[28.61,77.21], zoom:11, baseLST:33, heatFactor:9 },
  mumbai:    { name:'Mumbai',      center:[19.07,72.87], zoom:11, baseLST:28, heatFactor:7 },
  bangalore: { name:'Bangalore',   center:[12.97,77.59], zoom:11, baseLST:26, heatFactor:7 },
  chennai:   { name:'Chennai',     center:[13.08,80.27], zoom:11, baseLST:30, heatFactor:8 },
  hyderabad: { name:'Hyderabad',   center:[17.38,78.47], zoom:11, baseLST:29, heatFactor:8 },
  kolkata:   { name:'Kolkata',     center:[22.57,88.36], zoom:11, baseLST:31, heatFactor:8 },
  pune:      { name:'Pune',        center:[18.52,73.86], zoom:11, baseLST:27, heatFactor:7 },
  ahmedabad: { name:'Ahmedabad',   center:[23.03,72.58], zoom:11, baseLST:32, heatFactor:8 },
  jaipur:    { name:'Jaipur',      center:[26.92,75.82], zoom:11, baseLST:33, heatFactor:9 },
  lucknow:   { name:'Lucknow',     center:[26.85,80.95], zoom:11, baseLST:32, heatFactor:8 }
};

let map, currentMapCity = 'delhi';
const mapLayers = {};

const RISK_COLORS = {
  'Very Low':'#3b82f6','Low':'#22c55e',
  'Moderate':'#eab308','High':'#f97316','Very High':'#dc2626'
};

function heatColor(t) {
  return t>45?'#7f1d1d':t>42?'#dc2626':t>39?'#f97316':t>36?'#eab308':t>33?'#22c55e':'#3b82f6';
}
function ndviColor(v) {
  return v>0.6?'#14532d':v>0.45?'#16a34a':v>0.3?'#65a30d':v>0.15?'#eab308':'#dc2626';
}
function riskColor(lvl) { return RISK_COLORS[lvl] || '#94a3b8'; }

// Rainfall (mm, 48h cumulative)
function rainColor(mm) {
  return mm>50?'#1e3a8a':mm>20?'#3b82f6':mm>5?'#93c5fd':'#e0f2fe';
}
// Landslide risk level
function landslideColor(lvl) {
  return lvl==='High'?'#dc2626':lvl==='Moderate'?'#f59e0b':'#22c55e';
}

// ---- Build client-side grid (fallback when backend offline) ----
function buildClientGrid(cityKey) {
  const cfg = CITY_MAP_CFG[cityKey] || CITY_MAP_CFG.delhi;
  const [clat, clon] = cfg.center;
  const ROWS = 30, COLS = 30;
  const latStep = 0.011, lonStep = 0.0165;
  const latOff = clat - (ROWS/2)*latStep, lonOff = clon - (COLS/2)*lonStep;
  const features = [];
  let id = 0;
  for (let i = 0; i < ROWS; i++) {
    for (let j = 0; j < COLS; j++) {
      const lat = latOff + i*latStep, lon = lonOff + j*lonStep;
      const d = Math.hypot((i-ROWS/2)/(ROWS/2),(j-COLS/2)/(COLS/2));
      const urban = Math.exp(-2.2*d);
      const lst  = cfg.baseLST + cfg.heatFactor*urban + (Math.sin(id*7.3)*0.8);
      const ndvi = Math.min(0.85, Math.max(0.02, 0.65-0.5*urban));
      const pop  = Math.round(2000 + 26000*urban*0.7);
      const uhi  = +(lst - (cfg.baseLST+4)).toFixed(2);
      // HVI approximation
      const hvi  = Math.min(1, Math.max(0, 0.45*(lst-cfg.baseLST)/(cfg.heatFactor+1)
                    + 0.20*Math.max(0,uhi)/8 + 0.15*(1-ndvi)));
      const riskLevels = ['Very Low','Low','Moderate','High','Very High'];
      const risk = riskLevels[Math.min(4, Math.floor(hvi*5))];

      // Synthetic rainfall + landslide risk for offline fallback (mirrors
      // the backend's climate_risk_service heuristic, using deterministic
      // noise so the client-side grid stays consistent across reloads).
      const rainfall = Math.max(0, 15 + Math.sin(id*3.1)*20);
      const slopeDeg = Math.max(0, urban < 0.3 ? (1-urban)*30 : 5);
      const landslideScore = Math.min(1, 0.5*(rainfall/100) + 0.3*(slopeDeg/45) + 0.2*(1-ndvi));
      const landslideLevel = landslideScore>0.7?'High':landslideScore>0.4?'Moderate':'Low';

      features.push({
        type:'Feature',
        properties:{ cell_id:id, lst:+lst.toFixed(2), ndvi:+ndvi.toFixed(3),
          uhi_intensity:uhi, population_density:pop, hvi:+hvi.toFixed(3), risk_level:risk,
          rainfall_48h_mm:+rainfall.toFixed(1), slope_deg:+slopeDeg.toFixed(1),
          landslide_risk_score:+landslideScore.toFixed(3), landslide_risk_level:landslideLevel },
        geometry:{ type:'Polygon', coordinates:[[
          [lon-0.008,lat-0.005],[lon+0.008,lat-0.005],
          [lon+0.008,lat+0.005],[lon-0.008,lat+0.005],[lon-0.008,lat-0.005]
        ]]}
      });
      id++;
    }
  }
  return { type:'FeatureCollection', features };
}

function popupHTML(p) {
  const rc = riskColor(p.risk_level);
  return `<div style="font:0.84rem 'Segoe UI',sans-serif;min-width:155px;color:#e2e8f0">
    <b style="color:#fb923c">📍 Zone ${p.cell_id}</b><br>
    🌡️ LST: <b>${p.lst}°C</b><br>
    🌿 NDVI: ${p.ndvi}<br>
    🔥 UHI: +${Math.max(0,p.uhi_intensity).toFixed(1)}°C<br>
    👥 Pop: ${(p.population_density||0).toLocaleString()}<br>
    ${ p.hvi   ? `📊 HVI: ${p.hvi}<br>` : '' }
    ${ p.risk_level ? `⚠️ Risk: <b style="color:${rc}">${p.risk_level}</b><br>` : '' }
    ${ p.rainfall_48h_mm !== undefined ? `🌧️ Rain (48h): ${p.rainfall_48h_mm} mm<br>` : '' }
    ${ p.landslide_risk_level ? `⛰️ Landslide: <b style="color:${landslideColor(p.landslide_risk_level)}">${p.landslide_risk_level}</b>` : '' }
  </div>`;
}

async function initMap() {
  const urlCity = new URLSearchParams(window.location.search).get('city');
  if (urlCity && CITY_MAP_CFG[urlCity]) currentMapCity = urlCity;
  window.currentCity = currentMapCity;

  const cfg = CITY_MAP_CFG[currentMapCity];

  map = L.map('map', {
    zoomControl:false, attributionControl:true,
    zoomSnap:0.25, zoomDelta:0.5, wheelDebounceTime:50, wheelPxPerZoomLevel:80
  }).setView(cfg.center, cfg.zoom);

  L.control.zoom({ position:'topright' }).addTo(map);

  // OpenStreetMap standard tiles — no API key needed, never rate-limited for
  // hackathon-scale traffic, will never show a "get a key" watermark.
  // (Switched from CartoDB dark_all: CARTO started requiring a free API key
  // on basemaps.cartocdn.com in Aug 2026 — unauthenticated requests now come
  // back stamped with an "API KEY REQUIRED" watermark. Rather than depend on
  // a key that has to be kept valid for the demo, we recreate the dark look
  // with a CSS filter on plain OSM tiles — same visual result, zero setup.)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    subdomains:'abc', maxZoom:19, minZoom:4,
    className: 'dark-basemap-tiles',
    attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  addLegend();
  await loadLayers(currentMapCity);
  bindToggles();
}

function addLegend() {
  const leg = L.control({ position:'bottomright' });
  leg.onAdd = () => {
    const d = L.DomUtil.create('div','map-legend');
    d.innerHTML = `<h4>LST (°C)</h4>
      <div><span style="background:#7f1d1d"></span> > 45</div>
      <div><span style="background:#dc2626"></span> 42 – 45</div>
      <div><span style="background:#f97316"></span> 39 – 42</div>
      <div><span style="background:#eab308"></span> 36 – 39</div>
      <div><span style="background:#22c55e"></span> 33 – 36</div>
      <div><span style="background:#3b82f6"></span> < 33</div>`;
    return d;
  };
  leg.addTo(map);
}

async function loadLayers(cityKey) {
  Object.values(mapLayers).forEach(l => { if (l && map.hasLayer(l)) map.removeLayer(l); });
  Object.keys(mapLayers).forEach(k => delete mapLayers[k]);

  // Try backend GeoJSON first
  let geojson = (typeof fetchHeatMap === 'function') ? await fetchHeatMap(cityKey) : null;
  let source = 'backend';
  if (!geojson || !geojson.features || !geojson.features.length) {
    geojson = buildClientGrid(cityKey);
    source = 'client';
  }

  const feats = geojson.features;

  mapLayers.heat = L.geoJSON({ type:'FeatureCollection', features: feats }, {
    style: f => ({ fillColor:heatColor(f.properties.lst), weight:0.3, color:'#333', fillOpacity:0.68 }),
    onEachFeature: (f,l) => l.bindPopup(popupHTML(f.properties))
  }).addTo(map);

  mapLayers.health = L.geoJSON({ type:'FeatureCollection', features: feats }, {
    style: f => ({ fillColor:riskColor(f.properties.risk_level), weight:0.3, color:'#333', fillOpacity:0.68 }),
    onEachFeature: (f,l) => l.bindPopup(popupHTML(f.properties))
  });

  mapLayers.ndvi = L.geoJSON({ type:'FeatureCollection', features: feats }, {
    style: f => ({ fillColor:ndviColor(f.properties.ndvi), weight:0.3, color:'#333', fillOpacity:0.68 }),
    onEachFeature: (f,l) => l.bindPopup(popupHTML(f.properties))
  });

  const hs = feats.filter(f => (f.properties.uhi_intensity||0) >= 2.0);
  mapLayers.hotspots = L.geoJSON({ type:'FeatureCollection', features: hs }, {
    style: () => ({ fillColor:'#dc2626', weight:1.5, color:'#7f1d1d', fillOpacity:0.85 }),
    onEachFeature: (f,l) => l.bindPopup(popupHTML(f.properties))
  });

  // NEW — rain layer (48h cumulative rainfall per zone)
  mapLayers.rain = L.geoJSON({ type:'FeatureCollection', features: feats }, {
    style: f => ({ fillColor:rainColor(f.properties.rainfall_48h_mm||0), weight:0.3, color:'#1e3a8a', fillOpacity:0.68 }),
    onEachFeature: (f,l) => l.bindPopup(popupHTML(f.properties))
  });

  // NEW — landslide risk layer
  mapLayers.landslide = L.geoJSON({ type:'FeatureCollection', features: feats }, {
    style: f => ({ fillColor:landslideColor(f.properties.landslide_risk_level||'Low'), weight:0.3, color:'#333', fillOpacity:0.68 }),
    onEachFeature: (f,l) => l.bindPopup(popupHTML(f.properties))
  });

  const heatCb = document.getElementById('layer-heat');
  if (heatCb && !heatCb.checked) map.removeLayer(mapLayers.heat);

  // Expose the raw per-cell data so the before/after compare slider (compare.js)
  // can build a simulated "after" layer without re-fetching anything.
  window.currentHeatFeatures = feats;
  if (typeof resetCompareOnReload === 'function') resetCompareOnReload();

  const cityName = (CITY_MAP_CFG[cityKey]||{}).name || cityKey;
  showToast('🗺️ ' + cityName + ' — ' + feats.length + ' zones (' + source + ')');
  if (typeof logActivity==='function') logActivity('city_change','Map loaded for '+cityName, cityKey);
}

function switchCity(cityKey) {
  if (!CITY_MAP_CFG[cityKey]) return;
  currentMapCity = cityKey;
  const cfg = CITY_MAP_CFG[cityKey];
  map.flyTo(cfg.center, cfg.zoom, { animate:true, duration:1.4 });
  loadLayers(cityKey);
}

function bindToggles() {
  [
    ['layer-heat',      'heat',      '🔥 Heat Map'],
    ['layer-health',    'health',    '⚠️ Health Risk'],
    ['layer-ndvi',      'ndvi',      '🌿 NDVI'],
    ['layer-hotspots',  'hotspots',  '📍 Hotspots'],
    ['layer-rain',      'rain',      '🌧️ Rain Map'],
    ['layer-landslide', 'landslide', '⛰️ Landslide Risk']
  ].forEach(([id,key,label]) => {
    const cb = document.getElementById(id);
    if (!cb) return;
    cb.addEventListener('change', () => {
      if (!mapLayers[key]) return;
      cb.checked ? mapLayers[key].addTo(map) : map.removeLayer(mapLayers[key]);
      showToast((cb.checked?'✅ ':'➖ ')+label+(cb.checked?' ON':' OFF'));
      if (typeof logActivity==='function') logActivity('layer_toggle', label+(cb.checked?' enabled':' disabled'), key);
    });
  });
}

document.addEventListener('DOMContentLoaded', initMap);