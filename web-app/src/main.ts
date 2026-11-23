import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import './ascii-2d.ts';
import { createCanvas } from './glyph-atlas.ts';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75,
window.innerWidth / window.innerHeight, 0.1, 1000 );

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

const controls = new OrbitControls( camera, renderer.domElement );
controls.enableDamping = true;

window.addEventListener( 'resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize( window.innerWidth, window.innerHeight );
} );

const geometry = new THREE.BoxGeometry( 1, 1, 1 );
const normMaterial = new THREE.MeshNormalMaterial();
const cube = new THREE.Mesh( geometry, normMaterial );
scene.add( cube );

camera.position.z = 5;

function animate( ) { 
  cube.rotation.x += 0.01;
  cube.rotation.y += 0.01;
  
  controls.update();

  renderer.render( scene, camera);
}
renderer.setAnimationLoop( animate );

const canvas = createCanvas();
const texture = new THREE.CanvasTexture(canvas);
const basicMaterial = new THREE.MeshBasicMaterial({ map: texture });
const planeGeometry = new THREE.PlaneGeometry( 2, 2 );

const atlas = new THREE.Mesh ( planeGeometry, basicMaterial );
scene.add( atlas );
atlas.position.x = 2.5;

const clone = texture.clone();
const cloneMat = new THREE.MeshBasicMaterial({ map: clone });
clone.repeat.set( .25, .25 );
clone.offset.set( .75, 0 );

const cloneAtlas = new THREE.Mesh ( planeGeometry, cloneMat );
scene.add( cloneAtlas );
cloneAtlas.position.x = -2.5;
