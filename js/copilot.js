/**
 * Annaraksha AI - Copilot Frontend Component
 * Bitexindustries Private Limited / Unbeatable Foods
 * Multi-Turn Conversational Grain Defense & High-Speed Gemini Telemetry
 */

(function () {
  let sessionId = localStorage.getItem('annaraksha_copilot_session');
  if (!sessionId) {
    sessionId = 'sess_' + Math.random().toString(36).substring(2, 11);
    localStorage.setItem('annaraksha_copilot_session', sessionId);
  }

  let currentMode = 'general'; // 'general' | 'search' | 'fast' | 'complex'

  function safePlayAudio(fnName) {
    try {
      const synth = window.AnnarakshaFX?.Synthesizer || window.annarakshaAudio;
      if (synth && typeof synth[fnName] === 'function') {
        synth[fnName]();
        console.log(`[Copilot:Client:6/6] 🔊 Audio trigger "${fnName}" executed successfully.`);
      } else {
        console.debug(`[Copilot:Client:6/6] 🔇 Audio trigger "${fnName}" bypassed (synthesizer not active or method absent).`);
      }
    } catch (audioErr) {
      console.warn(`[Copilot:Client:6/6] ⚠️ Non-fatal audio playback error for "${fnName}":`, audioErr);
    }
  }

  function renderCopilotWidget() {
    // If widget already created, ensure event listeners are bound
    let modal = document.getElementById('copilot-modal');
    let btn = document.getElementById('copilot-btn') || document.getElementById('copilot-toggle-btn');

    if (!modal) {
      const widgetHtml = `
        <!-- Trigger Floating Button -->
        <button id="copilot-btn" class="copilot-trigger-btn" aria-label="Open Annaraksha AI Copilot" title="Open AI Grain Defense Copilot">
          <svg class="sparkle-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
          </svg>
          <span>Ask Copilot</span>
          <span style="font-size:0.65rem; background:rgba(255,255,255,0.2); padding:1px 6px; border-radius:999px; margin-left:2px;">AI</span>
        </button>

        <!-- Copilot Dialog Window -->
        <div id="copilot-modal" class="copilot-modal" role="dialog" aria-modal="true" aria-labelledby="copilot-title">
          <div class="copilot-header">
            <div class="copilot-header-info">
              <div class="copilot-avatar" style="background:linear-gradient(135deg, rgba(6,182,212,0.2), rgba(16,185,129,0.2)); border:1px solid rgba(6,182,212,0.4); display:flex; align-items:center; justify-content:center;">
                <img src="assets/images/logo.png" alt="Annaraksha AI Logo" style="width:24px; height:24px; object-fit:contain; filter:drop-shadow(0 0 5px rgba(16,185,129,0.8));" />
              </div>
              <div>
                <div id="copilot-title" style="font-weight:700; font-size:0.92rem; color:#ffffff; display:flex; align-items:center; gap:6px;">
                  Annaraksha Copilot
                  <button id="copilot-ping-btn" title="Click to test AI engine latency" style="background:rgba(16,185,129,0.15); border:1px solid #10b981; color:#34d399; font-size:0.65rem; padding:1px 6px; border-radius:999px; cursor:pointer;">
                    ⚡ Test AI
                  </button>
                </div>
                <div id="copilot-mode-indicator" style="font-size:0.68rem; color:#34d399; display:flex; align-items:center; gap:4px;">
                  <span style="width:6px; height:6px; background:#34d399; border-radius:50%; display:inline-block; box-shadow:0 0 6px #34d399;"></span>
                  <span id="copilot-model-label">Gemini 3.1 Flash-Lite &bull; Live Telemetry</span>
                </div>
              </div>
            </div>
            <div style="display:flex; align-items:center; gap:6px;">
              <button id="copilot-clear-btn" title="Clear chat history" class="drawer-close-btn" style="font-size:0.75rem; padding:4px 8px; width:auto; border-radius:6px;" aria-label="Clear chat">
                🗑️
              </button>
              <button id="copilot-close-btn" class="drawer-close-btn" aria-label="Close Copilot">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- Task & Model Mode Selector -->
          <div style="display:flex; gap:6px; padding:6px 12px; background:rgba(15, 23, 42, 0.95); border-bottom:1px solid rgba(255, 255, 255, 0.07); overflow-x:auto;">
            <button class="copilot-mode-pill active" data-mode="general" title="General multi-turn agronomic advisor (Gemini 3.1 Flash-Lite)">🌾 General</button>
            <button class="copilot-mode-pill" data-mode="search" title="Google Search Grounding: Live Agmarknet mandi rates & IMD weather">🌐 Live Search</button>
            <button class="copilot-mode-pill" data-mode="fast" title="Fast operational commands (Gemini 3.1 Flash-Lite)">⚡ Ultra-Fast</button>
            <button class="copilot-mode-pill" data-mode="complex" title="Deep multi-silo diagnostic (Gemini Pro)">🔬 Deep Pro</button>
          </div>

          <!-- Diagnostic Toast Banner (hidden by default) -->
          <div id="copilot-diag-banner" style="display:none !important; padding:6px 12px; font-size:0.72rem; background:rgba(6,182,212,0.15); border-bottom:1px solid rgba(6,182,212,0.3); color:#38bdf8; justify-content:space-between; align-items:center;">
            <span id="copilot-diag-text">Testing AI connectivity...</span>
            <button id="copilot-diag-close" style="background:transparent; border:none; color:#94a3b8; cursor:pointer; font-size:0.8rem;">&times;</button>
          </div>

          <div id="copilot-chat" class="copilot-chat-area">
            <div class="chat-bubble chat-bubble-model">
              <p><strong>Welcome to Annaraksha AI Copilot.</strong></p>
              <p>I am connected directly to real-time telemetry across 60 national grain silos, Agmarknet mandi price benchmarks, and IMD atmospheric radars.</p>
              <p>Ask me for root-cause diagnostics, emergency aeration fan schedules, or financial loss prevention calculations.</p>
            </div>
          </div>

          <div class="chips-container" id="prompt-chips">
            <button class="prompt-chip" data-prompt="Which grain storage units are currently at critical risk?">🚨 Critical Units</button>
            <button class="prompt-chip" data-prompt="What are today's Agmarknet mandi rates and MSP benchmarks for Wheat and Chana?">🌐 Live Mandi Rates</button>
            <button class="prompt-chip" data-prompt="Provide an immediate aeration schedule for Unit #28 Akola Pulses Silo to stop thermal respiration.">⚡ Unit #28 Aeration</button>
            <button class="prompt-chip" data-prompt="Calculate total financial capital at risk across watch and critical reserves.">💰 Financial Risk</button>
            <button class="prompt-chip" data-prompt="Check current IMD weather and humidity forecast for North-West transport corridors.">🌧️ IMD Weather</button>
          </div>

          <form id="copilot-form" class="copilot-input-area">
            <input type="text" id="copilot-input" class="copilot-input" placeholder="Ask about spoilage risk, aeration scheduling, or mandi rates..." autocomplete="off" />
            <button type="submit" class="btn btn-primary" style="padding:0.5rem 0.9rem;" id="copilot-send-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="m22 2-7 20-4-9-9-4Z"/>
                <path d="M22 2 11 13"/>
              </svg>
            </button>
          </form>
        </div>
      `;

      document.body.insertAdjacentHTML('beforeend', widgetHtml);
      modal = document.getElementById('copilot-modal');
      btn = document.getElementById('copilot-btn');
    }

    // Inject Styles if needed
    if (!document.getElementById('copilot-mode-style')) {
      const styleEl = document.createElement('style');
      styleEl.id = 'copilot-mode-style';
      styleEl.textContent = `
        .copilot-mode-pill {
          background: rgba(30, 41, 59, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #94a3b8;
          font-size: 0.72rem;
          padding: 3px 9px;
          border-radius: 9999px;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.15s ease;
        }
        .copilot-mode-pill:hover {
          color: #f1f5f9;
          background: rgba(51, 65, 85, 0.8);
        }
        .copilot-mode-pill.active {
          background: rgba(99, 102, 241, 0.25);
          border-color: #6366f1;
          color: #818cf8;
          font-weight: 600;
        }
        .grounding-sources-box {
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px dashed rgba(255, 255, 255, 0.15);
          font-size: 0.72rem;
          color: #94a3b8;
        }
        .grounding-source-tag {
          display: inline-block;
          background: rgba(30, 41, 59, 0.9);
          border: 1px solid rgba(14, 165, 233, 0.3);
          color: #38bdf8;
          padding: 2px 7px;
          border-radius: 4px;
          margin: 3px 4px 0 0;
          text-decoration: none;
        }
        .grounding-source-tag:hover {
          background: rgba(14, 165, 233, 0.2);
        }
      `;
      document.head.appendChild(styleEl);
    }

    const closeBtn = document.getElementById('copilot-close-btn');
    const clearBtn = document.getElementById('copilot-clear-btn');
    const form = document.getElementById('copilot-form');
    const input = document.getElementById('copilot-input');
    const chat = document.getElementById('copilot-chat');
    const chips = document.getElementById('prompt-chips');
    const modeLabel = document.getElementById('copilot-model-label');
    const modePills = document.querySelectorAll('.copilot-mode-pill');
    const pingBtn = document.getElementById('copilot-ping-btn');
    const diagBanner = document.getElementById('copilot-diag-banner');
    const diagText = document.getElementById('copilot-diag-text');
    const diagClose = document.getElementById('copilot-diag-close');

    function openModal() {
      if (!modal) return;
      modal.classList.add('active');
      if (input) input.focus();
      loadChatHistory();
      if (window.AnnarakshaFX?.Synthesizer) {
        window.AnnarakshaFX.Synthesizer.playChirp();
      }
    }

    function closeModal() {
      if (!modal) return;
      modal.classList.remove('active');
    }

    function toggleModal() {
      if (!modal) return;
      if (modal.classList.contains('active')) {
        closeModal();
      } else {
        openModal();
      }
    }

    // Attach open/toggle to main button
    if (btn) {
      btn.addEventListener('click', toggleModal);
    }

    // Also attach to any secondary buttons
    document.querySelectorAll('#copilot-toggle-btn, [data-action="open-copilot"]').forEach(el => {
      el.addEventListener('click', openModal);
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', closeModal);
    }

    // Close on Escape key
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal && modal.classList.contains('active')) {
        closeModal();
      }
    });

    // AI Self-Test Ping
    if (pingBtn) {
      pingBtn.addEventListener('click', async () => {
        pingBtn.textContent = '⏳ Testing...';
        pingBtn.style.color = '#f59e0b';
        console.log('[Copilot:Diag] ⚡ Testing AI connection to /api/copilot/test...');

        if (diagBanner && diagText) {
          diagBanner.style.setProperty('display', 'flex', 'important');
          diagBanner.style.background = 'rgba(6,182,212,0.15)';
          diagBanner.style.borderColor = 'rgba(6,182,212,0.4)';
          diagText.textContent = 'Contacting Gemini 3.1 Flash-Lite diagnostic endpoint...';
        }

        try {
          const t0 = performance.now();
          const res = await fetch('/api/copilot/test');
          const elapsed = Math.round(performance.now() - t0);
          const data = await res.json();
          console.log('[Copilot:Diag] Diagnostic response received:', { status: data.status, latency_ms: data.latency_ms, roundtrip_ms: elapsed });

          if (data.status === 'healthy') {
            pingBtn.textContent = `🟢 ${data.latency_ms}ms`;
            pingBtn.style.color = '#34d399';
            if (diagBanner && diagText) {
              diagBanner.style.setProperty('display', 'flex', 'important');
              diagBanner.style.background = 'rgba(16,185,129,0.15)';
              diagBanner.style.borderColor = 'rgba(16,185,129,0.4)';
              diagText.innerHTML = `<strong>AI Online:</strong> ${data.model} responded in <strong>${data.latency_ms}ms</strong>. Telemetry active.`;
            }
          } else {
            pingBtn.textContent = `⚠️ Fallback`;
            pingBtn.style.color = '#f59e0b';
            if (diagBanner && diagText) {
              diagBanner.style.setProperty('display', 'flex', 'important');
              diagBanner.style.background = 'rgba(245,158,11,0.15)';
              diagBanner.style.borderColor = 'rgba(245,158,11,0.4)';
              diagText.textContent = data.message || 'AI running in local telemetry advisory mode.';
            }
          }

          // Auto-hide diagnostic banner after 4.5s
          setTimeout(() => {
            if (diagBanner) diagBanner.style.setProperty('display', 'none', 'important');
          }, 4500);
          setTimeout(() => {
            if (pingBtn) {
              pingBtn.textContent = '⚡ Test AI';
              pingBtn.style.color = '#34d399';
            }
          }, 6000);
        } catch (err) {
          console.error('[Copilot:Diag] ❌ Diagnostic test failed:', err);
          pingBtn.textContent = '❌ Error';
          pingBtn.style.color = '#f43f5e';
          if (diagBanner && diagText) {
            diagBanner.style.setProperty('display', 'flex', 'important');
            diagBanner.style.background = 'rgba(244,63,94,0.15)';
            diagBanner.style.borderColor = 'rgba(244,63,94,0.4)';
            diagText.textContent = 'Test failed: ' + (err?.message || 'Network error');
          }
          setTimeout(() => {
            if (diagBanner) diagBanner.style.setProperty('display', 'none', 'important');
          }, 5000);
        }
      });
    }

    if (diagClose && diagBanner) {
      diagClose.addEventListener('click', () => {
        diagBanner.style.setProperty('display', 'none', 'important');
      });
    }

    modePills.forEach(pill => {
      pill.addEventListener('click', () => {
        modePills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        currentMode = pill.getAttribute('data-mode') || 'general';
        if (currentMode === 'fast') {
          if (modeLabel) modeLabel.textContent = 'Gemini 3.1 Flash-Lite • Ultra-Fast Telemetry';
        } else if (currentMode === 'search') {
          if (modeLabel) modeLabel.textContent = 'Gemini 3.1 Flash-Lite • Google Search Grounded';
        } else if (currentMode === 'complex') {
          if (modeLabel) modeLabel.textContent = 'Gemini Pro • Deep Reasoning Diagnostic';
        } else {
          if (modeLabel) modeLabel.textContent = 'Gemini 3.1 Flash-Lite • Live Telemetry';
        }
        console.log(`[Copilot:Mode] Switched operational mode to "${currentMode}"`);
        safePlayAudio('playChirp');
      });
    });

    if (clearBtn) {
      clearBtn.addEventListener('click', async () => {
        if (confirm('Start a fresh conversation thread?')) {
          console.log(`[Copilot:Session] Clearing conversation history for session ${sessionId}...`);
          try {
            await fetch('/api/copilot/history', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ session_id: sessionId })
            });
          } catch (e) {
            console.warn('[Copilot:Session] Failed to clear remote history:', e);
          }
          sessionId = 'sess_' + Math.random().toString(36).substring(2, 11);
          localStorage.setItem('annaraksha_copilot_session', sessionId);
          console.log(`[Copilot:Session] New session generated: ${sessionId}`);
          if (chat) {
            chat.innerHTML = `
              <div class="chat-bubble chat-bubble-model">
                <p><strong>Thread refreshed.</strong> New multi-turn session initialized.</p>
                <p>Ask any grain preservation, silo diagnostics, or live market queries.</p>
              </div>
            `;
          }
        }
      });
    }

    if (chips) {
      chips.querySelectorAll('.prompt-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          const text = chip.getAttribute('data-prompt');
          if (text) {
            sendCopilotMessage(text);
          }
        });
      });
    }

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!input) return;
        const text = input.value.trim();
        if (!text) return;
        input.value = '';
        sendCopilotMessage(text);
      });
    }

    // Listen to external requests (e.g. from 3D Silo drawer or Map sidebar)
    window.addEventListener('annaraksha:ask-copilot', (e) => {
      const prompt = e.detail?.prompt;
      if (prompt) {
        openModal();
        sendCopilotMessage(prompt);
      }
    });

    // Also attach to drawer button if already in DOM or later
    function bindDrawerButtons() {
      const drawerBtn = document.getElementById('drawer-ask-copilot');
      if (drawerBtn && !drawerBtn.dataset.bound) {
        drawerBtn.dataset.bound = 'true';
        drawerBtn.addEventListener('click', () => {
          const prompt = "Provide an immediate spoilage mitigation and aeration schedule for the selected grain storage unit.";
          openModal();
          sendCopilotMessage(prompt);
        });
      }
      const siloBtn = document.getElementById('silo-ask-copilot-btn');
      if (siloBtn && !siloBtn.dataset.bound) {
        siloBtn.dataset.bound = 'true';
        siloBtn.addEventListener('click', () => {
          const prompt = "Provide an immediate aeration and temperature dissipation plan for Unit #28 (Akola Core Silo) with 16.8% moisture and 34.8°C thermal respiration.";
          openModal();
          sendCopilotMessage(prompt);
        });
      }
    }
    bindDrawerButtons();
    setTimeout(bindDrawerButtons, 1000);

    async function loadChatHistory() {
      if (!chat || chat.children.length > 1) return;
      try {
        console.log(`[Copilot:History] Fetching history for session ${sessionId}...`);
        const res = await fetch(`/api/copilot/history?session_id=${encodeURIComponent(sessionId)}`);
        const data = await res.json();
        if (data.status === 'success' && Array.isArray(data.messages) && data.messages.length > 0) {
          console.log(`[Copilot:History] Loaded ${data.messages.length} previous messages from server.`);
          chat.innerHTML = '';
          data.messages.forEach(msg => {
            appendMessage(msg.role, msg.message);
          });
        }
      } catch (e) {
        console.warn('[Copilot:History] Could not load prior history:', e);
      }
    }

    async function sendCopilotMessage(text) {
      if (!chat) return;

      const clientReqId = 'req_' + Math.random().toString(36).substring(2, 8);
      const tStart = performance.now();

      // Lifecycle Stage 1: User input submitted
      console.group(`[Copilot Lifecycle] #${clientReqId}`);
      console.log(`[Copilot:Client:1/6] 📝 User Input Submitted | Session=${sessionId} | Mode=${currentMode} | Length=${text.length}`);
      console.log(`  Preview: "${text.substring(0, 60)}..."`);

      appendMessage('user', text);
      safePlayAudio('playChirp');

      // Typing indicator
      const typingId = 'typing_' + Date.now();
      const typingDiv = document.createElement('div');
      typingDiv.className = 'chat-bubble chat-bubble-model';
      typingDiv.id = typingId;
      typingDiv.innerHTML = `<span style="color:#94a3b8; font-style:italic; display:inline-flex; align-items:center; gap:6px;"><span class="ticker-pulse" style="background:#06b6d4;"></span> Annaraksha AI analyzing live telemetry and grain models...</span>`;
      chat.appendChild(typingDiv);
      chat.scrollTop = chat.scrollHeight;

      let responseData = null;

      // Lifecycle Stage 2: Request Dispatched
      const payload = {
        session_id: sessionId,
        message: text,
        mode: currentMode
      };
      const serialized = JSON.stringify(payload);
      console.log(`[Copilot:Client:2/6] 📡 Request Dispatched -> POST /api/copilot (${serialized.length} bytes)`);

      try {
        const res = await fetch('/api/copilot', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: serialized
        });

        const roundtripMs = Math.round(performance.now() - tStart);

        // Lifecycle Stage 3: HTTP Response Received
        console.log(`[Copilot:Client:3/6] 📥 HTTP Response Received | Status=${res.status} (${res.statusText || 'OK'}) | Roundtrip=${roundtripMs}ms`);

        const typingEl = document.getElementById(typingId);
        if (typingEl) typingEl.remove();

        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          const errMsg = errJson.message || `Server returned HTTP ${res.status}`;
          console.error(`[Copilot:Client:ERROR] ❌ Server responded with error status ${res.status}:`, errJson);
          appendMessage('model', `⚠️ **Server Notice (${res.status})**: ${errMsg}\n\nPlease verify your query or click **⚡ Test AI** above.`);
          console.groupEnd();
          return;
        }

        responseData = await res.json();
      } catch (netErr) {
        console.error(`[Copilot:Client:ERROR] ❌ Network/Transport Failure in dispatch:`, netErr);
        const typingEl = document.getElementById(typingId);
        if (typingEl) typingEl.remove();
        appendMessage('model', `⚠️ **Network Notice**: Unable to reach AI Gateway (${netErr.message || 'Check connection'}). Local telemetry monitoring remains active.`);
        console.groupEnd();
        return;
      }

      // Lifecycle Stage 4: Payload Decoded
      console.log(`[Copilot:Client:4/6] 📦 Payload Decoded | Status=${responseData?.status} | ModelUsed="${responseData?.model_used}" | SearchGrounded=${responseData?.search_grounded} | Citations=${responseData?.sources?.length || 0} | ReplyChars=${responseData?.reply?.length || 0}`);

      // Lifecycle Stage 5: Render UI Bubble
      try {
        if (responseData && responseData.status === 'success') {
          appendMessage('model', responseData.reply, responseData.model_used, responseData.sources, responseData.search_grounded);
          console.log(`[Copilot:Client:5/6] 🎨 Rendering UI Bubble | Successfully appended to DOM`);

          // Lifecycle Stage 6: Audio Feedback Trigger
          safePlayAudio('playSonarPing');
        } else {
          console.warn('[Copilot:Client:4/6] ⚠️ Response status was not "success":', responseData);
          appendMessage('model', '⚠️ ' + (responseData?.message || 'Error generating agronomic advice.'));
        }
      } catch (renderErr) {
        console.error(`[Copilot:Client:ERROR] ❌ DOM Rendering Error:`, renderErr);
        appendMessage('model', '⚠️ Render Error: Could not format response bubble. Live telemetry data remains safe.');
      }

      console.log(`[Copilot Lifecycle Complete] Total client lifecycle took ${Math.round(performance.now() - tStart)}ms`);
      console.groupEnd();
    }

    function appendMessage(role, rawText, modelUsed, sources, searchGrounded) {
      if (!chat) return;
      const div = document.createElement('div');
      div.className = `chat-bubble chat-bubble-${role}`;

      let html = formatMarkdown(rawText);

      // Add badge for model and search grounding
      if (role === 'model' && (modelUsed || searchGrounded)) {
        let badgeText = modelUsed || 'Gemini 3.1 Flash-Lite';
        if (searchGrounded && !badgeText.includes('Search Grounded')) {
          badgeText += ' • 🌐 Google Search Grounded';
        }
        html = `<div style="font-size:0.68rem; color:#64748b; margin-bottom:6px; font-weight:600; display:flex; align-items:center; gap:4px;"><span style="color:#06b6d4;">🤖</span> ${badgeText}</div>` + html;
      }

      // Add sources if available
      if (sources && Array.isArray(sources) && sources.length > 0) {
        const sourceLinks = sources.map(s => {
          return `<a href="${s.uri}" target="_blank" rel="noopener noreferrer" class="grounding-source-tag">${s.title || 'Source'} ↗</a>`;
        }).join('');
        html += `
          <div class="grounding-sources-box">
            <span style="font-weight:600; color:#38bdf8;">🌐 Verified Grounding Sources:</span><br>
            ${sourceLinks}
          </div>
        `;
      }

      div.innerHTML = html;
      chat.appendChild(div);
      chat.scrollTop = chat.scrollHeight;
    }

    function formatMarkdown(text) {
      if (!text) return '';
      let clean = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      // Bold **text**
      clean = clean.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      // Italic *text*
      clean = clean.replace(/\*(.*?)\*/g, '<em>$1</em>');
      // Headers ### Title
      clean = clean.replace(/^### (.*$)/gim, '<h4 style="margin:8px 0 4px; font-weight:700; color:#e2e8f0;">$1</h4>');
      clean = clean.replace(/^## (.*$)/gim, '<h3 style="margin:10px 0 6px; font-weight:800; color:#f8fafc;">$1</h3>');
      // Horizontal rules
      clean = clean.replace(/^---$/gim, '<hr style="border:none; border-top:1px solid rgba(255,255,255,0.1); margin:10px 0;">');
      // Bullet lists
      clean = clean.replace(/^\* (.*$)/gim, '<li>$1</li>');
      clean = clean.replace(/^- (.*$)/gim, '<li>$1</li>');
      // Numbered lists
      clean = clean.replace(/^\d+\.\s+(.*$)/gim, '<li>$1</li>');
      clean = clean.replace(/(<li>.*<\/li>)/s, '<ul style="padding-left:1.2rem; margin:6px 0;">$1</ul>');
      // Paragraphs & breaks
      clean = clean.replace(/\n\n/g, '<p style="margin:6px 0;"></p>');
      clean = clean.replace(/\n/g, '<br>');

      return clean;
    }
  }

  // Auto-init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderCopilotWidget);
  } else {
    renderCopilotWidget();
  }
})();
