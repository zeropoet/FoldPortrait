import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { journey } from '../Encounter/studies/0003/geometry.js';
import { activationSequence } from '../Encounter/studies/0005/geometry.js';
import { branchAxis, branchFragment, eventReached, rightAngle, spineSample } from '../Encounter/studies/0007/geometry.js';
const record=JSON.parse(readFileSync(new URL('../Encounter/studies/0003/trace.json',import.meta.url))),states=journey(record),points=states.map(state=>state.point),events=activationSequence(states),distance=(a,b)=>Math.hypot(...a.map((value,index)=>value-b[index]));
assert.equal(points.length,64);assert.equal(events.length,83);assert.equal(events.filter(event=>eventReached(event,spineSample(points,0))).length,0);assert.equal(events.filter(event=>eventReached(event,spineSample(points,63))).length,83);
for(const event of events){const axis=branchAxis(event),fragment=branchFragment(event);assert(Math.abs(Math.hypot(...axis)-1)<1e-9);assert(Math.abs(rightAngle(event)-Math.PI/2)<1e-9);assert.deepEqual(fragment.start,event.point);assert(distance(fragment.start,fragment.end)>.3);}
for(let index=0;index<64;index+=1)assert.deepEqual(spineSample(points,index).point,points[index]);
assert.throws(()=>spineSample(points.slice(1),0),/64 path points/);assert.throws(()=>branchAxis({travel:[0,0,0],normal:[1,0,0]}),/must have length/);
console.log('Verified 64 spine states, 83 room thresholds, and one fixed 90-degree fragment per event.');
