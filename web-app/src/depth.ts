/*
 * The depth model (Part 7): Depth Anything V2 Small, run in the browser by Transformers.js.
 * It guesses how near each pixel of a photo is (255 = nearest, 0 = farthest IN THAT PHOTO).
 * Loading starts once, when the page loads. Exporting the PROMISE (no top-level await) means
 * the page never waits for it; the upload listener in main.ts awaits it only when it needs it.
 * After the first visit the model comes from the browser's Cache Storage ('transformers-cache').
 */
import { pipeline } from '@huggingface/transformers';

const loadStart = performance.now();

export const depthEstimator = pipeline('depth-estimation', 'onnx-community/depth-anything-v2-small');

// report how long loading took (about 0.7 s once cached)
depthEstimator.then(() => {
  const seconds = (performance.now() - loadStart) / 1000;
  console.log('depth model ready in', seconds.toFixed(1), 's');
});
