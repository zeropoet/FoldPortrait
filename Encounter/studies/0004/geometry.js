const HALF_PI = Math.PI / 2;

function validAmount(amount) {
  if (!Number.isFinite(amount) || amount < 0 || amount > 1) {
    throw new Error('Fold must be between zero and one');
  }
}

export function foldPoint(point, amount, axis = 'x') {
  validAmount(amount);
  if (axis !== 'x' && axis !== 'y') throw new Error('Fold axis must be x or y');
  if (!Array.isArray(point) || point.length < 2 || !point.slice(0, 2).every(Number.isFinite)) {
    throw new Error('Fold point requires finite x and y');
  }
  const [x, y] = point;
  const angle = amount * HALF_PI;
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  // Both half-planes rise toward positive Z. Each half moves rigidly around
  // the selected FP axis; only relations that cross the hinge can contract.
  return axis === 'x'
    ? [x, y * cosine, Math.abs(y) * sine]
    : [x * cosine, y, Math.abs(x) * sine];
}

export function foldJourney(states, amount, axis = 'x') {
  if (!Array.isArray(states) || states.length !== 64) throw new Error('Expected 64 SS states');
  return states.map((state) => ({...state, point: foldPoint(state.point, amount, axis)}));
}

export function foldedGrid(amount, axis = 'x') {
  validAmount(amount);
  const lines = [];
  const values = [-3, -1.5, 0, 1.5, 3];
  for (const fixed of values) {
    // Splitting both directions at zero keeps the hinge explicit and avoids
    // drawing a chord across either folded half-plane.
    for (const [start, end] of [[-3, 0], [0, 3]]) {
      lines.push(foldPoint([start, fixed, 0], amount, axis), foldPoint([end, fixed, 0], amount, axis));
      lines.push(foldPoint([fixed, start, 0], amount, axis), foldPoint([fixed, end, 0], amount, axis));
    }
  }
  return lines;
}
