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
  } catch (error) {
    console.warn('Webcam unavailable, gestures are off. Keys still work.', error);
  }
}

startWebcam(webcam);
