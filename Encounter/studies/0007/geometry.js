const EPSILON = 1e-9;
const add = (a, b) => a.map((value, index) => value + b[index]);
const subtract = (a, b) => a.map((value, index) => value - b[index]);
const scale = (value, amount) => value.map(component => component * amount);
const dot = (a, b) => a.reduce((sum, value, index) => sum + value * b[index], 0);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const length = value => Math.hypot(...value);
const unit = (value, fallback) => { const magnitude=length(value); return magnitude>EPSILON?scale(value,1/magnitude):fallback; };

export function easeInOut(value) {
  if (!Number.isFinite(value) || value < 0 || value > 1) throw new Error('Ease phase must be between zero and one');
  return value * value * (3 - 2 * value);
}

export function spineSample(points, progress) {
  if (!Array.isArray(points) || points.length !== 64) throw new Error('Expected 64 path points');
  if (!Number.isFinite(progress) || progress < 0 || progress > 63) throw new Error('Progress must be between zero and 63');
  const from=Math.min(62,Math.floor(progress)),phase=progress===63?1:progress-from,eased=easeInOut(phase);
  return {from,to:from+1,phase,eased,point:add(points[from],scale(subtract(points[from+1],points[from]),eased))};
}

export function branchAxis(event) {
  if (!event || !Array.isArray(event.travel) || !Array.isArray(event.normal)) throw new Error('Threshold event requires travel and normal');
  const travel=unit(event.travel,null);if(!travel)throw new Error('Threshold travel must have length');
  let axis=unit(cross(event.normal,travel),null);
  if(!axis){const reference=Math.abs(travel[2])<.9?[0,0,1]:[0,1,0];axis=unit(cross(reference,travel),[1,0,0]);}
  return axis;
}

export function branchFragment(event) {
  if (!Array.isArray(event?.point) || event.point.length !== 3) throw new Error('Threshold event requires a point');
  const axis=branchAxis(event),direction=event.id%2===0?1:-1,size=.34+(event.id%5)*.055;
  return {axis,start:[...event.point],end:add(event.point,scale(axis,direction*size))};
}

export function eventReached(event, sample) {
  const segment=event.transition-2;
  return segment<sample.from || segment===sample.from&&sample.eased+EPSILON>=event.t;
}

export function rightAngle(event) {
  const travel=unit(event.travel,null),axis=branchAxis(event);
  return Math.acos(Math.max(-1,Math.min(1,Math.abs(dot(travel,axis)))));
}
