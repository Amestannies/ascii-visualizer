/*
 * Hand gestures (Part 8). Watches the webcam with MediaPipe Hand Landmarker (21 points per hand)
 * and turns each frame into a gesture with my own rules:
 *
 *   webcam frame -> 21 landmarks -> ratios (divided by hand size) -> classifyHand -> 3-frame hold
 *     -> stable label changes: open = explode, fist = form again      (state.form)
 *     -> while pinching: dragging rotates the field                   (state.rotation)
 *
 * Like the keys, gestures only write TARGETS in state; animate() in main.ts does the easing.
 * Design and its critique: planning-decisions.md section 2. API notes: mediapipe-hands.md.
 */
import { FilesetResolver, HandLandmarker, type NormalizedLandmark } from "@mediapipe/tasks-vision";
import { state } from "./state.ts";

// both pinned to exact versions, so the downloaded runtime always matches the installed library
const wasmUrl = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/wasm';
const modelUrl = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

// the only four labels a gesture can have
type Gesture = 'pinch' | 'fist' | 'open' | 'none';

/* thresholds, from my measured poses (pinch ratio / openness):
   palm 0.83 / 1.84, pinch 0.12 / 1.74, half-closed 0.15 / 1.38, fist 0.20 / 0.76.
   ENTER and EXIT differ on purpose (hysteresis), so jitter near a threshold can't flicker the label */
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

/* straight-line distance between two landmarks, in PIXELS.
   x is a fraction of the width and y of the height, so convert both before measuring */
function distance(a: NormalizedLandmark, b: NormalizedLandmark, width: number, height: number) {
  return Math.hypot((a.x - b.x) * width, (a.y - b.y) * height);
}

/*
 * The three numbers the rules use. Dividing by hand size makes them the same whether the hand is
 * near the camera or far away.
 *   size      wrist (0) to middle-finger knuckle (9), in px
 *   pinch     thumb tip (4) to index tip (8), in hand sizes: about 0 = touching
 *   openness  average wrist-to-fingertip distance (tips 8, 12, 16, 20), in hand sizes: small = fist
 * Later, a trained PyTorch model can replace classifyHand and use these as its inputs.
 */
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
  // pinch first: a pinch pose is ALSO very open (1.74), so checking open first would hide it
  // a pinch needs a small pinch ratio AND the other fingers out (a fist's pinch ratio is small too)
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

/* load the runtime and the model ONCE; the caller keeps the promise, so the page never waits.
   VIDEO mode = frames from a stream, with increasing timestamps */
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

// starts loading now (about 22 MB the first time); awaited only once the camera is running
const handLandmarkerReady = loadHandLandmarker();

// the page elements from index.html
const webcam = document.querySelector<HTMLVideoElement>('#webcam');
if (!webcam) {
  throw new Error('Invalid ID - #webcam required');
}

const readout = document.querySelector<HTMLDivElement>('#hand-readout');
if (!readout) {
  throw new Error('Invalid ID - #hand-readout required');
}

/* asks for the camera and shows it in the <video>. Returns true if it started, false if it was
   blocked or missing, so gestures switch off and everything else keeps working */
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

/* starts detection only when BOTH the camera is on and the model has loaded, then runs its own
   loop (separate from animate(), like the keyboard listener) */
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

  // these live OUTSIDE loop so they keep their values from one frame to the next
  let lastVideoTime = -1;          // -1: no frame seen yet, so the first real frame counts as new

  let hadHand: boolean | null = null;   // null: nothing logged yet, so the first answer is logged

  let stableGesture: Gesture = 'none';   // the label the app acts on
  let candidate: Gesture = 'none';       // the label being counted
  let candidateFrames = 0;               // how many new frames in a row it has lasted
  let lastPinch: { x: number; y: number } | null = null;   // pinch point on the previous drag step, in px

  // runs once per screen refresh, but only DETECTS when the webcam has a new frame (about 30 a second)
  function loop() {
    const hasFrame = video.readyState >= video.HAVE_CURRENT_DATA;
    const isNewFrame = video.currentTime !== lastVideoTime;

    if (hasFrame && isNewFrame) {
      lastVideoTime = video.currentTime;

      // synchronous: the 21 points come back straight away, no await
      const result = handLandmarker.detectForVideo(video, performance.now());
      const hand = result.landmarks[0];   // 21 points, or undefined when no hand is in view
      const hasHand = hand !== undefined;

      // this frame's label and readout text
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

      // the readout updates EVERY new frame; the console log below only on a change
      readout.textContent = `${numbers}  [${stableGesture}]`;
      // log only when a hand appears or disappears, not 30 times a second
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

    // ask for the next call: this is what keeps the loop going
    requestAnimationFrame(loop);
  }

  loop();
}

// called without await: the rest of the page doesn't wait for the camera or the model
startHandTracking(webcam, readout);
