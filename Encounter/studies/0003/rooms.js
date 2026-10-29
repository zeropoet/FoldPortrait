// Half-open cells assign a boundary to its positive side; outer faces clamp inward.
export function cellAt(point) {
  return point.map(v => Math.max(0, Math.min(3, Math.floor((v + 3) / 1.5)))).join(',');
}
export function segmentRooms(start, end) {
  const cuts=[0,1];
  for(let axis=0;axis<3;axis++) {
    const delta=end[axis]-start[axis];
    if(Math.abs(delta)<1e-12)continue;
    for(const plane of [-1.5,0,1.5]) {
      const t=(plane-start[axis])/delta;
      if(t>0 && t<1)cuts.push(t);
    }
  }
  const sorted=[...new Set(cuts)].sort((a,b)=>a-b);
  const cells=[];
  for(let i=1;i<sorted.length;i++) {
    if(sorted[i]-sorted[i-1]<1e-12)continue;
    const t=(sorted[i]+sorted[i-1])/2;
    const id=cellAt(start.map((v,j)=>v+(end[j]-v)*t));
    if(cells.at(-1)!==id)cells.push(id);
  }
  return cells;
}
export function passage(points, progress) {
  const p=Math.max(0,Math.min(points.length-1,progress));
  const index=Math.floor(p), fraction=p-index;
  const marker=points[index].map((v,j)=>v+((points[index+1]?.[j]??v)-v)*fraction);
  const visits=new Map();let previous;
  function enter(id){if(id!==previous){visits.set(id,(visits.get(id)??0)+1);previous=id;}}
  // A point at a boundary has zero travel duration; only the initial resting
  // state or current resting state is assigned by the explicit cell convention.
  for(let i=0;i<index;i++) for(const id of segmentRooms(points[i],points[i+1]))enter(id);
  if(fraction>0)for(const id of segmentRooms(points[index],marker))enter(id);
  const active=cellAt(marker);enter(active);
  return {visits, active, marker};
}
