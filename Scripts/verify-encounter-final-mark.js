import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { passage } from '../Encounter/studies/0003/rooms.js';
import { enteredRooms, frontierGlassFaces, openRoomEdges } from '../Encounter/studies/0010/geometry.js';

const base = new URL('../Encounter/studies/0012/', import.meta.url);
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
  assert.equal(vessel.points.length, 64);
  assert(vessel.points.flat().every(Number.isFinite));
  const rooms = enteredRooms(passage(vessel.points, 63).visits);
  const edges = openRoomEdges(rooms);
  maximumEdges = Math.max(maximumEdges, edges.length);
  assert(edges.length <= 96);
  assert(frontierGlassFaces(rooms).every(face => face.corners.length === 4));
}
for (const required of ['id="vessel"','id="saved"','id="save"','id="box-loop"','id="rotate"','Lines: on','Sides: on']) assert(markup.includes(required));
for (const removed of ['id="lines"','id="sides"','id="red-line"','id="red-dot"','id="scaffold"','id="unconnected"']) assert(!markup.includes(removed));
for (const required of [
  'const BOX_SIZE = .14', 'const STEP_DURATION = .19', 'const STEP_HOLD = .68',
  'new THREE.BoxGeometry(BOX_SIZE, BOX_SIZE, BOX_SIZE)', 'function stepIndex(step)',
  'objects.redBox.position.lerpVectors', 'settings:{loop:settings.loop, rotate:settings.rotate}',
  "fetch('./vessels.json')", "api('research/sigils')", 'upwardQuaternion(points)'
]) assert(source.includes(required), required);
for (const removed of ['SphereGeometry', 'redPath', 'fullCubeEdges', 'unconnectedRoomPoints']) assert(!source.includes(removed), removed);
assert.equal(mapping.states_per_vessel, 64);
assert.equal(mapping.controls.box_loop, 'turn the staccato red-box traversal on or off');
assert(mapping.invariants.some(value => value.includes('do not render')));
console.log(`Verified ${range.vessels.length} selectable sigils, ${maximumEdges} maximum open edges, one staccato red box, and two final visual choices.`);
