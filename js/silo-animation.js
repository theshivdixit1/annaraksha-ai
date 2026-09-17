/**
 * Annaraksha AI - Interactive Grain Silo Cutaway Visualizer
 * Bitexindustries Private Limited / Unbeatable Foods
 * 
 * Renders real-time physical simulation of a commercial grain silo:
 * - Grain mass stratification (Wheat / Rice)
 * - Intergranular convective currents & heat plumes
 * - 3-tier IoT sensor probes (Top, Core, Floor)
 * - Critical moisture boundary layer
 */

class SiloVisualizer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.aerationActive = true;
    this.particles = [];
    this.time = 0;
    this.hoveredSensor = null;

    this.sensors = [
      { id: 'top', name: 'Surface Stratum (1m)', temp: '26.4°C', rh: '61%', moisture: '12.2%', status: 'nominal', yRatio: 0.35 },
      { id: 'core', name: 'Core Biocenter (4m)', temp: '34.8°C', rh: '78%', moisture: '16.8%', status: 'critical', yRatio: 0.58 },
      { id: 'floor', name: 'Aeration Plenum (8m)', temp: '22.0°C', rh: '48%', moisture: '11.4%', status: 'nominal', yRatio: 0.82 }
    ];

    this.init();
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());

    // Generate convective air particles
    for (let i = 0; i < 28; i++) {
      this.particles.push({
        x: Math.random(),
        y: Math.random(),
        speed: 0.003 + Math.random() * 0.004,
        size: 2 + Math.random() * 2,
        opacity: 0.3 + Math.random() * 0.5
      });
    }

    // Mouse tracking for sensors
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('click', () => {
      this.aerationActive = !this.aerationActive;
      const statusText = document.getElementById('silo-fan-status');
      if (statusText) {
        statusText.innerText = this.aerationActive ? 'Active (Auto-PID Cycle)' : 'Standby (Click to run)';
        statusText.style.color = this.aerationActive ? '#10b981' : '#f59e0b';
      }
    });

    this.animate();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.scale(dpr, dpr);
  }

  handleMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const siloLeft = this.width * 0.18;
    const siloWidth = this.width * 0.64;
    const centerX = siloLeft + siloWidth / 2;

    this.hoveredSensor = null;
    this.sensors.forEach(sensor => {
      const sy = this.height * sensor.yRatio;
      const dist = Math.hypot(mx - centerX, my - sy);
      if (dist < 22) {
        this.hoveredSensor = sensor;
      }
    });
  }

  animate() {
    this.time += 0.03;
    this.draw();
    requestAnimationFrame(() => this.animate());
  }

  draw() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.clearRect(0, 0, w, h);

    const siloLeft = w * 0.18;
    const siloWidth = w * 0.64;
    const siloTop = h * 0.12;
    const siloHeight = h * 0.76;
    const siloBottom = siloTop + siloHeight;
    const centerX = siloLeft + siloWidth / 2;

    // 1. Silo Roof Dome (Industrial corrugated dome)
    ctx.fillStyle = '#cbd5e1';
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(siloLeft, siloTop + 20);
    ctx.quadraticCurveTo(centerX, siloTop - 25, siloLeft + siloWidth, siloTop + 20);
    ctx.lineTo(siloLeft + siloWidth, siloTop + 30);
    ctx.lineTo(siloLeft, siloTop + 30);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 2. Silo Outer Body Shell
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(siloLeft, siloTop + 30, siloWidth, siloHeight - 50);

    // Wall borders
    ctx.beginPath();
    ctx.moveTo(siloLeft, siloTop + 20);
    ctx.lineTo(siloLeft, siloBottom - 20);
    ctx.moveTo(siloLeft + siloWidth, siloTop + 20);
    ctx.lineTo(siloLeft + siloWidth, siloBottom - 20);
    ctx.stroke();

    // 3. Grain Bed Mass
    const grainTop = siloTop + siloHeight * 0.22;
    const grainBottom = siloBottom - 35;
    const grainHeight = grainBottom - grainTop;

    // Gradient representing moisture boundary
    const grainGrad = ctx.createLinearGradient(0, grainTop, 0, grainBottom);
    grainGrad.addColorStop(0, '#fef08a');    // dry surface
    grainGrad.addColorStop(0.45, '#fbbf24'); // normal
    grainGrad.addColorStop(0.60, '#f87171'); // CRITICAL MOISTURE POCKET (spoilage front)
    grainGrad.addColorStop(0.75, '#f59e0b'); // amber
    grainGrad.addColorStop(1, '#eab308');    // plenum bottom

    ctx.fillStyle = grainGrad;
    ctx.beginPath();
    ctx.moveTo(siloLeft + 4, grainTop);
    // slight natural grain peak
    ctx.quadraticCurveTo(centerX, grainTop - 12, siloLeft + siloWidth - 4, grainTop);
    ctx.lineTo(siloLeft + siloWidth - 4, grainBottom);
    ctx.lineTo(siloLeft + 4, grainBottom);
    ctx.closePath();
    ctx.fill();

    // 4. Convective Airflow Current Lines (Aeration Simulation)
    if (this.aerationActive) {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
      ctx.lineWidth = 1.5;
      this.particles.forEach(p => {
        p.y -= p.speed;
        if (p.y < 0.22) p.y = 0.85;

        const px = siloLeft + 20 + p.x * (siloWidth - 40);
        const py = siloTop + p.y * siloHeight;

        // gentle wave
        const waveX = px + Math.sin(this.time * 2 + p.y * 10) * 4;

        ctx.fillStyle = `rgba(56, 189, 248, ${p.opacity})`;
        ctx.beginPath();
        ctx.arc(waveX, py, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // 5. Sensor Line Cable
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(centerX, siloTop + 10);
    ctx.lineTo(centerX, grainBottom);
    ctx.stroke();
    ctx.setLineDash([]);

    // 6. Sensor Nodes
    this.sensors.forEach(sensor => {
      const sy = h * sensor.yRatio;
      const isHover = this.hoveredSensor && this.hoveredSensor.id === sensor.id;
      const isCrit = sensor.status === 'critical';

      // Outer glow if critical or hovered
      if (isCrit) {
        const pulse = 10 + Math.sin(this.time * 6) * 4;
        ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
        ctx.beginPath();
        ctx.arc(centerX, sy, pulse + 6, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = isCrit ? '#ef4444' : '#10b981';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(centerX, sy, isHover ? 9 : 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Label callout line to the right
      const calloutX = siloLeft + siloWidth + 14;
      ctx.strokeStyle = isCrit ? '#ef4444' : '#94a3b8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(centerX + 8, sy);
      ctx.lineTo(calloutX, sy);
      ctx.stroke();

      // Text summary
      ctx.fillStyle = isCrit ? '#991b1b' : '#334155';
      ctx.font = isCrit ? 'bold 11px Inter, sans-serif' : '10px Inter, sans-serif';
      ctx.fillText(`${sensor.moisture} (${sensor.temp})`, calloutX + 4, sy + 3);
    });

    // 7. Hopper cone bottom
    ctx.fillStyle = '#94a3b8';
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(siloLeft, siloBottom - 20);
    ctx.lineTo(centerX - 16, siloBottom + 18);
    ctx.lineTo(centerX + 16, siloBottom + 18);
    ctx.lineTo(siloLeft + siloWidth, siloBottom - 20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 8. Aeration Intake Fan at Base
    const fanX = siloLeft - 20;
    const fanY = siloBottom - 10;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(fanX, fanY, 20, 14);
    ctx.fillStyle = this.aerationActive ? '#10b981' : '#64748b';
    ctx.beginPath();
    ctx.arc(fanX + 6, fanY + 7, 4, 0, Math.PI * 2);
    ctx.fill();

    // Hover tooltip details
    if (this.hoveredSensor) {
      const s = this.hoveredSensor;
      const tooltipX = 14;
      const tooltipY = 20;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
      ctx.roundRect(tooltipX, tooltipY, 190, 72, 8);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.fillText(s.name, tooltipX + 10, tooltipY + 18);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px Inter, sans-serif';
      ctx.fillText(`Moisture Content: `, tooltipX + 10, tooltipY + 34);
      ctx.fillStyle = s.status === 'critical' ? '#fca5a5' : '#86efac';
      ctx.font = 'bold 10px Inter, sans-serif';
      ctx.fillText(s.moisture, tooltipX + 102, tooltipY + 34);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px Inter, sans-serif';
      ctx.fillText(`Temperature: ${s.temp} | RH: ${s.rh}`, tooltipX + 10, tooltipY + 50);

      ctx.fillStyle = s.status === 'critical' ? '#ef4444' : '#10b981';
      ctx.fillText(`Status: ${s.status.toUpperCase()}`, tooltipX + 10, tooltipY + 64);
    }
  }
}

window.SiloVisualizer = SiloVisualizer;
