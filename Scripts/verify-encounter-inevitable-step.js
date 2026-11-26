import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { passage } from '../Encounter/studies/0003/rooms.js';
import { enteredRooms, frontierGlassFaces, openRoomEdges } from '../Encounter/studies/0010/geometry.js';

const base = new URL('../Encounter/studies/0013/', import.meta.url);
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
for (const required of ['id="vessel"','id="saved"','id="save"','id="box-loop"','id="rotate"','Lines: on','Glass: none']) assert(markup.includes(required));
for (const removed of ['id="lines"','id="sides"','id="red-line"','id="red-dot"','id="scaffold"','id="unconnected"']) assert(!markup.includes(removed));
for (const required of [
  'const BOX_SIZE = .14', 'const FRAME_OPACITY = .96', 'const FACET_OPACITY = .1', 'const STEP_INTERVAL = .38 / 6',
  'const CHROMATIC_OFFSET_PX = .42', '0xff3b30', '0x16a05d', '0x315efb', 'facetWeight:.6', 'FRAME_OPACITY * .4',
  'const TRAIL_COUNT = 64', 'return step % 64', 'function stepsUntilRevisit()', 'return 64',
  'objects.redMarkers[state]', 'objects.pointVectors[state]',
  'marker.userData.fadeDuration = stepsUntilRevisit() * STEP_INTERVAL',
  'marker.userData.facets.forEach', 'FACET_OPACITY * CHROMATIC_LAYERS[index].facetWeight * (1 - eased)',
  'new THREE.MeshBasicMaterial({color:layer.color', 'opacity:layer.frameOpacity',
  'renderer.getDrawingBufferSize(drawSize)', 'function updateChromaticOffsets()',
  'rotationTheta += delta * .11', 'Math.exp(-rotationElapsed * .16)',
  'Math.sin(rotationElapsed * .215)', 'settings:{loop:settings.loop, rotate:settings.rotate}',
  "fetch('./vessels.json')", "api('research/sigils')", 'upwardQuaternion(points)'
]) assert(source.includes(required), required);
for (const removed of ['const STEP_HOLD', 'const STEP_DURATION', 'objects.redBox.position.lerpVectors', 'SphereGeometry', 'redPath', 'fullCubeEdges', 'unconnectedRoomPoints', 'frontierGlassFaces', 'ShaderMaterial', 'glassMaterial', 'faceGeometry']) assert(!source.includes(removed), removed);
assert.equal(mapping.states_per_vessel, 64);
assert.equal(mapping.controls.box_loop, 'turn the six-times-speed red-box traversal and its revisit-timed fades on or off');
assert(mapping.invariants.some(value => value.includes('maximum combined ten percent opacity')));
assert(mapping.invariants.some(value => value.includes('RGB wireframes') && value.includes('no fade')));
assert(mapping.invariants.some(value => value.includes('contained within one rendered pixel')));
assert(mapping.invariants.some(value => value.includes('returns directly from state 63 to state 0')));
assert(mapping.invariants.some(value => value.includes('glass faces') && value.includes('do not render')));
assert(mapping.invariants.some(value => value.includes('exactly half')));
console.log(`Verified ${range.vessels.length} selectable sigils, ${maximumEdges} maximum open edges, persistent RGB frames with revisit-timed facet fades, a 6× cube loop, half-speed rotation, and two final visual choices.`);
