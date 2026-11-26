import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const base = new URL('../Encounter/piece/', import.meta.url);
const markup = readFileSync(new URL('index.html', base), 'utf8');
const source = readFileSync(new URL('piece.js', base), 'utf8');
const record = JSON.parse(readFileSync(new URL('piece.json', base)));
assert.equal(record.schema, 'foldportrait-encounter-piece/v1');
assert.equal(record.status, 'unissued-final-piece-surface');
assert.equal(record.source.study, 'FP-ENCOUNTER-STUDY-0013');
assert.equal(record.source.vessel_id, 0);
assert.equal(record.points.length, 64);
assert(record.points.flat().every(Number.isFinite));
for (const absent of ['<button', '<select', '<header', '<footer', 'OrbitControls', '/studio/api/', 'addEventListener', 'frontierGlassFaces', 'ShaderMaterial', 'glassMaterial', 'faceGeometry']) assert(!markup.includes(absent) && !source.includes(absent), absent);
for (const required of [
  'const FRAME_OPACITY = .96', 'const FACET_OPACITY = .1', 'const STEP_INTERVAL = .38 / 6', 'const TRAIL_COUNT = 64',
  'const CHROMATIC_OFFSET_PX = .42', '0xff3b30', '0x16a05d', '0x315efb', 'facetWeight:.6', 'FRAME_OPACITY * .4',
  'return step % 64', 'function stepsUntilRevisit()', 'return 64', 'redMarkers[state]', 'pointVectors[state]',
  'marker.userData.fadeDuration = stepsUntilRevisit() * STEP_INTERVAL',
  'marker.userData.facets.forEach', 'FACET_OPACITY * CHROMATIC_LAYERS[index].facetWeight * (1 - eased)',
  'new THREE.MeshBasicMaterial({color:layer.color', 'opacity:layer.frameOpacity',
  'renderer.getDrawingBufferSize(drawSize)', 'function updateChromaticOffsets()',
  'rotationTheta += delta * .11'
]) {
  assert(source.includes(required), required);
}
for (const removed of ['const STEP_HOLD', 'const STEP_DURATION']) assert(!source.includes(removed));
console.log('Verified one locked source, no options, persistent RGB frames, a 6× cube loop, and shared-ten-percent-to-zero facet fades.');
