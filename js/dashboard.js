/**
 * Annaraksha AI - Dashboard Operations Engine
 * Bitexindustries Private Limited / Unbeatable Foods
 */

class AnnarakshaDashboard {
  constructor() {
    this.units = [];
    this.filteredUnits = [];
    this.selectedUnit = null;
    this.map = null;
    this.markers = new Map();
    this.activeFilter = {
      state: '',
      grain: '',
      risk: '',
      search: ''
    };

    this.init();
  }

  async init() {
    this.initElements();
    this.initMap();
    await this.loadUnits();
    this.bindEvents();

    // Init Alert Ticker
    if (window.AlertTicker) {
      new window.AlertTicker('live-ticker-stream');
    }
  }

  initElements() {
    this.sidebarList = document.getElementById('units-list');
    this.searchEl = document.getElementById('filter-search');
    this.stateFilterEl = document.getElementById('filter-state');
    this.grainFilterEl = document.getElementById('filter-grain');
    this.pillHealthy = document.getElementById('pill-healthy');
    this.pillWatch = document.getElementById('pill-watch');
    this.pillCritical = document.getElementById('pill-critical');
    this.drawer = document.getElementById('unit-drawer');
    this.drawerClose = document.getElementById('drawer-close-btn');
  }

  async initMap() {
    const mapEl = document.getElementById('map');
    if (!mapEl) return;

    window.dashboardEngine = this;

    // Geographic center of India
    const indiaCenter = { lat: 22.8000, lng: 79.5000 };
    const initialZoom = 5;

    // 1. If Google Maps JS API is available and not marked auth-failed, try Google Maps with 3D Hybrid/Satellite tilt 45°
    if (window.google?.maps?.Map && !window.googleMapsAuthFailed) {
      try {
        this.googleMap = new google.maps.Map(mapEl, {
          center: indiaCenter,
          zoom: initialZoom,
          mapTypeId: 'hybrid', // 3D Hybrid/Satellite mode
          tilt: 45, // 3D perspective tilt
          heading: 0,
          mapTypeControl: true,
          mapTypeControlOptions: {
            style: google.maps.MapTypeControlStyle.DROPDOWN_MENU,
            position: google.maps.ControlPosition.TOP_LEFT
          },
          zoomControl: true,
          zoomControlOptions: {
            position: google.maps.ControlPosition.TOP_RIGHT
          },
          streetViewControl: false,
          rotateControl: true,
          fullscreenControl: false,
          backgroundColor: '#060911'
        });

        this.isGoogleMap = true;
        this.map = this.googleMap;

        // Leaflet-compatible API shims for external callers
        this.map.invalidateSize = () => {
          try {
            if (window.google?.maps?.event) {
              google.maps.event.trigger(this.googleMap, 'resize');
            }
          } catch (e) {
            // graceful swallow
          }
        };

        this.map.flyTo = (coords, zoom) => {
          try {
            const lat = Array.isArray(coords) ? coords[0] : coords.lat;
            const lng = Array.isArray(coords) ? coords[1] : coords.lng;
            this.googleMap.panTo({ lat: Number(lat), lng: Number(lng) });
            this.googleMap.setZoom(zoom || 10);
          } catch (e) {
            // graceful swallow
          }
        };

        if (this.filteredUnits && this.filteredUnits.length > 0) {
          this.renderMapMarkers();
        }
        return;
      } catch (gErr) {
        console.warn('[Dashboard] Google Maps init error, using base satellite layer:', gErr);
      }
    }

    // 2. Base Google Satellite map (High-resolution Google Hybrid tiles, zero billing errors, no CARTO)
    this.fallbackToSatelliteMap();
  }

  fallbackToSatelliteMap() {
    const mapEl = document.getElementById('map');
    if (!mapEl) return;

    try {
      if (this.googleMap) {
        this.googleMap = null;
      }

      // If Leaflet map is already running, re-invalidate and return
      if (this.map && !this.isGoogleMap && typeof this.map.invalidateSize === 'function') {
        this.map.invalidateSize();
        return;
      }

      mapEl.innerHTML = '';
      this.isGoogleMap = false;

      if (window.L) {
        this.map = L.map('map', {
          zoomControl: false,
          attributionControl: false
        }).setView([22.8000, 79.5000], 5);

        L.control.zoom({ position: 'topright' }).addTo(this.map);

        // Google Hybrid satellite tiles (satellite photo + roads + labels, no CARTO, no API key required)
        try {
          L.tileLayer('https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
            maxZoom: 20,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
            attribution: 'Google Hybrid Satellite Imagery'
          }).addTo(this.map);
        } catch (tileErr) {
          // Open-access Esri World Imagery fallback
          L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 18,
            attribution: 'Esri World Imagery'
          }).addTo(this.map);
        }

