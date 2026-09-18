/**
 * Annaraksha (अन्नरक्षा) — 2-Month (60-Day) Spoilage Wastage Predictor
 * Physics Model: ASAE D535 Dry Matter Loss & Arrhenius Kinetics
 * AI Engine: Google Gemini 2.5 Flash Agronomic Audit
 */

class SpoilagePredictorEngine {
  constructor() {
    this.nationalData = null;
    this.currentUnitForecast = null;
    this.units = [];
    this.activeFilter = 'all';
    this.drawerUnit = null;

    this.cropBaseLifeDays = {
      wheat: 360,
      rice: 300,
      moong: 240,
      chana: 270,
      bajra: 210,
      jowar: 240
    };

    this.grainRates = {
      wheat: 22750,
      rice: 24500,
      moong: 78000,
      chana: 54000,
      bajra: 19500,
      jowar: 29000
    };
  }

  async init() {
    console.log('[SpoilagePredictor] Initializing 2-Month Spoilage Defense Grid...');
    this.bindEvents();
    await this.fetchNationalForecast();
    await this.populateUnitDropdown();
  }

  bindEvents() {
    // Refresh button
    const refreshBtn = document.getElementById('spoilage-refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.fetchNationalForecast();
      });
    }

    // Unit selector
    const unitSelect = document.getElementById('spoilage-sim-unit-select');
    if (unitSelect) {
      unitSelect.addEventListener('change', (e) => {
        this.loadUnitIntoSimulator(e.target.value);
      });
    }

    // Presets for arrival date shift
    document.querySelectorAll('.spoilage-preset-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const days = parseInt(e.target.getAttribute('data-days'), 10);
        if (!isNaN(days)) {
          this.applyArrivalDateOffset(days);
          document.querySelectorAll('.spoilage-preset-btn').forEach(b => b.classList.remove('active'));
          e.target.classList.add('active');
          this.runSimulation(false);
        }
      });
    });

    // Inputs & Sliders reactive updates
    const arrivalInput = document.getElementById('spoilage-sim-arrival-date');
    if (arrivalInput) {
      arrivalInput.addEventListener('change', () => {
        this.updateDaysStoredLabel();
        this.runSimulation(false);
      });
    }

    const cropSelect = document.getElementById('spoilage-sim-crop');
    if (cropSelect) {
      cropSelect.addEventListener('change', () => {
        this.updateSafeMoistureTag();
        this.runSimulation(false);
      });
    }

    const stockSlider = document.getElementById('spoilage-sim-stock-slider');
    if (stockSlider) {
      stockSlider.addEventListener('input', (e) => {
        const display = document.getElementById('sim-stock-display');
        if (display) display.textContent = `${Number(e.target.value).toLocaleString()} Tonnes`;
        this.runSimulation(false);
      });
    }

    const moistureSlider = document.getElementById('spoilage-sim-moisture-slider');
    if (moistureSlider) {
      moistureSlider.addEventListener('input', (e) => {
        const display = document.getElementById('sim-moisture-display');
        if (display) display.textContent = `${e.target.value}%`;
        this.runSimulation(false);
      });
    }

    const tempSlider = document.getElementById('spoilage-sim-temp-slider');
    if (tempSlider) {
      tempSlider.addEventListener('input', (e) => {
        const display = document.getElementById('sim-temp-display');
        if (display) display.textContent = `${e.target.value}°C`;
        this.runSimulation(false);
      });
    }

    // Primary action: Run simulation & Gemini audit
    const runSimBtn = document.getElementById('spoilage-run-sim-btn');
    if (runSimBtn) {
      runSimBtn.addEventListener('click', () => {
        this.runSimulation(true);
      });
    }

    // Persist arrival date to DB
    const persistBtn = document.getElementById('spoilage-persist-arrival-btn');
    if (persistBtn) {
      persistBtn.addEventListener('click', () => {
        this.persistSimulatorArrivalDate();
      });
    }

    // Drawer arrival save button
    const drawerSaveBtn = document.getElementById('drawer-save-arrival-btn');
    if (drawerSaveBtn) {
      drawerSaveBtn.addEventListener('click', () => {
        this.saveDrawerArrivalDate();
      });
    }

    // Drawer run AI Diagnosis button
    const drawerAiBtn = document.getElementById('drawer-run-ai-spoilage-btn');
    if (drawerAiBtn) {
      drawerAiBtn.addEventListener('click', () => {
        this.runDrawerAiDiagnosis();
      });
    }

    // Drawer switch to full simulator
    const drawerFullSimBtn = document.getElementById('drawer-open-full-spoilage-btn');
    if (drawerFullSimBtn) {
      drawerFullSimBtn.addEventListener('click', () => {
        if (window.appInstance) {
          window.appInstance.switchView('view-spoilage', true);
        }
        if (this.drawerUnit) {
          this.loadUnitIntoSimulator(this.drawerUnit.id);
        }
      });
    }

    // Direct tactical interventions from Spoilage panel
    const dispatchAerationBtn = document.getElementById('spoilage-dispatch-aeration-btn');
    if (dispatchAerationBtn) {
      dispatchAerationBtn.addEventListener('click', () => {
        if (window.AnnarakshaFX && window.AnnarakshaFX.Synthesizer) {
          window.AnnarakshaFX.Synthesizer.playChirp();
        }
        dispatchAerationBtn.innerHTML = '<span>⚡ Aeration Dampers Actuating (5,200 CFM)...</span>';
        dispatchAerationBtn.style.background = '#059669';
        setTimeout(() => {
          dispatchAerationBtn.innerHTML = '<span>✅ Aeration Active — Cooling Grain Bed</span>';
        }, 1200);
      });
    }

    const routeBuyerBtn = document.getElementById('spoilage-route-buyer-btn');
    if (routeBuyerBtn) {
      routeBuyerBtn.addEventListener('click', () => {
        if (window.appInstance) {
          window.appInstance.switchView('view-valuechain', true);
        }
      });
    }

    // Table filters
    const filterAll = document.getElementById('filter-all-spoilage');
    const filter60d = document.getElementById('filter-breach-60d');
    const filter30d = document.getElementById('filter-breach-30d');

    const updateFilterActive = (btn) => {
      [filterAll, filter60d, filter30d].forEach(b => b?.classList.remove('active'));
      btn?.classList.add('active');
    };

    if (filterAll) {
      filterAll.addEventListener('click', () => {
        this.activeFilter = 'all';
        updateFilterActive(filterAll);
        this.renderRadarTable();
      });
    }
    if (filter60d) {
      filter60d.addEventListener('click', () => {
        this.activeFilter = '60d';
        updateFilterActive(filter60d);
        this.renderRadarTable();
      });
    }
    if (filter30d) {
      filter30d.addEventListener('click', () => {
        this.activeFilter = '30d';
        updateFilterActive(filter30d);
        this.renderRadarTable();
      });
    }
  }

  async fetchNationalForecast() {
    try {
      const res = await fetch('/api/spoilage-forecast.php');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      this.nationalData = data;
      this.renderNationalKpis();
      this.renderRadarTable();
    } catch (err) {
      console.warn('[SpoilagePredictor] Error fetching national forecast:', err);
    }
  }

  async populateUnitDropdown() {
    try {
      const res = await fetch('/api/units.php');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      this.units = Array.isArray(json) ? json : (Array.isArray(json?.data) ? json.data : []);

      const unitSelect = document.getElementById('spoilage-sim-unit-select');
      if (unitSelect && this.units.length > 0) {
        unitSelect.innerHTML = '';
        this.units.forEach(u => {
          const opt = document.createElement('option');
          opt.value = u.id;
          const grain = (u.grain_type || 'grain').toUpperCase();
          opt.textContent = `Unit #${u.id} — ${u.name || 'Unit'} (${grain}, ${u.moisture_pct}%)`;
          if (u.id === 28) opt.selected = true;
          unitSelect.appendChild(opt);
        });

        // Load unit 28 initially if present, else first unit
        const initialUnitId = this.units.some(u => u.id === 28) ? 28 : this.units[0].id;
        this.loadUnitIntoSimulator(initialUnitId);
      }
    } catch (err) {
      console.warn('[SpoilagePredictor] Error fetching units:', err);
    }
  }

  loadUnitIntoSimulator(unitId) {
    if (!Array.isArray(this.units)) {
      this.units = [];
      return;
    }
    const id = parseInt(unitId, 10);
    const u = this.units.find(item => item.id === id);
    if (!u) return;

    const badge = document.getElementById('sim-selected-unit-badge');
    if (badge) badge.textContent = `Unit #${u.id}`;

    // Commodity
    const cropSelect = document.getElementById('spoilage-sim-crop');
    if (cropSelect) {
      const cropVal = u.grain_type.toLowerCase();
      if (cropSelect.querySelector(`option[value="${cropVal}"]`)) {
        cropSelect.value = cropVal;
      }
    }
    this.updateSafeMoistureTag();

    // Stock arrival date
    const arrivalInput = document.getElementById('spoilage-sim-arrival-date');
    if (arrivalInput) {
      if (u.stock_arrival_date) {
        arrivalInput.value = u.stock_arrival_date;
      } else {
        const d = new Date();
        d.setDate(d.getDate() - 35);
        arrivalInput.value = d.toISOString().split('T')[0];
      }
    }
    this.updateDaysStoredLabel();

    // Stock Volume
    const stockSlider = document.getElementById('spoilage-sim-stock-slider');
    const stockDisplay = document.getElementById('sim-stock-display');
    if (stockSlider) stockSlider.value = u.current_stock_tonnes;
    if (stockDisplay) stockDisplay.textContent = `${u.current_stock_tonnes.toLocaleString()} Tonnes`;

    // Moisture
    const moistureSlider = document.getElementById('spoilage-sim-moisture-slider');
    const moistureDisplay = document.getElementById('sim-moisture-display');
    if (moistureSlider) moistureSlider.value = u.moisture_pct;
    if (moistureDisplay) moistureDisplay.textContent = `${u.moisture_pct}%`;

    // Temp
    const tempSlider = document.getElementById('spoilage-sim-temp-slider');
    const tempDisplay = document.getElementById('sim-temp-display');
    const estimatedTemp = u.temperature_c || (u.moisture_pct > 15 ? 31.5 : 26.5);
    if (tempSlider) tempSlider.value = estimatedTemp;
    if (tempDisplay) tempDisplay.textContent = `${estimatedTemp}°C`;

    // Execute projection
    this.runSimulation(false);
  }

  applyArrivalDateOffset(daysAgo) {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    const dateStr = d.toISOString().split('T')[0];
    const arrivalInput = document.getElementById('spoilage-sim-arrival-date');
    if (arrivalInput) {
      arrivalInput.value = dateStr;
      this.updateDaysStoredLabel();
    }
  }

  updateDaysStoredLabel() {
    const arrivalInput = document.getElementById('spoilage-sim-arrival-date');
    const label = document.getElementById('sim-days-stored-label');
    if (!arrivalInput || !label) return;

    if (!arrivalInput.value) {
      label.textContent = '-- Days in Silo';
      return;
    }

    const arrival = new Date(arrivalInput.value);
    const today = new Date();
    const diffDays = Math.max(0, Math.floor((today - arrival) / (1000 * 60 * 60 * 24)));
    label.textContent = `${diffDays} Days in Silo`;
  }

  updateSafeMoistureTag() {
    const cropSelect = document.getElementById('spoilage-sim-crop');
    const tag = document.getElementById('sim-safe-moisture-tag');
    if (!cropSelect || !tag) return;

    const safeLimits = {
      wheat: '12.0%',
      rice: '13.0%',
      moong: '11.0%',
      chana: '11.5%',
      bajra: '11.0%',
      jowar: '11.5%'
    };
    const limit = safeLimits[cropSelect.value] || '12.0%';
    tag.textContent = `Safe: ≤${limit}`;
  }

  async runSimulation(withGemini = false) {
    const unitSelect = document.getElementById('spoilage-sim-unit-select');
    const cropSelect = document.getElementById('spoilage-sim-crop');
    const arrivalInput = document.getElementById('spoilage-sim-arrival-date');
    const stockSlider = document.getElementById('spoilage-sim-stock-slider');
    const moistureSlider = document.getElementById('spoilage-sim-moisture-slider');
    const tempSlider = document.getElementById('spoilage-sim-temp-slider');
    const runBtn = document.getElementById('spoilage-run-sim-btn');

    const payload = {
      unit_id: unitSelect ? parseInt(unitSelect.value, 10) : 28,
      crop: cropSelect ? cropSelect.value : 'moong',
      stock_arrival_date: arrivalInput && arrivalInput.value ? arrivalInput.value : undefined,
      stock_tonnes: stockSlider ? parseFloat(stockSlider.value) : 6400,
      moisture_pct: moistureSlider ? parseFloat(moistureSlider.value) : 16.8,
      temp_c: tempSlider ? parseFloat(tempSlider.value) : 29.5,
      run_gemini_diagnosis: withGemini
    };

    if (withGemini && runBtn) {
      runBtn.innerHTML = '<span>⏳ Synthesizing Gemini Agronomic Audit...</span>';
      runBtn.disabled = true;
    }

    try {
      const res = await fetch('/api/spoilage-forecast.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      this.renderSimulationResults(data);
    } catch (err) {
      console.warn('[SpoilagePredictor] Simulation error:', err);
    } finally {
      if (withGemini && runBtn) {
        runBtn.innerHTML = '<span>⚡ Run 60-Day Projection & Gemini AI Audit</span>';
        runBtn.disabled = false;
      }
    }
  }

  renderSimulationResults(rawResponse) {
    const forecast = rawResponse.data || rawResponse;
    const aiDiag = rawResponse.ai_diagnosis;
    this.currentUnitForecast = forecast;

    // 1. Hazard Badge & Headline
    const badge = document.getElementById('spoilage-badge');
    const headline = document.getElementById('spoilage-urgency-headline');
    const breachDateDisplay = document.getElementById('spoilage-breach-date-display');
    const daysToBreachDisplay = document.getElementById('spoilage-days-to-breach-display');
    const banner = document.getElementById('spoilage-hazard-banner');

    const daysBreach = forecast.days_to_spoilage_breach;
    const breachDate = forecast.breach_date || forecast.spoilage_breach_date || 'Safe';

    if (badge) {
      badge.textContent = forecast.status_badge || (daysBreach <= 30 ? '🚨 CRITICAL' : daysBreach <= 60 ? '⚠️ 2-MO HAZARD' : '✅ SAFE BUFFER');
      if (forecast.risk_level === 'CRITICAL' || daysBreach <= 30) {
        badge.style.background = '#ef4444';
        badge.style.color = '#ffffff';
        if (banner) {
          banner.style.background = 'rgba(239, 68, 68, 0.12)';
          banner.style.borderColor = 'rgba(239, 68, 68, 0.4)';
        }
      } else if (daysBreach <= 60) {
        badge.style.background = '#f59e0b';
        badge.style.color = '#ffffff';
        if (banner) {
          banner.style.background = 'rgba(245, 158, 11, 0.12)';
          banner.style.borderColor = 'rgba(245, 158, 11, 0.4)';
        }
      } else {
        badge.style.background = '#10b981';
        badge.style.color = '#ffffff';
        if (banner) {
          banner.style.background = 'rgba(16, 185, 129, 0.12)';
          banner.style.borderColor = 'rgba(16, 185, 129, 0.35)';
        }
      }
    }

    if (breachDateDisplay) breachDateDisplay.textContent = breachDate;
    if (daysToBreachDisplay) {
      daysToBreachDisplay.textContent = daysBreach !== null && daysBreach !== undefined
        ? (daysBreach <= 0 ? `Breached ${Math.abs(daysBreach)}d ago` : `${daysBreach} days remaining`)
        : 'Indefinite Safe';
    }

    if (headline) {
      if (forecast.urgency_headline) {
        headline.textContent = forecast.urgency_headline;
      } else if (daysBreach <= 15) {
        headline.textContent = `🚨 ACUTE SPOILAGE IMMINENT: Breach projected in ${daysBreach} days. Active Aspergillus mycoflora germination in core stratum.`;
      } else if (daysBreach <= 60) {
        headline.textContent = `⚠️ 2-MONTH HAZARD: Stock safe storage time expires within 60 days (${daysBreach} days left). Aeration required immediately.`;
      } else {
        headline.textContent = `✅ SAFE BUFFER: Safe storage window exceeds 60 days (${daysBreach} days remaining). Respiration within standard limits.`;
      }
    }

    // 2. 4 Metrics Cards
    const tonnesVal = document.getElementById('spoilage-wastage-tonnes-val');
    const pctVal = document.getElementById('spoilage-wastage-pct-val');
    const lossCrVal = document.getElementById('spoilage-loss-cr-val');
    const lossLakhsVal = document.getElementById('spoilage-loss-lakhs-val');
    const safeLifeVal = document.getElementById('spoilage-safe-life-val');
    const salvageDeadline = document.getElementById('spoilage-salvage-deadline');

    const wastageTonnes = forecast.wastage_at_60_days_tonnes ?? forecast.projected_60d_wastage_tonnes ?? 0;
    const wastagePct = forecast.wastage_at_60_days_pct ?? forecast.projected_60d_wastage_pct ?? 0;
    const lossCr = forecast.rupees_loss_at_60_days_cr ?? forecast.loss_value_crores ?? 0;
    const lossLakhs = Math.round(lossCr * 100);
    const safeLife = forecast.total_safe_storage_days ?? forecast.effective_safe_storage_days ?? '--';

    if (tonnesVal) tonnesVal.textContent = `${Number(wastageTonnes).toLocaleString()} T`;
    if (pctVal) pctVal.textContent = `${wastagePct}% of current stock`;
    if (lossCrVal) lossCrVal.textContent = `₹${lossCr} Cr`;
    if (lossLakhsVal) lossLakhsVal.textContent = `₹${lossLakhs.toLocaleString()} Lakhs write-off`;
    if (safeLifeVal) safeLifeVal.textContent = `${safeLife} Days`;
    if (salvageDeadline) salvageDeadline.textContent = forecast.salvage_plan?.salvage_deadline_date || forecast.salvage_plan?.salvage_deadline || breachDate;

    // 3. 5-Milestone Forward Degradation Stepper
    const timelineContainer = document.getElementById('spoilage-full-timeline');
    if (timelineContainer && forecast.timeline) {
      timelineContainer.innerHTML = '';
      forecast.timeline.forEach((step) => {
        const card = document.createElement('div');
        const isBreached = step.is_breached;
        card.className = `spoilage-step-card ${isBreached ? 'active-breach' : ''}`;
        
        let statusColor = '#10b981';
        if (step.spoilage_probability_pct > 70) statusColor = '#ef4444';
        else if (step.spoilage_probability_pct > 30) statusColor = '#f59e0b';

        card.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong style="color:#ffffff; font-size:0.75rem;">+${step.day_offset} Days</strong>
            <span style="font-size:0.62rem; font-family:var(--font-mono); color:${statusColor}; font-weight:700;">
              ${step.spoilage_probability_pct}% RISK
            </span>
          </div>
          <div style="font-size:0.65rem; color:#94a3b8; font-family:var(--font-mono);">${step.date}</div>
          <div style="background:rgba(255,255,255,0.06); border-radius:999px; height:6px; overflow:hidden; margin:3px 0;">
            <div class="spoilage-dml-fill" style="width:${Math.min(100, (step.dry_matter_loss_pct || 0) * 100)}%; background:${statusColor};"></div>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:0.65rem;">
            <span style="color:#cbd5e1;">DML: <strong>${step.dry_matter_loss_pct}%</strong></span>
            <span style="color:#f43f5e; font-weight:700;">${step.cumulative_spoiled_tonnes} T</span>
          </div>
          <div style="font-size:0.62rem; color:#64748b; line-height:1.2; margin-top:2px;">
            ${step.biological_state || step.biological_condition || 'Standard biological state'}
          </div>
        `;
        timelineContainer.appendChild(card);
      });
    }

    // 4. Gemini Agronomic Diagnosis Box
    const aiMechanism = document.getElementById('spoilage-ai-mechanism');
    const aiMilestonesBox = document.getElementById('spoilage-ai-milestones-box');
    const aiDirective = document.getElementById('spoilage-ai-directive');

    const mechText = aiDiag?.biochemical_mechanism || forecast.salvage_plan?.biochemical_mechanism ||
      (forecast.moisture_pct > 14
        ? 'Elevated water activity (aw > 0.68) driving vegetative proliferation of Aspergillus and Penicillium fungi, accelerating grain respiration.'
        : 'Intergranular moisture within safe equilibrium. Low microbiological activity and minimal dry matter respiration.');

    const summaryText = aiDiag?.two_month_risk_summary || forecast.salvage_plan?.two_month_summary ||
      (daysBreach <= 60
        ? `Wastage breach projected within 60 days (${daysBreach} days). Condemnation risk: ${wastageTonnes} T (₹${lossCr} Cr).`
        : 'No acute breach projected within 60 days. Batch stable under regular preventive maintenance.');

    if (aiMechanism) {
      aiMechanism.innerHTML = `
        <strong style="color:#ffffff;">Biochemical Mechanism:</strong> ${mechText}
        <div style="margin-top:4px; font-size:0.74rem; color:#94a3b8;">${summaryText}</div>
      `;
    }

    if (aiMilestonesBox) {
      aiMilestonesBox.innerHTML = '';
      if (aiDiag?.critical_milestones && Array.isArray(aiDiag.critical_milestones)) {
        aiDiag.critical_milestones.forEach(m => {
          const mCard = document.createElement('div');
          mCard.style.background = 'rgba(4,9,20,0.5)';
          mCard.style.border = '1px solid rgba(255,255,255,0.06)';
          mCard.style.borderRadius = '6px';
          mCard.style.padding = '0.4rem 0.5rem';
          mCard.style.fontSize = '0.68rem';
          mCard.innerHTML = `
            <div style="color:#818cf8; font-weight:700; text-transform:uppercase; font-size:0.62rem;">Day +${m.day}</div>
            <div style="color:#cbd5e1; margin-top:2px; line-height:1.25;">${m.risk}</div>
          `;
          aiMilestonesBox.appendChild(mCard);
        });
      } else if (forecast.salvage_plan?.projected_milestones) {
        Object.entries(forecast.salvage_plan.projected_milestones).forEach(([key, desc]) => {
          const mCard = document.createElement('div');
          mCard.style.background = 'rgba(4,9,20,0.5)';
          mCard.style.border = '1px solid rgba(255,255,255,0.06)';
          mCard.style.borderRadius = '6px';
          mCard.style.padding = '0.4rem 0.5rem';
          mCard.style.fontSize = '0.68rem';
          mCard.innerHTML = `
            <div style="color:#818cf8; font-weight:700; text-transform:uppercase; font-size:0.62rem;">${key.replace('_', ' ')}</div>
            <div style="color:#cbd5e1; margin-top:2px; line-height:1.25;">${desc}</div>
          `;
          aiMilestonesBox.appendChild(mCard);
        });
      }
    }

    const directiveText = aiDiag?.immediate_salvage_directive ||
      (forecast.salvage_plan?.primary_preservation_action + '. ' + (forecast.salvage_plan?.liquidation_recommendation || ''));

    if (aiDirective) {
      aiDirective.innerHTML = `
        <strong>Engineering Salvage Directive:</strong> ${directiveText}
      `;
    }
  }

  async persistSimulatorArrivalDate() {
    const unitSelect = document.getElementById('spoilage-sim-unit-select');
    const arrivalInput = document.getElementById('spoilage-sim-arrival-date');
    const persistBtn = document.getElementById('spoilage-persist-arrival-btn');

    if (!unitSelect || !arrivalInput || !arrivalInput.value) return;

    const unitId = parseInt(unitSelect.value, 10);
    const arrivalDate = arrivalInput.value;

    if (persistBtn) {
      persistBtn.innerHTML = '<span>⏳ Persisting to Database...</span>';
      persistBtn.disabled = true;
    }

    try {
      const res = await fetch('/api/spoilage-forecast-update-arrival.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unit_id: unitId,
          stock_arrival_date: arrivalDate
        })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (persistBtn) {
        persistBtn.innerHTML = '<span>✅ Stock Arrival Date Persisted!</span>';
        persistBtn.style.borderColor = '#10b981';
        persistBtn.style.color = '#10b981';
      }

      // Refresh national forecast radar
      await this.fetchNationalForecast();

      setTimeout(() => {
        if (persistBtn) {
          persistBtn.innerHTML = '<span>💾 Persist Arrival Date to Facility Database</span>';
          persistBtn.disabled = false;
          persistBtn.style.borderColor = '';
          persistBtn.style.color = '';
        }
      }, 2000);
    } catch (err) {
      console.warn('[SpoilagePredictor] Error persisting arrival date:', err);
      if (persistBtn) {
        persistBtn.innerHTML = '<span>❌ Error Persisting</span>';
        persistBtn.disabled = false;
      }
    }
  }

  renderNationalKpis() {
    if (!this.nationalData || !this.nationalData.summary) return;

    const summary = this.nationalData.summary;
    const countEl = document.getElementById('spoilage-kpi-breaching-count');
    const urgentEl = document.getElementById('spoilage-kpi-urgent-count');
    const tonnesEl = document.getElementById('spoilage-kpi-tonnes');
    const rupeesEl = document.getElementById('spoilage-kpi-rupees');

    if (countEl) countEl.textContent = summary.units_at_risk_within_60d ?? '--';
    if (urgentEl) urgentEl.textContent = summary.critical_within_30d ?? summary.acute_30d_breaches ?? '--';
    const tonnes = summary.total_tonnes_at_risk_60d ?? summary.total_projected_wastage_tonnes_60d ?? 0;
    const rupees = summary.total_value_at_risk_60d_cr ?? summary.total_capital_at_risk_crores ?? 0;

    if (tonnesEl) tonnesEl.textContent = `${Number(tonnes).toLocaleString()} T`;
    if (rupeesEl) rupeesEl.textContent = `₹${rupees} Cr`;
  }

  renderRadarTable() {
    if (!this.nationalData) return;

    const tbody = document.getElementById('spoilage-radar-tbody');
    if (!tbody) return;

    tbody.innerHTML = '';
    let items = this.nationalData.all_units || this.nationalData.breaching_units_60d || this.nationalData.vulnerable_units || [];

    if (this.activeFilter === '60d') {
      items = items.filter(u => u.days_to_spoilage_breach !== null && u.days_to_spoilage_breach <= 60);
    } else if (this.activeFilter === '30d') {
      items = items.filter(u => u.days_to_spoilage_breach !== null && u.days_to_spoilage_breach <= 30);
    }

    if (items.length === 0) {
      const row = document.createElement('tr');
      row.innerHTML = `<td colspan="10" style="padding:1.5rem; text-align:center; color:#64748b;">No units match the selected threshold filter.</td>`;
      tbody.appendChild(row);
      return;
    }

    items.forEach(u => {
      const tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid rgba(255,255,255,0.04)';
      tr.style.transition = 'background 0.15s ease';
      tr.onmouseenter = () => tr.style.background = 'rgba(255,255,255,0.02)';
      tr.onmouseleave = () => tr.style.background = 'transparent';

      const daysBreach = u.days_to_spoilage_breach;
      const breachDate = u.breach_date || u.spoilage_breach_date || 'Safe';
      let breachBadge = '';
      if (daysBreach <= 15) {
        breachBadge = `<span style="background:rgba(239,68,68,0.2); color:#ef4444; border:1px solid rgba(239,68,68,0.4); font-family:var(--font-mono); font-size:0.68rem; font-weight:700; padding:1px 6px; border-radius:4px;">🚨 ${daysBreach <= 0 ? 'Breached' : daysBreach + 'd'} (${breachDate})</span>`;
      } else if (daysBreach <= 60) {
        breachBadge = `<span style="background:rgba(245,158,11,0.2); color:#f59e0b; border:1px solid rgba(245,158,11,0.4); font-family:var(--font-mono); font-size:0.68rem; font-weight:700; padding:1px 6px; border-radius:4px;">⚠️ ${daysBreach}d (${breachDate})</span>`;
      } else {
        breachBadge = `<span style="background:rgba(16,185,129,0.15); color:#10b981; border:1px solid rgba(16,185,129,0.3); font-family:var(--font-mono); font-size:0.68rem; font-weight:700; padding:1px 6px; border-radius:4px;">✅ Safe (${daysBreach}d)</span>`;
      }

      let moistureColor = '#10b981';
      if (u.moisture_pct >= 15.5) moistureColor = '#ef4444';
      else if (u.moisture_pct >= 13.5) moistureColor = '#f59e0b';

      const unitName = u.facility_name || u.name || `Unit #${u.unit_id || u.id}`;
      const unitLoc = u.location || `${u.city || ''}, ${u.state || ''}`;
      const wastageT = u.wastage_at_60_days_tonnes ?? u.projected_60d_wastage_tonnes ?? 0;
      const wastageP = u.wastage_at_60_days_pct ?? u.projected_60d_wastage_pct ?? 0;
      const lossCr = u.rupees_loss_at_60_days_cr ?? u.loss_value_crores ?? 0;

      tr.innerHTML = `
        <td style="padding:0.6rem;">
          <strong style="color:#ffffff;">${unitName}</strong>
          <div style="font-size:0.68rem; color:#06b6d4; font-family:var(--font-mono);">Unit #${u.unit_id || u.id}</div>
        </td>
        <td style="padding:0.6rem; color:#94a3b8;">${unitLoc}</td>
        <td style="padding:0.6rem;">
          <span style="background:rgba(255,255,255,0.06); padding:2px 6px; border-radius:4px; font-size:0.68rem; text-transform:uppercase; color:#cbd5e1;">
            ${u.grain_type}
          </span>
        </td>
        <td style="padding:0.6rem; font-family:var(--font-mono); color:#cbd5e1;">
          ${u.stock_arrival_date || '--'}
        </td>
        <td style="padding:0.6rem; font-family:var(--font-mono); color:#38bdf8;">
          ${u.days_in_storage || 0}d
        </td>
        <td style="padding:0.6rem; font-family:var(--font-mono); color:${moistureColor}; font-weight:700;">
          ${u.moisture_pct}%
        </td>
        <td style="padding:0.6rem;">
          ${breachBadge}
        </td>
        <td style="padding:0.6rem; font-family:var(--font-mono); color:#f43f5e; font-weight:700;">
          ${Number(wastageT).toLocaleString()} T <span style="font-size:0.65rem; color:#94a3b8;">(${wastageP}%)</span>
        </td>
        <td style="padding:0.6rem; font-family:var(--font-mono); color:#ef4444; font-weight:700;">
          ₹${lossCr} Cr
        </td>
        <td style="padding:0.6rem; text-align:right;">
          <button class="btn btn-secondary inspect-spoilage-btn" data-unit="${u.unit_id || u.id}" style="padding:0.25rem 0.5rem; font-size:0.68rem;">
            Inspect
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Attach inspect actions
    tbody.querySelectorAll('.inspect-spoilage-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const uId = e.target.getAttribute('data-unit');
        if (uId) {
          const unitSelect = document.getElementById('spoilage-sim-unit-select');
          if (unitSelect) unitSelect.value = uId;
          this.loadUnitIntoSimulator(uId);
          window.scrollTo({ top: 120, behavior: 'smooth' });
        }
      });
    });
  }

  // =========================================================================
  // Unit Drawer Spoilage Integration
  // =========================================================================

  async updateDrawerForecast(unit) {
    this.drawerUnit = unit;

    const arrivalInput = document.getElementById('drawer-arrival-date-input');
    const ageBadge = document.getElementById('drawer-storage-age-badge');
    const hazardPill = document.getElementById('drawer-60d-hazard-pill');
    const countdownEl = document.getElementById('drawer-countdown');
    const dateEl = document.getElementById('drawer-spoilage-date');
    const tonnesEl = document.getElementById('drawer-60d-wastage-tonnes');
    const lossEl = document.getElementById('drawer-60d-loss-cr');
    const milestonesEl = document.getElementById('drawer-60d-milestones');

    // Date
    const arrivalDate = unit.stock_arrival_date || (() => {
      const d = new Date();
      d.setDate(d.getDate() - 35);
      return d.toISOString().split('T')[0];
    })();

    if (arrivalInput) arrivalInput.value = arrivalDate;

    // Storage age
    const arrival = new Date(arrivalDate);
    const today = new Date();
    const diffDays = Math.max(0, Math.floor((today - arrival) / (1000 * 60 * 60 * 24)));
    if (ageBadge) ageBadge.textContent = `${diffDays} days stored`;

    // Fetch live forecast for this unit
    try {
      const res = await fetch(`/api/spoilage-forecast.php?unit_id=${unit.id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const data = json.data || json;

      const daysBreach = data.days_to_spoilage_breach;
      const breachDate = data.breach_date || data.spoilage_breach_date || 'Safe';
      const wastageT = data.wastage_at_60_days_tonnes ?? data.projected_60d_wastage_tonnes ?? 0;
      const wastageP = data.wastage_at_60_days_pct ?? data.projected_60d_wastage_pct ?? 0;
      const lossCr = data.rupees_loss_at_60_days_cr ?? data.loss_value_crores ?? 0;

      if (hazardPill) {
        hazardPill.textContent = data.status_badge || (daysBreach <= 30 ? '🚨 CRITICAL' : daysBreach <= 60 ? '⚠️ 2-MO HAZARD' : '✅ SAFE BUFFER');
        if (daysBreach <= 30) {
          hazardPill.style.background = 'rgba(239, 68, 68, 0.2)';
          hazardPill.style.borderColor = 'rgba(239, 68, 68, 0.4)';
          hazardPill.style.color = '#ef4444';
        } else if (daysBreach <= 60) {
          hazardPill.style.background = 'rgba(245, 158, 11, 0.2)';
          hazardPill.style.borderColor = 'rgba(245, 158, 11, 0.4)';
          hazardPill.style.color = '#f59e0b';
        } else {
          hazardPill.style.background = 'rgba(16, 185, 129, 0.2)';
          hazardPill.style.borderColor = 'rgba(16, 185, 129, 0.4)';
          hazardPill.style.color = '#10b981';
        }
      }

      if (countdownEl) {
        countdownEl.textContent = daysBreach !== null && daysBreach !== undefined
          ? (daysBreach <= 0 ? `Breached ${Math.abs(daysBreach)}d ago` : `${daysBreach} days remaining`)
          : 'Indefinite Safe Window';
        countdownEl.style.color = daysBreach <= 15 ? '#ef4444' : '#fde68a';
      }

      if (dateEl) dateEl.textContent = breachDate;
      if (tonnesEl) tonnesEl.textContent = `${Number(wastageT).toLocaleString()} T (${wastageP}%)`;
      if (lossEl) lossEl.textContent = `₹${lossCr} Cr`;

      // 5 Mini milestones in drawer
      if (milestonesEl && data.timeline) {
        milestonesEl.innerHTML = '';
        data.timeline.forEach(step => {
          const col = document.createElement('div');
          col.style.background = 'rgba(4,9,20,0.6)';
          col.style.border = '1px solid rgba(255,255,255,0.05)';
          col.style.borderRadius = '4px';
          col.style.padding = '3px 4px';
          col.style.textAlign = 'center';

          let fillCol = '#10b981';
          if (step.spoilage_probability_pct > 70) fillCol = '#ef4444';
          else if (step.spoilage_probability_pct > 30) fillCol = '#f59e0b';

          col.innerHTML = `
            <div style="font-size:0.58rem; color:#94a3b8;">+${step.day_offset}d</div>
            <div style="font-size:0.65rem; font-weight:700; color:${fillCol}; font-family:var(--font-mono); margin:1px 0;">
              ${step.dry_matter_loss_pct}%
            </div>
            <div style="font-size:0.55rem; color:#cbd5e1;">${step.cumulative_spoiled_tonnes}T</div>
          `;
          milestonesEl.appendChild(col);
        });
      }
    } catch (err) {
      console.warn('[SpoilagePredictor] Drawer forecast error:', err);
    }
  }

  async saveDrawerArrivalDate() {
    if (!this.drawerUnit) return;
    const arrivalInput = document.getElementById('drawer-arrival-date-input');
    const saveBtn = document.getElementById('drawer-save-arrival-btn');

    if (!arrivalInput || !arrivalInput.value) return;

    if (saveBtn) {
      saveBtn.textContent = '⏳ Saving...';
      saveBtn.disabled = true;
    }

    try {
      const res = await fetch('/api/spoilage-forecast-update-arrival.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unit_id: this.drawerUnit.id,
          stock_arrival_date: arrivalInput.value
        })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      this.drawerUnit.stock_arrival_date = arrivalInput.value;
      if (saveBtn) saveBtn.textContent = '✅ Saved';

      // Update forecast with new arrival date
      await this.updateDrawerForecast(this.drawerUnit);
      await this.fetchNationalForecast();

      setTimeout(() => {
        if (saveBtn) {
          saveBtn.textContent = '💾 Save';
          saveBtn.disabled = false;
        }
      }, 1800);
    } catch (err) {
      console.warn('[SpoilagePredictor] Error saving drawer arrival date:', err);
      if (saveBtn) {
        saveBtn.textContent = '❌ Error';
        saveBtn.disabled = false;
      }
    }
  }

  async runDrawerAiDiagnosis() {
    if (!this.drawerUnit) return;
    const aiBox = document.getElementById('drawer-gemini-spoilage-box');
    const aiText = document.getElementById('drawer-gemini-spoilage-text');
    const aiDirective = document.getElementById('drawer-gemini-salvage-directive');
    const aiBtn = document.getElementById('drawer-run-ai-spoilage-btn');

    if (aiBox) aiBox.style.display = 'block';
    if (aiText) aiText.textContent = 'Synthesizing biochemical degradation mechanisms with Gemini 2.5 Flash...';
    if (aiBtn) {
      aiBtn.innerHTML = '<span>⏳ Synthesizing...</span>';
      aiBtn.disabled = true;
    }

    try {
      const res = await fetch('/api/spoilage-forecast.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unit_id: this.drawerUnit.id,
          crop: this.drawerUnit.grain_type,
          stock_arrival_date: this.drawerUnit.stock_arrival_date,
          stock_tonnes: this.drawerUnit.current_stock_tonnes,
          moisture_pct: this.drawerUnit.moisture_pct,
          temp_c: this.drawerUnit.temperature_c || 28.5,
          run_gemini_diagnosis: true
        })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (aiText && data.salvage_plan) {
        aiText.innerHTML = `<strong>${data.salvage_plan.two_month_summary}</strong><div style="margin-top:3px;">${data.salvage_plan.biochemical_mechanism}</div>`;
      }
      if (aiDirective && data.salvage_plan) {
        aiDirective.innerHTML = `<strong>Salvage Action:</strong> ${data.salvage_plan.salvage_directive}`;
      }
    } catch (err) {
      console.warn('[SpoilagePredictor] Drawer AI diagnosis error:', err);
      if (aiText) aiText.textContent = 'Diagnostic service offline. Using heuristic biological degradation model.';
    } finally {
      if (aiBtn) {
        aiBtn.innerHTML = '<span>🤖 AI Diagnosis</span>';
        aiBtn.disabled = false;
      }
    }
  }
}

// Instantiate and attach globally
window.spoilagePredictor = new SpoilagePredictorEngine();
document.addEventListener('DOMContentLoaded', () => {
  window.spoilagePredictor.init();
});
