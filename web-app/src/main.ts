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

const geometry = new THREE.BoxGeometry(1, 1, 1);
const normMaterial = new THREE.MeshNormalMaterial();
const cube = new THREE.Mesh(geometry, normMaterial);
scene.add(cube);

camera.position.z = 5;

function animate() {
  cube.rotation.x += 0.01;
  cube.rotation.y += 0.01;

  controls.update();

  renderer.render(scene, camera);
}
renderer.setAnimationLoop(animate);

const canvas = createCanvas();
const texture = new THREE.CanvasTexture(canvas);
const basicMaterial = new THREE.MeshBasicMaterial({ map: texture });
const planeGeometry = new THREE.PlaneGeometry(2, 2);

const atlas = new THREE.Mesh(planeGeometry, basicMaterial);
scene.add(atlas);
atlas.position.x = 2.5;

const clone = texture.clone();
const cloneMat = new THREE.MeshBasicMaterial({ map: clone });
clone.repeat.set(.25, .25);
clone.offset.set(.75, 0);

const cloneAtlas = new THREE.Mesh(planeGeometry, cloneMat);
scene.add(cloneAtlas);
cloneAtlas.position.x = -2.5;

function pointGrid(aGlyph: Float32Array, colCount: number, rowCount: number) {
  const spacing = 0.075;
  const numOfSlots = 3;
  const float32 = new Float32Array(colCount * rowCount * 3);

  for (let i = 0; i < float32.length / numOfSlots; i++) {
    const column = i % colCount;
    const row = Math.floor(i / colCount);

    const x = column * spacing;
    const y = -row * spacing;

    float32[i * numOfSlots] = x;
    float32[i * numOfSlots + 1] = y;

    aGlyph[i] = i;
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
    uAtlas: { value: texture }
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
field.position.y = -2;
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



