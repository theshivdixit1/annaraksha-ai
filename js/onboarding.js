/**
 * Annaraksha AI - Storage Units Onboarding Engine
 * Complete Enterprise Onboarding for Grain Silos, Warehouses & Storage Terminals
 * Bitexindustries Private Limited / Unbeatable Foods
 */

(function() {
  'use strict';

  // Major Indian Agricultural Mandi / District Coordinates Lookup Table
  const STATE_CITY_COORDINATES = {
    'Punjab': {
      'Ludhiana': { lat: 30.9010, lng: 75.8573, defaultGrain: 'wheat' },
      'Bathinda': { lat: 30.2110, lng: 74.9455, defaultGrain: 'wheat' },
      'Patiala': { lat: 30.3398, lng: 76.3869, defaultGrain: 'rice' },
      'Amritsar': { lat: 31.6340, lng: 74.8723, defaultGrain: 'rice' },
      'Sangrur': { lat: 30.2458, lng: 75.8421, defaultGrain: 'wheat' },
      'Jalandhar': { lat: 31.3260, lng: 75.5762, defaultGrain: 'wheat' }
    },
    'Haryana': {
      'Karnal': { lat: 29.6857, lng: 76.9905, defaultGrain: 'wheat' },
      'Rohtak': { lat: 28.8955, lng: 76.6066, defaultGrain: 'wheat' },
      'Sirsa': { lat: 29.5349, lng: 75.0290, defaultGrain: 'bajra' },
      'Kurukshetra': { lat: 29.9695, lng: 76.8783, defaultGrain: 'rice' },
      'Hisar': { lat: 29.1492, lng: 75.7217, defaultGrain: 'wheat' },
      'Ambala': { lat: 30.3782, lng: 76.7767, defaultGrain: 'rice' }
    },
    'Madhya Pradesh': {
      'Indore': { lat: 22.7196, lng: 75.8577, defaultGrain: 'wheat' },
      'Bhopal': { lat: 23.2599, lng: 77.4126, defaultGrain: 'wheat' },
      'Ujjain': { lat: 23.1765, lng: 75.7885, defaultGrain: 'chana' },
      'Jabalpur': { lat: 23.1815, lng: 79.9864, defaultGrain: 'moong' },
      'Gwalior': { lat: 26.2183, lng: 78.1828, defaultGrain: 'wheat' },
      'Narmadapuram': { lat: 22.7519, lng: 77.7289, defaultGrain: 'wheat' },
      'Vidisha': { lat: 23.5251, lng: 77.8081, defaultGrain: 'chana' }
    },
    'Uttar Pradesh': {
      'Aligarh': { lat: 27.8974, lng: 78.0880, defaultGrain: 'wheat' },
      'Varanasi': { lat: 25.3176, lng: 82.9739, defaultGrain: 'rice' },
      'Gorakhpur': { lat: 26.7606, lng: 83.3732, defaultGrain: 'rice' },
      'Kanpur': { lat: 26.4499, lng: 80.3319, defaultGrain: 'wheat' },
      'Mathura': { lat: 27.4924, lng: 77.6737, defaultGrain: 'bajra' },
      'Bareilly': { lat: 28.3670, lng: 79.4304, defaultGrain: 'wheat' },
      'Meerut': { lat: 28.9845, lng: 77.7064, defaultGrain: 'wheat' },
      'Prayagraj': { lat: 25.4358, lng: 81.8463, defaultGrain: 'rice' }
    },
    'Rajasthan': {
      'Jaipur': { lat: 26.9124, lng: 75.7873, defaultGrain: 'bajra' },
      'Kota': { lat: 25.2138, lng: 75.8648, defaultGrain: 'wheat' },
      'Bikaner': { lat: 28.0229, lng: 73.3119, defaultGrain: 'moong' },
      'Jodhpur': { lat: 26.2389, lng: 73.0243, defaultGrain: 'bajra' },
      'Sri Ganganagar': { lat: 29.9038, lng: 73.8772, defaultGrain: 'wheat' },
      'Alwar': { lat: 27.5530, lng: 76.6346, defaultGrain: 'bajra' }
    },
    'Maharashtra': {
      'Nagpur': { lat: 21.1458, lng: 79.0882, defaultGrain: 'jowar' },
      'Nashik': { lat: 19.9975, lng: 73.7898, defaultGrain: 'chana' },
      'Akola': { lat: 20.7002, lng: 77.0082, defaultGrain: 'moong' },
      'Solapur': { lat: 17.6599, lng: 75.9064, defaultGrain: 'jowar' },
      'Chhatrapati Sambhajinagar': { lat: 19.8762, lng: 75.3433, defaultGrain: 'chana' },
      'Pune': { lat: 18.5204, lng: 73.8567, defaultGrain: 'jowar' },
      'Latur': { lat: 18.4088, lng: 76.5604, defaultGrain: 'moong' }
    },
    'Gujarat': {
      'Rajkot': { lat: 22.3039, lng: 70.8022, defaultGrain: 'bajra' },
      'Mehsana': { lat: 23.5880, lng: 72.3693, defaultGrain: 'wheat' },
      'Anand': { lat: 22.5645, lng: 72.9289, defaultGrain: 'chana' },
      'Surat': { lat: 21.1702, lng: 72.8311, defaultGrain: 'rice' },
      'Ahmedabad': { lat: 23.0225, lng: 72.5714, defaultGrain: 'wheat' },
      'Bhavnagar': { lat: 21.7645, lng: 72.1519, defaultGrain: 'bajra' }
    },
    'Andhra Pradesh': {
      'Guntur': { lat: 16.3067, lng: 80.4365, defaultGrain: 'rice' },
      'Kakinada': { lat: 16.9891, lng: 82.2475, defaultGrain: 'rice' },
      'Nellore': { lat: 14.4426, lng: 79.9865, defaultGrain: 'rice' },
      'Kurnool': { lat: 15.8281, lng: 78.0373, defaultGrain: 'moong' },
      'Vijayawada': { lat: 16.5062, lng: 80.6480, defaultGrain: 'rice' }
    },
    'Telangana': {
      'Nizamabad': { lat: 18.6725, lng: 78.0941, defaultGrain: 'rice' },
      'Warangal': { lat: 17.9689, lng: 79.5941, defaultGrain: 'jowar' },
      'Karimnagar': { lat: 18.4386, lng: 79.1288, defaultGrain: 'rice' },
      'Khammam': { lat: 17.2473, lng: 80.1514, defaultGrain: 'rice' }
    },
    'Karnataka': {
      'Ballari': { lat: 15.1394, lng: 76.9214, defaultGrain: 'jowar' },
      'Raichur': { lat: 16.2076, lng: 77.3463, defaultGrain: 'rice' },
      'Kalaburagi': { lat: 17.3297, lng: 76.8343, defaultGrain: 'chana' },
      'Davanagere': { lat: 14.4644, lng: 75.9218, defaultGrain: 'jowar' },
      'Belagavi': { lat: 15.8497, lng: 74.4977, defaultGrain: 'rice' }
    },
    'Bihar': {
      'Purnia': { lat: 25.7771, lng: 87.4753, defaultGrain: 'rice' },
      'Bhagalpur': { lat: 25.2425, lng: 86.9842, defaultGrain: 'wheat' },
      'Muzaffarpur': { lat: 26.1209, lng: 85.3647, defaultGrain: 'rice' },
      'Sasaram': { lat: 24.9522, lng: 84.0315, defaultGrain: 'moong' },
      'Patna': { lat: 25.5941, lng: 85.1376, defaultGrain: 'rice' }
    },
    'West Bengal': {
      'Bardhaman': { lat: 23.2324, lng: 87.8615, defaultGrain: 'rice' },
      'Midnapore': { lat: 22.4257, lng: 87.3199, defaultGrain: 'rice' },
      'Malda': { lat: 25.0108, lng: 88.1411, defaultGrain: 'rice' },
      'Siliguri': { lat: 26.7271, lng: 88.3953, defaultGrain: 'rice' }
    },
    'Odisha': {
      'Sambalpur': { lat: 21.4669, lng: 83.9812, defaultGrain: 'rice' },
      'Balasore': { lat: 21.4934, lng: 86.9135, defaultGrain: 'rice' },
      'Bargarh': { lat: 21.3340, lng: 83.6214, defaultGrain: 'rice' }
    },
    'Tamil Nadu': {
      'Thanjavur': { lat: 10.7870, lng: 79.1378, defaultGrain: 'rice' },
      'Madurai': { lat: 9.9252, lng: 78.1198, defaultGrain: 'moong' }
    },
    'Chhattisgarh': {
      'Raipur': { lat: 21.2514, lng: 81.6296, defaultGrain: 'rice' },
      'Bilaspur': { lat: 22.0797, lng: 82.1409, defaultGrain: 'rice' }
    }
  };

  const GRAIN_MSP_RATES = {
    wheat: 22750,
    rice: 24500,
    moong: 78000,
    chana: 54000,
    bajra: 19500,
    jowar: 29000,
    maize: 20900,
    mustard: 56500,
    soyabean: 46000
  };

  class StorageUnitsOnboarding {
    constructor() {
      this.initDOMElements();
      this.bindEvents();
      this.populateStates();
      this.updateRiskTelemetryPreflight();
    }

    initDOMElements() {
      this.form = document.getElementById('onboarding-form');
      this.stateSelect = document.getElementById('ob-state');
      this.citySelect = document.getElementById('ob-city');
      this.grainSelect = document.getElementById('ob-grain');
      this.latInput = document.getElementById('ob-lat');
      this.lngInput = document.getElementById('ob-lng');
      this.nameInput = document.getElementById('ob-name');
      this.capacityInput = document.getElementById('ob-capacity');
      this.stockInput = document.getElementById('ob-stock');
      this.moistureInput = document.getElementById('ob-moisture');
      this.siloTypeSelect = document.getElementById('ob-silo-type');
      this.operatorSelect = document.getElementById('ob-operator');
      this.numBinsInput = document.getElementById('ob-bins');
      this.aerationSelect = document.getElementById('ob-aeration');
      this.wdraInput = document.getElementById('ob-wdra');

      // Live Pre-flight Calculation Elements
      this.calcRiskBadge = document.getElementById('ob-calc-risk-badge');
      this.calcDts = document.getElementById('ob-calc-dts');
      this.calcAtRiskValue = document.getElementById('ob-calc-value');
      this.calcDirective = document.getElementById('ob-calc-directive');
      this.calcUtilBar = document.getElementById('ob-calc-util-bar');
      this.calcUtilPct = document.getElementById('ob-calc-util-pct');

      // Presets
      this.presetBtns = document.querySelectorAll('.ob-preset-btn');
      this.gpsBtn = document.getElementById('ob-btn-gps');
      this.mapPickBtn = document.getElementById('ob-btn-mappick');

      // Confirmation Modal Elements
      this.modal = document.getElementById('onboard-success-modal');
      this.modalCloseBtn = document.getElementById('ob-modal-close-btn');
      this.modalInspectGridBtn = document.getElementById('ob-modal-inspect-grid');
      this.modalInspectTwinBtn = document.getElementById('ob-modal-inspect-twin');
      this.modalPrintBtn = document.getElementById('ob-modal-print-btn');
    }

    populateStates() {
      if (!this.stateSelect) return;
      this.stateSelect.innerHTML = '<option value="">-- Select Indian State --</option>';
      const states = Object.keys(STATE_CITY_COORDINATES).sort();
      states.forEach(st => {
        const opt = document.createElement('option');
        opt.value = st;
        opt.textContent = st;
        this.stateSelect.appendChild(opt);
      });
    }

    populateCities(stateName) {
      if (!this.citySelect) return;
      this.citySelect.innerHTML = '<option value="">-- Select Agricultural Hub / City --</option>';
      if (!stateName || !STATE_CITY_COORDINATES[stateName]) {
        this.citySelect.disabled = true;
        return;
      }
      this.citySelect.disabled = false;
      const cities = Object.keys(STATE_CITY_COORDINATES[stateName]).sort();
      cities.forEach(city => {
        const opt = document.createElement('option');
        opt.value = city;
        opt.textContent = city;
        this.citySelect.appendChild(opt);
      });
    }

    bindEvents() {
      // State change -> populate cities
      if (this.stateSelect) {
        this.stateSelect.addEventListener('change', (e) => {
          const st = e.target.value;
          this.populateCities(st);
          this.generateWdraCode();
          this.updateRiskTelemetryPreflight();
        });
      }

      // City change -> auto coordinates & suggest grain
      if (this.citySelect) {
        this.citySelect.addEventListener('change', (e) => {
          const st = this.stateSelect?.value;
          const city = e.target.value;
          if (st && city && STATE_CITY_COORDINATES[st]?.[city]) {
            const data = STATE_CITY_COORDINATES[st][city];
            if (this.latInput) this.latInput.value = data.lat.toFixed(4);
            if (this.lngInput) this.lngInput.value = data.lng.toFixed(4);
            if (this.grainSelect && data.defaultGrain && !this.grainSelect.value) {
              this.grainSelect.value = data.defaultGrain;
            }
            if (this.nameInput && !this.nameInput.value) {
              this.nameInput.value = `${city} Central AgroVault Silo Node`;
            }
            this.generateWdraCode();
            this.updateRiskTelemetryPreflight();
          }
        });
      }

      // Live Pre-flight recalculation on any input change
      const watchInputs = [this.capacityInput, this.stockInput, this.moistureInput, this.grainSelect];
      watchInputs.forEach(input => {
        if (input) {
          input.addEventListener('input', () => this.updateRiskTelemetryPreflight());
          input.addEventListener('change', () => this.updateRiskTelemetryPreflight());
        }
      });

      // Quick-fill templates
      this.presetBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const presetId = btn.getAttribute('data-preset');
          this.applyPreset(presetId);
        });
      });

      // GPS Auto-detect
      if (this.gpsBtn) {
        this.gpsBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.detectGPSLocation();
        });
      }

      // Map picker toggle
      if (this.mapPickBtn) {
        this.mapPickBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.pickLocationFromMap();
        });
      }

      // Form submit
      if (this.form) {
        this.form.addEventListener('submit', (e) => {
          e.preventDefault();
          this.handleFormSubmit();
        });
      }

      // Modal buttons
      if (this.modalCloseBtn) {
        this.modalCloseBtn.addEventListener('click', () => this.closeSuccessModal());
      }
      if (this.modalInspectGridBtn) {
        this.modalInspectGridBtn.addEventListener('click', () => {
          this.closeSuccessModal();
          const gridTab = document.querySelector('.hud-tab-btn[data-target="view-grid"]');
          if (gridTab) gridTab.click();
          if (this.lastOnboardedUnitId && window.dashboardEngine) {
            window.dashboardEngine.selectUnitById(this.lastOnboardedUnitId);
          }
        });
      }
      if (this.modalInspectTwinBtn) {
        this.modalInspectTwinBtn.addEventListener('click', () => {
          this.closeSuccessModal();
          const twinTab = document.querySelector('.hud-tab-btn[data-target="view-silo"]');
          if (twinTab) twinTab.click();
          if (this.lastOnboardedUnitId && window.silo3DInstance) {
            window.silo3DInstance.loadUnit(this.lastOnboardedUnitId);
          }
        });
      }
      if (this.modalPrintBtn) {
        this.modalPrintBtn.addEventListener('click', () => window.print());
      }
    }

    generateWdraCode() {
      if (!this.wdraInput) return;
      const st = this.stateSelect?.value || 'IN';
      const city = this.citySelect?.value || 'HUB';
      const stateCode = st.substring(0, 2).toUpperCase();
      const cityCode = city.substring(0, 3).toUpperCase();
      const rand = Math.floor(1000 + Math.random() * 9000);
      this.wdraInput.value = `WDRA-${stateCode}-${cityCode}-${rand}-2026`;
    }

    detectGPSLocation() {
      if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser.');
        return;
      }
      this.gpsBtn.innerHTML = '<span>📡 Locating...</span>';
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (this.latInput) this.latInput.value = pos.coords.latitude.toFixed(4);
          if (this.lngInput) this.lngInput.value = pos.coords.longitude.toFixed(4);
          this.gpsBtn.innerHTML = '<span>📍 GPS Acquired!</span>';
          setTimeout(() => {
            this.gpsBtn.innerHTML = '<span>📍 Detect My GPS</span>';
          }, 3000);
        },
        (err) => {
          console.warn('GPS location error:', err);
          this.gpsBtn.innerHTML = '<span>⚠️ GPS Offline</span>';
          setTimeout(() => {
            this.gpsBtn.innerHTML = '<span>📍 Detect My GPS</span>';
          }, 2500);
        },
        { timeout: 7000 }
      );
    }

    pickLocationFromMap() {
      const gridTab = document.querySelector('.hud-tab-btn[data-target="view-grid"]');
      if (gridTab) gridTab.click();
      alert('Click anywhere on the Operations Grid Map to select coordinates, then return to Onboarding tab.');

      const mapClickListener = (e) => {
        let lat, lng;
        if (e.latlng) {
          lat = e.latlng.lat;
          lng = e.latlng.lng;
        } else if (e.latLng) {
          lat = e.latLng.lat();
          lng = e.latLng.lng();
        }
        if (lat && lng) {
          if (this.latInput) this.latInput.value = Number(lat).toFixed(4);
          if (this.lngInput) this.lngInput.value = Number(lng).toFixed(4);
          const obTab = document.querySelector('.hud-tab-btn[data-target="view-onboarding"]');
          if (obTab) obTab.click();
          if (window.AnnarakshaFX?.Synthesizer) window.AnnarakshaFX.Synthesizer.playChirp();
        }
      };

      if (window.dashboardEngine?.map) {
        if (window.dashboardEngine.isGoogleMap && window.dashboardEngine.googleMap) {
          google.maps.event.addListenerOnce(window.dashboardEngine.googleMap, 'click', mapClickListener);
        } else if (window.dashboardEngine.map.once) {
          window.dashboardEngine.map.once('click', mapClickListener);
        }
      }
    }

    applyPreset(presetId) {
      const presets = {
        'punjab-wheat': {
          name: 'Ludhiana Grand Northern Silo Hub',
          state: 'Punjab',
          city: 'Ludhiana',
          lat: 30.9010,
          lng: 75.8573,
          grain: 'wheat',
          capacity: 15000,
          stock: 13500,
          moisture: 11.2,
          siloType: 'Vertical Corrugated Steel Silo',
          operator: 'FCI (Food Corporation of India)',
          bins: 8,
          aeration: 'Automated Convective Fans'
        },
        'vidarbha-pulse': {
          name: 'Akola Modern Pulse Terminal Beta',
          state: 'Maharashtra',
          city: 'Akola',
          lat: 20.7002,
          lng: 77.0082,
          grain: 'chana',
          capacity: 8500,
          stock: 7400,
          moisture: 14.2,
          siloType: 'Covered Warehouse Godown',
          operator: 'Maharashtra State Warehousing (MSWC)',
          bins: 4,
          aeration: 'Continuous Convective Blowers'
        },
        'andhra-rice': {
          name: 'Kakinada Deep-Water Buffer Granary',
          state: 'Andhra Pradesh',
          city: 'Kakinada',
          lat: 16.9891,
          lng: 82.2475,
          grain: 'rice',
          capacity: 12000,
          stock: 10800,
          moisture: 16.8,
          siloType: 'Vertical Corrugated Steel Silo',
          operator: 'Central Warehousing Corporation (CWC)',
          bins: 6,
          aeration: 'Refrigerated Grain Chilling'
        },
        'rajasthan-millet': {
          name: 'Jaipur PinkCity Desert Granary',
          state: 'Rajasthan',
          city: 'Jaipur',
          lat: 26.9124,
          lng: 75.7873,
          grain: 'bajra',
          capacity: 7000,
          stock: 5800,
          moisture: 10.8,
          siloType: 'Hermetic Bag Bunker',
          operator: 'Farmer Producer Organization (FPO)',
          bins: 3,
          aeration: 'Hermetically Sealed / Passive Vents'
        }
      };

      const p = presets[presetId];
      if (!p) return;

      if (this.nameInput) this.nameInput.value = p.name;
      if (this.stateSelect) {
        this.stateSelect.value = p.state;
        this.populateCities(p.state);
      }
      if (this.citySelect) this.citySelect.value = p.city;
      if (this.latInput) this.latInput.value = p.lat.toFixed(4);
      if (this.lngInput) this.lngInput.value = p.lng.toFixed(4);
      if (this.grainSelect) this.grainSelect.value = p.grain;
      if (this.capacityInput) this.capacityInput.value = p.capacity;
      if (this.stockInput) this.stockInput.value = p.stock;
      if (this.moistureInput) this.moistureInput.value = p.moisture;
      if (this.siloTypeSelect) this.siloTypeSelect.value = p.siloType;
      if (this.operatorSelect) this.operatorSelect.value = p.operator;
      if (this.numBinsInput) this.numBinsInput.value = p.bins;
      if (this.aerationSelect) this.aerationSelect.value = p.aeration;

      this.generateWdraCode();
      this.updateRiskTelemetryPreflight();

      if (window.AnnarakshaFX?.Synthesizer) {
        window.AnnarakshaFX.Synthesizer.playChirp();
      }
    }

    updateRiskTelemetryPreflight() {
      const cap = Number(this.capacityInput?.value) || 10000;
      const stock = Number(this.stockInput?.value) || 8000;
      const moisture = Number(this.moistureInput?.value) || 12.0;
      const grain = (this.grainSelect?.value || 'wheat').toLowerCase();

      // Utilization bar
      const utilPct = Math.min(100, Math.round((stock / cap) * 100));
      if (this.calcUtilBar) this.calcUtilBar.style.width = `${utilPct}%`;
      if (this.calcUtilPct) this.calcUtilPct.textContent = `${utilPct}% (${stock.toLocaleString()} / ${cap.toLocaleString()} T)`;

      // Rate & value
      const mspRate = GRAIN_MSP_RATES[grain] || 23000;
      const totalInventoryVal = stock * mspRate;
      const valCr = (totalInventoryVal / 10000000).toFixed(2);

      let riskTier = 'healthy';
      let dts = '> 180 Days (Safe)';
      let directive = 'Standard ambient convective airflow schedule (02:00-06:00 IST).';
      let badgeHtml = '<span class="risk-pill risk-pill-healthy">● Healthy Tier</span>';

      if (moisture >= 15.5) {
        riskTier = 'critical';
        const days = Math.max(3, Math.round(14 - (moisture - 15.5) * 4));
        dts = `🚨 ${days} Days (Rapid Spoilage Risk)`;
        directive = 'IMMEDIATE ACTION: Activate high-volume forced aeration blowers. Restrict intake lot until hot-air moisture reduction is complete.';
        badgeHtml = '<span class="risk-pill risk-pill-critical"><span class="ticker-pulse"></span> Critical Risk Tier</span>';
      } else if (moisture >= 13.5) {
        riskTier = 'watch';
        const days = Math.max(18, Math.round(55 - (moisture - 13.5) * 15));
        dts = `⚠️ ${days} Days (Approaching Hazard)`;
        directive = 'SCHEDULE ACTION: Continuous night-time dry aeration. Monitor multizone cable temperature for thermal biological respiration.';
        badgeHtml = '<span class="risk-pill risk-pill-watch">● Under Watch</span>';
      }

      if (this.calcRiskBadge) this.calcRiskBadge.innerHTML = badgeHtml;
      if (this.calcDts) this.calcDts.textContent = dts;
      if (this.calcAtRiskValue) {
        const atRiskPct = riskTier === 'critical' ? 0.85 : (riskTier === 'watch' ? 0.45 : 0.05);
        const atRiskCr = ((totalInventoryVal * atRiskPct) / 10000000).toFixed(2);
        this.calcAtRiskValue.textContent = `₹${atRiskCr} Cr (Inventory Total: ₹${valCr} Cr)`;
      }
      if (this.calcDirective) this.calcDirective.textContent = directive;
    }

    async handleFormSubmit() {
      const submitBtn = document.getElementById('ob-submit-btn');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>⚡ Ingesting into National Grid...</span>';
      }

      const name = this.nameInput?.value.trim();
      const state = this.stateSelect?.value.trim();
      const city = this.citySelect?.value.trim();
      const lat = Number(this.latInput?.value);
      const lng = Number(this.lngInput?.value);
      const grain = (this.grainSelect?.value || 'wheat').toLowerCase().trim();
      const cap = Number(this.capacityInput?.value) || 10000;
      const stock = Number(this.stockInput?.value) || 8000;
      const moisture = Number(this.moistureInput?.value) || 12.0;
      const siloType = this.siloTypeSelect?.value || 'Vertical Corrugated Steel Silo';
      const operator = this.operatorSelect?.value || 'FCI / CWC Grid Partner';
      const bins = Number(this.numBinsInput?.value) || 4;
      const aeration = this.aerationSelect?.value || 'Automated Convective Fans';
      const wdra = this.wdraInput?.value || `WDRA-${state.substring(0,2).toUpperCase()}-${Math.floor(1000+Math.random()*9000)}-2026`;

      if (!name || !state || !city) {
        alert('Please complete all required fields: Facility Name, State, and City.');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<span>⚡ Register &amp; Commission Facility</span>';
        }
        return;
      }

      const payload = {
        name,
        state,
        city,
        lat,
        lng,
        grain_type: grain,
        capacity_tonnes: cap,
        current_stock_tonnes: stock,
        moisture_pct: moisture,
        silo_type: siloType,
        operator_name: operator,
        num_bins: bins,
        aeration_system: aeration,
        wdra_code: wdra,
        stock_arrival_date: new Date().toISOString().split('T')[0]
      };

      let createdUnit = null;

      // 1. Attempt POST to server
      try {
        const res = await fetch('/api/units', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const json = await res.json();
          if (json.status === 'success' && json.data) {
            createdUnit = json.data;
          }
        }
      } catch (err) {
        console.warn('[Onboarding] Server POST failed, engaging offline edge persistence:', err);
      }

      // 2. If server failed or offline, generate client-side record
      if (!createdUnit) {
        const nextId = 100 + Math.floor(Math.random() * 900);
        let risk_level = 'healthy';
        let predicted_spoilage_date = null;
        if (moisture >= 15.5) {
          risk_level = 'critical';
          predicted_spoilage_date = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
        } else if (moisture >= 13.5) {
          risk_level = 'watch';
          predicted_spoilage_date = new Date(Date.now() + 32 * 86400000).toISOString().split('T')[0];
        }

        createdUnit = {
          ...payload,
          id: nextId,
          risk_level,
          predicted_spoilage_date,
          days_in_storage: 1,
          last_updated: new Date().toISOString()
        };
      }

      // 3. Save to localStorage for persistent custom domain access
      try {
        const localUnits = JSON.parse(localStorage.getItem('annaraksha_custom_units') || '[]');
        localUnits.push(createdUnit);
        localStorage.setItem('annaraksha_custom_units', JSON.stringify(localUnits));
      } catch (storeErr) {
        console.warn('Local storage write warning:', storeErr);
      }

      this.lastOnboardedUnitId = createdUnit.id;

      // 4. Update live dashboard engine
      if (window.dashboardEngine) {
        // Add to units list if not already present
        const exists = window.dashboardEngine.units.some(u => u.id === createdUnit.id);
        if (!exists) {
          window.dashboardEngine.units.unshift(createdUnit);
        }
        window.dashboardEngine.populateStateOptions();
        window.dashboardEngine.applyFilters();
        if (window.dashboardEngine.renderMapMarkers) {
          window.dashboardEngine.renderMapMarkers();
        }
        // Pan map to new facility
        if (window.dashboardEngine.map?.flyTo) {
          window.dashboardEngine.map.flyTo([createdUnit.lat, createdUnit.lng], 9);
        }
      }

      // 5. Update Directory Table if open
      const dirTbody = document.getElementById('dir-tbody');
      if (dirTbody && window.dashboardEngine?.units) {
        // Trigger directory re-render
        const dirSearch = document.getElementById('dir-search');
        if (dirSearch) dirSearch.dispatchEvent(new Event('input'));
      }

      // 6. Play futuristic confirmation chime
      if (window.AnnarakshaFX?.Synthesizer) {
        window.AnnarakshaFX.Synthesizer.playNotification();
      }

      // 7. Show success confirmation modal with e-Pass & Certificate
      this.displaySuccessModal(createdUnit);

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>⚡ Register &amp; Commission Facility</span>';
      }
    }

    displaySuccessModal(unit) {
      if (!this.modal) return;

      document.getElementById('ob-succ-name').textContent = unit.name;
      document.getElementById('ob-succ-id').textContent = `#${unit.id}`;
      document.getElementById('ob-succ-wdra').textContent = unit.wdra_code || 'WDRA-REG-2026-ACTIVE';
      document.getElementById('ob-succ-loc').textContent = `${unit.city}, ${unit.state} (${unit.lat.toFixed(4)}°N, ${unit.lng.toFixed(4)}°E)`;
      document.getElementById('ob-succ-grain').textContent = `${unit.grain_type.toUpperCase()} • ${unit.silo_type}`;
      document.getElementById('ob-succ-capacity').textContent = `${unit.current_stock_tonnes.toLocaleString()} MT / ${unit.capacity_tonnes.toLocaleString()} MT (${Math.round(unit.current_stock_tonnes/unit.capacity_tonnes*100)}%)`;
      document.getElementById('ob-succ-moisture').textContent = `${unit.moisture_pct}%`;
      document.getElementById('ob-succ-operator').textContent = unit.operator_name || 'FCI / CWC Grid Partner';
      
      const riskEl = document.getElementById('ob-succ-risk');
      if (riskEl) {
        if (unit.risk_level === 'critical') {
          riskEl.innerHTML = '<span class="risk-pill risk-pill-critical"><span class="ticker-pulse"></span> CRITICAL INTAKE</span>';
        } else if (unit.risk_level === 'watch') {
          riskEl.innerHTML = '<span class="risk-pill risk-pill-watch">WATCH TIER</span>';
        } else {
          riskEl.innerHTML = '<span class="risk-pill risk-pill-healthy">HEALTHY SPEC</span>';
        }
      }

      this.modal.style.display = 'flex';
    }

    closeSuccessModal() {
      if (this.modal) {
        this.modal.style.display = 'none';
      }
    }
  }

  // Export to window
  window.StorageUnitsOnboarding = StorageUnitsOnboarding;
})();
