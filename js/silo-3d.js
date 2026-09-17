/**
 * Annaraksha AI - 3D WebGL Digital Twin Silo Visualizer (Three.js)
 * Bitexindustries Private Limited / Unbeatable Foods
 * 
 * Features:
 * - 3D Silo Structure (Transparent alloy cylinder, hopper cone, roof, aeration intake duct)
 * - 3D Grain Volume with dynamic thermal-moisture stratification heatmap
 * - 3D Suspended IoT Sensor Probe Cables with pulsing LED nodes
 * - 3D Aeration Convective Particle Simulation (turbulent air streams through grain matrix)
 * - 3D Rotating Aeration Fan Turbine with dynamic velocity
 * - OrbitControls for 360° interactive rotation, zoom, and panning
 * - Interactive 3D Raycasting for sensor selection & floating HUD telemetry
 * - Camera perspective presets (Overview, Core Hotspot, Plenum, Headspace)
 */

class Silo3DVisualizer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    this.aerationActive = true;
    this.fanSpeed = 0.08;
    this.time = 0;
    this.currentPreset = 'overview';
    this.hoveredSensor = null;

    this.sensors = [
      { id: 'top', name: 'Surface Stratum (1m)', temp: 26.4, rh: 61, moisture: 12.2, status: 'nominal', y: 4.2, color: 0x10b981 },
      { id: 'core', name: 'Core Biocenter (4m)', temp: 34.8, rh: 78, moisture: 16.8, status: 'critical', y: 0.8, color: 0xf43f5e },
      { id: 'floor', name: 'Aeration Plenum (8m)', temp: 22.0, rh: 48, moisture: 11.4, status: 'nominal', y: -2.8, color: 0x06b6d4 }
    ];

    this.init();
  }

  init() {
    // Clear container
    this.container.innerHTML = '';
    this.container.style.position = 'relative';

    const width = this.container.clientWidth || 600;
    const height = this.container.clientHeight || 440;

    // 1. Scene & Camera
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x070b14, 0.025);

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    this.camera.position.set(12, 6, 14);

    // 2. WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // 3. OrbitControls
    if (window.THREE && window.THREE.OrbitControls) {
      this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.05;
      this.controls.maxDistance = 28;
      this.controls.minDistance = 4;
      this.controls.maxPolarAngle = Math.PI / 2 + 0.1;
      this.controls.target.set(0, 1, 0);
    }

    // 4. Lighting System
    const ambientLight = new THREE.AmbientLight(0x1e293b, 1.2);
    this.scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x06b6d4, 1.5);
    dirLight1.position.set(10, 20, 10);
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x10b981, 0.8);
    dirLight2.position.set(-10, -5, -10);
    this.scene.add(dirLight2);

    // Core Hotspot PointLight (pulsing biological respiration heat)
    this.hotspotLight = new THREE.PointLight(0xf43f5e, 2.5, 8);
    this.hotspotLight.position.set(0, 0.8, 0);
    this.scene.add(this.hotspotLight);

    // 5. Build 3D Silo Geometry
    this.buildSiloStructure();
    this.buildGrainLayers();
    this.buildSensorProbes();
    this.buildAerationFan();
    this.buildAirflowParticles();
    this.buildGroundLattice();

    // 6. UI Overlays (Controls & 3D HUD)
    this.buildFloatingHUD();

    // 7. Event Listeners
    window.addEventListener('resize', () => this.onResize());
    this.renderer.domElement.addEventListener('mousemove', (e) => this.onPointerMove(e));
    this.renderer.domElement.addEventListener('click', (e) => this.onPointerClick(e));

    // 8. Animation Loop
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  buildSiloStructure() {
    const siloGroup = new THREE.Group();

    // Transparent Silo Outer Cylinder (Sci-Fi alloy glass)
    const cylGeo = new THREE.CylinderGeometry(3.6, 3.6, 8, 36, 1, true);
    const cylMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      metalness: 0.1,
      roughness: 0.2,
      transmission: 0.85,
      opacity: 0.35,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const siloCylinder = new THREE.Mesh(cylGeo, cylMat);
    siloCylinder.position.y = 1;
    siloGroup.add(siloCylinder);

    // Silo Reinforcement Rings (Futuristic structural ribs)
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.4, wireframe: true });
    for (let y = -2.5; y <= 4.5; y += 1.4) {
      const ringGeo = new THREE.TorusGeometry(3.62, 0.04, 8, 36);
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = Math.PI / 2;
      ringMesh.position.y = y;
      siloGroup.add(ringMesh);
    }

    // Top Conical Roof
    const roofGeo = new THREE.ConeGeometry(3.7, 1.8, 36);
    const roofMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.8,
      roughness: 0.3,
      wireframe: false
    });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = 5.9;
    siloGroup.add(roof);

    // Roof Vent & Aeration Cap
    const capGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.6, 16);
    const capMat = new THREE.MeshStandardMaterial({ color: 0x0ea5e9, metalness: 0.9, roughness: 0.2 });
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.y = 7.0;
    siloGroup.add(cap);

    // Bottom Discharge Hopper Cone
    const hopperGeo = new THREE.ConeGeometry(3.6, 2.0, 36);
    const hopperMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.7,
      roughness: 0.4
    });
    const hopper = new THREE.Mesh(hopperGeo, hopperMat);
    hopper.rotation.x = Math.PI;
    hopper.position.y = -3.9;
    siloGroup.add(hopper);

    // Silo Base Legs (Tri-pod support pylons)
    const legGeo = new THREE.CylinderGeometry(0.12, 0.15, 3.2, 8);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.9 });
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2 + Math.PI / 4;
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(Math.cos(angle) * 3.3, -4.5, Math.sin(angle) * 3.3);
      siloGroup.add(leg);
    }

    this.scene.add(siloGroup);
    this.siloGroup = siloGroup;
  }

  buildGrainLayers() {
    this.grainGroup = new THREE.Group();

    // 1. Lower nominal layer (Plenum to mid - cool emerald grain)
    const lowerGeo = new THREE.CylinderGeometry(3.4, 3.4, 3.2, 32);
    const lowerMat = new THREE.MeshStandardMaterial({
      color: 0x0d9488,
      roughness: 0.7,
      metalness: 0.1,
      transparent: true,
      opacity: 0.75
    });
    const lowerMesh = new THREE.Mesh(lowerGeo, lowerMat);
    lowerMesh.position.y = -1.4;
    this.grainGroup.add(lowerMesh);

    // 2. Upper nominal/surface layer (Golden wheat with moderate moisture)
    const upperGeo = new THREE.CylinderGeometry(3.4, 3.4, 2.4, 32);
    const upperMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.8,
      metalness: 0.1,
      transparent: true,
      opacity: 0.7
    });
    const upperMesh = new THREE.Mesh(upperGeo, upperMat);
    upperMesh.position.y = 3.2;
    this.grainGroup.add(upperMesh);

    // 3. Central Critical Respiration Hotspot (Sphere with heat glow shader / pulsating crimson)
    const hotGeo = new THREE.SphereGeometry(1.4, 24, 24);
    const hotMat = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      emissive: 0xe11d48,
      emissiveIntensity: 0.8,
      roughness: 0.3,
      transparent: true,
      opacity: 0.85
    });
    this.hotMesh = new THREE.Mesh(hotGeo, hotMat);
    this.hotMesh.position.set(0, 0.8, 0);
    this.grainGroup.add(this.hotMesh);

    // Wireframe thermal cage around hotspot
    const hotCageGeo = new THREE.IcosahedronGeometry(1.65, 1);
    const hotCageMat = new THREE.MeshBasicMaterial({
      color: 0xfb7185,
      wireframe: true,
      transparent: true,
      opacity: 0.4
    });
    this.hotCage = new THREE.Mesh(hotCageGeo, hotCageMat);
    this.hotCage.position.set(0, 0.8, 0);
    this.grainGroup.add(this.hotCage);

    this.scene.add(this.grainGroup);
  }

  buildSensorProbes() {
    this.sensorMeshes = [];
    this.probeGroup = new THREE.Group();

    // Central cable line from top to bottom
    const cableGeo = new THREE.CylinderGeometry(0.04, 0.04, 8.5, 8);
    const cableMat = new THREE.MeshBasicMaterial({ color: 0x94a3b8 });
    const cable = new THREE.Mesh(cableGeo, cableMat);
    cable.position.set(0, 0.7, 0);
    this.probeGroup.add(cable);

    // Secondary side sensor cable
    const sideCable = new THREE.Mesh(cableGeo, cableMat);
    sideCable.position.set(1.8, 0.7, 1.2);
    this.probeGroup.add(sideCable);

    // Interactive Sensor Beacon Nodes
    this.sensors.forEach((s) => {
      const nodeGroup = new THREE.Group();
      nodeGroup.position.set(0, s.y, 0);

      // Outer pulsing ring
      const ringGeo = new THREE.TorusGeometry(0.35, 0.04, 12, 24);
      const ringMat = new THREE.MeshBasicMaterial({ color: s.color, transparent: true, opacity: 0.9 });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      nodeGroup.add(ring);

      // Core LED Sphere
      const sphereGeo = new THREE.SphereGeometry(0.18, 16, 16);
      const sphereMat = new THREE.MeshStandardMaterial({
        color: s.color,
        emissive: s.color,
        emissiveIntensity: 1.2,
        roughness: 0.2
      });
      const sphere = new THREE.Mesh(sphereGeo, sphereMat);
      nodeGroup.add(sphere);

      nodeGroup.userData = s;
      this.sensorMeshes.push(nodeGroup);
      this.probeGroup.add(nodeGroup);
    });

    this.scene.add(this.probeGroup);
  }

  buildAerationFan() {
    this.fanGroup = new THREE.Group();
    this.fanGroup.position.set(0, -4.6, 2.6);

    // Intake Duct Housing
    const ductGeo = new THREE.CylinderGeometry(0.8, 0.8, 1.2, 24);
    const ductMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9 });
    const duct = new THREE.Mesh(ductGeo, ductMat);
    duct.rotation.x = Math.PI / 2;
    this.fanGroup.add(duct);

    // Turbine Rotor & Blades
    this.rotor = new THREE.Group();
    const hubGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.3, 16);
    const hubMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4 });
    const hub = new THREE.Mesh(hubGeo, hubMat);
    hub.rotation.x = Math.PI / 2;
    this.rotor.add(hub);

    const bladeGeo = new THREE.BoxGeometry(0.12, 0.65, 0.04);
    const bladeMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.8 });
    for (let i = 0; i < 6; i++) {
      const blade = new THREE.Mesh(bladeGeo, bladeMat);
      blade.rotation.z = (i * Math.PI) / 3;
      this.rotor.add(blade);
    }
    this.fanGroup.add(this.rotor);

    this.scene.add(this.fanGroup);
  }

  buildAirflowParticles() {
    const particleCount = 180;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const speeds = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const radius = Math.random() * 2.8;
      const angle = Math.random() * Math.PI * 2;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = -3.0 + Math.random() * 8.0;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
      speeds[i] = 0.03 + Math.random() * 0.05;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.22,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending
    });

    this.particleSystem = new THREE.Points(geometry, material);
    this.particleSpeeds = speeds;
    this.scene.add(this.particleSystem);
  }

  buildGroundLattice() {
    const grid = new THREE.GridHelper(30, 30, 0x06b6d4, 0x1e293b);
    grid.position.y = -6.2;
    this.scene.add(grid);
  }

  buildFloatingHUD() {
    const hud = document.createElement('div');
    hud.className = 'silo-3d-hud-overlay';
    hud.innerHTML = `
      <div class="silo-3d-presets">
        <button class="silo-hud-btn active" data-view="overview">🌐 360° Orbit</button>
        <button class="silo-hud-btn" data-view="core">🚨 Core Hotspot</button>
        <button class="silo-hud-btn" data-view="plenum">💨 Floor Fans</button>
        <button class="silo-hud-btn" data-view="top">🔝 Headspace</button>
      </div>
      <div id="silo-3d-tooltip" class="silo-3d-tooltip" style="display:none;"></div>
      <div class="silo-3d-badge">
        <span class="silo-badge-pulse"></span>
        <span>WEBGL 3D DIGITAL TWIN // ROTATE WITH DRAG</span>
      </div>
    `;
    this.container.appendChild(hud);

    // Preset click handlers
    hud.querySelectorAll('.silo-hud-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        hud.querySelectorAll('.silo-hud-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.setCameraPreset(btn.dataset.view);
      });
    });

    this.tooltipEl = hud.querySelector('#silo-3d-tooltip');
  }

  setCameraPreset(preset) {
    if (!this.controls) return;
    this.currentPreset = preset;

    if (preset === 'overview') {
      this.animateCameraTo(12, 6, 14, 0, 1, 0);
    } else if (preset === 'core') {
      this.animateCameraTo(4.5, 1.8, 5.0, 0, 0.8, 0);
    } else if (preset === 'plenum') {
      this.animateCameraTo(3.5, -3.5, 6.0, 0, -3.5, 0);
    } else if (preset === 'top') {
      this.animateCameraTo(4.0, 6.2, 5.0, 0, 4.5, 0);
    }
  }

  animateCameraTo(x, y, z, tx, ty, tz) {
    const startPos = this.camera.position.clone();
    const endPos = new THREE.Vector3(x, y, z);
    const startTarget = this.controls.target.clone();
    const endTarget = new THREE.Vector3(tx, ty, tz);

    let progress = 0;
    const anim = () => {
      progress += 0.04;
      if (progress <= 1) {
        this.camera.position.lerpVectors(startPos, endPos, progress);
        this.controls.target.lerpVectors(startTarget, endTarget, progress);
        requestAnimationFrame(anim);
      } else {
        this.camera.position.copy(endPos);
        this.controls.target.copy(endTarget);
      }
    };
    anim();
  }

  onPointerMove(e) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), this.camera);

    const hit = this.sensorMeshes.find(group => {
      const intersects = raycaster.intersectObjects(group.children);
      return intersects.length > 0;
    });

    if (hit && this.tooltipEl) {
      const data = hit.userData;
      this.tooltipEl.style.display = 'block';
      this.tooltipEl.style.left = `${e.clientX - rect.left + 15}px`;
      this.tooltipEl.style.top = `${e.clientY - rect.top - 10}px`;
      this.tooltipEl.innerHTML = `
        <div style="font-weight:800; color:#ffffff; font-size:0.82rem;">${data.name}</div>
        <div style="font-size:0.75rem; margin-top:4px; display:flex; gap:8px;">
          <span>Temp: <strong style="color:#06b6d4;">${data.temp}°C</strong></span>
          <span>RH: <strong style="color:#10b981;">${data.rh}%</strong></span>
          <span>Moisture: <strong style="color:${data.status === 'critical' ? '#f43f5e' : '#10b981'};">${data.moisture}%</strong></span>
        </div>
      `;
    } else if (this.tooltipEl) {
      this.tooltipEl.style.display = 'none';
    }
  }

  onPointerClick(e) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), this.camera);

    const hit = this.sensorMeshes.find(group => raycaster.intersectObjects(group.children).length > 0);
    if (hit) {
      const data = hit.userData;
      if (window.annarakshaAudio) window.annarakshaAudio.playTone(680, 'sine', 0.15);
      const prompt = `Diagnose Silo #28 ${data.name}: Temperature is ${data.temp}°C and Moisture is ${data.moisture}%. What intervention is required?`;
      window.dispatchEvent(new CustomEvent('annaraksha:ask-copilot', { detail: { prompt } }));
    }
  }

  onResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  animate() {
    requestAnimationFrame(this.animate);
    this.time += 0.02;

    // 1. Aeration fan rotation
    if (this.rotor && this.aerationActive) {
      this.rotor.rotation.z += this.fanSpeed;
    }

    // 2. Hotspot pulsing biological respiration heat
    if (this.hotMesh && this.hotspotLight) {
      const pulse = 1.0 + Math.sin(this.time * 3.5) * 0.18;
      this.hotMesh.scale.set(pulse, pulse, pulse);
      this.hotCage.rotation.y += 0.015;
      this.hotCage.rotation.x += 0.008;
      this.hotspotLight.intensity = 2.0 + Math.sin(this.time * 3.5) * 1.0;
    }

    // 3. Sensor node rings oscillation
    if (this.sensorMeshes) {
      this.sensorMeshes.forEach(group => {
        const ring = group.children[0];
        if (ring) ring.rotation.z += 0.02;
      });
    }

    // 4. Airflow particle convection simulation
    if (this.particleSystem && this.aerationActive) {
      const positions = this.particleSystem.geometry.attributes.position.array;
      for (let i = 0; i < this.particleSpeeds.length; i++) {
        positions[i * 3 + 1] += this.particleSpeeds[i];
        // Swirl around Y
        const x = positions[i * 3];
        const z = positions[i * 3 + 2];
        const angle = 0.015;
        positions[i * 3] = x * Math.cos(angle) - z * Math.sin(angle);
        positions[i * 3 + 2] = x * Math.sin(angle) + z * Math.cos(angle);

        // Reset if reached headspace
        if (positions[i * 3 + 1] > 5.0) {
          positions[i * 3 + 1] = -3.2;
          const r = Math.random() * 2.8;
          const a = Math.random() * Math.PI * 2;
          positions[i * 3] = Math.cos(a) * r;
          positions[i * 3 + 2] = Math.sin(a) * r;
        }
      }
      this.particleSystem.geometry.attributes.position.needsUpdate = true;
    }

    // 5. Controls damping
    if (this.controls) {
      this.controls.update();
    }

    this.renderer.render(this.scene, this.camera);
  }
}

window.Silo3DVisualizer = Silo3DVisualizer;
