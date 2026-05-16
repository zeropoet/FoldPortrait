import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const LAYER_ORDER = [
  "hash-rib",
  "memory-spine",
  "memory-byte",
  "color-field",
  "gesture",
  "fold-aura",
  "fold-glyph",
  "fine-drawing",
  "fold-notation",
  "field-dust",
];

const state = {
  currentIteration: "",
  latestIteration: "",
  ledger: [],
  view: "latest",
  backgroundColor: new THREE.Color(0xf3efe6),
  navigationQueue: Promise.resolve(),
  objects: [],
  memoryBytes: [],
  hashBytes: [],
  permutation: [],
};

const canvas = document.querySelector("#topology-canvas");
const stage = document.querySelector(".stage");
const galleryButton = document.querySelector("#gallery-button");
const latestButton = document.querySelector("#latest-button");
const galleryClose = document.querySelector("#gallery-close");
const galleryView = document.querySelector("#gallery-view");
const galleryGrid = document.querySelector("#gallery-grid");
const readoutIteration = document.querySelector("#readout-iteration");
const readoutCount = document.querySelector("#readout-count");
const readoutHash = document.querySelector("#readout-hash");
const readoutCountdown = document.querySelector("#readout-countdown");

const scene = new THREE.Scene();
scene.background = state.backgroundColor.clone();
scene.fog = new THREE.Fog(state.backgroundColor, 1180, 3100);

const camera = new THREE.PerspectiveCamera(42, 1, 1, 5200);
camera.position.set(0, -380, 1580);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  preserveDrawingBuffer: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.enablePan = false;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.18;
controls.minDistance = 620;
controls.maxDistance = 2600;

const topologyRoot = new THREE.Group();
topologyRoot.rotation.x = -0.22;
scene.add(topologyRoot);

const keyLight = new THREE.DirectionalLight(0xfffbef, 2.1);
keyLight.position.set(-430, -760, 920);
scene.add(keyLight);
scene.add(new THREE.AmbientLight(0xf2ecdf, 1.85));

window.FoldPortraitTopology = { samplePixels };

init().catch((error) => {
  console.error(error);
  readoutIteration.textContent = "load failed";
  readoutCount.textContent = error.message;
});

async function init() {
  galleryButton.addEventListener("click", showGallery);
  latestButton.addEventListener("click", openLatest);
  galleryClose.addEventListener("click", openLatest);
  window.addEventListener("keydown", handleKeyboardNavigation);
  await loadLatest({ force: true });
  updateCountdown();
  resize();
  window.addEventListener("resize", resize);
  window.setInterval(loadLatest, 5 * 60 * 1000);
  window.setInterval(updateCountdown, 1000);
  animate();
}

