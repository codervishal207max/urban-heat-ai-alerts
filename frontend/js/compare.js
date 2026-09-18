// ============================================================
// Urban Heat AI v2 — Before / After Compare Slider
// A second, read-only Leaflet map ("after") is kept pixel-synced
// with the main map and revealed through a clipped wrapper +
// draggable divider — the standard technique for map compare
// sliders (avoids relying on undefined Leaflet pane sizing).
//
// The "after" layer's colors come from the same scenario/coverage
// math dashboard.js already uses for the results modal, computed
// entirely client-side — no backend dependency, demo-safe offline.
// ============================================================

let mapAfter        = null;
let afterTileLayer  = null;
let afterHeatLayer  = null;
let afterSubLayers  = [];
let compareActive   = false;
let compareDragging = false;

function syncAfterMapView() {
  if (!mapAfter || !map) return;
  mapAfter.setView(map.getCenter(), map.getZoom(), { animate: false });
}

// ---- Per-cell simulated LST -------------------------------------------
// Same avg-drop formula as the results modal (SIM_META.lstFactor *
// coverage), spread unevenly across cells so hotter zones (more roof /
// pavement to convert) cool a bit more than already-cooler ones — looks
// more realistic on the map while keeping the same overall average.
function computeSimulatedFeatures(scenario, coverage) {
  const feats = window.currentHeatFeatures || [];
  const meta = (typeof SIM_META !== 'undefined') ? SIM_META[scenario] : null;
  if (!feats.length || !meta) return { feats: [], avgDrop: 0 };

  const avgDrop = meta.lstFactor * coverage;
  const lsts = feats.map(f => f.properties.lst);
  const minL = Math.min(...lsts), maxL = Math.max(...lsts);
  const range = (maxL - minL) || 1;

  const rawWeights = feats.map(f => 0.5 + (f.properties.lst - minL) / range); // 0.5 – 1.5
  const meanRaw = rawWeights.reduce((a, b) => a + b, 0) / rawWeights.length;

  const simFeats = feats.map((f, i) => {
    const drop = avgDrop * (rawWeights[i] / meanRaw);
    const simLst = +Math.max(minL - 2, f.properties.lst - drop).toFixed(2);
    return { ...f, properties: { ...f.properties, lst: simLst } };
  });

  return { feats: simFeats, avgDrop };
}

// ---- Build (once) or restyle (every update) the after-map heat layer ---
function renderAfterLayer(scenario, coverage) {
  if (!mapAfter || typeof heatColor !== 'function') return;

  const { feats: simFeats, avgDrop } = computeSimulatedFeatures(scenario, coverage);
  if (!simFeats.length) return;

  const styleFn = f => ({ fillColor: heatColor(f.properties.lst), weight: 0.3, color: '#333', fillOpacity: 0.72 });

  if (afterHeatLayer && afterSubLayers.length === simFeats.length) {
    // Re-style existing shapes in place so the CSS fill-transition animates
    // red -> green smoothly as coverage % changes, instead of a hard cut.
    simFeats.forEach((f, i) => {
      const l = afterSubLayers[i];
      if (!l) return;
      l.feature.properties.lst = f.properties.lst;
      l.setStyle(styleFn(f));
    });
  } else {
    if (afterHeatLayer) mapAfter.removeLayer(afterHeatLayer);
    afterSubLayers = [];
    afterHeatLayer = L.geoJSON({ type: 'FeatureCollection', features: simFeats }, {
      style: styleFn,
      onEachFeature: (f, l) => {
        l.bindPopup((typeof popupHTML === 'function') ? popupHTML(f.properties) : '');
        afterSubLayers.push(l);
      }
    }).addTo(mapAfter);
  }

  const meta = (typeof SIM_META !== 'undefined') ? SIM_META[scenario] : null;
  const readout = document.getElementById('compare-readout');
  if (readout && meta) {
    readout.textContent = `${meta.icon} ${meta.label}${coverage}${meta.suffix}  •  avg −${avgDrop.toFixed(1)}°C`;
  }
}

// ---- Lazily create the read-only "after" map ----------------------------
function ensureAfterMap() {
  if (mapAfter || !map) return;
  mapAfter = L.map('map-after', {
    center: map.getCenter(), zoom: map.getZoom(),
    zoomControl: false, attributionControl: false,
    dragging: false, scrollWheelZoom: false, doubleClickZoom: false,
    boxZoom: false, keyboard: false, tap: false, touchZoom: false, inertia: false
  });
  afterTileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    subdomains: 'abc', maxZoom: 19, minZoom: 4, className: 'dark-basemap-tiles'
  }).addTo(mapAfter);
  map.on('move zoom', syncAfterMapView);
}

