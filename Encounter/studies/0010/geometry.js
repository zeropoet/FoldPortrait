export { enteredRooms, frontierGlassFaces, openRoomEdges } from '../0009/geometry.js';

const GRID = 4;
const SIZE = 1.5;
const ORIGIN = -3;

function coordinate(index) {
  return ORIGIN + index * SIZE;
}

export function fullCubeEdges() {
  const edges = [];
  for (let axis = 0; axis < 3; axis += 1) {
    for (let along = 0; along < GRID; along += 1) {
      for (let first = 0; first <= GRID; first += 1) {
        for (let second = 0; second <= GRID; second += 1) {
          const start = axis === 0 ? [along, first, second] : axis === 1 ? [first, along, second] : [first, second, along];
          const end = [...start];
          end[axis] += 1;
          edges.push({axis, start:start.map(coordinate), end:end.map(coordinate)});
        }
      }
    }
  }
  return edges;
}

export function unconnectedRoomPoints(value) {
  const active = value instanceof Set ? value : new Set(value);
  const points = [];
  for (let x = 0; x <= GRID; x += 1) {
    for (let y = 0; y <= GRID; y += 1) {
      for (let z = 0; z <= GRID; z += 1) {
        const neighbors = [];
        for (const roomX of [x - 1, x]) for (const roomY of [y - 1, y]) for (const roomZ of [z - 1, z]) {
          if ([roomX, roomY, roomZ].every(component => component >= 0 && component < GRID)) neighbors.push(`${roomX},${roomY},${roomZ}`);
        }
        if (neighbors.length && neighbors.every(id => !active.has(id))) points.push([coordinate(x), coordinate(y), coordinate(z)]);
      }
    }
  }
  return points;
}
