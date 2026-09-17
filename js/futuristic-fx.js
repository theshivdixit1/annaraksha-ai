/**
 * Annaraksha AI - Futuristic Visual FX, 3D Physics Tilt, and Cyber Audio Synthesizer
 * Bitexindustries Private Limited / Unbeatable Foods
 */

class AnnarakshaAudioSynthesizer {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.initFromStorage();
  }

  initFromStorage() {
    const saved = localStorage.getItem('annaraksha_audio_muted');
    this.muted = saved === 'true';
  }

  ensureContext() {
    if (!this.ctx && !this.muted) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('annaraksha_audio_muted', this.muted);
    return this.muted;
  }

  playTone(freq, type = 'sine', duration = 0.12, volume = 0.08) {
    if (this.muted) return;
    try {
      this.ensureContext();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(volume, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      // Ignore audio policy issues
    }
  }

  playChirp(startFreq = 520, endFreq = 880, duration = 0.15, type = 'sine') {
    if (this.muted) return;
    try {
      this.ensureContext();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(startFreq || 520, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(endFreq || 880, this.ctx.currentTime + duration);

      gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {}
  }

  // Preset UI Sound Effects
  click() { this.playTone(840, 'sine', 0.08, 0.04); }
  tabSwitch() { this.playChirp(440, 880, 0.12); }
  scanLaser() { this.playChirp(1200, 320, 0.25, 'sawtooth'); }
  alertPing() { this.playTone(980, 'triangle', 0.25, 0.08); }
  success() { this.playChirp(520, 1040, 0.18); }
  playNotification() { this.playChirp(480, 960, 0.16, 'sine'); }
  playAerationHum() { this.playTone(90, 'sawtooth', 0.5, 0.05); }
  playHologramSweep() { this.playChirp(320, 1200, 0.3, 'sine'); }
  playSonarPing(freq = 1046.5, duration = 0.4) {
    if (this.muted) return;
    try {
      this.ensureContext();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.95, this.ctx.currentTime + duration);
      gain.gain.setValueAtTime(0.07, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {}
  }
}

window.annarakshaAudio = new AnnarakshaAudioSynthesizer();

/**
 * 3D Perspective Tilt System for HUD Cards
 */
class Perspective3DTilt {
  static init() {
    const cards = document.querySelectorAll('.tilt-card, .metric-card, .action-item-card, .mini-stat-card, .directory-card');
    cards.forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * -7;
        const rotateY = ((x - centerX) / centerX) * 7;

        card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(6px)`;
        card.style.boxShadow = `0 12px 32px rgba(6, 182, 212, 0.25)`;
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = `perspective(800px) rotateX(0deg) rotateY(0deg) translateZ(0px)`;
        card.style.boxShadow = '';
      });
    });
  }
}

/**
 * Interactive Background Cyber Matrix Particles
 */
class CyberMatrixBackground {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.mouse = { x: -1000, y: -1000 };

    this.init();
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });

    const count = Math.floor((this.canvas.width * this.canvas.height) / 22000);
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: 1 + Math.random() * 1.5,
        alpha: 0.15 + Math.random() * 0.35
      });
    }

    this.render = this.render.bind(this);
    requestAnimationFrame(this.render);
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0) p.x = this.canvas.width;
      if (p.x > this.canvas.width) p.x = 0;
      if (p.y < 0) p.y = this.canvas.height;
      if (p.y > this.canvas.height) p.y = 0;

      // Parallax mouse repulsion
      const dx = this.mouse.x - p.x;
      const dy = this.mouse.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 100) {
        p.x -= (dx / dist) * 1.5;
        p.y -= (dy / dist) * 1.5;
      }

      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(6, 182, 212, ${p.alpha})`;
      this.ctx.fill();

      // Connect nearby particles with subtle cyber grid lines
      for (let j = i + 1; j < this.particles.length; j++) {
        const p2 = this.particles[j];
        const d = Math.hypot(p.x - p2.x, p.y - p2.y);
        if (d < 70) {
          this.ctx.beginPath();
          this.ctx.moveTo(p.x, p.y);
          this.ctx.lineTo(p2.x, p2.y);
          this.ctx.strokeStyle = `rgba(16, 185, 129, ${(1 - d / 70) * 0.12})`;
          this.ctx.lineWidth = 0.6;
          this.ctx.stroke();
        }
      }
    }

    requestAnimationFrame(this.render);
  }
}

/**
 * 3D Holographic Logo Emitting Modal
 */
class HolographicLogoShowcase {
  static open() {
    let modal = document.getElementById('holo-logo-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'holo-logo-modal';
      modal.className = 'holo-modal-backdrop';
      modal.innerHTML = `
        <div class="holo-modal-box">
          <button class="holo-close-btn" id="holo-close-btn">&times;</button>
          
          <div class="holo-brand-header">
            <div class="holo-brand-badge">NATIONAL AGRO-DEFENSE GRID OS 3.6</div>
            <h2 class="holo-brand-title">ANNARAKSHA AI</h2>
            <div class="holo-brand-sub">Bitexindustries Private Limited &bull; Unbeatable Foods</div>
          </div>

          <div class="holo-logo-stage">
            <div class="holo-ring holo-ring-outer"></div>
            <div class="holo-ring holo-ring-inner"></div>
            <div class="holo-scan-beam"></div>
            <img src="assets/images/logo.png" alt="Annaraksha AI 3D Logo" class="holo-logo-image" />
            <div class="holo-glow-core"></div>
          </div>

          <div class="holo-stats-row">
            <div class="holo-stat-pill">
              <span class="holo-stat-num">60</span>
              <span class="holo-stat-lbl">Silos Online</span>
            </div>
            <div class="holo-stat-pill">
              <span class="holo-stat-num">98.4%</span>
              <span class="holo-stat-lbl">NIR Accuracy</span>
            </div>
            <div class="holo-stat-pill">
              <span class="holo-stat-num">₹24.8 Cr</span>
              <span class="holo-stat-lbl">Wastage Saved</span>
            </div>
          </div>

          <p class="holo-manifesto">
            Real-time biometric grain defense against post-harvest decay. Powered by computer vision NIR moisture scanning, IoT sensor stratification, and Gemini 3.6 Flash agro-copilot.
          </p>

          <div style="margin-top:1.25rem; display:flex; justify-content:center; gap:0.75rem;">
            <button class="btn btn-primary" id="holo-dismiss-btn" style="padding:0.6rem 1.4rem;">
              <span>Enter Command Grid</span>
            </button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      const close = () => {
        modal.classList.remove('active');
        if (window.annarakshaAudio) window.annarakshaAudio.click();
      };

      modal.querySelector('#holo-close-btn').addEventListener('click', close);
      modal.querySelector('#holo-dismiss-btn').addEventListener('click', close);
      modal.addEventListener('click', (e) => {
        if (e.target === modal) close();
      });
    }

    modal.classList.add('active');
    if (window.annarakshaAudio) window.annarakshaAudio.alertPing();
  }
}

// Function wrapper allowing instantiation with or without 'new'
function CyberMatrixBackgroundWrapper(canvasId) {
  return new CyberMatrixBackground(canvasId);
}
CyberMatrixBackgroundWrapper.prototype = CyberMatrixBackground.prototype;

window.AnnarakshaFX = {
  Perspective3DTilt,
  CyberMatrixBackground: CyberMatrixBackgroundWrapper,
  CyberMatrixBackgroundClass: CyberMatrixBackground,
  Synthesizer: window.annarakshaAudio,
  HolographicBrandShowcase: HolographicLogoShowcase,
  HolographicLogoShowcase
};

