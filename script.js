// --------------------------------------------------------------------------------
// Global variables for scene, camera, renderer, controls, and simulation objects.
// --------------------------------------------------------------------------------
let scene, camera, renderer, controls, composer;
let particleSystem, particlePositions, particleVelocities;
let galaxySystem = null; // Will hold the galaxy cluster (added later)
let nebula = null;       // Will hold the nebula background (cosmic fog)
let particleCount = 20000; // Number of particles for the Big Bang explosion
let params;              // Object to store parameters controlled by the UI
let clock = new THREE.Clock(); // Clock to keep track of elapsed time

// For nebula fade-in:
let nebulaFadeStartTime = 0;
const nebulaFadeDuration = 3; // seconds
const nebulaTargetOpacity = 0.7;

// Global variable for the bar overlay (no fade-out functionality)
let barImage;

// Initialize the scene and start the animation loop.
init();
animate();

// --------------------------------------------------------------------------------
// Function: init()
// Sets up the scene, camera, renderer, lights, particle system, post-processing, etc.
// --------------------------------------------------------------------------------
function init() {
  // Create a new scene.
  scene = new THREE.Scene();
  // (Optional) Add fog if desired:
  // scene.fog = new THREE.FogExp2(0x000000, 0.00025);

  // Create a perspective camera.
  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    10000
  );
  camera.position.set(0, 0, 200);

  // Create the WebGL renderer with antialiasing.
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true; // Enable shadow maps for realism.
  document.body.appendChild(renderer.domElement);

  // Add OrbitControls.
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.autoRotate = false; // Initially disable auto-rotation.

  // Add ambient light.
  const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
  scene.add(ambientLight);

  // Add a point light at the origin.
  const pointLight = new THREE.PointLight(0xffffff, 2, 1000);
  pointLight.position.set(0, 0, 0);
  pointLight.castShadow = true;
  scene.add(pointLight);

  // Set up post-processing using EffectComposer.
  composer = new THREE.EffectComposer(renderer);
  let renderPass = new THREE.RenderPass(scene, camera);
  composer.addPass(renderPass);
  let bloomPass = new THREE.UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.5, // strength
    0.4, // radius
    0.85 // threshold
  );
  // UPDATED: Set the initial threshold to 0.095 to match the desired default.
  bloomPass.threshold = 0.095;
  bloomPass.strength = 2;
  bloomPass.radius = 0.5;
  composer.addPass(bloomPass);

  // Create the primary particle system.
  createParticleSystem();

  // Set up UI controls with dat.GUI.
  setupGUI();

  // Automatically enable auto-rotation after 3 seconds.
  setTimeout(() => {
    controls.autoRotate = true;
    const rampDuration = 3; // seconds
    const targetSpeed = 1.0; // final autoRotateSpeed value
    const startTime = clock.elapsedTime;
    function rampAutoRotate() {
      let elapsed = clock.elapsedTime - startTime;
      let t = elapsed / rampDuration;
      if (t > 1) t = 1;
      controls.autoRotateSpeed = targetSpeed * t;
      if (t < 1) {
        requestAnimationFrame(rampAutoRotate);
      }
    }
    rampAutoRotate();
  }, 3000);

  // --- Add the bar overlay ---
  barImage = document.createElement("img");
  barImage.src = "textures/bar.png";
  // Set initial opacity to 0.
  barImage.style.opacity = "0";
  barImage.style.position = "absolute";
  barImage.style.top = "25%";    // Centered vertically if height is 50%
  barImage.style.left = "50%";   // Center horizontally.
  barImage.style.transform = "translate(-50%, 0)";
  barImage.style.height = "50vh"; // 50% of viewport height.
  barImage.style.width = "auto";  // Maintain aspect ratio.
  // Add a CSS transition to smoothly animate opacity over 4 seconds.
  barImage.style.transition = "opacity 4s ease";
  document.body.appendChild(barImage);

  // Trigger the bar fade-in 3 seconds after page load.
  setTimeout(() => {
    barImage.style.opacity = "1";
  }, 3000);

  // Listen for window resize events.
  window.addEventListener("resize", onWindowResize, false);
}

// --------------------------------------------------------------------------------
// Function: createParticleSystem()
// Creates a particle system where all particles start at the singularity.
// --------------------------------------------------------------------------------
function createParticleSystem() {
  const geometry = new THREE.BufferGeometry();
  particlePositions = new Float32Array(particleCount * 3);
  particleVelocities = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount; i++) {
    particlePositions[i * 3] = 0;
    particlePositions[i * 3 + 1] = 0;
    particlePositions[i * 3 + 2] = 0;
    let theta = Math.random() * 2 * Math.PI;
    let phi = Math.acos(Math.random() * 2 - 1);
    let speed = Math.random() * 0.5 + 0.5; // Speed between 0.5 and 1.0.
    particleVelocities[i * 3] = speed * Math.sin(phi) * Math.cos(theta);
    particleVelocities[i * 3 + 1] = speed * Math.sin(phi) * Math.sin(theta);
    particleVelocities[i * 3 + 2] = speed * Math.cos(phi);
  }
  geometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));

  // Create a PointsMaterial with a custom sprite texture.
  const sprite = generateSprite();
  const material = new THREE.PointsMaterial({
    size: 2,
    map: sprite,
    blending: THREE.AdditiveBlending,
    depthTest: false,
    transparent: true,
    opacity: 0.8,
    color: 0xffffff,
  });

  particleSystem = new THREE.Points(geometry, material);
  scene.add(particleSystem);
}

