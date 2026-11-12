import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { journey } from '../0003/geometry.js';
import { passage } from '../0003/rooms.js';
import { upwardQuaternion } from '../0006/geometry.js';
import { enteredRooms, frontierGlassFaces, fullCubeEdges, openRoomEdges, unconnectedRoomPoints } from './geometry.js';

const MAX_LIGHT_SEGMENTS = 72;

try {
  const response = await fetch('../0003/trace.json');
  if (!response.ok) throw new Error('Cannot load the source trace');
  const states = journey(await response.json());
  const points = states.map(state => state.point);
  const active = enteredRooms(passage(points, 63).visits);
  const edges = openRoomEdges(active);
  const faces = frontierGlassFaces(active);
  const scaffoldEdges = fullCubeEdges();
  const disconnectedPoints = unconnectedRoomPoints(active);
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
  controls.minPolarAngle = 0;
  controls.maxPolarAngle = Math.PI;
  const root = new THREE.Group();
  root.quaternion.fromArray(upwardQuaternion(points));
  scene.add(root);

  function edgeGeometry(source) {
    const vertices = source.flatMap(edge => [...edge.start, ...edge.end]);
    return new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
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

  const structure = new THREE.LineSegments(edgeGeometry(edges), new THREE.LineBasicMaterial({color:0x171a19, transparent:true, opacity:.82}));
  root.add(structure);
  const redPath = new THREE.Line(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(points.flat(), 3)), new THREE.LineBasicMaterial({color:0xad2e24, transparent:true, opacity:.9}));
  redPath.renderOrder = 3;
  root.add(redPath);
  const redDot = new THREE.Mesh(new THREE.SphereGeometry(.052, 16, 10), new THREE.MeshBasicMaterial({color:0xad2e24, depthTest:false}));
  redDot.position.set(...points.at(-1));
  redDot.renderOrder = 4;
  root.add(redDot);
  const scaffold = new THREE.LineSegments(edgeGeometry(scaffoldEdges), new THREE.LineBasicMaterial({color:0x65706c, transparent:true, opacity:.17, depthWrite:false}));
  scaffold.visible = false;
  scaffold.renderOrder = 0;
  root.add(scaffold);
  const unconnected = new THREE.InstancedMesh(new THREE.SphereGeometry(.045, 8, 6), new THREE.MeshBasicMaterial({color:0x65706c, transparent:true, opacity:.58, depthWrite:false}), disconnectedPoints.length);
  const pointMatrix = new THREE.Matrix4();
  disconnectedPoints.forEach((point, index) => unconnected.setMatrixAt(index, pointMatrix.makeTranslation(...point)));
  unconnected.visible = false;
  unconnected.renderOrder = 2;
  root.add(unconnected);

  const lineStarts = Array.from({length:MAX_LIGHT_SEGMENTS}, () => new THREE.Vector3());
  const lineEnds = Array.from({length:MAX_LIGHT_SEGMENTS}, () => new THREE.Vector3());
  const pathStarts = Array.from({length:MAX_LIGHT_SEGMENTS}, () => new THREE.Vector3());
  const pathEnds = Array.from({length:MAX_LIGHT_SEGMENTS}, () => new THREE.Vector3());
  const glassUniforms = {
    uLineStart:{value:lineStarts}, uLineEnd:{value:lineEnds}, uLineCount:{value:0}, uLineStrength:{value:1},
    uPathStart:{value:pathStarts}, uPathEnd:{value:pathEnds}, uPathCount:{value:0}, uPathStrength:{value:1},
    uDot:{value:new THREE.Vector3()}, uDotStrength:{value:1}
  };
  const glassMaterial = new THREE.ShaderMaterial({
    uniforms:glassUniforms, transparent:true, depthWrite:false, side:THREE.DoubleSide,
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
  const glass = new THREE.Mesh(faceGeometry(faces), glassMaterial);
  glass.renderOrder = 1;
  root.add(glass);

  root.updateMatrixWorld(true);
  glassUniforms.uDot.value.copy(redDot.position).applyMatrix4(root.matrixWorld);
  const lineCount = Math.min(edges.length, MAX_LIGHT_SEGMENTS);
  glassUniforms.uLineCount.value = lineCount;
  for (let index = 0; index < lineCount; index += 1) {
    lineStarts[index].set(...edges[index].start).applyMatrix4(root.matrixWorld);
    lineEnds[index].set(...edges[index].end).applyMatrix4(root.matrixWorld);
  }
  const pathCount = Math.min(points.length - 1, MAX_LIGHT_SEGMENTS);
  glassUniforms.uPathCount.value = pathCount;
  for (let index = 0; index < pathCount; index += 1) {
    pathStarts[index].set(...points[index]).applyMatrix4(root.matrixWorld);
    pathEnds[index].set(...points[index + 1]).applyMatrix4(root.matrixWorld);
  }

  function toggle(button, object, uniform, label) {
    let visible = object.visible;
    button.addEventListener('click', () => {
      visible = !visible;
      object.visible = visible;
      if (uniform) uniform.value = visible ? 1 : 0;
      button.setAttribute('aria-pressed', String(visible));
      button.textContent = `${label}: ${visible ? 'on' : 'off'}`;
    });
  }
  toggle(document.querySelector('#lines'), structure, glassUniforms.uLineStrength, 'Lines');
  toggle(document.querySelector('#sides'), glass, null, 'Sides');
  toggle(document.querySelector('#red-line'), redPath, glassUniforms.uPathStrength, 'Red line');
  toggle(document.querySelector('#red-dot'), redDot, glassUniforms.uDotStrength, 'Red dot');
  toggle(document.querySelector('#scaffold'), scaffold, null, '64-room scaffold');
  toggle(document.querySelector('#unconnected'), unconnected, null, 'Unconnected points');

  const views = {
    front:{position:[0,0,14],up:[0,1,0]}, back:{position:[0,0,-14],up:[0,1,0]},
    left:{position:[-14,0,0],up:[0,1,0]}, right:{position:[14,0,0],up:[0,1,0]},
    top:{position:[0,14,0],up:[0,0,-1]}, bottom:{position:[0,-14,0],up:[0,0,1]}
  };
  let rotationActive = false;
  let rotationTheta = 0;
  let rotationRadius = 14;
  let rotationBaseElevation = 0;
  let rotationElapsed = 0;
  const rotateButton = document.querySelector('#rotate');
  function stopRotation() {
    rotationActive = false;
    controls.enabled = true;
    rotateButton.setAttribute('aria-pressed', 'false');
    rotateButton.textContent = 'Rotate: off';
  }
  function select(key) {
    const view = views[key];
    camera.position.set(...view.position);
    camera.up.set(...view.up);
    camera.zoom = 1;
    camera.updateProjectionMatrix();
    controls.target.set(0,0,0);
    controls.update();
    document.querySelectorAll('[data-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === key)));
  }
  document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => {
    stopRotation();
    select(button.dataset.view);
  }));
  rotateButton.addEventListener('click', () => {
    if (rotationActive) { stopRotation(); return; }
    const offset = camera.position.clone().sub(controls.target);
    rotationRadius = offset.length();
    rotationTheta = Math.atan2(offset.x, offset.z);
    rotationBaseElevation = Math.asin(THREE.MathUtils.clamp(offset.y / rotationRadius, -1, 1));
    rotationElapsed = 0;
    rotationActive = true;
    controls.enabled = false;
    rotateButton.setAttribute('aria-pressed', 'true');
    rotateButton.textContent = 'Rotate: on';
    document.querySelectorAll('[data-view]').forEach(button => button.setAttribute('aria-pressed', 'false'));
  });
  canvas.addEventListener('keydown', event => {
    if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    stopRotation();
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
  select('front');
  let previousTime;
  renderer.setAnimationLoop(now => {
    const delta = previousTime === undefined ? 0 : Math.min((now - previousTime) / 1000, .1);
    previousTime = now;
    if (document.hidden) return;
    if (rotationActive) {
      rotationElapsed += delta;
      rotationTheta += delta * .22;
      const elevation = rotationBaseElevation * Math.exp(-rotationElapsed * .32) + Math.sin(rotationElapsed * .43) * .34;
      const horizontal = rotationRadius * Math.cos(elevation);
      camera.position.set(Math.sin(rotationTheta) * horizontal, Math.sin(elevation) * rotationRadius, Math.cos(rotationTheta) * horizontal).add(controls.target);
      camera.up.set(0,1,0);
      camera.lookAt(controls.target);
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