function destroyAfterMap() {
  if (!mapAfter) return;
  map.off('move zoom', syncAfterMapView);
  mapAfter.remove();
  mapAfter = null; afterTileLayer = null; afterHeatLayer = null; afterSubLayers = [];
}

// ---- Split reveal (clip-path on the wrapper div) -------------------------
function setDividerPosition(pct) {
  pct = Math.max(3, Math.min(97, pct));
  const divider = document.getElementById('compare-divider');
  const clip = document.getElementById('compare-clip');
  if (divider) divider.style.left = pct + '%';
  if (clip) {
    const c = `inset(0 0 0 ${pct}%)`;
    clip.style.clipPath = c;
    clip.style.webkitClipPath = c;
  }
}

function handleDragMove(e, overlay) {
  const rect = overlay.getBoundingClientRect();
  const clientX = (e.touches && e.touches[0]) ? e.touches[0].clientX : e.clientX;
  const pct = ((clientX - rect.left) / rect.width) * 100;
  setDividerPosition(pct);
}

function initCompareDrag() {
  const overlay = document.getElementById('compare-overlay');
  const divider = document.getElementById('compare-divider');
  if (!overlay || !divider) return;

  divider.addEventListener('pointerdown', e => {
    compareDragging = true;
    try { divider.setPointerCapture(e.pointerId); } catch (err) {}
    e.preventDefault();
  });
  divider.addEventListener('pointermove', e => { if (compareDragging) handleDragMove(e, overlay); });
  divider.addEventListener('pointerup',    () => { compareDragging = false; });
  divider.addEventListener('pointercancel',() => { compareDragging = false; });
}

// ---- Toggle compare mode on/off -----------------------------------------
function toggleCompareMode(forceOn) {
  const overlay = document.getElementById('compare-overlay');
  const clip    = document.getElementById('compare-clip');
  const btn     = document.getElementById('compare-toggle-btn');
  if (!overlay || !clip) return;

  compareActive = (typeof forceOn === 'boolean') ? forceOn : !compareActive;
  overlay.classList.toggle('active', compareActive);
  clip.classList.toggle('active', compareActive);
  if (btn) btn.classList.toggle('active', compareActive);

  if (compareActive) {
    ensureAfterMap();
    // Leaflet needs the container to be visible+sized before it measures
    // correctly — the wrapper fades in via CSS, so nudge it a beat later.
    setTimeout(() => { if (mapAfter) { mapAfter.invalidateSize(); syncAfterMapView(); } }, 60);

    const scenario = document.getElementById('sim-scenario')?.value || 'green_cover';
    const coverage = parseInt(document.getElementById('sim-coverage')?.value || 20);
    renderAfterLayer(scenario, coverage);
    setDividerPosition(50);

    if (btn) btn.textContent = '✕ Close Compare';
    if (typeof showToast === 'function') showToast('🔀 Drag the handle to compare current vs simulated heat');
    if (typeof logActivity === 'function') logActivity('compare_toggle', 'Opened before/after compare slider', scenario + ' ' + coverage + '%');
  } else {
    destroyAfterMap();
    if (btn) btn.textContent = '🔀 Compare Before / After';
  }
}

// Called by map.js after a city switch / layer reload — old cell data no
// longer matches, so close compare mode cleanly rather than show a stale
// "after" layer from the previous city.
function resetCompareOnReload() {
  if (compareActive) toggleCompareMode(false);
}

// ---- Wire up --------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  initCompareDrag();

  document.getElementById('compare-toggle-btn')?.addEventListener('click', () => toggleCompareMode());

  // Live preview: dragging the coverage slider or changing scenario updates
  // the "after" layer immediately — the CSS fill-transition animates the
  // red -> green recolor, no need to hit "Run Simulation" first.
  const livePreview = () => {
    if (!compareActive) return;
    const scenario = document.getElementById('sim-scenario').value;
    const coverage = parseInt(document.getElementById('sim-coverage').value);
    renderAfterLayer(scenario, coverage);
  };
  document.getElementById('sim-coverage')?.addEventListener('input', livePreview);
  document.getElementById('sim-scenario')?.addEventListener('change', livePreview);
  document.getElementById('run-simulation')?.addEventListener('click', livePreview);

  window.addEventListener('resize', () => { if (mapAfter) mapAfter.invalidateSize(); });
});
