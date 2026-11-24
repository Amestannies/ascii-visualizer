import { FilesetResolver, HandLandmarker, type NormalizedLandmark } from "@mediapipe/tasks-vision";
import { state } from "./state.ts";

const wasmUrl = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/wasm';
const modelUrl = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

type Gesture = 'pinch' | 'fist' | 'open' | 'none';

const PINCH_ENTER = 0.25;          // become pinch below this pinch ratio...
const PINCH_EXIT = 0.35;           // ...stay pinch while below this one
const PINCH_MIN_OPENNESS = 1.55;   // a pinch also needs the other fingers out
const FIST_ENTER = 1.00;           // become fist below this openness...
const FIST_EXIT = 1.15;            // ...stay fist while below this one
const OPEN_ENTER = 1.65;           // become open above this openness...
const OPEN_EXIT = 1.55;            // ...stay open while above this one
const STABLE_FRAMES = 3;           // a new label must repeat this many new frames in a row
/* pinch-drag (design choices, not measurements: tune by feel) */
const MIRROR_X = -1;                       // the preview is mirrored: hand moving right = camera x DEcreasing
const RADIANS_PER_PIXEL = Math.PI / 640;   // dragging across the whole 640 px camera width = half a turn
const DEAD_ZONE_PX = 3;                    // ignore smaller moves, so a still pinch doesn't creep

function distance(a: NormalizedLandmark, b: NormalizedLandmark, width: number, height: number) {
  return Math.hypot((a.x - b.x) * width, (a.y - b.y) * height);
}

function handFeatures(hand: NormalizedLandmark[], width: number, height: number) {
  const wrist = hand[0];

  const size = distance(wrist, hand[9], width, height);

  const pinch = distance(hand[4], hand[8], width, height) / size;

  const tips = [8, 12, 16, 20];
  let tipTotal = 0;
  for (const tip of tips) {
    tipTotal += distance(wrist, hand[tip], width, height);
  }
  const openness = tipTotal / tips.length / size;

  return { size, pinch, openness };
}

/* one frame's label. Checked in priority order; `current` picks enter or exit thresholds (hysteresis) */
function classifyHand(features: { pinch: number; openness: number }, current: Gesture): Gesture {
  const pinchLimit = current === 'pinch' ? PINCH_EXIT : PINCH_ENTER;
  if (features.pinch < pinchLimit && features.openness > PINCH_MIN_OPENNESS) {
    return 'pinch';
  }

  const fistLimit = current === 'fist' ? FIST_EXIT : FIST_ENTER;
  if (features.openness < fistLimit) {
    return 'fist';
  }

  const openLimit = current === 'open' ? OPEN_EXIT : OPEN_ENTER;
  if (features.openness > openLimit) {
    return 'open';
  }

  return 'none';
}

async function loadHandLandmarker() {
  const vision = await FilesetResolver.forVisionTasks(wasmUrl);
  return HandLandmarker.createFromOptions(vision,
    {
      baseOptions: { modelAssetPath: modelUrl, delegate: 'GPU' },
      runningMode: 'VIDEO',
      numHands: 1,
    });
}

/* runs only when the stable gesture CHANGES: writes the form target, never explode */
function applyGesture(gesture: Gesture) {
  if (gesture === 'open') {
    state.form = 0;   // apart
  } else if (gesture === 'fist') {
    state.form = 1;   // together
  }
  // 'pinch' and 'none' leave form alone
}

const handLandmarkerReady = loadHandLandmarker();

const webcam = document.querySelector<HTMLVideoElement>('#webcam');
if (!webcam) {
  throw new Error('Invalid ID - #webcam required');
}

const readout = document.querySelector<HTMLDivElement>('#hand-readout');
if (!readout) {
  throw new Error('Invalid ID - #hand-readout required');
}

async function startWebcam(video: HTMLVideoElement) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;

    video.addEventListener('loadeddata', () => {
      console.log('webcam', video.videoWidth, 'x', video.videoHeight);
    }, { once: true });

    return true;
  } catch (error) {
    console.warn('Webcam unavailable, gestures are off. Keys still work.', error);
    return false;
  }
}

async function startHandTracking(video: HTMLVideoElement, readout: HTMLDivElement) {
  const cameraOn = await startWebcam(video);
  if (!cameraOn) {
    return;
  }

  let handLandmarker: HandLandmarker;
  try {
    handLandmarker = await handLandmarkerReady;
  } catch (error) {
    console.warn('Hand model failed to load, gestures are off. Keys still work.', error);
    return;
  }

  let lastVideoTime = -1;

  let hadHand: boolean | null = null;

  let stableGesture: Gesture = 'none';
  let candidate: Gesture = 'none';
  let candidateFrames = 0;
  let lastPinch: { x: number; y: number } | null = null;

  function loop() {
    const hasFrame = video.readyState >= video.HAVE_CURRENT_DATA;
    const isNewFrame = video.currentTime !== lastVideoTime;

    if (hasFrame && isNewFrame) {
      lastVideoTime = video.currentTime;

      const result = handLandmarker.detectForVideo(video, performance.now());
      const hand = result.landmarks[0];
      const hasHand = hand !== undefined;

      let raw: Gesture = 'none';
      let numbers = 'no hand';
      if (hand) {
        const features = handFeatures(hand, video.videoWidth, video.videoHeight);
        raw = classifyHand(features, stableGesture);
        numbers =
          ` size ${features.size.toFixed(0)}px ` +
          ` pinch ${features.pinch.toFixed(2)} ` +
          ` open ${features.openness.toFixed(2)} `;
      }

      /* 3-frame hold: count how long the same raw label has lasted */
      if (raw === candidate) {
        candidateFrames += 1;
      } else {
        candidate = raw;
        candidateFrames = 1;
      }

      if (candidateFrames >= STABLE_FRAMES && candidate !== stableGesture) {
        stableGesture = candidate;
        console.log('gesture', stableGesture);
        applyGesture(stableGesture);
      }

      /* pinch-drag: move the rotation TARGET by how far the pinch point moved */
      if (stableGesture === 'pinch' && hand) {
        const point = {
          x: (hand[4].x + hand[8].x) / 2 * video.videoWidth,
          y: (hand[4].y + hand[8].y) / 2 * video.videoHeight,
        };

        if (lastPinch === null) {
          lastPinch = point;   // drag starts here: no jump on the first frame
        } else {
          const dx = point.x - lastPinch.x;
          const dy = point.y - lastPinch.y;

          if (Math.hypot(dx, dy) >= DEAD_ZONE_PX) {
            state.rotation.y += MIRROR_X * dx * RADIANS_PER_PIXEL;   // left-right drag turns around the vertical axis
            state.rotation.x += dy * RADIANS_PER_PIXEL;              // up-down drag tips around the horizontal axis
            lastPinch = point;   // only move the reference when the move counted
          }
        }
      } else {
        lastPinch = null;   // not pinching: the next pinch starts a new drag
      }

      readout.textContent = `${numbers}  [${stableGesture}]`;
      if (hasHand !== hadHand) {
        if (hand) {
          const indexTip = hand[8];
          console.log('hand',
            'x', indexTip.x.toFixed(2),
            'y', indexTip.y.toFixed(2));
        } else {
          console.log('no hand');
        }
        hadHand = hasHand;
      }
    }

    requestAnimationFrame(loop);
  }

  loop();
}

startHandTracking(webcam, readout);
