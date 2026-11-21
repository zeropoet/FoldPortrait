import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { journey } from '../Encounter/studies/0003/geometry.js';
import { foldJourney, foldedGrid, foldPoint } from '../Encounter/studies/0004/geometry.js';

const record = JSON.parse(readFileSync(new URL('../Encounter/studies/0003/trace.json', import.meta.url)));
const source = journey(record);
const distance = (a,b) => Math.hypot(...a.map((value,index)=>value-b[index]));

assert.equal(source.length,64);
for (const axis of ['x','y']) {
  assert.deepEqual(foldJourney(source,0,axis).map(s=>s.point),source.map(s=>[s.point[0],s.point[1],0]));
  assert.deepEqual(foldJourney(source,.58,axis),foldJourney(source,.58,axis));
  assert.equal(foldedGrid(.5,axis).length,40);
  const hingePoint=axis==='x'?[1.25,0,0]:[0,-1.25,0];
  assert.deepEqual(foldPoint(hingePoint,.73,axis),hingePoint);
  const sameHalf=axis==='x'?[[1,.5,0],[-2,2,0]]:[[.5,1,0],[2,-2,0]];
  assert(Math.abs(distance(...sameHalf)-distance(...sameHalf.map(point=>foldPoint(point,.73,axis))))<1e-12);
  const mirrored=axis==='x'?[[1,2,0],[1,-2,0]]:[[2,1,0],[-2,1,0]];
  assert(distance(...mirrored.map(point=>foldPoint(point,1,axis)))<1e-12);
}
assert.throws(()=>foldPoint([0,0],-0.1,'x'),/between zero and one/);
assert.throws(()=>foldPoint([0,0],.5,'z'),/axis/);
assert.throws(()=>foldJourney(source.slice(1),.5,'x'),/64 SS states/);
console.log('Verified axial fold determinism, hinge stability, rigid half-planes, closure, and all 64 inherited states.');
