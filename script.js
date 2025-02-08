// ---------------------------
// Global variables
// ---------------------------
let scene, camera, renderer, controls, composer;
// ... (other globals)
let clock = new THREE.Clock();

// New globals for the bar overlay
let barImage;               
let barFadeStart = null;    
const barFadeDuration = 4;  // seconds

// ---------------------------
// Function: init()
// ---------------------------
function init() {
  // ... your existing init() code ...

  // (After setting up auto-rotation, etc.)
  
  // --- Add the bar overlay ---
  barImage = document.createElement("img");
  barImage.src = "textures/bar.png";
  barImage.style.position = "absolute";
  barImage.style.top = "25%";       // 25% from the top, so with 50vh height it is centered vertically
  barImage.style.left = "50%";
  barImage.style.transform = "translate(-50%, 0)";
  barImage.style.height = "50vh";   // 50% of viewport height
  barImage.style.width = "auto";
  barImage.style.opacity = "1";     // start fully opaque
  document.body.appendChild(barImage);
  
  // Begin the fade-out after 3 seconds.
  setTimeout(() => {
    barFadeStart = clock.elapsedTime;
  }, 3000);
  
  // ... rest of your init() code (event listeners, etc.) ...
}

// ---------------------------
// Function: animate()
// ---------------------------
function animate() {
  requestAnimationFrame(animate);
  
  const delta = clock.getDelta();
  
  // Update your particles and other scene objects...
  updateParticles(delta);
  // ... any other updates (nebula, galaxy, controls, etc.) ...
  
  // --- Update the bar overlay fade-out ---
  if (barFadeStart !== null) {
    let fadeElapsed = clock.elapsedTime - barFadeStart;
    if (fadeElapsed < barFadeDuration) {
      let newOpacity = 1 - fadeElapsed / barFadeDuration; // fades linearly from 1 to 0 over 4 seconds.
      barImage.style.opacity = newOpacity;
    } else {
      barImage.style.opacity = 0;
      barFadeStart = null; // stop further updating once the fade is complete.
    }
  }
  
  // Render the scene (with composer, bloom, etc.)
  controls.update();
  composer.render(delta);
}