// --------------------------------------------------------------------------------
// Function: generateSprite()
// Generates a circular, glowing sprite texture using the canvas element.
// --------------------------------------------------------------------------------
function generateSprite() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext("2d");

  const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
  gradient.addColorStop(0.2, "rgba(255, 200, 200, 0.8)");
  gradient.addColorStop(0.4, "rgba(200, 100, 100, 0.6)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  return texture;
}

// --------------------------------------------------------------------------------
// Function: setupGUI()
// Sets up a dat.GUI panel to let users control simulation parameters.
// --------------------------------------------------------------------------------
function setupGUI() {
  // <-- CHANGED DEFAULT VALUES BELOW:
  params = {
    expansionSpeed: 50,   // Expansion Speed: 50
    particleSize: 1.5,    // Particle Size: 1.5
    bloomStrength: 0.2,   // Bloom Strength: 0.2
    bloomRadius: 0.05,    // Bloom Radius: 0.05
    bloomThreshold: 0.095 // UPDATED: Bloom Threshold: 0.095
  };

  const gui = new dat.GUI({ width: 300 });
  gui.add(params, "expansionSpeed", 10, 200).name("Expansion Speed");
  gui
    .add(params, "particleSize", 1, 10)
    .name("Particle Size")
    .onChange((value) => {
      particleSystem.material.size = value;
    });
  gui
    .add(params, "bloomStrength", 0, 5)
    .name("Bloom Strength")
    .onChange((value) => {
      composer.passes[1].strength = value;
    });
  gui
    .add(params, "bloomRadius", 0, 1)
    .name("Bloom Radius")
    .onChange((value) => {
      composer.passes[1].radius = value;
    });
  gui
    .add(params, "bloomThreshold", 0, 1)
    .name("Bloom Threshold")
    .onChange((value) => {
      composer.passes[1].threshold = value;
    });
  
  // Collapse the control panel on startup.
  gui.close();
}

// --------------------------------------------------------------------------------
// Function: onWindowResize()
// Adjusts the camera aspect ratio and renderer size on window resize.
// --------------------------------------------------------------------------------
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
}

// --------------------------------------------------------------------------------
// Function: animate()
// The main animation loop: updates particle positions, adds additional elements, and renders.
// --------------------------------------------------------------------------------
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  updateParticles(delta);

  let elapsed = clock.elapsedTime;
  if (elapsed > 10 && !galaxySystem) {
    createGalaxyCluster();
  }
  if (elapsed > 8 && !nebula) {
    createNebula();
  }
  if (nebula && nebula.material.opacity < nebulaTargetOpacity) {
    let fadeElapsed = clock.elapsedTime - nebulaFadeStartTime;
    nebula.material.opacity = Math.min(
      nebulaTargetOpacity,
      (fadeElapsed / nebulaFadeDuration) * nebulaTargetOpacity
    );
  }

  controls.update();
  composer.render(delta);
}

// --------------------------------------------------------------------------------
// Function: updateParticles()
// Moves each particle outward based on its velocity and expansion speed.
// --------------------------------------------------------------------------------
function updateParticles(delta) {
  const positions = particleSystem.geometry.attributes.position.array;
  for (let i = 0; i < particleCount; i++) {
    let index = i * 3;
    positions[index] += particleVelocities[index] * params.expansionSpeed * delta;
    positions[index + 1] += particleVelocities[index + 1] * params.expansionSpeed * delta;
    positions[index + 2] += particleVelocities[index + 2] * params.expansionSpeed * delta;
  }
  particleSystem.geometry.attributes.position.needsUpdate = true;
}

// --------------------------------------------------------------------------------
// Function: createGalaxyCluster()
// Creates a secondary particle system for galaxy clusters.
// --------------------------------------------------------------------------------
function createGalaxyCluster() {
  const galaxyCount = 5000;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(galaxyCount * 3);

  for (let i = 0; i < galaxyCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 1000;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 1000;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 1000;
  }
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    size: 1.5,
    color: 0xaaaaaa,
    blending: THREE.AdditiveBlending,
    transparent: true,
    opacity: 0.5,
    depthTest: false,
  });

  galaxySystem = new THREE.Points(geometry, material);
  scene.add(galaxySystem);
}

// --------------------------------------------------------------------------------
// Function: createNebula()
// Creates a large, semi-transparent sphere to simulate a nebula.
// --------------------------------------------------------------------------------
function createNebula() {
  const nebulaGeometry = new THREE.SphereGeometry(500, 32, 32);
  const texture = generateNebulaTexture();
  const nebulaMaterial = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.BackSide,
    transparent: true,
    opacity: 0.0,
  });
  nebula = new THREE.Mesh(nebulaGeometry, nebulaMaterial);
  scene.add(nebula);
  nebulaFadeStartTime = clock.elapsedTime;
}

// --------------------------------------------------------------------------------
// Function: generateNebulaTexture()
// Uses canvas drawing to create a nebula-like texture with gradient and noise.
// --------------------------------------------------------------------------------
function generateNebulaTexture() {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");

  const gradient = context.createRadialGradient(
    size / 2,
    size / 2,
    size / 8,
    size / 2,
    size / 2,
    size / 2
  );
  gradient.addColorStop(0, "rgba(50, 0, 100, 0.8)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0.0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  for (let i = 0; i < 1000; i++) {
    context.fillStyle = "rgba(255,255,255," + Math.random() * 0.1 + ")";
    const x = Math.random() * size;
    const y = Math.random() * size;
    context.fillRect(x, y, 1, 1);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  return texture;
}
