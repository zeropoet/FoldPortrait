import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { journey } from '../Encounter/studies/0003/geometry.js';
import { easeInOut, pathFrame, rotateByQuaternion, statePose, transitionSample, upwardQuaternion } from '../Encounter/studies/0006/geometry.js';

const record=JSON.parse(readFileSync(new URL('../Encounter/studies/0003/trace.json',import.meta.url)));
const states=journey(record),points=states.map(state=>state.point),distance=(a,b)=>Math.hypot(...a.map((value,index)=>value-b[index]));
assert.equal(points.length,64);assert.equal(easeInOut(0),0);assert.equal(easeInOut(1),1);assert.equal(easeInOut(.5),.5);assert(easeInOut(.25)<.25);assert(easeInOut(.75)>.75);
for(let index=0;index<64;index+=1)assert.equal(transitionSample(points,index).wing,statePose(index));
for(let index=0;index<63;index+=1){const start=transitionSample(points,index),middle=transitionSample(points,index+.5),end=transitionSample(points,index+1);assert.deepEqual(start.point,points[index]);assert.deepEqual(end.point,points[index+1]);assert(Math.abs(distance(start.point,middle.point)-distance(middle.point,end.point))<1e-9);const frame=pathFrame(points,index);for(const axis of Object.values(frame))assert(Math.abs(Math.hypot(...axis)-1)<1e-9);}
const rotation=upwardQuaternion(points),rotated=points.map(point=>rotateByQuaternion(point,rotation)),net=rotated[63].map((value,index)=>value-rotated[0][index]);
assert(Math.abs(net[0])<1e-9);assert(net[1]>0);assert(Math.abs(net[2])<1e-9);
for(let index=1;index<64;index+=1)assert(Math.abs(distance(points[index-1],points[index])-distance(rotated[index-1],rotated[index]))<1e-9);
assert.throws(()=>easeInOut(-.1),/between zero and one/);assert.throws(()=>transitionSample(points.slice(1),0),/64 path points/);
console.log('Verified 64 fixed flight states, 63 eased transitions, no inserted wing states, and rigid upward presentation.');
