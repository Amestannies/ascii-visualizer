/*
 * main.ts: the entry point (loaded by index.html). It
 *   - imports every other file, which starts the 2D panel, the keys, the hand tracking and the depth model,
 *   - builds the Three.js scene, camera, renderer and orbit controls (Part 2),
 *   - builds the 3D glyph field: one point per glyph, drawn by our own shaders (Part 5),
 *   - eases the field toward the targets in state every frame (Part 6),
 *   - rebuilds the field from each uploaded photo and adds depth when the model answers (Parts 5, 7).
 */
import './style.css';
import './ascii-2d.ts';
import './keyboard-controls.ts';
import './hand-controls.ts';
import { depthEstimator } from './depth.ts';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createCanvas } from './glyph-atlas.ts';
import { sampleGlyphs } from './glyph-grid.ts';
import { state } from './state.ts'
// ?raw: Vite imports the shader files as plain text strings
import vertexShader from './shaders/glyph-vert.glsl?raw';
import fragmentShader from './shaders/glyph-frag.glsl?raw';

/* ---------- scene, camera, renderer (Part 2) ---------- */
const scene = new THREE.Scene();
// 75 degree field of view, the window's shape, and draw only things 0.1 to 1000 units away
const camera = new THREE.PerspectiveCamera(75,
  window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);   // the <canvas> Three.js draws into

// drag with the mouse to orbit the camera; damping makes it glide to a stop
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// keep the picture undistorted and the glyphs the right size when the window changes
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  fieldMaterial.uniforms.uHalfHeight.value = renderer.domElement.height / 2;   // point size depends on it
});

camera.position.z = 5;   // step back 5 units so the field (at z = 0) is in view

/* ---------- the animation loop (Part 6) ---------- */
let prevTime = 0;

// called by Three.js once per screen refresh; time = ms since the page started
function animate(time: number) {
  // seconds since the last frame, capped at 0.1 so a hidden tab doesn't cause a jump
  const dt = Math.min((time - prevTime) / 1000, 0.1);
  prevTime = time;
  // how far to move toward each target this frame. Based on TIME, not frames, so a
  // 60 Hz and a 120 Hz screen move at the same speed (about 90 % there after 0.37 s)
  const k = 1 - Math.exp(-6 * dt);

  // form 1 (together) = explode 0; the flip is written once, here
  const explodeTarget = 1 - state.form;
  state.explode += (explodeTarget - state.explode) * k;   // the ONLY place explode is written
  fieldMaterial.uniforms.uExplode.value = state.explode;

  // ease the real rotation toward the target written by keys / gestures
  field.rotation.x += (state.rotation.x - field.rotation.x) * k;
  field.rotation.y += (state.rotation.y - field.rotation.y) * k;

  const scale = field.scale.x + (state.zoom - field.scale.x) * k;
  field.scale.setScalar(scale);   // same scale on x, y and z
  fieldMaterial.uniforms.uSize.value = spacing * scale;   // bigger field -> bigger glyphs, still touching

  controls.update();   // needed every frame for damping

  renderer.render(scene, camera);
}
renderer.setAnimationLoop(animate);

/* ---------- the glyph atlas texture (Part 4) ---------- */
const canvas = createCanvas();
const texture = new THREE.CanvasTexture(canvas);

/* ---------- the glyph field (Parts 5-7) ---------- */
const spacing = 0.075;         // world units between neighbouring glyphs
const explodeDistance = 3;     // furthest a glyph can fly when exploded, per axis
const depthRange = 1.5;        // nearest-to-farthest depth, in world units

/*
 * Builds the geometry for a colCount x rowCount grid of points. Per point (one point = one glyph):
 *   position (3 numbers)  where it sits in the picture, centred on (0, 0)
 *   aGlyph   (1)          which glyph it shows (from sampleGlyphs)
 *   aOffset  (3)          its random scatter direction for explode
 *   aDepth   (1)          its depth, 0 until the depth model answers
 */
