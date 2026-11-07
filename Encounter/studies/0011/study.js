import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { passage } from '../0003/rooms.js';
import { upwardQuaternion } from '../0006/geometry.js';
import { enteredRooms, frontierGlassFaces, fullCubeEdges, openRoomEdges, unconnectedRoomPoints } from '../0010/geometry.js';

const MAX_LIGHT_SEGMENTS = 96;
const visibility = {lines:true, sides:true, redLine:true, redDot:true, scaffold:false, unconnected:false};
const labels = {lines:'Lines', sides:'Sides', redLine:'Red line', redDot:'Red dot', scaffold:'64-room scaffold', unconnected:'Unconnected points'};

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

  function edgeGeometry(source) {
    return new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(source.flatMap(edge => [...edge.start, ...edge.end]), 3));
  }
  function faceGeometry(source) {
    const vertices = [];
    for (const face of source) {
      const [a, b, c, d] = face.corners;
      vertices.push(...a, ...b, ...c, ...a, ...c, ...d);
    }
    const geometry = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();
    return geometry;
  }
  function dispose(group) {
    group?.traverse(object => {
      object.geometry?.dispose();
      if (Array.isArray(object.material)) object.material.forEach(material => material.dispose());
      else object.material?.dispose();
    });
  }
  function glassMaterial(uniforms) {
    return new THREE.ShaderMaterial({
      uniforms, transparent:true, depthWrite:false, side:THREE.DoubleSide,
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
        #define MAX_LIGHT_SEGMENTS ${MAX_LIGHT_SEGMENTS}
        uniform vec3 uLineStart[MAX_LIGHT_SEGMENTS];
        uniform vec3 uLineEnd[MAX_LIGHT_SEGMENTS];
        uniform int uLineCount;
        uniform float uLineStrength;
        uniform vec3 uPathStart[MAX_LIGHT_SEGMENTS];
        uniform vec3 uPathEnd[MAX_LIGHT_SEGMENTS];
        uniform int uPathCount;
        uniform float uPathStrength;
        uniform vec3 uDot;
        uniform float uDotStrength;
        varying vec3 vWorldPosition;
        varying vec3 vWorldNormal;
        float segmentDistance(vec3 point, vec3 start, vec3 end) {
          vec3 span = end - start;
          float amount = clamp(dot(point - start, span) / max(dot(span, span), .0001), 0.0, 1.0);
          return length(point - (start + span * amount));
        }
        void main() {
          float nearestLine = 100.0;
          float nearestPath = 100.0;
          for (int index = 0; index < MAX_LIGHT_SEGMENTS; index++) {
            if (index < uLineCount) nearestLine = min(nearestLine, segmentDistance(vWorldPosition, uLineStart[index], uLineEnd[index]));
            if (index < uPathCount) nearestPath = min(nearestPath, segmentDistance(vWorldPosition, uPathStart[index], uPathEnd[index]));
          }
          vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
          float facing = abs(dot(normalize(vWorldNormal), viewDirection));
          float fresnel = pow(1.0 - facing, 2.35);
          float lineLight = exp(-nearestLine * 2.45) * uLineStrength;
          float pathLight = exp(-nearestPath * 1.25) * uPathStrength;
          float dotLight = exp(-distance(vWorldPosition, uDot) * .9) * uDotStrength;
          float grain = .5 + .5 * sin(vWorldPosition.x * 13.0 + vWorldPosition.y * 17.0 + vWorldPosition.z * 19.0);
          float illumination = .34 + lineLight * .48 + pathLight * .34 + dotLight * .28;
          vec3 glass = vec3(.58, .67, .64) * (.075 + fresnel * .14) * illumination;
          glass += vec3(.92, .96, .94) * grain * .018;
          float alpha = clamp(.022 + fresnel * .12 + lineLight * .11 + pathLight * .085 + dotLight * .07 + grain * .008, .024, .3);
          gl_FragColor = vec4(glass, alpha);
        }
      `
    });
  }
  function build(vessel, savedVisibility = null) {
    if (!vessel || vessel.points.length !== 64) throw new Error('Selected vessel is unavailable');
    if (savedVisibility) Object.assign(visibility, savedVisibility);
    const points = vessel.points;
    const active = enteredRooms(passage(points, 63).visits);
    const edges = openRoomEdges(active);
    const faces = frontierGlassFaces(active);
    const scaffoldEdges = fullCubeEdges();
    const disconnectedPoints = unconnectedRoomPoints(active);
    if (edges.length > MAX_LIGHT_SEGMENTS) throw new Error('Selected vessel exceeds the instrument light capacity');
    if (root) { scene.remove(root); dispose(root); }
    root = new THREE.Group();
    root.quaternion.fromArray(upwardQuaternion(points));
    scene.add(root);

    const structure = new THREE.LineSegments(edgeGeometry(edges), new THREE.LineBasicMaterial({color:0x171a19, transparent:true, opacity:.82}));
    const redPath = new THREE.Line(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(points.flat(), 3)), new THREE.LineBasicMaterial({color:0xad2e24, transparent:true, opacity:.9}));
    redPath.renderOrder = 3;
    const redDot = new THREE.Mesh(new THREE.SphereGeometry(.052, 16, 10), new THREE.MeshBasicMaterial({color:0xad2e24, depthTest:false}));
    redDot.position.set(...points.at(-1)); redDot.renderOrder = 4;
    const scaffold = new THREE.LineSegments(edgeGeometry(scaffoldEdges), new THREE.LineBasicMaterial({color:0x65706c, transparent:true, opacity:.17, depthWrite:false}));
    scaffold.renderOrder = 0;
    const unconnected = new THREE.InstancedMesh(new THREE.SphereGeometry(.045, 8, 6), new THREE.MeshBasicMaterial({color:0x65706c, transparent:true, opacity:.58, depthWrite:false}), disconnectedPoints.length);
    const pointMatrix = new THREE.Matrix4();
    disconnectedPoints.forEach((point, index) => unconnected.setMatrixAt(index, pointMatrix.makeTranslation(...point)));
    unconnected.renderOrder = 2;

    const lineStarts = Array.from({length:MAX_LIGHT_SEGMENTS}, () => new THREE.Vector3());
    const lineEnds = Array.from({length:MAX_LIGHT_SEGMENTS}, () => new THREE.Vector3());
    const pathStarts = Array.from({length:MAX_LIGHT_SEGMENTS}, () => new THREE.Vector3());
    const pathEnds = Array.from({length:MAX_LIGHT_SEGMENTS}, () => new THREE.Vector3());
    const uniforms = {
      uLineStart:{value:lineStarts}, uLineEnd:{value:lineEnds}, uLineCount:{value:edges.length}, uLineStrength:{value:visibility.lines ? 1 : 0},
      uPathStart:{value:pathStarts}, uPathEnd:{value:pathEnds}, uPathCount:{value:points.length - 1}, uPathStrength:{value:visibility.redLine ? 1 : 0},
      uDot:{value:new THREE.Vector3()}, uDotStrength:{value:visibility.redDot ? 1 : 0}
    };
    const glass = new THREE.Mesh(faceGeometry(faces), glassMaterial(uniforms));
    glass.renderOrder = 1;
    root.add(structure, redPath, redDot, scaffold, unconnected, glass);
    root.updateMatrixWorld(true);
    uniforms.uDot.value.copy(redDot.position).applyMatrix4(root.matrixWorld);
    edges.forEach((edge, index) => {
      lineStarts[index].set(...edge.start).applyMatrix4(root.matrixWorld);
      lineEnds[index].set(...edge.end).applyMatrix4(root.matrixWorld);
    });
    for (let index = 0; index < points.length - 1; index += 1) {
      pathStarts[index].set(...points[index]).applyMatrix4(root.matrixWorld);
      pathEnds[index].set(...points[index + 1]).applyMatrix4(root.matrixWorld);
    }
    objects = {structure, redPath, redDot, scaffold, unconnected, glass, uniforms};
    currentVessel = vessel.id;
    vesselSelect.value = String(vessel.id);
    document.querySelector('#vessel-label').textContent = `SS VESSEL ${vessel.id}`;
    document.querySelector('#source-key').textContent = `SS vessel ${vessel.id} / 64 states / locked room grammar`;
    document.querySelector('#structure-key').textContent = `${active.size} entered rooms / ${edges.length} open edges / ${faces.length} glass sides / ${scaffoldEdges.length} scaffold edges / ${disconnectedPoints.length} unconnected points`;
    applyVisibility();
  }
  function applyVisibility() {
    if (!objects.structure) return;
    objects.structure.visible = visibility.lines;
    objects.glass.visible = visibility.sides;
    objects.redPath.visible = visibility.redLine;
    objects.redDot.visible = visibility.redDot;
    objects.scaffold.visible = visibility.scaffold;
    objects.unconnected.visible = visibility.unconnected;
    objects.uniforms.uLineStrength.value = visibility.lines ? 1 : 0;
    objects.uniforms.uPathStrength.value = visibility.redLine ? 1 : 0;
    objects.uniforms.uDotStrength.value = visibility.redDot ? 1 : 0;
    for (const [key, label] of Object.entries(labels)) {
      const button = document.querySelector('#' + key.replace(/[A-Z]/g, letter => '-' + letter.toLowerCase()));
      button.setAttribute('aria-pressed', String(visibility[key]));
      button.textContent = `${label}: ${visibility[key] ? 'on' : 'off'}`;
    }
  }
  for (const [key] of Object.entries(labels)) {
    const button = document.querySelector('#' + key.replace(/[A-Z]/g, letter => '-' + letter.toLowerCase()));
    button.addEventListener('click', () => { visibility[key] = !visibility[key]; applyVisibility(); });
  }

  let rotationActive = false;
  let rotationTheta = 0;
  let rotationRadius = 14;
  let rotationBaseElevation = 0;
  let rotationElapsed = 0;
  const rotateButton = document.querySelector('#rotate');
  function stopRotation() {
    rotationActive = false; controls.enabled = true;
    rotateButton.setAttribute('aria-pressed', 'false'); rotateButton.textContent = 'Rotate: off';
  }
  rotateButton.addEventListener('click', () => {
    if (rotationActive) { stopRotation(); return; }
    const offset = camera.position.clone().sub(controls.target);
    rotationRadius = offset.length();
    rotationTheta = Math.atan2(offset.x, offset.z);
    rotationBaseElevation = Math.asin(THREE.MathUtils.clamp(offset.y / rotationRadius, -1, 1));
    rotationElapsed = 0; rotationActive = true; controls.enabled = false;
    rotateButton.setAttribute('aria-pressed', 'true'); rotateButton.textContent = 'Rotate: on';
  });
  canvas.addEventListener('keydown', event => {
    if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) return;
    event.preventDefault(); stopRotation();
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
      const result = await api('research/sigils', {method:'POST', headers:{'Content-Type':'application/json','X-Studio-CSRF':state.csrf}, body:JSON.stringify({request_id:crypto.randomUUID(), vessel_id:currentVessel, settings:{...visibility}})});
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
    if (rotationActive) {
      rotationElapsed += delta; rotationTheta += delta * .22;
      const elevation = rotationBaseElevation * Math.exp(-rotationElapsed * .32) + Math.sin(rotationElapsed * .43) * .34;
      const horizontal = rotationRadius * Math.cos(elevation);
      camera.position.set(Math.sin(rotationTheta) * horizontal, Math.sin(elevation) * rotationRadius, Math.cos(rotationTheta) * horizontal).add(controls.target);
      camera.up.set(0,1,0); camera.lookAt(controls.target);
    }
    controls.update(delta); renderer.render(scene, camera);
  });
} catch (error) {
  const message = document.querySelector('#error');
  message.hidden = false; message.textContent = `Unable to open the study: ${error.message}`;
  console.error(error);
}
