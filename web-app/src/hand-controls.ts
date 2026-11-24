import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";

const wasmUrl = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/wasm';

const modelUrl = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

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

async function startHandTracking(video: HTMLVideoElement) {
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

startHandTracking(webcam);
