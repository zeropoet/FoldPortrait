import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { passage } from '../Encounter/studies/0003/rooms.js';
import { enteredRooms, frontierGlassFaces, fullCubeEdges, openRoomEdges, unconnectedRoomPoints } from '../Encounter/studies/0010/geometry.js';

const base = new URL('../Encounter/studies/0011/', import.meta.url);
const range = JSON.parse(readFileSync(new URL('vessels.json', base)));
const source = readFileSync(new URL('study.js', base), 'utf8');
const markup = readFileSync(new URL('index.html', base), 'utf8');
const mapping = JSON.parse(readFileSync(new URL('mapping.json', base)));
assert.equal(range.schema, 'foldportrait-vessel-range/v1');
assert.equal(range.source.count, range.vessels.length);
assert(range.vessels.length > 1);
assert.deepEqual(range.vessels.map(vessel => vessel.id), Array.from({length:range.vessels.length}, (_, index) => index));
let maximumEdges = 0;
for (const vessel of range.vessels) {
  assert.match(vessel.hash, /^[0-9a-f]{64}$/);
  assert.match(vessel.source_sha256, /^[0-9a-f]{64}$/);
  assert.equal(vessel.points.length, 64);
  assert(vessel.points.flat().every(Number.isFinite));
  const rooms = enteredRooms(passage(vessel.points, 63).visits);
  const edges = openRoomEdges(rooms);
  maximumEdges = Math.max(maximumEdges, edges.length);
  assert(edges.length <= 96);
  assert(frontierGlassFaces(rooms).every(face => face.corners.length === 4));
  assert(unconnectedRoomPoints(rooms).length <= 125);
}
const firstRooms = enteredRooms(passage(range.vessels[0].points, 63).visits);
assert.equal(firstRooms.size, 26);
assert.equal(openRoomEdges(firstRooms).length, 64);
assert.equal(frontierGlassFaces(firstRooms).length, 42);
assert.equal(fullCubeEdges().length, 300);
assert.equal(unconnectedRoomPoints(firstRooms).length, 48);
assert(!markup.includes('data-view='));
for (const required of ['id="vessel"','id="saved"','id="save"','id="rotate"']) assert(markup.includes(required));
for (const required of ["fetch('./vessels.json')", "api('research/sigils')", "api('research/sigils', {method:'POST'", 'upwardQuaternion(points)']) assert(source.includes(required));
assert.equal(mapping.states_per_vessel, 64);
assert(mapping.invariants.some(value => value.includes('private Studio records')));
console.log(`Verified ${range.vessels.length} selectable canonical sigils, ${maximumEdges} maximum open edges, persistent Studio saves, and the locked room grammar.`);
