
document.addEventListener("DOMContentLoaded", function () {
  var sensorReadingsDiv = document.getElementById("sensorReadings");
  var centerDisplay = document.getElementById("centerDisplay");
  var shakeButton = document.getElementById("shakeButton");
  var tiltButton = document.getElementById("tiltButton");
  var logPointsButton = document.getElementById("logPointsButton");
  var tapOverlay = document.getElementById("tapOverlay");
  var totalPoints = 0;

  // Utility function to format sensor values
  function formatValue(val) {
    return val === null ? 0 : Math.round(val);
  }

  function addPoints(pts) {
    totalPoints += pts;
  }

  // Hide the Lift & Earn UI elements so that the simulation can be displayed.
  function hideLiftEarnUI() {
    var flag = document.getElementById("flag");
    var center = document.getElementById("centerDisplay");
    var buttons = document.querySelector(".buttons");
    var sensor = document.getElementById("sensorReadings");
    if (flag) flag.style.display = "none";
    if (center) center.style.display = "none";
    if (buttons) buttons.style.display = "none";
    if (sensor) sensor.style.display = "none";
  }

  // When a success is detected, hide the Lift & Earn UI and start the simulation.
  function showSimulation() {
    hideLiftEarnUI();
    Simulation.start();
  }

  // Request sensor permission if needed (for iOS and similar)
  function requestMotionPermission(callback) {
    if (typeof DeviceMotionEvent !== "undefined" &&
        typeof DeviceMotionEvent.requestPermission === "function") {
      DeviceMotionEvent.requestPermission()
        .then(function (response) {
          if (response === "granted") {
            callback();
          } else {
            centerDisplay.innerHTML =
              "<div style='font-size:1.3rem;'>Sensor permission not granted. Please allow sensor access.</div>";
          }
        })
        .catch(function (error) {
          console.error(error);
          centerDisplay.innerHTML =
            "<div style='font-size:1.3rem;'>Error requesting sensor permission.</div>";
        });
    } else {
      callback();
    }
  }

  function requestOrientationPermission(callback) {
    if (typeof DeviceOrientationEvent !== "undefined" &&
        typeof DeviceOrientationEvent.requestPermission === "function") {
      DeviceOrientationEvent.requestPermission()
        .then(function (response) {
          if (response === "granted") {
            callback();
          } else {
            centerDisplay.innerHTML =
              "<div style='font-size:1.3rem;'>Orientation permission not granted. Please allow sensor access.</div>";
          }
        })
        .catch(function (error) {
          console.error(error);
          centerDisplay.innerHTML =
            "<div style='font-size:1.3rem;'>Error requesting orientation permission.</div>";
        });
    } else {
      callback();
    }
  }

  // Shake Test Code
  var shakeDetected = false;
  var shakeStartTime = null;
  var shakeListeningTime = 10000; // 10 seconds window
  var requiredShakeDuration = 1500; // 1.5 seconds continuous shake
  var calibratedShakeThreshold = 0.5; // adjust as needed

  function handleShakeMotion(event) {
    var acc = event.acceleration || event.accelerationIncludingGravity;
    if (!acc) return;
    var x = formatValue(acc.x),
      y = formatValue(acc.y),
      z = formatValue(acc.z);
    var magnitude = Math.sqrt(x * x + y * y + z * z);
    if (magnitude > calibratedShakeThreshold) {
      if (shakeStartTime === null) {
        shakeStartTime = Date.now();
      }
      var elapsed = Date.now() - shakeStartTime;
      // Update shake progress bar (if exists)
      var progressElem = document.getElementById("shakeProgress");
      if (progressElem) {
        var percent = Math.min(100, (elapsed / requiredShakeDuration) * 100);
        progressElem.style.width = percent + "%";
      }
      if (elapsed >= requiredShakeDuration && !shakeDetected) {
        shakeDetected = true;
        stopShakeListening();
        addPoints(10);
        showShakeSuccessScreen();
      }
    } else {
      shakeStartTime = null;
      var progressElem = document.getElementById("shakeProgress");
      if (progressElem) progressElem.style.width = "0%";
    }
  }

  function stopShakeListening() {
    window.removeEventListener("devicemotion", handleShakeMotion);
  }

  function startShakeTest() {
    shakeDetected = false;
    shakeStartTime = null;
    centerDisplay.innerHTML =
      '<div id="sensorReadings">Sensor Metrics</div>' +
      '<div style="font-size:1.3rem; margin-bottom:10px;">Shake: Shake your phone to log points!</div>' +
      '<div style="font-size:1.5rem;">PowerPoints: ' + totalPoints + "</div>" +
      '<div style="width:80%; height:20px; background:#555; margin:0 auto; border-radius:10px; overflow:hidden;">' +
      '<div id="shakeProgress" style="width:0%; height:100%; background:#0091EA;"></div></div>';
    // Request motion permission if needed, then add listener
    requestMotionPermission(function () {
      window.addEventListener("devicemotion", handleShakeMotion);
    });
    // For Chrome: show tap overlay after 5 seconds
    setTimeout(function () {
      if (navigator.userAgent.indexOf("Chrome") !== -1) {
        tapOverlay.style.display = "block";
        tapOverlay.addEventListener("click", function dismissOverlay() {
          tapOverlay.style.display = "none";
          tapOverlay.removeEventListener("click", dismissOverlay);
        });
      }
    }, 5000);
    setTimeout(function () {
      stopShakeListening();
      if (!shakeDetected) {
        centerDisplay.innerHTML =
          "<div style='font-size:1.3rem;'>No shake detected. Try again!</div>";
      }
    }, shakeListeningTime);
  }

  function showShakeSuccessScreen() {
    centerDisplay.innerHTML =
      "<div style='font-size:1.5rem; color:#0091EA; font-weight:bold;'>Shake Success! Starting simulation...</div>";
    setTimeout(showSimulation, 1000);
  }

  // Tilt Test Code
  var tiltBaseline = null;
  var requiredTiltDifference = 90; // degrees

  function handleTilt(event) {
    var currentBeta = event.beta !== null ? formatValue(event.beta) : 0;
    if (tiltBaseline === null) {
      tiltBaseline = currentBeta;
    } else {
      var diff = Math.abs(currentBeta - tiltBaseline);
      // Update tilt progress bar
      var tiltProgressElem = document.getElementById("tiltProgress");
      if (tiltProgressElem) {
        var progressPercent = Math.min(100, (diff / requiredTiltDifference) * 100);
        tiltProgressElem.style.height = progressPercent + "%";
      }
      if (diff >= requiredTiltDifference) {
        window.removeEventListener("deviceorientation", handleTilt);
        addPoints(15);
        showTiltSuccessScreen();
      }
    }
  }

  function startTiltTest() {
    tiltBaseline = null;
    centerDisplay.innerHTML =
      '<div id="sensorReadings">Sensor Metrics</div>' +
      '<div style="font-size:1.3rem; margin-bottom:10px;">Tilt: Tilt your phone by ' +
      requiredTiltDifference +
      "° to log points!</div>" +
      '<div style="font-size:1.5rem;">PowerPoints: ' + totalPoints + "</div>" +
      '<div id="tiltProgressContainer" style="width:20px; height:80px; background:#555; margin:10px auto; border-radius:10px; position:relative; overflow:hidden;">' +
      '<div id="tiltProgress" style="width:100%; height:0%; background:#0091EA; position:absolute; bottom:0;"></div></div>';
    // Request orientation permission if needed, then add listener
    requestOrientationPermission(function () {
      window.addEventListener("deviceorientation", handleTilt);
    });
  }

  function showTiltSuccessScreen() {
    centerDisplay.innerHTML =
      "<div style='font-size:1.5rem; color:#0091EA; font-weight:bold;'>Tilt Success! Starting simulation...</div>";
    setTimeout(showSimulation, 1000);
  }

  // Attach button event listeners
  shakeButton.addEventListener("click", startShakeTest);
  tiltButton.addEventListener("click", startTiltTest);
  
  // NEW: Log Points button for desktop testing triggers simulation directly
  logPointsButton.addEventListener("click", function () {
    centerDisplay.innerHTML =
      "<div style='font-size:1.5rem; color:#0091EA; font-weight:bold;'>Log Points Success! Starting simulation...</div>";
    addPoints(10); // Optionally add some points for testing
    setTimeout(showSimulation, 1000);
  });
});
