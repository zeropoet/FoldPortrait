import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { journey } from '../Encounter/studies/0003/geometry.js';
import { passage } from '../Encounter/studies/0003/rooms.js';
import { spineSample } from '../Encounter/studies/0007/geometry.js';
import { enteredRooms, openRoomEdges } from '../Encounter/studies/0008/geometry.js';

const record = JSON.parse(readFileSync(new URL('../Encounter/studies/0003/trace.json', import.meta.url)));
const points = journey(record).map(state => state.point);
assert.equal(points.length, 64);
let previousRooms = new Set();
let previousEdgeCount = 0;
for (let state = 0; state < 64; state += 1) {
  const sample = spineSample(points, state);
  assert.deepEqual(sample.point, points[state]);
  const active = enteredRooms(passage(points, state).visits);
  const edges = openRoomEdges(active);
  for (const id of previousRooms) assert(active.has(id));
  assert(edges.length >= previousEdgeCount);
  for (const edge of edges) assert(edge.neighbors.every(id => active.has(id)));
  previousRooms = active;
  previousEdgeCount = edges.length;
}
const all = new Set(Array.from({length:4},(_,x)=>Array.from({length:4},(_,y)=>Array.from({length:4},(_,z)=>`${x},${y},${z}`))).flat(2));
assert.equal(openRoomEdges(all).length, 300);
assert.throws(() => openRoomEdges(['4,0,0']), /outside the field/);
console.log(`Verified 64 hidden-path states, ${previousRooms.size} entered rooms, and ${previousEdgeCount} frontier-safe open edges.`);
