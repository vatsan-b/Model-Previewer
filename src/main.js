import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { getBoundingDimensions, getDistance, formatLength } from './measurements.js';
import { parseStlBuffer } from './model-loader.js';

const canvas = document.querySelector('#model-canvas');
const viewer = document.querySelector('#viewer');
const emptyState = document.querySelector('#empty-state');
const dropZone = document.querySelector('#drop-zone');
const fileInput = document.querySelector('#file-input');
const fileStatus = document.querySelector('#file-status');
const measureButton = document.querySelector('#measure-toggle');
const clearButton = document.querySelector('#clear-measures');
const measureState = document.querySelector('#measure-state');
const measurementReadout = document.querySelector('#measurement-readout');
const hudLabel = document.querySelector('#hud-label');

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 1e7);
camera.position.set(150, 120, 150);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x111713, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.screenSpacePanning = true;
controls.minDistance = 0.01;
controls.maxDistance = 1e7;

scene.add(new THREE.HemisphereLight(0xe8ffe6, 0x172118, 2.2));
const keyLight = new THREE.DirectionalLight(0xffffff, 3.2); keyLight.position.set(1, 2, 3); scene.add(keyLight);
const rimLight = new THREE.DirectionalLight(0xa3e635, 1.3); rimLight.position.set(-2, 1, -2); scene.add(rimLight);
const grid = new THREE.GridHelper(200, 20, 0x405344, 0x26342a); scene.add(grid);
const axes = new THREE.AxesHelper(55); scene.add(axes);
const modelGroup = new THREE.Group(); scene.add(modelGroup);
const measurementGroup = new THREE.Group(); scene.add(measurementGroup);
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let mesh = null;
let activeFileName = '';
let measuring = false;
let firstPoint = null;
let downPoint = null;

