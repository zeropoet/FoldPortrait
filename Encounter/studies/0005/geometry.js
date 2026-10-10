const PLANES = [-1.5, 0, 1.5];
const EPSILON = 1e-9;

function vector(value, name) {
  if (!Array.isArray(value) || value.length !== 3 || !value.every(Number.isFinite)) {
    throw new Error(`${name} requires three finite coordinates`);
  }
  return value;
}

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
function unit(value, fallback) {
  const magnitude = length(value);
  return magnitude > EPSILON ? scale(value, 1 / magnitude) : fallback;
}

export function thresholdEvents(start, end, transition = 1) {
  vector(start, 'Threshold start');
  vector(end, 'Threshold end');
  const delta = subtract(end, start);
  const events = [];
  for (let axis = 0; axis < 3; axis += 1) {
    if (Math.abs(delta[axis]) < EPSILON) continue;
    for (const plane of PLANES) {
      const t = (plane - start[axis]) / delta[axis];
      if (t <= EPSILON || t > 1 + EPSILON) continue;
      const normal = [0, 0, 0]; normal[axis] = Math.sign(delta[axis]);
      events.push({
        transition,
        axis,
        plane,
        t: Math.min(1, t),
        point: add(start, scale(delta, Math.min(1, t))),
        normal,
      });
    }
  }
  return events.sort((a, b) => a.t - b.t || a.axis - b.axis);
}

export function localFrame(previous, current, next) {
  vector(previous, 'Previous point'); vector(current, 'Current point'); vector(next, 'Next point');
  const incoming = unit(subtract(current, previous), [1, 0, 0]);
  const outgoing = unit(subtract(next, current), incoming);
  const tangent = unit(add(incoming, outgoing), outgoing);
  let normal = unit(cross(incoming, outgoing), null);
  if (!normal) {
    const reference = Math.abs(tangent[2]) < .9 ? [0, 0, 1] : [0, 1, 0];
    normal = unit(cross(tangent, reference), [1, 0, 0]);
  }
  const transverse = unit(cross(normal, tangent), [0, 1, 0]);
  return {tangent, transverse, normal};
}

export function rotateAroundAxis(point, origin, axis, angle) {
  vector(point, 'Rotation point'); vector(origin, 'Rotation origin'); vector(axis, 'Rotation axis');
  if (!Number.isFinite(angle)) throw new Error('Rotation angle must be finite');
  const direction = unit(axis, null);
  if (!direction) throw new Error('Rotation axis must have length');
  const relative = subtract(point, origin);
  const cosine = Math.cos(angle), sine = Math.sin(angle);
  return add(origin, add(add(scale(relative, cosine), scale(cross(direction, relative), sine)), scale(direction, dot(direction, relative) * (1 - cosine))));
}

export function foldedThreshold(event, amount, size = .58) {
  if (!Number.isFinite(amount) || amount < 0 || amount > 1) throw new Error('Fold must be between zero and one');
  if (!Number.isFinite(size) || size <= 0) throw new Error('Panel size must be positive');
  vector(event.point, 'Threshold point'); vector(event.normal, 'Threshold normal');
  const travel = unit(event.travel || [1, 0, 0], [1, 0, 0]);
  let hinge = unit(cross(event.normal, travel), null);
  if (!hinge) hinge = unit(cross(event.normal, Math.abs(event.normal[2]) < .9 ? [0, 0, 1] : [0, 1, 0]), [0, 1, 0]);
  const span = unit(cross(hinge, event.normal), [1, 0, 0]);
  const ends = [-1, 1].map(sign => add(event.point, scale(hinge, sign * size)));
  const angle = amount * Math.PI / 2;
  const halves = [-1, 1].map(sign => {
    const outer = ends.map(end => add(end, scale(span, sign * size)));
    return [
      ends[0], ends[1],
      ends[1], rotateAroundAxis(outer[1], ends[1], hinge, sign * angle),
      rotateAroundAxis(outer[1], ends[1], hinge, sign * angle), rotateAroundAxis(outer[0], ends[0], hinge, sign * angle),
      rotateAroundAxis(outer[0], ends[0], hinge, sign * angle), ends[0],
    ];
  });
  return {hinge, span, segments: halves.flat(2)};
}

export function activationSequence(states) {
  if (!Array.isArray(states) || states.length !== 64) throw new Error('Expected 64 SS states');
  const events = [];
  for (let index = 1; index < states.length; index += 1) {
    const start = vector(states[index - 1].point, 'State point');
    const end = vector(states[index].point, 'State point');
    const travel = unit(subtract(end, start), [1, 0, 0]);
    for (const event of thresholdEvents(start, end, index + 1)) events.push({...event, travel});
  }
  return events.map((event, index) => ({...event, id: index + 1}));
}
