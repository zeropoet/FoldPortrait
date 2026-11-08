const GRID = 4;
const SIZE = 1.5;
const ORIGIN = -3;

function key(x, y, z) {
  return `${x},${y},${z}`;
}

function activeSet(value) {
  const active = value instanceof Set ? value : new Set(value);
  for (const id of active) {
    if (!/^\d,\d,\d$/.test(id)) throw new Error(`Invalid room id: ${id}`);
    const coordinates = id.split(',').map(Number);
    if (coordinates.some(component => component < 0 || component >= GRID)) throw new Error(`Room is outside the field: ${id}`);
  }
  return active;
}

function coordinate(index) {
  return ORIGIN + index * SIZE;
}

export function edgeNeighbors(axis, along, first, second) {
  if (![axis, along, first, second].every(Number.isInteger)) throw new Error('Edge indices must be integers');
  if (axis < 0 || axis > 2 || along < 0 || along >= GRID || first < 0 || first > GRID || second < 0 || second > GRID) throw new Error('Edge is outside the field');
  const rooms = [];
  for (const a of [first - 1, first]) for (const b of [second - 1, second]) {
    const cell = axis === 0 ? [along, a, b] : axis === 1 ? [a, along, b] : [a, b, along];
    if (cell.every(component => component >= 0 && component < GRID)) rooms.push(key(...cell));
  }
  return rooms;
}

export function openRoomEdges(value) {
  const active = activeSet(value);
  const edges = [];
  for (let axis = 0; axis < 3; axis += 1) {
    for (let along = 0; along < GRID; along += 1) {
      for (let first = 0; first <= GRID; first += 1) {
        for (let second = 0; second <= GRID; second += 1) {
          const neighbors = edgeNeighbors(axis, along, first, second);
          if (!neighbors.length || !neighbors.every(id => active.has(id))) continue;
          const startIndex = axis === 0 ? [along, first, second] : axis === 1 ? [first, along, second] : [first, second, along];
          const endIndex = [...startIndex]; endIndex[axis] += 1;
          edges.push({axis, start:startIndex.map(coordinate), end:endIndex.map(coordinate), neighbors});
        }
      }
    }
  }
  return edges;
}

export function enteredRooms(visits) {
  if (!(visits instanceof Map)) throw new Error('Entered rooms require a visit map');
  return new Set([...visits.keys()]);
}
