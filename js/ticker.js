/**
 * Annaraksha AI - Live Alert & Market Sync Continuous Sliding Ticker
 * Bitexindustries Private Limited / Unbeatable Foods
 */

class AlertTicker {
  constructor(containerId = 'live-ticker-stream', options = {}) {
    this.container = document.getElementById(containerId);
    this.viewport = document.getElementById('ticker-viewport') || (this.container ? this.container.parentElement : null);
    this.pollIntervalMs = options.pollIntervalMs || 14000;
    this.timer = null;
    this.cachedAlerts = [];
    this.cachedMandi = [];
    this.cachedWeather = [];
    this.isDragging = false;
    this.startX = 0;
    this.scrollLeft = 0;

    this.init();
  }

  init() {
    if (!this.container) return;

    this.setupInteractivity();
    this.fetchAllData();
    this.timer = setInterval(() => this.fetchAllData(), this.pollIntervalMs);

    // Listen for custom refresh events
    window.addEventListener('annaraksha:refresh-ticker', () => this.fetchAllData());
  }

  async fetchAllData() {
    try {
      const [alertsRes, ingestionRes] = await Promise.allSettled([
        fetch('/api/alerts.php').then(r => r.ok ? r.json() : null),
        fetch('/api/ingestion.php').then(r => r.ok ? r.json() : null)
      ]);

      if (alertsRes.status === 'fulfilled' && alertsRes.value?.status === 'success') {
        this.cachedAlerts = Array.isArray(alertsRes.value.data) ? alertsRes.value.data : [];
      }

      if (ingestionRes.status === 'fulfilled' && ingestionRes.value?.status === 'success' && ingestionRes.value.data) {
        const d = ingestionRes.value.data;
        this.cachedMandi = Array.isArray(d.live_agmarknet_feed) ? d.live_agmarknet_feed : [];
        this.cachedWeather = Array.isArray(d.live_imd_weather_alerts) ? d.live_imd_weather_alerts : [];
      }

      this.render();
    } catch (err) {
      console.warn('[Annaraksha Ticker] Polling error:', err.message);
    }
  }

