const EPSILON = 1e-9;

const add = (a, b) => a.map((value, index) => value + b[index]);
const subtract = (a, b) => a.map((value, index) => value - b[index]);
const scale = (value, amount) => value.map(component => component * amount);
const dot = (a, b) => a.reduce((sum, value, index) => sum + value * b[index], 0);
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const length = value => Math.hypot(...value);

function vector(value, name) {
  if (!Array.isArray(value) || value.length !== 3 || !value.every(Number.isFinite)) {
    throw new Error(`${name} requires three finite coordinates`);
  }
  return value;
}

function unit(value, fallback) {
  const magnitude = length(value);
  return magnitude > EPSILON ? scale(value, 1 / magnitude) : fallback;
}

export function easeInOut(value) {
  if (!Number.isFinite(value) || value < 0 || value > 1) throw new Error('Ease phase must be between zero and one');
  return value * value * (3 - 2 * value);
}

export function statePose(index) {
  if (!Number.isInteger(index) || index < 0 || index > 63) throw new Error('State index must be an integer from zero through 63');
  return index % 2 === 0 ? 0.12 : 1.08;
}

export function transitionSample(points, progress) {
  if (!Array.isArray(points) || points.length !== 64) throw new Error('Expected 64 path points');
  points.forEach((point, index) => vector(point, `Path point ${index + 1}`));
  if (!Number.isFinite(progress) || progress < 0 || progress > 63) throw new Error('Progress must be between zero and 63');
  const from = Math.min(62, Math.floor(progress));
  const phase = progress === 63 ? 1 : progress - from;
  const eased = easeInOut(phase);
  return {
    from,
    to: from + 1,
    phase,
    eased,
    point: add(points[from], scale(subtract(points[from + 1], points[from]), eased)),
    wing: statePose(from) + (statePose(from + 1) - statePose(from)) * eased,
  };
}

export function upwardQuaternion(points) {
  if (!Array.isArray(points) || points.length !== 64) throw new Error('Expected 64 path points');
  const direction = unit(subtract(vector(points[63], 'Last path point'), vector(points[0], 'First path point')), null);
  if (!direction) throw new Error('Path endpoints must differ');
  const up = [0, 1, 0];
  const cosine = dot(direction, up);
  if (cosine < -1 + EPSILON) return [0, 0, 1, 0];
  const axis = cross(direction, up);
  const quaternion = [...axis, 1 + cosine];
  const magnitude = Math.hypot(...quaternion);
  return quaternion.map(value => value / magnitude);
}

export function rotateByQuaternion(point, quaternion) {
  vector(point, 'Rotation point');
  if (!Array.isArray(quaternion) || quaternion.length !== 4 || !quaternion.every(Number.isFinite)) throw new Error('Quaternion requires four finite components');
  const [qx, qy, qz, qw] = quaternion;
  const qv = [qx, qy, qz];
  const twice = scale(cross(qv, point), 2);
  return add(point, add(scale(twice, qw), cross(qv, twice)));
}

export function pathFrame(points, index) {
  if (!Array.isArray(points) || points.length !== 64) throw new Error('Expected 64 path points');
  if (!Number.isInteger(index) || index < 0 || index > 62) throw new Error('Transition index must be an integer from zero through 62');
  const tangent = unit(subtract(points[index + 1], points[index]), [0, 1, 0]);
  const reference = Math.abs(tangent[2]) < .92 ? [0, 0, 1] : [1, 0, 0];
  const lateral = unit(cross(reference, tangent), [1, 0, 0]);
  const normal = unit(cross(lateral, tangent), [0, 0, 1]);
  return {tangent, lateral, normal};
}