        if (this.filteredUnits && this.filteredUnits.length > 0) {
          this.renderMapMarkers();
        }
      }
    } catch (fallbackErr) {
      console.warn('[Dashboard] Base satellite map fallback notice:', fallbackErr);
    }
  }

  async ensureGoogleMapsLoaded() {
    if (window.google?.maps?.Map) return true;
    return false;
  }

  async loadUnits() {
    let loaded = false;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch('/api/units', { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const json = await res.json();
        if (json.status === 'success' && Array.isArray(json.data) && json.data.length > 0) {
          this.units = json.data;
          loaded = true;
        }
      }
    } catch (err) {
      console.warn('[Dashboard] Live server /api/units unreachable or timed out, activating autonomous edge fallback:', err);
    }

    // Resilient fallback: if server units not loaded, load default baseline dataset
    if (!loaded || !this.units || this.units.length === 0) {
      if (window.ANNARAKSHA_DEFAULT_UNITS && Array.isArray(window.ANNARAKSHA_DEFAULT_UNITS)) {
        this.units = JSON.parse(JSON.stringify(window.ANNARAKSHA_DEFAULT_UNITS));
      } else {
        this.units = [];
      }
    }

    // Merge any custom onboarded units from browser localStorage
    try {
      const customUnits = JSON.parse(localStorage.getItem('annaraksha_custom_units') || '[]');
      if (Array.isArray(customUnits) && customUnits.length > 0) {
        customUnits.forEach(cu => {
          if (!this.units.some(u => u.id === cu.id)) {
            this.units.unshift(cu);
          }
        });
      }
    } catch (e) {
      console.warn('LocalStorage custom units load error:', e);
    }

    this.populateStateOptions();
    this.applyFilters();
  }

  populateStateOptions() {
    if (!this.stateFilterEl) return;
    const currentVal = this.stateFilterEl.value;
    this.stateFilterEl.innerHTML = '<option value="">All States</option>';
    const states = Array.from(new Set(this.units.map(u => u.state))).sort();
    states.forEach(st => {
      const opt = document.createElement('option');
      opt.value = st;
      opt.textContent = st;
      this.stateFilterEl.appendChild(opt);
    });
    if (currentVal) this.stateFilterEl.value = currentVal;
  }

  bindEvents() {
    // Search input
    if (this.searchEl) {
      this.searchEl.addEventListener('input', (e) => {
        this.activeFilter.search = e.target.value.trim().toLowerCase();
        this.applyFilters();
      });
    }

    // State select
    if (this.stateFilterEl) {
      this.stateFilterEl.addEventListener('change', (e) => {
        this.activeFilter.state = e.target.value;
        this.applyFilters();
      });
    }

    // Grain select
    if (this.grainFilterEl) {
      this.grainFilterEl.addEventListener('change', (e) => {
        this.activeFilter.grain = e.target.value;
        this.applyFilters();
      });
    }

    // Risk pills toggle
    const toggleRisk = (riskKey, pillEl) => {
      if (this.activeFilter.risk === riskKey) {
        this.activeFilter.risk = '';
        pillEl.classList.remove('active');
      } else {
        this.activeFilter.risk = riskKey;
        [this.pillHealthy, this.pillWatch, this.pillCritical].forEach(p => p && p.classList.remove('active'));
        pillEl.classList.add('active');
      }
      this.applyFilters();
    };

    if (this.pillHealthy) this.pillHealthy.addEventListener('click', () => toggleRisk('healthy', this.pillHealthy));
    if (this.pillWatch) this.pillWatch.addEventListener('click', () => toggleRisk('watch', this.pillWatch));
    if (this.pillCritical) this.pillCritical.addEventListener('click', () => toggleRisk('critical', this.pillCritical));

    // Drawer close
    if (this.drawerClose) {
      this.drawerClose.addEventListener('click', () => {
        this.closeDrawer();
      });
    }

    // External select listener (from ticker or directory)
    window.addEventListener('annaraksha:select-unit', (e) => {
      const unitId = e.detail?.unitId;
      if (unitId) {
        this.selectUnitById(unitId);
      }
    });

    // In-drawer quick action prompt chips
    const copilotChips = document.querySelectorAll('.copilot-chip-btn');
    copilotChips.forEach(chip => {
      chip.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!this.selectedUnit) return;
        const u = this.selectedUnit;
        const qType = chip.getAttribute('data-query');
        let prompt = '';
        if (qType === 'aeration') {
          prompt = `Provide an exact hourly fan aeration and convection mitigation schedule for Unit #${u.id} (${u.name}, ${u.city}) with ${u.moisture_pct}% moisture and ${u.grain_type}.`;
        } else if (qType === 'spoilage') {
          prompt = `Analyze spoilage risk, fungal germination timeline, and mold hazard index for Unit #${u.id} (${u.name}) at ${u.moisture_pct}% moisture.`;
        } else if (qType === 'dispatch') {
          prompt = `Recommend optimal emergency logistics transfer and processing matchmaker for Unit #${u.id} storing ${u.current_stock_tonnes}T of ${u.grain_type}.`;
        }
        if (prompt) {
          this.queryInDrawerCopilot(prompt);
        }
      });
    });

    // In-drawer question input and Send button
    const sendBtn = document.getElementById('drawer-copilot-send-btn');
    const inputEl = document.getElementById('drawer-copilot-input');
    if (sendBtn && inputEl) {
      const handleSend = () => {
        const text = inputEl.value.trim();
        if (!text) return;
        inputEl.value = '';
        this.queryInDrawerCopilot(text);
      };
      sendBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleSend();
      });
      inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleSend();
        }
      });
    }

    // Ask copilot button inside drawer (opens floating console)
    const askCopilotBtn = document.getElementById('drawer-ask-copilot');
    if (askCopilotBtn) {
      askCopilotBtn.addEventListener('click', () => {
        if (!this.selectedUnit) return;
        const u = this.selectedUnit;
        const prompt = `Give me an immediate mitigation and aeration protocol for Unit #${u.id} (${u.name}, ${u.city}, ${u.state}) storing ${u.current_stock_tonnes} tonnes of ${u.grain_type} with ${u.moisture_pct}% moisture (Risk: ${u.risk_level.toUpperCase()}).`;
        window.dispatchEvent(new CustomEvent('annaraksha:ask-copilot', { detail: { prompt } }));
      });
    }
  }

  applyFilters() {
    this.filteredUnits = this.units.filter(u => {
      if (this.activeFilter.state && u.state !== this.activeFilter.state) return false;
      if (this.activeFilter.grain && u.grain_type.toLowerCase() !== this.activeFilter.grain.toLowerCase()) return false;
      if (this.activeFilter.risk && u.risk_level.toLowerCase() !== this.activeFilter.risk.toLowerCase()) return false;
      if (this.activeFilter.search) {
        const q = this.activeFilter.search;
        const match = u.name.toLowerCase().includes(q) ||
                      u.city.toLowerCase().includes(q) ||
                      u.state.toLowerCase().includes(q) ||
                      u.grain_type.toLowerCase().includes(q) ||
                      ('unit #' + u.id).includes(q);
        if (!match) return false;
      }
      return true;
    });

    this.renderStats();
    this.renderSidebarList();
    this.renderMapMarkers();
  }

  renderStats() {
    let healthy = 0;
    let watch = 0;
    let critical = 0;
    let totalStock = 0;
    let atRiskTonnes = 0;
    let atRiskRupees = 0;

    const grainRates = {
      wheat: 22750,
      rice: 24500,
      moong: 78000,
      chana: 54000,
      bajra: 19500,
      jowar: 29000
    };

    this.units.forEach(u => {
      totalStock += u.current_stock_tonnes;
      if (u.risk_level === 'healthy') healthy++;
      else if (u.risk_level === 'watch') {
        watch++;
        atRiskTonnes += u.current_stock_tonnes;
        atRiskRupees += u.current_stock_tonnes * (grainRates[u.grain_type.toLowerCase()] || 23000);
      } else if (u.risk_level === 'critical') {
        critical++;
        atRiskTonnes += u.current_stock_tonnes;
        atRiskRupees += u.current_stock_tonnes * (grainRates[u.grain_type.toLowerCase()] || 23000);
      }
    });

    // Update pill counters
    const hCountEl = document.getElementById('count-healthy');
    const wCountEl = document.getElementById('count-watch');
    const cCountEl = document.getElementById('count-critical');

    if (hCountEl) hCountEl.textContent = healthy;
    if (wCountEl) wCountEl.textContent = watch;
    if (cCountEl) cCountEl.textContent = critical;

    // Optional top stat bar
    const totalStockEl = document.getElementById('metric-total-stock');
    if (totalStockEl) totalStockEl.textContent = totalStock.toLocaleString() + ' T';

    const atRiskTonnesEl = document.getElementById('metric-at-risk-tonnes');
    if (atRiskTonnesEl) atRiskTonnesEl.textContent = atRiskTonnes.toLocaleString() + ' T';

    const atRiskRupeesEl = document.getElementById('metric-at-risk-rupees');
    if (atRiskRupeesEl) {
      const cr = (atRiskRupees / 10000000).toFixed(2);
      atRiskRupeesEl.textContent = `₹${cr} Cr`;
    }
  }

  renderSidebarList() {
    if (!this.sidebarList) return;

    if (this.filteredUnits.length === 0) {
      this.sidebarList.innerHTML = `
        <div style="text-align:center; padding:2rem 1rem; color:#64748b; font-size:0.85rem;">
          No storage units match your criteria.
        </div>
      `;
      return;
    }

    const html = this.filteredUnits.map(u => {
      const isSelected = this.selectedUnit && this.selectedUnit.id === u.id;
      const riskPill = this.getRiskPillHtml(u.risk_level);
      return `
        <div class="unit-item-card ${isSelected ? 'selected' : ''}" data-id="${u.id}">
          <div class="unit-card-top">
            <div>
              <div class="unit-card-title">${u.name}</div>
              <div class="unit-card-loc">${u.city}, ${u.state} &bull; <strong style="text-transform:capitalize;">${u.grain_type}</strong></div>
            </div>
            ${riskPill}
          </div>
          <div class="unit-card-metrics">
            <span>Moisture: <strong style="${u.moisture_pct >= 15 ? 'color:#dc2626;' : u.moisture_pct >= 13.5 ? 'color:#d97706;' : 'color:#059669;'}">${u.moisture_pct}%</strong></span>
            <span>Stock: <strong>${u.current_stock_tonnes.toLocaleString()} / ${u.capacity_tonnes.toLocaleString()} T</strong></span>
          </div>
        </div>
      `;
    }).join('');

    this.sidebarList.innerHTML = html;

    this.sidebarList.querySelectorAll('.unit-item-card').forEach(card => {
      card.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const id = parseInt(card.getAttribute('data-id'), 10);
        this.selectUnitById(id);
      });
    });
  }

  renderMapMarkers() {
    if (!this.map) return;

    try {
      // 1. Google Maps JS API Marker Rendering
      if (this.isGoogleMap && this.googleMap) {
        // Clear previous markers
        this.markers.forEach(m => {
          if (m && typeof m.setMap === 'function') m.setMap(null);
        });
        this.markers.clear();
        if (!this.infoWindows) this.infoWindows = new Map();
        this.infoWindows.clear();

        const riskColors = {
          critical: '#f43f5e',
          watch: '#f59e0b',
          healthy: '#10b981'
        };

        this.filteredUnits.forEach(u => {
          try {
            const pinColor = riskColors[u.risk_level] || '#10b981';
            const pinSvg = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
              <svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 34 34">
                <circle cx="17" cy="17" r="15" fill="${pinColor}" fill-opacity="0.3" stroke="${pinColor}" stroke-width="1.5"/>
                <circle cx="17" cy="17" r="8.5" fill="${pinColor}" stroke="#ffffff" stroke-width="2"/>
                <circle cx="17" cy="17" r="3" fill="#ffffff"/>
              </svg>
            `)}`;

            const gMarker = new google.maps.Marker({
              position: { lat: Number(u.lat), lng: Number(u.lng) },
              map: this.googleMap,
              title: `${u.name} (${u.city}, ${u.state})`,
              icon: {
                url: pinSvg,
                scaledSize: new google.maps.Size(32, 32),
                anchor: new google.maps.Point(16, 16)
              }
            });

            const infoContent = `
              <div style="color:#0f172a; font-family:'Inter',sans-serif; font-size:12px; padding:4px 6px; line-height:1.45; min-width:180px;">
                <div style="font-weight:700; font-size:13px; color:#0f172a; margin-bottom:2px;">${u.name}</div>
                <div style="color:#475569; font-size:11px;">${u.city}, ${u.state} &bull; <strong>${u.grain_type.toUpperCase()}</strong></div>
                <div style="margin-top:4px; font-size:11px;">Moisture: <strong>${u.moisture_pct}%</strong> | Status: <strong style="color:${pinColor}; text-transform:uppercase;">${u.risk_level}</strong></div>
              </div>
            `;
            const infoWindow = new google.maps.InfoWindow({ content: infoContent });

            gMarker.addListener('click', () => {
              try {
                if (this.currentInfoWindow) this.currentInfoWindow.close();
                infoWindow.open(this.googleMap, gMarker);
                this.currentInfoWindow = infoWindow;
                this.selectUnitById(u.id);
              } catch (e) {
                console.warn('[Dashboard] Marker click error:', e);
              }
            });

            gMarker.addListener('mouseover', () => {
              try {
                if (this.currentInfoWindow && this.currentInfoWindow !== infoWindow) {
                  this.currentInfoWindow.close();
                }
                infoWindow.open(this.googleMap, gMarker);
                this.currentInfoWindow = infoWindow;
              } catch (e) {
                // swallow
              }
            });

            this.markers.set(u.id, gMarker);
            this.infoWindows.set(u.id, infoWindow);
          } catch (mErr) {
            console.warn('[Dashboard] Google marker error for unit:', u.id, mErr);
          }
        });
        return;
      }

      // 2. Leaflet Fallback Marker Rendering
      if (window.L && this.map && typeof this.map.removeLayer === 'function') {
        this.markers.forEach(m => {
          try { this.map.removeLayer(m); } catch (e) {}
        });
        this.markers.clear();

        this.filteredUnits.forEach(u => {
          try {
            const icon = this.createCustomIcon(u.risk_level, u.id);
            const marker = L.marker([u.lat, u.lng], { icon: icon }).addTo(this.map);

            const tooltipContent = `
              <div style="font-family:inherit; font-size:12px; padding:2px;">
                <strong>${u.name}</strong><br>
                ${u.city}, ${u.state} &bull; ${u.grain_type.toUpperCase()}<br>
                Moisture: <strong>${u.moisture_pct}%</strong> &bull; Status: <strong style="text-transform:uppercase;">${u.risk_level}</strong>
              </div>
            `;
            marker.bindTooltip(tooltipContent, { offset: [0, -10], direction: 'top' });

            marker.on('click', (e) => {
              if (e && e.originalEvent) {
                e.originalEvent.preventDefault();
                e.originalEvent.stopPropagation();
              }
              this.selectUnitById(u.id);
            });

            this.markers.set(u.id, marker);
          } catch (mErr) {
            console.warn('[Dashboard] Leaflet marker error for unit:', u.id, mErr);
          }
        });
      }
    } catch (err) {
      console.warn('[Dashboard] Error rendering map markers:', err);
    }
  }

  createCustomIcon(riskLevel, id) {
    let color = '#10b981';
    let glow = 'rgba(16, 185, 129, 0.4)';
    if (riskLevel === 'critical') {
      color = '#f43f5e';
      glow = 'rgba(244, 63, 94, 0.6)';
    } else if (riskLevel === 'watch') {
      color = '#f59e0b';
      glow = 'rgba(245, 158, 11, 0.5)';
    }

    const html = `
      <div style="position:relative; width:28px; height:28px; display:flex; align-items:center; justify-content:center;">
        ${riskLevel === 'critical' ? `<div style="position:absolute; width:36px; height:36px; border-radius:50%; background:${glow}; animation:pulse-red-glow 1.5s infinite;"></div>` : ''}
        <div style="width:20px; height:20px; border-radius:50%; background:${color}; border:2px solid #ffffff; box-shadow:0 0 12px ${color}, inset 0 0 4px rgba(0,0,0,0.5);">
        </div>
      </div>
    `;

    return L.divIcon({
      html: html,
      className: 'custom-silo-pin',
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });
  }

  selectUnitById(id) {
    if (!Array.isArray(this.units) || this.units.length === 0) {
      // If units haven't loaded yet or is invalid, attempt fallback to window.app state or return gracefully
      if (window.app?.dashboard?.units && Array.isArray(window.app.dashboard.units)) {
        this.units = window.app.dashboard.units;
      } else {
        return;
      }
    }
    const targetId = parseInt(id, 10);
    const unit = this.units.find(u => u.id === targetId || u.id === id);
    if (!unit) return;

    this.selectedUnit = unit;

    // 1. Ensure Operations Grid view is active if clicked from directory, ticker, or external module
    const gridTabBtn = document.querySelector('.hud-tab-btn[data-target="view-grid"]');
    const gridPane = document.getElementById('view-grid');
    if (gridPane && (gridPane.style.display === 'none' || !gridPane.classList.contains('active'))) {
      if (gridTabBtn) gridTabBtn.click();
    }

    // 2. Highlight card in sidebar list and smoothly scroll to it
    if (this.sidebarList) {
      this.sidebarList.querySelectorAll('.unit-item-card').forEach(c => {
        const isCurrent = parseInt(c.getAttribute('data-id'), 10) === id;
        c.classList.toggle('selected', isCurrent);
        if (isCurrent) {
          c.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });
    }

    // 3. Programmatically trigger fluid map camera flyTo animation to exact coordinates at zoom level 13
    const lat = parseFloat(unit.lat);
    const lng = parseFloat(unit.lng);
    const targetZoom = 13;

    try {
      if (this.isGoogleMap && this.googleMap) {
        // Smooth panTo for Google Maps
        this.googleMap.panTo({ lat, lng });

        // Progressive easing zoom towards facility level 13
        const currentZoom = this.googleMap.getZoom() || 5;
        if (currentZoom !== targetZoom) {
          let z = currentZoom;
          const step = currentZoom < targetZoom ? 1 : -1;
          const zoomTimer = setInterval(() => {
            z += step;
            this.googleMap.setZoom(z);
            if (z === targetZoom) clearInterval(zoomTimer);
          }, 110);
        }

        const marker = this.markers.get(id);
        const iw = this.infoWindows?.get(id);
        if (marker && iw) {
          if (this.currentInfoWindow) this.currentInfoWindow.close();
          iw.open(this.googleMap, marker);
          this.currentInfoWindow = iw;
        }
      } else if (this.map && typeof this.map.flyTo === 'function') {
        // Refresh leaflet container geometry in case layout shifted
        if (typeof this.map.invalidateSize === 'function') {
          this.map.invalidateSize();
        }

        // Programmatically trigger Leaflet flyTo with smooth easing curve
        this.map.flyTo([lat, lng], targetZoom, {
          animate: true,
          duration: 1.6,
          easeLinearity: 0.25,
          noMoveStart: false
        });

        // Pulsing active marker highlight
        this.highlightMarker(id);

        const marker = this.markers.get(id);
        if (marker) {
          setTimeout(() => {
            if (marker && typeof marker.openTooltip === 'function') {
              marker.openTooltip();
            }
          }, 700);
        }
      }
    } catch (mapErr) {
      console.warn('[Dashboard] Map camera flyTo notice:', mapErr);
    }

    // 4. Open & populate dedicated side drawer
    this.openDrawer(unit);
  }

  highlightMarker(targetId) {
    if (!this.markers) return;
    this.markers.forEach((m, id) => {
      try {
        const el = m.getElement ? m.getElement() : (m._icon || null);
        if (el) {
          if (id === targetId) {
            el.classList.add('custom-silo-pin-target');
          } else {
            el.classList.remove('custom-silo-pin-target');
          }
        }
      } catch (e) {}
    });
  }

  openDrawer(u) {
    if (!this.drawer) return;

    // Signal body that drawer is active to dock floating windows
    document.body.classList.add('drawer-active');

    const setSafeText = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };

    setSafeText('drawer-unit-id', `Unit #${u.id}`);
    setSafeText('drawer-unit-name', u.name);
    setSafeText('drawer-location', `${u.city}, ${u.state}`);

    // Status pill
    const statusContainer = document.getElementById('drawer-status-pill');
    if (statusContainer) {
      statusContainer.innerHTML = this.getRiskPillHtml(u.risk_level);
    }

    // Moisture gauge
    const moistureValEl = document.getElementById('drawer-moisture-val');
    const gaugeBarEl = document.getElementById('drawer-gauge-bar');
    if (moistureValEl) moistureValEl.textContent = `${u.moisture_pct}%`;

    // Visual percentage mapped 8% - 20%
    const gaugePct = Math.min(100, Math.max(10, ((u.moisture_pct - 8) / (20 - 8)) * 100));
    if (gaugeBarEl) {
      gaugeBarEl.style.width = `${gaugePct}%`;
      if (u.moisture_pct >= 15.5) {
        gaugeBarEl.style.backgroundColor = '#f43f5e';
      } else if (u.moisture_pct >= 13.5) {
        gaugeBarEl.style.backgroundColor = '#f59e0b';
      } else {
        gaugeBarEl.style.backgroundColor = '#10b981';
      }
    }

    // Spoilage date & countdown
    const spoilageDateEl = document.getElementById('drawer-spoilage-date');
    const countdownEl = document.getElementById('drawer-countdown');
    let daysLeft = 0;
    if (u.predicted_spoilage_date) {
      if (spoilageDateEl) spoilageDateEl.textContent = u.predicted_spoilage_date;
      daysLeft = Math.ceil((new Date(u.predicted_spoilage_date) - new Date()) / (1000 * 60 * 60 * 24));
      if (countdownEl) {
        countdownEl.textContent = daysLeft > 0 ? `${daysLeft} days remaining` : 'Spoilage threshold reached!';
        countdownEl.style.color = daysLeft <= 7 ? '#f43f5e' : '#f59e0b';
      }
    } else {
      if (spoilageDateEl) spoilageDateEl.textContent = 'None projected (Safe)';
      if (countdownEl) {
        countdownEl.textContent = 'Indefinite stability under current aeration';
        countdownEl.style.color = '#10b981';
      }
    }

    // Stocks & capacity
    setSafeText('drawer-stock', `${u.current_stock_tonnes.toLocaleString()} T`);
    setSafeText('drawer-capacity', `${u.capacity_tonnes.toLocaleString()} T`);
    setSafeText('drawer-grain-type', u.grain_type.toUpperCase());

    const utilPct = Math.round((u.current_stock_tonnes / u.capacity_tonnes) * 100);
    setSafeText('drawer-utilization', `${utilPct}%`);

    // Financial valuation
    const grainRates = {
      wheat: 22750,
      rice: 24500,
      moong: 78000,
      chana: 54000,
      bajra: 19500,
      jowar: 29000
    };
    const rate = grainRates[u.grain_type.toLowerCase()] || 23000;
    const totalVal = u.current_stock_tonnes * rate;
    const crValue = (totalVal / 10000000).toFixed(2);
    setSafeText('drawer-total-value', `₹${crValue} Cr`);

    // Dedicated In-Drawer AI Agronomic Assessment
    this.updateDrawerAiAssessment(u, crValue, daysLeft);

    // 2-Month (60-Day) Spoilage Wastage Predictor integration
    if (window.spoilagePredictor) {
      window.spoilagePredictor.updateDrawerForecast(u);
    }

    // Selected Unit reference for certificates and workflows
    this.selectedUnit = u;

    // Fetch and render psychrometric weather & aeration timeline
    this.fetchAndRenderPsychrometrics(u);

    // Render 7-day sparkline
    try {
      this.renderDrawerTelemetryChart(u);
    } catch (chartErr) {
      console.warn('[Dashboard] Drawer telemetry chart notice:', chartErr);
    }

    this.drawer.classList.add('open');
  }

  async fetchAndRenderPsychrometrics(u) {
    const tempEl = document.getElementById('drawer-ambient-temp');
    const rhEl = document.getElementById('drawer-ambient-rh');
    const dpEl = document.getElementById('drawer-dew-point');
    const titleEl = document.getElementById('drawer-aeration-verdict-title');
    const marginEl = document.getElementById('drawer-dew-margin');
    const rationaleEl = document.getElementById('drawer-aeration-rationale');
    const bestWindowEl = document.getElementById('drawer-best-window-tag');
    const timelineEl = document.getElementById('drawer-aeration-timeline');
    const verdictCard = document.getElementById('drawer-aeration-verdict-card');
    const triggerBtn = document.getElementById('drawer-trigger-aeration-btn');
    const certBtn = document.getElementById('drawer-generate-cert-btn');

    if (certBtn) {
      certBtn.onclick = () => {
        if (window.openInspectionCertificateForUnit) {
          window.openInspectionCertificateForUnit(u);
        }
      };
    }

    if (triggerBtn) {
      triggerBtn.onclick = () => {
        triggerBtn.innerHTML = '<span>⏳ Aeration Dampers Actuating...</span>';
        triggerBtn.style.opacity = '0.7';
        setTimeout(() => {
          triggerBtn.innerHTML = '<span>✅ PID Aeration Cycle Running (3.5k RPM)</span>';
          triggerBtn.style.background = '#059669';
          triggerBtn.style.opacity = '1';
          if (window.AnnarakshaFX && window.AnnarakshaFX.Synthesizer) {
            window.AnnarakshaFX.Synthesizer.playChirp();
          }
        }, 1200);
      };
    }

    try {
      const res = await fetch(`/api/weather?unit_id=${u.id}`);
      const data = await res.json();
      if (data.status === 'success') {
        const cur = data.current_weather;
        const prof = data.psychrometric_profile;
        const presc = data.aeration_prescription;

        if (tempEl) tempEl.textContent = `${cur.temp_c}°C`;
        if (rhEl) rhEl.textContent = `${cur.rh_pct}%`;
        if (dpEl) dpEl.textContent = `${cur.dew_point_c}°C`;

        if (titleEl) {
          titleEl.textContent = presc.label;
          titleEl.style.color = presc.color;
        }
        if (verdictCard) {
          verdictCard.style.borderLeftColor = presc.color;
          verdictCard.style.background = presc.color + '1a';
        }
        if (marginEl) {
          marginEl.textContent = `Δ ${prof.dew_point_margin_c > 0 ? '+' : ''}${prof.dew_point_margin_c}°C margin`;
          marginEl.style.color = prof.dew_point_margin_c > 2 ? '#34d399' : (prof.dew_point_margin_c > 0 ? '#fbbf24' : '#f87171');
        }
        if (rationaleEl) rationaleEl.textContent = presc.rationale;
        if (bestWindowEl) bestWindowEl.textContent = `Best: ${presc.recommended_window}`;

        if (timelineEl && data.hourly_timeline) {
          timelineEl.innerHTML = data.hourly_timeline.map(h => `
            <div class="aeration-hour-cell cell-${h.status}" title="${h.time_label}: ${h.temp_c}°C, RH ${h.rh_pct}%, Dew Pt ${h.dew_point_c}°C (${h.status_label})">
              <span style="font-weight:700; font-size:0.58rem;">${h.hour}h</span>
              <span style="font-size:0.55rem; opacity:0.85;">${Math.round(h.temp_c)}°</span>
            </div>
          `).join('');
        }
      }
    } catch (e) {
      console.warn('[Dashboard] Weather psychrometrics notice:', e);
    }
  }

  updateDrawerAiAssessment(u, crValue, daysLeft) {
    const diagEl = document.getElementById('drawer-copilot-diagnosis');
    if (!diagEl) return;

    let advice = '';
    if (u.risk_level === 'critical') {
      advice = `<strong>🚨 Critical Agronomic Protocol:</strong> Grain core moisture at <strong>${u.moisture_pct}%</strong> exceeds safety threshold (13.0%). High hazard of microbial mycotoxin expansion within <strong>${daysLeft > 0 ? daysLeft : 5} days</strong>, risking ₹${crValue} Cr in ${u.grain_type}. Recommended action: Initiate emergency exhaust cycle (6.5 hrs continuous suction during &lt;65% ambient RH) and schedule dispatch to regional processing.`;
    } else if (u.risk_level === 'watch') {
      advice = `<strong>⚠️ Elevated Warning:</strong> Moisture boundary detected at <strong>${u.moisture_pct}%</strong> with early thermal respiration. Recommended action: Run nocturnal aeration fans (22:00–04:00) for 4.0 hours to dissipate localized condensation pockets across core strata.`;
    } else {
      advice = `<strong>✅ Optimal Agronomic Stability:</strong> Inter-granular moisture at <strong>${u.moisture_pct}%</strong> is within safe parameters. Grain equilibrium relative humidity (ERH) is stable at &lt;62%. Continue standard 30-minute bi-daily air purge cycle.`;
    }

    diagEl.innerHTML = advice;
  }

  async queryInDrawerCopilot(prompt) {
    const diagEl = document.getElementById('drawer-copilot-diagnosis');
    if (!diagEl) return;
    const u = this.selectedUnit;
    const unitContext = u ? `[Unit #${u.id} ${u.name}, ${u.grain_type}, ${u.moisture_pct}% moisture]` : '';
    const fullPrompt = `${unitContext} ${prompt}`;

    diagEl.innerHTML = `<div style="display:flex; align-items:center; gap:8px; color:#38bdf8; font-size:0.76rem;">
      <span class="ticker-pulse" style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#38bdf8;"></span>
      <span>Gemini 3.1 Flash-Lite synthesizing agronomic protocol...</span>
    </div>`;

    try {
      const resp = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: localStorage.getItem('annaraksha_copilot_session') || 'drawer_session',
          message: fullPrompt,
          task_mode: 'general'
        })
      });
      const data = await resp.json();
      if (data.status === 'success' && data.reply) {
        let formatted = data.reply
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          .replace(/\n\n/g, '<br><br>')
          .replace(/\n/g, '<br>');
        diagEl.innerHTML = `<div style="max-height:160px; overflow-y:auto; padding-right:4px;">${formatted}</div>`;
      } else {
        diagEl.innerHTML = `<div style="color:#f43f5e;">Unable to query Copilot: ${data.message || 'Unknown response'}</div>`;
      }
    } catch (err) {
      diagEl.innerHTML = `<div style="color:#f43f5e;">AI connection notice: ${err.message}</div>`;
    }
  }

  closeDrawer() {
    if (this.drawer) {
      this.drawer.classList.remove('open');
      document.body.classList.remove('drawer-active');
    }
  }

  renderDrawerTelemetryChart(u) {
    const canvas = document.getElementById('drawer-telemetry-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width = canvas.parentElement.clientWidth || 360;
    const h = canvas.height = 110;

    ctx.clearRect(0, 0, w, h);

    // Generate 7-day realistic progression ending at current moisture
    const currentM = u.moisture_pct;
    const points = [];
    const drift = u.risk_level === 'critical' ? -0.4 : (u.risk_level === 'watch' ? -0.15 : 0.05);

    for (let i = 6; i >= 0; i--) {
      points.push(currentM + (i * drift) + (Math.sin(i * 1.5) * 0.15));
    }

    const minM = Math.min(...points) - 0.5;
    const maxM = Math.max(...points) + 0.5;
    const range = maxM - minM;

    // Draw grid lines
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.25); ctx.lineTo(w, h * 0.25);
    ctx.moveTo(0, h * 0.75); ctx.lineTo(w, h * 0.75);
    ctx.stroke();

    // Line gradient
    const strokeColor = u.risk_level === 'critical' ? '#ef4444' : (u.risk_level === 'watch' ? '#f59e0b' : '#10b981');
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();

    const stepX = w / 6;
    points.forEach((val, idx) => {
      const x = idx * stepX;
      const y = h - ((val - minM) / range) * (h - 20) - 10;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Area fill
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    const fillGrad = ctx.createLinearGradient(0, 0, 0, h);
    fillGrad.addColorStop(0, strokeColor + '33');
    fillGrad.addColorStop(1, strokeColor + '00');
    ctx.fillStyle = fillGrad;
    ctx.fill();

    // Draw dots
    points.forEach((val, idx) => {
      const x = idx * stepX;
      const y = h - ((val - minM) / range) * (h - 20) - 10;
      ctx.fillStyle = strokeColor;
      ctx.beginPath();
      ctx.arc(x, y, idx === 6 ? 4.5 : 2.5, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  getRiskPillHtml(risk) {
    const r = (risk || 'healthy').toLowerCase();
    if (r === 'critical') {
      return `<span class="risk-pill risk-pill-critical"><span class="ticker-pulse"></span> Critical Spoilage</span>`;
    } else if (r === 'watch') {
      return `<span class="risk-pill risk-pill-watch">⚡ Under Watch</span>`;
    } else {
      return `<span class="risk-pill risk-pill-healthy">✓ Healthy</span>`;
    }
  }
}

window.AnnarakshaDashboard = AnnarakshaDashboard;