  render() {
    if (!this.container) return;

    const items = [];

    // 1. Storage Unit Alerts (Telemetry warnings & critical thresholds)
    const activeAlerts = (this.cachedAlerts.length > 0 ? this.cachedAlerts.slice(0, 10) : [
      { unit_id: 28, unit_name: 'Akola Core Silo', severity: 'critical', message: 'Thermal hotspot 34.8°C with 16.8% moisture pocket', time_ago: 'Just now' },
      { unit_id: 4, unit_name: 'Bhatinda Grain Reserve', severity: 'warning', message: 'Sitophilus granarius infestation detected via acoustic sensor', time_ago: '4m ago' },
      { unit_id: 12, unit_name: 'Karnal Buffer Godown', severity: 'warning', message: 'Ambient RH surge to 84% - Aeration damper sealed', time_ago: '8m ago' }
    ]);

    activeAlerts.forEach(alert => {
      const isCritical = alert.severity === 'critical';
      const cssClass = isCritical ? 'ticker-item-critical' : 'ticker-item-warning';
      const icon = isCritical ? '🚨' : '⚡';
      const tag = isCritical ? 'CRITICAL' : 'ALERT';

      items.push(`
        <div class="ticker-item ${cssClass}" data-action="unit" data-unit-id="${alert.unit_id}" title="Click to inspect unit telemetry on Operations Grid">
          <span>${icon}</span>
          <span style="font-weight:700; font-size:0.68rem; padding:1px 4px; border-radius:3px; background:rgba(0,0,0,0.3); letter-spacing:0.04em;">${tag}</span>
          <span><strong>${alert.unit_name || ('Unit #' + alert.unit_id)}:</strong> ${alert.message}</span>
          <span style="opacity:0.65; font-size:0.7rem; font-family:var(--font-mono);">${alert.time_ago || ''}</span>
        </div>
      `);
    });

    // 2. Real-time Agmarknet Mandi Rates
    const mandiList = (this.cachedMandi.length > 0 ? this.cachedMandi : [
      { mandi: 'Indore (MP)', crop: 'Sharbati Wheat', modal_price: '2,780', trend: '+₹35' },
      { mandi: 'Khanna (PB)', crop: 'Basmati 1121', modal_price: '3,450', trend: '+₹60' },
      { mandi: 'Akola (MH)', crop: 'Desi Chana', modal_price: '5,450', trend: '+₹110' },
      { mandi: 'Karnal (HR)', crop: 'Wheat PBW', modal_price: '2,320', trend: 'Steady' },
      { mandi: 'Jaipur (RJ)', crop: 'Hybrid Bajra', modal_price: '1,980', trend: '-₹20' }
    ]);

    mandiList.forEach(m => {
      const isUp = m.trend && m.trend.includes('+');
      const isDown = m.trend && m.trend.includes('-');
      const trendColor = isUp ? '#34d399' : (isDown ? '#fb7185' : '#94a3b8');

      items.push(`
        <div class="ticker-item ticker-item-mandi" data-action="mandi" data-mandi="${m.mandi}" title="Click to view Value-Chain & Buyers">
          <span style="color:#38bdf8; font-size:0.75rem;">🌾</span>
          <strong style="color:#06b6d4;">${m.mandi}:</strong>
          <span>${m.crop} <strong>₹${m.modal_price}/qtl</strong></span>
          <span style="color:${trendColor}; font-weight:700; font-size:0.68rem; font-family:var(--font-mono);">(${m.trend})</span>
        </div>
      `);
    });

    // 3. IMD Weather & Radar Bulletins
    if (this.cachedWeather.length > 0) {
      this.cachedWeather.forEach(w => {
        const isOrange = (w.alert_level || '').includes('ORANGE');
        items.push(`
          <div class="ticker-item ticker-item-weather" data-action="weather" title="IMD Radar Weather Advisory">
            <span>🛰️</span>
            <strong style="color:#c084fc;">IMD [${w.region}]:</strong>
            <span>${w.hazard} &bull; <em style="color:#38bdf8;">${w.action}</em></span>
          </div>
        `);
      });
    }

    if (items.length === 0) return;

    // Render original and duplicate for 100% seamless, continuous slow looping slide
    const htmlSet = items.join('');
    this.container.innerHTML = htmlSet + htmlSet;

    // Dynamically adjust animation duration proportional to content length for gentle, comfortable reading pace
    const approxWidth = items.length * 280;
    const durationSec = Math.max(50, Math.round(approxWidth / 35));
    this.container.style.animationDuration = `${durationSec}s`;

    // Attach click interactions to each item
    this.container.querySelectorAll('.ticker-item').forEach(el => {
      el.addEventListener('click', (e) => {
        const action = el.getAttribute('data-action');
        if (action === 'unit') {
          const unitId = el.getAttribute('data-unit-id');
          if (unitId) {
            window.dispatchEvent(new CustomEvent('annaraksha:select-unit', { detail: { unitId: parseInt(unitId, 10) } }));
            // Also ensure Operations Grid view is active
            const gridTab = document.querySelector('.hud-tab-btn[data-target="view-grid"]');
            if (gridTab && !gridTab.classList.contains('active')) {
              gridTab.click();
            }
          }
        } else if (action === 'mandi') {
          const valueChainTab = document.querySelector('.hud-tab-btn[data-target="view-valuechain"]');
          if (valueChainTab) valueChainTab.click();
        }
      });
    });
  }

  setupInteractivity() {
    const target = this.viewport || this.container;
    if (!target) return;

    // Pause animation on mouse enter or touch
    target.addEventListener('mouseenter', () => {
      if (this.container) this.container.classList.add('is-paused');
    });

    target.addEventListener('mouseleave', () => {
      if (this.container) this.container.classList.remove('is-paused');
    });

    // Touch pause
    target.addEventListener('touchstart', () => {
      if (this.container) this.container.classList.add('is-paused');
    }, { passive: true });

    target.addEventListener('touchend', () => {
      setTimeout(() => {
        if (this.container) this.container.classList.remove('is-paused');
      }, 2500);
    }, { passive: true });
  }

  destroy() {
    if (this.timer) clearInterval(this.timer);
  }
}

window.AlertTicker = AlertTicker;
