// Heat Alert banner — polls /alerts/check, shows pulsing EXTREME alert
async function checkHeatAlerts(city) {
  const res = await apiFetch('/alerts/check?city=' + city);
  if (!res || !res.alert_count) return;
  const a = res.alerts_fired[0];
  document.querySelectorAll('.heat-alert-banner').forEach(el => el.remove());
  const banner = document.createElement('div');
  banner.className = 'heat-alert-banner';
  banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:#c0392b;'
    + 'color:#fff;padding:12px 16px;font-weight:600;text-align:center;'
    + 'box-shadow:0 2px 12px rgba(0,0,0,.4);animation:pulse 1.5s infinite';
  banner.innerHTML = '🔥 <b>EXTREME HEAT ALERT</b> — ' + a.city_name + ' Zone #' + a.cell_id
    + ': LST ' + a.lst + '°C, HVI ' + a.hvi + ' · ~'
    + (a.population_at_risk || 0).toLocaleString('en-IN')
    + ' at risk (elderly, outdoor workers) · SMS/WhatsApp dispatched';
  document.body.appendChild(banner);
  setTimeout(() => banner.remove(), 15000);
}
// Poll on load + every 5 minutes
const ALERT_POLL_CITY = () => (window.currentCity || 'delhi');
checkHeatAlerts(ALERT_POLL_CITY());
setInterval(() => checkHeatAlerts(ALERT_POLL_CITY()), 300000);
