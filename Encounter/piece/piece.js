import * as THREE from 'three';
import { passage } from '../studies/0003/rooms.js';
import { upwardQuaternion } from '../studies/0006/geometry.js';
import { enteredRooms, openRoomEdges } from '../studies/0010/geometry.js';

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

try {
  const response = await fetch('./piece.json');
  if (!response.ok) throw new Error('Cannot load the work');
  const record = await response.json();
  if (record.schema !== 'foldportrait-encounter-piece/v1' || record.points?.length !== 64) throw new Error('Invalid work source');

  const canvas = document.querySelector('canvas');
  const renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:false});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0xf7f5ef);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-7, 7, 6, -6, .1, 100);
  camera.position.set(0, 0, 14);
  const root = new THREE.Group();
  root.quaternion.fromArray(upwardQuaternion(record.points));
  scene.add(root);

  function edgeGeometry(source) {
    return new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(source.flatMap(edge => [...edge.start, ...edge.end]), 3));
  }
  function stepIndex(step) {
    return step % 64;
  }
  function stepsUntilRevisit() {
    return 64;
  }

  const pointVectors = record.points.map(point => new THREE.Vector3(...point));
  const active = enteredRooms(passage(record.points, 63).visits);
  const edges = openRoomEdges(active);

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

  let lastSpawnedStep = -1;
  const drawSize = new THREE.Vector2();
  const rootQuaternion = new THREE.Quaternion();
  const screenRight = new THREE.Vector3();
  const screenUp = new THREE.Vector3();
  const layerOffset = new THREE.Vector3();
  function updateChromaticOffsets() {
    renderer.getDrawingBufferSize(drawSize);
    const worldPerPixel = (camera.top - camera.bottom) / (Math.max(drawSize.y, 1) * camera.zoom);
    root.getWorldQuaternion(rootQuaternion).invert();
    screenRight.set(1, 0, 0).applyQuaternion(camera.quaternion).applyQuaternion(rootQuaternion).multiplyScalar(worldPerPixel);
    screenUp.set(0, 1, 0).applyQuaternion(camera.quaternion).applyQuaternion(rootQuaternion).multiplyScalar(worldPerPixel);
    for (const marker of redMarkers) {
      CHROMATIC_LAYERS.forEach((layer, index) => {
        layerOffset.copy(screenRight).multiplyScalar(layer.pixelX).addScaledVector(screenUp, layer.pixelY);
        marker.userData.facets[index].position.copy(layerOffset);
        marker.userData.frames[index].position.copy(layerOffset);
      });
    }
  }
  function placeBoxes(elapsed) {
    const currentStep = Math.floor(elapsed / STEP_INTERVAL);
    for (let step = lastSpawnedStep + 1; step <= currentStep; step++) {
      const state = stepIndex(step);
      const marker = redMarkers[state];
      marker.position.copy(pointVectors[state]);
      marker.userData.spawnedAt = step * STEP_INTERVAL;
      marker.userData.fadeDuration = stepsUntilRevisit() * STEP_INTERVAL;
      marker.visible = true;
      marker.userData.facets.forEach((facet, index) => { facet.material.opacity = FACET_OPACITY * CHROMATIC_LAYERS[index].facetWeight; });
      lastSpawnedStep = step;
    }
    for (const marker of redMarkers) {
      if (!marker.visible) continue;
      const progress = THREE.MathUtils.clamp((elapsed - marker.userData.spawnedAt) / marker.userData.fadeDuration, 0, 1);
      const eased = progress * progress * (3 - 2 * progress);
      marker.userData.facets.forEach((facet, index) => { facet.material.opacity = FACET_OPACITY * CHROMATIC_LAYERS[index].facetWeight * (1 - eased); });
    }
  }

  const cameraRadius = camera.position.length();
  let rotationTheta = Math.atan2(camera.position.x, camera.position.z);
  let rotationElapsed = 0;
  let pieceElapsed = 0;
  let previousTime;
  new ResizeObserver(() => {
    const width = innerWidth;
    const height = innerHeight;
    const span = width < 700 ? 10 : 6;
    camera.left = -span * width / height;
    camera.right = -camera.left;
    camera.top = span;
    camera.bottom = -span;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }).observe(document.body);
  placeBoxes(0);
  renderer.setAnimationLoop(now => {
    const delta = previousTime === undefined ? 0 : Math.min((now - previousTime) / 1000, .1);
    previousTime = now;
    if (document.hidden) return;
    pieceElapsed += delta;
    rotationElapsed += delta;
    rotationTheta += delta * .11;
    placeBoxes(pieceElapsed);
    const elevation = Math.sin(rotationElapsed * .215) * .34;
    const horizontal = cameraRadius * Math.cos(elevation);
    camera.position.set(Math.sin(rotationTheta) * horizontal, Math.sin(elevation) * cameraRadius, Math.cos(rotationTheta) * horizontal);
    camera.up.set(0, 1, 0);
    camera.lookAt(0, 0, 0);
    updateChromaticOffsets();
    renderer.render(scene, camera);
  });
} catch (error) {
  const message = document.querySelector('#error');
  message.hidden = false;
  message.textContent = `Unable to open the work: ${error.message}`;
  console.error(error);
}
