/**
 * Annaraksha AI - Agri-Community Hub & Trade Exchange Engine
 * Data Models & State Management (Step 2)
 * Bitexindustries Private Limited / Unbeatable Foods
 */

class AgriCommunityHub {
  constructor() {
    // Central Reactive State Store
    this.state = {
      kpis: {
        live_voice_rooms: 3,
        online_listeners: 42,
        active_deals: 18,
        matched_volume_cr: 4.82,
        online_stakeholders: 128
      },
      rooms: [],
      channels: {
        'storage-operators': [],
        'food-processors': [],
        'transport-drivers': [],
        'emergency-grain-rescue': []
      },
      deals: [],
      bids: [],
      activeVoiceRoomId: null,
      activeVoiceRoom: null,
      isMicMuted: true,
      isDeafened: false,
      isHandRaised: false,
      currentRoleFilter: 'all',
      currentVoiceFilter: 'all',
      currentChatChannel: 'storage-operators',
      currentDealFilter: 'all',
      activeBidTargetDeal: null,
      currentUser: {
        id: 'usr-station-28',
        name: 'You (Station Operator)',
        role: 'STORAGE UNIT',
        org: 'Central Silo #28 Akola',
        initials: 'OP',
        avatarBg: 'linear-gradient(135deg, #0284c7, #0369a1)',
        roleColor: '#38bdf8'
      }
    };

    // Live Communication & Web Audio Engine Instances
    this.audioContext = null;
    this.audioAnalyser = null;
    this.audioStream = null;
    this.animFrameId = null;
    this.isSpeaking = false;
    this.eventSource = null;
    this.handQueue = [];

    // Real-Time Canvas Equalizer & DSP Level State
    this.peakBands = new Array(32).fill(0);
    this.peakDecay = new Array(32).fill(0);
    this.smoothedLevel = 0;
    this.speakingHangTimer = null;
    this.lastSpeakingBroadcast = 0;
    this.isSimulatingVoice = false;
    this.simVoiceTimer = null;
    this.simPhase = 0;
    this.freqDataArray = null;
    this.timeDataArray = null;

    this.init();
  }

  async init() {
    this.bindHeaderBadge();
    this.bindRoleFilters();
    this.bindVoiceFilters();
    this.bindChatChannels();
    this.bindDealFilters();
    this.bindModals();
    this.bindInRoomVoiceControls();
    this.bindChatInput();
    this.initEscrowCalculator();

    // Hydrate state from backend
    await this.fetchState();

    // Connect to real-time Server-Sent Events (SSE) stream
    this.initEventSource();
  }

  // ---------------------------------------------------------------------------
  // 1. Data Model & State Fetching
  // ---------------------------------------------------------------------------
  async fetchState() {
    try {
      const res = await fetch('/api/community/state');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (data && data.status === 'success') {
        if (data.kpis) this.state.kpis = data.kpis;
        if (Array.isArray(data.rooms)) this.state.rooms = data.rooms;
        if (data.channels) this.state.channels = data.channels;
        if (Array.isArray(data.deals)) this.state.deals = data.deals;
        if (Array.isArray(data.bids)) this.state.bids = data.bids;

        this.renderAll();
      }
    } catch (err) {
      console.warn('[AgriCommunityHub] State hydration warning (fallback to DOM/default):', err);
    }
  }

  renderAll() {
    this.renderKPIs();
    this.renderRooms();
    this.renderChatMessages();
    this.renderDeals();
  }

  renderKPIs() {
    const kpiRooms = document.getElementById('comm-kpi-rooms');
    const kpiListeners = document.getElementById('comm-kpi-listeners');
    const kpiDeals = document.getElementById('comm-kpi-deals');
    const kpiMatched = document.getElementById('comm-kpi-matched');

    const liveRoomsCount = this.state.rooms.filter(r => r.is_active).length || this.state.kpis.live_voice_rooms;
    const totalListeners = this.state.rooms.reduce((acc, r) => acc + (Number(r.listeners_count) || 0), 24);

    if (kpiRooms) kpiRooms.textContent = `${liveRoomsCount} LIVE STAGES`;
    if (kpiListeners) kpiListeners.textContent = `${totalListeners} ONLINE`;
    if (kpiDeals) kpiDeals.textContent = `${this.state.deals.length || 18} ACTIVE`;
    if (kpiMatched) kpiMatched.textContent = `₹${this.state.kpis.matched_volume_cr.toFixed(2)} CR MATCHED`;

    // Also update header tab indicator badge if present
    const headerPill = document.getElementById('hud-community-text-pill');
    if (headerPill) {
      const liveBadge = headerPill.querySelector('.comm-live-badge');
      if (liveBadge) liveBadge.textContent = `${liveRoomsCount} LIVE`;
    }
  }

  // ---------------------------------------------------------------------------
  // 2. Voice Stage Rendering & Actions
  // ---------------------------------------------------------------------------
  renderRooms() {
    const container = document.getElementById('comm-voice-rooms-list');
    if (!container) return;

    const filtered = this.state.rooms.filter(room => {
      // Role filter
      if (this.state.currentRoleFilter !== 'all' && room.target_role !== 'all' && room.target_role !== this.state.currentRoleFilter) {
        return false;
      }
      // Voice stage type filter (all, public, private)
      if (this.state.currentVoiceFilter !== 'all' && room.room_type !== this.state.currentVoiceFilter) {
        return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="padding:2rem 1rem; text-align:center; color:var(--hud-muted); font-size:0.85rem; border:1px dashed var(--hud-border); border-radius:8px;">
          No active voice stages match the current filter (${this.state.currentRoleFilter} / ${this.state.currentVoiceFilter}).
          <br><button class="btn btn-secondary btn-sm" style="margin-top:0.6rem;" onclick="window.agriCommunityHub?.openModal('comm-create-room-modal')">➕ Initiate Discussion Stage</button>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(room => {
      const isPrivate = room.room_type === 'private';
      const isCurrentActive = this.state.activeVoiceRoomId === room.id;
      const speakers = Array.isArray(room.active_speakers) ? room.active_speakers : [];

      const speakerAvatars = speakers.map(spk => `
        <div class="comm-speaker-avatar ${spk.isSpeaking ? 'is-speaking' : ''}" title="${this.escapeHtml(spk.name)} (${this.escapeHtml(spk.role)})">
          ${this.escapeHtml(spk.initials || spk.name.substring(0, 2).toUpperCase())}
        </div>
      `).join('');

      return `
        <div class="comm-voice-card ${isCurrentActive ? 'is-active-room' : ''}" data-room-id="${room.id}" data-room-type="${room.room_type}" data-target-role="${room.target_role}">
          <div class="comm-voice-header">
            <span class="comm-voice-badge ${isPrivate ? 'comm-badge-private' : 'comm-badge-live'}">
              ${isPrivate ? '🔒 PRIVATE DESK' : '🟢 LIVE STAGE'} • ${room.listeners_count || 1} PARTICIPANTS
            </span>
            <span class="comm-voice-role-tag">${(room.target_role || 'ALL').toUpperCase()}</span>
          </div>
          <h4 class="comm-voice-title">${this.escapeHtml(room.title)}</h4>
          <div class="comm-voice-host">
            Hosted by <strong>${this.escapeHtml(room.host_name)}</strong> • <span style="color:var(--hud-muted);">${this.escapeHtml(room.host_org)}</span>
          </div>
          <p style="font-size:0.75rem; color:var(--hud-muted); margin:0.4rem 0 0.6rem; line-height:1.4;">
            ${this.escapeHtml(room.description || '')}
          </p>
          <div class="comm-voice-avatars-row">
            ${speakerAvatars}
            <span style="font-size:0.7rem; color:var(--hud-muted); margin-left:auto; display:flex; align-items:center; gap:4px;">
              <span>🔊</span> Active Audio Feed
            </span>
          </div>
          <button class="comm-join-room-btn btn ${isCurrentActive ? 'btn-secondary' : 'btn-primary'}" data-room-id="${room.id}">
            <span>${isCurrentActive ? '🟢 Connected to Audio' : isPrivate ? '🔑 Enter Passkey' : '🎙️ Join Discussion Stage'}</span>
          </button>
        </div>
      `;
    }).join('');

    // Bind join action on newly rendered buttons
    container.querySelectorAll('.comm-join-room-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const roomId = btn.getAttribute('data-room-id');
        this.handleJoinRequest(roomId);
      });
    });
  }

