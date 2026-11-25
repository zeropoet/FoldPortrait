import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { passage } from '../0003/rooms.js';
import { upwardQuaternion } from '../0006/geometry.js';
import { enteredRooms, openRoomEdges } from '../0010/geometry.js';

const BOX_SIZE = .14;
const FRAME_OPACITY = .96;
const FACET_OPACITY = .1;
const CHROMATIC_OFFSET_PX = .42;
const CHROMATIC_LAYERS = [
  {color:0xff3b30, pixelX:-CHROMATIC_OFFSET_PX, pixelY:0, frameOpacity:FRAME_OPACITY, facetWeight:.6},
  {color:0x16a05d, pixelX:0, pixelY:CHROMATIC_OFFSET_PX * .67, frameOpacity:FRAME_OPACITY * .4, facetWeight:.2},
  {color:0x315efb, pixelX:CHROMATIC_OFFSET_PX, pixelY:-CHROMATIC_OFFSET_PX * .67, frameOpacity:FRAME_OPACITY * .4, facetWeight:.2}
];
const STEP_INTERVAL = .38 / 6;
const TRAIL_COUNT = 64;
const settings = {loop:true, rotate:true};

try {
  const response = await fetch('./vessels.json');
  if (!response.ok) throw new Error('Cannot load the vessel range');
  const range = await response.json();
  if (range.schema !== 'foldportrait-vessel-range/v1' || !Array.isArray(range.vessels) || !range.vessels.length) throw new Error('Invalid vessel range');
  const vessels = new Map(range.vessels.map(vessel => [vessel.id, vessel]));
  const canvas = document.querySelector('canvas');
  const stage = document.querySelector('#stage');
  const vesselSelect = document.querySelector('#vessel');
  const savedSelect = document.querySelector('#saved');
  const saveButton = document.querySelector('#save');
  const saveStatus = document.querySelector('#save-status');
  const loopButton = document.querySelector('#box-loop');
  const rotateButton = document.querySelector('#rotate');
  const renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:false});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0xf7f5ef);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-7, 7, 6, -6, .1, 100);
  camera.position.set(0, 0, 14);
  const controls = new OrbitControls(camera, canvas);
  controls.enablePan = false;
  controls.minZoom = .55;
  controls.maxZoom = 3;
  controls.minPolarAngle = 0;
  controls.maxPolarAngle = Math.PI;
  controls.update();
  let root = null;
  let objects = {};
  let currentVessel = range.vessels[0].id;
  let saved = [];
  let loopElapsed = 0;
  let lastSpawnedStep = -1;
  const drawSize = new THREE.Vector2();
  const rootQuaternion = new THREE.Quaternion();
  const screenRight = new THREE.Vector3();
  const screenUp = new THREE.Vector3();
  const layerOffset = new THREE.Vector3();

  function edgeGeometry(source) {
    return new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(source.flatMap(edge => [...edge.start, ...edge.end]), 3));
  }
  function dispose(group) {
    group?.traverse(object => {
      object.geometry?.dispose();
      if (Array.isArray(object.material)) object.material.forEach(material => material.dispose());
      else object.material?.dispose();
    });
  }
  function stepIndex(step) {
    return step % 64;
  }
  function stepsUntilRevisit() {
    return 64;
  }
  function updateChromaticOffsets() {
    if (!root || !objects.redMarkers) return;
    renderer.getDrawingBufferSize(drawSize);
    const worldPerPixel = (camera.top - camera.bottom) / (Math.max(drawSize.y, 1) * camera.zoom);
    root.getWorldQuaternion(rootQuaternion).invert();
    screenRight.set(1, 0, 0).applyQuaternion(camera.quaternion).applyQuaternion(rootQuaternion).multiplyScalar(worldPerPixel);
    screenUp.set(0, 1, 0).applyQuaternion(camera.quaternion).applyQuaternion(rootQuaternion).multiplyScalar(worldPerPixel);
    for (const marker of objects.redMarkers) {
      CHROMATIC_LAYERS.forEach((layer, index) => {
        layerOffset.copy(screenRight).multiplyScalar(layer.pixelX).addScaledVector(screenUp, layer.pixelY);
        marker.userData.facets[index].position.copy(layerOffset);
        marker.userData.frames[index].position.copy(layerOffset);
      });
    }
  }
  function updateBoxes(delta) {
    if (!objects.redMarkers) return;
    if (settings.loop) loopElapsed += delta;
    const currentStep = Math.floor(loopElapsed / STEP_INTERVAL);
    for (let step = lastSpawnedStep + 1; step <= currentStep; step++) {
      const state = stepIndex(step);
      const marker = objects.redMarkers[state];
      marker.position.copy(objects.pointVectors[state]);
      marker.userData.spawnedAt = step * STEP_INTERVAL;
      marker.userData.fadeDuration = stepsUntilRevisit() * STEP_INTERVAL;
      marker.visible = true;
      marker.userData.facets.forEach((facet, index) => { facet.material.opacity = FACET_OPACITY * CHROMATIC_LAYERS[index].facetWeight; });
      lastSpawnedStep = step;
    }
    for (const marker of objects.redMarkers) {
      if (!marker.visible) continue;
      const progress = THREE.MathUtils.clamp((loopElapsed - marker.userData.spawnedAt) / marker.userData.fadeDuration, 0, 1);
      const eased = progress * progress * (3 - 2 * progress);
      marker.userData.facets.forEach((facet, index) => { facet.material.opacity = FACET_OPACITY * CHROMATIC_LAYERS[index].facetWeight * (1 - eased); });
    }
  }
  function build(vessel, savedSettings = null) {
    if (!vessel || vessel.points.length !== 64) throw new Error('Selected vessel is unavailable');
    if (savedSettings) {
      settings.loop = typeof savedSettings.loop === 'boolean' ? savedSettings.loop : true;
      settings.rotate = typeof savedSettings.rotate === 'boolean' ? savedSettings.rotate : true;
    }
    const points = vessel.points;
    const active = enteredRooms(passage(points, 63).visits);
    const edges = openRoomEdges(active);
    if (root) { scene.remove(root); dispose(root); }
    root = new THREE.Group();
    root.quaternion.fromArray(upwardQuaternion(points));
    scene.add(root);

    const structure = new THREE.LineSegments(edgeGeometry(edges), new THREE.LineBasicMaterial({color:0x171a19, transparent:true, opacity:.82}));
    const boxGeometry = new THREE.BoxGeometry(BOX_SIZE, BOX_SIZE, BOX_SIZE);
    const boxEdges = new THREE.EdgesGeometry(boxGeometry);
    const redMarkers = Array.from({length:TRAIL_COUNT}, () => {
      const marker = new THREE.Group();
      const facets = CHROMATIC_LAYERS.map((layer, index) => {
        const facet = new THREE.Mesh(boxGeometry, new THREE.MeshBasicMaterial({color:layer.color, transparent:true, opacity:0, depthTest:false, depthWrite:false, side:THREE.DoubleSide}));
        facet.renderOrder = 4 + index;
        return facet;
      });
      const frames = CHROMATIC_LAYERS.map((layer, index) => {
        const frame = new THREE.LineSegments(boxEdges, new THREE.LineBasicMaterial({color:layer.color, transparent:true, opacity:layer.frameOpacity, depthTest:false}));
        frame.renderOrder = 7 + index;
        return frame;
      });
      marker.userData = {facets, frames};
      marker.add(...facets, ...frames);
      marker.visible = false;
      return marker;
    });
    root.add(structure, ...redMarkers);
    loopElapsed = 0;
    lastSpawnedStep = -1;
    objects = {structure, redMarkers, pointVectors:points.map(point => new THREE.Vector3(...point))};
    updateBoxes(0);
    currentVessel = vessel.id;
    vesselSelect.value = String(vessel.id);
    document.querySelector('#vessel-label').textContent = `SS VESSEL ${vessel.id}`;
    document.querySelector('#source-key').textContent = `SS vessel ${vessel.id} / 64 states / slowed final motion`;
    document.querySelector('#structure-key').textContent = `${active.size} entered rooms / ${edges.length} open edges / no planes / persistent red frames`;
    applySettings();
  }

  let rotationActive = false;
  let rotationTheta = 0;
  let rotationRadius = 14;
  let rotationBaseElevation = 0;
  let rotationElapsed = 0;
  function setRotation(active) {
    settings.rotate = active;
    rotationActive = active;
    controls.enabled = !active;
    if (active) {
      const offset = camera.position.clone().sub(controls.target);
      rotationRadius = offset.length();
      rotationTheta = Math.atan2(offset.x, offset.z);
      rotationBaseElevation = Math.asin(THREE.MathUtils.clamp(offset.y / rotationRadius, -1, 1));
      rotationElapsed = 0;
    }
    rotateButton.setAttribute('aria-pressed', String(active));
    rotateButton.textContent = `Rotate: ${active ? 'on' : 'off'}`;
  }
  function applySettings() {
    loopButton.setAttribute('aria-pressed', String(settings.loop));
    loopButton.textContent = `Red box loop: ${settings.loop ? 'on' : 'off'}`;
    setRotation(settings.rotate);
  }
  loopButton.addEventListener('click', () => {
    settings.loop = !settings.loop;
    loopButton.setAttribute('aria-pressed', String(settings.loop));
    loopButton.textContent = `Red box loop: ${settings.loop ? 'on' : 'off'}`;
  });
  rotateButton.addEventListener('click', () => setRotation(!rotationActive));
  canvas.addEventListener('keydown', event => {
    if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) return;
    event.preventDefault(); setRotation(false);
    const offset = camera.position.clone().sub(controls.target);
    const axis = event.key === 'ArrowLeft' || event.key === 'ArrowRight' ? new THREE.Vector3(0,1,0) : new THREE.Vector3().crossVectors(offset, camera.up).normalize();
    offset.applyAxisAngle(axis, (event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? 1 : -1) * .08);
    camera.position.copy(offset.add(controls.target)); controls.update();
  });

  function paintSaved(result) {
    saved = result.saved || [];
    savedSelect.replaceChildren(new Option('Choose saved', ''), ...saved.map(item => new Option(`SS vessel ${item.vessel_id}`, String(item.vessel_id))));
  }
  async function api(path, options = {}) {
    const request = await fetch('/studio/api/' + path, options);
    const result = await request.json();
    if (!request.ok) throw new Error(result.error || 'Studio could not save this sigil');
    return result;
  }
  vesselSelect.replaceChildren(...range.vessels.map(vessel => new Option(`SS vessel ${vessel.id}`, String(vessel.id))));
  vesselSelect.addEventListener('change', () => { savedSelect.value = ''; build(vessels.get(Number(vesselSelect.value))); saveStatus.textContent = 'Loaded'; });
  savedSelect.addEventListener('change', () => {
    const item = saved.find(entry => entry.vessel_id === Number(savedSelect.value));
    if (!item) return;
    build(vessels.get(item.vessel_id), item.settings); saveStatus.textContent = 'Saved state loaded';
  });
  saveButton.addEventListener('click', async () => {
    saveButton.disabled = true; saveStatus.textContent = 'Saving…';
    try {
      const state = await api('state');
      const result = await api('research/sigils', {method:'POST', headers:{'Content-Type':'application/json','X-Studio-CSRF':state.csrf}, body:JSON.stringify({request_id:crypto.randomUUID(), vessel_id:currentVessel, settings:{loop:settings.loop, rotate:settings.rotate}})});
      paintSaved(result); savedSelect.value = String(currentVessel); saveStatus.textContent = 'Sigil saved';
    } catch (error) { saveStatus.textContent = error.message; }
    finally { saveButton.disabled = false; }
  });
  api('research/sigils').then(paintSaved).catch(error => { saveStatus.textContent = error.message; });

  new ResizeObserver(() => {
    const {width, height} = stage.getBoundingClientRect();
    const h = width < 700 ? 10 : 6;
    camera.left = -h * width / height; camera.right = -camera.left; camera.top = h; camera.bottom = -h;
    camera.updateProjectionMatrix(); renderer.setSize(width, height);
  }).observe(stage);
  build(range.vessels[0]);
  let previousTime;
  renderer.setAnimationLoop(now => {
    const delta = previousTime === undefined ? 0 : Math.min((now - previousTime) / 1000, .1);
    previousTime = now;
    if (document.hidden) return;
    updateBoxes(delta);
    if (rotationActive) {
      rotationElapsed += delta; rotationTheta += delta * .11;
      const elevation = rotationBaseElevation * Math.exp(-rotationElapsed * .16) + Math.sin(rotationElapsed * .215) * .34;
      const horizontal = rotationRadius * Math.cos(elevation);
      camera.position.set(Math.sin(rotationTheta) * horizontal, Math.sin(elevation) * rotationRadius, Math.cos(rotationTheta) * horizontal).add(controls.target);
      camera.up.set(0,1,0); camera.lookAt(controls.target);
    }
    controls.update(delta); updateChromaticOffsets(); renderer.render(scene, camera);
  });
} catch (error) {
  const message = document.querySelector('#error');
  message.hidden = false; message.textContent = `Unable to open the study: ${error.message}`;
  console.error(error);
}