async function loadLatest(options = {}) {
  const ledger = await loadLedger();
  const latest = ledger.at(-1);
  if (!latest) {
    return;
  }

  state.latestIteration = latest.iteration;
  if (state.view !== "latest" && !options.force) {
    renderGallery();
    return;
  }

  if (!options.force && latest.iteration === state.currentIteration) {
    renderGallery();
    return;
  }

  await loadEntry(latest);
  state.view = "latest";
  hideGallery();
  renderGallery();
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Unable to load ${url}`);
  }
  return response.json();
}

async function loadLedger() {
  const ledger = await fetchJson(versionedUrl("../Output/iterations/evolution.json"));
  state.ledger = ledger.slice().sort((a, b) => a.iteration.localeCompare(b.iteration));
  return state.ledger;
}

async function loadEntry(entry) {
  const svgPath = outputPath(entry.svgPath);
  const response = await fetch(versionedUrl(svgPath));
  if (!response.ok) {
    throw new Error(`Unable to load ${svgPath}`);
  }

  const svgText = await response.text();
  const svg = new DOMParser().parseFromString(svgText, "image/svg+xml").documentElement;
  applyBackgroundColor(backgroundFillFrom(svg));
  state.memoryBytes = hexBytes(entry.memorySignature);
  state.hashBytes = hexBytes(entry.convergenceHash);
  state.permutation = (svg.getAttribute("data-permutation") || "")
    .split("-")
    .map((value) => Number(value))
    .filter(Number.isFinite);

  const shapes = extractShapes(svg);
  buildTopology(shapes, entry);
  arrangeByFoldKernel(entry);
  state.currentIteration = entry.iteration;

  readoutIteration.textContent = entry.iteration;
  readoutCount.textContent = `${shapes.length} forms`;
  readoutHash.textContent = (entry.renderHash || entry.convergenceHash).slice(0, 16);
}

function backgroundFillFrom(svg) {
  const background = [...svg.children].find((node) => {
    const tag = node.tagName.toLowerCase();
    const fill = node.getAttribute("fill");
    return tag === "rect" && fill && fill !== "none" && !node.hasAttribute("data-layer");
  });
  return background?.getAttribute("fill") || "#f3efe6";
}

function applyBackgroundColor(fill) {
  const color = new THREE.Color(fill);
  state.backgroundColor = color;
  scene.background = color.clone();
  scene.fog.color.copy(color);
  document.documentElement.style.setProperty("--paper", fill);
  document.body.dataset.paperColor = fill;
}

function showGallery() {
  state.view = "gallery";
  stage.classList.add("gallery-open");
  galleryView.hidden = false;
  galleryButton.setAttribute("aria-pressed", "true");
  latestButton.setAttribute("aria-pressed", "false");
  renderGallery();
}

function hideGallery() {
  stage.classList.remove("gallery-open");
  galleryView.hidden = true;
  galleryButton.setAttribute("aria-pressed", "false");
  latestButton.setAttribute("aria-pressed", state.view === "latest" ? "true" : "false");
}

async function openLatest() {
  await loadLatest({ force: true });
}

async function openGalleryEntry(entry) {
  await loadEntry(entry);
  state.view = entry.iteration === state.latestIteration ? "latest" : "iteration";
  hideGallery();
  renderGallery();
}

function handleKeyboardNavigation(event) {
  if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
    return;
  }

  if (event.key === "ArrowLeft") {
    event.preventDefault();
    queueAdjacentEntry(-1);
  }

  if (event.key === "ArrowRight") {
    event.preventDefault();
    queueAdjacentEntry(1);
  }
}

function queueAdjacentEntry(step) {
  state.navigationQueue = state.navigationQueue
    .catch(() => {})
    .then(() => openAdjacentEntry(step));
}

async function openAdjacentEntry(step) {
  if (state.ledger.length === 0) {
    await loadLedger();
  }

  const currentIndex = Math.max(
    0,
    state.ledger.findIndex((entry) => entry.iteration === state.currentIteration),
  );
  const nextIndex = THREE.MathUtils.clamp(currentIndex + step, 0, state.ledger.length - 1);
  const entry = state.ledger[nextIndex];
  if (!entry || entry.iteration === state.currentIteration) {
    return;
  }

  await openGalleryEntry(entry);
}

function renderGallery() {
  if (state.ledger.length === 0) {
    galleryGrid.replaceChildren();
    return;
  }

  const fragment = document.createDocumentFragment();
  state.ledger
    .slice()
    .reverse()
    .forEach((entry) => {
      const card = document.createElement("button");
      const hash = (entry.renderHash || entry.convergenceHash || "").slice(0, 16);
      const isCurrent = entry.iteration === state.currentIteration;
      card.className = "gallery-card";
      card.type = "button";
      card.setAttribute("aria-current", String(isCurrent));
      card.setAttribute("aria-label", `Open ${entry.iteration}`);
      card.addEventListener("click", () => openGalleryEntry(entry));

      const figure = document.createElement("figure");
      const image = document.createElement("img");
      image.src = versionedUrl(outputPath(entry.svgPath));
      image.alt = `${entry.iteration} render`;
      image.loading = "lazy";
      figure.append(image);

      const meta = document.createElement("div");
      meta.className = "gallery-meta";
      const title = document.createElement("strong");
      title.textContent =
        entry.iteration === state.latestIteration ? `${entry.iteration} latest` : entry.iteration;
      const detail = document.createElement("span");
      detail.textContent = hash;
      meta.append(title, detail);

      card.append(figure, meta);
      fragment.append(card);
    });

  galleryGrid.replaceChildren(fragment);
}

function versionedUrl(path) {
  const url = new URL(path, window.location.href);
  url.searchParams.set("cache", String(Date.now()));
  return url;
}

function outputPath(path) {
  return path.replace(/^.*\/Output\//, "../Output/");
}

function extractShapes(svg) {
  const nodes = [...svg.querySelectorAll("[data-layer]")];
  const probe = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  probe.setAttribute("width", "1200");
  probe.setAttribute("height", "1600");
  probe.style.cssText = "position:absolute;left:-9999px;top:-9999px;width:1200px;height:1600px;";
  document.body.appendChild(probe);

  const shapes = nodes
    .map((node, index) => shapeFromNode(node, index, probe))
    .filter(Boolean);

  probe.remove();
  return shapes;
}

function shapeFromNode(node, index, probe) {
  const layer = node.getAttribute("data-layer") || "unlayered";
  const tag = node.tagName.toLowerCase();
  const fill = node.getAttribute("fill");
  const stroke = node.getAttribute("stroke");
  const opacity = Number(node.getAttribute("opacity") || 1);
  const color = colorFrom(fill && fill !== "none" ? fill : stroke, layer);
  const rotation = rotationFromTransform(node.getAttribute("transform"));
  const layerIndex = Math.max(0, LAYER_ORDER.indexOf(layer));

  if (tag === "rect") {
    const x = numberAttr(node, "x");
    const y = numberAttr(node, "y");
    const width = Math.max(1, numberAttr(node, "width"));
    const height = Math.max(1, numberAttr(node, "height"));
    return {
      index,
      layer,
      layerIndex,
      kind: "rect",
      color,
      opacity,
      rotation,
      x: x + width / 2,
      y: y + height / 2,
      width,
      height,
    };
  }

  if (tag === "ellipse" || tag === "circle") {
    const radius = tag === "circle" ? numberAttr(node, "r") : 1;
    return {
      index,
      layer,
      layerIndex,
      kind: "ellipse",
      color,
      opacity,
      rotation,
      x: numberAttr(node, "cx"),
      y: numberAttr(node, "cy"),
      width: tag === "circle" ? radius * 2 : numberAttr(node, "rx") * 2,
      height: tag === "circle" ? radius * 2 : numberAttr(node, "ry") * 2,
    };
  }

  if (tag === "path") {
    const clone = node.cloneNode(true);
    probe.appendChild(clone);
    const points = samplePath(clone);
    clone.remove();
    if (points.length < 2) {
      return null;
    }

    const bounds = boundsFor(points);
    return {
      index,
      layer,
      layerIndex,
      kind: "path",
      color,
      opacity,
      rotation,
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2,
      width: bounds.width,
      height: bounds.height,
      points,
      strokeWidth: Number(node.getAttribute("stroke-width") || 2),
    };
  }

  return null;
}

function buildTopology(shapes, entry) {
  disposeTopology();
  state.objects = shapes.map((shape) => {
    const object = createObject(shape);
    object.userData.shape = shape;
    object.userData.entry = entry;
    object.userData.phase = hashPhase(entry.convergenceHash, shape.index);
    topologyRoot.add(object);
    return object;
  });
}

function disposeTopology() {
  topologyRoot.children.forEach((object) => {
    object.geometry?.dispose?.();
    object.material?.dispose?.();
  });
  topologyRoot.clear();
}

function createObject(shape) {
  const opacity = Math.min(0.9, Math.max(0.11, shape.opacity));
  const materialOptions = {
    color: shape.color,
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
  };

  if (shape.kind === "rect") {
    const depth = 4 + structuralByte(shape.index, 3) % 22;
    const geometry = new THREE.BoxGeometry(shape.width, shape.height, depth);
    const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial(materialOptions));
    mesh.rotation.z = shape.rotation;
    return mesh;
  }

  if (shape.kind === "ellipse") {
    const geometry = new THREE.CircleGeometry(0.5, 56);
    const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial(materialOptions));
    mesh.scale.set(shape.width, shape.height, 1);
    mesh.rotation.z = shape.rotation;
    return mesh;
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(
    shape.points.map((point) => new THREE.Vector3(point.x - shape.x, shape.y - point.y, 0)),
  );
  const material = new THREE.LineBasicMaterial({
    color: shape.color,
    transparent: true,
    opacity,
    linewidth: Math.max(1, shape.strokeWidth),
  });
  return new THREE.Line(geometry, material);
}

function arrangeByFoldKernel(entry) {
  const refinement = Number(entry.refinementDepth || 1);
  const identity = entry.structuralIdentity || {};

  state.objects.forEach((object) => {
    const shape = object.userData.shape;
    const center = centered(shape.x, shape.y);
    const base = svgPointToVector(shape.x, shape.y, 0);
    const memory = structuralByte(shape.index, shape.layerIndex);
    const hash = hashByte(shape.index, shape.layerIndex * 5);
    const nextHash = hashByte(shape.index, shape.layerIndex * 11 + 7);
    const permutation = permutationValue(shape.index);
    const topologyPull = (permutation - 8.5) / 8.5;
    const memoryPull = (memory - 8) / 8;
    const hashPull = (hash - 127.5) / 127.5;
    const fieldPressure = Number(identity.fieldWidthPressure || 1);
    const verticalPressure = Number(identity.verticalFieldPressure || 1);
    const axisTilt = THREE.MathUtils.degToRad(Number(identity.axisTilt || 0));
    const layerPhase = (shape.layerIndex + 1) / LAYER_ORDER.length;
    const orbit = (shape.index / Math.max(1, state.objects.length)) * Math.PI * 2 + topologyPull;
    const layerSpiral = Math.sin(orbit * permutation * 0.125);

    const x =
      base.x * fieldPressure +
      Math.cos(orbit) * (38 + refinement * 4) * topologyPull +
      center.y * 34 * memoryPull;
    const y =
      base.y * verticalPressure +
      Math.sin(orbit * 1.7) * (46 + refinement * 3) * hashPull -
      center.x * 26 * topologyPull;
    const z =
      hashPull * 360 +
      memoryPull * 190 +
      topologyPull * 260 +
      layerSpiral * 120 +
      (nextHash / 255 - 0.5) * refinement * 18;

    object.userData.target = new THREE.Vector3(x, y, z);
    object.userData.drift = new THREE.Vector3(
      Math.sin(orbit) * (1 + layerPhase * 8),
      Math.cos(orbit * 1.3) * (1 + layerPhase * 6),
      5 + refinement * 0.8 + Math.abs(memoryPull) * 16,
    );
    object.position.copy(object.userData.target);
    object.rotation.x = topologyPull * 0.18 + axisTilt * 0.2;
    object.rotation.y = memoryPull * 0.22;
  });

  requestAnimationFrame(updatePixelMetrics);
}

function resize() {
  const { clientWidth, clientHeight } = canvas.parentElement;
  renderer.setSize(clientWidth, clientHeight, false);
  camera.aspect = clientWidth / Math.max(1, clientHeight);
  camera.updateProjectionMatrix();
}

function animate(time = 0) {
  requestAnimationFrame(animate);

  topologyRoot.rotation.z = Math.sin(time * 0.00009) * 0.025;
  topologyRoot.rotation.y = Math.sin(time * 0.00007) * 0.045;

  state.objects.forEach((object) => {
    const phase = object.userData.phase;
    const target = object.userData.target || object.position;
    const drift = object.userData.drift || new THREE.Vector3();
    object.position.set(
      target.x + Math.sin(time * 0.00034 + phase) * drift.x,
      target.y + Math.cos(time * 0.00029 + phase) * drift.y,
      target.z + Math.sin(time * 0.00052 + phase) * drift.z,
    );
  });

  controls.update();
  renderer.render(scene, camera);
}

function updatePixelMetrics() {
  const sample = samplePixels();
  document.body.dataset.pixelWidth = String(sample.width);
  document.body.dataset.pixelHeight = String(sample.height);
  document.body.dataset.pixelUnique = String(sample.unique);
  document.body.dataset.pixelNonPaper = String(sample.nonPaper);
}

function samplePixels() {
  renderer.render(scene, camera);
  const gl = renderer.getContext();
  const width = gl.drawingBufferWidth;
  const height = gl.drawingBufferHeight;
  const pixels = new Uint8Array(width * height * 4);
  gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  let nonPaper = 0;
  const unique = new Set();
  const paper = state.backgroundColor;
  const paperRed = Math.round(paper.r * 255);
  const paperGreen = Math.round(paper.g * 255);
  const paperBlue = Math.round(paper.b * 255);
  for (let index = 0; index < pixels.length; index += 16) {
    const red = pixels[index];
    const green = pixels[index + 1];
    const blue = pixels[index + 2];
    unique.add(`${red},${green},${blue}`);
    if (Math.abs(red - paperRed) + Math.abs(green - paperGreen) + Math.abs(blue - paperBlue) > 24) {
      nonPaper += 1;
    }
  }
  return { width, height, sampled: pixels.length / 16, nonPaper, unique: unique.size };
}

function updateCountdown() {
  const now = new Date();
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  const remaining = Math.max(0, next.getTime() - now.getTime());
  const hours = Math.floor(remaining / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);
  readoutCountdown.textContent = [
    String(hours).padStart(2, "0"),
    String(minutes).padStart(2, "0"),
    String(seconds).padStart(2, "0"),
  ].join(":");
}

function samplePath(path) {
  const length = path.getTotalLength();
  const steps = Math.min(180, Math.max(8, Math.ceil(length / 18)));
  return Array.from({ length: steps + 1 }, (_, step) => {
    const point = path.getPointAtLength((length * step) / steps);
    return { x: point.x, y: point.y };
  });
}

function boundsFor(points) {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function svgPointToVector(x, y, z) {
  return new THREE.Vector3(x - 600, 800 - y, z);
}

function centered(x, y) {
  return {
    x: (x - 600) / 600,
    y: (800 - y) / 800,
  };
}

function numberAttr(node, name) {
  return Number(node.getAttribute(name) || 0);
}

function rotationFromTransform(value) {
  const match = /rotate\(([-\d.]+)/.exec(value || "");
  return match ? THREE.MathUtils.degToRad(Number(match[1])) : 0;
}

function colorFrom(value, layer) {
  if (value && /^#[\da-f]{3,6}$/i.test(value)) {
    return new THREE.Color(value);
  }

  const palette = {
    "hash-rib": 0x17202a,
    "memory-spine": 0x356d85,
    "memory-byte": 0x6a93da,
    "color-field": 0x8d3f4f,
    gesture: 0x17202a,
    "fold-aura": 0x6b5b95,
    "fold-glyph": 0x6730be,
    "fine-drawing": 0x17202a,
    "fold-notation": 0x293241,
    "field-dust": 0x17202a,
  };
  return new THREE.Color(palette[layer] || 0x17202a);
}

function hexBytes(hex) {
  return String(hex || "")
    .match(/.{1,2}/g)
    ?.map((pair) => Number.parseInt(pair, 16))
    .filter(Number.isFinite) || [];
}

function structuralByte(index, salt = 0) {
  if (state.memoryBytes.length === 0) {
    return 0;
  }
  return state.memoryBytes[(index + salt) % state.memoryBytes.length];
}

function hashByte(index, salt = 0) {
  if (state.hashBytes.length === 0) {
    return 0;
  }
  return state.hashBytes[(index * 3 + salt) % state.hashBytes.length];
}

function permutationValue(index) {
  if (state.permutation.length === 0) {
    return 1;
  }
  return state.permutation[index % state.permutation.length];
}

function hashPhase(hash, index) {
  const offset = (index * 2) % Math.max(2, hash.length - 2);
  const pair = hash.slice(offset, offset + 2);
  return (Number.parseInt(pair || "0", 16) / 255) * Math.PI * 2;
}
