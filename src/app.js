import {
  FilesetResolver,
  HandLandmarker,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";

const video = document.querySelector("#webcam");
const canvas = document.querySelector("#lotusCanvas");
const ctx = canvas.getContext("2d", { alpha: true });
const statusEl = document.querySelector("#status");
const gestureEl = document.querySelector("#gesture");
const petalCountInput = document.querySelector("#petalCount");
const trailInput = document.querySelector("#trailAmount");
const glowInput = document.querySelector("#glowAmount");

// MediaPipe gives us 21 normalized points for each hand. This sketch turns a few
// stable points into art controls: palm position, finger spread, pinch, and hand angle.
let handLandmarker;
let lastVideoTime = -1;
let bloom = 0;
let palm = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
let targetPalm = { ...palm };
let fingerSpread = 0.5;
let pinch = 0;
let rotation = 0;

const lerp = (start, end, amount) => start + (end - start) * amount;
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function resizeCanvas() {
  // Draw at device-pixel resolution so the petals stay crisp on Retina displays.
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(window.innerWidth * dpr);
  canvas.height = Math.round(window.innerHeight * dpr);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function canvasPoint(landmark) {
  // The webcam is mirrored with CSS, so flip x here to keep the lotus under your hand.
  return {
    x: (1 - landmark.x) * window.innerWidth,
    y: landmark.y * window.innerHeight,
  };
}

function updateHand(landmarks) {
  // Landmark indices come from MediaPipe's hand model:
  // 0 wrist, 4 thumb tip, 8 index tip, 12 middle tip, 16 ring tip, 20 pinky tip.
  const wrist = canvasPoint(landmarks[0]);
  const indexMcp = canvasPoint(landmarks[5]);
  const pinkyMcp = canvasPoint(landmarks[17]);
  const indexTip = canvasPoint(landmarks[8]);
  const thumbTip = canvasPoint(landmarks[4]);
  const middleTip = canvasPoint(landmarks[12]);
  const ringTip = canvasPoint(landmarks[16]);
  const pinkyTip = canvasPoint(landmarks[20]);

  // Approximate the palm center from the wrist and two knuckles. This is steadier
  // than using fingertip points, which jump around during gestures.
  targetPalm = {
    x: (wrist.x + indexMcp.x + pinkyMcp.x) / 3,
    y: (wrist.y + indexMcp.y + pinkyMcp.y) / 3,
  };

  // Normalize gesture measurements by palm width so the app works whether your hand
  // is close to or far from the camera.
  const palmWidth = Math.max(distance(indexMcp, pinkyMcp), 1);
  fingerSpread =
    (distance(indexTip, pinkyTip) + distance(middleTip, ringTip) * 0.7) /
    (palmWidth * 3.2);
  pinch = Math.max(0, 1 - distance(indexTip, thumbTip) / (palmWidth * 1.05));
  rotation = Math.atan2(indexMcp.y - pinkyMcp.y, indexMcp.x - pinkyMcp.x);
  bloom = lerp(bloom, 1, 0.09);
}

function drawPetal(cx, cy, radius, width, angle, color, alpha) {
  // A single petal is just a mirrored pair of Bezier curves, rotated around the palm.
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(width, -radius * 0.28, width * 0.7, -radius * 0.9, 0, -radius);
  ctx.bezierCurveTo(-width * 0.7, -radius * 0.9, -width, -radius * 0.28, 0, 0);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha;
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

function drawLotus() {
  // This keeps the camera bright. Instead of painting a dark rectangle over the whole
  // screen, destination-out fades only the previous canvas drawing toward transparency.
  const fade = 1 - Number(trailInput.value) / 100;
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  ctx.fillStyle = `rgba(0, 0, 0, ${Math.max(0.03, fade * 0.55)})`;
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
  ctx.restore();

  // Smooth the palm target so the lotus glides instead of jittering with raw tracking.
  palm.x = lerp(palm.x, targetPalm.x, 0.18);
  palm.y = lerp(palm.y, targetPalm.y, 0.18);
  bloom = lerp(bloom, 0, 0.012);

  // The gesture values drive the flower. Wider fingers create larger petals; a pinch
  // increases the radius of the glowing seed in the middle.
  const petals = Number(petalCountInput.value);
  const glow = Number(glowInput.value) / 100;
  const openness = Math.min(1.35, Math.max(0.25, fingerSpread));
  const pulse = 1 + Math.sin(performance.now() * 0.003) * 0.045;
  const baseRadius = (70 + openness * 115 + pinch * 55) * bloom * pulse;
  const baseWidth = (20 + openness * 28) * bloom;

  if (bloom < 0.02) {
    gestureEl.textContent = "Show your hand";
    return;
  }

  gestureEl.textContent =
    pinch > 0.58 ? "Pinch: bright seed" : openness > 0.82 ? "Open hand: full bloom" : "Hand found";

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.shadowColor = `rgba(240, 143, 180, ${0.35 + glow * 0.55})`;
  ctx.shadowBlur = 18 + glow * 54;

  // Three petal rings create the lotus: large outer petals, smaller inner petals,
  // and a cooler aqua layer for a watery overlay feel.
  for (let layer = 0; layer < 3; layer += 1) {
    const layerPetals = petals - layer * 4;
    const layerRadius = baseRadius * (1 - layer * 0.22);
    const layerWidth = baseWidth * (1.1 - layer * 0.16);
    const offset = rotation + layer * 0.34 + performance.now() * 0.00018 * (layer + 1);

    for (let i = 0; i < layerPetals; i += 1) {
      const t = i / layerPetals;
      const angle = offset + t * Math.PI * 2;
      const hueShift = Math.sin(t * Math.PI * 2 + layer) * 18;
      const color =
        layer === 2
          ? `hsla(${174 + hueShift}, 76%, 68%, 0.58)`
          : `hsla(${332 + hueShift}, 88%, ${66 + layer * 6}%, 0.64)`;

      drawPetal(
        palm.x,
        palm.y,
        layerRadius * (0.82 + Math.sin(t * Math.PI * 6) * 0.06),
        layerWidth,
        angle,
        color,
        0.52 + bloom * 0.42,
      );
    }
  }

  // The center seed responds most strongly to pinching.
  const seedGradient = ctx.createRadialGradient(palm.x, palm.y, 2, palm.x, palm.y, 38 + pinch * 42);
  seedGradient.addColorStop(0, "rgba(255, 244, 190, 0.92)");
  seedGradient.addColorStop(0.42, "rgba(245, 174, 116, 0.42)");
  seedGradient.addColorStop(1, "rgba(118, 215, 209, 0)");
  ctx.fillStyle = seedGradient;
  ctx.beginPath();
  ctx.arc(palm.x, palm.y, 38 + pinch * 46, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Water rings under the bloom help show motion without obscuring the camera feed.
  ctx.save();
  ctx.globalAlpha = 0.26 * bloom;
  ctx.strokeStyle = "rgba(118, 215, 209, 0.8)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 7; i += 1) {
    const y = palm.y + baseRadius * 0.42 + i * 12;
    ctx.beginPath();
    ctx.ellipse(palm.x, y, baseRadius * (0.5 + i * 0.05), 8 + i, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

async function detectHands() {
  // Run hand detection only when a new video frame arrives, then draw every animation
  // frame so fades and pulsing stay smooth.
  if (video.currentTime !== lastVideoTime && handLandmarker) {
    lastVideoTime = video.currentTime;
    const results = handLandmarker.detectForVideo(video, performance.now());

    if (results.landmarks?.length) {
      updateHand(results.landmarks[0]);
    }
  }

  drawLotus();
  requestAnimationFrame(detectHands);
}

async function start() {
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  // Load the MediaPipe WebAssembly runtime and the hand landmark model from Google.
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm",
  );

  handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    numHands: 1,
  });

  // Browsers require localhost or HTTPS for camera access.
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: false,
  });

  video.srcObject = stream;
  await video.play();
  statusEl.textContent = "Camera ready";
  detectHands();
}

start().catch((error) => {
  console.error(error);
  statusEl.textContent = "Camera or tracker failed";
  gestureEl.textContent = error?.message || "Check camera permissions";
});
