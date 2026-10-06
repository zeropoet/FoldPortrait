export function depthPoint(point, openness) {
  if (!Number.isFinite(openness) || openness < 0 || openness > 1) throw new Error('Depth must be between zero and one');
  return [point[0], point[1], point[2] * openness];
}

export function journey(record) {
  if (record.events.length !== 64 || record.sigilPoints.length !== 64) throw new Error('Expected 64 SS states and points');
  return record.events.map((event, i) => {
    const permutation = event.permutation;
    if (event.type !== 'permutation_commit' || [...permutation].sort((a,b) => a-b).some((v,j) => v !== j+1) || permutation.length !== 16) throw new Error('Invalid permutation');
    const changed = i ? permutation.flatMap((v,j) => v !== record.events[i-1].permutation[j] ? [j] : []) : [];
    if (i && (changed.length !== 2 || changed.some((j,k) => permutation[j] !== record.events[i-1].permutation[changed[1-k]]))) throw new Error('Expected a single swap');
    // Depth is the mean row of the two swapped positions. Initial state has
    // no incoming swap, so it begins at the central plane (depth zero).
    const depth = i ? (changed.reduce((sum,j) => sum + Math.floor(j/4),0) / 2 - 1.5) * 2 : 0;
    const [x,y] = record.sigilPoints[i];
    if (![x,y].every(v => Number.isFinite(v) && v >= 0 && v <= 1)) throw new Error('Invalid sigil coordinate');
    // Convert SVG downward Y to world upward Y: the journey rises to the right.
    return { step:i+1, changed, point:[(x-.5)*6,(.5-y)*6,depth] };
  });
}
