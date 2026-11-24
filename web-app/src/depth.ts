import { pipeline } from '@huggingface/transformers';

const loadStart = performance.now();

export const depthEstimator = pipeline('depth-estimation', 'onnx-community/depth-anything-v2-small');

depthEstimator.then(() => {
  const seconds = (performance.now() - loadStart) / 1000;
  console.log('depth model ready in', seconds.toFixed(1), 's');
});
