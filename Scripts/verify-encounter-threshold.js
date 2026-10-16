import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { journey } from '../Encounter/studies/0003/geometry.js';
import { activationSequence, foldedThreshold, localFrame, rotateAroundAxis, thresholdEvents } from '../Encounter/studies/0005/geometry.js';

const record=JSON.parse(readFileSync(new URL('../Encounter/studies/0003/trace.json',import.meta.url)));
const states=journey(record),events=activationSequence(states);
const distance=(a,b)=>Math.hypot(...a.map((value,index)=>value-b[index]));
const dot=(a,b)=>a.reduce((sum,value,index)=>sum+value*b[index],0);

assert.equal(states.length,64);assert(events.length>0);assert.deepEqual(events,activationSequence(states));
for(let index=1;index<events.length;index++)assert(events[index].transition>=events[index-1].transition);
for(const event of events){assert(Math.abs(event.point[event.axis]-event.plane)<1e-9);assert(event.t>0&&event.t<=1);assert.equal(event.normal.filter(Boolean).length,1);const flat=foldedThreshold(event,0);const folded=foldedThreshold(event,.62);assert.equal(flat.segments.length,48);assert.equal(folded.segments.length,48);}
const frame=localFrame(states[0].point,states[1].point,states[2].point);
for(const axis of Object.values(frame))assert(Math.abs(Math.hypot(...axis)-1)<1e-9);
assert(Math.abs(dot(frame.tangent,frame.transverse))<1e-9);assert(Math.abs(dot(frame.tangent,frame.normal))<1e-9);
const origin=[1,2,3],point=[2,2,3];assert(Math.abs(distance(origin,point)-distance(origin,rotateAroundAxis(point,origin,[0,0,1],.7)))<1e-9);
assert.deepEqual(thresholdEvents([0,0,0],[1,1,1]),[]);assert.throws(()=>activationSequence(states.slice(1)),/64 SS states/);assert.throws(()=>foldedThreshold(events[0],1.1),/between zero and one/);
console.log(`Verified ${events.length} deterministic local threshold events across the preserved 64-state journey.`);
