import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { journey } from '../0003/geometry.js';
import { passage, cellAt } from '../0003/rooms.js';
import { upwardQuaternion } from '../0006/geometry.js';
import { spineSample } from '../0007/geometry.js';
import { enteredRooms, frontierGlassFaces, openRoomEdges } from './geometry.js';

const MAX_LINE_LIGHTS = 72;

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
  const marker = new THREE.Mesh(new THREE.SphereGeometry(.052, 16, 10), new THREE.MeshBasicMaterial({color:0xad2e24, depthTest:false}));
  marker.renderOrder = 3;
  root.add(marker);

  const lineStarts = Array.from({length:MAX_LINE_LIGHTS}, () => new THREE.Vector3());
  const lineEnds = Array.from({length:MAX_LINE_LIGHTS}, () => new THREE.Vector3());
  const glassUniforms = {
    uDot: {value:new THREE.Vector3()},
    uLineStart: {value:lineStarts},
    uLineEnd: {value:lineEnds},
    uLineCount: {value:0},
    uLineStrength: {value:1}
  };
  const glassMaterial = new THREE.ShaderMaterial({
    uniforms:glassUniforms,
    transparent:true,
    depthWrite:false,
    side:THREE.DoubleSide,
    vertexShader:`
      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorldPosition = world.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader:`
      #define MAX_LINE_LIGHTS ${MAX_LINE_LIGHTS}
      uniform vec3 uDot;
      uniform vec3 uLineStart[MAX_LINE_LIGHTS];
      uniform vec3 uLineEnd[MAX_LINE_LIGHTS];
      uniform int uLineCount;
      uniform float uLineStrength;
      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;

      float segmentDistance(vec3 point, vec3 start, vec3 end) {
        vec3 span = end - start;
        float amount = clamp(dot(point - start, span) / max(dot(span, span), .0001), 0.0, 1.0);
        return length(point - (start + span * amount));
      }

      void main() {
        float nearestLine = 100.0;
        for (int index = 0; index < MAX_LINE_LIGHTS; index++) {
          if (index >= uLineCount) break;
          nearestLine = min(nearestLine, segmentDistance(vWorldPosition, uLineStart[index], uLineEnd[index]));
        }
        vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
        float facing = abs(dot(normalize(vWorldNormal), viewDirection));
        float fresnel = pow(1.0 - facing, 2.35);
        float lineLight = exp(-nearestLine * 2.45) * uLineStrength;
        float dotLight = exp(-distance(vWorldPosition, uDot) * .9);
        float textureGrain = .5 + .5 * sin(vWorldPosition.x * 13.0 + vWorldPosition.y * 17.0 + vWorldPosition.z * 19.0);
        float illumination = .34 + lineLight * .48 + dotLight * .34;
        vec3 glass = vec3(.58, .67, .64) * (.075 + fresnel * .14) * illumination;
        glass += vec3(.92, .96, .94) * textureGrain * .018;
        float alpha = clamp(.022 + fresnel * .12 + lineLight * .11 + dotLight * .085 + textureGrain * .008, .024, .3);
        gl_FragColor = vec4(glass, alpha);
      }
    `
  });
  const glass = new THREE.Mesh(new THREE.BufferGeometry(), glassMaterial);
  glass.renderOrder = 1;
  root.add(glass);

  const slider = document.querySelector('#step');
  const play = document.querySelector('#play');
  const lineButton = document.querySelector('#line');
  let progress = 0;
  let playing = false;
  let elapsed = 0;
  let lineVisible = true;

  function glassGeometry(faces) {
    const vertices = [];
    for (const face of faces) {
      const [a, b, c, d] = face.corners;
      vertices.push(...a, ...b, ...c, ...a, ...c, ...d);
    }
    const geometry = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();
    return geometry;
  }

  function updateLightSources(edges) {
    root.updateMatrixWorld(true);
    glassUniforms.uDot.value.copy(marker.position).applyMatrix4(root.matrixWorld);
    const count = Math.min(edges.length, MAX_LINE_LIGHTS);
    glassUniforms.uLineCount.value = count;
    for (let index = 0; index < count; index += 1) {
      lineStarts[index].set(...edges[index].start).applyMatrix4(root.matrixWorld);
      lineEnds[index].set(...edges[index].end).applyMatrix4(root.matrixWorld);
    }
  }

  function display(value) {
    progress = Math.max(0, Math.min(63, value));
    const sample = spineSample(points, progress);
    const continuous = sample.from + sample.eased;
    marker.position.set(...sample.point);
    const occupied = passage(points, continuous);
    const active = enteredRooms(occupied.visits);
    const edges = openRoomEdges(active);
    const faces = frontierGlassFaces(active);
    const vertices = edges.flatMap(edge => [...edge.start, ...edge.end]);
    structure.geometry.dispose();
    structure.geometry = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    glass.geometry.dispose();
    glass.geometry = glassGeometry(faces);
    updateLightSources(edges);
    const activeRoom = cellAt(occupied.marker);
    const state = progress === 63 ? 64 : sample.from + 1;
    slider.value = String(state);
    document.querySelector('#count').textContent = `${state} / 64`;
    document.querySelector('#room-state').textContent = `The point is in room ${activeRoom}.`;
    document.querySelector('#structure-key').textContent = `${active.size} entered ${active.size === 1 ? 'room' : 'rooms'} / ${edges.length} open edges / ${faces.length} glass faces`;
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
  lineButton.addEventListener('click', () => {
    lineVisible = !lineVisible;
    structure.visible = lineVisible;
    glassUniforms.uLineStrength.value = lineVisible ? 1 : 0;
    lineButton.setAttribute('aria-pressed', String(lineVisible));
    lineButton.textContent = `Line: ${lineVisible ? 'on' : 'off'}`;
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