function resize() {
  const { width, height } = viewer.getBoundingClientRect();
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(viewer); resize();

function animate() { requestAnimationFrame(animate); controls.update(); renderer.render(scene, camera); }
animate();

function setStat(id, value) { document.querySelector(id).textContent = value; }
function formatBytes(bytes) { return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(2)} MB`; }
function updateStats(geometry, file) {
  const d = getBoundingDimensions(geometry.boundingBox);
  setStat('#dimension-x', formatLength(d.x)); setStat('#dimension-y', formatLength(d.y)); setStat('#dimension-z', formatLength(d.z));
  setStat('#triangle-count', (geometry.getAttribute('position').count / 3).toLocaleString());
  setStat('#vertex-count', geometry.getAttribute('position').count.toLocaleString()); setStat('#file-size', formatBytes(file.size));
}
function fitModel() {
  if (!mesh) return;
  const box = new THREE.Box3().setFromObject(mesh);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDimension = Math.max(size.x, size.y, size.z, 1);
  const distance = maxDimension / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) * 1.45;
  camera.position.copy(center).add(new THREE.Vector3(distance, distance * .7, distance));
  camera.near = Math.max(maxDimension / 10000, 0.001); camera.far = maxDimension * 1000; camera.updateProjectionMatrix();
  controls.target.copy(center); controls.update();
  grid.position.set(center.x, box.min.y - maxDimension * .01, center.z); axes.position.set(box.min.x, box.min.y, box.min.z);
  grid.scale.setScalar(Math.max(maxDimension / 200, .01)); axes.scale.setScalar(Math.max(maxDimension / 55, .01));
}
function clearMeasures() { measurementGroup.clear(); firstPoint = null; measurementReadout.value = '—'; measurementReadout.textContent = '—'; }
function setMeasuring(next) {
  measuring = next && Boolean(mesh); firstPoint = null;
  measureButton.setAttribute('aria-pressed', String(measuring)); measureButton.classList.toggle('is-active', measuring);
  measureButton.textContent = measuring ? 'Cancel ruler' : 'Measure distance'; measureState.textContent = measuring ? 'ON' : 'OFF'; measureState.classList.toggle('is-on', measuring);
  document.querySelector('#measure-help').textContent = measuring ? 'Click two points on the model surface.' : (mesh ? 'Click two points on the model surface.' : 'Load a model to begin measuring.');
  canvas.style.cursor = measuring ? 'crosshair' : 'grab';
}
function addMarker(point, color = 0xdfff96) { const marker = new THREE.Mesh(new THREE.SphereGeometry(Math.max(camera.near * 4, 0.35), 16, 12), new THREE.MeshBasicMaterial({ color, depthTest: false })); marker.position.copy(point); measurementGroup.add(marker); return marker; }
function addMeasurement(a, b) {
  addMarker(a); addMarker(b);
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]), new THREE.LineBasicMaterial({ color: 0xdfff96, linewidth: 2 })); measurementGroup.add(line);
  const distance = getDistance(a, b); measurementReadout.value = formatLength(distance); measurementReadout.textContent = formatLength(distance);
}
function pickMeasurement(event) {
  if (!measuring || !mesh) return;
  const rect = canvas.getBoundingClientRect(); pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1; pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera); const hit = raycaster.intersectObject(mesh, false)[0];
  if (!hit) return;
  if (!firstPoint) { firstPoint = hit.point.clone(); addMarker(firstPoint, 0xffd166); measurementReadout.value = 'Select the second point…'; measurementReadout.textContent = 'Select the second point…'; return; }
  addMeasurement(firstPoint, hit.point); firstPoint = null; setMeasuring(false);
}
function loadFile(file) {
  if (!file || !file.name.toLowerCase().endsWith('.stl')) { fileStatus.textContent = 'Choose a valid .stl file.'; return; }
  fileStatus.textContent = `Reading ${file.name}…`;
  const reader = new FileReader();
  reader.onerror = () => { fileStatus.textContent = 'The file could not be read.'; };
  reader.onload = () => {
    try {
      const geometry = parseStlBuffer(reader.result); geometry.center(); geometry.computeBoundingBox();
      if (mesh) { modelGroup.remove(mesh); mesh.geometry.dispose(); mesh.material.dispose(); }
      const material = new THREE.MeshStandardMaterial({ color: 0x9fcb72, metalness: .12, roughness: .54, side: THREE.DoubleSide });
      mesh = new THREE.Mesh(geometry, material); modelGroup.add(mesh); clearMeasures(); setMeasuring(false); updateStats(geometry, file); fitModel();
      activeFileName = file.name; fileStatus.textContent = `${file.name} loaded locally`; hudLabel.textContent = file.name.toUpperCase(); emptyState.hidden = true; measureButton.disabled = false; clearButton.disabled = false;
    } catch (error) { console.error(error); fileStatus.textContent = 'Unable to parse this STL. Check that the file is not corrupted.'; }
  };
  reader.readAsArrayBuffer(file);
}
fileInput.addEventListener('change', (event) => loadFile(event.target.files[0]));
['dragenter', 'dragover'].forEach((type) => dropZone.addEventListener(type, (event) => { event.preventDefault(); dropZone.classList.add('is-dragging'); }));
['dragleave', 'drop'].forEach((type) => dropZone.addEventListener(type, (event) => { event.preventDefault(); dropZone.classList.remove('is-dragging'); }));
dropZone.addEventListener('drop', (event) => loadFile(event.dataTransfer.files[0]));
viewer.addEventListener('dragover', (event) => event.preventDefault()); viewer.addEventListener('drop', (event) => { event.preventDefault(); loadFile(event.dataTransfer.files[0]); });
canvas.addEventListener('pointerdown', (event) => { downPoint = { x: event.clientX, y: event.clientY }; });
canvas.addEventListener('pointerup', (event) => { if (downPoint && Math.hypot(event.clientX - downPoint.x, event.clientY - downPoint.y) < 4) pickMeasurement(event); downPoint = null; });
document.querySelector('#fit-view').addEventListener('click', fitModel); document.querySelector('#reset-view').addEventListener('click', () => { if (mesh) fitModel(); else { camera.position.set(150, 120, 150); controls.target.set(0, 0, 0); } });
document.querySelector('#toggle-grid').addEventListener('click', (event) => { grid.visible = !grid.visible; axes.visible = grid.visible; event.currentTarget.classList.toggle('is-active', grid.visible); event.currentTarget.setAttribute('aria-pressed', String(grid.visible)); });
document.querySelector('#toggle-wireframe').addEventListener('click', (event) => { if (!mesh) return; mesh.material.wireframe = !mesh.material.wireframe; event.currentTarget.classList.toggle('is-active', mesh.material.wireframe); event.currentTarget.setAttribute('aria-pressed', String(mesh.material.wireframe)); });
measureButton.addEventListener('click', () => setMeasuring(!measuring)); clearButton.addEventListener('click', clearMeasures);