  async handleJoinRequest(roomId) {
    const room = this.state.rooms.find(r => r.id === roomId);
    if (!room) return;

    if (room.room_type === 'private') {
      const passkey = prompt(`Institutional Access Required:\nEnter 4-digit Passkey for "${room.title}":\n(Default Demo Passkey: 2026)`);
      if (!passkey) return;

      try {
        const res = await fetch(`/api/community/rooms/${roomId}/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ passkey: passkey.trim() })
        });
        const result = await res.json();
        if (!res.ok || result.status !== 'success') {
          alert(result.message || 'Passkey authentication rejected.');
          return;
        }
        this.setActiveVoiceRoom(result.room || room);
      } catch (err) {
        // Local fallback check
        if (passkey.trim() === (room.passkey || '2026')) {
          this.setActiveVoiceRoom(room);
        } else {
          alert('Invalid room passkey.');
          return;
        }
      }
    } else {
      // Public room
      try {
        fetch(`/api/community/rooms/${roomId}/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        }).catch(() => {});
      } catch (e) {}

      this.setActiveVoiceRoom(room);
    }
  }

  setActiveVoiceRoom(room) {
    this.state.activeVoiceRoomId = room.id;
    this.state.activeVoiceRoom = room;

    const dock = document.getElementById('comm-active-voice-dock');
    const dockTitle = document.getElementById('comm-dock-room-title');
    if (dockTitle) dockTitle.textContent = room.title;
    if (dock) {
      dock.style.display = 'flex';
      dock.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // Immediately start the high-definition canvas visualization loop in standby mode
    this.startDockVisualizerLoop();

    this.renderRooms();

    if (window.AnnarakshaFX && window.AnnarakshaFX.Synthesizer) {
      window.AnnarakshaFX.Synthesizer.playNotification();
    }
  }

  leaveVoiceRoom() {
    this.stopMicrophone();
    this.stopDockVisualizerLoop();
    this.state.isHandRaised = false;
    const handBtn = document.getElementById('comm-dock-hand-btn');
    if (handBtn) {
      handBtn.classList.remove('active-hand');
      const lbl = handBtn.querySelector('.dock-lbl');
      if (lbl) lbl.textContent = 'Raise Hand';
    }

    if (this.state.activeVoiceRoomId) {
      const rid = this.state.activeVoiceRoomId;
      fetch(`/api/community/rooms/${rid}/leave`, { method: 'POST' }).catch(() => {});
    }

    this.state.activeVoiceRoomId = null;
    this.state.activeVoiceRoom = null;

    const dock = document.getElementById('comm-active-voice-dock');
    if (dock) {
      dock.style.display = 'none';
      dock.classList.remove('dock-speaking');
    }

    this.renderRooms();

    if (window.AnnarakshaFX && window.AnnarakshaFX.Synthesizer) {
      window.AnnarakshaFX.Synthesizer.playChirp();
    }
  }

  // ---------------------------------------------------------------------------
  // 3. Stakeholder Chat Stream Rendering & Actions
  // ---------------------------------------------------------------------------
  renderChatMessages() {
    const container = document.getElementById('comm-chat-messages-container');
    if (!container) return;

    const channelMsgs = this.state.channels[this.state.currentChatChannel] || [];

    if (channelMsgs.length === 0) {
      container.innerHTML = `
        <div style="padding:2.5rem 1rem; text-align:center; color:var(--hud-muted); font-size:0.85rem;">
          No messages posted yet in #${this.state.currentChatChannel}.
          <br>Start the conversation or broadcast a spot offer below!
        </div>
      `;
      return;
    }

    container.innerHTML = channelMsgs.map(msg => {
      let attachmentHtml = '';

      if (msg.attachment_type === 'cv-grain-scan' && msg.attachment_data) {
        const att = msg.attachment_data;
        attachmentHtml = `
          <div class="comm-chat-attachment cv-scan">
            <div class="att-header">
              <span class="att-icon">🔬</span>
              <span class="att-title">CV Grain Scan Telemetry • ${this.escapeHtml(att.batchId || '')}</span>
              <span class="att-badge" style="margin-left:auto; background:rgba(239, 68, 68, 0.2); color:#f87171; border:1px solid #ef4444; font-size:0.65rem; padding:2px 6px; border-radius:4px;">
                ${this.escapeHtml(att.risk || 'ALERT')}
              </span>
            </div>
            <div class="att-body-grid">
              <div class="att-grid-item">
                <span class="lbl">Commodity:</span>
                <span class="val">${this.escapeHtml(att.commodity || 'Wheat')}</span>
              </div>
              <div class="att-grid-item">
                <span class="lbl">Moisture:</span>
                <span class="val" style="color:#f87171; font-weight:700;">${this.escapeHtml(att.moisture || '16.8%')}</span>
              </div>
              <div class="att-grid-item">
                <span class="lbl">Damaged Kernel:</span>
                <span class="val">${this.escapeHtml(att.damaged || '7.2%')}</span>
              </div>
              <div class="att-grid-item">
                <span class="lbl">Action:</span>
                <span class="val" style="color:var(--hud-accent);">Offtake / Aerate</span>
              </div>
            </div>
          </div>
        `;
      } else if (msg.attachment_type === 'price-bid' && msg.attachment_data) {
        const att = msg.attachment_data;
        attachmentHtml = `
          <div class="comm-chat-attachment price-bid">
            <div class="att-header">
              <span class="att-icon">⚡</span>
              <span class="att-title">Instant Escrow Quote • ${this.escapeHtml(att.status || 'ACTIVE BID')}</span>
              <span class="att-badge" style="margin-left:auto; background:rgba(16, 185, 129, 0.2); color:#34d399; border:1px solid #10b981; font-size:0.65rem; padding:2px 6px; border-radius:4px;">
                T+0 SETTLEMENT
              </span>
            </div>
            <div class="att-body-grid">
              <div class="att-grid-item">
                <span class="lbl">Rate Offer:</span>
                <span class="val" style="color:#34d399; font-weight:700;">${this.escapeHtml(att.bidRate || '')}</span>
              </div>
              <div class="att-grid-item">
                <span class="lbl">Volume:</span>
                <span class="val">${this.escapeHtml(att.volume || '')}</span>
              </div>
              <div class="att-grid-item" style="grid-column: span 2;">
                <span class="lbl">Escrow Terms:</span>
                <span class="val">${this.escapeHtml(att.payment || 'Direct Clearing')}</span>
              </div>
            </div>
          </div>
        `;
      }

      return `
        <div class="comm-chat-msg" data-channel="${msg.channel}" style="display:flex;">
          <div class="comm-chat-avatar" style="background:${msg.avatar_bg || 'linear-gradient(135deg, #0284c7, #0369a1)'};">
            ${this.escapeHtml(msg.avatar_initials || 'ST')}
          </div>
          <div class="comm-chat-content">
            <div class="comm-chat-meta">
              <span class="comm-chat-sender">${this.escapeHtml(msg.sender_name)}</span>
              <span class="comm-chat-role-pill" style="border-color:${this.getRoleBorderColor(msg.sender_role)}; color:${this.getRoleBorderColor(msg.sender_role)};">
                ${this.escapeHtml(msg.sender_role)}
              </span>
              <span class="comm-chat-time">${this.escapeHtml(msg.created_at || 'Just now')}</span>
            </div>
            <div class="comm-chat-body">
              ${this.escapeHtml(msg.message)}
              ${attachmentHtml}
            </div>
          </div>
        </div>
      `;
    }).join('');

    container.scrollTop = container.scrollHeight;
  }

  getRoleBorderColor(role) {
    if (!role) return '#38bdf8';
    const r = role.toUpperCase();
    if (r.includes('PROCESSOR')) return '#34d399';
    if (r.includes('LOGISTICS') || r.includes('DRIVER')) return '#fbbf24';
    if (r.includes('NEURAL') || r.includes('BOT') || r.includes('DISASTER')) return '#f43f5e';
    return '#38bdf8';
  }

  async sendChatMessage(text) {
    if (!text || !text.trim()) return;

    const payload = {
      channel: this.state.currentChatChannel,
      sender_name: this.state.currentUser.name,
      sender_role: this.state.currentUser.role,
      sender_org: this.state.currentUser.org,
      avatar_initials: this.state.currentUser.initials,
      avatar_bg: this.state.currentUser.avatarBg,
      message: text.trim()
    };

    // Optimistic UI push
    const tempMsg = {
      id: Date.now(),
      ...payload,
      created_at: 'Just now'
    };
    if (!this.state.channels[this.state.currentChatChannel]) {
      this.state.channels[this.state.currentChatChannel] = [];
    }
    this.state.channels[this.state.currentChatChannel].push(tempMsg);
    this.renderChatMessages();

    if (window.AnnarakshaFX && window.AnnarakshaFX.Synthesizer) {
      window.AnnarakshaFX.Synthesizer.playChirp();
    }

    try {
      const res = await fetch('/api/community/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data && data.status === 'success' && data.message) {
        // Replace temp msg with server payload
        const list = this.state.channels[this.state.currentChatChannel];
        const idx = list.findIndex(m => m.id === tempMsg.id);
        if (idx !== -1) list[idx] = data.message;
      }
    } catch (err) {
      console.warn('Chat send network warning:', err);
    }
  }

  // ---------------------------------------------------------------------------
  // 4. Trade Exchange Deals Rendering & Actions
  // ---------------------------------------------------------------------------
  renderDeals() {
    const container = document.getElementById('comm-deals-feed-list');
    if (!container) return;

    const filtered = this.state.deals.filter(deal => {
      // Role filter
      if (this.state.currentRoleFilter !== 'all' && deal.target_role !== 'all' && deal.target_role !== this.state.currentRoleFilter) {
        return false;
      }
      // Deal category filter
      if (this.state.currentDealFilter !== 'all' && deal.deal_type !== this.state.currentDealFilter) {
        return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="padding:2rem 1rem; text-align:center; color:var(--hud-muted); font-size:0.85rem; border:1px dashed var(--hud-border); border-radius:8px;">
          No trade deals match the current category filter (${this.state.currentDealFilter}).
          <br><button class="btn btn-secondary btn-sm" style="margin-top:0.6rem;" onclick="window.agriCommunityHub?.openModal('comm-post-deal-modal')">➕ Publish Trade Deal</button>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(deal => {
      const type = deal.deal_type || 'grain-sale';
      const badgeLabel = type === 'grain-sale' ? '🌾 SPOT GRAIN OFFER'
        : type === 'buyer-bid' ? '🏭 BUYER TENDER'
        : type === 'logistics' ? '🚚 FREIGHT CAPACITY'
        : '🏢 SILO LEASE';

      return `
        <div class="comm-deal-card" data-deal-id="${deal.id}" data-deal-type="${type}" data-deal-role="${deal.target_role}">
          <div class="comm-deal-top">
            <span class="comm-deal-badge ${type}">${badgeLabel}</span>
            <span class="comm-deal-urgent">${this.escapeHtml(deal.urgent_label || 'ACTIVE')}</span>
          </div>
          <h4 class="comm-deal-title">${this.escapeHtml(deal.title)}</h4>
          <div class="comm-deal-origin">📍 ${this.escapeHtml(deal.origin)}</div>
          <div class="comm-deal-metrics">
            <div class="comm-metric-box">
              <div class="lbl">Price Quote</div>
              <div class="val comm-deal-price-val">${this.escapeHtml(deal.price_spec)}</div>
            </div>
            <div class="comm-metric-box">
              <div class="lbl">Moisture / Spec</div>
              <div class="val">${this.escapeHtml(deal.moisture_spec || 'Standard')}</div>
            </div>
          </div>
          <div style="font-size:0.7rem; color:var(--hud-muted); margin-bottom:0.6rem; display:flex; justify-content:space-between;">
            <span>⏱️ ${this.escapeHtml(deal.horizon || 'Immediate Offtake')}</span>
            <span>📦 ${this.escapeHtml(String(deal.volume_tonnes || ''))} Tonnes</span>
          </div>
          <div class="comm-deal-actions">
            <button class="btn btn-primary comm-deal-bid-btn" data-deal-id="${deal.id}" style="flex:1; font-size:0.75rem; padding:0.4rem;">
              ⚡ Instant Escrow Bid
            </button>
            <button class="btn btn-secondary comm-deal-chat-btn" data-deal-type="${type}" style="font-size:0.75rem; padding:0.4rem;">
              💬 Chat Desk
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Bind Instant Bid buttons
    container.querySelectorAll('.comm-deal-bid-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const dealId = btn.getAttribute('data-deal-id');
        this.openBidModal(dealId);
      });
    });

    // Bind Chat Desk buttons
    container.querySelectorAll('.comm-deal-chat-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const type = btn.getAttribute('data-deal-type');
        const targetChannel = type === 'grain-sale' ? 'storage-operators'
          : type === 'buyer-bid' ? 'food-processors'
          : 'transport-drivers';
        this.switchChatChannel(targetChannel);
      });
    });
  }

  // ---------------------------------------------------------------------------
  // 5. Filter & Navigation Bindings
  // ---------------------------------------------------------------------------
  bindHeaderBadge() {
    const badgeBtn = document.getElementById('hud-community-badge');
    const textPillBtn = document.getElementById('hud-community-text-pill');

    const openCommunity = () => {
      if (window.AnnarakshaFX && window.AnnarakshaFX.Synthesizer) {
        window.AnnarakshaFX.Synthesizer.playChirp();
      }
      if (window.futuristicConsole && typeof window.futuristicConsole.switchView === 'function') {
        window.futuristicConsole.switchView('view-community');
      } else {
        const pane = document.getElementById('view-community');
        if (pane) {
          document.querySelectorAll('.hud-module-pane').forEach(p => p.style.display = 'none');
          pane.style.display = 'block';
        }
      }
    };

    if (badgeBtn) badgeBtn.addEventListener('click', openCommunity);
    if (textPillBtn) textPillBtn.addEventListener('click', openCommunity);

    const openCreateRoomBtn = document.getElementById('comm-btn-create-room');
    if (openCreateRoomBtn) {
      openCreateRoomBtn.addEventListener('click', () => this.openModal('comm-create-room-modal'));
    }

    const openPostDealBtn = document.getElementById('comm-btn-post-deal');
    if (openPostDealBtn) {
      openPostDealBtn.addEventListener('click', () => this.openModal('comm-post-deal-modal'));
    }
  }

  bindRoleFilters() {
    const roleBtns = document.querySelectorAll('.comm-role-filter-btn');
    roleBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        roleBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const role = btn.getAttribute('data-role') || 'all';
        this.state.currentRoleFilter = role;

        this.renderRooms();
        this.renderDeals();

        // Auto-switch to most relevant chat channel
        if (role === 'producers') this.switchChatChannel('storage-operators');
        else if (role === 'processors') this.switchChatChannel('food-processors');
        else if (role === 'logistics') this.switchChatChannel('transport-drivers');

        if (window.AnnarakshaFX && window.AnnarakshaFX.Synthesizer) {
          window.AnnarakshaFX.Synthesizer.playChirp();
        }
      });
    });
  }

  bindVoiceFilters() {
    const vFilterBtns = document.querySelectorAll('.comm-vfilter-btn');
    vFilterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        vFilterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const filter = btn.getAttribute('data-vfilter') || 'all';
        this.state.currentVoiceFilter = filter;
        this.renderRooms();
      });
    });
  }

  bindChatChannels() {
    const channelBtns = document.querySelectorAll('.comm-channel-tab-btn');
    channelBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const channelId = btn.getAttribute('data-channel');
        this.switchChatChannel(channelId);
      });
    });
  }

  switchChatChannel(channelId) {
    if (!channelId) return;
    this.state.currentChatChannel = channelId;

    const channelBtns = document.querySelectorAll('.comm-channel-tab-btn');
    channelBtns.forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-channel') === channelId);
    });

    const channelNameMap = {
      'storage-operators': '#storage-operators • CWC & Silo Managers',
      'food-processors': '#food-processors • Millers, Crushers & Buyers',
      'transport-drivers': '#transport-drivers • Logistics & Fleet Leads',
      'emergency-grain-rescue': '#emergency-grain-rescue • High Moisture Spoilage Offtake'
    };

    const headerEl = document.getElementById('comm-chat-active-title');
    if (headerEl) {
      headerEl.textContent = channelNameMap[channelId] || `#${channelId}`;
    }

    // Clear unread badge
    const activeBtn = document.querySelector(`.comm-channel-tab-btn[data-channel="${channelId}"]`);
    const badge = activeBtn?.querySelector('.comm-unread-badge');
    if (badge) badge.style.display = 'none';

    this.renderChatMessages();

    if (window.AnnarakshaFX && window.AnnarakshaFX.Synthesizer) {
      window.AnnarakshaFX.Synthesizer.playChirp();
    }
  }

  bindChatInput() {
    const form = document.getElementById('comm-chat-form');
    const input = document.getElementById('comm-chat-input');

    if (form && input) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = input.value.trim();
        if (!text) return;
        this.sendChatMessage(text);
        input.value = '';
      });
    }

    document.querySelectorAll('.comm-quick-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const text = chip.getAttribute('data-snippet');
        if (input && text) {
          input.value = text;
          input.focus();
        }
      });
    });
  }

  bindDealFilters() {
    const dealFilterBtns = document.querySelectorAll('.comm-deal-filter-btn');
    dealFilterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        dealFilterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const category = btn.getAttribute('data-dfilter') || 'all';
        this.state.currentDealFilter = category;
        this.renderDeals();

        if (window.AnnarakshaFX && window.AnnarakshaFX.Synthesizer) {
          window.AnnarakshaFX.Synthesizer.playChirp();
        }
      });
    });
  }

  bindInRoomVoiceControls() {
    const leaveBtn = document.getElementById('comm-dock-leave-btn');
    if (leaveBtn) {
      leaveBtn.addEventListener('click', () => this.leaveVoiceRoom());
    }

    const micBtn = document.getElementById('comm-dock-mic-btn');
    if (micBtn) {
      micBtn.addEventListener('click', () => this.toggleMicrophone());
    }

    const deafenBtn = document.getElementById('comm-dock-deafen-btn');
    if (deafenBtn) {
      deafenBtn.addEventListener('click', () => {
        this.state.isDeafened = !this.state.isDeafened;
        deafenBtn.classList.toggle('active-deafened', this.state.isDeafened);
        const lbl = deafenBtn.querySelector('.dock-lbl');
        if (lbl) lbl.textContent = this.state.isDeafened ? 'Deafened' : 'Audio On';
      });
    }

    const handBtn = document.getElementById('comm-dock-hand-btn');
    if (handBtn) {
      handBtn.addEventListener('click', () => this.toggleHandRaise());
    }

    const testBtn = document.getElementById('comm-dock-test-speech-btn');
    if (testBtn) {
      testBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.triggerTestVoicePulse();
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 6. Modal Dialogs & Form Submissions
  // ---------------------------------------------------------------------------
  openBidModal(dealId) {
    const deal = this.state.deals.find(d => d.id === dealId);
    if (!deal) return;

    this.state.activeBidTargetDeal = deal;

    const modal = document.getElementById('comm-bid-dialog-modal');
    const titleEl = document.getElementById('comm-bid-modal-title');
    const refBox = document.getElementById('comm-bid-modal-ref');
    const priceInput = document.getElementById('comm-bid-amount');
    const volInput = document.getElementById('comm-bid-volume');

    if (titleEl) titleEl.textContent = `Submit Escrow Offer: ${deal.title}`;
    if (refBox) {
      refBox.innerHTML = `
        <div style="font-weight:700; color:var(--hud-text);">${this.escapeHtml(deal.title)}</div>
        <div style="color:var(--hud-muted); margin-top:2px;">Location: ${this.escapeHtml(deal.origin)} &bull; Benchmark Ask: ${this.escapeHtml(deal.price_spec)}</div>
      `;
    }
    if (priceInput) priceInput.value = deal.price_spec;
    if (volInput) volInput.value = `${deal.volume_tonnes || 100} MT`;

    this.updateEscrowCalculations();
    this.openModal('comm-bid-dialog-modal');
  }

  bindModals() {
    // Close on any close button
    const closeButtons = [
      'comm-btn-close-room-modal', 'comm-btn-cancel-room',
      'comm-btn-close-deal-modal', 'comm-btn-cancel-deal',
      'comm-btn-close-bid-modal', 'comm-btn-cancel-bid'
    ];
    closeButtons.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('click', () => {
          const backdrop = el.closest('.comm-modal-backdrop');
          if (backdrop) backdrop.style.display = 'none';
        });
      }
    });

    // Close on backdrop click
    document.querySelectorAll('.comm-modal-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          backdrop.style.display = 'none';
        }
      });
    });

    // Toggle passkey input field visibility when room type changes
    const roomTypeSelect = document.getElementById('comm-select-room-type');
    const passkeyGroup = document.getElementById('comm-passkey-group');
    if (roomTypeSelect && passkeyGroup) {
      roomTypeSelect.addEventListener('change', () => {
        passkeyGroup.style.display = roomTypeSelect.value === 'private' ? 'block' : 'none';
      });
    }

    // Create Room Form Submit
    const createRoomForm = document.getElementById('comm-create-room-form');
    if (createRoomForm) {
      createRoomForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('comm-input-room-title')?.value || 'New Agricultural Discussion Stage';
        const roomType = document.getElementById('comm-select-room-type')?.value || 'public';
        const targetRole = document.getElementById('comm-select-room-role')?.value || 'all';
        const passkey = document.getElementById('comm-input-room-passkey')?.value || '2026';
        const desc = document.getElementById('comm-input-room-desc')?.value || '';

        const payload = {
          title,
          room_type: roomType,
          target_role: targetRole,
          host_name: this.state.currentUser.name,
          host_org: this.state.currentUser.org,
          description: desc,
          passkey: roomType === 'private' ? passkey : null
        };

        try {
          const res = await fetch('/api/community/rooms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const result = await res.json();
          if (result && result.status === 'success' && result.room) {
            this.state.rooms.unshift(result.room);
          } else {
            // Local fallback
            this.state.rooms.unshift({
              id: 'room-' + Date.now(),
              ...payload,
              listeners_count: 1,
              is_active: 1,
              active_speakers: [{ id: 'spk-1', name: this.state.currentUser.name, role: 'Host', initials: 'OP', isSpeaking: true }]
            });
          }
        } catch (err) {
          this.state.rooms.unshift({
            id: 'room-' + Date.now(),
            ...payload,
            listeners_count: 1,
            is_active: 1,
            active_speakers: [{ id: 'spk-1', name: this.state.currentUser.name, role: 'Host', initials: 'OP', isSpeaking: true }]
          });
        }

        this.renderRooms();
        this.renderKPIs();
        this.closeModal('comm-create-room-modal');
        createRoomForm.reset();

        if (window.AnnarakshaFX && window.AnnarakshaFX.Synthesizer) {
          window.AnnarakshaFX.Synthesizer.playNotification();
        }
      });
    }

    // Post Deal Form Submit
    const postDealForm = document.getElementById('comm-post-deal-form');
    if (postDealForm) {
      postDealForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const dealType = document.getElementById('comm-deal-type')?.value || 'grain-sale';
        const targetRole = document.getElementById('comm-deal-role')?.value || 'producers';
        const title = document.getElementById('comm-deal-title')?.value || 'Grain Lot Offer';
        const origin = document.getElementById('comm-deal-origin')?.value || 'Central Silo #28';
        const price = document.getElementById('comm-deal-price')?.value || '₹2,380 / Qtl';
        const moisture = document.getElementById('comm-deal-moisture')?.value || '11.8% Safe Dry';
        const horizon = document.getElementById('comm-deal-horizon')?.value || 'Immediate Offtake (24H)';

        const payload = {
          deal_type: dealType,
          target_role: targetRole,
          title,
          origin,
          price_spec: price,
          moisture_spec: moisture,
          horizon,
          volume_tonnes: 300,
          urgent_label: '⚡ NEW SPOT OFFER',
          created_by: this.state.currentUser.name
        };

        try {
          const res = await fetch('/api/community/deals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const result = await res.json();
          if (result && result.status === 'success' && result.deal) {
            this.state.deals.unshift(result.deal);
          } else {
            this.state.deals.unshift({
              id: 'deal-' + Date.now(),
              ...payload,
              created_at: 'Just now'
            });
          }
        } catch (err) {
          this.state.deals.unshift({
            id: 'deal-' + Date.now(),
            ...payload,
            created_at: 'Just now'
          });
        }

        this.renderDeals();
        this.renderKPIs();
        this.closeModal('comm-post-deal-modal');
        postDealForm.reset();

        if (window.AnnarakshaFX && window.AnnarakshaFX.Synthesizer) {
          window.AnnarakshaFX.Synthesizer.playNotification();
        }
      });
    }

    // Bid Form Submit
    const bidForm = document.getElementById('comm-bid-form');
    if (bidForm) {
      bidForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const deal = this.state.activeBidTargetDeal;
        if (!deal) return;

        const amount = document.getElementById('comm-bid-amount')?.value || deal.price_spec;
        const volume = document.getElementById('comm-bid-volume')?.value || `${deal.volume_tonnes || 100} MT`;
        const terms = document.getElementById('comm-bid-terms')?.value || 'Instant T+0 Escrow Clearing via e-NAM';
        const notes = document.getElementById('comm-bid-notes')?.value || '';

        const payload = {
          bidder_name: this.state.currentUser.name,
          bidder_role: this.state.currentUser.role,
          bid_amount: amount,
          volume: volume,
          settlement_terms: terms,
          notes: notes
        };

        try {
          await fetch(`/api/community/deals/${deal.id}/bid`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        } catch (err) {}

        this.state.bids.unshift({
          id: Date.now(),
          deal_id: deal.id,
          ...payload,
          status: 'pending',
          created_at: 'Just now'
        });

        alert(`Binding Escrow Bid Transmitted!\nQuote: ${amount} for ${volume}\nSettlement: ${terms}\n\nThe seller and escrow bank have been notified.`);
        this.closeModal('comm-bid-dialog-modal');

        if (window.AnnarakshaFX && window.AnnarakshaFX.Synthesizer) {
          window.AnnarakshaFX.Synthesizer.playNotification();
        }
      });
    }
  }

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = 'flex';
      if (window.AnnarakshaFX && window.AnnarakshaFX.Synthesizer) {
        window.AnnarakshaFX.Synthesizer.playChirp();
      }
    }
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = 'none';
    }
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ---------------------------------------------------------------------------
  // 7. Real-Time Server-Sent Events (SSE) Stream
  // ---------------------------------------------------------------------------
  initEventSource() {
    if (typeof EventSource === 'undefined') return;

    try {
      if (this.eventSource) {
        this.eventSource.close();
      }

      this.eventSource = new EventSource('/api/community/events');

      this.eventSource.addEventListener('connected', () => {
        console.log('[AgriCommunityHub] Real-time SSE stream connected.');
      });

      this.eventSource.addEventListener('chat_message', (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (!msg || !msg.channel) return;

          if (!this.state.channels[msg.channel]) {
            this.state.channels[msg.channel] = [];
          }

          const existing = this.state.channels[msg.channel].find(m => m.id === msg.id);
          if (!existing) {
            this.state.channels[msg.channel].push(msg);

            if (this.state.currentChatChannel === msg.channel) {
              this.renderChatMessages();
              const container = document.getElementById('comm-chat-messages-container');
              if (container) container.scrollTop = container.scrollHeight;
            } else {
              const tabBtn = document.querySelector(`.comm-channel-tab-btn[data-channel="${msg.channel}"]`);
              if (tabBtn) {
                const badge = tabBtn.querySelector('.comm-unread-badge');
                if (badge) {
                  badge.style.display = 'inline-block';
                  const currentVal = parseInt(badge.textContent, 10) || 0;
                  badge.textContent = `${currentVal + 1} NEW`;
                }
              }
            }

            if (window.AnnarakshaFX && window.AnnarakshaFX.Synthesizer) {
              window.AnnarakshaFX.Synthesizer.playChirp();
            }
          }
        } catch (err) {
          console.warn('[AgriCommunityHub] Error processing incoming chat message:', err);
        }
      });

      this.eventSource.addEventListener('new_deal', (e) => {
        try {
          const deal = JSON.parse(e.data);
          if (!deal || !deal.id) return;
          const exists = this.state.deals.find(d => d.id === deal.id);
          if (!exists) {
            this.state.deals.unshift(deal);
            this.state.kpis.active_deals = (this.state.kpis.active_deals || 0) + 1;
            this.renderKPIs();
            this.renderDeals();
            this.showToastBanner('🌾 New Spot Trade Published', `${deal.title} • ${deal.price_spec}`, 'deal');
            if (window.AnnarakshaFX && window.AnnarakshaFX.Synthesizer) {
              window.AnnarakshaFX.Synthesizer.playNotification();
            }
          }
        } catch (err) {}
      });

      this.eventSource.addEventListener('new_bid', (e) => {
        try {
          const payload = JSON.parse(e.data);
          const deal = payload.deal || {};
          const bid = payload.bid || {};
          this.state.bids.unshift(bid);
          this.showToastBanner('⚡ Escrow Offer Transmitted', `${bid.bidder_name} quoted ${bid.bid_amount} for ${bid.volume} on "${deal.title}"`, 'bid');
          if (window.AnnarakshaFX && window.AnnarakshaFX.Synthesizer) {
            window.AnnarakshaFX.Synthesizer.playNotification();
          }
        } catch (err) {}
      });

      this.eventSource.addEventListener('room_created', (e) => {
        try {
          const room = JSON.parse(e.data);
          if (!room || !room.id) return;
          const exists = this.state.rooms.find(r => r.id === room.id);
          if (!exists) {
            this.state.rooms.unshift(room);
            this.state.kpis.live_voice_rooms = (this.state.kpis.live_voice_rooms || 0) + 1;
            this.renderKPIs();
            this.renderRooms();
          }
        } catch (err) {}
      });

      this.eventSource.addEventListener('room_updated', (e) => {
        try {
          const room = JSON.parse(e.data);
          if (!room || !room.id) return;
          const idx = this.state.rooms.findIndex(r => r.id === room.id);
          if (idx !== -1) {
            this.state.rooms[idx] = room;
            this.renderRooms();
          }
          if (this.state.activeVoiceRoomId === room.id) {
            this.state.activeVoiceRoom = room;
            const titleEl = document.getElementById('comm-dock-room-title');
            if (titleEl) titleEl.textContent = room.title;
          }
        } catch (err) {}
      });

      this.eventSource.addEventListener('voice_activity', (e) => {
        try {
          const data = JSON.parse(e.data);
          if (!data || !data.roomId) return;
          const roomCard = document.querySelector(`.comm-voice-card[data-room-id="${data.roomId}"]`);
          if (roomCard) {
            const avatars = roomCard.querySelectorAll('.comm-speaker-avatar');
            avatars.forEach(av => {
              if (av.getAttribute('title')?.includes(data.speakerName || '')) {
                av.classList.toggle('is-speaking', !!data.isSpeaking);
              }
            });
          }
        } catch (err) {}
      });

      this.eventSource.addEventListener('hand_raised', (e) => {
        try {
          const data = JSON.parse(e.data);
          if (!data || !data.roomId) return;
          if (this.state.activeVoiceRoomId === data.roomId) {
            if (data.isRaised) {
              if (!this.handQueue.some(h => h.userName === data.userName)) {
                this.handQueue.push(data);
              }
              if (window.AnnarakshaFX && window.AnnarakshaFX.Synthesizer) {
                window.AnnarakshaFX.Synthesizer.playNotification();
              }
            } else {
              this.handQueue = this.handQueue.filter(h => h.userName !== data.userName);
            }
            this.renderHandQueue();
          }
        } catch (err) {}
      });

      this.eventSource.addEventListener('spoilage_alert', (e) => {
        try {
          const alertData = JSON.parse(e.data);
          this.showToastBanner('🚨 Emergency Spoilage Alert', `Critical moisture detected at ${alertData.unit_name || 'Storage Terminal'}. Emergency voice stage initiated!`, 'emergency');
          if (window.AnnarakshaFX && window.AnnarakshaFX.Synthesizer) {
            window.AnnarakshaFX.Synthesizer.playAlarm();
          }
        } catch (err) {}
      });

      this.eventSource.onerror = () => {
        setTimeout(() => {
          if (this.eventSource?.readyState === EventSource.CLOSED) {
            this.initEventSource();
          }
        }, 6000);
      };
    } catch (err) {
      console.warn('[AgriCommunityHub] SSE setup error:', err);
    }
  }

  // ---------------------------------------------------------------------------
  // 8. Web Audio Voice Engine & Real-Time Dock Canvas Visualizer
  // ---------------------------------------------------------------------------
  async toggleMicrophone() {
    if (!this.state.activeVoiceRoomId) {
      alert('Please connect to a voice stage before activating your microphone.');
      return;
    }

    this.state.isMicMuted = !this.state.isMicMuted;
    const micBtn = document.getElementById('comm-dock-mic-btn');
    const micLabel = document.getElementById('comm-dock-mic-label');
    const micIcon = document.getElementById('comm-dock-mic-icon');
    const modeEl = document.getElementById('comm-dock-audio-mode');

    if (this.state.isMicMuted) {
      if (micBtn) {
        micBtn.classList.remove('active-speaking');
        micBtn.classList.add('muted');
      }
      if (micLabel) micLabel.textContent = 'Muted';
      if (micIcon) micIcon.textContent = '🔇';
      if (modeEl) modeEl.textContent = 'MIC MUTED';
      this.stopMicrophone();
    } else {
      if (micBtn) {
        micBtn.classList.add('active-speaking');
        micBtn.classList.remove('muted');
      }
      if (micLabel) micLabel.textContent = 'Live (Broadcasting)';
      if (micIcon) micIcon.textContent = '🎙️';
      await this.startMicrophone();
    }

    if (window.AnnarakshaFX && window.AnnarakshaFX.Synthesizer) {
      window.AnnarakshaFX.Synthesizer.playChirp();
    }
  }

  async startMicrophone() {
    const modeEl = document.getElementById('comm-dock-audio-mode');

    try {
      if (!this.audioContext) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.audioContext = new AudioCtx();
      }
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.audioAnalyser = this.audioContext.createAnalyser();
      this.audioAnalyser.fftSize = 128;
      this.audioAnalyser.smoothingTimeConstant = 0.65;

      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          this.audioStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            }
          });
          const source = this.audioContext.createMediaStreamSource(this.audioStream);
          source.connect(this.audioAnalyser);
          if (modeEl) modeEl.textContent = 'HARDWARE MIC (LIVE)';
        } catch (mediaErr) {
          console.warn('[AgriCommunityHub] Hardware mic blocked/unavailable, activating synthesized acoustic stream:', mediaErr);
          this.setupSyntheticAudioStream(modeEl);
        }
      } else {
        this.setupSyntheticAudioStream(modeEl);
      }

      this.startDockVisualizerLoop();
    } catch (err) {
      console.warn('[AgriCommunityHub] AudioContext init fallback:', err);
      this.setupSyntheticAudioStream(modeEl);
      this.startDockVisualizerLoop();
    }
  }

  setupSyntheticAudioStream(modeEl) {
    if (modeEl) modeEl.textContent = 'SYNTH ACOUSTIC (DSP)';
    if (this.audioContext && this.audioAnalyser) {
      try {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, this.audioContext.currentTime);
        gain.gain.setValueAtTime(0.035, this.audioContext.currentTime);
        osc.connect(gain);
        gain.connect(this.audioAnalyser);
        osc.start();
        this.syntheticOscillator = osc;
      } catch (e) {}
    }
  }

  triggerTestVoicePulse() {
    if (this.isSimulatingVoice) return;
    this.isSimulatingVoice = true;

    const modeEl = document.getElementById('comm-dock-audio-mode');
    const prevMode = modeEl ? modeEl.textContent : 'LIVE ANALYSIS';
    if (modeEl) modeEl.textContent = 'TEST VOICE BURST 🎙️';

    if (window.AnnarakshaFX && window.AnnarakshaFX.Synthesizer) {
      window.AnnarakshaFX.Synthesizer.playChirp();
    }

    if (this.simVoiceTimer) clearTimeout(this.simVoiceTimer);
    this.simVoiceTimer = setTimeout(() => {
      this.isSimulatingVoice = false;
      if (modeEl) modeEl.textContent = this.state.isMicMuted ? 'MIC MUTED' : prevMode;
    }, 2400);
  }

  startDockVisualizerLoop() {
    if (this.animFrameId) return;

    const canvas = document.getElementById('comm-dock-canvas');
    if (!canvas) return;

    const binCount = this.audioAnalyser ? this.audioAnalyser.frequencyBinCount : 32;
    this.freqDataArray = new Uint8Array(binCount);
    this.timeDataArray = new Uint8Array(this.audioAnalyser ? this.audioAnalyser.fftSize : 64);
    this.peakBands = new Array(binCount).fill(0);
    this.peakDecay = new Array(binCount).fill(0);

    const render = () => {
      this.renderDockCanvas();
      this.animFrameId = requestAnimationFrame(render);
    };
    this.animFrameId = requestAnimationFrame(render);
  }

  stopDockVisualizerLoop() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    const canvas = document.getElementById('comm-dock-canvas');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    this.updateSpeakingFeedback(false, 0, -60);
  }

  renderDockCanvas() {
    const canvas = document.getElementById('comm-dock-canvas');
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = Math.max(240, Math.floor(rect.width || 340));
    const displayHeight = Math.max(32, Math.floor(rect.height || 42));

    if (canvas.width !== Math.floor(displayWidth * dpr) || canvas.height !== Math.floor(displayHeight * dpr)) {
      canvas.width = Math.floor(displayWidth * dpr);
      canvas.height = Math.floor(displayHeight * dpr);
    }

    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.scale(dpr, dpr);

    const binCount = this.freqDataArray ? this.freqDataArray.length : 32;
    if (!this.freqDataArray) this.freqDataArray = new Uint8Array(binCount);
    if (!this.timeDataArray) this.timeDataArray = new Uint8Array(binCount * 2);

    let rms = 0.005;

    // Signal Acquisition: Hardware Mic vs Simulated Voice Burst vs Standby Carrier Wave
    if (this.isSimulatingVoice) {
      this.simPhase += 0.09;
      const speechEnvelope = 0.58 + 0.38 * Math.sin(this.simPhase * 2.1) * Math.cos(this.simPhase * 1.1);
      rms = Math.max(0.04, speechEnvelope * (0.65 + 0.35 * Math.sin(this.simPhase * 4.6)));

      // Synthesize phonetic vocal formants across equalizer bins
      for (let i = 0; i < binCount; i++) {
        const f1 = Math.exp(-Math.pow(i - 5, 2) / 8);
        const f2 = Math.exp(-Math.pow(i - 14, 2) / 12);
        const f3 = Math.exp(-Math.pow(i - 24, 2) / 18);
        const harmonicVal = (f1 * 0.9 + f2 * 0.65 + f3 * 0.45) * rms * 255 * 1.25 + Math.random() * 14;
        this.freqDataArray[i] = Math.min(255, Math.floor(harmonicVal));
      }
      for (let i = 0; i < this.timeDataArray.length; i++) {
        const t = i / this.timeDataArray.length;
        const wave = Math.sin(t * Math.PI * 7 + this.simPhase * 3.5) * rms * 115 + 128;
        this.timeDataArray[i] = Math.max(0, Math.min(255, Math.floor(wave)));
      }
    } else if (this.audioAnalyser && !this.state.isMicMuted) {
      this.audioAnalyser.getByteFrequencyData(this.freqDataArray);
      this.audioAnalyser.getByteTimeDomainData(this.timeDataArray);

      let sumSquares = 0;
      for (let i = 0; i < this.timeDataArray.length; i++) {
        const norm = (this.timeDataArray[i] - 128) / 128;
        sumSquares += norm * norm;
      }
      rms = Math.sqrt(sumSquares / this.timeDataArray.length);
    } else {
      // Muted or Standby state: subtle breathing acoustic baseline
      this.simPhase = (this.simPhase || 0) + 0.035;
      for (let i = 0; i < binCount; i++) {
        const wave = Math.sin(this.simPhase + i * 0.3) * 6 + 10;
        this.freqDataArray[i] = Math.max(0, Math.floor(wave));
      }
      for (let i = 0; i < this.timeDataArray.length; i++) {
        const t = i / this.timeDataArray.length;
        const wave = Math.sin(t * Math.PI * 4 + this.simPhase) * 4 + 128;
        this.timeDataArray[i] = Math.floor(wave);
      }
      rms = 0.008;
    }

    // Envelope Follower & Immediate Voice Activity Gate
    const rawLevel = Math.min(1, rms * 3.2);
    if (rawLevel > this.smoothedLevel) {
      this.smoothedLevel = rawLevel * 0.7 + this.smoothedLevel * 0.3; // Fast attack for immediate feedback
    } else {
      this.smoothedLevel = this.smoothedLevel * 0.88; // Smooth decay
    }

    const dBFS = rms > 0.0001 ? Math.max(-60, Math.round(20 * Math.log10(rms))) : -60;
    const levelPercent = Math.min(100, Math.round(this.smoothedLevel * 100));

    let detectedSpeaking = false;
    if (!this.state.isMicMuted || this.isSimulatingVoice) {
      if (levelPercent >= 16) {
        detectedSpeaking = true;
        this.speakingHangTime = Date.now() + 260; // 260ms hang-time prevents syllable clipping
      } else if (Date.now() < (this.speakingHangTime || 0)) {
        detectedSpeaking = true;
      }
    }

    // Synchronize DOM Badges, Meters & Active Speaker Indicators
    this.updateSpeakingFeedback(detectedSpeaking, levelPercent, dBFS);

    // ==========================================
    // MULTI-LAYER CANVAS RENDERING
    // ==========================================
    // Clear with dark phosphor persistence
    ctx.fillStyle = 'rgba(3, 7, 18, 0.75)';
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    // Layer 1: Ambient Grid & Noise Gate Threshold Guideline
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, displayHeight * 0.5);
    ctx.lineTo(displayWidth, displayHeight * 0.5);
    ctx.stroke();

    // Noise Gate Guideline at 22% level
    const gateY = displayHeight * (1 - 0.22);
    ctx.strokeStyle = detectedSpeaking ? 'rgba(16, 185, 129, 0.35)' : 'rgba(100, 116, 139, 0.25)';
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(0, gateY);
    ctx.lineTo(displayWidth, gateY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Layer 2: Central Acoustic Bloom (when speaking)
    if (detectedSpeaking) {
      const centerX = displayWidth * 0.5;
      const centerY = displayHeight * 0.5;
      const bloomRadius = Math.min(displayWidth * 0.45, 25 + this.smoothedLevel * 60);
      const bloomGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, bloomRadius);
      bloomGrad.addColorStop(0, 'rgba(16, 185, 129, 0.22)');
      bloomGrad.addColorStop(0.6, 'rgba(6, 182, 212, 0.1)');
      bloomGrad.addColorStop(1, 'rgba(16, 185, 129, 0)');
      ctx.fillStyle = bloomGrad;
      ctx.fillRect(0, 0, displayWidth, displayHeight);
    }

    // Layer 3: Dynamic Multi-Band Equalizer Columns + Peak Hold Needles
    const barCount = 28;
    const barGap = 2;
    const barWidth = Math.max(2, (displayWidth - (barCount - 1) * barGap) / barCount);
    const usableHeight = displayHeight - 6;

    for (let i = 0; i < barCount; i++) {
      const dataIdx = Math.floor((i / barCount) * binCount);
      const val = this.freqDataArray[dataIdx] || 0;
      let targetHeight = (val / 255) * usableHeight;

      if (this.state.isMicMuted && !this.isSimulatingVoice) {
        targetHeight = Math.sin(this.simPhase + i * 0.4) * 2 + 3;
      }

      // Smooth peak hold with gravitational decay
      if (targetHeight >= (this.peakBands[i] || 0)) {
        this.peakBands[i] = targetHeight;
        this.peakDecay[i] = 0;
      } else {
        this.peakDecay[i] = (this.peakDecay[i] || 0) + 0.18;
        this.peakBands[i] = Math.max(0, (this.peakBands[i] || 0) - this.peakDecay[i]);
      }

      const x = i * (barWidth + barGap);
      const barH = Math.max(1.5, targetHeight);
      const y = displayHeight - barH - 2;

      // Equalizer column vertical gradient
      const colGrad = ctx.createLinearGradient(0, displayHeight, 0, y);
      if (detectedSpeaking) {
        colGrad.addColorStop(0, '#06b6d4');
        colGrad.addColorStop(0.55, '#10b981');
        colGrad.addColorStop(0.85, '#fbbf24');
        colGrad.addColorStop(1, '#ef4444');
      } else if (!this.state.isMicMuted) {
        colGrad.addColorStop(0, 'rgba(6, 182, 212, 0.3)');
        colGrad.addColorStop(1, 'rgba(16, 185, 129, 0.4)');
      } else {
        colGrad.addColorStop(0, 'rgba(100, 116, 139, 0.25)');
        colGrad.addColorStop(1, 'rgba(148, 163, 184, 0.35)');
      }

      ctx.fillStyle = colGrad;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barH, [2, 2, 0, 0]);
      ctx.fill();

      // Peak Hold Needle (studio console aesthetic)
      const peakY = displayHeight - (this.peakBands[i] || 0) - 2.5;
      ctx.fillStyle = detectedSpeaking ? '#fbbf24' : 'rgba(56, 189, 248, 0.6)';
      ctx.fillRect(x, Math.max(2, peakY), barWidth, 1.5);
    }

    // Layer 4: Fluid Oscilloscope Spline Overlay
    ctx.save();
    ctx.beginPath();
    const sliceWidth = displayWidth / (this.timeDataArray.length - 1);
    let ox = 0;

    for (let i = 0; i < this.timeDataArray.length; i++) {
      const v = this.timeDataArray[i] / 128.0;
      const oy = (v * displayHeight) / 2;

      if (i === 0) {
        ctx.moveTo(ox, oy);
      } else {
        ctx.lineTo(ox, oy);
      }
      ox += sliceWidth;
    }

    if (detectedSpeaking) {
      ctx.strokeStyle = '#34d399';
      ctx.shadowColor = 'rgba(52, 211, 153, 0.9)';
      ctx.shadowBlur = 8;
      ctx.lineWidth = 1.8;
    } else if (!this.state.isMicMuted) {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
      ctx.shadowColor = 'rgba(6, 182, 212, 0.35)';
      ctx.shadowBlur = 4;
      ctx.lineWidth = 1.2;
    } else {
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
      ctx.shadowBlur = 0;
      ctx.lineWidth = 1;
    }
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }

  updateSpeakingFeedback(isSpeaking, levelPercent, dBFS) {
    const badge = document.getElementById('comm-dock-speaking-badge');
    const vuBar = document.getElementById('comm-dock-vu-bar');
    const dbMeter = document.getElementById('comm-dock-db-meter');
    const liveDot = document.getElementById('comm-dock-live-dot');
    const dock = document.getElementById('comm-active-voice-dock');
    const wrapper = document.getElementById('comm-dock-canvas-wrapper');

    // Speaking Badge state
    if (badge) {
      if (this.state.isMicMuted && !this.isSimulatingVoice) {
        badge.textContent = 'MUTED';
        badge.className = 'comm-dock-speaking-badge badge-muted';
      } else if (isSpeaking) {
        badge.textContent = 'SPEAKING 🎙️';
        badge.className = 'comm-dock-speaking-badge badge-speaking';
      } else {
        badge.textContent = 'SILENT';
        badge.className = 'comm-dock-speaking-badge badge-silent';
      }
    }

    // Audio VU Bar
    if (vuBar) {
      const activeWidth = (this.state.isMicMuted && !this.isSimulatingVoice) ? 0 : Math.min(100, levelPercent);
      vuBar.style.width = `${activeWidth}%`;
    }

    // dBFS numerical readout
    if (dbMeter) {
      if (this.state.isMicMuted && !this.isSimulatingVoice) {
        dbMeter.textContent = 'MUTED (0%)';
        dbMeter.style.color = '#fda4af';
      } else if (isSpeaking) {
        dbMeter.textContent = `${dBFS} dBFS (${levelPercent}%)`;
        dbMeter.style.color = '#34d399';
      } else {
        dbMeter.textContent = `${dBFS} dBFS (${levelPercent}%)`;
        dbMeter.style.color = '#94a3b8';
      }
    }

    // Live Indicator Dot
    if (liveDot) {
      if (this.state.isMicMuted && !this.isSimulatingVoice) {
        liveDot.style.background = '#f43f5e';
        liveDot.style.boxShadow = '0 0 6px #f43f5e';
      } else if (isSpeaking) {
        liveDot.style.background = '#34d399';
        liveDot.style.boxShadow = '0 0 10px #34d399';
      } else {
        liveDot.style.background = '#06b6d4';
        liveDot.style.boxShadow = '0 0 6px #06b6d4';
      }
    }

    // Dock container & canvas glowing wrappers
    if (dock) {
      dock.classList.toggle('dock-speaking', isSpeaking);
    }
    if (wrapper) {
      wrapper.classList.toggle('is-speaking', isSpeaking);
    }

    // Broadcast speaking status to peers when state transitions
    if (isSpeaking !== this.isSpeaking) {
      this.isSpeaking = isSpeaking;

      const now = Date.now();
      if (this.state.activeVoiceRoomId && (now - (this.lastSpeakingBroadcast || 0) > 280)) {
        this.lastSpeakingBroadcast = now;
        fetch(`/api/community/rooms/${this.state.activeVoiceRoomId}/voice-activity`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            speaker_name: this.state.currentUser.name,
            is_speaking: this.isSpeaking
          })
        }).catch(() => {});
      }
    }
  }

  stopMicrophone() {
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(t => t.stop());
      this.audioStream = null;
    }

    if (this.syntheticOscillator) {
      try { this.syntheticOscillator.stop(); } catch (e) {}
      this.syntheticOscillator = null;
    }

    this.isSpeaking = false;
    this.updateSpeakingFeedback(false, 0, -60);

    if (this.state.activeVoiceRoomId) {
      fetch(`/api/community/rooms/${this.state.activeVoiceRoomId}/voice-activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          speaker_name: this.state.currentUser.name,
          is_speaking: false
        })
      }).catch(() => {});
    }
  }

  // ---------------------------------------------------------------------------
  // 9. Hand Raise Queue & Speaker Privilege
  // ---------------------------------------------------------------------------
  async toggleHandRaise() {
    if (!this.state.activeVoiceRoomId) {
      alert('Please join a voice stage to raise your hand.');
      return;
    }

    this.state.isHandRaised = !this.state.isHandRaised;
    const handBtn = document.getElementById('comm-dock-hand-btn');
    if (handBtn) {
      handBtn.classList.toggle('active-hand', this.state.isHandRaised);
      const lbl = handBtn.querySelector('.dock-lbl');
      if (lbl) lbl.textContent = this.state.isHandRaised ? 'Hand Raised ✋' : 'Raise Hand';
    }

    try {
      await fetch(`/api/community/rooms/${this.state.activeVoiceRoomId}/raise-hand`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_name: this.state.currentUser.name,
          user_role: this.state.currentUser.role,
          is_raised: this.state.isHandRaised
        })
      });
    } catch (e) {}

    if (window.AnnarakshaFX && window.AnnarakshaFX.Synthesizer) {
      window.AnnarakshaFX.Synthesizer.playNotification();
    }
  }

  renderHandQueue() {
    const queueBox = document.getElementById('comm-dock-queue');
    const queueList = document.getElementById('comm-dock-queue-list');
    const queueCount = document.getElementById('comm-dock-queue-count');
    if (!queueBox || !queueList) return;

    if (this.handQueue.length === 0) {
      queueBox.style.display = 'none';
      return;
    }

    queueBox.style.display = 'block';
    if (queueCount) queueCount.textContent = `${this.handQueue.length} waiting`;

    queueList.innerHTML = this.handQueue.map(item => `
      <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.4); padding:0.3rem 0.5rem; border-radius:4px;">
        <span style="color:#ffffff; font-weight:600;">✋ ${this.escapeHtml(item.userName)} <span style="font-size:0.62rem; color:#94a3b8;">(${this.escapeHtml(item.userRole || '')})</span></span>
        <button class="btn btn-primary comm-grant-speaker-btn" data-user="${this.escapeHtml(item.userName)}" data-role="${this.escapeHtml(item.userRole || '')}" style="font-size:0.65rem; padding:0.2rem 0.5rem; background:#10b981; border-color:#10b981;">
          🎙️ Grant Mic
        </button>
      </div>
    `).join('');

    queueList.querySelectorAll('.comm-grant-speaker-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const uName = btn.getAttribute('data-user');
        const uRole = btn.getAttribute('data-role');
        this.grantSpeakerPrivilege(uName, uRole);
      });
    });
  }

  async grantSpeakerPrivilege(userName, userRole) {
    if (!this.state.activeVoiceRoomId || !userName) return;
    try {
      await fetch(`/api/community/rooms/${this.state.activeVoiceRoomId}/grant-speaker`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_name: userName, user_role: userRole })
      });
      this.handQueue = this.handQueue.filter(h => h.userName !== userName);
      this.renderHandQueue();
      if (window.AnnarakshaFX && window.AnnarakshaFX.Synthesizer) {
        window.AnnarakshaFX.Synthesizer.playNotification();
      }
    } catch (e) {}
  }

  // ---------------------------------------------------------------------------
  // 10. Dynamic Escrow & Counter-Offer Calculator
  // ---------------------------------------------------------------------------
  initEscrowCalculator() {
    const amountInput = document.getElementById('comm-bid-amount');
    const volumeInput = document.getElementById('comm-bid-volume');

    if (amountInput) amountInput.addEventListener('input', () => this.updateEscrowCalculations());
    if (volumeInput) volumeInput.addEventListener('input', () => this.updateEscrowCalculations());
  }

  updateEscrowCalculations() {
    const deal = this.state.activeBidTargetDeal;
    if (!deal) return;

    const amountInput = document.getElementById('comm-bid-amount');
    const volumeInput = document.getElementById('comm-bid-volume');
    const spreadValEl = document.getElementById('comm-calc-spread');
    const spreadTagEl = document.getElementById('comm-calc-spread-tag');
    const totalValEl = document.getElementById('comm-calc-total-val');

    const askMatch = String(deal.price_spec).match(/[\d,.]+/);
    const askRate = askMatch ? parseFloat(askMatch[0].replace(/,/g, '')) : 2300;

    const bidMatch = amountInput ? String(amountInput.value).match(/[\d,.]+/) : null;
    const bidRate = bidMatch ? parseFloat(bidMatch[0].replace(/,/g, '')) : askRate;

    const volMatch = volumeInput ? String(volumeInput.value).match(/[\d,.]+/) : null;
    const volumeTonnes = volMatch ? parseFloat(volMatch[0].replace(/,/g, '')) : (deal.volume_tonnes || 300);

    const diff = bidRate - askRate;
    if (spreadValEl) {
      if (diff === 0) {
        spreadValEl.textContent = '₹0 / Qtl (At Par)';
        spreadValEl.style.color = '#ffffff';
        if (spreadTagEl) {
          spreadTagEl.textContent = 'MATCHED MSP';
          spreadTagEl.style.background = 'rgba(16, 185, 129, 0.2)';
          spreadTagEl.style.color = '#10b981';
        }
      } else if (diff > 0) {
        spreadValEl.textContent = `+₹${diff.toFixed(0)} / Qtl`;
        spreadValEl.style.color = '#34d399';
        if (spreadTagEl) {
          spreadTagEl.textContent = 'PREMIUM BID';
          spreadTagEl.style.background = 'rgba(56, 189, 248, 0.2)';
          spreadTagEl.style.color = '#38bdf8';
        }
      } else {
        spreadValEl.textContent = `-₹${Math.abs(diff).toFixed(0)} / Qtl`;
        spreadValEl.style.color = '#fbbf24';
        if (spreadTagEl) {
          spreadTagEl.textContent = 'DISCOUNT BID';
          spreadTagEl.style.background = 'rgba(245, 158, 11, 0.2)';
          spreadTagEl.style.color = '#fbbf24';
        }
      }
    }

    const totalRupees = bidRate * 10 * volumeTonnes;
    if (totalValEl) {
      if (totalRupees >= 10000000) {
        totalValEl.textContent = `₹${(totalRupees / 10000000).toFixed(2)} Cr`;
      } else {
        totalValEl.textContent = `₹${(totalRupees / 100000).toFixed(2)} Lakhs`;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 11. Toast Banners & Cross-Module Broadcast
  // ---------------------------------------------------------------------------
  showToastBanner(title, message, type = 'info') {
    let container = document.getElementById('comm-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'comm-toast-container';
      container.style.cssText = 'position:fixed; bottom:20px; right:20px; z-index:99999; display:flex; flex-direction:column; gap:8px; pointer-events:none; max-width:380px;';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    const borderColor = type === 'emergency' ? '#ef4444' : type === 'bid' ? '#10b981' : '#0284c7';
    const bgColor = type === 'emergency' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(15, 23, 42, 0.95)';

    toast.style.cssText = `background:${bgColor}; border:1px solid ${borderColor}; border-radius:8px; padding:0.75rem 1rem; color:#f8fafc; font-size:0.78rem; backdrop-filter:blur(8px); box-shadow:0 8px 30px rgba(0,0,0,0.5); pointer-events:auto; transition:all 0.3s ease; transform:translateY(10px); opacity:0;`;

    toast.innerHTML = `
      <div style="font-weight:800; color:${borderColor}; text-transform:uppercase; font-size:0.7rem; margin-bottom:2px;">${this.escapeHtml(title)}</div>
      <div style="color:#cbd5e1; line-height:1.35;">${this.escapeHtml(message)}</div>
    `;

    container.appendChild(toast);
    requestAnimationFrame(() => {
      toast.style.transform = 'translateY(0)';
      toast.style.opacity = '1';
    });

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      setTimeout(() => toast.remove(), 300);
    }, 4500);
  }

  async broadcastEmergencySpoilage(options = {}) {
    try {
      const res = await fetch('/api/community/broadcast-spoilage-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options)
      });
      const data = await res.json();

      if (window.futuristicConsole && typeof window.futuristicConsole.switchView === 'function') {
        window.futuristicConsole.switchView('view-community');
      } else {
        const pane = document.getElementById('view-community');
        if (pane) {
          document.querySelectorAll('.hud-module-pane').forEach(p => p.style.display = 'none');
          pane.style.display = 'block';
        }
      }
      this.switchChatChannel('emergency-grain-rescue');

      if (data && data.room_id) {
        const room = this.state.rooms.find(r => r.id === data.room_id);
        if (room) this.setActiveVoiceRoom(room);
      }

      return data;
    } catch (err) {
      console.warn('Error broadcasting spoilage alert:', err);
    }
  }
}

// Global Export & Auto-Initialization
window.agriCommunityHub = null;
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.agriCommunityHub = new AgriCommunityHub();
  });
} else {
  window.agriCommunityHub = new AgriCommunityHub();
}
