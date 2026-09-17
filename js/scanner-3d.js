/**
 * Annaraksha AI - 3D Holographic Grain Kernel Scanner (Three.js)
 * Bitexindustries Private Limited / Unbeatable Foods
 * 
 * Features:
 * - Procedural 3D organic wheat/rice kernel geometry with germ crease
 * - Dynamic 3D laser slicing plane showing internal moisture density strata
 * - 3D defect biometric markers (Sitophilus oryzae larva, fungal hyphae, internal stress fracture)
 * - OrbitControls for full 3D rotation, inspection, and zoom
 * - Holographic Wireframe vs Spectral Heatmap visualization modes
 */

class GrainScanner3D {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    this.time = 0;
    this.laserDirection = 1;
    this.laserPos = 0;
    this.isWireframe = false;
    this.currentPreset = 'wheat_high_moisture';

    this.init();
  }

  init() {
    this.container.innerHTML = '';
    this.container.style.position = 'relative';

    const width = this.container.clientWidth || 500;
    const height = this.container.clientHeight || 340;

    // 1. Scene & Camera
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 50);
    this.camera.position.set(0, 2.5, 6.5);

    // 2. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.container.appendChild(this.renderer.domElement);

    // 3. OrbitControls
    if (window.THREE && window.THREE.OrbitControls) {
      this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.05;
      this.controls.maxDistance = 12;
      this.controls.minDistance = 2.5;
    }

    // 4. Lighting
    const ambient = new THREE.AmbientLight(0x0f172a, 1.5);
    this.scene.add(ambient);

    const cyanLight = new THREE.DirectionalLight(0x06b6d4, 2.0);
    cyanLight.position.set(5, 5, 5);
    this.scene.add(cyanLight);

    const emeraldLight = new THREE.DirectionalLight(0x10b981, 1.2);
    emeraldLight.position.set(-5, -3, -5);
    this.scene.add(emeraldLight);

    // 5. Build Kernel 3D Model
    this.buildKernelGeometry();
    this.buildLaserSlicingPlane();
    this.buildDefectMarkers();
    this.buildHolographicRings();

    // 6. UI Overlays
    this.buildHUDControls();

    // 7. Events
    window.addEventListener('resize', () => this.onResize());

    // 8. Animation loop
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  buildKernelGeometry() {
    this.kernelGroup = new THREE.Group();

    // Procedural organic grain kernel shape using Lathe or Parametric Sphere
    // An elongated ellipsoid with slight curved crease
    const sphereGeo = new THREE.SphereGeometry(1.4, 32, 24);
    // Deform vertices to simulate a grain kernel (elongated Y, pinched ends, ventral groove crease)
    const pos = sphereGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);

      // Elongate Y
      y *= 1.85;

      // Pinch top tip (brush tip) and base (germ)
      const taper = 1.0 - Math.pow(Math.abs(y) / 2.7, 1.6) * 0.35;
      x *= taper;
      z *= taper;

      // Ventral crease indentation along positive Z axis
      if (z > 0 && Math.abs(x) < 0.6) {
        z -= (0.5 - Math.abs(x) * 0.5) * 0.45;
      }

      pos.setXYZ(i, x, y, z);
    }
    sphereGeo.computeVertexNormals();

    // Material: Holographic translucent matrix with internal glow
    this.kernelMat = new THREE.MeshPhysicalMaterial({
      color: 0x06b6d4,
      emissive: 0x0284c7,
      emissiveIntensity: 0.35,
      roughness: 0.25,
      metalness: 0.2,
      transmission: 0.7,
      transparent: true,
      opacity: 0.82,
      wireframe: false
    });

    this.kernelMesh = new THREE.Mesh(sphereGeo, this.kernelMat);
    this.kernelGroup.add(this.kernelMesh);

    // Holographic Wireframe Lattice Overlay
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.25
    });
    this.wireMesh = new THREE.Mesh(sphereGeo, wireMat);
    this.kernelGroup.add(this.wireMesh);

    this.scene.add(this.kernelGroup);
  }

  buildLaserSlicingPlane() {
    this.laserGroup = new THREE.Group();

    // Glowing laser beam plane
    const planeGeo = new THREE.PlaneGeometry(3.6, 3.6);
    const planeMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide
    });
    const plane = new THREE.Mesh(planeGeo, planeMat);
    plane.rotation.x = Math.PI / 2;
    this.laserGroup.add(plane);

    // Glowing perimeter wire border for laser
    const edgeGeo = new THREE.EdgesGeometry(planeGeo);
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 2 });
    const edge = new THREE.LineSegments(edgeGeo, edgeMat);
    edge.rotation.x = Math.PI / 2;
    this.laserGroup.add(edge);

    // Center laser line
    const laserLineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-1.8, 0, 0),
      new THREE.Vector3(1.8, 0, 0)
    ]);
    const laserLineMat = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 3 });
    const laserLine = new THREE.Line(laserLineGeo, laserLineMat);
    this.laserGroup.add(laserLine);

    this.scene.add(this.laserGroup);
  }

  buildDefectMarkers() {
    this.defectGroup = new THREE.Group();

    // Defect 1: Sitophilus Larva Cavity (Core respiration marker)
    const d1Geo = new THREE.SphereGeometry(0.22, 16, 16);
    const d1Mat = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      emissive: 0xf43f5e,
      emissiveIntensity: 1.2
    });
    this.d1Mesh = new THREE.Mesh(d1Geo, d1Mat);
    this.d1Mesh.position.set(0.2, 0.4, 0.1);
    this.defectGroup.add(this.d1Mesh);

    // Defect 2: High moisture concentration pocket
    const d2Geo = new THREE.SphereGeometry(0.28, 16, 16);
    const d2Mat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.9
    });
    this.d2Mesh = new THREE.Mesh(d2Geo, d2Mat);
    this.d2Mesh.position.set(-0.3, -0.6, -0.15);
    this.defectGroup.add(this.d2Mesh);

    this.kernelGroup.add(this.defectGroup);
  }

  buildHolographicRings() {
    this.ringsGroup = new THREE.Group();

    // Coordinate HUD orbital ring
    const ringGeo = new THREE.TorusGeometry(2.4, 0.02, 8, 48);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.35 });
    const ring1 = new THREE.Mesh(ringGeo, ringMat);
    ring1.rotation.x = Math.PI / 3;
    this.ringsGroup.add(ring1);

    const ring2 = new THREE.Mesh(ringGeo, ringMat);
    ring2.rotation.y = Math.PI / 3;
    this.ringsGroup.add(ring2);

    this.scene.add(this.ringsGroup);
  }

  buildHUDControls() {
    const hud = document.createElement('div');
    hud.className = 'scanner-3d-hud';
    hud.innerHTML = `
      <div style="position:absolute; top:10px; left:10px; display:flex; gap:6px; z-index:10;">
        <button id="scanner-3d-wire-btn" class="scanner-hud-btn">🌐 Wireframe</button>
        <button id="scanner-3d-rotate-btn" class="scanner-hud-btn active">🔄 Auto-Rotate</button>
      </div>
      <div style="position:absolute; bottom:10px; left:10px; font-size:0.7rem; font-family:var(--font-mono); color:#06b6d4; background:rgba(7,11,20,0.85); border:1px solid rgba(6,182,212,0.3); padding:4px 8px; border-radius:4px;">
        <span>Z-LASER SLICE: <strong id="scanner-laser-pos">0.00 mm</strong></span>
      </div>
    `;
    this.container.appendChild(hud);

    this.autoRotate = true;
    hud.querySelector('#scanner-3d-rotate-btn').addEventListener('click', (e) => {
      this.autoRotate = !this.autoRotate;
      e.target.classList.toggle('active', this.autoRotate);
    });

    hud.querySelector('#scanner-3d-wire-btn').addEventListener('click', (e) => {
      this.isWireframe = !this.isWireframe;
      this.kernelMat.wireframe = this.isWireframe;
      e.target.classList.toggle('active', this.isWireframe);
    });
  }

  setPreset(preset) {
    this.currentPreset = preset;
    if (preset === 'wheat_high_moisture') {
      this.kernelMat.color.setHex(0xf59e0b);
      this.kernelMat.emissive.setHex(0xd97706);
      this.d1Mesh.position.set(0.2, 0.4, 0.1);
      this.d2Mesh.position.set(-0.3, -0.6, -0.15);
    } else if (preset === 'rice_weevil') {
      this.kernelMat.color.setHex(0xf43f5e);
      this.kernelMat.emissive.setHex(0xe11d48);
      this.d1Mesh.position.set(0.0, 0.2, 0.2);
    } else if (preset === 'chana_grade_a') {
      this.kernelMat.color.setHex(0x10b981);
      this.kernelMat.emissive.setHex(0x059669);
      this.d1Mesh.position.set(0, -99, 0); // Hide defect
      this.d2Mesh.position.set(0, -99, 0);
    } else if (preset === 'bajra_mold') {
      this.kernelMat.color.setHex(0x8b5cf6);
      this.kernelMat.emissive.setHex(0x6d28d9);
      this.d1Mesh.position.set(0.1, 0.5, 0.2);
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

    // Laser slicing oscillation along Y
    this.laserPos += 0.03 * this.laserDirection;
    if (this.laserPos > 2.2) this.laserDirection = -1;
    if (this.laserPos < -2.2) this.laserDirection = 1;

    if (this.laserGroup) {
      this.laserGroup.position.y = this.laserPos;
      const posLabel = document.getElementById('scanner-laser-pos');
      if (posLabel) posLabel.textContent = `${(this.laserPos * 1.5).toFixed(2)} mm`;
    }

    // Auto rotate kernel
    if (this.autoRotate && this.kernelGroup) {
      this.kernelGroup.rotation.y += 0.012;
      this.kernelGroup.rotation.x = Math.sin(this.time * 0.5) * 0.15;
    }

    // Orbital rings rotation
    if (this.ringsGroup) {
      this.ringsGroup.rotation.z += 0.005;
      this.ringsGroup.rotation.y -= 0.008;
    }

    // Defect pulsing
    if (this.d1Mesh) {
      const p = 1.0 + Math.sin(this.time * 6) * 0.25;
      this.d1Mesh.scale.set(p, p, p);
    }

    if (this.controls) this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}

window.GrainScanner3D = GrainScanner3D;
