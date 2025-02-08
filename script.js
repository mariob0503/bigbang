// --------------------------------------------------------------------------------
// Global variables for scene, camera, renderer, controls, and simulation objects. Version 080220251549 working!
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

// For the HUD overlay:
let hudScene, hudCamera, barSprite;

// Global variable for dat.GUI:
let gui;

// Initialize the scene and start the animation loop.
init();
animate();

// --------------------------------------------------------------------------------
// Function: init()
// Sets up the scene, camera, renderer, lights, particle system, post-processing, etc.
// --------------------------------------------------------------------------------
function init() {
  // Create the main scene.
  scene = new THREE.Scene();
  // Explicitly set a background color (black) so that the scene is not transparent.
  scene.background = new THREE.Color(0x000000);

  // Create the main perspective camera.
  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    10000
  );
  camera.position.set(0, 0, 200);

  // Create the WebGL renderer.
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  // Disable autoClear so that when we later render the HUD overlay, it doesn't wipe out the composer output.
  renderer.autoClear = false;
  document.body.appendChild(renderer.domElement);

  // Add OrbitControls.
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.autoRotate = false; // Initially disabled.

  // Add ambient and point lights.
  const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
  scene.add(ambientLight);
  const pointLight = new THREE.PointLight(0xffffff, 2, 1000);
  pointLight.position.set(0, 0, 0);
  pointLight.castShadow = true;
  scene.add(pointLight);

  // Set up post-processing with EffectComposer and bloom.
  composer = new THREE.EffectComposer(renderer);
  let renderPass = new THREE.RenderPass(scene, camera);
  composer.addPass(renderPass);
  let bloomPass = new THREE.UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.5, // strength
    0.4, // radius
    0.85 // threshold
  );
  // Adjust parameters as desired.
  bloomPass.threshold = 0;
  bloomPass.strength = 2;
  bloomPass.radius = 0.5;
  composer.addPass(bloomPass);

  // Ensure the final pass renders to the screen.
  bloomPass.renderToScreen = true;

  // Create the Big Bang particle system.
  createParticleSystem();

  // Set up dat.GUI controls.
  setupGUI();

  // Create a HUD scene and an orthographic camera for the overlay.
  hudScene = new THREE.Scene();
  {
    const width = window.innerWidth;
    const height = window.innerHeight;
    hudCamera = new THREE.OrthographicCamera(
      -width / 2, width / 2,
       height / 2, -height / 2,
      0.1, 10
    );
    hudCamera.position.z = 1;
  }

  // Automatically enable auto-rotation after 3 seconds with a smooth ramp-up.
  setTimeout(() => {
    controls.autoRotate = true;
    const rampDuration = 3; // seconds
    const targetSpeed = 1.0;
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

    // Hide the dat.GUI controls.
    if (gui && gui.domElement) {
      gui.domElement.style.display = 'none';
    }
    // Disable OrbitControls to prevent further user interaction.
    controls.enabled = false;

    // Load bar.png and add it as a centered HUD sprite.
    const loader = new THREE.TextureLoader();
    loader.load('textures/bar.png', function(texture) {
      // Create a sprite material with initial opacity 0.
      const material = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0 });
      barSprite = new THREE.Sprite(material);
      // Set the sprite's scale to 50% of the window's height.
      const spriteScale = window.innerHeight * 0.50;
      barSprite.scale.set(spriteScale, spriteScale, 1);
      // Center the sprite.
      barSprite.position.set(0, 0, 0);
      hudScene.add(barSprite);
    });
  }, 3000);

  // Listen for window resize events.
  window.addEventListener("resize", onWindowResize, false);
}

// --------------------------------------------------------------------------------
// Function: createParticleSystem()
// Creates the particle system for the Big Bang explosion.
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
    let speed = Math.random() * 0.5 + 0.5;
    particleVelocities[i * 3] = speed * Math.sin(phi) * Math.cos(theta);
    particleVelocities[i * 3 + 1] = speed * Math.sin(phi) * Math.sin(theta);
    particleVelocities[i * 3 + 2] = speed * Math.cos(phi);
  }
  geometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));

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
// Generates a soft-glow sprite texture using canvas drawing.
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
// Sets up dat.GUI controls for simulation parameters.
// --------------------------------------------------------------------------------
function setupGUI() {
  params = {
    expansionSpeed: 50,
    particleSize: 2,
    bloomStrength: 2,
    bloomRadius: 0.5,
    bloomThreshold: 0,
  };
  gui = new dat.GUI({ width: 300 });
  gui.add(params, "expansionSpeed", 10, 200).name("Expansion Speed");
  gui.add(params, "particleSize", 1, 10).name("Particle Size").onChange((value) => {
    particleSystem.material.size = value;
  });
  gui.add(params, "bloomStrength", 0, 5).name("Bloom Strength").onChange((value) => {
    composer.passes[1].strength = value;
  });
  gui.add(params, "bloomRadius", 0, 1).name("Bloom Radius").onChange((value) => {
    composer.passes[1].radius = value;
  });
  gui.add(params, "bloomThreshold", 0, 1).name("Bloom Threshold").onChange((value) => {
    composer.passes[1].threshold = value;
  });
}

// --------------------------------------------------------------------------------
// Function: onWindowResize()
// Updates cameras and renderer when the window is resized.
// --------------------------------------------------------------------------------
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);

  const width = window.innerWidth;
  const height = window.innerHeight;
  hudCamera.left = -width / 2;
  hudCamera.right = width / 2;
  hudCamera.top = height / 2;
  hudCamera.bottom = -height / 2;
  hudCamera.updateProjectionMatrix();
}

// --------------------------------------------------------------------------------
// Function: animate()
// The main animation loop.
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
    nebula.material.opacity = Math.min(nebulaTargetOpacity, (fadeElapsed / nebulaFadeDuration) * nebulaTargetOpacity);
  }

  // Update the bar sprite's opacity based on elapsed time:
  // - From 0 to 3 seconds: no bar (opacity 0)
  // - From 3 to 6 seconds: fade in from 0 to 1
  // - From 6 to 9 seconds: fade out from 1 to 0
  if (barSprite) {
    if (elapsed < 3) {
      barSprite.material.opacity = 0;
    } else if (elapsed >= 3 && elapsed <= 6) {
      barSprite.material.opacity = (elapsed - 3) / 3;
    } else if (elapsed > 6 && elapsed <= 9) {
      barSprite.material.opacity = 1 - ((elapsed - 6) / 3);
    } else {
      barSprite.material.opacity = 0;
    }
  }

  controls.update();

  // Clear the renderer manually since autoClear is false.
  renderer.clear();

  // Render the main scene using the composer.
  composer.render(delta);

  // Render the HUD overlay (bar.png) on top of the main scene.
  renderer.clearDepth();
  renderer.render(hudScene, hudCamera);
}

// --------------------------------------------------------------------------------
// Function: updateParticles()
// Updates the Big Bang explosion particle positions.
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
// Creates a secondary particle system representing galaxy clusters.
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
// Creates a nebula (cosmic fog) with a custom-generated texture.
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
// Generates a texture for the nebula using canvas drawing.
// --------------------------------------------------------------------------------
function generateNebulaTexture() {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  const gradient = context.createRadialGradient(size/2, size/2, size/8, size/2, size/2, size/2);
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
