import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { journey } from '../Encounter/studies/0003/geometry.js';
import { passage } from '../Encounter/studies/0003/rooms.js';
import { spineSample } from '../Encounter/studies/0007/geometry.js';
import { enteredRooms, frontierGlassFaces, openRoomEdges } from '../Encounter/studies/0009/geometry.js';

const record = JSON.parse(readFileSync(new URL('../Encounter/studies/0003/trace.json', import.meta.url)));
const points = journey(record).map(state => state.point);
assert.equal(points.length, 64);
let previousRooms = new Set();
let finalEdges = [];
let finalFaces = [];
for (let state = 0; state < 64; state += 1) {
  const sample = spineSample(points, state);
  assert.deepEqual(sample.point, points[state]);
  const active = enteredRooms(passage(points, state).visits);
  const edges = openRoomEdges(active);
  const faces = frontierGlassFaces(active);
  for (const id of previousRooms) assert(active.has(id));
  for (const edge of edges) assert(edge.neighbors.every(id => active.has(id)));
  const identities = new Set();
  for (const face of faces) {
    assert(active.has(face.room));
    assert(!active.has(face.neighbor));
    const room = face.room.split(',').map(Number);
    const neighbor = face.neighbor.split(',').map(Number);
    assert.equal(Math.abs(neighbor[face.axis] - room[face.axis]), 1);
    assert.equal(neighbor[face.axis] - room[face.axis], face.side);
    assert.equal(face.corners.length, 4);
    const identity = `${face.room}:${face.axis}:${face.side}`;
    assert(!identities.has(identity));
    identities.add(identity);
  }
  previousRooms = active;
  finalEdges = edges;
  finalFaces = faces;
}
const all = new Set(Array.from({length:4},(_,x)=>Array.from({length:4},(_,y)=>Array.from({length:4},(_,z)=>`${x},${y},${z}`))).flat(2));
assert.equal(frontierGlassFaces(all).length, 0);
assert.equal(frontierGlassFaces(new Set(['0,0,0'])).length, 3);
assert.equal(finalEdges.length, 64);
assert.equal(finalFaces.length, 42);
assert.throws(() => frontierGlassFaces(['4,0,0']), /outside the field/);
console.log(`Verified 64 lit-frontier states, ${previousRooms.size} entered rooms, ${finalEdges.length} open edges, and ${finalFaces.length} glass faces.`);