function pointGrid(aGlyph: Float32Array, colCount: number, rowCount: number) {
  const numOfSlots = 3;   // x, y, z
  const float32 = new Float32Array(colCount * rowCount * numOfSlots);
  const offsets = new Float32Array(colCount * rowCount * numOfSlots);
  const depth = new Float32Array(colCount * rowCount * 1);

  // half the grid's width / height, so the middle of the grid lands on (0, 0)
  const shiftX = ((colCount - 1) * spacing) / 2;
  const shiftY = ((rowCount - 1) * spacing) / 2;

  for (let i = 0; i < float32.length / numOfSlots; i++) {
    // point i -> its column and row (left to right, then the next row down)
    const column = i % colCount;
    const row = Math.floor(i / colCount);

    // random number from -1 to 1, times explodeDistance, on each axis
    offsets[i * numOfSlots] = (Math.random() * 2 - 1) * explodeDistance;
    offsets[i * numOfSlots + 1] = (Math.random() * 2 - 1) * explodeDistance;
    offsets[i * numOfSlots + 2] = (Math.random() * 2 - 1) * explodeDistance;

    const x = column * spacing - shiftX;
    const y = -row * spacing + shiftY;   // minus: row 0 is the TOP of the photo, but y goes UP

    float32[i * numOfSlots] = x;
    float32[i * numOfSlots + 1] = y;
    // z stays 0: depth is added in the shader from aDepth
  }
  const fieldGeometry = new THREE.BufferGeometry();
  // the second argument says how many numbers belong to one point
  fieldGeometry.setAttribute(
    'position',
    new THREE.BufferAttribute(float32, numOfSlots));
  fieldGeometry.setAttribute('aGlyph', new THREE.BufferAttribute(aGlyph, 1));
  fieldGeometry.setAttribute('aOffset', new THREE.BufferAttribute(offsets, numOfSlots));
  fieldGeometry.setAttribute('aDepth', new THREE.BufferAttribute(depth, 1));
  return fieldGeometry;
}

// our own shaders; uniforms are the values shared by every point
const fieldMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uAtlas: { value: texture },
    uSize: { value: spacing },
    uHalfHeight: { value: renderer.domElement.height / 2 },
    uExplode: { value: 0 }
  },
  vertexShader: vertexShader,
  fragmentShader: fragmentShader,
  glslVersion: THREE.GLSL3   // modern GLSL ES 3.00 (in / out, texture())
});

// before any upload: a 4 x 4 test field showing all 16 glyphs in order
const testGlyphs = new Float32Array(16);
for (let i = 0; i < testGlyphs.length; i++) {
  testGlyphs[i] = i;

}

// THREE.Points draws each vertex as a square the shaders paint
const field = new THREE.Points(pointGrid(testGlyphs, 4, 4), fieldMaterial);
scene.add(field);

/* ---------- photo upload -> new field, then depth (Parts 5, 7) ---------- */
// the same file picker the 2D panel listens to
const fieldInput = document.querySelector<HTMLInputElement>('#image-upload');
if (!fieldInput) {
  throw new Error('Invalid ID - #image-upload required');
}

fieldInput.addEventListener('change', async () => {
  const file = fieldInput.files?.[0];
  if (!file) {
    return;
  }

  const bitmap = await createImageBitmap(file);
  const columns = 80;
  // points are square, so rows simply follow the photo's shape (no charRatio, unlike the 2D panel)
  const rows = Math.round(columns * (bitmap.height / bitmap.width));

  const glyphs = sampleGlyphs(bitmap, columns, rows);

  // show the flat field straight away; free the old geometry's GPU memory first
  const geometry = pointGrid(glyphs, columns, rows);
  field.geometry.dispose();
  field.geometry = geometry;

  // depth: wait for the model (already loading since page load), then run it on the photo
  const estimator = await depthEstimator;
  const { depth } = await estimator(file);
  const gridDepth = await depth.resize(columns, rows);   // one depth value per glyph

  // a newer photo was uploaded while this one was being processed: drop this late result
  if (field.geometry !== geometry) {
    return;
  }

  // 0-255 -> -0.75 to +0.75: near things (255) come toward the camera, far things go back
  const depthAttribute = geometry.getAttribute('aDepth');
  for (let i = 0; i < gridDepth.data.length; i++) {
    depthAttribute.array[i] = (gridDepth.data[i] / 255) * depthRange - depthRange / 2;
  }
  depthAttribute.needsUpdate = true;   // tell Three.js to send the new numbers to the GPU

});


