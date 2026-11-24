import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import './ascii-2d.ts';
import { createCanvas } from './glyph-atlas.ts';
import { sampleGlyphs } from './glyph-grid.ts';
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
});

camera.position.z = 5;

function animate() {
  controls.update();

  renderer.render(scene, camera);
}
renderer.setAnimationLoop(animate);

const canvas = createCanvas();
const texture = new THREE.CanvasTexture(canvas);

const spacing = 0.075;

function pointGrid(aGlyph: Float32Array, colCount: number, rowCount: number) {
  const numOfSlots = 3;
  const float32 = new Float32Array(colCount * rowCount * numOfSlots);

  const shiftX = ((colCount - 1) * spacing) / 2;
  const shiftY = ((rowCount - 1) * spacing) / 2;

  for (let i = 0; i < float32.length / numOfSlots; i++) {
    const column = i % colCount;
    const row = Math.floor(i / colCount);

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

  return fieldGeometry;
}

const fieldMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uAtlas: { value: texture },
    uSize: { value: spacing },
    uHalfHeight: { value: renderer.domElement.height / 2 }
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



