import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { buildCurves } from "./geometry.js";

try {
  const response = await fetch("../0001/study.json");
  if (!response.ok) throw new Error("The inherited study record could not be loaded.");
  const { inheritedIdentity } = await response.json();
  const curves = buildCurves(inheritedIdentity);
  const canvas = document.querySelector("canvas");
  const stage = document.querySelector("#stage");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0xf6f2e9);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-6, 6, 5, -5, .1, 100);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 0, .45);
  controls.enablePan = false;
  controls.minZoom = .55;
  controls.maxZoom = 2.8;
  controls.autoRotateSpeed = .45;
  function tube(points, radius, color) {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 256, radius, 8, false),
      new THREE.MeshBasicMaterial({ color }));
    scene.add(mesh);
  }
  curves.ribs.forEach((rib) => tube(rib, .012, 0x293a38));
  tube(curves.path, .027, 0xa05237);
  const views = {
    voice: { position: [0, 0, 14], up: [0, 1, 0], title: "Voice", note: "The red continuity gathers the ribs into an upright phrase." },
    interval: { position: [13, 2, 4], up: [0, 1, 0], title: "Interval", note: "Open space separates the curves. Their bends suggest weight across the gaps." },
    end: { position: [0, 14, .46], up: [0, 1, 0], title: "End-on", note: "The ribs gather into a dark span. The red gesture contracts toward a point, retaining the trace of its bends." },
  };
  function label(key) {
    document.querySelectorAll("[data-view]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === key)));
    document.querySelector("#view-name").textContent = views[key]?.title ?? "Between views";
    document.querySelector("#view-note").textContent = views[key]?.note ?? "The relationships unfold as you move. The geometry remains the same.";
  }
  const turn = document.querySelector("#turn");
  function stopTurning() { controls.autoRotate = false; turn.setAttribute("aria-pressed", "false"); }
  function select(key) {
    stopTurning();
    camera.position.set(...views[key].position);
    camera.up.set(...views[key].up);
    camera.zoom = 1;
    camera.updateProjectionMatrix();
    controls.update();
    camera.lookAt(controls.target);
    label(key);
    renderer.render(scene, camera);
  }
  document.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => select(button.dataset.view)));
  controls.addEventListener("start", () => { stopTurning(); label(null); });
  turn.addEventListener("click", () => {
    controls.autoRotate = !controls.autoRotate;
    turn.setAttribute("aria-pressed", String(controls.autoRotate));
    if (controls.autoRotate) label(null);
  });
  canvas.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault(); stopTurning(); label(null);
    const offset = camera.position.clone().sub(controls.target);
    const axis = event.key === "ArrowLeft" || event.key === "ArrowRight"
      ? camera.up.clone().normalize() : new THREE.Vector3().crossVectors(camera.up, offset).normalize();
    offset.applyAxisAngle(axis, (event.key === "ArrowLeft" || event.key === "ArrowUp" ? 1 : -1) * .08);
    camera.position.copy(controls.target).add(offset);
    controls.update();
  });
  function resize() {
    const { width, height } = stage.getBoundingClientRect();
    const halfHeight = width < 700 ? 6.5 : 4.7;
    camera.left = -halfHeight * width / height; camera.right = -camera.left;
    camera.top = halfHeight; camera.bottom = -halfHeight;
    camera.updateProjectionMatrix(); renderer.setSize(width, height);
  }
  new ResizeObserver(resize).observe(stage);
  resize(); select("voice");
  let previous = 0;
  renderer.setAnimationLoop((now) => {
    const delta = Math.min((now - previous) / 1000, .05); previous = now;
    if (!document.hidden) { controls.update(delta); renderer.render(scene, camera); }
  });
} catch (error) {
  const message = document.querySelector("#error");
  message.hidden = false;
  message.textContent = `Unable to open the spatial study. ${error.message} Serve the repository over HTTP and use a browser with WebGL enabled.`;
  console.error(error);
}
