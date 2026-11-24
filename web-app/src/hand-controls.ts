import { FilesetResolver, HandLandmarker, type NormalizedLandmark } from "@mediapipe/tasks-vision";

const wasmUrl = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/wasm';
const modelUrl = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

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

async function loadHandLandmarker() {
  const vision = await FilesetResolver.forVisionTasks(wasmUrl);
  return HandLandmarker.createFromOptions(vision,
    {
      baseOptions: { modelAssetPath: modelUrl, delegate: 'GPU' },
      runningMode: 'VIDEO',
      numHands: 1,
    });
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

  function loop() {
    const hasFrame = video.readyState >= video.HAVE_CURRENT_DATA;
    const isNewFrame = video.currentTime !== lastVideoTime;

    if (hasFrame && isNewFrame) {
      lastVideoTime = video.currentTime;

      const result = handLandmarker.detectForVideo(video, performance.now());
      const hand = result.landmarks[0];
      const hasHand = hand !== undefined;

      if (hand) {
        const features = handFeatures(hand, video.videoWidth, video.videoHeight);
        readout.textContent =
          ` size ${features.size.toFixed(0)}px ` +
          ` pinch ${features.pinch.toFixed(2)} ` +
          ` open ${features.openness.toFixed(2)} `;
      } else {
        readout.textContent = 'no hand';
      }

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
