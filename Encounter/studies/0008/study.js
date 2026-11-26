import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { journey } from '../0003/geometry.js';
import { passage, cellAt } from '../0003/rooms.js';
import { upwardQuaternion } from '../0006/geometry.js';
import { spineSample } from '../0007/geometry.js';
import { enteredRooms, openRoomEdges } from './geometry.js';

try {
  const response = await fetch('../0003/trace.json');
  if (!response.ok) throw new Error('Cannot load the source trace');
  const states = journey(await response.json());
  const points = states.map(state => state.point);
  const canvas = document.querySelector('canvas');
  const stage = document.querySelector('#stage');
  const renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:false});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0xf7f5ef);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-7, 7, 6, -6, .1, 100);
  const controls = new OrbitControls(camera, canvas);
  controls.enablePan = false;
  controls.minZoom = .55;
  controls.maxZoom = 3;
  controls.autoRotateSpeed = .3;
  const root = new THREE.Group();
  root.quaternion.fromArray(upwardQuaternion(points));
  scene.add(root);

  const structure = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({color:0x171a19, transparent:true, opacity:.82}));
  root.add(structure);
  const marker = new THREE.Mesh(new THREE.SphereGeometry(.095, 20, 14), new THREE.MeshBasicMaterial({color:0xad2e24, depthTest:false}));
  marker.renderOrder = 2;
  root.add(marker);

  const slider = document.querySelector('#step');
  const play = document.querySelector('#play');
  let progress = 0;
  let playing = false;
  let elapsed = 0;

  function display(value) {
    progress = Math.max(0, Math.min(63, value));
    const sample = spineSample(points, progress);
    const continuous = sample.from + sample.eased;
    marker.position.set(...sample.point);
    const occupied = passage(points, continuous);
    const active = enteredRooms(occupied.visits);
    const edges = openRoomEdges(active);
    const vertices = edges.flatMap(edge => [...edge.start, ...edge.end]);
    structure.geometry.dispose();
    structure.geometry = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    const activeRoom = cellAt(occupied.marker);
    const state = progress === 63 ? 64 : sample.from + 1;
    slider.value = String(state);
    document.querySelector('#count').textContent = `${state} / 64`;
    document.querySelector('#room-state').textContent = `The point is in room ${activeRoom}.`;
    document.querySelector('#structure-key').textContent = `${active.size} entered ${active.size === 1 ? 'room' : 'rooms'} / ${edges.length} open edges`;
  }

  function stop() {
    playing = false;
    play.setAttribute('aria-pressed', 'false');
    play.textContent = 'Move point';
  }
  slider.addEventListener('input', () => { stop(); display(Number(slider.value) - 1); });
  play.addEventListener('click', () => {
    if (playing) { stop(); return; }
    if (progress >= 63) display(0);
    playing = true;
    elapsed = progress * .72;
    play.setAttribute('aria-pressed', 'true');
    play.textContent = 'Pause';
  });

  const views = {rise:[0,0,14], side:[13,1,2]};
  function select(key) {
    camera.position.set(...views[key]);
    camera.zoom = key === 'side' ? 1.2 : 1;
    camera.updateProjectionMatrix();
    controls.target.set(0,0,0);
    controls.update();
    document.querySelectorAll('[data-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === key)));
  }
  document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => {
    controls.autoRotate = false;
    document.querySelector('#turn').setAttribute('aria-pressed', 'false');
    select(button.dataset.view);
  }));
  document.querySelector('#turn').addEventListener('click', event => {
    controls.autoRotate = !controls.autoRotate;
    event.currentTarget.setAttribute('aria-pressed', String(controls.autoRotate));
  });
  canvas.addEventListener('keydown', event => {
    if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const offset = camera.position.clone().sub(controls.target);
    const axis = event.key === 'ArrowLeft' || event.key === 'ArrowRight' ? camera.up.clone() : new THREE.Vector3().crossVectors(camera.up, offset).normalize();
    offset.applyAxisAngle(axis, (event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? 1 : -1) * .08);
    camera.position.copy(offset.add(controls.target));
    controls.update();
  });
  new ResizeObserver(() => {
    const {width, height} = stage.getBoundingClientRect();
    const h = width < 700 ? 10 : 6;
    camera.left = -h * width / height;
    camera.right = -camera.left;
    camera.top = h;
    camera.bottom = -h;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }).observe(stage);
  display(0);
  select('rise');
  let previousTime;
  renderer.setAnimationLoop(now => {
    const delta = previousTime === undefined ? 0 : Math.min((now - previousTime) / 1000, .1);
    previousTime = now;
    if (document.hidden) return;
    if (playing) {
      elapsed += delta;
      const next = Math.min(63, elapsed / .72);
      display(next);
      if (next === 63) stop();
    }
    controls.update(delta);
    renderer.render(scene, camera);
  });
} catch (error) {
  const message = document.querySelector('#error');
  message.hidden = false;
  message.textContent = `Unable to open the study: ${error.message}`;
  console.error(error);
}
