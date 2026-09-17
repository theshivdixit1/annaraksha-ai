/**
 * Annaraksha AI - Futuristic Agronomic Cyber-Command Console Engine
 * Bitexindustries Private Limited / Unbeatable Foods
 */

class FuturisticConsole {
  constructor() {
    this.currentView = 'view-grid';
    this.cameraStream = null;
    this.cameraFacingMode = 'environment';
    this.latestScanData = null;
    this.init();
  }

  async init() {
    this.initNavigation();
    this.initIngestionFeeds();
    this.initScanner();
    this.initCameraCapture();
    this.initCertificateModal();
    this.initWorkOrders();
    this.initValueChain();
    this.initLogistics();
    this.initImpact();
    this.startLiveClock();
  }

  startLiveClock() {
    const clockEl = document.getElementById('hud-live-clock');
    if (!clockEl) return;
    const update = () => {
      const now = new Date();
      clockEl.textContent = now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false }) + ' IST';
    };
    update();
    setInterval(update, 1000);
  }

  switchView(targetId, updateHash = true) {
    if (!targetId) return;
    const tabBtns = document.querySelectorAll('.hud-tab-btn');
    tabBtns.forEach(b => {
      const isTarget = b.getAttribute('data-target') === targetId;
      b.classList.toggle('active', isTarget);
    });

    const panes = document.querySelectorAll('.hud-module-pane');
    let foundPane = false;
    panes.forEach(p => {
      const isTarget = p.id === targetId;
      p.style.display = isTarget ? 'block' : 'none';
      if (isTarget) foundPane = true;
    });

    if (!foundPane) return;

    this.currentView = targetId;
    if (updateHash && window.location.hash !== `#${targetId}`) {
      history.replaceState(null, '', `#${targetId}`);
    }

    // Invalidate map on switch
    if (targetId === 'view-grid' && window.dashboardEngine?.map) {
      setTimeout(() => window.dashboardEngine.map.invalidateSize(), 150);
    }

    // Trigger 3D Silo Resize if switching to Silo
    if (targetId === 'view-silo' && window.silo3DInstance) {
      setTimeout(() => window.silo3DInstance.onWindowResize(), 100);
    }

    // Trigger 3D Scanner & Recharts Resize if switching to Scanner
    if (targetId === 'view-scanner') {
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
        if (window.scanner3DInstance) window.scanner3DInstance.onWindowResize();
      }, 100);
    }

    // Trigger Spoilage Predictor update if switching to Spoilage view
    if (targetId === 'view-spoilage' && window.spoilagePredictor) {
      window.spoilagePredictor.fetchNationalForecast();
    }
  }

  initNavigation() {
    const tabBtns = document.querySelectorAll('.hud-tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-target');
        if (!targetId) return;

        // Play subtle futuristic audio click
        if (window.AnnarakshaFX && window.AnnarakshaFX.Synthesizer) {
          window.AnnarakshaFX.Synthesizer.playChirp();
        }

        this.switchView(targetId, true);
      });
    });

    // Hash-based deep linking support (e.g. /#view-directory, /#view-grid)
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '').trim();
      if (hash && document.getElementById(hash)) {
        this.switchView(hash, false);
      }
    };

    window.addEventListener('hashchange', handleHash);
    handleHash();
  }

  async initIngestionFeeds() {
    try {
      const res = await fetch('/api/ingestion');
      const json = await res.json();
      if (json.status === 'success' && json.data) {
        this.renderIngestionFeeds(json.data);
      }
    } catch (e) {
      console.warn('[Ingestion] Feed sync warning:', e);
    }

    // Periodic feed refresh
    setInterval(async () => {
      try {
        const res = await fetch('/api/ingestion');
        const json = await res.json();
        if (json.status === 'success' && json.data) {
          this.renderIngestionFeeds(json.data);
        }
      } catch (e) {}
    }, 18000);
  }

  renderIngestionFeeds(data) {
    // Render Agmarknet Mandi Ticker
    const mandiContainer = document.getElementById('hud-mandi-ticker');
    if (mandiContainer && data.live_agmarknet_feed) {
      mandiContainer.innerHTML = data.live_agmarknet_feed.map(m => `
        <div class="ticker-item" style="border-color:rgba(6,182,212,0.3);">
          <span style="color:#06b6d4; font-weight:700;">${m.mandi}:</span>
          <span>${m.crop} <strong>₹${m.modal_price}/qtl</strong></span>
          <span style="color:#10b981; font-size:0.7rem;">(${m.trend})</span>
        </div>
      `).join('');
    }

    // Render Weather Radars
    const weatherContainer = document.getElementById('hud-weather-alerts');
    if (weatherContainer && data.live_imd_weather_alerts) {
      weatherContainer.innerHTML = data.live_imd_weather_alerts.map(w => `
        <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:0.65rem; font-size:0.78rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">
            <strong style="color:#ffffff;">${w.region}</strong>
            <span style="font-size:0.68rem; font-weight:700; color:${w.alert_level.includes('ORANGE') ? '#f43f5e' : (w.alert_level.includes('YELLOW') ? '#f59e0b' : '#10b981')};">${w.alert_level}</span>
          </div>
          <div style="color:#94a3b8;">${w.hazard}</div>
          <div style="color:#06b6d4; font-size:0.72rem; margin-top:2px;">⚡ Action: ${w.action}</div>
        </div>
      `).join('');
    }
  }

  // =========================================================================
  // FEATURE 2: AI Grain Quality & Moisture Verification (First-Mile Scanner)
  // =========================================================================
  initScanner() {
    const presetBtns = document.querySelectorAll('.scanner-preset-btn');
    const uploadInput = document.getElementById('grain-photo-upload');
    const scanBtn = document.getElementById('execute-scan-btn');
    const viewportBox = document.getElementById('scanner-viewport-box');

    presetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        presetBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const preset = btn.getAttribute('data-preset');
        this.runScan({ preset_sample: preset });
      });
    });

    if (uploadInput) {
      uploadInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
          const grainImg = document.getElementById('scanner-grain-image');
          if (grainImg) grainImg.src = evt.target.result;
          this.runScan({ image: evt.target.result });
        };
        reader.readAsDataURL(file);
      });
    }

    // Drag-and-drop zone on optical scanner viewport
    if (viewportBox) {
      viewportBox.addEventListener('dragover', (e) => {
        e.preventDefault();
        viewportBox.classList.add('drag-over');
      });
      viewportBox.addEventListener('dragleave', () => {
        viewportBox.classList.remove('drag-over');
      });
      viewportBox.addEventListener('drop', (e) => {
        e.preventDefault();
        viewportBox.classList.remove('drag-over');
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
          const file = e.dataTransfer.files[0];
          const reader = new FileReader();
          reader.onload = (evt) => {
            const grainImg = document.getElementById('scanner-grain-image');
            if (grainImg) grainImg.src = evt.target.result;
            this.runScan({ image: evt.target.result });
          };
          reader.readAsDataURL(file);
        }
      });
    }

    if (scanBtn) {
      scanBtn.addEventListener('click', () => {
        const activePreset = document.querySelector('.scanner-preset-btn.active');
        const preset = activePreset ? activePreset.getAttribute('data-preset') : 'wheat_high_moisture';
        this.runScan({ preset_sample: preset });
      });
    }

    // Run initial scan on load
    this.runScan({ preset_sample: 'wheat_high_moisture' });
  }

  initCameraCapture() {
    const openBtn = document.getElementById('open-grain-camera-btn');
    const modal = document.getElementById('grain-camera-modal');
    const closeBtn = document.getElementById('grain-camera-close-btn');
    const switchBtn = document.getElementById('grain-camera-switch-btn');
    const captureBtn = document.getElementById('grain-camera-capture-btn');
    const video = document.getElementById('grain-camera-video');
    const statusEl = document.getElementById('grain-camera-status');

    if (!openBtn || !modal || !video) return;

    const stopStream = () => {
      if (this.cameraStream) {
        this.cameraStream.getTracks().forEach(t => t.stop());
        this.cameraStream = null;
      }
      modal.classList.remove('active');
    };

    const startStream = async () => {
      if (this.cameraStream) {
        this.cameraStream.getTracks().forEach(t => t.stop());
        this.cameraStream = null;
      }
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera API not supported by browser environment.');
        }
        if (statusEl) statusEl.textContent = 'Requesting camera hardware feed...';
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: this.cameraFacingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });
        this.cameraStream = stream;
        video.srcObject = stream;
        video.play();
        if (statusEl) statusEl.textContent = 'Align grain kernels flat on tray. Avoid glare.';
      } catch (err) {
        console.warn('[Camera] getUserMedia error:', err);
        if (statusEl) statusEl.innerHTML = `<span style="color:#f87171;">Camera Notice: ${err.message || 'Access denied or unavailable'}. Please use file upload.</span>`;
      }
    };

    openBtn.addEventListener('click', () => {
      modal.classList.add('active');
      startStream();
    });

    if (closeBtn) closeBtn.addEventListener('click', stopStream);

    if (switchBtn) {
      switchBtn.addEventListener('click', () => {
        this.cameraFacingMode = this.cameraFacingMode === 'environment' ? 'user' : 'environment';
        startStream();
      });
    }

    if (captureBtn) {
      captureBtn.addEventListener('click', () => {
        if (!video || !video.videoWidth) {
          alert('Camera stream is not ready yet.');
          return;
        }
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);

        // Stop stream and close viewfinder
        stopStream();

        // Update image preview in scanner
        const grainImg = document.getElementById('scanner-grain-image');
        if (grainImg) grainImg.src = dataUrl;

        // Run AI multimodal inspection
        this.runScan({ image: dataUrl });
      });
    }
  }

  initCertificateModal() {
    const gatePassBtn = document.getElementById('scanner-open-gatepass-btn');
    const modal = document.getElementById('official-inspection-certificate-modal');
    const closeBtn = document.getElementById('cert-close-btn');
    const printBtn = document.getElementById('cert-print-btn');

    if (gatePassBtn) {
      gatePassBtn.addEventListener('click', () => {
        if (this.latestScanData) {
          this.openInspectionCertificate(this.latestScanData);
        } else {
          alert('Please execute a grain scan first before generating the inspection passport.');
        }
      });
    }

    if (closeBtn && modal) {
      closeBtn.addEventListener('click', () => {
        modal.classList.remove('active');
      });
    }

    if (printBtn) {
      printBtn.addEventListener('click', () => {
        window.print();
      });
    }

    // Expose helpers globally
    window.openInspectionCertificateForScan = (scanData) => this.openInspectionCertificate(scanData);
    window.openInspectionCertificateForUnit = (unit) => this.openInspectionCertificateForUnit(unit);
  }

  openInspectionCertificate(data) {
    const modal = document.getElementById('official-inspection-certificate-modal');
    if (!modal) return;

    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setVal('cert-doc-id', data.batch_id || 'AGR-SCAN-88421');
    setVal('cert-timestamp', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST');
    setVal('cert-facility-name', data.location || 'Central Mandi Terminal');
    setVal('cert-grain-type', data.grain_type || 'Wheat');
    setVal('cert-farmer-name', data.source_farmer || 'Kisan Mandi Depositor');
    setVal('cert-vehicle-no', 'MP-09-GA-' + Math.floor(1000 + Math.random() * 9000));

    setVal('cert-moisture', `${data.estimated_moisture}%`);
    setVal('cert-broken', `${data.broken_pct}%`);
    setVal('cert-discolored', `${data.discolored_pct}%`);
    setVal('cert-insects', `${data.insect_damage_count} units / kg`);
    setVal('cert-foreign', `${data.foreign_matter_pct}%`);
    setVal('cert-dts', `${data.days_to_spoilage} Days DTS`);
    setVal('cert-directive', data.recommended_action || data.first_mile_warning);

    const gradeText = document.getElementById('cert-grade-text');
    if (gradeText) gradeText.textContent = data.quality_grade || 'GRADE B';

    // Generate cryptographic hash
    const fakeHash = '0x' + Array.from({length: 32}, () => Math.floor(Math.random()*16).toString(16)).join('').toUpperCase();
    setVal('cert-hash', fakeHash);

    modal.classList.add('active');
  }

  openInspectionCertificateForUnit(unit) {
    const modal = document.getElementById('official-inspection-certificate-modal');
    if (!modal) return;

    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    const batchId = `WDRA-${unit.state.substring(0,2).toUpperCase()}-U${unit.id}-${Math.floor(10000 + Math.random() * 90000)}`;
    setVal('cert-doc-id', batchId);
    setVal('cert-timestamp', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST');
    setVal('cert-facility-name', `${unit.name} (${unit.city}, ${unit.state})`);
    setVal('cert-grain-type', `${unit.grain_type.toUpperCase()} Reserve Stock`);
    setVal('cert-farmer-name', 'National Buffer Stock Allocation');
    setVal('cert-vehicle-no', `Silo Chamber Bay #${unit.id}`);

    setVal('cert-moisture', `${unit.moisture_pct}%`);
    setVal('cert-broken', `3.2%`);
    setVal('cert-discolored', unit.moisture_pct >= 15 ? '6.8%' : '2.1%');
    setVal('cert-insects', unit.risk_level === 'critical' ? '4 units / kg' : '0 units / kg');
    setVal('cert-foreign', '0.8%');
    setVal('cert-dts', unit.predicted_spoilage_date ? `Exp: ${unit.predicted_spoilage_date}` : '> 180 Days (Stable)');
    setVal('cert-directive', unit.risk_level === 'critical' 
      ? 'Mandatory immediate exhaust aeration (4.5h cycle) and inter-facility transfer schedule.'
      : 'Maintain standard nocturnal 30-minute air purge and digital sensor calibration.');

    const gradeText = document.getElementById('cert-grade-text');
    if (gradeText) {
      gradeText.textContent = unit.risk_level === 'critical' ? 'GRADE C (URGENT)' : (unit.risk_level === 'watch' ? 'GRADE B (WATCH)' : 'GRADE A (BUFFER)');
    }

    const fakeHash = '0x' + Array.from({length: 32}, () => Math.floor(Math.random()*16).toString(16)).join('').toUpperCase();
    setVal('cert-hash', fakeHash);

    modal.classList.add('active');
  }

  async runScan(payload) {
    const laser = document.getElementById('scanner-laser');
    const overlay = document.getElementById('scanner-overlays');
    if (laser) laser.style.display = 'block';

    if (window.AnnarakshaFX && window.AnnarakshaFX.Synthesizer) {
      window.AnnarakshaFX.Synthesizer.playHologramSweep();
    }

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (json.status === 'success' && json.data) {
        setTimeout(() => {
          this.renderScanResult(json.data);
        }, 600);
      }
    } catch (e) {
      console.error('[Scanner] Error:', e);
    }
  }

  renderScanResult(data) {
    this.latestScanData = data;

    // Render Detection Bounding Boxes
    const overlays = document.getElementById('scanner-overlays');
    if (overlays) {
      if (data.detection_boxes && data.detection_boxes.length > 0) {
        overlays.innerHTML = data.detection_boxes.map(box => {
          const [top, left, bottom, right] = box.box;
          const width = right - left;
          const height = bottom - top;
          return `
            <div class="detection-box-overlay" style="top:${top}%; left:${left}%; width:${width}%; height:${height}%; border-color:${box.color};">
              <span class="detection-box-label" style="background:${box.color};">${box.label}</span>
            </div>
          `;
        }).join('');
      } else {
        overlays.innerHTML = '';
      }
    }

    // Render Metrics safely
    const setSafeText = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setSafeText('scan-batch-id', data.batch_id || 'AGR-IN-88921-WHT');
    setSafeText('scan-grain-type', data.grain_type || 'Wheat');
    setSafeText('scan-location', data.location || 'First-Mile Gate');
    setSafeText('scan-farmer', data.source_farmer || 'Kisan Cooperative');

    setSafeText('scan-broken', `${data.broken_pct}%`);
    setSafeText('scan-discolored', `${data.discolored_pct}%`);
    setSafeText('scan-insect', `${data.insect_damage_count} units`);
    setSafeText('scan-foreign', `${data.foreign_matter_pct}%`);

    const moistureEl = document.getElementById('scan-moisture');
    if (moistureEl) {
      moistureEl.textContent = `${data.estimated_moisture}%`;
      moistureEl.style.color = data.estimated_moisture >= 15 ? '#f43f5e' : (data.estimated_moisture >= 13 ? '#f59e0b' : '#10b981');
    }

    // Quality Grade Badge
    const gradeBadge = document.getElementById('scan-grade-badge');
    if (gradeBadge) {
      gradeBadge.textContent = data.quality_grade;
      if (data.quality_grade.includes('Grade A')) {
        gradeBadge.className = 'risk-pill risk-pill-healthy';
      } else if (data.quality_grade.includes('Grade B')) {
        gradeBadge.className = 'risk-pill risk-pill-watch';
      } else {
        gradeBadge.className = 'risk-pill risk-pill-critical';
      }
    }

    // Warning Banner
    const warnEl = document.getElementById('scan-warning-text');
    if (warnEl) {
      warnEl.textContent = data.first_mile_warning;
    }

    // Days to spoilage
    const dtsEl = document.getElementById('scan-dts');
    if (dtsEl) {
      dtsEl.textContent = `${data.days_to_spoilage} Days DTS`;
      dtsEl.style.color = data.days_to_spoilage <= 4 ? '#f43f5e' : '#10b981';
    }

    // Action Recommendation
    const actionEl = document.getElementById('scan-action-rec');
    if (actionEl) {
      actionEl.textContent = data.recommended_action;
    }

    // Quick Trigger Work Order button
    const triggerWoBtn = document.getElementById('scan-trigger-wo-btn');
    if (triggerWoBtn) {
      triggerWoBtn.onclick = () => {
        alert(`Automated Work Order Generated for Batch ${data.batch_id} (${data.grain_type}): Sent to facility automation queue!`);
      };
    }

    // Broadcast scan update to Recharts Moisture Trend Chart
    window.dispatchEvent(new CustomEvent('annaraksha:scan-update', {
      detail: {
        grain_type: data.grain_type,
        batch_id: data.batch_id,
        location: data.location,
        estimated_moisture: data.estimated_moisture,
        safe_moisture_limit: data.safe_moisture_limit || 13.0,
        quality_grade: data.quality_grade
      }
    }));
  }

  // =========================================================================
  // FEATURE 4: Automated Preventive Interventions (Work Orders)
  // =========================================================================
  async initWorkOrders() {
    try {
      const res = await fetch('/api/workorders');
      const json = await res.json();
      if (json.status === 'success' && json.data) {
        this.renderWorkOrders(json.data);
      }
    } catch (e) {
      console.warn('[WorkOrders] Error:', e);
    }
  }

  renderWorkOrders(orders) {
    const container = document.getElementById('work-orders-grid');
    if (!container) return;

    container.innerHTML = orders.map(wo => {
      const isProgress = wo.status === 'IN_PROGRESS';
      const isCompleted = wo.status === 'COMPLETED';
      const statusColor = isCompleted ? '#10b981' : (isProgress ? '#06b6d4' : '#f59e0b');

      return `
        <div style="background:rgba(16, 24, 43, 0.85); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:1.25rem; display:flex; flex-direction:column; justify-content:space-between; gap:1rem;">
          <div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
              <span style="font-family:var(--font-mono); font-size:0.75rem; color:#94a3b8; font-weight:700;">${wo.order_id}</span>
              <span style="font-size:0.7rem; font-weight:700; padding:2px 8px; border-radius:9999px; background:${statusColor}22; color:${statusColor}; border:1px solid ${statusColor}55;">
                ● ${wo.status}
              </span>
            </div>
            <h4 style="font-size:1.05rem; font-weight:700; color:#ffffff; margin-bottom:0.25rem;">${wo.type}</h4>
            <div style="font-size:0.8rem; color:#06b6d4;">${wo.facility_name} &bull; ${wo.crop}</div>
            
            <p style="font-size:0.8rem; color:#cbd5e1; margin-top:0.6rem; line-height:1.5;">
              <strong style="color:#f59e0b;">Trigger:</strong> ${wo.trigger_reason}
            </p>

            <div style="margin-top:0.6rem; font-size:0.75rem; background:rgba(0,0,0,0.25); padding:0.6rem; border-radius:8px; border:1px solid rgba(255,255,255,0.05);">
              <div><strong style="color:#94a3b8;">Target:</strong> ${wo.target_parameter}</div>
              <div style="margin-top:3px;"><strong style="color:#94a3b8;">Sequencing:</strong> ${wo.fan_sequence}</div>
              <div style="margin-top:3px; color:#10b981; font-weight:700;">💰 ${wo.estimated_recovery}</div>
            </div>
          </div>

          <div>
            <div style="display:flex; justify-content:space-between; font-size:0.72rem; color:#94a3b8; margin-bottom:0.25rem;">
              <span>Execution Progress</span>
              <span style="font-weight:700; color:#ffffff;">${wo.progress_pct}%</span>
            </div>
            <div style="height:6px; background:#070c18; border-radius:3px; overflow:hidden; margin-bottom:0.75rem;">
              <div style="width:${wo.progress_pct}%; height:100%; background:linear-gradient(90deg, #06b6d4, #10b981); border-radius:3px;"></div>
            </div>

            ${!isCompleted ? `
              <button class="btn btn-primary dispatch-wo-btn" data-id="${wo.order_id}" style="width:100%; padding:0.45rem; font-size:0.78rem;">
                ⚡ Execute Automation Routine
              </button>
            ` : `
              <div style="text-align:center; font-size:0.78rem; color:#10b981; font-weight:700;">
                ✓ Intervention Completed & Telemetry Stabilized
              </div>
            `}
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.dispatch-wo-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        btn.textContent = 'Dispatched to PLC...';
        btn.style.opacity = '0.7';
        try {
          await fetch('/api/workorders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'execute', order_id: id })
          });
          btn.textContent = '● Routine Executing (Active)';
          btn.style.background = '#059669';
        } catch (e) {}
      });
    });
  }

  // =========================================================================
  // FEATURE 5 & 6 & 8: Value-Chain Matchmaker & Waste-to-Profit Arbitrage
  // =========================================================================
  async initValueChain() {
    try {
      const res = await fetch('/api/valuechain');
      const json = await res.json();
      if (json.status === 'success' && json.data) {
        this.renderValueChain(json.data);
      }
    } catch (e) {
      console.warn('[ValueChain] Error:', e);
    }
  }

  renderValueChain(data) {
    const queueContainer = document.getElementById('value-chain-queue');
    if (queueContainer && data.at_risk_routing_queue) {
      queueContainer.innerHTML = data.at_risk_routing_queue.map(q => `
        <div style="background:rgba(16, 24, 43, 0.85); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:1.25rem;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.75rem; flex-wrap:wrap; gap:0.5rem;">
            <div>
              <span style="font-family:var(--font-mono); font-size:0.72rem; color:#06b6d4; font-weight:700;">${q.lot_id}</span>
              <h4 style="font-size:1.05rem; font-weight:800; color:#ffffff;">${q.crop}</h4>
              <div style="font-size:0.78rem; color:#94a3b8;">${q.origin_unit} &bull; Volume: <strong style="color:#ffffff;">${q.volume_tonnes} Tonnes</strong> (${q.current_value})</div>
            </div>
            <span style="background:rgba(16,185,129,0.15); border:1px solid rgba(16,185,129,0.3); color:#34d399; padding:0.25rem 0.65rem; border-radius:9999px; font-size:0.72rem; font-weight:700;">
              ${q.dispatch_status}
            </span>
          </div>

          <div style="background:rgba(6,182,212,0.08); border-left:3px solid #06b6d4; padding:0.75rem; border-radius:0 8px 8px 0; margin-bottom:1rem; font-size:0.8rem;">
            <div style="font-weight:700; color:#06b6d4; margin-bottom:2px;">Optimal Formulation Route: ${q.optimal_route}</div>
            <div style="color:#cbd5e1; line-height:1.5;">${q.conversion_rationale}</div>
          </div>

          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:0.75rem; background:rgba(0,0,0,0.3); padding:0.85rem; border-radius:8px; border:1px solid rgba(255,255,255,0.05); font-size:0.78rem;">
            <div>
              <div style="color:#94a3b8;">Matched Processor</div>
              <div style="font-weight:700; color:#ffffff;">${q.matched_processor.name}</div>
            </div>
            <div>
              <div style="color:#94a3b8;">Distance & Transit</div>
              <div style="font-weight:700; color:#06b6d4;">${q.matched_processor.distance_km} km (${q.matched_processor.transit_hours} hrs)</div>
            </div>
            <div>
              <div style="color:#94a3b8;">Procurement Bid</div>
              <div style="font-weight:700; color:#f59e0b;">${q.matched_processor.procurement_bid_per_qtl} / qtl</div>
            </div>
            <div>
              <div style="color:#94a3b8;">Net Profit Arbitrage</div>
              <div style="font-weight:700; color:#10b981;">${q.matched_processor.net_profit_margin_gain}</div>
            </div>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:1rem; flex-wrap:wrap; gap:0.5rem;">
            <div style="font-size:0.75rem; color:#94a3b8;">
              Institutional Buyer Linkage: <strong style="color:#ffffff;">${q.buyer_lead}</strong>
            </div>
            <button class="btn btn-primary" onclick="alert('Priority Dispatch Route & Digital Gate Permit Dispatched to Transporter!')" style="padding:0.4rem 0.9rem; font-size:0.78rem;">
              Confirm Demand-Driven Dispatch
            </button>
          </div>
        </div>
      `).join('');
    }
  }

  // =========================================================================
  // FEATURE 7: Transit Risk Management & Weighbridge OCR
  // =========================================================================
  async initLogistics() {
    try {
      const res = await fetch('/api/logistics');
      const json = await res.json();
      if (json.status === 'success' && json.data) {
        this.renderLogistics(json.data);
      }
    } catch (e) {
      console.warn('[Logistics] Error:', e);
    }
  }

  renderLogistics(data) {
    const convoysContainer = document.getElementById('logistics-convoys-table');
    if (convoysContainer && data.active_convoys) {
      convoysContainer.innerHTML = data.active_convoys.map(c => `
        <tr>
          <td style="font-family:var(--font-mono); font-weight:700; color:#06b6d4;">${c.truck_id}</td>
          <td>${c.cargo}</td>
          <td>${c.origin} &rarr; ${c.destination}</td>
          <td>${c.route}</td>
          <td><strong>${c.eta}</strong></td>
          <td>
            <span style="font-size:0.72rem; font-weight:700; color:${c.weather_risk.includes('ORANGE') ? '#f43f5e' : (c.weather_risk.includes('REROUTED') ? '#f59e0b' : '#10b981')};">
              ● ${c.weather_risk}
            </span>
          </td>
          <td>
            <span style="font-size:0.75rem; color:${c.weighbridge_status.includes('ALERT') ? '#f43f5e' : '#10b981'};">
              ${c.weighbridge_status}
            </span>
          </td>
        </tr>
      `).join('');
    }
  }

  // =========================================================================
  // FEATURE 9: ESG Impact & Wastage-Averted Ledger
  // =========================================================================
  async initImpact() {
    try {
      const res = await fetch('/api/impact');
      const json = await res.json();
      if (json.status === 'success' && json.data) {
        this.renderImpact(json.data);
      }
    } catch (e) {
      console.warn('[Impact] Error:', e);
    }
  }

  renderImpact(data) {
    const m = data.headline_metrics;
    if (m) {
      const tSavedEl = document.getElementById('impact-tonnes');
      const valSavedEl = document.getElementById('impact-val');
      const co2El = document.getElementById('impact-co2');
      const waterEl = document.getElementById('impact-water');
      const familiesEl = document.getElementById('impact-families');

      if (tSavedEl) tSavedEl.textContent = m.tonnes_grain_saved_display;
      if (valSavedEl) valSavedEl.textContent = m.capital_value_saved_display;
      if (co2El) co2El.textContent = m.co2e_footprint_display;
      if (waterEl) waterEl.textContent = m.water_conserved_display;
      if (familiesEl) familiesEl.textContent = m.households_nourished_display;
    }

    // Render Sparkline
    const canvas = document.getElementById('impact-trend-canvas');
    if (canvas && data.monthly_averted_trend) {
      const ctx = canvas.getContext('2d');
      const w = canvas.width = canvas.parentElement.clientWidth || 500;
      const h = canvas.height = 140;
      ctx.clearRect(0, 0, w, h);

      const trend = data.monthly_averted_trend;
      const maxVal = Math.max(...trend.map(t => t.tonnes_saved)) * 1.15;
      const minVal = 0;
      const stepX = w / (trend.length - 1);

      // Gradient
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 3;
      ctx.beginPath();
      trend.forEach((t, i) => {
        const x = i * stepX;
        const y = h - (t.tonnes_saved / maxVal) * (h - 20) - 10;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      const fillGrad = ctx.createLinearGradient(0, 0, 0, h);
      fillGrad.addColorStop(0, 'rgba(16, 185, 129, 0.3)');
      fillGrad.addColorStop(1, 'rgba(16, 185, 129, 0)');
      ctx.fillStyle = fillGrad;
      ctx.fill();

      // Nodes
      trend.forEach((t, i) => {
        const x = i * stepX;
        const y = h - (t.tonnes_saved / maxVal) * (h - 20) - 10;
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px Inter';
        ctx.fillText(t.month, x - 8, h - 2);
      });
    }
  }
}

window.FuturisticConsole = FuturisticConsole;
