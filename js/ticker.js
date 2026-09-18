/**
 * Annaraksha AI - Live Alert Ticker
 * Bitexindustries Private Limited / Unbeatable Foods
 */

class AlertTicker {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.pollIntervalMs = options.pollIntervalMs || 12000;
    this.timer = null;
    this.latestAlertIds = new Set();
    this.init();
  }

  init() {
    if (!this.container) return;
    this.fetchAlerts();
    this.timer = setInterval(() => this.fetchAlerts(), this.pollIntervalMs);
  }

  async fetchAlerts() {
    try {
      const res = await fetch('/api/alerts.php');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.status === 'success' && Array.isArray(json.data)) {
        this.render(json.data);
      }
    } catch (err) {
      console.warn('[Annaraksha Ticker] Polling error:', err.message);
    }
  }

  render(alerts) {
    if (!this.container || alerts.length === 0) return;

    // Filter top 8 latest alerts for ticker
    const topAlerts = alerts.slice(0, 8);
    const html = topAlerts.map(alert => {
      const isCritical = alert.severity === 'critical';
      const cssClass = isCritical ? 'ticker-item-critical' : 'ticker-item-warning';
      const icon = isCritical ? '⚠️' : '⚡';
      return `
        <div class="ticker-item ${cssClass}" data-unit-id="${alert.unit_id}" title="Click to inspect telemetry">
          <span>${icon} <strong>${alert.unit_name || ('Unit #' + alert.unit_id)}:</strong> ${alert.message}</span>
          <span style="opacity:0.6; font-size:0.75rem;">(${alert.time_ago})</span>
        </div>
      `;
    }).join('');

    this.container.innerHTML = html;

    // Attach click listeners to jump to unit
    this.container.querySelectorAll('.ticker-item').forEach(el => {
      el.addEventListener('click', () => {
        const unitId = el.getAttribute('data-unit-id');
        if (unitId) {
          window.dispatchEvent(new CustomEvent('annaraksha:select-unit', { detail: { unitId: parseInt(unitId, 10) } }));
        }
      });
    });
  }

  destroy() {
    if (this.timer) clearInterval(this.timer);
  }
}

window.AlertTicker = AlertTicker;
