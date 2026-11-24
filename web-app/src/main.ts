import './style.css';
import './ascii-2d.ts';
import './keyboard-controls.ts';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createCanvas } from './glyph-atlas.ts';
import { sampleGlyphs } from './glyph-grid.ts';
import { state } from './state.ts'
import vertexShader from './shaders/glyph-vert.glsl?raw';
import fragmentShader from './shaders/glyph-frag.glsl?raw';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75,
  window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  fieldMaterial.uniforms.uHalfHeight.value = renderer.domElement.height / 2;
});

camera.position.z = 5;

let prevTime = 0;

function animate(time: number) {
  const dt = Math.min((time - prevTime) / 1000, 0.1);
  prevTime = time;
  const k = 1 - Math.exp(-6 * dt);

  const explodeTarget = 1 - state.form;
  state.explode += (explodeTarget - state.explode) * k;
  fieldMaterial.uniforms.uExplode.value = state.explode;

  field.rotation.x += (state.rotation.x - field.rotation.x) * k;
  field.rotation.y += (state.rotation.y - field.rotation.y) * k;

  const scale = field.scale.x + (state.zoom - field.scale.x) * k;
  field.scale.setScalar(scale);
  fieldMaterial.uniforms.uSize.value = spacing * scale;

  controls.update();

  renderer.render(scene, camera);
}
renderer.setAnimationLoop(animate);

const canvas = createCanvas();
const texture = new THREE.CanvasTexture(canvas);

const spacing = 0.075;
const explodeDistance = 3;

function pointGrid(aGlyph: Float32Array, colCount: number, rowCount: number) {
  const numOfSlots = 3;
  const float32 = new Float32Array(colCount * rowCount * numOfSlots);
  const offsets = new Float32Array(colCount * rowCount * numOfSlots);

  const shiftX = ((colCount - 1) * spacing) / 2;
  const shiftY = ((rowCount - 1) * spacing) / 2;

  for (let i = 0; i < float32.length / numOfSlots; i++) {
    const column = i % colCount;
    const row = Math.floor(i / colCount);

    offsets[i * numOfSlots] = (Math.random() * 2 - 1) * explodeDistance;
    offsets[i * numOfSlots + 1] = (Math.random() * 2 - 1) * explodeDistance;
    offsets[i * numOfSlots + 2] = (Math.random() * 2 - 1) * explodeDistance;

    const x = column * spacing - shiftX;
    const y = -row * spacing + shiftY;

    float32[i * numOfSlots] = x;
    float32[i * numOfSlots + 1] = y;
  }
  const fieldGeometry = new THREE.BufferGeometry();
  fieldGeometry.setAttribute(
    'position',
    new THREE.BufferAttribute(float32, numOfSlots));
  fieldGeometry.setAttribute('aGlyph', new THREE.BufferAttribute(aGlyph, 1));
  fieldGeometry.setAttribute('aOffset', new THREE.BufferAttribute(offsets, numOfSlots));

  return fieldGeometry;
}

const fieldMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uAtlas: { value: texture },
    uSize: { value: spacing },
    uHalfHeight: { value: renderer.domElement.height / 2 },
    uExplode: { value: 0 }
  },
  vertexShader: vertexShader,
  fragmentShader: fragmentShader,
  glslVersion: THREE.GLSL3
});

const testGlyphs = new Float32Array(16);
for (let i = 0; i < testGlyphs.length; i++) {
  testGlyphs[i] = i;

}

const field = new THREE.Points(pointGrid(testGlyphs, 4, 4), fieldMaterial);
scene.add(field);

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
  const rows = Math.round(columns * (bitmap.height / bitmap.width));

  const glyphs = sampleGlyphs(bitmap, columns, rows);

  field.geometry.dispose();
  field.geometry = pointGrid(glyphs, columns, rows);
});


